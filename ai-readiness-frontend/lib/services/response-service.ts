/**
 * Response service functions for individual response management
 * Handles detailed response data, analytics, and admin functions
 */

import { createClient } from '@/lib/supabase/client'
import type { SurveyResponse, SurveyAnswer, User, JTBDForces } from '@/lib/types'

const supabase = createClient()

// Extended types for detailed response management
export interface DetailedSurveyResponse {
  id: string
  surveyId: string
  surveyTitle: string
  surveyDescription: string
  participant: {
    id: string
    firstName: string
    lastName: string
    email: string
    department?: string
    jobTitle?: string
  }
  answers: DetailedSurveyAnswer[]
  questions: ResponseQuestion[]
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  updatedAt?: string
  completionTime?: number
  totalQuestions: number
  adminStatus?: 'normal' | 'flagged' | 'reviewed' | 'follow_up_needed' | 'escalated' | 'archived'
  adminNotes?: AdminNotes[]
}

export interface DetailedSurveyAnswer extends SurveyAnswer {
  question?: ResponseQuestion
  analysis?: {
    sentiment?: number
    themes?: string[]
    confidence?: number
    businessImpact?: 'low' | 'medium' | 'high'
  }
}

export interface ResponseQuestion {
  id: string
  question: string
  type: 'text' | 'multiple_choice' | 'scale' | 'boolean' | 'jtbd'
  category: string
  order: number
  options?: string[]
  required: boolean
}

export interface ResponseAnalytics {
  overallSentimentScore: number
  averageConfidence: number
  engagementScore: number
  readinessScore: number
  businessImpactLevel: 'low' | 'medium' | 'high'
  keyThemes: string[]
  jtbdForces?: JTBDForces
  riskFactors: string[]
  strengths: string[]
  recommendations: string[]
}

export interface AdminNotes {
  id: string
  note: string
  type: 'general' | 'follow_up' | 'concern' | 'status_update'
  createdBy: string
  createdAt: string
}

export interface ResponseComparisonCriteria {
  excludeResponseId: string
  organizationId?: string
  surveyId?: string
  department?: string
  jobTitle?: string
  similarityThreshold?: number
  limit?: number
}

export interface ResponseComparisonData {
  primaryResponse: DetailedSurveyResponse
  comparisonResponse: DetailedSurveyResponse
  metrics: {
    sentimentSimilarity: number
    thematicOverlap: number
    confidenceDifference: number
    demographicMatch: number
    overallSimilarity: number
  }
  commonThemes: string[]
  differentiatingFactors: string[]
}

/**
 * Fetch detailed response by ID
 */
