/**
 * Comprehensive Error Scenario Tests
 * Tests all error conditions including 404, 500, network failures, validation errors, and edge cases
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive Error Scenarios', () => {
  
  test.describe('HTTP Error Codes', () => {
    test('Should handle 404 errors gracefully', async ({ page }) => {
      await page.goto('/non-existent-route');
      
      // Should either show custom 404 page or redirect appropriately
      await expect(page.locator('body')).toBeVisible();
      
      // Check if it's a 404 page or redirect to login
      const url = page.url();
      expect(url).toMatch(/\/(404|not-found|auth\/login)/);
      
      // Page should still be functional
      const hasErrorMessage = await page.locator('h1').isVisible();
      expect(hasErrorMessage).toBe(true);
    });

    test('Should handle 500 server errors', async ({ page }) => {
      // Try to trigger a server error by calling a non-existent API
      const response = await page.request.get('/api/non-existent-endpoint');
      expect(response.status()).toBe(404);
      
      // Navigate to page and check error handling
      await page.goto('/dashboard');
      
      // Simulate server error by intercepting requests
      await page.route('/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      // Try to interact with API
      await page.reload();
      
      // Should handle error gracefully
      await expect(page.locator('body')).toBeVisible();
      
      // May show error message or fallback content
      const hasContent = await page.locator('main, [role="main"], .error-boundary').isVisible();
      expect(hasContent).toBe(true);
    });

    test('Should handle API rate limiting (429)', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/login');
      
      // Make many rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(async () => {
        try {
          await page.fill('[data-testid="email-input"]', 'test@example.com');
          await page.fill('[data-testid="password-input"]', 'wrongpassword');
          await page.click('[data-testid="login-submit"]');
          await page.waitForTimeout(100);
        } catch (error) {
          // Expected - rate limiting
        }
      });
      
      await Promise.allSettled(requests);
      
      // Should show rate limit error
      await expect(page.locator('[data-testid="rate-limit-error"], .rate-limit-message')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Network Errors', () => {
    test('Should handle complete network failure', async ({ page, testUser }) => {
      await page.goto('/auth/login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // Go completely offline
      await page.context().setOffline(true);
      await page.click('[data-testid="login-submit"]');
      
      // Should show network error
      await expect(page.locator('[data-testid="network-error"], .network-error, .offline-message')).toBeVisible({ timeout: 10000 });
      
      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      
      // Should allow retry
      await page.click('[data-testid="login-submit"], [data-testid="retry-button"]');
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('Should handle slow network connections', async ({ page, testUser }) => {
      // Throttle network to simulate slow connection
      const client = await page.context().newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1024, // 1KB/s
        uploadThroughput: 1024,
        latency: 2000 // 2s latency
      });
      
      await page.goto('/auth/login');
      
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // Should show loading state
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="loading"], .loading, .spinner')).toBeVisible({ timeout: 5000 });
      
      // Should eventually complete
      await page.waitForURL(/dashboard/, { timeout: 60000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('Should handle intermittent connection drops', async ({ page, testUser }) => {
      await page.goto('/dashboard');
      
      // Simulate intermittent connectivity
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      await page.context().setOffline(false);
      
      // Page should recover and remain functional
      await page.reload();
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Form Validation Errors', () => {
    test('Should handle invalid email formats in all forms', async ({ page }) => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@invalid.com',
        'invalid@.com',
        'invalid..@example.com',
        'inv alid@example.com'
      ];
      
      // Test login form
      await page.goto('/auth/login');
      for (const email of invalidEmails) {
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-submit"]');
        
        await expect(page.locator('[data-testid="email-error"], .email-error')).toBeVisible();
        await expect(page).toHaveURL(/auth\/login/);
      }
      
      // Test registration form
      await page.goto('/auth/register');
      await page.fill('[data-testid="email-input"]', invalidEmails[0]);
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.click('[data-testid="register-submit"]');
      
      await expect(page.locator('[data-testid="email-error"], .email-error')).toBeVisible();
    });

    test('Should handle weak passwords', async ({ page }) => {
      const weakPasswords = [
        '123',
        'password',
        'abc',
        '12345678',
        'qwerty'
      ];
      
      await page.goto('/auth/register');
      
      for (const password of weakPasswords) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', password);
        await page.fill('[data-testid="first-name-input"]', 'Test');
        await page.fill('[data-testid="last-name-input"]', 'User');
        await page.click('[data-testid="register-submit"]');
        
        await expect(page.locator('[data-testid="password-error"], .password-error')).toBeVisible();
        await expect(page).toHaveURL(/auth\/register/);
      }
    });

    test('Should handle missing required fields', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Submit with no fields filled
      await page.click('[data-testid="register-submit"]');
      
      // Should show multiple validation errors
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="first-name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="last-name-error"]')).toBeVisible();
    });

    test('Should handle special characters in input fields', async ({ page }) => {
      const specialChars = '<script>alert("xss")</script>';
      
      await page.goto('/auth/login');
      
      await page.fill('[data-testid="email-input"]', specialChars);
      await page.fill('[data-testid="password-input"]', specialChars);
      await page.click('[data-testid="login-submit"]');
      
      // XSS should not execute
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(2000);
      expect(alerts).toHaveLength(0);
      
      // Should show appropriate validation error
      await expect(page.locator('[data-testid="email-error"], [data-testid="login-error"]')).toBeVisible();
    });
  });

  test.describe('API Error Handling', () => {
    test('Should handle malformed JSON responses', async ({ page }) => {
      await page.route('/api/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json{'
        });
      });
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // Should handle JSON parsing error gracefully
      await expect(page.locator('[data-testid="login-error"], .error-message')).toBeVisible({ timeout: 10000 });
    });

    test('Should handle API timeout errors', async ({ page }) => {
      await page.route('/api/**', route => {
        // Never resolve to simulate timeout
        return new Promise(() => {});
      });
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // Should show loading state and then timeout error
      await expect(page.locator('[data-testid="loading"], .loading')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="timeout-error"], .timeout-error')).toBeVisible({ timeout: 30000 });
    });

    test('Should handle unexpected API responses', async ({ page }) => {
      await page.route('/api/**', route => {
        route.fulfill({
          status: 418, // I'm a teapot
          contentType: 'text/plain',
          body: 'I am a teapot'
        });
      });
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // Should handle unexpected status codes gracefully
      await expect(page.locator('[data-testid="login-error"], .error-message')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Browser Compatibility Errors', () => {
    test('Should handle missing localStorage', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
          writable: true
        });
      });
      
      await page.goto('/auth/login');
      
      // Should still function without localStorage
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('Should handle missing sessionStorage', async ({ page }) => {
      // Disable sessionStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'sessionStorage', {
          value: undefined,
          writable: true
        });
      });
      
      await page.goto('/auth/login');
      
      // Should still function without sessionStorage
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('Should handle disabled JavaScript', async ({ page }) => {
      // Disable JavaScript
      await page.context().setJavaScriptEnabled(false);
      
      await page.goto('/auth/login');
      
      // Basic HTML should still be accessible
      await expect(page.locator('body')).toBeVisible();
      
      // Re-enable JavaScript for other tests
      await page.context().setJavaScriptEnabled(true);
    });
  });

  test.describe('Error Recovery', () => {
    test('Should recover from temporary API failures', async ({ page, testUser }) => {
      let requestCount = 0;
      
      await page.route('/api/**', route => {
        requestCount++;
        if (requestCount <= 2) {
          // Fail first two requests
          route.fulfill({
            status: 500,
            body: JSON.stringify({ error: 'Temporary failure' })
          });
        } else {
          // Allow subsequent requests
          route.continue();
        }
      });
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      
      // First attempt should fail
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 });
      
      // Retry should also fail
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 });
      
      // Third attempt should succeed
      await page.click('[data-testid="login-submit"]');
      await page.waitForURL(/dashboard/, { timeout: 30000 });
      await expect(page).toHaveURL(/dashboard/);
    });

    test('Should provide helpful error messages', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test various error conditions
      const errorScenarios = [
        {
          action: async () => {
            await page.fill('[data-testid="email-input"]', 'invalid-email');
            await page.click('[data-testid="login-submit"]');
          },
          expectedError: 'email',
          description: 'Invalid email format'
        },
        {
          action: async () => {
            await page.fill('[data-testid="email-input"]', 'test@example.com');
            await page.fill('[data-testid="password-input"]', '');
            await page.click('[data-testid="login-submit"]');
          },
          expectedError: 'password',
          description: 'Missing password'
        }
      ];
      
      for (const scenario of errorScenarios) {
        await scenario.action();
        
        // Error message should be visible and helpful
        const errorSelector = `[data-testid="${scenario.expectedError}-error"]`;
        await expect(page.locator(errorSelector)).toBeVisible();
        
        const errorText = await page.locator(errorSelector).textContent();
        expect(errorText).toBeTruthy();
        expect(errorText.length).toBeGreaterThan(10); // Should be descriptive
        
        // Clear fields for next test
        await page.fill('[data-testid="email-input"]', '');
        await page.fill('[data-testid="password-input"]', '');
      }
    });
  });

  test.describe('Error Boundary Testing', () => {
    test('Should catch and display JavaScript errors', async ({ page }) => {
      // Inject script that will cause an error
      await page.addInitScript(() => {
        window.addEventListener('load', () => {
          setTimeout(() => {
            throw new Error('Test error for error boundary');
          }, 1000);
        });
      });
      
      await page.goto('/dashboard');
      
      // Should either show error boundary or handle error gracefully
      await page.waitForTimeout(3000);
      
      const hasErrorBoundary = await page.locator('.error-boundary, [data-testid="error-boundary"]').isVisible();
      const pageStillFunctional = await page.locator('body').isVisible();
      
      expect(pageStillFunctional).toBe(true);
      
      // If error boundary exists, it should be shown
      if (hasErrorBoundary) {
        await expect(page.locator('.error-boundary, [data-testid="error-boundary"]')).toContainText(/error|something went wrong/i);
      }
    });

    test('Should handle component rendering errors', async ({ page }) => {
      // Simulate component error by corrupting localStorage data
      await page.evaluate(() => {
        localStorage.setItem('app-state', 'invalid-json{');
      });
      
      await page.goto('/dashboard');
      
      // Page should still render even with corrupted data
      await expect(page.locator('body')).toBeVisible();
      
      // Check if error boundary or fallback content is shown
      const hasContent = await page.locator('main, [role="main"], .error-fallback').isVisible();
      expect(hasContent).toBe(true);
    });
  });
});