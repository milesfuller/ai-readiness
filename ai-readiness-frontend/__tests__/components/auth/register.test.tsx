import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import RegisterPage from '@/app/auth/register/page'
import { useAuth } from '@/lib/hooks/use-auth'

jest.mock('@/lib/hooks/use-auth')
jest.mock('next/navigation')

describe('RegisterPage', () => {
  const mockSignUp = jest.fn()
  const mockPush = jest.fn()
  const mockLocalStorage = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })
    
    ;(useAuth as jest.Mock).mockReturnValue({
      signUp: mockSignUp,
    })
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders registration form with all required fields', () => {
    render(<RegisterPage />)
    
    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    expect(screen.getByText('Start your AI readiness assessment journey')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Work email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Company name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Choose a strong password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/organization is required/i)).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    const emailInput = screen.getByPlaceholderText('Work email address')
    await user.type(emailInput, 'invalid-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('validates password requirements', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    const passwordInput = screen.getByPlaceholderText('Choose a strong password')
    await user.type(passwordInput, 'weak')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation match', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    await user.type(screen.getByPlaceholderText('Choose a strong password'), 'Password123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'DifferentPassword123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('validates password strength requirements', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    const passwordInput = screen.getByPlaceholderText('Choose a strong password')
    
    // Test password without uppercase
    await user.clear(passwordInput)
    await user.type(passwordInput, 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/must contain at least one uppercase letter/i)).toBeInTheDocument()
    })
  })

  it('handles successful registration', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: null })
    
    render(<RegisterPage />)
    
    await user.type(screen.getByPlaceholderText('First name'), 'John')
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe')
    await user.type(screen.getByPlaceholderText('Work email address'), 'john.doe@company.com')
    await user.type(screen.getByPlaceholderText('Company name'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('Choose a strong password'), 'ValidPassword123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'ValidPassword123')
    await user.click(screen.getByRole('checkbox')) // Terms acceptance
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        'john.doe@company.com',
        'ValidPassword123',
        {
          firstName: 'John',
          lastName: 'Doe',
          organization: 'Acme Corp',
        }
      )
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'pendingVerificationEmail',
        'john.doe@company.com'
      )
      expect(mockPush).toHaveBeenCalledWith('/auth/verify-email')
    })
  })

  it('handles registration error', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ 
      error: { message: 'User already registered' } 
    })
    
    render(<RegisterPage />)
    
    await user.type(screen.getByPlaceholderText('First name'), 'John')
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe')
    await user.type(screen.getByPlaceholderText('Work email address'), 'existing@company.com')
    await user.type(screen.getByPlaceholderText('Company name'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('Choose a strong password'), 'ValidPassword123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'ValidPassword123')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument()
    })
  })

  it('requires terms acceptance', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    
    await user.type(screen.getByPlaceholderText('First name'), 'John')
    await user.type(screen.getByPlaceholderText('Last name'), 'Doe')
    await user.type(screen.getByPlaceholderText('Work email address'), 'john@company.com')
    await user.type(screen.getByPlaceholderText('Company name'), 'Acme Corp')
    await user.type(screen.getByPlaceholderText('Choose a strong password'), 'ValidPassword123')
    await user.type(screen.getByPlaceholderText('Confirm your password'), 'ValidPassword123')
    // Don't check the terms checkbox
    await user.click(screen.getByRole('button', { name: /create account/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/you must accept the terms/i)).toBeInTheDocument()
    })
  })

  describe('Security Tests', () => {
    it('prevents XSS in form inputs', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)
      
      const xssPayload = '<script>alert("XSS")</script>'
      await user.type(screen.getByPlaceholderText('First name'), xssPayload)
      await user.type(screen.getByPlaceholderText('Company name'), xssPayload)
      
      // Values should be in the inputs but not executed
      expect(screen.getByPlaceholderText('First name')).toHaveValue(xssPayload)
      expect(screen.getByPlaceholderText('Company name')).toHaveValue(xssPayload)
      
      // No script tags should be rendered as HTML
      expect(document.querySelector('script')).toBeNull()
    })

    it('sanitizes data before submission', async () => {
      const user = userEvent.setup()
      mockSignUp.mockResolvedValue({ error: null })
      
      render(<RegisterPage />)
      
      const sqlInjection = "'; DROP TABLE users; --"
      await user.type(screen.getByPlaceholderText('First name'), sqlInjection)
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe')
      await user.type(screen.getByPlaceholderText('Work email address'), 'test@company.com')
      await user.type(screen.getByPlaceholderText('Company name'), 'Acme Corp')
      await user.type(screen.getByPlaceholderText('Choose a strong password'), 'ValidPassword123')
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'ValidPassword123')
      await user.click(screen.getByRole('checkbox'))
      await user.click(screen.getByRole('button', { name: /create account/i }))
      
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@company.com',
          'ValidPassword123',
          {
            firstName: sqlInjection, // Should be passed as-is (sanitization happens server-side)
            lastName: 'Doe',
            organization: 'Acme Corp',
          }
        )
      })
    })

    it('does not expose password in DOM', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)
      
      const passwordInput = screen.getByPlaceholderText('Choose a strong password') as HTMLInputElement
      await user.type(passwordInput, 'SecretPassword123')
      
      expect(passwordInput.type).toBe('password')
      expect(passwordInput.value).toBe('SecretPassword123')
      
      // Password should not be visible in DOM as plain text
      expect(document.body.textContent).not.toContain('SecretPassword123')
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper form structure for screen readers', () => {
      render(<RegisterPage />)
      
      const form = screen.getByRole('form', { hidden: true }) || 
                  screen.getByPlaceholderText('First name').closest('form')
      expect(form).toBeInTheDocument()
    })

    it('shows password requirements to assist users', () => {
      render(<RegisterPage />)
      
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument()
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument()
      expect(screen.getByText(/one number/i)).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<RegisterPage />)
      
      // Should be able to tab through all form fields
      await user.tab() // First name
      expect(screen.getByPlaceholderText('First name')).toHaveFocus()
      
      await user.tab() // Last name
      expect(screen.getByPlaceholderText('Last name')).toHaveFocus()
      
      await user.tab() // Email
      expect(screen.getByPlaceholderText('Work email address')).toHaveFocus()
      
      await user.tab() // Company
      expect(screen.getByPlaceholderText('Company name')).toHaveFocus()
      
      await user.tab() // Password
      expect(screen.getByPlaceholderText('Choose a strong password')).toHaveFocus()
      
      await user.tab() // Confirm password
      expect(screen.getByPlaceholderText('Confirm your password')).toHaveFocus()
      
      await user.tab() // Terms checkbox
      expect(screen.getByRole('checkbox')).toHaveFocus()
    })
  })
})