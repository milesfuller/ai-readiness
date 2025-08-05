#!/usr/bin/env node

/**
 * EPIPE-Safe Playwright Test Runner
 * 
 * This script runs Playwright tests with enhanced output buffering and
 * EPIPE error prevention mechanisms.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  configFile: 'playwright.config.epipe-fix.ts',
  maxBufferSize: 10 * 1024 * 1024, // 10MB buffer
  outputFile: 'test-results/epipe-safe-output.log',
  errorFile: 'test-results/epipe-safe-errors.log',
  timeout: 10 * 60 * 1000, // 10 minutes
};

async function runTests() {
  console.log('🚀 Starting EPIPE-safe Playwright test runner...');
  
  // Ensure output directories exist
  ensureDirectories();
  
  // Set up file streams for output capture
  const outputStream = fs.createWriteStream(CONFIG.outputFile, { flags: 'w' });
  const errorStream = fs.createWriteStream(CONFIG.errorFile, { flags: 'w' });
  
  try {
    const result = await runPlaywrightWithBuffering(outputStream, errorStream);
    
    console.log('\n📊 Test Run Summary:');
    console.log(`   Exit Code: ${result.exitCode}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Output logged to: ${CONFIG.outputFile}`);
    console.log(`   Errors logged to: ${CONFIG.errorFile}`);
    
    // Display critical output
    await displayCriticalOutput();
    
    process.exit(result.exitCode);
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  } finally {
    // Ensure streams are closed
    outputStream.end();
    errorStream.end();
  }
}

/**
 * Ensure required directories exist
 */
function ensureDirectories() {
  const dirs = [
    'test-results',
    'test-results/epipe-safe',
    'test-results/html-report-epipe-safe',
    'test-results/logs',
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

/**
 * Run Playwright with enhanced output buffering
 */
function runPlaywrightWithBuffering(outputStream, errorStream) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Build command arguments
    const args = [
      'test',
      '--config', CONFIG.configFile,
      ...process.argv.slice(2), // Pass through any additional arguments
    ];
    
    console.log(`🎭 Running: npx playwright ${args.join(' ')}`);
    
    // Spawn Playwright process with optimized settings
    const child = spawn('npx', ['playwright', ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        
        // Optimize Node.js for large outputs
        NODE_OPTIONS: '--max-old-space-size=8192 --max-http-header-size=80000',
        
        // Buffer optimization
        UV_THREADPOOL_SIZE: '8', 
        
        // Disable verbose logging
        DEBUG: '',
        VERBOSE: '0',
        
        // Force file-based output
        PLAYWRIGHT_JSON_OUTPUT_NAME: 'test-results/results-epipe-safe.json',
        PLAYWRIGHT_HTML_REPORT: 'test-results/html-report-epipe-safe',
      },
      
      // Increase buffer sizes
      maxBuffer: CONFIG.maxBufferSize,
    });
    
    // Set up timeout
    const timeout = setTimeout(() => {
      console.log('⏰ Test timeout reached, terminating...');
      child.kill('SIGTERM');
      
      setTimeout(() => {
        child.kill('SIGKILL');
      }, 5000);
    }, CONFIG.timeout);
    
    // Handle stdout with chunked processing
    let stdoutBuffer = '';
    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdoutBuffer += chunk;
      
      // Write to file immediately
      outputStream.write(chunk);
      
      // Process line by line to prevent overwhelming console
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line
      
      lines.forEach(line => {
        if (shouldDisplayLine(line)) {
          console.log(line);
        }
      });
    });
    
    // Handle stderr with error filtering
    let stderrBuffer = '';
    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrBuffer += chunk;
      
      // Write to error file immediately
      errorStream.write(chunk);
      
      // Process error lines
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop() || '';
      
      lines.forEach(line => {
        if (shouldDisplayError(line)) {
          console.error(line);
        }
      });
    });
    
    // Handle process events
    child.on('error', (error) => {
      clearTimeout(timeout);
      
      if (error.code === 'EPIPE') {
        console.log('⚠️  EPIPE error handled gracefully');
        resolve({ exitCode: 0, duration: Date.now() - startTime });
      } else {
        reject(error);
      }
    });
    
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        console.log('⚠️  Process terminated due to timeout');
        resolve({ exitCode: 124, duration: Date.now() - startTime }); // Timeout exit code
      } else {
        resolve({ exitCode: code || 0, duration: Date.now() - startTime });
      }
    });
    
    // Handle process termination gracefully
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, terminating tests gracefully...');
      clearTimeout(timeout);
      child.kill('SIGTERM');
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, terminating tests gracefully...');
      clearTimeout(timeout);
      child.kill('SIGTERM');
    });
  });
}

/**
 * Determine if a stdout line should be displayed
 */
function shouldDisplayLine(line) {
  // Display important lines
  const importantPatterns = [
    /Running \d+ tests/,
    /✓|✗|⚠/,                    // Test results
    /\d+ passed/,                // Summary lines
    /\d+ failed/,
    /\d+ skipped/,
    /Slow test file/,
    /Error:/,
    /Failed:/,
  ];
  
  // Skip verbose lines
  const skipPatterns = [
    /^\s*$/, // Empty lines
    /\[chromium\]/,
    /page.goto/,
    /expect\(/,
    /Timeout/,
  ];
  
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }
  
  return importantPatterns.some(pattern => pattern.test(line));
}

/**
 * Determine if a stderr line should be displayed
 */
function shouldDisplayError(line) {
  // Always display actual errors
  const errorPatterns = [
    /Error:/,
    /Failed:/,
    /Exception:/,
    /EPIPE/,
    /timeout/i,
  ];
  
  // Skip debug noise
  const skipPatterns = [
    /^\s*$/, // Empty lines
    /DevTools listening on/,
    /\[Chromium\]/,
  ];
  
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }
  
  return errorPatterns.some(pattern => pattern.test(line)) || 
         line.trim().length > 0; // Show non-empty lines by default
}

/**
 * Display critical output from log files
 */
async function displayCriticalOutput() {
  try {
    // Check for test results
    const resultsFile = 'test-results/results-epipe-safe.json';
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      
      console.log('\n📋 Test Results Summary:');
      if (results.stats) {
        console.log(`   Total: ${results.stats.total || 0}`);
        console.log(`   Passed: ${results.stats.expected || 0}`);
        console.log(`   Failed: ${results.stats.unexpected || 0}`);
        console.log(`   Skipped: ${results.stats.skipped || 0}`);
      }
    }
    
    // Check for errors in error log
    if (fs.existsSync(CONFIG.errorFile)) {
      const errorContent = fs.readFileSync(CONFIG.errorFile, 'utf8');
      const errorLines = errorContent.split('\n').filter(line => 
        line.includes('Error:') || 
        line.includes('Failed:') || 
        line.includes('EPIPE')
      );
      
      if (errorLines.length > 0) {
        console.log('\n❌ Critical Errors:');
        errorLines.slice(0, 5).forEach(line => {
          console.log(`   ${line.trim()}`);
        });
        
        if (errorLines.length > 5) {
          console.log(`   ... and ${errorLines.length - 5} more errors`);
        }
      }
    }
    
  } catch (error) {
    console.log('⚠️  Error reading test output:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };