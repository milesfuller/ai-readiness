import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { 
  hasPermission, 
  canAccessRoute, 
  canAccessOrganization,
  canPerformAction,
  ResourceCheck,
  PERMISSIONS,
  getRolePermissions
} from '@/lib/auth/rbac'
import { UserRole } from '@/lib/types'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

/**
 * Permission check API endpoint
 * Provides centralized permission validation for client-side and server-side use
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      type, 
      permission, 
      route, 
      organizationId, 
      resourceCheck 
    } = body

    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Not needed for read-only operations
          },
          remove() {
            // Not needed for read-only operations
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            hasPermission: false
          }, 
          { status: 401 }
        )
      )
    }

    // Extract user data
    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id
    const userId = user.id

    let hasAccess = false
    let details: any = {}

    // Handle different permission check types
    switch (type) {
      case 'permission':
        if (!permission) {
          return addAPISecurityHeaders(
            NextResponse.json(
              { 
                success: false, 
                error: 'Permission parameter required',
                hasPermission: false 
              }, 
              { status: 400 }
            )
          )
        }
        hasAccess = hasPermission(userRole, permission)
        details.permission = permission
        break

      case 'route':
        if (!route) {
          return addAPISecurityHeaders(
            NextResponse.json(
              { 
                success: false, 
                error: 'Route parameter required',
                hasPermission: false 
              }, 
              { status: 400 }
            )
          )
        }
        hasAccess = canAccessRoute(userRole, route)
        details.route = route
        break

      case 'organization':
        if (!organizationId) {
          return addAPISecurityHeaders(
            NextResponse.json(
              { 
                success: false, 
                error: 'Organization ID required',
                hasPermission: false 
              }, 
              { status: 400 }
            )
          )
        }
        hasAccess = canAccessOrganization(userRole, userOrgId, organizationId)
        details.organizationId = organizationId
        details.userOrgId = userOrgId
        break

      case 'resource':
        if (!resourceCheck) {
          return addAPISecurityHeaders(
            NextResponse.json(
              { 
                success: false, 
                error: 'Resource check parameters required',
                hasPermission: false 
              }, 
              { status: 400 }
            )
          )
        }
        
        const check: ResourceCheck = {
          resource: resourceCheck.resource,
          action: resourceCheck.action,
          scope: resourceCheck.scope,
          resourceOrgId: resourceCheck.resourceOrgId,
          resourceUserId: resourceCheck.resourceUserId
        }
        
        hasAccess = canPerformAction(userRole, userOrgId, userId, check)
        details.resourceCheck = check
        break

      case 'user_permissions':
        // Return all permissions for the user
        const permissions = getRolePermissions(userRole)
        return addAPISecurityHeaders(
          NextResponse.json({
            success: true,
            hasPermission: true,
            userRole,
            userOrgId,
            permissions,
            details: { type: 'user_permissions' }
          })
        )

      default:
        return addAPISecurityHeaders(
          NextResponse.json(
            { 
              success: false, 
              error: 'Invalid permission check type. Supported types: permission, route, organization, resource, user_permissions',
              hasPermission: false 
            }, 
            { status: 400 }
          )
        )
    }

    // Return permission check result
    return addAPISecurityHeaders(
      NextResponse.json({
        success: true,
        hasPermission: hasAccess,
        userRole,
        userOrgId,
        details
      })
    )

  } catch (error) {
    console.error('Permission check error:', error)
    
    return addAPISecurityHeaders(
      NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          hasPermission: false 
        }, 
        { status: 500 }
      )
    )
  }
}

/**
 * GET endpoint to check current user's permissions
 */
export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Not needed for read-only operations
          },
          remove() {
            // Not needed for read-only operations
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            authenticated: false
          }, 
          { status: 401 }
        )
      )
    }

    // Extract user data
    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id
    const permissions = getRolePermissions(userRole)

    return addAPISecurityHeaders(
      NextResponse.json({
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          organizationId: userOrgId
        },
        permissions,
        rolePermissions: {
          canAccessAdmin: hasPermission(userRole, PERMISSIONS.ADMIN_DASHBOARD),
          canAccessOrgData: hasPermission(userRole, PERMISSIONS.SURVEY_VIEW_ORG),
          canManageUsers: hasPermission(userRole, PERMISSIONS.USER_EDIT_ORG),
          canExportData: hasPermission(userRole, PERMISSIONS.API_EXPORT_ACCESS),
          canManageSystem: hasPermission(userRole, PERMISSIONS.ADMIN_SYSTEM_CONFIG)
        }
      })
    )

  } catch (error) {
    console.error('User permissions check error:', error)
    
    return addAPISecurityHeaders(
      NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error',
          authenticated: false 
        }, 
        { status: 500 }
      )
    )
  }
}