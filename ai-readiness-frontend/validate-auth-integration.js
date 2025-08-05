#!/usr/bin/env node

/**
 * Auth Integration Validation Script
 * Tests the authentication flow to ensure integration is working
 */

const { chromium } = require('playwright');
const path = require('path');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  testUser: {
    email: 'testuser@example.com',
    password: 'TestPassword123!'
  },
  timeouts: {
    page: 30000,
    navigation: 15000,
    element: 10000
  }
};

async function validateAuthIntegration() {
  console.log('🔐 Starting Auth Integration Validation...\n');

  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      'X-Test-Environment': 'true'
    }
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    } else if (msg.text().includes('[Auth') || msg.text().includes('[Login')) {
      console.log(`🔍 ${msg.text()}`);
    }
  });

  try {
    // Step 1: Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { 
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeouts.navigation 
    });
    
    // Verify login form is present
    const emailInput = await page.waitForSelector('input[type="email"]', {
      timeout: TEST_CONFIG.timeouts.element
    });
    const passwordInput = await page.waitForSelector('input[type="password"]');
    const submitButton = await page.waitForSelector('button[type="submit"]');
    
    if (!emailInput || !passwordInput || !submitButton) {
      throw new Error('Login form elements not found');
    }
    console.log('✅ Login form elements found');

    // Step 2: Fill in credentials
    console.log('2️⃣ Filling in test credentials...');
    await page.fill('input[type="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[type="password"]', TEST_CONFIG.testUser.password);
    console.log('✅ Credentials entered');

    // Step 3: Submit form and check for success state
    console.log('3️⃣ Submitting login form...');
    await submitButton.click();
    
    // Wait for either success state or error
    try {
      // Check for success indicators first
      const successButton = await page.waitForSelector(
        'button:has-text("Welcome back"), button:has-text("Redirecting")', 
        { timeout: 5000 }
      );
      
      if (successButton) {
        console.log('✅ Success state detected');
        
        // Wait for redirect
        console.log('4️⃣ Waiting for redirect to dashboard...');
        await page.waitForURL(/\/dashboard/, { timeout: 10000 });
        console.log('✅ Successfully redirected to dashboard');
        
        // Verify we're on dashboard and content loads
        const dashboardTitle = await page.waitForSelector('h1', { timeout: 5000 });
        const titleText = await dashboardTitle.textContent();
        console.log(`✅ Dashboard loaded with title: ${titleText}`);
        
        // Check if session is stored
        const sessionData = await page.evaluate(() => {
          const localStorage = window.localStorage;
          const sessionStorage = window.sessionStorage;
          
          // Check for various session storage keys
          const keys = Object.keys(localStorage).concat(Object.keys(sessionStorage));
          const authKeys = keys.filter(key => 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('token') ||
            key.includes('session')
          );
          
          return {
            found: authKeys.length > 0,
            keys: authKeys,
            localStorage: Object.keys(localStorage).length,
            sessionStorage: Object.keys(sessionStorage).length
          };
        });
        
        if (sessionData.found) {
          console.log('✅ Session data found in storage:', sessionData);
        } else {
          console.log('⚠️ No session data found, but login succeeded');
        }
        
        return { success: true, message: 'Authentication integration working correctly' };
        
      }
    } catch (successError) {
      console.log('🔍 No success state found, checking for errors...');
    }
    
    // Check for error messages
    try {
      const errorElement = await page.waitForSelector(
        '[role="alert"], .text-destructive, .bg-destructive',
        { timeout: 3000 }
      );
      
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log(`❌ Error message found: ${errorText}`);
        return { success: false, message: `Login failed with error: ${errorText}` };
      }
    } catch (errorWaitError) {
      console.log('🔍 No error messages found either');
    }
    
    // Check if we're still on login page (no redirect occurred)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('❌ Still on login page - no redirect occurred');
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'auth-debug-screenshot.png' });
      console.log('📸 Debug screenshot saved as auth-debug-screenshot.png');
      
      return { 
        success: false, 
        message: 'Login form submitted but no redirect or clear error occurred' 
      };
    }
    
    return { success: false, message: 'Unknown state after login attempt' };

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    
    // Take screenshot for debugging
    try {
      await page.screenshot({ path: 'auth-error-screenshot.png' });
      console.log('📸 Error screenshot saved as auth-error-screenshot.png');
    } catch (screenshotError) {
      console.log('⚠️ Could not take error screenshot');
    }
    
    return { success: false, message: error.message };
  } finally {
    await browser.close();
  }
}

// Run validation
async function main() {
  console.log('🧪 Auth Integration Validation Starting...\n');
  
  const result = await validateAuthIntegration();
  
  console.log('\n📊 VALIDATION RESULTS:');
  console.log('================================');
  
  if (result.success) {
    console.log('✅ STATUS: PASSED');
    console.log(`📝 MESSAGE: ${result.message}`);
    process.exit(0);
  } else {
    console.log('❌ STATUS: FAILED');
    console.log(`📝 MESSAGE: ${result.message}`);
    console.log('\n🔧 Check the screenshots and console output above for debugging info');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = { validateAuthIntegration };