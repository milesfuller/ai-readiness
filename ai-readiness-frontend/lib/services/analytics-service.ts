/**
 * Analytics Service
 * 
 * Handles analytics calculations and data aggregation from real database data
 */

import { createClient } from '@/lib/supabase/client'
import type { JTBDForces, Analytics } from '@/lib/types'

const supabase = createClient()

export interface AnalyticsFilters {
  dateRange?: {
    start: string
    end: string
  }
  department?: string
  surveyIds?: string[]
}

export interface OrganizationAnalytics {
  totalSurveys: number
  totalResponses: number
  completionRate: number
  averageCompletionTime: number
  participationRate: number
  departmentBreakdown: Record<string, number>
  responsesByMonth: { month: string; responses: number }[]
  jtbdForces: JTBDForces
  topPainPoints: string[]
  surveyPerformance: SurveyPerformance[]
}

export interface PersonalAnalytics {
  totalResponses: number
  averageCompletionTime: number
  completionRate: number
  personalJTBDHistory: { date: string; forces: JTBDForces }[]
  comparisonToOrg: {
    completionTime: { personal: number; orgAverage: number }
    jtbdForces: { personal: JTBDForces; orgAverage: JTBDForces }
  }
  responseHistory: PersonalResponse[]
}

export interface SurveyPerformance {
  surveyId: string
  surveyTitle: string
  responseCount: number
  completionRate: number
  averageTime: number
  jtbdScores: JTBDForces
}

export interface PersonalResponse {
  id: string
  surveyTitle: string
  completedAt: string
  completionTime: number
  jtbdForces?: JTBDForces
}

/**
 * Get organization-wide analytics
 */
