# Test Environment Security Guide

## Overview

This guide provides comprehensive security measures for test environment setup, ensuring complete isolation from production systems while maintaining robust security practices during testing.

## 🔐 Core Security Principles for Testing

### 1. Complete Environment Isolation

**Test Database Isolation:**
```bash
# Separate Supabase projects for each environment
Production:  https://prod-project.supabase.co
Staging:     https://staging-project.supabase.co  
Testing:     https://test-project.supabase.co
Development: https://dev-project.supabase.co
```

**Network Segregation:**
- Test databases on separate network segments
- No cross-environment database connections
- Isolated Redis instances for each environment
- Separate DNS zones for test environments

### 2. API Key Management

**Dedicated Test API Keys:**
```bash
# OpenAI - Create separate organization for testing
Production Org: org-prod-xxxxx
Test Org:       org-test-xxxxx

# Anthropic - Use separate billing accounts
Production:     sk-ant-prod-xxxxx
Test:          sk-ant-test-xxxxx

# Google AI - Separate projects
Production:     projects/prod-ai-project
Test:          projects/test-ai-project
```

**API Key Security Measures:**
- Lower quotas on test API keys (prevent cost overruns)
- Automatic key rotation every 30 days
- Usage monitoring and alerting
- Key revocation procedures documented

### 3. Rate Limiting and Abuse Prevention

**Test-Specific Rate Limits:**
```typescript
// More permissive for automated testing
const testRateLimits = {
  api: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 1000          // vs 100 in production
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100           // vs 10 in production
  },
  llm: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 500           // vs 50 in production
  }
}
```

**Rate Limit Bypass for Test Accounts:**
```typescript
// lib/security/test-rate-limit-bypass.ts
export const testRateLimitBypass = {
  // Test user accounts that bypass rate limits
  exemptUsers: [
    'testuser@example.com',
    'testadmin@example.com',
    'automation@test.com'
  ],
  
  // Test IP ranges that bypass rate limits
  exemptIPs: [
    '127.0.0.1',
    '::1',
    '192.168.1.0/24',
    // CI/CD server IPs
    '10.0.0.0/8'
  ],
  
  // Test API keys that bypass rate limits
  exemptAPIKeys: [
    'test-api-key-automation',
    'ci-cd-test-key'
  ]
}
```

## 🛡️ Security Controls for Testing

### 1. Authentication and Authorization

**Test User Management:**
```sql
-- Create dedicated test users with limited permissions
CREATE USER test_readonly WITH PASSWORD 'secure_test_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO test_readonly;

CREATE USER test_writer WITH PASSWORD 'secure_test_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO test_writer;

-- Never grant DELETE or DROP permissions to test users
```

**Multi-Factor Authentication (MFA) Testing:**
```typescript
// Test MFA with mock TOTP tokens
export const testMFAConfig = {
  mockTOTP: process.env.NODE_ENV === 'test',
  testTOTPSecret: 'JBSWY3DPEHPK3PXP', // Standard test secret
  bypassMFAForTestUsers: [
    'testuser@example.com'
  ]
}
```

### 2. Data Protection and Privacy

**PII Handling in Tests:**
```typescript
// lib/security/test-data-protection.ts
export const testDataProtection = {
  // Automatically anonymize PII in test databases
  anonymizePII: true,
  
  // Fields to anonymize
  piiFields: [
    'email',
    'phone',
    'address',
    'ssn',
    'credit_card'
  ],
  
  // Anonymization patterns
  anonymizationRules: {
    email: (original: string) => `test+${hash(original)}@example.com`,
    phone: () => '+1-555-0199',
    address: () => '123 Test Street, Test City, TS 12345'
  }
}
```

**Test Data Lifecycle:**
```bash
# Automatic cleanup of sensitive test data
TEST_DATA_RETENTION_HOURS=24
AUTO_CLEANUP_TEST_DATA=true
SCRUB_SENSITIVE_LOGS=true
```

### 3. Encryption and Secrets Management

**Test-Specific Encryption:**
```typescript
// Different encryption keys for test environment
export const testEncryptionConfig = {
  databaseEncryptionKey: process.env.TEST_DATABASE_ENCRYPTION_KEY,
  fileEncryptionKey: process.env.TEST_FILE_ENCRYPTION_KEY,
  
  // Weaker encryption in test for performance (still secure)
  algorithm: 'aes-128-gcm', // vs aes-256-gcm in production
  keyRotationDays: 7        // vs 30 in production
}
```

**Secrets Rotation for Testing:**
```bash
#!/bin/bash
# Rotate test secrets weekly
CSRF_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
DB_ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update test environment
sed -i "s/CSRF_SECRET=.*/CSRF_SECRET=$CSRF_SECRET/" .env.test
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env.test
sed -i "s/DATABASE_ENCRYPTION_KEY=.*/DATABASE_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY/" .env.test
```

## 🔍 Security Monitoring for Testing

### 1. Test-Specific Security Events

**Security Event Monitoring:**
```typescript
// lib/security/test-monitoring.ts
export const testSecurityMonitoring = {
  // Events to monitor in test environment
  monitoredEvents: [
    'authentication_failure',
    'rate_limit_exceeded',
    'suspicious_api_usage',
    'test_data_access_violation',
    'production_data_access_attempt'
  ],
  
  // Less aggressive alerting in test
  alertThresholds: {
    failedLogins: 50,        // vs 10 in production
    rateLimitHits: 100,      // vs 20 in production
    suspiciousActivity: 20   // vs 5 in production
  },
  
  // Test-specific alert channels
  alertChannels: {
    email: 'test-security@example.com',
    webhook: 'http://localhost:3001/test-security-webhook',
    slack: '#test-security-alerts'
  }
}
```

