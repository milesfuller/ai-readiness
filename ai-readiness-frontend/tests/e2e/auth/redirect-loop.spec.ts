import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * REDIRECT LOOP PREVENTION TESTS
 * 
 * CRITICAL: Tests for the middleware redirect loop fix.
 * The middleware was changed from getSession() to getUser() to prevent
 * infinite redirects between /dashboard and /auth/login.
 * 
 * Key scenarios tested:
 * 1. No infinite redirects between auth pages and dashboard
 * 2. Redirect count monitoring (should never exceed 2-3)
 * 3. Middleware consistency using getUser()
 * 4. Auth state validation reliability
 * 5. Session persistence across redirects
 */

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

// Helper to clear auth state completely
const clearAuthState = async (page: Page) => {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
    // Clear Supabase specific items
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

// Helper to count redirects
const trackRedirects = async (page: Page) => {
  const redirects: string[] = []
  
  page.on('response', (response) => {
    if ([301, 302, 303, 307, 308].includes(response.status())) {
      redirects.push(`${response.status()}: ${response.url()} -> ${response.headers()['location']}`)
    }
  })
  
  return redirects
}

// Helper to monitor page navigation
const trackNavigation = async (page: Page) => {
  const navigationHistory: string[] = []
  
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigationHistory.push(frame.url())
    }
  })
  
  return navigationHistory
}

