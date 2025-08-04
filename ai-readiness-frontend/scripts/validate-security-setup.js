#!/usr/bin/env node

/**
 * Security Setup Validation Script
 * Comprehensive validation of security configuration across all environments
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

// Security validation results
const validationResults = {
  passed: 0,
  warnings: 0,
  failed: 0,
  checks: []
}

function addCheck(name, status, message, recommendation = '') {
  validationResults.checks.push({ name, status, message, recommendation })
  validationResults[status === 'pass' ? 'passed' : status === 'warn' ? 'warnings' : 'failed']++
}

// Environment variable patterns for validation
const envPatterns = {
  'CSRF_SECRET': /^[a-zA-Z0-9]{64}$/,
  'SESSION_SECRET': /^[a-zA-Z0-9]{64}$/,
  'DATABASE_ENCRYPTION_KEY': /^[a-zA-Z0-9]{64}$/,
  'NEXT_PUBLIC_SUPABASE_URL': /^https:\/\/.*\.supabase\.co$/,
  'SUPABASE_SERVICE_ROLE_KEY': /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
  'OPENAI_API_KEY': /^sk-[a-zA-Z0-9]{48,}$/,
  'ANTHROPIC_API_KEY': /^sk-ant-[a-zA-Z0-9-_]{64,}$/
}

// Production data patterns to check for
const productionPatterns = [
  { pattern: /prod.*\.supabase\.co/i, name: 'Production Supabase URL' },
  { pattern: /api\.openai\.com.*prod/i, name: 'Production OpenAI endpoint' },
  { pattern: /sk-.*prod/i, name: 'Production API key' },
  { pattern: /pk_live_/i, name: 'Live Stripe key' },
  { pattern: /\.vercel\.app$/i, name: 'Production Vercel domain' },
  { pattern: /https:\/\/[^-]*\.(com|net|org)$/i, name: 'Production domain' }
]

// Check file permissions
function checkFilePermissions(filePath) {
  try {
    const stats = fs.statSync(filePath)
    const mode = stats.mode & parseInt('777', 8)
    const expectedMode = parseInt('600', 8)
    
    if (mode === expectedMode) {
      addCheck(
        `File Permissions: ${path.basename(filePath)}`,
        'pass',
        `Correct permissions (600) set for ${filePath}`
      )
    } else {
      addCheck(
        `File Permissions: ${path.basename(filePath)}`,
        'fail',
        `Insecure permissions (${mode.toString(8)}) for ${filePath}`,
        `Run: chmod 600 ${filePath}`
      )
    }
  } catch (error) {
    addCheck(
      `File Permissions: ${path.basename(filePath)}`,
      'warn',
      `Could not check permissions for ${filePath}: ${error.message}`,
      'Manually verify file permissions are set to 600'
    )
  }
}

// Validate environment file content
function validateEnvironmentFile(filePath, environmentType) {
  if (!fs.existsSync(filePath)) {
    addCheck(
      `Environment File: ${environmentType}`,
      'fail',
      `Environment file not found: ${filePath}`,
      `Create ${filePath} using the appropriate setup script`
    )
    return
  }

  log('info', `Validating ${environmentType} environment: ${filePath}`)
  
  // Check file permissions
  checkFilePermissions(filePath)

  // Read and parse environment file
  const content = fs.readFileSync(filePath, 'utf8')
  const envVars = {}
  
  content.split('\n').forEach(line => {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  })

  // Check required variables
  const requiredVars = ['NODE_ENV', 'CSRF_SECRET', 'SESSION_SECRET']
  requiredVars.forEach(varName => {
    if (envVars[varName]) {
      addCheck(
        `Required Variable: ${varName}`,
        'pass',
        `${varName} is present in ${environmentType}`
      )
    } else {
      addCheck(
        `Required Variable: ${varName}`,
        'fail',
        `Missing required variable ${varName} in ${environmentType}`,
        `Add ${varName} to ${filePath}`
      )
    }
  })

  // Validate variable formats
  Object.entries(envPatterns).forEach(([varName, pattern]) => {
    const value = envVars[varName]
    if (value) {
      if (pattern.test(value)) {
        addCheck(
          `Variable Format: ${varName}`,
          'pass',
          `${varName} format is valid in ${environmentType}`
        )
      } else {
        addCheck(
          `Variable Format: ${varName}`,
          'warn',
          `${varName} format may be invalid in ${environmentType}`,
          `Verify ${varName} follows the correct format`
        )
      }
    }
  })

  // Check for production data in test environment
  if (environmentType === 'test') {
    let productionViolations = []
    
    productionPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        productionViolations.push(name)
      }
    })

    if (productionViolations.length > 0) {
      addCheck(
        'Production Data Isolation',
        'fail',
        `Production patterns detected in test environment: ${productionViolations.join(', ')}`,
        'Replace all production credentials with test-specific ones'
      )
    } else {
      addCheck(
        'Production Data Isolation',
        'pass',
        'No production data detected in test environment'
      )
    }
  }

  // Check secret strength
  const secretVars = ['CSRF_SECRET', 'SESSION_SECRET', 'DATABASE_ENCRYPTION_KEY']
  secretVars.forEach(varName => {
    const value = envVars[varName]
    if (value) {
      if (value.length >= 64) {
        addCheck(
          `Secret Strength: ${varName}`,
          'pass',
          `${varName} meets minimum length requirement (64 chars)`
        )
      } else if (value.length >= 32) {
        addCheck(
          `Secret Strength: ${varName}`,
          'warn',
          `${varName} is minimum acceptable length (32 chars)`,
          'Consider using 64-character secrets for better security'
        )
      } else {
        addCheck(
          `Secret Strength: ${varName}`,
          'fail',
          `${varName} is too short (${value.length} chars, minimum 32)`,
          `Generate a stronger secret: openssl rand -hex 32`
        )
      }

      // Check for default/placeholder values
      const placeholderPatterns = [
        /change.?me/i,
        /replace.?with/i,
        /your.?secret/i,
        /generate.?new/i,
        /default/i
      ]
      
      if (placeholderPatterns.some(pattern => pattern.test(value))) {
        addCheck(
          `Secret Value: ${varName}`,
          'fail',
          `${varName} appears to be a placeholder value`,
          'Generate a real secret to replace the placeholder'
        )
      }
    }
  })

  // Environment-specific checks
  if (environmentType === 'test') {
    // Check test-specific configuration
    const testSpecificChecks = [
      { key: 'AUTO_CLEANUP_TEST_DATA', expected: 'true', name: 'Test Data Cleanup' },
      { key: 'TEST_DATA_RETENTION_HOURS', expected: '24', name: 'Test Data Retention' },
      { key: 'ENABLE_DEBUG_MODE', expected: 'true', name: 'Debug Mode' },
      { key: 'MOCK_EMAIL_SERVICE', expected: 'true', name: 'Email Service Mocking' }
    ]

    testSpecificChecks.forEach(({ key, expected, name }) => {
      if (envVars[key] === expected) {
        addCheck(
          `Test Config: ${name}`,
          'pass',
          `${key} is correctly configured for testing`
        )
      } else {
        addCheck(
          `Test Config: ${name}`,
          'warn',
          `${key} should be '${expected}' for optimal testing`,
          `Set ${key}=${expected} in ${filePath}`
        )
      }
    })
  }
}

// Check security scripts exist and are executable
function validateSecurityScripts() {
  const scriptsToCheck = [
    'scripts/secrets-setup.sh',
    'scripts/test-security-setup.js',
    'scripts/validate-security-setup.js'
  ]

  scriptsToCheck.forEach(scriptPath => {
    const fullPath = path.join(process.cwd(), scriptPath)
    
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath)
        const isExecutable = stats.mode & parseInt('111', 8)
        
        if (isExecutable) {
          addCheck(
            `Security Script: ${path.basename(scriptPath)}`,
            'pass',
            `Script ${scriptPath} exists and is executable`
          )
        } else {
          addCheck(
            `Security Script: ${path.basename(scriptPath)}`,
            'warn',
            `Script ${scriptPath} exists but is not executable`,
            `Run: chmod +x ${scriptPath}`
          )
        }
      } catch (error) {
        addCheck(
          `Security Script: ${path.basename(scriptPath)}`,
          'warn',
          `Could not check script permissions: ${error.message}`
        )
      }
    } else {
      addCheck(
        `Security Script: ${path.basename(scriptPath)}`,
        'fail',
        `Required script not found: ${scriptPath}`,
        'Run the security setup to create missing scripts'
      )
    }
  })
}

// Check security configuration files
function validateSecurityConfig() {
  const configFiles = [
    'lib/security/config.ts',
    'lib/security/test-config.ts',
    'lib/security/test-middleware.ts'
  ]

  configFiles.forEach(configPath => {
    const fullPath = path.join(process.cwd(), configPath)
    
    if (fs.existsSync(fullPath)) {
      addCheck(
        `Security Config: ${path.basename(configPath)}`,
        'pass',
        `Security configuration file exists: ${configPath}`
      )
      
      // Basic content validation
      const content = fs.readFileSync(fullPath, 'utf8')
      
      if (configPath.includes('test-config') && !content.includes('testSecurityConfig')) {
        addCheck(
          `Config Content: ${path.basename(configPath)}`,
          'warn',
          'Test security config may be incomplete',
          'Verify test security configuration is properly exported'
        )
      }
    } else {
      addCheck(
        `Security Config: ${path.basename(configPath)}`,
        'fail',
        `Security configuration file missing: ${configPath}`,
        'Run the security setup to create missing configuration files'
      )
    }
  })
}

// Check documentation exists
function validateSecurityDocs() {
  const docsToCheck = [
    'SECURITY.md',
    'docs/security/TEST_SECURITY_GUIDE.md',
    'docs/security/TEST_SECURITY_CHECKLIST.md'
  ]

  docsToCheck.forEach(docPath => {
    const fullPath = path.join(process.cwd(), docPath)
    
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath)
      const sizeKB = Math.round(stats.size / 1024)
      
      addCheck(
        `Security Docs: ${path.basename(docPath)}`,
        'pass',
        `Documentation exists: ${docPath} (${sizeKB}KB)`
      )
    } else {
      addCheck(
        `Security Docs: ${path.basename(docPath)}`,
        'warn',
        `Documentation missing: ${docPath}`,
        'Create comprehensive security documentation'
      )
    }
  })
}

// Check gitignore for sensitive files
function validateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore')
  
  if (!fs.existsSync(gitignorePath)) {
    addCheck(
      'Gitignore: Existence',
      'fail',
      '.gitignore file not found',
      'Create .gitignore to prevent committing sensitive files'
    )
    return
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8')
  const requiredPatterns = [
    '.env',
    '.env.local',
    '.env.test',
    '.env.production',
    '.secrets',
    '*.key',
    '*.pem'
  ]

  const missingPatterns = requiredPatterns.filter(pattern => 
    !gitignoreContent.includes(pattern)
  )

  if (missingPatterns.length === 0) {
    addCheck(
      'Gitignore: Sensitive Files',
      'pass',
      'All sensitive file patterns are in .gitignore'
    )
  } else {
    addCheck(
      'Gitignore: Sensitive Files',
      'warn',
      `Missing patterns in .gitignore: ${missingPatterns.join(', ')}`,
      'Add missing patterns to prevent committing sensitive files'
    )
  }
}

// Generate security report
function generateSecurityReport() {
  const timestamp = new Date().toISOString()
  const reportPath = path.join(process.cwd(), 'security-validation-report.md')
  
  const report = `# Security Validation Report

Generated: ${timestamp}

## Summary

- ✅ Passed: ${validationResults.passed}
- ⚠️  Warnings: ${validationResults.warnings}
- ❌ Failed: ${validationResults.failed}
- 📊 Total Checks: ${validationResults.checks.length}

## Overall Status

${validationResults.failed > 0 ? '❌ CRITICAL - Immediate action required' : 
  validationResults.warnings > 0 ? '⚠️  WARNING - Improvements recommended' : 
  '✅ HEALTHY - All checks passed'}

## Detailed Results

${validationResults.checks.map(check => `
### ${check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌'} ${check.name}

**Status:** ${check.status.toUpperCase()}
**Message:** ${check.message}
${check.recommendation ? `**Recommendation:** ${check.recommendation}` : ''}
`).join('\n')}

## Next Steps

${validationResults.failed > 0 ? `
### Critical Issues (${validationResults.failed})
Address all failed checks immediately before deploying to any environment.
` : ''}

${validationResults.warnings > 0 ? `
### Warnings (${validationResults.warnings})
Review and address warnings to improve security posture.
` : ''}

### Security Maintenance
- Rotate secrets every 90 days
- Review security configuration quarterly
- Update security documentation as needed
- Run security validation before each deployment

## Commands for Common Issues

### Fix File Permissions
\`\`\`bash
chmod 600 .env*
chmod 700 .secrets/
\`\`\`

### Generate New Secrets
\`\`\`bash
# For test environment
node scripts/test-security-setup.js --rotate-secrets

# For general secrets
./scripts/secrets-setup.sh --generate-secrets .env.local
\`\`\`

### Validate Configuration
\`\`\`bash
node scripts/validate-security-setup.js
\`\`\`

---
*Report generated by AI Readiness Assessment Security Validation*
`

  fs.writeFileSync(reportPath, report)
  log('info', `Security report generated: ${reportPath}`)
}

// Main validation function
function runSecurityValidation() {
  log('info', 'Starting comprehensive security validation...')

  // Validate environment files
  validateEnvironmentFile('.env.test', 'test')
  validateEnvironmentFile('.env.local', 'development')
  validateEnvironmentFile('.env.production', 'production')

  // Validate security infrastructure
  validateSecurityScripts()
  validateSecurityConfig()
  validateSecurityDocs()
  validateGitignore()

  // Generate report
  generateSecurityReport()

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('SECURITY VALIDATION SUMMARY')
  console.log('='.repeat(60))
  
  log('info', `✅ Passed: ${validationResults.passed}`)
  if (validationResults.warnings > 0) {
    log('warn', `⚠️  Warnings: ${validationResults.warnings}`)
  }
  if (validationResults.failed > 0) {
    log('error', `❌ Failed: ${validationResults.failed}`)
  }

  console.log('\nDetailed report: security-validation-report.md')

  // Exit with appropriate code
  if (validationResults.failed > 0) {
    process.exit(1)
  } else if (validationResults.warnings > 0) {
    process.exit(2)
  } else {
    process.exit(0)
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2)
  const command = args[0] || '--validate'

  switch (command) {
    case '--validate':
    case '--full':
      runSecurityValidation()
      break
    case '--help':
      console.log(`
AI Readiness Assessment - Security Validation

Usage: node scripts/validate-security-setup.js [COMMAND]

COMMANDS:
    --validate, --full    Run comprehensive security validation (default)
    --help               Show this help message

FEATURES:
    ✓ Environment file validation
    ✓ Secret strength checking
    ✓ Production data isolation verification
    ✓ File permission validation
    ✓ Configuration completeness checking
    ✓ Documentation verification
    ✓ Comprehensive reporting

EXIT CODES:
    0    All checks passed
    1    Critical failures detected
    2    Warnings present but no failures
`)
      break
    default:
      log('error', `Unknown command: ${command}`)
      log('info', 'Use --help for usage information')
      process.exit(1)
  }
}

// Execute if run directly
if (require.main === module) {
  main()
}

module.exports = {
  runSecurityValidation,
  validateEnvironmentFile,
  validateSecurityScripts,
  validateSecurityConfig
}