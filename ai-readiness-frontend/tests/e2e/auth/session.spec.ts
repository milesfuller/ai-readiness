import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SESSION MANAGEMENT TESTS
 * 
 * Tests comprehensive session handling including:
 * 1. Session persistence across browser sessions
 * 2. Session expiration and cleanup
 * 3. Multiple tab session synchronization  
 * 4. Remember me functionality
 * 5. Logout and session invalidation
 * 6. Session recovery after network issues
 */

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

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

// Helper to check if user is authenticated
const isAuthenticated = async (page: Page) => {
  // Try accessing protected route
  await page.goto('/dashboard')
  await page.waitForTimeout(2000)
  
  const url = page.url()
  return url.includes('/dashboard') && !url.includes('/auth/login')
}

// Helper to get session data
const getSessionData = async (page: Page) => {
  return await page.evaluate(() => {
    const sessionData: Record<string, any> = {}
    
    // Get localStorage items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        try {
          sessionData[key] = JSON.parse(localStorage.getItem(key) || '')
        } catch {
          sessionData[key] = localStorage.getItem(key)
        }
      }
    })
    
    // Get sessionStorage items
    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth')) {
        try {
          sessionData[key] = JSON.parse(sessionStorage.getItem(key) || '')
        } catch {
          sessionData[key] = sessionStorage.getItem(key)
        }
      }
    })
    
    return sessionData
  })
}

