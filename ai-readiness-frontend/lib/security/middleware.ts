/**
 * Comprehensive Security Middleware
 * Combines all security measures into a unified middleware system
 */

import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders, type SecurityHeadersConfig } from './headers'
import { checkRateLimit, applyRateLimitHeaders, rateLimitConfigs, type RateLimitConfig } from './rate-limiter'
import { csrfProtection, type CSRFConfig } from './csrf'
import { 
  securityMonitor, 
  createSecurityMonitoringMiddleware, 
  detectSuspiciousPatterns,
  SecurityEventType,
  SecuritySeverity 
} from './monitoring'
import { validateInput, validationSchemas } from './validation'

// Configuration for comprehensive security
export interface ComprehensiveSecurityConfig {
  headers?: Partial<SecurityHeadersConfig>
  rateLimit?: {
    enabled: boolean
    configs: Record<string, RateLimitConfig>
  }
  csrf?: {
    enabled: boolean
    config?: Partial<CSRFConfig>
  }
  monitoring?: {
    enabled: boolean
    blockSuspiciousIPs: boolean
  }
  validation?: {
    enabled: boolean
    strictMode: boolean
  }
}

// Default security configuration
const defaultSecurityConfig: ComprehensiveSecurityConfig = {
  headers: {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  },
  rateLimit: {
    enabled: true,
    configs: rateLimitConfigs
  },
  csrf: {
    enabled: true
  },
  monitoring: {
    enabled: true,
    blockSuspiciousIPs: true
  },
  validation: {
    enabled: true,
    strictMode: process.env.NODE_ENV === 'production'
  }
}

/**
 * Determine which rate limit config to use based on the request path
 */
function getRateLimitConfig(pathname: string): { name: string; config: RateLimitConfig } {
  // Authentication routes
  if (pathname.includes('/auth/')) {
    return { name: 'auth', config: rateLimitConfigs.auth }
  }
  
  // LLM API routes
  if (pathname.includes('/api/llm/')) {
    return { name: 'llm', config: rateLimitConfigs.llm }
  }
  
  // Export/upload routes
  if (pathname.includes('/api/export') || pathname.includes('/upload')) {
    return { name: 'upload', config: rateLimitConfigs.upload }
  }
  
  // Password reset
  if (pathname.includes('/auth/reset-password') || pathname.includes('/auth/forgot-password')) {
    return { name: 'passwordReset', config: rateLimitConfigs.passwordReset }
  }
  
  // Survey routes
  if (pathname.includes('/survey')) {
    return { name: 'survey', config: rateLimitConfigs.survey }
  }
  
  // Default API rate limiting
  if (pathname.startsWith('/api/')) {
    return { name: 'api', config: rateLimitConfigs.api }
  }
  
  // Lenient rate limiting for static content
  return { 
    name: 'general', 
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200,
      message: 'Too many requests, please try again later.',
      headers: true
    }
  }
}

/**
 * Check if request should bypass security checks
 */
function shouldBypassSecurity(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname
  
  // Bypass for static assets
  const staticPaths = [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ]
  
  return staticPaths.some(path => pathname.startsWith(path)) ||
         !!pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
}

/**
 * Create comprehensive security middleware
 */
