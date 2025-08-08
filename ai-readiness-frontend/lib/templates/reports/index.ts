/**
 * Report Templates Index
 * 
 * Centralized access to all available report templates with factory functions
 * and utility methods for template management and customization.
 */

import { executiveSummaryTemplate, executiveTemplateHelpers } from './executive-summary'
import { detailedAnalyticsTemplate, analyticsTemplateHelpers } from './detailed-analytics'
import { jtbdAnalysisTemplate, jtbdTemplateHelpers } from './jtbd-analysis'
import { voiceInsightsTemplate, voiceTemplateHelpers } from './voice-insights'
import { segmentComparisonTemplate, segmentTemplateHelpers } from './segment-comparison'
import type { ReportTemplate } from '@/services/database/reporting.service'

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const REPORT_TEMPLATES = {
  executive: executiveSummaryTemplate,
  analytics: detailedAnalyticsTemplate,
  jtbd: jtbdAnalysisTemplate,
  voice: voiceInsightsTemplate,
  segment: segmentComparisonTemplate
} as const

export const TEMPLATE_HELPERS = {
  executive: executiveTemplateHelpers,
  analytics: analyticsTemplateHelpers,
  jtbd: jtbdTemplateHelpers,
  voice: voiceTemplateHelpers,
  segment: segmentTemplateHelpers
} as const

// ============================================================================
// TEMPLATE FACTORY FUNCTIONS
// ============================================================================

export class ReportTemplateFactory {
  /**
   * Create a new template instance with organization-specific customization
   */
  static createTemplate(
    templateType: keyof typeof REPORT_TEMPLATES,
    organizationId: string,
    createdBy: string,
    customizations?: Partial<ReportTemplate['config']>
  ): ReportTemplate {
    const baseTemplate = REPORT_TEMPLATES[templateType]
    
    const template: ReportTemplate = {
      ...baseTemplate,
      id: `${templateType}_${organizationId}_${Date.now()}`,
      organization_id: organizationId,
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
      is_active: true,
      config: customizations ? {
        ...baseTemplate.config,
        ...customizations,
        sections: customizations.sections || baseTemplate.config.sections,
        formatting: customizations.formatting ? {
          ...baseTemplate.config.formatting,
          ...customizations.formatting
        } : baseTemplate.config.formatting
      } : baseTemplate.config
    }

    return template
  }

  /**
   * Get all available template types with metadata
   */
  static getAvailableTemplates(): Array<{
    type: string
    name: string
    description: string
    category: 'strategic' | 'analytical' | 'operational'
    complexity: 'basic' | 'intermediate' | 'advanced'
    estimatedGenerationTime: string
    supportedFormats: string[]
  }> {
    return [
      {
        type: 'executive',
        name: 'Executive Summary',
        description: 'High-level strategic overview for senior leadership',
        category: 'strategic',
        complexity: 'basic',
        estimatedGenerationTime: '2-3 minutes',
        supportedFormats: ['pdf', 'powerpoint', 'html']
      },
      {
        type: 'analytics',
        name: 'Detailed Analytics',
        description: 'Comprehensive statistical analysis with predictive insights',
        category: 'analytical',
        complexity: 'advanced',
        estimatedGenerationTime: '8-12 minutes',
        supportedFormats: ['pdf', 'excel', 'html']
      },
      {
        type: 'jtbd',
        name: 'Jobs-to-be-Done Analysis',
        description: 'JTBD framework analysis with force mapping and insights',
        category: 'analytical',
        complexity: 'intermediate',
        estimatedGenerationTime: '5-7 minutes',
        supportedFormats: ['pdf', 'powerpoint', 'html']
      },
      {
        type: 'voice',
        name: 'Voice Insights Report',
        description: 'Voice recording analysis with quality metrics and transcription insights',
        category: 'operational',
        complexity: 'intermediate',
        estimatedGenerationTime: '4-6 minutes',
        supportedFormats: ['pdf', 'html']
      },
      {
        type: 'segment',
        name: 'Segment Comparison',
        description: 'Comparative analysis across organizational segments',
        category: 'analytical',
        complexity: 'intermediate',
        estimatedGenerationTime: '6-8 minutes',
        supportedFormats: ['pdf', 'excel', 'powerpoint', 'html']
      }
    ]
  }

  /**
   * Customize template for specific use case
   */
  static customizeTemplate(
    baseTemplate: ReportTemplate,
    customizations: {
      title?: string
      sections?: Array<{ id: string; enabled: boolean; order?: number }>
      formatting?: Partial<ReportTemplate['config']['formatting']>
      filters?: Partial<ReportTemplate['config']['filters']>
      branding?: {
        logo?: string
        colors?: string[]
        fonts?: string[]
        footer?: string
      }
    }
  ): ReportTemplate {
    const customized = JSON.parse(JSON.stringify(baseTemplate))

    if (customizations.title) {
      customized.name = customizations.title
    }

    if (customizations.sections) {
      customized.config.sections = customized.config.sections
        .map((section: any) => {
          const customSection = customizations.sections!.find(c => c.id === section.id)
          if (customSection) {
            return {
              ...section,
              required: customSection.enabled ? section.required : false,
              order: customSection.order !== undefined ? customSection.order : section.order
            }
          }
          return section
        })
        .filter((section: any) => {
          const customSection = customizations.sections!.find(c => c.id === section.id)
          return !customSection || customSection.enabled
        })
        .sort((a: any, b: any) => a.order - b.order)
    }

    if (customizations.formatting) {
      customized.config.formatting = {
        ...customized.config.formatting,
        ...customizations.formatting
      }
    }

    if (customizations.filters) {
      customized.config.filters = {
        ...customized.config.filters,
        ...customizations.filters
      }
    }

    if (customizations.branding) {
      customized.config.branding = customizations.branding
    }

    customized.updated_at = new Date()

    return customized
  }