### 2. Automated Security Testing

**Security Test Automation:**
```bash
# Run security tests as part of CI/CD
npm run test:security-full

# Include these security test types:
# - SQL injection testing
# - XSS vulnerability scanning  
# - CSRF protection testing
# - Authentication bypass attempts
# - Rate limiting validation
# - Input sanitization testing
```

**Penetration Testing Integration:**
```typescript
// Enable controlled penetration testing
export const pentestConfig = {
  enabled: process.env.PENTEST_MODE === 'true',
  allowedAttacks: [
    'sql_injection_safe',
    'xss_safe',
    'csrf_safe',
    'rate_limit_test'
  ],
  // Never allow destructive operations
  blockedAttacks: [
    'data_deletion',
    'privilege_escalation',
    'dos_attacks'
  ]
}
```

## 🚀 Performance Security for Testing

### 1. Load Testing Security

**Secure Load Testing:**
```typescript
// Configure secure load testing
export const loadTestSecurity = {
  maxConcurrentUsers: 100,
  maxRequestsPerSecond: 50,
  
  // Prevent load tests from impacting production
  targetEnvironments: ['test', 'staging'],
  blockedEnvironments: ['production'],
  
  // Monitor for security degradation under load
  securityChecks: {
    responseTimeThreshold: 5000,    // Alert if security checks slow
    errorRateThreshold: 0.1,        // Alert if security errors increase
    rateLimitEffectiveness: true    // Verify rate limits work under load
  }
}
```

### 2. Resource Protection

**Resource Limits for Tests:**
```bash
# Prevent test resource exhaustion
MAX_MEMORY_USAGE_MB=1024
MAX_CPU_USAGE_PERCENT=50
MAX_DISK_USAGE_MB=5120
MAX_NETWORK_BANDWIDTH_MBPS=100

# Database connection limits
MAX_DB_CONNECTIONS=10
DB_QUERY_TIMEOUT_MS=5000
```

## 📋 Security Testing Checklist

### Pre-Test Security Setup
- [ ] Verify test database isolation
- [ ] Confirm separate API keys configured
- [ ] Validate test user permissions
- [ ] Check rate limit bypass configuration
- [ ] Verify encryption key separation
- [ ] Confirm monitoring is active

### During Testing Security Checks
- [ ] Monitor for production data access attempts
- [ ] Validate rate limiting effectiveness
- [ ] Check authentication/authorization
- [ ] Verify input sanitization
- [ ] Monitor resource usage
- [ ] Check security event logging

### Post-Test Security Cleanup
- [ ] Clean up test data automatically
- [ ] Rotate test secrets
- [ ] Review security event logs
- [ ] Check for security degradation
- [ ] Archive test security reports
- [ ] Update security baselines

## 🔧 Implementation Commands

### Setup Test Security Environment
```bash
# Full test environment setup
./scripts/secrets-setup.sh --setup-test

# Generate new test secrets
./scripts/secrets-setup.sh --generate-secrets .env.test

# Validate test security configuration
./scripts/secrets-setup.sh --validate
```

### Run Security Tests
```bash
# Complete security test suite
npm run test:security-full

# Specific security test categories
npm run test:security:auth
npm run test:security:rate-limiting  
npm run test:security:input-validation
npm run test:security:encryption
```

### Monitor Test Security
```bash
# Real-time security monitoring
npm run security:monitor:test

# Generate security report
npm run security:report:test

# Check security health
curl http://localhost:3000/api/security/health
```

## 🚨 Security Incident Response for Testing

### Test Environment Compromise Response
1. **Immediate Actions:**
   - Isolate affected test systems
   - Rotate all test credentials
   - Check for production data exposure
   - Document the incident

2. **Investigation:**
   - Analyze security logs
   - Identify attack vectors
   - Assess data exposure
   - Document lessons learned

3. **Recovery:**
   - Rebuild test environment
   - Update security measures
   - Implement additional monitoring
   - Update test procedures

### Production Data Exposure Prevention
```typescript
// Prevent accidental production data access
export const productionDataGuard = {
  // Block production database connections from test
  blockedConnections: [
    /.*prod.*\.supabase\.co/,
    /.*production.*\.amazonaws\.com/,
    /.*prod.*\.database\.com/
  ],
  
  // Alert on production API key usage in test
  productionKeyPatterns: [
    /sk-.*prod.*/,
    /.*production.*/,
    /.*live.*/
  ],
  
  // Immediate alert and block
  onViolation: (violation) => {
    // Log critical security event
    securityMonitor.logCriticalEvent('PRODUCTION_DATA_ACCESS_ATTEMPTED', violation);
    
    // Block the operation
    throw new SecurityError('Production data access blocked in test environment');
  }
}
```

## 📊 Security Metrics for Testing

### Key Security Metrics
- Authentication success/failure rates
- Rate limit effectiveness
- Input validation coverage
- Security test coverage percentage
- Mean time to detect security issues
- Security incident response time

### Reporting
```bash
# Generate weekly test security report
npm run security:report:weekly

# Export security metrics
npm run security:metrics:export

# Security dashboard
npm run security:dashboard:test
```

This comprehensive test security guide ensures robust protection while maintaining effective testing capabilities. Regular review and updates of these procedures are essential for maintaining security effectiveness.