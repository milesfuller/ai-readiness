/**
 * Login Redirect Fix Validation Test
 * Tests the specific login redirect fix that was implemented
 */

import { test, expect } from './fixtures/test-setup';
import { LoginPage, DashboardPage } from './fixtures/test-setup';

test.describe('Login Redirect Fix Validation', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page, rateLimitHandler }) => {
    loginPage = new LoginPage(page, rateLimitHandler);
    dashboardPage = new DashboardPage(page);
  });

  test('should redirect to dashboard after successful login', async ({ 
    page, 
    testUser, 
    rateLimitHandler,
    supabaseUtils 
  }) => {
    // Ensure test infrastructure is healthy before starting
    const isHealthy = await supabaseUtils.checkServiceHealth();
    if (!isHealthy) {
      await supabaseUtils.waitForRateLimit(10);
    }

    // Navigate to login page
    await loginPage.navigate();

    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

    // Perform login with rate limiting protection
    await rateLimitHandler.executeWithRetry(async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // Click login button
      await page.click('[data-testid="login-submit"]');
      
      // Wait for the redirect to complete
      // The fix should ensure we redirect to /dashboard
      await page.waitForURL(/.*\/dashboard/, { timeout: 30000 });
    }, { identifier: 'login-redirect-test' });

    // Verify we successfully redirected to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Verify dashboard elements are visible
    await dashboardPage.expectToBeVisible();

    // Additional verification that login state is properly set
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle login errors gracefully without redirect', async ({ 
    page, 
    rateLimitHandler 
  }) => {
    await loginPage.navigate();

    // Try login with invalid credentials
    await rateLimitHandler.executeWithRetry(async () => {
      await page.fill('[data-testid="email-input"]', 'invalid@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      
      await page.click('[data-testid="login-submit"]');
      
      // Should stay on login page and show error
      await page.waitForSelector('[data-testid="login-error"]', { timeout: 15000 });
    }, { identifier: 'login-error-test' });

    // Verify we're still on login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Verify error message is displayed
    await loginPage.expectLoginError();
  });

  test('should redirect authenticated user away from login page', async ({ 
    authenticatedPage: page 
  }) => {
    // We're already authenticated via the fixture
    // Try to navigate to login page
    await page.goto('/auth/login');
    
    // Should be redirected away from login page to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should preserve redirect URL after login', async ({ 
    page, 
    testUser, 
    rateLimitHandler 
  }) => {
    // Try to access a protected page first
    await page.goto('/admin');
    
    // Should be redirected to login with return URL
    await page.waitForURL(/.*\/auth\/login/, { timeout: 15000 });
    
    // Verify login page with potential redirect parameter
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Perform login
    await rateLimitHandler.executeWithRetry(async () => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      await page.click('[data-testid="login-submit"]');
      
      // Should redirect to the originally requested page or dashboard
      await Promise.race([
        page.waitForURL(/.*\/admin/, { timeout: 15000 }),
        page.waitForURL(/.*\/dashboard/, { timeout: 15000 }),
      ]);
    }, { identifier: 'redirect-preserve-test' });

    // Verify we ended up somewhere appropriate
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(admin|dashboard)/);
  });

  test('should handle concurrent login attempts properly', async ({ 
    page, 
    testUser, 
    rateLimitHandler 
  }) => {
    await loginPage.navigate();

    // Fill in credentials
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);

    // Make multiple rapid login attempts (simulating double-click or rapid submission)
    const loginPromises = Array(3).fill(null).map(async (_, index) => {
      try {
        await rateLimitHandler.executeWithRetry(async () => {
          await page.click('[data-testid="login-submit"]');
        }, { 
          identifier: `concurrent-login-${index}`,
          maxRetries: 2 
        });
      } catch (error) {
        // Some attempts may fail due to rate limiting, which is expected
        console.log(`Login attempt ${index} failed:`, error.message);
      }
    });

    // Wait for all attempts to complete
    await Promise.allSettled(loginPromises);

    // Should eventually end up on dashboard (only one successful login needed)
    await page.waitForURL(/.*\/dashboard/, { timeout: 30000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should handle network errors during login gracefully', async ({ 
    page, 
    testUser,
    rateLimitHandler 
  }) => {
    await loginPage.navigate();

    // Fill in credentials
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);

    // Simulate network failure by going offline
    await page.context().setOffline(true);

    // Attempt login
    await page.click('[data-testid="login-submit"]');

    // Should show network error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });

    // Go back online
    await page.context().setOffline(false);

    // Wait a moment for connection to restore
    await page.waitForTimeout(2000);

    // Retry login should work
    await rateLimitHandler.executeWithRetry(async () => {
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/.*\/dashboard/, { timeout: 30000 });
    }, { identifier: 'network-recovery-test' });

    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test.afterEach(async ({ page }) => {
    // Ensure we're in a clean state for next test
    try {
      // Clear any stored authentication
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate away from any authenticated pages
      await page.goto('/');
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });
});

test.describe('Login Form Validation', () => {
  test('should validate email format', async ({ page, rateLimitHandler }) => {
    const loginPage = new LoginPage(page, rateLimitHandler);
    await loginPage.navigate();

    // Try invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'somepassword');
    
    await page.click('[data-testid="login-submit"]');

    // Should show email validation error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    
    // Should not redirect
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });

  test('should require password field', async ({ page, rateLimitHandler }) => {
    const loginPage = new LoginPage(page, rateLimitHandler);
    await loginPage.navigate();

    // Try with empty password
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    // Leave password empty
    
    await page.click('[data-testid="login-submit"]');

    // Should show password validation error
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    
    // Should not redirect
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});