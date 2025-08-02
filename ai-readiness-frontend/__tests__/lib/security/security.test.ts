/**
 * Security Module Tests
 * Comprehensive tests for all security components
 */

import { NextRequest } from 'next/server'
import {
  applySecurityHeaders,
  checkRateLimit,
  validateInput,
  createCSRFToken,
  validateCSRFToken,
  sanitizeHtml,
  sanitizeSearchQuery,
  validateFile,
  securityMonitor,
  SecurityEventType,
  SecuritySeverity
} from '../../../lib/security'
import { validationSchemas } from '../../../lib/security/validation'

// Mock NextRequest for testing
function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  ip?: string
}): NextRequest {
  const { method = 'GET', url = 'http://localhost:3000', headers = {}, ip = '127.0.0.1' } = options
  
  return {
    method,
    url,
    headers: new Headers(headers),
    ip,
    nextUrl: new URL(url),
    cookies: new Map()
  } as any
}

describe('Security Headers', () => {
  test('should apply basic security headers', () => {
    const response = new Response('test')
    const securedResponse = applySecurityHeaders(response)
    
    expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY')
    expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  test('should apply CSP headers when enabled', () => {
    const response = new Response('test')
    const securedResponse = applySecurityHeaders(response, {
      csp: {
        enabled: true,
        reportOnly: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"]
        }
      }
    })
    
    const csp = securedResponse.headers.get('Content-Security-Policy')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
  })

  test('should apply HSTS in production', () => {
    const response = new Response('test')
    const securedResponse = applySecurityHeaders(response, {
      hsts: {
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      environment: 'production'
    })
    
    const hsts = securedResponse.headers.get('Strict-Transport-Security')
    expect(hsts).toBe('max-age=31536000; includeSubDomains; preload')
  })
})

describe('Rate Limiting', () => {
  test('should allow requests within limit', async () => {
    const request = createMockRequest({ ip: '192.168.1.1' })
    const config = {
      windowMs: 60000,
      maxRequests: 10,
      message: 'Rate limit exceeded'
    }
    
    const result = await checkRateLimit(request, config)
    
    expect(result.success).toBe(true)
    expect(result.remaining).toBeLessThanOrEqual(10)
  })

  test('should block requests when limit exceeded', async () => {
    const request = createMockRequest({ ip: '192.168.1.2' })
    const config = {
      windowMs: 60000,
      maxRequests: 2,
      message: 'Rate limit exceeded'
    }
    
    // Make requests up to the limit
    await checkRateLimit(request, config)
    await checkRateLimit(request, config)
    
    // This should be blocked
    const result = await checkRateLimit(request, config)
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Rate limit exceeded')
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})

describe('Input Validation', () => {
  test('should validate email addresses', () => {
    const validEmail = 'test@example.com'
    const invalidEmail = 'invalid-email'
    
    const validResult = validateInput(validEmail, validationSchemas.email)
    const invalidResult = validateInput(invalidEmail, validationSchemas.email)
    
    expect(validResult.valid).toBe(true)
    expect(validResult.data).toBe(validEmail)
    
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.errors).toContain('Invalid email format')
  })

  test('should validate passwords with strength requirements', () => {
    const strongPassword = 'SecureP@ssw0rd123'
    const weakPassword = 'weak'
    
    const strongResult = validateInput(strongPassword, validationSchemas.password)
    const weakResult = validateInput(weakPassword, validationSchemas.password)
    
    expect(strongResult.valid).toBe(true)
    expect(weakResult.valid).toBe(false)
  })

  test('should sanitize HTML content', () => {
    const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>'
    const sanitized = sanitizeHtml(maliciousInput)
    
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).not.toContain('alert')
    expect(sanitized).toContain('Safe content')
  })

  test('should sanitize search queries', () => {
    const maliciousQuery = "'; DROP TABLE users; --"
    const sanitized = sanitizeSearchQuery(maliciousQuery)
    
    expect(sanitized).not.toContain('DROP TABLE')
    expect(sanitized).not.toContain('--')
  })

  test('should validate file uploads', () => {
    const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' })
    
    const validOptions = {
      maxSize: 1024 * 1024, // 1MB
      allowedTypes: ['image/jpeg', 'image/png'],
      allowedExtensions: ['jpg', 'jpeg', 'png']
    }
    
    const validResult = validateFile(validFile, validOptions)
    const invalidResult = validateFile(invalidFile, validOptions)
    
    expect(validResult.valid).toBe(true)
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.error).toContain('not allowed')
  })
})

describe('CSRF Protection', () => {
  test('should create and validate CSRF tokens', () => {
    const sessionId = 'test-session-123'
    const token = createCSRFToken(sessionId)
    
    expect(token).toBeDefined()
    expect(token.split(':')).toHaveLength(3) // token:timestamp:signature
    
    const validation = validateCSRFToken(sessionId, token)
    expect(validation.valid).toBe(true)
  })

  test('should reject invalid CSRF tokens', () => {
    const sessionId = 'test-session-456'
    const invalidToken = 'invalid:token:format'
    
    const validation = validateCSRFToken(sessionId, invalidToken)
    expect(validation.valid).toBe(false)
    expect(validation.error).toBeDefined()
  })

  test('should reject expired CSRF tokens', () => {
    // Create a token with a very short timeout for testing
    const sessionId = 'test-session-789'
    const config = {
      secret: 'test-secret',
      tokenLength: 32,
      cookieName: 'csrf-token',
      headerName: 'x-csrf-token',
      sessionTimeout: 1, // 1ms - will expire immediately
      secure: false,
      sameSite: 'strict' as const
    }
    
    const token = createCSRFToken(sessionId, config)
    
    // Wait for token to expire
    setTimeout(() => {
      const validation = validateCSRFToken(sessionId, token, config)
      expect(validation.valid).toBe(false)
      expect(validation.error).toContain('expired')
    }, 10)
  })
})

describe('Security Monitoring', () => {
  test('should log security events', () => {
    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/test',
      headers: { 'user-agent': 'test-agent' },
      ip: '192.168.1.100'
    })
    
    const event = securityMonitor.logEvent(
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecuritySeverity.MEDIUM,
      request,
      { limit: 10, actual: 15 },
      true
    )
    
    expect(event.type).toBe(SecurityEventType.RATE_LIMIT_EXCEEDED)
    expect(event.severity).toBe(SecuritySeverity.MEDIUM)
    expect(event.blocked).toBe(true)
    expect(event.ip).toBe('192.168.1.100')
    expect(event.userAgent).toBe('test-agent')
  })

  test('should track security metrics', () => {
    const request = createMockRequest({ ip: '192.168.1.200' })
    
    // Log multiple events
    securityMonitor.logEvent(SecurityEventType.XSS_ATTEMPT, SecuritySeverity.HIGH, request)
    securityMonitor.logEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, SecuritySeverity.HIGH, request)
    securityMonitor.logEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, SecuritySeverity.MEDIUM, request)
    
    const metrics = securityMonitor.getMetrics(60000) // Last minute
    
    expect(metrics.totalEvents).toBeGreaterThanOrEqual(3)
    expect(metrics.eventsByType[SecurityEventType.XSS_ATTEMPT]).toBeGreaterThanOrEqual(1)
    expect(metrics.eventsBySeverity[SecuritySeverity.HIGH]).toBeGreaterThanOrEqual(2)
  })

  test('should identify suspicious IPs', () => {
    const request = createMockRequest({ ip: '192.168.1.300' })
    
    // Log multiple high-severity events to trigger IP blocking
    for (let i = 0; i < 6; i++) {
      securityMonitor.logEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, SecuritySeverity.HIGH, request)
    }
    
    const shouldBlock = securityMonitor.shouldBlockIP('192.168.1.300')
    expect(shouldBlock).toBe(true)
  })

  test('should generate security reports', () => {
    const request = createMockRequest({ ip: '192.168.1.400' })
    
    securityMonitor.logEvent(SecurityEventType.CSRF_ATTACK, SecuritySeverity.HIGH, request)
    
    const report = securityMonitor.generateSecurityReport(60000)
    
    expect(report.summary).toBeDefined()
    expect(report.eventsByType).toBeDefined()
    expect(report.eventsBySeverity).toBeDefined()
    expect(report.recentEvents).toBeDefined()
    expect(Array.isArray(report.recentEvents)).toBe(true)
  })
})

