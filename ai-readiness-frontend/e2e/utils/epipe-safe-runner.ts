/**
 * EPIPE-Safe Test Runner
 * 
 * This utility provides a safe test execution environment that prevents
 * EPIPE errors through connection management, retry logic, and proper cleanup.
 */

import { test as baseTest, expect, Browser, Page, BrowserContext } from '@playwright/test';
import { defaultConnectionPool, ConnectionPool, PoolConnection } from './connection-pool';

export interface EPIPESafeOptions {
  maxRetries: number;
  retryDelay: number;
  connectionTimeout: number;
  enableMetrics: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

export interface TestContext {
  connectionId: string;
  retryCount: number;
  startTime: number;
  metrics: {
    pageLoads: number;
    networkRequests: number;
    errors: number;
    epipeErrors: number;
  };
}

class EPIPESafeRunner {
  private connectionPool: ConnectionPool;
  private options: EPIPESafeOptions;
  private activeContexts: Map<string, TestContext> = new Map();

  constructor(
    connectionPool: ConnectionPool = defaultConnectionPool,
    options: Partial<EPIPESafeOptions> = {}
  ) {
    this.connectionPool = connectionPool;
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      connectionTimeout: 30000,
      enableMetrics: true,
      logLevel: 'info',
      ...options
    };

    this.setupGlobalHandlers();
  }

  /**
   * Create an EPIPE-safe test with automatic retry and connection management
   */
  createSafeTest() {
    return baseTest.extend<{
      safeContext: BrowserContext;
      safePage: Page;
      testContext: TestContext;
    }>({
      testContext: async ({}, use, testInfo) => {
        const context: TestContext = {
          connectionId: '',
          retryCount: 0,
          startTime: Date.now(),
          metrics: {
            pageLoads: 0,
            networkRequests: 0,
            errors: 0,
            epipeErrors: 0
          }
        };

        this.activeContexts.set(testInfo.testId, context);
        await use(context);
        this.activeContexts.delete(testInfo.testId);
      },

      safeContext: async ({ browser, testContext }, use, testInfo) => {
        let connection: PoolConnection | null = null;
        let browserContext: BrowserContext | null = null;

        try {
          // Acquire connection from pool
          connection = await this.connectionPool.acquire(1);
          testContext.connectionId = connection.id;

          // Create browser context with EPIPE-safe settings
          browserContext = await this.createSafeContext(browser, connection);

          // Setup context monitoring
          this.setupContextMonitoring(browserContext, testContext);

          await use(browserContext);

        } catch (error) {
          await this.handleContextError(error as Error, connection, testContext, testInfo);
          throw error;
        } finally {
          // Cleanup context and release connection
          if (browserContext) {
            await this.cleanupContext(browserContext);
          }
          if (connection) {
            await this.connectionPool.release(connection.id);
          }
        }
      },

      safePage: async ({ safeContext, testContext }, use, testInfo) => {
        let page: Page | null = null;

        try {
          // Create page with enhanced error handling
          page = await this.createSafePage(safeContext, testContext);
          
          await use(page);

        } catch (error) {
          await this.handlePageError(error as Error, page, testContext, testInfo);
          throw error;
        } finally {
          if (page && !page.isClosed()) {
            await this.cleanupPage(page);
          }
        }
      }
    });
  }

  /**
   * Create a browser context with EPIPE-safe configuration
   */
  private async createSafeContext(
    browser: Browser, 
    connection: PoolConnection
  ): Promise<BrowserContext> {
    const context = await browser.newContext({
      // Viewport and basic settings
      viewport: { width: 1280, height: 720 },
      userAgent: `EPIPESafeRunner/1.0 (Connection: ${connection.id})`,
      
      // Service worker and cache control
      serviceWorkers: 'block',
      
      // Security settings
      ignoreHTTPSErrors: true,
      acceptDownloads: false,
      
      // Connection management headers
      extraHTTPHeaders: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=3',
        'Cache-Control': 'no-cache',
        'X-Connection-ID': connection.id
      },

      // Permissions
      permissions: [],
      
      // Offline mode disabled to ensure connection testing
      offline: false,
      
      // Timezone and locale
      timezoneId: 'UTC',
      locale: 'en-US'
    });

    // Set up request interception for connection management
    await context.route('**/*', async (route, request) => {
      // Add connection tracking headers
      const headers = {
        ...request.headers(),
        'X-Connection-Pool-ID': connection.id,
        'X-Request-Time': Date.now().toString()
      };

      try {
        await route.continue({ headers });
      } catch (error) {
        // Handle route errors gracefully
        if (this.isEpipeError(error as Error)) {
          this.log('warn', `EPIPE error in route handler: ${(error as Error).message}`);
          await route.abort('connectionfailed');
        } else {
          throw error;
        }
      }
    });

