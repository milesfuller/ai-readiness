/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { 
  SurveyCreateDialog, 
  SurveyEditDialog, 
  SurveyDeleteDialog, 
  SurveyQuickActions 
} from '@/components/admin/survey-crud'
import type { Survey } from '@/lib/types'

// Mock the admin service functions
vi.mock('@/lib/services/admin', () => ({
  createSurvey: vi.fn(),
  updateSurvey: vi.fn(),
  deleteSurvey: vi.fn()
}))

describe('SurveyCreateDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    organizationId: 'org-1',
    createdBy: 'user-1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders create dialog with form fields', () => {
    render(<SurveyCreateDialog {...defaultProps} />)

    expect(screen.getByText('Create New Survey')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Initial Status')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create survey/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<SurveyCreateDialog {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /create survey/i })
    expect(submitButton).toBeDisabled()

    // Fill in title
    const titleInput = screen.getByLabelText('Title')
    await user.type(titleInput, 'Test Survey')

    expect(submitButton).toBeEnabled()
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    const mockSurvey: Survey = {
      id: 'survey-1',
      title: 'Test Survey',
      description: 'Test Description',
      status: 'draft',
      createdBy: 'user-1',
      organizationId: 'org-1',
      questions: [],
      metadata: {
        estimatedDuration: 15,
        totalQuestions: 0,
        completionRate: 0,
        averageScore: 0
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      responses: []
    }

    const { createSurvey } = await import('@/lib/services/admin')
    vi.mocked(createSurvey).mockResolvedValue(mockSurvey)

    render(<SurveyCreateDialog {...defaultProps} />)

    // Fill out form
    await user.type(screen.getByLabelText('Title'), 'Test Survey')
    await user.type(screen.getByLabelText('Description'), 'Test Description')
    
    // Select status
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Active' }))

    // Submit
    await user.click(screen.getByRole('button', { name: /create survey/i }))

    await waitFor(() => {
      expect(vi.mocked(createSurvey)).toHaveBeenCalledWith({
        title: 'Test Survey',
        description: 'Test Description',
        status: 'active',
        organizationId: 'org-1'
      }, 'user-1')
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockSurvey)
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('handles creation error', async () => {
    const user = userEvent.setup()
    const { createSurvey } = await import('@/lib/services/admin')
    vi.mocked(createSurvey).mockRejectedValue(new Error('Creation failed'))

    render(<SurveyCreateDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Title'), 'Test Survey')
    await user.click(screen.getByRole('button', { name: /create survey/i }))

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const { createSurvey } = await import('@/lib/services/admin')
    vi.mocked(createSurvey).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<SurveyCreateDialog {...defaultProps} />)

    await user.type(screen.getByLabelText('Title'), 'Test Survey')
    await user.click(screen.getByRole('button', { name: /create survey/i }))

    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
  })
})

describe('SurveyEditDialog', () => {
  const mockSurvey: Survey = {
    id: 'survey-1',
    title: 'Existing Survey',
    description: 'Existing Description',
    status: 'draft',
    createdBy: 'user-1',
    organizationId: 'org-1',
    questions: [],
    metadata: {
      estimatedDuration: 15,
      totalQuestions: 0,
      completionRate: 0,
      averageScore: 0
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    responses: []
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    survey: mockSurvey
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders edit dialog with pre-filled form', () => {
    render(<SurveyEditDialog {...defaultProps} />)

    expect(screen.getByText('Edit Survey')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing Survey')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Existing Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('updates form when survey prop changes', () => {
    const { rerender } = render(<SurveyEditDialog {...defaultProps} />)

    const updatedSurvey = { ...mockSurvey, title: 'Updated Title' }
    rerender(<SurveyEditDialog {...defaultProps} survey={updatedSurvey} />)

    expect(screen.getByDisplayValue('Updated Title')).toBeInTheDocument()
  })

  it('submits update with correct data', async () => {
    const user = userEvent.setup()
    const updatedSurvey = { ...mockSurvey, title: 'Updated Survey' }
    const { updateSurvey } = await import('@/lib/services/admin')
    vi.mocked(updateSurvey).mockResolvedValue(updatedSurvey)

    render(<SurveyEditDialog {...defaultProps} />)

    // Update title
    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Survey')

    // Submit
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(vi.mocked(updateSurvey)).toHaveBeenCalledWith('survey-1', {
        title: 'Updated Survey',
        description: 'Existing Description',
        status: 'draft'
      })
    })

    expect(defaultProps.onSuccess).toHaveBeenCalledWith(updatedSurvey)
  })

  it('handles null survey gracefully', () => {
    render(<SurveyEditDialog {...defaultProps} survey={null} />)

    // Should render empty form
    expect(screen.getByLabelText('Title')).toHaveValue('')
    expect(screen.getByLabelText('Description')).toHaveValue('')
  })

  it('shows all status options for editing', async () => {
    const user = userEvent.setup()
    render(<SurveyEditDialog {...defaultProps} />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Archived' })).toBeInTheDocument()
  })
})

describe('SurveyDeleteDialog', () => {
  const mockSurvey: Survey = {
    id: 'survey-1',
    title: 'Survey to Delete',
    description: 'Description',
    status: 'active',
    createdBy: 'user-1',
    organizationId: 'org-1',
    questions: [],
    metadata: {
      estimatedDuration: 15,
      totalQuestions: 5,
      completionRate: 75,
      averageScore: 0
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    responses: []
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
    survey: mockSurvey
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders delete dialog with survey details', () => {
    render(<SurveyDeleteDialog {...defaultProps} />)

    expect(screen.getByText('Delete Survey')).toBeInTheDocument()
    expect(screen.getByText('Survey to Delete')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete survey/i })).toBeInTheDocument()
  })

  it('shows warning for surveys with responses', () => {
    const surveyWithResponses = {
      ...mockSurvey,
      metadata: { ...mockSurvey.metadata, completionRate: 80 }
    }

    render(<SurveyDeleteDialog {...defaultProps} survey={surveyWithResponses} />)

    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText(/This survey has responses/)).toBeInTheDocument()
  })

  it('shows survey metadata correctly', () => {
    render(<SurveyDeleteDialog {...defaultProps} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // questions
    expect(screen.getByText('75%')).toBeInTheDocument() // completion rate
  })

  it('performs delete operation', async () => {
    const user = userEvent.setup()
    const { deleteSurvey } = await import('@/lib/services/admin')
    vi.mocked(deleteSurvey).mockResolvedValue(undefined)

    render(<SurveyDeleteDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /delete survey/i }))

    await waitFor(() => {
      expect(vi.mocked(deleteSurvey)).toHaveBeenCalledWith('survey-1')
    })

    expect(defaultProps.onSuccess).toHaveBeenCalled()
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('handles delete error', async () => {
    const user = userEvent.setup()
    const { deleteSurvey } = await import('@/lib/services/admin')
    vi.mocked(deleteSurvey).mockRejectedValue(new Error('Delete failed'))

    render(<SurveyDeleteDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /delete survey/i }))

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument()
    })

    expect(defaultProps.onSuccess).not.toHaveBeenCalled()
  })

  it('returns null for null survey', () => {
    const { container } = render(<SurveyDeleteDialog {...defaultProps} survey={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('SurveyQuickActions', () => {
  const mockSurvey: Survey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'Description',
    status: 'draft',
    createdBy: 'user-1',
    organizationId: 'org-1',
    questions: [],
    metadata: {
      estimatedDuration: 15,
      totalQuestions: 0,
      completionRate: 0,
      averageScore: 0
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    responses: []
  }

  const defaultProps = {
    survey: mockSurvey,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders basic action buttons', () => {
    render(<SurveyQuickActions {...defaultProps} />)

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows publish button for draft surveys', () => {
    render(<SurveyQuickActions {...defaultProps} />)

    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument()
  })

  it('shows complete button for active surveys', () => {
    const activeSurvey = { ...mockSurvey, status: 'active' as const }
    render(<SurveyQuickActions {...defaultProps} survey={activeSurvey} />)

    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument()
  })

  it('calls edit handler when edit button clicked', async () => {
    const user = userEvent.setup()
    render(<SurveyQuickActions {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /edit/i }))
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockSurvey)
  })

  it('calls delete handler when delete button clicked', async () => {
    const user = userEvent.setup()
    render(<SurveyQuickActions {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockSurvey)
  })

  it('calls status change handler when publish button clicked', async () => {
    const user = userEvent.setup()
    render(<SurveyQuickActions {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /publish/i }))
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(mockSurvey, 'active')
  })

  it('calls status change handler when complete button clicked', async () => {
    const user = userEvent.setup()
    const activeSurvey = { ...mockSurvey, status: 'active' as const }
    render(<SurveyQuickActions {...defaultProps} survey={activeSurvey} />)

    await user.click(screen.getByRole('button', { name: /complete/i }))
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(activeSurvey, 'completed')
  })

  it('has appropriate styling for different button types', () => {
    render(<SurveyQuickActions {...defaultProps} />)

    const publishButton = screen.getByRole('button', { name: /publish/i })
    expect(publishButton).toHaveClass('bg-green-600', 'hover:bg-green-700')

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toHaveClass('text-red-400', 'hover:text-red-300', 'hover:border-red-400')
  })
})