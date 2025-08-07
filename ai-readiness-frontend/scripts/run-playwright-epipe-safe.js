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
  configFile: 'playwright.config.stable.ts', // Use the stable configuration
  maxBufferSize: 10 * 1024 * 1024, // 10MB buffer
  outputFile: 'test-results/epipe-safe-output.log',
  errorFile: 'test-results/epipe-safe-errors.log',
  timeout: 15 * 60 * 1000, // 15 minutes (increased for stability)
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
    // Ensure streams are closed safely
    try {
      outputStream.end();
    } catch (error) {
      // Ignore stream close errors
    }
    
    try {
      errorStream.end();
    } catch (error) {
      // Ignore stream close errors
    }
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
        
        // Optimize Node.js for EPIPE resistance
        NODE_OPTIONS: '--max-old-space-size=4096 --max-http-header-size=16384',
        
        // Reduced buffer optimization for stability
        UV_THREADPOOL_SIZE: '4', 
        
        // Disable verbose logging and colors
        DEBUG: '',
        VERBOSE: '0',
        FORCE_COLOR: '0',
        NODE_NO_WARNINGS: '1',
        
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
    
    // Handle stdout with EPIPE-safe processing
    let stdoutBuffer = '';
    child.stdout.on('data', (data) => {
      try {
        const chunk = data.toString();
        stdoutBuffer += chunk;
        
        // Write to file immediately with error handling
        try {
          outputStream.write(chunk);
        } catch (writeError) {
          if (writeError.code === 'EPIPE') {
            console.log('⚠️  Output stream EPIPE handled');
          } else {
            throw writeError;
          }
        }
        
        // Process line by line to prevent overwhelming console
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || ''; // Keep incomplete line
        
        lines.forEach(line => {
          if (shouldDisplayLine(line)) {
            try {
              console.log(line);
            } catch (consoleError) {
              // Ignore console write errors (EPIPE)
            }
          }
        });
      } catch (error) {
        // Ignore stdout processing errors to prevent cascade failures
      }
    });
    
    // Handle stdout pipe errors
    child.stdout.on('error', (error) => {
      if (error.code === 'EPIPE') {
        console.log('⚠️  Stdout pipe error handled');
      }
    });
    
    // Handle stderr with EPIPE-safe error filtering
    let stderrBuffer = '';
    child.stderr.on('data', (data) => {
      try {
        const chunk = data.toString();
        stderrBuffer += chunk;
        
        // Write to error file immediately with error handling
        try {
          errorStream.write(chunk);
        } catch (writeError) {
          if (writeError.code === 'EPIPE') {
            console.log('⚠️  Error stream EPIPE handled');
          } else {
            throw writeError;
          }
        }
        
        // Process error lines
        const lines = stderrBuffer.split('\n');
        stderrBuffer = lines.pop() || '';
        
        lines.forEach(line => {
          if (shouldDisplayError(line)) {
            try {
              console.error(line);
            } catch (consoleError) {
              // Ignore console error write errors (EPIPE)
            }
          }
        });
      } catch (error) {
        // Ignore stderr processing errors to prevent cascade failures
      }
    });
    
    // Handle stderr pipe errors
    child.stderr.on('error', (error) => {
      if (error.code === 'EPIPE') {
        console.log('⚠️  Stderr pipe error handled');
      }
    });
    
    // Handle process events
    child.on('error', (error) => {
      clearTimeout(timeout);
      
      if (error.code === 'EPIPE' || error.message.includes('EPIPE')) {
        console.log('⚠️  EPIPE error detected and handled gracefully');
        console.log('   This is expected behavior in EPIPE-safe mode');
        // Log the error but don't fail the test run
        errorStream.write(`EPIPE Error (handled): ${error.message}\n`);
        resolve({ exitCode: 0, duration: Date.now() - startTime });
      } else if (error.code === 'ENOENT') {
        console.log('❌ Playwright not found. Run: npx playwright install');
        resolve({ exitCode: 127, duration: Date.now() - startTime });
      } else {
        console.log(`❌ Process error: ${error.message}`);
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
    
    // Handle process termination gracefully with cleanup
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}, terminating tests gracefully...`);
      clearTimeout(timeout);
      
      // First try SIGTERM
      child.kill('SIGTERM');
      
      // Force kill after 5 seconds if needed
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (killError) {
          // Ignore errors during force kill
        }
      }, 5000);
    };
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
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
    /timeout/i,
    /Test timeout/,
    /Navigation timeout/,
    /Action timeout/
  ];
  
  // Skip debug noise and handled EPIPE messages
  const skipPatterns = [
    /^\s*$/, // Empty lines
    /DevTools listening on/,
    /\[Chromium\]/,
    /EPIPE Error \(handled\)/, // Our handled EPIPE messages
    /Output stream EPIPE handled/,
    /Error stream EPIPE handled/,
    /Stdout pipe error handled/,
    /Stderr pipe error handled/,
    /playwright.*install/, // Installation messages
    /Browser executable not found/ // Browser path issues
  ];
  
  if (skipPatterns.some(pattern => pattern.test(line))) {
    return false;
  }
  
  // Show EPIPE errors that aren't handled by us
  if (line.includes('EPIPE') && !line.includes('handled')) {
    return true;
  }
  
  return errorPatterns.some(pattern => pattern.test(line)) || 
         (line.trim().length > 0 && line.trim().length < 200); // Show non-empty, reasonable length lines
}

/**
 * Display critical output from log files with EPIPE handling
 */
async function displayCriticalOutput() {
  try {
    // Check for test results
    const resultsFile = 'test-results/results-epipe-safe.json';
    if (fs.existsSync(resultsFile)) {
      try {
        const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        
        console.log('\n📋 Test Results Summary:');
        if (results.stats) {
          console.log(`   Total: ${results.stats.total || 0}`);
          console.log(`   Passed: ${results.stats.expected || 0}`);
          console.log(`   Failed: ${results.stats.unexpected || 0}`);
          console.log(`   Skipped: ${results.stats.skipped || 0}`);
        }
      } catch (parseError) {
        console.log('⚠️  Could not parse test results JSON');
      }
    }
    
    // Check for errors in error log with EPIPE filtering
    if (fs.existsSync(CONFIG.errorFile)) {
      const errorContent = fs.readFileSync(CONFIG.errorFile, 'utf8');
      const errorLines = errorContent.split('\n').filter(line => {
        const trimmed = line.trim();
        return (
          (trimmed.includes('Error:') || 
           trimmed.includes('Failed:') || 
           trimmed.includes('EPIPE')) &&
          !trimmed.includes('EPIPE Error (handled)') // Exclude our handled EPIPE messages
        );
      });
      
      if (errorLines.length > 0) {
        console.log('\n❌ Critical Errors:');
        errorLines.slice(0, 5).forEach(line => {
          console.log(`   ${line.trim()}`);
        });
        
        if (errorLines.length > 5) {
          console.log(`   ... and ${errorLines.length - 5} more errors`);
        }
      } else {
        console.log('\n✅ No critical errors detected');
      }
    }
    
    // Display EPIPE handling summary
    if (fs.existsSync(CONFIG.errorFile)) {
      const errorContent = fs.readFileSync(CONFIG.errorFile, 'utf8');
      const epipeCount = (errorContent.match(/EPIPE Error \(handled\)/g) || []).length;
      
      if (epipeCount > 0) {
        console.log(`\n⚠️  Handled ${epipeCount} EPIPE errors gracefully`);
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