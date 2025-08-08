/**
 * Analytics Performance Tests
 * Tests for dashboard load times, large dataset handling, and memory usage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { performance } from 'perf_hooks'
import {
  getOrganizationAnalytics,
  getPersonalAnalytics,
  exportAnalyticsData
} from '@/lib/services/analytics-service'

// Mock performance monitoring
const performanceMarks: Map<string, number> = new Map()

const mockPerformance = {
  mark: (name: string) => {
    performanceMarks.set(name, Date.now())
  },
  measure: (name: string, startMark: string, endMark?: string) => {
    const start = performanceMarks.get(startMark) || 0
    const end = endMark ? performanceMarks.get(endMark) || Date.now() : Date.now()
    return { duration: end - start, name }
  },
  getEntriesByName: (name: string) => [{ duration: 100 }],
  now: () => Date.now()
}

// Mock Supabase with performance tracking
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }))
  }))
}))

describe('Analytics Performance Tests', () => {
  let memoryBefore: NodeJS.MemoryUsage
  
  beforeEach(() => {
    vi.clearAllMocks()
    performanceMarks.clear()
    memoryBefore = process.memoryUsage()
  })

  afterEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  describe('Dashboard Load Performance', () => {
    it('should load organization analytics within 2 seconds', async () => {
      const startTime = performance.now()
      
      // Mock fast database response
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(10),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      await getOrganizationAnalytics('org-1')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(2000) // Less than 2 seconds
    })

    it('should handle concurrent analytics requests efficiently', async () => {
      const concurrentRequests = 10
      const startTime = performance.now()
      
      // Mock responses for concurrent requests
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(5),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        getOrganizationAnalytics(`org-${i}`)
      )
      
      await Promise.all(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const avgDuration = duration / concurrentRequests
      
      expect(avgDuration).toBeLessThan(500) // Average less than 500ms per request
      expect(duration).toBeLessThan(5000) // Total less than 5 seconds
    })

    it('should load personal analytics quickly', async () => {
      const startTime = performance.now()
      
      // Mock personal analytics data
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockResponses(20),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      await getPersonalAnalytics('user-1', 'org-1')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // Less than 1 second
    })
  })

  describe('Large Dataset Performance', () => {
    it('should handle 10,000 survey responses efficiently', async () => {
      const largeDataset = generateMockResponses(10000)
      const startTime = performance.now()
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('surveys!inner')) {
          return Promise.resolve({ data: largeDataset, error: null })
        } else if (fields.includes('organization_members!inner')) {
          return Promise.resolve({ data: generateMockUsers(1000), error: null })
        } else {
          return Promise.resolve({ data: generateMockSurveys(100), error: null })
        }
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const result = await getOrganizationAnalytics('org-1')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(10000) // Less than 10 seconds for large dataset
      expect(result).toBeDefined()
      expect(result.totalResponses).toBe(10000)
    })

    it('should handle extremely large departments list', async () => {
      const manyDepartments = Array.from({ length: 500 }, (_, i) => ({
        department: `Department ${i}`,
        organization_members: { organization_id: 'org-1' }
      }))
      
      const startTime = performance.now()
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: manyDepartments,
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const { getAvailableDepartments } = await import('@/lib/services/analytics-service')
      const result = await getAvailableDepartments('org-1')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(1000) // Less than 1 second
      expect(result.length).toBe(500)
    })

    it('should efficiently calculate JTBD forces for large datasets', async () => {
      // Generate responses with complex answers for JTBD calculation
      const complexResponses = Array.from({ length: 5000 }, (_, i) => ({
        id: `response-${i}`,
        survey_id: 'survey-1',
        respondent_id: `user-${i}`,
        answers: {
          q1: 'Manual processes are slow and frustrating, need better automation',
          q2: 'Current system is inefficient but we are used to it',
          q3: 'Worried about complexity of new solutions',
          q4: 'Looking for improved efficiency and faster processing',
          rating: Math.floor(Math.random() * 10) + 1
        },
        completion_time: Math.floor(Math.random() * 300) + 60,
        submitted_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        surveys: { id: 'survey-1', organization_id: 'org-1', title: 'Complex Survey' },
        profiles: { department: `Dept${i % 10}`, first_name: 'User', last_name: i.toString() }
      }))

      const startTime = performance.now()
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('surveys!inner')) {
          return Promise.resolve({ data: complexResponses, error: null })
        } else if (fields.includes('organization_members!inner')) {
          return Promise.resolve({ data: generateMockUsers(1000), error: null })
        } else {
          return Promise.resolve({ data: generateMockSurveys(50), error: null })
        }
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const result = await getOrganizationAnalytics('org-1')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(15000) // Less than 15 seconds for complex calculations
      expect(result.jtbdForces).toBeDefined()
      expect(result.jtbdForces.push).toBeGreaterThan(0)
      expect(result.jtbdForces.pull).toBeGreaterThan(0)
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not exceed memory limits for large datasets', async () => {
      const initialMemory = process.memoryUsage()
      
      // Process large dataset
      const largeDataset = generateMockResponses(50000)
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('surveys!inner')) {
          return Promise.resolve({ data: largeDataset, error: null })
        } else if (fields.includes('organization_members!inner')) {
          return Promise.resolve({ data: generateMockUsers(5000), error: null })
        } else {
          return Promise.resolve({ data: generateMockSurveys(500), error: null })
        }
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      await getOrganizationAnalytics('org-1')
      
      // Force garbage collection
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be reasonable (less than 500MB)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024)
    })

    it('should efficiently clean up memory after multiple analytics calls', async () => {
      const initialMemory = process.memoryUsage()
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockResponses(1000),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      // Make multiple analytics calls
      for (let i = 0; i < 20; i++) {
        await getOrganizationAnalytics(`org-${i}`)
        
        // Force GC every few iterations
        if (i % 5 === 0 && global.gc) {
          global.gc()
        }
      }
      
      // Final cleanup
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory should not continuously grow
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024) // Less than 200MB
    })
  })

  describe('Export Performance', () => {
    it('should export large datasets within reasonable time', async () => {
      const startTime = performance.now()
      
      // Mock large analytics data for export
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      const largeDataset = generateMockResponses(10000)
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('surveys!inner')) {
          return Promise.resolve({ data: largeDataset, error: null })
        } else {
          return Promise.resolve({ data: generateMockSurveys(100), error: null })
        }
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const result = await exportAnalyticsData('org-1', 'csv')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(30000) // Less than 30 seconds for large export
      expect(result).toBeInstanceOf(Blob)
      expect(result.size).toBeGreaterThan(0)
    })

    it('should handle JSON export efficiently', async () => {
      const startTime = performance.now()
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockResponses(5000),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const result = await exportAnalyticsData('org-1', 'json')
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(10000) // Less than 10 seconds
      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('application/json')
    })

    it('should limit export file size appropriately', async () => {
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      // Generate extremely large dataset
      const hugeDataset = generateMockResponses(100000)
      mockQuery.select.mockImplementation((fields) => {
        if (fields.includes('surveys!inner')) {
          return Promise.resolve({ data: hugeDataset, error: null })
        } else {
          return Promise.resolve({ data: generateMockSurveys(1000), error: null })
        }
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const result = await exportAnalyticsData('org-1', 'csv')
      
      // File should be created but size should be manageable
      expect(result.size).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
    })
  })

  describe('Query Optimization', () => {
    it('should minimize database queries', async () => {
      const mockSupabase = await import('@/lib/supabase/client')
      const mockFromFn = vi.fn()
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mkReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(10),
        error: null
      })
      
      mockFromFn.mockReturnValue(mockQuery)
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: mockFromFn
      } as any)

      await getOrganizationAnalytics('org-1')
      
      // Should make exactly 3 main queries (surveys, responses, users)
      expect(mockFromFn).toHaveBeenCalledTimes(3)
    })

    it('should use efficient filtering', async () => {
      const filters = {
        dateRange: { start: '2024-01-01', end: '2024-12-31' },
        department: 'Engineering',
        surveyIds: ['survey-1', 'survey-2']
      }
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(5),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      const startTime = performance.now()
      await getOrganizationAnalytics('org-1', filters)
      const endTime = performance.now()
      
      const duration = endTime - startTime
      expect(duration).toBeLessThan(1000) // Filtering should not slow down significantly
      
      // Verify that filters were applied at database level
      expect(mockQuery.gte).toHaveBeenCalled()
      expect(mockQuery.lte).toHaveBeenCalled()
      expect(mockQuery.in).toHaveBeenCalled()
    })
  })

  describe('Real-time Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      // Mock performance API
      Object.defineProperty(global, 'performance', {
        value: mockPerformance,
        writable: true
      })
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mkReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(10),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      mockPerformance.mark('analytics-start')
      await getOrganizationAnalytics('org-1')
      mockPerformance.mark('analytics-end')
      
      const measurement = mockPerformance.measure('analytics-duration', 'analytics-start', 'analytics-end')
      
      expect(measurement.duration).toBeDefined()
      expect(measurement.duration).toBeGreaterThan(0)
    })

    it('should handle performance monitoring errors gracefully', async () => {
      // Simulate performance API not available
      Object.defineProperty(global, 'performance', {
        value: undefined,
        writable: true
      })
      
      const mockSupabase = await import('@/lib/supabase/client')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mkReturnThis()
      }
      
      mockQuery.select.mockResolvedValue({
        data: generateMockSurveys(10),
        error: null
      })
      
      vi.mocked(mockSupabase.createClient).mockReturnValue({
        from: vi.fn(() => mockQuery)
      } as any)

      // Should not throw even without performance API
      await expect(getOrganizationAnalytics('org-1')).resolves.toBeDefined()
    })
  })
})

// Helper functions for generating mock data
function generateMockSurveys(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `survey-${i}`,
    title: `Survey ${i}`,
    created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    organization_id: 'org-1'
  }))
}

function generateMockResponses(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `response-${i}`,
    survey_id: `survey-${i % 10}`,
    respondent_id: `user-${i % 100}`,
    answers: {
      q1: `Answer ${i}`,
      q2: (i % 10) + 1,
      q3: i % 2 === 0 ? 'Manual process' : 'Automated workflow'
    },
    completion_time: Math.floor(Math.random() * 300) + 60,
    submitted_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    surveys: { 
      id: `survey-${i % 10}`, 
      organization_id: 'org-1', 
      title: `Survey ${i % 10}` 
    },
    profiles: { 
      department: `Dept${i % 5}`, 
      first_name: 'User', 
      last_name: i.toString() 
    }
  }))
}

function generateMockUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    department: `Department${i % 10}`,
    organization_members: { organization_id: 'org-1' }
  }))
}