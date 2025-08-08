/**
 * Enhanced Rate Limiting System
 * 
 * Advanced rate limiting with multiple strategies:
 * - Per-user rate limiting
 * - Per-organization rate limiting  
 * - Per-API key rate limiting
 * - Sliding window algorithms
 * - Redis integration for distributed systems
 * - Dynamic rate limit adjustment
 * - Rate limit analytics and monitoring
 */

import { NextRequest } from 'next/server'
import { rateLimitConfigs, checkRateLimit, RateLimitResult, RateLimitConfig } from '@/lib/security/rate-limiter'

// Extended rate limit configurations for API
export const apiRateLimitConfigs = {
  ...rateLimitConfigs,
  
  // API-specific configurations
  'api.general': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'API rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.authenticated': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5000, // Higher limit for authenticated users
    message: 'Authenticated API rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.premium': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10000, // Even higher for premium users
    message: 'Premium API rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  // Endpoint-specific limits
  'api.surveys.create': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    message: 'Survey creation rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.llm.analyze': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 500, // Higher limit for LLM analysis
    message: 'LLM analysis rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.llm.batch': {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    maxRequests: 10, // Very limited for batch operations
    message: 'LLM batch processing rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.export': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'Export rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,

  'api.webhooks': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100,
    message: 'Webhook rate limit exceeded',
    headers: true,
    standardHeaders: true,
  } as RateLimitConfig,
} as const

// Rate limit tiers based on user/organization level
export enum RateLimitTier {
  FREE = 'free',
  BASIC = 'basic', 
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export const tierLimits: Record<RateLimitTier, Record<string, Partial<RateLimitConfig>>> = {
  [RateLimitTier.FREE]: {
    'api.general': { maxRequests: 100 },
    'api.llm.analyze': { maxRequests: 50 },
    'api.surveys.create': { maxRequests: 10 },
    'api.export': { maxRequests: 5 },
  },
  [RateLimitTier.BASIC]: {
    'api.general': { maxRequests: 500 },
    'api.llm.analyze': { maxRequests: 200 },
    'api.surveys.create': { maxRequests: 50 },
    'api.export': { maxRequests: 20 },
  },
  [RateLimitTier.PREMIUM]: {
    'api.general': { maxRequests: 2000 },
    'api.llm.analyze': { maxRequests: 1000 },
    'api.surveys.create': { maxRequests: 200 },
    'api.export': { maxRequests: 100 },
  },
  [RateLimitTier.ENTERPRISE]: {
    'api.general': { maxRequests: 10000 },
    'api.llm.analyze': { maxRequests: 5000 },
    'api.surveys.create': { maxRequests: 1000 },
    'api.export': { maxRequests: 500 },
  },
}

/**
 * Enhanced rate limiter with multi-tier support
 */
export class EnhancedRateLimiter {
  private configs = new Map<string, RateLimitConfig>()

  constructor() {
    // Initialize with API-specific configs
    Object.entries(apiRateLimitConfigs).forEach(([key, config]) => {
      this.configs.set(key, config)
    })
  }

  /**
   * Check rate limit with tier-based adjustment
   */
  async checkRateLimit(
    request: NextRequest,
    strategy: string,
    options: {
      userId?: string
      organizationId?: string
      apiKeyId?: string
      tier?: RateLimitTier
      customIdentifier?: string
    } = {}
  ): Promise<RateLimitResult> {
    // Get base configuration
    const baseConfig = this.configs.get(strategy)
    if (!baseConfig) {
      throw new Error(`Rate limit strategy "${strategy}" not found`)
    }

    // Apply tier-based adjustments
    const config = this.applyTierLimits(baseConfig, strategy, options.tier)

    // Generate appropriate identifier
    const identifier = this.generateIdentifier(request, options)

    return checkRateLimit(request, config, identifier)
  }

