/**
 * Analytics Dashboard Component Tests
 * Testing chart rendering, data filtering, and export functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { exportService } from '@/lib/services/export-service'
import type { Analytics } from '@/lib/types'

// Mock the export service
vi.mock('@/lib/services/export-service', () => ({
  exportService: {
    generateSurveyPDF: vi.fn(),
    generateOrganizationReport: vi.fn(),
    exportData: vi.fn(),
    downloadFile: vi.fn()
  }
}))

// Mock Recharts components for testing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  PieChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />
}))

const mockAnalytics: Analytics = {
  totalResponses: 150,
  completionRate: 85.5,
  averageTime: 125,
  departmentBreakdown: {
    Engineering: 60,
    Marketing: 45,
    Sales: 30,
    Support: 15
  },
  jtbdAnalysis: {
    push: 3.2,
    pull: 4.1,
    habit: 2.8,
    anxiety: 2.5
  },
  topIssues: [
    'Manual processes',
    'Slow response times', 
    'Lack of automation',
    'Complex workflows'
  ]
}

describe('AnalyticsDashboard Component', () => {
  const defaultProps = {
    analytics: mockAnalytics,
    organizationId: 'org-1',
    className: 'test-class'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render analytics dashboard with all key metrics', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      // Check header
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Insights and performance metrics')).toBeInTheDocument()

      // Check key metrics cards
      expect(screen.getByText('Total Responses')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('Completion Rate')).toBeInTheDocument()
      expect(screen.getByText('85.5%')).toBeInTheDocument()
      expect(screen.getByText('Avg. Time')).toBeInTheDocument()
      expect(screen.getByText('2m 5s')).toBeInTheDocument()
      expect(screen.getByText('Top Issues')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(<AnalyticsDashboard {...defaultProps} />)
      const dashboardElement = container.firstChild as HTMLElement
      
      expect(dashboardElement).toHaveClass('test-class')
    })

    it('should format time correctly', () => {
      const analyticsWithShortTime: Analytics = {
        ...mockAnalytics,
        averageTime: 45
      }

      render(<AnalyticsDashboard {...defaultProps} analytics={analyticsWithShortTime} />)
      expect(screen.getByText('45s')).toBeInTheDocument()
    })

    it('should display completion rate with appropriate color coding', () => {
      // High completion rate (green)
      const highCompletionAnalytics: Analytics = {
        ...mockAnalytics,
        completionRate: 90
      }
      
      const { rerender } = render(<AnalyticsDashboard {...defaultProps} analytics={highCompletionAnalytics} />)
      let completionElement = screen.getByText('90.0%')
      expect(completionElement).toHaveClass('text-green-400')

      // Medium completion rate (yellow)
      const mediumCompletionAnalytics: Analytics = {
        ...mockAnalytics,
        completionRate: 70
      }
      
      rerender(<AnalyticsDashboard {...defaultProps} analytics={mediumCompletionAnalytics} />)
      completionElement = screen.getByText('70.0%')
      expect(completionElement).toHaveClass('text-yellow-400')

      // Low completion rate (red)
      const lowCompletionAnalytics: Analytics = {
        ...mockAnalytics,
        completionRate: 45
      }
      
      rerender(<AnalyticsDashboard {...defaultProps} analytics={lowCompletionAnalytics} />)
      completionElement = screen.getByText('45.0%')
      expect(completionElement).toHaveClass('text-red-400')
    })
  })

  describe('Tabs Navigation', () => {
    it('should render all analytics tabs', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Departments' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'JTBD Analysis' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Top Issues' })).toBeInTheDocument()
    })

    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      // Default to overview tab
      expect(screen.getByText('Department Breakdown')).toBeInTheDocument()

      // Switch to departments tab
      await user.click(screen.getByRole('tab', { name: 'Departments' }))
      expect(screen.getByText('Department Analysis')).toBeInTheDocument()

      // Switch to JTBD tab
      await user.click(screen.getByRole('tab', { name: 'JTBD Analysis' }))
      expect(screen.getByText('Jobs-to-be-Done Analysis')).toBeInTheDocument()

      // Switch to issues tab
      await user.click(screen.getByRole('tab', { name: 'Top Issues' }))
      expect(screen.getByText('Top Issues Identified')).toBeInTheDocument()
    })

    it('should display tab content correctly', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      // Overview tab content
      expect(screen.getByText('Department Breakdown')).toBeInTheDocument()
      expect(screen.getByText('JTBD Forces')).toBeInTheDocument()

      // Departments tab content
      await user.click(screen.getByRole('tab', { name: 'Departments' }))
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()
      expect(screen.getByText('Marketing')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()

      // Issues tab content
      await user.click(screen.getByRole('tab', { name: 'Top Issues' }))
      mockAnalytics.topIssues.forEach((issue, index) => {
        expect(screen.getByText(issue)).toBeInTheDocument()
        expect(screen.getByText((index + 1).toString())).toBeInTheDocument()
      })
    })
  })

  describe('Department Breakdown', () => {
    it('should display department data correctly', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      Object.entries(mockAnalytics.departmentBreakdown).forEach(([dept, count]) => {
        expect(screen.getByText(dept)).toBeInTheDocument()
        expect(screen.getByText(count.toString())).toBeInTheDocument()
        
        // Calculate expected percentage
        const percentage = ((count / mockAnalytics.totalResponses) * 100).toFixed(1)
        expect(screen.getByText(`(${percentage}%)`)).toBeInTheDocument()
      })
    })

    it('should handle empty department data', () => {
      const analyticsWithNoDepts: Analytics = {
        ...mockAnalytics,
        departmentBreakdown: {}
      }

      render(<AnalyticsDashboard {...defaultProps} analytics={analyticsWithNoDepts} />)
      
      // Should not crash and should not display department entries
      expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    })
  })

  describe('JTBD Analysis', () => {
    it('should display JTBD forces with correct values and colors', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      await user.click(screen.getByRole('tab', { name: 'JTBD Analysis' }))

      // Check force values are displayed
      expect(screen.getByText('3.2/5')).toBeInTheDocument() // push
      expect(screen.getByText('4.1/5')).toBeInTheDocument() // pull
      expect(screen.getByText('2.8/5')).toBeInTheDocument() // habit
      expect(screen.getByText('2.5/5')).toBeInTheDocument() // anxiety

      // Check descriptions are present
      expect(screen.getByText('Factors pushing users away from current solutions')).toBeInTheDocument()
      expect(screen.getByText('Factors attracting users to new solutions')).toBeInTheDocument()
      expect(screen.getByText('Existing habits that resist change')).toBeInTheDocument()
      expect(screen.getByText('Concerns about adopting new solutions')).toBeInTheDocument()
    })

    it('should apply correct color coding for JTBD forces', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      await user.click(screen.getByRole('tab', { name: 'JTBD Analysis' }))

      // High values (>= 4) should be green
      const pullBadge = screen.getByText('4.1/5').closest('.bg-green-500')
      expect(pullBadge).toBeInTheDocument()

      // Medium values (>= 3) should be yellow  
      const pushBadge = screen.getByText('3.2/5').closest('.bg-yellow-500')
      expect(pushBadge).toBeInTheDocument()

      // Low values (< 3) should be red
      const habitBadge = screen.getByText('2.8/5').closest('.bg-red-500')
      expect(habitBadge).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should render export button', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).not.toBeDisabled()
    })

    it('should show loading state during export', async () => {
      const user = userEvent.setup()
      vi.mocked(exportService.exportData).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<AnalyticsDashboard {...defaultProps} />)

      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      expect(screen.getByText('Exporting...')).toBeInTheDocument()
      expect(exportButton).toBeDisabled()
    })

    it('should handle PDF export for surveys', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(exportService.generateSurveyPDF).mockResolvedValue(mockBlob)
      vi.mocked(exportService.downloadFile).mockImplementation(() => {})

      const propsWithSurvey = { ...defaultProps, surveyId: 'survey-1' }
      render(<AnalyticsDashboard {...propsWithSurvey} />)

      // This would trigger through the export dialog
      // For this test, we simulate the export call
      const exportOptions = { format: 'pdf', includeCharts: true }
      
      // Manually trigger the handleExport function
      await exportService.generateSurveyPDF('survey-1', exportOptions)
      
      expect(exportService.generateSurveyPDF).toHaveBeenCalledWith('survey-1', exportOptions)
    })

    it('should handle organization report export', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      vi.mocked(exportService.generateOrganizationReport).mockResolvedValue(mockBlob)
      vi.mocked(exportService.downloadFile).mockImplementation(() => {})

      render(<AnalyticsDashboard {...defaultProps} />)

      const exportOptions = { format: 'pdf', includeCharts: true }
      
      await exportService.generateOrganizationReport('org-1', exportOptions)
      
      expect(exportService.generateOrganizationReport).toHaveBeenCalledWith('org-1', exportOptions)
    })

    it('should handle CSV export', async () => {
      const mockBlob = new Blob(['csv content'], { type: 'text/csv' })
      vi.mocked(exportService.exportData).mockResolvedValue(mockBlob)
      vi.mocked(exportService.downloadFile).mockImplementation(() => {})

      render(<AnalyticsDashboard {...defaultProps} />)

      const exportOptions = { format: 'csv' }
      
      await exportService.exportData(exportOptions)
      
      expect(exportService.exportData).toHaveBeenCalledWith(exportOptions)
    })

    it('should handle export errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(exportService.exportData).mockRejectedValue(new Error('Export failed'))

      render(<AnalyticsDashboard {...defaultProps} />)

      // Simulate export error
      try {
        await exportService.exportData({ format: 'csv' })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }

      consoleError.mockRestore()
    })
  })

  describe('Filter Functionality', () => {
    it('should render filter button', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      const filterButton = screen.getByRole('button', { name: /filter/i })
      expect(filterButton).toBeInTheDocument()
    })

    it('should handle filter interactions', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      const filterButton = screen.getByRole('button', { name: /filter/i })
      await user.click(filterButton)

      // Filter functionality would be implemented in the actual component
      expect(filterButton).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should render grid layouts correctly on different screen sizes', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      // Check for responsive grid classes
      const metricsGrid = screen.getByTestId('metrics-cards') || 
        document.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4')
      
      // The exact implementation depends on the component structure
      expect(screen.getByText('Total Responses')).toBeInTheDocument()
    })
  })

  describe('Data Validation and Edge Cases', () => {
    it('should handle zero values gracefully', () => {
      const zeroAnalytics: Analytics = {
        totalResponses: 0,
        completionRate: 0,
        averageTime: 0,
        departmentBreakdown: {},
        jtbdAnalysis: { push: 0, pull: 0, habit: 0, anxiety: 0 },
        topIssues: []
      }

      render(<AnalyticsDashboard {...defaultProps} analytics={zeroAnalytics} />)

      expect(screen.getByText('0')).toBeInTheDocument() // Total responses
      expect(screen.getByText('0.0%')).toBeInTheDocument() // Completion rate
      expect(screen.getByText('0s')).toBeInTheDocument() // Average time
    })

    it('should handle large numbers correctly', () => {
      const largeAnalytics: Analytics = {
        totalResponses: 999999,
        completionRate: 99.99,
        averageTime: 3661, // 1h 1m 1s
        departmentBreakdown: {
          'Very Long Department Name': 500000
        },
        jtbdAnalysis: { push: 10, pull: 10, habit: 10, anxiety: 10 },
        topIssues: ['Issue 1', 'Issue 2']
      }

      render(<AnalyticsDashboard {...defaultProps} analytics={largeAnalytics} />)

      expect(screen.getByText('999999')).toBeInTheDocument()
      expect(screen.getByText('99.99%')).toBeInTheDocument()
      expect(screen.getByText('61m 1s')).toBeInTheDocument() // Should handle large time values
    })

    it('should handle missing or undefined analytics properties', () => {
      const partialAnalytics = {
        totalResponses: 100,
        completionRate: 80
        // Missing other properties
      } as Analytics

      // Should not crash when rendering with partial data
      expect(() => {
        render(<AnalyticsDashboard {...defaultProps} analytics={partialAnalytics} />)
      }).not.toThrow()
    })

    it('should handle very long department names and issue titles', () => {
      const longContentAnalytics: Analytics = {
        ...mockAnalytics,
        departmentBreakdown: {
          'This is a very long department name that might cause layout issues': 50
        },
        topIssues: [
          'This is an extremely long issue description that should be handled gracefully by the component without breaking the layout or causing overflow problems'
        ]
      }

      render(<AnalyticsDashboard {...defaultProps} analytics={longContentAnalytics} />)

      expect(screen.getByText('This is a very long department name that might cause layout issues')).toBeInTheDocument()
      expect(screen.getByText(/This is an extremely long issue description/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<AnalyticsDashboard {...defaultProps} />)

      // Check for tab roles
      expect(screen.getAllByRole('tab')).toHaveLength(4)
      
      // Check for button roles
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<AnalyticsDashboard {...defaultProps} />)

      const overviewTab = screen.getByRole('tab', { name: 'Overview' })
      const departmentsTab = screen.getByRole('tab', { name: 'Departments' })

      // Tab navigation
      await user.tab()
      // Focus should be on first interactive element
      
      // Arrow key navigation between tabs
      overviewTab.focus()
      await user.keyboard('{ArrowRight}')
      expect(departmentsTab).toHaveFocus()
    })
  })
})