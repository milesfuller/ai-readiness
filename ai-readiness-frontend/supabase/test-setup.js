// Jest test setup for Supabase integration tests
// This file runs before each test file

const { testHelper, setupTestEnvironment, teardownTestEnvironment } = require('./test-utils')

// Global test setup - runs once before all tests
beforeAll(async () => {
  console.log('🧪 Setting up Supabase test environment...')
  
  try {
    // Verify test instance is running
    await setupTestEnvironment()
    console.log('✅ Supabase test environment ready')
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error.message)
    console.error('   Make sure to run: ./supabase/start-test-instance.sh')
    process.exit(1)
  }
}, 60000) // 60 second timeout for setup

// Global test teardown - runs once after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    await teardownTestEnvironment()
    console.log('✅ Test environment cleaned up')
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message)
  }
}, 30000) // 30 second timeout for cleanup

// Before each test - clean slate
beforeEach(async () => {
  // Reset test data before each test
  await testHelper.resetTestData()
  
  // Sign out any existing sessions
  await testHelper.signOut()
}, 10000) // 10 second timeout per test setup

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Make test helper available globally
global.testHelper = testHelper

console.log('🔧 Supabase test setup complete')