export function createComprehensiveSecurityMiddleware(
  config: Partial<ComprehensiveSecurityConfig> = {}
) {
  const finalConfig = { ...defaultSecurityConfig, ...config }
  
  return async function securityMiddleware(request: NextRequest): Promise<NextResponse> {
    // Skip security checks for static assets
    if (shouldBypassSecurity(request)) {
      const response = NextResponse.next()
      return applySecurityHeaders(response, finalConfig.headers)
    }

    const monitor = createSecurityMonitoringMiddleware()(request)
    const pathname = request.nextUrl.pathname
    
    try {
      // 1. Security Monitoring - Detect suspicious patterns
      if (finalConfig.monitoring?.enabled) {
        const suspiciousPatterns = detectSuspiciousPatterns(request)
        
        if (suspiciousPatterns.suspicious) {
          monitor.logEvent(
            SecurityEventType.SUSPICIOUS_IP,
            suspiciousPatterns.severity,
            { patterns: suspiciousPatterns.patterns },
            false
          )
        }
        
        // Check if IP should be blocked
        if (finalConfig.monitoring.blockSuspiciousIPs && monitor.shouldBlock()) {
          monitor.logEvent(
            SecurityEventType.SUSPICIOUS_IP,
            SecuritySeverity.HIGH,
            { reason: 'IP blocked due to suspicious activity' },
            true
          )
          
          return new NextResponse('Access Denied', { 
            status: 429,
            headers: {
              'Content-Type': 'text/plain',
              'Retry-After': '3600' // 1 hour
            }
          })
        }
      }

      // 2. Rate Limiting
      if (finalConfig.rateLimit?.enabled) {
        const { name, config } = getRateLimitConfig(pathname)
        const rateLimitResult = await checkRateLimit(request, config)
        
        if (!rateLimitResult.success) {
          monitor.logEvent(
            SecurityEventType.RATE_LIMIT_EXCEEDED,
            SecuritySeverity.MEDIUM,
            { 
              rateLimitType: name,
              limit: rateLimitResult.limit,
              retryAfter: rateLimitResult.retryAfter
            },
            true
          )
          
          const response = new NextResponse(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              retryAfter: rateLimitResult.retryAfter 
            }),
            { 
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          )
          
          applyRateLimitHeaders(response.headers, rateLimitResult, config)
          return applySecurityHeaders(response, finalConfig.headers)
        }
      }

      // 3. CSRF Protection (for unsafe methods)
      if (finalConfig.csrf?.enabled && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const csrfResult = await csrfProtection(request, finalConfig.csrf.config)
        
        if (!csrfResult.success) {
          monitor.logEvent(
            SecurityEventType.CSRF_ATTACK,
            SecuritySeverity.HIGH,
            { error: csrfResult.error },
            true
          )
          
          const response = new NextResponse(
            JSON.stringify({ 
              error: 'CSRF protection failed',
              message: csrfResult.error 
            }),
            { 
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          )
          
          return applySecurityHeaders(response, finalConfig.headers)
        }
      }

      // 4. Input Validation for POST/PUT requests
      if (finalConfig.validation?.enabled && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const contentType = request.headers.get('content-type')
          
          if (contentType?.includes('application/json')) {
            // Clone request to read body without consuming it
            const clonedRequest = request.clone()
            const body = await clonedRequest.text()
            
            if (body) {
              // Basic validation for JSON payload size
              if (body.length > 1048576) { // 1MB limit
                monitor.logEvent(
                  SecurityEventType.LARGE_PAYLOAD,
                  SecuritySeverity.MEDIUM,
                  { payloadSize: body.length },
                  true
                )
                
                return new NextResponse(
                  JSON.stringify({ error: 'Payload too large' }),
                  { 
                    status: 413,
                    headers: { 'Content-Type': 'application/json' }
                  }
                )
              }
              
              // Validate JSON structure
              try {
                const jsonData = JSON.parse(body)
                
                // Check for potential injection attempts in string values
                const stringValues = JSON.stringify(jsonData)
                const injectionPatterns = [
                  /<script/i,
                  /javascript:/i,
                  /onload=/i,
                  /onerror=/i,
                  /eval\(/i,
                  /union.*select/i,
                  /insert.*into/i
                ]
                
                for (const pattern of injectionPatterns) {
                  if (pattern.test(stringValues)) {
                    const eventType = pattern.toString().includes('script|javascript|onload|onerror|eval') 
                      ? SecurityEventType.XSS_ATTEMPT 
                      : SecurityEventType.SQL_INJECTION_ATTEMPT
                    
                    monitor.logEvent(
                      eventType,
                      SecuritySeverity.HIGH,
                      { pattern: pattern.toString(), payload: body.substring(0, 500) },
                      finalConfig.validation.strictMode
                    )
                    
                    if (finalConfig.validation.strictMode) {
                      return new NextResponse(
                        JSON.stringify({ error: 'Invalid input detected' }),
                        { 
                          status: 400,
                          headers: { 'Content-Type': 'application/json' }
                        }
                      )
                    }
                  }
                }
              } catch (jsonError) {
                // Invalid JSON - let the application handle it
              }
            }
          }
        } catch (validationError) {
          console.error('Input validation error:', validationError)
          // Continue processing if validation fails
        }
      }

      // 5. Continue with the request
      const response = NextResponse.next()
      
      // Apply security headers to the response
      const securedResponse = applySecurityHeaders(response, finalConfig.headers)
      
      // Add rate limit headers if rate limiting was checked
      if (finalConfig.rateLimit?.enabled) {
        const { config } = getRateLimitConfig(pathname)
        const rateLimitResult = await checkRateLimit(request, config)
        applyRateLimitHeaders(securedResponse.headers, rateLimitResult, config)
      }
      
      // Add CSRF token for GET requests
      if (finalConfig.csrf?.enabled && request.method === 'GET') {
        const csrfResult = await csrfProtection(request, finalConfig.csrf.config)
        if (csrfResult.token) {
          securedResponse.headers.set('X-CSRF-Token', csrfResult.token)
        }
      }
      
      return securedResponse
      
    } catch (error) {
      console.error('Security middleware error:', error)
      
      // Log the error
      monitor.logEvent(
        SecurityEventType.PROTOCOL_VIOLATION,
        SecuritySeverity.MEDIUM,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false
      )
      
      // Return a basic secured response
      const response = NextResponse.next()
      return applySecurityHeaders(response, finalConfig.headers)
    }
  }
}

/**
 * Security middleware specifically for API routes
 */
export function createAPISecurityMiddleware(
  config: Partial<ComprehensiveSecurityConfig> = {}
) {
  const apiConfig = {
    ...config,
    rateLimit: {
      enabled: true,
      configs: {
        ...rateLimitConfigs,
        ...config.rateLimit?.configs
      }
    }
  }
  
  return createComprehensiveSecurityMiddleware(apiConfig)
}

/**
 * Security response headers for API responses
 */
export function addAPISecurityHeaders(response: NextResponse | Response): NextResponse {
  // Convert Response to NextResponse if needed
  if (response instanceof Response && !(response instanceof NextResponse)) {
    const nextResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
    response = nextResponse
  }
  
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Server', '')
  response.headers.set('X-Powered-By', '')
  
  return response as NextResponse
}