describe('Integration Tests', () => {
  test('should handle comprehensive security workflow', async () => {
    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/test',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-browser/1.0'
      },
      ip: '192.168.1.500'
    })
    
    // Test rate limiting
    const rateLimitConfig = {
      windowMs: 60000,
      maxRequests: 5,
      message: 'Too many requests'
    }
    
    const rateLimitResult = await checkRateLimit(request, rateLimitConfig)
    expect(rateLimitResult.success).toBe(true)
    
    // Test CSRF token creation and validation
    const sessionId = 'integration-test-session'
    const csrfToken = createCSRFToken(sessionId)
    const csrfValidation = validateCSRFToken(sessionId, csrfToken)
    expect(csrfValidation.valid).toBe(true)
    
    // Test input validation
    const userInput = {
      email: 'test@example.com',
      name: 'John Doe',
      message: 'This is a safe message'
    }
    
    const emailValidation = validateInput(userInput.email, validationSchemas.email)
    expect(emailValidation.valid).toBe(true)
    
    // Test security monitoring
    const monitoringEvent = securityMonitor.logEvent(
      SecurityEventType.AUTHENTICATION_FAILURE,
      SecuritySeverity.MEDIUM,
      request,
      { reason: 'Invalid credentials' },
      false
    )
    
    expect(monitoringEvent.type).toBe(SecurityEventType.AUTHENTICATION_FAILURE)
    expect(monitoringEvent.ip).toBe('192.168.1.500')
  })
})