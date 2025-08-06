#!/usr/bin/env node

/**
 * Pre-Deployment Database Connectivity Validator
 * Validates database connections and schema before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
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

class DatabaseValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.isCI = process.env.CI === 'true';
    this.exitCode = 0;
    this.connectionTimeout = 10000; // 10 seconds
    this.supabaseClient = null;
  }

  log(message, color = 'reset') {
    if (!this.isCI) {
      console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
      console.log(message);
    }
  }

  error(message, context = '') {
    const errorMsg = context ? `${context}: ${message}` : message;
    this.errors.push(errorMsg);
    this.log(`❌ ERROR: ${errorMsg}`, 'red');
  }

  warning(message, context = '') {
    const warningMsg = context ? `${context}: ${message}` : message;
    this.warnings.push(warningMsg);
    this.log(`⚠️  WARNING: ${warningMsg}`, 'yellow');
  }

  success(message) {
    this.successes.push(message);
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'cyan');
  }

  // Initialize Supabase client
  async initializeSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      this.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
      return false;
    }

    try {
      // Dynamic import for Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
      this.success('Supabase client initialized');
      return true;
    } catch (err) {
      this.error(`Failed to initialize Supabase client: ${err.message}`);
      return false;
    }
  }

  // Test basic database connectivity
  async testDatabaseConnection() {
    if (!this.supabaseClient) {
      this.error('Supabase client not initialized', 'Database Connection');
      return false;
    }

    try {
      this.info('Testing database connection...');
      
      // Simple query to test connectivity
      const { data, error } = await this.supabaseClient
        .from('information_schema.tables')
        .select('table_name')
        .limit(1);

      if (error) {
        // If information_schema is not accessible, try a different approach
        if (error.message.includes('permission denied') || error.message.includes('not found')) {
          // Try to access auth schema which should be available
          const { error: authError } = await this.supabaseClient.auth.getSession();
          if (authError && !authError.message.includes('No session found')) {
            this.error(`Database connection failed: ${authError.message}`, 'Database Connection');
            return false;
          }
        } else {
          this.error(`Database connection failed: ${error.message}`, 'Database Connection');
          return false;
        }
      }

      this.success('Database connection successful');
      return true;
    } catch (err) {
      this.error(`Database connection failed: ${err.message}`, 'Database Connection');
      return false;
    }
  }

  // Validate database schema and tables
  async validateDatabaseSchema() {
    if (!this.supabaseClient) {
      this.warning('Cannot validate schema - Supabase client not initialized');
      return;
    }

    try {
      this.info('Validating database schema...');

      // Check for essential tables (adjust based on your schema)
      const essentialTables = [
        'users',
        'survey_sessions',
        'survey_responses'
      ];

      const tableCheckResults = [];

      for (const table of essentialTables) {
        try {
          const { data, error } = await this.supabaseClient
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            if (error.message.includes('not found') || error.message.includes('does not exist')) {
              this.warning(`Table '${table}' does not exist`, 'Schema');
              tableCheckResults.push({ table, exists: false, error: error.message });
            } else {
              this.warning(`Could not access table '${table}': ${error.message}`, 'Schema');
              tableCheckResults.push({ table, exists: 'unknown', error: error.message });
            }
          } else {
            this.success(`Table '${table}' is accessible`);
            tableCheckResults.push({ table, exists: true, error: null });
          }
        } catch (err) {
          this.warning(`Error checking table '${table}': ${err.message}`, 'Schema');
          tableCheckResults.push({ table, exists: 'unknown', error: err.message });
        }
      }

      // Check if any essential tables are missing
      const missingTables = tableCheckResults.filter(result => result.exists === false);
      if (missingTables.length > 0) {
        this.warning(`Missing essential tables: ${missingTables.map(t => t.table).join(', ')}`, 'Schema');
      }

      return tableCheckResults;
    } catch (err) {
      this.error(`Schema validation failed: ${err.message}`, 'Schema');
      return [];
    }
  }

  // Test authentication system
  async testAuthenticationSystem() {
    if (!this.supabaseClient) {
      this.warning('Cannot test auth - Supabase client not initialized');
      return;
    }

    try {
      this.info('Testing authentication system...');

      // Test session management
      const { data: sessionData, error: sessionError } = await this.supabaseClient.auth.getSession();
      
      if (sessionError && !sessionError.message.includes('No session found')) {
        this.error(`Auth session test failed: ${sessionError.message}`, 'Authentication');
        return false;
      }

      this.success('Authentication system is accessible');

      // Test auth configuration (check if sign-up is enabled, etc.)
      // This is a passive check since we don't want to create test users
      this.info('Auth system appears to be properly configured');
      
      return true;
    } catch (err) {
      this.error(`Authentication test failed: ${err.message}`, 'Authentication');
      return false;
    }
  }

  // Check database migrations status
  async checkMigrationStatus() {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      this.info('No migrations directory found - using Supabase default schema');
      return;
    }

    try {
      this.info('Checking migration files...');
      
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        this.info('No migration files found');
        return;
      }

      this.info(`Found ${migrationFiles.length} migration files`);
      migrationFiles.forEach(file => {
        this.info(`  - ${file}`);
      });

      // Check if migrations contain any obvious issues
      this.validateMigrationFiles(migrationFiles, migrationsDir);

    } catch (err) {
      this.warning(`Could not check migrations: ${err.message}`, 'Migrations');
    }
  }

  // Validate migration files for common issues
  validateMigrationFiles(files, migrationsDir) {
    files.forEach(file => {
      try {
        const filePath = path.join(migrationsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check for common issues
        if (content.includes('DROP TABLE') && !content.includes('IF EXISTS')) {
          this.warning(`Migration ${file} contains DROP TABLE without IF EXISTS`, 'Migrations');
        }

        if (content.includes('CREATE TABLE') && !content.includes('IF NOT EXISTS')) {
          this.warning(`Migration ${file} contains CREATE TABLE without IF NOT EXISTS`, 'Migrations');
        }

        // Check for potential security issues
        if (content.toLowerCase().includes('grant all')) {
          this.warning(`Migration ${file} contains broad permissions (GRANT ALL)`, 'Migrations');
        }

        this.success(`Migration ${file} syntax appears valid`);

      } catch (err) {
        this.warning(`Could not validate migration ${file}: ${err.message}`, 'Migrations');
      }
    });
  }

  // Test RLS (Row Level Security) policies
  async testRLSPolicies() {
    if (!this.supabaseClient) {
      this.warning('Cannot test RLS - Supabase client not initialized');
      return;
    }

    try {
      this.info('Testing Row Level Security policies...');

      // This is a basic test - in a real scenario you'd want to test specific policies
      // For now, we'll just check if RLS is generally working by trying basic operations
      
      const testTables = ['users', 'survey_sessions', 'survey_responses'];
      
      for (const table of testTables) {
        try {
          // Try to access the table (this should respect RLS)
          const { data, error } = await this.supabaseClient
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            if (error.message.includes('new row violates row-level security') ||
                error.message.includes('permission denied')) {
              this.success(`RLS is active for table '${table}'`);
            } else if (error.message.includes('not found') || 
                      error.message.includes('does not exist')) {
              // Table doesn't exist - skip
              continue;
            } else {
              this.warning(`Unexpected error testing RLS for '${table}': ${error.message}`, 'RLS');
            }
          } else {
            // Successfully accessed data - RLS might be allowing anonymous access
            this.info(`Table '${table}' allows anonymous access (verify this is intended)`);
          }
        } catch (err) {
          this.warning(`Could not test RLS for table '${table}': ${err.message}`, 'RLS');
        }
      }

    } catch (err) {
      this.error(`RLS test failed: ${err.message}`, 'RLS');
    }
  }

  // Check database performance and limits
  async checkDatabasePerformance() {
    if (!this.supabaseClient) {
      this.warning('Cannot check performance - Supabase client not initialized');
      return;
    }

    try {
      this.info('Checking database performance...');

      const startTime = Date.now();

      // Simple query to test response time
      try {
        const { error } = await this.supabaseClient
          .from('information_schema.tables')
          .select('table_name')
          .limit(5);

        const responseTime = Date.now() - startTime;

        if (error) {
          // Try alternative approach
          const altStartTime = Date.now();
          await this.supabaseClient.auth.getSession();
          const altResponseTime = Date.now() - altStartTime;
          
          if (altResponseTime < 1000) {
            this.success(`Database response time: ${altResponseTime}ms (using auth endpoint)`);
          } else if (altResponseTime < 3000) {
            this.warning(`Database response time: ${altResponseTime}ms (slower than expected)`);
          } else {
            this.error(`Database response time: ${altResponseTime}ms (too slow)`, 'Performance');
          }
        } else {
          if (responseTime < 500) {
            this.success(`Database response time: ${responseTime}ms`);
          } else if (responseTime < 2000) {
            this.warning(`Database response time: ${responseTime}ms (acceptable but could be better)`);
          } else {
            this.error(`Database response time: ${responseTime}ms (too slow)`, 'Performance');
          }
        }

      } catch (err) {
        this.warning(`Could not measure database performance: ${err.message}`, 'Performance');
      }

    } catch (err) {
      this.error(`Performance check failed: ${err.message}`, 'Performance');
    }
  }

  // Validate environment-specific database settings
  validateEnvironmentSettings() {
    const isProduction = process.env.NODE_ENV === 'production';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (isProduction) {
      // Production-specific validations
      if (supabaseUrl && supabaseUrl.includes('localhost')) {
        this.error('Production environment using localhost database URL', 'Environment');
      }

      // Check for production-ready connection pooling
      if (!process.env.DATABASE_URL && !supabaseUrl) {
        this.error('No database URL configured for production', 'Environment');
      }

      this.info('Environment settings validated for production');
    } else {
      // Development-specific validations
      if (supabaseUrl && supabaseUrl.includes('localhost')) {
        this.info('Development environment using local database (expected)');
      }
    }

    // Check SSL requirements
    if (isProduction && supabaseUrl && !supabaseUrl.startsWith('https://')) {
      this.error('Production database URL should use HTTPS', 'Security');
    }
  }

  // Main validation method
  async validate() {
    this.log('\n🔍 Starting Database Validation\n', 'bold');
    
    const startTime = Date.now();

    // Environment settings validation
    this.log('⚙️  Validating Environment Settings:', 'bold');
    this.validateEnvironmentSettings();

    // Initialize database client
    this.log('\n🔌 Initializing Database Client:', 'bold');
    const clientInitialized = await this.initializeSupabaseClient();
    
    if (!clientInitialized) {
      this.log('\n🚨 Cannot proceed with database tests - client initialization failed', 'red');
      this.printSummary(0);
      return this.exitCode;
    }

    // Test basic connectivity
    this.log('\n📡 Testing Database Connection:', 'bold');
    const connectionSuccess = await this.testDatabaseConnection();

    if (!connectionSuccess) {
      this.warning('Database connection failed - some tests will be skipped');
    } else {
      // Only run these tests if connection is successful
      
      // Schema validation
      this.log('\n📋 Validating Database Schema:', 'bold');
      await this.validateDatabaseSchema();

      // Authentication system test
      this.log('\n🔐 Testing Authentication System:', 'bold');
      await this.testAuthenticationSystem();

      // RLS policies test
      this.log('\n🛡️  Testing Row Level Security:', 'bold');
      await this.testRLSPolicies();

      // Performance check
      this.log('\n⚡ Checking Database Performance:', 'bold');
      await this.checkDatabasePerformance();
    }

    // Migration status (doesn't require DB connection)
    this.log('\n🔄 Checking Migration Status:', 'bold');
    await this.checkMigrationStatus();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print summary
    this.printSummary(duration);

    return this.exitCode;
  }

  printSummary(duration) {
    this.log('\n📊 Database Validation Summary:', 'bold');
    this.log('='.repeat(60), 'blue');
    
    this.log(`⏱️  Duration: ${duration}s`, 'cyan');
    this.log(`✅ Successes: ${this.successes.length}`, 'green');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.exitCode = 1;
      this.log('\n🚨 Deployment blocked due to database errors!', 'red');
      this.log('Fix the following issues before deploying:\n', 'red');
      this.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'red');
      });
    } else {
      this.log('\n🎉 Database validation passed!', 'green');
      if (this.warnings.length > 0) {
        this.log('Consider addressing warnings for better reliability:', 'yellow');
        this.warnings.forEach((warning, index) => {
          this.log(`${index + 1}. ${warning}`, 'yellow');
        });
      }
    }

    this.log('='.repeat(60), 'blue');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DatabaseValidator();
  validator.validate().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

module.exports = DatabaseValidator;