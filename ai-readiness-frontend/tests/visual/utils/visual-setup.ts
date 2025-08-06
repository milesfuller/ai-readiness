/**
 * Global Setup for Visual Testing
 * 
 * Prepares the testing environment for consistent visual regression testing
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🎨 Setting up visual testing environment...');
  
  // Create results directories
  const resultsDir = path.join(process.cwd(), 'testing/visual/results');
  const screenshotsDir = path.join(process.cwd(), 'test-results/visual');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  // Warm up the application and generate baseline data
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for application to be ready
    const baseURL = config.webServer?.command ? 'http://localhost:3000' : process.env.PLAYWRIGHT_BASE_URL;
    
    if (baseURL) {
      console.log(`🌐 Warming up application at ${baseURL}...`);
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');
      
      // Pre-warm fonts and static assets
      await page.evaluate(() => document.fonts.ready);
      
      // Check if app is properly loaded
      const title = await page.title();
      console.log(`✅ Application loaded: "${title}"`);
    }
    
  } catch (error) {
    console.warn('⚠️ Warning: Could not warm up application:', error);
  } finally {
    await browser.close();
  }
  
  // Set up environment variables for consistent testing
  process.env.VISUAL_TESTING = '1';
  process.env.DISABLE_ANIMATIONS = '1';
  
  // Create test configuration file
  const testConfig = {
    timestamp: new Date().toISOString(),
    environment: 'visual-testing',
    disableAnimations: true,
    baseURL: config.webServer?.command ? 'http://localhost:3000' : process.env.PLAYWRIGHT_BASE_URL,
    viewport: {
      width: 1280,
      height: 720
    },
    thresholds: {
      visual: 0.2,
      maxDiffPixels: 1000
    }
  };
  
  fs.writeFileSync(
    path.join(resultsDir, 'test-config.json'), 
    JSON.stringify(testConfig, null, 2)
  );
  
  console.log('✅ Visual testing setup complete');
}

export default globalSetup;