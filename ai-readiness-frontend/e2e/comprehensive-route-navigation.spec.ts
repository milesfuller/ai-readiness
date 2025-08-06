/**
 * Comprehensive Route Navigation Tests
 * Tests ALL routes in the application for navigation, accessibility, and proper rendering
 */

import { test, expect } from './fixtures/test-setup';
import { LoginPage, DashboardPage } from './fixtures/test-setup';

test.describe('Comprehensive Route Navigation Tests', () => {
  
  test.describe('Public Routes (No Authentication Required)', () => {
    const publicRoutes = [
      { path: '/', expectedRedirect: '/auth/login', description: 'Root should redirect to login' },
      { path: '/auth/login', description: 'Login page should be accessible' },
      { path: '/auth/register', description: 'Register page should be accessible' },
      { path: '/auth/forgot-password', description: 'Forgot password page should be accessible' },
      { path: '/auth/reset-password', description: 'Reset password page should be accessible' },
      { path: '/auth/verify-email', description: 'Email verification page should be accessible' }
    ];

    publicRoutes.forEach(({ path, expectedRedirect, description }) => {
      test(`${description} - ${path}`, async ({ page }) => {
        await page.goto(path);
        
        if (expectedRedirect) {
          await page.waitForURL(expectedRedirect, { timeout: 10000 });
          await expect(page).toHaveURL(expectedRedirect);
        } else {
          await expect(page).toHaveURL(path);
        }
        
        // Check page loads without critical errors
        await expect(page.locator('body')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        
        // Check for console errors
        const logs = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            logs.push(msg.text());
          }
        });
        
        // Wait a moment for any async operations
        await page.waitForTimeout(2000);
        
        // Filter out known acceptable errors
        const criticalErrors = logs.filter(log => 
          !log.includes('favicon') && 
          !log.includes('ResizeObserver') &&
          !log.includes('Non-passive event listener')
        );
        
        expect(criticalErrors.length).toBe(0);
      });
    });

    test('Should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      // Should either show 404 page or redirect appropriately
      const url = page.url();
      expect(url).toMatch(/\/(auth\/login|404|not-found)/);
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Authentication Flow Navigation', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page, rateLimitHandler }) => {
      loginPage = new LoginPage(page, rateLimitHandler);
    });

    test('Should navigate through auth flow correctly', async ({ page, testUser, rateLimitHandler }) => {
      // Start at root - should redirect to login
      await page.goto('/');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      
      // Login page should have proper form
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      
      // Navigate to register
      await page.click('[data-testid="register-link"]');
      await expect(page).toHaveURL(/auth\/register/);
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      
      // Back to login
      await page.click('[data-testid="login-link"]');
      await expect(page).toHaveURL(/auth\/login/);
      
      // Forgot password navigation
      await page.click('[data-testid="forgot-password-link"]');
      await expect(page).toHaveURL(/auth\/forgot-password/);
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
      
      // Back to login and perform actual login
      await page.goto('/auth/login');
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'auth-flow-login' });
      
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Protected Routes (Authentication Required)', () => {
    const protectedRoutes = [
      { path: '/dashboard', description: 'Main dashboard', requiresAuth: true },
      { path: '/profile', description: 'User profile page', requiresAuth: true },
      { path: '/settings', description: 'User settings page', requiresAuth: true },
      { path: '/survey', description: 'Survey landing page', requiresAuth: true },
      { path: '/results', description: 'Survey results page', requiresAuth: true },
      { path: '/notifications', description: 'User notifications', requiresAuth: true },
      { path: '/organization/surveys', description: 'Organization surveys', requiresAuth: true, requiresOrgRole: true },
      { path: '/organization/analytics', description: 'Organization analytics', requiresAuth: true, requiresOrgRole: true },
      { path: '/organization/reports', description: 'Organization reports', requiresAuth: true, requiresOrgRole: true },
      { path: '/admin', description: 'Admin dashboard', requiresAuth: true, requiresAdminRole: true },
      { path: '/admin/users', description: 'Admin users management', requiresAuth: true, requiresAdminRole: true },
      { path: '/admin/surveys', description: 'Admin surveys management', requiresAuth: true, requiresAdminRole: true },
    ];

    test.describe('Unauthenticated Access', () => {
      protectedRoutes.forEach(({ path, description }) => {
        test(`Should redirect ${description} to login when unauthenticated - ${path}`, async ({ page }) => {
          await page.goto(path);
          await page.waitForURL(/auth\/login/, { timeout: 10000 });
          await expect(page).toHaveURL(/auth\/login/);
          
          // Should preserve redirect parameter
          const url = new URL(page.url());
          expect(url.searchParams.get('redirectTo')).toBe(path);
        });
      });
    });

    test.describe('Authenticated Access', () => {
      protectedRoutes.forEach(({ path, description, requiresOrgRole, requiresAdminRole }) => {
        if (!requiresOrgRole && !requiresAdminRole) {
          test(`Should access ${description} when authenticated - ${path}`, async ({ authenticatedPage: page }) => {
            await page.goto(path);
            await expect(page).toHaveURL(path);
            await expect(page.locator('body')).toBeVisible();
            
            // Check for common layout elements
            await expect(page.locator('[data-testid="main-layout"]')).toBeVisible({ timeout: 10000 });
            
            // Verify no critical console errors
            const errors = [];
            page.on('console', msg => {
              if (msg.type() === 'error' && !msg.text().includes('favicon')) {
                errors.push(msg.text());
              }
            });
            
            await page.waitForTimeout(3000); // Allow async operations
            expect(errors.length).toBe(0);
          });
        }
      });
    });
  });

  test.describe('Special Routes', () => {
    test('Should handle test-auth debugging route', async ({ page }) => {
      await page.goto('/test-auth');
      await expect(page.locator('body')).toBeVisible();
      
      // Should show auth debug information
      await expect(page.locator('h1')).toContainText(/auth|test|debug/i);
    });

    test('Should handle debug route', async ({ page }) => {
      await page.goto('/debug');
      await expect(page.locator('body')).toBeVisible();
      
      // Should show debug information
      await expect(page.locator('h1')).toContainText(/debug/i);
    });

    test('Should handle visual story demo', async ({ page }) => {
      await page.goto('/visual-story-demo');
      await expect(page.locator('body')).toBeVisible();
      
      // Should load visualization components
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Route Security', () => {
    test('Should prevent unauthorized access to admin routes', async ({ authenticatedPage: page }) => {
      // Try to access admin route with regular user
      await page.goto('/admin');
      
      // Should either redirect or show access denied
      const url = page.url();
      expect(url).toMatch(/\/(dashboard|auth\/login|access-denied|unauthorized)/);
    });

    test('Should prevent unauthorized access to organization routes', async ({ authenticatedPage: page }) => {
      // Try to access org route with regular user
      await page.goto('/organization/analytics');
      
      // Should either redirect or show access denied
      const url = page.url();
      expect(url).toMatch(/\/(dashboard|auth\/login|access-denied|unauthorized)/);
    });
  });

  test.describe('Navigation State Persistence', () => {
    test('Should maintain navigation history', async ({ authenticatedPage: page }) => {
      // Navigate through several pages
      await page.goto('/dashboard');
      await page.goto('/profile');
      await page.goto('/settings');
      
      // Use browser back button
      await page.goBack();
      await expect(page).toHaveURL('/profile');
      
      await page.goBack();
      await expect(page).toHaveURL('/dashboard');
    });

    test('Should handle deep linking correctly', async ({ page, testUser, rateLimitHandler }) => {
      // Access deep link while unauthenticated
      await page.goto('/profile');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      
      // Login
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        
        // Should redirect to original requested page
        await Promise.race([
          page.waitForURL('/profile', { timeout: 15000 }),
          page.waitForURL('/dashboard', { timeout: 15000 })
        ]);
      }, { identifier: 'deep-link-test' });
      
      // Should be on appropriate page
      const url = page.url();
      expect(url).toMatch(/\/(profile|dashboard)/);
    });
  });
});