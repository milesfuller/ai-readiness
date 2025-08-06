/**
 * Global Setup for EPIPE-Safe Testing
 * 
 * This setup initializes the connection pool and prepares the test environment
 * for parallel execution with EPIPE prevention.
 */

import { chromium, FullConfig } from '@playwright/test';
import { defaultConnectionPool } from './connection-pool';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting EPIPE-Safe Test Environment Setup...');
  
  // Initialize connection pool
  console.log('📡 Initializing connection pool...');
  
  // Set up connection pool event listeners for monitoring
  defaultConnectionPool.on('connectionCreated', ({ connectionId, activeCount }) => {
    console.log(`✅ Connection created: ${connectionId} (Active: ${activeCount})`);
  });
  
  defaultConnectionPool.on('connectionReleased', ({ connectionId, activeCount }) => {
    console.log(`🔄 Connection released: ${connectionId} (Active: ${activeCount})`);
  });
  
  defaultConnectionPool.on('epipeError', ({ connectionId, error }) => {
    console.log(`⚠️  EPIPE error detected: ${connectionId} - ${error}`);
  });
  
  defaultConnectionPool.on('connectionRetry', ({ connectionId, retryCount, delay }) => {
    console.log(`🔁 Connection retry: ${connectionId} (Attempt: ${retryCount}, Delay: ${delay}ms)`);
  });

  // Pre-warm browser for faster test execution
  console.log('🌡️  Pre-warming browser instances...');
  try {
    const browser = await chromium.launch({
      args: [
        '--max-connections-per-host=2',
        '--max-connections-per-proxy=2',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    // Create a test context to verify browser startup
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('about:blank');
    await page.close();
    await context.close();
    await browser.close();
    
    console.log('✅ Browser pre-warming completed');
  } catch (error) {
    console.warn('⚠️  Browser pre-warming failed:', (error as Error).message);
  }

  // Set up process handlers for graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📤 Received SIGTERM, shutting down connection pool...');
    await defaultConnectionPool.shutdown();
  });

  process.on('SIGINT', async () => {
    console.log('📤 Received SIGINT, shutting down connection pool...');
    await defaultConnectionPool.shutdown();
  });

  // Display initial connection pool status
  const status = defaultConnectionPool.getStatus();
  console.log('📊 Connection Pool Status:');
  console.log(`   • Max Concurrent: ${status.maxConcurrent}`);
  console.log(`   • Health Score: ${status.healthScore}%`);

  console.log('🎯 EPIPE-Safe Test Environment Ready!');
  
  return async () => {
    // This function is called after all tests complete
    console.log('🧹 Running global teardown...');
    await defaultConnectionPool.shutdown();
  };
}

export default globalSetup;