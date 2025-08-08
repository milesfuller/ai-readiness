export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Validation schemas
const ReportFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  type: z.enum([
    'survey_summary',
    'analytics_dashboard', 
    'jtbd_analysis',
    'user_engagement',
    'voice_insights',
    'department_breakdown',
    'time_series',
    'executive_summary',
    'detailed_responses',
    'ai_readiness_assessment',
    'custom'
  ]).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'scheduled']).optional(),
  organization_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'type', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

const CreateReportSchema = z.object({
  type: z.enum([
    'survey_summary',
    'analytics_dashboard', 
    'jtbd_analysis',
    'user_engagement',
    'voice_insights',
    'department_breakdown',
    'time_series',
    'executive_summary',
    'detailed_responses',
    'ai_readiness_assessment',
    'custom'
  ]),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  organization_id: z.string().uuid(),
  parameters: z.object({
    survey_ids: z.array(z.string().uuid()).optional(),
    date_range: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    filters: z.object({
      department: z.string().optional(),
      job_title: z.string().optional(),
      user_ids: z.array(z.string().uuid()).optional(),
      include_voice: z.boolean().default(false),
      include_ai_analysis: z.boolean().default(false),
      include_demographics: z.boolean().default(false),
      group_by: z.enum(['day', 'week', 'month', 'department', 'job_title']).optional(),
    }).optional(),
    format: z.enum(['pdf', 'csv', 'json', 'excel']).default('pdf'),
    template: z.string().optional(),
    custom_query: z.string().optional(), // For custom report types
  }),
  scheduled: z.boolean().default(false),
  schedule_config: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    day_of_week: z.number().min(0).max(6).optional(), // For weekly
    day_of_month: z.number().min(1).max(31).optional(), // For monthly
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
    timezone: z.string().default('UTC'),
    recipients: z.array(z.string().email()).optional(),
  }).optional(),
  notification_settings: z.object({
    email_on_completion: z.boolean().default(true),
    email_on_failure: z.boolean().default(true),
    webhook_url: z.string().url().optional(),
  }).optional(),
})

const UpdateReportSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'scheduled']).optional(),
  parameters: z.object({
    survey_ids: z.array(z.string().uuid()).optional(),
    date_range: z.object({
      start: z.string().datetime(),
      end: z.string().datetime()
    }).optional(),
    filters: z.object({
      department: z.string().optional(),
      job_title: z.string().optional(),
      user_ids: z.array(z.string().uuid()).optional(),
      include_voice: z.boolean().optional(),
      include_ai_analysis: z.boolean().optional(),
      include_demographics: z.boolean().optional(),
      group_by: z.enum(['day', 'week', 'month', 'department', 'job_title']).optional(),
    }).optional(),
    format: z.enum(['pdf', 'csv', 'json', 'excel']).optional(),
    template: z.string().optional(),
    custom_query: z.string().optional(),
  }).optional(),
  scheduled: z.boolean().optional(),
  schedule_config: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    day_of_week: z.number().min(0).max(6).optional(),
    day_of_month: z.number().min(1).max(31).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().optional(),
    recipients: z.array(z.string().email()).optional(),
  }).optional(),
  notification_settings: z.object({
    email_on_completion: z.boolean().optional(),
    email_on_failure: z.boolean().optional(),
    webhook_url: z.string().url().optional(),
  }).optional(),
})

