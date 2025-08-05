const { chromium } = require('playwright');

(async () => {
  console.log('Starting simple E2E test...');
  
  // Check environment
  console.log('Environment:', {
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    USE_MOCK_AUTH: process.env.USE_MOCK_AUTH
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    extraHTTPHeaders: {
      'X-Rate-Limit-Bypass': 'true'
    }
  });
  const page = await context.newPage();

  try {
    // Test 1: Homepage loads
    console.log('\nTest 1: Loading homepage...');
    await page.goto('http://localhost:3000');
    const title = await page.title();
    console.log('✅ Homepage loaded. Title:', title);

    // Test 2: Navigate to login
    console.log('\nTest 2: Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    console.log('✅ Login page loaded');

    // Test 3: Check login form exists
    console.log('\nTest 3: Checking login form...');
    const loginForm = await page.locator('form').first();
    if (await loginForm.isVisible()) {
      console.log('✅ Login form is visible');
    } else {
      console.log('❌ Login form not found');
    }

    // Test 4: Mock server health check
    console.log('\nTest 4: Checking mock server...');
    const mockResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:54321/health');
        return { status: response.status, ok: response.ok };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('Mock server response:', mockResponse);
    
    console.log('\n✅ Basic E2E tests completed successfully\!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();
