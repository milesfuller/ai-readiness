import { test, expect } from '@playwright/test';
import { authSetup, createTestUser } from '../../e2e/fixtures/test-setup';

test.describe('Role-based Navigation', () => {
  test.describe('User Role Navigation', () => {
    test('should show only base navigation items for regular user', async ({ page }) => {
      const user = await createTestUser('user');
      await authSetup(page, user);
      await page.goto('/dashboard');
      
      // Base navigation items should be visible
      await expect(page.locator('[data-testid="nav-item-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-take-survey"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-my-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-settings"]')).toBeVisible();
      
      // Admin and org_admin items should not be visible
      await expect(page.locator('[data-testid="nav-item-administration"]')).toBeHidden();
      await expect(page.locator('[data-testid="nav-item-organization"]')).toBeHidden();
      await expect(page.locator('[data-testid="nav-item-system"]')).toBeHidden();
    });

    test('should navigate correctly with user role permissions', async ({ page }) => {
      const user = await createTestUser('user');
      await authSetup(page, user);
      await page.goto('/dashboard');
      
      // Test user can access base routes
      const testRoutes = [
        { selector: '[data-testid="nav-item-dashboard"]', url: '/dashboard' },
        { selector: '[data-testid="nav-item-take-survey"]', url: '/survey' },
        { selector: '[data-testid="nav-item-my-results"]', url: '/results' },
        { selector: '[data-testid="nav-item-settings"]', url: '/settings' }
      ];
      
      for (const route of testRoutes) {
        const navItem = page.locator(route.selector);
        await navItem.click();
        await expect(page).toHaveURL(route.url);
      }
    });

    test('should block access to admin routes for regular users', async ({ page }) => {
      const user = await createTestUser('user');
      await authSetup(page, user);
      
      // Attempt to navigate to admin routes directly
      const adminRoutes = ['/admin', '/admin/users', '/admin/surveys'];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        // Should be redirected to dashboard or show unauthorized
        await expect(page).not.toHaveURL(route);
      }
    });
  });

  test.describe('Organization Admin Role Navigation', () => {
    test('should show organization menu for org_admin', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      await page.goto('/dashboard');
      
      // Base items should be visible
      await expect(page.locator('[data-testid="nav-item-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-take-survey"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-my-results"]')).toBeVisible();
      
      // Organization menu should be visible
      await expect(page.locator('[data-testid="nav-item-organization"]')).toBeVisible();
      
      // Admin-only items should not be visible
      await expect(page.locator('[data-testid="nav-item-administration"]')).toBeHidden();
      await expect(page.locator('[data-testid="nav-item-system"]')).toBeHidden();
    });

    test('should expand organization menu and show children', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      await page.goto('/dashboard');
      
      const orgMenuItem = page.locator('[data-testid="nav-item-organization"]');
      await orgMenuItem.click();
      
      // Organization children should be visible
      await expect(page.locator('[data-testid="nav-item-team-surveys"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-org-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-org-reports"]')).toBeVisible();
    });

    test('should navigate to organization routes correctly', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      await page.goto('/dashboard');
      
      // Expand organization menu
      const orgMenuItem = page.locator('[data-testid="nav-item-organization"]');
      await orgMenuItem.click();
      
      // Test organization routes
      const orgRoutes = [
        { selector: '[data-testid="nav-item-team-surveys"]', url: '/organization/surveys' },
        { selector: '[data-testid="nav-item-org-analytics"]', url: '/organization/analytics' },
        { selector: '[data-testid="nav-item-org-reports"]', url: '/organization/reports' }
      ];
      
      for (const route of orgRoutes) {
        const navItem = page.locator(route.selector);
        await navItem.click();
        await expect(page).toHaveURL(route.url);
        
        // Go back to dashboard for next iteration
        await page.goto('/dashboard');
        await orgMenuItem.click();
      }
    });

    test('should block access to admin-only routes for org_admin', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      
      // Attempt to navigate to admin-only routes directly
      const adminOnlyRoutes = ['/admin/organizations', '/system/config', '/system/ai'];
      
      for (const route of adminOnlyRoutes) {
        await page.goto(route);
        // Should be redirected or show unauthorized
        await expect(page).not.toHaveURL(route);
      }
    });
  });

  test.describe('Admin Role Navigation', () => {
    test('should show all navigation items for admin', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/dashboard');
      
      // Base items should be visible
      await expect(page.locator('[data-testid="nav-item-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-take-survey"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-my-results"]')).toBeVisible();
      
      // Admin items should be visible
      await expect(page.locator('[data-testid="nav-item-administration"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-system"]')).toBeVisible();
    });

    test('should expand administration menu and show all admin options', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/dashboard');
      
      const adminMenuItem = page.locator('[data-testid="nav-item-administration"]');
      await adminMenuItem.click();
      
      // All administration children should be visible
      const adminChildren = [
        '[data-testid="nav-item-all-surveys"]',
        '[data-testid="nav-item-users"]',
        '[data-testid="nav-item-organizations"]',
        '[data-testid="nav-item-system-analytics"]',
        '[data-testid="nav-item-admin-reports"]',
        '[data-testid="nav-item-export-data"]'
      ];
      
      for (const selector of adminChildren) {
        await expect(page.locator(selector)).toBeVisible();
      }
    });

    test('should expand system menu and show system options', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/dashboard');
      
      const systemMenuItem = page.locator('[data-testid="nav-item-system"]');
      await systemMenuItem.click();
      
      // System children should be visible
      await expect(page.locator('[data-testid="nav-item-configuration"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-item-ai-models"]')).toBeVisible();
    });

    test('should navigate to all admin routes correctly', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/dashboard');
      
      // Test administration routes
      const adminMenuItem = page.locator('[data-testid="nav-item-administration"]');
      await adminMenuItem.click();
      
      const adminRoutes = [
        { selector: '[data-testid="nav-item-all-surveys"]', url: '/admin/surveys' },
        { selector: '[data-testid="nav-item-users"]', url: '/admin/users' },
        { selector: '[data-testid="nav-item-organizations"]', url: '/admin/organizations' },
        { selector: '[data-testid="nav-item-system-analytics"]', url: '/admin/analytics' },
        { selector: '[data-testid="nav-item-admin-reports"]', url: '/admin/reports' },
        { selector: '[data-testid="nav-item-export-data"]', url: '/admin/export' }
      ];
      
      for (const route of adminRoutes) {
        const navItem = page.locator(route.selector);
        await navItem.click();
        await expect(page).toHaveURL(route.url);
        
        await page.goto('/dashboard');
        await adminMenuItem.click();
      }
      
      // Test system routes
      const systemMenuItem = page.locator('[data-testid="nav-item-system"]');
      await systemMenuItem.click();
      
      const systemRoutes = [
        { selector: '[data-testid="nav-item-configuration"]', url: '/system/config' },
        { selector: '[data-testid="nav-item-ai-models"]', url: '/system/ai' }
      ];
      
      for (const route of systemRoutes) {
        const navItem = page.locator(route.selector);
        await navItem.click();
        await expect(page).toHaveURL(route.url);
        
        await page.goto('/dashboard');
        await systemMenuItem.click();
      }
    });
  });

  test.describe('Admin Panel Sidebar (Separate Component)', () => {
    test('should show correct admin panel navigation', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/admin');
      
      // Admin panel should have its own sidebar
      await expect(page.locator('[data-testid="admin-panel-title"]')).toBeVisible();
      
      // Check admin panel navigation items
      const adminPanelItems = [
        '[data-testid="admin-nav-dashboard"]',
        '[data-testid="admin-nav-surveys"]',
        '[data-testid="admin-nav-users"]',
        '[data-testid="admin-nav-organizations"]',
        '[data-testid="admin-nav-analytics"]',
        '[data-testid="admin-nav-exports"]',
        '[data-testid="admin-nav-settings"]'
      ];
      
      for (const selector of adminPanelItems) {
        await expect(page.locator(selector)).toBeVisible();
      }
    });

    test('should filter admin panel items based on role', async ({ page }) => {
      const orgAdmin = await createTestUser('org_admin');
      await authSetup(page, orgAdmin);
      await page.goto('/admin');
      
      // Org admin should see most items but not organizations or settings
      await expect(page.locator('[data-testid="admin-nav-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-nav-surveys"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-nav-users"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-nav-analytics"]')).toBeVisible();
      await expect(page.locator('[data-testid="admin-nav-exports"]')).toBeVisible();
      
      // Admin-only items should be hidden
      await expect(page.locator('[data-testid="admin-nav-organizations"]')).toBeHidden();
      await expect(page.locator('[data-testid="admin-nav-settings"]')).toBeHidden();
    });

    test('should show active states in admin panel navigation', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/admin/users');
      
      // Users nav item should be active
      const usersNavItem = page.locator('[data-testid="admin-nav-users"]');
      await expect(usersNavItem).toHaveClass(/bg-gradient-to-r/);
      await expect(usersNavItem).toHaveClass(/from-teal-500\/20/);
      await expect(usersNavItem).toHaveClass(/to-purple-500\/20/);
      await expect(usersNavItem).toHaveClass(/text-white/);
      await expect(usersNavItem).toHaveClass(/border-teal-500\/30/);
    });

    test('should show user info in admin panel sidebar', async ({ page }) => {
      const admin = await createTestUser('admin', { 
        email: 'admin@test.com',
        role: 'admin'
      });
      await authSetup(page, admin);
      await page.goto('/admin');
      
      // User info should be displayed
      await expect(page.locator('text=Logged in as:')).toBeVisible();
      await expect(page.locator('text=admin@test.com')).toBeVisible();
      await expect(page.locator('text=admin')).toBeVisible();
      
      // Sign out button should be visible
      const signOutButton = page.locator('[data-testid="admin-sign-out"]');
      await expect(signOutButton).toBeVisible();
    });

    test('should handle sign out from admin panel', async ({ page }) => {
      const admin = await createTestUser('admin');
      await authSetup(page, admin);
      await page.goto('/admin');
      
      const signOutButton = page.locator('[data-testid="admin-sign-out"]');
      await signOutButton.click();
      
      // Should be redirected to login
      await expect(page).toHaveURL('/auth/login');
    });
  });

  test.describe('Role Transition Edge Cases', () => {
    test('should update navigation when user role changes', async ({ page }) => {
      // Start as regular user
      let user = await createTestUser('user');
      await authSetup(page, user);
      await page.goto('/dashboard');
      
      // Verify user navigation
      await expect(page.locator('[data-testid="nav-item-administration"]')).toBeHidden();
      
      // Simulate role upgrade (in real app this would be through admin action)
      // For testing, we'll need to update auth context or re-login
      user = await createTestUser('admin', { id: user.id });
      await authSetup(page, user);
      await page.reload();
      
      // Admin navigation should now be visible
      await expect(page.locator('[data-testid="nav-item-administration"]')).toBeVisible();
    });

    test('should handle unauthorized access gracefully', async ({ page }) => {
      const user = await createTestUser('user');
      await authSetup(page, user);
      
      // Try to access admin route directly
      await page.goto('/admin/users');
      
      // Should be redirected or show error
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/admin/users');
      
      // Error message or redirect should be handled gracefully
      await expect(page.locator('text=Unauthorized')).toBeVisible().catch(() => {
        // If not showing error message, should be redirected to appropriate page
        expect(currentUrl).toMatch(/(\/dashboard|\/auth\/login)/);
      });
    });
  });
});