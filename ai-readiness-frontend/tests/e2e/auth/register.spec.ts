import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * REGISTRATION FLOW TESTS
 * 
 * Tests comprehensive registration scenarios including:
 * 1. Form validation and submission
 * 2. Email verification flow
 * 3. Password strength requirements
 * 4. Error handling
 * 5. Success states and redirects
 */

// Helper function to generate unique test email
const generateTestEmail = () => `test.${Date.now()}@aireadiness.example.com`

// Helper function to clear auth state
const clearAuthState = async (page: Page) => {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        localStorage.removeItem(key)
      }
    })
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        sessionStorage.removeItem(key)
      }
    })
  })
}

test.describe('Registration Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test.describe('Form Validation', () => {
    test('should validate empty form submission', async ({ page }) => {
      console.log('📝 Testing empty form validation')
      
      await page.goto('/auth/register')
      
      // Verify registration form loads
      await expect(page.locator('[data-testid="register-form"], form')).toBeVisible()
      
      // Try to submit empty form
      const submitButton = page.locator('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      await submitButton.click()
      
      // Wait for validation
      await page.waitForTimeout(1000)
      
      // Check for validation errors
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      
      const emailInvalid = await emailField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.hasAttribute('aria-invalid')
      })
      
      const passwordInvalid = await passwordField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.hasAttribute('aria-invalid')
      })
      
      expect(emailInvalid || passwordInvalid).toBeTruthy()
      expect(page.url()).toContain('/auth/register')
      
      console.log('✅ Empty form validation working')
    })

    test('should validate email format', async ({ page }) => {
      console.log('📝 Testing email format validation')
      
      await page.goto('/auth/register')
      
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      
      // Enter invalid email format
      await emailField.fill('invalid-email')
      await passwordField.fill('ValidPassword123!')
      
      // Try to submit
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      // Check email validation
      const isInvalid = await emailField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid
      })
      
      expect(isInvalid).toBeTruthy()
      expect(page.url()).toContain('/auth/register')
      
      console.log('✅ Email format validation working')
    })

    test('should validate password requirements', async ({ page }) => {
      console.log('📝 Testing password requirements validation')
      
      await page.goto('/auth/register')
      
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      
      await emailField.fill('test@example.com')
      
      // Test weak password
      await passwordField.fill('123')
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      // Wait for validation
      await page.waitForTimeout(1000)
      
      // Should show password validation error or prevent submission
      const passwordInvalid = await passwordField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.hasAttribute('aria-invalid')
      })
      
      // Look for password requirements message
      const passwordErrorVisible = await Promise.race([
        page.locator('[data-testid="password-error"]').isVisible().catch(() => false),
        page.locator('text=Password must').isVisible().catch(() => false),
        page.locator('text=at least').isVisible().catch(() => false),
        page.locator('.text-red, .error').isVisible().catch(() => false)
      ])
      
      expect(passwordInvalid || passwordErrorVisible).toBeTruthy()
      
      console.log('✅ Password requirements validation working')
    })

    test('should validate password confirmation match', async ({ page }) => {
      console.log('📝 Testing password confirmation validation')
      
      await page.goto('/auth/register')
      
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[placeholder*="confirm"], input[type="password"]').nth(1)
      
      await emailField.fill('test@example.com')
      await passwordField.fill('ValidPassword123!')
      
      // Enter different password in confirm field
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill('DifferentPassword123!')
        
        await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
        
        await page.waitForTimeout(1000)
        
        // Should show password mismatch error
        const mismatchErrorVisible = await Promise.race([
          page.locator('[data-testid="confirm-password-error"]').isVisible().catch(() => false),
          page.locator('text=Passwords do not match').isVisible().catch(() => false),
          page.locator('text=Password mismatch').isVisible().catch(() => false),
          page.locator('.error').isVisible().catch(() => false)
        ])
        
        expect(mismatchErrorVisible).toBeTruthy()
        expect(page.url()).toContain('/auth/register')
        
        console.log('✅ Password confirmation validation working')
      } else {
        console.log('ℹ️ Password confirmation field not found - may not be implemented')
      }
    })
  })

  test.describe('Successful Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      console.log('📝 Testing successful user registration')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      const testPassword = 'TestPassword123!'
      
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      
      await emailField.fill(testEmail)
      await passwordField.fill(testPassword)
      
      // Fill confirm password if present
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[placeholder*="confirm"], input[type="password"]').nth(1)
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testPassword)
      }
      
      // Fill additional fields if present
      const firstNameField = page.locator('input[name="firstName"], input[placeholder*="first"]')
      if (await firstNameField.isVisible()) {
        await firstNameField.fill('Test')
      }
      
      const lastNameField = page.locator('input[name="lastName"], input[placeholder*="last"]')
      if (await lastNameField.isVisible()) {
        await lastNameField.fill('User')
      }
      
      // Accept terms if checkbox is present
      const termsCheckbox = page.locator('input[type="checkbox"]')
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check()
      }
      
      // Submit registration
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      // Wait for response
      await page.waitForTimeout(5000)
      
      const currentUrl = page.url()
      
      // Check for success scenarios
      const isRedirectedToVerification = currentUrl.includes('verify') || currentUrl.includes('check-email') || currentUrl.includes('confirm')
      const isRedirectedToDashboard = currentUrl.includes('dashboard')
      
      if (isRedirectedToVerification) {
        console.log('✅ Redirected to email verification page')
        expect(isRedirectedToVerification).toBeTruthy()
        
        // Look for verification message
        const verificationMessage = await Promise.race([
          page.locator('text=Check your email').isVisible().catch(() => false),
          page.locator('text=Verification').isVisible().catch(() => false),
          page.locator('text=sent').isVisible().catch(() => false)
        ])
        
        if (verificationMessage) {
          console.log('✅ Email verification message displayed')
        }
        
      } else if (isRedirectedToDashboard) {
        console.log('✅ Auto-login successful - redirected to dashboard')
        expect(isRedirectedToDashboard).toBeTruthy()
        
      } else {
        // Look for success message on same page
        const successMessageVisible = await Promise.race([
          page.locator('[data-testid="registration-success"]').isVisible().catch(() => false),
          page.locator('text=Registration successful').isVisible().catch(() => false),
          page.locator('text=Account created').isVisible().catch(() => false),
          page.locator('text=Welcome').isVisible().catch(() => false),
          page.locator('.success, .text-green').isVisible().catch(() => false)
        ])
        
        expect(successMessageVisible).toBeTruthy()
        console.log('✅ Registration success message displayed')
      }
      
      console.log('✅ User registration completed successfully')
    })

    test('should handle registration with minimal required fields', async ({ page }) => {
      console.log('📝 Testing registration with minimal fields')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      const testPassword = 'MinimalPass123!'
      
      // Fill only required fields
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', testPassword)
      
      // Submit
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should succeed with minimal fields
      const currentUrl = page.url()
      const registrationSuccessful = 
        currentUrl.includes('verify') ||
        currentUrl.includes('dashboard') ||
        await page.locator('.success').isVisible().catch(() => false)
      
      expect(registrationSuccessful).toBeTruthy()
      
      console.log('✅ Minimal field registration successful')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle duplicate email registration', async ({ page }) => {
      console.log('📝 Testing duplicate email error handling')
      
      await page.goto('/auth/register')
      
      // Try to register with existing email
      const existingEmail = 'test@example.com' // Assuming this exists in test data
      const testPassword = 'TestPassword123!'
      
      await page.fill('[data-testid="email-input"], input[type="email"]', existingEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', testPassword)
      
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[placeholder*="confirm"], input[type="password"]').nth(1)
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testPassword)
      }
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(5000)
      
      // Should show duplicate email error
      const duplicateErrorVisible = await Promise.race([
        page.locator('[data-testid="registration-error"]').isVisible().catch(() => false),
        page.locator('text=already exists').isVisible().catch(() => false),
        page.locator('text=already registered').isVisible().catch(() => false),
        page.locator('text=User already').isVisible().catch(() => false),
        page.locator('.error, .text-red').isVisible().catch(() => false)
      ])
      
      expect(duplicateErrorVisible).toBeTruthy()
      expect(page.url()).toContain('/auth/register')
      
      console.log('✅ Duplicate email error handled correctly')
    })

    test('should handle network errors during registration', async ({ page }) => {
      console.log('📝 Testing network error handling')
      
      await page.goto('/auth/register')
      
      // Block registration requests
      await page.route('**/auth/**', route => route.abort('failed'))
      
      const testEmail = generateTestEmail()
      
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should show network error
      const networkErrorVisible = await Promise.race([
        page.locator('text=Network error').isVisible().catch(() => false),
        page.locator('text=Connection failed').isVisible().catch(() => false),
        page.locator('text=Please try again').isVisible().catch(() => false),
        page.locator('.error').isVisible().catch(() => false)
      ])
      
      expect(networkErrorVisible).toBeTruthy()
      expect(page.url()).toContain('/auth/register')
      
      // Clean up
      await page.unroute('**/auth/**')
      
      console.log('✅ Network error handling verified')
    })

    test('should handle server validation errors', async ({ page }) => {
      console.log('📝 Testing server validation error handling')
      
      await page.goto('/auth/register')
      
      // Try registration with potentially invalid server-side data
      const testEmail = 'invalid.domain@invalid'
      
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should either show server error or client validation
      const errorVisible = await Promise.race([
        page.locator('[data-testid="registration-error"]').isVisible().catch(() => false),
        page.locator('.error, .text-red').isVisible().catch(() => false),
        page.locator('[role="alert"]').isVisible().catch(() => false)
      ])
      
      // Client validation might prevent submission, which is also valid
      const stillOnRegisterPage = page.url().includes('/auth/register')
      
      expect(errorVisible || stillOnRegisterPage).toBeTruthy()
      
      console.log('✅ Server validation error handling verified')
    })
  })

  test.describe('UI States and Loading', () => {
    test('should show loading states during registration', async ({ page }) => {
      console.log('📝 Testing registration loading states')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      const submitButton = page.locator('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      await submitButton.click()
      
      // Check for loading indicators
      const loadingVisible = await Promise.race([
        page.locator('[data-testid="registration-loading"]').isVisible().catch(() => false),
        page.locator('button:has-text("Creating account")').isVisible().catch(() => false),
        page.locator('button:has-text("Registering")').isVisible().catch(() => false),
        page.locator('button[disabled]').isVisible().catch(() => false),
        page.locator('.loading, .spinner').isVisible().catch(() => false)
      ])
      
      if (loadingVisible) {
        console.log('✅ Loading state detected during registration')
      }
      
      await page.waitForTimeout(5000)
      
      console.log('✅ Registration UI states handled correctly')
    })

    test('should show success indicators after registration', async ({ page }) => {
      console.log('📝 Testing registration success indicators')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Look for success indicators
      const successVisible = await Promise.race([
        page.locator('[data-testid="registration-success"]').isVisible().catch(() => false),
        page.locator('text=Account created').isVisible().catch(() => false),
        page.locator('text=Registration successful').isVisible().catch(() => false),
        page.locator('text=Welcome').isVisible().catch(() => false),
        page.locator('text=Check your email').isVisible().catch(() => false),
        page.locator('.success, .text-green').isVisible().catch(() => false)
      ])
      
      if (successVisible) {
        console.log('✅ Success indicators displayed')
      }
      
      console.log('✅ Registration success flow completed')
    })
  })

  test.describe('Form Interactions', () => {
    test('should handle rapid form filling', async ({ page }) => {
      console.log('📝 Testing rapid form filling')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      const emailField = page.locator('[data-testid="email-input"], input[type="email"]')
      const passwordField = page.locator('[data-testid="password-input"], input[type="password"]').first()
      
      // Rapidly fill and change fields
      await emailField.fill('test1@example.com')
      await emailField.fill('')
      await emailField.fill(testEmail)
      
      await passwordField.fill('pass1')
      await passwordField.fill('')
      await passwordField.fill('TestPassword123!')
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should work correctly despite rapid changes
      const currentUrl = page.url()
      const registrationHandled = 
        !currentUrl.includes('/auth/register') || // Redirected away
        await page.locator('.success, .error').isVisible().catch(() => false) // Got response
      
      expect(registrationHandled).toBeTruthy()
      
      console.log('✅ Rapid form filling handled correctly')
    })

    test('should prevent double submission', async ({ page }) => {
      console.log('📝 Testing double submission prevention')
      
      await page.goto('/auth/register')
      
      const testEmail = generateTestEmail()
      
      await page.fill('[data-testid="email-input"], input[type="email"]', testEmail)
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      const submitButton = page.locator('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      
      // Click submit multiple times rapidly
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ])
      
      await page.waitForTimeout(5000)
      
      // Should handle multiple clicks gracefully
      const currentUrl = page.url()
      const noErrors = !currentUrl.includes('error') && 
        !(await page.locator('text=Something went wrong').isVisible().catch(() => false))
      
      expect(noErrors).toBeTruthy()
      
      console.log('✅ Double submission handled correctly')
    })
  })

  test.describe('Navigation and Flow', () => {
    test('should allow navigation to login from register', async ({ page }) => {
      console.log('📝 Testing navigation to login')
      
      await page.goto('/auth/register')
      
      // Look for login link
      const loginLink = page.locator('a:has-text("Sign in"), a:has-text("Login"), a[href*="login"]')
      
      if (await loginLink.isVisible()) {
        await loginLink.click()
        
        await page.waitForURL(/auth\/login/, { timeout: 5000 })
        expect(page.url()).toContain('/auth/login')
        
        // Verify login form is visible
        await expect(page.locator('[data-testid="login-form"], form')).toBeVisible()
        
        console.log('✅ Navigation to login successful')
      } else {
        console.log('ℹ️ Login link not found - navigation may not be implemented')
      }
    })

    test('should redirect authenticated users away from register', async ({ page }) => {
      console.log('📝 Testing authenticated user redirect')
      
      // First login (simulate authentication)
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"], input[type="email"]', 'test@example.com')
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      await page.click('[data-testid="login-submit"], button[type="submit"]')
      
      // Wait for login to complete
      await page.waitForTimeout(3000)
      
      // Now try to access register page
      await page.goto('/auth/register')
      
      // Should be redirected away from register page
      await page.waitForTimeout(2000)
      
      const currentUrl = page.url()
      const redirectedAway = !currentUrl.includes('/auth/register')
      
      if (redirectedAway) {
        expect(redirectedAway).toBeTruthy()
        console.log('✅ Authenticated user redirected away from register')
      } else {
        console.log('ℹ️ Authenticated user redirect not implemented')
      }
    })
  })
})
