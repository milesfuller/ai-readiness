export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// DELETE API key (revoke)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; keyId: string } }
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

    // Verify API key exists and belongs to organization
    const { data: apiKey, error: fetchError } = await supabase
      .from('organization_api_keys')
      .select('id, name, organization_id')
      .eq('id', params.keyId)
      .eq('organization_id', params.id)
      .eq('active', true)
      .single()

    if (fetchError || !apiKey) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'API key not found' }, { status: 404 })
      )
    }

    // Revoke API key (mark as inactive)
    const { error: updateError } = await supabase
      .from('organization_api_keys')
      .update({
        active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id
      })
      .eq('id', params.keyId)
      .eq('organization_id', params.id)

    if (updateError) {
      console.error('API key revocation error:', updateError)
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
      )
    }

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: params.id,
        user_id: user.id,
        action: 'api_key_revoked',
        details: { api_key_name: apiKey.name, api_key_id: params.keyId },
        created_at: new Date().toISOString()
      })

    return addAPISecurityHeaders(
      NextResponse.json({ 
        success: true, 
        message: 'API key revoked successfully' 
      })
    )

  } catch (error) {
    console.error('API key DELETE error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
    )
  }
}