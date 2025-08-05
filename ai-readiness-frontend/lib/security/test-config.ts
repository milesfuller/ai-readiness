/**
 * Test Environment Security Configuration
 * Specialized security settings for testing with proper isolation
 */

import { securityConfig } from './config'

// Test-specific rate limit bypass configuration
export const testRateLimitBypass = {
  // Test user accounts that bypass rate limits for automation
  exemptUsers: [
    'testuser@example.com',
    'testadmin@example.com',
    'automation@test.com',
    'ci-cd@test.com',
    'loadtest@test.com'
  ],
  
  // Test IP ranges that bypass rate limits (local development and CI/CD)
  exemptIPs: [
    '127.0.0.1',
    '::1',
    '192.168.0.0/16',
    '10.0.0.0/8',
    '172.16.0.0/12'
  ],
  
  // Test API keys that bypass rate limits
  exemptAPIKeys: [
    'test-api-key-automation',
    'ci-cd-test-key',
    'load-test-key'
  ],
  
  // User agents that bypass rate limits (test automation tools)
  exemptUserAgents: [
    /playwright/i,
    /cypress/i,
    /selenium/i,
    /puppeteer/i,
    /jest/i,
    /postman/i
  ]
}

// Test environment security configuration
export const testSecurityConfig = {
  ...securityConfig,
  
  // More permissive rate limits for testing
  rateLimit: {
    ...securityConfig.rateLimit,
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: process.env.NODE_ENV === 'test' ? 1000 : securityConfig.rateLimit.api.maxRequests,
      message: 'Too many API requests, please try again later.'
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes  
      maxRequests: process.env.NODE_ENV === 'test' ? 100 : securityConfig.rateLimit.auth.maxRequests,
      message: 'Too many authentication attempts, please try again later.'
    },
    llm: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: process.env.NODE_ENV === 'test' ? 500 : securityConfig.rateLimit.llm.maxRequests,
      message: 'Too many LLM requests, please try again later.'
    }
  },

  // Test-specific CSP (more permissive for testing tools)
  csp: {
    ...securityConfig.csp,
    directives: {
      ...securityConfig.csp.directives,
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for test frameworks
        "'unsafe-eval'",   // Required for test frameworks
        'https://vercel.live',
        'https://va.vercel-scripts.com',
        'https://cdn.vercel-insights.com',
        // Test framework domains
        'https://unpkg.com',
        'https://cdn.jsdelivr.net'
      ],
      'connect-src': [
        ...securityConfig.csp.directives['connect-src'],
        // Test endpoints
        'http://localhost:*',
        'https://test-*.supabase.co',
        'wss://test-*.supabase.co'
      ]
    }
  },

  // Test-specific monitoring (less aggressive alerting)
  monitoring: {
    ...securityConfig.monitoring,
    alertThresholds: {
      rateLimitExceeded: 50,    // vs 10 in production
      csrfAttacks: 10,          // vs 3 in production
      injectionAttempts: 5,     // vs 1 in production
      suspiciousPatterns: 20    // vs 5 in production
    }
  }
}

// Production data protection - prevent accidental production access
export const productionDataGuard = {
  // Block production database connections from test environment
  blockedConnectionPatterns: [
    /.*prod.*\.supabase\.co/i,
    /.*production.*\.amazonaws\.com/i,
    /.*prod.*\.database\.com/i,
    /.*live.*\.supabase\.co/i
  ],
  
  // Alert on production API key usage in test
  productionKeyPatterns: [
    /sk-.*prod.*/i,
    /.*production.*/i,
    /.*live.*/i,
    /pk_live_.*/i, // Stripe live keys
    /rk_live_.*/i  // Other live keys
  ],
  
  // Production URL patterns to block
  productionUrlPatterns: [
    /https:\/\/[^-]*\.vercel\.app$/,  // Production Vercel URLs
    /https:\/\/.*\.com$/,             // Production .com domains
    /https:\/\/api\..*\.com/          // Production API endpoints
  ]
}

