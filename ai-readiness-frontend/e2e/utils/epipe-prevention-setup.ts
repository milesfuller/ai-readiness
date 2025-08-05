import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Setup for EPIPE Prevention
 * 
 * This setup script runs before all tests and configures the environment
 * to minimize the risk of EPIPE (Broken Pipe) errors during test execution.
 */
async function globalSetup(config: FullConfig) {
  console.log('🛡️  Setting up EPIPE prevention measures...');
  
  // Create output directories with proper permissions
  const outputDirs = [
    'test-results/epipe-safe',
    'test-results/html-report-epipe-safe',
    'test-results/logs',
    'test-results/traces',
    'test-results/screenshots',
    'test-results/videos',
  ];
  
  for (const dir of outputDirs) {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true, mode: 0o755 });
      console.log(`📁 Created directory: ${fullPath}`);
    }
  }
  
  // Set up process event handlers for graceful shutdown
  setupProcessHandlers();
  
  // Configure buffer sizes for stdout/stderr
  configureProcessBuffers();
  
  // Pre-launch browser to validate configuration
  await validateBrowserLaunch(config);
  
  // Set up file-based logging
  setupFileLogging();
  
  console.log('✅ EPIPE prevention setup completed successfully');
}

/**
 * Set up process event handlers to prevent abrupt pipe closures
 */
function setupProcessHandlers() {
  // Handle SIGPIPE gracefully instead of crashing
  process.on('SIGPIPE', () => {
    console.log('⚠️  SIGPIPE received - handling gracefully');
  });
  
  // Handle EPIPE errors on stdout/stderr
  if (process.stdout) {
    process.stdout.on('error', (err: any) => {
      if (err.code === 'EPIPE') {
        console.log('⚠️  STDOUT EPIPE handled gracefully');
        return;
      }
      throw err;
    });
  }
  
  if (process.stderr) {
    process.stderr.on('error', (err: any) => {
      if (err.code === 'EPIPE') {
        console.log('⚠️  STDERR EPIPE handled gracefully');
        return;
      }
      throw err;
    });
  }
  
  // Handle uncaught exceptions that might be EPIPE-related
  process.on('uncaughtException', (err: any) => {
    if (err.code === 'EPIPE') {
      console.log('⚠️  Uncaught EPIPE exception handled gracefully');
      return;
    }
    console.error('❌ Uncaught exception:', err);
    process.exit(1);
  });
}

/**
 * Configure process buffers to handle large outputs
 */
function configureProcessBuffers() {
  // Increase the default highWaterMark for streams
  const originalWrite = process.stdout.write;
  const originalErrorWrite = process.stderr.write;
  
  // Buffer stdout writes to prevent EPIPE
  (process.stdout as any).write = function(chunk: any, encoding?: any, callback?: any) {
    try {
      return originalWrite.call(this, chunk, encoding, callback);
    } catch (err: any) {
      if (err.code === 'EPIPE') {
        console.log('⚠️  STDOUT write EPIPE handled');
        if (callback) callback();
        return true;
      }
      throw err;
    }
  };
  
  // Buffer stderr writes to prevent EPIPE
  (process.stderr as any).write = function(chunk: any, encoding?: any, callback?: any) {
    try {
      return originalErrorWrite.call(this, chunk, encoding, callback);
    } catch (err: any) {
      if (err.code === 'EPIPE') {
        console.log('⚠️  STDERR write EPIPE handled');
        if (callback) callback();
        return true;
      }
      throw err;
    }
  };
}

/**
 * Validate browser launch configuration
 */
async function validateBrowserLaunch(config: FullConfig) {
  console.log('🔍 Validating browser launch configuration...');
  
  try {
    const browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--disable-ipc-flooding-protection',
      ],
      timeout: 30000,
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    
    const page = await context.newPage();
    
    // Test basic navigation
    await page.goto('data:text/html,<h1>Browser Launch Test</h1>', {
      timeout: 10000,
      waitUntil: 'domcontentloaded',
    });
    
    await page.close();
    await context.close();
    await browser.close();
    
    console.log('✅ Browser launch validation successful');
  } catch (error) {
    console.error('❌ Browser launch validation failed:', error);
    throw error;
  }
}

/**
 * Set up file-based logging to reduce console output
 */
function setupFileLogging() {
  const logDir = path.resolve('test-results/logs');
  const logFile = path.join(logDir, `setup-${Date.now()}.log`);
  
  // Create a file-based logger
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Redirect console methods to file
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.log = function(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    logStream.write(`[LOG] ${new Date().toISOString()}: ${message}\n`);
    
    // Also log to console in non-CI environments
    if (!process.env.CI) {
      originalConsoleLog.apply(console, args);
    }
  };
  
  console.error = function(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    logStream.write(`[ERROR] ${new Date().toISOString()}: ${message}\n`);
    
    // Always log errors to console
    originalConsoleError.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    logStream.write(`[WARN] ${new Date().toISOString()}: ${message}\n`);
    
    // Log warnings to console in non-CI environments
    if (!process.env.CI) {
      originalConsoleWarn.apply(console, args);
    }
  };
  
  // Set up cleanup on process exit
  process.on('exit', () => {
    logStream.end();
  });
  
  console.log(`📝 File-based logging set up: ${logFile}`);
}

export default globalSetup;