'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { usePermissions } from '@/lib/hooks/use-permissions'
import { UserRole } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertTriangle, Home, ArrowLeft } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requiredPermission?: string
  requiredRoute?: string
  organizationId?: string
  fallback?: React.ReactNode
  redirectTo?: string
  showNavigation?: boolean
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles,
  requiredPermission,
  requiredRoute,
  organizationId,
  fallback,
  redirectTo,
  showNavigation = true
}) => {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { 
    checkPermission, 
    checkRoute, 
    checkOrganization,
    loading: permissionsLoading 
  } = usePermissions()
  const [hasAccess, setHasAccess] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    if (loading || permissionsLoading || !user) {
      setAccessChecked(false)
      return
    }

    let access = true

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      access = access && allowedRoles.includes(user.role)
    }

    // Check permission-based access
    if (requiredPermission) {
      access = access && checkPermission(requiredPermission)
    }

    // Check route-based access
    if (requiredRoute) {
      access = access && checkRoute(requiredRoute)
    }

    // Check organization access
    if (organizationId) {
      access = access && checkOrganization(organizationId)
    }

    setHasAccess(access)
    setAccessChecked(true)

    // Redirect if access is denied and redirectTo is specified
    if (!access && redirectTo && !loading) {
      router.push(redirectTo)
    }
  }, [
    user, 
    loading, 
    permissionsLoading, 
    allowedRoles, 
    requiredPermission, 
    requiredRoute, 
    organizationId,
    checkPermission,
    checkRoute,
    checkOrganization,
    redirectTo,
    router
  ])

  // Show loading state
  if (loading || permissionsLoading || !accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          <p className="text-sm text-gray-400">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-teal-400 mx-auto mb-4" />
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription>
              Please log in to access this area
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => router.push('/auth/login')}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Access denied
  if (!hasAccess) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this area
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400">
                Your current role: <span className="text-teal-400 font-medium">{user.role}</span>
              </p>
              {allowedRoles && (
                <p className="text-sm text-gray-400 mt-2">
                  Required role: <span className="text-red-400 font-medium">{allowedRoles.join(', ')}</span>
                </p>
              )}
              {requiredPermission && (
                <p className="text-sm text-gray-400 mt-2">
                  Required permission: <span className="text-red-400 font-medium">{requiredPermission}</span>
                </p>
              )}
              {organizationId && !user.organizationId && (
                <p className="text-sm text-red-400 mt-2">
                  Organization membership required
                </p>
              )}
            </div>
            
            {showNavigation && (
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline"
                  onClick={() => router.back()}
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
                <Button 
                  onClick={() => router.push('/dashboard')}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Simple permission-based component wrapper
 */
interface PermissionWrapperProps {
  children: React.ReactNode
  permission: string
  fallback?: React.ReactNode
  hideIfNoAccess?: boolean
}

export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  children,
  permission,
  fallback,
  hideIfNoAccess = false
}) => {
  const { checkPermission, loading } = usePermissions()

  if (loading) {
    return hideIfNoAccess ? null : <div className="animate-pulse h-4 w-24 bg-gray-300 rounded"></div>
  }

  const hasPermission = checkPermission(permission)

  if (!hasPermission) {
    if (hideIfNoAccess) {
      return null
    }
    return fallback || null
  }

  return <>{children}</>
}