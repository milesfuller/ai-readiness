'use client'

import React from 'react'
import { useAuth } from '@/lib/auth/context'
import { UserRole } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  fallback 
}) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-teal-400 mx-auto mb-4" />
            <CardTitle className="text-white">Access Required</CardTitle>
            <CardDescription>Please log in to access this area</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this area. Required role: {allowedRoles.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 text-center">
              Your current role: <span className="text-teal-400 font-medium">{user.role}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}