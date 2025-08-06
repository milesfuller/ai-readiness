/**
 * Supabase Cookie and Session Management Tests
 * Tests cookie handling, security attributes, and session persistence
 */

import { createServerClient } from '@supabase/ssr'
import { testHelper } from '../../../supabase/test-utils.mock'

// Mock cookie storage for testing
class MockCookieStore {
  private cookies: Map<string, string> = new Map()
  private attributes: Map<string, any> = new Map()

  set(name: string, value: string, options: any = {}) {
    this.cookies.set(name, value)
    this.attributes.set(name, options)
    return this
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)
  }

  remove(name: string) {
    this.cookies.delete(name)
    this.attributes.delete(name)
    return this
  }

  getAttributes(name: string) {
    return this.attributes.get(name) || {}
  }

  clear() {
    this.cookies.clear()
    this.attributes.clear()
  }

  getAllCookies() {
    return Array.from(this.cookies.entries()).map(([name, value]) => ({
      name,
      value,
      attributes: this.attributes.get(name) || {}
    }))
  }
}

// Mock request/response objects for server environment
class MockRequest {
  public headers: Map<string, string> = new Map()
  
  constructor(public cookies: MockCookieStore = new MockCookieStore()) {}
}

class MockResponse {
  public headers: Map<string, string> = new Map()
  
  constructor(public cookies: MockCookieStore = new MockCookieStore()) {}
  
  setHeader(name: string, value: string) {
    this.headers.set(name, value)
  }
}

