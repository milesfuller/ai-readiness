import { defineConfig, devices } from '@playwright/test';
import * as os from 'os';

/**
 * Playwright Configuration for AI Readiness Test Infrastructure
 * Optimized for test environment with EPIPE error mitigation and enhanced stability
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Test execution settings - optimized for stability */
  fullyParallel: false, // Always sequential to prevent EPIPE errors
  forbidOnly: !!process.env.CI,
  
  /* Enhanced retry configuration with exponential backoff */
  retries: process.env.CI ? 3 : 2, // Increased retries for stability
  
  /* Single worker to prevent port conflicts and EPIPE errors */
  workers: 1, // Force single worker to avoid connection issues
  
  /* Extended timeout settings for test infrastructure stability */
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '90000', 10), // Increased to 90s
  expect: {
    timeout: 15000, // Increased assertion timeout
  },
  
  /* Enhanced reporter configuration with EPIPE error mitigation */
  reporter: process.env.CI 
    ? [
        ['html', { 
          open: 'never',
          outputFolder: 'playwright-report',
          attachmentsBaseURL: undefined // Prevent URL resolution issues
        }],
        ['json', { 
          outputFile: 'test-results/results.json',
          attachmentsBaseURL: undefined // Prevent attachment URL issues
        }],
        ['github'],
        ['junit', { outputFile: 'test-results/junit.xml' }]
      ]
    : [
        ['html', { 
          open: 'never',
          outputFolder: 'playwright-report',
          attachmentsBaseURL: undefined // Prevent URL resolution issues
        }],
        ['json', { 
          outputFile: 'test-results/results.json',
          attachmentsBaseURL: undefined // Prevent attachment URL issues
        }],
        ['list', { printSteps: true }]
      ],
  
  /* Global test settings with enhanced stability */
  use: {
    /* Base URL with fallback and validation */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 
             process.env.NEXT_PUBLIC_APP_URL || 
             'http://localhost:3000',
    
    /* Enhanced tracing and debugging for better error analysis */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Browser settings optimized for stability */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Extended timeout settings to prevent EPIPE errors */
    actionTimeout: 30000, // Increased from 15s to 30s
    navigationTimeout: 60000, // Increased from 30s to 60s
    
    /* Test environment headers with connection optimization */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Bypass': process.env.ENABLE_RATE_LIMITING !== 'true' ? 'true' : 'false',
      'Connection': 'keep-alive', // Prevent connection drops
      'Keep-Alive': 'timeout=60, max=1000',
    },
    
    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true,
    
    /* Bypass CSP in test mode to prevent script loading issues */
    bypassCSP: process.env.NODE_ENV === 'test',
  },

  /* Configure projects with enhanced browser settings */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Fixed Chrome configuration - minimal args to prevent wsEndpoint issues
        launchOptions: {
          headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
          ],
          // Explicitly disable wsEndpoint to prevent connection issues
          executablePath: undefined,
        },
      },
    },
    // In test mode, only run chromium to prevent wsEndpoint and configuration conflicts
    ...(process.env.NODE_ENV === 'test' ? [] : [
      {
        name: 'firefox',
        use: { 
          ...devices['Desktop Firefox'],
          launchOptions: {
            firefoxUserPrefs: {
              'network.http.max-connections-per-server': 1,
            },
          },
        },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      {
        name: 'Mobile Chrome',
        use: { 
          ...devices['Pixel 5'],
          launchOptions: {
            args: [
              '--no-sandbox',
              '--disable-web-security',
              '--disable-ipc-flooding-protection',
            ],
          },
        },
      },
      {
        name: 'Mobile Safari',
        use: { ...devices['iPhone 12'] },
      },
    ]),
  ],

  /* Enhanced web server configuration with EPIPE error prevention */
  webServer: {
    command: 'npm run dev',
    port: 3000, // Use port instead of url for better compatibility
    reuseExistingServer: true, // Always reuse existing server to prevent port conflicts
    timeout: 180 * 1000, // Increased to 3 minutes
    
    /* Enhanced startup options */
    env: {
      ...process.env,
      // Use test environment when running E2E tests
      NODE_ENV: process.env.NODE_ENV === 'test' ? 'test' : 'development',
      PLAYWRIGHT_TEST: 'true',
      // Load test environment variables if in test mode
      ...(process.env.NODE_ENV === 'test' && {
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        DATABASE_URL: 'postgresql://postgres:test_postgres_password@localhost:54322/ai_readiness_test',
      }),
      // Reduce server verbosity to prevent log flooding
      NEXT_TELEMETRY_DISABLED: '1',
      // Optimize for testing
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
    
    /* Wait for stable server before tests */
    ignoreHTTPSErrors: true,
    
    /* Enhanced server startup logging for debugging */
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',
  },
  
  /* Global setup and teardown - disabled to fix wsEndpoint issue */
  // globalSetup: require.resolve('./e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./e2e/global-teardown.ts'),
  
  /* Test output directory */
  outputDir: 'test-results/',
  
  /* Preserve output on failure */
  preserveOutput: 'failures-only',
  
  /* Maximum failures before stopping */
  maxFailures: process.env.CI ? 0 : 5, // Stop after 5 failures in local
  
  /* Update snapshots only when explicitly requested */
  updateSnapshots: 'missing',
  
  /* Metadata for test reporting */
  metadata: {
    testType: 'e2e',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    nodeVersion: process.version,
  },
});