/**
 * GET /api/v1/reports
 * List reports with filtering, pagination, and sorting
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

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Validate and parse filters
    const filtersResult = ReportFiltersSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      organization_id: searchParams.get('organization_id'),
      created_by: searchParams.get('created_by'),
      created_after: searchParams.get('created_after'),
      created_before: searchParams.get('created_before'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order'),
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
    const offset = (filters.page - 1) * filters.limit

    // Build query
    let query = supabase
      .from('reports')
      .select(`
        id,
        type,
        name,
        description,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at,
        completed_at,
        parameters,
        scheduled,
        schedule_config,
        file_url,
        file_size,
        error_message,
        processing_duration,
        organizations!inner(
          id,
          name
        ),
        profiles!created_by(
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })

    // Apply organization filter
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    } else if (authResult.user?.organizationId) {
      query = query.eq('organization_id', authResult.user.organizationId)
    } else {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Organization ID required'
        }, { status: 400 })
      )
    }

    // Apply type filter
    if (filters.type) {
      query = query.eq('type', filters.type)
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // Apply created_by filter
    if (filters.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    // Apply date filters
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }

    // Apply sorting
    query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + filters.limit - 1)

    const { data: reports, error, count } = await query

    if (error) {
      console.error('Reports query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to fetch reports',
          details: error.message
        }, { status: 500 })
      )
    }

    // Transform reports for response
    const transformedReports = reports?.map(report => ({
      id: report.id,
      type: report.type,
      name: report.name,
      description: report.description,
      status: report.status,
      organization_id: report.organization_id,
      organization_name: report.organizations?.name,
      created_by: report.created_by,
      creator: report.profiles ? {
        name: `${report.profiles.first_name} ${report.profiles.last_name}`.trim(),
        email: report.profiles.email
      } : null,
      created_at: report.created_at,
      updated_at: report.updated_at,
      completed_at: report.completed_at,
      parameters: report.parameters,
      scheduled: report.scheduled,
      schedule_config: report.schedule_config,
      file_info: report.file_url ? {
        url: report.file_url,
        size_bytes: report.file_size,
        download_url: `/api/v1/reports/${report.id}/download`
      } : null,
      error_message: report.error_message,
      processing_duration_seconds: report.processing_duration,
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / filters.limit)

    const response = {
      data: transformedReports,
      pagination: {
        current_page: filters.page,
        per_page: filters.limit,
        total_items: count || 0,
        total_pages: totalPages,
        has_next_page: filters.page < totalPages,
        has_previous_page: filters.page > 1,
      },
      filters: {
        type: filters.type,
        status: filters.status,
        organization_id: filters.organization_id,
        created_by: filters.created_by,
      },
      summary: {
        by_status: await getReportStatusSummary(supabase, authResult.user?.organizationId),
        by_type: await getReportTypeSummary(supabase, authResult.user?.organizationId),
      },
      meta: {
        timestamp: new Date().toISOString(),
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('GET /api/v1/reports error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/reports
 * Create a new report or schedule a recurring report
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ANALYTICS_EXPORT)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. ANALYTICS_EXPORT required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateReportSchema.safeParse(body)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request body',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const reportData = validationResult.data
    const supabase = createServerSupabaseClient()

    // Verify organization access
    if (reportData.organization_id !== authResult.user?.organizationId) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Cannot create report for different organization' 
        }, { status: 403 })
      )
    }

    // Validate survey IDs if provided
    if (reportData.parameters.survey_ids && reportData.parameters.survey_ids.length > 0) {
      const { data: surveys, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .eq('organization_id', reportData.organization_id)
        .in('id', reportData.parameters.survey_ids)

      if (surveyError || !surveys || surveys.length !== reportData.parameters.survey_ids.length) {
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'One or more survey IDs are invalid or inaccessible' 
          }, { status: 400 })
        )
      }
    }

    // Validate custom query for security (if applicable)
    if (reportData.type === 'custom' && reportData.parameters.custom_query) {
      const query = reportData.parameters.custom_query.toLowerCase()
      const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'create', 'alter', 'truncate']
      
      if (dangerousKeywords.some(keyword => query.includes(keyword))) {
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'Custom queries cannot contain write operations' 
          }, { status: 400 })
        )
      }
    }

    // Create report record
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        type: reportData.type,
        name: reportData.name,
        description: reportData.description,
        organization_id: reportData.organization_id,
        created_by: authResult.user!.id,
        parameters: reportData.parameters,
        scheduled: reportData.scheduled,
        schedule_config: reportData.schedule_config,
        notification_settings: reportData.notification_settings,
        status: reportData.scheduled ? 'scheduled' : 'pending',
      })
      .select(`
        id,
        type,
        name,
        description,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at,
        parameters,
        scheduled,
        schedule_config,
        notification_settings
      `)
      .single()

    if (error) {
      console.error('Report creation error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to create report',
          details: error.message
        }, { status: 500 })
      )
    }

    // If not scheduled, trigger immediate generation
    if (!reportData.scheduled) {
      try {
        // Trigger report generation (background job)
        await supabase.rpc('trigger_report_generation', {
          report_id: report.id
        })
      } catch (generationError) {
        console.warn('Failed to trigger report generation:', generationError)
        // Update status to failed
        await supabase
          .from('reports')
          .update({ 
            status: 'failed', 
            error_message: 'Failed to start report generation' 
          })
          .eq('id', report.id)
      }
    }

    const response = {
      data: report,
      meta: {
        timestamp: new Date().toISOString(),
        created_by: authResult.user!.email,
        estimated_completion_time: getEstimatedCompletionTime(reportData.type),
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response, { status: 201 }))

  } catch (error) {
    console.error('POST /api/v1/reports error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * PATCH /api/v1/reports (Bulk operations)
 * Bulk update multiple reports
 */
