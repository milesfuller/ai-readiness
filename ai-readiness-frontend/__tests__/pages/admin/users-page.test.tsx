/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import UsersPage from '@/app/admin/users/page'

// Mock the auth context
const mockAuth = {
  user: {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'system_admin',
    organizationId: 'org-1'
  }
}

vi.mock('@/lib/auth/context', () => ({
  useAuth: () => mockAuth
}))

// Mock the admin services
const mockUsers = {
  data: [
    {
      id: 'user-1',
      email: 'john.doe@company.com',
      role: 'user',
      organizationId: 'org-1',
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        department: 'Engineering',
        jobTitle: 'Senior Developer',
        preferences: {
          theme: 'dark',
          notifications: true,
          voiceInput: false,
          language: 'en'
        }
      },
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      lastLogin: '2024-01-25T10:15:00Z'
    },
    {
      id: 'user-2',
      email: 'jane.smith@company.com',
      role: 'org_admin',
      organizationId: 'org-1',
      profile: {
        id: 'profile-2',
        userId: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        department: 'Marketing',
        jobTitle: 'Marketing Manager',
        preferences: {
          theme: 'light',
          notifications: true,
          voiceInput: true,
          language: 'en'
        }
      },
      createdAt: '2024-01-02T14:30:00Z',
      updatedAt: '2024-01-02T14:30:00Z',
      lastLogin: '2024-01-24T16:30:00Z'
    },
    {
      id: 'user-3',
      email: 'bob.wilson@company.com',
      role: 'user',
      organizationId: 'org-1',
      profile: {
        id: 'profile-3',
        userId: 'user-3',
        firstName: 'Bob',
        lastName: 'Wilson',
        department: 'Sales',
        jobTitle: 'Sales Representative',
        preferences: {
          theme: 'dark',
          notifications: false,
          voiceInput: false,
          language: 'en'
        }
      },
      createdAt: '2024-01-03T09:00:00Z',
      updatedAt: '2024-01-03T09:00:00Z',
      lastLogin: null
    }
  ],
  total: 3,
  page: 1,
  pageSize: 25,
  totalPages: 1
}

const mockFetchUsers = vi.fn()

