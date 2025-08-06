#!/usr/bin/env node

/**
 * Pre-Deployment Environment Variable Validator
 * Validates all required environment variables before deployment
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output formatting
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.isCI = process.env.CI === 'true';
    this.isVercel = process.env.VERCEL === '1';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.exitCode = 0;
  }

  log(message, color = 'reset') {
    if (!this.isCI) {
      console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
      // Plain text for CI environments
      console.log(message);
    }
  }

  error(message) {
    this.errors.push(message);
    this.log(`❌ ERROR: ${message}`, 'red');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  success(message) {
    this.successes.push(message);
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'cyan');
  }

  // Required environment variables for different environments
  getRequiredVariables() {
    const base = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const production = [
      ...base,
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const development = [
      ...base
    ];

    const test = [
      ...base,
      'TEST_DATABASE_URL'
    ];

    if (this.isProduction || this.isVercel) {
      return {
        required: production,
        optional: ['NEXTAUTH_SECRET', 'DATABASE_URL', 'VERCEL_ENV']
      };
    }

    if (process.env.NODE_ENV === 'test') {
      return {
        required: test,
        optional: ['NEXTAUTH_SECRET', 'DATABASE_URL']
      };
    }

    return {
      required: development,
      optional: ['NEXTAUTH_SECRET', 'DATABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    };
  }

  // Validate URL format
  validateUrl(url, name) {
    try {
      const parsed = new URL(url);
      
      // Check for localhost in production
      if (this.isProduction && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        this.error(`${name} cannot use localhost in production environment`);
        return false;
      }

      // Validate Supabase URL format
      if (name.includes('SUPABASE_URL')) {
        if (!parsed.hostname.includes('supabase.co') && !parsed.hostname.includes('supabase.net')) {
          this.warning(`${name} doesn't appear to be a valid Supabase URL`);
        }
      }

      return true;
    } catch (err) {
      this.error(`${name} is not a valid URL: ${err.message}`);
      return false;
    }
  }

  // Validate Supabase keys
  validateSupabaseKey(key, type) {
    if (!key) return false;

    const patterns = {
      anon: /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/,
      service: /^eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/
    };

    if (!patterns[type]) {
      this.error(`Unknown Supabase key type: ${type}`);
      return false;
    }

    if (!patterns[type].test(key)) {
      this.error(`Invalid ${type} key format for Supabase`);
      return false;
    }

    // Check for placeholder values
    const placeholders = ['your_supabase', 'example', 'placeholder'];
    if (placeholders.some(placeholder => key.toLowerCase().includes(placeholder))) {
      this.error(`${type} key appears to be a placeholder value`);
      return false;
    }

    return true;
  }

  // Check for potentially sensitive values in environment variables
  validateSensitiveValues() {
    const sensitivePatterns = [
      { pattern: /password/i, name: 'passwords' },
      { pattern: /secret/i, name: 'secrets' },
      { pattern: /key/i, name: 'keys' },
      { pattern: /token/i, name: 'tokens' }
    ];

    const publicVars = Object.keys(process.env).filter(key => 
      key.startsWith('NEXT_PUBLIC_')
    );

    publicVars.forEach(varName => {
      sensitivePatterns.forEach(({ pattern, name }) => {
        if (pattern.test(varName)) {
          this.warning(`Public environment variable ${varName} contains sensitive keyword: ${name}`);
        }
      });
    });
  }

  // Load environment files
  loadEnvironmentFiles() {
    const envFiles = [
      '.env.local',
      '.env.production',
      '.env.development',
      '.env.test',
      '.env'
    ];

    let loadedFiles = [];

    envFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => 
            line.trim() && !line.startsWith('#')
          );
          
          lines.forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').replace(/^["']|["']$/g, '');
              if (!process.env[key.trim()]) {
                process.env[key.trim()] = value.trim();
              }
            }
          });

          loadedFiles.push(file);
          this.info(`Loaded environment file: ${file}`);
        } catch (err) {
          this.warning(`Could not load environment file ${file}: ${err.message}`);
        }
      }
    });

    if (loadedFiles.length === 0) {
      this.warning('No environment files found');
    }
  }

  // Main validation method
  async validate() {
    this.log('\n🔍 Starting Environment Variable Validation\n', 'bold');
    
    this.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    this.info(`Platform: ${this.isVercel ? 'Vercel' : 'Local'}`);
    this.info(`CI: ${this.isCI ? 'Yes' : 'No'}\n`);

    // Load environment files
    this.loadEnvironmentFiles();

    const { required, optional } = this.getRequiredVariables();

    // Validate required variables
    this.log('📋 Checking Required Variables:', 'bold');
    required.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        this.error(`Missing required environment variable: ${varName}`);
        return;
      }

      if (value.trim() === '') {
        this.error(`Empty required environment variable: ${varName}`);
        return;
      }

      // URL validation
      if (varName.includes('URL')) {
        if (this.validateUrl(value, varName)) {
          this.success(`${varName} is valid`);
        }
      }
      // Supabase key validation
      else if (varName.includes('SUPABASE_ANON_KEY')) {
        if (this.validateSupabaseKey(value, 'anon')) {
          this.success(`${varName} is valid`);
        }
      }
      else if (varName.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        if (this.validateSupabaseKey(value, 'service')) {
          this.success(`${varName} is valid`);
        }
      }
      else {
        this.success(`${varName} is present`);
      }
    });

    // Validate optional variables
    this.log('\n📝 Checking Optional Variables:', 'bold');
    optional.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        this.info(`Optional variable not set: ${varName}`);
      } else if (value.trim() === '') {
        this.warning(`Optional variable is empty: ${varName}`);
      } else {
        this.success(`${varName} is present`);
      }
    });

    // Check for sensitive values in public variables
    this.log('\n🔒 Checking Security:', 'bold');
    this.validateSensitiveValues();

    // Validate specific combinations
    this.log('\n🔄 Checking Variable Combinations:', 'bold');
    this.validateVariableCombinations();

    // Summary
    this.printSummary();

    return this.exitCode;
  }

  validateVariableCombinations() {
    // Ensure Supabase URL and keys match
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const url = new URL(supabaseUrl);
        const hostname = url.hostname;
        
        // Extract project ID from hostname (assuming format: projectid.supabase.co)
        const projectIdMatch = hostname.match(/^([^.]+)\.supabase\.(co|net)$/);
        if (projectIdMatch) {
          this.success('Supabase URL format appears correct');
        }
      } catch (err) {
        // URL validation already handled above
      }
    }

    // Check if NextAuth is properly configured for production
    if (this.isProduction) {
      const nextAuthUrl = process.env.NEXTAUTH_URL;
      const nextAuthSecret = process.env.NEXTAUTH_SECRET;

      if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
        this.error('NEXTAUTH_URL must use HTTPS in production');
      }

      if (!nextAuthSecret || nextAuthSecret.length < 32) {
        this.error('NEXTAUTH_SECRET must be at least 32 characters in production');
      }
    }
  }

  printSummary() {
    this.log('\n📊 Validation Summary:', 'bold');
    this.log('='.repeat(50), 'blue');
    
    this.log(`✅ Successes: ${this.successes.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.exitCode = 1;
      this.log('\n🚨 Deployment blocked due to environment errors!', 'red');
      this.log('Fix the following issues before deploying:\n', 'red');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'red');
      });
    } else {
      this.log('\n🎉 Environment validation passed!', 'green');
      if (this.warnings.length > 0) {
        this.log('Consider addressing warnings for better security:', 'yellow');
        this.warnings.forEach((warning, index) => {
          this.log(`${index + 1}. ${warning}`, 'yellow');
        });
      }
    }

    this.log('='.repeat(50), 'blue');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  validator.validate().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

module.exports = EnvironmentValidator;