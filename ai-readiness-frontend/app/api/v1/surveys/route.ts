export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Validation schemas
const SurveyFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  category: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'status']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

const CreateSurveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).default('draft'),
  organization_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
  settings: z.object({
    allow_anonymous: z.boolean().default(true),
    require_all_questions: z.boolean().default(false),
    voice_enabled: z.boolean().default(true),
    ai_analysis_enabled: z.boolean().default(false),
    randomize_questions: z.boolean().default(false),
    show_progress_bar: z.boolean().default(true),
  }).optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * GET /api/v1/surveys
 * List surveys with filtering, pagination, and sorting
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.SURVEYS_READ)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. SURVEYS_READ required.' 
        }, { status: 403 })
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Validate and parse filters
    const filtersResult = SurveyFiltersSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      category: searchParams.get('category'),
      organization_id: searchParams.get('organization_id'),
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
      .from('surveys')
      .select(`
        id,
        title,
        description,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at,
        settings,
        metadata,
        organizations!inner(
          id,
          name
        )
      `, { count: 'exact' })

    // Apply organization filter (required for API access)
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    } else if (authResult.user?.organizationId) {
      query = query.eq('organization_id', authResult.user.organizationId)
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status)
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

    const { data: surveys, error, count } = await query

    if (error) {
      console.error('Survey query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to fetch surveys',
          details: error.message
        }, { status: 500 })
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / filters.limit)

    const response = {
      data: surveys,
      pagination: {
        current_page: filters.page,
        per_page: filters.limit,
        total_items: count || 0,
        total_pages: totalPages,
        has_next_page: filters.page < totalPages,
        has_previous_page: filters.page > 1,
      },
      filters: {
        search: filters.search,
        status: filters.status,
        category: filters.category,
        organization_id: filters.organization_id,
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
    console.error('GET /api/v1/surveys error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/surveys
 * Create a new survey
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.surveys.create'
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.SURVEYS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. SURVEYS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateSurveySchema.safeParse(body)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request body',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const surveyData = validationResult.data
    const supabase = await createServerSupabaseClient()

    // Verify organization access
    if (surveyData.organization_id !== authResult.user?.organizationId) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Cannot create survey for different organization' 
        }, { status: 403 })
      )
    }

    // If template_id provided, validate it exists
    if (surveyData.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('survey_templates')
        .select('id')
        .eq('id', surveyData.template_id)
        .single()

      if (templateError || !template) {
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'Invalid template_id' 
          }, { status: 400 })
        )
      }
    }

    // Create survey
    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title: surveyData.title,
        description: surveyData.description,
        status: surveyData.status,
        organization_id: surveyData.organization_id,
        created_by: authResult.user!.id,
        template_id: surveyData.template_id,
        settings: surveyData.settings || {},
        metadata: surveyData.metadata || {},
      })
      .select(`
        id,
        title,
        description,
        status,
        organization_id,
        created_by,
        template_id,
        created_at,
        updated_at,
        settings,
        metadata
      `)
      .single()

    if (error) {
      console.error('Survey creation error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to create survey',
          details: error.message
        }, { status: 500 })
      )
    }

    const response = {
      data: survey,
      meta: {
        timestamp: new Date().toISOString(),
        created_by: authResult.user!.email,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response, { status: 201 }))

  } catch (error) {
    console.error('POST /api/v1/surveys error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * PATCH /api/v1/surveys (Bulk operations)
 * Bulk update multiple surveys
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.SURVEYS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. SURVEYS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()
    const { survey_ids, updates } = body

    if (!Array.isArray(survey_ids) || survey_ids.length === 0 || !updates) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request. survey_ids array and updates object required.'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify all surveys belong to user's organization
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, organization_id')
      .in('id', survey_ids)

    if (surveyError || !surveys) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify survey ownership'
        }, { status: 500 })
      )
    }

    const invalidSurveys = surveys.filter(
      survey => survey.organization_id !== authResult.user?.organizationId
    )

    if (invalidSurveys.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot update surveys from different organization',
          invalid_survey_ids: invalidSurveys.map(s => s.id)
        }, { status: 403 })
      )
    }

    // Perform bulk update
    const { data: updatedSurveys, error: updateError } = await supabase
      .from('surveys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', survey_ids)
      .select()

    if (updateError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to update surveys',
          details: updateError.message
        }, { status: 500 })
      )
    }

    const response = {
      data: updatedSurveys,
      meta: {
        updated_count: updatedSurveys?.length || 0,
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('PATCH /api/v1/surveys error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * DELETE /api/v1/surveys (Bulk delete)
 * Bulk delete multiple surveys
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.SURVEYS_DELETE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. SURVEYS_DELETE required.' 
        }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const surveyIdsParam = searchParams.get('ids')
    
    if (!surveyIdsParam) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Survey IDs required in query parameter: ?ids=id1,id2,id3'
        }, { status: 400 })
      )
    }

    const surveyIds = surveyIdsParam.split(',').filter(id => id.trim())
    if (surveyIds.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No valid survey IDs provided'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify surveys belong to user's organization
    const { data: surveys, error: surveyError } = await supabase
      .from('surveys')
      .select('id, organization_id, status')
      .in('id', surveyIds)

    if (surveyError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify survey ownership'
        }, { status: 500 })
      )
    }

    if (!surveys || surveys.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No surveys found with provided IDs'
        }, { status: 404 })
      )
    }

    const invalidSurveys = surveys.filter(
      survey => survey.organization_id !== authResult.user?.organizationId
    )

    if (invalidSurveys.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete surveys from different organization',
          invalid_survey_ids: invalidSurveys.map(s => s.id)
        }, { status: 403 })
      )
    }

    // Check for active surveys that might need confirmation
    const activeSurveys = surveys.filter(s => s.status === 'active')
    const force = searchParams.get('force') === 'true'

    if (activeSurveys.length > 0 && !force) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete active surveys without force=true parameter',
          active_survey_ids: activeSurveys.map(s => s.id),
          message: 'Add ?force=true to delete active surveys'
        }, { status: 400 })
      )
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from('surveys')
      .delete()
      .in('id', surveys.map(s => s.id))

    if (deleteError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to delete surveys',
          details: deleteError.message
        }, { status: 500 })
      )
    }

    const response = {
      message: 'Surveys deleted successfully',
      deleted_count: surveys.length,
      deleted_survey_ids: surveys.map(s => s.id),
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('DELETE /api/v1/surveys error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}