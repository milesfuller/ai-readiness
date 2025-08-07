'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@/lib/supabase/client'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { 
  User, 
  Settings, 
  LogOut, 
  Bell, 
  Menu,
  Brain,
  Shield,
  BarChart3,
  HelpCircle
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import type { User as UserType, UserRole } from "@/lib/types"
import { HelpMenu } from './help-menu'

interface HeaderProps {
  user?: SupabaseUser | UserType
  onMenuClick?: () => void
  className?: string
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ user, onMenuClick, className }, ref) => {
    const router = useRouter()

    const getUserRole = (user?: SupabaseUser | UserType): UserRole => {
      if (!user) return 'user'
      if ('role' in user && user.role) {
        return user.role as UserRole
      }
      return 'user'
    }
    
    const handleLogout = async () => {
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/auth/login')
      } catch (error) {
        console.error('Logout error:', error)
        // Still redirect to login on error
        router.push('/auth/login')
      }
    }
    
    const handleNotifications = () => {
      // For now, just navigate to a notifications page
      // In the future, this could open a dropdown with actual notifications
      router.push('/notifications')
    }
    const getRoleIcon = (role: UserRole) => {
      switch (role) {
        case 'system_admin':
          return <Shield className="h-4 w-4" />
        case 'org_admin':
          return <BarChart3 className="h-4 w-4" />
        default:
          return <User className="h-4 w-4" />
      }
    }

    const getRoleLabel = (role: UserRole) => {
      switch (role) {
        case 'system_admin':
          return 'System Admin'
        case 'org_admin':
          return 'Organization Admin'
        default:
          return 'User'
      }
    }

    return (
      <header 
        ref={ref}
        className={cn(
          "sticky top-0 z-50 w-full border-b border-border/40 glass-card backdrop-blur-xl",
          className
        )}
        data-testid="header"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Logo and menu */}
            <div className="flex items-center space-x-4">
              {onMenuClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuClick}
                  className="md:hidden min-h-[44px] min-w-[44px]"
                  aria-label="Mobile menu"
                  data-testid="mobile-menu-toggle"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Brain className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">AI Readiness</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Assessment Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Help, Notifications & User menu */}
            <div className="flex items-center space-x-4">
              {/* Help Menu */}
              <HelpMenu className="min-h-[44px] min-w-[44px]" />
              
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative min-h-[44px] min-w-[44px]" 
                aria-label="Notifications"
                onClick={handleNotifications}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  3
                </span>
              </Button>

              {/* User menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-[44px] w-[44px] rounded-full" data-testid="user-profile" aria-label="User profile menu">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={(user && 'profile' in user) ? user.profile?.avatar : undefined} 
                          alt={user?.email}
                        />
                        <AvatarFallback className="bg-teal-500/10 border border-teal-500/20">
                          {user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(getUserRole(user))}
                          <span className="text-sm font-medium">
                            {getRoleLabel(getUserRole(user))}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-none">
                          {(user && 'profile' in user) ? `${user.profile?.firstName} ${user.profile?.lastName}` : user?.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        {(user && 'profile' in user && user.profile?.department) && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.profile.department}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Login button if no user */}
              {!user && (
                <Button variant="default" size="sm" className="min-h-[44px] px-4" onClick={() => router.push('/auth/login')}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    )
  }
)
Header.displayName = "Header"

export { Header }