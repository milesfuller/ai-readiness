/**
 * Simple rate limiter for API calls
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

class RateLimiter {
  private requests: number[] = []
  private config: RateLimitConfig

  constructor(config: RateLimitConfig = { maxRequests: 10, windowMs: 60000 }) {
    this.config = config
  }

  async checkLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
    const now = Date.now()
    
    // Clean up old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.config.windowMs)
    
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0]
      const retryAfter = Math.ceil((oldestRequest + this.config.windowMs - now) / 1000)
      return { allowed: false, retryAfter }
    }
    
    this.requests.push(now)
    return { allowed: true }
  }

  reset() {
    this.requests = []
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter({
  maxRequests: 5, // Max 5 requests
  windowMs: 10000 // Per 10 seconds
})

export { RateLimiter, globalRateLimiter }