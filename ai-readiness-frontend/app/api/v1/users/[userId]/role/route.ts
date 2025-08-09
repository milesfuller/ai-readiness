import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Role, RBACService } from '@/lib/auth/rbac'
import { z } from 'zod'

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role)
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current user's details
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to manage roles
    if (!RBACService.canManageRole(currentUser.role as Role, Role.USER)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to manage roles' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { role: newRole } = validation.data
    const { userId } = params

    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if current user can manage the target user's role
    if (!RBACService.canManageRole(currentUser.role as Role, targetUser.role as Role)) {
      return NextResponse.json(
        { error: 'Cannot manage user with equal or higher role' },
        { status: 403 }
      )
    }

    // Check if current user can assign the new role
    if (!RBACService.canManageRole(currentUser.role as Role, newRole)) {
      return NextResponse.json(
        { error: 'Cannot assign role higher than your own' },
        { status: 403 }
      )
    }

    // For org admins, ensure they can only manage users in their org
    if (currentUser.role === Role.ORG_ADMIN && 
        targetUser.organization_id !== currentUser.organization_id) {
      return NextResponse.json(
        { error: 'Can only manage users in your organization' },
        { status: 403 }
      )
    }

    // Update the user's role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      )
    }

    // Log the audit event
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'UPDATE_USER_ROLE',
        target_id: userId,
        target_type: 'user',
        details: {
          old_role: targetUser.role,
          new_role: newRole
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User role updated to ${RBACService.getRoleDisplayName(newRole)}`
    })

  } catch (error) {
    console.error('Error in role update endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Get user's role and permissions
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, permissions, organization_id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all permissions for the role
    const rolePermissions = RBACService.getPermissions(userData.role as Role)
    const allPermissions = [...new Set([
      ...rolePermissions,
      ...(userData.permissions || [])
    ])]

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        organizationId: userData.organization_id
      },
      permissions: {
        role: userData.role,
        rolePermissions,
        customPermissions: userData.permissions || [],
        allPermissions
      }
    })

  } catch (error) {
    console.error('Error fetching user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}