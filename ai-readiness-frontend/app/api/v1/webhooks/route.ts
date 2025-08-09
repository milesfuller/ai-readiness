export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'
import crypto from 'crypto'

// Validation schemas
const WebhookFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  event_type: z.enum([
    'survey.created',
    'survey.updated', 
    'survey.completed',
    'survey.deleted',
    'response.created',
    'response.completed',
    'report.generated',
    'report.failed',
    'user.invited',
    'user.registered',
    'organization.updated',
    'ai_analysis.completed'
  ]).optional(),
  status: z.enum(['active', 'inactive', 'failed', 'testing']).optional(),
  organization_id: z.string().uuid().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'name', 'status', 'last_triggered']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_stats: z.coerce.boolean().default(false),
})

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  url: z.string().url(),
  organization_id: z.string().uuid(),
  event_types: z.array(z.enum([
    'survey.created',
    'survey.updated', 
    'survey.completed',
    'survey.deleted',
    'response.created',
    'response.completed',
    'report.generated',
    'report.failed',
    'user.invited',
    'user.registered',
    'organization.updated',
    'ai_analysis.completed'
  ])).min(1),
  config: z.object({
    method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
    headers: z.record(z.string()).optional(),
    timeout_seconds: z.number().min(1).max(300).default(30),
    retry_attempts: z.number().min(0).max(5).default(3),
    retry_delay_seconds: z.number().min(1).max(3600).default(60),
    include_payload_hash: z.boolean().default(true),
    include_timestamp: z.boolean().default(true),
  }).optional(),
  filters: z.object({
    survey_ids: z.array(z.string().uuid()).optional(),
    user_ids: z.array(z.string().uuid()).optional(),
    status_filter: z.array(z.string()).optional(),
    custom_conditions: z.record(z.any()).optional(),
  }).optional(),
  security: z.object({
    signing_secret: z.string().min(16).max(128).optional(),
    verify_ssl: z.boolean().default(true),
    allowed_ips: z.array(z.string().ip()).optional(),
    basic_auth: z.object({
      username: z.string(),
      password: z.string()
    }).optional(),
    bearer_token: z.string().optional(),
  }).optional(),
  rate_limit: z.object({
    max_requests_per_minute: z.number().min(1).max(1000).default(60),
    burst_limit: z.number().min(1).max(100).default(10),
  }).optional(),
})

const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  url: z.string().url().optional(),
  event_types: z.array(z.enum([
    'survey.created',
    'survey.updated', 
    'survey.completed',
    'survey.deleted',
    'response.created',
    'response.completed',
    'report.generated',
    'report.failed',
    'user.invited',
    'user.registered',
    'organization.updated',
    'ai_analysis.completed'
  ])).optional(),
  status: z.enum(['active', 'inactive', 'failed', 'testing']).optional(),
  config: z.object({
    method: z.enum(['POST', 'PUT', 'PATCH']).optional(),
    headers: z.record(z.string()).optional(),
    timeout_seconds: z.number().min(1).max(300).optional(),
    retry_attempts: z.number().min(0).max(5).optional(),
    retry_delay_seconds: z.number().min(1).max(3600).optional(),
    include_payload_hash: z.boolean().optional(),
    include_timestamp: z.boolean().optional(),
  }).optional(),
  filters: z.object({
    survey_ids: z.array(z.string().uuid()).optional(),
    user_ids: z.array(z.string().uuid()).optional(),
    status_filter: z.array(z.string()).optional(),
    custom_conditions: z.record(z.any()).optional(),
  }).optional(),
  security: z.object({
    signing_secret: z.string().min(16).max(128).optional(),
    verify_ssl: z.boolean().optional(),
    allowed_ips: z.array(z.string().ip()).optional(),
    basic_auth: z.object({
      username: z.string(),
      password: z.string()
    }).optional(),
    bearer_token: z.string().optional(),
  }).optional(),
  rate_limit: z.object({
    max_requests_per_minute: z.number().min(1).max(1000).optional(),
    burst_limit: z.number().min(1).max(100).optional(),
  }).optional(),
})

const TestWebhookSchema = z.object({
  event_type: z.enum([
    'survey.created',
    'survey.updated', 
    'survey.completed',
    'survey.deleted',
    'response.created',
    'response.completed',
    'report.generated',
    'report.failed',
    'user.invited',
    'user.registered',
    'organization.updated',
    'ai_analysis.completed'
  ]),
  test_payload: z.record(z.any()).optional(),
})

