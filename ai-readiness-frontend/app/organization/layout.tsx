'use client'

import React from 'react'
import { RoleGuard } from '@/components/admin/role-guard'
import { OrganizationSidebar } from '@/components/organization/sidebar'
import { PERMISSIONS } from '@/lib/auth/rbac'

interface OrganizationLayoutProps {
  children: React.ReactNode
}

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
  return (
    <RoleGuard 
      allowedRoles={['org_admin', 'user']}
      requiredPermission={PERMISSIONS.ORG_VIEW_OWN}
      redirectTo="/dashboard"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-teal-900">
        <div className="flex">
          <OrganizationSidebar />
          <main className="flex-1 ml-64">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}