import { test, expect } from '@playwright/test';
import { authSetup, createTestUser } from '../../e2e/fixtures/test-setup';

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication with different user roles
    await authSetup(page);
  });

  test.describe('Basic Navigation', () => {
    test('should navigate to dashboard when clicking Dashboard link', async ({ page }) => {
      const testUser = await createTestUser('user');
      await page.goto('/dashboard');
      
      // Wait for sidebar to load
      await page.waitForSelector('[data-testid="sidebar"]', { state: 'visible' });
      
      // Click Dashboard link
      const dashboardLink = page.locator('[data-testid="nav-item-dashboard"]');
      await expect(dashboardLink).toBeVisible();
      await dashboardLink.click();
      
      // Verify navigation occurred
      await expect(page).toHaveURL('/dashboard');
      
      // Verify active state styling
      await expect(dashboardLink).toHaveClass(/bg-teal-500\/10/);
      await expect(dashboardLink).toHaveClass(/text-teal-400/);
      await expect(dashboardLink).toHaveClass(/border-l-2 border-teal-500/);
    });

    test('should navigate to survey page when clicking Take Survey', async ({ page }) => {
      await page.goto('/dashboard');
      
      const surveyLink = page.locator('[data-testid="nav-item-take-survey"]');
      await expect(surveyLink).toBeVisible();
      await surveyLink.click();
      
      await expect(page).toHaveURL('/survey');
      await expect(surveyLink).toHaveClass(/bg-teal-500\/10/);
    });

    test('should navigate to results page when clicking My Results', async ({ page }) => {
      await page.goto('/dashboard');
      
      const resultsLink = page.locator('[data-testid="nav-item-my-results"]');
      await expect(resultsLink).toBeVisible();
      await resultsLink.click();
      
      await expect(page).toHaveURL('/results');
      await expect(resultsLink).toHaveClass(/bg-teal-500\/10/);
    });

    test('should navigate to settings when clicking Settings', async ({ page }) => {
      await page.goto('/dashboard');
      
      const settingsLink = page.locator('[data-testid="nav-item-settings"]');
      await expect(settingsLink).toBeVisible();
      await settingsLink.click();
      
      await expect(page).toHaveURL('/settings');
    });
  });

  test.describe('Collapsed/Expanded States', () => {
    test('should toggle sidebar collapse state', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Wait for sidebar to load
      const sidebar = page.locator('[data-testid="sidebar"]');
      await expect(sidebar).toBeVisible();
      
      // Initial state should be expanded (w-64)
      await expect(sidebar).toHaveClass(/w-64/);
      
      // Click toggle button
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      await expect(toggleButton).toBeVisible();
      await toggleButton.click();
      
      // Should be collapsed (w-16)
      await expect(sidebar).toHaveClass(/w-16/);
      
      // Click toggle again to expand
      await toggleButton.click();
      await expect(sidebar).toHaveClass(/w-64/);
    });

    test('should show only icons when collapsed', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Collapse sidebar
      await toggleButton.click();
      await expect(sidebar).toHaveClass(/w-16/);
      
      // Icons should be visible
      const dashboardIcon = page.locator('[data-testid="nav-item-dashboard"] svg');
      await expect(dashboardIcon).toBeVisible();
      
      // Text labels should be hidden
      const dashboardText = page.locator('[data-testid="nav-item-dashboard"] span:has-text("Dashboard")');
      await expect(dashboardText).toBeHidden();
      
      // Button height should change to h-12
      const navButton = page.locator('[data-testid="nav-item-dashboard"]');
      await expect(navButton).toHaveClass(/h-12/);
    });

    test('should show text and icons when expanded', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      
      // Ensure expanded state
      await expect(sidebar).toHaveClass(/w-64/);
      
      // Both icons and text should be visible
      const dashboardIcon = page.locator('[data-testid="nav-item-dashboard"] svg');
      const dashboardText = page.locator('[data-testid="nav-item-dashboard"] span:has-text("Dashboard")');
      
      await expect(dashboardIcon).toBeVisible();
      await expect(dashboardText).toBeVisible();
      
      // Button height should be h-10
      const navButton = page.locator('[data-testid="nav-item-dashboard"]');
      await expect(navButton).toHaveClass(/h-10/);
    });

    test('should maintain collapsed state across page navigation', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Collapse sidebar
      await toggleButton.click();
      await expect(sidebar).toHaveClass(/w-16/);
      
      // Navigate to another page
      const surveyLink = page.locator('[data-testid="nav-item-take-survey"]');
      await surveyLink.click();
      await expect(page).toHaveURL('/survey');
      
      // Sidebar should remain collapsed
      await expect(sidebar).toHaveClass(/w-16/);
    });
  });

  test.describe('Visual States', () => {
    test('should not show bouncing animation on toggle button', async ({ page }) => {
      await page.goto('/dashboard');
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Verify no hover:scale-110 class is present
      const buttonClass = await toggleButton.getAttribute('class');
      expect(buttonClass).not.toContain('hover:scale-110');
      
      // Test multiple clicks don't cause bouncing
      for (let i = 0; i < 3; i++) {
        await toggleButton.click();
        await page.waitForTimeout(100); // Small delay to check for unwanted animations
      }
      
      // Button should remain stable
      await expect(toggleButton).toBeVisible();
      await expect(toggleButton).toBeEnabled();
    });

    test('should not squash icons or text during transitions', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      const dashboardIcon = page.locator('[data-testid="nav-item-dashboard"] svg');
      
      // Get initial icon dimensions
      const initialIconBox = await dashboardIcon.boundingBox();
      expect(initialIconBox).not.toBeNull();
      
      // Toggle collapse
      await toggleButton.click();
      await page.waitForTimeout(300); // Wait for transition
      
      // Check icon dimensions remain consistent
      const collapsedIconBox = await dashboardIcon.boundingBox();
      expect(collapsedIconBox).not.toBeNull();
      
      // Icon should maintain its size (allowing for small layout differences)
      expect(Math.abs(collapsedIconBox!.width - initialIconBox!.width)).toBeLessThan(2);
      expect(Math.abs(collapsedIconBox!.height - initialIconBox!.height)).toBeLessThan(2);
      
      // Toggle expand
      await toggleButton.click();
      await page.waitForTimeout(300);
      
      // Check icon dimensions after expand
      const expandedIconBox = await dashboardIcon.boundingBox();
      expect(expandedIconBox).not.toBeNull();
      expect(Math.abs(expandedIconBox!.width - initialIconBox!.width)).toBeLessThan(2);
      expect(Math.abs(expandedIconBox!.height - initialIconBox!.height)).toBeLessThan(2);
    });

    test('should show smooth transitions between states', async ({ page }) => {
      await page.goto('/dashboard');
      
      const sidebar = page.locator('[data-testid="sidebar"]');
      
      // Verify transition classes are present
      await expect(sidebar).toHaveClass(/transition-all/);
      await expect(sidebar).toHaveClass(/duration-300/);
      
      // Test transition by toggling
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Measure transition time by checking intermediate state
      await toggleButton.click();
      
      // During transition, sidebar should have intermediate width
      await page.waitForTimeout(150); // Halfway through 300ms transition
      const midTransitionClass = await sidebar.getAttribute('class');
      
      // After transition completes
      await page.waitForTimeout(200);
      await expect(sidebar).toHaveClass(/w-16/);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard');
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      
      // Check initial aria-label
      await expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
      
      // Click to collapse
      await toggleButton.click();
      
      // Check updated aria-label
      await expect(toggleButton).toHaveAttribute('aria-label', 'Expand sidebar');
      
      // Click to expand
      await toggleButton.click();
      
      // Check aria-label returns to original
      await expect(toggleButton).toHaveAttribute('aria-label', 'Collapse sidebar');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Focus first navigation item
      const dashboardLink = page.locator('[data-testid="nav-item-dashboard"]');
      await dashboardLink.focus();
      
      // Press Tab to navigate to next item
      await page.keyboard.press('Tab');
      const surveyLink = page.locator('[data-testid="nav-item-take-survey"]');
      await expect(surveyLink).toBeFocused();
      
      // Press Enter to activate
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL('/survey');
    });

    test('should have proper role attributes', async ({ page }) => {
      await page.goto('/dashboard');
      
      const nav = page.locator('nav');
      await expect(nav).toHaveAttribute('role', 'navigation');
      
      // Check that buttons have proper roles
      const navButtons = page.locator('[data-testid^="nav-item-"]');
      const buttonCount = await navButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = navButtons.nth(i);
        await expect(button).toHaveRole('button');
      }
    });
  });

  test.describe('Nested Menu Functionality', () => {
    test('should expand and collapse nested menu items for admin users', async ({ page }) => {
      // Setup admin user
      const adminUser = await createTestUser('admin');
      await page.goto('/dashboard');
      
      // Look for Administration parent item
      const adminParentItem = page.locator('[data-testid="nav-item-administration"]');
      await expect(adminParentItem).toBeVisible();
      
      // Initially should be collapsed (no children visible)
      const adminChildItem = page.locator('[data-testid="nav-item-all-surveys"]');
      await expect(adminChildItem).toBeHidden();
      
      // Click to expand
      await adminParentItem.click();
      
      // Children should now be visible
      await expect(adminChildItem).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-users"]')).toBeVisible();
      
      // Click again to collapse
      await adminParentItem.click();
      
      // Children should be hidden again
      await expect(adminChildItem).toBeHidden();
    });

    test('should show correct chevron icons for expandable items', async ({ page }) => {
      const adminUser = await createTestUser('admin');
      await page.goto('/dashboard');
      
      const adminParentItem = page.locator('[data-testid="nav-item-administration"]');
      
      // Should show ChevronRight when collapsed
      const chevronRight = adminParentItem.locator('svg[data-testid="chevron-right"]');
      await expect(chevronRight).toBeVisible();
      
      // Click to expand
      await adminParentItem.click();
      
      // Should show ChevronDown when expanded
      const chevronDown = adminParentItem.locator('svg[data-testid="chevron-down"]');
      await expect(chevronDown).toBeVisible();
      await expect(chevronRight).toBeHidden();
    });

    test('should not show nested items when sidebar is collapsed', async ({ page }) => {
      const adminUser = await createTestUser('admin');
      await page.goto('/dashboard');
      
      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      const adminParentItem = page.locator('[data-testid="nav-item-administration"]');
      
      // Expand the admin menu first
      await adminParentItem.click();
      const adminChildItem = page.locator('[data-testid="nav-item-all-surveys"]');
      await expect(adminChildItem).toBeVisible();
      
      // Collapse sidebar
      await toggleButton.click();
      
      // Nested items should be hidden even if parent was expanded
      await expect(adminChildItem).toBeHidden();
      
      // Expand sidebar again
      await toggleButton.click();
      
      // Parent should remember its expanded state
      await expect(adminChildItem).toBeVisible();
    });
  });
});