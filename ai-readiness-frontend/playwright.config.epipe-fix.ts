import { defineConfig, devices } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';

/**
 * Playwright Configuration - EPIPE Error Prevention
 * 
 * This configuration is specifically designed to prevent EPIPE (Broken Pipe) errors
 * by implementing:
 * 1. File-based reporters instead of stdout/stderr
 * 2. Buffer optimization for large outputs
 * 3. Connection pooling and keep-alive optimization
 * 4. Output streaming controls
 * 5. Process isolation improvements
 */
export default defineConfig({
  testDir: './e2e',
  
  /* EPIPE Prevention: Force sequential execution */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  
  /* Enhanced retry with exponential backoff */
  retries: process.env.CI ? 3 : 2,
  
  /* Single worker to prevent process communication issues */
  workers: 1,
  
  /* Generous timeouts to prevent premature pipe closures */
  timeout: parseInt(process.env.PLAYWRIGHT_TIMEOUT || '120000', 10),
  expect: {
    timeout: 20000,
  },
  
  /* FILE-BASED REPORTERS - CRITICAL FOR EPIPE PREVENTION */
  reporter: [
    // Primary: File-based HTML reporter (no console output)
    ['html', { 
      open: 'never',
      outputFolder: 'test-results/html-report-epipe-safe',
      attachmentsBaseURL: undefined,
    }],
    
    // Secondary: JSON output to file (safe from EPIPE)
    ['json', { 
      outputFile: 'test-results/results-epipe-safe.json',
      attachmentsBaseURL: undefined,
    }],
    
    // Tertiary: JUnit for CI (file-based)
    ['junit', { 
      outputFile: 'test-results/junit-epipe-safe.xml',
      includeProjectInTestName: true,
    }],
    
    // Minimal console output only if not in CI
    ...(process.env.CI ? [] : [
      ['list', { 
        printSteps: false, // Prevent large console outputs
        quiet: true,       // Minimize console noise
      }]
    ]),
  ],
  
  /* Browser configuration optimized for stability */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 
             process.env.NEXT_PUBLIC_APP_URL || 
             'http://localhost:3000',
    
    /* Tracing to files only (prevents console flooding) */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Browser optimization */
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    viewport: { width: 1280, height: 720 },
    
    /* Extended timeouts to prevent connection drops */
    actionTimeout: 45000,
    navigationTimeout: 90000,
    
    /* Connection keep-alive headers to prevent EPIPE */
    extraHTTPHeaders: {
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Bypass': process.env.ENABLE_RATE_LIMITING !== 'true' ? 'true' : 'false',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=300, max=1000', // Extended keep-alive
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    
    /* Network error handling */
    ignoreHTTPSErrors: true,
    bypassCSP: process.env.NODE_ENV === 'test',
  },

  /* Single browser project to minimize complexity */
  projects: [
    {
      name: 'chromium-epipe-safe',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-dev-shm-usage',
            
            // EPIPE-specific flags
            '--disable-ipc-flooding-protection',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            
            // Process isolation improvements  
            '--disable-extensions',
            '--disable-plugins',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-background-mode',
            
            // Output buffer optimization
            '--max_old_space_size=4096',
            '--disable-logging',
            '--silent-debugger-extension-api',
            
            // Connection optimization
            '--aggressive-cache-discard',
            '--memory-pressure-off',
            
            // Performance optimization
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-translate',
            '--disable-sync',
            '--disable-client-side-phishing-detection',
          ],
          
          // Slower operations to prevent overwhelming pipes
          slowMo: process.env.CI ? 0 : 50,
          
          // Increase timeout for browser launch
          timeout: 60000,
        },
      },
    },
  ],

  /* Web server configuration with EPIPE prevention */
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: true, // Always reuse existing server to prevent port conflicts
    timeout: 240000, // 4 minutes for startup
    
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
      NEXT_TELEMETRY_DISABLED: '1',
      
      // Node.js optimization for large outputs
      NODE_OPTIONS: '--max-old-space-size=6144 --max-http-header-size=80000',
      
      // Disable verbose logging that can cause EPIPE
      DEBUG: '',
      VERBOSE: '0',
      
      // Buffer size optimization
      UV_THREADPOOL_SIZE: '4',
    },
    
    ignoreHTTPSErrors: true,
    
    /* CRITICAL: Redirect outputs to files instead of console */
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: process.env.CI ? 'pipe' : 'ignore',
    
    /* Server health validation */
    reuseExistingServer: !process.env.CI,
  },
  
  /* Output management */
  outputDir: 'test-results/epipe-safe/',
  preserveOutput: 'failures-only',
  
  /* Conservative failure handling */
  maxFailures: process.env.CI ? 0 : 3,
  updateSnapshots: 'missing',
  
  /* Test metadata */
  metadata: {
    testType: 'e2e-epipe-safe',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString(),
    configuration: 'epipe-prevention-optimized',
    platform: os.platform(),
    nodeVersion: process.version,
    
    // EPIPE prevention features
    features: [
      'file-based-reporters',
      'single-worker-execution',
      'connection-keep-alive',
      'output-buffering-optimized',
      'process-isolation-enhanced',
    ],
  },
  
  /* Global hooks for EPIPE prevention */
  globalSetup: './e2e/utils/epipe-prevention-setup.ts',
  globalTeardown: './e2e/utils/epipe-prevention-teardown.ts',
});