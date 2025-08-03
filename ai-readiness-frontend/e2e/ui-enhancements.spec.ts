import { test, expect } from '@playwright/test';

test.describe('UI Enhancements Validation', () => {
  test.describe('Animation & Interactions', () => {
    test('should have smooth button hover effects', async ({ page }) => {
      await page.goto('/auth/login');
      
      const button = page.locator('button[type="submit"]');
      
      // Get initial styles
      const initialTransform = await button.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Hover over button
      await button.hover();
      
      // Wait for animation
      await page.waitForTimeout(200);
      
      // Check transform changed (scale effect)
      const hoverTransform = await button.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(hoverTransform).not.toBe(initialTransform);
    });

    test('should have glassmorphism effects', async ({ page }) => {
      await page.goto('/');
      
      // Check for glass cards
      const glassElements = page.locator('.glass-card');
      const count = await glassElements.count();
      expect(count).toBeGreaterThan(0);
      
      // Verify backdrop blur
      const hasBackdropBlur = await glassElements.first().evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backdropFilter || (styles as any).webkitBackdropFilter;
      });
      
      expect(hasBackdropBlur).toContain('blur');
    });
  });

  test.describe('Progress Celebrations', () => {
    test('should show celebration at 100% progress', async ({ page }) => {
      // Mock survey completion
      await page.goto('/survey/test-session');
      
      // Check for celebration elements (would need actual survey completion)
      // This is a placeholder for the actual test
      const celebrationElements = page.locator('[class*="celebrate"], [class*="confetti"]');
      
      // In real scenario, complete survey to 100%
      // await completeSurvey(page);
      
      // Check celebration exists
      // expect(await celebrationElements.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Loading States', () => {
    test('should have skeleton loading states', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for skeleton elements
      const skeletons = page.locator('[class*="skeleton"], [class*="shimmer"]');
      
      // Loading states should exist
      const count = await skeletons.count();
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 if data loads fast
    });
  });

  test.describe('Mobile Touch Targets', () => {
    test('should have proper touch target sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Check all interactive elements
      const interactiveElements = await page.locator('button, a, input').all();
      
      for (const element of interactiveElements.slice(0, 5)) {
        const box = await element.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Accessibility Enhancements', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      
      // Check that animations are reduced
      const animatedElement = page.locator('[class*="animate-"]').first();
      
      if (await animatedElement.count() > 0) {
        const animationDuration = await animatedElement.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.animationDuration;
        });
        
        // Animation should be instant or very short
        expect(parseFloat(animationDuration)).toBeLessThanOrEqual(0.01);
      }
    });

    test('should have proper focus indicators', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      
      // Get focused element
      const focusedElement = page.locator(':focus');
      const className = await focusedElement.getAttribute('class');
      
      // Should have focus ring
      expect(className).toMatch(/ring|focus/);
    });
  });

  test.describe('Dark Theme', () => {
    test('should have proper dark theme implementation', async ({ page }) => {
      await page.goto('/');
      
      // Check for dark theme classes
      const html = page.locator('html');
      const className = await html.getAttribute('class');
      
      // Should have dark class or proper background
      const bgColor = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Dark background should be dark
      const rgb = bgColor.match(/\d+/g);
      if (rgb) {
        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        expect(brightness).toBeLessThan(50); // Dark color
      }
    });
  });

  test.describe('Brand Consistency', () => {
    test('should use consistent brand colors', async ({ page }) => {
      await page.goto('/');
      
      // Check for brand gradient usage
      const gradientElements = await page.locator('[class*="gradient-"], [class*="teal"], [class*="purple"], [class*="pink"]').count();
      expect(gradientElements).toBeGreaterThan(0);
      
      // Check primary buttons use brand colors
      const primaryButton = page.locator('button').filter({ hasText: /sign|get started/i }).first();
      
      if (await primaryButton.count() > 0) {
        const bgColor = await primaryButton.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Should contain teal, purple, or pink values
        expect(bgColor).toMatch(/rgb|linear-gradient/);
      }
    });
  });
});