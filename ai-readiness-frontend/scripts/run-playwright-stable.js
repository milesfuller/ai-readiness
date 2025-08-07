#!/usr/bin/env node

/**
 * Stable Playwright Test Runner
 * 
 * Runs Playwright tests with enhanced stability features and EPIPE prevention.
 * This script manages the test environment to prevent connection issues.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryDelay: 5000,
  healthCheckTimeout: 30000,
  preflightChecks: true,
  cleanupOnExit: true,
  resourceLimits: {
    maxConnections: 4,
    maxWorkers: 2,
    memoryLimit: '2048m'
  }
};

class StableTestRunner {
  constructor() {
    this.processes = new Set();
    this.isShuttingDown = false;
    this.setupSignalHandlers();
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
        await this.gracefulShutdown();
        process.exit(0);
      });
    });

    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.gracefulShutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('💥 Unhandled Rejection:', reason);
      await this.gracefulShutdown();
      process.exit(1);
    });
  }

  /**
   * Run preflight checks before starting tests
   */
  async runPreflightChecks() {
    console.log('🔍 Running preflight checks...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`   Node.js version: ${nodeVersion}`);
    
    // Check available memory
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    console.log(`   System memory: ${freeMem}GB free / ${totalMem}GB total`);
    
    if (freeMem < 2) {
      console.warn('⚠️  Low memory detected, reducing test parallelism');
      CONFIG.resourceLimits.maxWorkers = 1;
    }

    // Check if playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      console.log('   ✅ Playwright installation verified');
    } catch (error) {
      throw new Error('❌ Playwright not found. Run: npm install @playwright/test');
    }

    // Check test directories
    const requiredDirs = [
      'e2e',
      'test-results',
      'playwright/.auth'
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   📁 Created directory: ${dir}`);
      }
    }

    // Check if dev server is running
    try {
      const response = await fetch('http://localhost:3000', { 
        signal: AbortSignal.timeout(5000) 
      });
      if (response.ok) {
        console.log('   ✅ Development server is running');
      }
    } catch (error) {
      console.warn('   ⚠️  Development server not detected, will start automatically');
    }

    console.log('✅ Preflight checks completed');
  }

  /**
   * Set optimal environment variables for stability
   */
  setEnvironmentVariables() {
    const env = {
      ...process.env,
      
      // Node.js optimization
      NODE_OPTIONS: '--max-old-space-size=2048 --max-http-header-size=8192',
      UV_THREADPOOL_SIZE: '4',
      
      // Playwright configuration
      PLAYWRIGHT_WORKERS: CONFIG.resourceLimits.maxWorkers.toString(),
      PLAYWRIGHT_TIMEOUT: '120000',
      PLAYWRIGHT_EXPECT_TIMEOUT: '15000',
      
      // Connection management
      PLAYWRIGHT_MAX_CONNECTIONS: CONFIG.resourceLimits.maxConnections.toString(),
      
      // Disable features that can cause issues
      NEXT_TELEMETRY_DISABLED: '1',
      DISABLE_SSL_VERIFY: '1',
      NODE_TLS_REJECT_UNAUTHORIZED: '0',
      
      // Test environment
      NODE_ENV: 'test',
      PLAYWRIGHT_TEST: 'true',
      
      // Stability features
      EPIPE_PREVENTION: 'true',
      CONNECTION_POOL_ENABLED: 'true'
    };

    // Set environment variables
    Object.assign(process.env, env);
    
    console.log('🔧 Environment variables configured for stability');
  }

  /**
   * Run Playwright tests with stability enhancements
   */
  async runTests(args = []) {
    console.log('🎭 Starting Playwright tests with stability enhancements...');
    
    // Default arguments for stability
    const stableArgs = [
      '--config=playwright.config.stable.ts',
      '--reporter=line,html',
      '--max-failures=5',
      ...args
    ];

    // Add workers configuration
    if (!args.includes('--workers')) {
      stableArgs.push(`--workers=${CONFIG.resourceLimits.maxWorkers}`);
    }

    let attempt = 1;
    
    while (attempt <= CONFIG.maxRetries) {
      console.log(`\n📊 Test attempt ${attempt}/${CONFIG.maxRetries}`);
      
      try {
        const result = await this.executePlaywright(stableArgs);
        
        if (result.success) {
          console.log('✅ Tests completed successfully!');
          await this.generateSummaryReport(result);
          return true;
        } else {
          console.log(`❌ Tests failed on attempt ${attempt}`);
          
          if (attempt < CONFIG.maxRetries) {
            console.log(`⏳ Waiting ${CONFIG.retryDelay}ms before retry...`);
            await this.sleep(CONFIG.retryDelay);
            
            // Clean up between attempts
            await this.cleanupBetweenAttempts();
          }
        }
        
      } catch (error) {
        console.error(`💥 Test execution error on attempt ${attempt}:`, error.message);
        
        if (attempt < CONFIG.maxRetries) {
          await this.sleep(CONFIG.retryDelay);
        }
      }
      
      attempt++;
    }
    
    console.error(`❌ All test attempts failed after ${CONFIG.maxRetries} retries`);
    return false;
  }

  /**
   * Execute Playwright with process management
   */
  async executePlaywright(args) {
    return new Promise((resolve) => {
      const playwrightProcess = spawn('npx', ['playwright', 'test', ...args], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: process.env
      });

      this.processes.add(playwrightProcess);

      let output = '';
      
      playwrightProcess.on('exit', (code) => {
        this.processes.delete(playwrightProcess);
        
        const success = code === 0;
        resolve({
          success,
          code,
          output
        });
      });

      playwrightProcess.on('error', (error) => {
        this.processes.delete(playwrightProcess);
        console.error('Process error:', error);
        resolve({
          success: false,
          code: 1,
          output,
          error: error.message
        });
      });
    });
  }

  /**
   * Cleanup between test attempts
   */
  async cleanupBetweenAttempts() {
    console.log('🧹 Cleaning up between attempts...');
    
    try {
      // Kill any remaining browser processes
      if (process.platform === 'linux' || process.platform === 'darwin') {
        execSync('pkill -f "chrome|firefox|webkit" || true', { stdio: 'ignore' });
      }
      
      // Clear temporary files
      const tempDirs = [
        'test-results/temp',
        'playwright/.auth/temp'
      ];
      
      for (const dir of tempDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(result) {
    const reportPath = 'test-results/stable-test-summary.json';
    
    const summary = {
      timestamp: new Date().toISOString(),
      success: result.success,
      exitCode: result.code,
      duration: Date.now() - this.startTime,
      environment: {
        node: process.version,
        platform: process.platform,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024),
          free: Math.round(os.freemem() / 1024 / 1024)
        }
      },
      configuration: CONFIG
    };

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary saved to: ${reportPath}`);
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    console.log('🛑 Initiating graceful shutdown...');

    // Kill all spawned processes
    for (const process of this.processes) {
      try {
        process.kill('SIGTERM');
      } catch (error) {
        console.warn('Warning: Could not kill process:', error.message);
      }
    }

    // Wait for processes to exit
    await this.sleep(2000);

    // Force kill if necessary
    for (const process of this.processes) {
      try {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      } catch (error) {
        // Process might already be dead
      }
    }

    // Final cleanup
    if (CONFIG.cleanupOnExit) {
      await this.cleanupBetweenAttempts();
    }

    console.log('✅ Graceful shutdown completed');
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Main execution method
   */
  async run(args) {
    this.startTime = Date.now();
    
    try {
      // Set environment
      this.setEnvironmentVariables();
      
      // Run preflight checks
      if (CONFIG.preflightChecks) {
        await this.runPreflightChecks();
      }
      
      // Run tests
      const success = await this.runTests(args);
      
      if (success) {
        console.log('\n🎉 All tests completed successfully!');
        return 0;
      } else {
        console.log('\n❌ Tests failed');
        return 1;
      }
      
    } catch (error) {
      console.error('💥 Fatal error:', error);
      return 1;
      
    } finally {
      await this.gracefulShutdown();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new StableTestRunner();
  
  runner.run(args)
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('💥 Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = StableTestRunner;