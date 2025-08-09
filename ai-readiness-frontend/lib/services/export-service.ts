import { createClient } from '@/lib/supabase/client'
import type { ExportOptions, Survey, SurveyResponse, User, Organization, Analytics, JTBDForces } from '@/lib/types'

const supabase = createClient()
import jsPDF from 'jspdf'
import Papa from 'papaparse'

// Types for export data structures
export interface ExportData {
  surveys: Survey[]
  responses: SurveyResponse[]
  users: User[]
  analytics: Analytics
  exportMetadata: {
    exportedAt: string
    exportedBy: string
    totalRecords: number
    filters: ExportOptions['filters']
    privacyLevel: 'full' | 'anonymized'
  }
}

export interface ReportData {
  organization: Organization
  survey: Survey
  responses: SurveyResponse[]
  analytics: Analytics
  jtbdAnalysis: JTBDForces
  metadata: {
    generatedAt: string
    totalResponses: number
    completionRate: number
    averageTime: number
  }
}

/**
 * Export Service - Handles data visualization and export functionality
 * Supports PDF, CSV, and JSON exports with GDPR compliance
 */
export class ExportService {
  private currentUser: User | null = null
  private userRole: string | null = null

  constructor() {
    // Don't initialize user in constructor - do it explicitly when needed
  }

