import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Visual Regression Testing
 * 
 * Specialized configuration for visual regression and accessibility testing
 */
export default defineConfig({
  // Test directory for visual and accessibility tests
  testDir: './tests',
  testMatch: ['**/visual/**/*.spec.ts', '**/accessibility/**/*.spec.ts'],
  
  // Timeout settings optimized for visual testing
  timeout: 120000, // 2 minutes per test (visual tests can be slower)

  // Disable parallel execution for visual tests to ensure consistency
  fullyParallel: false,
  workers: 1,
  
  // Retries for visual tests
  retries: process.env.CI ? 2 : 0,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/visual-report' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['junit', { outputFile: 'test-results/visual-results.xml' }]
  ],

  // Global setup and teardown
  globalSetup: require.resolve('./tests/visual/utils/visual-setup.ts'),
  
  use: {
    // Browser context settings optimized for visual testing
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Consistent timing for visual testing
    actionTimeout: 30000,
    navigationTimeout: 60000,
    
    // Consistent browser settings
    viewport: { width: 1280, height: 720 },
    
    // Disable animations by default for consistent screenshots
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--force-prefers-reduced-motion',
      ],
    },
  },

  // Projects for different testing scenarios
  projects: [
    {
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Consistent screenshot settings
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/visual/**/*.spec.ts']
    },

    {
      name: 'visual-mobile',
      use: { 
        ...devices['iPhone 12'],
        // Mobile viewport for responsive testing
        viewport: { width: 375, height: 812 }
      },
      testMatch: ['**/visual/**/*.spec.ts']
    },

    {
      name: 'accessibility-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Default desktop viewport for accessibility testing
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/accessibility/**/*.spec.ts']
    },

    {
      name: 'accessibility-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
      testMatch: ['**/accessibility/**/*.spec.ts']
    },

    // High contrast testing
    {
      name: 'accessibility-high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'User-Agent': 'High-Contrast-Test'
        }
      },
      testMatch: ['**/accessibility/**/*.spec.ts']
    },

    // Dark theme testing
    {
      name: 'visual-dark-theme',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark'
      },
      testMatch: ['**/visual/**/*.spec.ts']
    }
  ],

  // Output directory for test results
  outputDir: 'test-results/visual',
  
  // Screenshot comparison settings and assertion timeout
  expect: {
    timeout: 30000, // 30 seconds for assertions (screenshots can take time)
    // Visual comparison threshold (0 = exact match, 1 = completely different)
    toHaveScreenshot: { 
      threshold: 0.2,
      // Maximum allowed pixel difference
      maxDiffPixels: 1000,
      // Animation handling
      animations: 'disabled'
    }
  },

  // Web server configuration for testing
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    
    // Environment variables for visual testing
    env: {
      NODE_ENV: 'test',
      NEXT_TELEMETRY_DISABLED: '1',
      // Disable dynamic content that might cause visual differences
      DISABLE_ANIMATIONS: '1',
      DISABLE_AUTO_UPDATES: '1'
    }
  },

  // Test metadata
  metadata: {
    visualTesting: true,
    accessibilityTesting: true,
    platform: process.platform,
    node_version: process.version,
    ci: !!process.env.CI
  },

  // Custom test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    // Ignore non-visual/accessibility tests
    '**/__tests__/**',
    '**/e2e/**'
  ],

  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,

  // Maximum number of failures before stopping
  maxFailures: process.env.CI ? 20 : undefined
});