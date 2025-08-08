/**
 * Jest Configuration for Integration Tests
 */

module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/contracts/(.*)$': '<rootDir>/contracts/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
  testTimeout: 30000, // 30 seconds for database operations
  collectCoverageFrom: [
    'contracts/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};