vi.mock('@/lib/services/admin', () => ({
  fetchUsers: mockFetchUsers
}))

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchUsers.mockResolvedValue(mockUsers)
  })

  describe('Basic Rendering', () => {
    it('renders page header and description', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
      })

      expect(screen.getByText('Manage user accounts and permissions')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockFetchUsers.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      render(<UsersPage />)

      expect(screen.getByRole('status', { name: /loading/i }) || screen.getByTestId('loading')).toBeDefined()
    })

    it('shows add user button for system admin', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument()
      })
    })

    it('hides add user button for non-system admin', async () => {
      const orgAdminAuth = {
        user: { ...mockAuth.user, role: 'org_admin' }
      }

      vi.mock('@/lib/auth/context', () => ({
        useAuth: () => orgAdminAuth
      }))

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /add user/i })).not.toBeInTheDocument()
    })
  })

  describe('Statistics Cards', () => {
    it('displays user statistics correctly', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Admins')).toBeInTheDocument()
      })

      // Check for different role counts
      expect(screen.getByText('Org Admins')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
      expect(screen.getByText('Total Users')).toBeInTheDocument()

      // Should show count of 1 system admin (none in mock data, but should show 0 or 1)
      // Should show count of 1 org admin
      // Should show count of 2 regular users
      // Should show total of 3 users
      expect(screen.getByText('1')).toBeInTheDocument() // Org admin count
      expect(screen.getByText('2')).toBeInTheDocument() // User count
      expect(screen.getByText('3')).toBeInTheDocument() // Total count
    })
  })

  describe('Search and Filtering', () => {
    it('renders filter controls', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      })

      expect(screen.getByText('Role')).toBeInTheDocument()
      expect(screen.getByText('Department')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
    })

    it('allows searching users', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'john')

      expect(mockFetchUsers).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.objectContaining({
          search: 'john'
        })
      )
    })

    it('allows filtering by role', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Role')).toBeInTheDocument()
      })

      // Click role dropdown
      const roleDropdown = screen.getByRole('combobox')
      await user.click(roleDropdown)

      // Select admin role
      const adminOption = screen.getByRole('option', { name: 'Admin' })
      await user.click(adminOption)

      expect(mockFetchUsers).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.objectContaining({
          role: 'admin'
        })
      )
    })

    it('allows filtering by department', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Department')).toBeInTheDocument()
      })

      // Department filter should be populated with departments from users
      const departmentDropdown = screen.getAllByRole('combobox')[1] // Second combobox is department
      await user.click(departmentDropdown)

      // Should show departments from the mock data
      expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument()
    })
  })

  describe('Users Table', () => {
    it('displays users in table format', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Department' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Last Login' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    })

    it('displays user information correctly', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Check user names
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

      // Check emails
      expect(screen.getByText('john.doe@company.com')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@company.com')).toBeInTheDocument()
      expect(screen.getByText('bob.wilson@company.com')).toBeInTheDocument()

      // Check departments
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
      expect(screen.getByText('Sales')).toBeInTheDocument()
    })

    it('displays role badges with correct styling', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Org Admin')).toBeInTheDocument()
      })

      // Should show role badges
      const userBadges = screen.getAllByText('User')
      expect(userBadges).toHaveLength(2) // Two regular users

      // Check for role icons (SVG elements)
      const roleIcons = screen.getAllByRole('img', { hidden: true }) || 
        document.querySelectorAll('svg')
      expect(roleIcons.length).toBeGreaterThan(0)
    })

    it('formats last login dates correctly', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Jan 25, 2024')).toBeInTheDocument()
      })

      expect(screen.getByText('Jan 24, 2024')).toBeInTheDocument()
      expect(screen.getByText('Never')).toBeInTheDocument()
    })

    it('displays user avatars with initials', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument() // John Doe initials
      })

      expect(screen.getByText('JS')).toBeInTheDocument() // Jane Smith initials
      expect(screen.getByText('BW')).toBeInTheDocument() // Bob Wilson initials
    })
  })

  describe('User Actions', () => {
    it('shows action dropdown for each user', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Should have dropdown buttons for actions
      const actionButtons = screen.getAllByRole('button', { name: '' }) // More button without text
      expect(actionButtons.length).toBeGreaterThan(0)
    })

    it('shows edit option in dropdown', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Click first action dropdown
      const actionButtons = screen.getAllByRole('button', { name: '' })
      if (actionButtons.length > 0) {
        await user.click(actionButtons[0])

        expect(screen.getByText('Edit User')).toBeInTheDocument()
      }
    })

    it('shows suspend option for system admin', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Click action dropdown for a non-current user
      const actionButtons = screen.getAllByRole('button', { name: '' })
      if (actionButtons.length > 0) {
        await user.click(actionButtons[0])

        // Should show suspend option for system admin
        expect(screen.getByText('Suspend User') || screen.getByText('Suspend')).toBeDefined()
      }
    })

    it('does not show suspend option for current user', async () => {
      // Mock current user as one of the users in the list
      const currentUserAuth = {
        user: { ...mockAuth.user, id: 'user-1' }
      }

      vi.mock('@/lib/auth/context', () => ({
        useAuth: () => currentUserAuth
      }))

      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      // Find the current user's row and action button
      const johnDoeRow = screen.getByText('John Doe').closest('tr')
      const actionButton = johnDoeRow?.querySelector('button')

      if (actionButton) {
        await user.click(actionButton)
        expect(screen.queryByText('Suspend User')).not.toBeInTheDocument()
      }
    })
  })

  describe('Empty State', () => {
    it('shows empty state when no users found', async () => {
      mockFetchUsers.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0
      })

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument()
      })

      expect(screen.getByText('No users are currently registered.')).toBeInTheDocument()
    })

    it('shows filtered empty state', async () => {
      mockFetchUsers.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0
      })

      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      })

      // Add search filter
      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByText('Try adjusting your filters to see more results.')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error state when fetching fails', async () => {
      mockFetchUsers.mockRejectedValue(new Error('Failed to load users'))

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Users')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('allows retry when error occurs', async () => {
      const user = userEvent.setup()
      mockFetchUsers.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockUsers)

      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })
  })

  describe('Role-based Access', () => {
    it('calls fetchUsers with correct parameters for system admin', async () => {
      render(<UsersPage />)

      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalledWith(
          'system_admin',
          'org-1',
          expect.objectContaining({
            search: '',
            role: '',
            department: ''
          })
        )
      })
    })

    it('calls fetchUsers with correct parameters for org admin', async () => {
      const orgAdminAuth = {
        user: { ...mockAuth.user, role: 'org_admin' }
      }

      vi.mock('@/lib/auth/context', () => ({
        useAuth: () => orgAdminAuth
      }))

      render(<UsersPage />)

      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalledWith(
          'org_admin',
          'org-1',
          expect.any(Object)
        )
      })
    })
  })

  describe('Filter Updates', () => {
    it('updates filters when search changes', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.clear(searchInput)
      await user.type(searchInput, 'jane')

      // Should debounce and call with new search
      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalledWith(
          'system_admin',
          'org-1',
          expect.objectContaining({
            search: 'jane'
          })
        )
      })
    })

    it('reloads users when filters change', async () => {
      const user = userEvent.setup()
      render(<UsersPage />)

      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalledTimes(1)
      })

      // Change search filter
      const searchInput = screen.getByPlaceholderText('Search users...')
      await user.type(searchInput, 'test')

      // Should trigger another fetch
      await waitFor(() => {
        expect(mockFetchUsers).toHaveBeenCalledTimes(2)
      })
    })
  })
})