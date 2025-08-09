import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import Papa from 'papaparse'
import { z } from 'zod'
import { Readable } from 'stream'

// Export types
export enum ExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PDF = 'PDF',
  JSON = 'JSON'
}

export enum ExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ExportOptions {
  format: ExportFormat
  entityType: 'users' | 'surveys' | 'responses' | 'reports' | 'analytics'
  filters?: Record<string, any>
  fields?: string[]
  includeRelations?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface ImportOptions {
  entityType: 'users' | 'surveys' | 'questions' | 'responses'
  format: ExportFormat
  validateOnly?: boolean
  updateExisting?: boolean
  mappings?: Record<string, string>
}

export interface ExportJob {
  id: string
  userId: string
  status: ExportStatus
  format: ExportFormat
  entityType: string
  progress: number
  totalRecords: number
  processedRecords: number
  fileUrl?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

export interface ImportJob {
  id: string
  userId: string
  status: ExportStatus
  entityType: string
  totalRecords: number
  successCount: number
  errorCount: number
  errors: ImportError[]
  createdAt: Date
  completedAt?: Date
}

export interface ImportError {
  row: number
  field?: string
  value?: any
  message: string
}

/**
 * Data Export/Import Service
 * Handles all data export and import operations
 */
export class DataExportService {
  private supabase: any
  private exportJobs: Map<string, ExportJob> = new Map()
  private importJobs: Map<string, ImportJob> = new Map()

  constructor() {
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    this.supabase = await createClient()
  }

  /**
   * Create an export job
   */
  async createExport(userId: string, options: ExportOptions): Promise<ExportJob> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: ExportJob = {
      id: jobId,
      userId,
      status: ExportStatus.PENDING,
      format: options.format,
      entityType: options.entityType,
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      createdAt: new Date()
    }
    
    this.exportJobs.set(jobId, job)
    
    // Start export in background
    this.processExport(jobId, options).catch(error => {
      console.error('Export failed:', error)
      job.status = ExportStatus.FAILED
      job.error = error.message
    })
    
    return job
  }

  /**
   * Process export job
   */
  private async processExport(jobId: string, options: ExportOptions) {
    const job = this.exportJobs.get(jobId)
    if (!job) return
    
    try {
      job.status = ExportStatus.PROCESSING
      
      // Fetch data based on entity type
      const data = await this.fetchExportData(options)
      job.totalRecords = data.length
      
      // Generate export file based on format
      let fileContent: any
      let fileName: string
      let mimeType: string
      
      switch (options.format) {
        case ExportFormat.CSV:
          fileContent = await this.generateCSV(data, options)
          fileName = `${options.entityType}_${Date.now()}.csv`
          mimeType = 'text/csv'
          break
          
        case ExportFormat.EXCEL:
          fileContent = await this.generateExcel(data, options)
          fileName = `${options.entityType}_${Date.now()}.xlsx`
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          break
          
        case ExportFormat.PDF:
          fileContent = await this.generatePDF(data, options)
          fileName = `${options.entityType}_${Date.now()}.pdf`
          mimeType = 'application/pdf'
          break
          
        case ExportFormat.JSON:
          fileContent = JSON.stringify(data, null, 2)
          fileName = `${options.entityType}_${Date.now()}.json`
          mimeType = 'application/json'
          break
          
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
      
      // Upload to storage
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('exports')
        .upload(fileName, fileContent, {
          contentType: mimeType,
          upsert: false
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('exports')
        .getPublicUrl(fileName)
      
      job.fileUrl = publicUrl
      job.status = ExportStatus.COMPLETED
      job.completedAt = new Date()
      job.progress = 100
      job.processedRecords = data.length
      
      // Save job to database
      await this.supabase
        .from('export_jobs')
        .insert({
          id: job.id,
          user_id: job.userId,
          status: job.status,
          format: job.format,
          entity_type: job.entityType,
          total_records: job.totalRecords,
          file_url: job.fileUrl,
          created_at: job.createdAt,
          completed_at: job.completedAt
        })
      
    } catch (error) {
      job.status = ExportStatus.FAILED
      job.error = error instanceof Error ? error.message : 'Export failed'
      throw error
    }
  }

  /**
   * Fetch data for export
   */
  private async fetchExportData(options: ExportOptions): Promise<any[]> {
    let query = this.supabase.from(options.entityType).select('*')
    
    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      })
    }
    
    // Apply date range
    if (options.dateRange) {
      query = query
        .gte('created_at', options.dateRange.start.toISOString())
        .lte('created_at', options.dateRange.end.toISOString())
    }
    
    // Select specific fields
    if (options.fields && options.fields.length > 0) {
      query = this.supabase.from(options.entityType).select(options.fields.join(','))
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return data || []
  }

  /**
   * Generate CSV export
   */
  private async generateCSV(data: any[], options: ExportOptions): Promise<string> {
    if (data.length === 0) return ''
    
    // Filter fields if specified
    if (options.fields && options.fields.length > 0) {
      data = data.map(row => {
        const filteredRow: any = {}
        options.fields!.forEach(field => {
          filteredRow[field] = row[field]
        })
        return filteredRow
      })
    }
    
    return Papa.unparse(data, {
      header: true,
      delimiter: ',',
      newline: '\n'
    })
  }

  /**
   * Generate Excel export
   */
  private async generateExcel(data: any[], options: ExportOptions): Promise<Buffer> {
    const workbook = XLSX.utils.book_new()
    
    // Filter fields if specified
    if (options.fields && options.fields.length > 0) {
      data = data.map(row => {
        const filteredRow: any = {}
        options.fields!.forEach(field => {
          filteredRow[field] = row[field]
        })
        return filteredRow
      })
    }
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, options.entityType)
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    return Buffer.from(buffer)
  }

