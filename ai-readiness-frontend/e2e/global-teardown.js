/**
 * Global Teardown for E2E Tests
 * Cleans up test environment and mock servers
 */

async function globalTeardown() {
  console.log('🧹 Starting E2E test environment cleanup...');
  
  try {
    // Stop Supabase mock server
    const mockServer = require('./utils/supabase-mock-server');
    await mockServer.stop();
    console.log('✅ Supabase mock server stopped');
    
    // Clean up test data
    await mockServer.cleanup();
    console.log('✅ Test data cleaned up');
    
    console.log('🎉 E2E test environment cleanup complete!');
    
  } catch (error) {
    console.error('❌ E2E cleanup failed:', error);
    // Don't throw - cleanup failures shouldn't fail tests
  }
}

module.exports = globalTeardown;