/**
 * @jest-environment node
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the Supabase client using hoisted function
const mockSupabase = vi.hoisted(() => {
  const mock = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn()
  }
  
  // Set up chainable methods
  mock.from.mockReturnValue(mock)
  mock.select.mockReturnValue(mock)
  mock.eq.mockReturnValue(mock)
  mock.in.mockReturnValue(mock)
  mock.gte.mockReturnValue(mock)
  mock.lte.mockReturnValue(mock)
  mock.or.mockReturnValue(mock)
  mock.order.mockReturnValue(mock)
  mock.range.mockReturnValue(mock)
  mock.limit.mockReturnValue(mock)
  mock.insert.mockReturnValue(mock)
  mock.update.mockReturnValue(mock)
  mock.delete.mockReturnValue(mock)
  
  return mock
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import {
  fetchDashboardStats,
  fetchSurveys,
  fetchUsers,
  fetchOrganizations,
  createSurvey,
  updateSurvey,
  deleteSurvey
} from '@/lib/services/admin'

describe('Admin Services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchDashboardStats', () => {
    const mockSurveys = [
      { id: 'survey-1', status: 'active', created_at: '2024-01-01T00:00:00Z' },
      { id: 'survey-2', status: 'draft', created_at: '2024-01-02T00:00:00Z' }
    ]

    const mockResponses = [
      { id: 'resp-1', survey_id: 'survey-1', submitted_at: '2024-01-01T00:00:00Z' },
      { id: 'resp-2', survey_id: 'survey-1', submitted_at: null }
    ]

    const mockUsers = [
      { id: 'user-1', organization_members: { organization_id: 'org-1', role: 'user' } },
      { id: 'user-2', organization_members: { organization_id: 'org-1', role: 'org_admin' } }
    ]

    const mockActivities = [
      {
        id: 'activity-1',
        action: 'survey.created',
        created_at: '2024-01-01T10:00:00Z',
        user_id: 'user-1',
        profiles: { first_name: 'John', last_name: 'Doe', email: 'john@test.com' }
      }
    ]

    // beforeEach setup is handled by the global beforeEach

    it('fetches dashboard stats for system admin', async () => {
      // Mock successful responses
      mockSupabase.single.mockResolvedValueOnce({ data: mockSurveys, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockResponses, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockUsers, error: null })
      mockSupabase.single.mockResolvedValueOnce({ count: 3, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockActivities, error: null })

      const result = await fetchDashboardStats('system_admin')

      expect(result).toEqual({
        totalSurveys: 2,
        activeSurveys: 1,
        totalResponses: 2,
        totalUsers: 2,
        organizationCount: 3,
        completionRate: 50,
        recentActivity: expect.arrayContaining([
          expect.objectContaining({
            id: 'activity-1',
            type: 'survey_created',
            description: 'New survey created',
            user: 'John Doe'
          })
        ])
      })
    })

    it('fetches dashboard stats for org admin with organization filter', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockSurveys, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockResponses, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockUsers, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: mockActivities, error: null })

      await fetchDashboardStats('org_admin', 'org-1')

      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    })

    it('handles errors gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database error'))

      await expect(fetchDashboardStats('system_admin')).rejects.toThrow('Database error')
    })

    it('calculates completion rate correctly', async () => {
      const mockResponsesWithCompletion = [
        { id: 'resp-1', submitted_at: '2024-01-01T00:00:00Z' },
        { id: 'resp-2', submitted_at: '2024-01-02T00:00:00Z' },
        { id: 'resp-3', submitted_at: null },
        { id: 'resp-4', submitted_at: null }
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockSurveys, error: null })
        .mockResolvedValueOnce({ data: mockResponsesWithCompletion, error: null })
        .mockResolvedValueOnce({ data: mockUsers, error: null })
        .mockResolvedValueOnce({ count: 3, error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const result = await fetchDashboardStats('system_admin')

      expect(result.completionRate).toBe(50) // 2 completed out of 4 total
    })
  })

  describe('fetchSurveys', () => {
    const mockSurveysData = [
      {
        id: 'survey-1',
        title: 'Test Survey',
        description: 'Test Description',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        questions: [{ id: 'q1', text: 'Question 1' }],
        created_by: 'user-1',
        organization_id: 'org-1',
        profiles: { first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
        survey_responses: [
          { id: 'resp-1', submitted_at: '2024-01-01T00:00:00Z' }
        ]
      }
    ]

    // Chaining mocks are set up globally

    it('fetches surveys with filters and pagination', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ count: 10, error: null })
        .mockResolvedValueOnce({ data: mockSurveysData, error: null })

      const filters = {
        search: 'test',
        status: 'active',
        dateRange: {
          start: '2024-01-01',
          end: '2024-01-31'
        }
      }

      const pagination = { page: 1, pageSize: 10 }

      const result = await fetchSurveys('system_admin', 'org-1', filters, pagination)

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'survey-1',
            title: 'Test Survey',
            status: 'active',
            createdBy: 'John Doe',
            metadata: expect.objectContaining({
              totalQuestions: 1,
              completionRate: 100
            })
          })
        ]),
        total: 10,
        page: 1,
        pageSize: 10,
        totalPages: 1
      })

      expect(mockSupabase.or).toHaveBeenCalledWith('title.ilike.%test%,description.ilike.%test%')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
      expect(mockSupabase.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
      expect(mockSupabase.lte).toHaveBeenCalledWith('created_at', '2024-01-31')
    })

    it('applies organization filter for org admin', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ count: 5, error: null })
        .mockResolvedValueOnce({ data: mockSurveysData, error: null })

      await fetchSurveys('org_admin', 'org-1', {})

      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    })

    it('handles empty results', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ count: 0, error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const result = await fetchSurveys('system_admin')

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('fetchUsers', () => {
    const mockUsersData = [
      {
        id: 'profile-1',
        user_id: 'user-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@test.com',
        department: 'Engineering',
        job_title: 'Developer',
        preferences: { theme: 'dark' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        organization_members: {
          organization_id: 'org-1',
          role: 'user',
          joined_at: '2024-01-01T00:00:00Z'
        }
      }
    ]

    // Chaining mocks are set up globally

    it('fetches users with filters', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockResolvedValueOnce({ data: mockUsersData, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'user-1', last_sign_in_at: '2024-01-25T10:00:00Z' }], error: null })

      const filters = {
        search: 'john',
        role: 'user',
        department: 'Engineering'
      }

      const result = await fetchUsers('system_admin', 'org-1', filters)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'user-1',
        email: 'john@test.com',
        role: 'user',
        profile: expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          department: 'Engineering'
        })
      })

      expect(mockSupabase.or).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_members.role', 'user')
      expect(mockSupabase.eq).toHaveBeenCalledWith('department', 'Engineering')
    })

    it('fetches last login data from auth.users', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockResolvedValueOnce({ data: mockUsersData, error: null })
        .mockResolvedValueOnce({ data: [{ id: 'user-1', last_sign_in_at: '2024-01-25T10:00:00Z' }], error: null })

      const result = await fetchUsers('system_admin', 'org-1')

      expect(result.data[0].lastLogin).toBe('2024-01-25T10:00:00Z')
    })
  })

  describe('fetchOrganizations', () => {
    const mockOrgsData = [
      {
        id: 'org-1',
        name: 'Test Organization',
        description: 'Test Description',
        industry: 'Technology',
        size: '50-100',
        website: 'https://test.com',
        logo: 'logo.png',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        organization_members: []
      }
    ]

    it('fetches organizations for system admin', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockOrgsData, error: null })

      const result = await fetchOrganizations()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'org-1',
        name: 'Test Organization',
        domain: '',
        settings: expect.objectContaining({
          allowSelfRegistration: true,
          defaultRole: 'user',
          requireEmailVerification: true
        })
      })
    })

    it('applies search filter', async () => {
      mockSupabase.order.mockResolvedValue({ data: mockOrgsData, error: null })

      await fetchOrganizations({ search: 'test' })

      expect(mockSupabase.or).toHaveBeenCalledWith('name.ilike.%test%,description.ilike.%test%')
    })
  })

  describe('createSurvey', () => {
    const mockSurveyData = {
      title: 'New Survey',
      description: 'New Description',
      status: 'draft' as const,
      organizationId: 'org-1'
    }

    it('creates a new survey', async () => {
      const mockCreatedSurvey = {
        id: 'survey-1',
        title: 'New Survey',
        description: 'New Description',
        status: 'draft',
        created_by: 'user-1',
        organization_id: 'org-1',
        questions: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockSupabase.single.mockResolvedValue({ data: mockCreatedSurvey, error: null })

      const result = await createSurvey(mockSurveyData, 'user-1')

      expect(mockSupabase.insert).toHaveBeenCalledWith([{
        title: 'New Survey',
        description: 'New Description',
        questions: [],
        status: 'draft',
        created_by: 'user-1',
        organization_id: 'org-1'
      }])

      expect(result).toMatchObject({
        id: 'survey-1',
        title: 'New Survey',
        status: 'draft',
        createdBy: 'user-1'
      })
    })

    it('handles creation errors', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: new Error('Creation failed') })

      await expect(createSurvey(mockSurveyData, 'user-1')).rejects.toThrow('Creation failed')
    })
  })

  describe('updateSurvey', () => {
    const mockUpdates = {
      title: 'Updated Survey',
      description: 'Updated Description',
      status: 'active' as const
    }

    it('updates a survey', async () => {
      const mockUpdatedSurvey = {
        id: 'survey-1',
        title: 'Updated Survey',
        description: 'Updated Description',
        status: 'active',
        created_by: 'user-1',
        organization_id: 'org-1',
        questions: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      }

      mockSupabase.single.mockResolvedValue({ data: mockUpdatedSurvey, error: null })

      const result = await updateSurvey('survey-1', mockUpdates)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        title: 'Updated Survey',
        description: 'Updated Description',
        questions: undefined,
        status: 'active'
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'survey-1')

      expect(result.title).toBe('Updated Survey')
      expect(result.status).toBe('active')
    })
  })

  describe('deleteSurvey', () => {
    it('deletes a survey', async () => {
      mockSupabase.eq.mockResolvedValue({ error: null })

      await deleteSurvey('survey-1')

      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'survey-1')
    })

    it('handles deletion errors', async () => {
      mockSupabase.eq.mockResolvedValue({ error: new Error('Deletion failed') })

      await expect(deleteSurvey('survey-1')).rejects.toThrow('Deletion failed')
    })
  })

  describe('Error Handling', () => {
    it('logs and rethrows errors consistently', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

      await expect(fetchDashboardStats('system_admin')).rejects.toThrow('Database connection failed')
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching dashboard stats:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Data Transformation', () => {
    it('transforms survey data with proper metadata calculations', async () => {
      const mockSurveyWithResponses = {
        id: 'survey-1',
        title: 'Test Survey',
        description: 'Description',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
        created_by: 'user-1',
        organization_id: 'org-1',
        profiles: { first_name: 'John', last_name: 'Doe', email: 'john@test.com' },
        survey_responses: [
          { id: 'resp-1', submitted_at: '2024-01-01T00:00:00Z' },
          { id: 'resp-2', submitted_at: '2024-01-02T00:00:00Z' },
          { id: 'resp-3', submitted_at: null }
        ]
      }

      mockSupabase.single
        .mockResolvedValueOnce({ count: 1, error: null })
        .mockResolvedValueOnce({ data: [mockSurveyWithResponses], error: null })

      const result = await fetchSurveys('system_admin')

      expect(result.data[0].metadata).toEqual({
        estimatedDuration: 15,
        totalQuestions: 3,
        completionRate: expect.closeTo(66.67, 1), // 2 completed out of 3 total
        averageScore: 0
      })
    })
  })
})