import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Comprehensive E2E Playwright Configuration
 * Optimized for robust test environment with proper setup and teardown
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Global setup and teardown */
  globalSetup: path.join(__dirname, 'e2e/global-setup.ts'),
  globalTeardown: path.join(__dirname, 'e2e/global-teardown.ts'),
  
  /* Test execution settings - optimized for reliability */
  fullyParallel: false, // Sequential execution to avoid race conditions
  forbidOnly: !!process.env.CI,
  
  /* Retry configuration with exponential backoff */
  retries: process.env.CI ? 3 : 2,
  
  /* Worker configuration - single worker for stability */
  workers: 1,
  
  /* Timeout settings optimized for test infrastructure */
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 15000, // 15 seconds for assertions
  },
  
  /* Reporter configuration */
  reporter: [
    ['html', { open: 'never', outputFolder: 'test-results/e2e-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ...(process.env.CI ? [['github']] : [['list']]),
  ],
  
  /* Global test settings */
  use: {
    /* Base URL with environment support */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
    
    /* Tracing and debugging - comprehensive for troubleshooting */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Browser settings optimized for testing */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Network and timing settings - generous for test environment */
    actionTimeout: 30000, // 30 seconds for actions
    navigationTimeout: 60000, // 60 seconds for navigation
    
    /* Test environment headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Bypass': 'true',
      'X-Mock-Mode': 'true',
    },
    
    /* Storage state for authenticated tests */
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
          localStorage: [
            {
              name: 'test-mode',
              value: 'true'
            }
          ]
        }
      ]
    },
  },

  /* Configure projects for comprehensive browser testing */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /auth\.cleanup\.ts/,
    },

    // Main desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Firefox testing
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Safari testing (if on macOS)
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // API testing project
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        baseURL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        extraHTTPHeaders: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key'}`,
          'X-Test-Environment': 'true',
        },
      },
    },
  ],

  /* Test configuration */
  testIgnore: [
    '**/node_modules/**',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/*.working.spec.ts', // Exclude working test files from main suite
  ],

  /* Output directories */
  outputDir: './test-results/e2e-artifacts',
  
  /* Web server configuration - do not start automatically */
  webServer: undefined, // We manage our own test server
});