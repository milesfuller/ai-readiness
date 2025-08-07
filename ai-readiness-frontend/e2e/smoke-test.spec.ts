/**
 * Smoke Test Suite
 * 
 * Minimal, reliable tests to validate basic functionality and detect major
 * regressions. Designed to be stable and avoid EPIPE errors.
 */

import { test, expect } from '@playwright/test';
import { createTestHelpers } from './utils/test-helpers';

test.describe('Smoke Tests - Basic Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clean slate for each test - safe storage clearing
    await page.context().clearCookies();
    
    try {
      await page.evaluate(() => {
        if (typeof Storage !== 'undefined') {
          try {
            localStorage?.clear();
            sessionStorage?.clear();
          } catch (e) {
            // Storage access denied - ignore silently
          }
        }
      });
    } catch (e) {
      // Storage not available - continue without error
    }
  });

  test('Homepage should redirect to login', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate to root
    await helpers.safeGoto('/');
    
    // Should redirect to login page
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page).toHaveTitle(/Login|AI Readiness/);
    
    console.log('✅ Homepage redirects to login correctly');
  });

  test('Login page loads and displays form elements', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate directly to login
    await helpers.safeGoto('/auth/login');
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Login|AI Readiness/);
    
    // Check for essential form elements using test IDs
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const submitButton = page.locator('[data-testid="login-submit"]');
    
    // Wait for elements to be present
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible(); 
    await expect(submitButton).toBeVisible();
    
    // Verify they're interactive
    await expect(emailInput).toBeEnabled();
    await expect(passwordInput).toBeEnabled();
    await expect(submitButton).toBeEnabled();
    
    // Check form attributes
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    console.log('✅ Login page form elements load correctly');
  });

  test('Login form validates input fields', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    await helpers.safeGoto('/auth/login');
    
    // Try submitting empty form
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.click();
    
    // Should still be on login page (not submitted)
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Fill invalid email
    await helpers.safeFill('[data-testid="email-input"]', 'invalid-email');
    await submitButton.click();
    
    // Should still be on login page
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    console.log('✅ Login form validation works');
  });

  test('Survey page is accessible', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Navigate to survey page
    await helpers.safeGoto('/survey');
    
    // Page should load (may require auth, but should not crash)
    const pageHealth = await helpers.checkPageHealth();
    expect(pageHealth.isHealthy).toBeTruthy();
    
    // Should either show survey content or redirect to auth
    const url = page.url();
    const isOnSurvey = url.includes('/survey');
    const isOnAuth = url.includes('/auth');
    
    expect(isOnSurvey || isOnAuth).toBeTruthy();
    
    console.log(`✅ Survey page accessible (redirected: ${isOnAuth})`);
  });

  test('Admin routes are protected', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Try to access admin page without auth
    await helpers.safeGoto('/admin');
    
    // Should redirect to login or show protected content message
    await page.waitForTimeout(2000); // Allow time for redirect
    
    const url = page.url();
    const isRedirectedToAuth = url.includes('/auth/login');
    const isOnAdmin = url.includes('/admin');
    
    if (isOnAdmin) {
      // If we're still on admin, check if it shows protection
      const pageText = await page.locator('body').textContent();
      const hasProtectionMessage = pageText?.includes('unauthorized') || 
                                   pageText?.includes('permission') ||
                                   pageText?.includes('login') ||
                                   pageText?.includes('access denied');
      
      // Either redirected or shows protection
      expect(isRedirectedToAuth || hasProtectionMessage).toBeTruthy();
    } else {
      // Should be redirected to auth
      expect(isRedirectedToAuth).toBeTruthy();
    }
    
    console.log('✅ Admin routes are protected');
  });

  test('Dashboard page requires authentication', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Try to access dashboard without auth
    await helpers.safeGoto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    console.log('✅ Dashboard requires authentication');
  });

  test('Registration page is accessible', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    await helpers.safeGoto('/auth/register');
    
    // Page should load without errors
    await expect(page).toHaveTitle(/Register|Sign Up|AI Readiness/);
    
    // Should have form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    console.log('✅ Registration page is accessible');
  });

  test('Navigation between auth pages works', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Start at login
    await helpers.safeGoto('/auth/login');
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Navigate to register
    const registerLink = page.locator('a[href="/auth/register"]');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*\/auth\/register/);
      
      // Navigate back to login
      const loginLink = page.locator('a[href="/auth/login"]');
      if (await loginLink.isVisible()) {
        await loginLink.click();
        await expect(page).toHaveURL(/.*\/auth\/login/);
      }
    }
    
    console.log('✅ Auth page navigation works');
  });

  test('Page handles browser refresh gracefully', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    await helpers.safeGoto('/auth/login');
    
    // Fill some data
    await helpers.safeFill('[data-testid="email-input"]', 'test@example.com');
    
    // Refresh page
    await page.reload();
    
    // Page should reload correctly
    await expect(page).toHaveURL(/.*\/auth\/login/);
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    
    // Form should be cleared after refresh
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('');
    
    console.log('✅ Page refresh handled gracefully');
  });

  test('Application handles network errors gracefully', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });
    
    // Monitor failed requests
    const failedRequests: string[] = [];
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await helpers.safeGoto('/auth/login');
    
    // Fill form to potentially trigger network requests
    await helpers.safeFill('[data-testid="email-input"]', 'test@example.com');
    await helpers.safeFill('[data-testid="password-input"]', 'testpass123');
    
    // Submit form (may fail due to no backend, but should not crash)
    const submitButton = page.locator('[data-testid="login-submit"]');
    await submitButton.click();
    
    // Wait for potential network activity
    await page.waitForTimeout(3000);
    
    // Check error counts
    const epipeErrors = errors.filter(error => 
      error.includes('EPIPE') || 
      error.includes('socket hang up') ||
      error.includes('ECONNRESET')
    );
    
    console.log(`Console errors: ${errors.length}, Failed requests: ${failedRequests.length}`);
    console.log(`EPIPE-related errors: ${epipeErrors.length}`);
    
    // Page should still be responsive despite network errors
    const pageHealth = await helpers.checkPageHealth();
    expect(pageHealth.isHealthy).toBeTruthy();
    
    // Allow some network errors but not excessive amounts
    expect(errors.length).toBeLessThan(15);
    
    console.log('✅ Network errors handled gracefully');
  });

  test('Mobile viewport compatibility', async ({ page }) => {
    const helpers = createTestHelpers(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await helpers.safeGoto('/auth/login');
    
    // Elements should still be visible and usable
    const emailInput = page.locator('[data-testid="email-input"]');
    const passwordInput = page.locator('[data-testid="password-input"]');
    const submitButton = page.locator('[data-testid="login-submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Should be able to interact with elements
    await helpers.safeFill('[data-testid="email-input"]', 'mobile@test.com');
    await expect(emailInput).toHaveValue('mobile@test.com');
    
    console.log('✅ Mobile viewport compatibility verified');
  });
});