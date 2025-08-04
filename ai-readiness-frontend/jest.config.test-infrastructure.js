/**
 * Jest Configuration for Test Infrastructure
 * Optimized for testing against local Supabase instance
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Test environment configuration
  testEnvironment: 'node',
  
  // Setup files for infrastructure testing
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/tests/setup/infrastructure.setup.js'
  ],
  
  // Test patterns for infrastructure tests
  testMatch: [
    '**/__tests__/infrastructure/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/integration/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Environment variables for testing
  setupFiles: ['<rootDir>/tests/setup/env.setup.js'],
  
  // Module name mapping for test environment
  moduleNameMapping: {
    ...baseConfig.moduleNameMapping,
    '^@/test-utils$': '<rootDir>/tests/utils',
    '^@/test-fixtures$': '<rootDir>/tests/fixtures'
  },
  
  // Global test configuration
  globals: {
    'process.env': {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:8000',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:54322/postgres'
    }
  },
  
  // Test timeout for infrastructure tests (longer for setup/teardown)
  testTimeout: 30000,
  
  // Coverage configuration for infrastructure
  collectCoverageFrom: [
    ...baseConfig.collectCoverageFrom,
    'lib/supabase/**/*.{js,jsx,ts,tsx}',
    'lib/auth/**/*.{js,jsx,ts,tsx}',
    'tests/utils/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Infrastructure-specific coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './lib/supabase/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Max workers for infrastructure tests (lower to avoid overwhelming services)
  maxWorkers: 2,
  
  // Run tests serially for infrastructure (to avoid conflicts)
  runInBand: true,
  
  // Verbose output for debugging
  verbose: true
};