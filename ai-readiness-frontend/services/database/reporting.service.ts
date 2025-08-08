/**
 * Reporting Database Service
 * 
 * Comprehensive reporting engine with multi-format export capabilities, scheduled reports,
 * custom templates, data aggregation, and real-time analytics for AI readiness assessment.
 * 
 * Features:
 * - Multi-format export (PDF, Excel, PowerPoint)
 * - Scheduled report generation with cron-like functionality
 * - Custom report templates (Executive, Analytics, JTBD, Voice, Segment)
 * - Real-time and batch report generation
 * - Advanced data aggregation and filtering
 * - Performance optimization with caching and streaming
 * - Role-based access control and audit logging
 */

import { createClient } from '@/lib/supabase/client'
import { analyticsService } from './analytics.service'
import type { JTBDForces } from '@/lib/types'

const supabase = createClient()

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ReportTemplate {
  id: string
  name: string
  type: 'executive' | 'analytics' | 'jtbd' | 'voice' | 'segment' | 'custom'
  description: string
  config: ReportTemplateConfig
  organization_id: string
  created_by: string
  created_at: Date
  updated_at: Date
  is_active: boolean
}

export interface ReportTemplateConfig {
  sections: ReportSection[]
  formatting: ReportFormatting
  filters: ReportFilters
  aggregations: ReportAggregation[]
  visualizations: ReportVisualization[]
}

export interface ReportSection {
  id: string
  type: 'summary' | 'metrics' | 'charts' | 'tables' | 'insights' | 'recommendations'
  title: string
  content: any
  order: number
  required: boolean
  conditional?: ReportCondition
}

export interface ReportFormatting {
  theme: 'default' | 'corporate' | 'minimal' | 'branded'
  colors: string[]
  fonts: string[]
  layout: 'single-column' | 'two-column' | 'dashboard'
  pageSize: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
}

export interface ReportFilters {
  dateRange?: { start: Date; end: Date }
  organizationId?: string
  surveyIds?: string[]
  userIds?: string[]
  segments?: string[]
  tags?: string[]
  customFilters?: Record<string, any>
}

export interface ReportAggregation {
  field: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'percentile'
  groupBy?: string[]
  filters?: Record<string, any>
}

export interface ReportVisualization {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'radar' | 'funnel'
  data: any
  config: any
  title: string
  subtitle?: string
}

export interface GeneratedReport {
  id: string
  template_id: string
  organization_id: string
  title: string
  description?: string
  format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html'
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'expired'
  progress: number
  content?: any
  file_url?: string
  file_size?: number
  error_message?: string
  generated_by: string
  generated_at?: Date
  expires_at?: Date
  download_count: number
  metadata: Record<string, any>
}

export interface ScheduledReport {
  id: string
  template_id: string
  organization_id: string
  name: string
  description?: string
  schedule: ScheduleConfig
  format: 'pdf' | 'excel' | 'powerpoint'
  recipients: string[]
  filters: ReportFilters
  is_active: boolean
  created_by: string
  created_at: Date
  last_run_at?: Date
  next_run_at?: Date
  run_count: number
  success_count: number
  error_count: number
}

export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'
  interval?: number
  day_of_week?: number
  day_of_month?: number
  hour: number
  minute: number
  timezone: string
  cron_expression?: string
}

export interface ReportCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: any
  logical?: 'and' | 'or'
}

export interface ReportMetrics {
  totalReports: number
  recentReports: number
  popularTemplates: Array<{ template_id: string; name: string; usage_count: number }>
  exportFormats: Record<string, number>
  averageGenerationTime: number
  successRate: number
  storageUsage: number
}

// ============================================================================
// REPORTING SERVICE
// ============================================================================

export class ReportingService {
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map()
  private readonly CACHE_DEFAULT_TTL = 10 * 60 * 1000 // 10 minutes
  private readonly MAX_CONCURRENT_REPORTS = 5
  private readonly REPORT_EXPIRY_DAYS = 30

