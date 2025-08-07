import { test, expect } from '@playwright/test';
import { authSetup, createTestUser } from '../../e2e/fixtures/test-setup';

test.describe('Mobile Menu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await authSetup(page);
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test.describe('Mobile Menu Toggle', () => {
    test('should show menu toggle button on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for header to load
      await page.waitForSelector('[data-testid="header"]', { state: 'visible' });
      
      // Menu toggle should be visible on mobile
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(menuToggle).toBeVisible();
      
      // Desktop sidebar should be hidden
      const desktopSidebar = page.locator('[data-testid="sidebar"]').first();
      await expect(desktopSidebar).toBeHidden();
    });

    test('should open mobile menu overlay when toggle clicked', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Mobile menu overlay should appear
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeVisible();
      
      // Backdrop should be visible
      const backdrop = page.locator('[data-testid="mobile-menu-backdrop"]');
      await expect(backdrop).toBeVisible();
      
      // Mobile sidebar should be visible
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
      await expect(mobileSidebar).toBeVisible();
    });

    test('should close mobile menu when backdrop clicked', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Verify menu is open
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeVisible();
      
      // Click backdrop
      const backdrop = page.locator('[data-testid="mobile-menu-backdrop"]');
      await backdrop.click();
      
      // Menu should close
      await expect(mobileOverlay).toBeHidden();
    });

    test('should close mobile menu when navigation item clicked', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Click a navigation item
      const surveyLink = page.locator('[data-testid="mobile-nav-item-take-survey"]');
      await expect(surveyLink).toBeVisible();
      await surveyLink.click();
      
      // Menu should close and navigate
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeHidden();
      await expect(page).toHaveURL('/survey');
    });
  });

  test.describe('Mobile Menu Positioning', () => {
    test('should position mobile menu correctly', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
      
      // Should be positioned at left edge
      const sidebarBox = await mobileSidebar.boundingBox();
      expect(sidebarBox).not.toBeNull();
      expect(sidebarBox!.x).toBe(0);
      
      // Should be full height
      expect(sidebarBox!.height).toBeGreaterThan(600);
      
      // Should have proper width (w-64 = 256px)
      expect(sidebarBox!.width).toBe(256);
    });

    test('should account for header height in mobile menu', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
      const sidebarContent = page.locator('[data-testid="mobile-sidebar"] > div');
      
      // Content should have top padding for header (pt-16 = 64px)
      const contentStyles = await sidebarContent.evaluate(el => 
        window.getComputedStyle(el).paddingTop
      );
      expect(contentStyles).toBe('64px');
    });

    test('should be above other content (z-index)', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      
      // Should have high z-index (z-50)
      const zIndex = await mobileOverlay.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(zIndex)).toBeGreaterThan(40);
    });
  });

  test.describe('Mobile Menu Navigation', () => {
    test('should navigate correctly from mobile menu', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Test navigation to each main section
      const testCases = [
        { selector: '[data-testid="mobile-nav-item-dashboard"]', url: '/dashboard' },
        { selector: '[data-testid="mobile-nav-item-take-survey"]', url: '/survey' },
        { selector: '[data-testid="mobile-nav-item-my-results"]', url: '/results' },
        { selector: '[data-testid="mobile-nav-item-settings"]', url: '/settings' }
      ];
      
      for (const testCase of testCases) {
        // Reopen menu for each test
        if (!await page.locator('[data-testid="mobile-menu-overlay"]').isVisible()) {
          await menuToggle.click();
        }
        
        const navItem = page.locator(testCase.selector);
        await expect(navItem).toBeVisible();
        await navItem.click();
        
        // Verify navigation and menu closure
        await expect(page).toHaveURL(testCase.url);
        await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeHidden();
        
        // Navigate back to dashboard for next iteration
        if (testCase.url !== '/dashboard') {
          await page.goto('/dashboard');
        }
      }
    });

    test('should show active states in mobile menu', async ({ page }) => {
      await page.goto('/survey');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Survey item should be active
      const surveyItem = page.locator('[data-testid="mobile-nav-item-take-survey"]');
      await expect(surveyItem).toHaveClass(/bg-teal-500\/10/);
      await expect(surveyItem).toHaveClass(/text-teal-400/);
      
      // Dashboard should not be active
      const dashboardItem = page.locator('[data-testid="mobile-nav-item-dashboard"]');
      await expect(dashboardItem).not.toHaveClass(/bg-teal-500\/10/);
    });

    test('should handle nested menus on mobile for admin users', async ({ page }) => {
      const adminUser = await createTestUser('system_admin');
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Admin menu should be available
      const adminParentItem = page.locator('[data-testid="mobile-nav-item-administration"]');
      await expect(adminParentItem).toBeVisible();
      
      // Click to expand admin menu
      await adminParentItem.click();
      
      // Child items should be visible
      const adminChildItem = page.locator('[data-testid="mobile-nav-item-all-surveys"]');
      await expect(adminChildItem).toBeVisible();
      
      // Click child item should navigate and close menu
      await adminChildItem.click();
      
      await expect(page).toHaveURL('/admin/surveys');
      await expect(page.locator('[data-testid="mobile-menu-overlay"]')).toBeHidden();
    });
  });

  test.describe('Mobile Menu Responsiveness', () => {
    test('should hide mobile menu on desktop resize', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Open mobile menu
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeVisible();
      
      // Resize to desktop
      await page.setViewportSize({ width: 1024, height: 768 });
      
      // Mobile menu should be hidden, desktop sidebar should appear
      await expect(mobileOverlay).toBeHidden();
      
      const desktopSidebar = page.locator('[data-testid="sidebar"]').first();
      await expect(desktopSidebar).toBeVisible();
      
      // Mobile menu toggle should be hidden
      await expect(menuToggle).toBeHidden();
    });

    test('should work across different mobile screen sizes', async ({ page }) => {
      const mobileSizes = [
        { width: 320, height: 568, name: 'iPhone 5/SE' },
        { width: 375, height: 667, name: 'iPhone 6/7/8' },
        { width: 414, height: 896, name: 'iPhone 11 Pro Max' },
        { width: 768, height: 1024, name: 'iPad Portrait' }
      ];
      
      for (const size of mobileSizes) {
        await page.setViewportSize(size);
        await page.goto('/dashboard');
        
        const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
        await expect(menuToggle).toBeVisible();
        
        // Test menu opening
        await menuToggle.click();
        const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
        await expect(mobileOverlay).toBeVisible();
        
        // Test navigation
        const surveyLink = page.locator('[data-testid="mobile-nav-item-take-survey"]');
        await surveyLink.click();
        
        await expect(page).toHaveURL('/survey');
        await expect(mobileOverlay).toBeHidden();
      }
    });
  });

  test.describe('Mobile Menu Accessibility', () => {
    test('should support keyboard navigation on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      
      // Focus menu toggle with keyboard
      await page.keyboard.press('Tab');
      // Keep pressing Tab until we reach the menu toggle
      let focusedElement = await page.locator(':focus').first();
      while (!(await focusedElement.getAttribute('data-testid') === 'mobile-menu-toggle')) {
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
      }
      
      // Press Enter to open menu
      await page.keyboard.press('Enter');
      
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeVisible();
      
      // Press Escape to close menu
      await page.keyboard.press('Escape');
      await expect(mobileOverlay).toBeHidden();
    });

    test('should have proper ARIA attributes for mobile menu', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      
      // Check ARIA attributes
      await expect(menuToggle).toHaveAttribute('aria-label', /menu/i);
      await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      
      // Open menu
      await menuToggle.click();
      await expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      
      // Mobile sidebar should have proper role
      const mobileSidebar = page.locator('[data-testid="mobile-sidebar"]');
      await expect(mobileSidebar).toHaveAttribute('role', 'navigation');
    });

    test('should trap focus within mobile menu', async ({ page }) => {
      await page.goto('/dashboard');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      // Focus should move into the menu
      const firstMenuItem = page.locator('[data-testid="mobile-nav-item-dashboard"]');
      await firstMenuItem.focus();
      await expect(firstMenuItem).toBeFocused();
      
      // Tab through menu items
      await page.keyboard.press('Tab');
      const secondMenuItem = page.locator('[data-testid="mobile-nav-item-take-survey"]');
      await expect(secondMenuItem).toBeFocused();
    });
  });
});