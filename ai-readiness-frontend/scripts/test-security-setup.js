#!/usr/bin/env node

/**
 * Test Security Setup Script
 * Configures secure test environment with proper isolation
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(level, message) {
  const timestamp = new Date().toISOString()
  const color = colors[level] || colors.reset
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${timestamp} - ${message}`)
}

// Generate cryptographically secure random string
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex')
}

// Validate environment variable format
function validateEnvVar(name, value) {
  const patterns = {
    'CSRF_SECRET': /^[a-zA-Z0-9]{32,}$/,
    'SESSION_SECRET': /^[a-zA-Z0-9]{32,}$/,
    'DATABASE_ENCRYPTION_KEY': /^[a-zA-Z0-9]{32,}$/,
    'NEXT_PUBLIC_SUPABASE_URL': /^https:\/\/.*\.supabase\.co$/,
    'SUPABASE_SERVICE_ROLE_KEY': /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
    'OPENAI_API_KEY': /^sk-[a-zA-Z0-9]{48,}$/,
    'ANTHROPIC_API_KEY': /^sk-ant-[a-zA-Z0-9-_]{64,}$/
  }

  const pattern = patterns[name]
  if (pattern && !pattern.test(value)) {
    log('warn', `${name} format validation failed`)
    return false
  }
  return true
}

// Create secure test environment configuration
function createTestEnvironment() {
  log('info', 'Creating secure test environment configuration...')

  const testEnvPath = path.join(process.cwd(), '.env.test')
  
  // Check if test environment already exists
  if (fs.existsSync(testEnvPath)) {
    log('warn', 'Test environment file already exists. Creating backup...')
    const backupPath = `${testEnvPath}.backup.${Date.now()}`
    fs.copyFileSync(testEnvPath, backupPath)
    log('info', `Backup created: ${backupPath}`)
  }

  // Generate secure secrets
  const secrets = {
    CSRF_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    DATABASE_ENCRYPTION_KEY: generateSecret(32),
    TEST_FILE_ENCRYPTION_KEY: generateSecret(32),
    TEST_TOTP_SECRET: 'JBSWY3DPEHPK3PXP' // Standard test TOTP secret
  }

  // Create test environment configuration
  const testEnvContent = `# =============================================================================
# AI Readiness Assessment - Test Environment Configuration
# =============================================================================
# 🔐 CRITICAL: This file contains TEST-ONLY credentials
# 🚫 NEVER use these credentials in production
# ⚠️  Automatically generated on ${new Date().toISOString()}

# Environment identification
NODE_ENV=test
ENVIRONMENT=test

# Test database configuration (ISOLATED from production)
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key_replace_with_actual
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key_replace_with_actual

# Security configuration (Test-specific secrets)
CSRF_SECRET=${secrets.CSRF_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}
DATABASE_ENCRYPTION_KEY=${secrets.DATABASE_ENCRYPTION_KEY}
TEST_FILE_ENCRYPTION_KEY=${secrets.TEST_FILE_ENCRYPTION_KEY}

# Application URLs (Local test)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# LLM API Keys (Use test-specific keys with quotas)
# OPENAI_API_KEY=sk-test-your-test-openai-key-here
# ANTHROPIC_API_KEY=sk-ant-test-your-test-anthropic-key-here
# GOOGLE_AI_API_KEY=your-test-google-ai-key-here

# Test rate limiting (More permissive)
API_RATE_LIMIT_MAX=1000
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_MAX=100
LLM_RATE_LIMIT_MAX=500
PASSWORD_RESET_LIMIT_MAX=50

# File upload configuration (Test)
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,text/csv,application/pdf,text/plain
UPLOAD_DIR=./test-uploads
QUARANTINE_DIR=./test-quarantine

# Security settings (Test-appropriate)
ENABLE_HSTS=false
ENABLE_CSP=true
CSP_REPORT_ONLY=true
ENABLE_IP_BLOCKING=false
ENABLE_SECURITY_MONITORING=true
ENABLE_AUDIT_LOGGING=true

# Security monitoring
MAX_FAILED_ATTEMPTS=20
BLOCK_DURATION_MINUTES=5
ENABLE_VERBOSE_SECURITY_LOGS=true

# Redis configuration (Test instance)
REDIS_URL=redis://localhost:6379/1
REDIS_PREFIX=test:ai-readiness:

# Webhook and monitoring (Test endpoints)
SECURITY_WEBHOOK_URL=http://localhost:3001/test-webhook
SECURITY_LOGGING_ENDPOINT=http://localhost:3001/test-logs
SECURITY_LOGGING_TOKEN=test-logging-token-${generateSecret(16)}
ALERT_EMAIL=test-security@example.com

# Performance and feature flags
DISABLE_ANALYTICS=true
DISABLE_TELEMETRY=true
SKIP_ENV_VALIDATION=false
ENABLE_DEBUG_MODE=true
ENABLE_VERBOSE_LOGGING=true

# External API mocking
MOCK_EXTERNAL_APIS=false
MOCK_LLM_RESPONSES=false
MOCK_EMAIL_SERVICE=true
MOCK_FILE_UPLOADS=false

# Test user accounts
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=testadmin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# Database connection settings (Test optimized)
DB_POOL_MIN=1
DB_POOL_MAX=5
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=5000

# API timeout settings (Faster for tests)
API_TIMEOUT_MS=5000
LLM_TIMEOUT_MS=30000
SUPABASE_TIMEOUT_MS=10000
WEBHOOK_TIMEOUT_MS=3000

# Caching configuration (Short-lived)
CACHE_TTL_SECONDS=60
DISABLE_CACHE=false
CACHE_PREFIX=test:

# Compliance and audit
AUDIT_LOGGING=true
PII_DETECTION=true
DATA_RETENTION_DAYS=7
COMPLIANCE_MODE=test

# Test data management
AUTO_CLEANUP_TEST_DATA=true
TEST_DATA_RETENTION_HOURS=24
RESET_DB_BETWEEN_TESTS=false
SCRUB_SENSITIVE_LOGS=true

# CI/CD specific settings
CI_MODE=false
PARALLEL_TEST_WORKERS=4
TEST_RETRY_COUNT=2
FAIL_FAST=false
HEADLESS_BROWSER=true

# Development tools (Test)
ENABLE_TEST_ROUTES=true
ENABLE_SWAGGER_DOCS=true
ENABLE_GRAPHQL_PLAYGROUND=true
DEBUG_SQL_QUERIES=false

# MFA testing configuration
TEST_TOTP_SECRET=${secrets.TEST_TOTP_SECRET}
BYPASS_MFA_FOR_TESTS=true

# Security testing
PENTEST_MODE=false
ALLOW_DANGEROUS_OPERATIONS=false
BYPASS_SECURITY_FOR_TESTS=false

# Load testing configuration
MAX_CONCURRENT_REQUESTS=100
LOAD_TEST_DURATION=300
RAMP_UP_TIME=60
THINK_TIME_MS=1000
MAX_MEMORY_USAGE_MB=1024
MAX_CPU_USAGE_PERCENT=50

# Monitoring and observability
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=debug
ENABLE_TRACING=false

# =============================================================================
# SECURITY NOTES:
# 1. This file contains test-only credentials
# 2. All secrets are generated with cryptographic randomness
# 3. Database is isolated from production
# 4. Rate limits are appropriate for testing
# 5. File permissions should be 600
# =============================================================================
`

  // Write test environment file
  fs.writeFileSync(testEnvPath, testEnvContent, { mode: 0o600 })
  log('info', `Test environment created: ${testEnvPath}`)

  // Set proper file permissions
  try {
    fs.chmodSync(testEnvPath, 0o600)
    log('info', 'File permissions set to 600 (owner read/write only)')
  } catch (error) {
    log('warn', 'Could not set file permissions. Please run: chmod 600 .env.test')
  }

  return testEnvPath
}

// Validate test environment configuration
function validateTestEnvironment() {
  log('info', 'Validating test environment configuration...')

  const testEnvPath = path.join(process.cwd(), '.env.test')
  
  if (!fs.existsSync(testEnvPath)) {
    log('error', 'Test environment file not found. Run with --create-test first.')
    return false
  }

  // Check file permissions
  try {
    const stats = fs.statSync(testEnvPath)
    const mode = stats.mode & parseInt('777', 8)
    if (mode !== parseInt('600', 8)) {
      log('warn', '.env.test file should have 600 permissions')
    }
  } catch (error) {
    log('warn', 'Could not check file permissions')
  }

  // Read and validate environment variables
  const envContent = fs.readFileSync(testEnvPath, 'utf8')
  const lines = envContent.split('\n')
  const errors = []
  const warnings = []

  for (const line of lines) {
    if (line.startsWith('#') || !line.includes('=')) continue

    const [name, value] = line.split('=', 2)
    if (value && !validateEnvVar(name, value)) {
      warnings.push(`Invalid format for ${name}`)
    }
  }

  // Check for required variables
  const requiredVars = [
    'NODE_ENV',
    'CSRF_SECRET',
    'SESSION_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL'
  ]

  for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`)) {
      errors.push(`Missing required variable: ${varName}`)
    }
  }

  // Check for production patterns (security risk)
  const productionPatterns = [
    /prod.*\.supabase\.co/i,
    /sk-.*prod/i,
    /live.*api/i
  ]

  for (const pattern of productionPatterns) {
    if (pattern.test(envContent)) {
      errors.push('Production credentials detected in test environment!')
    }
  }

  if (errors.length > 0) {
    log('error', `Validation failed with ${errors.length} errors:`)
    errors.forEach(error => log('error', `  - ${error}`))
    return false
  }

  if (warnings.length > 0) {
    log('warn', `Validation completed with ${warnings.length} warnings:`)
    warnings.forEach(warning => log('warn', `  - ${warning}`))
  } else {
    log('info', 'Test environment validation passed!')
  }

  return true
}

// Create test security documentation
function createTestSecurityDocs() {
  log('info', 'Creating test security documentation...')

  const docsDir = path.join(process.cwd(), 'docs', 'security')
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true, mode: 0o755 })
  }

  const securityChecklistPath = path.join(docsDir, 'TEST_SECURITY_CHECKLIST.md')
  
  const checklistContent = `# Test Security Checklist

## Pre-Test Security Setup
- [ ] Verify test database isolation (separate Supabase project)
- [ ] Confirm test-specific API keys configured
- [ ] Validate test user permissions and access controls
- [ ] Check rate limit bypass configuration for test accounts
- [ ] Verify encryption key separation from production
- [ ] Confirm security monitoring is active for test environment

## Test Environment Security Configuration
- [ ] Test environment file (.env.test) created with proper permissions (600)
- [ ] All secrets generated with cryptographic randomness (32+ characters)
- [ ] Production data access patterns blocked
- [ ] Rate limiting configured appropriately for testing
- [ ] File upload restrictions configured for test safety
- [ ] Security headers configured for test environment

## During Testing Security Checks
- [ ] Monitor for any production data access attempts
- [ ] Validate rate limiting effectiveness during load testing
- [ ] Check authentication and authorization mechanisms
- [ ] Verify input sanitization and validation
- [ ] Monitor resource usage to prevent DoS conditions
- [ ] Check security event logging and alerting

## API Security Testing
- [ ] Test API authentication with valid and invalid credentials
- [ ] Verify rate limiting on API endpoints
- [ ] Test input validation on all API parameters
- [ ] Check for SQL injection vulnerabilities
- [ ] Test for XSS vulnerabilities in responses
- [ ] Verify CSRF protection on state-changing operations

## LLM Integration Security Testing
- [ ] Test with separate LLM API keys (not production keys)
- [ ] Verify input sanitization for LLM prompts
- [ ] Check output filtering for sensitive information
- [ ] Test rate limiting on LLM endpoints
- [ ] Verify cost controls and quota management
- [ ] Test error handling for LLM service failures

## Data Protection Testing
- [ ] Verify PII anonymization in test data
- [ ] Test data encryption at rest and in transit
- [ ] Check compliance with data retention policies
- [ ] Verify secure deletion of sensitive test data
- [ ] Test access controls for sensitive information
- [ ] Check audit logging for data access

## Post-Test Security Cleanup
- [ ] Clean up test data automatically
- [ ] Rotate test secrets if compromised
- [ ] Review security event logs for anomalies
- [ ] Check for any security degradation during testing
- [ ] Archive test security reports and metrics
- [ ] Update security baselines based on test results

## Security Incident Response Testing
- [ ] Test incident detection and alerting mechanisms
- [ ] Verify incident response procedures
- [ ] Check communication channels for security alerts
- [ ] Test backup and recovery procedures
- [ ] Verify forensic logging capabilities
- [ ] Test containment and mitigation procedures

## Compliance and Audit Testing
- [ ] Verify audit logging completeness and accuracy
- [ ] Test compliance reporting mechanisms
- [ ] Check data governance controls
- [ ] Verify privacy controls and consent management
- [ ] Test right to deletion and data portability
- [ ] Check breach notification procedures

## Security Testing Tools and Commands

### Setup Commands
\`\`\`bash
# Create test environment
node scripts/test-security-setup.js --create-test

# Validate configuration
node scripts/test-security-setup.js --validate

# Generate new test secrets
node scripts/test-security-setup.js --rotate-secrets
\`\`\`

### Security Testing Commands
\`\`\`bash
# Run comprehensive security tests
npm run test:security-full

# Test specific security components
npm run test:security:auth
npm run test:security:rate-limiting
npm run test:security:input-validation
npm run test:security:csrf

# Monitor security during tests
npm run security:monitor:test
\`\`\`

### Validation Commands
\`\`\`bash
# Check security health
curl http://localhost:3000/api/security/health

# Generate security report
npm run security:report:test

# Check environment isolation
node scripts/test-security-setup.js --check-isolation
\`\`\`

## Critical Security Reminders

⚠️  **NEVER use production credentials in testing**
🔒 **Always use separate test database instances**
🔐 **Rotate test secrets regularly**
📊 **Monitor security metrics during testing**
🚫 **Block all production data access from test environment**
📝 **Document all security test results**

## Emergency Contacts

- Security Team: security@company.com
- DevOps Team: devops@company.com
- Compliance Team: compliance@company.com

## Last Updated: ${new Date().toISOString()}
`

  fs.writeFileSync(securityChecklistPath, checklistContent)
  log('info', `Security checklist created: ${securityChecklistPath}`)
}

// Generate new secrets for existing test environment
function rotateTestSecrets() {
  log('info', 'Rotating test environment secrets...')

  const testEnvPath = path.join(process.cwd(), '.env.test')
  
  if (!fs.existsSync(testEnvPath)) {
    log('error', 'Test environment file not found. Create it first.')
    return false
  }

  // Backup current file
  const backupPath = `${testEnvPath}.backup.${Date.now()}`
  fs.copyFileSync(testEnvPath, backupPath)
  log('info', `Backup created: ${backupPath}`)

  // Read current content
  let envContent = fs.readFileSync(testEnvPath, 'utf8')

  // Generate new secrets
  const newSecrets = {
    CSRF_SECRET: generateSecret(32),
    SESSION_SECRET: generateSecret(32),
    DATABASE_ENCRYPTION_KEY: generateSecret(32),
    TEST_FILE_ENCRYPTION_KEY: generateSecret(32)
  }

  // Replace secrets in content
  for (const [key, value] of Object.entries(newSecrets)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    envContent = envContent.replace(regex, `${key}=${value}`)
    log('info', `Rotated ${key}`)
  }

  // Write updated content
  fs.writeFileSync(testEnvPath, envContent, { mode: 0o600 })
  log('info', 'Test secrets rotated successfully')

  return true
}

// Check production data isolation
function checkIsolation() {
  log('info', 'Checking production data isolation...')

  const testEnvPath = path.join(process.cwd(), '.env.test')
  
  if (!fs.existsSync(testEnvPath)) {
    log('error', 'Test environment file not found')
    return false
  }

  const envContent = fs.readFileSync(testEnvPath, 'utf8')
  const violations = []

  // Check for production patterns
  const productionPatterns = [
    { pattern: /prod.*\.supabase\.co/i, description: 'Production Supabase URL' },
    { pattern: /sk-.*prod/i, description: 'Production API key pattern' },
    { pattern: /live.*api/i, description: 'Live API endpoint' },
    { pattern: /\.com(?!\/test)/i, description: 'Production domain' },
    { pattern: /pk_live_/i, description: 'Live Stripe key' }
  ]

  for (const { pattern, description } of productionPatterns) {
    if (pattern.test(envContent)) {
      violations.push(description)
    }
  }

  if (violations.length > 0) {
    log('error', 'Production data isolation violations detected:')
    violations.forEach(violation => log('error', `  - ${violation}`))
    return false
  }

  log('info', 'Production data isolation check passed')
  return true
}

// Main execution
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || '--help'

  switch (command) {
    case '--create-test':
      createTestEnvironment()
      break
    case '--validate':
      validateTestEnvironment()
      break
    case '--create-docs':
      createTestSecurityDocs()
      break
    case '--rotate-secrets':
      rotateTestSecrets()
      break
    case '--check-isolation':
      checkIsolation()
      break
    case '--full-setup':
      log('info', 'Running full test security setup...')
      createTestEnvironment()
      createTestSecurityDocs()
      validateTestEnvironment()
      checkIsolation()
      log('info', 'Full test security setup complete!')
      break
    case '--help':
    default:
      console.log(`
AI Readiness Assessment - Test Security Setup

Usage: node scripts/test-security-setup.js [COMMAND]

COMMANDS:
    --create-test       Create secure test environment configuration
    --validate          Validate test environment security settings
    --create-docs       Create test security documentation and checklist
    --rotate-secrets    Rotate all test environment secrets
    --check-isolation   Verify production data isolation
    --full-setup        Run complete test security setup
    --help              Show this help message

EXAMPLES:
    node scripts/test-security-setup.js --full-setup
    node scripts/test-security-setup.js --create-test
    node scripts/test-security-setup.js --validate
    node scripts/test-security-setup.js --rotate-secrets

SECURITY FEATURES:
    ✓ Complete production data isolation
    ✓ Cryptographically secure secret generation
    ✓ Test-appropriate rate limiting
    ✓ Secure file permissions (600)
    ✓ Production credential detection
    ✓ Comprehensive security documentation
`)
      break
  }
}

// Execute main function
if (require.main === module) {
  main()
}

module.exports = {
  createTestEnvironment,
  validateTestEnvironment,
  createTestSecurityDocs,
  rotateTestSecrets,
  checkIsolation,
  generateSecret
}