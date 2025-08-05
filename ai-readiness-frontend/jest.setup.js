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
    this.headers = new global.Headers(init.headers || {})
    this.ok = this.status >= 200 && this.status < 300
    this.url = ''
    this.type = 'basic'
    this.redirected = false
  }

  async json() {
    return JSON.parse(this.body || '{}')
  }

  async text() {
    return this.body || ''
  }
  
  async arrayBuffer() {
    return new ArrayBuffer(0)
  }
  
  async blob() {
    return new Blob([this.body || ''])
  }
  
  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers)
    })
  }
}

global.Headers = class MockHeaders extends Map {
  constructor(init) {
    super()
    if (init) {
      if (init instanceof Headers || init instanceof MockHeaders) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (init instanceof Map) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (Array.isArray(init)) {
        for (const [key, value] of init) {
          this.set(key, value)
        }
      } else if (typeof init === 'object') {
        for (const [key, value] of Object.entries(init)) {
          this.set(key, value)
        }
      }
    }
  }

  get(name) {
    return super.get(name.toLowerCase()) || null
  }
  
  set(name, value) {
    return super.set(name.toLowerCase(), String(value))
  }
  
  has(name) {
    return super.has(name.toLowerCase())
  }
  
  delete(name) {
    return super.delete(name.toLowerCase())
  }
  
  forEach(callback, thisArg) {
    super.forEach(callback, thisArg)
  }
  
  *keys() {
    yield* super.keys()
  }
  
  *values() {
    yield* super.values()
  }
  
  *entries() {
    yield* super.entries()
  }
  
  [Symbol.iterator]() {
    return this.entries()
  }
}

// Use native URL if available, otherwise create mock
if (typeof URL === 'undefined') {
  global.URL = class MockURL {
    constructor(url, base) {
      if (base) {
        url = new URL(url, base).href
      }
      const parsed = require('url').parse(url, true)
      this.href = url
      this.origin = `${parsed.protocol}//${parsed.host}`
      this.protocol = parsed.protocol
      this.host = parsed.host
      this.hostname = parsed.hostname
      this.port = parsed.port
      this.pathname = parsed.pathname
      this.search = parsed.search || ''
      this.hash = parsed.hash || ''
      this.searchParams = new URLSearchParams(parsed.query)
    }
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

// Mock MediaRecorder for VoiceRecorder tests
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  ondataavailable: null,
  onstop: null,
  onstart: null,
  state: 'inactive',
}))

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          kind: 'audio',
          label: 'Mock Audio Track',
          enabled: true,
        }
      ]
    }),
  },
})

// Mock Web Speech API
global.webkitSpeechRecognition = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  onresult: null,
  onerror: null,
  onend: null,
  continuous: false,
  interimResults: false,
  lang: 'en-US',
}))

global.SpeechRecognition = global.webkitSpeechRecognition

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