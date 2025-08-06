/**
 * Security Middleware Mocks for Testing
 * Provides test-safe security middleware that bypasses production restrictions
 */

import { NextRequest, NextResponse } from 'next/server'

// Mock security middleware that's test-friendly
export const createMockSecurityMiddleware = () => {
  return jest.fn().mockImplementation(async (request: NextRequest) => {
    // In test environment, always return successful response
    // Security checks are tested separately and should not interfere with other tests
    const response = NextResponse.next()
    
    // Add minimal security headers for consistency
    response.headers.set('X-Test-Environment', 'true')
    response.headers.set('X-Security-Level', 'test-bypass')
    
    return response
  })
}

// Mock comprehensive security middleware
export const createMockComprehensiveSecurityMiddleware = () => {
  return jest.fn().mockImplementation(() => {
    return jest.fn().mockResolvedValue(
      new NextResponse(null, { 
        status: 200,
        headers: {
          'X-Test-Environment': 'true',
          'X-Security-Level': 'test-bypass',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        }
      })
    )
  })
}

// Mock test security middleware
export const createMockTestSecurityMiddleware = () => {
  return jest.fn().mockImplementation(async (request: NextRequest) => {
    // Always allow requests in test environment
    return null // null means continue processing
  })
}

// Mock production data guard that's safe for tests
export const createMockProductionDataGuard = () => {
  return jest.fn().mockImplementation(async (request: NextRequest) => {
    // Never block requests in test environment
    return null
  })
}

// Mock environment validator for tests
export const createMockTestEnvironmentValidator = () => {
  return jest.fn().mockImplementation(async (request: NextRequest) => {
    // Always validate successfully in test
    return null
  })
}

// Mock rate limiter that's permissive for tests  
export const createMockTestAwareRateLimit = () => {
  return jest.fn().mockImplementation(async (request: NextRequest) => {
    // Never rate limit in test environment
    return null
  })
}

// Mock utility functions
export const mockTestSecurityUtils = {
  shouldBypassRateLimit: jest.fn().mockReturnValue(true), // Always bypass in tests
  isTestEnvironment: jest.fn().mockReturnValue(true), // Always true in tests
  validateTestEnvironment: jest.fn().mockReturnValue({
    valid: true,
    errors: [],
    warnings: []
  }),
  createTestAwareRateLimit: createMockTestAwareRateLimit,
  createProductionDataGuard: createMockProductionDataGuard,
  createTestEnvironmentValidator: createMockTestEnvironmentValidator,
  createTestSecurityMonitor: jest.fn().mockImplementation(() => 
    jest.fn().mockResolvedValue(null)
  ),
  createTestSecurityMiddleware: createMockTestSecurityMiddleware,
  applyTestSecurityHeaders: jest.fn().mockImplementation((response: NextResponse) => {
    response.headers.set('X-Test-Environment', 'true')
    return response
  })
}

// Export default test security middleware
export default createMockTestSecurityMiddleware

// Mock the entire test-middleware module
export const mockTestMiddleware = {
  createTestAwareRateLimit: createMockTestAwareRateLimit,
  createProductionDataGuard: createMockProductionDataGuard,
  createTestEnvironmentValidator: createMockTestEnvironmentValidator,
  createTestSecurityMonitor: jest.fn().mockImplementation(() => 
    jest.fn().mockResolvedValue(null)
  ),
  createTestSecurityMiddleware: createMockTestSecurityMiddleware,
  applyTestSecurityHeaders: jest.fn().mockImplementation((response: NextResponse) => {
    response.headers.set('X-Test-Environment', 'true')
    return response
  }),
  testSecurityUtils: mockTestSecurityUtils
}