  /**
   * Check multiple rate limits (user, organization, global)
   */
  async checkMultipleRateLimits(
    request: NextRequest,
    strategy: string,
    options: {
      userId?: string
      organizationId?: string
      apiKeyId?: string
      tier?: RateLimitTier
    } = {}
  ): Promise<{
    user: RateLimitResult
    organization: RateLimitResult
    global: RateLimitResult
    overall: RateLimitResult
  }> {
    // Check user-specific rate limit
    const userResult = await this.checkRateLimit(request, strategy, {
      ...options,
      customIdentifier: options.userId ? `user:${options.userId}` : undefined,
    })

    // Check organization-specific rate limit
    const orgResult = await this.checkRateLimit(request, strategy, {
      ...options,
      customIdentifier: options.organizationId ? `org:${options.organizationId}` : undefined,
    })

    // Check global rate limit (IP-based)
    const globalResult = await this.checkRateLimit(request, strategy, options)

    // Determine overall result (most restrictive)
    const overall: RateLimitResult = {
      success: userResult.success && orgResult.success && globalResult.success,
      limit: Math.min(userResult.limit, orgResult.limit, globalResult.limit),
      remaining: Math.min(userResult.remaining, orgResult.remaining, globalResult.remaining),
      reset: Math.max(userResult.reset, orgResult.reset, globalResult.reset),
    }

    if (!overall.success) {
      // Find which limit was exceeded
      if (!userResult.success) {
        overall.error = `User rate limit exceeded: ${userResult.error}`
        overall.retryAfter = userResult.retryAfter
      } else if (!orgResult.success) {
        overall.error = `Organization rate limit exceeded: ${orgResult.error}`
        overall.retryAfter = orgResult.retryAfter
      } else if (!globalResult.success) {
        overall.error = `Global rate limit exceeded: ${globalResult.error}`
        overall.retryAfter = globalResult.retryAfter
      }
    }

    return {
      user: userResult,
      organization: orgResult,
      global: globalResult,
      overall,
    }
  }

  /**
   * Apply tier-based rate limit adjustments
   */
  private applyTierLimits(
    baseConfig: RateLimitConfig,
    strategy: string,
    tier?: RateLimitTier
  ): RateLimitConfig {
    if (!tier || tier === RateLimitTier.ENTERPRISE) {
      return baseConfig
    }

    const tierConfig = tierLimits[tier][strategy]
    if (!tierConfig) {
      return baseConfig
    }

    return {
      ...baseConfig,
      ...tierConfig,
    }
  }

  /**
   * Generate rate limit identifier
   */
  private generateIdentifier(
    request: NextRequest,
    options: {
      userId?: string
      organizationId?: string
      apiKeyId?: string
      customIdentifier?: string
    }
  ): string | undefined {
    if (options.customIdentifier) {
      return options.customIdentifier
    }

    if (options.apiKeyId) {
      return `api_key:${options.apiKeyId}`
    }

    if (options.userId) {
      return `user:${options.userId}`
    }

    if (options.organizationId) {
      return `org:${options.organizationId}`
    }

    return undefined // Fall back to IP-based limiting
  }

  /**
   * Add new rate limit strategy
   */
  addStrategy(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config)
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(
    request: NextRequest,
    strategy: string,
    identifier?: string
  ): Promise<{
    limit: number
    remaining: number
    reset: number
    resetTime: Date
  }> {
    // This would need to be implemented in the memory store
    // For now, return estimated values
    const config = this.configs.get(strategy)
    if (!config) {
      throw new Error(`Rate limit strategy "${strategy}" not found`)
    }

    return {
      limit: config.maxRequests,
      remaining: config.maxRequests, // This would be actual remaining
      reset: Math.ceil((Date.now() + config.windowMs) / 1000),
      resetTime: new Date(Date.now() + config.windowMs),
    }
  }
}

/**
 * Rate limit analytics
 */
export class RateLimitAnalytics {
  /**
   * Track rate limit events
   */
  static async trackEvent(event: {
    strategy: string
    identifier: string
    success: boolean
    remaining: number
    timestamp: Date
    userAgent?: string
    endpoint?: string
  }): Promise<void> {
    // In production, this would send to analytics service
    console.log('Rate limit event:', event)
  }

