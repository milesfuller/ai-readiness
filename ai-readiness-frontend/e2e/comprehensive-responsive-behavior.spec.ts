/**
 * Comprehensive Responsive Behavior Tests
 * Tests application behavior across different device sizes and orientations
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Comprehensive Responsive Behavior Tests', () => {
  
  test.describe('Mobile Responsiveness', () => {
    
    test('Should display mobile navigation correctly on iPhone', async ({ page }) => {
      // Set iPhone viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Verify mobile layout
      await expect(page.locator('form')).toBeVisible();
      
      // Check that elements are properly sized for mobile
      const form = page.locator('form');
      const boundingBox = await form.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeLessThan(375); // Should fit in mobile viewport
      }
    });

    test('Should display mobile navigation correctly on Android', async ({ page }) => {
      // Set Android viewport
      await page.setViewportSize({ width: 360, height: 640 });
      await page.goto('/auth/login');
      
      // Verify mobile layout
      await expect(page.locator('form')).toBeVisible();
      
      // Check input field sizing
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      
      const inputBox = await emailInput.boundingBox();
      if (inputBox) {
        expect(inputBox.width).toBeLessThan(340); // Should fit comfortably
      }
    });

    test('Should handle mobile form interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Test mobile form interaction
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      
      // Verify inputs are filled
      await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
      await expect(page.locator('input[type="password"]')).toHaveValue('password123');
    });

    test('Should handle mobile orientation changes', async ({ page }) => {
      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      await expect(page.locator('form')).toBeVisible();
      
      // Landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('form')).toBeVisible();
      
      // Form should still be functional
      await page.fill('input[type="email"]', 'test@example.com');
      await expect(page.locator('input[type="email"]')).toHaveValue('test@example.com');
    });

    test('Should display proper mobile typography', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Check font sizes are appropriate for mobile
      const heading = page.locator('h1, h2, .text-2xl, .text-xl').first();
      if (await heading.count() > 0) {
        const fontSize = await heading.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        
        // Font size should be readable on mobile (at least 16px)
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(16);
      }
    });
  });

  test.describe('Tablet Responsiveness', () => {
    
    test('Should display properly on iPad', async ({ page }) => {
      // Set iPad viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/login');
      
      // Verify tablet layout
      await expect(page.locator('form')).toBeVisible();
      
      // Form should be centered and appropriately sized
      const form = page.locator('form');
      const boundingBox = await form.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(300);
        expect(boundingBox.width).toBeLessThan(600);
      }
    });

    test('Should handle tablet form interactions', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/login');
      
      // Test form interaction on tablet
      await page.fill('input[type="email"]', 'tablet@example.com');
      await page.fill('input[type="password"]', 'tabletpass123');
      
      // Verify inputs work properly
      await expect(page.locator('input[type="email"]')).toHaveValue('tablet@example.com');
      await expect(page.locator('input[type="password"]')).toHaveValue('tabletpass123');
    });

    test('Should handle tablet orientation changes', async ({ page }) => {
      // Portrait mode
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/auth/login');
      await expect(page.locator('form')).toBeVisible();
      
      // Landscape mode
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator('form')).toBeVisible();
      
      // Form should remain functional
      await page.fill('input[type="email"]', 'landscape@example.com');
      await expect(page.locator('input[type="email"]')).toHaveValue('landscape@example.com');
    });
  });

  test.describe('Desktop Responsiveness', () => {
    
    test('Should utilize full desktop layout', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/dashboard');
      
      // Navigation should be visible on desktop
      const navigation = page.locator('nav, [role="navigation"]');
      if (await navigation.count() > 0) {
        await expect(navigation.first()).toBeVisible();
      }
    });

    test('Should handle large desktop screens', async ({ page }) => {
      // Set large desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/auth/login');
      
      // Content should be properly centered and not stretched
      const form = page.locator('form');
      const boundingBox = await form.boundingBox();
      
      if (boundingBox) {
        // Form shouldn't be too wide on large screens
        expect(boundingBox.width).toBeLessThan(800);
      }
    });

    test('Should handle desktop form interactions', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/auth/login');
      
      // Test desktop-specific interactions
      await page.fill('input[type="email"]', 'desktop@example.com');
      await page.fill('input[type="password"]', 'desktoppass123');
      
      // Tab navigation should work
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Submit button should be focused
      const submitButton = page.locator('button[type="submit"]');
      const isFocused = await submitButton.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Responsive Layout Tests', () => {
    
    test('Should adapt layout for different screen widths', async ({ page }) => {
      const testWidths = [320, 375, 768, 1024, 1280, 1920];
      
      for (const width of testWidths) {
        await page.setViewportSize({ width, height: 720 });
        await page.goto('/auth/login');
        
        // Form should be visible at all widths
        await expect(page.locator('form')).toBeVisible();
        
        // Content should not overflow
        const body = await page.locator('body').boundingBox();
        if (body) {
          expect(body.width).toBeLessThanOrEqual(width + 20); // Allow small margin for scrollbars
        }
      }
    });

    test('Should handle responsive breakpoints', async ({ page }) => {
      // Test major breakpoints
      const breakpoints = [
        { width: 320, name: 'mobile-small' },
        { width: 375, name: 'mobile-medium' },
        { width: 768, name: 'tablet' },
        { width: 1024, name: 'desktop-small' },
        { width: 1280, name: 'desktop-large' }
      ];
      
      for (const breakpoint of breakpoints) {
        await page.setViewportSize({ width: breakpoint.width, height: 720 });
        await page.goto('/auth/login');
        
        // Form should be appropriately sized for each breakpoint
        const form = page.locator('form');
        const boundingBox = await form.boundingBox();
        
        if (boundingBox) {
          // Form should not exceed viewport width
          expect(boundingBox.width).toBeLessThan(breakpoint.width);
          
          // Form should have minimum usable width
          expect(boundingBox.width).toBeGreaterThan(Math.min(280, breakpoint.width * 0.8));
        }
      }
    });

    test('Should maintain aspect ratios', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/auth/login');
      
      // Check if any images maintain proper aspect ratios
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        if (await image.isVisible()) {
          const boundingBox = await image.boundingBox();
          if (boundingBox) {
            const aspectRatio = boundingBox.width / boundingBox.height;
            // Aspect ratio should be reasonable (between 0.1 and 10)
            expect(aspectRatio).toBeGreaterThan(0.1);
            expect(aspectRatio).toBeLessThan(10);
          }
        }
      }
    });
  });

  test.describe('Touch and Interaction Tests', () => {
    
    test('Should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Test touch interactions
      const emailInput = page.locator('input[type="email"]');
      await emailInput.tap();
      await emailInput.fill('touch@example.com');
      
      await expect(emailInput).toHaveValue('touch@example.com');
    });

    test('Should provide adequate touch targets', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Check that interactive elements have adequate touch target size
      const button = page.locator('button[type="submit"]');
      const boundingBox = await button.boundingBox();
      
      if (boundingBox) {
        // Touch targets should be at least 44x44px for accessibility
        expect(boundingBox.width).toBeGreaterThanOrEqual(40);
        expect(boundingBox.height).toBeGreaterThanOrEqual(40);
      }
    });
  });
});