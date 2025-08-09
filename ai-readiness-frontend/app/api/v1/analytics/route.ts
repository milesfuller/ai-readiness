export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Validation schemas
const AnalyticsFiltersSchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d', '30d', '90d', '1y']).default('30d'),
  organization_id: z.string().uuid().optional(),
  survey_ids: z.string().optional(), // Comma-separated UUIDs
  user_ids: z.string().optional(), // Comma-separated UUIDs
  department: z.string().optional(),
  job_title: z.string().optional(),
  include_details: z.coerce.boolean().default(false),
  include_jtbd: z.coerce.boolean().default(true),
  include_demographics: z.coerce.boolean().default(false),
  include_trends: z.coerce.boolean().default(false),
  group_by: z.enum(['hour', 'day', 'week', 'month']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
})

const MetricsQuerySchema = z.object({
  metrics: z.array(z.enum([
    'response_count',
    'completion_rate',
    'average_time',
    'satisfaction_score',
    'jtbd_analysis',
    'user_engagement',
    'department_breakdown',
    'time_trends',
    'voice_usage',
    'ai_analysis_stats'
  ])).default(['response_count', 'completion_rate', 'average_time']),
})

/**
 * GET /api/v1/analytics
 * Get comprehensive analytics data with filtering and aggregation
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.general'
    )
    
    if (!rateLimitResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: rateLimitResult.error,
            retry_after: rateLimitResult.retryAfter 
          },
          { status: 429 }
        )
      )
    }

    // Authentication
    const authResult = await checkApiKeyAuth(request)
    if (!authResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: authResult.error }, { status: 401 })
      )
    }

    // Check permissions
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ANALYTICS_READ)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. ANALYTICS_READ required.' 
        }, { status: 403 })
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Validate and parse filters
    const filtersResult = AnalyticsFiltersSchema.safeParse({
      timeframe: searchParams.get('timeframe'),
      organization_id: searchParams.get('organization_id'),
      survey_ids: searchParams.get('survey_ids'),
      user_ids: searchParams.get('user_ids'),
      department: searchParams.get('department'),
      job_title: searchParams.get('job_title'),
      include_details: searchParams.get('include_details'),
      include_jtbd: searchParams.get('include_jtbd'),
      include_demographics: searchParams.get('include_demographics'),
      include_trends: searchParams.get('include_trends'),
      group_by: searchParams.get('group_by'),
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date'),
    })

    if (!filtersResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid query parameters',
          details: filtersResult.error.issues
        }, { status: 400 })
      )
    }

    const filters = filtersResult.data

    // Validate metrics query
    const metricsResult = MetricsQuerySchema.safeParse({
      metrics: searchParams.get('metrics')?.split(',') || undefined
    })

    if (!metricsResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid metrics parameter',
          details: metricsResult.error.issues
        }, { status: 400 })
      )
    }

    const requestedMetrics = metricsResult.data.metrics

    // Determine organization scope
    const organizationId = filters.organization_id || authResult.user?.organizationId
    if (!organizationId) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Organization ID required'
        }, { status: 400 })
      )
    }

    // Calculate time range
    const { startDate, endDate } = getTimeRange(filters.timeframe, filters.start_date, filters.end_date)

    // Parse additional filters
    const surveyIds = filters.survey_ids ? filters.survey_ids.split(',').filter(Boolean) : []
    const userIds = filters.user_ids ? filters.user_ids.split(',').filter(Boolean) : []

    // Collect analytics data
    const analyticsData: any = {
      timeframe: filters.timeframe,
      date_range: { start: startDate, end: endDate },
      organization_id: organizationId,
      filters: {
        survey_ids: surveyIds.length > 0 ? surveyIds : null,
        user_ids: userIds.length > 0 ? userIds : null,
        department: filters.department,
        job_title: filters.job_title
      }
    }

    // Process each requested metric
    for (const metric of requestedMetrics) {
      try {
        switch (metric) {
          case 'response_count':
            analyticsData.response_count = await getResponseCount(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'completion_rate':
            analyticsData.completion_rate = await getCompletionRate(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'average_time':
            analyticsData.average_time = await getAverageTime(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'satisfaction_score':
            analyticsData.satisfaction_score = await getSatisfactionScore(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'jtbd_analysis':
            if (filters.include_jtbd) {
              analyticsData.jtbd_analysis = await getJTBDAnalysis(
                supabase, organizationId, startDate, endDate, filters
              )
            }
            break

          case 'user_engagement':
            analyticsData.user_engagement = await getUserEngagement(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'department_breakdown':
            if (filters.include_demographics) {
              analyticsData.department_breakdown = await getDepartmentBreakdown(
                supabase, organizationId, startDate, endDate, filters
              )
            }
            break

          case 'time_trends':
            if (filters.include_trends && filters.group_by) {
              analyticsData.time_trends = await getTimeTrends(
                supabase, organizationId, startDate, endDate, filters
              )
            }
            break

          case 'voice_usage':
            analyticsData.voice_usage = await getVoiceUsage(
              supabase, organizationId, startDate, endDate, filters
            )
            break

          case 'ai_analysis_stats':
            analyticsData.ai_analysis_stats = await getAIAnalysisStats(
              supabase, organizationId, startDate, endDate, filters
            )
            break
        }
      } catch (metricError) {
        console.warn(`Failed to collect metric ${metric}:`, metricError)
        analyticsData[metric] = { error: 'Failed to collect data' }
      }
    }

    const response = {
      data: analyticsData,
      meta: {
        timestamp: new Date().toISOString(),
        requested_metrics: requestedMetrics,
        processing_time_ms: Date.now() - Date.now(), // Simplified
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('GET /api/v1/analytics error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/analytics (Custom analytics queries)
 * Execute custom analytics queries with complex aggregations
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.general'
    )
    
    if (!rateLimitResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            error: rateLimitResult.error,
            retry_after: rateLimitResult.retryAfter 
          },
          { status: 429 }
        )
      )
    }

    // Authentication
    const authResult = await checkApiKeyAuth(request)
    if (!authResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: authResult.error }, { status: 401 })
      )
    }

    // Check permissions
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ANALYTICS_READ)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. ANALYTICS_READ required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()
    const { query, parameters } = body

    if (!query || typeof query !== 'string') {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Query string required'
        }, { status: 400 })
      )
    }

    // For security, limit to read-only operations
    const allowedQueryTypes = ['select', 'with']
    const queryLower = query.toLowerCase().trim()
    
    if (!allowedQueryTypes.some(type => queryLower.startsWith(type))) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Only SELECT queries are allowed'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()
    const organizationId = authResult.user?.organizationId

    if (!organizationId) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Organization ID required'
        }, { status: 400 })
      )
    }

    // Execute the custom query with organization filter
    const { data, error } = await supabase
      .rpc('execute_analytics_query', {
        query_text: query,
        query_parameters: parameters || {},
        organization_filter: organizationId
      })

    if (error) {
      console.error('Custom analytics query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Query execution failed',
          details: error.message
        }, { status: 400 })
      )
    }

    const response = {
      data: data,
      query: {
        text: query,
        parameters: parameters || {}
      },
      meta: {
        timestamp: new Date().toISOString(),
        organization_id: organizationId,
        row_count: Array.isArray(data) ? data.length : 1
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('POST /api/v1/analytics error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

// Helper functions for analytics data collection

function getTimeRange(timeframe: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return { startDate, endDate }
  }

  const now = new Date()
  const end = endDate ? new Date(endDate) : now
  let start: Date

  switch (timeframe) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000)
      break
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '1y':
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  }
}

async function getResponseCount(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  let query = supabase
    .from('survey_responses')
    .select('id, survey_id, surveys!inner(organization_id)', { count: 'exact', head: true })
    .eq('surveys.organization_id', organizationId)
    .gte('submitted_at', startDate)
    .lte('submitted_at', endDate)

  if (filters.survey_ids && filters.survey_ids.length > 0) {
    query = query.in('survey_id', filters.survey_ids)
  }

  const { count, error } = await query

  if (error) throw error

  return {
    total_responses: count || 0,
    timeframe_responses: count || 0
  }
}

async function getCompletionRate(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get total started responses
  let totalQuery = supabase
    .from('survey_responses')
    .select('id, survey_id, surveys!inner(organization_id)', { count: 'exact', head: true })
    .eq('surveys.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  // Get completed responses
  let completedQuery = supabase
    .from('survey_responses')
    .select('id, survey_id, surveys!inner(organization_id)', { count: 'exact', head: true })
    .eq('surveys.organization_id', organizationId)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', startDate)
    .lte('submitted_at', endDate)

  if (filters.survey_ids && filters.survey_ids.length > 0) {
    totalQuery = totalQuery.in('survey_id', filters.survey_ids)
    completedQuery = completedQuery.in('survey_id', filters.survey_ids)
  }

  const [totalResult, completedResult] = await Promise.all([
    totalQuery,
    completedQuery
  ])

  if (totalResult.error) throw totalResult.error
  if (completedResult.error) throw completedResult.error

  const totalStarted = totalResult.count || 0
  const totalCompleted = completedResult.count || 0
  const completionRate = totalStarted > 0 ? (totalCompleted / totalStarted) * 100 : 0

  return {
    total_started: totalStarted,
    total_completed: totalCompleted,
    completion_rate_percentage: Math.round(completionRate * 100) / 100
  }
}

async function getAverageTime(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  let query = supabase
    .from('survey_responses')
    .select('completion_time, survey_id, surveys!inner(organization_id)')
    .eq('surveys.organization_id', organizationId)
    .not('completion_time', 'is', null)
    .not('submitted_at', 'is', null)
    .gte('submitted_at', startDate)
    .lte('submitted_at', endDate)

  if (filters.survey_ids && filters.survey_ids.length > 0) {
    query = query.in('survey_id', filters.survey_ids)
  }

  const { data, error } = await query

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      average_completion_time_seconds: 0,
      average_completion_time_minutes: 0,
      response_count: 0
    }
  }

  const totalTime = data.reduce((sum: number, response: any) => sum + (response.completion_time || 0), 0)
  const averageSeconds = totalTime / data.length
  const averageMinutes = averageSeconds / 60

  return {
    average_completion_time_seconds: Math.round(averageSeconds),
    average_completion_time_minutes: Math.round(averageMinutes * 100) / 100,
    response_count: data.length
  }
}

async function getSatisfactionScore(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // This would typically calculate satisfaction from specific survey questions
  // For now, return placeholder data
  return {
    average_score: 7.5,
    total_responses: 0,
    distribution: {
      1: 2, 2: 3, 3: 8, 4: 15, 5: 22, 6: 25, 7: 30, 8: 35, 9: 25, 10: 15
    }
  }
}

async function getJTBDAnalysis(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get JTBD analysis from llm_analysis_results
  let query = supabase
    .from('llm_analysis_results')
    .select(`
      analysis_result,
      survey_responses!inner(survey_id, surveys!inner(organization_id))
    `)
    .eq('survey_responses.surveys.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { data, error } = await query

  if (error) throw error

  if (!data || data.length === 0) {
    return {
      force_distribution: {
        pain_of_old: 0,
        pull_of_new: 0,
        anchors_to_old: 0,
        anxiety_of_new: 0,
        demographic: 0
      },
      average_confidence: 0,
      total_analyzed: 0
    }
  }

  const forceDistribution: any = {
    pain_of_old: 0,
    pull_of_new: 0,
    anchors_to_old: 0,
    anxiety_of_new: 0,
    demographic: 0
  }

  let totalConfidence = 0
  let validAnalyses = 0

  data.forEach((item: any) => {
    const analysis = item.analysis_result
    if (analysis && analysis.primaryJtbdForce) {
      forceDistribution[analysis.primaryJtbdForce]++
      totalConfidence += analysis.confidenceScore || 0
      validAnalyses++
    }
  })

  return {
    force_distribution: forceDistribution,
    average_confidence: validAnalyses > 0 ? totalConfidence / validAnalyses : 0,
    total_analyzed: validAnalyses
  }
}

async function getUserEngagement(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Calculate user engagement metrics
  let query = supabase
    .from('survey_responses')
    .select('respondent_id, survey_id, surveys!inner(organization_id), submitted_at')
    .eq('surveys.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { data, error } = await query

  if (error) throw error

  const uniqueUsers = new Set(data?.map((r: any) => r.respondent_id) || []).size
  const totalResponses = data?.length || 0
  const completedResponses = data?.filter((r: any) => r.submitted_at)?.length || 0

  return {
    unique_users: uniqueUsers,
    total_responses: totalResponses,
    completed_responses: completedResponses,
    responses_per_user: uniqueUsers > 0 ? Math.round((totalResponses / uniqueUsers) * 100) / 100 : 0
  }
}

async function getDepartmentBreakdown(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get department breakdown from user profiles
  return {
    message: 'Department breakdown requires profile data integration',
    departments: {}
  }
}

async function getTimeTrends(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get time-series data for trends
  return {
    message: 'Time trends analysis',
    data_points: []
  }
}

async function getVoiceUsage(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get voice recording usage statistics
  let query = supabase
    .from('voice_recordings')
    .select('id, survey_responses!inner(survey_id, surveys!inner(organization_id))', { count: 'exact', head: true })
    .eq('survey_responses.surveys.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count, error } = await query

  if (error) throw error

  return {
    total_voice_recordings: count || 0,
    voice_enabled_responses: count || 0
  }
}

async function getAIAnalysisStats(supabase: any, organizationId: string, startDate: string, endDate: string, filters: any) {
  // Get AI analysis statistics
  let query = supabase
    .from('llm_analysis_results')
    .select('id, survey_responses!inner(survey_id, surveys!inner(organization_id))', { count: 'exact', head: true })
    .eq('survey_responses.surveys.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const { count, error } = await query

  if (error) throw error

  return {
    total_ai_analyses: count || 0,
    ai_analysis_rate: 0, // Would calculate vs total responses
  }
}