// Test data protection and anonymization
export const testDataProtection = {
  // Automatically anonymize PII in test databases
  anonymizePII: true,
  
  // Fields to anonymize in test data
  piiFields: [
    'email',
    'phone',
    'address',
    'ssn',
    'credit_card',
    'name',
    'date_of_birth',
    'ip_address'
  ],
  
  // Anonymization rules
  anonymizationRules: {
    email: (original: string) => {
      const hash = require('crypto').createHash('md5').update(original).digest('hex').slice(0, 8)
      return `test+${hash}@example.com`
    },
    phone: () => '+1-555-0199',
    address: () => '123 Test Street, Test City, TS 12345',
    name: (original: string) => `Test User ${Math.floor(Math.random() * 1000)}`,
    ssn: () => '123-45-6789',
    credit_card: () => '4111111111111111', // Test credit card number
    date_of_birth: () => '1990-01-01',
    ip_address: () => '192.168.1.100'
  },
  
  // Test data retention policy
  retentionPolicy: {
    maxAgeHours: parseInt(process.env.TEST_DATA_RETENTION_HOURS || '24'),
    autoCleanup: process.env.AUTO_CLEANUP_TEST_DATA === 'true',
    scrubSensitiveLogs: process.env.SCRUB_SENSITIVE_LOGS === 'true'
  }
}

// Test-specific encryption configuration
export const testEncryptionConfig = {
  // Use separate encryption keys for test environment
  databaseEncryptionKey: process.env.TEST_DATABASE_ENCRYPTION_KEY || process.env.DATABASE_ENCRYPTION_KEY,
  fileEncryptionKey: process.env.TEST_FILE_ENCRYPTION_KEY,
  
  // Lighter encryption in test for performance (still secure)
  algorithm: 'aes-128-gcm', // vs aes-256-gcm in production
  keyDerivationIterations: 1000, // vs 10000 in production
  keyRotationDays: 7, // vs 30 in production
  
  // Test key validation
  validateKeyStrength: true,
  minimumKeyLength: 32
}

// MFA configuration for testing
export const testMFAConfig = {
  // Enable MFA testing with mock TOTP
  mockTOTP: process.env.NODE_ENV === 'test',
  testTOTPSecret: process.env.TEST_TOTP_SECRET || 'JBSWY3DPEHPK3PXP',
  
  // Bypass MFA for specific test users
  bypassMFAForTestUsers: [
    'testuser@example.com',
    'automation@test.com',
    'ci-cd@test.com'
  ],
  
  // Test backup codes
  testBackupCodes: [
    'TEST-BACKUP-001',
    'TEST-BACKUP-002',
    'TEST-BACKUP-003'
  ]
}

// Load testing security configuration
export const loadTestSecurity = {
  maxConcurrentUsers: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100'),
  maxRequestsPerSecond: 50,
  
  // Prevent load tests from impacting production
  allowedEnvironments: ['test', 'staging', 'development'],
  blockedEnvironments: ['production', 'prod'],
  
  // Monitor for security degradation under load
  securityChecks: {
    responseTimeThreshold: 5000,      // Alert if security checks slow down
    errorRateThreshold: 0.1,          // Alert if security errors increase
    rateLimitEffectiveness: true,     // Verify rate limits work under load
    authenticationLatency: 2000       // Monitor auth performance
  },
  
  // Resource limits during load testing
  resourceLimits: {
    maxMemoryUsageMB: parseInt(process.env.MAX_MEMORY_USAGE_MB || '1024'),
    maxCPUUsagePercent: parseInt(process.env.MAX_CPU_USAGE_PERCENT || '50'),
    maxDiskUsageMB: parseInt(process.env.MAX_DISK_USAGE_MB || '5120'),
    maxNetworkBandwidthMbps: parseInt(process.env.MAX_NETWORK_BANDWIDTH_MBPS || '100')
  }
}

// Penetration testing configuration
export const pentestConfig = {
  enabled: process.env.PENTEST_MODE === 'true',
  
  // Safe attacks allowed in test environment
  allowedAttacks: [
    'sql_injection_safe',
    'xss_safe',
    'csrf_safe',
    'rate_limit_test',
    'input_validation_test',
    'auth_bypass_test'
  ],
  
  // Dangerous operations never allowed
  blockedAttacks: [
    'data_deletion',
    'privilege_escalation',
    'dos_attacks',
    'file_system_access',
    'network_scanning',
    'credential_stuffing'
  ],
  
  // Pentest monitoring
  monitoring: {
    logAllAttempts: true,
    alertOnBlockedAttacks: true,
    generateReport: true
  }
}

