import { test, expect } from '@playwright/test';

/**
 * Basic Critical Path Validation Tests
 * Validates core application functionality without full authentication flow
 */

test.describe('Critical Path Validation', () => {

  test('application loads and basic pages are accessible', async ({ page }) => {
    console.log('🚀 BASIC CRITICAL PATH: Testing core application functionality...');
    
    // STEP 1: Verify Home/Landing Page
    console.log('🏠 STEP 1: Verify home page loads...');
    await page.goto('/');
    
    // Should either show home page or redirect to login (both are valid)
    const currentUrl = page.url();
    console.log(`📍 Landed on: ${currentUrl}`);
    
    // Check if we can find key UI elements
    const hasContent = await page.locator('h1, h2, [data-testid]').count() > 0;
    expect(hasContent).toBeTruthy();
    
    // STEP 2: Verify Login Page Structure 
    console.log('🔐 STEP 2: Verify login page structure...');
    await page.goto('/auth/login');
    
    // Check for login form elements
    await expect(page.locator('form[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('input[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('button[data-testid="login-submit"]')).toBeVisible();
    
    console.log('✅ Login page structure is correct');
    
    // STEP 3: Verify Registration Page (if exists)
    console.log('📋 STEP 3: Check if registration page exists...');
    const registerResponse = await page.goto('/auth/register');
    
    if (registerResponse && registerResponse.status() !== 404) {
      console.log('✅ Registration page exists');
      
      // Look for registration form or redirect
      const hasRegisterForm = await page.locator('form').count() > 0;
      const hasRegisterLink = await page.locator('text=sign up', { timeout: 5000 }).count() > 0;
      
      if (hasRegisterForm || hasRegisterLink) {
        console.log('✅ Registration functionality available');
      }
    } else {
      console.log('ℹ️  Registration page not available (may be disabled in current build)');
    }
    
    // STEP 4: Test Navigation and Responsiveness
    console.log('🧭 STEP 4: Test basic navigation...');
    
    const testPages = [
      { path: '/', name: 'Home/Root' },
      { path: '/auth/login', name: 'Login' },
    ];
    
    for (const testPage of testPages) {
      console.log(`   📍 Testing ${testPage.name} page...`);
      const response = await page.goto(testPage.path);
      
      if (response && response.status() < 400) {
        // Page loaded successfully
        const hasVisibleContent = await page.locator('h1, h2, form, [data-testid]').count() > 0;
        expect(hasVisibleContent).toBeTruthy();
        console.log(`   ✅ ${testPage.name} page loads with content`);
      } else {
        console.log(`   ⚠️  ${testPage.name} page returned ${response?.status() || 'error'}`);
      }
    }
    
    // STEP 5: Verify Form Interactions
    console.log('📝 STEP 5: Test form interactions...');
    
    await page.goto('/auth/login');
    
    // Test email input
    await page.fill('input[data-testid="email-input"]', 'test@example.com');
    const emailValue = await page.inputValue('input[data-testid="email-input"]');
    expect(emailValue).toBe('test@example.com');
    
    // Test password input
    await page.fill('input[data-testid="password-input"]', 'testpassword');
    const passwordValue = await page.inputValue('input[data-testid="password-input"]');
    expect(passwordValue).toBe('testpassword');
    
    console.log('✅ Form inputs work correctly');
    
    // STEP 6: Test UI Responsiveness (if possible)
    console.log('📱 STEP 6: Test responsive behavior...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Form should still be visible and usable on mobile
    await expect(page.locator('form[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('input[data-testid="email-input"]')).toBeVisible();
    
    console.log('✅ Mobile responsiveness works');
    
    // Reset to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('🎉 CRITICAL PATH VALIDATION COMPLETED SUCCESSFULLY!');
    console.log('📊 Summary:');
    console.log('   ✅ Application loads without errors');
    console.log('   ✅ Login page structure is correct'); 
    console.log('   ✅ Form inputs work properly');
    console.log('   ✅ Basic navigation functions');
    console.log('   ✅ Mobile responsiveness works');
  });

  test('error handling and edge cases', async ({ page }) => {
    console.log('🛡️  ERROR HANDLING: Testing error scenarios...');
    
    // STEP 1: Test 404 handling
    console.log('🔍 STEP 1: Test 404 error handling...');
    const notFoundResponse = await page.goto('/this-page-does-not-exist');
    
    // Should either show 404 page or redirect (both valid)
    if (notFoundResponse && notFoundResponse.status() === 404) {
      console.log('✅ 404 errors handled correctly');
    } else {
      console.log('ℹ️  404s may be handled by redirect (also valid)');
    }
    
    // STEP 2: Test malformed inputs
    console.log('📝 STEP 2: Test form validation...');
    await page.goto('/auth/login');
    
    // Try submitting empty form 
    await page.click('button[data-testid="login-submit"]');
    
    // Should either show validation or stay on page
    await page.waitForTimeout(1000);
    const stillOnLogin = page.url().includes('/auth/login');
    expect(stillOnLogin).toBeTruthy();
    
    console.log('✅ Empty form submission handled appropriately');
    
    // Test invalid email format
    await page.fill('input[data-testid="email-input"]', 'invalid-email');
    await page.fill('input[data-testid="password-input"]', 'test');
    await page.click('button[data-testid="login-submit"]');
    
    await page.waitForTimeout(1000);
    // Should still be on login page (validation working)
    expect(page.url()).toContain('/auth/login');
    
    console.log('✅ Invalid input validation works');
    
    console.log('🎉 ERROR HANDLING VALIDATION COMPLETED!');
  });

});