export async function getOrganizationAnalytics(
  organizationId: string,
  filters: AnalyticsFilters = {}
): Promise<OrganizationAnalytics> {
  try {
    // Base queries with filters
    let surveysQuery = supabase
      .from('surveys')
      .select('id, title, created_at, status')
      .eq('organization_id', organizationId)

    let responsesQuery = supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        respondent_id,
        answers,
        completion_time,
        submitted_at,
        surveys!inner(id, organization_id, title),
        profiles(department, first_name, last_name)
      `)
      .eq('surveys.organization_id', organizationId)

    // Apply date filters
    if (filters.dateRange?.start) {
      surveysQuery = surveysQuery.gte('created_at', filters.dateRange.start)
      responsesQuery = responsesQuery.gte('submitted_at', filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      surveysQuery = surveysQuery.lte('created_at', filters.dateRange.end)
      responsesQuery = responsesQuery.lte('submitted_at', filters.dateRange.end)
    }

    // Apply survey filter
    if (filters.surveyIds?.length) {
      surveysQuery = surveysQuery.in('id', filters.surveyIds)
      responsesQuery = responsesQuery.in('survey_id', filters.surveyIds)
    }

    // Execute queries
    const [surveysResult, responsesResult, usersResult] = await Promise.all([
      surveysQuery,
      responsesQuery,
      supabase
        .from('profiles')
        .select(`
          id,
          department,
          organization_members!inner(organization_id)
        `)
        .eq('organization_members.organization_id', organizationId)
    ])

    if (surveysResult.error) throw surveysResult.error
    if (responsesResult.error) throw responsesResult.error
    if (usersResult.error) throw usersResult.error

    const surveys = surveysResult.data || []
    const responses = responsesResult.data || []
    const users = usersResult.data || []

    // Calculate completion rate
    const totalExpectedResponses = surveys.length * users.length
    const completionRate = totalExpectedResponses > 0 ? 
      (responses.length / totalExpectedResponses) * 100 : 0

    // Calculate average completion time
    const completionTimes = responses
      .filter(r => r.completion_time)
      .map(r => r.completion_time)
    const averageCompletionTime = completionTimes.length > 0 ?
      completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0

    // Calculate participation rate (unique users who responded)
    const uniqueRespondents = new Set(responses.map(r => r.respondent_id)).size
    const participationRate = users.length > 0 ? (uniqueRespondents / users.length) * 100 : 0

    // Calculate department breakdown
    const departmentBreakdown: Record<string, number> = {}
    responses.forEach(response => {
      const profile = response.profiles as any
      const dept = profile?.department || 'Unknown'
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1
    })

    // Apply department filter to breakdown
    if (filters.department) {
      const filteredBreakdown: Record<string, number> = {}
      filteredBreakdown[filters.department] = departmentBreakdown[filters.department] || 0
      Object.assign(departmentBreakdown, filteredBreakdown)
    }

    // Calculate responses by month
    const responsesByMonth = calculateResponsesByMonth(responses)

    // Calculate JTBD forces from responses
    const jtbdForces = calculateJTBDForces(responses)

    // Extract top pain points from responses
    const topPainPoints = extractTopPainPoints(responses)

    // Calculate survey performance
    const surveyPerformance = calculateSurveyPerformance(surveys, responses)

    return {
      totalSurveys: surveys.length,
      totalResponses: responses.length,
      completionRate: Math.round(completionRate * 10) / 10,
      averageCompletionTime: Math.round(averageCompletionTime),
      participationRate: Math.round(participationRate * 10) / 10,
      departmentBreakdown,
      responsesByMonth,
      jtbdForces,
      topPainPoints,
      surveyPerformance
    }

  } catch (error) {
    console.error('Error fetching organization analytics:', error)
    throw error
  }
}

/**
 * Get personal analytics for a user
 */
export async function getPersonalAnalytics(
  userId: string,
  organizationId?: string
): Promise<PersonalAnalytics> {
  try {
    // Get user's responses
    const { data: userResponses, error: userError } = await supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        answers,
        completion_time,
        submitted_at,
        surveys(id, title, organization_id)
      `)
      .eq('respondent_id', userId)
      .order('submitted_at', { ascending: false })

    if (userError) throw userError

    // Get organization averages if organizationId provided
    let orgAverages: { completionTime: number; jtbdForces: JTBDForces } | null = null
    if (organizationId) {
      const { data: orgResponses, error: orgError } = await supabase
        .from('survey_responses')
        .select(`
          completion_time,
          answers,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)

      if (orgError) throw orgError

      const orgCompletionTimes = orgResponses
        ?.filter(r => r.completion_time)
        .map(r => r.completion_time) || []

      const avgOrgCompletionTime = orgCompletionTimes.length > 0 ?
        orgCompletionTimes.reduce((sum, time) => sum + time, 0) / orgCompletionTimes.length : 0

      orgAverages = {
        completionTime: avgOrgCompletionTime,
        jtbdForces: calculateJTBDForces(orgResponses || [])
      }
    }

    const responses = userResponses || []

    // Calculate personal stats
    const completionTimes = responses
      .filter(r => r.completion_time)
      .map(r => r.completion_time)
    const averageCompletionTime = completionTimes.length > 0 ?
      completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0

    const completionRate = responses.length > 0 ? 100 : 0 // All fetched responses are completed

    // Calculate personal JTBD history
    const personalJTBDHistory = responses.map(response => ({
      date: response.submitted_at,
      forces: calculateJTBDForces([response])
    }))

    // Format response history
    const responseHistory: PersonalResponse[] = responses.map(response => {
      const survey = response.surveys as any
      return {
        id: response.id,
        surveyTitle: survey?.title || 'Unknown Survey',
        completedAt: response.submitted_at,
        completionTime: response.completion_time || 0,
        jtbdForces: calculateJTBDForces([response])
      }
    })

    // Calculate personal JTBD forces
    const personalJTBDForces = calculateJTBDForces(responses)

    return {
      totalResponses: responses.length,
      averageCompletionTime: Math.round(averageCompletionTime),
      completionRate,
      personalJTBDHistory,
      comparisonToOrg: orgAverages ? {
        completionTime: {
          personal: Math.round(averageCompletionTime),
          orgAverage: Math.round(orgAverages.completionTime)
        },
        jtbdForces: {
          personal: personalJTBDForces,
          orgAverage: orgAverages.jtbdForces
        }
      } : {
        completionTime: { personal: Math.round(averageCompletionTime), orgAverage: 0 },
        jtbdForces: { personal: personalJTBDForces, orgAverage: { push: 0, pull: 0, habit: 0, anxiety: 0 } }
      },
      responseHistory
    }

  } catch (error) {
    console.error('Error fetching personal analytics:', error)
    throw error
  }
}

/**
 * Calculate JTBD forces from survey responses
 */
function calculateJTBDForces(responses: any[]): JTBDForces {
  const forces = { push: 0, pull: 0, habit: 0, anxiety: 0 }
  let totalForces = 0

  responses.forEach(response => {
    if (response.answers && typeof response.answers === 'object') {
      // Look for JTBD-related questions in answers
      Object.values(response.answers).forEach((answer: any) => {
        if (typeof answer === 'string') {
          const lowerAnswer = answer.toLowerCase()
          
          // Push factors (problems/frustrations)
          if (lowerAnswer.includes('problem') || lowerAnswer.includes('frustrat') || 
              lowerAnswer.includes('difficult') || lowerAnswer.includes('slow') ||
              lowerAnswer.includes('inefficient') || lowerAnswer.includes('manual')) {
            forces.push += 1
            totalForces++
          }
          
          // Pull factors (benefits/outcomes)
          if (lowerAnswer.includes('benefit') || lowerAnswer.includes('improve') || 
              lowerAnswer.includes('faster') || lowerAnswer.includes('better') ||
              lowerAnswer.includes('efficient') || lowerAnswer.includes('automat')) {
            forces.pull += 1
            totalForces++
          }
          
          // Habit factors (current solutions)
          if (lowerAnswer.includes('current') || lowerAnswer.includes('existing') || 
              lowerAnswer.includes('traditional') || lowerAnswer.includes('usual') ||
              lowerAnswer.includes('always') || lowerAnswer.includes('typically')) {
            forces.habit += 1
            totalForces++
          }
          
          // Anxiety factors (concerns/risks)
          if (lowerAnswer.includes('concern') || lowerAnswer.includes('worry') || 
              lowerAnswer.includes('risk') || lowerAnswer.includes('uncertain') ||
              lowerAnswer.includes('difficult to learn') || lowerAnswer.includes('complex')) {
            forces.anxiety += 1
            totalForces++
          }
        } else if (typeof answer === 'number') {
          // Scale questions can indicate different forces based on context
          // This is a simplified approach - in reality, you'd map specific questions
          if (answer >= 7) {
            forces.pull += 1
          } else if (answer <= 3) {
            forces.push += 1
          }
          totalForces++
        }
      })
    }
  })

  // Normalize to 0-10 scale
  if (totalForces > 0) {
    forces.push = Math.round((forces.push / totalForces) * 10 * 100) / 100
    forces.pull = Math.round((forces.pull / totalForces) * 10 * 100) / 100
    forces.habit = Math.round((forces.habit / totalForces) * 10 * 100) / 100
    forces.anxiety = Math.round((forces.anxiety / totalForces) * 10 * 100) / 100
  }

  return forces
}

/**
 * Extract top pain points from responses
 */
function extractTopPainPoints(responses: any[]): string[] {
  const painPoints: Record<string, number> = {}

  responses.forEach(response => {
    if (response.answers && typeof response.answers === 'object') {
      Object.values(response.answers).forEach((answer: any) => {
        if (typeof answer === 'string') {
          const lowerAnswer = answer.toLowerCase()
          
          // Common pain point keywords
          const painKeywords = [
            'slow', 'manual', 'time-consuming', 'inefficient', 'difficult',
            'complex', 'confusing', 'frustrating', 'error-prone', 'repetitive',
            'lack of', 'no automation', 'outdated', 'limited', 'poor integration'
          ]
          
          painKeywords.forEach(keyword => {
            if (lowerAnswer.includes(keyword)) {
              painPoints[keyword] = (painPoints[keyword] || 0) + 1
            }
          })
        }
      })
    }
  })

  // Return top 5 pain points
  return Object.entries(painPoints)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([keyword]) => keyword.replace(/^\w/, c => c.toUpperCase()))
}

/**
 * Calculate responses by month
 */
function calculateResponsesByMonth(responses: any[]): { month: string; responses: number }[] {
  const monthlyData: Record<string, number> = {}

  responses.forEach(response => {
    if (response.submitted_at) {
      const date = new Date(response.submitted_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1
    }
  })

  // Get last 12 months
  const result: { month: string; responses: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    
    result.push({
      month: monthName,
      responses: monthlyData[monthKey] || 0
    })
  }

  return result
}

/**
 * Calculate survey performance metrics
 */
function calculateSurveyPerformance(surveys: any[], responses: any[]): SurveyPerformance[] {
  return surveys.map(survey => {
    const surveyResponses = responses.filter(r => r.survey_id === survey.id)
    const completionTimes = surveyResponses
      .filter(r => r.completion_time)
      .map(r => r.completion_time)
    
    const averageTime = completionTimes.length > 0 ?
      completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0

    return {
      surveyId: survey.id,
      surveyTitle: survey.title,
      responseCount: surveyResponses.length,
      completionRate: 100, // All responses in our data are completed
      averageTime: Math.round(averageTime),
      jtbdScores: calculateJTBDForces(surveyResponses)
    }
  })
}

/**
 * Get available departments for filtering
 */
export async function getAvailableDepartments(organizationId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('department, organization_members!inner(organization_id)')
      .eq('organization_members.organization_id', organizationId)
      .not('department', 'is', null)

    if (error) throw error

    const departments = [...new Set(data?.map(p => p.department).filter(Boolean))]
    return departments.sort()

  } catch (error) {
    console.error('Error fetching departments:', error)
    return []
  }
}

/**
 * Export analytics data
 */
export async function exportAnalyticsData(
  organizationId: string,
  format: 'csv' | 'json',
  filters: AnalyticsFilters = {}
): Promise<Blob> {
  try {
    const analytics = await getOrganizationAnalytics(organizationId, filters)

    if (format === 'json') {
      const jsonData = JSON.stringify(analytics, null, 2)
      return new Blob([jsonData], { type: 'application/json' })
    } else {
      // CSV format
      let csvContent = 'Metric,Value\n'
      csvContent += `Total Surveys,${analytics.totalSurveys}\n`
      csvContent += `Total Responses,${analytics.totalResponses}\n`
      csvContent += `Completion Rate,${analytics.completionRate}%\n`
      csvContent += `Average Completion Time,${analytics.averageCompletionTime}s\n`
      csvContent += `Participation Rate,${analytics.participationRate}%\n`
      
      csvContent += '\nDepartment,Responses\n'
      Object.entries(analytics.departmentBreakdown).forEach(([dept, count]) => {
        csvContent += `${dept},${count}\n`
      })

      csvContent += '\nJTBD Forces\n'
      csvContent += `Push,${analytics.jtbdForces.push}\n`
      csvContent += `Pull,${analytics.jtbdForces.pull}\n`
      csvContent += `Habit,${analytics.jtbdForces.habit}\n`
      csvContent += `Anxiety,${analytics.jtbdForces.anxiety}\n`

      return new Blob([csvContent], { type: 'text/csv' })
    }

  } catch (error) {
    console.error('Error exporting analytics data:', error)
    throw error
  }
}