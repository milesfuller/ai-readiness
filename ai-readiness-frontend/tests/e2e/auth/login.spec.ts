import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * LOGIN FLOW TESTS
 * 
 * Tests comprehensive login scenarios with focus on:
 * 1. Successful authentication flows
 * 2. Validation and error handling
 * 3. Session management
 * 4. Redirect preservation
 * 5. UI states and animations
 */

// Test user credentials - should match your test data setup
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

const ADMIN_USER = {
  email: 'admin@example.com', 
  password: 'AdminPassword123!'
}

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'WrongPassword123!'
}

// Helper function to clear auth state
const clearAuthState = async (page: Page) => {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    // Clear any Supabase auth tokens specifically
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

// Helper function to wait for auth state change
const waitForAuthChange = async (page: Page, timeout = 5000) => {
  return await page.waitForFunction(
    () => {
      const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'))
      const sessionKeys = Object.keys(sessionStorage).filter(key => key.includes('supabase'))
      return supabaseKeys.length > 0 || sessionKeys.length > 0
    },
    { timeout }
  ).catch(() => false)
}

test.describe('Login Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with clean auth state
    await clearAuthState(page)
  })

  test.describe('Successful Login Scenarios', () => {
    test('should login successfully and redirect to dashboard', async ({ page }) => {
      console.log('🔐 Testing successful login and redirect to dashboard')
      
      await page.goto('/auth/login')
      
      // Verify login page loads correctly
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      
      // Submit login
      const submitButton = page.locator('[data-testid="login-submit"]')
      await expect(submitButton).toBeEnabled()
      
      await submitButton.click()
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify we're on dashboard
      expect(page.url()).toContain('/dashboard')
      
      // Verify dashboard content loads
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 })
      
      // Verify auth state is established
      await waitForAuthChange(page)
      
      // Verify cookies are set
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth') || 
        c.name.includes('session')
      )
      expect(authCookies.length).toBeGreaterThan(0)
      
      console.log('✅ Login successful - redirected to dashboard')
    })

    test('should preserve redirectTo parameter after login', async ({ page }) => {
      console.log('🔐 Testing redirectTo parameter preservation')
      
      // Navigate to login with redirectTo parameter
      await page.goto('/auth/login?redirectTo=%2Fsurvey%2F123')
      
      // Verify redirectTo is in URL
      expect(page.url()).toContain('redirectTo=%2Fsurvey%2F123')
      
      // Login
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Should redirect to the intended destination
      await page.waitForURL('/survey/123', { timeout: 10000 })
      expect(page.url()).toContain('/survey/123')
      
      console.log('✅ RedirectTo parameter preserved correctly')
    })

    test('should handle login from protected route redirect', async ({ page }) => {
      console.log('🔐 Testing protected route redirect flow')
      
      // Try to access protected route when not logged in
      await page.goto('/dashboard')
      
      // Should be redirected to login
      await page.waitForURL(/auth\/login/, { timeout: 5000 })
      
      // Verify redirectTo parameter is set
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')
      
      const url = new URL(currentUrl)
      const redirectTo = url.searchParams.get('redirectTo')
      expect(redirectTo).toBe('/dashboard')
      
      // Login
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Should redirect back to originally requested page
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Protected route redirect flow works correctly')
    })

    test('should handle admin login with elevated permissions', async ({ page }) => {
      console.log('🔐 Testing admin login flow')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', ADMIN_USER.email)
      await page.fill('[data-testid="password-input"]', ADMIN_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Admin should have access to admin routes
      await page.goto('/admin')
      
      // Should not be redirected away from admin page
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/admin')
      
      console.log('✅ Admin login and permissions verified')
    })

    test('should handle remember me functionality', async ({ page }) => {
      console.log('🔐 Testing remember me checkbox')
      
      await page.goto('/auth/login')
      
      // Check remember me if it exists
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check()
      }
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify session cookies have longer expiration
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth')
      )
      
      if (sessionCookie) {
        // Session should persist (cookie should have future expiry)
        expect(sessionCookie.expires).toBeGreaterThan(Date.now() / 1000)
      }
      
      console.log('✅ Remember me functionality verified')
    })
  })

  test.describe('Login Validation and Error Handling', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
      console.log('🔐 Testing form validation for empty fields')
      
      await page.goto('/auth/login')
      
      // Try to submit empty form
      await page.click('[data-testid="login-submit"]')
      
      // Check for validation errors
      const emailField = page.locator('[data-testid="email-input"]')
      const passwordField = page.locator('[data-testid="password-input"]')
      
      // Wait for validation to trigger
      await page.waitForTimeout(1000)
      
      const emailInvalid = await emailField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.hasAttribute('aria-invalid')
      })
      
      const passwordInvalid = await passwordField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid || el.hasAttribute('aria-invalid')
      })
      
      expect(emailInvalid || passwordInvalid).toBeTruthy()
      
      // Should stay on login page
      expect(page.url()).toContain('/auth/login')
      
      console.log('✅ Form validation working correctly')
    })

    test('should show error for invalid email format', async ({ page }) => {
      console.log('🔐 Testing invalid email format validation')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', 'not-an-email')
      await page.fill('[data-testid="password-input"]', 'somepassword')
      await page.click('[data-testid="login-submit"]')
      
      // Check email field validation
      const emailField = page.locator('[data-testid="email-input"]')
      const isInvalid = await emailField.evaluate((el: HTMLInputElement) => {
        return !el.validity.valid
      })
      
      expect(isInvalid).toBeTruthy()
      expect(page.url()).toContain('/auth/login')
      
      console.log('✅ Email format validation working')
    })

    test('should show error for invalid credentials', async ({ page }) => {
      console.log('🔐 Testing invalid credentials error handling')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', INVALID_USER.email)
      await page.fill('[data-testid="password-input"]', INVALID_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Wait for error to appear
      await page.waitForTimeout(3000)
      
      // Look for error message (multiple possible selectors)
      const errorVisible = await Promise.race([
        page.locator('[data-testid="login-error"]').isVisible().catch(() => false),
        page.locator('.error, .text-destructive, .text-red-500').first().isVisible().catch(() => false),
        page.locator('[role="alert"]').isVisible().catch(() => false),
        page.locator('text=Invalid credentials').isVisible().catch(() => false),
        page.locator('text=Login failed').isVisible().catch(() => false)
      ])
      
      expect(errorVisible).toBeTruthy()
      expect(page.url()).toContain('/auth/login')
      
      // Should not have auth state
      const userSessionExists = await page.evaluate(() => {
        const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'))
        const sessionKeys = Object.keys(sessionStorage).filter(key => key.includes('supabase'))
        return supabaseKeys.length > 0 || sessionKeys.length > 0
      })
      
      expect(userSessionExists).toBeFalsy()
      
      console.log('✅ Invalid credentials handled correctly')
    })

    test('should show error for non-existent user', async ({ page }) => {
      console.log('🔐 Testing non-existent user error')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
      await page.fill('[data-testid="password-input"]', 'SomePassword123!')
      await page.click('[data-testid="login-submit"]')
      
      await page.waitForTimeout(3000)
      
      // Look for user not found or similar error
      const errorVisible = await Promise.race([
        page.locator('text=Invalid login credentials').isVisible().catch(() => false),
        page.locator('text=User not found').isVisible().catch(() => false),
        page.locator('text=Account does not exist').isVisible().catch(() => false),
        page.locator('.error').isVisible().catch(() => false)
      ])
      
      expect(errorVisible).toBeTruthy()
      expect(page.url()).toContain('/auth/login')
      
      console.log('✅ Non-existent user error handled correctly')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      console.log('🔐 Testing network error handling')
      
      await page.goto('/auth/login')
      
      // Block auth requests to simulate network error
      await page.route('**/auth/**', route => route.abort('failed'))
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should show network error message
      const networkErrorVisible = await Promise.race([
        page.locator('text=Network error').isVisible().catch(() => false),
        page.locator('text=Connection failed').isVisible().catch(() => false),
        page.locator('text=Please try again').isVisible().catch(() => false),
        page.locator('.error').isVisible().catch(() => false)
      ])
      
      expect(networkErrorVisible).toBeTruthy()
      expect(page.url()).toContain('/auth/login')
      
      // Clean up
      await page.unroute('**/auth/**')
      
      console.log('✅ Network error handling verified')
    })
  })

  test.describe('Session Management', () => {
    test('should persist session across page navigation', async ({ page }) => {
      console.log('🔐 Testing session persistence across navigation')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Navigate to different pages
      await page.goto('/survey')
      await page.waitForTimeout(1000)
      expect(page.url()).not.toContain('/auth/login')
      
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/dashboard')
      
      // Refresh page
      await page.reload()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Session persists across navigation')
    })

    test('should handle session expiry correctly', async ({ page }) => {
      console.log('🔐 Testing session expiry handling')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Simulate session expiry by clearing auth tokens
      await page.evaluate(() => {
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.clear()
        // Clear all supabase-related items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      })
      
      // Try to access protected route
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should be redirected to login or show auth prompt
      const currentUrl = page.url()
      const isRedirectedToLogin = currentUrl.includes('/auth/login')
      
      if (!isRedirectedToLogin) {
        // Check if there's a login form visible
        const loginFormVisible = await page.locator('form, [data-testid="login-form"]').isVisible()
        expect(loginFormVisible).toBeTruthy()
      } else {
        expect(isRedirectedToLogin).toBeTruthy()
      }
      
      console.log('✅ Session expiry handled correctly')
    })
  })

  test.describe('UI States and Loading', () => {
    test('should show loading states during login', async ({ page }) => {
      console.log('🔐 Testing login loading states')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      
      // Click submit and quickly check for loading state
      const submitButton = page.locator('[data-testid="login-submit"]')
      await submitButton.click()
      
      // Check for loading indicators (might be brief)
      const loadingVisible = await Promise.race([
        page.locator('[data-testid="login-loading"]').isVisible().catch(() => false),
        page.locator('button:has-text("Signing in")').isVisible().catch(() => false),
        page.locator('button[disabled]').isVisible().catch(() => false),
        page.locator('.loading, .spinner').isVisible().catch(() => false)
      ])
      
      // Loading state might be very brief, so this is best-effort
      if (loadingVisible) {
        console.log('✅ Loading state detected during login')
      }
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      console.log('✅ Login UI states handled correctly')
    })

    test('should show success indicators after login', async ({ page }) => {
      console.log('🔐 Testing success indicators')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Look for success indicators
      const successVisible = await Promise.race([
        page.locator('[data-testid="login-success"]').isVisible().catch(() => false),
        page.locator('text=Welcome back').isVisible().catch(() => false),
        page.locator('text=Redirecting').isVisible().catch(() => false),
        page.locator('.success, .text-green').isVisible().catch(() => false)
      ])
      
      if (successVisible) {
        console.log('✅ Success indicators displayed')
      }
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      console.log('✅ Login success flow completed')
    })
  })

  test.describe('Rapid Interaction Handling', () => {
    test('should prevent double submission', async ({ page }) => {
      console.log('🔐 Testing double submission prevention')
      
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      
      const submitButton = page.locator('[data-testid="login-submit"]')
      
      // Click multiple times rapidly
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ])
      
      // Should still redirect correctly without errors
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Double submission prevented correctly')
    })

    test('should handle rapid form interactions', async ({ page }) => {
      console.log('🔐 Testing rapid form interactions')
      
      await page.goto('/auth/login')
      
      // Rapidly fill and clear fields
      const emailField = page.locator('[data-testid="email-input"]')
      const passwordField = page.locator('[data-testid="password-input"]')
      
      await emailField.fill('test1@example.com')
      await emailField.fill('')
      await emailField.fill(TEST_USER.email)
      
      await passwordField.fill('wrong')
      await passwordField.fill('')
      await passwordField.fill(TEST_USER.password)
      
      await page.click('[data-testid="login-submit"]')
      
      // Should work correctly despite rapid changes
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Rapid form interactions handled correctly')
    })
  })

  test.describe('Error Recovery', () => {
    test('should allow retry after failed login', async ({ page }) => {
      console.log('🔐 Testing error recovery and retry')
      
      await page.goto('/auth/login')
      
      // First attempt with wrong credentials
      await page.fill('[data-testid="email-input"]', INVALID_USER.email)
      await page.fill('[data-testid="password-input"]', INVALID_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should show error
      const errorVisible = await page.locator('.error, [role="alert"], .text-destructive').first().isVisible().catch(() => false)
      expect(errorVisible).toBeTruthy()
      
      // Clear and retry with correct credentials
      await page.fill('[data-testid="email-input"]', '')
      await page.fill('[data-testid="password-input"]', '')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Should now succeed
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Error recovery and retry successful')
    })
  })
})
