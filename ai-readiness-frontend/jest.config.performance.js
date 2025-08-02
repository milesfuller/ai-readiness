/**
 * Performance-optimized Jest configuration for AI Readiness Assessment
 * Focuses on speed and parallel execution
 */

const baseConfig = require('./jest.config.base.js');

module.exports = {
  ...baseConfig,
  
  // Performance optimizations
  maxWorkers: '50%', // Use half of available CPU cores
  
  // Cache configuration for faster subsequent runs
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Faster test execution
  testTimeout: 10000, // Reduced timeout for performance tests
  
  // Optimized module resolution
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/'
  ],
  
  // Specific test patterns for performance testing
  testMatch: [
    '**/__tests__/**/*performance*.(js|jsx|ts|tsx)',
    '**/*performance.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // Performance-specific setup
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.setup.performance.js'
  ],
  
  // Reduced coverage for performance tests
  collectCoverage: false,
  
  // Performance reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'performance-results.xml'
    }]
  ],
  
  // Environment optimizations
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Transform optimizations
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: false,
          dynamicImport: true
        },
        target: 'es2020',
        transform: {
          react: {
            runtime: 'automatic',
            development: false
          }
        }
      }
    }]
  },
  
  // Parallel execution settings
  runInBand: false,
  detectLeaks: false,
  detectOpenHandles: false,
  
  // Global timeout for performance tests
  globalTimeout: 60000,
  
  // Performance test globals
  globals: {
    'performance-test': true,
    'benchmark-mode': true
  }
};