import { test, expect } from '@playwright/test';

test.describe('Deployment Validation Suite', () => {
  test.describe('Environment & Configuration', () => {
    test('should have required environment variables', async ({ page }) => {
      const response = await page.request.get('/api/check-env');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.supabase).toBeTruthy();
      expect(data.supabase.url).toBeDefined();
      expect(data.supabase.anonKey).toBeDefined();
    });

    test('should connect to Supabase successfully', async ({ page }) => {
      const response = await page.request.get('/api/supabase-diagnostics');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.connection).toBeTruthy();
    });
  });

  test.describe('Build & Performance', () => {
    test('should load homepage with proper meta tags', async ({ page }) => {
      await page.goto('/');
      
      // Check title
      await expect(page).toHaveTitle(/AI Readiness/);
      
      // Check viewport meta
      const viewport = await page.$('meta[name="viewport"]');
      expect(viewport).toBeTruthy();
      
      // Check performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        };
      });
      
      // Pages should load quickly
      expect(metrics.domContentLoaded).toBeLessThan(3000);
      expect(metrics.loadComplete).toBeLessThan(5000);
    });

    test('should have no console errors on main pages', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Test main pages
      const pages = ['/', '/auth/login', '/auth/register', '/dashboard', '/survey'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
      }
      
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Route Testing', () => {
    test('should render all public pages', async ({ page }) => {
      const publicPages = [
        { path: '/', selector: 'h1' },
        { path: '/auth/login', selector: 'form' },
        { path: '/auth/register', selector: 'form' },
        { path: '/auth/forgot-password', selector: 'form' },
      ];

      for (const { path, selector } of publicPages) {
        await page.goto(path);
        await expect(page.locator(selector)).toBeVisible();
      }
    });

    test('should redirect protected routes when not authenticated', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/admin', '/survey/123'];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/\/auth\/login/);
      }
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show login form with all elements', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('text=Forgot password')).toBeVisible();
      await expect(page.locator('text=Sign up')).toBeVisible();
    });

    test('should validate login form inputs', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Try to submit empty form
      await page.locator('button[type="submit"]').click();
      
      // Should show validation errors
      await expect(page.locator('text=Invalid email')).toBeVisible();
    });

    test('should handle password visibility toggle', async ({ page }) => {
      await page.goto('/auth/login');
      
      const passwordInput = page.locator('input[type="password"]');
      const toggleButton = page.locator('button[aria-label*="password"]');
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle
      await toggleButton.click();
      
      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });
  });

  test.describe('API Endpoints', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      const endpoints = [
        '/api/auth/signup',
        '/api/llm/analyze',
        '/api/export',
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.post(endpoint, {
          data: {},
        });
        
        // Should return proper error status
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).toBeLessThan(500);
        
        // Should return JSON error
        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      
      // Check mobile menu exists
      const mobileMenu = page.locator('[aria-label="Mobile menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Check touch targets are at least 44px
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Security Headers', () => {
    test('should have security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};
      
      // Check for important security headers
      expect(headers['x-frame-options'] || headers['content-security-policy']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
    });
  });

  test.describe('UI Enhancements Validation', () => {
    test('should have enhanced animations and interactions', async ({ page }) => {
      await page.goto('/');
      
      // Check for animation classes
      const animatedElements = await page.locator('[class*="animate-"]').count();
      expect(animatedElements).toBeGreaterThan(0);
      
      // Check for gradient backgrounds
      const gradientElements = await page.locator('[class*="gradient-"]').count();
      expect(gradientElements).toBeGreaterThan(0);
      
      // Check for glass morphism effects
      const glassElements = await page.locator('[class*="glass-"]').count();
      expect(glassElements).toBeGreaterThan(0);
    });

    test('should have proper focus states', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Tab to first input
      await page.keyboard.press('Tab');
      
      // Check focus ring is visible
      const focusedElement = await page.locator(':focus');
      const className = await focusedElement.getAttribute('class');
      expect(className).toContain('ring');
    });
  });
});