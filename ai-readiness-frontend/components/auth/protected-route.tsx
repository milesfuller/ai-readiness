'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
  fallback?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  fallback = <div>Loading...</div>
}) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Show loading state
  if (loading) {
    return <>{fallback}</>
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/auth/login')
    return <>{fallback}</>
  }

  // Check role requirements
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    if (!roles.includes(user.role)) {
      // Redirect to dashboard with error message
      router.push('/dashboard?error=unauthorized')
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// HOC for protecting pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole | UserRole[]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}