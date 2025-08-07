/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Pagination, SimplePagination, type PaginationState } from '@/components/admin/pagination'

describe('Pagination', () => {
  const defaultPagination: PaginationState = {
    page: 1,
    pageSize: 10,
    total: 100
  }

  const defaultProps = {
    pagination: defaultPagination,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders pagination controls with correct information', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByText('Showing 1-10 of 100 items')).toBeInTheDocument()
      expect(screen.getByText('Items per page:')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    })

    it('renders page numbers correctly', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
    })

    it('highlights current page correctly', () => {
      const paginationOnPage3 = { ...defaultPagination, page: 3 }
      render(<Pagination {...defaultProps} pagination={paginationOnPage3} />)

      const currentPageButton = screen.getByRole('button', { name: '3' })
      expect(currentPageButton).toHaveClass('bg-teal-600', 'text-white', 'border-teal-600')
    })

    it('shows navigation arrows', () => {
      render(<Pagination {...defaultProps} />)

      // Should have first, previous, next, last buttons
      const buttons = screen.getAllByRole('button')
      const navigationButtons = buttons.filter(button => 
        button.querySelector('svg') && !button.textContent?.match(/\d+/)
      )
      expect(navigationButtons).toHaveLength(4)
    })
  })

  describe('Page Size Selection', () => {
    it('renders page size options', async () => {
      const user = userEvent.setup()
      render(<Pagination {...defaultProps} />)

      const pageSizeSelect = screen.getByDisplayValue('10')
      await user.click(pageSizeSelect)

      expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument()
    })

    it('calls onPageSizeChange when page size is changed', async () => {
      const user = userEvent.setup()
      render(<Pagination {...defaultProps} />)

      const pageSizeSelect = screen.getByDisplayValue('10')
      await user.click(pageSizeSelect)
      await user.click(screen.getByRole('option', { name: '25' }))

      expect(defaultProps.onPageSizeChange).toHaveBeenCalledWith(25)
    })
  })

  describe('Page Navigation', () => {
    it('calls onPageChange when page number is clicked', async () => {
      const user = userEvent.setup()
      render(<Pagination {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: '2' }))
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange for first page button', async () => {
      const user = userEvent.setup()
      const paginationOnPage5 = { ...defaultPagination, page: 5 }
      render(<Pagination {...defaultProps} pagination={paginationOnPage5} />)

      const firstPageButton = screen.getAllByRole('button')[0]
      await user.click(firstPageButton)
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(1)
    })

    it('calls onPageChange for last page button', async () => {
      const user = userEvent.setup()
      render(<Pagination {...defaultProps} />)

      const lastPageButton = screen.getAllByRole('button').slice(-1)[0]
      await user.click(lastPageButton)
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(10) // total pages
    })

    it('calls onPageChange for previous page button', async () => {
      const user = userEvent.setup()
      const paginationOnPage3 = { ...defaultPagination, page: 3 }
      render(<Pagination {...defaultProps} pagination={paginationOnPage3} />)

      const prevButton = screen.getAllByRole('button')[1] // Second button should be previous
      await user.click(prevButton)
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
    })

    it('calls onPageChange for next page button', async () => {
      const user = userEvent.setup()
      render(<Pagination {...defaultProps} />)

      const nextButton = screen.getAllByRole('button').slice(-2)[0] // Second to last should be next
      await user.click(nextButton)
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
    })
  })

  describe('Disabled States', () => {
    it('disables previous and first page buttons on first page', () => {
      render(<Pagination {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      const firstPageButton = buttons[0]
      const prevPageButton = buttons[1]

      expect(firstPageButton).toBeDisabled()
      expect(prevPageButton).toBeDisabled()
    })

    it('disables next and last page buttons on last page', () => {
      const lastPagePagination = { ...defaultPagination, page: 10 }
      render(<Pagination {...defaultProps} pagination={lastPagePagination} />)

      const buttons = screen.getAllByRole('button')
      const nextPageButton = buttons[buttons.length - 2]
      const lastPageButton = buttons[buttons.length - 1]

      expect(nextPageButton).toBeDisabled()
      expect(lastPageButton).toBeDisabled()
    })
  })

  describe('Page Number Generation', () => {
    it('shows ellipsis when there are many pages', () => {
      const manyPagesPagination = { ...defaultPagination, total: 1000, page: 50 }
      render(<Pagination {...defaultProps} pagination={manyPagesPagination} />)

      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('shows appropriate page range around current page', () => {
      const middlePagePagination = { ...defaultPagination, total: 200, page: 10 }
      render(<Pagination {...defaultProps} pagination={middlePagePagination} />)

      // Should show pages around current page
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '11' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument()
    })
  })

  describe('Single Page Handling', () => {
    it('renders simplified view for single page', () => {
      const singlePagePagination = { ...defaultPagination, total: 5 }
      render(<Pagination {...defaultProps} pagination={singlePagePagination} />)

      expect(screen.getByText('Showing 5 items')).toBeInTheDocument()
      expect(screen.getByText('Items per page:')).toBeInTheDocument()
      
      // Should not show page navigation buttons
      expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Pagination {...defaultProps} className="custom-pagination" />
      )

      expect(container.firstChild).toHaveClass('custom-pagination')
    })
  })
})

describe('SimplePagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders simple pagination controls', () => {
      render(<SimplePagination {...defaultProps} />)

      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('does not render for single page', () => {
      const singlePageProps = { ...defaultProps, totalPages: 1 }
      const { container } = render(<SimplePagination {...singlePageProps} />)

      expect(container.firstChild).toBeNull()
    })

    it('does not render for zero pages', () => {
      const zeroPageProps = { ...defaultProps, totalPages: 0 }
      const { container } = render(<SimplePagination {...zeroPageProps} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Navigation', () => {
    it('calls onPageChange when previous is clicked', async () => {
      const user = userEvent.setup()
      const middlePageProps = { ...defaultProps, currentPage: 5 }
      render(<SimplePagination {...middlePageProps} />)

      await user.click(screen.getByRole('button', { name: /previous/i }))
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(4)
    })

    it('calls onPageChange when next is clicked', async () => {
      const user = userEvent.setup()
      render(<SimplePagination {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /next/i }))
      expect(defaultProps.onPageChange).toHaveBeenCalledWith(2)
    })
  })

  describe('Disabled States', () => {
    it('disables previous button on first page', () => {
      render(<SimplePagination {...defaultProps} />)

      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    })

    it('disables next button on last page', () => {
      const lastPageProps = { ...defaultProps, currentPage: 10 }
      render(<SimplePagination {...lastPageProps} />)

      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })

    it('enables both buttons on middle pages', () => {
      const middlePageProps = { ...defaultProps, currentPage: 5 }
      render(<SimplePagination {...middlePageProps} />)

      expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled()
      expect(screen.getByRole('button', { name: /next/i })).toBeEnabled()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SimplePagination {...defaultProps} className="custom-simple-pagination" />
      )

      expect(container.firstChild).toHaveClass('custom-simple-pagination')
    })
  })
})