export async function fetchResponseById(
  responseId: string,
  userRole: string,
  organizationId?: string
): Promise<DetailedSurveyResponse> {
  try {
    // Build the query with joins
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        user_id,
        answers,
        status,
        started_at,
        submitted_at,
        completion_time,
        created_at,
        updated_at,
        surveys!inner(
          id,
          title,
          description,
          questions,
          organization_id
        ),
        profiles!inner(
          id,
          user_id,
          first_name,
          last_name,
          email,
          department,
          job_title
        )
      `)
      .eq('id', responseId)

    // Apply role-based filtering
    if (userRole === 'org_admin' && organizationId) {
      query = query.eq('surveys.organization_id', organizationId)
    }

    const { data, error } = await query.single()

    if (error) throw error
    if (!data) throw new Error('Response not found')

    const survey = data.surveys as any
    const profile = data.profiles as any

    // Fetch admin notes
    const { data: adminNotes } = await supabase
      .from('response_admin_notes')
      .select(`
        id,
        note,
        type,
        created_by,
        created_at,
        profiles!response_admin_notes_created_by_fkey(first_name, last_name, email)
      `)
      .eq('response_id', responseId)
      .order('created_at', { ascending: false })

    // Transform the data
    const response: DetailedSurveyResponse = {
      id: data.id,
      surveyId: data.survey_id,
      surveyTitle: survey.title,
      surveyDescription: survey.description || '',
      participant: {
        id: profile.id,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email,
        department: profile.department,
        jobTitle: profile.job_title
      },
      answers: data.answers || [],
      questions: survey.questions || [],
      status: data.status,
      startedAt: data.started_at,
      completedAt: data.submitted_at,
      updatedAt: data.updated_at,
      completionTime: data.completion_time,
      totalQuestions: (survey.questions || []).length,
      adminStatus: 'normal', // Would be fetched from admin_status table
      adminNotes: (adminNotes || []).map((note: any) => ({
        id: note.id,
        note: note.note,
        type: note.type,
        createdBy: note.profiles ? 
          `${note.profiles.first_name || ''} ${note.profiles.last_name || ''}`.trim() || note.profiles.email :
          'Unknown',
        createdAt: note.created_at
      }))
    }

    return response
  } catch (error) {
    console.error('Error fetching response by ID:', error)
    throw error
  }
}

/**
 * Fetch response analytics
 */
export async function fetchResponseAnalytics(
  responseId: string,
  userRole: string,
  organizationId?: string
): Promise<ResponseAnalytics> {
  try {
    // This would typically fetch from analysis results table
    // For now, we'll generate mock analytics based on the response data
    const response = await fetchResponseById(responseId, userRole, organizationId)
    
    // Calculate basic metrics
    const avgConfidence = response.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / response.answers.length
    const completionRate = response.answers.length / response.totalQuestions
    const textResponses = response.answers.filter(a => typeof a.answer === 'string').length

    // Mock sentiment analysis
    const sentimentScore = (Math.random() - 0.5) * 2 // -1 to 1

    // Mock themes extraction
    const themes = [
      'AI Adoption', 'Training Needs', 'Process Automation', 'Data Management',
      'Change Management', 'Technology Integration', 'Skill Development', 
      'Efficiency Gains', 'Cost Concerns', 'Implementation Challenges'
    ]
    const keyThemes = themes.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 6) + 3)

    const analytics: ResponseAnalytics = {
      overallSentimentScore: sentimentScore,
      averageConfidence: avgConfidence,
      engagementScore: Math.min(1, completionRate * 1.2), // Boost for engagement
      readinessScore: (avgConfidence + completionRate + (sentimentScore + 1) / 2) / 3,
      businessImpactLevel: avgConfidence > 3.5 ? 'high' : avgConfidence > 2.5 ? 'medium' : 'low',
      keyThemes,
      jtbdForces: {
        push: Math.random() * 5,
        pull: Math.random() * 5,
        habit: Math.random() * 5,
        anxiety: Math.random() * 5
      },
      riskFactors: completionRate < 0.8 ? ['Incomplete responses', 'Low engagement'] : [],
      strengths: avgConfidence > 3 ? ['High confidence', 'Detailed responses'] : [],
      recommendations: [
        'Consider for early adopter program',
        'Provide additional training resources',
        'Monitor change management concerns'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    }

    return analytics
  } catch (error) {
    console.error('Error fetching response analytics:', error)
    throw error
  }
}

/**
 * Fetch responses for comparison
 */
export async function fetchResponsesForComparison(
  criteria: ResponseComparisonCriteria
): Promise<DetailedSurveyResponse[]> {
  try {
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        user_id,
        answers,
        status,
        started_at,
        submitted_at,
        completion_time,
        surveys!inner(
          id,
          title,
          description,
          questions,
          organization_id
        ),
        profiles!inner(
          id,
          user_id,
          first_name,
          last_name,
          email,
          department,
          job_title
        )
      `)
      .neq('id', criteria.excludeResponseId)
      .eq('status', 'completed')

    // Apply filters
    if (criteria.organizationId) {
      query = query.eq('surveys.organization_id', criteria.organizationId)
    }

    if (criteria.surveyId) {
      query = query.eq('survey_id', criteria.surveyId)
    }

    if (criteria.department) {
      query = query.eq('profiles.department', criteria.department)
    }

    if (criteria.jobTitle) {
      query = query.eq('profiles.job_title', criteria.jobTitle)
    }

    query = query.limit(criteria.limit || 20)

    const { data, error } = await query

    if (error) throw error

    // Transform the data
    const responses: DetailedSurveyResponse[] = (data || []).map((item: any) => {
      const survey = item.surveys
      const profile = item.profiles

      return {
        id: item.id,
        surveyId: item.survey_id,
        surveyTitle: survey.title,
        surveyDescription: survey.description || '',
        participant: {
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email,
          department: profile.department,
          jobTitle: profile.job_title
        },
        answers: item.answers || [],
        questions: survey.questions || [],
        status: item.status,
        startedAt: item.started_at,
        completedAt: item.submitted_at,
        completionTime: item.completion_time,
        totalQuestions: (survey.questions || []).length
      }
    })

    return responses
  } catch (error) {
    console.error('Error fetching responses for comparison:', error)
    throw error
  }
}

/**
 * Update response admin status
 */
