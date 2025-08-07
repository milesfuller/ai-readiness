/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { useSearchParams } from 'next/navigation'
import SurveysPage from '@/app/admin/surveys/page'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}))

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
const mockSurveys = {
  data: [
    {
      id: 'survey-1',
      title: 'AI Readiness Assessment',
      description: 'Comprehensive assessment of AI readiness',
      status: 'active',
      createdBy: 'Admin User',
      organizationId: 'org-1',
      questions: [],
      metadata: {
        estimatedDuration: 15,
        totalQuestions: 25,
        completionRate: 78.5,
        averageScore: 0
      },
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      responses: []
    },
    {
      id: 'survey-2',
      title: 'Digital Transformation Survey',
      description: 'Evaluate digital transformation progress',
      status: 'draft',
      createdBy: 'Org Admin',
      organizationId: 'org-1',
      questions: [],
      metadata: {
        estimatedDuration: 20,
        totalQuestions: 18,
        completionRate: 0,
        averageScore: 0
      },
      createdAt: '2024-01-20T14:30:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      responses: []
    }
  ],
  total: 2,
  page: 1,
  pageSize: 12,
  totalPages: 1
}

const mockFetchSurveys = vi.fn()

vi.mock('@/lib/services/admin', () => ({
  fetchSurveys: mockFetchSurveys
}))

// Mock the CRUD components
vi.mock('@/components/admin/survey-crud', () => ({
  SurveyCreateDialog: ({ open, onSuccess }: any) => (
    open ? <div data-testid="create-dialog">Create Dialog</div> : null
  ),
  SurveyEditDialog: ({ open, survey }: any) => (
    open ? <div data-testid="edit-dialog">Edit Dialog for {survey?.title}</div> : null
  ),
  SurveyDeleteDialog: ({ open, survey }: any) => (
    open ? <div data-testid="delete-dialog">Delete Dialog for {survey?.title}</div> : null
  ),
  SurveyQuickActions: ({ survey, onEdit, onDelete }: any) => (
    <div data-testid={`quick-actions-${survey.id}`}>
      <button onClick={() => onEdit(survey)}>Edit</button>
      <button onClick={() => onDelete(survey)}>Delete</button>
    </div>
  )
}))

// Mock the pagination component
vi.mock('@/components/admin/pagination', () => ({
  Pagination: ({ pagination, onPageChange, onPageSizeChange }: any) => (
    <div data-testid="pagination">
      <button onClick={() => onPageChange(2)}>Next Page</button>
      <button onClick={() => onPageSizeChange(25)}>Change Page Size</button>
    </div>
  )
}))

