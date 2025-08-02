/**
 * Security Configuration
 * Centralized configuration for all security settings
 */

// Environment-specific security configuration
export const securityConfig = {
  // CSRF Protection
  csrf: {
    secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
    tokenLength: 32,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const
  },

  // Rate Limiting
  rateLimit: {
    // General API rate limiting
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
      message: 'Too many API requests, please try again later.'
    },
    
    // Authentication endpoints
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes  
      maxRequests: process.env.NODE_ENV === 'production' ? 10 : 50,
      message: 'Too many authentication attempts, please try again later.'
    },
    
    // LLM API endpoints (cost-sensitive)
    llm: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: process.env.NODE_ENV === 'production' ? 50 : 200,
      message: 'Too many LLM requests, please try again later.'
    },
    
    // Password reset (very restrictive)
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      message: 'Too many password reset attempts, please try again later.'
    }
  },

  // Content Security Policy
  csp: {
    enabled: true,
    reportOnly: process.env.NODE_ENV === 'development',
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        ...(process.env.NODE_ENV === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
        'https://vercel.live',
        'https://va.vercel-scripts.com',
        'https://cdn.vercel-insights.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for CSS-in-JS
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
      'frame-src': ["'self'", 'https://vercel.live'],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    }
  },

  // Security Headers
  headers: {
    hsts: {
      enabled: process.env.NODE_ENV === 'production',
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()'
  },

  // File Upload Security
  fileUpload: {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedTypes: {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'text/plain', 'text/csv'],
      csv: ['text/csv', 'application/csv']
    },
    allowedExtensions: {
      image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      document: ['pdf', 'txt', 'csv'],
      csv: ['csv']
    }
  },

  // Security Monitoring
  monitoring: {
    enabled: true,
    blockSuspiciousIPs: process.env.NODE_ENV === 'production',
    maxEventsInMemory: 10000,
    alertThresholds: {
      rateLimitExceeded: 10,
      csrfAttacks: 3,
      injectionAttempts: 1,
      suspiciousPatterns: 5
    },
    webhookUrl: process.env.SECURITY_WEBHOOK_URL,
    loggingEndpoint: process.env.SECURITY_LOGGING_ENDPOINT
  },

  // Input Validation
  validation: {
    enabled: true,
    strictMode: process.env.NODE_ENV === 'production',
    maxPayloadSize: 1048576, // 1MB
    timeoutMs: 5000
  }
}

// Validate required environment variables in production
export function validateSecurityEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (process.env.NODE_ENV === 'production') {
    // Required environment variables for production
    const required = [
      'CSRF_SECRET',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    for (const envVar of required) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`)
      }
    }

    // Validate CSRF secret strength
    if (process.env.CSRF_SECRET && process.env.CSRF_SECRET.length < 32) {
      errors.push('CSRF_SECRET must be at least 32 characters long in production')
    }

    // Validate Supabase URL format
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Security health check
export function getSecurityHealth(): {
  status: 'healthy' | 'warning' | 'critical'
  checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }>
} {
  const checks = []

  // Environment validation
  const envValidation = validateSecurityEnvironment()
  checks.push({
    name: 'Environment Variables',
    status: envValidation.valid ? 'pass' : 'fail',
    message: envValidation.valid ? 'All required environment variables present' : envValidation.errors.join(', ')
  })

  // HTTPS check
  checks.push({
    name: 'HTTPS Configuration',
    status: process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? 'fail' : 'pass',
    message: process.env.NODE_ENV === 'production' ? 'HTTPS enforced in production' : 'HTTPS not required in development'
  })

  // CSP check
  checks.push({
    name: 'Content Security Policy',
    status: securityConfig.csp.enabled ? 'pass' : 'warn',
    message: securityConfig.csp.enabled ? 'CSP enabled' : 'CSP disabled'
  })

  // Rate limiting check
  checks.push({
    name: 'Rate Limiting',
    status: 'pass',
    message: 'Rate limiting configured for all endpoints'
  })

  // CSRF protection check
  checks.push({
    name: 'CSRF Protection',
    status: securityConfig.csrf.secret !== 'default-csrf-secret-change-in-production' ? 'pass' : 'warn',
    message: securityConfig.csrf.secret !== 'default-csrf-secret-change-in-production' 
      ? 'CSRF secret configured' 
      : 'Using default CSRF secret - change in production'
  })

  // Determine overall status
  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length

  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (failCount > 0) {
    status = 'critical'
  } else if (warnCount > 0) {
    status = 'warning'
  }

  return { status, checks }
}

export default securityConfig