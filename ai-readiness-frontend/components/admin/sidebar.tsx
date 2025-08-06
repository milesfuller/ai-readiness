'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  BarChart3, 
  Download,
  Settings,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['admin', 'org_admin']
  },
  {
    title: 'Surveys',
    href: '/admin/surveys',
    icon: FileText,
    roles: ['admin', 'org_admin']
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin', 'org_admin']
  },
  {
    title: 'Organizations',
    href: '/admin/organizations',
    icon: Building2,
    roles: ['admin']
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['admin', 'org_admin']
  },
  {
    title: 'Exports',
    href: '/admin/exports',
    icon: Download,
    roles: ['admin', 'org_admin']
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    roles: ['admin']
  }
]

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const allowedItems = adminNavItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  )

  return (
    <div className="fixed left-0 top-0 h-screen w-64 glass-card border-r border-white/10">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-purple-400 rounded-lg"></div>
          <span className="text-white font-bold text-xl" data-testid="admin-panel-title">Admin Panel</span>
        </div>

        <nav className="space-y-2">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200',
                  isActive 
                    ? 'bg-gradient-to-r from-teal-500/20 to-purple-500/20 text-white border border-teal-500/30' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                )}
                data-testid={`admin-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>Logged in as:</p>
            <p className="text-white font-medium">{user?.email}</p>
            <p className="text-teal-400 text-xs capitalize">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-500/10"
            data-testid="admin-sign-out"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}