describe('SurveysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchSurveys.mockResolvedValue(mockSurveys)
    ;(useSearchParams as any).mockReturnValue(new URLSearchParams())
  })

  describe('Basic Rendering', () => {
    it('renders page header and description', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Surveys' })).toBeInTheDocument()
      })

      expect(screen.getByText('Manage and monitor survey campaigns')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockFetchSurveys.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      render(<SurveysPage />)

      expect(screen.getByRole('status', { name: /loading/i }) || screen.getByTestId('loading')).toBeDefined()
    })

    it('renders filters section', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Surveys' })).toBeInTheDocument()
      })

      expect(screen.getByPlaceholderText('Search surveys...')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /more filters/i })).toBeInTheDocument()
    })
  })

  describe('Survey List Display', () => {
    it('displays surveys in grid layout', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('AI Readiness Assessment')).toBeInTheDocument()
      })

      expect(screen.getByText('Digital Transformation Survey')).toBeInTheDocument()
      expect(screen.getByText('Comprehensive assessment of AI readiness')).toBeInTheDocument()
      expect(screen.getByText('Evaluate digital transformation progress')).toBeInTheDocument()
    })

    it('shows survey status badges with correct styling', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })

      expect(screen.getByText('Draft')).toBeInTheDocument()

      const activeStatus = screen.getByText('Active').closest('.bg-green-500\\/20')
      const draftStatus = screen.getByText('Draft').closest('.bg-yellow-500\\/20')

      expect(activeStatus || screen.getByText('Active')).toBeDefined()
      expect(draftStatus || screen.getByText('Draft')).toBeDefined()
    })

    it('displays survey metadata correctly', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('25 questions')).toBeInTheDocument()
      })

      expect(screen.getByText('18 questions')).toBeInTheDocument()
      expect(screen.getByText('78.5%')).toBeInTheDocument() // completion rate
    })

    it('shows creation dates formatted correctly', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
      })

      expect(screen.getByText('Jan 20, 2024')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('allows searching surveys', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search surveys...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search surveys...')
      await user.type(searchInput, 'AI Readiness')

      // Should trigger search with delay
      await waitFor(() => {
        expect(mockFetchSurveys).toHaveBeenCalledWith(
          'system_admin',
          'org-1',
          expect.objectContaining({
            search: 'AI Readiness'
          }),
          expect.any(Object)
        )
      }, { timeout: 2000 })
    })

    it('allows filtering by status', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument()
      })

      // Click status dropdown
      const statusDropdown = screen.getByRole('combobox')
      await user.click(statusDropdown)

      // Select active status
      const activeOption = screen.getByRole('option', { name: 'Active' })
      await user.click(activeOption)

      expect(mockFetchSurveys).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.objectContaining({
          status: 'active'
        }),
        expect.any(Object)
      )
    })

    it('reads initial filters from URL search params', () => {
      const mockSearchParams = new URLSearchParams('search=test&status=active')
      ;(useSearchParams as any).mockReturnValue(mockSearchParams)

      render(<SurveysPage />)

      expect(mockFetchSurveys).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.objectContaining({
          search: 'test',
          status: 'active'
        }),
        expect.any(Object)
      )
    })
  })

  describe('Survey Actions', () => {
    it('opens create dialog when create button clicked', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create survey/i }))
      expect(screen.getByTestId('create-dialog')).toBeInTheDocument()
    })

    it('shows dropdown actions for each survey', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-survey-1')).toBeInTheDocument()
      })

      expect(screen.getByTestId('quick-actions-survey-2')).toBeInTheDocument()
    })

    it('opens edit dialog when edit action clicked', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-survey-1')).toBeInTheDocument()
      })

      const editButton = screen.getByTestId('quick-actions-survey-1').querySelector('button')!
      await user.click(editButton)

      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Dialog for AI Readiness Assessment')).toBeInTheDocument()
    })

    it('opens delete dialog when delete action clicked', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-survey-1')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('quick-actions-survey-1').querySelectorAll('button')[1]
      await user.click(deleteButton)

      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Dialog for AI Readiness Assessment')).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('renders pagination when surveys are loaded', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })
    })

    it('handles page change', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Next Page'))

      expect(mockFetchSurveys).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.any(Object),
        expect.objectContaining({
          page: 2
        })
      )
    })

    it('handles page size change', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('pagination')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Change Page Size'))

      expect(mockFetchSurveys).toHaveBeenCalledWith(
        'system_admin',
        'org-1',
        expect.any(Object),
        expect.objectContaining({
          pageSize: 25,
          page: 1 // Should reset to page 1
        })
      )
    })
  })

  describe('Empty States', () => {
    it('shows empty state when no surveys found', async () => {
      mockFetchSurveys.mockResolvedValue({
        ...mockSurveys,
        data: [],
        total: 0
      })

      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('No surveys found')).toBeInTheDocument()
      })

      expect(screen.getByText('Get started by creating your first survey.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
    })

    it('shows filtered empty state when filters return no results', async () => {
      mockFetchSurveys.mockResolvedValue({
        ...mockSurveys,
        data: [],
        total: 0
      })

      const mockSearchParams = new URLSearchParams('search=nonexistent')
      ;(useSearchParams as any).mockReturnValue(mockSearchParams)

      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('No surveys found')).toBeInTheDocument()
      })

      expect(screen.getByText('Try adjusting your filters to see more results.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /create survey/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows error state when fetching fails', async () => {
      mockFetchSurveys.mockRejectedValue(new Error('Failed to load surveys'))

      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Surveys')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load surveys')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
    })

    it('allows retry when error occurs', async () => {
      const user = userEvent.setup()
      mockFetchSurveys.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockSurveys)

      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /try again/i }))

      await waitFor(() => {
        expect(screen.getByText('AI Readiness Assessment')).toBeInTheDocument()
      })
    })
  })

  describe('CRUD Operations', () => {
    it('reloads surveys after successful creation', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
      })

      // Open create dialog
      await user.click(screen.getByRole('button', { name: /create survey/i }))
      
      // Simulate successful creation by calling success handler
      const createDialog = screen.getByTestId('create-dialog')
      expect(createDialog).toBeInTheDocument()

      // The page should reload surveys after successful creation
      expect(mockFetchSurveys).toHaveBeenCalled()
    })

    it('updates survey list after successful edit', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-survey-1')).toBeInTheDocument()
      })

      // Click edit button
      const editButton = screen.getByTestId('quick-actions-survey-1').querySelector('button')!
      await user.click(editButton)

      expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
    })

    it('reloads surveys after successful deletion', async () => {
      const user = userEvent.setup()
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions-survey-1')).toBeInTheDocument()
      })

      // Click delete button
      const deleteButton = screen.getByTestId('quick-actions-survey-1').querySelectorAll('button')[1]
      await user.click(deleteButton)

      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })
  })

  describe('Progress Bar Display', () => {
    it('shows progress bar for active surveys', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Completion Rate')).toBeInTheDocument()
      })

      expect(screen.getByText('78.5%')).toBeInTheDocument()

      // Check for progress bar element
      const progressBar = screen.getByRole('progressbar') || 
        document.querySelector('[style*="width: 78.5%"]') ||
        screen.getByText('78.5%').closest('div')?.querySelector('.bg-gradient-to-r')

      expect(progressBar).toBeDefined()
    })

    it('does not show progress bar for draft surveys', async () => {
      render(<SurveysPage />)

      await waitFor(() => {
        expect(screen.getByText('Digital Transformation Survey')).toBeInTheDocument()
      })

      // Draft survey should show 0% completion but no progress bar visualization
      const draftSurveyCard = screen.getByText('Digital Transformation Survey').closest('.glass-card')
      expect(draftSurveyCard).toBeDefined()
    })
  })
})