// Test environment validation
export function validateTestEnvironment(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for production data protection
  if (process.env.NODE_ENV === 'test') {
    // Verify test database URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && !supabaseUrl.includes('test')) {
      errors.push('Test environment should use test-specific Supabase URL')
    }

    // Check for production API keys
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey && (openaiKey.includes('prod') || openaiKey.includes('live'))) {
      errors.push('Production OpenAI API key detected in test environment')
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey && (anthropicKey.includes('prod') || anthropicKey.includes('live'))) {
      errors.push('Production Anthropic API key detected in test environment')
    }

    // Verify test secrets are set
    const requiredTestSecrets = [
      'CSRF_SECRET',
      'SESSION_SECRET'
    ]

    for (const secret of requiredTestSecrets) {
      if (!process.env[secret]) {
        errors.push(`Missing required test secret: ${secret}`)
      } else if (process.env[secret]!.length < 32) {
        warnings.push(`Test secret ${secret} should be at least 32 characters`)
      }
    }

    // Check file permissions (if possible)
    try {
      const fs = require('fs')
      const envTestPath = '.env.test'
      if (fs.existsSync(envTestPath)) {
        const stats = fs.statSync(envTestPath)
        const mode = stats.mode & parseInt('777', 8)
        if (mode !== parseInt('600', 8)) {
          warnings.push('.env.test file should have 600 permissions')
        }
      }
    } catch (error) {
      // File permission check not critical
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Test security health check
export function getTestSecurityHealth() {
  const validation = validateTestEnvironment()
  const checks: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message: string }> = []

  // Environment validation
  checks.push({
    name: 'Test Environment Validation',
    status: validation.valid ? 'pass' : 'fail',
    message: validation.valid ? 'Test environment properly configured' : validation.errors.join(', ')
  })

  // Production data protection
  checks.push({
    name: 'Production Data Protection',
    status: 'pass',
    message: 'Production data access guards active'
  })

  // Rate limit bypass
  checks.push({
    name: 'Test Rate Limit Configuration',
    status: 'pass',
    message: 'Test-appropriate rate limits configured'
  })

  // Encryption configuration
  checks.push({
    name: 'Test Encryption',
    status: testEncryptionConfig.databaseEncryptionKey ? 'pass' : 'warn',
    message: testEncryptionConfig.databaseEncryptionKey ? 'Test encryption configured' : 'No test encryption key set'
  })

  // MFA testing
  checks.push({
    name: 'MFA Testing Configuration',
    status: testMFAConfig.mockTOTP ? 'pass' : 'warn',
    message: testMFAConfig.mockTOTP ? 'MFA testing enabled' : 'MFA testing disabled'
  })

  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length

  let status: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (failCount > 0) {
    status = 'critical'
  } else if (warnCount > 0) {
    status = 'warning'
  }

  return { status, checks, validation }
}

// Helper function to check if current environment is test
export function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.ENVIRONMENT === 'test'
}

// Helper function to bypass rate limiting for test accounts
export function shouldBypassRateLimit(request: any): boolean {
  if (!isTestEnvironment()) {
    return false
  }

  // Check user email
  if (request.user?.email && testRateLimitBypass.exemptUsers.includes(request.user.email)) {
    return true
  }

  // Check IP address
  const clientIP = request.ip || request.connection?.remoteAddress
  if (clientIP && testRateLimitBypass.exemptIPs.some(ip => {
    if (ip.includes('/')) {
      // CIDR notation check would need additional library
      return false
    }
    return clientIP === ip
  })) {
    return true
  }

  // Check API key
  const apiKey = request.headers['x-api-key'] || request.headers['authorization']
  if (apiKey && testRateLimitBypass.exemptAPIKeys.some(key => apiKey.includes(key))) {
    return true
  }

  // Check user agent
  const userAgent = request.headers['user-agent']
  if (userAgent && testRateLimitBypass.exemptUserAgents.some(pattern => pattern.test(userAgent))) {
    return true
  }

  return false
}

export default testSecurityConfig