/**
 * Global Type Definitions for Tests
 * Extends global scope with test-specific types and interfaces
 */

import type { 
  TestHelpers,
  MockRouter,
  MockSupabaseClient,
  MockTestUser
} from './mocks'

// ============================================================================
// Global Test Environment Extensions
// ============================================================================

declare global {
  // Test helpers available globally in all test files
  var testHelpers: TestHelpers
  var mockStorage: any

  // Mock Web APIs
  var ResizeObserver: jest.MockedClass<typeof ResizeObserver>
  var IntersectionObserver: jest.MockedClass<typeof IntersectionObserver>
  var MediaRecorder: jest.MockedClass<typeof MediaRecorder>
  var webkitSpeechRecognition: jest.MockedClass<any>
  var SpeechRecognition: jest.MockedClass<any>
  var fetch: jest.MockedFunction<typeof fetch>

  // Extend Window interface for test-specific properties
  interface Window {
    matchMedia: jest.MockedFunction<(query: string) => MediaQueryList>
  }

  // Extend Navigator interface for test mocks
  interface Navigator {
    mediaDevices: {
      getUserMedia: jest.MockedFunction<(constraints?: MediaStreamConstraints) => Promise<MediaStream>>
    }
  }

  // Node.js Global extensions for server-side tests
  namespace NodeJS {
    interface Global {
      testHelpers: TestHelpers
      mockStorage: any
      ResizeObserver: jest.MockedClass<typeof ResizeObserver>
      IntersectionObserver: jest.MockedClass<typeof IntersectionObserver>
      MediaRecorder: jest.MockedClass<typeof MediaRecorder>
      webkitSpeechRecognition: jest.MockedClass<any>
      SpeechRecognition: jest.MockedClass<any>
      fetch: jest.MockedFunction<typeof fetch>
    }

    interface ProcessEnv {
      // Ensure test environment variables are properly typed
      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      OPENAI_API_KEY: string
      ANTHROPIC_API_KEY: string
      NODE_ENV: 'test' | 'development' | 'production'
    }
  }
}

// ============================================================================
// Jest Global Extensions
// ============================================================================

declare module '@jest/globals' {
  interface Global {
    testHelpers: TestHelpers
    mockStorage: any
  }
}

// ============================================================================
// Module Augmentations for Mocked Modules
// ============================================================================

declare module '@supabase/auth-helpers-nextjs' {
  interface CreateServerComponentClient {
    (): MockSupabaseClient
  }

  interface CreateClientComponentClient {
    (): MockSupabaseClient  
  }
}

declare module '@supabase/ssr' {
  interface CreateServerClient {
    (): MockSupabaseClient
  }

  interface CreateBrowserClient {
    (): MockSupabaseClient
  }
}

declare module 'next/navigation' {
  interface UseRouter {
    (): MockRouter
  }

  interface UseSearchParams {
    (): URLSearchParams
  }

  interface UsePathname {
    (): string
  }
}

// ============================================================================
// Custom Test Matchers
// ============================================================================

declare namespace jest {
  interface Matchers<R> {
    // Custom matchers can be added here
    toHaveBeenCalledWithValidRequest(): R
    toMatchSecurityPolicy(): R
    toBeValidMockResponse(): R
  }
}

// ============================================================================
// Test Data Types
// ============================================================================

export interface TestUser {
  email: string
  password: string
  userId: string
  organizationId: string
  role?: 'admin' | 'org_admin' | 'user' | 'analyst'
  profile?: {
    first_name: string
    last_name: string
    job_title?: string
    department?: string
  }
}

export interface TestOrganization {
  id: string
  name: string
  industry: string
  size: string
}

export interface TestSurvey {
  id: string
  organization_id: string
  title: string
  description?: string
  questions: any[]
  settings: Record<string, any>
  status: string
  created_by: string
}

// ============================================================================
// Export for external use
// ============================================================================

export {}