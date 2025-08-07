/**
 * Authentication and authorization middleware for server-side route protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { UserRole } from '@/lib/types'
import { canAccessRoute, ROLE_HIERARCHY, canAccessOrganization } from './rbac'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  organizationId?: string
}

/**
 * Extract user data from Supabase auth
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  user: AuthUser | null
  error?: string
}> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {
            // Not needed for read-only operations in middleware
          },
          remove() {
            // Not needed for read-only operations in middleware
          }
        }
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, error: error?.message || 'No user found' }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      role: (user.user_metadata?.role as UserRole) || 'user',
      organizationId: user.user_metadata?.organization_id
    }

    return { user: authUser }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Check if user has required role(s)
 */
export function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => 
    ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[role]
  )
}

/**
 * Middleware for protecting admin routes
 */
export async function adminRouteMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname

  // Check if this is an admin route
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/system')) {
    return null // Not an admin route, continue
  }

  const { user, error } = await getAuthenticatedUser(request)

  // Redirect to login if not authenticated
  if (!user || error) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if user has admin access
  if (!hasRequiredRole(user.role, ['org_admin', 'system_admin'])) {
    // Return 403 Forbidden for authenticated users without permission
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access denied. Admin privileges required.',
        requiredRoles: ['org_admin', 'system_admin'],
        userRole: user.role
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // System routes require system_admin role
  if (pathname.startsWith('/system') && user.role !== 'system_admin') {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access denied. System administrator privileges required.',
        requiredRoles: ['system_admin'],
        userRole: user.role
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return null // User has access, continue
}

/**
 * Middleware for protecting organization routes
 */
export async function organizationRouteMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname

  // Check if this is an organization route
  if (!pathname.startsWith('/organization')) {
    return null // Not an organization route, continue
  }

  const { user, error } = await getAuthenticatedUser(request)

  // Redirect to login if not authenticated
  if (!user || error) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Organization routes require org membership
  if (!user.organizationId && user.role !== 'system_admin') {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Access denied. Organization membership required.',
        userRole: user.role,
        hasOrganization: false
      }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Extract organization ID from URL if present (e.g., /organization/123/surveys)
  const orgIdMatch = pathname.match(/^\/organization\/([^\/]+)/)
  if (orgIdMatch) {
    const requestedOrgId = orgIdMatch[1]
    
    // Check if user can access this specific organization
    if (!canAccessOrganization(user.role, user.organizationId, requestedOrgId)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied. You can only access your own organization.',
          userRole: user.role,
          userOrgId: user.organizationId,
          requestedOrgId
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return null // User has access, continue
}

/**
 * Middleware for protecting API routes
 */
export async function apiRouteMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname

  // Only protect specific API routes
  const protectedApiRoutes = [
    '/api/admin',
    '/api/export',
    '/api/llm/batch',
    '/api/llm/organizational'
  ]

  const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route))
  if (!isProtectedApi) {
    return null // Not a protected API route, continue
  }

  const { user, error } = await getAuthenticatedUser(request)

  // Return 401 for unauthenticated requests
  if (!user || error) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Authentication required',
        message: error || 'No valid session found'
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Check specific API route permissions
  if (pathname.startsWith('/api/admin')) {
    if (!hasRequiredRole(user.role, ['org_admin', 'system_admin'])) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied. Admin privileges required for this API.',
          requiredRoles: ['org_admin', 'system_admin'],
          userRole: user.role
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  if (pathname.startsWith('/api/export')) {
    if (!hasRequiredRole(user.role, ['org_admin', 'system_admin'])) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied. Export privileges required.',
          requiredRoles: ['org_admin', 'system_admin'],
          userRole: user.role
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  if (pathname.startsWith('/api/llm/organizational')) {
    if (!hasRequiredRole(user.role, ['org_admin', 'system_admin'])) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Access denied. Organization-level LLM access required.',
          requiredRoles: ['org_admin', 'system_admin'],
          userRole: user.role
        }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }

  return null // User has access, continue
}

/**
 * Combined RBAC middleware that handles all route types
 */
export async function rbacMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Try each middleware in order
  const adminResult = await adminRouteMiddleware(request)
  if (adminResult) return adminResult

  const orgResult = await organizationRouteMiddleware(request)
  if (orgResult) return orgResult

  const apiResult = await apiRouteMiddleware(request)
  if (apiResult) return apiResult

  return null // No middleware applied, continue with request
}

/**
 * Utility function to add user context to request headers
 */
export function addUserContextHeaders(response: NextResponse, user: AuthUser): NextResponse {
  response.headers.set('X-User-ID', user.id)
  response.headers.set('X-User-Role', user.role)
  if (user.organizationId) {
    response.headers.set('X-User-Org-ID', user.organizationId)
  }
  return response
}