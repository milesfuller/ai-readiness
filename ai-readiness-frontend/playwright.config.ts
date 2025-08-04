import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for AI Readiness Test Infrastructure
 * Optimized for test environment with rate limiting and retry logic
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test execution settings */
  fullyParallel: !process.env.CI, // Sequential in CI to avoid rate limits
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration with exponential backoff */
  retries: process.env.CI ? 3 : 1,
  
  /* Worker configuration optimized for test environment */
  workers: process.env.CI ? 1 : Math.min(2, require('os').cpus().length),
  
  /* Timeout settings for test infrastructure */
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '30000', 10),
  expect: {
    timeout: 10000, // Assertion timeout
  },
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ...(process.env.CI ? [['github']] : [['list']]),
  ],
  
  /* Global test settings */
  use: {
    /* Base URL with environment support */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Tracing and debugging */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    /* Browser settings optimized for testing */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Network and timing settings */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Test environment headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Bypass': process.env.ENABLE_RATE_LIMITING !== 'true' ? 'true' : 'false',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});