'use client'

import * as React from "react"
import { useRouter } from "next/navigation"
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

    const router = useRouter()
    
    const handleNavigate = (href: string) => {
      router.push(href)
      setMobileMenuOpen(false)
    }

    return (
      <div ref={ref} className={cn("min-h-screen bg-background", className)}>
        {/* Header */}
        <Header
          user={user}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="header"
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
            <div className="fixed inset-0 z-50 md:hidden" data-testid="mobile-menu-overlay">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                data-testid="mobile-menu-backdrop"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border" data-testid="mobile-sidebar" role="navigation">
                <div className="pt-16"> {/* Account for header height */}
                  <Sidebar
                    userRole={userRole}
                    currentPath={currentPath}
                    onItemClick={handleNavigate}
                    data-testid-prefix="mobile-"
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
            <footer className="border-t border-border/40 bg-card/50 py-4 sm:py-6 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
                  <span>© 2024 AI Readiness</span>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-4">
                    <a href="/privacy" className="hover:text-teal-400 transition-colors">
                      Privacy
                    </a>
                    <span>•</span>
                    <a href="/terms" className="hover:text-teal-400 transition-colors">
                      Terms
                    </a>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <span>Powered by Advanced AI</span>
                </div>
              </div>
            </footer>
          </main>
        </div>

        {/* Sidebar Toggle Button for Desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex fixed left-4 bottom-4 z-40 w-[44px] h-[44px] rounded-full bg-teal-500 hover:bg-teal-600 text-white items-center justify-center shadow-lg hover:shadow-xl transition-colors duration-200"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-testid="sidebar-toggle"
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