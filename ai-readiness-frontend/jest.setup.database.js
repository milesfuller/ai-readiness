/**
 * Jest setup for database integration tests
 * This setup file is specifically for Node.js environment tests
 * and excludes browser-specific mocks
 */

// Global test environment setup
import '@testing-library/jest-dom'

// Set up environment variables for tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Mock fetch for node environment
if (!global.fetch) {
  global.fetch = require('node-fetch')
}

// Mock WebSocket for Supabase realtime
global.WebSocket = class MockWebSocket {
  constructor() {
    this.readyState = 1
    this.send = jest.fn()
    this.close = jest.fn()
    this.addEventListener = jest.fn()
    this.removeEventListener = jest.fn()
  }
}

// Mock EventSource for Supabase realtime
global.EventSource = class MockEventSource {
  constructor() {
    this.readyState = 1
    this.close = jest.fn()
    this.addEventListener = jest.fn()
    this.removeEventListener = jest.fn()
  }
}

// Mock crypto for Node environment if needed
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    },
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
}

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

console.error = (...args) => {
  // Filter out common test noise
  const message = args.join(' ')
  if (
    message.includes('Warning: ReactDOM.render is no longer supported') ||
    message.includes('Warning: validateDOMNesting') ||
    message.includes('Supabase client has already been initialized')
  ) {
    return
  }
  originalConsoleError(...args)
}

console.warn = (...args) => {
  // Filter out common test warnings
  const message = args.join(' ')
  if (
    message.includes('componentWillReceiveProps') ||
    message.includes('componentWillUpdate') ||
    message.includes('Failed to reset test data via function')
  ) {
    return
  }
  originalConsoleWarn(...args)
}

// Global test timeout
jest.setTimeout(30000)

// Clean up after each test
afterEach(async () => {
  // Clear any timers
  jest.clearAllTimers()
  // Clear all mocks
  jest.clearAllMocks()
  
  // Reset mock storage if available
  if (global.mockStorage && global.mockStorage.reset) {
    global.mockStorage.reset()
  }
})

// Global cleanup after all tests
afterAll(async () => {
  // Restore console methods
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})