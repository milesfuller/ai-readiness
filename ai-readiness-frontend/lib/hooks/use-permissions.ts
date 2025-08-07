/**
 * Client-side permission checking hooks
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { UserRole } from '@/lib/types'
import { 
  hasPermission, 
  canAccessRoute, 
  canAccessOrganization,
  canPerformAction,
  ResourceCheck,
  getRolePermissions,
  RoleUtils
} from '@/lib/auth/rbac'

interface PermissionCheckResponse {
  success: boolean
  hasPermission: boolean
  userRole?: UserRole
  userOrgId?: string
  error?: string
  details?: any
}

/**
 * Hook for checking permissions locally (fast, but client-side only)
 */
export function usePermissions() {
  const { user, loading } = useAuth()

  const checkPermission = useCallback((permission: string): boolean => {
    if (loading || !user) return false
    return hasPermission(user.role, permission)
  }, [user, loading])

  const checkRoute = useCallback((route: string): boolean => {
    if (loading || !user) return false
    return canAccessRoute(user.role, route)
  }, [user, loading])

  const checkOrganization = useCallback((orgId: string): boolean => {
    if (loading || !user) return false
    return canAccessOrganization(user.role, user.organizationId, orgId)
  }, [user, loading])

  const checkResource = useCallback((check: ResourceCheck): boolean => {
    if (loading || !user) return false
    return canPerformAction(user.role, user.organizationId, user.id, check)
  }, [user, loading])

  const getUserPermissions = useCallback((): string[] => {
    if (loading || !user) return []
    return getRolePermissions(user.role)
  }, [user, loading])

  return {
    user,
    loading,
    checkPermission,
    checkRoute,
    checkOrganization,
    checkResource,
    getUserPermissions,
    // Convenience methods
    canAccessAdmin: checkPermission('admin:dashboard'),
    canManageUsers: checkPermission('user:edit:org'),
    canExportData: checkPermission('api:export:access'),
    canManageSystem: checkPermission('admin:system:config'),
    isAdmin: user ? RoleUtils.isAdmin(user.role) : false,
    isSystemAdmin: user ? RoleUtils.isSystemAdmin(user.role) : false,
    isOrgAdmin: user ? RoleUtils.isOrgAdmin(user.role) : false
  }
}

/**
 * Hook for server-side permission validation (slower, but authoritative)
 */
export function useServerPermissions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkPermissionServer = useCallback(async (
    type: 'permission' | 'route' | 'organization' | 'resource' | 'user_permissions',
    params: {
      permission?: string
      route?: string
      organizationId?: string
      resourceCheck?: ResourceCheck
    }
  ): Promise<PermissionCheckResponse> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          ...params
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        setError(result.error || 'Permission check failed')
        return {
          success: false,
          hasPermission: false,
          error: result.error
        }
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      return {
        success: false,
        hasPermission: false,
        error: errorMessage
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    checkPermissionServer
  }
}

/**
 * Hook for real-time permission status
 */
export function usePermissionStatus(permission: string) {
  const { checkPermission, user, loading } = usePermissions()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      setHasAccess(checkPermission(permission))
    } else {
      setHasAccess(false)
    }
  }, [permission, checkPermission, user, loading])

  return {
    hasAccess,
    loading,
    user
  }
}

/**
 * Hook for route access checking
 */
export function useRouteAccess(route: string) {
  const { checkRoute, user, loading } = usePermissions()
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      setCanAccess(checkRoute(route))
    } else {
      setCanAccess(false)
    }
  }, [route, checkRoute, user, loading])

  return {
    canAccess,
    loading,
    user
  }
}

/**
 * Hook for organization access checking
 */
export function useOrganizationAccess(organizationId: string | undefined) {
  const { checkOrganization, user, loading } = usePermissions()
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    if (!loading && user && organizationId) {
      setCanAccess(checkOrganization(organizationId))
    } else {
      setCanAccess(false)
    }
  }, [organizationId, checkOrganization, user, loading])

  return {
    canAccess,
    loading,
    user
  }
}

/**
 * Hook that fetches all user permissions from server
 */
export function useUserPermissions() {
  const [permissions, setPermissions] = useState<string[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/auth/check-permission', {
          method: 'GET'
        })

        const result = await response.json()

        if (response.ok && result.success) {
          setPermissions(result.permissions || [])
          setUserInfo(result.user)
          setError(null)
        } else {
          setError(result.error || 'Failed to fetch permissions')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Network error'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [])

  return {
    permissions,
    userInfo,
    loading,
    error,
    refetch: () => {
      setLoading(true)
      setError(null)
      // Re-run the effect
      setPermissions([])
      setUserInfo(null)
    }
  }
}