export async function PATCH(request: NextRequest) {
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ANALYTICS_EXPORT)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. ANALYTICS_EXPORT required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()
    const { report_ids, updates } = body

    if (!Array.isArray(report_ids) || report_ids.length === 0 || !updates) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request. report_ids array and updates object required.'
        }, { status: 400 })
      )
    }

    // Validate updates
    const validationResult = UpdateReportSchema.safeParse(updates)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid update data',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const updateData = validationResult.data
    const supabase = createServerSupabaseClient()

    // Verify all reports belong to user's organization
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('id, organization_id, status, created_by')
      .in('id', report_ids)

    if (reportError || !reports) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify report ownership'
        }, { status: 500 })
      )
    }

    const invalidReports = reports.filter(
      report => report.organization_id !== authResult.user?.organizationId
    )

    if (invalidReports.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot update reports from different organization',
          invalid_report_ids: invalidReports.map(r => r.id)
        }, { status: 403 })
      )
    }

    // Check if trying to update completed/failed reports inappropriately
    const completedReports = reports.filter(r => 
      ['completed', 'failed'].includes(r.status) && 
      updateData.status && 
      !['pending', 'scheduled'].includes(updateData.status)
    )

    if (completedReports.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot change status of completed/failed reports to processing',
          completed_report_ids: completedReports.map(r => r.id)
        }, { status: 400 })
      )
    }

    // Perform bulk update
    const { data: updatedReports, error: updateError } = await supabase
      .from('reports')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .in('id', report_ids)
      .select()

    if (updateError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to update reports',
          details: updateError.message
        }, { status: 500 })
      )
    }

    const response = {
      data: updatedReports,
      meta: {
        updated_count: updatedReports?.length || 0,
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('PATCH /api/v1/reports error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * DELETE /api/v1/reports (Bulk delete)
 * Bulk delete multiple reports
 */
export async function DELETE(request: NextRequest) {
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ANALYTICS_EXPORT)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. ANALYTICS_EXPORT required.' 
        }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const reportIdsParam = searchParams.get('ids')
    
    if (!reportIdsParam) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Report IDs required in query parameter: ?ids=id1,id2,id3'
        }, { status: 400 })
      )
    }

    const reportIds = reportIdsParam.split(',').filter(id => id.trim())
    if (reportIds.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No valid report IDs provided'
        }, { status: 400 })
      )
    }

    const supabase = createServerSupabaseClient()

    // Verify reports belong to user's organization
    const { data: reports, error: reportError } = await supabase
      .from('reports')
      .select('id, organization_id, status, file_url')
      .in('id', reportIds)

    if (reportError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify report ownership'
        }, { status: 500 })
      )
    }

    if (!reports || reports.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No reports found with provided IDs'
        }, { status: 404 })
      )
    }

    const invalidReports = reports.filter(
      report => report.organization_id !== authResult.user?.organizationId
    )

    if (invalidReports.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete reports from different organization',
          invalid_report_ids: invalidReports.map(r => r.id)
        }, { status: 403 })
      )
    }

    // Check for processing reports that might need confirmation
    const processingReports = reports.filter(r => r.status === 'processing')
    const force = searchParams.get('force') === 'true'

    if (processingReports.length > 0 && !force) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete processing reports without force=true parameter',
          processing_report_ids: processingReports.map(r => r.id),
          message: 'Add ?force=true to delete processing reports'
        }, { status: 400 })
      )
    }

    // Delete report files from storage first (if they exist)
    const reportsWithFiles = reports.filter(r => r.file_url)
    for (const report of reportsWithFiles) {
      try {
        await supabase.storage
          .from('reports')
          .remove([getFilePathFromUrl(report.file_url)])
      } catch (fileError) {
        console.warn(`Failed to delete file for report ${report.id}:`, fileError)
        // Don't fail the entire operation
      }
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .in('id', reports.map(r => r.id))

    if (deleteError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to delete reports',
          details: deleteError.message
        }, { status: 500 })
      )
    }

    const response = {
      message: 'Reports deleted successfully',
      deleted_count: reports.length,
      deleted_report_ids: reports.map(r => r.id),
      files_deleted: reportsWithFiles.length,
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('DELETE /api/v1/reports error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

// Helper functions

async function getReportStatusSummary(supabase: any, organizationId?: string) {
  if (!organizationId) return {}

  const { data, error } = await supabase
    .from('reports')
    .select('status')
    .eq('organization_id', organizationId)

  if (error || !data) return {}

  return data.reduce((acc: any, report: any) => {
    acc[report.status] = (acc[report.status] || 0) + 1
    return acc
  }, {})
}

async function getReportTypeSummary(supabase: any, organizationId?: string) {
  if (!organizationId) return {}

  const { data, error } = await supabase
    .from('reports')
    .select('type')
    .eq('organization_id', organizationId)

  if (error || !data) return {}

  return data.reduce((acc: any, report: any) => {
    acc[report.type] = (acc[report.type] || 0) + 1
    return acc
  }, {})
}

function getEstimatedCompletionTime(reportType: string): string {
  const estimations = {
    'survey_summary': '2-5 minutes',
    'analytics_dashboard': '3-7 minutes',
    'jtbd_analysis': '5-15 minutes',
    'user_engagement': '2-5 minutes',
    'voice_insights': '10-20 minutes',
    'department_breakdown': '3-8 minutes',
    'time_series': '5-10 minutes',
    'executive_summary': '5-15 minutes',
    'detailed_responses': '10-30 minutes',
    'ai_readiness_assessment': '15-30 minutes',
    'custom': '5-20 minutes'
  }

  return estimations[reportType as keyof typeof estimations] || '5-15 minutes'
}

function getFilePathFromUrl(fileUrl: string): string {
  // Extract file path from Supabase storage URL
  try {
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.indexOf('reports')
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/')
    }
  } catch (error) {
    console.warn('Failed to parse file URL:', error)
  }
  return fileUrl // fallback
}