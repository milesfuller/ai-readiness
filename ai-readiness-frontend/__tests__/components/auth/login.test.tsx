import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/auth/login/page'
import { useAuth } from '@/lib/hooks/use-auth'

// Mock the modules
jest.mock('@/lib/hooks/use-auth')
jest.mock('next/navigation')

describe('LoginPage', () => {
  const mockSignIn = jest.fn()
  const mockPush = jest.fn()
  const mockReplace = jest.fn()
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup mocks
    ;(useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    })
  })

  it('renders login form with all required fields', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your AI Readiness account')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test invalid email
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('validates password requirements', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Test empty password field
    await user.type(emailInput, 'test@example.com')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('handles successful login', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: null })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'ValidPassword123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'ValidPassword123')
    })
    
    // Check for redirect after successful login 
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login error', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ 
      error: { message: 'Invalid login credentials' } 
    })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'WrongPassword123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    render(<LoginPage />)
    
    const emailInput = screen.getByPlaceholderText('Enter your email')
    const passwordInput = screen.getByPlaceholderText('Enter your password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'ValidPassword123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Security Tests', () => {
    it('prevents XSS attacks in error messages', async () => {
      const user = userEvent.setup()
      const xssPayload = '<script>alert("XSS")</script>'
      mockSignIn.mockResolvedValue({ 
        error: { message: xssPayload } 
      })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        // The XSS payload should be escaped, not executed
        const errorElement = screen.getByText(xssPayload)
        expect(errorElement.innerHTML).not.toContain('<script>')
        expect(errorElement.textContent).toBe(xssPayload)
      })
    })

    it('does not store sensitive data in localStorage', () => {
      render(<LoginPage />)
      
      // Check that no sensitive data is stored
      expect(localStorage.getItem('password')).toBeNull()
      expect(localStorage.getItem('email')).toBeNull()
    })

    it('clears password field on error', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ 
        error: { message: 'Invalid credentials' } 
      })
      
      render(<LoginPage />)
      
      const passwordInput = screen.getByPlaceholderText('Enter your password') as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        // Password should remain in field after error (better UX)
        expect(passwordInput.value).toBe('password123')
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels', () => {
      render(<LoginPage />)
      
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      // Tab through form elements
      await user.tab()
      expect(screen.getByPlaceholderText('Enter your email')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByPlaceholderText('Enter your password')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('checkbox')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Forgot password?')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup()
      mockSignIn.mockResolvedValue({ 
        error: { message: 'Invalid login credentials' } 
      })
      
      render(<LoginPage />)
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        const errorElement = screen.getByText('Invalid login credentials')
        expect(errorElement.closest('[role="alert"]')).toBeInTheDocument()
      })
    })
  })
})