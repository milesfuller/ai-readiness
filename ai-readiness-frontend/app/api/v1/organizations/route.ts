export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Validation schemas
const OrganizationFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'size']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
})

const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  settings: z.object({
    allow_self_registration: z.boolean().default(false),
    default_role: z.enum(['user', 'org_admin']).default('user'),
    require_email_verification: z.boolean().default(true),
    data_retention_days: z.number().min(30).max(2555).default(2555), // 7 years max
    enable_audit_logs: z.boolean().default(true),
    enable_2fa: z.boolean().default(false),
    enable_sso: z.boolean().default(false),
    sso_provider: z.string().optional(),
    sso_config: z.record(z.any()).optional(),
  }).optional(),
})

const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  settings: z.object({
    allow_self_registration: z.boolean().optional(),
    default_role: z.enum(['user', 'org_admin']).optional(),
    require_email_verification: z.boolean().optional(),
    data_retention_days: z.number().min(30).max(2555).optional(),
    enable_audit_logs: z.boolean().optional(),
    enable_2fa: z.boolean().optional(),
    enable_sso: z.boolean().optional(),
    sso_provider: z.string().optional(),
    sso_config: z.record(z.any()).optional(),
  }).optional(),
})

/**
 * GET /api/v1/organizations
 * List organizations (system admin only or user's own org)
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

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Check if requesting all organizations (system admin only)
    const listAll = searchParams.get('all') === 'true'
    
    if (listAll) {
      // Check if user has system admin permissions
      if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ORG_ADMIN)) {
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'System admin permissions required to list all organizations' 
          }, { status: 403 })
        )
      }
    }

    // Validate and parse filters
    const filtersResult = OrganizationFiltersSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      industry: searchParams.get('industry'),
      size: searchParams.get('size'),
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
      .from('organizations')
      .select(`
        id,
        name,
        domain,
        industry,
        size,
        website,
        description,
        settings,
        created_at,
        updated_at,
        _count_users:profiles(count)
      `, { count: 'exact' })

    // Apply organization filter based on permissions
    if (!listAll) {
      // Regular users can only see their own organization
      if (authResult.user?.organizationId) {
        query = query.eq('id', authResult.user.organizationId)
      } else {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'No organization associated with API key'
          }, { status: 403 })
        )
      }
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,domain.ilike.%${filters.search}%`)
    }

    // Apply industry filter
    if (filters.industry) {
      query = query.eq('industry', filters.industry)
    }

    // Apply size filter
    if (filters.size) {
      query = query.eq('size', filters.size)
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

    const { data: organizations, error, count } = await query

    if (error) {
      console.error('Organizations query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to fetch organizations',
          details: error.message
        }, { status: 500 })
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / filters.limit)

    const response = {
      data: organizations?.map(org => ({
        ...org,
        user_count: org._count_users?.[0]?.count || 0,
        _count_users: undefined, // Remove the internal count field
      })),
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
        industry: filters.industry,
        size: filters.size,
      },
      meta: {
        timestamp: new Date().toISOString(),
        list_all: listAll,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('GET /api/v1/organizations error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/organizations
 * Create a new organization (system admin only)
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

    // Check permissions (system admin only)
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ORG_ADMIN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'System admin permissions required to create organizations' 
        }, { status: 403 })
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateOrganizationSchema.safeParse(body)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request body',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const orgData = validationResult.data
    const supabase = await createServerSupabaseClient()

    // Check if organization name already exists
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', orgData.name)
      .single()

    if (existingOrg) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Organization name already exists' 
        }, { status: 409 })
      )
    }

    // Create organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        domain: orgData.domain,
        industry: orgData.industry,
        size: orgData.size,
        website: orgData.website,
        description: orgData.description,
        settings: orgData.settings || {},
      })
      .select(`
        id,
        name,
        domain,
        industry,
        size,
        website,
        description,
        settings,
        created_at,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Organization creation error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to create organization',
          details: error.message
        }, { status: 500 })
      )
    }

    const response = {
      data: organization,
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
    console.error('POST /api/v1/organizations error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * PATCH /api/v1/organizations
 * Update user's organization or bulk update (system admin)
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

    const body = await request.json()
    const { organization_ids, updates } = body

    // Check if bulk update (system admin only)
    const isBulkUpdate = Array.isArray(organization_ids)
    
    if (isBulkUpdate) {
      if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ORG_ADMIN)) {
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'System admin permissions required for bulk updates' 
          }, { status: 403 })
        )
      }
    }

    // Validate updates
    const validationResult = UpdateOrganizationSchema.safeParse(
      isBulkUpdate ? updates : body
    )
    
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid update data',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const updateData = validationResult.data
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('organizations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })

    if (isBulkUpdate) {
      // Bulk update multiple organizations
      query = query.in('id', organization_ids)
    } else {
      // Update user's own organization
      if (!authResult.user?.organizationId) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'No organization associated with API key'
          }, { status: 403 })
        )
      }
      query = query.eq('id', authResult.user.organizationId)
    }

    const { data: updatedOrganizations, error } = await query.select()

    if (error) {
      console.error('Organization update error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to update organization(s)',
          details: error.message
        }, { status: 500 })
      )
    }

    const response = {
      data: updatedOrganizations,
      meta: {
        updated_count: updatedOrganizations?.length || 0,
        bulk_update: isBulkUpdate,
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('PATCH /api/v1/organizations error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * DELETE /api/v1/organizations
 * Delete organizations (system admin only)
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

    // Check permissions (system admin only)
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ORG_ADMIN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'System admin permissions required to delete organizations' 
        }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const orgIdsParam = searchParams.get('ids')
    
    if (!orgIdsParam) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Organization IDs required in query parameter: ?ids=id1,id2,id3'
        }, { status: 400 })
      )
    }

    const orgIds = orgIdsParam.split(',').filter(id => id.trim())
    if (orgIds.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No valid organization IDs provided'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()

    // Check for organizations with users or surveys
    const { data: orgsWithData, error: checkError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        _count_users:profiles(count),
        _count_surveys:surveys(count)
      `)
      .in('id', orgIds)

    if (checkError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify organization data'
        }, { status: 500 })
      )
    }

    const force = searchParams.get('force') === 'true'
    const orgsWithUsers = orgsWithData?.filter(org => 
      (org._count_users?.[0]?.count || 0) > 0 || 
      (org._count_surveys?.[0]?.count || 0) > 0
    ) || []

    if (orgsWithUsers.length > 0 && !force) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete organizations with users or surveys without force=true parameter',
          organizations_with_data: orgsWithUsers.map(org => ({
            id: org.id,
            name: org.name,
            user_count: org._count_users?.[0]?.count || 0,
            survey_count: org._count_surveys?.[0]?.count || 0
          })),
          message: 'Add ?force=true to delete organizations with data'
        }, { status: 400 })
      )
    }

    // Perform deletion
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .in('id', orgIds)

    if (deleteError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to delete organizations',
          details: deleteError.message
        }, { status: 500 })
      )
    }

    const response = {
      message: 'Organizations deleted successfully',
      deleted_count: orgIds.length,
      deleted_organization_ids: orgIds,
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('DELETE /api/v1/organizations error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}