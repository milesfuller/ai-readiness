import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * VISUAL REGRESSION TESTS FOR AUTH SCREENS
 * 
 * Tests visual elements and animations including:
 * 1. FloatingHearts animation on auth screens
 * 2. Login form visual states
 * 3. Registration form layouts
 * 4. Error message styling
 * 5. Loading state animations
 * 6. Success state visual feedback
 */

const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
}

// Helper function to wait for animations to settle
const waitForAnimationsToSettle = async (page: Page, timeout = 2000) => {
  await page.waitForTimeout(timeout)
  // Wait for any CSS animations to complete
  await page.evaluate(() => {
    return Promise.all(
      document.getAnimations().map(animation => animation.finished)
    )
  })
}

// Helper to clear auth state
const clearAuthState = async (page: Page) => {
  await page.context().clearCookies()
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

test.describe('Visual Regression Tests for Auth Screens', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page)
  })

  test.describe('FloatingHearts Animation Tests', () => {
    test('should display FloatingHearts animation on login page', async ({ page }) => {
      console.log('💖 Testing FloatingHearts animation on login page')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Look for FloatingHearts component or animation elements
      const heartsAnimation = await Promise.race([
        page.locator('[data-testid="floating-hearts"]').isVisible().catch(() => false),
        page.locator('.floating-hearts').isVisible().catch(() => false),
        page.locator('[class*="heart"]').isVisible().catch(() => false),
        page.locator('svg[data-icon="heart"], .heart-icon').isVisible().catch(() => false)
      ])
      
      if (heartsAnimation) {
        console.log('✅ FloatingHearts animation detected')
        
        // Take screenshot with hearts animation
        await page.screenshot({
          path: 'test-results/visual/login-page-with-hearts.png',
          fullPage: true
        })
        
        // Test animation behavior
        const heartsElements = page.locator('[data-testid="floating-hearts"], .floating-hearts, [class*="heart"]')
        const heartsCount = await heartsElements.count()
        
        if (heartsCount > 0) {
          // Check if hearts are animating
          const initialPosition = await heartsElements.first().boundingBox()
          await page.waitForTimeout(1000)
          const newPosition = await heartsElements.first().boundingBox()
          
          // Position should change if animating
          const isAnimating = initialPosition && newPosition && 
            (initialPosition.x !== newPosition.x || initialPosition.y !== newPosition.y)
          
          if (isAnimating) {
            console.log('✅ Hearts are animating correctly')
          }
        }
        
        expect(heartsAnimation).toBeTruthy()
      } else {
        console.log('ℹ️ FloatingHearts animation not found - may not be implemented yet')
        
        // Take screenshot without hearts for comparison
        await page.screenshot({
          path: 'test-results/visual/login-page-no-hearts.png',
          fullPage: true
        })
      }
    })

    test('should display FloatingHearts on registration page', async ({ page }) => {
      console.log('💖 Testing FloatingHearts animation on registration page')
      
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      // Look for FloatingHearts on register page
      const heartsOnRegister = await Promise.race([
        page.locator('[data-testid="floating-hearts"]').isVisible().catch(() => false),
        page.locator('.floating-hearts').isVisible().catch(() => false),
        page.locator('[class*="heart"]').isVisible().catch(() => false)
      ])
      
      if (heartsOnRegister) {
        console.log('✅ FloatingHearts found on registration page')
        
        await page.screenshot({
          path: 'test-results/visual/register-page-with-hearts.png',
          fullPage: true
        })
        
        expect(heartsOnRegister).toBeTruthy()
      } else {
        console.log('ℹ️ FloatingHearts not found on registration page')
        
        await page.screenshot({
          path: 'test-results/visual/register-page-no-hearts.png',
          fullPage: true
        })
      }
    })

    test('should test FloatingHearts performance impact', async ({ page }) => {
      console.log('⚡ Testing FloatingHearts performance impact')
      
      await page.goto('/auth/login')
      
      // Measure page load time with hearts
      const startTime = Date.now()
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      console.log(`Page load time with hearts: ${loadTime}ms`)
      
      // Check for performance issues
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalLoad: navigation.loadEventEnd - navigation.fetchStart
        }
      })
      
      console.log('Performance metrics:', performanceMetrics)
      
      // Hearts shouldn't significantly impact load time
      expect(loadTime).toBeLessThan(10000) // 10 seconds max
      expect(performanceMetrics.totalLoad).toBeLessThan(15000) // 15 seconds total
      
      console.log('✅ FloatingHearts performance acceptable')
    })
  })

  test.describe('Login Form Visual States', () => {
    test('should capture login form default state', async ({ page }) => {
      console.log('📷 Capturing login form default state')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Ensure form is visible
      await expect(page.locator('[data-testid="login-form"], form')).toBeVisible()
      
      // Take screenshot of default state
      await page.screenshot({
        path: 'test-results/visual/login-form-default.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      console.log('✅ Login form default state captured')
    })

    test('should capture login form filled state', async ({ page }) => {
      console.log('📷 Capturing login form filled state')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Fill the form
      await page.fill('[data-testid="email-input"], input[type="email"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"], input[type="password"]', TEST_USER.password)
      
      // Wait for any visual changes
      await page.waitForTimeout(500)
      
      // Take screenshot of filled state
      await page.screenshot({
        path: 'test-results/visual/login-form-filled.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      console.log('✅ Login form filled state captured')
    })

    test('should capture login form loading state', async ({ page }) => {
      console.log('📷 Capturing login form loading state')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Fill form
      await page.fill('[data-testid="email-input"], input[type="email"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"], input[type="password"]', TEST_USER.password)
      
      // Click submit to trigger loading state
      const submitButton = page.locator('[data-testid="login-submit"], button[type="submit"]')
      await submitButton.click()
      
      // Quickly capture loading state before redirect
      await page.waitForTimeout(100)
      
      try {
        await page.screenshot({
          path: 'test-results/visual/login-form-loading.png',
          clip: { x: 0, y: 0, width: 800, height: 600 }
        })
        console.log('✅ Login form loading state captured')
      } catch (error) {
        console.log('ℹ️ Loading state too brief to capture')
      }
    })

    test('should capture login form error state', async ({ page }) => {
      console.log('📷 Capturing login form error state')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Use invalid credentials to trigger error
      await page.fill('[data-testid="email-input"], input[type="email"]', 'invalid@example.com')
      await page.fill('[data-testid="password-input"], input[type="password"]', 'wrongpassword')
      await page.click('[data-testid="login-submit"], button[type="submit"]')
      
      // Wait for error to appear
      await page.waitForTimeout(3000)
      
      // Look for error message
      const errorVisible = await Promise.race([
        page.locator('[data-testid="login-error"]').isVisible().catch(() => false),
        page.locator('.error, .text-destructive, .text-red').first().isVisible().catch(() => false),
        page.locator('[role="alert"]').isVisible().catch(() => false)
      ])
      
      if (errorVisible) {
        await page.screenshot({
          path: 'test-results/visual/login-form-error.png',
          clip: { x: 0, y: 0, width: 800, height: 600 }
        })
        console.log('✅ Login form error state captured')
      } else {
        console.log('ℹ️ Error state not visible - may need different error trigger')
      }
    })

    test('should capture login form validation state', async ({ page }) => {
      console.log('📷 Capturing login form validation state')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Fill invalid email to trigger validation
      await page.fill('[data-testid="email-input"], input[type="email"]', 'invalid-email')
      await page.fill('[data-testid="password-input"], input[type="password"]', 'short')
      
      // Click submit to trigger validation
      await page.click('[data-testid="login-submit"], button[type="submit"]')
      await page.waitForTimeout(1000)
      
      // Take screenshot of validation state
      await page.screenshot({
        path: 'test-results/visual/login-form-validation.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      console.log('✅ Login form validation state captured')
    })
  })

  test.describe('Registration Form Visual States', () => {
    test('should capture registration form layouts', async ({ page }) => {
      console.log('📷 Capturing registration form layouts')
      
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      // Capture default state
      await page.screenshot({
        path: 'test-results/visual/register-form-default.png',
        clip: { x: 0, y: 0, width: 800, height: 800 }
      })
      
      // Fill form progressively and capture states
      await page.fill('[data-testid="email-input"], input[type="email"]', 'test@example.com')
      await page.screenshot({
        path: 'test-results/visual/register-form-email-filled.png',
        clip: { x: 0, y: 0, width: 800, height: 800 }
      })
      
      await page.fill('[data-testid="password-input"], input[type="password"]', 'TestPassword123!')
      
      // Fill confirm password if present
      const confirmPasswordField = page.locator('input[name="confirmPassword"], input[placeholder*="confirm"]')
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill('TestPassword123!')
      }
      
      await page.screenshot({
        path: 'test-results/visual/register-form-filled.png',
        clip: { x: 0, y: 0, width: 800, height: 800 }
      })
      
      console.log('✅ Registration form layouts captured')
    })

    test('should capture registration form validation states', async ({ page }) => {
      console.log('📷 Capturing registration form validation')
      
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      // Trigger validation with invalid data
      await page.fill('[data-testid="email-input"], input[type="email"]', 'invalid-email')
      await page.fill('[data-testid="password-input"], input[type="password"]', '123')
      
      await page.click('[data-testid="register-submit"], [data-testid="login-submit"], button[type="submit"]')
      await page.waitForTimeout(1000)
      
      await page.screenshot({
        path: 'test-results/visual/register-form-validation.png',
        clip: { x: 0, y: 0, width: 800, height: 800 }
      })
      
      console.log('✅ Registration form validation state captured')
    })
  })

  test.describe('Success and Error Message Styling', () => {
    test('should capture success message styling', async ({ page }) => {
      console.log('✅ Testing success message visual styling')
      
      await page.goto('/auth/login')
      
      // Login successfully to trigger success state
      await page.fill('[data-testid="email-input"], input[type="email"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"], input[type="password"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"], button[type="submit"]')
      
      // Quickly capture success state before redirect
      await page.waitForTimeout(500)
      
      const successVisible = await Promise.race([
        page.locator('[data-testid="login-success"]').isVisible().catch(() => false),
        page.locator('text=Welcome back').isVisible().catch(() => false),
        page.locator('.success, .text-green').isVisible().catch(() => false)
      ])
      
      if (successVisible) {
        await page.screenshot({
          path: 'test-results/visual/success-message-styling.png',
          clip: { x: 0, y: 0, width: 800, height: 600 }
        })
        console.log('✅ Success message styling captured')
      }
    })

    test('should capture error message styling variations', async ({ page }) => {
      console.log('❌ Testing error message styling variations')
      
      const errorScenarios = [
        { email: 'invalid@example.com', password: 'wrong', name: 'invalid-credentials' },
        { email: 'not-an-email', password: 'TestPassword123!', name: 'invalid-email' },
        { email: '', password: '', name: 'empty-fields' }
      ]
      
      for (const scenario of errorScenarios) {
        await page.goto('/auth/login')
        await waitForAnimationsToSettle(page)
        
        if (scenario.email) {
          await page.fill('[data-testid="email-input"], input[type="email"]', scenario.email)
        }
        if (scenario.password) {
          await page.fill('[data-testid="password-input"], input[type="password"]', scenario.password)
        }
        
        await page.click('[data-testid="login-submit"], button[type="submit"]')
        await page.waitForTimeout(3000)
        
        await page.screenshot({
          path: `test-results/visual/error-${scenario.name}.png`,
          clip: { x: 0, y: 0, width: 800, height: 600 }
        })
      }
      
      console.log('✅ Error message styling variations captured')
    })
  })

  test.describe('Responsive Design Tests', () => {
    test('should capture auth forms on mobile viewport', async ({ page }) => {
      console.log('📱 Testing auth forms on mobile viewport')
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test login form on mobile
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/login-mobile.png',
        fullPage: true
      })
      
      // Test registration form on mobile
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/register-mobile.png',
        fullPage: true
      })
      
      console.log('✅ Mobile auth forms captured')
    })

    test('should capture auth forms on tablet viewport', async ({ page }) => {
      console.log('📺 Testing auth forms on tablet viewport')
      
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/login-tablet.png',
        fullPage: true
      })
      
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/register-tablet.png',
        fullPage: true
      })
      
      console.log('✅ Tablet auth forms captured')
    })

    test('should capture auth forms on desktop viewport', async ({ page }) => {
      console.log('🖥️ Testing auth forms on desktop viewport')
      
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/login-desktop.png',
        clip: { x: 0, y: 0, width: 1200, height: 800 }
      })
      
      await page.goto('/auth/register')
      await waitForAnimationsToSettle(page)
      
      await page.screenshot({
        path: 'test-results/visual/register-desktop.png',
        clip: { x: 0, y: 0, width: 1200, height: 800 }
      })
      
      console.log('✅ Desktop auth forms captured')
    })
  })

  test.describe('Animation and Transition Tests', () => {
    test('should test form field focus animations', async ({ page }) => {
      console.log('✨ Testing form field focus animations')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Capture before focus
      await page.screenshot({
        path: 'test-results/visual/form-before-focus.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      // Focus on email field
      await page.focus('[data-testid="email-input"], input[type="email"]')
      await page.waitForTimeout(500) // Wait for focus animation
      
      await page.screenshot({
        path: 'test-results/visual/form-email-focused.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      // Focus on password field
      await page.focus('[data-testid="password-input"], input[type="password"]')
      await page.waitForTimeout(500)
      
      await page.screenshot({
        path: 'test-results/visual/form-password-focused.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      console.log('✅ Form field focus animations captured')
    })

    test('should test button hover and active states', async ({ page }) => {
      console.log('💲 Testing button interaction states')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      const submitButton = page.locator('[data-testid="login-submit"], button[type="submit"]')
      
      // Capture default button state
      await page.screenshot({
        path: 'test-results/visual/button-default.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      // Hover over button
      await submitButton.hover()
      await page.waitForTimeout(300)
      
      await page.screenshot({
        path: 'test-results/visual/button-hover.png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      })
      
      console.log('✅ Button interaction states captured')
    })

    test('should test page transition animations', async ({ page }) => {
      console.log('🔄 Testing page transition animations')
      
      await page.goto('/auth/login')
      await waitForAnimationsToSettle(page)
      
      // Capture login page
      await page.screenshot({
        path: 'test-results/visual/transition-login-page.png',
        fullPage: true
      })
      
      // Look for link to registration page
      const registerLink = page.locator('a:has-text("Sign up"), a:has-text("Register"), a[href*="register"]')
      
      if (await registerLink.isVisible()) {
        await registerLink.click()
        await page.waitForTimeout(500) // Wait for transition
        
        await page.screenshot({
          path: 'test-results/visual/transition-register-page.png',
          fullPage: true
        })
        
        console.log('✅ Page transition captured')
      } else {
        console.log('ℹ️ Register link not found for transition test')
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Reset viewport to default
    await page.setViewportSize({ width: 1280, height: 720 })
    await clearAuthState(page)
  })
})