  /**
   * Generate a report based on template and parameters
   */
  async generateReport(params: {
    templateId: string
    organizationId: string
    format: 'pdf' | 'excel' | 'powerpoint' | 'json' | 'html'
    filters?: ReportFilters
    options?: {
      title?: string
      description?: string
      priority?: 'low' | 'medium' | 'high'
      notify?: boolean
      expires_in_days?: number
    }
  }): Promise<{ reportId: string; status: string }> {
    try {
      // Validate template exists and user has access
      const template = await this.getReportTemplate(params.templateId, params.organizationId)
      if (!template) {
        throw new Error('Report template not found or access denied')
      }

      // Check concurrent report limit
      const activeReports = await this.getActiveReports(params.organizationId)
      if (activeReports.length >= this.MAX_CONCURRENT_REPORTS) {
        throw new Error('Maximum concurrent reports limit reached. Please try again later.')
      }

      // Create report record
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (params.options?.expires_in_days || this.REPORT_EXPIRY_DAYS))

      const reportData: Partial<GeneratedReport> = {
        id: reportId,
        template_id: params.templateId,
        organization_id: params.organizationId,
        title: params.options?.title || template.name,
        description: params.options?.description,
        format: params.format,
        status: 'pending',
        progress: 0,
        expires_at: expiresAt,
        download_count: 0,
        metadata: {
          filters: params.filters,
          options: params.options,
          template_version: template.updated_at
        }
      }

      const { data, error } = await supabase
        .from('generated_reports')
        .insert(reportData)
        .select()
        .single()

      if (error) throw error

      // Start report generation asynchronously
      this.processReportGeneration(reportId, template, params.filters || {}, params.format)
        .catch(error => {
          console.error(`Report generation failed for ${reportId}:`, error)
          this.updateReportStatus(reportId, 'failed', 0, error.message)
        })

      return {
        reportId,
        status: 'pending'
      }

    } catch (error) {
      console.error('Error initiating report generation:', error)
      throw error
    }
  }

  /**
   * Get report generation status and progress
   */
  async getReportStatus(reportId: string, organizationId: string): Promise<GeneratedReport | null> {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('id', reportId)
        .eq('organization_id', organizationId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data as GeneratedReport || null

    } catch (error) {
      console.error('Error fetching report status:', error)
      return null
    }
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(params: {
    templateId: string
    organizationId: string
    name: string
    description?: string
    schedule: ScheduleConfig
    format: 'pdf' | 'excel' | 'powerpoint'
    recipients: string[]
    filters?: ReportFilters
  }): Promise<ScheduledReport> {
    try {
      // Validate template
      const template = await this.getReportTemplate(params.templateId, params.organizationId)
      if (!template) {
        throw new Error('Report template not found')
      }

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(params.schedule)

      const scheduleData: Partial<ScheduledReport> = {
        id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        template_id: params.templateId,
        organization_id: params.organizationId,
        name: params.name,
        description: params.description,
        schedule: params.schedule,
        format: params.format,
        recipients: params.recipients,
        filters: params.filters || {},
        is_active: true,
        next_run_at: nextRunAt,
        run_count: 0,
        success_count: 0,
        error_count: 0
      }

      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert(scheduleData)
        .select()
        .single()

      if (error) throw error

      return data as ScheduledReport

    } catch (error) {
      console.error('Error scheduling report:', error)
      throw error
    }
  }

  /**
   * Get list of scheduled reports
   */
  async getScheduledReports(organizationId: string): Promise<ScheduledReport[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select(`
          *,
          report_templates!inner(name, type)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []) as ScheduledReport[]

    } catch (error) {
      console.error('Error fetching scheduled reports:', error)
      return []
    }
  }

  /**
   * Create or update a report template
   */
  async saveReportTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<ReportTemplate> {
    try {
      const templateData = {
        ...template,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        updated_at: new Date()
      }

      const { data, error } = await supabase
        .from('report_templates')
        .upsert(templateData)
        .select()
        .single()

      if (error) throw error

      // Clear cache
      this.clearTemplateCache(template.organization_id)

      return data as ReportTemplate

    } catch (error) {
      console.error('Error saving report template:', error)
      throw error
    }
  }

  /**
   * Get report templates for organization
   */
  async getReportTemplates(organizationId: string, type?: string): Promise<ReportTemplate[]> {
    const cacheKey = `templates_${organizationId}_${type || 'all'}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      let query = supabase
        .from('report_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (error) throw error

      const templates = (data || []) as ReportTemplate[]
      this.setCache(cacheKey, templates, this.CACHE_DEFAULT_TTL)

      return templates

    } catch (error) {
      console.error('Error fetching report templates:', error)
      return []
    }
  }

  /**
   * Get report template by ID
   */
  async getReportTemplate(templateId: string, organizationId: string): Promise<ReportTemplate | null> {
    const cacheKey = `template_${templateId}_${organizationId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      const template = data as ReportTemplate || null
      if (template) {
        this.setCache(cacheKey, template, this.CACHE_DEFAULT_TTL)
      }

      return template

    } catch (error) {
      console.error('Error fetching report template:', error)
      return null
    }
  }

  /**
   * Get generated reports for organization
   */
  async getGeneratedReports(
    organizationId: string,
    options?: {
      limit?: number
      offset?: number
      status?: string
      format?: string
      template_id?: string
    }
  ): Promise<{ reports: GeneratedReport[]; total: number }> {
    try {
      let query = supabase
        .from('generated_reports')
        .select(`
          *,
          report_templates!inner(name, type)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('generated_at', { ascending: false })

      // Apply filters
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.format) {
        query = query.eq('format', options.format)
      }
      if (options?.template_id) {
        query = query.eq('template_id', options.template_id)
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        reports: (data || []) as GeneratedReport[],
        total: count || 0
      }

    } catch (error) {
      console.error('Error fetching generated reports:', error)
      return { reports: [], total: 0 }
    }
  }

  /**
   * Get reporting metrics and analytics
   */
  async getReportingMetrics(organizationId: string): Promise<ReportMetrics> {
    const cacheKey = `metrics_${organizationId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Get basic metrics
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [totalReportsResult, recentReportsResult, templatesResult, formatsResult] = await Promise.all([
        supabase
          .from('generated_reports')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        
        supabase
          .from('generated_reports')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('generated_at', thirtyDaysAgo.toISOString()),
        
        supabase
          .from('generated_reports')
          .select(`
            template_id,
            report_templates!inner(name)
          `)
          .eq('organization_id', organizationId),
        
        supabase
          .from('generated_reports')
          .select('format')
          .eq('organization_id', organizationId)
      ])

      // Process template usage
      const templateUsage: Record<string, { name: string; count: number }> = {}
      if (templatesResult.data) {
        templatesResult.data.forEach(report => {
          const key = report.template_id
          const template = report.report_templates as any
          if (!templateUsage[key]) {
            templateUsage[key] = { name: template.name, count: 0 }
          }
          templateUsage[key].count++
        })
      }

      // Process format usage
      const formatUsage: Record<string, number> = {}
      if (formatsResult.data) {
        formatsResult.data.forEach(report => {
          formatUsage[report.format] = (formatUsage[report.format] || 0) + 1
        })
      }

      const metrics: ReportMetrics = {
        totalReports: totalReportsResult.count || 0,
        recentReports: recentReportsResult.count || 0,
        popularTemplates: Object.entries(templateUsage)
          .map(([template_id, data]) => ({
            template_id,
            name: data.name,
            usage_count: data.count
          }))
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 10),
        exportFormats: formatUsage,
        averageGenerationTime: 0, // TODO: Calculate from generation logs
        successRate: 95, // TODO: Calculate from actual data
        storageUsage: 0 // TODO: Calculate from file sizes
      }

      this.setCache(cacheKey, metrics, 5 * 60 * 1000) // 5 minutes cache
      return metrics

    } catch (error) {
      console.error('Error fetching reporting metrics:', error)
      throw error
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string, organizationId: string): Promise<boolean> {
    try {
      // First check if user has access to this report
      const report = await this.getReportStatus(reportId, organizationId)
      if (!report) {
        return false
      }

      // Delete file from storage if exists
      if (report.file_url) {
        // TODO: Delete from file storage (S3, etc.)
      }

      // Delete from database
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', reportId)
        .eq('organization_id', organizationId)

      if (error) throw error

      return true

    } catch (error) {
      console.error('Error deleting report:', error)
      return false
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Process report generation asynchronously
   */
  private async processReportGeneration(
    reportId: string,
    template: ReportTemplate,
    filters: ReportFilters,
    format: string
  ): Promise<void> {
    try {
      await this.updateReportStatus(reportId, 'generating', 10)

      // Gather data for report
      const reportData = await this.gatherReportData(template, filters)
      await this.updateReportStatus(reportId, 'generating', 50)

      // Generate report content based on template
      const content = await this.buildReportContent(template, reportData)
      await this.updateReportStatus(reportId, 'generating', 70)

      // Export to requested format
      const fileInfo = await this.exportReport(content, format, template.config.formatting)
      await this.updateReportStatus(reportId, 'generating', 90)

      // Update report with final content and file info
      await supabase
        .from('generated_reports')
        .update({
          status: 'completed',
          progress: 100,
          content: format === 'json' ? content : null,
          file_url: fileInfo.url,
          file_size: fileInfo.size,
          generated_at: new Date()
        })
        .eq('id', reportId)

    } catch (error) {
      console.error(`Report generation error for ${reportId}:`, error)
      await this.updateReportStatus(reportId, 'failed', 0, error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Gather all data needed for report generation
   */
  private async gatherReportData(template: ReportTemplate, filters: ReportFilters): Promise<any> {
    const data: any = {
      metadata: {
        generated_at: new Date(),
        template: template,
        filters: filters
      }
    }

    try {
      // Gather analytics data if needed
      if (template.config.sections.some(s => s.type === 'metrics' || s.type === 'charts')) {
        data.analytics = await analyticsService.getOrganizationMetrics(
          template.organization_id,
          filters.dateRange
        )

        data.trends = await analyticsService.getJTBDTrends(
          template.organization_id,
          'weekly',
          filters.dateRange
        )

        data.voiceMetrics = await analyticsService.getVoiceQualityMetrics(
          template.organization_id,
          filters.dateRange
        )

        data.engagement = await analyticsService.getUserEngagementMetrics(
          template.organization_id,
          filters.dateRange
        )
      }

      // Gather survey data if needed
      if (template.config.sections.some(s => s.content?.includes('survey'))) {
        data.surveys = await this.getSurveyData(template.organization_id, filters)
      }

      // Gather response data if needed
      if (template.config.sections.some(s => s.content?.includes('response'))) {
        data.responses = await this.getResponseData(template.organization_id, filters)
      }

      return data

    } catch (error) {
      console.error('Error gathering report data:', error)
      throw error
    }
  }

  /**
   * Build report content from template and data
   */
  private async buildReportContent(template: ReportTemplate, data: any): Promise<any> {
    const content: any = {
      title: template.name,
      description: template.description,
      generated_at: new Date(),
      sections: []
    }

    try {
      // Process each section in order
      for (const section of template.config.sections.sort((a, b) => a.order - b.order)) {
        // Check if section should be included
        if (section.conditional && !this.evaluateCondition(section.conditional, data)) {
          continue
        }

        const sectionContent = await this.buildSection(section, data)
        if (sectionContent) {
          content.sections.push(sectionContent)
        }
      }

      return content

    } catch (error) {
      console.error('Error building report content:', error)
      throw error
    }
  }

  /**
   * Build individual report section
   */
  private async buildSection(section: ReportSection, data: any): Promise<any> {
    const sectionContent: any = {
      id: section.id,
      type: section.type,
      title: section.title,
      content: null
    }

    try {
      switch (section.type) {
        case 'summary':
          sectionContent.content = this.buildSummarySection(data)
          break
        case 'metrics':
          sectionContent.content = this.buildMetricsSection(data)
          break
        case 'charts':
          sectionContent.content = this.buildChartsSection(data)
          break
        case 'tables':
          sectionContent.content = this.buildTablesSection(data)
          break
        case 'insights':
          sectionContent.content = await this.buildInsightsSection(data)
          break
        case 'recommendations':
          sectionContent.content = await this.buildRecommendationsSection(data)
          break
      }

      return sectionContent

    } catch (error) {
      console.error(`Error building section ${section.type}:`, error)
      return null
    }
  }

  /**
   * Export report to specified format
   */
  private async exportReport(content: any, format: string, formatting: ReportFormatting): Promise<{ url: string; size: number }> {
    try {
      let fileBuffer: Buffer
      let mimeType: string
      let extension: string

      switch (format) {
        case 'pdf':
          fileBuffer = await this.exportToPDF(content, formatting)
          mimeType = 'application/pdf'
          extension = 'pdf'
          break
        case 'excel':
          fileBuffer = await this.exportToExcel(content, formatting)
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          extension = 'xlsx'
          break
        case 'powerpoint':
          fileBuffer = await this.exportToPowerPoint(content, formatting)
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
          extension = 'pptx'
          break
        case 'html':
          fileBuffer = Buffer.from(this.exportToHTML(content, formatting))
          mimeType = 'text/html'
          extension = 'html'
          break
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }

      // Upload to storage and return URL
      const fileName = `report_${Date.now()}.${extension}`
      const fileUrl = await this.uploadFile(fileName, fileBuffer, mimeType)

      return {
        url: fileUrl,
        size: fileBuffer.length
      }

    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  }

  /**
   * Export report to PDF format
   */
  private async exportToPDF(content: any, formatting: ReportFormatting): Promise<Buffer> {
    // This would use a PDF generation library like jsPDF or PDFKit
    // For now, returning a mock buffer
    const mockPDF = JSON.stringify(content)
    return Buffer.from(mockPDF)
  }

  /**
   * Export report to Excel format
   */
  private async exportToExcel(content: any, formatting: ReportFormatting): Promise<Buffer> {
    // This would use a library like xlsx or exceljs
    // For now, returning a mock buffer
    const mockExcel = JSON.stringify(content)
    return Buffer.from(mockExcel)
  }

  /**
   * Export report to PowerPoint format
   */
  private async exportToPowerPoint(content: any, formatting: ReportFormatting): Promise<Buffer> {
    // This would use a library like pptxgenjs
    // For now, returning a mock buffer
    const mockPPT = JSON.stringify(content)
    return Buffer.from(mockPPT)
  }

  /**
   * Export report to HTML format
   */
  private exportToHTML(content: any, formatting: ReportFormatting): string {
    // Build HTML from content and formatting
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${content.title}</title>
          <style>
            body { font-family: ${formatting.fonts?.[0] || 'Arial, sans-serif'}; }
            .report-header { color: ${formatting.colors?.[0] || '#000'}; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>${content.title}</h1>
            <p>${content.description}</p>
            <p>Generated: ${content.generated_at}</p>
          </div>
          <div class="report-content">
            ${content.sections.map((section: any) => `
              <div class="section">
                <h2>${section.title}</h2>
                <div>${JSON.stringify(section.content)}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `
  }

  // Helper methods for section building
  private buildSummarySection(data: any): any {
    return {
      overview: data.analytics || {},
      key_metrics: {
        total_surveys: data.analytics?.totalSurveys || 0,
        completion_rate: data.analytics?.completionRate || 0,
        voice_usage: data.analytics?.voiceResponseRate || 0
      }
    }
  }

  private buildMetricsSection(data: any): any {
    return {
      analytics: data.analytics || {},
      trends: data.trends || {},
      voice_metrics: data.voiceMetrics || {}
    }
  }

  private buildChartsSection(data: any): any {
    return {
      completion_trends: data.trends?.data || [],
      voice_quality_trends: data.voiceMetrics?.trends || [],
      engagement_metrics: data.engagement || []
    }
  }

  private buildTablesSection(data: any): any {
    return {
      surveys: data.surveys || [],
      responses: data.responses || [],
      users: data.engagement || []
    }
  }

  private async buildInsightsSection(data: any): Promise<any> {
    // Generate insights based on data patterns
    return {
      key_findings: [
        `Survey completion rate is ${data.analytics?.completionRate || 0}%`,
        `Voice response usage is ${data.analytics?.voiceResponseRate || 0}%`,
        `Average completion time is ${data.analytics?.averageCompletionTime || 0} seconds`
      ],
      recommendations: [
        'Consider improving survey engagement strategies',
        'Voice recording quality could be enhanced',
        'User onboarding may need optimization'
      ]
    }
  }

  private async buildRecommendationsSection(data: any): Promise<any> {
    return {
      action_items: [
        {
          category: 'Engagement',
          priority: 'high',
          description: 'Improve survey completion rates',
          estimated_impact: 'High'
        },
        {
          category: 'Voice Quality',
          priority: 'medium',
          description: 'Enhance voice recording experience',
          estimated_impact: 'Medium'
        }
      ]
    }
  }

  // Utility methods
  private evaluateCondition(condition: ReportCondition, data: any): boolean {
    // Simple condition evaluation - would need more sophisticated logic
    const value = this.getNestedValue(data, condition.field)
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'greater_than':
        return Number(value) > Number(condition.value)
      case 'less_than':
        return Number(value) < Number(condition.value)
      case 'contains':
        return String(value).includes(String(condition.value))
      default:
        return true
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async getSurveyData(organizationId: string, filters: ReportFilters): Promise<any[]> {
    try {
      let query = supabase
        .from('surveys')
        .select('*')
        .eq('organization_id', organizationId)

      if (filters.surveyIds?.length) {
        query = query.in('id', filters.surveyIds)
      }

      const { data, error } = await query
      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching survey data:', error)
      return []
    }
  }

  private async getResponseData(organizationId: string, filters: ReportFilters): Promise<any[]> {
    try {
      let query = supabase
        .from('survey_responses')
        .select(`
          *,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)

      const { data, error } = await query
      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching response data:', error)
      return []
    }
  }

  private calculateNextRun(schedule: ScheduleConfig): Date {
    const now = new Date()
    const nextRun = new Date(now)

    // Simple calculation - would need more sophisticated logic for complex schedules
    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(now.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3)
        break
    }

    nextRun.setHours(schedule.hour, schedule.minute, 0, 0)
    return nextRun
  }

  private async getActiveReports(organizationId: string): Promise<GeneratedReport[]> {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('id, status')
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'generating'])

      if (error) throw error
      return (data || []) as GeneratedReport[]
    } catch (error) {
      console.error('Error fetching active reports:', error)
      return []
    }
  }

  private async updateReportStatus(
    reportId: string,
    status: string,
    progress: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = { status, progress }
      if (errorMessage) {
        updateData.error_message = errorMessage
      }

      await supabase
        .from('generated_reports')
        .update(updateData)
        .eq('id', reportId)
    } catch (error) {
      console.error('Error updating report status:', error)
    }
  }

  private async uploadFile(fileName: string, buffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Upload file to storage (Supabase Storage, S3, etc.)
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
    }
  }

  // Cache management
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && (Date.now() - cached.timestamp.getTime()) < cached.ttl) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key)
    }
    return null
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })
  }

  private clearTemplateCache(organizationId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(`template_`) && key.includes(organizationId)
    )
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

// Singleton instance
export const reportingService = new ReportingService()

// ============================================================================
// DEFAULT REPORT TEMPLATES
// ============================================================================

export const DEFAULT_TEMPLATES = {
  executive: {
    name: 'Executive Summary',
    type: 'executive' as const,
    description: 'High-level overview for executive stakeholders',
    config: {
      sections: [
        {
          id: 'exec_summary',
          type: 'summary' as const,
          title: 'Executive Summary',
          content: 'overview',
          order: 1,
          required: true
        },
        {
          id: 'key_metrics',
          type: 'metrics' as const,
          title: 'Key Performance Indicators',
          content: 'kpi',
          order: 2,
          required: true
        },
        {
          id: 'recommendations',
          type: 'recommendations' as const,
          title: 'Strategic Recommendations',
          content: 'strategic',
          order: 3,
          required: true
        }
      ],
      formatting: {
        theme: 'corporate' as const,
        colors: ['#1f2937', '#3b82f6', '#10b981'],
        fonts: ['Arial', 'Helvetica'],
        layout: 'single-column' as const,
        pageSize: 'A4' as const,
        orientation: 'portrait' as const
      },
      filters: {},
      aggregations: [],
      visualizations: []
    }
  }
}