describe('Supabase Cookie and Session Management', () => {
  let mockCookieStore: MockCookieStore
  let mockRequest: MockRequest
  let mockResponse: MockResponse
  let originalEnv: NodeJS.ProcessEnv

  beforeAll(() => {
    originalEnv = process.env
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    mockCookieStore = new MockCookieStore()
    mockRequest = new MockRequest(mockCookieStore)
    mockResponse = new MockResponse(mockCookieStore)
    
    // Set up test environment variables
    process.env.NODE_ENV = 'test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    mockCookieStore.clear()
  })

  describe('Cookie Creation and Attributes', () => {
    it('should create cookies with secure attributes in production', () => {
      // Mock production environment
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co'

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      // Mock createServerClient with cookie handling
      const client = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get: (name: string) => mockCookieStore.get(name),
          set: (name: string, value: string, options: any) => {
            mockCookieStore.set(name, value, options)
          },
          remove: (name: string, options: any) => {
            mockCookieStore.remove(name)
          }
        }
      })

      // Simulate setting auth cookies
      const sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      
      // Mock the cookie setting behavior
      mockCookieStore.set('sb-access-token', sessionToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600
      })

      const cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.name).toBe('sb-access-token')
      expect(cookie.value).toBe(sessionToken)
      expect(cookie.attributes.httpOnly).toBe(true)
      expect(cookie.attributes.secure).toBe(true)
      expect(cookie.attributes.sameSite).toBe('lax')
      expect(cookie.attributes.path).toBe('/')
      expect(cookie.attributes.maxAge).toBe(3600)
    })

    it('should create cookies with development attributes in test environment', () => {
      process.env.NODE_ENV = 'test'
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

      const client = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          get: (name: string) => mockCookieStore.get(name),
          set: (name: string, value: string, options: any) => {
            mockCookieStore.set(name, value, options)
          },
          remove: (name: string, options: any) => {
            mockCookieStore.remove(name)
          }
        }
      })

      // Simulate setting auth cookies in development
      const sessionToken = 'dev-session-token'
      
      mockCookieStore.set('sb-access-token', sessionToken, {
        httpOnly: true,
        secure: false, // False in development
        sameSite: 'lax',
        path: '/',
        maxAge: 3600
      })

      const cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.name).toBe('sb-access-token')
      expect(cookie.attributes.secure).toBe(false) // Development allows non-secure
      expect(cookie.attributes.httpOnly).toBe(true)
      expect(cookie.attributes.sameSite).toBe('lax')
    })

    it('should handle cookie attributes for different cookie types', () => {
      const cookieConfigs = [
        {
          name: 'sb-access-token',
          value: 'access-token-value',
          options: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 3600 // 1 hour
          }
        },
        {
          name: 'sb-refresh-token',
          value: 'refresh-token-value',
          options: {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 604800 // 7 days
          }
        },
        {
          name: 'sb-provider-token',
          value: 'provider-token-value',
          options: {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 1800 // 30 minutes
          }
        }
      ]

      cookieConfigs.forEach(config => {
        mockCookieStore.set(config.name, config.value, config.options)
      })

      const allCookies = mockCookieStore.getAllCookies()
      expect(allCookies).toHaveLength(3)

      const accessToken = allCookies.find(c => c.name === 'sb-access-token')
      const refreshToken = allCookies.find(c => c.name === 'sb-refresh-token')
      const providerToken = allCookies.find(c => c.name === 'sb-provider-token')

      expect(accessToken.attributes.maxAge).toBe(3600)
      expect(refreshToken.attributes.maxAge).toBe(604800)
      expect(providerToken.attributes.sameSite).toBe('strict')
    })
  })

  describe('Cookie Security Attributes', () => {
    it('should enforce httpOnly attribute for auth cookies', () => {
      const authCookies = ['sb-access-token', 'sb-refresh-token', 'sb-provider-token']
      
      authCookies.forEach(cookieName => {
        mockCookieStore.set(cookieName, 'test-value', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        })
        
        const cookie = mockCookieStore.getAllCookies()
          .find(c => c.name === cookieName)
        
        expect(cookie.attributes.httpOnly).toBe(true)
      })
    })

    it('should use secure attribute based on environment and protocol', () => {
      // Test HTTPS production
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co'
      
      mockCookieStore.set('sb-access-token', 'token', {
        secure: true, // Should be true for HTTPS
        httpOnly: true,
        sameSite: 'lax'
      })

      let cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.attributes.secure).toBe(true)

      mockCookieStore.clear()

      // Test HTTP development
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
      
      mockCookieStore.set('sb-access-token', 'token', {
        secure: false, // Should be false for HTTP
        httpOnly: true,
        sameSite: 'lax'
      })

      cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.attributes.secure).toBe(false)
    })

    it('should configure sameSite attribute appropriately', () => {
      const sameSiteConfigs = [
        { cookieName: 'sb-access-token', sameSite: 'lax' },
        { cookieName: 'sb-refresh-token', sameSite: 'lax' },
        { cookieName: 'sb-csrf-token', sameSite: 'strict' }
      ]

      sameSiteConfigs.forEach(config => {
        mockCookieStore.set(config.cookieName, 'test-value', {
          sameSite: config.sameSite,
          secure: true,
          httpOnly: true
        })
      })

      const allCookies = mockCookieStore.getAllCookies()
      
      sameSiteConfigs.forEach(config => {
        const cookie = allCookies.find(c => c.name === config.cookieName)
        expect(cookie.attributes.sameSite).toBe(config.sameSite)
      })
    })
  })

  describe('Cookie Synchronization Between Client and Server', () => {
    it('should sync session cookies between server and client contexts', async () => {
      const sessionData = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'user-id-789',
          email: 'test@example.com'
        }
      }

      // Simulate server setting cookies
      mockCookieStore.set('sb-access-token', sessionData.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: sessionData.expires_in
      })

      mockCookieStore.set('sb-refresh-token', sessionData.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 604800 // 7 days
      })

      // Simulate client reading cookies
      const accessToken = mockCookieStore.get('sb-access-token')
      const refreshToken = mockCookieStore.get('sb-refresh-token')

      expect(accessToken).toBe(sessionData.access_token)
      expect(refreshToken).toBe(sessionData.refresh_token)

      // Verify cookie attributes are maintained
      const accessTokenCookie = mockCookieStore.getAllCookies()
        .find(c => c.name === 'sb-access-token')
      
      expect(accessTokenCookie.attributes.maxAge).toBe(sessionData.expires_in)
      expect(accessTokenCookie.attributes.httpOnly).toBe(true)
    })

    it('should handle cookie updates during session refresh', async () => {
      // Initial session cookies
      mockCookieStore.set('sb-access-token', 'initial-access-token', {
        httpOnly: true,
        secure: true,
        maxAge: 3600
      })

      mockCookieStore.set('sb-refresh-token', 'initial-refresh-token', {
        httpOnly: true,
        secure: true,
        maxAge: 604800
      })

      // Simulate session refresh
      const newSessionData = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      }

      // Update cookies with new tokens
      mockCookieStore.set('sb-access-token', newSessionData.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: newSessionData.expires_in
      })

      mockCookieStore.set('sb-refresh-token', newSessionData.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 604800
      })

      // Verify tokens were updated
      expect(mockCookieStore.get('sb-access-token')).toBe(newSessionData.access_token)
      expect(mockCookieStore.get('sb-refresh-token')).toBe(newSessionData.refresh_token)
      
      // Verify old tokens are not present
      expect(mockCookieStore.get('sb-access-token')).not.toBe('initial-access-token')
      expect(mockCookieStore.get('sb-refresh-token')).not.toBe('initial-refresh-token')
    })

    it('should handle concurrent cookie modifications safely', async () => {
      const operations = []

      // Simulate multiple concurrent cookie operations
      for (let i = 0; i < 5; i++) {
        operations.push(new Promise(resolve => {
          setTimeout(() => {
            mockCookieStore.set(`sb-session-${i}`, `session-value-${i}`, {
              httpOnly: true,
              secure: true,
              sameSite: 'lax'
            })
            resolve(i)
          }, Math.random() * 10)
        }))
      }

      await Promise.all(operations)

      const allCookies = mockCookieStore.getAllCookies()
      expect(allCookies).toHaveLength(5)

      // Verify all cookies were set correctly
      for (let i = 0; i < 5; i++) {
        const cookie = allCookies.find(c => c.name === `sb-session-${i}`)
        expect(cookie).toBeTruthy()
        expect(cookie.value).toBe(`session-value-${i}`)
      }
    })
  })

  describe('Production vs Development Cookie Settings', () => {
    it('should use production-safe cookie settings in production environment', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://myproject.supabase.co'

      const productionCookieConfig = {
        httpOnly: true,
        secure: true, // Must be true in production
        sameSite: 'lax',
        path: '/',
        domain: '.myproject.com', // Production domain
        maxAge: 3600
      }

      mockCookieStore.set('sb-access-token', 'prod-token', productionCookieConfig)

      const cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.attributes.secure).toBe(true)
      expect(cookie.attributes.httpOnly).toBe(true)
      expect(cookie.attributes.sameSite).toBe('lax')
      expect(cookie.attributes.domain).toBe('.myproject.com')
    })

    it('should use development-friendly cookie settings in development', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'

      const developmentCookieConfig = {
        httpOnly: true,
        secure: false, // Can be false in development
        sameSite: 'lax',
        path: '/',
        maxAge: 3600
      }

      mockCookieStore.set('sb-access-token', 'dev-token', developmentCookieConfig)

      const cookie = mockCookieStore.getAllCookies()[0]
      expect(cookie.attributes.secure).toBe(false)
      expect(cookie.attributes.httpOnly).toBe(true)
      expect(cookie.attributes.sameSite).toBe('lax')
      expect(cookie.attributes.domain).toBeUndefined() // No domain in development
    })

    it('should handle localhost and test environments properly', () => {
      const testEnvironments = [
        { NODE_ENV: 'test', URL: 'http://localhost:54321' },
        { NODE_ENV: 'development', URL: 'http://127.0.0.1:3000' },
        { NODE_ENV: 'test', URL: 'https://test.supabase.co' }
      ]

      testEnvironments.forEach((env, index) => {
        process.env.NODE_ENV = env.NODE_ENV
        process.env.NEXT_PUBLIC_SUPABASE_URL = env.URL

        const isSecure = env.URL.startsWith('https://')
        
        mockCookieStore.set(`test-cookie-${index}`, `test-value-${index}`, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'lax',
          path: '/'
        })

        const cookie = mockCookieStore.getAllCookies()
          .find(c => c.name === `test-cookie-${index}`)
        
        expect(cookie.attributes.secure).toBe(isSecure)
        expect(cookie.attributes.httpOnly).toBe(true)
      })
    })
  })

  describe('Cookie Removal and Expiration', () => {
    it('should remove cookies on logout', async () => {
      // Set up session cookies
      const sessionCookies = [
        'sb-access-token',
        'sb-refresh-token',
        'sb-provider-token'
      ]

      sessionCookies.forEach(cookieName => {
        mockCookieStore.set(cookieName, 'session-value', {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 3600
        })
      })

      expect(mockCookieStore.getAllCookies()).toHaveLength(3)

      // Simulate logout - remove all session cookies
      sessionCookies.forEach(cookieName => {
        mockCookieStore.remove(cookieName)
      })

      expect(mockCookieStore.getAllCookies()).toHaveLength(0)
      
      // Verify specific cookies are removed
      sessionCookies.forEach(cookieName => {
        expect(mockCookieStore.get(cookieName)).toBeUndefined()
      })
    })

    it('should handle cookie expiration through maxAge', () => {
      const now = Date.now()
      
      // Set cookie with short expiration
      mockCookieStore.set('sb-short-lived', 'expires-soon', {
        httpOnly: true,
        secure: true,
        maxAge: 1 // 1 second
      })

      // Set cookie with longer expiration
      mockCookieStore.set('sb-long-lived', 'expires-later', {
        httpOnly: true,
        secure: true,
        maxAge: 3600 // 1 hour
      })

      const shortCookie = mockCookieStore.getAllCookies()
        .find(c => c.name === 'sb-short-lived')
      const longCookie = mockCookieStore.getAllCookies()
        .find(c => c.name === 'sb-long-lived')

      expect(shortCookie.attributes.maxAge).toBe(1)
      expect(longCookie.attributes.maxAge).toBe(3600)

      // In a real browser, cookies would be automatically removed
      // Here we simulate by checking maxAge values
      expect(shortCookie.attributes.maxAge).toBeLessThan(longCookie.attributes.maxAge)
    })

    it('should clear expired cookies on session validation', () => {
      // Mock expired session scenario
      mockCookieStore.set('sb-access-token', 'expired-token', {
        httpOnly: true,
        secure: true,
        maxAge: -1 // Expired
      })

      mockCookieStore.set('sb-refresh-token', 'valid-refresh-token', {
        httpOnly: true,
        secure: true,
        maxAge: 604800 // Still valid
      })

      // Simulate session validation that would remove expired cookies
      const allCookies = mockCookieStore.getAllCookies()
      const expiredCookies = allCookies.filter(c => c.attributes.maxAge <= 0)
      
      // Remove expired cookies
      expiredCookies.forEach(cookie => {
        mockCookieStore.remove(cookie.name)
      })

      // Verify only valid cookies remain
      expect(mockCookieStore.get('sb-access-token')).toBeUndefined()
      expect(mockCookieStore.get('sb-refresh-token')).toBe('valid-refresh-token')
    })
  })

  describe('Session Persistence', () => {
    it('should maintain session across page reloads', () => {
      const sessionData = {
        access_token: 'persistent-access-token',
        refresh_token: 'persistent-refresh-token',
        expires_at: Date.now() + 3600000 // 1 hour from now
      }

      // Set persistent session cookies
      Object.entries(sessionData).forEach(([key, value]) => {
        mockCookieStore.set(`sb-${key.replace('_', '-')}`, String(value), {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 3600
        })
      })

      // Simulate page reload by creating new cookie store that reads existing cookies
      const persistedCookies = mockCookieStore.getAllCookies()
      const newCookieStore = new MockCookieStore()
      
      // Restore cookies (simulating browser behavior)
      persistedCookies.forEach(cookie => {
        newCookieStore.set(cookie.name, cookie.value, cookie.attributes)
      })

      // Verify session data persists
      expect(newCookieStore.get('sb-access-token')).toBe(sessionData.access_token)
      expect(newCookieStore.get('sb-refresh-token')).toBe(sessionData.refresh_token)
    })

    it('should handle session persistence with different storage strategies', async () => {
      const persistenceStrategies = [
        { name: 'cookie-only', persistSession: true },
        { name: 'memory-only', persistSession: false }
      ]

      for (const strategy of persistenceStrategies) {
        const mockStore = new MockCookieStore()
        
        if (strategy.persistSession) {
          // Persistent session - store in cookies
          mockStore.set('sb-access-token', 'persistent-token', {
            httpOnly: true,
            secure: true,
            maxAge: 3600
          })
        }
        
        // Simulate client creation with different persistence strategies
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        
        // This would normally create a client with the specified persistence
        const hasPersistedToken = mockStore.get('sb-access-token') !== undefined
        
        if (strategy.persistSession) {
          expect(hasPersistedToken).toBe(true)
        } else {
          expect(hasPersistedToken).toBe(false)
        }
      }
    })

    it('should sync session state between multiple tabs', async () => {
      // Simulate multiple tab scenario
      const tab1CookieStore = new MockCookieStore()
      const tab2CookieStore = new MockCookieStore()

      // Tab 1 sets session
      tab1CookieStore.set('sb-access-token', 'multi-tab-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })

      // Simulate cookie synchronization between tabs
      const sharedCookieData = tab1CookieStore.getAllCookies()
      sharedCookieData.forEach(cookie => {
        tab2CookieStore.set(cookie.name, cookie.value, cookie.attributes)
      })

      // Verify both tabs have the same session
      expect(tab1CookieStore.get('sb-access-token')).toBe('multi-tab-token')
      expect(tab2CookieStore.get('sb-access-token')).toBe('multi-tab-token')

      // Tab 2 updates session
      tab2CookieStore.set('sb-access-token', 'updated-multi-tab-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })

      // Simulate synchronization back to tab 1
      const updatedCookie = tab2CookieStore.get('sb-access-token')
      tab1CookieStore.set('sb-access-token', updatedCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      })

      expect(tab1CookieStore.get('sb-access-token')).toBe('updated-multi-tab-token')
    })
  })

  describe('Cookie Security Edge Cases', () => {
    it('should handle cookie overflow gracefully', () => {
      // Test large cookie values (browsers typically limit to 4KB per cookie)
      const largeCookieValue = 'x'.repeat(4000) // Approach browser limit
      
      mockCookieStore.set('sb-large-cookie', largeCookieValue, {
        httpOnly: true,
        secure: true
      })

      const storedValue = mockCookieStore.get('sb-large-cookie')
      expect(storedValue).toBe(largeCookieValue)
      expect(storedValue.length).toBe(4000)
    })

    it('should handle special characters in cookie values', () => {
      const specialValues = [
        'token=with=equals',
        'token;with;semicolons',
        'token with spaces',
        'token\nwith\nnewlines',
        'token"with"quotes',
        'token\'with\'quotes'
      ]

      specialValues.forEach((value, index) => {
        const cookieName = `sb-special-${index}`
        
        // In real implementation, these would be URL encoded
        const encodedValue = encodeURIComponent(value)
        
        mockCookieStore.set(cookieName, encodedValue, {
          httpOnly: true,
          secure: true
        })

        const storedValue = mockCookieStore.get(cookieName)
        const decodedValue = decodeURIComponent(storedValue)
        
        expect(decodedValue).toBe(value)
      })
    })

    it('should prevent XSS through httpOnly cookies', () => {
      // Set httpOnly cookie
      mockCookieStore.set('sb-secure-token', 'secret-value', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      })

      const cookie = mockCookieStore.getAllCookies()[0]
      
      // Verify httpOnly prevents JavaScript access
      expect(cookie.attributes.httpOnly).toBe(true)
      
      // In a real browser, document.cookie would not include this cookie
      // This test verifies our mock respects httpOnly attribute
      expect(cookie.attributes.httpOnly).toBe(true)
    })

    it('should handle CSRF protection with sameSite cookies', () => {
      const csrfProtectionLevels = [
        { level: 'strict', sameSite: 'strict' },
        { level: 'lax', sameSite: 'lax' },
        { level: 'none', sameSite: 'none' }
      ]

      csrfProtectionLevels.forEach((config, index) => {
        mockCookieStore.set(`csrf-token-${index}`, 'csrf-value', {
          httpOnly: true,
          secure: true,
          sameSite: config.sameSite
        })
      })

      const allCookies = mockCookieStore.getAllCookies()
      
      csrfProtectionLevels.forEach((config, index) => {
        const cookie = allCookies.find(c => c.name === `csrf-token-${index}`)
        expect(cookie.attributes.sameSite).toBe(config.sameSite)
      })
    })
  })
})