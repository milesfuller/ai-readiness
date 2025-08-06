/**
 * Test Environment Security Middleware
 * Enhanced security middleware with test-specific configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  testSecurityConfig, 
  testRateLimitBypass, 
  productionDataGuard,
  shouldBypassRateLimit,
  isTestEnvironment,
  validateTestEnvironment
} from './test-config'
import { withRateLimit } from './rate-limiter'
import { withCSRFProtection } from './csrf'
import { validateInput, validationSchemas } from './validation'
import { securityMonitor, SecurityEventType, SecuritySeverity } from './monitoring'
import { applySecurityHeaders } from './headers'

// Test-aware rate limiting middleware
export function createTestAwareRateLimit(config: any) {
  return async (request: NextRequest) => {
    // Check if this request should bypass rate limiting
    if (shouldBypassRateLimit(request)) {
      securityMonitor.logEvent(
        SecurityEventType.RATE_LIMIT_BYPASSED,
        SecuritySeverity.LOW,
        request,
        { reason: 'Test environment bypass' },
        false
      )
      return null // No rate limiting
    }

    // Apply normal rate limiting - withRateLimit is a decorator that needs a handler
    const handler = async (req: NextRequest) => NextResponse.next()
    const rateLimitHandler = withRateLimit(config)(handler)
    return rateLimitHandler(request)
  }
}

// Production data access guard
export function createProductionDataGuard() {
  return async (request: NextRequest) => {
    if (!isTestEnvironment()) {
      return null // Only active in test environment
    }

    const url = new URL(request.url)
    const headers = request.headers
    const body = await request.text().catch(() => '')

    // Check for production URL patterns
    for (const pattern of productionDataGuard.productionUrlPatterns) {
      if (pattern.test(request.url)) {
        securityMonitor.logEvent(
          SecurityEventType.PRODUCTION_DATA_ACCESS_ATTEMPTED,
          SecuritySeverity.CRITICAL,
          request,
          { 
            violation: 'Production URL access attempted',
            url: request.url,
            pattern: pattern.toString()
          },
          true
        )
        
        return NextResponse.json(
          { error: 'Production data access blocked in test environment' },
          { status: 403 }
        )
      }
    }

    // Check for production API keys in headers
    const authHeader = headers.get('authorization') || ''
    const apiKeyHeader = headers.get('x-api-key') || ''
    
    for (const pattern of productionDataGuard.productionKeyPatterns) {
      if (pattern.test(authHeader) || pattern.test(apiKeyHeader)) {
        securityMonitor.logEvent(
          SecurityEventType.PRODUCTION_CREDENTIALS_DETECTED,
          SecuritySeverity.CRITICAL,
          request,
          { 
            violation: 'Production API key detected',
            keyPattern: pattern.toString()
          },
          true
        )
        
        return NextResponse.json(
          { error: 'Production API key usage blocked in test environment' },
          { status: 403 }
        )
      }
    }

    // Check for production database connections in body
    for (const pattern of productionDataGuard.blockedConnectionPatterns) {
      if (pattern.test(body)) {
        securityMonitor.logEvent(
          SecurityEventType.PRODUCTION_DATA_ACCESS_ATTEMPTED,
          SecuritySeverity.CRITICAL,
          request,
          { 
            violation: 'Production database connection attempted',
            pattern: pattern.toString()
          },
          true
        )
        
        return NextResponse.json(
          { error: 'Production database access blocked in test environment' },
          { status: 403 }
        )
      }
    }

    return null // No violations detected
  }
}

// Test environment validation middleware
export function createTestEnvironmentValidator() {
  return async (request: NextRequest) => {
    if (!isTestEnvironment()) {
      return null // Only validate in test environment
    }

    // Validate test environment on first request
    const validation = validateTestEnvironment()
    
    if (!validation.valid) {
      securityMonitor.logEvent(
        SecurityEventType.PROTOCOL_VIOLATION,
        SecuritySeverity.HIGH,
        request,
        { 
          errors: validation.errors,
          warnings: validation.warnings
        },
        true
      )
      
      // Don't block requests, but log the issues
      console.error('Test environment validation failed:', validation.errors)
    }

    if (validation.warnings.length > 0) {
      console.warn('Test environment warnings:', validation.warnings)
    }

    return null
  }
}

// Enhanced security monitoring for tests
export function createTestSecurityMonitor() {
  return async (request: NextRequest) => {
    const startTime = Date.now()
    
    // Enhanced logging in test environment
    if (isTestEnvironment()) {
      securityMonitor.logEvent(
        SecurityEventType.AUTHORIZATION_FAILURE,
        SecuritySeverity.LOW,
        request,
        {
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          testEnvironment: true
        },
        false
      )
    }

    // Monitor for test-specific security patterns
    const userAgent = request.headers.get('user-agent') || ''
    const isTestClient = testRateLimitBypass.exemptUserAgents.some(pattern => 
      pattern.test(userAgent)
    )

    if (isTestClient) {
      securityMonitor.logEvent(
        SecurityEventType.SUSPICIOUS_USER_AGENT,
        SecuritySeverity.LOW,
        request,
        { userAgent, clientType: 'test_automation' },
        false
      )
    }

    return null
  }
}

// Comprehensive test security middleware
export function createTestSecurityMiddleware() {
  const productionGuard = createProductionDataGuard()
  const envValidator = createTestEnvironmentValidator()
  const securityMonitor = createTestSecurityMonitor()
  
  return async (request: NextRequest) => {
    const startTime = Date.now()
    
    try {
      // 1. Validate test environment configuration
      const envValidation = await envValidator(request)
      if (envValidation) return envValidation

      // 2. Check for production data access attempts
      const productionCheck = await productionGuard(request)
      if (productionCheck) return productionCheck

      // 3. Enhanced security monitoring
      await securityMonitor(request)

      // 4. Apply test-aware rate limiting
      const pathname = new URL(request.url).pathname
      let rateLimitConfig = testSecurityConfig.rateLimit.api

      // Select appropriate rate limit config
      if (pathname.startsWith('/api/auth')) {
        rateLimitConfig = testSecurityConfig.rateLimit.auth
      } else if (pathname.startsWith('/api/llm')) {
        rateLimitConfig = testSecurityConfig.rateLimit.llm
      }

      const rateLimit = createTestAwareRateLimit(rateLimitConfig)
      const rateLimitResponse = await rateLimit(request)
      if (rateLimitResponse) return rateLimitResponse

      // 5. CSRF protection for unsafe methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const csrfProtection = withCSRFProtection()
        // Skip CSRF in test environment - CSRF protection expects middleware format
        // const csrfResponse = await csrfProtection(request)
        // if (csrfResponse) return csrfResponse
      }

      // 6. Input validation for requests with body
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.text()
          if (body) {
            const validation = validateInput(body, validationSchemas.surveyResponse)
            if (!validation.valid) {
              return NextResponse.json(
                { error: 'Invalid input data', details: validation.errors },
                { status: 400 }
              )
            }
          }
        } catch (error) {
          // Body already consumed or invalid
        }
      }

      // Continue to next middleware/handler
      return NextResponse.next()

    } catch (error) {
      console.error('Test security middleware error:', error)
      
      // Log security middleware errors - simplified for test environment
      console.error('Test security middleware error:', error)

      // Don't block requests due to middleware errors in test
      return NextResponse.next()
    } finally {
      const duration = Date.now() - startTime
      
      // Log performance metrics
      if (duration > 1000) { // Log slow security checks
        console.warn(`Slow security middleware: ${duration}ms for ${request.url}`)
      }
    }
  }
}

// Test-specific security headers
export function applyTestSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Apply standard security headers with test-specific modifications
  const securedResponse = applySecurityHeaders(response, {
    environment: 'development',
    csp: testSecurityConfig.csp
  })

  // Add test-specific headers
  securedResponse.headers.set('X-Test-Environment', 'true')
  securedResponse.headers.set('X-Security-Level', 'test')
  
  // Add performance timing for test analysis
  securedResponse.headers.set('X-Security-Timing', Date.now().toString())

  return securedResponse
}

// Export test security utilities
export const testSecurityUtils = {
  shouldBypassRateLimit,
  isTestEnvironment,
  validateTestEnvironment,
  createTestAwareRateLimit,
  createProductionDataGuard,
  createTestEnvironmentValidator,
  createTestSecurityMonitor,
  createTestSecurityMiddleware,
  applyTestSecurityHeaders
}

export default createTestSecurityMiddleware