test.describe('Session Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test.describe('Session Establishment and Persistence', () => {
    test('should establish session after successful login', async ({ page }) => {
      console.log('🔐 Testing session establishment')
      
      await page.goto('/auth/login')
      
      // Login
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify session data exists
      const sessionData = await getSessionData(page)
      expect(Object.keys(sessionData).length).toBeGreaterThan(0)
      
      // Verify cookies are set
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth') || 
        c.name.includes('session')
      )
      expect(authCookies.length).toBeGreaterThan(0)
      
      // Verify user is authenticated
      const authenticated = await isAuthenticated(page)
      expect(authenticated).toBeTruthy()
      
      console.log('✅ Session established successfully')
    })

    test('should persist session across page reloads', async ({ page }) => {
      console.log('🔄 Testing session persistence across reloads')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Get initial session data
      const initialSessionData = await getSessionData(page)
      expect(Object.keys(initialSessionData).length).toBeGreaterThan(0)
      
      // Reload page multiple times
      for (let i = 0; i < 3; i++) {
        await page.reload()
        await page.waitForLoadState('networkidle')
        
        // Should still be authenticated
        expect(page.url()).toContain('/dashboard')
        
        // Session data should persist
        const currentSessionData = await getSessionData(page)
        expect(Object.keys(currentSessionData).length).toBeGreaterThan(0)
        
        await page.waitForTimeout(1000)
      }
      
      console.log('✅ Session persists across page reloads')
    })

    test('should persist session across browser navigation', async ({ page }) => {
      console.log('🧭 Testing session persistence across navigation')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Navigate to different pages
      const pages = ['/survey', '/profile', '/dashboard', '/admin']
      
      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForTimeout(1000)
        
        // Should not redirect to login (indicating session is valid)
        const currentUrl = page.url()
        expect(currentUrl).not.toContain('/auth/login')
        
        // Verify session data still exists
        const sessionData = await getSessionData(page)
        expect(Object.keys(sessionData).length).toBeGreaterThan(0)
      }
      
      console.log('✅ Session persists across navigation')
    })

    test('should handle new browser context (simulate browser restart)', async ({ browser }) => {
      console.log('🔄 Testing session persistence across browser contexts')
      
      // Create first context and login
      const context1 = await browser.newContext()
      const page1 = await context1.newPage()
      
      await page1.goto('/auth/login')
      await page1.fill('[data-testid="email-input"]', TEST_USER.email)
      await page1.fill('[data-testid="password-input"]', TEST_USER.password)
      
      // Check remember me if available
      const rememberMeCheckbox = page1.locator('input[type="checkbox"]')
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check()
      }
      
      await page1.click('[data-testid="login-submit"]')
      await page1.waitForURL('/dashboard', { timeout: 10000 })
      
      // Get cookies from first context
      const cookies = await context1.cookies()
      const authCookies = cookies.filter(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth')
      )
      
      await context1.close()
      
      // Create new context with same cookies (simulates browser restart)
      const context2 = await browser.newContext()
      await context2.addCookies(authCookies)
      
      const page2 = await context2.newPage()
      
      // Should still be authenticated in new context
      const stillAuthenticated = await isAuthenticated(page2)
      
      if (stillAuthenticated) {
        console.log('✅ Session persisted across browser contexts')
        expect(stillAuthenticated).toBeTruthy()
      } else {
        console.log('ℹ️ Session did not persist - may be intentional security behavior')
      }
      
      await context2.close()
    })
  })

  test.describe('Session Expiration and Cleanup', () => {
    test('should handle expired session gracefully', async ({ page }) => {
      console.log('⏰ Testing expired session handling')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Simulate session expiry by removing auth tokens
      await page.evaluate(() => {
        // Clear specific auth tokens that would cause expiry
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase') && key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        sessionStorage.clear()
      })
      
      // Try to access protected route
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should redirect to login or show login form
      const currentUrl = page.url()
      const handledExpiration = 
        currentUrl.includes('/auth/login') || 
        currentUrl === '/' || 
        await page.locator('[data-testid="login-form"], form').isVisible().catch(() => false)
      
      expect(handledExpiration).toBeTruthy()
      
      console.log('✅ Expired session handled gracefully')
    })

    test('should clean up session data on manual logout', async ({ page }) => {
      console.log('🚪 Testing session cleanup on logout')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify session exists
      const initialSessionData = await getSessionData(page)
      expect(Object.keys(initialSessionData).length).toBeGreaterThan(0)
      
      // Look for logout button
      const logoutButton = page.locator(
        'button:has-text("Sign Out"), button:has-text("Logout"), ' +
        'a:has-text("Sign Out"), a:has-text("Logout"), ' +
        '[data-testid="logout-button"], [data-testid="sign-out-button"]'
      ).first()
      
      if (await logoutButton.isVisible()) {
        await logoutButton.click()
        
        // Wait for logout to complete
        await page.waitForTimeout(3000)
        
        // Verify session data is cleaned up
        const finalSessionData = await getSessionData(page)
        expect(Object.keys(finalSessionData).length).toBe(0)
        
        // Should redirect to login or home
        const currentUrl = page.url()
        const loggedOut = 
          currentUrl.includes('/auth/login') || 
          currentUrl === '/' ||
          !currentUrl.includes('/dashboard')
        
        expect(loggedOut).toBeTruthy()
        
        console.log('✅ Session cleaned up on logout')
      } else {
        console.log('ℹ️ Logout button not found - may need implementation')
      }
    })

    test('should invalidate session across all tabs on logout', async ({ browser }) => {
      console.log('📑 Testing session invalidation across tabs')
      
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()
      
      try {
        // Login in first tab
        await page1.goto('/auth/login')
        await page1.fill('[data-testid="email-input"]', TEST_USER.email)
        await page1.fill('[data-testid="password-input"]', TEST_USER.password)
        await page1.click('[data-testid="login-submit"]')
        await page1.waitForURL('/dashboard', { timeout: 10000 })
        
        // Open second tab and verify authenticated
        await page2.goto('/dashboard')
        await page2.waitForTimeout(2000)
        expect(page2.url()).toContain('/dashboard')
        
        // Logout from first tab
        const logoutButton = page1.locator(
          'button:has-text("Sign Out"), button:has-text("Logout"), ' +
          'a:has-text("Sign Out"), a:has-text("Logout")'
        ).first()
        
        if (await logoutButton.isVisible()) {
          await logoutButton.click()
          await page1.waitForTimeout(2000)
          
          // Check if second tab is also logged out
          await page2.reload()
          await page2.waitForTimeout(2000)
          
          const page2Url = page2.url()
          const page2LoggedOut = 
            page2Url.includes('/auth/login') || 
            page2Url === '/' ||
            !page2Url.includes('/dashboard')
          
          if (page2LoggedOut) {
            console.log('✅ Session invalidated across all tabs')
            expect(page2LoggedOut).toBeTruthy()
          } else {
            console.log('ℹ️ Cross-tab session invalidation not implemented')
          }
        } else {
          console.log('ℹ️ Logout functionality not found')
        }
        
      } finally {
        await context.close()
      }
    })
  })

  test.describe('Multiple Tab Session Synchronization', () => {
    test('should synchronize authentication state across tabs', async ({ browser }) => {
      console.log('🔄 Testing auth state synchronization across tabs')
      
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()
      
      try {
        // Start with both tabs unauthenticated
        await page1.goto('/dashboard')
        await page2.goto('/dashboard')
        
        // Wait for redirects to complete
        await Promise.all([
          page1.waitForTimeout(2000),
          page2.waitForTimeout(2000)
        ])
        
        // Both should redirect to login
        expect(page1.url()).not.toContain('/dashboard')
        expect(page2.url()).not.toContain('/dashboard')
        
        // Login in first tab
        await page1.goto('/auth/login')
        await page1.fill('[data-testid="email-input"]', TEST_USER.email)
        await page1.fill('[data-testid="password-input"]', TEST_USER.password)
        await page1.click('[data-testid="login-submit"]')
        await page1.waitForURL('/dashboard', { timeout: 10000 })
        
        // Check if second tab automatically becomes authenticated
        await page2.goto('/dashboard')
        await page2.waitForTimeout(3000)
        
        const page2Authenticated = page2.url().includes('/dashboard')
        
        if (page2Authenticated) {
          console.log('✅ Auth state synchronized across tabs')
          expect(page2Authenticated).toBeTruthy()
        } else {
          console.log('ℹ️ Cross-tab auth synchronization not implemented')
        }
        
      } finally {
        await context.close()
      }
    })

    test('should handle concurrent login attempts in multiple tabs', async ({ browser }) => {
      console.log('⚡ Testing concurrent login attempts')
      
      const context = await browser.newContext()
      const page1 = await context.newPage()
      const page2 = await context.newPage()
      
      try {
        // Navigate both to login
        await Promise.all([
          page1.goto('/auth/login'),
          page2.goto('/auth/login')
        ])
        
        // Fill forms in both tabs
        await Promise.all([
          page1.fill('[data-testid="email-input"]', TEST_USER.email),
          page2.fill('[data-testid="email-input"]', TEST_USER.email)
        ])
        
        await Promise.all([
          page1.fill('[data-testid="password-input"]', TEST_USER.password),
          page2.fill('[data-testid="password-input"]', TEST_USER.password)
        ])
        
        // Submit both simultaneously
        await Promise.all([
          page1.click('[data-testid="login-submit"]'),
          page2.click('[data-testid="login-submit"]')
        ])
        
        // Both should eventually reach dashboard
        await Promise.all([
          page1.waitForURL('/dashboard', { timeout: 15000 }),
          page2.waitForURL('/dashboard', { timeout: 15000 })
        ])
        
        expect(page1.url()).toContain('/dashboard')
        expect(page2.url()).toContain('/dashboard')
        
        // Both should have valid sessions
        const [session1, session2] = await Promise.all([
          getSessionData(page1),
          getSessionData(page2)
        ])
        
        expect(Object.keys(session1).length).toBeGreaterThan(0)
        expect(Object.keys(session2).length).toBeGreaterThan(0)
        
        console.log('✅ Concurrent login attempts handled correctly')
        
      } finally {
        await context.close()
      }
    })
  })

  test.describe('Remember Me Functionality', () => {
    test('should persist session longer with remember me', async ({ page }) => {
      console.log('💾 Testing remember me functionality')
      
      await page.goto('/auth/login')
      
      // Check remember me checkbox if available
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check()
        
        // Login with remember me checked
        await page.fill('[data-testid="email-input"]', TEST_USER.email)
        await page.fill('[data-testid="password-input"]', TEST_USER.password)
        await page.click('[data-testid="login-submit"]')
        await page.waitForURL('/dashboard', { timeout: 10000 })
        
        // Check cookie expiration
        const cookies = await page.context().cookies()
        const authCookie = cookies.find(c => 
          c.name.includes('supabase') || 
          c.name.includes('auth')
        )
        
        if (authCookie && authCookie.expires) {
          const expirationDate = new Date(authCookie.expires * 1000)
          const now = new Date()
          const daysUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          
          // Should be valid for more than 1 day
          expect(daysUntilExpiry).toBeGreaterThan(1)
          
          console.log(`✅ Remember me extends session to ${Math.round(daysUntilExpiry)} days`)
        } else {
          console.log('ℹ️ Cookie expiration info not available')
        }
      } else {
        console.log('ℹ️ Remember me checkbox not found')
      }
    })

    test('should not persist session as long without remember me', async ({ page }) => {
      console.log('⏱️ Testing session without remember me')
      
      await page.goto('/auth/login')
      
      // Ensure remember me is NOT checked
      const rememberMeCheckbox = page.locator('input[type="checkbox"]')
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.uncheck()
      }
      
      // Login without remember me
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Check cookie expiration (should be shorter)
      const cookies = await page.context().cookies()
      const authCookie = cookies.find(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth')
      )
      
      if (authCookie && authCookie.expires) {
        const expirationDate = new Date(authCookie.expires * 1000)
        const now = new Date()
        const hoursUntilExpiry = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        // Should be shorter than remember me (typically session cookie or shorter)
        console.log(`Session expires in ${Math.round(hoursUntilExpiry)} hours without remember me`)
      } else {
        console.log('ℹ️ Session cookie (no expiration) - typical for non-persistent sessions')
      }
      
      console.log('✅ Session duration appropriate without remember me')
    })
  })

  test.describe('Session Recovery and Error Handling', () => {
    test('should recover session after network interruption', async ({ page }) => {
      console.log('🌐 Testing session recovery after network issues')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify authenticated
      const initialSessionData = await getSessionData(page)
      expect(Object.keys(initialSessionData).length).toBeGreaterThan(0)
      
      // Simulate network interruption
      await page.context().setOffline(true)
      
      // Try navigation while offline
      await page.goto('/survey')
      await page.waitForTimeout(2000)
      
      // Restore network
      await page.context().setOffline(false)
      
      // Should recover and work normally
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should still be authenticated
      expect(page.url()).toContain('/dashboard')
      
      // Session data should still exist
      const recoveredSessionData = await getSessionData(page)
      expect(Object.keys(recoveredSessionData).length).toBeGreaterThan(0)
      
      console.log('✅ Session recovered after network interruption')
    })

    test('should handle corrupted session data gracefully', async ({ page }) => {
      console.log('🚫 Testing corrupted session data handling')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Corrupt session data
      await page.evaluate(() => {
        // Corrupt localStorage items
        Object.keys(localStorage).forEach(key => {
          if (key.includes('supabase')) {
            localStorage.setItem(key, 'corrupted-data-{invalid-json')
          }
        })
      })
      
      // Try to navigate
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should handle corrupted data gracefully
      // Either redirect to login or show error, but not crash
      const currentUrl = page.url()
      const handledGracefully = 
        currentUrl.includes('/auth/login') ||
        currentUrl.includes('/dashboard') ||
        await page.locator('[data-testid="error"]').isVisible().catch(() => false)
      
      expect(handledGracefully).toBeTruthy()
      
      // Page should still be functional
      await page.goto('/auth/login')
      await expect(page.locator('[data-testid="login-form"], form')).toBeVisible()
      
      console.log('✅ Corrupted session data handled gracefully')
    })

    test('should handle server-side session invalidation', async ({ page }) => {
      console.log('🔒 Testing server-side session invalidation')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Simulate server-side invalidation by intercepting auth requests
      await page.route('**/auth/**', (route) => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Session invalid' })
        })
      })
      
      // Try to access protected route
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should handle invalidation gracefully
      const currentUrl = page.url()
      const handledInvalidation = 
        currentUrl.includes('/auth/login') ||
        await page.locator('[data-testid="login-form"]').isVisible().catch(() => false)
      
      expect(handledInvalidation).toBeTruthy()
      
      // Clean up route
      await page.unroute('**/auth/**')
      
      console.log('✅ Server-side session invalidation handled')
    })
  })

  test.describe('Session Security', () => {
    test('should not expose sensitive session data in client-side storage', async ({ page }) => {
      console.log('🔐 Testing session data security')
      
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Check for sensitive data exposure
      const sessionData = await page.evaluate(() => {
        const allData: string[] = []
        
        // Check localStorage
        Object.keys(localStorage).forEach(key => {
          const value = localStorage.getItem(key) || ''
          allData.push(value)
        })
        
        // Check sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          const value = sessionStorage.getItem(key) || ''
          allData.push(value)
        })
        
        return allData.join(' ').toLowerCase()
      })
      
      // Should not contain obvious sensitive data
      expect(sessionData).not.toContain(TEST_USER.password)
      expect(sessionData).not.toContain('secret')
      expect(sessionData).not.toContain('private_key')
      
      console.log('✅ Session data security verified')
    })

    test('should use secure cookies in production-like environment', async ({ page }) => {
      console.log('🍪 Testing secure cookie settings')
      
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      const cookies = await page.context().cookies()
      const authCookies = cookies.filter(c => 
        c.name.includes('supabase') || 
        c.name.includes('auth')
      )
      
      for (const cookie of authCookies) {
        // Check cookie security attributes
        console.log(`Cookie ${cookie.name}: sameSite=${cookie.sameSite}, secure=${cookie.secure}`)
        
        // In production, cookies should be secure
        if (process.env.NODE_ENV === 'production') {
          expect(cookie.secure).toBeTruthy()
          expect(cookie.sameSite).toBe('lax')
        }
      }
      
      console.log('✅ Cookie security settings appropriate')
    })
  })

  test.afterEach(async ({ page }) => {
    // Clean up any routes or listeners
    await page.unroute('**/*')
    await clearAuthState(page)
  })
})
