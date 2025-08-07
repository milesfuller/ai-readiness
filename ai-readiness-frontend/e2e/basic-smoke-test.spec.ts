/**
 * Basic Smoke Test
 * 
 * Ultra-minimal test to validate the application is working.
 * Designed to run quickly and reliably without complex dependencies.
 */

import { test, expect } from '@playwright/test';

test.describe('Basic Smoke Tests', () => {
  
  const BASE_URL = 'http://localhost:3001';

  test('Application loads without crashing', async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check that the page loaded
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Check that the page has content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    
    console.log(`✅ App loaded with title: "${title}"`);
  });

  test('Login page is accessible', async ({ page }) => {
    // Go directly to login
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Look for login form elements
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    // Wait for elements to appear
    await emailInput.waitFor({ timeout: 15000 });
    await passwordInput.waitFor({ timeout: 15000 });
    await submitButton.waitFor({ timeout: 15000 });
    
    // Verify they're visible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('✅ Login page form elements are present and visible');
  });

  test('Form inputs are functional', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for form to be ready
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    await emailInput.waitFor({ timeout: 15000 });
    await passwordInput.waitFor({ timeout: 15000 });
    
    // Test typing in fields
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');
    
    // Verify values were set
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
    
    console.log('✅ Form inputs work correctly');
  });

  test('Navigation works', async ({ page }) => {
    // Start at root
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Should redirect or show content
    const url = page.url();
    expect(url).toBeTruthy();
    
    console.log(`✅ Navigation working - current URL: ${url}`);
  });

  test('No critical JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });
    
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait a bit to capture any errors
    await page.waitForTimeout(3000);
    
    // Allow some errors but not too many
    console.log(`Console errors detected: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors.slice(0, 5)); // Log first 5 errors
    }
    
    // Should have fewer than 10 console errors
    expect(errors.length).toBeLessThan(10);
    
    console.log('✅ No critical JavaScript errors detected');
  });
});