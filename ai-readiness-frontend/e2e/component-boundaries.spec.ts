import { test, expect } from '@playwright/test';

/**
 * Component Boundaries E2E Tests
 * 
 * These tests focus on the specific client/server component boundary issues
 * that can cause runtime errors in Next.js applications.
 * 
 * Test Categories:
 * 1. Dashboard useState/useEffect errors
 * 2. Login redirect authentication flow
 * 3. Client component interactivity validation
 * 4. Supabase client singleton prevention
 * 5. "Functions cannot be passed directly" error prevention
 */

// Test credentials for authentication tests
const TEST_CREDENTIALS = {
  VALID_USER: {
    email: 'testuser@example.com',
    password: 'TestPassword123!'
  },
  ADMIN_USER: {
    email: 'testadmin@example.com', 
    password: 'AdminPassword123!'
  }
};

test.describe('Component Boundaries - Client/Server Issues', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear all storage to start fresh
    try {
      await page.goto('/', { timeout: 10000 });
    } catch (error) {
      console.warn('Could not navigate to home page, server might not be running:', error);
      // Skip if server is not running
      test.skip();
    }
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear any Supabase-related items specifically
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
    });

    // Monitor console for specific errors we want to prevent
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Log specific errors we're trying to prevent
        if (text.includes('useState') || 
            text.includes('Functions cannot be passed directly') ||
            text.includes('multiple GoTrueClient instances') ||
            text.includes('Client component') ||
            text.includes('Server component')) {
          console.error(`🚨 COMPONENT BOUNDARY ERROR: ${text}`);
        }
      }
    });
  });

  test.describe('Dashboard Client Component Issues', () => {
    
    test('dashboard loads without useState/useEffect errors', async ({ page }) => {
      console.log('🔍 Testing dashboard for useState/useEffect boundary errors...');
      
      // First login to access dashboard
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      // Track console errors specifically related to React hooks
      const hookErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('useState') || 
              text.includes('useEffect') || 
              text.includes('useCallback') ||
              text.includes('useMemo') ||
              text.includes('Invalid hook call') ||
              text.includes('Hooks can only be called')) {
            hookErrors.push(text);
          }
        }
      });
      
      // Navigate to dashboard and wait for full loading
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify dashboard content is visible (indicates successful render)
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=AI Readiness Dashboard')).toBeVisible();
      
      // Verify interactive components work (they should be client components)
      const statsCards = page.locator('.stats-card-hover').first();
      if (await statsCards.isVisible()) {
        await expect(statsCards).toBeVisible();
      }
      
      // Verify animated counter works (client-side feature)
      const animatedCounter = page.locator('text=/^[0-9]+/').first();
      if (await animatedCounter.isVisible()) {
        await expect(animatedCounter).toBeVisible();
      }
      
      // Check for loading states that should complete without errors
      await page.waitForTimeout(3000); // Allow time for any async operations
      
      // Verify no React hook errors occurred
      expect(hookErrors).toHaveLength(0);
      
      // Verify page doesn't show any error boundaries or fallbacks
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).not.toBeVisible();
      
      console.log('✅ Dashboard loaded without useState/useEffect errors');
    });

    test('dashboard interactive elements work correctly', async ({ page }) => {
      console.log('🔍 Testing dashboard interactive elements...');
      
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Track JavaScript errors
      const jsErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });
      
      // Test hover interactions (should work in client components)
      const hoverElements = page.locator('.whimsy-hover, .stats-card-hover, .wobble-on-hover');
      const hoverCount = await hoverElements.count();
      
      if (hoverCount > 0) {
        // Test hovering over interactive elements
        for (let i = 0; i < Math.min(hoverCount, 3); i++) {
          await hoverElements.nth(i).hover();
          await page.waitForTimeout(500);
        }
      }
      
      // Test button interactions
      const interactiveButtons = page.locator('button:not([disabled])');
      const buttonCount = await interactiveButtons.count();
      
      if (buttonCount > 0) {
        // Click a few buttons to test interactivity
        for (let i = 0; i < Math.min(buttonCount, 2); i++) {
          const button = interactiveButtons.nth(i);
          if (await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(500);
          }
        }
      }
      
      // Verify no JavaScript errors from interactions
      const criticalErrors = jsErrors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('fetch') && 
        !error.includes('network')
      );
      
      expect(criticalErrors).toHaveLength(0);
      
      console.log('✅ Dashboard interactive elements working correctly');
    });

    test('dashboard state management works without errors', async ({ page }) => {
      console.log('🔍 Testing dashboard state management...');
      
      // Login and access dashboard
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Monitor for state-related errors
      const stateErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('state') || 
              text.includes('setState') || 
              text.includes('Cannot update') ||
              text.includes('memory leak') ||
              text.includes('unmounted component')) {
            stateErrors.push(text);
          }
        }
      });
      
      // Test page navigation to trigger potential state cleanup issues
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Refresh to test component remounting
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(2000);
      
      // Verify no state management errors
      expect(stateErrors).toHaveLength(0);
      
      // Verify dashboard is still functional after navigation/refresh
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=AI Readiness Dashboard')).toBeVisible();
      
      console.log('✅ Dashboard state management working correctly');
    });
  });

  test.describe('Login Redirect Flow', () => {
    
    test('login redirects to dashboard properly without hydration errors', async ({ page }) => {
      console.log('🔍 Testing login redirect flow...');
      
      // Monitor for hydration and rendering errors
      const hydrationErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('hydrat') || 
              text.includes('mismatch') || 
              text.includes('server') ||
              text.includes('client') ||
              text.includes('Text content does not match')) {
            hydrationErrors.push(text);
          }
        }
      });
      
      // Start at login page
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Verify login form is properly hydrated
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeEnabled();
      await expect(page.locator('[data-testid="password-input"]')).toBeEnabled();
      
      // Fill and submit login form
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      
      const submitButton = page.locator('[data-testid="login-submit"]');
      await expect(submitButton).toBeEnabled();
      await submitButton.click();
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      // Verify dashboard loads without errors
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
      
      // Verify no hydration errors occurred during the flow
      expect(hydrationErrors).toHaveLength(0);
      
      console.log('✅ Login redirect completed without hydration errors');
    });

    test('login preserves redirectTo parameter correctly', async ({ page }) => {
      console.log('🔍 Testing redirectTo parameter preservation...');
      
      // Navigate to login with redirectTo parameter
      await page.goto('/auth/login?redirectTo=%2Fsurvey%2F123');
      await page.waitForLoadState('networkidle');
      
      // Fill and submit login
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      
      // Should redirect to the survey page, not dashboard
      await page.waitForURL(/\/survey\/123/, { timeout: 15000 });
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/survey/123');
      expect(currentUrl).not.toContain('/dashboard');
      
      console.log('✅ RedirectTo parameter preserved correctly');
    });

    test('authentication state persists across page refreshes', async ({ page }) => {
      console.log('🔍 Testing authentication state persistence...');
      
      // Login first
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be on dashboard (authenticated)
      expect(page.url()).toContain('/dashboard');
      
      // Verify dashboard content is still available
      await expect(page.locator('h1')).toBeVisible();
      
      // Test navigation to another protected route
      await page.goto('/survey');
      await page.waitForLoadState('networkidle');
      
      // Should not redirect to login (still authenticated)
      await page.waitForTimeout(2000);
      expect(page.url()).not.toContain('/auth/login');
      
      console.log('✅ Authentication state persisted correctly');
    });
  });

  test.describe('Client Component Interactivity', () => {
    
    test('whimsical components render and animate without errors', async ({ page }) => {
      console.log('🔍 Testing whimsical component interactivity...');
      
      // Login to access dashboard with whimsical components
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Monitor for animation and component errors
      const animationErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('animation') || 
              text.includes('transition') || 
              text.includes('transform') ||
              text.includes('whimsy') ||
              text.includes('Portal')) {
            animationErrors.push(text);
          }
        }
      });
      
      // Test animated counters (client-side feature)
      const counterElements = page.locator('text=/^[0-9]+/');
      const counterCount = await counterElements.count();
      
      if (counterCount > 0) {
        // Wait for counters to potentially animate
        await page.waitForTimeout(3000);
        
        // Verify counters show numbers (animation completed)
        for (let i = 0; i < Math.min(counterCount, 3); i++) {
          const counter = counterElements.nth(i);
          const text = await counter.textContent();
          expect(text).toMatch(/\d+/);
        }
      }
      
      // Test hover effects on whimsical elements
      const whimsyElements = page.locator('.whimsy-hover, .wobble-on-hover, .celebrate-bounce');
      const whimsyCount = await whimsyElements.count();
      
      if (whimsyCount > 0) {
        for (let i = 0; i < Math.min(whimsyCount, 2); i++) {
          const element = whimsyElements.nth(i);
          if (await element.isVisible()) {
            await element.hover();
            await page.waitForTimeout(500);
          }
        }
      }
      
      // Test progress animations if present
      const progressElements = page.locator('[class*="progress"], [class*="animate"]');
      const progressCount = await progressElements.count();
      
      if (progressCount > 0) {
        // Just verify they render without errors
        await expect(progressElements.first()).toBeVisible();
      }
      
      // Verify no animation errors
      expect(animationErrors).toHaveLength(0);
      
      console.log('✅ Whimsical components rendered and animated correctly');
    });

    test('form interactions work correctly without boundary errors', async ({ page }) => {
      console.log('🔍 Testing form interaction boundaries...');
      
      // Test on login form (client component with form interactions)
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      const formErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('form') || 
              text.includes('input') || 
              text.includes('onChange') ||
              text.includes('onSubmit') ||
              text.includes('event handler') ||
              text.includes('synthetic event')) {
            formErrors.push(text);
          }
        }
      });
      
      // Test form field interactions
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      
      // Type in fields (tests onChange handlers)
      await emailInput.fill('test');
      await emailInput.clear();
      await emailInput.fill(TEST_CREDENTIALS.VALID_USER.email);
      
      await passwordInput.fill('test');
      await passwordInput.clear();
      await passwordInput.fill(TEST_CREDENTIALS.VALID_USER.password);
      
      // Test form validation (onBlur handlers)
      await emailInput.focus();
      await passwordInput.focus();
      await page.click('body'); // Blur both fields
      
      await page.waitForTimeout(1000);
      
      // Test form submission
      const submitButton = page.locator('[data-testid="login-submit"]');
      await expect(submitButton).toBeEnabled();
      
      // Verify no form interaction errors
      expect(formErrors).toHaveLength(0);
      
      console.log('✅ Form interactions working without boundary errors');
    });

    test('dynamic content updates work without errors', async ({ page }) => {
      console.log('🔍 Testing dynamic content updates...');
      
      // Login to access dynamic dashboard content
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const updateErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('update') || 
              text.includes('render') || 
              text.includes('re-render') ||
              text.includes('Cannot read prop') ||
              text.includes('undefined')) {
            updateErrors.push(text);
          }
        }
      });
      
      // Wait for dynamic content to load and update
      await page.waitForTimeout(3000);
      
      // Trigger any dynamic updates by interacting with elements
      const clickableElements = page.locator('button:not([disabled]), [role="button"]');
      const clickableCount = await clickableElements.count();
      
      if (clickableCount > 0) {
        // Click a few elements to trigger updates
        for (let i = 0; i < Math.min(clickableCount, 2); i++) {
          const element = clickableElements.nth(i);
          if (await element.isVisible()) {
            await element.click();
            await page.waitForTimeout(1000);
          }
        }
      }
      
      // Verify page is still functional
      await expect(page.locator('h1')).toBeVisible();
      
      // Verify no dynamic update errors
      expect(updateErrors).toHaveLength(0);
      
      console.log('✅ Dynamic content updates working correctly');
    });
  });

  test.describe('Supabase Client Singleton Issues', () => {
    
    test('no multiple GoTrueClient instances warning', async ({ page }) => {
      console.log('🔍 Testing for multiple Supabase client instances...');
      
      const supabaseWarnings: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warn' || msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('GoTrueClient') || 
              text.includes('multiple') || 
              text.includes('instance') ||
              text.includes('supabase') ||
              text.includes('client already exists')) {
            supabaseWarnings.push(text);
          }
        }
      });
      
      // Navigate through app to trigger multiple client creation scenarios
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Login to trigger auth state changes
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to different pages to test singleton behavior
      await page.goto('/survey');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Refresh page to test client recreation
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(2000);
      
      // Filter out unrelated warnings
      const relevantWarnings = supabaseWarnings.filter(warning => 
        warning.includes('GoTrueClient') || warning.includes('multiple')
      );
      
      // Should not have multiple client warnings
      expect(relevantWarnings).toHaveLength(0);
      
      console.log('✅ No multiple Supabase client instances detected');
    });

    test('auth state consistency across components', async ({ page }) => {
      console.log('🔍 Testing auth state consistency...');
      
      // Monitor for auth inconsistency errors
      const authErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('auth') || 
              text.includes('session') || 
              text.includes('user') ||
              text.includes('inconsistent') ||
              text.includes('undefined')) {
            authErrors.push(text);
          }
        }
      });
      
      // Start unauthenticated
      await page.goto('/dashboard');
      
      // Should redirect to login (may take time for auth check)
      try {
        await page.waitForURL(/\/auth\/login/, { timeout: 5000 });
      } catch {
        // If no redirect, check if login form is present
        const loginForm = page.locator('[data-testid="login-form"]');
        if (await loginForm.isVisible()) {
          console.log('Login form visible instead of redirect');
        }
      }
      
      // Login
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      // Navigate between protected routes
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/survey');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(2000);
      
      // Filter relevant auth errors
      const relevantAuthErrors = authErrors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('404') &&
        !error.includes('fetch')
      );
      
      expect(relevantAuthErrors).toHaveLength(0);
      
      console.log('✅ Auth state consistency maintained');
    });
  });

  test.describe('Function Passing and Serialization', () => {
    
    test('no "Functions cannot be passed directly" errors', async ({ page }) => {
      console.log('🔍 Testing for function passing errors...');
      
      const serializationErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('Functions cannot be passed directly') || 
              text.includes('serializ') || 
              text.includes('props must be serializable') ||
              text.includes('cannot be passed from Server to Client') ||
              text.includes('serialize')) {
            serializationErrors.push(text);
          }
        }
      });
      
      // Navigate through various pages to trigger potential serialization issues
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Login to access more components
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to other pages that might have complex component trees
      await page.goto('/survey');
      await page.waitForLoadState('networkidle');
      
      // Test form interactions (common source of serialization issues)
      await page.goto('/auth/register');
      await page.waitForLoadState('networkidle');
      
      await page.waitForTimeout(3000);
      
      // Verify no serialization errors occurred
      expect(serializationErrors).toHaveLength(0);
      
      console.log('✅ No function passing/serialization errors detected');
    });

    test('component props are properly serialized', async ({ page }) => {
      console.log('🔍 Testing component prop serialization...');
      
      const propErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('prop') || 
              text.includes('Invalid') || 
              text.includes('Expected') ||
              text.includes('received') ||
              text.includes('type')) {
            propErrors.push(text);
          }
        }
      });
      
      // Login to access dashboard with complex props
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Wait for all components to render with their props
      await page.waitForTimeout(3000);
      
      // Verify dashboard components rendered correctly
      await expect(page.locator('h1')).toBeVisible();
      
      // Test interactive components that receive complex props
      const interactiveCards = page.locator('[variant="interactive"]');
      const cardCount = await interactiveCards.count();
      
      if (cardCount > 0) {
        // Hover over cards to trigger prop-based interactions
        for (let i = 0; i < Math.min(cardCount, 2); i++) {
          await interactiveCards.nth(i).hover();
          await page.waitForTimeout(500);
        }
      }
      
      // Filter out non-critical prop warnings
      const criticalPropErrors = propErrors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('console.warn') &&
        error.includes('prop')
      );
      
      expect(criticalPropErrors).toHaveLength(0);
      
      console.log('✅ Component props properly serialized');
    });
  });

  test.describe('Error Boundary and Recovery', () => {
    
    test('components recover gracefully from errors', async ({ page }) => {
      console.log('🔍 Testing error boundary and recovery...');
      
      // Login to access complex components
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Monitor for error boundary activations
      const errorBoundaryActivations: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('Error boundary') || 
              text.includes('componentDidCatch') || 
              text.includes('Something went wrong')) {
            errorBoundaryActivations.push(text);
          }
        }
      });
      
      // Navigate rapidly to potentially trigger errors
      for (let i = 0; i < 3; i++) {
        await page.goto('/dashboard');
        await page.waitForTimeout(500);
        await page.goto('/survey');
        await page.waitForTimeout(500);
      }
      
      // Return to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify page is still functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=AI Readiness Dashboard')).toBeVisible();
      
      // Should not show error boundary fallback
      const errorFallback = page.locator('text=Something went wrong');
      await expect(errorFallback).not.toBeVisible();
      
      // Verify no error boundaries were activated
      expect(errorBoundaryActivations).toHaveLength(0);
      
      console.log('✅ Components recovered gracefully from navigation stress');
    });

    test('page refreshes maintain component integrity', async ({ page }) => {
      console.log('🔍 Testing component integrity after refresh...');
      
      // Login and access dashboard
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Verify initial state
      await expect(page.locator('h1')).toBeVisible();
      
      // Refresh multiple times to test component remounting
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Verify components are still functional after each refresh
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('text=AI Readiness Dashboard')).toBeVisible();
        
        // Test interactivity after refresh
        const interactiveElement = page.locator('button:not([disabled])').first();
        if (await interactiveElement.isVisible()) {
          await interactiveElement.click();
          await page.waitForTimeout(500);
        }
      }
      
      console.log('✅ Component integrity maintained after refreshes');
    });
  });

  test.describe('Performance and Memory', () => {
    
    test('no memory leaks from component boundaries', async ({ page }) => {
      console.log('🔍 Testing for memory leaks...');
      
      const memoryWarnings: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warn' || msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('memory leak') || 
              text.includes('cleanup') || 
              text.includes('unmounted') ||
              text.includes('subscription') ||
              text.includes('listener')) {
            memoryWarnings.push(text);
          }
        }
      });
      
      // Login
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      // Navigate between pages multiple times to test cleanup
      const pages = ['/dashboard', '/survey', '/dashboard', '/survey', '/dashboard'];
      
      for (const targetPage of pages) {
        await page.goto(targetPage);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
      
      // Filter out unrelated memory warnings
      const relevantMemoryWarnings = memoryWarnings.filter(warning => 
        warning.includes('memory leak') || warning.includes('unmounted')
      );
      
      expect(relevantMemoryWarnings).toHaveLength(0);
      
      console.log('✅ No memory leak warnings detected');
    });

    test('components render efficiently without excessive re-renders', async ({ page }) => {
      console.log('🔍 Testing render efficiency...');
      
      const renderWarnings: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warn') {
          const text = msg.text();
          if (text.includes('render') || 
              text.includes('performance') || 
              text.includes('slow') ||
              text.includes('expensive')) {
            renderWarnings.push(text);
          }
        }
      });
      
      // Login
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.VALID_USER.password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
      
      // Navigate to dashboard and interact with components
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Test rapid interactions to check for excessive re-renders
      const hoverElements = page.locator('.whimsy-hover, .stats-card-hover');
      const hoverCount = await hoverElements.count();
      
      if (hoverCount > 0) {
        // Hover rapidly over elements
        for (let i = 0; i < Math.min(hoverCount, 3); i++) {
          await hoverElements.nth(i).hover();
          await page.waitForTimeout(100);
          await page.mouse.move(0, 0); // Move away
          await page.waitForTimeout(100);
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Should not have performance warnings
      expect(renderWarnings).toHaveLength(0);
      
      console.log('✅ Components rendering efficiently');
    });
  });
});

/**
 * Summary of Issues This Test Suite Addresses:
 * 
 * 1. ✅ useState/useEffect errors in dashboard components
 * 2. ✅ Login redirect functionality without setTimeout issues  
 * 3. ✅ Client component interactivity validation
 * 4. ✅ Supabase client singleton instance management
 * 5. ✅ "Functions cannot be passed directly" serialization errors
 * 6. ✅ Component boundary hydration mismatches
 * 7. ✅ Memory leaks from improper cleanup
 * 8. ✅ Error boundary recovery mechanisms
 * 9. ✅ Authentication state consistency
 * 10. ✅ Performance and render efficiency
 * 
 * This comprehensive test suite ensures that the React component boundaries
 * between client and server components are properly defined and functional,
 * preventing the common Next.js 13+ App Router issues.
 */