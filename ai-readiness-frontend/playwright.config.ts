import { defineConfig, devices } from '@playwright/test';

/**
 * Enhanced Playwright Configuration with EPIPE Prevention
 * 
 * This configuration enables parallel execution with proper connection
 * management to prevent EPIPE errors and resource exhaustion.
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Global timeout settings
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  },

  // Enhanced parallel execution with connection limits
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4, // Reduced workers to prevent EPIPE
  
  // Retry configuration with exponential backoff
  retries: process.env.CI ? 3 : 1,
  
  // Reporter configuration
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./e2e/utils/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/utils/global-teardown.ts'),

  // Enhanced use configuration with connection management
  use: {
    // Browser context settings
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Tracing configuration
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Enhanced timeout settings to handle slow connections
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Connection and resource management
    launchOptions: {
      // Reduce concurrent connections to prevent EPIPE
      args: [
        '--max-connections-per-host=4',
        '--max-connections-per-proxy=4',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list'
      ],
      // Slow down browser operations to reduce connection pressure
      slowMo: process.env.CI ? 100 : 0
    },

    // Custom test options for connection management
    contextOptions: {
      // Reduce concurrent resource loading
      userAgent: 'Playwright-Test-Agent',
      viewport: { width: 1280, height: 720 },
      
      // Service worker and cache settings
      serviceWorkers: 'block',
      
      // Permissions and security
      permissions: [],
      ignoreHTTPSErrors: true,
      
      // Connection pool settings
      extraHTTPHeaders: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=10'
      }
    }
  },

  // Projects configuration with EPIPE-safe settings
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        launchOptions: {
          args: [
            '--max-connections-per-host=2',
            '--max-connections-per-proxy=2',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'network.http.max-connections': 4,
            'network.http.max-connections-per-server': 2,
            'network.http.max-persistent-connections-per-server': 2
          }
        }
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--allow-running-insecure-content'
          ]
        }
      },
    },

    // Mobile testing with reduced connections
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: [
            '--max-connections-per-host=1',
            '--max-connections-per-proxy=1'
          ]
        }
      },
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12']
      },
    },
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    
    // Enhanced environment variables
    env: {
      NODE_ENV: 'test',
      NEXT_TELEMETRY_DISABLED: '1',
      
      // Connection pool settings
      UV_THREADPOOL_SIZE: '8',
      NODE_OPTIONS: '--max-old-space-size=4096 --max-http-header-size=16384'
    }
  },

  // Output and artifact configuration
  outputDir: 'test-results/',
  
  // Test metadata
  metadata: {
    platform: process.platform,
    node_version: process.version,
    ci: !!process.env.CI,
    epipe_prevention: true,
    connection_pool: true
  },

  // Custom test configuration
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,

  // Custom grep patterns
  grep: process.env.TEST_GREP ? new RegExp(process.env.TEST_GREP) : undefined,
  
  // Enhanced error handling
  maxFailures: process.env.CI ? 10 : undefined
});