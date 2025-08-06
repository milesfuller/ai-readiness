// Jest setup file for AI Readiness Frontend
// This file is executed before each test file

import '@testing-library/jest-dom'

// Polyfill for TextEncoder/TextDecoder FIRST (needed for undici)
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Add more Web API polyfills for Node.js environment
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL
}

// Mock fetch with a simple implementation instead of using undici
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      headers: new Map(),
      clone: () => ({ 
        ok: true, 
        status: 200, 
        json: () => Promise.resolve({}) 
      }),
    })
  )
}

// Mock Headers, Request, Response for Next.js without undici
if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = new Map()
      if (init) {
        if (init instanceof Headers) {
          for (const [key, value] of init._headers) {
            this._headers.set(key.toLowerCase(), value)
          }
        } else if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this._headers.set(key.toLowerCase(), String(value))
          })
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this._headers.set(key.toLowerCase(), String(value))
          })
        }
      }
    }
    
    append(name, value) { 
      const existing = this._headers.get(name.toLowerCase())
      this._headers.set(name.toLowerCase(), existing ? `${existing}, ${value}` : String(value))
    }
    delete(name) { this._headers.delete(name.toLowerCase()) }
    get(name) { return this._headers.get(name.toLowerCase()) || null }
    has(name) { return this._headers.has(name.toLowerCase()) }
    set(name, value) { this._headers.set(name.toLowerCase(), String(value)) }
    entries() { return this._headers.entries() }
    keys() { return this._headers.keys() }
    values() { return this._headers.values() }
    [Symbol.iterator]() { return this._headers.entries() }
    forEach(callback, thisArg) { 
      this._headers.forEach((value, key) => callback.call(thisArg, value, key, this))
    }
  }
}

if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init.method || 'GET'
      this.headers = new global.Headers(init.headers)
      this.body = init.body || null
      this._bodyText = typeof init.body === 'string' ? init.body : JSON.stringify(init.body || {})
    }
    
    json() { 
      return Promise.resolve(JSON.parse(this._bodyText || '{}'))
    }
    text() { 
      return Promise.resolve(this._bodyText || '')
    }
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body
      })
    }
  }
}

if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new global.Headers(init.headers)
      this.ok = this.status >= 200 && this.status < 300
      this.body = body
      this._bodyText = typeof body === 'string' ? body : JSON.stringify(body || {})
    }
    
    json() { 
      return Promise.resolve(JSON.parse(this._bodyText || '{}'))
    }
    text() { 
      return Promise.resolve(this._bodyText || '')
    }
    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      })
    }
  }
}

if (!global.FormData) {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map()
    }
    
    append(name, value) { 
      if (!this._data.has(name)) {
        this._data.set(name, [])
      }
      this._data.get(name).push(value)
    }
    delete(name) { this._data.delete(name) }
    get(name) { 
      const values = this._data.get(name)
      return values ? values[0] : null
    }
    getAll(name) { return this._data.get(name) || [] }
    has(name) { return this._data.has(name) }
    set(name, value) { this._data.set(name, [value]) }
    entries() { 
      const entries = []
      for (const [name, values] of this._data) {
        for (const value of values) {
          entries.push([name, value])
        }
      }
      return entries[Symbol.iterator]()
    }
    keys() {
      const keys = []
      for (const [name] of this._data) {
        keys.push(name)
      }
      return keys[Symbol.iterator]()
    }
    values() {
      const values = []
      for (const [, valueArray] of this._data) {
        for (const value of valueArray) {
          values.push(value)
        }
      }
      return values[Symbol.iterator]()
    }
    [Symbol.iterator]() { return this.entries() }
  }
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => ({
  thresholds: Array.isArray(options?.threshold) ? options.threshold : [options?.threshold ?? 0],
  root: options?.root ?? null,
  rootMargin: options?.rootMargin ?? '',
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Fetch is already mocked above

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(() => null),
}
global.sessionStorage = sessionStorageMock

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = jest.fn()

// Console.error suppression for cleaner test output (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    // Suppress specific known warnings/errors that are not relevant to tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: render is deprecated'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test environment setup
global.__TEST__ = true
global.__DEV__ = false

// Setup test helpers directly since test-helpers.ts is TypeScript
// Security test payloads for XSS testing
const xssPayloads = [
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

// SQL injection payloads
const sqlInjectionPayloads = [
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
  "' OR (SELECT user FROM users WHERE user='admin' AND mid(password,1,1)='a')--",
  "1' AND EXTRACT(second FROM NOW())=1--",
  "' OR 1=CONVERT(int, (SELECT TOP 1 name FROM sysobjects WHERE xtype='u'))--"
]

// Rate limiting simulator
const simulateRateLimit = (threshold = 5) => {
  let callCount = 0
  return () => {
    callCount++
    if (callCount > threshold) {
      throw new Error('Rate limit exceeded')
    }
    return true
  }
}

// Test helpers object
global.testHelpers = {
  xssPayloads,
  sqlInjectionPayloads,
  mockCsrfToken: 'mock-csrf-token-12345',
  simulateRateLimit
}