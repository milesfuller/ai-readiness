/**
 * Security Headers Configuration
 * Implements comprehensive security headers including CSP, HSTS, and security-focused headers
 */

import { NextRequest, NextResponse } from 'next/server'

// Security header configuration
export interface SecurityHeadersConfig {
  // Content Security Policy settings
  csp: {
    enabled: boolean
    reportOnly: boolean
    directives: Record<string, string | string[]>
  }
  // HTTP Strict Transport Security
  hsts: {
    enabled: boolean
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  // Additional security headers
  headers: {
    xFrameOptions: string
    xContentTypeOptions: string
    referrerPolicy: string
    permissionsPolicy: string
    xXSSProtection: string
  }
  // Development vs Production settings
  environment: 'development' | 'production'
}

const defaultConfig: SecurityHeadersConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Next.js development
        "'unsafe-eval'", // Required for Next.js development
        'https://vercel.live',
        'https://va.vercel-scripts.com',
        'https://cdn.vercel-insights.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for styled-components and CSS-in-JS
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'data:'
      ],
      'img-src': [
        "'self'",
        'data:',
        'blob:',
        'https:',
        '*.supabase.co',
        '*.supabase.com'
      ],
      'connect-src': [
        "'self'",
        'https://api.openai.com',
        'https://api.anthropic.com',
        'https://generativelanguage.googleapis.com',
        '*.supabase.co',
        '*.supabase.com',
        'wss://*.supabase.co',
        'wss://*.supabase.com',
        'https://vercel.live',
        'https://va.vercel-scripts.com'
      ],
      'frame-src': [
        "'self'",
        'https://vercel.live'
      ],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    }
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()',
    xXSSProtection: '1; mode=block'
  },
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

/**
 * Generate Content Security Policy header value
 */
function generateCSPHeader(directives: Record<string, string | string[]>, reportOnly: boolean = false): string {
  // Filter out upgrade-insecure-requests in report-only mode to avoid console warnings
  const filteredDirectives = Object.entries(directives)
    .filter(([directive]) => {
      if (reportOnly && directive === 'upgrade-insecure-requests') {
        return false
      }
      return true
    })
    .map(([directive, values]) => {
      if (Array.isArray(values)) {
        return `${directive} ${values.join(' ')}`
      }
      return `${directive} ${values}`
    })
    .join('; ')
  
  return filteredDirectives
}

/**
 * Generate HSTS header value
 */
function generateHSTSHeader(config: SecurityHeadersConfig['hsts']): string {
  let header = `max-age=${config.maxAge}`
  if (config.includeSubDomains) {
    header += '; includeSubDomains'
  }
  if (config.preload) {
    header += '; preload'
  }
  return header
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: Partial<SecurityHeadersConfig> = defaultConfig
): NextResponse {
  const finalConfig = { ...defaultConfig, ...config } as SecurityHeadersConfig
  const headers = response.headers

  // Content Security Policy
  if (finalConfig.csp.enabled) {
    const cspHeader = generateCSPHeader(finalConfig.csp.directives, finalConfig.csp.reportOnly)
    const headerName = finalConfig.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
    headers.set(headerName, cspHeader)
  }

  // HTTP Strict Transport Security (HTTPS only)
  if (finalConfig.hsts.enabled && finalConfig.environment === 'production') {
    headers.set('Strict-Transport-Security', generateHSTSHeader(finalConfig.hsts))
  }

  // X-Frame-Options
  headers.set('X-Frame-Options', finalConfig.headers.xFrameOptions)

  // X-Content-Type-Options
  headers.set('X-Content-Type-Options', finalConfig.headers.xContentTypeOptions)

  // Referrer Policy
  headers.set('Referrer-Policy', finalConfig.headers.referrerPolicy)

  // Permissions Policy
  headers.set('Permissions-Policy', finalConfig.headers.permissionsPolicy)

  // X-XSS-Protection (legacy browsers)
  headers.set('X-XSS-Protection', finalConfig.headers.xXSSProtection)

  // Remove server information
  headers.set('Server', '')
  headers.set('X-Powered-By', '')

  // Additional security headers
  headers.set('X-DNS-Prefetch-Control', 'off')
  headers.set('X-Download-Options', 'noopen')
  headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  return response
}

/**
 * Create security headers middleware
 */
export function createSecurityHeadersMiddleware(config?: Partial<SecurityHeadersConfig>) {
  const finalConfig = { ...defaultConfig, ...config }

  return (request: NextRequest) => {
    const response = NextResponse.next()
    return applySecurityHeaders(response, finalConfig)
  }
}

/**
 * Validate and sanitize CSP directive values
 */
export function validateCSPDirective(directive: string, values: string[]): boolean {
  const validDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'connect-src',
    'font-src', 'object-src', 'media-src', 'frame-src', 'sandbox',
    'report-uri', 'child-src', 'form-action', 'frame-ancestors',
    'base-uri', 'upgrade-insecure-requests', 'block-all-mixed-content'
  ]

  if (!validDirectives.includes(directive)) {
    return false
  }

  // Validate values for potential XSS
  const dangerousPatterns = [
    /javascript:/i,
    /data:(?!image)/i,
    /vbscript:/i,
    /<script/i,
    /on\w+=/i
  ]

  return !values.some(value => 
    dangerousPatterns.some(pattern => pattern.test(value))
  )
}

/**
 * Security headers for API routes
 */
export function applyAPISecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers

  // API-specific security headers
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-XSS-Protection', '1; mode=block')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Remove server information
  headers.set('Server', '')
  headers.set('X-Powered-By', '')

  // CORS headers for API security
  headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token')

  return response
}

export { defaultConfig as defaultSecurityConfig }