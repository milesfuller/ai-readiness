// Jest configuration for Supabase testing
// This extends the main Jest config with test-specific settings

const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  displayName: 'Supabase Integration Tests',
  testEnvironment: 'node',
  
  // Test-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.database.js'
  ],
  
  // Focus on integration tests
  testMatch: [
    '**/__tests__/integration/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/supabase/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Longer timeout for database operations
  testTimeout: 30000,
  
  // Coverage settings for integration tests
  collectCoverageFrom: [
    'lib/supabase/**/*.{js,jsx,ts,tsx}',
    'app/api/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  
  // Global variables for tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.NEXT_PUBLIC_SUPABASE_URL': 'http://localhost:54321',
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  },
  
  // Module name mapping for test environment
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@/supabase/(.*)$': '<rootDir>/supabase/$1'
  },
  
  // Parallel testing (disabled for database tests to avoid conflicts)
  maxWorkers: 1
}