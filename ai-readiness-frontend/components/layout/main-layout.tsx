import * as React from "react"
import { cn } from "@/lib/utils"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import type { User, UserRole } from "@/lib/types"

interface MainLayoutProps {
  user?: User
  children: React.ReactNode
  currentPath?: string
  className?: string
}

const MainLayout = React.forwardRef<HTMLDivElement, MainLayoutProps>(
  ({ user, children, currentPath, className }, ref) => {
    const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

    const userRole: UserRole = user?.role || 'user'

    const handleNavigate = (href: string) => {
      // In a real app, you'd use your router here
      console.log('Navigate to:', href)
      setMobileMenuOpen(false)
    }

    return (
      <div ref={ref} className={cn("min-h-screen bg-background", className)}>
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex">
            <Sidebar
              userRole={userRole}
              currentPath={currentPath}
              isCollapsed={sidebarCollapsed}
              onItemClick={handleNavigate}
            />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border">
                <div className="pt-16"> {/* Account for header height */}
                  <Sidebar
                    userRole={userRole}
                    currentPath={currentPath}
                    onItemClick={handleNavigate}
                  />
                </div>
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">
            {/* Content Area */}
            <div className="flex-1 p-6">
              {children}
            </div>

            {/* Footer */}
            <footer className="border-t border-border/40 bg-card/50 py-6 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span>© 2024 AI Readiness Assessment Platform</span>
                  <span>•</span>
                  <a href="/privacy" className="hover:text-teal-400 transition-colors">
                    Privacy Policy
                  </a>
                  <span>•</span>
                  <a href="/terms" className="hover:text-teal-400 transition-colors">
                    Terms of Service
                  </a>
                </div>
                <div className="mt-2 sm:mt-0">
                  <span>Powered by Advanced AI Analytics</span>
                </div>
              </div>
            </footer>
          </main>
        </div>

        {/* Sidebar Toggle Button for Desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex fixed left-4 bottom-4 z-40 w-10 h-10 rounded-full bg-teal-500 hover:bg-teal-600 text-white items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg 
            className={cn("w-5 h-5 transition-transform duration-300", sidebarCollapsed && "rotate-180")}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    )
  }
)
MainLayout.displayName = "MainLayout"

export { MainLayout }