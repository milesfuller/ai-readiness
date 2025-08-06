#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner
 * Orchestrates the execution of the complete E2E test suite with proper setup and teardown
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  testTimeout: 2 * 60 * 60 * 1000, // 2 hours
  setupTimeout: 5 * 60 * 1000, // 5 minutes
  browsers: ['chromium', 'firefox', 'webkit'],
  testCategories: [
    'route-navigation',
    'auth-flows', 
    'error-scenarios',
    'rate-limiting',
    'responsive-behavior',
    'rbac-security',
    'api-interactions',
    'survey-flows',
    'dashboard-analytics',
    'cross-browser'
  ]
};

// Utility functions
const log = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

const executeCommand = (command, options = {}) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'inherit', ...options });
  } catch (error) {
    log(`Command failed: ${command}`, 'ERROR');
    log(`Error: ${error.message}`, 'ERROR');
    throw error;
  }
};

const checkPrerequisites = () => {
  log('Checking prerequisites...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`);
  
  // Check if dependencies are installed
  if (!fs.existsSync('node_modules')) {
    log('Installing dependencies...', 'WARN');
    executeCommand('npm ci');
  }
  
  // Check Playwright installation
  try {
    executeCommand('npx playwright --version');
  } catch (error) {
    log('Installing Playwright...', 'WARN');
    executeCommand('npx playwright install');
  }
  
  // Check test infrastructure
  const testDir = path.join(__dirname, '..', 'e2e');
  if (!fs.existsSync(testDir)) {
    throw new Error('E2E test directory not found');
  }
  
  const configFile = path.join(__dirname, '..', 'playwright.config.comprehensive.ts');
  if (!fs.existsSync(configFile)) {
    throw new Error('Comprehensive test configuration not found');
  }
  
  log('Prerequisites check passed ✓');
};

const setupTestEnvironment = async () => {
  log('Setting up test environment...');
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.COMPREHENSIVE_TEST_MODE = '1';
  process.env.NEXT_TELEMETRY_DISABLED = '1';
  
  // Create test results directory
  const resultsDir = path.join(__dirname, '..', 'test-results', 'comprehensive');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Start test infrastructure if needed
  try {
    log('Starting test infrastructure...');
    executeCommand('npm run test:e2e:setup', { timeout: config.setupTimeout });
  } catch (error) {
    log('Test infrastructure setup failed, continuing anyway...', 'WARN');
  }
  
  log('Test environment setup complete ✓');
};

const runTestSuite = async (options = {}) => {
  const { browser = 'all', category = 'all', parallel = true } = options;
  
  log(`Starting comprehensive test suite...`);
  log(`Browser: ${browser}, Category: ${category}, Parallel: ${parallel}`);
  
  // Build Playwright command
  let command = 'npx playwright test --config=playwright.config.comprehensive.ts';
  
  // Add browser filter
  if (browser !== 'all') {
    command += ` --project=${browser}-desktop`;
  }
  
  // Add category filter  
  if (category !== 'all') {
    command += ` comprehensive-${category}.spec.ts`;
  }
  
  // Add parallel execution
  if (parallel && browser === 'all') {
    command += ' --workers=3';
  }
  
  // Add CI-specific options
  if (process.env.CI) {
    command += ' --reporter=github,json,junit';
  } else {
    command += ' --reporter=html,line';
  }
  
  try {
    log(`Executing: ${command}`);
    executeCommand(command, { timeout: config.testTimeout });
    log('Test suite completed successfully ✓');
    return true;
  } catch (error) {
    log('Test suite failed ✗', 'ERROR');
    return false;
  }
};

const generateReport = () => {
  log('Generating test report...');
  
  const resultsFile = path.join(__dirname, '..', 'test-results', 'comprehensive-results.json');
  if (fs.existsSync(resultsFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      log('=== TEST RESULTS SUMMARY ===');
      log(`Total tests: ${results.stats?.total || 'N/A'}`);
      log(`Passed: ${results.stats?.passed || 'N/A'}`);
      log(`Failed: ${results.stats?.failed || 'N/A'}`);
      log(`Skipped: ${results.stats?.skipped || 'N/A'}`);
      log(`Duration: ${results.stats?.duration || 'N/A'}ms`);
      
      if (results.stats?.failed > 0) {
        log('=== FAILED TESTS ===');
        results.tests
          ?.filter(test => test.outcome === 'failed')
          ?.forEach(test => {
            log(`❌ ${test.title}`, 'ERROR');
          });
      }
    } catch (error) {
      log('Failed to parse test results', 'WARN');
    }
  }
  
  // Generate HTML report link
  const htmlReport = path.join(__dirname, '..', 'test-results', 'comprehensive-report', 'index.html');
  if (fs.existsSync(htmlReport)) {
    log(`📊 HTML Report: file://${htmlReport}`);
  }
};

const cleanup = () => {
  log('Cleaning up test environment...');
  
  try {
    executeCommand('npm run test:e2e:cleanup');
  } catch (error) {
    log('Cleanup failed, continuing...', 'WARN');
  }
  
  log('Cleanup complete ✓');
};

// Main execution function
const main = async () => {
  const startTime = Date.now();
  let success = false;
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
      browser: args.includes('--browser') ? args[args.indexOf('--browser') + 1] : 'all',
      category: args.includes('--category') ? args[args.indexOf('--category') + 1] : 'all',
      parallel: !args.includes('--no-parallel'),
      skipSetup: args.includes('--skip-setup')
    };
    
    log('🚀 Starting Comprehensive E2E Test Suite');
    log(`Options: ${JSON.stringify(options)}`);
    
    // Run test sequence
    checkPrerequisites();
    
    if (!options.skipSetup) {
      await setupTestEnvironment();
    }
    
    success = await runTestSuite(options);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    success = false;
  } finally {
    generateReport();
    cleanup();
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    log(`🏁 Test suite completed in ${duration}s`);
    
    if (success) {
      log('✅ All tests passed!');
      process.exit(0);
    } else {
      log('❌ Some tests failed!');
      process.exit(1);
    }
  }
};

// Handle process signals
process.on('SIGINT', () => {
  log('Received SIGINT, cleaning up...', 'WARN');
  cleanup();
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, cleaning up...', 'WARN');
  cleanup();
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`Unhandled error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { main, runTestSuite, checkPrerequisites };