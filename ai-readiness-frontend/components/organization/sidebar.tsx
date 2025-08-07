'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { cn } from '@/lib/utils'
import { 
  Building2,
  BarChart3, 
  FileText, 
  Users,
  Settings,
  Shield,
  LogOut,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const organizationNavItems = [
  {
    title: 'Overview',
    href: '/organization',
    icon: Building2,
    roles: ['org_admin', 'user']
  },
  {
    title: 'Surveys',
    href: '/organization/surveys',
    icon: FileText,
    roles: ['org_admin', 'user']
  },
  {
    title: 'Analytics',
    href: '/organization/analytics',
    icon: BarChart3,
    roles: ['org_admin', 'user']
  },
  {
    title: 'Members',
    href: '/organization/members',
    icon: Users,
    roles: ['org_admin']
  },
  {
    title: 'Security',
    href: '/organization/security',
    icon: Shield,
    roles: ['org_admin']
  },
  {
    title: 'Settings',
    href: '/organization/settings',
    icon: Settings,
    roles: ['org_admin']
  }
]

export const OrganizationSidebar: React.FC = () => {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const allowedItems = organizationNavItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  )

  return (
    <div className="fixed left-0 top-0 h-screen w-64 glass-card border-r border-white/10">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-purple-400 rounded-lg"></div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-sm" data-testid="org-panel-title">
              Organization
            </span>
            <span className="text-gray-400 text-xs truncate max-w-[150px]">
              {user?.organizationId ? 'Your Organization' : 'No Organization'}
            </span>
          </div>
        </div>

        <nav className="space-y-2">
          {allowedItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/organization' && pathname.startsWith(item.href))
            
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
                data-testid={`org-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
            >
              <Link href="/admin">
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>Logged in as:</p>
            <p className="text-white font-medium truncate">{user?.email}</p>
            <p className="text-teal-400 text-xs capitalize">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-red-500/10"
            data-testid="org-sign-out"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}