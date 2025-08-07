import React from 'react'
import { afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Extend expect with jest-dom matchers
import '@testing-library/jest-dom/vitest'

// Setup MSW for API mocking
import { server } from '../__tests__/mocks/server'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock Next.js image
vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => 
    // eslint-disable-next-line @next/next/no-img-element
    React.createElement('img', { src, alt, ...props })
  ),
}))

// Mock Supabase client with correct export structure  
vi.mock('@/lib/supabase/client', () => {
  const mockClient = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      updateUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      refreshSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn((callback) => {
        // Store callback for manual triggering in tests
        mockClient._authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      
      // Helper methods for testing
      _authCallback: null,
      _triggerAuthStateChange: (event: string, session: any) => {
        if (mockClient._authCallback) {
          mockClient._authCallback(event, session);
        }
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: vi.fn((callback) => Promise.resolve({ data: null, error: null }).then(callback)),
    })),
    
    // Storage mock for file uploads
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    },
  };

  return {
    createClient: vi.fn(() => mockClient),
    createBrowserClient: vi.fn(() => mockClient),
    supabase: mockClient,
    default: mockClient,
  };
})

// Mock Supabase index module as well
vi.mock('@/lib/supabase', () => {
  const mockClient = {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  };

  return {
    getSupabaseClient: vi.fn(() => Promise.resolve(mockClient)),
    getSupabaseClientSync: vi.fn(() => mockClient),
    createClient: vi.fn(() => mockClient),
    createBrowserClient: vi.fn(() => mockClient),
    getServerClient: vi.fn(() => Promise.resolve(mockClient)),
    supabase: mockClient,
    clearClient: vi.fn(),
    hasClientInstance: vi.fn(() => true),
    default: mockClient,
  };
})

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  },
}))

// Setup global test environment
beforeAll(() => {
  // Start MSW server
  server.listen()
  
  // Mock window.matchMedia (check if window exists first)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    })
  } else {
    // For non-browser environments, create a global mock
    global.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock document.cookie for session management (check if document exists)
  if (typeof document !== 'undefined') {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })
  }
  
  // Mock Headers for Response objects
  global.Headers = global.Headers || vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    entries: vi.fn(() => []),
    keys: vi.fn(() => []),
    values: vi.fn(() => []),
  }))

  // Mock console methods to reduce test noise
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  server.resetHandlers()
})