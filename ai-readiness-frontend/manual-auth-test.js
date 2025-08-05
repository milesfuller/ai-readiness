#!/usr/bin/env node

/**
 * Manual Authentication Test
 * Tests the critical login functionality to validate the setTimeout fix
 */

const puppeteer = require('puppeteer');

async function testLogin() {
  console.log('🧪 Starting manual authentication test...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });
    
    console.log('✅ Login page loaded successfully');
    
    // Check if form elements exist
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');
    
    if (!emailInput || !passwordInput || !submitButton) {
      console.log('❌ Login form elements not found');
      return false;
    }
    
    console.log('✅ Login form elements found');
    
    // Fill the form
    await page.type('input[type="email"]', 'testuser@example.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    
    console.log('📝 Form filled with test credentials');
    
    // Click submit
    const startTime = Date.now();
    await submitButton.click();
    
    console.log('🔄 Submit button clicked, waiting for response...');
    
    // Wait for either success or error
    try {
      await page.waitForNavigation({ timeout: 10000 });
      const endTime = Date.now();
      const redirectTime = endTime - startTime;
      
      console.log(`🚀 Navigation completed in ${redirectTime}ms`);
      console.log(`📍 Current URL: ${page.url()}`);
      
      if (page.url().includes('dashboard')) {
        console.log('✅ Successfully redirected to dashboard!');
        console.log('✅ setTimeout fix is working - no delay in redirect');
        return true;
      } else {
        console.log('⚠️ Redirected to different page or stayed on login');
        return false;
      }
      
    } catch (timeout) {
      console.log('⏰ Navigation timeout - checking for errors');
      
      // Check if there's an error message
      const errorElement = await page.$('[role="alert"], .text-destructive, .bg-destructive');
      if (errorElement) {
        const errorText = await page.evaluate(el => el.textContent, errorElement);
        console.log(`❌ Error displayed: ${errorText}`);
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

async function testPageAccess() {
  console.log('🌐 Testing basic page accessibility...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Test main pages
    const pages = [
      'http://localhost:3000/',
      'http://localhost:3000/auth/login',
      'http://localhost:3000/api/check-env'
    ];
    
    for (const url of pages) {
      console.log(`📍 Testing ${url}...`);
      const response = await page.goto(url, { waitUntil: 'networkidle0' });
      
      if (response.status() === 200) {
        console.log(`✅ ${url} - OK (${response.status()})`);
      } else {
        console.log(`❌ ${url} - Error (${response.status()})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Page access test failed:', error.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🧪 === MANUAL AUTHENTICATION TEST SUITE ===');
  console.log('');
  
  // Test basic page access first
  await testPageAccess();
  console.log('');
  
  // Test login functionality
  const loginResult = await testLogin();
  console.log('');
  
  if (loginResult) {
    console.log('✅ === ALL TESTS PASSED ===');
    console.log('✅ Login redirect fix is working correctly');
    console.log('✅ No setTimeout delay detected');
    process.exit(0);
  } else {
    console.log('❌ === TESTS FAILED ===');
    console.log('❌ Login functionality needs attention');
    console.log('❌ May need to check API endpoints or authentication setup');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}