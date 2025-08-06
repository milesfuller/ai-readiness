import { defineConfig, devices } from '@playwright/test';

/**
 * Simple Playwright Configuration for Critical Tests
 * Minimal configuration to avoid wsEndpoint issues
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test execution settings - simplified */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  
  /* Timeout settings */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  /* Simple reporter */
  reporter: [['list']],
  
  /* Global test settings */
  use: {
    /* Base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    
    /* Basic tracing */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    /* Browser settings */
    headless: true,
    viewport: { width: 1280, height: 720 },
    
    /* Timeout settings */
    actionTimeout: 20000,
    navigationTimeout: 30000,
    
    /* Headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
    },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Single project configuration */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-extensions',
          ],
        },
      },
    },
  ],

  /* No web server - assume it's running */
  // webServer: undefined,
  
  /* No global setup/teardown to avoid wsEndpoint issues */
  globalSetup: undefined,
  globalTeardown: undefined,
  
  /* Test output */
  outputDir: 'test-results/',
});