export async function updateResponseStatus(
  responseId: string,
  status: string,
  note?: string,
  adminUserId?: string
): Promise<void> {
  try {
    // In a real implementation, this would update a response_admin_status table
    // For now, we'll add a note if provided
    if (note && adminUserId) {
      await addResponseNote(responseId, note, 'status_update', adminUserId)
    }

    // Log the status change
    await supabase
      .from('activity_logs')
      .insert({
        action: 'response.status_updated',
        resource_type: 'response',
        resource_id: responseId,
        user_id: adminUserId,
        metadata: { status, note }
      })

  } catch (error) {
    console.error('Error updating response status:', error)
    throw error
  }
}

/**
 * Add admin note to response
 */
export async function addResponseNote(
  responseId: string,
  note: string,
  type: 'general' | 'follow_up' | 'concern' | 'status_update',
  adminUserId: string
): Promise<void> {
  try {
    // In a real implementation, this would use a response_admin_notes table
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        action: 'response.note_added',
        resource_type: 'response',
        resource_id: responseId,
        user_id: adminUserId,
        metadata: { note, type }
      })

    if (error) throw error
  } catch (error) {
    console.error('Error adding response note:', error)
    throw error
  }
}

/**
 * Search responses with advanced filters
 */
export async function searchResponses(
  userRole: string,
  organizationId?: string,
  filters: {
    search?: string
    status?: string
    department?: string
    surveyId?: string
    dateRange?: { start: string; end: string }
    confidenceThreshold?: number
    completionThreshold?: number
  } = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 10 }
): Promise<{
  data: DetailedSurveyResponse[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  try {
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        user_id,
        answers,
        status,
        started_at,
        submitted_at,
        completion_time,
        surveys!inner(
          id,
          title,
          description,
          questions,
          organization_id
        ),
        profiles!inner(
          id,
          user_id,
          first_name,
          last_name,
          email,
          department,
          job_title
        )
      `)

    // Apply role-based filtering
    if (userRole === 'org_admin' && organizationId) {
      query = query.eq('surveys.organization_id', organizationId)
    }

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.surveyId) {
      query = query.eq('survey_id', filters.surveyId)
    }

    if (filters.department) {
      query = query.eq('profiles.department', filters.department)
    }

    if (filters.search) {
      query = query.or(`
        profiles.first_name.ilike.%${filters.search}%,
        profiles.last_name.ilike.%${filters.search}%,
        profiles.email.ilike.%${filters.search}%,
        surveys.title.ilike.%${filters.search}%
      `)
    }

    if (filters.dateRange?.start) {
      query = query.gte('started_at', filters.dateRange.start)
    }

    if (filters.dateRange?.end) {
      query = query.lte('started_at', filters.dateRange.end)
    }

    // Get total count using a fresh query
    let countQuery = supabase
      .from('survey_responses')
      .select('id', { count: 'exact' })

    // Apply the same filters to count query
    if (filters.surveyId) {
      countQuery = countQuery.eq('survey_id', filters.surveyId)
    }
    if (filters.dateRange?.start) {
      countQuery = countQuery.gte('started_at', filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      countQuery = countQuery.lte('started_at', filters.dateRange.end)
    }
    // Note: department and search filters require joins, keeping count simple for now

    const { count, error: countError } = await countQuery

    if (countError) throw countError

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.pageSize
    query = query.range(offset, offset + pagination.pageSize - 1)

    const { data, error } = await query.order('started_at', { ascending: false })

    if (error) throw error

    // Transform the data
    const responses: DetailedSurveyResponse[] = (data || []).map((item: any) => {
      const survey = item.surveys
      const profile = item.profiles

      return {
        id: item.id,
        surveyId: item.survey_id,
        surveyTitle: survey.title,
        surveyDescription: survey.description || '',
        participant: {
          id: profile.id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email,
          department: profile.department,
          jobTitle: profile.job_title
        },
        answers: item.answers || [],
        questions: survey.questions || [],
        status: item.status,
        startedAt: item.started_at,
        completedAt: item.submitted_at,
        completionTime: item.completion_time,
        totalQuestions: (survey.questions || []).length
      }
    })

    // Apply client-side filters that require data processing
    let filteredResponses = responses

    if (filters.confidenceThreshold) {
      filteredResponses = filteredResponses.filter(response => {
        const avgConfidence = response.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / response.answers.length
        return avgConfidence >= filters.confidenceThreshold!
      })
    }

    if (filters.completionThreshold) {
      filteredResponses = filteredResponses.filter(response => {
        const completionRate = response.answers.length / response.totalQuestions
        return completionRate >= filters.completionThreshold!
      })
    }

    const total = count || 0
    const totalPages = Math.ceil(total / pagination.pageSize)

    return {
      data: filteredResponses,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages
    }
  } catch (error) {
    console.error('Error searching responses:', error)
    throw error
  }
}