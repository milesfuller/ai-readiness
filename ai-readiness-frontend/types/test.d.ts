/**
 * Test-specific type declarations
 * Used across all test files for consistent type checking
 */

import { Page, Locator } from '@playwright/test'

// Test user types - comprehensive definition to avoid conflicts
export interface TestUser {
  // Required fields
  email: string
  password: string
  userId: string
  organizationId: string
  
  // Optional fields for compatibility with different test contexts
  firstName?: string
  lastName?: string
  organizationName?: string
  role?: 'user' | 'org_admin' | 'system_admin'
  
  // Alternative field names for legacy compatibility
  id?: string
  
  // Profile data
  profile?: {
    id: string
    userId: string
    firstName: string
    lastName: string
    department?: string
    jobTitle?: string
    preferences?: Record<string, any>
    createdAt?: string
    updatedAt?: string
  }
  
  // Metadata
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
}

// Survey response option types - fixing the array type issue
export interface SurveyOption {
  value: string
  label: string
  description: string
}

// Extend Playwright types for better testing
declare global {
  namespace PlaywrightTest {
    interface Matchers<R> {
      toHaveText(expected: string | RegExp): R
      toBeVisible(): R
      toHaveAttribute(name: string, value?: string): R
    }
  }
}

// Mock API types
export interface MockAPIResponse {
  status: number
  data: any
  headers: Record<string, string>
}

// Fix for Locator being passed as string
export type LocatorOrString = Locator | string

export {}