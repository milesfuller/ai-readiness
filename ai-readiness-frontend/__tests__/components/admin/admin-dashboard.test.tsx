/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AdminDashboard from '@/app/admin/page'

// Mock the auth context
const mockAuth = {
  user: {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'system_admin',
    organizationId: 'org-1',
    profile: {
      firstName: 'Admin',
      lastName: 'User'
    }
  },
  signOut: vi.fn()
}

vi.mock('@/lib/auth/context', () => ({
  useAuth: () => mockAuth
}))

// Mock the admin services
const mockDashboardStats = {
  totalSurveys: 5,
  activeSurveys: 2,
  totalResponses: 150,
  totalUsers: 25,
  organizationCount: 3,
  completionRate: 85.5,
  recentActivity: [
    {
      id: '1',
      type: 'survey_created' as const,
      description: 'New survey created',
      timestamp: '2 hours ago',
      user: 'Admin User'
    },
    {
      id: '2', 
      type: 'survey_completed' as const,
      description: 'Survey response submitted',
      timestamp: '3 hours ago',
      user: 'Test User'
    }
  ]
}

vi.mock('@/lib/services/admin', () => ({
  fetchDashboardStats: vi.fn().mockResolvedValue(mockDashboardStats)
}))

// Mock the visual story components
vi.mock('@/components/visual-story', () => ({
  DataVisualization: () => <div data-testid="data-visualization">Analytics Chart</div>,
  ProgressStoryteller: () => <div data-testid="progress-storyteller">Progress Story</div>,
  AchievementSystem: () => <div data-testid="achievement-system">Achievements</div>
}))

// Mock the realtime updates hook
vi.mock('@/lib/hooks/useRealtimeUpdates', () => ({
  useActivityLogsRealtime: vi.fn()
}))

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with basic elements', async () => {
    render(<AdminDashboard />)

    // Check for loading state first
    expect(screen.getByRole('status', { name: /loading/i }) || screen.getByTestId('loading')).toBeDefined()

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check for welcome message
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByText(/admin user|admin@test.com/i)).toBeInTheDocument()

    // Check for admin role badge
    expect(screen.getByText(/system admin/i)).toBeInTheDocument()
  })

  it('displays statistics cards correctly', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check for stat cards
    expect(screen.getByText('Total Surveys')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()

    expect(screen.getByText('Active Surveys')).toBeInTheDocument()  
    expect(screen.getByText('2')).toBeInTheDocument()

    expect(screen.getByText('Total Responses')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()

    expect(screen.getByText('Organizations')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    expect(screen.getByText('85.5%')).toBeInTheDocument()
  })

  it('shows quick actions section', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check for quick actions
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create survey/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /export data/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage users/i })).toBeInTheDocument()
  })

  it('displays visual storytelling section with tabs', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check for AI Readiness Insights section
    expect(screen.getByText('AI Readiness Insights')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view full demo/i })).toBeInTheDocument()

    // Check for tabs
    expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /progress/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /achievements/i })).toBeInTheDocument()

    // Check default active tab content
    expect(screen.getByTestId('data-visualization')).toBeInTheDocument()
  })

  it('allows switching between visual storytelling tabs', async () => {
    const user = userEvent.setup()
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Click on Progress tab
    const progressTab = screen.getByRole('tab', { name: /progress/i })
    await user.click(progressTab)

    // Should show progress storyteller
    expect(screen.getByTestId('progress-storyteller')).toBeInTheDocument()

    // Click on Achievements tab
    const achievementsTab = screen.getByRole('tab', { name: /achievements/i })
    await user.click(achievementsTab)

    // Should show achievement system
    expect(screen.getByTestId('achievement-system')).toBeInTheDocument()
  })

  it('displays recent activity section', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check for recent activity section
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getByText('Latest actions across the platform')).toBeInTheDocument()

    // Check for activity items
    expect(screen.getByText('New survey created')).toBeInTheDocument()
    expect(screen.getByText('Survey response submitted')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByText('3 hours ago')).toBeInTheDocument()
  })

  it('handles loading state correctly', () => {
    vi.mock('@/lib/services/admin', () => ({
      fetchDashboardStats: vi.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(mockDashboardStats), 1000))
      )
    }))

    render(<AdminDashboard />)

    // Should show loading spinner
    expect(screen.getByRole('status', { name: /loading/i }) || screen.getByTestId('loading')).toBeDefined()
  })

  it('handles error state correctly', async () => {
    vi.mock('@/lib/services/admin', () => ({
      fetchDashboardStats: vi.fn().mockRejectedValue(new Error('Failed to load dashboard'))
    }))

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Dashboard')).toBeInTheDocument()
    })

    expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows different content for org admin vs system admin', async () => {
    // Create org admin auth object
    const orgAdminAuth = {
      ...mockAuth,
      user: {
        ...mockAuth.user,
        role: 'org_admin'
      }
    }

    // Temporarily replace the auth mock for this test
    vi.doMock('@/lib/auth/context', () => ({
      useAuth: () => orgAdminAuth
    }))

    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Should show org admin badge instead of system admin
    expect(screen.getByText(/organization admin/i)).toBeInTheDocument()
    expect(screen.queryByText(/system admin/i)).not.toBeInTheDocument()
  })

  it('stat cards have proper links and navigation', async () => {
    render(<AdminDashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
    })

    // Check that stat cards have proper href attributes for navigation
    const totalSurveysCard = screen.getByText('Total Surveys').closest('a')
    expect(totalSurveysCard).toHaveAttribute('href', '/admin/surveys')

    const totalUsersCard = screen.getByText('Total Users').closest('a')
    expect(totalUsersCard).toHaveAttribute('href', '/admin/users')
  })
})