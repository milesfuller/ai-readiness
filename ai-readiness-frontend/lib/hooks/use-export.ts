'use client'

import { useState, useCallback } from 'react'
import { exportService } from '@/lib/services/export-service'
import { ExportOptions } from '@/lib/types'
import { useAuth } from './use-auth'

export interface ExportState {
  loading: boolean
  error: string | null
  progress?: number
}

export interface UseExportOptions {
  onSuccess?: (filename: string) => void
  onError?: (error: string) => void
  onProgress?: (progress: number) => void
}

export const useExport = (options: UseExportOptions = {}) => {
  const [state, setState] = useState<ExportState>({
    loading: false,
    error: null
  })
  
  const { user } = useAuth()

  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  /**
   * Export survey data with comprehensive error handling
   */
  const exportSurveyData = useCallback(async (
    exportOptions: ExportOptions,
    surveyId?: string,
    organizationId?: string
  ) => {
    if (!user) {
      const error = 'User must be authenticated to export data'
      updateState({ error })
      options.onError?.(error)
      return
    }

    updateState({ loading: true, error: null, progress: 0 })

    try {
      options.onProgress?.(10)
      
      let result: Blob | string
      let filename: string
      let mimeType: string

      // Determine export type and filename
      const timestamp = new Date().toISOString().split('T')[0]
      const userRole = user.role || 'user'
      
      switch (exportOptions.format) {
        case 'pdf': {
          options.onProgress?.(30)
          
          if (surveyId) {
            result = await exportService.generateSurveyPDF(surveyId, exportOptions)
            filename = `survey-report-${surveyId}-${timestamp}.pdf`
          } else if (organizationId) {
            result = await exportService.generateOrganizationReport(organizationId, exportOptions)
            filename = `organization-report-${organizationId}-${timestamp}.pdf`
          } else {
            throw new Error('PDF export requires either surveyId or organizationId')
          }
          
          mimeType = 'application/pdf'
          break
        }
        
        case 'csv': {
          options.onProgress?.(30)
          const csvData = await exportService.exportToCSV(exportOptions)
          result = new Blob([csvData], { type: 'text/csv' })
          filename = `survey-data-${timestamp}.csv`
          mimeType = 'text/csv'
          break
        }
        
        case 'json': {
          options.onProgress?.(30)
          const jsonData = await exportService.exportToJSON(exportOptions)
          result = new Blob([jsonData], { type: 'application/json' })
          filename = `survey-data-${timestamp}.json`
          mimeType = 'application/json'
          break
        }
        
        default:
          throw new Error(`Unsupported export format: ${exportOptions.format}`)
      }

      options.onProgress?.(70)

      // Download the file
      if (result instanceof Blob) {
        exportService.downloadFile(result, filename, mimeType)
      } else {
        // Fallback for string data
        const blob = new Blob([result], { type: mimeType })
        exportService.downloadFile(blob, filename, mimeType)
      }

      options.onProgress?.(100)
      updateState({ loading: false, progress: 100 })
      options.onSuccess?.(filename)

      // Log export activity
      console.log(`Export completed: ${filename} by ${user.email} (${userRole})`)
      
    } catch (error) {
      console.error('Export failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      updateState({ loading: false, error: errorMessage })
      options.onError?.(errorMessage)
    }
  }, [user, options, updateState])

  /**
   * Quick export functions for common use cases
   */
  const exportSurveyPDF = useCallback((surveyId: string, includePersonalData = false) => {
    return exportSurveyData(
      {
        format: 'pdf',
        includePersonalData,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      },
      surveyId
    )
  }, [exportSurveyData])

  const exportSurveyCSV = useCallback((filters?: ExportOptions['filters']) => {
    return exportSurveyData({
      format: 'csv',
      includePersonalData: false,
      filters,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    })
  }, [exportSurveyData])

  const exportOrganizationReport = useCallback((organizationId: string, includePersonalData = false) => {
    return exportSurveyData(
      {
        format: 'pdf',
        includePersonalData,
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      },
      undefined,
      organizationId
    )
  }, [exportSurveyData])

  /**
   * Get available export formats based on user permissions
   */
  const getAvailableFormats = useCallback(() => {
    return exportService.getAvailableFormats()
  }, [])

  /**
   * Check if user can export personal data
   */
  const canExportPersonalData = useCallback(() => {
    return user && ['admin', 'org_admin'].includes(user.role)
  }, [user])

  /**
   * Validate export options
   */
  const validateExportOptions = useCallback((exportOptions: ExportOptions): string | null => {
    // Check date range
    if (exportOptions.dateRange?.start && exportOptions.dateRange?.end) {
      const start = new Date(exportOptions.dateRange.start)
      const end = new Date(exportOptions.dateRange.end)
      
      if (start > end) {
        return 'Start date must be before end date'
      }
      
      const maxRange = 365 * 24 * 60 * 60 * 1000 // 1 year
      if (end.getTime() - start.getTime() > maxRange) {
        return 'Date range cannot exceed 1 year'
      }
    }

    // Check permissions for personal data
    if (exportOptions.includePersonalData && !canExportPersonalData()) {
      return 'Insufficient permissions to export personal data'
    }

    // Check format support
    const availableFormats = getAvailableFormats()
    if (!availableFormats.some(f => f.value === exportOptions.format)) {
      return 'Export format not available for your role'
    }

    return null
  }, [canExportPersonalData, getAvailableFormats])

  /**
   * Estimate export size and duration
   */
  const estimateExport = useCallback(async (exportOptions: ExportOptions): Promise<{
    estimatedSize: string
    estimatedDuration: string
    recordCount: number
  }> => {
    // This would typically query the database for counts
    // For now, return mock estimates
    const recordCount = 1000 // Mock value
    
    let estimatedSize: string
    let estimatedDuration: string

    switch (exportOptions.format) {
      case 'csv':
        estimatedSize = `${Math.round(recordCount * 0.5)}KB`
        estimatedDuration = '5-10 seconds'
        break
      case 'json':
        estimatedSize = `${Math.round(recordCount * 1.2)}KB`
        estimatedDuration = '10-15 seconds'
        break
      case 'pdf':
        estimatedSize = `${Math.round(recordCount * 0.1)}MB`
        estimatedDuration = '30-60 seconds'
        break
      default:
        estimatedSize = 'Unknown'
        estimatedDuration = 'Unknown'
    }

    return {
      estimatedSize,
      estimatedDuration,
      recordCount
    }
  }, [])

  return {
    // State
    loading: state.loading,
    error: state.error,
    progress: state.progress,
    
    // Actions
    exportSurveyData,
    exportSurveyPDF,
    exportSurveyCSV,
    exportOrganizationReport,
    clearError,
    
    // Utilities
    getAvailableFormats,
    canExportPersonalData,
    validateExportOptions,
    estimateExport
  }
}