export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { checkApiKeyAuth, ApiPermissions, hasPermission } from '@/lib/api/auth/api-auth'
import { enhancedRateLimiter } from '@/lib/api/rate-limiting'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Validation schemas
const UserFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  role: z.enum(['user', 'org_admin', 'system_admin']).optional(),
  department: z.string().optional(),
  job_title: z.string().optional(),
  organization_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  last_login_after: z.string().datetime().optional(),
  last_login_before: z.string().datetime().optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'last_login', 'email', 'role']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_profile: z.coerce.boolean().default(true),
  include_stats: z.coerce.boolean().default(false),
})

const CreateUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'org_admin']).default('user'),
  organization_id: z.string().uuid(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  send_invitation: z.boolean().default(true),
  invitation_message: z.string().max(500).optional(),
})

const UpdateUserSchema = z.object({
  role: z.enum(['user', 'org_admin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  department: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    notifications: z.boolean().optional(),
    voice_input: z.boolean().optional(),
    language: z.string().optional(),
  }).optional(),
})

/**
 * GET /api/v1/users
 * List users with filtering, pagination, and sorting
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.USERS_READ)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. USERS_READ required.' 
        }, { status: 403 })
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Validate and parse filters
    const filtersResult = UserFiltersSchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      role: searchParams.get('role'),
      department: searchParams.get('department'),
      job_title: searchParams.get('job_title'),
      organization_id: searchParams.get('organization_id'),
      status: searchParams.get('status'),
      created_after: searchParams.get('created_after'),
      created_before: searchParams.get('created_before'),
      last_login_after: searchParams.get('last_login_after'),
      last_login_before: searchParams.get('last_login_before'),
      sort_by: searchParams.get('sort_by'),
      sort_order: searchParams.get('sort_order'),
      include_profile: searchParams.get('include_profile'),
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

    // Determine if system admin (can see all orgs) or org-scoped
    const isSystemAdmin = hasPermission(
      authResult.apiKey?.permissions || [], 
      ApiPermissions.ORG_ADMIN
    )

    // Build base query
    let selectFields = `
      id,
      email,
      role,
      organization_id,
      created_at,
      updated_at,
      last_login_at,
      email_confirmed_at,
      banned_until
    `

    // Add profile fields if requested
    if (filters.include_profile) {
      selectFields += `,
        profiles (
          first_name,
          last_name,
          avatar_url,
          department,
          job_title,
          preferences
        )
      `
    }

    let query = supabase
      .from('auth.users')
      .select(selectFields, { count: 'exact' })

    // Apply organization filter
    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id)
    } else if (!isSystemAdmin && authResult.user?.organizationId) {
      // Non-system admins can only see users from their org
      query = query.eq('organization_id', authResult.user.organizationId)
    } else if (!isSystemAdmin) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Organization ID required or system admin permissions needed'
        }, { status: 403 })
      )
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`email.ilike.%${filters.search}%,profiles.first_name.ilike.%${filters.search}%,profiles.last_name.ilike.%${filters.search}%`)
    }

    // Apply role filter
    if (filters.role) {
      query = query.eq('role', filters.role)
    }

    // Apply status filter (based on banned_until and email_confirmed_at)
    if (filters.status) {
      switch (filters.status) {
        case 'active':
          query = query.is('banned_until', null).not('email_confirmed_at', 'is', null)
          break
        case 'inactive':
          query = query.is('email_confirmed_at', null)
          break
        case 'suspended':
          query = query.not('banned_until', 'is', null)
          break
        case 'pending':
          query = query.is('email_confirmed_at', null)
          break
      }
    }

    // Apply date filters
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }
    if (filters.last_login_after) {
      query = query.gte('last_login_at', filters.last_login_after)
    }
    if (filters.last_login_before) {
      query = query.lte('last_login_at', filters.last_login_before)
    }

    // Apply profile filters if included
    if (filters.include_profile) {
      if (filters.department) {
        query = query.eq('profiles.department', filters.department)
      }
      if (filters.job_title) {
        query = query.eq('profiles.job_title', filters.job_title)
      }
    }

    // Apply sorting
    query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })

    // Apply pagination
    query = query.range(offset, offset + filters.limit - 1)

    const { data: users, error, count } = await query

    if (error) {
      console.error('Users query error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to fetch users',
          details: error.message
        }, { status: 500 })
      )
    }

    // Add user statistics if requested
    let enhancedUsers = users
    if (filters.include_stats) {
      enhancedUsers = await Promise.all(
        users?.map(async (user: any) => {
          const stats = await getUserStats(supabase, user.id)
          return { ...user, stats }
        }) || []
      )
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / filters.limit)

    // Transform users for response
    const transformedUsers = enhancedUsers?.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      status: getUserStatus(user),
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      profile: filters.include_profile ? {
        first_name: user.profiles?.first_name,
        last_name: user.profiles?.last_name,
        avatar_url: user.profiles?.avatar_url,
        department: user.profiles?.department,
        job_title: user.profiles?.job_title,
        preferences: user.profiles?.preferences,
      } : undefined,
      stats: filters.include_stats ? user.stats : undefined,
    }))

    const response = {
      data: transformedUsers,
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
        role: filters.role,
        department: filters.department,
        job_title: filters.job_title,
        organization_id: filters.organization_id,
        status: filters.status,
      },
      meta: {
        timestamp: new Date().toISOString(),
        include_profile: filters.include_profile,
        include_stats: filters.include_stats,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('GET /api/v1/users error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * POST /api/v1/users
 * Create a new user (invite user to organization)
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.USERS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. USERS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()

    // Validate request body
    const validationResult = CreateUserSchema.safeParse(body)
    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request body',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const userData = validationResult.data
    const supabase = await createServerSupabaseClient()

    // Verify organization access
    if (userData.organization_id !== authResult.user?.organizationId && 
        !hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.ORG_ADMIN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Cannot create user for different organization without admin permissions' 
        }, { status: 403 })
      )
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', userData.email)
      .single()

    if (existingUser) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'User with this email already exists',
          existing_user_id: existingUser.id
        }, { status: 409 })
      )
    }

    // Create invitation record
    const invitationData = {
      email: userData.email,
      organization_id: userData.organization_id,
      role: userData.role,
      invited_by: authResult.user!.id,
      first_name: userData.first_name,
      last_name: userData.last_name,
      department: userData.department,
      job_title: userData.job_title,
      custom_message: userData.invitation_message,
      status: 'pending'
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert(invitationData)
      .select(`
        id,
        email,
        token,
        organization_id,
        role,
        first_name,
        last_name,
        department,
        job_title,
        status,
        created_at,
        expires_at
      `)
      .single()

    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to create user invitation',
          details: invitationError.message
        }, { status: 500 })
      )
    }

    // Send invitation email if requested
    if (userData.send_invitation) {
      try {
        // This would trigger the invitation email service
        await supabase.rpc('send_invitation_email', {
          invitation_id: invitation.id
        })
      } catch (emailError) {
        console.warn('Failed to send invitation email:', emailError)
        // Don't fail the request if email fails
      }
    }

    const response = {
      data: {
        invitation,
        message: userData.send_invitation 
          ? 'User invitation created and email sent'
          : 'User invitation created (email not sent)',
      },
      meta: {
        timestamp: new Date().toISOString(),
        created_by: authResult.user!.email,
        email_sent: userData.send_invitation,
        rate_limit: {
          remaining: rateLimitResult.remaining,
          reset_at: new Date(rateLimitResult.reset * 1000).toISOString()
        }
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response, { status: 201 }))

  } catch (error) {
    console.error('POST /api/v1/users error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * PATCH /api/v1/users (Bulk operations)
 * Bulk update multiple users
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.USERS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. USERS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const body = await request.json()
    const { user_ids, updates } = body

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !updates) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request. user_ids array and updates object required.'
        }, { status: 400 })
      )
    }

    // Validate updates
    const validationResult = UpdateUserSchema.safeParse(updates)
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

    // Verify all users belong to accessible organizations
    const isSystemAdmin = hasPermission(
      authResult.apiKey?.permissions || [], 
      ApiPermissions.ORG_ADMIN
    )

    let userQuery = supabase
      .from('auth.users')
      .select('id, email, organization_id')
      .in('id', user_ids)

    if (!isSystemAdmin && authResult.user?.organizationId) {
      userQuery = userQuery.eq('organization_id', authResult.user.organizationId)
    }

    const { data: users, error: userError } = await userQuery

    if (userError || !users) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify user access'
        }, { status: 500 })
      )
    }

    if (users.length !== user_ids.length) {
      const foundIds = users.map(u => u.id)
      const notFoundIds = user_ids.filter(id => !foundIds.includes(id))
      
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Some users not found or not accessible',
          inaccessible_user_ids: notFoundIds
        }, { status: 403 })
      )
    }

    // Prepare updates for auth.users table
    const authUpdates: any = {}
    if (updateData.role) authUpdates.role = updateData.role
    if (updateData.status === 'suspended') {
      authUpdates.banned_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    } else if (updateData.status === 'active') {
      authUpdates.banned_until = null
    }

    // Prepare updates for profiles table
    const profileUpdates: any = {}
    if (updateData.first_name !== undefined) profileUpdates.first_name = updateData.first_name
    if (updateData.last_name !== undefined) profileUpdates.last_name = updateData.last_name
    if (updateData.department !== undefined) profileUpdates.department = updateData.department
    if (updateData.job_title !== undefined) profileUpdates.job_title = updateData.job_title
    if (updateData.preferences) profileUpdates.preferences = updateData.preferences

    const results = []

    // Update auth.users if needed
    if (Object.keys(authUpdates).length > 0) {
      const { data: updatedUsers, error: authUpdateError } = await supabase
        .from('auth.users')
        .update({
          ...authUpdates,
          updated_at: new Date().toISOString()
        })
        .in('id', user_ids)
        .select()

      if (authUpdateError) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'Failed to update user accounts',
            details: authUpdateError.message
          }, { status: 500 })
        )
      }

      results.push({ table: 'auth.users', updated_count: updatedUsers?.length || 0 })
    }

    // Update profiles if needed
    if (Object.keys(profileUpdates).length > 0) {
      const { data: updatedProfiles, error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString()
        })
        .in('user_id', user_ids)
        .select()

      if (profileUpdateError) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'Failed to update user profiles',
            details: profileUpdateError.message
          }, { status: 500 })
        )
      }

      results.push({ table: 'profiles', updated_count: updatedProfiles?.length || 0 })
    }

    const response = {
      data: results,
      meta: {
        total_users_updated: user_ids.length,
        timestamp: new Date().toISOString(),
        updates_applied: updateData
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('PATCH /api/v1/users error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

/**
 * DELETE /api/v1/users (Bulk delete)
 * Bulk delete/deactivate multiple users
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
    if (!hasPermission(authResult.apiKey?.permissions || [], ApiPermissions.USERS_WRITE)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Insufficient permissions. USERS_WRITE required.' 
        }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const userIdsParam = searchParams.get('ids')
    const action = searchParams.get('action') || 'deactivate' // deactivate or hard_delete
    
    if (!userIdsParam) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'User IDs required in query parameter: ?ids=id1,id2,id3'
        }, { status: 400 })
      )
    }

    const userIds = userIdsParam.split(',').filter(id => id.trim())
    if (userIds.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No valid user IDs provided'
        }, { status: 400 })
      )
    }

    const supabase = await createServerSupabaseClient()

    // Verify users belong to accessible organizations
    const isSystemAdmin = hasPermission(
      authResult.apiKey?.permissions || [], 
      ApiPermissions.ORG_ADMIN
    )

    let userQuery = supabase
      .from('auth.users')
      .select('id, email, organization_id, role')
      .in('id', userIds)

    if (!isSystemAdmin && authResult.user?.organizationId) {
      userQuery = userQuery.eq('organization_id', authResult.user.organizationId)
    }

    const { data: users, error: userError } = await userQuery

    if (userError || !users) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Failed to verify user access'
        }, { status: 500 })
      )
    }

    if (users.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No accessible users found with provided IDs'
        }, { status: 404 })
      )
    }

    // Check for admin users that might need confirmation
    const adminUsers = users.filter(u => u.role === 'org_admin' || u.role === 'system_admin')
    const force = searchParams.get('force') === 'true'

    if (adminUsers.length > 0 && !force) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Cannot delete admin users without force=true parameter',
          admin_user_ids: adminUsers.map(u => u.id),
          message: 'Add ?force=true to delete admin users'
        }, { status: 400 })
      )
    }

    let result: any

    if (action === 'hard_delete') {
      // Hard delete (requires system admin)
      if (!isSystemAdmin) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'System admin permissions required for hard delete'
          }, { status: 403 })
        )
      }

      const { error: deleteError } = await supabase
        .from('auth.users')
        .delete()
        .in('id', users.map(u => u.id))

      if (deleteError) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'Failed to delete users',
            details: deleteError.message
          }, { status: 500 })
        )
      }

      result = {
        message: 'Users permanently deleted',
        action: 'hard_delete',
        deleted_count: users.length
      }

    } else {
      // Soft delete (deactivate)
      const { error: deactivateError } = await supabase
        .from('auth.users')
        .update({
          banned_until: new Date('2099-12-31').toISOString(), // Effectively permanent
          updated_at: new Date().toISOString()
        })
        .in('id', users.map(u => u.id))

      if (deactivateError) {
        return addAPISecurityHeaders(
          NextResponse.json({
            error: 'Failed to deactivate users',
            details: deactivateError.message
          }, { status: 500 })
        )
      }

      result = {
        message: 'Users deactivated successfully',
        action: 'deactivate',
        deactivated_count: users.length
      }
    }

    const response = {
      ...result,
      affected_user_ids: users.map(u => u.id),
      affected_users: users.map(u => ({ id: u.id, email: u.email, role: u.role })),
      meta: {
        timestamp: new Date().toISOString()
      }
    }

    return addAPISecurityHeaders(NextResponse.json(response))

  } catch (error) {
    console.error('DELETE /api/v1/users error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    )
  }
}

// Helper functions

function getUserStatus(user: any): string {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return 'suspended'
  }
  if (!user.email_confirmed_at) {
    return 'pending'
  }
  return 'active'
}

async function getUserStats(supabase: any, userId: string) {
  try {
    // Get survey response count
    const { count: responseCount } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('respondent_id', userId)

    // Get completed survey count
    const { count: completedCount } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact', head: true })
      .eq('respondent_id', userId)
      .not('submitted_at', 'is', null)

    // Get voice recordings count
    const { count: voiceCount } = await supabase
      .from('voice_recordings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    return {
      total_responses: responseCount || 0,
      completed_responses: completedCount || 0,
      voice_recordings: voiceCount || 0,
      completion_rate: responseCount > 0 ? Math.round(((completedCount || 0) / responseCount) * 100) : 0
    }
  } catch (error) {
    console.warn('Failed to get user stats:', error)
    return {
      total_responses: 0,
      completed_responses: 0,
      voice_recordings: 0,
      completion_rate: 0
    }
  }
}