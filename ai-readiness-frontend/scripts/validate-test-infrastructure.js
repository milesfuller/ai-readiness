#!/usr/bin/env node

/**
 * Test Infrastructure Validation Script
 * Validates that the test infrastructure is properly set up and running
 */

const { execSync, spawn } = require('child_process');
const fetch = require('node-fetch');
const { Client } = require('pg');

// Configuration
const CONFIG = {
  services: {
    database: {
      host: 'localhost',
      port: 54322,
      database: 'postgres',
      user: 'postgres',
      password: 'test_postgres_password',
    },
    endpoints: [
      {
        name: 'Kong API Gateway',
        url: 'http://localhost:54321/health',
        required: false,
      },
      {
        name: 'Auth Service',
        url: 'http://localhost:54321/auth/v1/health',
        required: true,
      },
      {
        name: 'REST API',
        url: 'http://localhost:54321/rest/v1/',
        headers: {
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
        },
        required: true,
      },
      {
        name: 'Supabase Studio',
        url: 'http://localhost:54323',
        required: false,
      },
      {
        name: 'Inbucket Email',
        url: 'http://localhost:54324',
        required: false,
      },
    ],
    containers: [
      'supabase-db-test',
      'supabase-kong-test',
      'supabase-auth-test',
      'supabase-rest-test',
      'supabase-storage-test',
      'supabase-realtime-test',
      'supabase-analytics-test',
    ],
  },
  timeouts: {
    service: 5000,
    database: 10000,
  },
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const executeCommand = (command, options = {}) => {
  try {
    return execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
};

const logInfo = (message) => {
  console.log(`\x1b[34m[INFO]\x1b[0m ${message}`);
};

const logSuccess = (message) => {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
};

const logWarning = (message) => {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
};

const logError = (message) => {
  console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`);
};

// Validation functions
async function validateDockerContainers() {
  logInfo('Validating Docker containers...');
  
  try {
    const runningContainers = executeCommand('docker ps --format "{{.Names}}"', { silent: true });
    const containerNames = runningContainers.split('\n').filter(Boolean);
    
    const results = [];
    
    for (const expectedContainer of CONFIG.services.containers) {
      const isRunning = containerNames.includes(expectedContainer);
      results.push({
        name: expectedContainer,
        status: isRunning ? 'running' : 'not running',
        success: isRunning,
      });
      
      if (isRunning) {
        logSuccess(`Container ${expectedContainer} is running`);
      } else {
        logWarning(`Container ${expectedContainer} is not running`);
      }
    }
    
    return results;
  } catch (error) {
    logError(`Failed to check Docker containers: ${error.message}`);
    return [];
  }
}

async function validateDatabaseConnection() {
  logInfo('Validating database connection...');
  
  const client = new Client(CONFIG.services.database);
  
  try {
    await client.connect();
    
    // Test basic query
    const result = await client.query('SELECT version()');
    logSuccess(`Database connection successful: ${result.rows[0].version.split(' ')[0]}`);
    
    // Test auth schema
    try {
      await client.query('SELECT * FROM auth.users LIMIT 1');
      logSuccess('Auth schema is accessible');
    } catch (error) {
      logWarning('Auth schema not found - this may be normal for initial setup');
    }
    
    // Test custom functions
    try {
      await client.query('SELECT auth.uid()');
      logSuccess('Custom auth functions are available');
    } catch (error) {
      logWarning('Custom auth functions not found - this may be normal for initial setup');
    }
    
    await client.end();
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    if (client._connected) {
      await client.end();
    }
    return false;
  }
}

async function validateHttpEndpoints() {
  logInfo('Validating HTTP endpoints...');
  
  const results = [];
  
  for (const endpoint of CONFIG.services.endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: endpoint.headers || {},
        timeout: CONFIG.timeouts.service,
      });
      
      const success = response.ok || response.status < 500;
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        success,
        required: endpoint.required,
      });
      
      if (success) {
        logSuccess(`${endpoint.name} is accessible (${response.status})`);
      } else {
        const message = `${endpoint.name} returned ${response.status}`;
        if (endpoint.required) {
          logError(message);
        } else {
          logWarning(message);
        }
      }
    } catch (error) {
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        error: error.message,
        success: false,
        required: endpoint.required,
      });
      
      const message = `${endpoint.name} is not accessible: ${error.message}`;
      if (endpoint.required) {
        logError(message);
      } else {
        logWarning(message);
      }
    }
  }
  
  return results;
}

async function validateEnvironmentVariables() {
  logInfo('Validating environment variables...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'POSTGRES_PASSWORD',
  ];
  
  const results = [];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const isSet = !!value;
    
    results.push({
      name: varName,
      isSet,
      hasValue: isSet && value.length > 0,
    });
    
    if (isSet && value.length > 0) {
      logSuccess(`${varName} is set`);
    } else {
      logWarning(`${varName} is not set or empty`);
    }
  }
  
  return results;
}

async function validateTestConfiguration() {
  logInfo('Validating test configuration...');
  
  const checks = [
    {
      name: 'NODE_ENV',
      check: () => process.env.NODE_ENV === 'test',
      message: 'NODE_ENV should be set to "test"',
    },
    {
      name: 'Playwright config',
      check: () => {
        try {
          require('../playwright.config.ts');
          return true;
        } catch {
          return false;
        }
      },
      message: 'Playwright configuration file should exist',
    },
    {
      name: 'Jest config',
      check: () => {
        try {
          const pkg = require('../package.json');
          return !!pkg.jest;
        } catch {
          return false;
        }
      },
      message: 'Jest configuration should be present',
    },
    {
      name: 'Docker Compose test file',
      check: () => {
        const fs = require('fs');
        return fs.existsSync('./docker-compose.test.yml');
      },
      message: 'docker-compose.test.yml should exist',
    },
  ];
  
  const results = [];
  
  for (const check of checks) {
    const success = check.check();
    results.push({
      name: check.name,
      success,
      message: check.message,
    });
    
    if (success) {
      logSuccess(check.message);
    } else {
      logWarning(check.message);
    }
  }
  
  return results;
}

async function runBasicTests() {
  logInfo('Running basic functionality tests...');
  
  const tests = [];
  
  // Test database query
  try {
    const client = new Client(CONFIG.services.database);
    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    tests.push({ name: 'Database query test', success: true });
    logSuccess('Database query test passed');
  } catch (error) {
    tests.push({ name: 'Database query test', success: false, error: error.message });
    logError(`Database query test failed: ${error.message}`);
  }
  
  // Test API authentication
  try {
    const response = await fetch('http://localhost:54321/rest/v1/rpc/version', {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
      timeout: CONFIG.timeouts.service,
    });
    
    const success = response.ok;
    tests.push({ name: 'API authentication test', success, status: response.status });
    
    if (success) {
      logSuccess('API authentication test passed');
    } else {
      logWarning(`API authentication test returned ${response.status}`);
    }
  } catch (error) {
    tests.push({ name: 'API authentication test', success: false, error: error.message });
    logWarning(`API authentication test failed: ${error.message}`);
  }
  
  return tests;
}

// Main validation function
async function validateInfrastructure() {
  console.log('🔍 AI Readiness Test Infrastructure Validation\n');
  
  const results = {
    containers: await validateDockerContainers(),
    database: await validateDatabaseConnection(),
    endpoints: await validateHttpEndpoints(),
    environment: await validateEnvironmentVariables(),
    configuration: await validateTestConfiguration(),
    tests: await runBasicTests(),
  };
  
  // Summary
  console.log('\n📊 Validation Summary:');
  console.log('='.repeat(50));
  
  const containersPassing = results.containers.filter(c => c.success).length;
  const containersTotal = results.containers.length;
  console.log(`🐳 Containers: ${containersPassing}/${containersTotal} running`);
  
  console.log(`🗄️  Database: ${results.database ? '✅ Connected' : '❌ Failed'}`);
  
  const endpointsPassing = results.endpoints.filter(e => e.success).length;
  const endpointsTotal = results.endpoints.length;
  console.log(`🌐 Endpoints: ${endpointsPassing}/${endpointsTotal} accessible`);
  
  const envVarsPassing = results.environment.filter(e => e.hasValue).length;
  const envVarsTotal = results.environment.length;
  console.log(`🔧 Environment: ${envVarsPassing}/${envVarsTotal} variables set`);
  
  const configPassing = results.configuration.filter(c => c.success).length;
  const configTotal = results.configuration.length;
  console.log(`⚙️  Configuration: ${configPassing}/${configTotal} checks passed`);
  
  const testsPassing = results.tests.filter(t => t.success).length;
  const testsTotal = results.tests.length;
  console.log(`🧪 Basic Tests: ${testsPassing}/${testsTotal} passed`);
  
  // Overall status
  const criticalChecks = [
    results.database,
    results.endpoints.filter(e => e.required).every(e => e.success),
    results.containers.filter(c => c.name.includes('db') || c.name.includes('auth')).every(c => c.success),
  ];
  
  const overallSuccess = criticalChecks.every(Boolean);
  
  console.log('\n' + '='.repeat(50));
  console.log(`Overall Status: ${overallSuccess ? '✅ READY' : '❌ NOT READY'}`);
  
  if (!overallSuccess) {
    console.log('\n🚨 Critical issues detected. Please fix the following:');
    if (!results.database) console.log('  • Database connection failed');
    if (!results.endpoints.filter(e => e.required).every(e => e.success)) {
      console.log('  • Required API endpoints are not accessible');
    }
    if (!results.containers.filter(c => c.name.includes('db') || c.name.includes('auth')).every(c => c.success)) {
      console.log('  • Critical containers are not running');
    }
  }
  
  return overallSuccess;
}

// CLI handling
if (require.main === module) {
  const command = process.argv[2] || 'validate';
  
  switch (command) {
    case 'validate':
    case 'check':
      validateInfrastructure()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
          logError(`Validation failed: ${error.message}`);
          process.exit(1);
        });
      break;
    
    case 'containers':
      validateDockerContainers()
        .then(() => process.exit(0))
        .catch(error => {
          logError(`Container validation failed: ${error.message}`);
          process.exit(1);
        });
      break;
    
    case 'database':
      validateDatabaseConnection()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
          logError(`Database validation failed: ${error.message}`);
          process.exit(1);
        });
      break;
    
    case 'endpoints':
      validateHttpEndpoints()
        .then(() => process.exit(0))
        .catch(error => {
          logError(`Endpoint validation failed: ${error.message}`);
          process.exit(1);
        });
      break;
    
    default:
      console.log('Usage: node validate-test-infrastructure.js [command]');
      console.log('Commands:');
      console.log('  validate    - Run all validations (default)');
      console.log('  containers  - Check Docker containers only');
      console.log('  database    - Check database connection only');
      console.log('  endpoints   - Check HTTP endpoints only');
      process.exit(1);
  }
}

module.exports = {
  validateInfrastructure,
  validateDockerContainers,
  validateDatabaseConnection,
  validateHttpEndpoints,
  validateEnvironmentVariables,
  validateTestConfiguration,
  runBasicTests,
};