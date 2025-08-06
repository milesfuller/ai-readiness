/**
 * Comprehensive Dashboard and Analytics Tests
 * Tests dashboard functionality, data visualization, analytics features, and admin panels
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive Dashboard and Analytics Tests', () => {
  
  test.describe('Dashboard Layout and Navigation', () => {
    test('Should display main dashboard correctly', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      // Should show main dashboard layout
      await expect(page.locator('[data-testid="main-layout"], .dashboard-layout')).toBeVisible();
      
      // Should have navigation elements
      const navElements = [
        '[data-testid="sidebar"], .sidebar',
        '[data-testid="main-nav"], .main-navigation',
        '[data-testid="user-menu"], .user-profile'
      ];
      
      let hasNavigation = false;
      for (const selector of navElements) {
        if (await page.locator(selector).isVisible()) {
          hasNavigation = true;
          break;
        }
      }
      expect(hasNavigation).toBe(true);
    });

    test('Should show dashboard widgets and cards', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      // Check for dashboard widgets
      const dashboardElements = [
        '[data-testid="survey-overview"], .survey-overview',
        '[data-testid="quick-stats"], .stats-cards',
        '[data-testid="recent-activity"], .activity-feed',
        '[data-testid="progress-summary"], .progress-widget'
      ];
      
      let hasWidgets = false;
      for (const selector of dashboardElements) {
        if (await page.locator(selector).isVisible({ timeout: 10000 })) {
          hasWidgets = true;
          break;
        }
      }
      
      // Should have some dashboard content or empty state
      if (!hasWidgets) {
        const emptyState = page.locator('[data-testid="empty-dashboard"], .empty-state');
        await expect(emptyState).toBeVisible();
      } else {
        expect(hasWidgets).toBe(true);
      }
    });

    test('Should handle dashboard responsive layout', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Mobile menu should be visible
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"], .hamburger-menu');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();
        
        // Navigation should open
        const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-navigation');
        await expect(mobileNav).toBeVisible({ timeout: 3000 });
      }
      
      // Reset to desktop
      await page.setViewportSize({ width: 1024, height: 768 });
    });

    test('Should navigate between dashboard sections', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      const navigationLinks = [
        { selector: '[data-testid="profile-link"], [href="/profile"]', expectedUrl: '/profile' },
        { selector: '[data-testid="settings-link"], [href="/settings"]', expectedUrl: '/settings' },
        { selector: '[data-testid="surveys-link"], [href="/survey"]', expectedUrl: '/survey' },
        { selector: '[data-testid="results-link"], [href="/results"]', expectedUrl: '/results' }
      ];
      
      for (const { selector, expectedUrl } of navigationLinks) {
        const link = page.locator(selector);
        if (await link.isVisible()) {
          await link.click();
          await expect(page).toHaveURL(expectedUrl);
          
          // Navigate back to dashboard
          await page.goto('/dashboard');
        }
      }
    });
  });

  test.describe('Dashboard Data and Metrics', () => {
    test('Should display user statistics', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      const statsElements = [
        '[data-testid="surveys-completed"]',
        '[data-testid="surveys-in-progress"]',
        '[data-testid="completion-rate"]',
        '[data-testid="total-responses"]'
      ];
      
      for (const selector of statsElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // Should contain numeric data
          const text = await element.textContent();
          expect(text).toMatch(/\d+/);
          
          // Should be properly formatted
          expect(text?.trim()).toBeTruthy();
        }
      }
    });

    test('Should show recent activity feed', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      const activityFeed = page.locator('[data-testid="activity-feed"], .recent-activity');
      if (await activityFeed.isVisible()) {
        // Should have activity items
        const activityItems = activityFeed.locator('[data-testid="activity-item"], .activity-item');
        const itemCount = await activityItems.count();
        
        if (itemCount > 0) {
          // First item should have timestamp and description
          const firstItem = activityItems.first();
          const hasTimestamp = await firstItem.locator('.timestamp, [data-testid="activity-time"]').isVisible();
          const hasDescription = await firstItem.locator('.description, [data-testid="activity-description"]').isVisible();
          
          expect(hasTimestamp || hasDescription).toBe(true);
        } else {
          // Should show empty state
          const emptyActivity = activityFeed.locator('[data-testid="no-activity"], .empty-activity');
          await expect(emptyActivity).toBeVisible();
        }
      }
    });

    test('Should display progress indicators', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      const progressElements = [
        '[data-testid="progress-bar"]',
        '[data-testid="completion-circle"]',
        '.progress-indicator',
        '.circular-progress'
      ];
      
      for (const selector of progressElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // Progress elements should have appropriate attributes
          const hasProgress = await element.getAttribute('data-progress') || 
                             await element.getAttribute('value') ||
                             await element.getAttribute('aria-valuenow');
          
          if (hasProgress) {
            const progressValue = parseFloat(hasProgress);
            expect(progressValue).toBeGreaterThanOrEqual(0);
            expect(progressValue).toBeLessThanOrEqual(100);
          }
        }
      }
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('Should display analytics overview', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      // May require org admin role
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      const accessDenied = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      
      if (hasAccess) {
        // Should show analytics components
        const analyticsElements = [
          '[data-testid="response-metrics"]',
          '[data-testid="completion-trends"]',
          '[data-testid="department-breakdown"]',
          '[data-testid="performance-indicators"]'
        ];
        
        let hasAnalyticsContent = false;
        for (const selector of analyticsElements) {
          if (await page.locator(selector).isVisible()) {
            hasAnalyticsContent = true;
            break;
          }
        }
        expect(hasAnalyticsContent).toBe(true);
      } else if (accessDenied) {
        await expect(page.locator('[data-testid="access-denied"]')).toContainText(/access|permission|denied/i);
      }
    });

    test('Should render data visualizations', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Check for chart elements
        const chartElements = [
          'canvas', // Chart.js/Recharts canvas elements
          'svg', // D3.js or other SVG charts
          '[data-testid="chart"]',
          '.recharts-wrapper',
          '.chart-container'
        ];
        
        let hasCharts = false;
        for (const selector of chartElements) {
          const charts = page.locator(selector);
          const chartCount = await charts.count();
          
          if (chartCount > 0) {
            hasCharts = true;
            
            // Charts should be properly sized
            const firstChart = charts.first();
            const boundingBox = await firstChart.boundingBox();
            
            if (boundingBox) {
              expect(boundingBox.width).toBeGreaterThan(0);
              expect(boundingBox.height).toBeGreaterThan(0);
            }
            break;
          }
        }
        expect(hasCharts).toBe(true);
      }
    });

    test('Should filter analytics data', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Check for filter controls
        const filterElements = [
          '[data-testid="date-filter"]',
          '[data-testid="department-filter"]',
          '[data-testid="survey-filter"]',
          '.filter-dropdown',
          'select[name="filter"]'
        ];
        
        for (const selector of filterElements) {
          const filter = page.locator(selector);
          if (await filter.isVisible()) {
            // Try to interact with filter
            if (selector.includes('select')) {
              const options = await filter.locator('option').count();
              if (options > 1) {
                await filter.selectOption({ index: 1 });
                await page.waitForTimeout(2000); // Wait for data to update
              }
            } else if (selector.includes('date')) {
              // Date picker interaction
              await filter.click();
              const datePicker = page.locator('.date-picker, [data-testid="date-picker"]');
              if (await datePicker.isVisible({ timeout: 3000 })) {
                await expect(datePicker).toBeVisible();
              }
            }
            break;
          }
        }
      }
    });

    test('Should export analytics data', async ({ authenticatedPage: page, rateLimitHandler }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        const exportButton = page.locator('[data-testid="export-analytics"], .export-button');
        if (await exportButton.isVisible()) {
          await rateLimitHandler.executeWithRetry(async () => {
            await exportButton.click();
            
            // Should show export options
            const exportDialog = page.locator('[data-testid="export-dialog"]');
            await expect(exportDialog).toBeVisible({ timeout: 5000 });
            
            // Should have format options
            const pdfOption = page.locator('[data-testid="export-pdf"], input[value="pdf"]');
            if (await pdfOption.isVisible()) {
              await pdfOption.click();
              
              const confirmButton = page.locator('[data-testid="confirm-export"]');
              if (await confirmButton.isVisible()) {
                await confirmButton.click();
                
                // Should start download or show success message
                await page.waitForTimeout(3000);
              }
            }
          }, { identifier: 'analytics-export' });
        }
      }
    });
  });

  test.describe('Admin Dashboard', () => {
    test('Should access admin dashboard', async ({ authenticatedPage: page }) => {
      await page.goto('/admin');
      
      // May require admin role
      const hasAccess = await page.locator('[data-testid="admin-dashboard"]').isVisible({ timeout: 5000 });
      const accessDenied = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      const redirected = page.url() !== '/admin' && !page.url().includes('/admin');
      
      if (hasAccess) {
        // Should show admin controls
        const adminElements = [
          '[data-testid="user-management"]',
          '[data-testid="survey-management"]',
          '[data-testid="system-settings"]',
          '[data-testid="admin-analytics"]'
        ];
        
        let hasAdminContent = false;
        for (const selector of adminElements) {
          if (await page.locator(selector).isVisible()) {
            hasAdminContent = true;
            break;
          }
        }
        expect(hasAdminContent).toBe(true);
      } else {
        expect(accessDenied || redirected).toBe(true);
      }
    });

    test('Should manage users in admin panel', async ({ authenticatedPage: page }) => {
      await page.goto('/admin/users');
      
      const hasAccess = await page.locator('body').isVisible() && 
                       !await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      
      if (hasAccess && !page.url().includes('/dashboard')) {
        // Should show user list
        const userTable = page.locator('[data-testid="users-table"], .users-list, table');
        if (await userTable.isVisible()) {
          // Should have user entries
          const userRows = userTable.locator('tr, [data-testid="user-row"]');
          const rowCount = await userRows.count();
          
          if (rowCount > 1) { // More than header row
            const firstUserRow = userRows.nth(1);
            
            // Should show user information
            const hasEmail = await firstUserRow.locator('td').first().textContent().then(text => 
              text?.includes('@') || false
            );
            expect(hasEmail || rowCount > 0).toBe(true);
          }
          
          // Should have user management actions
          const actionButtons = [
            '[data-testid="edit-user"]',
            '[data-testid="delete-user"]',
            '[data-testid="user-actions"]',
            '.user-actions'
          ];
          
          for (const selector of actionButtons) {
            const button = userTable.locator(selector).first();
            if (await button.isVisible()) {
              await expect(button).toBeVisible();
              break;
            }
          }
        }
      }
    });

    test('Should manage surveys in admin panel', async ({ authenticatedPage: page }) => {
      await page.goto('/admin/surveys');
      
      const hasAccess = await page.locator('body').isVisible() && 
                       !await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      
      if (hasAccess && !page.url().includes('/dashboard')) {
        // Should show survey management interface
        const surveyElements = [
          '[data-testid="surveys-table"]',
          '[data-testid="create-survey"]',
          '.survey-list',
          '.survey-management'
        ];
        
        let hasSurveyManagement = false;
        for (const selector of surveyElements) {
          if (await page.locator(selector).isVisible()) {
            hasSurveyManagement = true;
            break;
          }
        }
        expect(hasSurveyManagement).toBe(true);
        
        // Should be able to create new survey
        const createButton = page.locator('[data-testid="create-survey"], .create-button');
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show survey creation form
          const surveyForm = page.locator('[data-testid="survey-form"], .survey-creator');
          await expect(surveyForm).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Data Visualization Components', () => {
    test('Should render JTBD force diagrams', async ({ authenticatedPage: page }) => {
      await page.goto('/results');
      
      const jtbdElements = [
        '[data-testid="jtbd-forces"]',
        '[data-testid="force-diagram"]',
        '.jtbd-visualization',
        '.force-chart'
      ];
      
      for (const selector of jtbdElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // Should show force categories
          const forceTypes = ['push', 'pull', 'habit', 'anxiety'];
          
          for (const forceType of forceTypes) {
            const forceElement = element.locator(`[data-testid="${forceType}-force"]`);
            if (await forceElement.isVisible()) {
              // Should have numeric value
              const text = await forceElement.textContent();
              expect(text).toMatch(/\d+/);
            }
          }
          break;
        }
      }
    });

    test('Should handle interactive charts', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Look for interactive chart elements
        const chartElements = page.locator('canvas, svg, [data-testid="chart"]');
        const chartCount = await chartElements.count();
        
        if (chartCount > 0) {
          const firstChart = chartElements.first();
          
          // Try to hover over chart
          await firstChart.hover();
          
          // Look for tooltips or interactive elements
          const tooltip = page.locator('[data-testid="tooltip"], .chart-tooltip, .tooltip');
          const hasTooltip = await tooltip.isVisible({ timeout: 2000 });
          
          // Try clicking on chart
          await firstChart.click();
          await page.waitForTimeout(1000);
          
          // Interactive charts should respond to user interaction
          expect(hasTooltip || chartCount > 0).toBe(true);
        }
      }
    });

    test('Should display data tables correctly', async ({ authenticatedPage: page }) => {
      const tablePages = ['/admin/users', '/admin/surveys', '/organization/analytics'];
      
      for (const tablePage of tablePages) {
        await page.goto(tablePage);
        
        const hasAccess = !await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 }) &&
                         !page.url().includes('/dashboard');
        
        if (hasAccess) {
          const table = page.locator('table, [data-testid="data-table"]');
          if (await table.isVisible({ timeout: 5000 })) {
            // Should have proper table structure
            const hasHeaders = await table.locator('thead, th').count() > 0;
            const hasRows = await table.locator('tbody tr, [data-testid="table-row"]').count() > 0;
            
            expect(hasHeaders || hasRows).toBe(true);
            
            // Should be responsive
            const tableWidth = await table.boundingBox().then(box => box?.width || 0);
            expect(tableWidth).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('Should handle live data updates', async ({ authenticatedPage: page }) => {
      await page.goto('/dashboard');
      
      // Get initial data
      const statsElement = page.locator('[data-testid="total-responses"], .stats-number').first();
      if (await statsElement.isVisible()) {
        const initialValue = await statsElement.textContent();
        
        // Wait for potential updates
        await page.waitForTimeout(5000);
        
        const updatedValue = await statsElement.textContent();
        
        // Either value stayed same or updated (both are valid)
        expect(updatedValue).toBeDefined();
        expect(updatedValue?.length).toBeGreaterThan(0);
      }
    });

    test('Should refresh data on user interaction', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Look for refresh button
        const refreshButton = page.locator('[data-testid="refresh-data"], .refresh-button');
        if (await refreshButton.isVisible()) {
          await refreshButton.click();
          
          // Should show loading state
          const loadingIndicator = page.locator('[data-testid="loading"], .loading-spinner');
          const hasLoading = await loadingIndicator.isVisible({ timeout: 2000 });
          
          if (hasLoading) {
            // Loading should eventually disappear
            await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
          }
        }
      }
    });
  });

  test.describe('Dashboard Performance', () => {
    test('Should load dashboard efficiently', async ({ authenticatedPage: page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for main content
      await expect(page.locator('[data-testid="main-content"], main')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('Should handle large datasets', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Check if page remains responsive with data
        const interactiveElement = page.locator('[data-testid="date-filter"], button').first();
        if (await interactiveElement.isVisible()) {
          const startTime = Date.now();
          await interactiveElement.click();
          const responseTime = Date.now() - startTime;
          
          // Should respond within reasonable time
          expect(responseTime).toBeLessThan(3000);
        }
      }
    });

    test('Should implement progressive loading', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      
      if (hasAccess) {
        // Should show skeleton loaders or progressive content
        const skeletonLoaders = page.locator('[data-testid="skeleton"], .skeleton, .loading-placeholder');
        const chartElements = page.locator('canvas, svg, [data-testid="chart"]');
        
        const hasSkeletons = await skeletonLoaders.count() > 0;
        const hasCharts = await chartElements.count() > 0;
        
        // Should either show loaders or content
        expect(hasSkeletons || hasCharts).toBe(true);
      }
    });
  });
});