/**
 * GET /api/v1/webhooks
 * List webhooks with filtering, pagination, and sorting
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.webhooks'
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.WEBHOOKS_READ)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. WEBHOOKS_READ required.' 
        }, { status: 403 })
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Validate and parse filters
    const filtersResult = WebhookFiltersSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      event_type: searchParams.get('event_type'),
      status: searchParams.get('status'),
      organization_id: searchParams.get('organization_id'),
      created_after: searchParams.get('created_after'),
      created_before: searchParams.get('created_before'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order'),
      include_stats: searchParams.get('include_stats'),
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
      .from('webhooks')
      .select(`
        id,
        name,
        description,
        url,
        event_types,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at,
        last_triggered_at,
        last_success_at,
        last_failure_at,
        config,
        filters,
        rate_limit,
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

    // Apply search filter
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,url.ilike.%${filters.search}%`)
    }

    // Apply event type filter
    if (filters.event_type) {
      query = query.contains('event_types', [filters.event_type])
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

    const { data: webhooks, error, count } = await query

    if (error) {
      console.error('Webhooks query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to fetch webhooks',
          details: error.message
        }, { status: 500 })
      )
    }

    // Add webhook statistics if requested
    let enhancedWebhooks = webhooks
    if (filters.include_stats) {
      enhancedWebhooks = await Promise.all(
        webhooks?.map(async (webhook) => {
          const stats = await getWebhookStats(supabase, webhook.id)
          return { ...webhook, stats }
        }) || []
      )
    }

    // Transform webhooks for response (remove sensitive data)
    const transformedWebhooks = enhancedWebhooks?.map(webhook => ({
      id: webhook.id,
      name: webhook.name,
      description: webhook.description,
      url: maskWebhookUrl(webhook.url),
      event_types: webhook.event_types,
      status: webhook.status,
      organization_id: webhook.organization_id,
      organization_name: Array.isArray(webhook.organizations) ? webhook.organizations[0]?.name : (webhook.organizations as any)?.name,
      created_by: webhook.created_by,
      creator: webhook.profiles ? {
        name: Array.isArray(webhook.profiles) 
          ? `${webhook.profiles[0]?.first_name} ${webhook.profiles[0]?.last_name}`.trim()
          : `${(webhook.profiles as any).first_name} ${(webhook.profiles as any).last_name}`.trim(),
        email: Array.isArray(webhook.profiles) 
          ? webhook.profiles[0]?.email 
          : (webhook.profiles as any).email
      } : null,
      created_at: webhook.created_at,
      updated_at: webhook.updated_at,
      last_triggered_at: webhook.last_triggered_at,
      last_success_at: webhook.last_success_at,
      last_failure_at: webhook.last_failure_at,
      config: {
        method: webhook.config?.method,
        timeout_seconds: webhook.config?.timeout_seconds,
        retry_attempts: webhook.config?.retry_attempts,
        retry_delay_seconds: webhook.config?.retry_delay_seconds,
        include_payload_hash: webhook.config?.include_payload_hash,
        include_timestamp: webhook.config?.include_timestamp,
        // Don't expose sensitive headers, auth info
      },
      filters: webhook.filters,
      rate_limit: webhook.rate_limit,
      stats: filters.include_stats ? (webhook as any).stats : undefined,
    }))

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / filters.limit)

    const response = {
      data: transformedWebhooks,
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
        event_type: filters.event_type,
        status: filters.status,
        organization_id: filters.organization_id,
      },
      summary: {
        by_status: await getWebhookStatusSummary(supabase, authResult.user?.organizationId),
        by_event_type: await getWebhookEventTypeSummary(supabase, authResult.user?.organizationId),
      },
      meta: {
        timestamp: new Date().toISOString(),
        include_stats: filters.include_stats,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('GET /api/v1/webhooks error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.webhooks'
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.WEBHOOKS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. WEBHOOKS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateWebhookSchema.safeParse(body)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request body',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const webhookData = validationResult.data
    const supabase = await createServerSupabaseClient()

    // Verify organization access
    if (webhookData.organization_id !== authResult.user?.organizationId) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Cannot create webhook for different organization' 
        }, { status: 403 })
      )
    }

    // Generate signing secret if not provided
    let signingSecret = webhookData.security?.signing_secret
    if (!signingSecret && (webhookData.security as any)?.include_payload_hash !== false) {
      signingSecret = crypto.randomBytes(32).toString('hex')
    }

    // Validate webhook URL accessibility (optional - might want to skip in dev)
    try {
      await validateWebhookUrl(webhookData.url)
    } catch (urlError) {
      console.warn('Webhook URL validation failed:', urlError)
      // Don't fail creation, just warn
    }

    // Create webhook record
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        name: webhookData.name,
        description: webhookData.description,
        url: webhookData.url,
        organization_id: webhookData.organization_id,
        created_by: authResult.user!.id,
        event_types: webhookData.event_types,
        config: {
          method: 'POST',
          timeout_seconds: 30,
          retry_attempts: 3,
          retry_delay_seconds: 60,
          include_payload_hash: true,
          include_timestamp: true,
          ...webhookData.config,
        },
        filters: webhookData.filters || {},
        security: {
          signing_secret: signingSecret,
          verify_ssl: true,
          ...webhookData.security,
        },
        rate_limit: {
          max_requests_per_minute: 60,
          burst_limit: 10,
          ...webhookData.rate_limit,
        },
        status: 'active',
        version: '1.0',
      })
      .select(`
        id,
        name,
        description,
        url,
        event_types,
        status,
        organization_id,
        created_by,
        created_at,
        updated_at,
        config,
        filters,
        rate_limit,
        version
      `)
      .single()

    if (error) {
      console.error('Webhook creation error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to create webhook',
          details: error.message
        }, { status: 500 })
      )
    }

    // Return webhook with signing secret (only shown once)
    const response = {
      data: {
        ...webhook,
        signing_secret: signingSecret, // Only returned on creation
        security_note: 'Store the signing secret securely. It will not be shown again.',
      },
      meta: {
        timestamp: new Date().toISOString(),
        created_by: authResult.user!.email,
        webhook_id: webhook.id,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response, { status: 201 }))

  } catch (error) {
    console.error('POST /api/v1/webhooks error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * PATCH /api/v1/webhooks (Bulk operations)
 * Bulk update multiple webhooks
 */
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.webhooks'
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.WEBHOOKS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. WEBHOOKS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()
    const { webhook_ids, updates } = body

    if (!Array.isArray(webhook_ids) || webhook_ids.length === 0 || !updates) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request. webhook_ids array and updates object required.'
        }, { status: 400 })
      )
    }

    // Validate updates
    const validationResult = UpdateWebhookSchema.safeParse(updates)
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

    // Verify all webhooks belong to user's organization
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select('id, organization_id, config, security')
      .in('id', webhook_ids)

    if (webhookError || !webhooks) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify webhook ownership'
        }, { status: 500 })
      )
    }

    const invalidWebhooks = webhooks.filter(
      webhook => webhook.organization_id !== authResult.user?.organizationId
    )

    if (invalidWebhooks.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot update webhooks from different organization',
          invalid_webhook_ids: invalidWebhooks.map(w => w.id)
        }, { status: 403 })
      )
    }

    // Prepare update object with proper merging of nested objects
    const updates_prepared: any = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Handle nested config updates
    if (updateData.config) {
      updates_prepared.config = webhooks.map(w => ({
        ...w.config,
        ...updateData.config
      }))[0] // This is simplified - in production, handle per-webhook
    }

    // Handle nested security updates
    if (updateData.security) {
      updates_prepared.security = webhooks.map(w => ({
        ...w.security,
        ...updateData.security
      }))[0] // This is simplified - in production, handle per-webhook
    }

    // Perform bulk update
    const { data: updatedWebhooks, error: updateError } = await supabase
      .from('webhooks')
      .update(updates_prepared)
      .in('id', webhook_ids)
      .select()

    if (updateError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to update webhooks',
          details: updateError.message
        }, { status: 500 })
      )
    }

    const response = {
      data: updatedWebhooks?.map(webhook => ({
        ...webhook,
        // Remove sensitive data from response
        security: webhook.security ? {
          verify_ssl: webhook.security.verify_ssl,
          // Don't expose signing_secret, tokens, etc.
        } : undefined
      })),
      meta: {
        updated_count: updatedWebhooks?.length || 0,
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('PATCH /api/v1/webhooks error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * DELETE /api/v1/webhooks (Bulk delete)
 * Bulk delete multiple webhooks
 */
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await enhancedRateLimiter.checkRateLimit(
      request,
      'api.webhooks'
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.WEBHOOKS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. WEBHOOKS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const webhookIdsParam = searchParams.get('ids')
    
    if (!webhookIdsParam) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Webhook IDs required in query parameter: ?ids=id1,id2,id3'
        }, { status: 400 })
      )
    }

    const webhookIds = webhookIdsParam.split(',').filter(id => id.trim())
    if (webhookIds.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No valid webhook IDs provided'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify webhooks belong to user's organization
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select('id, organization_id, name, status')
      .in('id', webhookIds)

    if (webhookError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify webhook ownership'
        }, { status: 500 })
      )
    }

    if (!webhooks || webhooks.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No webhooks found with provided IDs'
        }, { status: 404 })
      )
    }

    const invalidWebhooks = webhooks.filter(
      webhook => webhook.organization_id !== authResult.user?.organizationId
    )

    if (invalidWebhooks.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete webhooks from different organization',
          invalid_webhook_ids: invalidWebhooks.map(w => w.id)
        }, { status: 403 })
      )
    }

    // Perform deletion (also deletes related webhook_logs via CASCADE)
    const { error: deleteError } = await supabase
      .from('webhooks')
      .delete()
      .in('id', webhooks.map(w => w.id))

    if (deleteError) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to delete webhooks',
          details: deleteError.message
        }, { status: 500 })
      )
    }

    const response = {
      message: 'Webhooks deleted successfully',
      deleted_count: webhooks.length,
      deleted_webhook_ids: webhooks.map(w => w.id),
      deleted_webhooks: webhooks.map(w => ({
        id: w.id,
        name: w.name,
        status: w.status
      })),
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('DELETE /api/v1/webhooks error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

// Helper functions

function maskWebhookUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const path = urlObj.pathname
    
    // Show first part of domain and full path, mask middle part
    const domainParts = domain.split('.')
    if (domainParts.length > 2) {
      domainParts[domainParts.length - 2] = '*'.repeat(domainParts[domainParts.length - 2].length)
    }
    
    return `${urlObj.protocol}//${domainParts.join('.')}${path}`
  } catch {
    return url.replace(/\/\/[^\/]+/, '//***')
  }
}

