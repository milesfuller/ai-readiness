/**
 * Rate Limit Handler for Test Environment
 * Provides exponential backoff and retry logic for test scenarios
 */

interface RateLimitConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  skipRateLimiting: boolean;
}

interface RateLimitError extends Error {
  status: number;
  retryAfter?: number;
}

interface RequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class TestRateLimitHandler {
  private config: RateLimitConfig;
  private requestCount: Map<string, number> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      skipRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'true',
      ...config,
    };
  }

  /**
   * Execute a request with automatic rate limit handling
   */
  async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    options: { identifier?: string; maxRetries?: number } = {}
  ): Promise<T> {
    const identifier = options.identifier || 'default';
    const maxRetries = options.maxRetries || this.config.maxRetries;

    if (this.config.skipRateLimiting) {
      return await requestFn();
    }

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      try {
        // Apply request throttling
        await this.throttleRequest(identifier);

        const result = await requestFn();
        
        // Reset request count on success
        this.requestCount.set(identifier, 0);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const rateLimitError = error as RateLimitError;

        // Check if this is a rate limit error
        if (this.isRateLimitError(rateLimitError)) {
          attempt++;
          
          if (attempt > maxRetries) {
            throw new Error(
              `Rate limit exceeded after ${maxRetries} retries. Last error: ${rateLimitError.message}`
            );
          }

          const delay = this.calculateBackoffDelay(attempt, rateLimitError.retryAfter);
          
          console.warn(
            `Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${delay}ms before retry...`
          );
          
          await this.sleep(delay);
          continue;
        }

        // If it's not a rate limit error, throw immediately
        throw error;
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  /**
   * Make a fetch request with rate limit handling
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const identifier = this.getUrlIdentifier(url);
    
    return this.executeWithRetry(
      async () => {
        const response = await fetch(url, {
          timeout: 30000,
          ...options,
        });

        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response.headers.get('retry-after'));
          const error = new Error(`Rate limit exceeded: ${response.statusText}`) as RateLimitError;
          error.status = 429;
          error.retryAfter = retryAfter;
          throw error;
        }

        return response;
      },
      { identifier }
    );
  }

  /**
   * Throttle requests to prevent overwhelming the server
   */
  private async throttleRequest(identifier: string): Promise<void> {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(identifier) || 0;
    const timeSinceLastRequest = now - lastRequest;
    const minInterval = 100; // Minimum 100ms between requests

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime.set(identifier, Date.now());
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: RateLimitError): boolean {
    return (
      error.status === 429 ||
      error.message.toLowerCase().includes('rate limit') ||
      error.message.toLowerCase().includes('too many requests')
    );
  }

  /**
   * Calculate backoff delay with exponential backoff
   */
  private calculateBackoffDelay(attempt: number, retryAfter?: number): number {
    // If server specifies retry-after, use that (in seconds, convert to ms)
    if (retryAfter && retryAfter > 0) {
      return Math.min(retryAfter * 1000, this.config.maxDelay);
    }

    // Otherwise use exponential backoff
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
      this.config.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Parse retry-after header
   */
  private parseRetryAfter(retryAfterHeader: string | null): number | undefined {
    if (!retryAfterHeader) return undefined;

    const seconds = parseInt(retryAfterHeader, 10);
    return isNaN(seconds) ? undefined : seconds;
  }

  /**
   * Get identifier for URL (domain + path)
   */
  private getUrlIdentifier(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset rate limit counters
   */
  reset(): void {
    this.requestCount.clear();
    this.lastRequestTime.clear();
  }

  /**
   * Get current request statistics
   */
  getStats(): Record<string, any> {
    return {
      requestCounts: Object.fromEntries(this.requestCount),
      lastRequestTimes: Object.fromEntries(this.lastRequestTime),
      config: this.config,
    };
  }
}

// Default instance for global use
export const defaultRateLimitHandler = new TestRateLimitHandler();

/**
 * Wrapper for Supabase client with rate limiting
 */
export class RateLimitedSupabaseClient {
  private rateLimitHandler: TestRateLimitHandler;

  constructor(private supabaseClient: any, rateLimitConfig?: Partial<RateLimitConfig>) {
    this.rateLimitHandler = new TestRateLimitHandler(rateLimitConfig);
  }

  /**
   * Execute Supabase query with rate limiting
   */
  async query<T>(queryFn: () => Promise<T>): Promise<T> {
    return this.rateLimitHandler.executeWithRetry(queryFn, {
      identifier: 'supabase-query',
    });
  }

  /**
   * Execute auth operation with rate limiting
   */
  async auth<T>(authFn: () => Promise<T>): Promise<T> {
    return this.rateLimitHandler.executeWithRetry(authFn, {
      identifier: 'supabase-auth',
      maxRetries: 3, // Lower retries for auth operations
    });
  }
}

/**
 * Utility functions for test environment
 */
export const testUtils = {
  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(seconds: number = 60): Promise<void> {
    console.log(`Waiting ${seconds} seconds for rate limit to reset...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  },

  /**
   * Check if rate limiting is enabled
   */
  isRateLimitingEnabled(): boolean {
    return process.env.ENABLE_RATE_LIMITING === 'true';
  },

  /**
   * Get rate limit configuration from environment
   */
  getRateLimitConfig(): RateLimitConfig {
    return {
      maxRetries: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      baseDelay: 1000,
      maxDelay: parseInt(process.env.TEST_TIMEOUT || '30000', 10),
      backoffMultiplier: 2,
      skipRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'true',
    };
  },
};

export default TestRateLimitHandler;