/**
 * Mock Factory Functions
 * Centralized factory functions for creating consistent mock objects
 * 
 * Note: Basic factories are also available in test-helpers.ts
 * This file focuses on more complex mock objects and scenarios
 */

import { jest } from '@jest/globals'
import type {
  MockNextRequest,
  MockNextRequestOptions,
  MockUser,
  MockProfile,
  MockSupabaseClient,
  MockSupabaseQueryBuilder,
  MockLLMService,
  MockExportService,
  AuthScenario
} from '../types/mocks'

// Re-export helpers from test-helpers for convenience
export { 
  createMockUser, 
  createMockProfile, 
  createMockNextRequest, 
  createMockNextResponse,
  setupTestEnvironment,
  cleanupTestEnvironment,
  testHelpers
} from './test-helpers'

// ============================================================================
// Advanced Supabase Mock Factories
// ============================================================================

export const createMockQueryResponse = (data: any = null, error: any = null) => ({
  data,
  error,
})

// ============================================================================
// Supabase Mock Factories
// ============================================================================

function createMockQueryBuilder(): MockSupabaseQueryBuilder {
  const mockBuilder: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    slice: jest.fn(),
    single: jest.fn(() => Promise.resolve({ data: null, error: null }))
  }
  // Set up proper chaining for all methods except single
  Object.keys(mockBuilder).forEach(key => {
    if (key !== 'single') {
      mockBuilder[key].mockReturnValue(mockBuilder)
    }
  })
  return mockBuilder
}

// User and Profile factories are now imported from test-helpers.ts

export const createMockSupabaseClient = (): MockSupabaseClient => {
  const mockClient: MockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn((callback: any) => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })) as any,
      admin: {
        createUser: jest.fn(),
        deleteUser: jest.fn(),
        listUsers: jest.fn()
      }
    },
    from: jest.fn((table: string) => createMockQueryBuilder()) as any,
    rpc: jest.fn()
  }

  return mockClient
}

// ============================================================================
// LLM Service Mock Factory
// ============================================================================

export const createMockLLMService = (): MockLLMService => ({
  analyzeSurveyResponse: jest.fn(),
  healthCheck: jest.fn(),
  getConfig: jest.fn(() => ({
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 45000,
    retries: 3,
  }))
})

// ============================================================================
// Export Service Mock Factory
// ============================================================================

export const createMockExportService = (): MockExportService => ({
  exportData: jest.fn(),
  generateSurveyPDF: jest.fn(),
  generateOrganizationReport: jest.fn(),
  getAvailableFormats: jest.fn(() => [
    { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
    { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
    { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
  ])
})

// ============================================================================
// Authentication Scenario Setup
// ============================================================================

export const setupMockAuthScenario = (
  mockSupabase: MockSupabaseClient,
  scenario: AuthScenario
) => {
  jest.clearAllMocks()

  switch (scenario) {
    case 'unauthenticated':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })
      break

    case 'no_profile':
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: createMockUser() },
        error: null
      })
      mockSupabase.from('test').select().eq('id', 'test').single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' }
      })
      break

    case 'authenticated_user':
      const regularUser = createMockUser()
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: regularUser },
        error: null
      })
      mockSupabase.from('test').select().eq('id', 'test').single.mockResolvedValue({
        data: { 
          role: 'user', 
          organization_id: 'org-1',
          ...createMockProfile({ user_id: regularUser.id })
        },
        error: null
      })
      break

    case 'authenticated_org_admin':
      const orgAdmin = createMockUser({ email: 'orgadmin@test.com' })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: orgAdmin },
        error: null
      })
      mockSupabase.from('test').select().eq('id', 'test').single.mockResolvedValue({
        data: { 
          role: 'org_admin', 
          organization_id: 'org-1',
          ...createMockProfile({ user_id: orgAdmin.id })
        },
        error: null
      })
      break

    case 'authenticated_admin':
      const admin = createMockUser({ email: 'admin@test.com' })
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: admin },
        error: null
      })
      mockSupabase.from('test').select().eq('id', 'test').single.mockResolvedValue({
        data: { 
          role: 'admin', 
          organization_id: 'org-1',
          ...createMockProfile({ user_id: admin.id })
        },
        error: null
      })
      break

    default:
      throw new Error(`Unknown auth scenario: ${scenario}`)
  }
}

// ============================================================================
// Global Test Setup Functions
// ============================================================================

export const resetAllMocks = () => {
  jest.clearAllMocks()
  jest.resetAllMocks()
}

export const setupGlobalTestMocks = () => {
  // Setup global mocks that should be available in all tests
  ;(global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })) as any

  ;(global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })) as any

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  ;(global as any).fetch = jest.fn()
}

// ============================================================================
// Mock Data Generators
// ============================================================================

export const generateMockSurveyData = (count = 1) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `survey-${i + 1}`,
    organization_id: 'org-1',
    title: `Test Survey ${i + 1}`,
    description: `Description for survey ${i + 1}`,
    questions: [
      {
        id: `q-${i + 1}-1`,
        text: `Question ${i + 1}.1`,
        type: 'text',
        required: true
      }
    ],
    settings: {},
    status: 'active',
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
}

export const generateMockResponseData = (count = 1) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `response-${i + 1}`,
    survey_id: 'survey-1',
    user_id: 'user-123',
    response_data: {
      'q-1-1': `Response ${i + 1} answer`
    },
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))
}

// ============================================================================
// Type-safe Mock Helpers
// ============================================================================

export const createTypedMock = <T extends Record<string, any>>(): jest.Mocked<T> => {
  return {} as jest.Mocked<T>
}

export const mockImplementation = <T extends (...args: any[]) => any>(
  fn: T,
  implementation?: T
): jest.MockedFunction<T> => {
  const mockFn = jest.fn() as unknown as jest.MockedFunction<T>
  if (implementation) {
    mockFn.mockImplementation(implementation)
  }
  return mockFn
}