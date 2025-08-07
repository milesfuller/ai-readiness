export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'
import crypto from 'crypto'

interface CreateAPIKeyRequest {
  name: string
  permissions: string[]
}

// GET API keys for organization
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
    }

    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id

    // Check if user can view organization
    if (!hasPermission(userRole, PERMISSIONS.ORG_VIEW_OWN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied' }, { status: 403 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, params.id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
      )
    }

    // Get API keys from database
    const { data: apiKeys, error } = await supabase
      .from('organization_api_keys')
      .select(`
        id,
        name,
        key_hash,
        permissions,
        created_at,
        last_used_at
      `)
      .eq('organization_id', params.id)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('API keys fetch error:', error)
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
      )
    }

    // Return masked API keys for security
    const maskedKeys = (apiKeys || []).map(key => ({
      id: key.id,
      name: key.name,
      key: '••••••••••••••••', // Always return masked for GET requests
      masked: true,
      created_at: key.created_at,
      last_used: key.last_used_at,
      permissions: key.permissions
    }))

    return addAPISecurityHeaders(
      NextResponse.json(maskedKeys)
    )

  } catch (error) {
    console.error('API keys GET error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
    )
  }
}

// POST - Create new API key
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
    }

    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id

    // Check if user can edit organization (API key management)
    if (!hasPermission(userRole, PERMISSIONS.ORG_EDIT_OWN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied - organization edit permission required' }, { status: 403 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, params.id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
      )
    }

    const { name, permissions }: CreateAPIKeyRequest = await request.json()

    // Validate input
    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'API key name must be between 2 and 100 characters' }, { status: 400 })
      )
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'At least one permission must be specified' }, { status: 400 })
      )
    }

    // Validate permissions
    const validPermissions = ['read_surveys', 'read_responses', 'read_analytics', 'write_surveys', 'admin_access']
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p))
    if (invalidPermissions.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          validPermissions 
        }, { status: 400 })
      )
    }

    // Generate API key
    const apiKey = `sk_${params.id}_${crypto.randomBytes(32).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

    // Check if API key limit reached (prevent abuse)
    const { data: existingKeys } = await supabase
      .from('organization_api_keys')
      .select('id', { count: 'exact' })
      .eq('organization_id', params.id)
      .eq('active', true)

    if (existingKeys && existingKeys.length >= 10) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Maximum API key limit reached (10)' }, { status: 400 })
      )
    }

    // Insert API key into database
    const { data: newKey, error: insertError } = await supabase
      .from('organization_api_keys')
      .insert({
        organization_id: params.id,
        name: name.trim(),
        key_hash: keyHash,
        permissions,
        created_by: user.id,
        active: true,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        name,
        permissions,
        created_at
      `)
      .single()

    if (insertError) {
      console.error('API key creation error:', insertError)
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
      )
    }

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: params.id,
        user_id: user.id,
        action: 'api_key_created',
        details: { api_key_name: name, permissions },
        created_at: new Date().toISOString()
      })

    // Return the API key (only time it's shown unmasked)
    return addAPISecurityHeaders(
      NextResponse.json({
        ...newKey,
        key: apiKey, // Only returned once during creation
        masked: false
      })
    )

  } catch (error) {
    console.error('API key POST error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    )
  }
}