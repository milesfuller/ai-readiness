import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal Playwright Configuration for Auth Testing
 * Designed to fix wsEndpoint issues and focus on auth test execution
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test execution settings */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // Reduced retries for faster debugging
  workers: 1, // Single worker
  
  /* Timeout settings */
  timeout: 45000, // Reduced timeout
  expect: {
    timeout: 10000,
  },
  
  /* Reporter configuration */
  reporter: [['list', { printSteps: true }]],
  
  /* Global test settings */
  use: {
    baseURL: 'http://localhost:3000',
    
    /* Basic tracing and debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    /* Browser settings optimized for stability */
    headless: true, // Force headless
    viewport: { width: 1280, height: 720 },
    
    /* Timeout settings */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Test environment headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
    },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
  },

  /* Single project - chromium only */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          headless: true, // Explicitly force headless
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
          ],
          // Remove any wsEndpoint configuration
        },
      },
    },
  ],

  /* Web server configuration */
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120 * 1000, // 2 minutes
    
    env: {
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    
    ignoreHTTPSErrors: true,
  },
  
  /* Output directory */
  outputDir: 'test-results/',
  
  /* Metadata */
  metadata: {
    testType: 'auth-e2e',
    environment: 'test',
  },
});