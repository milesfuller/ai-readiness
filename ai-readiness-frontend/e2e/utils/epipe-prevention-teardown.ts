import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Teardown for EPIPE Prevention
 * 
 * This teardown script runs after all tests complete and performs cleanup
 * operations to ensure graceful shutdown and prevent lingering EPIPE issues.
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running EPIPE prevention teardown...');
  
  try {
    // Clean up any hanging processes
    await cleanupProcesses();
    
    // Generate test summary report
    await generateTestSummary();
    
    // Clean up temporary files
    cleanupTempFiles();
    
    // Flush and close any open streams
    await flushStreams();
    
    // Generate performance metrics
    generatePerformanceReport();
    
    console.log('✅ EPIPE prevention teardown completed successfully');
  } catch (error) {
    console.error('❌ Error during teardown:', error);
    // Don't throw to prevent masking test results
  }
}

/**
 * Clean up any hanging browser or server processes
 */
async function cleanupProcesses() {
  console.log('🔄 Cleaning up processes...');
  
  // Kill any remaining Playwright processes
  try {
    const { execSync } = require('child_process');
    
    // Kill any hanging Chrome processes
    try {
      execSync('pkill -f "chrome.*--test-type" || true', { stdio: 'ignore' });
      console.log('🔄 Cleaned up Chrome test processes');
    } catch (e) {
      // Ignore errors - processes might not exist
    }
    
    // Kill any hanging Node.js dev server processes  
    try {
      execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
      console.log('🔄 Cleaned up Next.js dev server processes');
    } catch (e) {
      // Ignore errors - processes might not exist
    }
    
    // Wait a moment for processes to terminate gracefully
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log('⚠️  Process cleanup error (non-critical):', error);
  }
}

/**
 * Generate a comprehensive test summary report
 */
async function generateTestSummary() {
  console.log('📊 Generating test summary report...');
  
  try {
    const resultsPath = path.resolve('test-results/epipe-safe');
    const summaryPath = path.join(resultsPath, 'test-summary.json');
    
    // Collect test result files
    const resultFiles = [];
    
    if (fs.existsSync(path.join(resultsPath, '../results-epipe-safe.json'))) {
      resultFiles.push(path.join(resultsPath, '../results-epipe-safe.json'));
    }
    
    if (fs.existsSync(path.join(resultsPath, '../junit-epipe-safe.xml'))) {
      resultFiles.push(path.join(resultsPath, '../junit-epipe-safe.xml'));
    }
    
    const summary = {
      timestamp: new Date().toISOString(),
      configuration: 'epipe-prevention',
      resultFiles: resultFiles,
      outputDirectory: resultsPath,
      
      // System information
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
      
      // Environment information
      environment: {
        CI: !!process.env.CI,
        NODE_ENV: process.env.NODE_ENV,
        PLAYWRIGHT_TEST: process.env.PLAYWRIGHT_TEST,
      },
      
      // Teardown completion
      teardownCompleted: true,
      teardownTimestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📋 Test summary written to: ${summaryPath}`);
    
  } catch (error) {
    console.log('⚠️  Error generating test summary:', error);
  }
}

/**
 * Clean up temporary files and directories
 */
function cleanupTempFiles() {
  console.log('🗑️  Cleaning up temporary files...');
  
  try {
    const tempDirs = [
      'test-results/.temp',
      'test-results/temp',
      '.temp',
    ];
    
    for (const dir of tempDirs) {
      const fullPath = path.resolve(dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`🗑️  Removed temporary directory: ${fullPath}`);
      }
    }
    
    // Clean up old log files (keep only the last 10)
    const logsDir = path.resolve('test-results/logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logsDir, file),
          mtime: fs.statSync(path.join(logsDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Keep only the 10 most recent log files
      const filesToDelete = logFiles.slice(10);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Removed old log file: ${file.name}`);
      }
    }
    
  } catch (error) {
    console.log('⚠️  Error cleaning up temporary files:', error);
  }
}

/**
 * Flush and close any open streams to prevent EPIPE
 */
async function flushStreams() {
  console.log('💧 Flushing streams...');
  
  return new Promise<void>((resolve) => {
    let pending = 0;
    
    const checkComplete = () => {
      pending--;
      if (pending === 0) {
        resolve();
      }
    };
    
    // Flush stdout
    if (process.stdout.writable) {
      pending++;
      process.stdout.end(checkComplete);
    }
    
    // Flush stderr  
    if (process.stderr.writable) {
      pending++;
      process.stderr.end(checkComplete);
    }
    
    // If no streams to flush, resolve immediately
    if (pending === 0) {
      resolve();
    }
    
    // Safety timeout
    setTimeout(() => {
      console.log('⚠️  Stream flush timeout - proceeding anyway');
      resolve();
    }, 5000);
  });
}

/**
 * Generate performance metrics report
 */
function generatePerformanceReport() {
  console.log('📈 Generating performance report...');
  
  try {
    const performanceData = {
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      
      // Environment performance indicators
      environment: {
        maxOldSpaceSize: process.env.NODE_OPTIONS?.includes('--max-old-space-size') ? 
          process.env.NODE_OPTIONS.match(/--max-old-space-size=(\d+)/)?.[1] : 'default',
        uvThreadPoolSize: process.env.UV_THREADPOOL_SIZE || 'default',
      },
      
      // Test execution performance
      execution: {
        singleWorker: true,
        sequentialExecution: true,
        fileBasedReporting: true,
        epipePrevention: true,
      },
    };
    
    const perfPath = path.resolve('test-results/performance-report.json');
    fs.writeFileSync(perfPath, JSON.stringify(performanceData, null, 2));
    console.log(`📈 Performance report written to: ${perfPath}`);
    
  } catch (error) {
    console.log('⚠️  Error generating performance report:', error);
  }
}

export default globalTeardown;