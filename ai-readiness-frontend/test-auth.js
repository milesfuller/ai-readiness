const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Testing auth flow...');
    
    // Go to login page
    await page.goto('http://localhost:3000/auth/login');
    console.log('✓ Loaded login page');
    
    // Check if login form exists
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    console.log('✓ Login form is visible:', { emailInput, passwordInput });
    
    // Try to login with test credentials that match mock server
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    console.log('✓ Filled login form');
    
    // Submit the form
    await page.click('button[type="submit"]');
    console.log('✓ Submitted login form');
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    // Check if we're redirected to dashboard
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Login successful! Redirected to dashboard');
    } else {
      console.log('❌ Login failed or not redirected properly');
      const errorMessage = await page.locator('.text-destructive').textContent().catch(() => null);
      if (errorMessage) {
        console.log('Error message:', errorMessage);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();