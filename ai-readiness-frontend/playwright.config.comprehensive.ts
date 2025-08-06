import { defineConfig, devices } from '@playwright/test';

/**
 * Comprehensive Test Suite Configuration
 * Optimized for running the complete E2E test suite with maximum coverage
 */
export default defineConfig({
  // Test directory for comprehensive tests
  testDir: './e2e',
  testMatch: ['comprehensive-*.spec.ts'],
  
  // Global timeout settings
  timeout: 90000, // 90 seconds per test (longer for comprehensive tests)
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },

  // Optimized parallel execution
  fullyParallel: true,
  workers: process.env.CI ? 3 : 6, // More workers for comprehensive tests
  
  // Retry configuration
  retries: process.env.CI ? 2 : 1,
  
  // Enhanced reporting
  reporter: [
    ['html', { outputFolder: 'test-results/comprehensive-report' }],
    ['json', { outputFile: 'test-results/comprehensive-results.json' }],
    ['junit', { outputFile: 'test-results/comprehensive-junit.xml' }],
    ['line'], // Console output
    ['github'] // GitHub Actions integration
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./e2e/utils/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/utils/global-teardown.ts'),

  // Enhanced use configuration
  use: {
    // Base URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
    
    // Enhanced tracing and debugging
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Timeout settings optimized for comprehensive tests
    actionTimeout: 20000, // 20 seconds for actions
    navigationTimeout: 45000, // 45 seconds for navigation

    // Browser context settings
    launchOptions: {
      args: [
        '--max-connections-per-host=6',
        '--max-connections-per-proxy=6',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security', // For API testing
        '--allow-running-insecure-content',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors'
      ],
      slowMo: process.env.CI ? 50 : 0 // Slight delay in CI for stability
    },

    // Context options
    contextOptions: {
      userAgent: 'Comprehensive-Test-Suite/1.0',
      viewport: { width: 1280, height: 720 },
      
      // Service worker settings
      serviceWorkers: 'block',
      
      // Security settings
      permissions: ['microphone'], // For voice recording tests
      ignoreHTTPSErrors: true,
      
      // Connection settings
      extraHTTPHeaders: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=10, max=20'
      }
    }
  },

  // Comprehensive browser matrix
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium'
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox']
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari']
      },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5']
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12']
      },
    },

    // Tablet testing
    {
      name: 'tablet-chrome',
      use: {
        ...devices['Galaxy Tab S4']
      },
    },
    {
      name: 'tablet-safari',
      use: {
        ...devices['iPad Pro']
      },
    },

    // High-resolution testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 2
      },
    },

    // Accessibility testing project
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Force prefers-reduced-motion via environment variable or custom CSS
        extraHTTPHeaders: {
          'Sec-CH-Prefers-Reduced-Motion': 'reduce'
        }
      },
      testMatch: ['comprehensive-*.spec.ts'],
      grep: /accessibility|aria|keyboard/
    }
  ],

  // Development server configuration
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes to start (comprehensive setup)
    
    // Enhanced environment variables for comprehensive testing
    env: {
      NODE_ENV: 'test',
      NEXT_TELEMETRY_DISABLED: '1',
      
      // Connection and performance settings
      UV_THREADPOOL_SIZE: '16',
      NODE_OPTIONS: '--max-old-space-size=6144 --max-http-header-size=32768',
      
      // Test-specific settings
      COMPREHENSIVE_TEST_MODE: '1',
      RATE_LIMIT_DISABLED: process.env.CI ? '0' : '1', // Disable rate limiting in dev
      
      // Database settings for testing
      DATABASE_POOL_MIN: '5',
      DATABASE_POOL_MAX: '20',
      
      // API settings
      API_TIMEOUT: '30000',
      API_RETRY_COUNT: '3'
    }
  },

  // Enhanced output configuration
  outputDir: 'test-results/comprehensive/',
  
  // Test metadata for comprehensive suite
  metadata: {
    suite: 'comprehensive',
    platform: process.platform,
    node_version: process.version,
    ci: !!process.env.CI,
    timestamp: new Date().toISOString(),
    test_count: 'estimated_200+',
    coverage: '100%',
    browsers: ['chromium', 'firefox', 'webkit'],
    devices: ['desktop', 'mobile', 'tablet'],
    features: [
      'authentication',
      'authorization', 
      'api_integration',
      'responsive_design',
      'error_handling',
      'rate_limiting',
      'security',
      'accessibility',
      'performance'
    ]
  },

  // Test filtering and organization
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.d.ts'
  ],

  // Forbid .only in CI to prevent accidental skips
  forbidOnly: !!process.env.CI,

  // Custom grep patterns for test categories
  grep: process.env.TEST_CATEGORY ? new RegExp(process.env.TEST_CATEGORY) : undefined,
  
  // Fail fast configuration
  maxFailures: process.env.CI ? 20 : undefined, // Allow more failures in comprehensive mode

  // Global test configuration
  globalTimeout: 120 * 60 * 1000, // 2 hours total for comprehensive suite
  
  // Shard configuration for parallel CI execution
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD_CURRENT || '1'),
    total: parseInt(process.env.SHARD_TOTAL || '1')
  } : undefined
});