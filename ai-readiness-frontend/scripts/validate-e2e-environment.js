#!/usr/bin/env node

/**
 * E2E Environment Validation Script
 * Comprehensive validation of E2E test environment setup
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class E2EEnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[34m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async validateEnvironmentFiles() {
    this.log('Validating environment configuration files...', 'info');
    
    const requiredFiles = [
      '.env.test',
      '.env.playwright', 
      'playwright.config.e2e.ts',
      'e2e/global-setup.ts',
      'e2e/global-teardown.ts',
      'e2e/auth.setup.ts',
      'e2e/auth.cleanup.ts'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        this.passed.push(`File exists: ${file}`);
      } else {
        this.errors.push(`Missing required file: ${file}`);
      }
    }
  }

  async validateEnvironmentVariables() {
    this.log('Validating environment variables...', 'info');
    
    // Load environment from .env.test if it exists
    if (fs.existsSync('.env.test')) {
      const envContent = fs.readFileSync('.env.test', 'utf8');
      const envVars = {};
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=', 2);
        if (key && value && !key.startsWith('#')) {
          envVars[key] = value;
        }
      });
      
      // Merge with process.env
      Object.assign(process.env, envVars);
    }
    
    const requiredVars = [
      'NODE_ENV',
      'PLAYWRIGHT_BASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'TEST_USER_EMAIL',
      'TEST_USER_PASSWORD'
    ];
    
    for (const varName of requiredVars) {
      if (process.env[varName]) {
        this.passed.push(`Environment variable set: ${varName}`);
      } else {
        this.errors.push(`Missing environment variable: ${varName}`);
      }
    }
  }

  async validateDirectoryStructure() {
    this.log('Validating directory structure...', 'info');
    
    const requiredDirs = [
      'e2e',
      'e2e/fixtures',
      'e2e/utils',
      'scripts',
      'supabase',
      'supabase/migrations',
      'test-results'
    ];
    
    for (const dir of requiredDirs) {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        this.passed.push(`Directory exists: ${dir}`);
      } else {
        this.warnings.push(`Directory missing or not accessible: ${dir}`);
      }
    }
  }

  async validateDependencies() {
    this.log('Validating dependencies...', 'info');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredDeps = [
        '@playwright/test',
        '@supabase/supabase-js',
        '@supabase/auth-helpers-nextjs'
      ];
      
      for (const dep of requiredDeps) {
        if (packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]) {
          this.passed.push(`Dependency installed: ${dep}`);
        } else {
          this.errors.push(`Missing dependency: ${dep}`);
        }
      }
      
      // Check for required scripts
      const requiredScripts = [
        'test:e2e',
        'test:e2e:enhanced',
        'test:e2e:setup',
        'test:e2e:cleanup'
      ];
      
      for (const script of requiredScripts) {
        if (packageJson.scripts?.[script]) {
          this.passed.push(`Script available: ${script}`);
        } else {
          this.warnings.push(`Missing script: ${script}`);
        }
      }
      
    } catch (error) {
      this.errors.push(`Failed to validate package.json: ${error.message}`);
    }
  }

  async validateServiceConnectivity() {
    this.log('Validating service connectivity...', 'info');
    
    const services = [
      {
        name: 'Next.js App',
        url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
        healthEndpoint: '/health'
      },
      {
        name: 'Supabase API',
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        healthEndpoint: '/health'
      }
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(`${service.url}${service.healthEndpoint}`)
          .catch(() => fetch(service.url));
        
        if (response && response.ok) {
          this.passed.push(`Service accessible: ${service.name} at ${service.url}`);
        } else {
          this.warnings.push(`Service may not be running: ${service.name} at ${service.url}`);
        }
      } catch (error) {
        this.warnings.push(`Cannot connect to ${service.name}: ${error.message}`);
      }
    }
  }

  async validateDockerSetup() {
    this.log('Validating Docker setup...', 'info');
    
    const dockerFiles = [
      'docker-compose.e2e.yml',
      'docker-compose.test-simple.yml',
      'supabase/Dockerfile.kong'
    ];
    
    for (const file of dockerFiles) {
      if (fs.existsSync(file)) {
        this.passed.push(`Docker file exists: ${file}`);
      } else {
        this.warnings.push(`Docker file missing: ${file}`);
      }
    }
    
    // Check if Docker is available
    try {
      await this.runCommand('docker', ['--version']);
      this.passed.push('Docker is available');
      
      await this.runCommand('docker-compose', ['--version']);
      this.passed.push('Docker Compose is available');
    } catch (error) {
      this.warnings.push('Docker or Docker Compose not available');
    }
  }

  async runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let output = '';
      
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      proc.on('error', reject);
    });
  }

  async generateReport() {
    this.log('Generating validation report...', 'info');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: this.passed.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        total: this.passed.length + this.warnings.length + this.errors.length
      },
      results: {
        passed: this.passed,
        warnings: this.warnings,
        errors: this.errors
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        baseUrl: process.env.PLAYWRIGHT_BASE_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    };
    
    // Save report to file
    fs.writeFileSync(
      'test-results/e2e-environment-validation.json',
      JSON.stringify(report, null, 2)
    );
    
    return report;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('E2E ENVIRONMENT VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    this.log(`Total Checks: ${report.summary.total}`, 'info');
    this.log(`Passed: ${report.summary.passed}`, 'success');
    this.log(`Warnings: ${report.summary.warnings}`, 'warning');
    this.log(`Errors: ${report.summary.errors}`, report.summary.errors > 0 ? 'error' : 'info');
    
    if (report.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      report.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    if (report.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      report.results.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }
    
    console.log('\n📊 Report saved to: test-results/e2e-environment-validation.json');
    
    if (report.summary.errors === 0) {
      this.log('E2E environment validation PASSED! ✅', 'success');
      return true;
    } else {
      this.log('E2E environment validation FAILED! ❌', 'error');
      return false;
    }
  }

  async run() {
    this.log('Starting E2E environment validation...', 'info');
    
    // Ensure test-results directory exists
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    
    try {
      await this.validateEnvironmentFiles();
      await this.validateEnvironmentVariables();
      await this.validateDirectoryStructure();
      await this.validateDependencies();
      await this.validateServiceConnectivity();
      await this.validateDockerSetup();
      
      const report = await this.generateReport();
      const success = this.printSummary(report);
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.log(`Validation failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new E2EEnvironmentValidator();
  validator.run();
}

module.exports = E2EEnvironmentValidator;