async function validateWebhookUrl(url: string): Promise<void> {
  // In production, you might want to make a test request
  // For now, just validate it's a proper URL
  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid protocol')
    }
    if (urlObj.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
      throw new Error('Localhost URLs not allowed in production')
    }
  } catch (error) {
    throw new Error('Invalid webhook URL')
  }
}

async function getWebhookStats(supabase: any, webhookId: string) {
  try {
    // Get webhook logs for statistics
    const { data: logs, error } = await supabase
      .from('webhook_logs')
      .select('success, response_status, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(100) // Recent logs

    if (error) throw error

    const totalCalls = logs?.length || 0
    const successfulCalls = logs?.filter((log: any) => log.success).length || 0
    const failedCalls = totalCalls - successfulCalls
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentLogs = logs?.filter((log: any) => new Date(log.created_at) > yesterday) || []

    return {
      total_calls: totalCalls,
      successful_calls: successfulCalls,
      failed_calls: failedCalls,
      success_rate_percentage: Math.round(successRate * 100) / 100,
      calls_last_24h: recentLogs.length,
      last_call_at: logs?.[0]?.created_at || null,
    }
  } catch (error) {
    console.warn('Failed to get webhook stats:', error)
    return {
      total_calls: 0,
      successful_calls: 0,
      failed_calls: 0,
      success_rate_percentage: 0,
      calls_last_24h: 0,
      last_call_at: null,
    }
  }
}

async function getWebhookStatusSummary(supabase: any, organizationId?: string) {
  if (!organizationId) return {}

  const { data, error } = await supabase
    .from('webhooks')
    .select('status')
    .eq('organization_id', organizationId)

  if (error || !data) return {}

  return data.reduce((acc: any, webhook: any) => {
    acc[webhook.status] = (acc[webhook.status] || 0) + 1
    return acc
  }, {})
}

async function getWebhookEventTypeSummary(supabase: any, organizationId?: string) {
  if (!organizationId) return {}

  const { data, error } = await supabase
    .from('webhooks')
    .select('event_types')
    .eq('organization_id', organizationId)

  if (error || !data) return {}

  const eventTypeCounts: any = {}
  data.forEach((webhook: any) => {
    webhook.event_types.forEach((eventType: string) => {
      eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1
    })
  })

  return eventTypeCounts
}