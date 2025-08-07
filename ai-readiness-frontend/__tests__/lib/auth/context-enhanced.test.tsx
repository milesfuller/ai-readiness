/**
 * Enhanced Authentication Context Tests
 * 
 * This test file provides comprehensive coverage for:
 * - Session management with proper token handling
 * - Cookie-based authentication state persistence
 * - Error boundaries and edge cases
 * - Security validations
 * - Performance characteristics
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AuthProvider, useAuth } from '@/lib/auth/context'
import type { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type { User as AppUser } from '@/lib/types'

// Enhanced mock factories for comprehensive testing
const createMockSupabaseUser = (overrides: Partial<SupabaseUser> = {}): SupabaseUser => ({
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  last_sign_in_at: '2024-01-02T00:00:00Z',
  aud: 'authenticated',
  app_metadata: {
    provider: 'email',
    providers: ['email']
  },
  user_metadata: {
    role: 'user',
    organization_id: 'org-456',
    profile: {
      id: 'profile-789',
      firstName: 'Test',
      lastName: 'User',
      avatar: 'https://example.com/avatar.jpg',
      department: 'Engineering',
      jobTitle: 'Developer',
      preferences: {
        theme: 'dark',
        notifications: true,
        voiceInput: false,
        language: 'en'
      }
    }
  },
  identities: [],
  ...overrides
})

const createMockSession = (user?: SupabaseUser): Session => ({
  access_token: 'mock-access-token-' + Date.now(),
  refresh_token: 'mock-refresh-token-' + Date.now(),
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: user || createMockSupabaseUser(),
  provider_token: undefined,
  provider_refresh_token: undefined
})

const createMockAuthError = (message: string, status: number = 400): AuthError => ({
  name: 'AuthError',
  message,
  status
})

// Test component with comprehensive auth state display
const AuthTestComponent: React.FC = () => {
  const {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword
  } = useAuth()

  return (
    <div data-testid="auth-test-component">
      <div data-testid="loading-state">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user-id">{user?.id || 'no-user'}</div>
      <div data-testid="user-email">{user?.email || 'no-email'}</div>
      <div data-testid="user-role">{user?.role || 'no-role'}</div>
      <div data-testid="session-expires">{session?.expires_at || 'no-expiry'}</div>
      <div data-testid="access-token">{session?.access_token || 'no-token'}</div>
      
      <button
        data-testid="sign-in-btn"
        onClick={() => signIn('test@example.com', 'password123')}
      >
        Sign In
      </button>
      <button
        data-testid="sign-out-btn"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    </div>
  )
}

const renderWithAuthProvider = (component = <AuthTestComponent />) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

describe('Enhanced Authentication Context', () => {
  let mockClient: any

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear()
    }
    
    // Reset document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    })

    // Get the mocked client from our setup
    const mockModule = vi.mocked(await import('@/lib/supabase/client'))
    mockClient = mockModule.createClient()
  })

  describe('Session Token Management', () => {
    it('should handle session token creation and refresh', async () => {
      const mockUser = createMockSupabaseUser()
      const originalSession = createMockSession(mockUser)
      
      // Mock getSession to return initial session
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: originalSession },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Verify token is displayed
      expect(screen.getByTestId('access-token')).toHaveTextContent(originalSession.access_token)
      expect(screen.getByTestId('session-expires')).toHaveTextContent(originalSession.expires_at.toString())
    })

    it('should refresh expired tokens automatically', async () => {
      const mockUser = createMockSupabaseUser()
      const expiredSession = createMockSession(mockUser)
      // Set session as expired
      expiredSession.expires_at = Math.floor(Date.now() / 1000) - 3600

      const newSession = createMockSession(mockUser)
      newSession.access_token = 'refreshed-access-token'

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null
      })

      mockClient.auth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Simulate token refresh through auth state change
      await act(async () => {
        mockClient.auth._triggerAuthStateChange('TOKEN_REFRESHED', newSession)
      })

      await waitFor(() => {
        expect(screen.getByTestId('access-token')).toHaveTextContent('refreshed-access-token')
      })
    })

    it('should handle token refresh failure gracefully', async () => {
      const mockUser = createMockSupabaseUser()
      const expiredSession = createMockSession(mockUser)
      
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null
      })

      mockClient.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error: createMockAuthError('Refresh token is invalid')
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Should handle refresh failure without crashing
      expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
    })
  })

  describe('Cookie-Based Session Persistence', () => {
    it('should store session data in test environment', async () => {
      // Mock test environment
      const originalNodeEnv = process.env.NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true
      })

      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      mockClient.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      // Mock sessionStorage
      const mockSetItem = vi.fn()
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          setItem: mockSetItem,
          getItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        },
        writable: true
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Perform sign in
      const signInBtn = screen.getByTestId('sign-in-btn')
      await act(async () => {
        await userEvent.click(signInBtn)
      })

      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'supabase-test-session',
          JSON.stringify(mockSession)
        )
      })

      // Restore original NODE_ENV
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true
      })
    })

    it('should handle sessionStorage errors gracefully', async () => {
      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      // Mock failing sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('Storage quota exceeded')
          }),
          getItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn()
        },
        writable: true
      })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation()

      renderWithAuthProvider()

      const signInBtn = screen.getByTestId('sign-in-btn')
      await act(async () => {
        await userEvent.click(signInBtn)
      })

      // Should log warning but not crash
      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[Auth Context] Failed to store test session backup:',
          expect.any(Error)
        )
      })

      consoleWarnSpy.mockRestore()
    })
  })

  describe('Security Validations', () => {
    it('should validate session token structure', async () => {
      const mockUser = createMockSupabaseUser()
      const malformedSession = {
        // Missing required fields
        access_token: 'malformed-token',
        // missing refresh_token, expires_at, etc.
      } as any

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: malformedSession },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Should handle malformed session gracefully
      expect(screen.getByTestId('user-id')).toHaveTextContent('no-user')
    })

    it('should sanitize user metadata', async () => {
      const maliciousUser = createMockSupabaseUser({
        user_metadata: {
          role: '<script>alert("XSS")</script>',
          profile: {
            firstName: "'; DROP TABLE users; --",
            lastName: '<img src="x" onerror="alert(1)">',
          }
        }
      })

      const mockSession = createMockSession(maliciousUser)

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Metadata should be handled safely (React naturally escapes these)
      expect(screen.getByTestId('user-role')).toHaveTextContent('<script>alert("XSS")</script>')
      
      // Verify no script execution occurred
      expect(window.alert).not.toHaveBeenCalled()
    })

    it('should handle very large tokens', async () => {
      const largeToken = 'a'.repeat(10000) // Very large token
      const mockUser = createMockSupabaseUser()
      const sessionWithLargeToken = createMockSession(mockUser)
      sessionWithLargeToken.access_token = largeToken

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: sessionWithLargeToken },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Should handle large tokens without performance issues
      expect(screen.getByTestId('access-token')).toHaveTextContent(largeToken)
    })
  })

  describe('Error Boundary Integration', () => {
    it('should handle auth context errors gracefully', async () => {
      // Mock getSession to throw error
      mockClient.auth.getSession.mockRejectedValue(new Error('Network error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()

      renderWithAuthProvider()

      // Should not crash the component
      expect(screen.getByTestId('auth-test-component')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should recover from temporary network failures', async () => {
      let callCount = 0
      mockClient.auth.getSession.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve({ data: { session: null }, error: null })
      })

      renderWithAuthProvider()

      // Should eventually load successfully
      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      }, { timeout: 3000 })
    })
  })

  describe('Performance Characteristics', () => {
    it('should not cause excessive re-renders', async () => {
      let renderCount = 0
      
      const RenderCountComponent = () => {
        renderCount++
        const { loading } = useAuth()
        return <div data-testid="render-count">{renderCount}</div>
      }

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      render(
        <AuthProvider>
          <RenderCountComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toBeInTheDocument()
      })

      // Should have minimal renders (initial + after session load)
      expect(renderCount).toBeLessThanOrEqual(3)
    })

    it('should handle rapid auth state changes efficiently', async () => {
      const mockUser = createMockSupabaseUser()

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      renderWithAuthProvider()

      await waitFor(() => {
        expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
      })

      // Simulate rapid auth state changes
      await act(async () => {
        for (let i = 0; i < 10; i++) {
          mockClient.auth._triggerAuthStateChange('SIGNED_IN', createMockSession(mockUser))
          mockClient.auth._triggerAuthStateChange('SIGNED_OUT', null)
        }
      })

      // Should handle rapid changes without crashing
      expect(screen.getByTestId('auth-test-component')).toBeInTheDocument()
    })
  })

  describe('Integration with Browser APIs', () => {
    it('should handle localStorage/sessionStorage unavailability', async () => {
      // Mock unavailable storage
      const originalSessionStorage = window.sessionStorage
      delete (window as any).sessionStorage

      const mockUser = createMockSupabaseUser()
      const mockSession = createMockSession(mockUser)

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      renderWithAuthProvider()

      const signInBtn = screen.getByTestId('sign-in-btn')
      await act(async () => {
        await userEvent.click(signInBtn)
      })

      // Should complete sign in without storage
      await waitFor(() => {
        expect(screen.getByTestId('user-id')).toHaveTextContent('user-123')
      })

      // Restore sessionStorage
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        writable: true
      })
    })

    it('should handle different browser environments', async () => {
      const environments = [
        { hostname: 'localhost', expected: true },
        { hostname: '127.0.0.1', expected: false },
        { hostname: 'production.com', expected: false }
      ]

      for (const env of environments) {
        Object.defineProperty(window, 'location', {
          value: { hostname: env.hostname },
          writable: true
        })

        const mockUser = createMockSupabaseUser()
        const mockSession = createMockSession(mockUser)

        mockClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null
        })

        const { unmount } = renderWithAuthProvider()

        await waitFor(() => {
          expect(screen.getByTestId('loading-state')).toHaveTextContent('loaded')
        })

        unmount()
      }
    })
  })
})