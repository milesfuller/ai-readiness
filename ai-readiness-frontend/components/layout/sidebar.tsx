'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  FileText,
  Brain,
  Shield,
  Database,
  Download,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import type { UserRole } from "@/lib/types"

interface NavItem {
  label: string
  href?: string
  icon?: any
  children?: NavItem[]
  badge?: string | number
}

interface SidebarProps {
  userRole: UserRole
  currentPath?: string
  isCollapsed?: boolean
  onItemClick?: (href: string) => void
  className?: string
  'data-testid-prefix'?: string
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ userRole, currentPath, isCollapsed = false, onItemClick, className, 'data-testid-prefix': testIdPrefix = '' }, ref) => {
    const [expandedItems, setExpandedItems] = React.useState<string[]>(['dashboard'])

    const toggleExpanded = (itemLabel: string) => {
      setExpandedItems(prev => 
        prev.includes(itemLabel) 
          ? prev.filter(item => item !== itemLabel)
          : [...prev, itemLabel]
      )
    }

    // Navigation items based on user role
    const getNavItems = (): NavItem[] => {
      const baseItems: NavItem[] = [
        {
          label: 'Dashboard',
          href: '/dashboard',
          icon: Home,
        },
        {
          label: 'Take Survey',
          href: '/survey',
          icon: ClipboardList,
        },
        {
          label: 'My Results',
          href: '/results',
          icon: BarChart3,
        }
      ]

      const orgAdminItems: NavItem[] = [
        ...baseItems,
        {
          label: 'Organization',
          href: '/organization',
          icon: Users,
          children: [
            {
              label: 'Team Surveys',
              href: '/organization/surveys',
              icon: ClipboardList,
            },
            {
              label: 'Analytics',
              href: '/organization/analytics',
              icon: BarChart3,
            },
            {
              label: 'Reports',
              href: '/organization/reports',
              icon: FileText,
            }
          ]
        }
      ]

      const adminItems: NavItem[] = [
        ...baseItems,
        {
          label: 'Administration',
          href: '/admin',
          icon: Shield,
          children: [
            {
              label: 'All Surveys',
              href: '/admin/surveys',
              icon: ClipboardList,
            },
            {
              label: 'Users',
              href: '/admin/users',
              icon: Users,
            },
            {
              label: 'Organizations',
              href: '/admin/organizations',
              icon: Database,
            },
            {
              label: 'System Analytics',
              href: '/admin/analytics',
              icon: BarChart3,
            },
            {
              label: 'Reports',
              href: '/admin/reports',
              icon: FileText,
            },
            {
              label: 'Export Data',
              href: '/admin/export',
              icon: Download,
            }
          ]
        },
        {
          label: 'System',
          href: '/system',
          icon: Settings,
          children: [
            {
              label: 'Configuration',
              href: '/system/config',
              icon: Settings,
            },
            {
              label: 'AI Models',
              href: '/system/ai',
              icon: Brain,
            }
          ]
        }
      ]

      switch (userRole) {
        case 'admin':
          return adminItems
        case 'org_admin':
          return orgAdminItems
        default:
          return baseItems
      }
    }

    const navItems = getNavItems()

    const renderNavItem = (item: NavItem, level: number = 0) => {
      const isActive = currentPath === item.href
      const isExpanded = expandedItems.includes(item.label)
      const hasChildren = item.children && item.children.length > 0
      const Icon = item.icon

      return (
        <div key={item.label}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start font-normal transition-all duration-200",
              level > 0 && !isCollapsed && "pl-8 text-sm",
              isActive && "bg-teal-500/10 text-teal-400 border-l-2 border-teal-500",
              !isCollapsed ? "h-10" : "h-12 p-2 justify-center"
            )}
            data-testid={`${testIdPrefix}nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            role="button"
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.label)
              } else if (onItemClick && item.href) {
                onItemClick(item.href)
              }
            }}
          >
            {Icon && (
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0",
                !isCollapsed && "mr-2",
                isActive && "text-teal-400"
              )} />
            )}
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {hasChildren && (
                  isExpanded ? <ChevronDown className="h-4 w-4" data-testid="chevron-down" /> : <ChevronRight className="h-4 w-4" data-testid="chevron-right" />
                )}
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Button>

          {/* Render children */}
          {hasChildren && isExpanded && !isCollapsed && (
            <div className="ml-2 border-l border-border/40 pl-2 space-y-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col h-full bg-card/50 border-r border-border/40 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64",
          className
        )}
        data-testid="sidebar"
      >
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4" role="navigation">
          {navItems.map(item => renderNavItem(item))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border/40 p-4 space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              isCollapsed ? "h-12 p-2 justify-center" : "h-10"
            )}
            data-testid="nav-item-settings"
            role="button"
            onClick={() => onItemClick?.('/settings')}
          >
            <Settings className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && "Settings"}
          </Button>
        </div>
      </div>
    )
  }
)
Sidebar.displayName = "Sidebar"

export { Sidebar }