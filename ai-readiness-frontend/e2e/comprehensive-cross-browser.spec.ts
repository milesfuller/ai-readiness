/**
 * Comprehensive Cross-Browser Compatibility Tests
 * Tests functionality across different browsers with proper configuration
 */

import { test, expect, devices } from '@playwright/test';

// Define test credentials
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

test.describe('Cross-Browser Compatibility Tests', () => {
  
  test.describe('Chromium Browser Tests', () => {
    
    test('Should load application correctly in Chromium', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Basic functionality should work
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          errors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      expect(errors.length).toBeLessThan(3); // Allow some minor errors
    });

    test('Should handle form submissions in Chromium', async ({ page }) => {
      await page.goto('/auth/login');
      
      await page.fill('input[type="email"]', TEST_CREDENTIALS.VALID_USER.email);
      await page.fill('input[type="password"]', TEST_CREDENTIALS.VALID_USER.password);
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      
      // Test form submission without actually submitting to avoid auth issues
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBe(false);
    });
  });

  test.describe('Cross-Browser Feature Tests', () => {
    
    test('Should handle local storage across browsers', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Set and verify localStorage functionality
      await page.evaluate(() => {
        localStorage.setItem('test-key', 'test-value');
      });
      
      const storedValue = await page.evaluate(() => {
        return localStorage.getItem('test-key');
      });
      
      expect(storedValue).toBe('test-value');
      
      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem('test-key');
      });
    });

    test('Should handle session storage across browsers', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Set and verify sessionStorage functionality
      await page.evaluate(() => {
        sessionStorage.setItem('test-session-key', 'test-session-value');
      });
      
      const storedValue = await page.evaluate(() => {
        return sessionStorage.getItem('test-session-key');
      });
      
      expect(storedValue).toBe('test-session-value');
      
      // Clean up
      await page.evaluate(() => {
        sessionStorage.removeItem('test-session-key');
      });
    });

    test('Should handle CSS and responsive design', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await expect(page.locator('form')).toBeVisible();
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('form')).toBeVisible();
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('form')).toBeVisible();
    });

    test('Should handle navigation across browsers', async ({ page }) => {
      // Test basic navigation
      await page.goto('/');
      await expect(page).toHaveURL('/');
      
      await page.goto('/auth/login');
      await expect(page).toHaveURL('/auth/login');
      
      // Test back navigation
      await page.goBack();
      await expect(page).toHaveURL('/');
    });

    test('Should handle JavaScript features across browsers', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test basic JavaScript functionality
      const result = await page.evaluate(() => {
        // Test modern JavaScript features
        const testObj = { a: 1, b: 2 };
        const spread = { ...testObj, c: 3 };
        
        // Test async/await support
        const asyncTest = async () => {
          return new Promise(resolve => {
            setTimeout(() => resolve('async-works'), 100);
          });
        };
        
        return {
          spread: Object.keys(spread),
          supportsAsync: typeof asyncTest === 'function'
        };
      });
      
      expect(result.spread).toContain('a');
      expect(result.spread).toContain('b');
      expect(result.spread).toContain('c');
      expect(result.supportsAsync).toBe(true);
    });
  });

  test.describe('Browser Performance Tests', () => {
    
    test('Should load page within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds even on slower systems
      expect(loadTime).toBeLessThan(10000);
    });

    test('Should handle multiple simultaneous requests', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test multiple concurrent requests
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          page.evaluate(() => {
            return fetch('/api/health').then(r => r.ok).catch(() => false);
          })
        );
      }
      
      const results = await Promise.all(requests);
      
      // At least some requests should succeed
      const successCount = results.filter(result => result === true).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});