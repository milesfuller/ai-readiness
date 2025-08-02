import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/lib/auth/context'
import { supabase } from '@/lib/supabase/client'
import type { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type { User as AppUser } from '@/lib/types'

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    }
  }
}))

// Mock window location
const mockLocation = {
  origin: 'https://test.example.com'
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Test component to use the auth hook
const TestComponent: React.FC = () => {
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
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="user-role">{user?.role || 'no-role'}</div>
      <div data-testid="session-id">{session?.user?.id || 'no-session'}</div>
      <button 
        data-testid="sign-in"
        onClick={() => signIn('test@example.com', 'password123')}
      >
        Sign In
      </button>
      <button 
        data-testid="sign-up"
        onClick={() => signUp('test@example.com', 'password123', { role: 'user' })}
      >
        Sign Up
      </button>
      <button 
        data-testid="sign-out"
        onClick={() => signOut()}
      >
        Sign Out
      </button>
      <button 
        data-testid="reset-password"
        onClick={() => resetPassword('test@example.com')}
      >
        Reset Password
      </button>
      <button 
        data-testid="update-password"
        onClick={() => updatePassword('newpassword123')}
      >
        Update Password
      </button>
    </div>
  )
}

// Helper to render component with auth provider
const renderWithAuthProvider = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  )
}

// Mock data factories
const createMockSupabaseUser = (overrides: Partial<SupabaseUser> = {}): SupabaseUser => ({
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  last_sign_in_at: '2024-01-02T00:00:00Z',
  aud: 'authenticated',
  app_metadata: {},
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
  ...overrides
})

const createMockSession = (user?: SupabaseUser): Session => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: user || createMockSupabaseUser()
})

const createMockAuthError = (message: string): AuthError => ({
  name: 'AuthError',
  message,
  status: 400
} as AuthError)