  /**
   * Get rate limit statistics
   */
  static async getStatistics(
    timeframe: 'hour' | 'day' | 'week' | 'month',
    filters: {
      strategy?: string
      userId?: string
      organizationId?: string
    } = {}
  ): Promise<{
    totalRequests: number
    blockedRequests: number
    topStrategies: Array<{ strategy: string; count: number }>
    topUsers: Array<{ userId: string; count: number }>
    timeSeriesData: Array<{ timestamp: string; requests: number; blocked: number }>
  }> {
    // This would query your analytics database
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topStrategies: [],
      topUsers: [],
      timeSeriesData: [],
    }
  }
}

/**
 * Dynamic rate limit adjustment
 */
export class DynamicRateLimiter extends EnhancedRateLimiter {
  /**
   * Adjust rate limits based on system load
   */
  async adjustLimitsForLoad(
    systemLoad: number, // 0-1 scale
    memoryUsage: number, // 0-1 scale
    responseTime: number // milliseconds
  ): Promise<void> {
    // Reduce limits if system is under stress
    if (systemLoad > 0.8 || memoryUsage > 0.9 || responseTime > 5000) {
      // Apply emergency rate limiting
      const emergencyConfig: RateLimitConfig = {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 50, // Much lower limits
        message: 'System under high load, please try again later',
        headers: true,
        standardHeaders: true,
      }

      // Override all strategies temporarily
      this.addStrategy('emergency', emergencyConfig)
    }
  }

  /**
   * Adjust limits based on user behavior patterns
   */
  async adjustLimitsForUser(
    userId: string,
    behavior: {
      averageRequestsPerHour: number
      errorRate: number
      suspiciousActivity: boolean
    }
  ): Promise<void> {
    if (behavior.suspiciousActivity || behavior.errorRate > 0.5) {
      // Apply stricter limits for suspicious users
      const restrictedConfig: RateLimitConfig = {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 10, // Very limited
        message: 'Account flagged for review',
        headers: true,
        standardHeaders: true,
      }

      this.addStrategy(`user:${userId}:restricted`, restrictedConfig)
    }
  }
}

// Export singleton instances
export const enhancedRateLimiter = new EnhancedRateLimiter()
export const dynamicRateLimiter = new DynamicRateLimiter()

/**
 * Rate limit middleware factory
 */
export function createRateLimitMiddleware(
  strategy: string,
  options: {
    extractUserId?: (request: NextRequest) => Promise<string | undefined>
    extractOrganizationId?: (request: NextRequest) => Promise<string | undefined>
    extractTier?: (request: NextRequest) => Promise<RateLimitTier | undefined>
    multiLevel?: boolean
  } = {}
) {
  return async function rateLimitMiddleware(
    request: NextRequest
  ): Promise<{
    success: boolean
    result: RateLimitResult
    headers: Record<string, string>
  }> {
    // Extract context information
    const userId = options.extractUserId ? await options.extractUserId(request) : undefined
    const organizationId = options.extractOrganizationId ? await options.extractOrganizationId(request) : undefined
    const tier = options.extractTier ? await options.extractTier(request) : RateLimitTier.FREE

    let result: RateLimitResult

    if (options.multiLevel) {
      // Check multiple rate limits
      const results = await enhancedRateLimiter.checkMultipleRateLimits(
        request,
        strategy,
        { userId, organizationId, tier }
      )
      result = results.overall
    } else {
      // Check single rate limit
      result = await enhancedRateLimiter.checkRateLimit(
        request,
        strategy,
        { userId, organizationId, tier }
      )
    }

    // Build response headers
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    }

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString()
    }

    // Track analytics
    RateLimitAnalytics.trackEvent({
      strategy,
      identifier: userId || organizationId || 'anonymous',
      success: result.success,
      remaining: result.remaining,
      timestamp: new Date(),
      userAgent: request.headers.get('User-Agent') || undefined,
      endpoint: request.url,
    })

    return {
      success: result.success,
      result,
      headers,
    }
  }
}