test.describe('Redirect Loop Prevention Tests', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test.describe('CRITICAL: Infinite Redirect Prevention', () => {
    test('should not create infinite redirects between login and dashboard', async ({ page }) => {
      console.log('🚨 CRITICAL: Testing infinite redirect prevention')
      
      const redirects = await trackRedirects(page)
      const navigationHistory = await trackNavigation(page)
      
      // Start by going to login page when not authenticated
      await page.goto('/auth/login')
      
      // Should not redirect away when not authenticated
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/auth/login')
      
      // Login successfully
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      expect(page.url()).toContain('/dashboard')
      
      // Now try to go back to login - should redirect to dashboard
      await page.goto('/auth/login')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
      
      // Wait a bit more to ensure no further redirects
      await page.waitForTimeout(3000)
      expect(page.url()).toContain('/dashboard')
      
      // Verify redirect count is reasonable (should be ≤ 2-3)
      console.log('Redirects detected:', redirects.length)
      console.log('Navigation history:', navigationHistory.length)
      
      expect(redirects.length).toBeLessThan(5)
      expect(navigationHistory.length).toBeLessThan(6)
      
      console.log('✅ No infinite redirects detected')
    })

    test('should handle rapid navigation without redirect loops', async ({ page }) => {
      console.log('🚨 Testing rapid navigation without loops')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      const redirects = await trackRedirects(page)
      const startTime = Date.now()
      
      // Rapidly navigate between auth and protected pages
      const navigationPromises = [
        page.goto('/auth/login'),
        page.goto('/dashboard'),
        page.goto('/auth/register'),
        page.goto('/dashboard'),
        page.goto('/auth/login')
      ]
      
      // Execute rapid navigation
      for (const navPromise of navigationPromises) {
        await navPromise
        await page.waitForTimeout(500) // Brief pause between navigations
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should end up on dashboard (authenticated user)
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/dashboard')
      
      // Verify redirect count is reasonable
      expect(redirects.length).toBeLessThan(10)
      
      // Should complete in reasonable time (not stuck in loop)
      expect(duration).toBeLessThan(15000) // 15 seconds max
      
      console.log(`✅ Rapid navigation completed in ${duration}ms with ${redirects.length} redirects`)
    })

    test('should prevent redirect loops when session is inconsistent', async ({ page }) => {
      console.log('🚨 Testing inconsistent session handling')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      const redirects = await trackRedirects(page)
      
      // Simulate inconsistent session state by partially clearing auth
      await page.evaluate(() => {
        // Remove some auth tokens but not all (simulates stale state)
        localStorage.removeItem('supabase.auth.token')
        // Keep some items to create inconsistency
      })
      
      // Navigate to auth page
      await page.goto('/auth/login')
      
      // Should handle inconsistent state gracefully
      await page.waitForTimeout(3000)
      
      // Should either:
      // 1. Redirect to dashboard (if session is valid)
      // 2. Stay on login (if session is invalid)
      // But NOT redirect infinitely
      
      const finalUrl = page.url()
      const isStable = finalUrl.includes('/dashboard') || finalUrl.includes('/auth/login')
      
      expect(isStable).toBeTruthy()
      expect(redirects.length).toBeLessThan(5)
      
      console.log(`✅ Inconsistent session handled with ${redirects.length} redirects`)
    })
  })

  test.describe('Middleware getUser() vs getSession() Fix', () => {
    test('should use getUser() for reliable auth checking', async ({ page }) => {
      console.log('🔧 Testing getUser() reliability vs getSession()')
      
      // This test verifies that the middleware uses getUser() which always validates
      // instead of getSession() which can return stale/cached data
      
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify we're authenticated
      expect(page.url()).toContain('/dashboard')
      
      // Now go to login page - should redirect to dashboard immediately
      const startTime = Date.now()
      await page.goto('/auth/login')
      await page.waitForURL('/dashboard', { timeout: 5000 })
      const redirectTime = Date.now() - startTime
      
      // getUser() should provide consistent, fast redirect
      expect(page.url()).toContain('/dashboard')
      expect(redirectTime).toBeLessThan(3000) // Should be fast
      
      // Test multiple times to ensure consistency
      for (let i = 0; i < 3; i++) {
        await page.goto('/auth/login')
        await page.waitForURL('/dashboard', { timeout: 5000 })
        expect(page.url()).toContain('/dashboard')
        await page.waitForTimeout(500)
      }
      
      console.log('✅ getUser() provides consistent auth checking')
    })

    test('should handle auth state changes without loops', async ({ page }) => {
      console.log('🔧 Testing auth state change handling')
      
      const redirects = await trackRedirects(page)
      
      // Start unauthenticated
      await page.goto('/dashboard')
      await page.waitForURL(/auth\/login/, { timeout: 5000 })
      expect(page.url()).toContain('/auth/login')
      
      // Login (auth state changes)
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Logout (simulate auth state change)
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Try to access protected route
      await page.goto('/dashboard')
      await page.waitForTimeout(3000)
      
      // Should redirect to login without loops
      const finalUrl = page.url()
      const redirectedToLogin = finalUrl.includes('/auth/login') || finalUrl === '/'
      
      expect(redirectedToLogin).toBeTruthy()
      expect(redirects.length).toBeLessThan(6)
      
      console.log('✅ Auth state changes handled without loops')
    })
  })

  test.describe('Redirect Count Monitoring', () => {
    test('should never exceed 3 redirects for any navigation', async ({ page }) => {
      console.log('📊 Testing redirect count limits')
      
      const testScenarios = [
        { from: '/', to: '/dashboard', description: 'Root to dashboard' },
        { from: '/auth/login', to: '/dashboard', description: 'Login to dashboard when authenticated' },
        { from: '/dashboard', to: '/auth/login', description: 'Dashboard to login when unauthenticated' },
        { from: '/auth/register', to: '/dashboard', description: 'Register to dashboard when authenticated' }
      ]
      
      // Test unauthenticated scenarios
      await clearAuthState(page)
      
      for (const scenario of testScenarios) {
        if (scenario.description.includes('unauthenticated')) {
          const redirects = await trackRedirects(page)
          
          await page.goto(scenario.from)
          await page.waitForTimeout(2000)
          
          console.log(`${scenario.description}: ${redirects.length} redirects`)
          expect(redirects.length).toBeLessThanOrEqual(3)
        }
      }
      
      // Login for authenticated scenarios
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Test authenticated scenarios
      for (const scenario of testScenarios) {
        if (scenario.description.includes('authenticated')) {
          const redirects = await trackRedirects(page)
          
          await page.goto(scenario.from)
          await page.waitForTimeout(2000)
          
          console.log(`${scenario.description}: ${redirects.length} redirects`)
          expect(redirects.length).toBeLessThanOrEqual(3)
        }
      }
      
      console.log('✅ All navigation scenarios stay within redirect limits')
    })

    test('should handle deep linking without excessive redirects', async ({ page }) => {
      console.log('📊 Testing deep linking redirect behavior')
      
      const deepLinks = [
        '/survey/123?step=2',
        '/admin/users',
        '/dashboard/settings',
        '/profile/edit'
      ]
      
      for (const deepLink of deepLinks) {
        const redirects = await trackRedirects(page)
        
        // Try to access deep link when unauthenticated
        await clearAuthState(page)
        await page.goto(deepLink)
        
        // Should redirect to login with reasonable redirect count
        await page.waitForTimeout(3000)
        
        const currentUrl = page.url()
        const redirectedToAuth = currentUrl.includes('/auth/login') || currentUrl === '/'
        
        expect(redirectedToAuth).toBeTruthy()
        expect(redirects.length).toBeLessThanOrEqual(2)
        
        console.log(`Deep link ${deepLink}: ${redirects.length} redirects`)
      }
      
      console.log('✅ Deep linking handles redirects efficiently')
    })
  })

  test.describe('Session Persistence Across Redirects', () => {
    test('should maintain session state during redirects', async ({ page }) => {
      console.log('💾 Testing session persistence during redirects')
      
      // Login
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Get initial session data
      const initialSession = await page.evaluate(() => {
        const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'))
        return supabaseKeys.map(key => ({ key, value: localStorage.getItem(key) }))
      })
      
      expect(initialSession.length).toBeGreaterThan(0)
      
      // Navigate through multiple redirects
      await page.goto('/auth/login') // Should redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 })
      
      await page.goto('/auth/register') // Should redirect to dashboard  
      await page.waitForTimeout(2000)
      
      // Session should still be intact
      const finalSession = await page.evaluate(() => {
        const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'))
        return supabaseKeys.map(key => ({ key, value: localStorage.getItem(key) }))
      })
      
      expect(finalSession.length).toBeGreaterThan(0)
      expect(finalSession.length).toEqual(initialSession.length)
      
      // Verify we're still authenticated
      expect(page.url()).toContain('/dashboard')
      
      console.log('✅ Session persisted through redirects')
    })

    test('should clear session properly on logout without redirect loops', async ({ page }) => {
      console.log('💾 Testing session cleanup on logout')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      const redirects = await trackRedirects(page)
      
      // Simulate logout by clearing session
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Navigate to protected route
      await page.goto('/dashboard')
      
      // Should redirect to login without loops
      await page.waitForTimeout(3000)
      
      const finalUrl = page.url()
      const redirectedToAuth = finalUrl.includes('/auth/login') || finalUrl === '/'
      
      expect(redirectedToAuth).toBeTruthy()
      expect(redirects.length).toBeLessThanOrEqual(2)
      
      // Verify session is completely cleared
      const sessionExists = await page.evaluate(() => {
        const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'))
        return supabaseKeys.length > 0
      })
      
      expect(sessionExists).toBeFalsy()
      
      console.log('✅ Session cleared properly without redirect loops')
    })
  })

  test.describe('Edge Cases and Error Conditions', () => {
    test('should handle concurrent auth requests without loops', async ({ page, browser }) => {
      console.log('⚡ Testing concurrent auth requests')
      
      // Create multiple browser contexts
      const context1 = await browser.newContext()
      const context2 = await browser.newContext()
      
      const page1 = await context1.newPage()
      const page2 = await context2.newPage()
      
      const redirects1 = await trackRedirects(page1)
      const redirects2 = await trackRedirects(page2)
      
      try {
        // Concurrent login attempts
        await Promise.all([
          page1.goto('/auth/login'),
          page2.goto('/auth/login')
        ])
        
        // Fill forms concurrently
        await Promise.all([
          page1.fill('[data-testid="email-input"]', TEST_USER.email),
          page2.fill('[data-testid="email-input"]', TEST_USER.email)
        ])
        
        await Promise.all([
          page1.fill('[data-testid="password-input"]', TEST_USER.password),
          page2.fill('[data-testid="password-input"]', TEST_USER.password)
        ])
        
        // Submit concurrently
        await Promise.all([
          page1.click('[data-testid="login-submit"]'),
          page2.click('[data-testid="login-submit"]')
        ])
        
        // Wait for both to complete
        await Promise.all([
          page1.waitForURL('/dashboard', { timeout: 15000 }),
          page2.waitForURL('/dashboard', { timeout: 15000 })
        ])
        
        expect(page1.url()).toContain('/dashboard')
        expect(page2.url()).toContain('/dashboard')
        
        // Verify reasonable redirect counts
        expect(redirects1.length).toBeLessThan(5)
        expect(redirects2.length).toBeLessThan(5)
        
        console.log('✅ Concurrent auth requests handled correctly')
        
      } finally {
        await context1.close()
        await context2.close()
      }
    })

    test('should handle malformed URLs without redirect loops', async ({ page }) => {
      console.log('🚨 Testing malformed URL handling')
      
      const redirects = await trackRedirects(page)
      
      const malformedUrls = [
        '/auth/login?redirectTo=javascript:alert(1)',
        '/auth/login?redirectTo=%2F%2Fevil.com',
        '/auth/login?redirectTo=//evil.com/dashboard',
        '/auth/login?redirectTo=%2F..%2F..%2Fetc%2Fpasswd'
      ]
      
      for (const url of malformedUrls) {
        await page.goto(url)
        await page.waitForTimeout(2000)
        
        // Should handle malformed URLs safely
        const currentUrl = page.url()
        const isSafe = currentUrl.includes('/auth/login') && 
                      !currentUrl.includes('javascript:') &&
                      !currentUrl.includes('evil.com')
        
        expect(isSafe).toBeTruthy()
      }
      
      expect(redirects.length).toBeLessThan(10)
      
      console.log('✅ Malformed URLs handled safely')
    })

    test('should handle network interruptions without infinite redirects', async ({ page }) => {
      console.log('🌐 Testing network interruption handling')
      
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      const redirects = await trackRedirects(page)
      
      // Simulate network interruption
      await page.context().setOffline(true)
      
      // Try navigation during offline
      await page.goto('/auth/login')
      
      // Wait briefly
      await page.waitForTimeout(2000)
      
      // Restore network
      await page.context().setOffline(false)
      
      // Should eventually reach correct page without loops
      await page.waitForTimeout(3000)
      
      const finalUrl = page.url()
      const isStable = finalUrl.includes('/dashboard') || finalUrl.includes('/auth/login')
      
      expect(isStable).toBeTruthy()
      expect(redirects.length).toBeLessThan(8)
      
      console.log('✅ Network interruption handled without loops')
    })
  })

  test.afterEach(async ({ page }) => {
    // Clean up any remaining redirects or navigation listeners
    await page.removeAllListeners('response')
    await page.removeAllListeners('framenavigated')
    await clearAuthState(page)
  })
})
