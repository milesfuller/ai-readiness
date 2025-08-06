import { test, expect } from '@playwright/test';

/**
 * EPIPE Stress Test Suite
 * 
 * These tests are designed to generate scenarios that commonly cause EPIPE errors:
 * 1. Large console outputs
 * 2. Rapid page navigation
 * 3. Multiple concurrent requests
 * 4. Long-running operations
 */

test.describe('EPIPE Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page with enhanced error handling
    page.on('console', msg => {
      // Reduce console noise by only logging errors
      if (msg.type() === 'error') {
        console.log(`PAGE ERROR: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`PAGE CRASH: ${error.message}`);
    });
  });

  test('should handle large console output without EPIPE', async ({ page }) => {
    await page.goto('/');
    
    // Generate large amount of console output
    await page.evaluate(() => {
      // Generate 1000 console.log statements
      for (let i = 0; i < 1000; i++) {
        console.log(`Test log message ${i}: ${'x'.repeat(100)}`);
      }
    });
    
    // Page should still be responsive
    await expect(page.locator('body')).toBeVisible();
    const title = await page.title();
    expect(title).toContain('AI Readiness');
  });

  test('should handle rapid navigation without EPIPE', async ({ page }) => {
    const pages = ['/', '/auth/login', '/', '/auth/login', '/'];
    
    // Rapidly navigate between pages
    for (let i = 0; i < pages.length; i++) {
      await page.goto(pages[i], { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Verify page loaded
      await expect(page.locator('body')).toBeVisible();
      
      // Small delay to prevent overwhelming the browser
      await page.waitForTimeout(100);
    }
    
    // Final verification
    await expect(page).toHaveURL('/');
  });

  test('should handle multiple concurrent requests without EPIPE', async ({ page }) => {
    await page.goto('/');
    
    // Make multiple API requests concurrently
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        page.request.get('/api/check-env').catch(err =>  {
          console.log(`Request ${i} failed: ${err.message}`);
          return null;
        })
      );
    }
    
    const responses = await Promise.allSettled(requests);
    
    // At least some requests should succeed
    const successfulRequests = responses.filter(
      result => result.status === 'fulfilled' && result.value && result.value.ok()
    );
    
    expect(successfulRequests.length).toBeGreaterThan(0);
  });

  test('should handle long-running operations without EPIPE', async ({ page }) => {
    await page.goto('/');
    
    // Simulate a long-running operation that generates output
    await page.evaluate(async () => {
      return new Promise(resolve => {
        let counter = 0;
        const interval = setInterval(() => {
          console.log(`Long operation progress: ${counter++}`);
          
          if (counter >= 100) {
            clearInterval(interval);
            resolve(counter);
          }
        }, 10); // Every 10ms for 1 second total
      });
    });
    
    // Page should still be responsive after long operation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle page with many DOM elements without EPIPE', async ({ page }) => {
    await page.goto('/');
    
    // Create a page with many DOM elements
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'stress-test-container';
      
      // Create 1000 DOM elements
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.textContent = `Element ${i}`;
        element.className = 'stress-test-element';
        container.appendChild(element);
      }
      
      document.body.appendChild(container);
    });
    
    // Verify elements were created
    const elementCount = await page.locator('.stress-test-element').count();
    expect(elementCount).toBe(1000);
    
    // Clean up
    await page.evaluate(() => {
      const container = document.getElementById('stress-test-container');
      if (container) {
        container.remove();
      }
    });
  });

  test('should handle network timeouts gracefully without EPIPE', async ({ page }) => {
    // Set a very short timeout to trigger timeout scenarios
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(5000);
    
    await page.goto('/');
    
    // Try to make a request that might timeout
    try {
      await page.request.get('/api/slow-endpoint-that-does-not-exist', {
        timeout: 1000
      });
    } catch (error) {
      // Timeout is expected, just verify it's handled gracefully
      expect((error as Error).message).toMatch(/timeout|network/i);
    }
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle browser crash recovery without EPIPE', async ({ page }) => {
    await page.goto('/');
    
    // Simulate conditions that might cause browser issues
    await page.evaluate(() => {
      // Create a lot of memory pressure
      const arrays = [];
      for (let i = 0; i < 100; i++) {
        arrays.push(new Array(10000).fill(`memory-pressure-${i}`));
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      return arrays.length;
    });
    
    // Browser should recover and page should still work
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/AI Readiness/);
  });
});

test.describe('EPIPE Prevention Validation', () => {
  test('should have EPIPE-safe reporter configuration', async ({ }) => {
    // This test validates that our configuration is set up correctly
    const config = require('../playwright.config.epipe-fix.ts');
    
    // Verify reporter configuration
    expect(config.default.reporter).toBeDefined();
    
    // Should have file-based reporters
    const reporters = config.default.reporter;
    const hasHtmlReporter = reporters.some((r: any) => r[0] === 'html');
    const hasJsonReporter = reporters.some((r: any) => r[0] === 'json');
    const hasJunitReporter = reporters.some((r: any) => r[0] === 'junit');
    
    expect(hasHtmlReporter).toBe(true);
    expect(hasJsonReporter).toBe(true);
    expect(hasJunitReporter).toBe(true);
  });

  test('should have proper browser launch configuration', async ({ browser }) => {
    // Verify browser is launched with EPIPE-safe configuration
    const browserName = browser.browserType().name();
    expect(browserName).toBe('chromium');
    
    // Browser should be functional
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('data:text/html,<h1>Browser Test</h1>');
    await expect(page.locator('h1')).toHaveText('Browser Test');
    
    await page.close();
    await context.close();
  });
});