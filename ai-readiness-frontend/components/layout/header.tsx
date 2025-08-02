import * as React from "react"
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
  BarChart3
} from "lucide-react"
import type { User as UserType, UserRole } from "@/lib/types"

interface HeaderProps {
  user?: UserType
  onMenuClick?: () => void
  className?: string
}

const Header = React.forwardRef<HTMLDivElement, HeaderProps>(
  ({ user, onMenuClick, className }, ref) => {
    const getRoleIcon = (role: UserRole) => {
      switch (role) {
        case 'admin':
          return <Shield className="h-4 w-4" />
        case 'org_admin':
          return <BarChart3 className="h-4 w-4" />
        default:
          return <User className="h-4 w-4" />
      }
    }

    const getRoleLabel = (role: UserRole) => {
      switch (role) {
        case 'admin':
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
                  className="md:hidden"
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

            {/* Right side - User menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  3
                </span>
              </Button>

              {/* User menu */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage 
                          src={user.profile?.avatar} 
                          alt={user.email}
                        />
                        <AvatarFallback className="bg-teal-500/10 border border-teal-500/20">
                          {user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent className="w-64" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(user.role)}
                          <span className="text-sm font-medium">
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-none">
                          {user.profile?.firstName} {user.profile?.lastName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                        {user.profile?.department && (
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.profile.department}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem className="text-red-400 focus:text-red-400">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Login button if no user */}
              {!user && (
                <Button variant="default" size="sm">
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