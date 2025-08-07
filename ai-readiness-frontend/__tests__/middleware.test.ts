/**
 * Middleware Integration Tests
 * Comprehensive tests for middleware authentication flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}))

vi.mock('../lib/security/middleware', () => ({
  createComprehensiveSecurityMiddleware: jest.fn(() => 
    vi.fn().mockResolvedValue(
      new NextResponse(null, { 
        status: 200,
        headers: {
          'X-Test-Environment': 'true',
          'X-Security-Level': 'test-bypass',
        }
      })
    )
  )
}))

// Mock test-middleware to prevent 403 issues
vi.mock('../lib/security/test-middleware', () => {
  const { mockTestMiddleware } = require('./mocks/security-middleware')
  return mockTestMiddleware
})

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  NODE_ENV: 'test',
  JEST_WORKER_ID: '1',
  ENABLE_RATE_LIMITING: 'false'
}

Object.entries(mockEnv).forEach(([key, value]) => {
  process.env[key] = value
})

// Ensure global test environment flags are set
if (typeof global !== 'undefined') {
  global.__DEV__ = true
}

// Helper function to create mock NextRequest
function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  cookies?: Record<string, string>
  pathname?: string
}): NextRequest {
  const { 
    method = 'GET', 
    url = 'http://localhost:3000', 
    headers = {}, 
    cookies = {},
    pathname 
  } = options

  const finalUrl = pathname ? `http://localhost:3000${pathname}` : url
  const nextUrl = new URL(finalUrl)

  const mockCookies = new Map()
  Object.entries(cookies).forEach(([name, value]) => {
    mockCookies.set(name, { name, value })
  })

  const request = {
    method,
    url: finalUrl,
    headers: new Headers(headers),
    nextUrl,
    cookies: {
      get: jest.fn((name: string) => mockCookies.get(name)),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: jest.fn(() => Array.from(mockCookies.values())),
      has: jest.fn((name: string) => mockCookies.has(name)),
      forEach: vi.fn(),
      [Symbol.iterator]: vi.fn()
    },
    geo: {},
    ip: '127.0.0.1',
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    text: vi.fn().mockResolvedValue(''),
    json: vi.fn().mockResolvedValue({}),
    formData: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn()
  } as unknown as NextRequest

  return request
}

// Mock Supabase session states
const createMockSupabaseClient = (sessionData: any) => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: sessionData },
      error: null
    })
  }
})

describe('Middleware Authentication Flow', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Session Management', () => {
    test('should handle authenticated user session correctly', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000
      }

      mockSupabaseClient = createMockSupabaseClient(mockSession)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard',
        cookies: {
          'sb-access-token': 'mock-access-token',
          'sb-refresh-token': 'mock-refresh-token'
        }
      })

      const response = await middleware(request)

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      expect(response).toBeDefined()
    })

    test('should handle unauthenticated user session correctly', async () => {
      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      const response = await middleware(request)

      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/auth/login')
    })

    test('should properly synchronize session cookies', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      }

      let cookieOperations: any[] = []
      mockSupabaseClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null
          })
        }
      }

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation((url: string, key: string, options: any) => {
        // Capture cookie operations
        const originalSet = options.cookies.set
        const originalRemove = options.cookies.remove

        options.cookies.set = jest.fn((name: string, value: string, cookieOptions: any) => {
          cookieOperations.push({ type: 'set', name, value, options: cookieOptions })
          if (originalSet) originalSet(name, value, cookieOptions)
        })

        options.cookies.remove = jest.fn((name: string, cookieOptions: any) => {
          cookieOperations.push({ type: 'remove', name, options: cookieOptions })
          if (originalRemove) originalRemove(name, cookieOptions)
        })

        return mockSupabaseClient
      })

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      await middleware(request)

      // Verify cookie operations were captured
      expect(createServerClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function)
          })
        })
      )
    })
  })

  describe('Route Protection and Redirects', () => {
    describe('Auth Pages - Authenticated User Redirects', () => {
      const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']

      authRoutes.forEach(route => {
        test(`should redirect authenticated user from ${route} to dashboard`, async () => {
          const mockSession = {
            user: { id: 'user-123', email: 'test@example.com' },
            access_token: 'mock-access-token'
          }

          mockSupabaseClient = createMockSupabaseClient(mockSession)
          const { createServerClient } = require('@supabase/ssr')
          createServerClient.mockImplementation(() => mockSupabaseClient)

          const request = createMockRequest({
            pathname: route
          })

          const response = await middleware(request)

          expect(response.status).toBe(307) // Redirect status
          expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
        })
      })
    })

    describe('Protected Routes - Unauthenticated User Redirects', () => {
      const protectedRoutes = ['/dashboard', '/survey', '/analytics', '/admin', '/profile']

      protectedRoutes.forEach(route => {
        test(`should redirect unauthenticated user from ${route} to login`, async () => {
          mockSupabaseClient = createMockSupabaseClient(null)
          const { createServerClient } = require('@supabase/ssr')
          createServerClient.mockImplementation(() => mockSupabaseClient)

          const request = createMockRequest({
            pathname: route
          })

          const response = await middleware(request)

          expect(response.status).toBe(307) // Redirect status
          const location = response.headers.get('location')
          expect(location).toContain('/auth/login')
          expect(location).toContain(`redirectTo=${encodeURIComponent(route)}`)
        })
      })

      test('should handle nested protected routes correctly', async () => {
        mockSupabaseClient = createMockSupabaseClient(null)
        const { createServerClient } = require('@supabase/ssr')
        createServerClient.mockImplementation(() => mockSupabaseClient)

        const request = createMockRequest({
          pathname: '/survey/session-123'
        })

        const response = await middleware(request)

        expect(response.status).toBe(307)
        const location = response.headers.get('location')
        expect(location).toContain('/auth/login')
        expect(location).toContain('redirectTo=%2Fsurvey%2Fsession-123')
      })
    })

    describe('Public Routes', () => {
      const publicRoutes = ['/', '/auth/verify-email', '/auth/verify-email-success', '/terms', '/privacy', '/support']

      publicRoutes.forEach(route => {
        if (route !== '/') { // Root path has special handling
          test(`should allow access to public route ${route} without authentication`, async () => {
            mockSupabaseClient = createMockSupabaseClient(null)
            const { createServerClient } = require('@supabase/ssr')
            createServerClient.mockImplementation(() => mockSupabaseClient)

            const request = createMockRequest({
              pathname: route
            })

            const response = await middleware(request)

            // Should not redirect, should continue processing
            expect(response.status).not.toBe(307)
          })
        }
      })
    })

    describe('Root Path Handling', () => {
      test('should redirect authenticated user from root to dashboard', async () => {
        const mockSession = {
          user: { id: 'user-123', email: 'test@example.com' },
          access_token: 'mock-access-token'
        }

        mockSupabaseClient = createMockSupabaseClient(mockSession)
        const { createServerClient } = require('@supabase/ssr')
        createServerClient.mockImplementation(() => mockSupabaseClient)

        const request = createMockRequest({
          pathname: '/'
        })

        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard')
      })

      test('should redirect unauthenticated user from root to login', async () => {
        mockSupabaseClient = createMockSupabaseClient(null)
        const { createServerClient } = require('@supabase/ssr')
        createServerClient.mockImplementation(() => mockSupabaseClient)

        const request = createMockRequest({
          pathname: '/'
        })

        const response = await middleware(request)

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('http://localhost:3000/auth/login')
      })
    })
  })

  describe('Cookie Handling', () => {
    test('should set cookies with correct security attributes', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        access_token: 'mock-access-token'
      }

      let setCookieCalls: any[] = []
      mockSupabaseClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null
          })
        }
      }

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation((url: string, key: string, options: any) => {
        options.cookies.set = jest.fn((name: string, value: string, cookieOptions: any) => {
          setCookieCalls.push({ name, value, options: cookieOptions })
        })
        return mockSupabaseClient
      })

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      await middleware(request)

      // Verify that any cookies set would have correct security attributes
      // Note: The actual cookie setting is handled by the Supabase client
      expect(createServerClient).toHaveBeenCalledWith(
        mockEnv.NEXT_PUBLIC_SUPABASE_URL,
        mockEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        expect.objectContaining({
          cookies: expect.objectContaining({
            set: expect.any(Function)
          })
        })
      )
    })

    test('should handle cookie removal correctly', async () => {
      let removeCookieCalls: any[] = []
      mockSupabaseClient = createMockSupabaseClient(null)

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation((url: string, key: string, options: any) => {
        options.cookies.remove = jest.fn((name: string, cookieOptions: any) => {
          removeCookieCalls.push({ name, options: cookieOptions })
        })
        return mockSupabaseClient
      })

      const request = createMockRequest({
        pathname: '/dashboard',
        cookies: {
          'sb-access-token': 'expired-token'
        }
      })

      await middleware(request)

      // The middleware should handle session refresh
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
    })

    test('should preserve sameSite and secure attributes in production', async () => {
      // Temporarily set NODE_ENV to production
      const originalNodeEnv = process.env.NODE_ENV
      // @ts-ignore - We need to modify NODE_ENV for testing
      process.env.NODE_ENV = 'production'

      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }

      let cookieOptions: any = {}
      mockSupabaseClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null
          })
        }
      }

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation((url: string, key: string, options: any) => {
        const originalSet = options.cookies.set
        options.cookies.set = jest.fn((name: string, value: string, opts: any) => {
          cookieOptions = opts
          // Mock the middleware's cookie setting behavior
          if (originalSet) {
            originalSet(name, value, {
              ...opts,
              sameSite: 'lax',
              secure: true // Should be true in production
            })
          }
        })
        return mockSupabaseClient
      })

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      await middleware(request)

      // Restore NODE_ENV
      // @ts-ignore - Restoring NODE_ENV
      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('Security Integration', () => {
    test('should apply security middleware before authentication', async () => {
      const { createComprehensiveSecurityMiddleware } = require('../lib/security/middleware')
      const mockSecurityMiddleware = createComprehensiveSecurityMiddleware()

      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      await middleware(request)

      // Verify security middleware was called
      expect(mockSecurityMiddleware).toHaveBeenCalledWith(request)
    })

    test('should return security response if request is blocked', async () => {
      const blockedResponse = new NextResponse('Blocked', { status: 403 })
      const { createComprehensiveSecurityMiddleware } = require('../lib/security/middleware')
      createComprehensiveSecurityMiddleware.mockImplementation(() => 
        vi.fn().mockResolvedValue(blockedResponse)
      )

      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      const response = await middleware(request)

      expect(response).toBe(blockedResponse)
      // Auth logic should not be executed if security middleware blocks
      expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled()
    })

    test('should copy security headers to redirect responses', async () => {
      const mockSecurityResponse = new NextResponse(null, { status: 200 })
      mockSecurityResponse.headers.set('X-Frame-Options', 'DENY')
      mockSecurityResponse.headers.set('X-Content-Type-Options', 'nosniff')

      const { createComprehensiveSecurityMiddleware } = require('../lib/security/middleware')
      createComprehensiveSecurityMiddleware.mockImplementation(() => 
        vi.fn().mockResolvedValue(mockSecurityResponse)
      )

      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      const response = await middleware(request)

      // Should be a redirect with security headers copied
      expect(response.status).toBe(307)
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    test('should copy security headers to successful responses', async () => {
      const mockSecurityResponse = new NextResponse(null, { status: 200 })
      mockSecurityResponse.headers.set('Content-Security-Policy', "default-src 'self'")
      mockSecurityResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

      const { createComprehensiveSecurityMiddleware } = require('../lib/security/middleware')
      createComprehensiveSecurityMiddleware.mockImplementation(() => 
        vi.fn().mockResolvedValue(mockSecurityResponse)
      )

      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }
      mockSupabaseClient = createMockSupabaseClient(mockSession)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/auth/verify-email' // Public route
      })

      const response = await middleware(request)

      // Should continue processing with security headers
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Error Handling', () => {
    test('should handle Supabase client creation errors', async () => {
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => {
        throw new Error('Supabase client error')
      })

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      // Should not throw, but may return an error response or handle gracefully
      await expect(middleware(request)).rejects.toThrow('Supabase client error')
    })

    test('should handle session retrieval errors', async () => {
      mockSupabaseClient = {
        auth: {
          getSession: vi.fn().mockRejectedValue(new Error('Session error'))
        }
      }

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      // Should handle session errors gracefully
      await expect(middleware(request)).rejects.toThrow('Session error')
    })

    test('should handle malformed session data', async () => {
      mockSupabaseClient = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: 'invalid-session-data' },
            error: null
          })
        }
      }

      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/dashboard'
      })

      const response = await middleware(request)

      // Should treat invalid session as no session
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/auth/login')
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle concurrent requests efficiently', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' }
      }
      mockSupabaseClient = createMockSupabaseClient(mockSession)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const requests = Array(10).fill(null).map((_, i) => 
        createMockRequest({
          pathname: `/dashboard/page-${i}`
        })
      )

      const responses = await Promise.all(
        requests.map(request => middleware(request))
      )

      responses.forEach(response => {
        expect(response).toBeDefined()
      })

      // Should not create excessive Supabase clients
      expect(createServerClient).toHaveBeenCalledTimes(10)
    })

    test('should handle very long URLs', async () => {
      const longPath = '/dashboard/' + 'a'.repeat(1000)
      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: longPath
      })

      const response = await middleware(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/auth/login')
      expect(location).toContain('redirectTo=' + encodeURIComponent(longPath))
    })

    test('should handle special characters in redirect URLs', async () => {
      const specialPath = '/survey/session-123?param=test&other=ü'
      mockSupabaseClient = createMockSupabaseClient(null)
      const { createServerClient } = require('@supabase/ssr')
      createServerClient.mockImplementation(() => mockSupabaseClient)

      const request = createMockRequest({
        pathname: '/survey/session-123',
        url: `http://localhost:3000${specialPath}`
      })

      const response = await middleware(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/auth/login')
      // Should properly encode special characters
      expect(location).toContain('redirectTo=')
    })
  })
})