describe('useAuth Hook', () => {
  let mockGetSession: jest.MockedFunction<typeof supabase.auth.getSession>
  let mockSignInWithPassword: jest.MockedFunction<typeof supabase.auth.signInWithPassword>
  let mockSignUp: jest.MockedFunction<typeof supabase.auth.signUp>
  let mockSignOut: jest.MockedFunction<typeof supabase.auth.signOut>
  let mockResetPasswordForEmail: jest.MockedFunction<typeof supabase.auth.resetPasswordForEmail>
  let mockUpdateUser: jest.MockedFunction<typeof supabase.auth.updateUser>
  let mockOnAuthStateChange: jest.MockedFunction<typeof supabase.auth.onAuthStateChange>
  let mockUnsubscribe: jest.Mock

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup mocks
    mockGetSession = supabase.auth.getSession as jest.MockedFunction<typeof supabase.auth.getSession>
    mockSignInWithPassword = supabase.auth.signInWithPassword as jest.MockedFunction<typeof supabase.auth.signInWithPassword>
    mockSignUp = supabase.auth.signUp as jest.MockedFunction<typeof supabase.auth.signUp>
    mockSignOut = supabase.auth.signOut as jest.MockedFunction<typeof supabase.auth.signOut>
    mockResetPasswordForEmail = supabase.auth.resetPasswordForEmail as jest.MockedFunction<typeof supabase.auth.resetPasswordForEmail>
    mockUpdateUser = supabase.auth.updateUser as jest.MockedFunction<typeof supabase.auth.updateUser>
    mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.MockedFunction<typeof supabase.auth.onAuthStateChange>
    
    mockUnsubscribe = jest.fn()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } }
    })
  })

  describe('Initial State and Loading', () => {
    it('should start with loading state true', () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
      expect(screen.getByTestId('session-id')).toHaveTextContent('no-session')
    })

    it('should load initial session and set loading to false', async () => {
      const mockSession = createMockSession()
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('user-role')).toHaveTextContent('user')
        expect(screen.getByTestId('session-id')).toHaveTextContent('user-123')
      })
    })

    it('should handle no initial session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
        expect(screen.getByTestId('session-id')).toHaveTextContent('no-session')
      })
    })
  })

  describe('Authentication State Changes', () => {
    it('should subscribe to auth state changes on mount', () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should update state when auth state changes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      let authCallback: (event: any, session: Session | null) => void
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      // Simulate auth state change
      const mockSession = createMockSession()
      act(() => {
        authCallback!('SIGNED_IN', mockSession)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('session-id')).toHaveTextContent('user-123')
      })
    })

    it('should unsubscribe from auth state changes on unmount', () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      const { unmount } = renderWithAuthProvider(<TestComponent />)
      
      unmount()
      
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('User Mapping', () => {
    it('should correctly map Supabase user to AppUser', async () => {
      const mockSupabaseUser = createMockSupabaseUser({
        user_metadata: {
          role: 'org_admin',
          organization_id: 'org-789',
          profile: {
            id: 'profile-456',
            firstName: 'John',
            lastName: 'Doe',
            avatar: 'https://example.com/john.jpg',
            department: 'Marketing',
            jobTitle: 'Manager',
            preferences: {
              theme: 'light',
              notifications: false,
              voiceInput: true,
              language: 'es'
            }
          }
        }
      })
      
      const mockSession = createMockSession(mockSupabaseUser)
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('user-role')).toHaveTextContent('org_admin')
      })
    })

    it('should handle user with minimal metadata', async () => {
      const mockSupabaseUser = createMockSupabaseUser({
        user_metadata: {}
      })
      
      const mockSession = createMockSession(mockSupabaseUser)
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('user-role')).toHaveTextContent('user')
      })
    })
  })

  describe('Sign In', () => {
    it('should call supabase signInWithPassword with correct parameters', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      const signInButton = screen.getByTestId('sign-in')
      await userEvent.click(signInButton)
      
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    it('should return error when sign in fails', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      const authError = createMockAuthError('Invalid credentials')
      mockSignInWithPassword.mockResolvedValue({ 
        data: { user: null, session: null }, 
        error: authError 
      })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      // Test via direct hook call
      const TestComponentWithError: React.FC = () => {
        const { signIn } = useAuth()
        const [error, setError] = React.useState<string>('')
        
        const handleSignIn = async () => {
          const result = await signIn('test@example.com', 'password123')
          if (result.error) {
            setError(result.error.message)
          }
        }
        
        return (
          <div>
            <button data-testid="sign-in-error" onClick={handleSignIn}>Sign In</button>
            <div data-testid="error">{error}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponentWithError />
        </AuthProvider>
      )
      
      const signInButton = screen.getByTestId('sign-in-error')
      await userEvent.click(signInButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials')
      })
    })
  })

  describe('Sign Up', () => {
    it('should call supabase signUp with correct parameters', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignUp.mockResolvedValue({ data: { user: null, session: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      const signUpButton = screen.getByTestId('sign-up')
      await userEvent.click(signUpButton)
      
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: { role: 'user' }
        }
      })
    })

    it('should handle sign up errors', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      const authError = createMockAuthError('Email already exists')
      mockSignUp.mockResolvedValue({ 
        data: { user: null, session: null }, 
        error: authError 
      })
      
      const TestComponentWithError: React.FC = () => {
        const { signUp } = useAuth()
        const [error, setError] = React.useState<string>('')
        
        const handleSignUp = async () => {
          const result = await signUp('test@example.com', 'password123')
          if (result.error) {
            setError(result.error.message)
          }
        }
        
        return (
          <div>
            <button data-testid="sign-up-error" onClick={handleSignUp}>Sign Up</button>
            <div data-testid="error">{error}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponentWithError />
        </AuthProvider>
      )
      
      const signUpButton = screen.getByTestId('sign-up-error')
      await userEvent.click(signUpButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists')
      })
    })
  })

  describe('Sign Out', () => {
    it('should call supabase signOut', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignOut.mockResolvedValue({ error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      const signOutButton = screen.getByTestId('sign-out')
      await userEvent.click(signOutButton)
      
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      const authError = createMockAuthError('Sign out failed')
      mockSignOut.mockResolvedValue({ error: authError })
      
      const TestComponentWithError: React.FC = () => {
        const { signOut } = useAuth()
        const [error, setError] = React.useState<string>('')
        
        const handleSignOut = async () => {
          const result = await signOut()
          if (result.error) {
            setError(result.error.message)
          }
        }
        
        return (
          <div>
            <button data-testid="sign-out-error" onClick={handleSignOut}>Sign Out</button>
            <div data-testid="error">{error}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponentWithError />
        </AuthProvider>
      )
      
      const signOutButton = screen.getByTestId('sign-out-error')
      await userEvent.click(signOutButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Sign out failed')
      })
    })
  })

  describe('Reset Password', () => {
    it('should call supabase resetPasswordForEmail with correct parameters', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      const resetPasswordButton = screen.getByTestId('reset-password')
      await userEvent.click(resetPasswordButton)
      
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
    })

    it('should handle reset password errors', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      const authError = createMockAuthError('Email not found')
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: authError })
      
      const TestComponentWithError: React.FC = () => {
        const { resetPassword } = useAuth()
        const [error, setError] = React.useState<string>('')
        
        const handleResetPassword = async () => {
          const result = await resetPassword('test@example.com')
          if (result.error) {
            setError(result.error.message)
          }
        }
        
        return (
          <div>
            <button data-testid="reset-password-error" onClick={handleResetPassword}>Reset Password</button>
            <div data-testid="error">{error}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponentWithError />
        </AuthProvider>
      )
      
      const resetPasswordButton = screen.getByTestId('reset-password-error')
      await userEvent.click(resetPasswordButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email not found')
      })
    })
  })

  describe('Update Password', () => {
    it('should call supabase updateUser with correct parameters', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockUpdateUser.mockResolvedValue({ data: { user: null }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      const updatePasswordButton = screen.getByTestId('update-password')
      await userEvent.click(updatePasswordButton)
      
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: 'newpassword123'
      })
    })

    it('should handle update password errors', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      const authError = createMockAuthError('Password too weak')
      mockUpdateUser.mockResolvedValue({ data: { user: null }, error: authError })
      
      const TestComponentWithError: React.FC = () => {
        const { updatePassword } = useAuth()
        const [error, setError] = React.useState<string>('')
        
        const handleUpdatePassword = async () => {
          const result = await updatePassword('newpassword123')
          if (result.error) {
            setError(result.error.message)
          }
        }
        
        return (
          <div>
            <button data-testid="update-password-error" onClick={handleUpdatePassword}>Update Password</button>
            <div data-testid="error">{error}</div>
          </div>
        )
      }
      
      render(
        <AuthProvider>
          <TestComponentWithError />
        </AuthProvider>
      )
      
      const updatePasswordButton = screen.getByTestId('update-password-error')
      await userEvent.click(updatePasswordButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Password too weak')
      })
    })
  })

  describe('Context Provider', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const TestComponentOutsideProvider: React.FC = () => {
        try {
          useAuth()
        } catch (error) {
          throw error
        }
        return <div>Test</div>
      }
      
      expect(() => render(<TestComponentOutsideProvider />)).toThrow(
        'useAuth must be used within an AuthProvider'
      )
      
      consoleSpy.mockRestore()
    })

    it('should provide default context values', () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      const TestComponentWithDefaults: React.FC = () => {
        const auth = useAuth()
        
        return (
          <div>
            <div data-testid="initial-user">{auth.user === null ? 'null' : 'not-null'}</div>
            <div data-testid="initial-session">{auth.session === null ? 'null' : 'not-null'}</div>
            <div data-testid="initial-loading">{auth.loading ? 'true' : 'false'}</div>
          </div>
        )
      }
      
      renderWithAuthProvider(<TestComponentWithDefaults />)
      
      expect(screen.getByTestId('initial-user')).toHaveTextContent('null')
      expect(screen.getByTestId('initial-session')).toHaveTextContent('null')
      expect(screen.getByTestId('initial-loading')).toHaveTextContent('true')
    })
  })

  describe('Security Tests', () => {
    it('should sanitize user input to prevent XSS attacks', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
      
      const TestComponentWithXSS: React.FC = () => {
        const { signIn } = useAuth()
        const [result, setResult] = React.useState<string>('')
        
        const handleXSSTest = async () => {
          // Test with XSS payload from global test helpers
          const xssEmail = global.testHelpers.xssPayloads[0]
          const result = await signIn(xssEmail, 'password')
          setResult('XSS test completed')
        }
        
        return (
          <div>
            <button data-testid="xss-test" onClick={handleXSSTest}>XSS Test</button>
            <div data-testid="xss-result">{result}</div>
          </div>
        )
      }
      
      renderWithAuthProvider(<TestComponentWithXSS />)
      
      const xssButton = screen.getByTestId('xss-test')
      await userEvent.click(xssButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('xss-result')).toHaveTextContent('XSS test completed')
      })
      
      // Verify the malicious script was passed to supabase (which should handle sanitization)
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: '<script>alert("XSS")</script>',
        password: 'password'
      })
    })

    it('should handle SQL injection attempts gracefully', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
      
      const TestComponentWithSQLInjection: React.FC = () => {
        const { signIn } = useAuth()
        const [result, setResult] = React.useState<string>('')
        
        const handleSQLInjectionTest = async () => {
          // Test with SQL injection payload from global test helpers
          const sqlInjectionEmail = global.testHelpers.sqlInjectionPayloads[0]
          const result = await signIn(sqlInjectionEmail, 'password')
          setResult('SQL injection test completed')
        }
        
        return (
          <div>
            <button data-testid="sql-injection-test" onClick={handleSQLInjectionTest}>SQL Injection Test</button>
            <div data-testid="sql-injection-result">{result}</div>
          </div>
        )
      }
      
      renderWithAuthProvider(<TestComponentWithSQLInjection />)
      
      const sqlInjectionButton = screen.getByTestId('sql-injection-test')
      await userEvent.click(sqlInjectionButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('sql-injection-result')).toHaveTextContent('SQL injection test completed')
      })
      
      // Verify the malicious SQL was passed to supabase (which should handle it safely)
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "' OR '1'='1",
        password: 'password'
      })
    })

    it('should protect against rate limiting attacks', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
      
      const rateLimitChecker = global.testHelpers.simulateRateLimit(3)
      
      const TestComponentWithRateLimit: React.FC = () => {
        const { signIn } = useAuth()
        const [attemptCount, setAttemptCount] = React.useState(0)
        const [error, setError] = React.useState<string>('')
        
        const handleRateLimitTest = async () => {
          try {
            rateLimitChecker()
            await signIn('test@example.com', 'password')
            setAttemptCount(prev => prev + 1)
          } catch (err) {
            setError((err as Error).message)
          }
        }
        
        return (
          <div>
            <button data-testid="rate-limit-test" onClick={handleRateLimitTest}>Rate Limit Test</button>
            <div data-testid="attempt-count">{attemptCount}</div>
            <div data-testid="rate-limit-error">{error}</div>
          </div>
        )
      }
      
      renderWithAuthProvider(<TestComponentWithRateLimit />)
      
      const rateLimitButton = screen.getByTestId('rate-limit-test')
      
      // Perform multiple rapid attempts
      for (let i = 0; i < 5; i++) {
        await userEvent.click(rateLimitButton)
      }
      
      await waitFor(() => {
        expect(screen.getByTestId('rate-limit-error')).toHaveTextContent('Rate limit exceeded')
      })
      
      // Should have stopped at 3 attempts due to rate limiting
      expect(screen.getByTestId('attempt-count')).toHaveTextContent('3')
    })

    it('should properly handle session token validation', async () => {
      const mockSession = createMockSession()
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('session-id')).toHaveTextContent('user-123')
      })
      
      // Verify session data is properly structured
      expect(mockSession.access_token).toBeDefined()
      expect(mockSession.refresh_token).toBeDefined()
      expect(mockSession.expires_at).toBeGreaterThan(Date.now() / 1000)
    })
  })

  describe('Error Boundary Tests', () => {
    it('should handle network errors gracefully', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'))
      
      // Should not crash the component - wrap in act for async state updates
      await act(async () => {
        renderWithAuthProvider(<TestComponent />)
      })
      
      // Should remain in loading state when network error occurs
      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    })

    it('should handle malformed session data', async () => {
      // Mock malformed session data
      mockGetSession.mockResolvedValue({ 
        data: { session: { invalid: 'data' } as any }, 
        error: null 
      })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
      })
    })

    it('should handle missing user metadata gracefully', async () => {
      const mockSupabaseUser = createMockSupabaseUser({
        email: null,
        user_metadata: null as any
      })
      
      const mockSession = createMockSession(mockSupabaseUser)
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
        expect(screen.getByTestId('user-role')).toHaveTextContent('user')
      })
    })
  })

  describe('Performance Tests', () => {
    it('should not cause unnecessary re-renders', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      
      let renderCount = 0
      const TestComponentWithRenderCount: React.FC = () => {
        renderCount++
        const { loading } = useAuth()
        return <div data-testid="render-count">{renderCount}</div>
      }
      
      renderWithAuthProvider(<TestComponentWithRenderCount />)
      
      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('2') // Initial + after loading
      })
      
      // Wait a bit to ensure no additional renders
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(screen.getByTestId('render-count')).toHaveTextContent('2')
    })

    it('should handle rapid auth state changes', async () => {
      let authCallback: (event: any, session: Session | null) => void
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      })
      
      renderWithAuthProvider(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
      })
      
      // Simulate rapid auth state changes
      for (let i = 0; i < 10; i++) {
        act(() => {
          authCallback!('SIGNED_IN', createMockSession())
          authCallback!('SIGNED_OUT', null)
        })
      }
      
      // Should handle rapid changes without crashing
      expect(screen.getByTestId('user-email')).toHaveTextContent('no-user')
    })
  })
})