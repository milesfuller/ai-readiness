import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Test Fixes
 * Optimized for comprehensive testing with proper Supabase mocking
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test execution settings optimized for reliability */
  fullyParallel: false, // Sequential execution to avoid race conditions
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration for flaky test handling */
  retries: process.env.CI ? 2 : 1,
  
  /* Worker configuration for stable execution */
  workers: process.env.CI ? 1 : 2,
  
  /* Timeout settings for E2E tests */
  timeout: 60000, // 60 seconds for complex E2E flows
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ],
  
  /* Global test settings */
  use: {
    /* Base URL for testing */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Tracing and debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Browser settings */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Network and timing settings */
    actionTimeout: 30000, // Increased for reliability
    navigationTimeout: 45000, // Increased for complex pages
    
    /* Test environment headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Mock-Auth': 'true',
      'X-Disable-CSRF': 'true',
    },
    
    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for comprehensive testing */
  projects: [
    // Setup project for initializing test environment
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Main desktop testing
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Additional test-specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        }
      },
      dependencies: ['setup'],
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific test settings
        hasTouch: true,
      },
      dependencies: ['setup'],
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./e2e/global-setup.js'),
  globalTeardown: require.resolve('./e2e/global-teardown.js'),

  /* Web server configuration for testing */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    },
  },
});