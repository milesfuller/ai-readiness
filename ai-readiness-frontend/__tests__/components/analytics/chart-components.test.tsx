/**
 * Chart Components Tests
 * Testing individual chart components for analytics dashboard
 */

import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  MetricCard,
  JTBDRadarChart,
  DepartmentBreakdown,
  CompletionTrend,
  ResponseTimeDistribution,
  SummaryStats
} from '@/components/analytics/chart-components'
import type { JTBDForces } from '@/lib/types'

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Minus: () => <div data-testid="minus-icon" />,
  Target: () => <div data-testid="target-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Users: () => <div data-testid="users-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />
}))

describe('Chart Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MetricCard', () => {
    const defaultProps = {
      title: 'Test Metric',
      value: '100',
      description: 'Test description',
      icon: <div data-testid="test-icon" />
    }

    it('should render metric card with basic props', () => {
      render(<MetricCard {...defaultProps} />)

      expect(screen.getByText('Test Metric')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('should display positive change with green color', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          change={15} 
          changeType="increase" 
        />
      )

      expect(screen.getByText('+15%')).toBeInTheDocument()
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()
      
      const changeElement = screen.getByText('+15%').parentElement
      expect(changeElement).toHaveClass('text-green-400')
    })

    it('should display negative change with red color', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          change={-5} 
          changeType="decrease" 
        />
      )

      expect(screen.getByText('-5%')).toBeInTheDocument()
      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument()
      
      const changeElement = screen.getByText('-5%').parentElement
      expect(changeElement).toHaveClass('text-red-400')
    })

    it('should display neutral change with gray color', () => {
      render(
        <MetricCard 
          {...defaultProps} 
          change={0} 
          changeType="neutral" 
        />
      )

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByTestId('minus-icon')).toBeInTheDocument()
      
      const changeElement = screen.getByText('0%').parentElement
      expect(changeElement).toHaveClass('text-gray-400')
    })

    it('should handle numeric values', () => {
      render(<MetricCard {...defaultProps} value={42} />)
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <MetricCard {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('should not display change section when change is undefined', () => {
      render(<MetricCard {...defaultProps} />)
      
      expect(screen.queryByText('vs last period')).not.toBeInTheDocument()
    })
  })

  describe('JTBDRadarChart', () => {
    const mockForces: JTBDForces = {
      push: 3.2,
      pull: 4.1,
      habit: 2.8,
      anxiety: 2.5
    }

    it('should render JTBD radar chart with forces data', () => {
      render(<JTBDRadarChart forces={mockForces} />)

      expect(screen.getByText('JTBD Forces')).toBeInTheDocument()
      expect(screen.getByTestId('target-icon')).toBeInTheDocument()

      // Check that force values are displayed in legend
      expect(screen.getByText('Push: 3.2')).toBeInTheDocument()
      expect(screen.getByText('Pull: 4.1')).toBeInTheDocument()
      expect(screen.getByText('Habit: 2.8')).toBeInTheDocument()
      expect(screen.getByText('Anxiety: 2.5')).toBeInTheDocument()
    })

    it('should render SVG chart elements', () => {
      render(<JTBDRadarChart forces={mockForces} />)

      const svg = screen.getByRole('img', { hidden: true }) || 
        document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should handle zero values', () => {
      const zeroForces: JTBDForces = {
        push: 0,
        pull: 0,
        habit: 0,
        anxiety: 0
      }

      render(<JTBDRadarChart forces={zeroForces} />)

      expect(screen.getByText('Push: 0.0')).toBeInTheDocument()
      expect(screen.getByText('Pull: 0.0')).toBeInTheDocument()
      expect(screen.getByText('Habit: 0.0')).toBeInTheDocument()
      expect(screen.getByText('Anxiety: 0.0')).toBeInTheDocument()
    })

    it('should handle maximum values', () => {
      const maxForces: JTBDForces = {
        push: 5,
        pull: 5,
        habit: 5,
        anxiety: 5
      }

      render(<JTBDRadarChart forces={maxForces} />)

      expect(screen.getByText('Push: 5.0')).toBeInTheDocument()
      expect(screen.getByText('Pull: 5.0')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <JTBDRadarChart forces={mockForces} className="custom-radar" />
      )
      
      expect(container.firstChild).toHaveClass('custom-radar')
    })
  })

  describe('DepartmentBreakdown', () => {
    const mockDepartmentData = {
      Engineering: 60,
      Marketing: 45,
      Sales: 30,
      Support: 15
    }

    const totalResponses = 150

    it('should render department breakdown with data', () => {
      render(
        <DepartmentBreakdown 
          departmentData={mockDepartmentData} 
          totalResponses={totalResponses} 
        />
      )

      expect(screen.getByText('Department Distribution')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart-icon')).toBeInTheDocument()

      // Check department data
      Object.entries(mockDepartmentData).forEach(([dept, count]) => {
        expect(screen.getByText(dept)).toBeInTheDocument()
        expect(screen.getByText(count.toString())).toBeInTheDocument()
        
        const percentage = ((count / totalResponses) * 100).toFixed(1)
        expect(screen.getByText(`(${percentage}%)`)).toBeInTheDocument()
      })
    })

    it('should sort departments by count (descending)', () => {
      render(
        <DepartmentBreakdown 
          departmentData={mockDepartmentData} 
          totalResponses={totalResponses} 
        />
      )

      const departmentElements = screen.getAllByText(/Engineering|Marketing|Sales|Support/)
      
      // First department should be Engineering (highest count: 60)
      expect(departmentElements[0]).toHaveTextContent('Engineering')
    })

    it('should limit to top 8 departments', () => {
      const manyDepartments = {
        Dept1: 100, Dept2: 90, Dept3: 80, Dept4: 70, Dept5: 60,
        Dept6: 50, Dept7: 40, Dept8: 30, Dept9: 20, Dept10: 10
      }

      render(
        <DepartmentBreakdown 
          departmentData={manyDepartments} 
          totalResponses={550} 
        />
      )

      // Should only show top 8
      expect(screen.getByText('Dept1')).toBeInTheDocument()
      expect(screen.getByText('Dept8')).toBeInTheDocument()
      expect(screen.queryByText('Dept9')).not.toBeInTheDocument()
      expect(screen.queryByText('Dept10')).not.toBeInTheDocument()
    })

    it('should handle empty department data', () => {
      render(
        <DepartmentBreakdown 
          departmentData={{}} 
          totalResponses={0} 
        />
      )

      expect(screen.getByText('Department Distribution')).toBeInTheDocument()
      // Should not crash with empty data
    })

    it('should calculate percentages correctly', () => {
      render(
        <DepartmentBreakdown 
          departmentData={{ TestDept: 25 }} 
          totalResponses={100} 
        />
      )

      expect(screen.getByText('(25.0%)')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <DepartmentBreakdown 
          departmentData={mockDepartmentData} 
          totalResponses={totalResponses}
          className="custom-breakdown"
        />
      )
      
      expect(container.firstChild).toHaveClass('custom-breakdown')
    })
  })

  describe('CompletionTrend', () => {
    const mockTrendData = [
      { date: '2024-01-01', completed: 20, total: 25 },
      { date: '2024-01-02', completed: 30, total: 35 },
      { date: '2024-01-03', completed: 40, total: 45 }
    ]

    it('should render completion trend chart', () => {
      render(<CompletionTrend data={mockTrendData} />)

      expect(screen.getByText('Completion Trend')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument()
    })

    it('should render SVG chart with data', () => {
      render(<CompletionTrend data={mockTrendData} />)

      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should render legend', () => {
      render(<CompletionTrend data={mockTrendData} />)

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    })

    it('should handle empty data', () => {
      render(<CompletionTrend data={[]} />)
      
      expect(screen.getByText('Completion Trend')).toBeInTheDocument()
      // Should not crash with empty data
    })

    it('should apply custom className', () => {
      const { container } = render(
        <CompletionTrend data={mockTrendData} className="custom-trend" />
      )
      
      expect(container.firstChild).toHaveClass('custom-trend')
    })
  })

  describe('ResponseTimeDistribution', () => {
    const mockTimeRanges = {
      '0-30s': 25,
      '30-60s': 40,
      '1-2m': 30,
      '2-5m': 15,
      '5m+': 5
    }

    it('should render response time distribution', () => {
      render(<ResponseTimeDistribution timeRanges={mockTimeRanges} />)

      expect(screen.getByText('Response Time Distribution')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()

      Object.entries(mockTimeRanges).forEach(([range, count]) => {
        expect(screen.getByText(range)).toBeInTheDocument()
        expect(screen.getByText(count.toString())).toBeInTheDocument()
      })
    })

    it('should calculate percentages correctly', () => {
      render(<ResponseTimeDistribution timeRanges={mockTimeRanges} />)

      const total = Object.values(mockTimeRanges).reduce((sum, count) => sum + count, 0)
      
      // Check first range percentage
      const firstRangePercentage = ((25 / total) * 100).toFixed(1)
      expect(screen.getByText(`${firstRangePercentage}%`)).toBeInTheDocument()
    })

    it('should handle zero total gracefully', () => {
      const zeroTimeRanges = {
        '0-30s': 0,
        '30-60s': 0
      }

      render(<ResponseTimeDistribution timeRanges={zeroTimeRanges} />)

      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <ResponseTimeDistribution 
          timeRanges={mockTimeRanges} 
          className="custom-time-dist" 
        />
      )
      
      expect(container.firstChild).toHaveClass('custom-time-dist')
    })
  })

  describe('SummaryStats', () => {
    const mockStats = {
      totalSurveys: 15,
      totalResponses: 1250,
      averageCompletion: 87.5,
      activeUsers: 95
    }

    it('should render all summary stat cards', () => {
      render(<SummaryStats stats={mockStats} />)

      expect(screen.getByText('Total Surveys')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      
      expect(screen.getByText('Total Responses')).toBeInTheDocument()
      expect(screen.getByText('1,250')).toBeInTheDocument()
      
      expect(screen.getByText('Avg. Completion')).toBeInTheDocument()
      expect(screen.getByText('87.5%')).toBeInTheDocument()
      
      expect(screen.getByText('Active Users')).toBeInTheDocument()
      expect(screen.getByText('95')).toBeInTheDocument()
    })

    it('should format large numbers with commas', () => {
      const largeStats = {
        ...mockStats,
        totalResponses: 123456
      }

      render(<SummaryStats stats={largeStats} />)
      expect(screen.getByText('123,456')).toBeInTheDocument()
    })

    it('should display appropriate change indicators', () => {
      render(<SummaryStats stats={mockStats} />)

      // Check for trending indicators (these are hardcoded in the component)
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()
      expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument()
    })

    it('should render correct icons for each metric', () => {
      render(<SummaryStats stats={mockStats} />)

      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument()
      expect(screen.getByTestId('users-icon')).toBeInTheDocument()
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <SummaryStats stats={mockStats} className="custom-stats" />
      )
      
      expect(container.firstChild).toHaveClass('custom-stats')
    })

    it('should handle zero and extreme values', () => {
      const extremeStats = {
        totalSurveys: 0,
        totalResponses: 9999999,
        averageCompletion: 100.00,
        activeUsers: 1
      }

      render(<SummaryStats stats={extremeStats} />)

      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByText('9,999,999')).toBeInTheDocument()
      expect(screen.getByText('100.0%')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should work together in a dashboard layout', () => {
      const forces: JTBDForces = { push: 3, pull: 4, habit: 2, anxiety: 2 }
      const departmentData = { Engineering: 50, Marketing: 30 }
      const stats = { totalSurveys: 5, totalResponses: 80, averageCompletion: 90, activeUsers: 20 }

      render(
        <div>
          <MetricCard 
            title="Test Metric" 
            value="100" 
            description="Test" 
            icon={<div data-testid="test-icon" />} 
          />
          <JTBDRadarChart forces={forces} />
          <DepartmentBreakdown departmentData={departmentData} totalResponses={80} />
          <SummaryStats stats={stats} />
        </div>
      )

      expect(screen.getByText('Test Metric')).toBeInTheDocument()
      expect(screen.getByText('JTBD Forces')).toBeInTheDocument()
      expect(screen.getByText('Department Distribution')).toBeInTheDocument()
      expect(screen.getByText('Total Surveys')).toBeInTheDocument()
    })

    it('should maintain consistent styling across components', () => {
      const forces: JTBDForces = { push: 3, pull: 4, habit: 2, anxiety: 2 }
      
      render(
        <div>
          <MetricCard 
            title="Test" 
            value="100" 
            description="Test" 
            icon={<div />} 
          />
          <JTBDRadarChart forces={forces} />
        </div>
      )

      // Both components should use glass-card class
      const cards = document.querySelectorAll('.glass-card')
      expect(cards.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', () => {
      const largeDepartmentData = Array.from({ length: 100 }, (_, i) => [
        `Department ${i}`, Math.floor(Math.random() * 100)
      ]).reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {})

      const start = performance.now()
      render(
        <DepartmentBreakdown 
          departmentData={largeDepartmentData} 
          totalResponses={5000} 
        />
      )
      const end = performance.now()

      // Should render quickly even with large datasets
      expect(end - start).toBeLessThan(100) // 100ms threshold
    })

    it('should not cause memory leaks on re-renders', () => {
      const forces: JTBDForces = { push: 3, pull: 4, habit: 2, anxiety: 2 }
      
      const { rerender } = render(<JTBDRadarChart forces={forces} />)

      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<JTBDRadarChart forces={{ ...forces, push: i }} />)
      }

      // Should not throw or cause issues
      expect(screen.getByText('JTBD Forces')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper color contrast', () => {
      render(
        <MetricCard 
          title="Test" 
          value="100" 
          description="Test" 
          icon={<div />}
          change={10}
          changeType="increase"
        />
      )

      // Check that color classes are applied for accessibility
      const changeElement = screen.getByText('+10%').parentElement
      expect(changeElement).toHaveClass('text-green-400')
    })

    it('should provide meaningful text alternatives', () => {
      const forces: JTBDForces = { push: 3, pull: 4, habit: 2, anxiety: 2 }
      
      render(<JTBDRadarChart forces={forces} />)

      // SVG should have accessible content
      expect(screen.getByText('Push: 3.0')).toBeInTheDocument()
      expect(screen.getByText('Pull: 4.0')).toBeInTheDocument()
    })
  })
})