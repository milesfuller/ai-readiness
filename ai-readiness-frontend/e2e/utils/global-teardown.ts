/**
 * Global Teardown for EPIPE-Safe Testing
 * 
 * This teardown ensures proper cleanup of connection pools and resources
 * to prevent EPIPE errors and resource leaks.
 */

import { FullConfig } from '@playwright/test';
import { defaultConnectionPool } from './connection-pool';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting EPIPE-Safe Test Environment Cleanup...');
  
  try {
    // Get final metrics before shutdown
    const metrics = defaultConnectionPool.getMetrics();
    const status = defaultConnectionPool.getStatus();
    
    console.log('📊 Final Test Metrics:');
    console.log(`   • Total Connections: ${metrics.totalConnections}`);
    console.log(`   • Failed Connections: ${metrics.failedConnections}`);
    console.log(`   • EPIPE Errors: ${metrics.epipeErrors}`);
    console.log(`   • Retry Count: ${metrics.retriedConnections}`);
    console.log(`   • Health Score: ${status.healthScore}%`);
    console.log(`   • Average Connection Time: ${metrics.avgConnectionTime.toFixed(2)}ms`);

    // Log warnings for high error rates
    if (metrics.epipeErrors > 0) {
      const epipeRate = (metrics.epipeErrors / metrics.totalConnections) * 100;
      if (epipeRate > 10) {
        console.warn(`⚠️  High EPIPE error rate: ${epipeRate.toFixed(2)}%`);
        console.warn('   Consider reducing parallel workers or increasing connection limits');
      }
    }

    // Shutdown connection pool gracefully
    console.log('📡 Shutting down connection pool...');
    await defaultConnectionPool.shutdown();
    
    // Wait a bit for any lingering connections to close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ EPIPE-Safe Test Environment Cleanup Complete!');
    
  } catch (error) {
    console.error('❌ Error during global teardown:', (error as Error).message);
    
    // Force shutdown if graceful shutdown fails
    try {
      await defaultConnectionPool.shutdown();
    } catch (forceError) {
      console.error('❌ Force shutdown failed:', (forceError as Error).message);
    }
  }
  
  // Final cleanup of any remaining processes
  if (process.env.CI) {
    console.log('🔧 CI environment detected, ensuring all processes are cleaned up...');
    
    // Kill any remaining browser processes
    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        const { exec } = require('child_process');
        exec('pkill -f "chrome|firefox|webkit"', (error, stdout, stderr) => {
          if (error && error.code !== 1) {
            console.warn('Warning: Could not kill browser processes:', error.message);
          }
        });
      }
    } catch (error) {
      console.warn('Warning: Process cleanup failed:', (error as Error).message);
    }
  }
}

export default globalTeardown;