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
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: 'playwright-report',
      attachmentsBaseURL: undefined // Prevent URL resolution issues
    }],
    ['json', { 
      outputFile: 'test-results/results.json',
      attachmentsBaseURL: undefined // Prevent attachment URL issues
    }],
    ...(process.env.CI 
      ? [['github'], ['junit', { outputFile: 'test-results/junit.xml' }]] 
      : [['list', { printSteps: true }]]
    ),
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
    video: process.env.CI ? 'retain-on-failure' : 'retain-on-first-failure',
    
    /* Browser settings optimized for stability */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Extended timeout settings to prevent EPIPE errors */
    actionTimeout: 30000, // Increased from 15s to 30s
    navigationTimeout: 60000, // Increased from 30s to 60s
    
    /* Connection settings to prevent EPIPE errors */
    connectOptions: {
      timeout: 60000, // Connection timeout
    },
    
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
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
    },
    // Disable other browsers in test mode to reduce complexity and EPIPE potential
    ...(process.env.CI || process.env.NODE_ENV === 'test' ? [] : [
      {
        name: 'firefox',
        use: { 
          ...devices['Desktop Firefox'],
          launchOptions: {
            firefoxUserPrefs: {
              'network.http.max-connections-per-server': 1, // Reduce connections
            },
          },
        },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
      /* Test against mobile viewports in full test mode only */
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
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
      // Reduce server verbosity to prevent log flooding
      NEXT_TELEMETRY_DISABLED: '1',
      // Optimize for testing
      NODE_OPTIONS: '--max-old-space-size=4096',
    },
    
    /* Wait for stable server before tests */
    ignoreHTTPSErrors: true,
    
    /* Server health check with retry logic */
    retryTimeout: 30000, // 30 second retry timeout
    
    /* Enhanced server startup logging for debugging */
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',
  },
  
  /* Global setup and teardown - temporarily disabled to fix wsEndpoint issue */
  globalSetup: undefined, // Disabled to prevent browser conflicts
  globalTeardown: undefined, // Disabled to prevent browser conflicts
  
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