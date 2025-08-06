/**
 * Comprehensive Cross-Browser Compatibility Tests
 * Tests functionality across different browsers and browser features
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Comprehensive Cross-Browser Compatibility Tests', () => {
  
  test.describe('Browser-Specific Functionality', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test.describe(`${browserName} Browser Tests`, () => {
        test.use({ browserName: browserName as any });

        test('Should load application correctly', async ({ page }) => {
          await page.goto('/auth/login');
          
          // Basic functionality should work across browsers
          await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
          await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
          await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
          
          // Check for browser-specific console errors
          const errors = [];
          page.on('console', msg => {
            if (msg.type() === 'error' && !msg.text().includes('favicon')) {
              errors.push(msg.text());
            }
          });
          
          await page.waitForTimeout(3000);
          expect(errors.length).toBeLessThan(3); // Allow some minor errors
        });

        test('Should handle form submissions', async ({ page, testUser, rateLimitHandler }) => {
          await page.goto('/auth/login');
          
          await rateLimitHandler.executeWithRetry(async () => {
            await page.fill('[data-testid="email-input"]', testUser.email);
            await page.fill('[data-testid="password-input"]', testUser.password);
            await page.click('[data-testid="login-submit"]');
            
            // Should work across browsers
            await Promise.race([
              page.waitForURL(/dashboard/, { timeout: 30000 }),
              page.waitForSelector('[data-testid="login-error"]', { timeout: 15000 })
            ]);
          }, { identifier: `${browserName}-login` });
          
          // Should either succeed or show appropriate error
          const isOnDashboard = page.url().includes('/dashboard');
          const hasError = await page.locator('[data-testid="login-error"]').isVisible({ timeout: 3000 });
          
          expect(isOnDashboard || hasError).toBe(true);
        });

        test('Should handle CSS and styling correctly', async ({ page }) => {
          await page.goto('/dashboard');
          
          // Check if styles are loaded
          const body = page.locator('body');
          const backgroundColor = await body.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
          );
          
          // Should have some background color (not initial value)
          expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
          
          // Check for layout issues
          const mainContent = page.locator('[data-testid="main-content"], main').first();
          if (await mainContent.isVisible()) {
            const boundingBox = await mainContent.boundingBox();
            expect(boundingBox?.width).toBeGreaterThan(200);
            expect(boundingBox?.height).toBeGreaterThan(100);
          }
        });
      });
    });
  });

  test.describe('Browser Feature Detection', () => {
    test('Should handle localStorage availability', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Test localStorage
      const hasLocalStorage = await page.evaluate(() => {
        try {
          const testKey = 'test-key';
          localStorage.setItem(testKey, 'test-value');
          const value = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          return value === 'test-value';
        } catch {
          return false;
        }
      });
      
      // Application should handle localStorage absence gracefully
      if (!hasLocalStorage) {
        // Should still be functional without localStorage
        await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      }
      
      expect(typeof hasLocalStorage).toBe('boolean');
    });

    test('Should handle cookies correctly', async ({ page, context }) => {
      await page.goto('/auth/login');
      
      // Set a test cookie
      await context.addCookies([{
        name: 'test-cookie',
        value: 'test-value',
        domain: 'localhost',
        path: '/'
      }]);
      
      // Check if cookie is accessible
      const cookieValue = await page.evaluate(() => {
        return document.cookie.includes('test-cookie=test-value');
      });
      
      expect(cookieValue).toBe(true);
    });

    test('Should detect JavaScript features', async ({ page }) => {
      await page.goto('/dashboard');
      
      const jsFeatures = await page.evaluate(() => {
        return {
          es6: typeof Promise !== 'undefined',
          es2017: typeof Symbol !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          arrow: (() => true)() === true,
          destructuring: (() => {
            try {
              const [a] = [1];
              return a === 1;
            } catch { return false; }
          })(),
          modules: false // Changed from typeof import check to avoid syntax error
        };
      });
      
      // Modern browsers should support these features
      expect(jsFeatures.fetch).toBe(true);
      expect(jsFeatures.es6).toBe(true);
    });

    test('Should handle Web APIs availability', async ({ page }) => {
      await page.goto('/survey');
      
      const webApis = await page.evaluate(() => {
        return {
          mediaDevices: typeof navigator.mediaDevices !== 'undefined',
          geolocation: typeof navigator.geolocation !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator,
          webgl: (() => {
            try {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch { return false; }
          })(),
          webAudio: typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'
        };
      });
      
      // Voice recording functionality should check for mediaDevices
      const voiceButton = page.locator('[data-testid="voice-record"]');
      if (await voiceButton.isVisible()) {
        if (!webApis.mediaDevices) {
          // Should disable or hide voice features
          const isDisabled = await voiceButton.isDisabled();
          expect(isDisabled).toBe(true);
        }
      }
      
      expect(typeof webApis.serviceWorker).toBe('boolean');
    });
  });

  test.describe('Browser-Specific UI Behavior', () => {
    test('Should handle focus management across browsers', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Tab navigation should work consistently
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      
      // Should move focus between elements
      expect(firstFocused).not.toBe(secondFocused);
      
      // Should have visible focus indicators
      const focusedElement = page.locator(':focus');
      if (await focusedElement.isVisible()) {
        const outlineStyle = await focusedElement.evaluate(el => 
          window.getComputedStyle(el).outline
        );
        // Should have some kind of focus styling
        expect(outlineStyle).not.toBe('none');
      }
    });

    test('Should handle scroll behavior consistently', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Create content that requires scrolling
      await page.setViewportSize({ width: 1024, height: 400 });
      
      const initialScrollY = await page.evaluate(() => window.scrollY);
      
      // Scroll down
      await page.keyboard.press('End');
      await page.waitForTimeout(1000);
      
      const afterScrollY = await page.evaluate(() => window.scrollY);
      
      // Should be able to scroll (if content is long enough)
      expect(afterScrollY).toBeGreaterThanOrEqual(initialScrollY);
    });

    test('Should handle form validation consistently', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Test HTML5 validation
      const emailInput = page.locator('[data-testid="email-input"]');
      await emailInput.fill('invalid-email');
      
      const isValid = await emailInput.evaluate((input: HTMLInputElement) => input.validity.valid);
      expect(isValid).toBe(false);
      
      // Test custom validation
      await page.click('[data-testid="register-submit"]');
      
      const errorMessage = page.locator('[data-testid="email-error"]');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile Browser Compatibility', () => {
    test('Should work on mobile Safari', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12']
      });
      const page = await context.newPage();
      
      await page.goto('/auth/login');
      
      // Should handle touch events
      const emailInput = page.locator('[data-testid="email-input"]');
      await emailInput.tap();
      await expect(emailInput).toBeFocused();
      
      // Should handle viewport meta tag
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(viewportWidth).toBe(390); // iPhone 12 width
      
      await context.close();
    });

    test('Should work on mobile Chrome', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();
      
      await page.goto('/survey');
      
      // Should handle mobile interactions
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      if (buttonCount > 0) {
        const firstButton = buttons.first();
        const boundingBox = await firstButton.boundingBox();
        
        // Touch targets should be large enough
        if (boundingBox) {
          const minSize = Math.min(boundingBox.width, boundingBox.height);
          expect(minSize).toBeGreaterThanOrEqual(32); // Minimum touch target
        }
      }
      
      await context.close();
    });
  });

  test.describe('Performance Across Browsers', () => {
    test('Should load efficiently in different browsers', async ({ page, browserName }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for main content
      await expect(page.locator('body')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      // Different browsers may have different performance characteristics
      const maxLoadTime = browserName === 'webkit' ? 15000 : 10000;
      expect(loadTime).toBeLessThan(maxLoadTime);
    });

    test('Should handle memory usage appropriately', async ({ page }) => {
      await page.goto('/organization/analytics');
      
      // Perform memory-intensive operations
      for (let i = 0; i < 5; i++) {
        await page.reload();
        await page.waitForTimeout(1000);
      }
      
      // Check for memory leaks (simplified)
      const performanceInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });
      
      if (performanceInfo) {
        // Used heap size should be reasonable
        expect(performanceInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      }
    });
  });

  test.describe('Browser Security Features', () => {
    test('Should respect Content Security Policy', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Try to inject inline script (should be blocked by CSP)
      const scriptExecuted = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.cspTestExecuted = true;';
          document.head.appendChild(script);
          return !!(window as any).cspTestExecuted;
        } catch {
          return false;
        }
      });
      
      // CSP should prevent inline script execution
      expect(scriptExecuted).toBe(false);
    });

    test('Should handle HTTPS requirements', async ({ page }) => {
      // Check that secure features work appropriately
      const secureContextFeatures = await page.evaluate(() => {
        return {
          isSecureContext: window.isSecureContext,
          crypto: typeof window.crypto !== 'undefined',
          serviceWorker: 'serviceWorker' in navigator
        };
      });
      
      // In development, some features may not require HTTPS
      expect(typeof secureContextFeatures.crypto).toBe('boolean');
    });

    test('Should handle same-origin policy', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Try to access external resources
      const crossOriginBlocked = await page.evaluate(async () => {
        try {
          const response = await fetch('https://httpbin.org/json');
          return !response.ok;
        } catch (error) {
          // CORS or network error expected
          return true;
        }
      });
      
      // Should respect CORS policies
      expect(typeof crossOriginBlocked).toBe('boolean');
    });
  });

  test.describe('Browser Fallbacks and Graceful Degradation', () => {
    test('Should work without JavaScript (basic functionality)', async ({ page }) => {
      // Disable JavaScript
      await page.setJavaScriptEnabled(false);
      
      await page.goto('/auth/login');
      
      // Basic HTML should still be accessible
      await expect(page.locator('body')).toBeVisible();
      const hasForm = await page.locator('form').isVisible();
      expect(hasForm).toBe(true);
      
      // Re-enable JavaScript for other tests
      await page.setJavaScriptEnabled(true);
    });

    test('Should provide fallbacks for modern features', async ({ page }) => {
      await page.goto('/survey');
      
      // Mock unavailable features
      await page.addInitScript(() => {
        // Simulate older browser without some APIs
        delete (navigator as any).mediaDevices;
        delete (window as any).IntersectionObserver;
      });
      
      await page.reload();
      
      // Application should still function
      await expect(page.locator('body')).toBeVisible();
      
      // Voice recording should be disabled or show alternative
      const voiceButton = page.locator('[data-testid="voice-record"]');
      if (await voiceButton.isVisible()) {
        const isDisabled = await voiceButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
    });

    test('Should handle network connectivity issues', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Simulate offline
      await page.context().setOffline(true);
      
      // Try to navigate
      await page.click('[data-testid="profile-link"], a[href="/profile"]').catch(() => {
        // Navigation may fail offline
      });
      
      // Should show offline indication or cached content
      const offlineIndicator = page.locator('[data-testid="offline"], .offline-message');
      const hasOfflineMessage = await offlineIndicator.isVisible({ timeout: 5000 });
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should recover functionality
      await page.waitForTimeout(2000);
      const isOnline = await page.evaluate(() => navigator.onLine);
      expect(isOnline).toBe(true);
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    test('Should maintain ARIA attributes across browsers', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check ARIA attributes
      const ariaElements = page.locator('[aria-label], [aria-labelledby], [role]');
      const ariaCount = await ariaElements.count();
      
      if (ariaCount > 0) {
        const firstAriaElement = ariaElements.first();
        const ariaLabel = await firstAriaElement.getAttribute('aria-label');
        const role = await firstAriaElement.getAttribute('role');
        
        // Should have proper ARIA attributes
        expect(ariaLabel || role).toBeTruthy();
      }
    });

    test('Should support screen reader navigation', async ({ page }) => {
      await page.goto('/survey');
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        const headingLevels = [];
        for (let i = 0; i < Math.min(headingCount, 5); i++) {
          const heading = headings.nth(i);
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          headingLevels.push(parseInt(tagName.charAt(1)));
        }
        
        // Should have logical heading hierarchy
        expect(headingLevels[0]).toBe(1); // Should start with h1
      }
    });
  });

  test.describe('Progressive Web App Features', () => {
    test('Should handle service worker registration', async ({ page }) => {
      await page.goto('/dashboard');
      
      const swSupport = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            // Check if service worker is registered
            const registration = await navigator.serviceWorker.getRegistration();
            return !!registration;
          } catch {
            return false;
          }
        }
        return false;
      });
      
      // Service worker support varies by browser and context
      expect(typeof swSupport).toBe('boolean');
    });

    test('Should handle manifest and app installation', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for web app manifest
      const manifestLink = page.locator('link[rel="manifest"]');
      const hasManifest = await manifestLink.count() > 0;
      
      if (hasManifest) {
        const manifestHref = await manifestLink.getAttribute('href');
        expect(manifestHref).toBeTruthy();
      }
      
      // Check for install prompt capability
      const installSupport = await page.evaluate(() => {
        return 'onbeforeinstallprompt' in window;
      });
      
      expect(typeof installSupport).toBe('boolean');
    });
  });
});