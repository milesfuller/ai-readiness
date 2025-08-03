/**
 * Rate Limiting Implementation
 * Provides configurable rate limiting for API routes and user actions
 */

import { NextRequest } from 'next/server'

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  message?: string
  headers?: boolean
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

// Rate limit result
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
  error?: string
}

// In-memory store for rate limiting (use Redis in production)
class MemoryStore {
  private store = new Map<string, { count: number; resetTime: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime <= now) {
          this.store.delete(key)
        }
      }
    }, 60000)
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    const entry = this.store.get(key)
    if (entry && entry.resetTime > Date.now()) {
      return entry
    }
    this.store.delete(key)
    return undefined
  }

  set(key: string, value: { count: number; resetTime: number }): void {
    this.store.set(key, value)
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now()
    const resetTime = now + windowMs
    const existing = this.get(key)

    if (existing) {
      existing.count += 1
      this.store.set(key, existing)
      return existing
    } else {
      const newEntry = { count: 1, resetTime }
      this.store.set(key, newEntry)
      return newEntry
    }
  }

  reset(key: string): void {
    this.store.delete(key)
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval)
    this.store.clear()
  }
}

// Global store instance
const store = new MemoryStore()

/**
 * Default rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // General API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig,

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // Increased from 10 to allow for development/testing
    message: 'Too many authentication attempts, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig,

  // LLM API endpoints (more restrictive due to cost)
  llm: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Too many LLM requests, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig,

  // File upload/export endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Too many upload requests, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig,

  // Password reset (very restrictive)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig,

  // Survey submission
  survey: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    message: 'Too many survey submissions, please try again later.',
    headers: true,
    standardHeaders: true
  } as RateLimitConfig
}

/**
 * Generate a unique key for rate limiting
 */
function generateKey(request: NextRequest, identifier?: string): string {
  // Use custom identifier if provided
  if (identifier) {
    return `rate_limit:${identifier}`
  }

  // Try to get user ID from headers or session
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `rate_limit:user:${userId}`
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwardedFor?.split(',')[0]?.trim() || realIp || request.ip || 'unknown'
  
  return `rate_limit:ip:${ip}`
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<RateLimitResult> {
  try {
    const key = generateKey(request, identifier)
    const { count, resetTime } = store.increment(key, config.windowMs)
    
    const now = Date.now()
    const remaining = Math.max(0, config.maxRequests - count)
    const reset = Math.ceil(resetTime / 1000) // Convert to seconds

    if (count > config.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset,
        retryAfter,
        error: config.message || 'Rate limit exceeded'
      }
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining,
      reset
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Allow request if rate limiting fails
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Math.ceil((Date.now() + config.windowMs) / 1000)
    }
  }
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  config: RateLimitConfig
): void {
  if (!config.headers) return

  if (config.standardHeaders) {
    headers.set('RateLimit-Limit', result.limit.toString())
    headers.set('RateLimit-Remaining', result.remaining.toString())
    headers.set('RateLimit-Reset', result.reset.toString())
  }

  if (config.legacyHeaders) {
    headers.set('X-RateLimit-Limit', result.limit.toString())
    headers.set('X-RateLimit-Remaining', result.remaining.toString())
    headers.set('X-RateLimit-Reset', result.reset.toString())
  }

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }
}

/**
 * Create a rate limiting middleware
 */
export function createRateLimitMiddleware(
  config: RateLimitConfig,
  identifier?: (request: NextRequest) => string
) {
  return async (request: NextRequest) => {
    const customId = identifier ? identifier(request) : undefined
    const result = await checkRateLimit(request, config, customId)
    
    if (!result.success) {
      const response = new Response(
        JSON.stringify({
          error: result.error,
          retryAfter: result.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      applyRateLimitHeaders(response.headers, result, config)
      return response
    }

    return { result }
  }
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  identifier?: (request: NextRequest) => string
) {
  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      const customId = identifier ? identifier(request) : undefined
      const result = await checkRateLimit(request, config, customId)
      
      if (!result.success) {
        const response = new Response(
          JSON.stringify({
            error: result.error,
            retryAfter: result.retryAfter
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
        
        applyRateLimitHeaders(response.headers, result, config)
        return response
      }

      // Call the original handler
      const response = await handler(request, ...args)
      
      // Apply rate limit headers to successful responses
      if (response instanceof Response) {
        applyRateLimitHeaders(response.headers, result, config)
      }
      
      return response
    }
  }
}

/**
 * Advanced rate limiting with different strategies
 */
export class AdvancedRateLimiter {
  private strategies = new Map<string, RateLimitConfig>()

  constructor() {
    // Initialize with default strategies
    Object.entries(rateLimitConfigs).forEach(([key, config]) => {
      this.strategies.set(key, config)
    })
  }

  addStrategy(name: string, config: RateLimitConfig): void {
    this.strategies.set(name, config)
  }

  async checkLimit(
    request: NextRequest,
    strategyName: string,
    identifier?: string
  ): Promise<RateLimitResult> {
    const config = this.strategies.get(strategyName)
    if (!config) {
      throw new Error(`Rate limit strategy "${strategyName}" not found`)
    }

    return checkRateLimit(request, config, identifier)
  }

  async checkMultipleStrategies(
    request: NextRequest,
    strategies: string[],
    identifier?: string
  ): Promise<RateLimitResult[]> {
    const results = await Promise.all(
      strategies.map(strategy => this.checkLimit(request, strategy, identifier))
    )
    return results
  }
}

// Global advanced rate limiter instance
export const rateLimiter = new AdvancedRateLimiter()

/**
 * Cleanup function for graceful shutdown
 */
export function cleanup(): void {
  store.cleanup()
}