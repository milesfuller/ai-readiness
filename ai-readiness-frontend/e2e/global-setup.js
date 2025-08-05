/**
 * Global Setup for E2E Tests
 * Initializes test environment and Supabase mocking
 */

const { chromium } = require('@playwright/test');

async function globalSetup() {
  console.log('🚀 Starting E2E test environment setup...');
  
  try {
    // Start Supabase mock server
    const mockServer = require('./utils/supabase-mock-server');
    await mockServer.start();
    console.log('✅ Supabase mock server started');
    
    // Initialize test database
    await mockServer.initializeTestData();
    console.log('✅ Test data initialized');
    
    // Verify application is accessible
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto('http://localhost:3000', { timeout: 30000 });
      console.log('✅ Application is accessible');
    } catch (error) {
      console.error('❌ Application not accessible:', error.message);
      throw error;
    } finally {
      await browser.close();
    }
    
    console.log('🎉 E2E test environment setup complete!');
    
  } catch (error) {
    console.error('❌ E2E setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;