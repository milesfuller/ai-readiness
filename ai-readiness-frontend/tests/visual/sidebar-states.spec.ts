import { test, expect } from '@playwright/test';
import { authSetup, createTestUser } from '../../e2e/fixtures/test-setup';

test.describe('Sidebar Visual States', () => {
  test.beforeEach(async ({ page }) => {
    await authSetup(page);
  });

  test.describe('Visual Regression Tests', () => {
    test('should match sidebar expanded state', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Take screenshot of expanded sidebar
      await expect(sidebar).toHaveScreenshot('sidebar-expanded.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });

    test('should match sidebar collapsed state', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Collapse sidebar
      await toggleButton.click();
      await page.waitForTimeout(300); // Wait for transition
      
      // Take screenshot of collapsed sidebar
      await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });

    test('should match mobile menu overlay state', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await menuToggle.click();
      
      const mobileOverlay = page.locator('[data-testid="mobile-menu-overlay"]');
      await expect(mobileOverlay).toBeVisible();
      
      // Take screenshot of mobile menu
      await expect(page).toHaveScreenshot('mobile-menu-overlay.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });

    test('should match admin sidebar with expanded menus', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const adminMenuItem = page.locator('[data-testid="nav-item-administration"]');
      const systemMenuItem = page.locator('[data-testid="nav-item-system"]');
      
      // Expand both admin menus
      await adminMenuItem.click();
      await systemMenuItem.click();
      
      // Take screenshot with all admin menus expanded
      await expect(sidebar).toHaveScreenshot('sidebar-admin-expanded.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });

    test('should match org admin sidebar', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const orgMenuItem = page.locator('[data-testid="nav-item-organization"]');
      
      // Expand organization menu
      await orgMenuItem.click();
      
      // Take screenshot of org admin sidebar
      await expect(sidebar).toHaveScreenshot('sidebar-org-admin.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });

    test('should match active navigation states', async ({ page }) => {
      await page.goto('/survey');
      await page.waitForLoadState('networkidle');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      
      // Take screenshot with survey item active
      await expect(sidebar).toHaveScreenshot('sidebar-survey-active.png', {
        threshold: 0.3,
        animations: 'disabled'
      });
    });
  });

  test.describe('Icon and Text Alignment', () => {
    test('should maintain proper icon alignment in collapsed state', async ({ page }) => {
      await page.goto('/dashboard');
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      await toggleButton.click();
      
      // Wait for transition to complete
      await page.waitForTimeout(300);
      
      const navItems = page.locator('[data-testid^="nav-item-"]');
      const navItemCount = await navItems.count();
      
      for (let i = 0; i < navItemCount; i++) {
        const navItem = navItems.nth(i);
        const icon = navItem.locator('svg').first();
        
        if (await icon.isVisible()) {
          const iconBox = await icon.boundingBox();
          const itemBox = await navItem.boundingBox();
          
          expect(iconBox).not.toBeNull();
          expect(itemBox).not.toBeNull();
          
          // Icon should be centered horizontally in the button
          const iconCenterX = iconBox!.x + iconBox!.width / 2;
          const itemCenterX = itemBox!.x + itemBox!.width / 2;
          
          // Allow for small differences due to padding/rounding
          expect(Math.abs(iconCenterX - itemCenterX)).toBeLessThan(5);
        }
      }
    });

    test('should maintain proper text alignment in expanded state', async ({ page }) => {
      await page.goto('/dashboard');
      
      const navItems = page.locator('[data-testid^="nav-item-"]');
      const navItemCount = await navItems.count();
      
      for (let i = 0; i < navItemCount; i++) {
        const navItem = navItems.nth(i);
        const icon = navItem.locator('svg').first();
        const textSpan = navItem.locator('span').first();
        
        if (await icon.isVisible() && await textSpan.isVisible()) {
          const iconBox = await icon.boundingBox();
          const textBox = await textSpan.boundingBox();
          
          expect(iconBox).not.toBeNull();
          expect(textBox).not.toBeNull();
          
          // Text should be to the right of icon with proper spacing (mr-2 = 8px)
          expect(textBox!.x).toBeGreaterThan(iconBox!.x + iconBox!.width + 4);
          
          // Text and icon should be vertically aligned
          const iconCenterY = iconBox!.y + iconBox!.height / 2;
          const textCenterY = textBox!.y + textBox!.height / 2;
          expect(Math.abs(iconCenterY - textCenterY)).toBeLessThan(5);
        }
      }
    });

    test('should not squash or distort icons during transitions', async ({ page }) => {
      await page.goto('/dashboard');
      
      const dashboardIcon = page.locator('[data-testid="nav-item-dashboard"] svg');
      
      // Get initial icon dimensions
      const initialBox = await dashboardIcon.boundingBox();
      expect(initialBox).not.toBeNull();
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Start transition to collapsed
      await toggleButton.click();
      
      // Check icon dimensions during transition (halfway point)
      await page.waitForTimeout(150);
      const midTransitionBox = await dashboardIcon.boundingBox();
      expect(midTransitionBox).not.toBeNull();
      
      // Icon should maintain aspect ratio during transition
      const initialAspectRatio = initialBox!.width / initialBox!.height;
      const midAspectRatio = midTransitionBox!.width / midTransitionBox!.height;
      expect(Math.abs(initialAspectRatio - midAspectRatio)).toBeLessThan(0.2);
      
      // Complete transition
      await page.waitForTimeout(200);
      const finalBox = await dashboardIcon.boundingBox();
      expect(finalBox).not.toBeNull();
      
      // Final aspect ratio should match initial
      const finalAspectRatio = finalBox!.width / finalBox!.height;
      expect(Math.abs(initialAspectRatio - finalAspectRatio)).toBeLessThan(0.1);
    });
  });

  test.describe('Button States and Interactions', () => {
    test('should not show hover scale animation on toggle button', async ({ page }) => {
      await page.goto('/dashboard');
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Verify no scale transform is applied
      const buttonStyles = await toggleButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Should not have any scale transform
      expect(buttonStyles).toBe('none');
      
      // Hover over button
      await toggleButton.hover();
      
      // Check that no scale is applied on hover
      const hoverStyles = await toggleButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      expect(hoverStyles).toBe('none');
      
      // Verify class list doesn't contain hover:scale-110
      const classList = await toggleButton.getAttribute('class');
      expect(classList).not.toContain('hover:scale-110');
    });

    test('should maintain consistent button hover states', async ({ page }) => {
      await page.goto('/dashboard');
      
      const navItems = page.locator('[data-testid^="nav-item-"]');
      const navItemCount = await navItems.count();
      
      for (let i = 0; i < navItemCount; i++) {
        const navItem = navItems.nth(i);
        
        // Get initial background color
        const initialBg = await navItem.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Hover over item
        await navItem.hover();
        
        // Should have hover effect (background change)
        const hoverBg = await navItem.evaluate(el => 
          window.getComputedStyle(el).backgroundColor
        );
        
        // Background should change on hover (unless it's the active item)
        const isActive = await navItem.getAttribute('class');
        if (!isActive?.includes('bg-teal-500/10')) {
          expect(hoverBg).not.toBe(initialBg);
        }
      }
    });

    test('should show proper focus states for accessibility', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Focus first navigation item with keyboard
      await page.keyboard.press('Tab');
      let focusedElement = await page.locator(':focus').first();
      
      // Keep tabbing until we reach a nav item
      let attempts = 0;
      while (attempts < 20) {
        const testId = await focusedElement.getAttribute('data-testid');
        if (testId && testId.startsWith('nav-item-')) {
          break;
        }
        await page.keyboard.press('Tab');
        focusedElement = await page.locator(':focus').first();
        attempts++;
      }
      
      // Should have visible focus indicator
      const focusStyles = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor
        };
      });
      
      // Should have some form of focus indicator
      const hasFocusIndicator = 
        focusStyles.outline !== 'none' || 
        focusStyles.boxShadow !== 'none' || 
        focusStyles.borderColor !== 'transparent';
      
      expect(hasFocusIndicator).toBeTruthy();
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should hide desktop sidebar on mobile screens', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should show desktop sidebar initially
      const desktopSidebar = page.locator('[data-testid="sidebar"]').first();
      await expect(desktopSidebar).toBeVisible();
      
      // Switch to mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Desktop sidebar should be hidden
      await expect(desktopSidebar).toBeHidden();
      
      // Mobile menu toggle should be visible
      const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(mobileToggle).toBeVisible();
    });

    test('should show desktop sidebar on larger screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      // Should show mobile toggle
      const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(mobileToggle).toBeVisible();
      
      // Switch to desktop viewport
      await page.setViewportSize({ width: 1024, height: 768 });
      
      // Desktop sidebar should be visible
      const desktopSidebar = page.locator('[data-testid="sidebar"]').first();
      await expect(desktopSidebar).toBeVisible();
      
      // Mobile toggle should be hidden
      await expect(mobileToggle).toBeHidden();
    });

    test('should handle tablet viewport appropriately', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      
      // At md breakpoint (768px), should show desktop sidebar
      const desktopSidebar = page.locator('[data-testid="sidebar"]').first();
      await expect(desktopSidebar).toBeVisible();
      
      const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(mobileToggle).toBeHidden();
    });
  });

  test.describe('Transition Animations', () => {
    test('should have smooth width transitions', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      
      // Verify CSS transition properties
      const transitionStyles = await sidebar.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          transitionProperty: styles.transitionProperty,
          transitionDuration: styles.transitionDuration,
          transitionTimingFunction: styles.transitionTimingFunction
        };
      });
      
      // Should have transition-all with duration-300
      expect(transitionStyles.transitionProperty).toContain('all');
      expect(transitionStyles.transitionDuration).toContain('0.3s');
      
      // Test actual transition
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Measure width before toggle
      const initialWidth = await sidebar.evaluate(el => el.offsetWidth);
      
      // Start toggle
      await toggleButton.click();
      
      // Check width during transition
      await page.waitForTimeout(100);
      const midWidth = await sidebar.evaluate(el => el.offsetWidth);
      
      // Width should be changing
      expect(midWidth).not.toBe(initialWidth);
      
      // Wait for transition to complete
      await page.waitForTimeout(250);
      const finalWidth = await sidebar.evaluate(el => el.offsetWidth);
      
      // Final width should be different from initial
      expect(finalWidth).not.toBe(initialWidth);
      
      // For collapsed state, should be 64px (w-16)
      expect(finalWidth).toBe(64);
    });

    test('should handle rapid toggle clicks gracefully', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Rapid click toggle button multiple times
      for (let i = 0; i < 5; i++) {
        await toggleButton.click();
        await page.waitForTimeout(50); // Very short delay between clicks
      }
      
      // Wait for all transitions to settle
      await page.waitForTimeout(500);
      
      // Should end up in a stable state
      const finalWidth = await sidebar.evaluate(el => el.offsetWidth);
      
      // Should be either expanded (256px) or collapsed (64px)
      expect([64, 256]).toContain(finalWidth);
      
      // Button should still be functional
      await toggleButton.click();
      await page.waitForTimeout(350);
      
      const newWidth = await sidebar.evaluate(el => el.offsetWidth);
      expect(newWidth).not.toBe(finalWidth);
    });
  });
});