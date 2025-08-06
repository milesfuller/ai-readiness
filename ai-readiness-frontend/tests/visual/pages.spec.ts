/**
 * Visual Regression Tests for Pages
 * 
 * Tests screenshot comparison for all major screens and responsive layouts
 */

import { test, expect, Page } from '@playwright/test';

// Helper function for consistent screenshot naming
const getScreenshotPath = (name: string, theme?: string, viewport?: string) => {
  const parts = [name];
  if (theme) parts.push(theme);
  if (viewport) parts.push(viewport);
  return `${parts.join('-')}.png`;
};

// Viewport configurations for responsive testing
const viewports = {
  mobile: { width: 375, height: 812 },  // iPhone X
  tablet: { width: 768, height: 1024 }, // iPad Portrait
  desktop: { width: 1440, height: 900 } // Desktop
};

// Theme configurations
const themes = ['light', 'dark'];

test.describe('Page Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Disable animations to prevent flaky screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-fill-mode: both !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `
    });
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
  });

  // Landing Page Tests
  test('Landing page - visual regression across themes and viewports', async ({ page }) => {
    for (const theme of themes) {
      for (const [viewportName, viewport] of Object.entries(viewports)) {
        await page.setViewportSize(viewport);
        
        // Set theme
        if (theme === 'dark') {
          await page.evaluate(() => {
            document.documentElement.classList.add('dark');
          });
        }

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Wait for dynamic content to load
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(
          getScreenshotPath('landing-page', theme, viewportName)
        );
        
        // Reset theme
        if (theme === 'dark') {
          await page.evaluate(() => {
            document.documentElement.classList.remove('dark');
          });
        }
      }
    }
  });

  // Authentication Pages
  test('Login page - visual states and responsive design', async ({ page }) => {
    for (const [viewportName, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
      
      // Default state
      await expect(page).toHaveScreenshot(
        getScreenshotPath('login-default', undefined, viewportName)
      );
      
      // Form validation error states
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot(
        getScreenshotPath('login-validation-errors', undefined, viewportName)
      );
    }
  });

  test('Register page - form states and validation', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Default state
    await expect(page).toHaveScreenshot('register-default.png');
    
    // Filled form state
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123!');
    
    await expect(page).toHaveScreenshot('register-filled.png');
    
    // Password mismatch error
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('register-password-mismatch.png');
  });

  // Dashboard Tests
  test('Dashboard - empty and populated states', async ({ page }) => {
    // Mock authentication
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Empty dashboard state
    await expect(page).toHaveScreenshot('dashboard-empty.png');
    
    // Populated dashboard (mock data)
    await page.evaluate(() => {
      // Mock data injection for visual testing
      const mockData = {
        surveys: [
          { id: 1, title: 'Q4 AI Readiness Assessment', responses: 45, status: 'active' },
          { id: 2, title: 'ML Implementation Survey', responses: 23, status: 'draft' }
        ],
        metrics: {
          totalSurveys: 2,
          totalResponses: 68,
          completionRate: 85.2
        }
      };
      
      // Dispatch custom event with mock data
      window.dispatchEvent(new CustomEvent('mockDataLoad', { detail: mockData }));
    });
    
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('dashboard-populated.png');
  });

  // Survey Pages
  test('Survey creation - step-by-step visual states', async ({ page }) => {
    await page.goto('/survey');
    await page.waitForLoadState('networkidle');
    
    // Survey list page
    await expect(page).toHaveScreenshot('survey-list.png');
    
    // Survey question interface
    const questionTypes = ['multiple-choice', 'text', 'scale', 'boolean'];
    for (const type of questionTypes) {
      await page.evaluate((questionType) => {
        const element = document.querySelector(`[data-question-type="${questionType}"]`);
        if (element) element.scrollIntoView();
      }, type);
      
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot(`survey-question-${type}.png`);
    }
  });

  test('Survey completion flow - progress and final states', async ({ page }) => {
    // Mock survey session
    await page.goto('/survey/mock-session-123');
    await page.waitForLoadState('networkidle');
    
    // Progress states (0%, 25%, 50%, 75%, 100%)
    const progressStates = [0, 25, 50, 75, 100];
    
    for (const progress of progressStates) {
      await page.evaluate((progressValue) => {
        const progressBar = document.querySelector('[role="progressbar"]');
        if (progressBar) {
          progressBar.setAttribute('aria-valuenow', progressValue.toString());
          progressBar.style.setProperty('--progress', `${progressValue}%`);
        }
      }, progress);
      
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`survey-progress-${progress}.png`);
    }
    
    // Completion page
    await page.goto('/survey/mock-session-123/complete');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('survey-complete.png');
  });

  // Admin Pages
  test('Admin dashboard - data visualization states', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Loading state
    await expect(page).toHaveScreenshot('admin-loading.png');
    
    // Data visualization with charts
    await page.evaluate(() => {
      // Mock chart data
      const mockChartData = {
        surveys: [
          { name: 'AI Readiness', responses: 145, completion: 92 },
          { name: 'ML Maturity', responses: 89, completion: 78 },
          { name: 'Data Strategy', responses: 67, completion: 85 }
        ],
        demographics: {
          roles: { 'Developer': 45, 'Manager': 30, 'Executive': 25 },
          departments: { 'Engineering': 60, 'Product': 25, 'Business': 15 }
        }
      };
      
      window.dispatchEvent(new CustomEvent('adminDataLoad', { detail: mockChartData }));
    });
    
    await page.waitForTimeout(2000); // Wait for charts to render
    await expect(page).toHaveScreenshot('admin-dashboard-charts.png');
    
    // Export dialog
    await page.click('[data-testid="export-button"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('admin-export-dialog.png');
  });

  // Error Pages
  test('Error pages - 404 and 500 states', async ({ page }) => {
    // 404 page
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('error-404.png');
    
    // 500 error simulation
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot('error-500.png');
  });

  // Loading and Skeleton States
  test('Loading and skeleton states across pages', async ({ page }) => {
    // Mock slow API responses
    await page.route('**/api/**', route => {
      setTimeout(() => {
        route.continue();
      }, 3000);
    });
    
    const pages = ['/dashboard', '/survey', '/admin'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500); // Capture loading state
      
      const pageName = pagePath.replace('/', '') || 'home';
      await expect(page).toHaveScreenshot(`loading-${pageName}.png`);
    }
  });

  // Print and PDF Export Views
  test('Print styles and PDF export layouts', async ({ page }) => {
    await page.goto('/admin/surveys/1');
    await page.waitForLoadState('networkidle');
    
    // Standard view
    await expect(page).toHaveScreenshot('survey-report-screen.png');
    
    // Print media query simulation
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('survey-report-print.png');
    
    // Reset media
    await page.emulateMedia({ media: 'screen' });
  });

  // High Contrast Mode
  test('High contrast accessibility mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Enable high contrast mode
    await page.evaluate(() => {
      document.documentElement.classList.add('high-contrast');
    });
    
    await expect(page).toHaveScreenshot('landing-high-contrast.png');
    
    // Test on form-heavy page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-high-contrast.png');
  });

  // Animation Frame Captures
  test('Animation states - before and after removal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Capture before animation removal
    await page.evaluate(() => {
      // Re-enable animations temporarily for comparison
      const style = document.createElement('style');
      style.innerHTML = `
        .animate-bounce { animation: bounce 1s infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .animate-spin { animation: spin 1s linear infinite; }
      `;
      document.head.appendChild(style);
    });
    
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('animations-enabled.png');
    
    // Capture after animation removal (current state)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('animations-disabled.png');
  });
});

// Animation-specific tests
test.describe('Animation Regression Tests', () => {
  test('Removed wobble animations - static state verification', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check buttons in various states
    const buttonSelectors = [
      'button[data-testid="primary-cta"]',
      'button[data-testid="secondary-button"]',
      '.nav-item button'
    ];
    
    for (const selector of buttonSelectors) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        // Hover state
        await button.hover();
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(`button-hover-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`);
        
        // Focus state
        await button.focus();
        await page.waitForTimeout(200);
        await expect(page).toHaveScreenshot(`button-focus-${selector.replace(/[^a-zA-Z0-9]/g, '-')}.png`);
      }
    }
  });

  test('Menu hover states - no bounce effect', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const menuItems = await page.locator('.nav-item, .menu-item').all();
    
    for (let i = 0; i < Math.min(menuItems.length, 5); i++) {
      const item = menuItems[i];
      await item.hover();
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot(`menu-item-hover-${i}.png`);
    }
  });
});