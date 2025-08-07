import { defineConfig, devices } from '@playwright/test';
import { cpus } from 'os';

/**
 * EPIPE-Fixed Playwright Configuration
 * 
 * This configuration implements aggressive connection management
 * to eliminate EPIPE errors during parallel test execution.
 */
export default defineConfig({
  testDir: './e2e',
  
  // Aggressive timeout settings for stability
  timeout: 90000, // 90 seconds per test (increased)
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },

  // Reduced parallelization to prevent connection exhaustion
  fullyParallel: false, // CHANGED: Disable full parallelization
  workers: 1, // CHANGED: Single worker to eliminate EPIPE
  
  // Enhanced retry with longer delays
  retries: process.env.CI ? 2 : 1,
  
  // Minimal reporter to reduce pipe pressure
  reporter: [
    ['dot'], // CHANGED: Minimal output
    ['json', { outputFile: 'test-results/stable-results.json' }]
  ],

  // Global setup with enhanced connection management
  globalSetup: require.resolve('./e2e/utils/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/utils/global-teardown.ts'),

  use: {
    // Test environment
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Tracing only on failure to reduce I/O
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Enhanced timeout settings
    actionTimeout: 30000, // 30 seconds
    navigationTimeout: 60000, // 60 seconds

    // EPIPE Prevention: Aggressive connection management
    launchOptions: {
      args: [
        // Connection limits
        '--max-connections-per-host=1',
        '--max-connections-per-proxy=1',
        
        // Disable features that create connections
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--disable-translate',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-default-apps',
        '--no-first-run',
        '--no-default-browser-check',
        
        // Security and sandbox
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        
        // Memory management
        '--memory-pressure-off',
        '--max_old_space_size=2048'
      ],
      
      // Slow down operations to prevent connection storms
      slowMo: 500, // CHANGED: Increased significantly
      
      // Enhanced timeouts
      timeout: 120000 // 2 minutes for browser launch
    },

    // Context options for connection management
    contextOptions: {
      viewport: { width: 1280, height: 720 },
      
      // Force close connections
      extraHTTPHeaders: {
        'Connection': 'close',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      
      // Disable service workers and caching
      serviceWorkers: 'block',
      offline: false,
      
      // Security settings
      ignoreHTTPSErrors: true,
      acceptDownloads: false,
      
      // Permissions
      permissions: []
    }
  },

  // Single project to minimize resource usage
  projects: [
    {
      name: 'chromium-stable',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        
        // Enhanced launch options for stability
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--max-connections-per-host=1',
            '--disable-extensions'
          ],
          
          // Even slower for maximum stability
          slowMo: 1000
        }
      }
    }
  ],

  // Web server configuration with resource limits
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes to start
    
    // Environment variables for stability
    env: {
      NODE_ENV: 'test',
      NEXT_TELEMETRY_DISABLED: '1',
      
      // Connection and resource limits
      UV_THREADPOOL_SIZE: '4',
      NODE_OPTIONS: '--max-old-space-size=2048 --max-http-header-size=16384',
      
      // Disable unnecessary features
      NEXT_PRIVATE_STANDALONE: 'false',
      NEXT_PRIVATE_DEBUG_CACHE: 'false'
    }
  },

  // Output configuration
  outputDir: 'test-results/stable-artifacts/',
  
  // Enhanced test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/coverage/**'
  ],

  // Strict test execution
  forbidOnly: !!process.env.CI,
  
  // Limit failures to prevent resource exhaustion
  maxFailures: 3,

  // Test metadata
  metadata: {
    version: '2.0-epipe-fix',
    platform: process.platform,
    node_version: process.version,
    cpu_count: cpus().length,
    workers: 1,
    epipe_prevention: 'aggressive',
    connection_strategy: 'single-connection-pool'
  }
});