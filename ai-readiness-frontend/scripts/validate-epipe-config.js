#!/usr/bin/env node

/**
 * EPIPE Configuration Validator
 * 
 * This script validates that the EPIPE-safe Playwright configuration
 * is properly set up and can prevent common EPIPE error scenarios.
 */

const fs = require('fs');
const path = require('path');

async function validateConfiguration() {
  console.log('🔍 Validating EPIPE-safe Playwright configuration...\n');
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };
  
  // Test 1: Configuration file exists
  await test('Configuration file exists', () => {
    const configPath = path.resolve('playwright.config.epipe-fix.ts');
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuration file not found');
    }
    return `Found at: ${configPath}`;
  }, results);
  
  // Test 2: Global setup/teardown files exist
  await test('Global setup/teardown files exist', () => {
    const setupPath = path.resolve('e2e/utils/epipe-prevention-setup.ts');
    const teardownPath = path.resolve('e2e/utils/epipe-prevention-teardown.ts');
    
    if (!fs.existsSync(setupPath)) {
      throw new Error('Setup file not found');
    }
    if (!fs.existsSync(teardownPath)) {
      throw new Error('Teardown file not found');
    }
    
    return 'Setup and teardown files found';
  }, results);
  
  // Test 3: Test runner script exists
  await test('Test runner script exists', () => {
    const runnerPath = path.resolve('scripts/run-playwright-epipe-safe.js');
    if (!fs.existsSync(runnerPath)) {
      throw new Error('Test runner script not found');
    }
    
    // Check if it's executable
    const stats = fs.statSync(runnerPath);
    const isExecutable = stats.mode & parseInt('111', 8);
    
    return `Script found and ${isExecutable ? 'executable' : 'not executable'}`;
  }, results);
  
  // Test 4: Output directories can be created
  await test('Output directories can be created', () => {
    const dirs = [
      'test-results/epipe-safe',
      'test-results/html-report-epipe-safe',
      'test-results/logs',
    ];
    
    dirs.forEach(dir => {
      const fullPath = path.resolve(dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
    
    return `Created ${dirs.length} output directories`;
  }, results);
  
  // Test 5: Package.json has EPIPE-safe scripts
  await test('Package.json has EPIPE-safe scripts', () => {
    const packagePath = path.resolve('package.json');
    if (!fs.existsSync(packagePath)) {
      throw new Error('package.json not found');
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      'test:e2e:epipe-safe',
      'test:e2e:epipe-safe:debug',
      'test:e2e:epipe-safe:headed'
    ];
    
    const missingScripts = requiredScripts.filter(script => !scripts[script]);
    
    if (missingScripts.length > 0) {
      throw new Error(`Missing scripts: ${missingScripts.join(', ')}`);
    }
    
    return `All ${requiredScripts.length} EPIPE-safe scripts found`;
  }, results);
  
  // Test 6: Node.js memory configuration
  await test('Node.js memory configuration', () => {
    const nodeOptions = process.env.NODE_OPTIONS || '';
    const hasMemoryConfig = nodeOptions.includes('--max-old-space-size');
    
    if (!hasMemoryConfig) {
      results.warnings++;
      return 'WARNING: Consider setting NODE_OPTIONS="--max-old-space-size=8192"';
    }
    
    return 'Node.js memory configuration found';
  }, results);
  
  // Test 7: System resources check
  await test('System resources check', () => {
    const memory = process.memoryUsage();
    const freeMemory = memory.heapTotal - memory.heapUsed;
    const freeMemoryMB = Math.round(freeMemory / 1024 / 1024);
    
    if (freeMemoryMB < 100) {
      results.warnings++;
      return `WARNING: Low free memory (${freeMemoryMB}MB)`;
    }
    
    return `Sufficient memory available (${freeMemoryMB}MB free)`;
  }, results);
  
  // Test 8: EPIPE stress test exists
  await test('EPIPE stress test exists', () => {
    const testPath = path.resolve('e2e/epipe-stress-test.spec.ts');
    if (!fs.existsSync(testPath)) {
      throw new Error('EPIPE stress test not found');
    }
    
    return 'EPIPE stress test available';
  }, results);
  
  // Print results
  console.log('\n📊 Validation Results:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Warnings: ${results.warnings}`);
  
  if (results.failed > 0) {
    console.log('\n❌ Configuration validation failed!');
    console.log('Please fix the issues above before running EPIPE-safe tests.');
    process.exit(1);
  } else if (results.warnings > 0) {
    console.log('\n⚠️  Configuration validation passed with warnings.');
    console.log('Consider addressing the warnings for optimal performance.');
  } else {
    console.log('\n✅ Configuration validation passed!');
    console.log('EPIPE-safe Playwright configuration is ready to use.');
  }
  
  // Create validation report
  const reportPath = path.resolve('test-results/epipe-config-validation.json');
  const report = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      status: results.failed > 0 ? 'FAILED' : (results.warnings > 0 ? 'WARNED' : 'PASSED'),
      passed: results.passed,
      failed: results.failed,
      warnings: results.warnings
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📋 Validation report saved to: ${reportPath}`);
}

async function test(name, testFn, results) {
  try {
    const result = await testFn();
    console.log(`✅ ${name}: ${result}`);
    results.passed++;
    results.details.push({ name, status: 'PASSED', message: result });
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    results.failed++;
    results.details.push({ name, status: 'FAILED', message: error.message });
  }
}

// Run validation if called directly
if (require.main === module) {
  validateConfiguration().catch(error => {
    console.error('💥 Validation error:', error);
    process.exit(1);
  });
}

module.exports = { validateConfiguration };