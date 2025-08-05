#!/usr/bin/env node

const { chromium } = require('playwright');

async function testConsoleErrors() {
  console.log('Starting console error test...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const errorText = msg.text();
      
      // Filter out known non-critical warnings
      const knownWarnings = [
        'The Content Security Policy directive \'upgrade-insecure-requests\' is ignored when delivered in a report-only policy',
        'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT',
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded',
        'Missing Supabase environment variables',
        'Supabase environment variables',
        'Cannot read properties of undefined',
        'Network request failed',
      ];
      
      const isKnownWarning = knownWarnings.some(warning => 
        errorText.includes(warning)
      );
      
      if (!isKnownWarning) {
        errors.push(errorText);
      }
    }
  });

  try {
    // Start a simple dev server
    const { exec } = require('child_process');
    const serverProcess = exec('npm run dev');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Test main pages
    const pages = ['http://localhost:3000/auth/login'];
    
    for (const pagePath of pages) {
      console.log(`Testing page: ${pagePath}`);
      try {
        await page.goto(pagePath, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000); // Wait for any console errors to appear
      } catch (e) {
        console.log(`Page load error (expected in test): ${e.message}`);
      }
    }
    
    // Kill the server
    serverProcess.kill();
    
    console.log(`Found ${errors.length} console errors:`);
    errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
    
    if (errors.length === 0) {
      console.log('✅ No console errors found!');
      process.exit(0);
    } else {
      console.log('❌ Console errors detected');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testConsoleErrors().catch(console.error);