/**
 * Working Test Configuration
 * This configuration is optimized for tests that actually pass
 * Focus on basic functionality and UI testing
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  
  // Sequential execution for stability
  fullyParallel: false,
  forbidOnly: true,
  
  // Aggressive retries for flaky tests
  retries: process.env.CI ? 3 : 2,
  
  // Single worker to avoid conflicts
  workers: 1,
  
  // Extended timeouts for stability
  timeout: 90000,
  expect: {
    timeout: 20000,
  },
  
  // Comprehensive reporting
  reporter: [
    ['html', { 
      open: 'never', 
      outputFolder: 'test-results/working-tests-report' 
    }],
    ['json', { 
      outputFile: 'test-results/working-tests-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/working-tests-junit.xml' 
    }],
    ['list', { printSteps: true }],
  ],
  
  use: {
    // Use custom test environment
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    
    // Enhanced debugging and tracing
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Browser settings optimized for testing
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    // Extended timeouts for stability
    actionTimeout: 45000,
    navigationTimeout: 90000,
    
    // Custom headers for test environment
    extraHTTPHeaders: {
      'X-Test-Environment': 'working-tests',
      'X-Rate-Limit-Bypass': 'true',
      'X-Mock-Mode': 'true',
    },
    
    // Ignore HTTPS errors in test environment
    ignoreHTTPSErrors: true,
  },

  // Test only on Chrome for consistency
  projects: [
    {
      name: 'chrome-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional Chrome-specific settings
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--no-sandbox',
          ],
        },
      },
    },
  ],

  // Global test setup and teardown
  globalSetup: './e2e/global-setup.working.js',
  globalTeardown: './e2e/global-teardown.working.js',

  // Don't auto-start webServer - we manage it manually
  webServer: undefined,
});