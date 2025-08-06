import { defineConfig, devices } from '@playwright/test';
import * as os from 'os';

/**
 * Playwright Configuration - Ultra-Stable Version
 * Specifically designed to eliminate EPIPE errors and connection issues
 * Use with: npx playwright test --config playwright.config.stable.ts
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Ultra-conservative settings to prevent EPIPE errors */
  fullyParallel: false,
  forbidOnly: true,
  
  /* Aggressive retry strategy */
  retries: 5, // Maximum retries for flaky tests
  
  /* Single worker only - prevents all concurrency issues */
  workers: 1,
  
  /* Very generous timeouts */
  timeout: 120000, // 2 minutes (120000ms)
  expect: {
    timeout: 20000, // 20 seconds for assertions
  },
  
  /* Minimal reporter to prevent output issues */
  reporter: [
    ['list', { printSteps: false }], // Minimal console output
    ['json', { outputFile: 'test-results/stable-results.json' }],
  ],
  
  /* Ultra-stable browser and connection settings */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Maximum tracing for debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    headless: true, // Always headless for stability
    viewport: { width: 1280, height: 720 },
    
    /* Very generous timeouts */
    actionTimeout: 45000, // 45 seconds
    navigationTimeout: 90000, // 90 seconds
    
    /* Connection optimization headers */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Bypass': 'true',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=120, max=100',
      'Cache-Control': 'no-cache',
    },
    
    /* Ignore all network issues */
    ignoreHTTPSErrors: true,
    bypassCSP: true,
  },

  /* Single browser only - Chrome with maximum stability */
  projects: [
    {
      name: 'chromium-stable',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-dev-shm-usage',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-ipc-flooding-protection',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images', // Faster loading
            '--disable-javascript-harmony-shipping',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-background-mode',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-translate',
            '--disable-sync',
          ],
          slowMo: 100, // 100ms delay between actions
        },
      },
    },
  ],

  /* Enhanced web server with maximum stability */
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: false, // Always start fresh
    timeout: 300000, // 5 minutes startup timeout
    
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_OPTIONS: '--max-old-space-size=8192', // 8GB memory
    },
    
    ignoreHTTPSErrors: true,
    stdout: 'ignore', // Reduce log noise
    stderr: 'ignore',
  },
  
  /* Global configuration */
  outputDir: 'test-results/stable/',
  preserveOutput: 'always', // Keep all output for debugging
  maxFailures: 1, // Stop on first failure
  updateSnapshots: 'missing',
  
  /* Test metadata */
  metadata: {
    testType: 'e2e-stable',
    environment: 'test-stable',
    timestamp: new Date().toISOString(),
    configuration: 'epipe-prevention',
    platform: os.platform(),
    nodeVersion: process.version,
  },
});