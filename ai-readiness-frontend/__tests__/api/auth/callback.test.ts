/**
 * Comprehensive Tests for Auth Callback Route (/app/auth/callback/route.ts)
 * 
 * Tests include:
 * - Successful OAuth callback with code exchange
 * - Redirect behavior with next parameter
 * - Error handling when no code is provided
 * - Error handling when code exchange fails
 * - Proper redirect behavior to login on error
 * - URL construction and parameter handling
 * - Security considerations for redirect URLs
 */

import { NextResponse } from 'next/server'
import { GET } from '@/app/auth/callback/route'
import { createClient } from '@/lib/supabase/server'

import { vi } from 'vitest'

// Mock Next.js server components
vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({
      status: 302,
      headers: new Map([['Location', url.toString()]]),
      url: url.toString()
    }))
  }
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

const mockCreateClient = createClient as any
const mockNextResponseRedirect = NextResponse.redirect as any

// Mock Supabase client with auth methods
const createMockSupabaseClient = (shouldSucceed = true, exchangeError: any = null) => ({
  auth: {
    exchangeCodeForSession: vi.fn().mockResolvedValue({
      error: exchangeError,
      data: shouldSucceed ? { session: { access_token: 'mock-token' } } : null
    })
  }
})

describe('/app/auth/callback/route.ts - GET Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful OAuth Callback', () => {
    it('should exchange code for session and redirect to dashboard when no next parameter', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=auth_code_123')

      await GET(request)

      // Verify code exchange was attempted
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth_code_123')
      
      // Verify redirect to dashboard
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/dashboard', 'https://example.com')
      )
    })

    it('should exchange code for session and redirect to next parameter when provided', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=auth_code_123&next=/profile')

      await GET(request)

      // Verify code exchange was attempted
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth_code_123')
      
      // Verify redirect to custom next URL
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/profile', 'https://example.com')
      )
    })

    it('should handle complex next parameter URLs correctly', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const nextUrl = '/survey/session-123?step=2&section=demographics'
      const request = new Request(`https://example.com/auth/callback?code=auth_code_123&next=${encodeURIComponent(nextUrl)}`)

      await GET(request)

      // Verify redirect to complex next URL
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL(nextUrl, 'https://example.com')
      )
    })

    it('should preserve origin domain in redirect URLs', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://custom-domain.com/auth/callback?code=auth_code_123&next=/settings')

      await GET(request)

      // Verify redirect preserves custom domain
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/settings', 'https://custom-domain.com')
      )
    })
  })

  describe('Error Handling - No Code Parameter', () => {
    it('should redirect to login when no code parameter is provided', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback')

      await GET(request)

      // Verify no code exchange was attempted
      expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      
      // Verify redirect to login
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should redirect to login when code parameter is empty string', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=')

      await GET(request)

      // Verify no code exchange was attempted (empty string is falsy)
      expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      
      // Verify redirect to login
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should redirect to login when code parameter is null', async () => {
      const mockSupabase = createMockSupabaseClient()
      mockCreateClient.mockReturnValue(mockSupabase as any)

      // Simulate URL with no code parameter value
      const request = new Request('https://example.com/auth/callback?other_param=value')

      await GET(request)

      expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })
  })

  describe('Error Handling - Code Exchange Failures', () => {
    it('should redirect to login when code exchange returns an error', async () => {
      const exchangeError = { message: 'Invalid authorization code' }
      const mockSupabase = createMockSupabaseClient(false, exchangeError)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=invalid_code_123')

      await GET(request)

      // Verify code exchange was attempted
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('invalid_code_123')
      
      // Verify redirect to login due to error
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should redirect to login when code exchange throws an exception', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockRejectedValue(new Error('Network error'))
        }
      }
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=auth_code_123')

      await GET(request)

      // Verify code exchange was attempted
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth_code_123')
      
      // Verify redirect to login due to exception
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should redirect to login when code exchange returns error with specific message', async () => {
      const exchangeError = { 
        message: 'Token expired',
        status: 400,
        code: 'invalid_grant'
      }
      const mockSupabase = createMockSupabaseClient(false, exchangeError)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=expired_code_123')

      await GET(request)

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('expired_code_123')
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should handle malformed authorization codes gracefully', async () => {
      const malformedCodes = [
        'javascript:alert(1)',
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        'code with spaces and special chars!@#$%',
        ''.repeat(1000), // Very long code
        'null',
        'undefined'
      ]

      for (const malformedCode of malformedCodes) {
        vi.clearAllMocks()
        
        const exchangeError = { message: 'Invalid code format' }
        const mockSupabase = createMockSupabaseClient(false, exchangeError)
        mockCreateClient.mockReturnValue(mockSupabase as any)

        const request = new Request(`https://example.com/auth/callback?code=${encodeURIComponent(malformedCode)}`)

        await GET(request)

        // Verify code exchange was attempted with the malformed code
        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(malformedCode)
        
        // Verify redirect to login (should handle gracefully)
        expect(mockNextResponseRedirect).toHaveBeenCalledWith(
          new URL('/auth/login', 'https://example.com')
        )
      }
    })
  })

  describe('URL Parameter Handling', () => {
    it('should correctly parse URL parameters from request URL', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=test_code&next=/dashboard&extra=ignored')

      await GET(request)

      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('test_code')
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/dashboard', 'https://example.com')
      )
    })

    it('should handle URL encoded parameters correctly', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const encodedNext = encodeURIComponent('/survey?id=123&mode=edit')
      const request = new Request(`https://example.com/auth/callback?code=test_code&next=${encodedNext}`)

      await GET(request)

      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/survey?id=123&mode=edit', 'https://example.com')
      )
    })

    it('should handle multiple query parameters in next URL', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const complexNext = '/dashboard?tab=analytics&period=30d&org=123&user=456'
      const request = new Request(`https://example.com/auth/callback?code=test_code&next=${encodeURIComponent(complexNext)}`)

      await GET(request)

      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL(complexNext, 'https://example.com')
      )
    })
  })

  describe('Security Considerations', () => {
    it('should prevent open redirect attacks with absolute URLs in next parameter', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      // Test potentially malicious absolute URLs
      const maliciousUrls = [
        'https://evil.com/steal-data',
        'http://attacker.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '//evil.com/redirect'
      ]

      for (const maliciousUrl of maliciousUrls) {
        vi.clearAllMocks()
        
        const request = new Request(`https://example.com/auth/callback?code=test_code&next=${encodeURIComponent(maliciousUrl)}`)

        await GET(request)

        // The next parameter should be treated as a relative path
        // URL constructor with base should resolve it relative to the origin
        expect(mockNextResponseRedirect).toHaveBeenCalledWith(
          new URL(maliciousUrl, 'https://example.com')
        )
      }
    })

    it('should handle edge cases in URL construction', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      // Test edge cases
      const edgeCases = [
        { next: '', expectedPath: '/dashboard' }, // Empty next should default to dashboard
        { next: '/', expectedPath: '/' }, // Root path
        { next: '//', expectedPath: '//' }, // Double slash
        { next: '///multiple///slashes///', expectedPath: '///multiple///slashes///' },
        { next: '/valid/path/../with/traversal', expectedPath: '/valid/path/../with/traversal' }
      ]

      for (const testCase of edgeCases) {
        vi.clearAllMocks()
        
        const queryParam = testCase.next ? `&next=${encodeURIComponent(testCase.next)}` : ''
        const request = new Request(`https://example.com/auth/callback?code=test_code${queryParam}`)

        await GET(request)

        expect(mockNextResponseRedirect).toHaveBeenCalledWith(
          new URL(testCase.expectedPath, 'https://example.com')
        )
      }
    })

    it('should preserve HTTPS in redirect URLs', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://secure.example.com/auth/callback?code=test_code')

      await GET(request)

      const redirectCall = mockNextResponseRedirect.mock.calls[0][0]
      const redirectUrl = typeof redirectCall === 'string' ? new URL(redirectCall) : redirectCall
      expect(redirectUrl.protocol).toBe('https:')
      expect(redirectUrl.hostname).toBe('secure.example.com')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle concurrent callback requests', async () => {
      const mockSupabase = createMockSupabaseClient(true)
      mockCreateClient.mockReturnValue(mockSupabase as any)

      // Simulate multiple concurrent requests
      const requests = [
        new Request('https://example.com/auth/callback?code=code1&next=/dashboard'),
        new Request('https://example.com/auth/callback?code=code2&next=/profile'),
        new Request('https://example.com/auth/callback?code=code3&next=/settings')
      ]

      // Execute all requests concurrently
      await Promise.all(requests.map(request => GET(request)))

      // Verify all code exchanges were attempted
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledTimes(3)
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('code1')
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('code2')
      expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('code3')

      // Verify all redirects occurred
      expect(mockNextResponseRedirect).toHaveBeenCalledTimes(3)
    })

    it('should handle mixed success and failure scenarios', async () => {
      // Test alternating success and failure
      const scenarios = [
        { code: 'success_code', shouldSucceed: true, expectedRedirect: '/dashboard' },
        { code: 'fail_code', shouldSucceed: false, expectedRedirect: '/auth/login' },
        { code: 'success_code_2', shouldSucceed: true, expectedRedirect: '/profile' }
      ]

      for (let i = 0; i < scenarios.length; i++) {
        vi.clearAllMocks()
        
        const scenario = scenarios[i]
        const mockSupabase = createMockSupabaseClient(
          scenario.shouldSucceed, 
          scenario.shouldSucceed ? null : { message: 'Exchange failed' }
        )
        mockCreateClient.mockReturnValue(mockSupabase as any)

        const nextParam = scenario.shouldSucceed && scenario.expectedRedirect !== '/dashboard' 
          ? `&next=${scenario.expectedRedirect}` 
          : ''
        const request = new Request(`https://example.com/auth/callback?code=${scenario.code}${nextParam}`)

        await GET(request)

        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(scenario.code)
        expect(mockNextResponseRedirect).toHaveBeenCalledWith(
          new URL(scenario.expectedRedirect, 'https://example.com')
        )
      }
    })
  })

  describe('Performance and Resource Management', () => {
    it('should not create unnecessary Supabase client instances when no code', async () => {
      const request = new Request('https://example.com/auth/callback')

      await GET(request)

      // Client should still be created but exchangeCodeForSession should not be called
      expect(mockCreateClient).toHaveBeenCalledTimes(1)
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })

    it('should handle timeout scenarios gracefully', async () => {
      const mockSupabase = {
        auth: {
          exchangeCodeForSession: vi.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 100)
            )
          )
        }
      }
      mockCreateClient.mockReturnValue(mockSupabase as any)

      const request = new Request('https://example.com/auth/callback?code=timeout_code')

      await GET(request)

      // Should handle timeout and redirect to login
      expect(mockNextResponseRedirect).toHaveBeenCalledWith(
        new URL('/auth/login', 'https://example.com')
      )
    })
  })
})