    return context;
  }

  /**
   * Create a page with enhanced error handling and monitoring
   */
  private async createSafePage(
    context: BrowserContext, 
    testContext: TestContext
  ): Promise<Page> {
    const page = await context.newPage();

    // Set up page event handlers
    page.on('pageerror', (error) => {
      testContext.metrics.errors++;
      this.log('error', `Page error: ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (failure && this.isEpipeError(new Error(failure.errorText))) {
        testContext.metrics.epipeErrors++;
        this.log('warn', `EPIPE request failure: ${failure.errorText}`);
      }
    });

    page.on('response', (response) => {
      testContext.metrics.networkRequests++;
      
      // Log connection issues
      if (response.status() >= 500) {
        this.log('warn', `Server error: ${response.status()} ${response.url()}`);
      }
    });

    page.on('load', () => {
      testContext.metrics.pageLoads++;
    });

    // Set default timeouts
    page.setDefaultTimeout(this.options.connectionTimeout);
    page.setDefaultNavigationTimeout(this.options.connectionTimeout);

    return page;
  }

  /**
   * Setup context monitoring for connection health
   */
  private setupContextMonitoring(
    context: BrowserContext, 
    testContext: TestContext
  ): void {
    // Monitor for connection issues
    context.on('close', () => {
      this.log('info', `Context closed for connection ${testContext.connectionId}`);
    });

    // Handle unhandled exceptions in context
    context.on('weberror', (webError) => {
      testContext.metrics.errors++;
      if (this.isEpipeError(new Error(webError.error().message))) {
        testContext.metrics.epipeErrors++;
        this.log('error', `EPIPE web error: ${webError.error().message}`);
      }
    });
  }

  /**
   * Handle context-level errors with retry logic
   */
  private async handleContextError(
    error: Error,
    connection: PoolConnection | null,
    testContext: TestContext,
    testInfo: any
  ): Promise<void> {
    if (this.isEpipeError(error)) {
      testContext.metrics.epipeErrors++;
      
      if (connection && testContext.retryCount < this.options.maxRetries) {
        this.log('warn', `EPIPE error, attempting retry ${testContext.retryCount + 1}`);
        
        try {
          await this.connectionPool.retryConnection(connection.id, error);
          testContext.retryCount++;
          
          // Exponential backoff
          const delay = this.options.retryDelay * Math.pow(2, testContext.retryCount);
          await this.sleep(delay);
          
        } catch (retryError) {
          this.log('error', `Retry failed: ${(retryError as Error).message}`);
          throw error;
        }
      }
    }

    this.log('error', `Context error in test ${testInfo.title}: ${error.message}`);
  }

  /**
   * Handle page-level errors
   */
  private async handlePageError(
    error: Error,
    page: Page | null,
    testContext: TestContext,
    testInfo: any
  ): Promise<void> {
    testContext.metrics.errors++;
    
    if (this.isEpipeError(error)) {
      testContext.metrics.epipeErrors++;
      this.log('error', `EPIPE page error in test ${testInfo.title}: ${error.message}`);
    }

    // Take screenshot on error if enabled
    if (page && !page.isClosed()) {
      try {
        const screenshot = await page.screenshot({ 
          fullPage: true,
          timeout: 5000 
        });
        testInfo.attach('error-screenshot', { 
          body: screenshot, 
          contentType: 'image/png' 
        });
      } catch (screenshotError) {
        this.log('warn', `Failed to take error screenshot: ${(screenshotError as Error).message}`);
      }
    }
  }

  /**
   * Clean up browser context
   */
  private async cleanupContext(context: BrowserContext): Promise<void> {
    try {
      await context.close();
    } catch (error) {
      this.log('warn', `Error closing context: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up page
   */
  private async cleanupPage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      this.log('warn', `Error closing page: ${(error as Error).message}`);
    }
  }

  /**
   * Check if error is EPIPE related
   */
  private isEpipeError(error: Error): boolean {
    const epipePatterns = [
      /EPIPE/i,
      /broken pipe/i,
      /connection reset/i,
      /socket hang up/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /net::ERR_CONNECTION_RESET/i,
      /net::ERR_EMPTY_RESPONSE/i,
      /Protocol error/i
    ];

    return epipePatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.stack || '')
    );
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    process.on('unhandledRejection', (reason: any) => {
      if (this.isEpipeError(new Error(reason))) {
        this.log('error', `Unhandled EPIPE rejection: ${reason}`);
      }
    });

    process.on('uncaughtException', (error: Error) => {
      if (this.isEpipeError(error)) {
        this.log('error', `Uncaught EPIPE exception: ${error.message}`);
      }
    });
  }

  /**
   * Logging utility
   */
  private log(level: string, message: string): void {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = levels.indexOf(this.options.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel <= currentLevel) {
      const timestamp = new Date().toISOString();
      console[level as keyof Console](`[${timestamp}] [EPIPESafeRunner] ${message}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test metrics summary
   */
  getMetrics(): {
    activeTests: number;
    totalErrors: number;
    totalEpipeErrors: number;
    connectionPoolStatus: any;
  } {
    let totalErrors = 0;
    let totalEpipeErrors = 0;

    for (const context of this.activeContexts.values()) {
      totalErrors += context.metrics.errors;
      totalEpipeErrors += context.metrics.epipeErrors;
    }

    return {
      activeTests: this.activeContexts.size,
      totalErrors,
      totalEpipeErrors,
      connectionPoolStatus: this.connectionPool.getStatus()
    };
  }
}

// Create default EPIPE-safe test instance
export const epipeSafeRunner = new EPIPESafeRunner();
export const test = epipeSafeRunner.createSafeTest();

// Export expect for convenience
export { expect };

// Utility function to create custom EPIPE-safe runner
export function createEPIPESafeRunner(options: Partial<EPIPESafeOptions> = {}): typeof test {
  const runner = new EPIPESafeRunner(defaultConnectionPool, options);
  return runner.createSafeTest();
}

// Export retry utility for manual use
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Check if it's worth retrying
      const epipePatterns = [/EPIPE/i, /ECONNRESET/i, /ETIMEDOUT/i];
      const shouldRetry = epipePatterns.some(pattern => pattern.test(lastError.message));
      
      if (!shouldRetry) {
        throw lastError;
      }

      // Exponential backoff
      const retryDelay = delay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError!;
}