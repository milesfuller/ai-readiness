/**
 * Integration Test Setup
 * 
 * This file runs before all integration tests to set up the test environment.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Set test environment
(process.env as any).NODE_ENV = 'test';
(process.env as any).NEXT_PUBLIC_ENVIRONMENT = 'test';

// Configure test database connection
(process.env as any).TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
(process.env as any).TEST_DB_PORT = process.env.TEST_DB_PORT || '5433';
(process.env as any).TEST_DB_NAME = process.env.TEST_DB_NAME || 'test_ai_readiness';
(process.env as any).TEST_DB_USER = process.env.TEST_DB_USER || 'postgres';
(process.env as any).TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'testpass123';

// Configure test Supabase
(process.env as any).TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
(process.env as any).TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
(process.env as any).TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key';

// Increase timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  // Keep log and info for debugging
  log: console.log,
  info: console.info,
};