'use client'

import React from 'react'
import { RoleGuard } from '@/components/admin/role-guard'
import { AdminSidebar } from '@/components/admin/sidebar'
import { PERMISSIONS } from '@/lib/auth/rbac'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <RoleGuard 
      allowedRoles={['system_admin', 'org_admin']}
      requiredPermission={PERMISSIONS.ADMIN_DASHBOARD}
      requiredRoute="/admin"
      redirectTo="/dashboard"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-teal-900">
        <div className="flex">
          <AdminSidebar />
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