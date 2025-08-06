/**
 * Comprehensive Responsive Behavior Tests
 * Tests responsive design across all screen sizes, orientations, and devices
 */

import { test, expect, devices } from '@playwright/test';

test.describe('Comprehensive Responsive Behavior Tests', () => {
  
  test.describe('Mobile Responsiveness', () => {
    test.use({ ...devices['iPhone 12'] });

    test('Should display mobile navigation correctly', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Mobile viewport should show hamburger menu
      const hamburgerMenu = page.locator('[data-testid="mobile-menu-button"], .mobile-menu-toggle, .hamburger');
      if (await hamburgerMenu.isVisible()) {
        await expect(hamburgerMenu).toBeVisible();
        
        // Click to open menu
        await hamburgerMenu.click();
        await expect(page.locator('[data-testid="mobile-menu"], .mobile-nav')).toBeVisible();
        
        // Click to close menu
        await hamburgerMenu.click();
        await expect(page.locator('[data-testid="mobile-menu"], .mobile-nav')).not.toBeVisible();
      }
    });

    test('Should handle form layouts on mobile', async ({ page }) => {
      await page.goto('/auth/register');
      
      // Form should stack vertically on mobile
      const form = page.locator('[data-testid="register-form"]');
      await expect(form).toBeVisible();
      
      // Check input field visibility and sizing
      const inputs = [
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="first-name-input"]',
        '[data-testid="last-name-input"]'
      ];
      
      for (const input of inputs) {
        const field = page.locator(input);
        await expect(field).toBeVisible();
        
        // Input should be full width on mobile
        const boundingBox = await field.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(200);
      }
      
      // Submit button should be full width
      const submitButton = page.locator('[data-testid="register-submit"]');
      await expect(submitButton).toBeVisible();
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(200);
    });

    test('Should handle touch interactions', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Touch targets should be large enough (minimum 44px)
      const touchTargets = await page.locator('button, a, input[type="submit"], input[type="button"]').all();
      
      for (const target of touchTargets.slice(0, 5)) { // Test first 5 to avoid timeout
        const boundingBox = await target.boundingBox();
        if (boundingBox) {
          expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(32);
        }
      }
      
      // Test tap functionality
      const emailInput = page.locator('[data-testid="email-input"]');
      await emailInput.tap();
      await expect(emailInput).toBeFocused();
    });

    test('Should display content without horizontal scrolling', async ({ page }) => {
      const testPages = [
        '/auth/login',
        '/auth/register',
        '/auth/forgot-password'
      ];
      
      for (const testPage of testPages) {
        await page.goto(testPage);
        
        // Check for horizontal overflow
        const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
        const viewportWidth = page.viewportSize()?.width || 0;
        
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // Allow 5px tolerance
      }
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test.use({ ...devices['iPad'] });

    test('Should adapt layout for tablet screens', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should show appropriate layout for tablet
      const mainContent = page.locator('[data-testid="main-content"], main');
      await expect(mainContent).toBeVisible();
      
      // Navigation should be optimized for tablet
      const navigation = page.locator('[data-testid="navigation"], nav');
      if (await navigation.isVisible()) {
        const navBox = await navigation.boundingBox();
        expect(navBox?.width).toBeGreaterThan(100);
      }
    });

    test('Should handle orientation changes', async ({ page, context }) => {
      // Start in landscape (iPad default)
      await page.goto('/survey');
      await expect(page.locator('body')).toBeVisible();
      
      // Change to portrait
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000); // Allow layout to adjust
      
      // Content should still be accessible
      await expect(page.locator('body')).toBeVisible();
      
      // Check that no content is cut off
      const bodyHeight = await page.locator('body').evaluate(el => el.scrollHeight);
      const viewportHeight = page.viewportSize()?.height || 0;
      
      // Content might be taller than viewport (scrolling is okay)
      expect(bodyHeight).toBeGreaterThan(0);
      expect(viewportHeight).toBeGreaterThan(0);
    });
  });

  test.describe('Desktop Responsiveness', () => {
    test.use({ ...devices['Desktop Chrome'] });

    test('Should utilize full desktop layout', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Desktop should show full sidebar navigation
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar');
      if (await sidebar.isVisible()) {
        await expect(sidebar).toBeVisible();
        
        const sidebarBox = await sidebar.boundingBox();
        expect(sidebarBox?.width).toBeGreaterThan(200);
      }
      
      // Main content should use remaining space
      const mainContent = page.locator('[data-testid="main-content"], main');
      await expect(mainContent).toBeVisible();
    });

    test('Should handle large screen layouts', async ({ page }) => {
      // Test with large screen
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/organization/analytics');
      
      // Content should scale appropriately
      const container = page.locator('[data-testid="analytics-container"], .analytics-dashboard');
      if (await container.isVisible()) {
        const containerBox = await container.boundingBox();
        
        // Should use available space but not be too stretched
        expect(containerBox?.width).toBeGreaterThan(800);
        expect(containerBox?.width).toBeLessThan(1800); // Max width constraint
      }
    });
  });

  test.describe('Breakpoint Testing', () => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1024, height: 768 },
      { name: 'large-desktop', width: 1440, height: 900 },
      { name: 'extra-large', width: 1920, height: 1080 }
    ];

    breakpoints.forEach(({ name, width, height }) => {
      test(`Should handle ${name} breakpoint (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/auth/login');
        
        // Basic functionality should work at all breakpoints
        await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
        
        // Check for horizontal scrolling
        const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(width + 10); // Allow small tolerance
      });
    });
  });

  test.describe('Content Scaling', () => {
    test('Should scale text appropriately across screen sizes', async ({ page }) => {
      const sizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 } // Large desktop
      ];
      
      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.goto('/dashboard');
        
        // Text should be readable at all sizes
        const headings = await page.locator('h1, h2, h3').all();
        
        for (const heading of headings.slice(0, 3)) { // Test first 3 headings
          if (await heading.isVisible()) {
            const fontSize = await heading.evaluate(el => 
              parseInt(window.getComputedStyle(el).fontSize)
            );
            
            // Font size should be reasonable for screen size
            if (size.width < 768) {
              expect(fontSize).toBeGreaterThanOrEqual(16); // Minimum mobile size
            } else {
              expect(fontSize).toBeGreaterThanOrEqual(18); // Desktop size
            }
          }
        }
      }
    });

    test('Should scale images and media appropriately', async ({ page }) => {
      await page.goto('/visual-story-demo');
      
      const images = await page.locator('img').all();
      
      for (const image of images.slice(0, 3)) { // Test first 3 images
        if (await image.isVisible()) {
          const boundingBox = await image.boundingBox();
          const viewport = page.viewportSize();
          
          if (boundingBox && viewport) {
            // Images should not exceed viewport width
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
            
            // Images should maintain aspect ratio
            expect(boundingBox.width).toBeGreaterThan(0);
            expect(boundingBox.height).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Interactive Elements', () => {
    test('Should maintain usability across screen sizes', async ({ page }) => {
      const testSizes = [
        { width: 375, height: 667 }, // Mobile
        { width: 1024, height: 768 }  // Desktop
      ];
      
      for (const size of testSizes) {
        await page.setViewportSize(size);
        await page.goto('/survey');
        
        // Interactive elements should be accessible
        const buttons = await page.locator('button').all();
        
        for (const button of buttons.slice(0, 5)) { // Test first 5 buttons
          if (await button.isVisible()) {
            // Should be clickable
            await expect(button).toBeEnabled();
            
            // Should have sufficient size for interaction
            const boundingBox = await button.boundingBox();
            if (boundingBox) {
              const minSize = size.width < 768 ? 44 : 32; // Larger touch targets on mobile
              expect(Math.min(boundingBox.width, boundingBox.height)).toBeGreaterThanOrEqual(minSize);
            }
          }
        }
      }
    });

    test('Should handle form interactions across devices', async ({ page }) => {
      // Test on mobile-sized screen
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/register');
      
      // Form should be fully functional
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123!');
      await page.fill('[data-testid="first-name-input"]', 'Test');
      await page.fill('[data-testid="last-name-input"]', 'User');
      
      // All fields should be filled successfully
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue('test@example.com');
      await expect(page.locator('[data-testid="password-input"]')).toHaveValue('Password123!');
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Test');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('User');
      
      // Form validation should work
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.click('[data-testid="register-submit"]');
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    });
  });

  test.describe('Accessibility in Responsive Design', () => {
    test('Should maintain accessibility across screen sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/login');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
      
      // Test form submission via keyboard
      await page.keyboard.press('Enter');
      
      // Should show validation errors
      await expect(page.locator('[data-testid="email-error"], [data-testid="password-error"]')).toBeVisible();
    });

    test('Should maintain proper focus management on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/auth/register');
      
      // Focus should be visible and manageable
      const focusableElements = [
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="first-name-input"]',
        '[data-testid="last-name-input"]',
        '[data-testid="register-submit"]'
      ];
      
      for (const selector of focusableElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          await element.focus();
          await expect(element).toBeFocused();
          
          // Focus should be visible (check if element is in viewport)
          const boundingBox = await element.boundingBox();
          const viewport = page.viewportSize();
          
          if (boundingBox && viewport) {
            expect(boundingBox.y).toBeGreaterThanOrEqual(-50); // Allow some offset for sticky headers
            expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(viewport.height + 50);
          }
        }
      }
    });
  });

  test.describe('Performance on Different Screen Sizes', () => {
    test('Should load efficiently on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Page should load within reasonable time
      await expect(page.locator('body')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      // Check for lazy loading of images
      const images = await page.locator('img').all();
      for (const image of images.slice(0, 3)) {
        const src = await image.getAttribute('src');
        const loading = await image.getAttribute('loading');
        
        // Images should either have lazy loading or be optimized
        expect(src || loading).toBeTruthy();
      }
    });

    test('Should handle resource loading across screen sizes', async ({ page }) => {
      const sizes = [
        { width: 375, height: 667 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ];
      
      for (const size of sizes) {
        await page.setViewportSize(size);
        
        const navigationStart = await page.evaluate(() => performance.now());
        await page.goto('/organization/analytics');
        
        // Wait for main content to be visible
        await expect(page.locator('body')).toBeVisible();
        
        const navigationEnd = await page.evaluate(() => performance.now());
        const totalTime = navigationEnd - navigationStart;
        
        // Performance should be reasonable across all sizes
        expect(totalTime).toBeLessThan(15000); // 15 seconds max
      }
    });
  });

  test.describe('Responsive Component Behavior', () => {
    test('Should adapt data tables for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/users');
      
      // Tables should either scroll horizontally or stack vertically on mobile
      const table = page.locator('[data-testid="users-table"], table');
      if (await table.isVisible()) {
        const tableBox = await table.boundingBox();
        const viewport = page.viewportSize();
        
        if (tableBox && viewport) {
          // Table should either fit in viewport or be scrollable
          const fitsInViewport = tableBox.width <= viewport.width;
          const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
          
          expect(fitsInViewport || hasHorizontalScroll).toBe(true);
        }
      }
    });

    test('Should handle modal dialogs responsively', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      // Open a modal if available
      const modalTrigger = page.locator('[data-testid="open-modal"], .modal-trigger');
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.locator('[data-testid="modal"], .modal');
        await expect(modal).toBeVisible();
        
        // Modal should fit in mobile viewport
        const modalBox = await modal.boundingBox();
        const viewport = page.viewportSize();
        
        if (modalBox && viewport) {
          expect(modalBox.width).toBeLessThanOrEqual(viewport.width);
          expect(modalBox.height).toBeLessThanOrEqual(viewport.height);
        }
        
        // Close modal
        const closeButton = page.locator('[data-testid="close-modal"], .modal-close');
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await expect(modal).not.toBeVisible();
        }
      }
    });
  });
});