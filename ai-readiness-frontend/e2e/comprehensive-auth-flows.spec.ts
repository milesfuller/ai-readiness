/**
 * Comprehensive Authentication Flow Tests
 * Tests all authentication scenarios including login, register, logout, password reset, and edge cases
 */

import { test, expect } from './fixtures/test-setup';
import { LoginPage, DashboardPage } from './fixtures/test-setup';

test.describe('Comprehensive Authentication Flows', () => {
  
  test.describe('Login Flow', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page, rateLimitHandler }) => {
      loginPage = new LoginPage(page, rateLimitHandler);
      await loginPage.navigate();
    });

    test('Should login successfully with valid credentials', async ({ page, testUser, rateLimitHandler }) => {
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'valid-login' });

      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    test('Should show error for invalid email', async ({ page, rateLimitHandler }) => {
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should show error for empty password', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should show error for wrong credentials', async ({ page, rateLimitHandler }) => {
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', 'wrong@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-submit"]');
        await page.waitForSelector('[data-testid="login-error"]', { timeout: 15000 });
      }, { identifier: 'wrong-credentials' });

      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should handle rate limiting gracefully', async ({ page, rateLimitHandler }) => {
      // Make multiple rapid login attempts
      const attempts = 5;
      for (let i = 0; i < attempts; i++) {
        try {
          await page.fill('[data-testid="email-input"]', 'test@example.com');
          await page.fill('[data-testid="password-input"]', 'wrongpassword');
          await page.click('[data-testid="login-submit"]');
          await page.waitForTimeout(100);
        } catch (error) {
          // Expected behavior - rate limiting should kick in
        }
      }

      // Should show rate limit message
      await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible({ timeout: 10000 });
    });

    test('Should remember user session after page refresh', async ({ page, testUser, rateLimitHandler }) => {
      // Login first
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'session-persistence-login' });

      // Refresh the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page).toHaveURL(/dashboard/);
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    });

    test('Should handle concurrent login attempts', async ({ page, testUser, rateLimitHandler }) => {
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);

      // Click login button multiple times rapidly
      const loginPromises = Array(3).fill(null).map(async (_, index) => {
        try {
          await page.click('[data-testid="login-submit"]');
        } catch (error) {
          console.log(`Concurrent login attempt ${index} handled:`, error.message);
        }
      });

      await Promise.allSettled(loginPromises);
      
      // Should eventually succeed
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Registration Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register');
    });

    test('Should show registration form correctly', async ({ page }) => {
      await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="register-submit"]')).toBeVisible();
    });

    test('Should validate email format on registration', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.click('[data-testid="register-submit"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('Should validate password strength', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', '123'); // Weak password
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.click('[data-testid="register-submit"]');

      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
    });

    test('Should handle registration with valid data', async ({ page, rateLimitHandler }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', uniqueEmail);
        await page.fill('[data-testid="password-input"]', 'SecurePassword123!');
        await page.fill('[data-testid="first-name-input"]', 'Test');
        await page.fill('[data-testid="last-name-input"]', 'User');
        await page.click('[data-testid="register-submit"]');
        
        // Should show success message or redirect to verification
        await Promise.race([
          page.waitForSelector('[data-testid="registration-success"]', { timeout: 15000 }),
          page.waitForURL(/verify-email/, { timeout: 15000 })
        ]);
      }, { identifier: 'registration-test' });

      // Should be in success state
      const hasSuccess = await page.locator('[data-testid="registration-success"]').isVisible();
      const isVerifyPage = page.url().includes('verify-email');
      expect(hasSuccess || isVerifyPage).toBe(true);
    });

    test('Should prevent duplicate email registration', async ({ page, testUser, rateLimitHandler }) => {
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', 'NewPassword123!');
        await page.fill('[data-testid="first-name-input"]', 'Test');
        await page.fill('[data-testid="last-name-input"]', 'User');
        await page.click('[data-testid="register-submit"]');
        
        await page.waitForSelector('[data-testid="registration-error"]', { timeout: 15000 });
      }, { identifier: 'duplicate-email' });

      await expect(page.locator('[data-testid="registration-error"]')).toContainText(/already exists|already registered/i);
    });
  });

  test.describe('Logout Flow', () => {
    test('Should logout successfully', async ({ authenticatedPage: page }) => {
      await expect(page).toHaveURL(/dashboard/);
      
      // Click logout button
      await page.click('[data-testid="logout-button"]');
      
      // Should redirect to login page
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
      
      // Should clear authentication state
      await page.goto('/dashboard');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should handle logout when already logged out', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Try to logout when not logged in
      const response = await page.request.post('/api/auth/logout');
      
      // Should handle gracefully
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/forgot-password');
    });

    test('Should show forgot password form', async ({ page }) => {
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="reset-submit"]')).toBeVisible();
    });

    test('Should validate email for password reset', async ({ page }) => {
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="reset-submit"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });

    test('Should handle password reset request', async ({ page, testUser, rateLimitHandler }) => {
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.click('[data-testid="reset-submit"]');
        
        await page.waitForSelector('[data-testid="reset-success"]', { timeout: 15000 });
      }, { identifier: 'password-reset' });

      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="reset-success"]')).toContainText(/email sent|check your email/i);
    });

    test('Should handle non-existent email for password reset', async ({ page, rateLimitHandler }) => {
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
        await page.click('[data-testid="reset-submit"]');
        
        await page.waitForTimeout(3000); // Wait for response
      }, { identifier: 'nonexistent-reset' });

      // Should either show success (security) or error message
      const hasSuccess = await page.locator('[data-testid="reset-success"]').isVisible();
      const hasError = await page.locator('[data-testid="reset-error"]').isVisible();
      expect(hasSuccess || hasError).toBe(true);
    });
  });

  test.describe('Session Management', () => {
    test('Should handle expired session', async ({ authenticatedPage: page }) => {
      // Manually expire session by clearing auth cookies
      await page.evaluate(() => {
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') || name.includes('auth')) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        });
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should handle session refresh', async ({ authenticatedPage: page }) => {
      await expect(page).toHaveURL(/dashboard/);
      
      // Wait for potential token refresh
      await page.waitForTimeout(5000);
      
      // Should still be authenticated
      await page.goto('/profile');
      await expect(page).toHaveURL(/profile/);
    });

    test('Should maintain session across tabs', async ({ context, authenticatedPage: page1 }) => {
      // Create a second tab
      const page2 = await context.newPage();
      
      // Navigate to protected route in second tab
      await page2.goto('/dashboard');
      await expect(page2).toHaveURL(/dashboard/);
      
      // Should be authenticated in both tabs
      await expect(page1.locator('[data-testid="user-profile"]')).toBeVisible();
      await expect(page2.locator('[data-testid="user-profile"]')).toBeVisible();
      
      // Logout in first tab
      await page1.click('[data-testid="logout-button"]');
      await page1.waitForURL(/auth\/login/, { timeout: 10000 });
      
      // Second tab should also be affected
      await page2.reload();
      await page2.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page2).toHaveURL(/auth\/login/);
      
      await page2.close();
    });
  });

  test.describe('Authentication Edge Cases', () => {
    test('Should handle network failures during auth', async ({ page, testUser }) => {
      await page.goto('/auth/login');
      
      // Fill in credentials
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // Go offline
      await page.context().setOffline(true);
      await page.click('[data-testid="login-submit"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible({ timeout: 10000 });
      
      // Go back online and retry
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      await page.click('[data-testid="login-submit"]');
      
      // Should eventually succeed
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('Should prevent CSRF attacks', async ({ page, testUser }) => {
      // Try to make auth request from different origin
      const maliciousRequest = page.evaluate(async (user) => {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://evil-site.com'
          },
          body: JSON.stringify({
            email: user.email,
            password: 'malicious'
          })
        });
        return response.status;
      }, testUser);

      const status = await maliciousRequest;
      expect(status).toBeGreaterThanOrEqual(400); // Should be rejected
    });

    test('Should handle malformed authentication data', async ({ page }) => {
      // Manually set malformed auth data
      await page.evaluate(() => {
        localStorage.setItem('supabase.auth.token', 'invalid-token');
        sessionStorage.setItem('supabase.auth.token', 'invalid-token');
      });
      
      await page.goto('/dashboard');
      
      // Should redirect to login due to invalid token
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should handle XSS prevention in auth forms', async ({ page }) => {
      await page.goto('/auth/login');
      
      const xssPayload = '<script>alert("xss")</script>';
      
      await page.fill('[data-testid="email-input"]', xssPayload);
      await page.fill('[data-testid="password-input"]', 'test');
      await page.click('[data-testid="login-submit"]');
      
      // XSS payload should not execute
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(3000);
      expect(alerts).toHaveLength(0);
    });
  });
});