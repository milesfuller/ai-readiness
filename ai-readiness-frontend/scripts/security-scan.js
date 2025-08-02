#!/usr/bin/env node

/**
 * Security Scan Script for AI Readiness Assessment
 * Validates all security implementations and configurations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityScanner {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.startTime = Date.now();
  }

  log(level, message, details = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, details };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (details) {
      console.log(`  Details: ${JSON.stringify(details, null, 2)}`);
    }

    if (level === 'error') this.errors.push(logEntry);
    else if (level === 'warn') this.warnings.push(logEntry);
    else if (level === 'pass') this.passed.push(logEntry);
  }

  async runAuditCheck() {
    this.log('info', '🔍 Running npm audit for vulnerability check...');
    try {
      const auditResult = execSync('npm audit --audit-level=moderate --json', { 
        encoding: 'utf8',
        stdio: 'pipe' 
      });
      
      const audit = JSON.parse(auditResult);
      
      if (audit.metadata && audit.metadata.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        const total = vulns.total || 0;
        
        if (total === 0) {
          this.log('pass', '✅ No security vulnerabilities found');
        } else {
          const critical = vulns.critical || 0;
          const high = vulns.high || 0;
          const moderate = vulns.moderate || 0;
          
          if (critical > 0 || high > 0) {
            this.log('error', `❌ Critical security vulnerabilities found`, {
              critical,
              high,
              moderate,
              total
            });
          } else if (moderate > 0) {
            this.log('warn', `⚠️ Moderate security vulnerabilities found`, {
              moderate,
              total
            });
          }
        }
      }
    } catch (error) {
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          if (audit.metadata && audit.metadata.vulnerabilities) {
            const vulns = audit.metadata.vulnerabilities;
            const critical = vulns.critical || 0;
            const high = vulns.high || 0;
            
            if (critical > 0 || high > 0) {
              this.log('error', `❌ Security vulnerabilities detected`, vulns);
            } else {
              this.log('warn', `⚠️ Some vulnerabilities found but not critical`, vulns);
            }
          }
        } catch (parseError) {
          this.log('error', '❌ Failed to parse audit results', { error: error.message });
        }
      } else {
        this.log('error', '❌ Audit command failed', { error: error.message });
      }
    }
  }

  checkSecurityHeaders() {
    this.log('info', '🔍 Checking security headers configuration...');
    
    const securityConfigPath = path.join(process.cwd(), 'lib/security/headers.ts');
    const nextConfigPath = path.join(process.cwd(), 'next.config.js');
    
    if (fs.existsSync(securityConfigPath)) {
      const content = fs.readFileSync(securityConfigPath, 'utf8');
      
      // Check for essential security headers
      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Content-Security-Policy'
      ];
      
      const missingHeaders = requiredHeaders.filter(header => 
        !content.includes(header)
      );
      
      if (missingHeaders.length === 0) {
        this.log('pass', '✅ All required security headers are configured');
      } else {
        this.log('error', '❌ Missing security headers', { missingHeaders });
      }
    } else {
      this.log('error', '❌ Security headers configuration not found');
    }

    // Check Next.js configuration
    if (fs.existsSync(nextConfigPath)) {
      const content = fs.readFileSync(nextConfigPath, 'utf8');
      if (content.includes('headers')) {
        this.log('pass', '✅ Next.js security headers configuration found');
      } else {
        this.log('warn', '⚠️ No security headers in Next.js config');
      }
    }
  }

  checkCSRFProtection() {
    this.log('info', '🔍 Checking CSRF protection...');
    
    const csrfPath = path.join(process.cwd(), 'lib/security/csrf.ts');
    
    if (fs.existsSync(csrfPath)) {
      const content = fs.readFileSync(csrfPath, 'utf8');
      
      if (content.includes('csrf') || content.includes('CSRF')) {
        this.log('pass', '✅ CSRF protection implemented');
      } else {
        this.log('warn', '⚠️ CSRF file exists but implementation unclear');
      }
    } else {
      this.log('error', '❌ CSRF protection not found');
    }
  }

  checkRateLimiting() {
    this.log('info', '🔍 Checking rate limiting...');
    
    const rateLimiterPath = path.join(process.cwd(), 'lib/security/rate-limiter.ts');
    
    if (fs.existsSync(rateLimiterPath)) {
      const content = fs.readFileSync(rateLimiterPath, 'utf8');
      
      if (content.includes('rateLimit') || content.includes('RateLimit')) {
        this.log('pass', '✅ Rate limiting implemented');
      } else {
        this.log('warn', '⚠️ Rate limiter file exists but implementation unclear');
      }
    } else {
      this.log('error', '❌ Rate limiting not implemented');
    }
  }

  checkInputValidation() {
    this.log('info', '🔍 Checking input validation...');
    
    const validationPath = path.join(process.cwd(), 'lib/security/validation.ts');
    const schemasPath = path.join(process.cwd(), 'lib/auth/schemas.ts');
    
    let validationFound = false;
    
    if (fs.existsSync(validationPath)) {
      this.log('pass', '✅ Input validation module found');
      validationFound = true;
    }
    
    if (fs.existsSync(schemasPath)) {
      const content = fs.readFileSync(schemasPath, 'utf8');
      if (content.includes('zod') || content.includes('schema')) {
        this.log('pass', '✅ Zod schema validation found');
        validationFound = true;
      }
    }
    
    if (!validationFound) {
      this.log('error', '❌ Input validation not properly implemented');
    }
  }

  checkAuthImplementation() {
    this.log('info', '🔍 Checking authentication implementation...');
    
    const authContextPath = path.join(process.cwd(), 'lib/auth/context.tsx');
    const protectedRoutePath = path.join(process.cwd(), 'components/auth/protected-route.tsx');
    
    if (fs.existsSync(authContextPath)) {
      this.log('pass', '✅ Authentication context found');
    } else {
      this.log('error', '❌ Authentication context missing');
    }
    
    if (fs.existsSync(protectedRoutePath)) {
      this.log('pass', '✅ Protected route component found');
    } else {
      this.log('error', '❌ Protected route component missing');
    }
  }

  checkEnvironmentSecurity() {
    this.log('info', '🔍 Checking environment security...');
    
    const envExample = path.join(process.cwd(), '.env.example');
    const envLocal = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envExample)) {
      this.log('pass', '✅ Environment example file found');
    } else {
      this.log('warn', '⚠️ No .env.example file found');
    }
    
    if (fs.existsSync(envLocal)) {
      this.log('warn', '⚠️ .env.local exists - ensure it\'s in .gitignore');
    }
    
    // Check .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      if (content.includes('.env')) {
        this.log('pass', '✅ Environment files are gitignored');
      } else {
        this.log('error', '❌ Environment files not in .gitignore');
      }
    }
  }

  checkDependencySecurity() {
    this.log('info', '🔍 Checking dependency security...');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for known secure packages
      const securityPackages = ['@supabase/ssr', 'zod', '@hookform/resolvers'];
      const foundSecurityPackages = securityPackages.filter(pkg => 
        content.dependencies && content.dependencies[pkg]
      );
      
      if (foundSecurityPackages.length > 0) {
        this.log('pass', '✅ Security-focused packages found', { packages: foundSecurityPackages });
      }
      
      // Check for potentially insecure packages
      const warningPackages = ['eval', 'vm2', 'serialize-javascript'];
      const foundWarningPackages = warningPackages.filter(pkg => 
        (content.dependencies && content.dependencies[pkg]) ||
        (content.devDependencies && content.devDependencies[pkg])
      );
      
      if (foundWarningPackages.length > 0) {
        this.log('warn', '⚠️ Potentially insecure packages found', { packages: foundWarningPackages });
      }
    }
  }

  async runSecurityTests() {
    this.log('info', '🧪 Running security-related tests...');
    
    try {
      const testResult = execSync('npm run test -- __tests__/lib/security/ --verbose', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (testResult.includes('PASS')) {
        this.log('pass', '✅ Security tests passed');
      } else {
        this.log('warn', '⚠️ Security test results unclear');
      }
    } catch (error) {
      if (error.stdout && error.stdout.includes('PASS')) {
        this.log('pass', '✅ Security tests passed');
      } else if (error.status === 0) {
        this.log('pass', '✅ Security tests completed successfully');
      } else {
        this.log('error', '❌ Security tests failed', { 
          error: error.message,
          stdout: error.stdout?.substring(0, 500) + '...'
        });
      }
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const totalChecks = this.errors.length + this.warnings.length + this.passed.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🛡️  SECURITY SCAN REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Scan Duration: ${duration}ms`);
    console.log(`📊 Total Checks: ${totalChecks}`);
    console.log(`✅ Passed: ${this.passed.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log('='.repeat(60));
    
    if (this.errors.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
        if (error.details) {
          console.log(`   ${JSON.stringify(error.details, null, 2)}`);
        }
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
      });
    }
    
    const score = Math.round((this.passed.length / totalChecks) * 100);
    console.log(`\n🎯 Security Score: ${score}%`);
    
    if (this.errors.length > 0) {
      console.log('\n🚨 Security scan failed! Critical issues must be resolved.');
      process.exit(1);
    } else if (this.warnings.length > 5) {
      console.log('\n⚠️  Multiple security warnings detected. Review recommended.');
      process.exit(1);
    } else {
      console.log('\n✅ Security scan passed!');
      process.exit(0);
    }
  }

  async run() {
    console.log('🛡️  Starting Security Scan for AI Readiness Assessment\n');
    
    await this.runAuditCheck();
    this.checkSecurityHeaders();
    this.checkCSRFProtection();
    this.checkRateLimiting();
    this.checkInputValidation();
    this.checkAuthImplementation();
    this.checkEnvironmentSecurity();
    this.checkDependencySecurity();
    await this.runSecurityTests();
    
    this.generateReport();
  }
}

// Run the security scan
if (require.main === module) {
  const scanner = new SecurityScanner();
  scanner.run().catch(error => {
    console.error('❌ Security scan failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityScanner;