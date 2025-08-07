/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AdminSidebar } from '@/components/admin/sidebar'

// Mock Next.js router
const mockPush = vi.fn()
const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock the auth context with different user roles
const createMockAuth = (role: string) => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    role,
    organizationId: 'org-1'
  },
  signOut: vi.fn()
})

vi.mock('@/lib/auth/context', () => ({
  useAuth: vi.fn()
}))

import { useAuth } from '@/lib/auth/context'

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/admin')
  })

  describe('System Admin Role', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('system_admin'))
    })

    it('renders admin panel title and user info', () => {
      render(<AdminSidebar />)

      expect(screen.getByTestId('admin-panel-title')).toBeInTheDocument()
      expect(screen.getByText('Admin Panel')).toBeInTheDocument()
      expect(screen.getByText('Logged in as:')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('system_admin')).toBeInTheDocument()
    })

    it('shows all navigation items for system admin', () => {
      render(<AdminSidebar />)

      // System admin should see all menu items
      expect(screen.getByTestId('admin-nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-surveys')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-organizations')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-analytics')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-exports')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-settings')).toBeInTheDocument()
    })

    it('highlights active navigation item correctly', () => {
      mockUsePathname.mockReturnValue('/admin/users')
      render(<AdminSidebar />)

      const usersNavItem = screen.getByTestId('admin-nav-users')
      expect(usersNavItem).toHaveClass('bg-gradient-to-r', 'from-teal-500/20', 'to-purple-500/20')
    })

    it('highlights dashboard as active for root admin path', () => {
      mockUsePathname.mockReturnValue('/admin')
      render(<AdminSidebar />)

      const dashboardNavItem = screen.getByTestId('admin-nav-dashboard')
      expect(dashboardNavItem).toHaveClass('bg-gradient-to-r', 'from-teal-500/20', 'to-purple-500/20')
    })

    it('shows sign out button and handles click', async () => {
      const mockSignOut = vi.fn()
      ;(useAuth as any).mockReturnValue({
        ...createMockAuth('system_admin'),
        signOut: mockSignOut
      })

      const user = userEvent.setup()
      render(<AdminSidebar />)

      const signOutButton = screen.getByTestId('admin-sign-out')
      expect(signOutButton).toBeInTheDocument()

      await user.click(signOutButton)
      expect(mockSignOut).toHaveBeenCalledOnce()
    })
  })

  describe('Organization Admin Role', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('org_admin'))
    })

    it('shows limited navigation items for org admin', () => {
      render(<AdminSidebar />)

      // Org admin should see most items but not system admin only items
      expect(screen.getByTestId('admin-nav-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-surveys')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-users')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-analytics')).toBeInTheDocument()
      expect(screen.getByTestId('admin-nav-exports')).toBeInTheDocument()

      // Should NOT see system admin only items
      expect(screen.queryByTestId('admin-nav-organizations')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-settings')).not.toBeInTheDocument()
    })

    it('displays correct role text for org admin', () => {
      render(<AdminSidebar />)

      expect(screen.getByText('org_admin')).toBeInTheDocument()
    })
  })

  describe('Regular User Role', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('user'))
    })

    it('shows no navigation items for regular user', () => {
      render(<AdminSidebar />)

      // Regular user should not see any admin navigation items
      expect(screen.queryByTestId('admin-nav-dashboard')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-surveys')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-users')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-organizations')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-analytics')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-exports')).not.toBeInTheDocument()
      expect(screen.queryByTestId('admin-nav-settings')).not.toBeInTheDocument()
    })

    it('still shows admin panel title and sign out for consistency', () => {
      render(<AdminSidebar />)

      expect(screen.getByTestId('admin-panel-title')).toBeInTheDocument()
      expect(screen.getByTestId('admin-sign-out')).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('system_admin'))
    })

    it('has correct href attributes for all navigation links', () => {
      render(<AdminSidebar />)

      expect(screen.getByTestId('admin-nav-dashboard')).toHaveAttribute('href', '/admin')
      expect(screen.getByTestId('admin-nav-surveys')).toHaveAttribute('href', '/admin/surveys')
      expect(screen.getByTestId('admin-nav-users')).toHaveAttribute('href', '/admin/users')
      expect(screen.getByTestId('admin-nav-organizations')).toHaveAttribute('href', '/admin/organizations')
      expect(screen.getByTestId('admin-nav-analytics')).toHaveAttribute('href', '/admin/analytics')
      expect(screen.getByTestId('admin-nav-exports')).toHaveAttribute('href', '/admin/exports')
      expect(screen.getByTestId('admin-nav-settings')).toHaveAttribute('href', '/admin/settings')
    })

    it('shows correct icons for each navigation item', () => {
      render(<AdminSidebar />)

      // Each navigation item should have an icon (checking for svg elements)
      const dashboardLink = screen.getByTestId('admin-nav-dashboard')
      expect(dashboardLink.querySelector('svg')).toBeInTheDocument()

      const surveysLink = screen.getByTestId('admin-nav-surveys')
      expect(surveysLink.querySelector('svg')).toBeInTheDocument()

      const usersLink = screen.getByTestId('admin-nav-users')
      expect(usersLink.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Active State Handling', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('system_admin'))
    })

    it('correctly handles nested paths for active state', () => {
      mockUsePathname.mockReturnValue('/admin/surveys/123')
      render(<AdminSidebar />)

      const surveysNavItem = screen.getByTestId('admin-nav-surveys')
      expect(surveysNavItem).toHaveClass('bg-gradient-to-r', 'from-teal-500/20', 'to-purple-500/20')
    })

    it('does not highlight dashboard for non-dashboard nested paths', () => {
      mockUsePathname.mockReturnValue('/admin/surveys')
      render(<AdminSidebar />)

      const dashboardNavItem = screen.getByTestId('admin-nav-dashboard')
      expect(dashboardNavItem).not.toHaveClass('bg-gradient-to-r')
    })
  })

  describe('Responsive Design Classes', () => {
    beforeEach(() => {
      ;(useAuth as any).mockReturnValue(createMockAuth('system_admin'))
    })

    it('has proper responsive classes for sidebar positioning', () => {
      render(<AdminSidebar />)

      const sidebarElement = screen.getByTestId('admin-panel-title').closest('.fixed')
      expect(sidebarElement).toHaveClass('fixed', 'left-0', 'top-0', 'h-screen', 'w-64')
    })

    it('has proper styling classes for navigation items', () => {
      render(<AdminSidebar />)

      const navItem = screen.getByTestId('admin-nav-dashboard')
      expect(navItem).toHaveClass('flex', 'items-center', 'space-x-3', 'px-3', 'py-2', 'rounded-lg', 'transition-all', 'duration-200')
    })
  })
})