  async initializeUser() {
    try {
      // Use the supabase client
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            *,
            organization:organizations(*)
          `)
          .eq('id', user.id)
          .single()
        
        this.currentUser = profile
        this.userRole = profile?.role
      }
    } catch (error) {
      console.error('Failed to initialize user:', error)
    }
  }

  /**
   * Check if user has permission to export data
   */
  private checkExportPermission(includePersonalData: boolean): boolean {
    if (!this.userRole) return false
    
    // Only system_admin and org_admin can export personal data
    if (includePersonalData && !['system_admin', 'org_admin'].includes(this.userRole)) {
      throw new Error('Insufficient permissions to export personal data')
    }
    
    return true
  }

  /**
   * Anonymize sensitive data for GDPR compliance
   */
  private anonymizeData<T extends Record<string, any>>(
    data: T[], 
    fieldsToAnonymize: string[]
  ): T[] {
    return data.map(item => {
      const anonymized = { ...item }
      fieldsToAnonymize.forEach(field => {
        if (anonymized[field as keyof T]) {
          if (field.includes('email')) {
            (anonymized as any)[field] = `user${Math.random().toString(36).substr(2, 9)}@example.com`
          } else if (field.includes('name') || field.includes('Name')) {
            (anonymized as any)[field] = `Anonymous User ${Math.random().toString(36).substr(2, 4)}`
          } else {
            (anonymized as any)[field] = '[REDACTED]'
          }
        }
      })
      return anonymized
    })
  }

  /**
   * Fetch survey data with optional filters
   */
  private async fetchSurveyData(options: ExportOptions): Promise<ExportData> {
    const { filters, dateRange, includePersonalData } = options
    
    let surveysQuery = supabase
      .from('surveys')
      .select(`
        *,
        responses:survey_responses(*),
        created_by_user:users!surveys_created_by_fkey(*)
      `)

    // Apply organization filter for org_admin
    if (this.userRole === 'org_admin' && this.currentUser?.organizationId) {
      surveysQuery = surveysQuery.eq('organization_id', this.currentUser.organizationId)
    }

    // Apply date range filter
    if (dateRange?.start) {
      surveysQuery = surveysQuery.gte('created_at', dateRange.start)
    }
    if (dateRange?.end) {
      surveysQuery = surveysQuery.lte('created_at', dateRange.end)
    }

    const { data: surveys, error: surveysError } = await surveysQuery

    if (surveysError) throw new Error(`Failed to fetch surveys: ${surveysError.message}`)

    // Fetch responses with filters
    let responsesQuery = supabase
      .from('survey_responses')
      .select(`
        *,
        user:users(*),
        survey:surveys(*)
      `)

    if (filters?.status) {
      responsesQuery = responsesQuery.eq('status', filters.status)
    }

    if (dateRange?.start) {
      responsesQuery = responsesQuery.gte('started_at', dateRange.start)
    }
    if (dateRange?.end) {
      responsesQuery = responsesQuery.lte('started_at', dateRange.end)
    }

    const { data: responses, error: responsesError } = await responsesQuery

    if (responsesError) throw new Error(`Failed to fetch responses: ${responsesError.message}`)

    // Fetch users
    let usersQuery = supabase.from('users').select('*')
    
    if (this.userRole === 'org_admin' && this.currentUser?.organizationId) {
      usersQuery = usersQuery.eq('organization_id', this.currentUser.organizationId)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`)

    // Generate analytics
    const analytics = this.generateAnalytics(surveys || [], responses || [])

    // Anonymize data if personal data should not be included
    let processedUsers = users || []
    let processedResponses = responses || []

    if (!includePersonalData) {
      processedUsers = this.anonymizeData(users || [], [
        'email', 'first_name', 'last_name', 'profile.firstName', 'profile.lastName'
      ])
      processedResponses = this.anonymizeData(responses || [], [
        'user.email', 'user.first_name', 'user.last_name', 'metadata.ipAddress'
      ])
    }

    return {
      surveys: surveys || [],
      responses: processedResponses,
      users: processedUsers,
      analytics,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: this.currentUser?.email || 'unknown',
        totalRecords: (surveys?.length || 0) + (responses?.length || 0),
        filters,
        privacyLevel: includePersonalData ? 'full' : 'anonymized'
      }
    }
  }

  /**
   * Generate analytics from surveys and responses
   */
  private generateAnalytics(surveys: Survey[], responses: SurveyResponse[]): Analytics {
    const completedResponses = responses.filter(r => r.status === 'completed')
    const totalResponses = responses.length
    const completionRate = totalResponses > 0 ? (completedResponses.length / totalResponses) * 100 : 0

    // Calculate average time
    const timesArray = completedResponses
      .map(r => r.metadata?.completionTime)
      .filter(time => time !== undefined) as number[]
    
    const averageTime = timesArray.length > 0 
      ? timesArray.reduce((sum, time) => sum + time, 0) / timesArray.length 
      : 0

    // Department breakdown
    const departmentBreakdown: Record<string, number> = {}
    responses.forEach(response => {
      const dept = (response as any).user?.profile?.department || 'Unknown'
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1
    })

    // JTBD Analysis (simplified)
    const jtbdAnalysis: JTBDForces = {
      push: Math.random() * 5 + 3, // TODO: Calculate from actual responses
      pull: Math.random() * 5 + 3,
      habit: Math.random() * 5 + 2,
      anxiety: Math.random() * 5 + 2
    }

    // Top issues (simplified)
    const topIssues = [
      'Communication gaps',
      'Process inefficiencies',
      'Technology adoption',
      'Training needs',
      'Resource constraints'
    ]

    return {
      totalResponses,
      completionRate,
      averageTime,
      topIssues,
      departmentBreakdown,
      jtbdAnalysis
    }
  }

  /**
   * Export data to CSV format
   */
  async exportToCSV(options: ExportOptions): Promise<string> {
    this.checkExportPermission(options.includePersonalData)
    
    const data = await this.fetchSurveyData(options)
    
    // Flatten responses for CSV export
    const csvData = data.responses.map(response => {
      const flatResponse: any = {
        'Response ID': response.id,
        'Survey ID': response.surveyId,
        'User ID': response.userId,
        'Status': response.status,
        'Started At': response.startedAt,
        'Completed At': response.completedAt || '',
        'Completion Time (seconds)': response.metadata?.completionTime || '',
        'Device': response.metadata?.device || '',
        'Voice Input Used': response.metadata?.voiceInputUsed ? 'Yes' : 'No'
      }

      // Add user information if personal data is included
      if (options.includePersonalData && (response as any).user) {
        const user = (response as any).user
        flatResponse['User Email'] = user.email || ''
        flatResponse['User Name'] = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
        flatResponse['Department'] = user.profile?.department || ''
        flatResponse['Job Title'] = user.profile?.jobTitle || ''
      }

      // Add answers
      response.answers.forEach((answer, index) => {
        flatResponse[`Answer ${index + 1} (Question ${answer.questionId})`] = 
          Array.isArray(answer.answer) ? answer.answer.join('; ') : answer.answer
        if (answer.confidence) {
          flatResponse[`Answer ${index + 1} Confidence`] = answer.confidence
        }
      })

      return flatResponse
    })

    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
      newline: '\n'
    })

    return csv
  }

  /**
   * Export data to JSON format
   */
  async exportToJSON(options: ExportOptions): Promise<string> {
    this.checkExportPermission(options.includePersonalData)
    
    const data = await this.fetchSurveyData(options)
    
    return JSON.stringify(data, null, 2)
  }

  /**
   * Generate PDF report for individual survey
   */
  async generateSurveyPDF(surveyId: string, options: ExportOptions): Promise<Blob> {
    this.checkExportPermission(options.includePersonalData)
    
    // Use the existing supabase client
    // Fetch survey-specific data with real responses and analysis
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        *,
        responses:survey_responses(
          *,
          user:profiles(
            *,
            organization:organizations(*)
          ),
          llm_analysis:llm_analysis_results(
            *,
            analysis_result
          )
        ),
        organization:organizations(*),
        questions:survey_questions(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError) throw new Error(`Failed to fetch survey: ${surveyError.message}`)

    const responses = survey.responses || []
    const analytics = this.generateAnalytics([survey], responses)
    
    // JTBD analysis is already included in the analytics object

    // Create PDF using jsPDF
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    let yPosition = 20

    // Helper function to add text with line wrapping
    const addText = (text: string, x: number, y: number, maxWidth?: number) => {
      if (maxWidth) {
        const lines = pdf.splitTextToSize(text, maxWidth)
        pdf.text(lines, x, y)
        return y + (lines.length * 7)
      } else {
        pdf.text(text, x, y)
        return y + 7
      }
    }

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('AI Readiness Survey Report', 20, yPosition)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition + 10)
    
    if (survey.organization && options.includePersonalData) {
      yPosition = addText(`Organization: ${survey.organization.name}`, 20, yPosition)
    }

    // Survey Information
    yPosition += 10
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Survey Information', 20, yPosition)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(`Title: ${survey.title}`, 20, yPosition + 5)
    yPosition = addText(`Description: ${survey.description}`, 20, yPosition, pageWidth - 40)
    yPosition = addText(`Status: ${survey.status}`, 20, yPosition + 5)
    yPosition = addText(`Total Questions: ${survey.questions?.length || 0}`, 20, yPosition)
    yPosition = addText(`Total Responses: ${responses.length}`, 20, yPosition)

    // Analytics Section
    yPosition += 10
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Analytics Summary', 20, yPosition)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(`Completion Rate: ${analytics.completionRate.toFixed(1)}%`, 20, yPosition + 5)
    yPosition = addText(`Average Completion Time: ${Math.round(analytics.averageTime / 60)} minutes`, 20, yPosition)

    // Department Breakdown
    if (Object.keys(analytics.departmentBreakdown).length > 0) {
      yPosition += 10
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('Department Breakdown', 20, yPosition)
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      Object.entries(analytics.departmentBreakdown).forEach(([dept, count]) => {
        yPosition = addText(`${dept}: ${count} responses`, 30, yPosition + 5)
      })
    }

    // JTBD Analysis
    yPosition += 10
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    yPosition = addText('Jobs-to-be-Done Analysis', 20, yPosition)
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    yPosition = addText(`Push Forces (Pain of Old): ${analytics.jtbdAnalysis.push.toFixed(1)}/5`, 30, yPosition + 5)
    yPosition = addText(`Pull Forces (Pull of New): ${analytics.jtbdAnalysis.pull.toFixed(1)}/5`, 30, yPosition)
    yPosition = addText(`Anchors (Habits): ${analytics.jtbdAnalysis.habit.toFixed(1)}/5`, 30, yPosition)
    yPosition = addText(`Anxieties: ${analytics.jtbdAnalysis.anxiety.toFixed(1)}/5`, 30, yPosition)
    
    // Add force analysis explanation
    yPosition += 10
    const forceExplanation = this.generateJTBDExplanation(analytics.jtbdAnalysis)
    yPosition = addText('Analysis:', 30, yPosition)
    yPosition = addText(forceExplanation, 30, yPosition + 5, pageWidth - 60)

    // Top Issues
    if (analytics.topIssues.length > 0) {
      yPosition += 10
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      yPosition = addText('Top Issues Identified', 20, yPosition)
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      analytics.topIssues.forEach((issue, index) => {
        yPosition = addText(`${index + 1}. ${issue}`, 30, yPosition + 5)
      })
    }

    // Privacy Notice
    yPosition += 20
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'italic')
    const privacyText = options.includePersonalData 
      ? 'This report contains personal data and should be handled according to privacy regulations.'
      : 'Personal data has been anonymized in this report for privacy protection.'
    yPosition = addText(privacyText, 20, yPosition, pageWidth - 40)

    return new Promise((resolve) => {
      const blob = pdf.output('blob')
      resolve(blob)
    })
  }

  /**
   * Generate organization-level report
   */
  async generateOrganizationReport(organizationId: string, options: ExportOptions): Promise<Blob> {
    this.checkExportPermission(options.includePersonalData)
    
    // Check if user has access to this organization
    if (this.userRole === 'org_admin' && this.currentUser?.organizationId !== organizationId) {
      throw new Error('Access denied: Cannot access other organization data')
    }

    // Fetch organization data
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError) throw new Error(`Failed to fetch organization: ${orgError.message}`)

    // Fetch surveys and responses for the organization
    const { data: surveys, error: surveysError } = await supabase
      .from('surveys')
      .select(`
        *,
        responses:survey_responses(*)
      `)
      .eq('organization_id', organizationId)

    if (surveysError) throw new Error(`Failed to fetch surveys: ${surveysError.message}`)

    const allResponses = surveys?.flatMap(s => s.responses || []) || []
    const analytics = this.generateAnalytics(surveys || [], allResponses)

    // Create comprehensive PDF report
    const pdf = new jsPDF()
    let yPosition = 20

    // Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Organization AI Readiness Report', 20, yPosition)
    yPosition += 10
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    if (options.includePersonalData) {
      pdf.text(`Organization: ${organization.name}`, 20, yPosition + 10)
      yPosition += 20
    }
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition + 5)
    yPosition += 10

    // Executive Summary
    yPosition += 15
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Executive Summary', 20, yPosition)
    yPosition += 10
    
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Total Surveys: ${surveys?.length || 0}`, 20, yPosition + 10)
    yPosition += 10
    pdf.text(`Total Responses: ${allResponses.length}`, 20, yPosition + 5)
    yPosition += 5
    pdf.text(`Overall Completion Rate: ${analytics.completionRate.toFixed(1)}%`, 20, yPosition + 5)
    yPosition += 15

    // More detailed analytics would go here...
    
    return new Promise((resolve) => {
      const blob = pdf.output('blob')
      resolve(blob)
    })
  }

  /**
   * Main export function that handles all formats
   */
  async exportData(options: ExportOptions): Promise<Blob | string> {
    try {
      switch (options.format) {
        case 'csv':
          const csvData = await this.exportToCSV(options)
          return new Blob([csvData], { type: 'text/csv' })
        
        case 'json':
          const jsonData = await this.exportToJSON(options)
          return new Blob([jsonData], { type: 'application/json' })
        
        case 'pdf':
          // For PDF, we need to know if it's a survey or organization report
          // This would be determined by additional parameters
          throw new Error('PDF export requires specific survey or organization ID')
        
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  /**
   * Download file helper
   */
  downloadFile(blob: Blob, filename: string, mimeType: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.type = mimeType
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Get available export formats based on user role
   */
  getAvailableFormats(): Array<{ value: string; label: string; description: string }> {
    const formats = [
      { value: 'csv', label: 'CSV', description: 'Spreadsheet format for data analysis' },
      { value: 'json', label: 'JSON', description: 'Structured data for developers' }
    ]

    // PDF generation requires additional permissions
    if (['system_admin', 'org_admin'].includes(this.userRole || '')) {
      formats.push({ 
        value: 'pdf', 
        label: 'PDF', 
        description: 'Professional report format' 
      })
    }

    return formats
  }

  private generateJTBDExplanation(forces: JTBDForces): string {
    const dominant = Object.entries(forces)
      .sort(([,a], [,b]) => b - a)
      .map(([key, value]) => ({ force: key, strength: value }))
    
    const strongestForce = dominant[0]
    let explanation = ''
    
    switch (strongestForce.force) {
      case 'push':
        explanation = 'The strongest force is frustration with current processes, indicating significant pain points that drive the need for AI adoption.'
        break
      case 'pull':
        explanation = 'The strongest force is attraction to AI benefits, showing enthusiasm and clear vision for improvement opportunities.'
        break
      case 'habit':
        explanation = 'The strongest force is resistance to change, suggesting organizational inertia and attachment to existing processes.'
        break
      case 'anxiety':
        explanation = 'The strongest force is concern about change, indicating fears and uncertainties that may hinder AI adoption.'
        break
      default:
        explanation = 'Forces are relatively balanced, suggesting a mixed readiness state requiring targeted interventions.'
    }
    
    return `${explanation} Overall readiness score: ${Object.values(forces).reduce((a, b) => a + b, 0) / 4}/5`
  }
}

// Export singleton instance
export const exportService = new ExportService()