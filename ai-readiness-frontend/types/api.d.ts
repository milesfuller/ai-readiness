/**
 * API-specific type declarations
 * Includes request/response types and API-related utilities
 */

import { NextRequest, NextResponse } from 'next/server';

// Test-specific types for API testing
export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  role?: 'user' | 'org_admin' | 'system_admin';
  userId?: string;
  organizationId?: string;
}

export interface APITestResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  response: Response;
  duration?: number;
}

// Fix for enhanced-deployment-validation.spec.ts export issue
export interface APITestHelpers {
  testDataGenerator: any;
  performanceMonitor: any;
  withRetry: <T>(operation: () => Promise<T>, maxRetries?: number, delay?: number) => Promise<T>;
  createAPIClient: (page: any) => any;
}

// Default export for api-test-helpers
declare module '@/e2e/utils/api-test-helpers' {
  const helpers: APITestHelpers;
  export default helpers;
  export const testDataGenerator: any;
  export const performanceMonitor: any;
  export function withRetry<T>(operation: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T>;
  export function createAPIClient(page: any): any;
}

export {};