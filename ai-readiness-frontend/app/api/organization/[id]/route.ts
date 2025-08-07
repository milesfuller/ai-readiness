export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

interface OrganizationUpdateData {
  name?: string
  industry?: string
  size?: string
  website?: string
  description?: string
  settings?: {
    allowSelfRegistration?: boolean
    defaultRole?: 'user' | 'org_admin'
    requireEmailVerification?: boolean
    dataRetentionDays?: number
    enableAuditLogs?: boolean
    enable2FA?: boolean
    enableSSO?: boolean
    ssoProvider?: string
    ssoConfig?: any
  }
}

// GET organization details
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

    // Get organization data
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        industry,
        size,
        website,
        description,
        settings,
        created_at,
        updated_at
      `)
      .eq('id', params.id)
      .single()

    if (error || !organization) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      )
    }

    // Return organization data with default settings if none exist
    const defaultSettings = {
      allowSelfRegistration: false,
      defaultRole: 'user' as const,
      requireEmailVerification: true,
      dataRetentionDays: 365,
      enableAuditLogs: false,
      enable2FA: false,
      enableSSO: false,
      ssoProvider: null,
      ssoConfig: null
    }

    return addAPISecurityHeaders(
      NextResponse.json({
        ...organization,
        settings: { ...defaultSettings, ...organization.settings }
      })
    )

  } catch (error) {
    console.error('Organization GET error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    )
  }
}

// PATCH - Update organization
export async function PATCH(
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

    // Check if user can edit organization
    if (!hasPermission(userRole, PERMISSIONS.ORG_EDIT_OWN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied - org edit permission required' }, { status: 403 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, params.id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
      )
    }

    const updateData: OrganizationUpdateData = await request.json()

    // Validate input data
    if (updateData.name && (updateData.name.trim().length < 2 || updateData.name.trim().length > 100)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Organization name must be between 2 and 100 characters' }, { status: 400 })
      )
    }

    if (updateData.website && updateData.website.length > 255) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Website URL too long' }, { status: 400 })
      )
    }

    if (updateData.description && updateData.description.length > 1000) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Description too long (max 1000 characters)' }, { status: 400 })
      )
    }

    // Validate industry and size values
    const validIndustries = ['technology', 'healthcare', 'finance', 'education', 'manufacturing', 'retail', 'other']
    const validSizes = ['1-10', '11-50', '51-200', '201-1000', '1000+']

    if (updateData.industry && !validIndustries.includes(updateData.industry)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Invalid industry value' }, { status: 400 })
      )
    }

    if (updateData.size && !validSizes.includes(updateData.size)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Invalid size value' }, { status: 400 })
      )
    }

    // Get current organization data for merging settings
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentOrg) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      )
    }

    // Prepare update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // Only include fields that are being updated
    if (updateData.name !== undefined) updates.name = updateData.name.trim()
    if (updateData.industry !== undefined) updates.industry = updateData.industry
    if (updateData.size !== undefined) updates.size = updateData.size
    if (updateData.website !== undefined) updates.website = updateData.website || null
    if (updateData.description !== undefined) updates.description = updateData.description || null

    // Merge settings if provided
    if (updateData.settings) {
      const currentSettings = currentOrg.settings || {}
      updates.settings = { ...currentSettings, ...updateData.settings }
    }

    // Update organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', params.id)
      .select(`
        id,
        name,
        industry,
        size,
        website,
        description,
        settings,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Organization update error:', updateError)
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
      )
    }

    // Log audit event if audit logging is enabled
    if (updatedOrg.settings?.enableAuditLogs) {
      await supabase
        .from('audit_logs')
        .insert({
          organization_id: params.id,
          user_id: user.id,
          action: 'organization_updated',
          details: { updated_fields: Object.keys(updates) },
          created_at: new Date().toISOString()
        })
    }

    return addAPISecurityHeaders(
      NextResponse.json(updatedOrg)
    )

  } catch (error) {
    console.error('Organization PATCH error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    )
  }
}

// DELETE organization (danger zone)
export async function DELETE(
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

    // Only org_admin can delete organization
    if (userRole !== 'org_admin') {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Only organization administrators can delete organizations' }, { status: 403 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, params.id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
      )
    }

    // TODO: Implement organization deletion
    // This should be a complex operation that:
    // 1. Deletes all surveys and responses
    // 2. Removes all user memberships
    // 3. Revokes all API keys
    // 4. Cancels billing
    // 5. Finally deletes the organization
    
    // For now, return a placeholder response
    return addAPISecurityHeaders(
      NextResponse.json({ 
        error: 'Organization deletion not yet implemented',
        message: 'This feature requires careful implementation to ensure all data is properly cleaned up'
      }, { status: 501 })
    )

  } catch (error) {
    console.error('Organization DELETE error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    )
  }
}