  /**
   * Generate PDF export
   */
  private async generatePDF(data: any[], options: ExportOptions): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })
    
    // Add title
    doc.setFontSize(16)
    doc.text(`${options.entityType.charAt(0).toUpperCase() + options.entityType.slice(1)} Export`, 14, 15)
    
    // Add metadata
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22)
    doc.text(`Total Records: ${data.length}`, 14, 27)
    
    if (data.length > 0) {
      // Prepare table data
      const headers = options.fields || Object.keys(data[0])
      const rows = data.map(item => 
        headers.map(header => {
          const value = item[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        })
      )
      
      // Add table
      ;(doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [20, 184, 166], // Teal color
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      })
    }
    
    // Return as blob
    return doc.output('blob')
  }

  /**
   * Create an import job
   */
  async createImport(
    userId: string, 
    file: File, 
    options: ImportOptions
  ): Promise<ImportJob> {
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const job: ImportJob = {
      id: jobId,
      userId,
      status: ExportStatus.PENDING,
      entityType: options.entityType,
      totalRecords: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      createdAt: new Date()
    }
    
    this.importJobs.set(jobId, job)
    
    // Process import
    this.processImport(jobId, file, options).catch(error => {
      console.error('Import failed:', error)
      job.status = ExportStatus.FAILED
      job.errors.push({
        row: 0,
        message: error.message
      })
    })
    
    return job
  }

  /**
   * Process import job
   */
  private async processImport(
    jobId: string, 
    file: File, 
    options: ImportOptions
  ) {
    const job = this.importJobs.get(jobId)
    if (!job) return
    
    try {
      job.status = ExportStatus.PROCESSING
      
      // Parse file based on format
      let data: any[] = []
      
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        data = await this.parseCSV(file)
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.name.endsWith('.xlsx')
      ) {
        data = await this.parseExcel(file)
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const text = await file.text()
        data = JSON.parse(text)
      } else {
        throw new Error('Unsupported file format')
      }
      
      job.totalRecords = data.length
      
      // Validate data
      const validationResults = await this.validateImportData(data, options)
      
      if (options.validateOnly) {
        job.status = ExportStatus.COMPLETED
        job.errors = validationResults.errors
        job.errorCount = validationResults.errors.length
        job.completedAt = new Date()
        return
      }
      
      // Import valid records
      const results = await this.importRecords(
        validationResults.validRecords,
        options
      )
      
      job.successCount = results.successCount
      job.errorCount = results.errorCount + validationResults.errors.length
      job.errors = [...validationResults.errors, ...results.errors]
      job.status = ExportStatus.COMPLETED
      job.completedAt = new Date()
      
      // Save job to database
      await this.supabase
        .from('import_jobs')
        .insert({
          id: job.id,
          user_id: job.userId,
          status: job.status,
          entity_type: job.entityType,
          total_records: job.totalRecords,
          success_count: job.successCount,
          error_count: job.errorCount,
          errors: job.errors,
          created_at: job.createdAt,
          completed_at: job.completedAt
        })
      
    } catch (error) {
      job.status = ExportStatus.FAILED
      job.errors.push({
        row: 0,
        message: error instanceof Error ? error.message : 'Import failed'
      })
      throw error
    }
  }

  /**
   * Parse CSV file
   */
  private async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data)
        },
        error: (error) => {
          reject(error)
        }
      })
    })
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(file: File): Promise<any[]> {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Get first worksheet
    const worksheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[worksheetName]
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    return data
  }

  /**
   * Validate import data
   */
  private async validateImportData(
    data: any[], 
    options: ImportOptions
  ): Promise<{ validRecords: any[], errors: ImportError[] }> {
    const validRecords: any[] = []
    const errors: ImportError[] = []
    
    // Get validation schema based on entity type
    const schema = this.getValidationSchema(options.entityType)
    
    data.forEach((record, index) => {
      try {
        // Apply field mappings if provided
        if (options.mappings) {
          const mappedRecord: any = {}
          Object.entries(options.mappings).forEach(([from, to]) => {
            if (record[from] !== undefined) {
              mappedRecord[to] = record[from]
            }
          })
          record = mappedRecord
        }
        
        // Validate record
        const validatedRecord = schema.parse(record)
        validRecords.push(validatedRecord)
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push({
              row: index + 2, // +2 for header row and 0-index
              field: err.path.join('.'),
              value: record[err.path[0]],
              message: err.message
            })
          })
        } else {
          errors.push({
            row: index + 2,
            message: error instanceof Error ? error.message : 'Validation failed'
          })
        }
      }
    })
    
    return { validRecords, errors }
  }

  /**
   * Get validation schema for entity type
   */
  private getValidationSchema(entityType: string): z.ZodSchema {
    switch (entityType) {
      case 'users':
        return z.object({
          email: z.string().email(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          role: z.enum(['VIEWER', 'USER', 'ANALYST', 'ORG_ADMIN', 'SUPER_ADMIN']),
          organization_id: z.string().uuid().optional()
        })
        
      case 'surveys':
        return z.object({
          title: z.string().min(1).max(200),
          description: z.string().optional(),
          type: z.enum(['assessment', 'feedback', 'research']).optional(),
          status: z.enum(['draft', 'published', 'archived']).optional()
        })
        
      case 'questions':
        return z.object({
          survey_id: z.string().uuid(),
          title: z.string().min(1),
          type: z.enum(['text', 'number', 'single_choice', 'multiple_choice', 'scale', 'date']),
          required: z.boolean().optional(),
          order: z.number().optional()
        })
        
      case 'responses':
        return z.object({
          survey_id: z.string().uuid(),
          question_id: z.string().uuid(),
          user_id: z.string().uuid().optional(),
          value: z.any()
        })
        
      default:
        throw new Error(`No validation schema for entity type: ${entityType}`)
    }
  }

  /**
   * Import validated records
   */
  private async importRecords(
    records: any[], 
    options: ImportOptions
  ): Promise<{ successCount: number, errorCount: number, errors: ImportError[] }> {
    let successCount = 0
    let errorCount = 0
    const errors: ImportError[] = []
    
    // Process in batches
    const batchSize = 100
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      try {
        if (options.updateExisting) {
          // Upsert records
          const { error } = await this.supabase
            .from(options.entityType)
            .upsert(batch, {
              onConflict: 'email' // Adjust based on entity type
            })
          
          if (error) throw error
        } else {
          // Insert new records only
          const { error } = await this.supabase
            .from(options.entityType)
            .insert(batch)
          
          if (error) throw error
        }
        
        successCount += batch.length
      } catch (error) {
        errorCount += batch.length
        errors.push({
          row: i + 2,
          message: error instanceof Error ? error.message : 'Import failed'
        })
      }
    }
    
    return { successCount, errorCount, errors }
  }

  /**
   * Get export job status
   */
  async getExportJob(jobId: string): Promise<ExportJob | null> {
    return this.exportJobs.get(jobId) || null
  }

  /**
   * Get import job status
   */
  async getImportJob(jobId: string): Promise<ImportJob | null> {
    return this.importJobs.get(jobId) || null
  }

  /**
   * Get user's export history
   */
  async getUserExports(userId: string, limit = 50): Promise<ExportJob[]> {
    const { data, error } = await this.supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return data || []
  }

  /**
   * Get user's import history
   */
  async getUserImports(userId: string, limit = 50): Promise<ImportJob[]> {
    const { data, error } = await this.supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return data || []
  }
}

// Singleton instance
let dataExportService: DataExportService | null = null

export function getDataExportService(): DataExportService {
  if (!dataExportService) {
    dataExportService = new DataExportService()
  }
  return dataExportService
}

export default DataExportService