  /**
   * Validate template configuration
   */
  static validateTemplate(template: ReportTemplate): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Required field validation
    if (!template.name?.trim()) {
      errors.push('Template name is required')
    }

    if (!template.organization_id) {
      errors.push('Organization ID is required')
    }

    if (!template.config?.sections?.length) {
      errors.push('Template must have at least one section')
    }

    // Section validation
    template.config?.sections?.forEach((section, index) => {
      if (!section.id) {
        errors.push(`Section ${index + 1} is missing an ID`)
      }

      if (!section.title?.trim()) {
        errors.push(`Section ${section.id || index + 1} is missing a title`)
      }

      if (typeof section.order !== 'number') {
        errors.push(`Section ${section.id || index + 1} must have a numeric order`)
      }
    })

    // Formatting validation
    const formatting = template.config?.formatting
    if (formatting) {
      if (formatting.colors && !Array.isArray(formatting.colors)) {
        errors.push('Formatting colors must be an array')
      }

      if (formatting.fonts && !Array.isArray(formatting.fonts)) {
        errors.push('Formatting fonts must be an array')
      }

      if (formatting.pageSize && !['A4', 'Letter', 'Legal'].includes(formatting.pageSize)) {
        warnings.push('Page size should be A4, Letter, or Legal')
      }
    }

    // Check for duplicate section IDs
    const sectionIds = template.config?.sections?.map(s => s.id) || []
    const duplicateIds = sectionIds.filter((id, index) => sectionIds.indexOf(id) !== index)
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate section IDs found: ${duplicateIds.join(', ')}`)
    }

    // Check section order conflicts
    const orders = template.config?.sections?.map(s => s.order) || []
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index)
    if (duplicateOrders.length > 0) {
      warnings.push(`Duplicate section orders found: ${duplicateOrders.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Generate template preview data
   */
  static generatePreviewData(template: ReportTemplate): any {
    return {
      title: template.name,
      description: template.description,
      sections: template.config.sections.map(section => ({
        id: section.id,
        title: section.title,
        type: section.type,
        order: section.order,
        preview_content: this.generateSectionPreview(section.type)
      })),
      formatting: template.config.formatting,
      estimated_pages: this.estimatePageCount(template),
      estimated_generation_time: this.estimateGenerationTime(template)
    }
  }

  private static generateSectionPreview(sectionType: string): any {
    const previews: Record<string, any> = {
      summary: {
        overview: 'Executive overview content will appear here...',
        key_metrics: ['Metric 1: 85%', 'Metric 2: 92%', 'Metric 3: 78%']
      },
      metrics: {
        primary_metrics: [
          { name: 'Completion Rate', value: '85%', trend: 'up' },
          { name: 'Participation Rate', value: '92%', trend: 'up' },
          { name: 'Voice Adoption', value: '67%', trend: 'stable' }
        ]
      },
      charts: {
        chart_count: 3,
        chart_types: ['line', 'bar', 'pie'],
        sample_data: 'Chart visualizations will be generated based on your data'
      },
      tables: {
        table_count: 2,
        sample_rows: 10,
        description: 'Detailed data tables with statistical summaries'
      },
      insights: {
        insight_count: 5,
        categories: ['trends', 'patterns', 'opportunities', 'concerns'],
        description: 'AI-generated insights based on data analysis'
      },
      recommendations: {
        recommendation_count: 8,
        priorities: ['immediate', 'short-term', 'long-term'],
        description: 'Actionable recommendations with implementation guidance'
      }
    }

    return previews[sectionType] || { description: 'Section content preview' }
  }

  private static estimatePageCount(template: ReportTemplate): number {
    const sectionPageEstimates: Record<string, number> = {
      summary: 1,
      metrics: 2,
      charts: 3,
      tables: 4,
      insights: 2,
      recommendations: 2
    }

    return template.config.sections.reduce((total, section) => {
      return total + (sectionPageEstimates[section.type] || 1)
    }, 1) // +1 for cover page
  }

  private static estimateGenerationTime(template: ReportTemplate): string {
    const sectionTimeEstimates: Record<string, number> = {
      summary: 30,    // seconds
      metrics: 60,
      charts: 120,
      tables: 90,
      insights: 150,
      recommendations: 100
    }

    const totalSeconds = template.config.sections.reduce((total, section) => {
      return total + (sectionTimeEstimates[section.type] || 60)
    }, 30) // +30 for initialization

    const minutes = Math.ceil(totalSeconds / 60)
    return minutes < 2 ? 'Under 2 minutes' : `${minutes} minutes`
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const templateUtils = {
  /**
   * Get template by type
   */
  getTemplate: (type: keyof typeof REPORT_TEMPLATES) => REPORT_TEMPLATES[type],

  /**
   * Get template helpers
   */
  getHelpers: (type: keyof typeof TEMPLATE_HELPERS) => TEMPLATE_HELPERS[type],

  /**
   * Check if template type is supported
   */
  isValidTemplateType: (type: string): type is keyof typeof REPORT_TEMPLATES => {
    return type in REPORT_TEMPLATES
  },

  /**
   * Get all template types
   */
  getTemplateTypes: () => Object.keys(REPORT_TEMPLATES) as Array<keyof typeof REPORT_TEMPLATES>,

  /**
   * Create default template for organization
   */
  createDefaultTemplate: (
    type: keyof typeof REPORT_TEMPLATES,
    organizationId: string,
    createdBy: string
  ) => ReportTemplateFactory.createTemplate(type, organizationId, createdBy)
}

// Export everything for easy importing
export * from './executive-summary'
export * from './detailed-analytics'
export * from './jtbd-analysis'
export * from './voice-insights'
export * from './segment-comparison'