require('@testing-library/jest-dom')

// Polyfill for Web APIs used by Next.js
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Web APIs for Next.js API routes
global.Request = class MockRequest {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
    this._bodyText = init.body
  }

  async json() {
    return JSON.parse(this._bodyText || '{}')
  }

  async text() {
    return this._bodyText || ''
  }
}

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
  }

  async json() {
    return JSON.parse(this.body || '{}')
  }

  async text() {
    return this.body || ''
  }
}

global.Headers = class MockHeaders extends Map {
  get(name) {
    return super.get(name.toLowerCase())
  }
  
  set(name, value) {
    return super.set(name.toLowerCase(), value)
  }
  
  has(name) {
    return super.has(name.toLowerCase())
  }
}

global.URL = class MockURL {
  constructor(url) {
    const parsed = new URL(url)
    this.searchParams = parsed.searchParams
    this.pathname = parsed.pathname
    this.origin = parsed.origin
  }
}

global.URLSearchParams = URLSearchParams

// Mock AbortSignal for timeout functionality
global.AbortSignal = {
  timeout: (ms) => ({
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })
}

// Mock fetch for HTTP requests
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  }
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

// Global test helpers
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia
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

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Security test helpers
global.testHelpers = {
  // XSS test payloads
  xssPayloads: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>',
    '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>">\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>',
  ],
  
  // SQL injection test payloads  
  sqlInjectionPayloads: [
    '\' OR \'1\'=\'1',
    '\'; DROP TABLE users; --',
    '\' UNION SELECT * FROM users --',
    '1\' OR \'1\'=\'1\' --',
    'admin\'--',
  ],
  
  // CSRF token validation
  mockCsrfToken: 'test-csrf-token-12345',
  
  // Rate limiting simulation
  simulateRateLimit: (threshold = 5) => {
    let calls = 0
    return () => {
      calls++
      if (calls > threshold) {
        throw new Error('Rate limit exceeded')
      }
      return true
    }
  },
}