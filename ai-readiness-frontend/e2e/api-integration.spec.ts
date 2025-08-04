// API Integration Tests - Comprehensive API endpoint validation
// Tests all API endpoints with real data, authentication, and error scenarios

import { test, expect, Page } from '@playwright/test'
import type { 
  User, 
  Survey, 
  SurveyResponse, 
  ExportOptions,
  LLMConfig 
} from '../lib/types'

// Test configuration and utilities
class APITestUtils {
  constructor(private page: Page) {}

  // Authentication helpers
  async getAuthHeaders(email: string = 'admin@test-aireadiness.com', password: string = 'TestPassword123!'): Promise<Record<string, string>> {
    // Get session cookie from authenticated browser state
    const cookies = await this.page.context().cookies()
    const sessionCookie = cookies.find(c => c.name.includes('supabase'))
    
    return {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : ''
    }
  }

  // API request wrapper with error handling
  async apiRequest(endpoint: string, options: any = {}) {
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
    const url = `${baseUrl}/api${endpoint}`
    
    const response = await this.page.request.fetch(url, {
      ...options,
      headers: {
        ...(await this.getAuthHeaders()),
        ...options.headers
      }
    })

    const responseData = await response.json().catch(() => ({}))
    
    return {
      status: response.status(),
      headers: response.headers(),
      data: responseData,
      response
    }
  }

  // Test data generators
  generateTestUser() {
    const timestamp = Date.now()
    return {
      email: `test-${timestamp}@test-aireadiness.com`,
      password: 'TestPassword123!',
      firstName: 'API Test',
      lastName: 'User',
      organizationName: 'Test Org Inc'
    }
  }

  generateTestSurveyResponse() {
    return {
      responseText: "I'm really excited about AI tools helping me automate repetitive tasks in my workflow. The current manual processes are time-consuming and error-prone.",
      questionText: "How do you feel about AI adoption in your daily work?",
      expectedForce: "pull_of_new" as const,
      questionContext: "AI readiness assessment - automation focus",
      organizationId: "test-org-123",
      surveyId: "test-survey-456"
    }
  }

  generateExportOptions(): ExportOptions {
    return {
      format: 'csv' as const,
      includePersonalData: false,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      filters: {
        department: 'Engineering',
        status: 'completed'
      }
    }
  }

  // Performance measurement
  async measureResponseTime(apiCall: () => Promise<any>): Promise<{ result: any; duration: number }> {
    const start = performance.now()
    const result = await apiCall()
    const duration = performance.now() - start
    return { result, duration }
  }
}

// Test fixtures and setup
test.describe('API Integration Tests - Comprehensive Endpoint Validation', () => {
  let apiUtils: APITestUtils
  let testUser: any
  let authenticatedHeaders: Record<string, string>

  test.beforeAll(async ({ browser }) => {
    // Create a persistent context for API tests
    const context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
    })
    const page = await context.newPage()
    apiUtils = new APITestUtils(page)
    
    // Generate test user
    testUser = apiUtils.generateTestUser()
    
    // Pre-authenticate for protected endpoints
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'admin@test-aireadiness.com')  
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 10000 })
    
    authenticatedHeaders = await apiUtils.getAuthHeaders()
  })

  // TEST CATEGORY 1: AUTHENTICATION ENDPOINTS
  test.describe('Authentication API Endpoints', () => {
    
    test('POST /api/auth/signup - successful user registration', async () => {
      const { result, duration } = await apiUtils.measureResponseTime(async () => {
        return await apiUtils.apiRequest('/auth/signup', {
          method: 'POST',
          data: testUser
        })
      })

      // Validate response structure
      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('success', true)
      expect(result.data).toHaveProperty('user')
      expect(result.data.user).toHaveProperty('id')
      expect(result.data.user).toHaveProperty('email', testUser.email)
      expect(result.data).toHaveProperty('message')
      expect(result.data.message).toContain('verify')

      // Performance check
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

      // Security headers check
      expect(result.headers['x-content-type-options']).toBe('nosniff')
      expect(result.headers['x-frame-options']).toBeDefined()
    })

    test('POST /api/auth/signup - duplicate email handling', async () => {
      // First registration
      await apiUtils.apiRequest('/auth/signup', {
        method: 'POST',
        data: testUser
      })

      // Second registration with same email
      const result = await apiUtils.apiRequest('/auth/signup', {
        method: 'POST',
        data: testUser
      })

      expect(result.status).toBe(400)
      expect(result.data).toHaveProperty('error')
      expect(result.data.error).toContain('already')
    })

    test('POST /api/auth/signup - input validation', async () => {
      const invalidInputs = [
        { ...testUser, email: 'invalid-email' },
        { ...testUser, password: '123' }, // Too short
        { ...testUser, email: '' }, // Empty email
        { firstName: '', lastName: '', organizationName: '' } // Missing required fields
      ]

      for (const invalidInput of invalidInputs) {
        const result = await apiUtils.apiRequest('/auth/signup', {
          method: 'POST',
          data: invalidInput
        })

        expect(result.status).toBeGreaterThanOrEqual(400)
        expect(result.data).toHaveProperty('error')
      }
    })

    test('Authentication flow with session persistence', async ({ page }) => {
      // Login
      await page.goto('/auth/login')
      await page.fill('[name="email"]', 'admin@test-aireadiness.com')
      await page.fill('[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForURL('/dashboard')

      // Check session cookie is set
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(c => c.name.includes('supabase'))
      expect(sessionCookie).toBeDefined()
      expect(sessionCookie!.httpOnly).toBe(true) // Security check

      // Navigate to protected page
      await page.goto('/admin')
      await expect(page).toHaveURL('/admin')

      // Refresh page and check session persistence
      await page.reload()
      await expect(page).toHaveURL('/admin')
    })
  })

  // TEST CATEGORY 2: LLM ANALYSIS ENDPOINTS
  test.describe('LLM Analysis API Endpoints', () => {
    
    test('POST /api/llm/analyze - single response analysis', async () => {
      const testResponse = apiUtils.generateTestSurveyResponse()
      
      const { result, duration } = await apiUtils.measureResponseTime(async () => {
        return await apiUtils.apiRequest('/llm/analyze', {
          method: 'POST',
          data: {
            responseId: 'test-response-001',
            ...testResponse
          }
        })
      })

      // Validate response structure
      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('success', true)
      expect(result.data).toHaveProperty('result')
      
      // Validate LLM analysis result structure
      const analysisResult = result.data.result
      expect(analysisResult).toHaveProperty('primaryJtbdForce')
      expect(analysisResult).toHaveProperty('forceStrengthScore')
      expect(analysisResult).toHaveProperty('confidenceScore')
      expect(analysisResult).toHaveProperty('keyThemes')
      expect(analysisResult).toHaveProperty('sentimentAnalysis')
      expect(analysisResult).toHaveProperty('actionableInsights')

      // Validate score ranges
      expect(analysisResult.forceStrengthScore).toBeGreaterThanOrEqual(1)
      expect(analysisResult.forceStrengthScore).toBeLessThanOrEqual(5)
      expect(analysisResult.confidenceScore).toBeGreaterThanOrEqual(1)
      expect(analysisResult.confidenceScore).toBeLessThanOrEqual(5)

      // Performance check
      expect(duration).toBeLessThan(30000) // LLM calls can take longer
    })

    test('POST /api/llm/batch - batch analysis processing', async () => {
      const batchRequest = {
        responses: [
          {
            responseId: 'test-001',
            userResponse: 'Excited about AI automation possibilities',
            questionText: 'How do you feel about AI?',
            expectedForce: 'pull_of_new',
            employeeRole: 'Developer',
            employeeDepartment: 'Engineering'
          },
          {
            responseId: 'test-002',
            userResponse: 'Worried about job security with AI',
            questionText: 'What concerns do you have about AI?',
            expectedForce: 'anxiety_of_new',
            employeeRole: 'Analyst',
            employeeDepartment: 'Finance'
          }
        ],
        options: {
          parallel: true,
          includeOrganizationalAnalysis: true
        }
      }

      const { result, duration } = await apiUtils.measureResponseTime(async () => {
        return await apiUtils.apiRequest('/llm/batch', {
          method: 'POST',
          data: batchRequest
        })
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('results')
      expect(result.data).toHaveProperty('summary')
      expect(result.data.results).toHaveLength(2)
      expect(result.data.summary).toHaveProperty('totalProcessed', 2)
      expect(result.data.summary).toHaveProperty('successful')
      expect(result.data.summary).toHaveProperty('totalCostCents')

      // Performance check for batch processing
      expect(duration).toBeLessThan(60000) // Batch can take longer
    })

    test('GET /api/llm/analyze - health check', async () => {
      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'GET'
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('service', 'LLM Analysis API')
      expect(result.data).toHaveProperty('status')
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.data.status)
      expect(result.data).toHaveProperty('config')
      expect(result.data.config).toHaveProperty('provider')
      expect(result.data.config).toHaveProperty('model')
    })

    test('POST /api/llm/cost-tracking - cost monitoring', async () => {
      const result = await apiUtils.apiRequest('/llm/cost-tracking', {
        method: 'GET',
        data: {
          organizationId: 'test-org-123',
          timeframe: '7d'
        }
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('totalCost')
      expect(result.data).toHaveProperty('tokenUsage')
      expect(result.data).toHaveProperty('requestCount')
      expect(result.data).toHaveProperty('costBreakdown')
    })

    test('LLM API error handling and retries', async () => {
      // Test with invalid API key scenario
      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: {
          responseId: 'test-error',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'invalid_force' // Invalid force type
        }
      })

      expect(result.status).toBe(400)
      expect(result.data).toHaveProperty('error')
      expect(result.data.error).toContain('Invalid expectedForce')
    })
  })

  // TEST CATEGORY 3: DATA EXPORT ENDPOINTS
  test.describe('Data Export API Endpoints', () => {
    
    test('POST /api/export - CSV data export', async () => {
      const exportOptions = apiUtils.generateExportOptions()
      
      const { result, duration } = await apiUtils.measureResponseTime(async () => {
        return await apiUtils.apiRequest('/export', {
          method: 'POST',
          data: {
            options: exportOptions,
            type: 'data'
          }
        })
      })

      expect(result.status).toBe(200)
      expect(result.headers['content-type']).toContain('csv')
      expect(result.headers['content-disposition']).toContain('attachment')
      expect(result.headers['content-disposition']).toContain('.csv')
      
      // Performance check
      expect(duration).toBeLessThan(15000)
    })

    test('POST /api/export - PDF survey report generation', async () => {
      const result = await apiUtils.apiRequest('/export', {
        method: 'POST',
        data: {
          options: { format: 'pdf', includePersonalData: false },
          surveyId: 'test-survey-456',
          type: 'survey_report'
        }
      })

      expect(result.status).toBe(200)
      expect(result.headers['content-type']).toBe('application/pdf')
      expect(result.headers['content-disposition']).toContain('survey-report')
    })

    test('POST /api/export - Organization report generation', async () => {
      const result = await apiUtils.apiRequest('/export', {
        method: 'POST',
        data: {
          options: { format: 'pdf', includePersonalData: true },
          organizationId: 'test-org-123',
          type: 'organization_report'
        }
      })

      expect(result.status).toBe(200)
      expect(result.headers['content-type']).toBe('application/pdf')
      expect(result.headers['content-disposition']).toContain('organization-report')
    })

    test('GET /api/export - export capabilities and statistics', async () => {
      const result = await apiUtils.apiRequest('/export', {
        method: 'GET'
      })

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('formats')
      expect(result.data).toHaveProperty('canExportPersonalData')
      expect(result.data).toHaveProperty('recentExports')
      expect(result.data).toHaveProperty('exportCount')
      expect(Array.isArray(result.data.formats)).toBe(true)
    })

    test('Export permission validation', async () => {
      // Test non-admin user trying to export personal data
      const result = await apiUtils.apiRequest('/export', {
        method: 'POST',
        data: {
          options: { 
            format: 'csv', 
            includePersonalData: true // Should be denied
          },
          type: 'data'
        },
        headers: {
          // Simulate regular user session
          'x-user-role': 'user'
        }
      })

      expect(result.status).toBe(403)
      expect(result.data).toHaveProperty('error')
      expect(result.data.error).toContain('permissions')
    })
  })

  // TEST CATEGORY 4: SECURITY AND VALIDATION
  test.describe('Security and Validation Tests', () => {
    
    test('Security headers validation', async () => {
      const endpoints = ['/llm/analyze', '/export', '/auth/signup']
      
      for (const endpoint of endpoints) {
        const result = await apiUtils.apiRequest(endpoint, {
          method: 'GET'
        })

        // Check security headers
        expect(result.headers).toHaveProperty('x-content-type-options')
        expect(result.headers).toHaveProperty('x-frame-options')
        expect(result.headers['x-content-type-options']).toBe('nosniff')
      }
    })

    test('CORS headers validation', async () => {
      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://test-domain.com',
          'Access-Control-Request-Method': 'POST'
        }
      })

      // Should have appropriate CORS headers or reject invalid origins
      expect([200, 204, 405]).toContain(result.status)
    })

    test('Rate limiting behavior', async () => {
      const requests = []
      
      // Make multiple rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          apiUtils.apiRequest('/llm/analyze', {
            method: 'GET'
          })
        )
      }

      const results = await Promise.all(requests)
      const rateLimitedResponses = results.filter(r => r.status === 429)
      
      // Should have some rate limiting after rapid requests
      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].data).toHaveProperty('error')
        expect(rateLimitedResponses[0].data.error).toContain('rate')
      }
    })

    test('Input sanitization and XSS prevention', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '${7*7}', // Template injection
        'OR 1=1--' // SQL injection attempt
      ]

      for (const payload of xssPayloads) {
        const result = await apiUtils.apiRequest('/llm/analyze', {
          method: 'POST',
          data: {
            responseId: 'test-xss',
            responseText: payload,
            questionText: 'Test question',
            expectedForce: 'pull_of_new'
          }
        })

        // Should either reject malicious input or sanitize it
        if (result.status === 200) {
          expect(result.data.result.reasoning).not.toContain('<script>')
          expect(result.data.result.reasoning).not.toContain('javascript:')
        }
      }
    })

    test('Authentication bypass attempts', async () => {
      const protectedEndpoints = [
        '/llm/analyze',
        '/llm/batch', 
        '/export',
        '/admin/users'
      ]

      for (const endpoint of protectedEndpoints) {
        const result = await apiUtils.apiRequest(endpoint, {
          method: 'POST',
          headers: {
            // No auth headers
            'Content-Type': 'application/json'
          },
          data: { test: 'unauthorized' }
        })

        expect(result.status).toBe(401)
        expect(result.data).toHaveProperty('error')
        expect(result.data.error).toContain('Unauthorized')
      }
    })
  })

  // TEST CATEGORY 5: PERFORMANCE AND RELIABILITY
  test.describe('Performance and Reliability Tests', () => {
    
    test('API response time benchmarks', async () => {
      const benchmarks = [
        { endpoint: '/llm/analyze', method: 'GET', maxTime: 2000 },
        { endpoint: '/export', method: 'GET', maxTime: 1000 },
        { endpoint: '/auth/signup', method: 'GET', maxTime: 500 }
      ]

      for (const benchmark of benchmarks) {
        const { duration } = await apiUtils.measureResponseTime(async () => {
          return await apiUtils.apiRequest(benchmark.endpoint, {
            method: benchmark.method
          })
        })

        expect(duration).toBeLessThan(benchmark.maxTime)
      }
    })

    test('Concurrent request handling', async () => {
      const concurrentRequests = 10
      const requests = []

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          apiUtils.apiRequest('/llm/analyze', {
            method: 'GET'
          })
        )
      }

      const results = await Promise.all(requests)
      const successfulRequests = results.filter(r => r.status < 400)
      
      // Should handle most concurrent requests successfully
      expect(successfulRequests.length).toBeGreaterThanOrEqual(concurrentRequests * 0.8)
    })

    test('Large payload handling', async () => {
      const largeResponse = 'A'.repeat(5000) // 5KB response
      
      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: {
          responseId: 'test-large',
          responseText: largeResponse,
          questionText: 'Test with large response',
          expectedForce: 'pull_of_new'
        }
      })

      // Should handle large payloads gracefully
      expect([200, 413]).toContain(result.status) // Success or payload too large
      
      if (result.status === 413) {
        expect(result.data).toHaveProperty('error')
        expect(result.data.error).toContain('large')
      }
    })

    test('Error recovery and graceful degradation', async () => {
      // Test with malformed JSON
      const malformedResult = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: 'invalid-json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(malformedResult.status).toBe(400)
      expect(malformedResult.data).toHaveProperty('error')

      // Test with missing required fields
      const missingFieldsResult = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: { incomplete: 'data' }
      })

      expect(missingFieldsResult.status).toBe(400)
      expect(missingFieldsResult.data).toHaveProperty('error')
    })
  })

  // TEST CATEGORY 6: DATA INTEGRITY AND SUPABASE OPERATIONS
  test.describe('Data Integrity and Supabase Operations', () => {
    
    test('Database transaction integrity', async () => {
      const testResponseData = {
        responseId: 'test-integrity-001',
        responseText: 'Test response for integrity check',
        questionText: 'Integrity test question',
        expectedForce: 'pull_of_new',
        surveyId: 'test-survey-integrity'
      }

      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: testResponseData
      })

      if (result.status === 200) {
        expect(result.data).toHaveProperty('analysisId')
        expect(result.data).toHaveProperty('result')
        
        // Verify data was stored properly
        const storedResult = await apiUtils.apiRequest(`/llm/analyze/${result.data.analysisId}`, {
          method: 'GET'
        })

        expect(storedResult.status).toBe(200)
        expect(storedResult.data).toHaveProperty('analysis_result')
      }
    })

    test('Real-time data synchronization', async () => {
      // Create a survey response
      const responseData = apiUtils.generateTestSurveyResponse()
      
      const createResult = await apiUtils.apiRequest('/survey/responses', {
        method: 'POST',
        data: responseData
      })

      if (createResult.status === 201) {
        // Verify immediate availability
        const fetchResult = await apiUtils.apiRequest(`/survey/responses/${createResult.data.id}`, {
          method: 'GET'
        })

        expect(fetchResult.status).toBe(200)
        expect(fetchResult.data.id).toBe(createResult.data.id)
      }
    })

    test('Data validation and constraints', async () => {
      const invalidDataSets = [
        { responseText: '', questionText: 'Valid question', expectedForce: 'pull_of_new' }, // Empty response
        { responseText: 'Valid response', questionText: '', expectedForce: 'pull_of_new' }, // Empty question
        { responseText: 'Valid response', questionText: 'Valid question', expectedForce: 'invalid_force' }, // Invalid force
        { responseText: 'A'.repeat(10000), questionText: 'Valid question', expectedForce: 'pull_of_new' } // Too long
      ]

      for (const invalidData of invalidDataSets) {
        const result = await apiUtils.apiRequest('/llm/analyze', {
          method: 'POST',
          data: {
            responseId: 'test-validation',
            ...invalidData
          }
        })

        expect(result.status).toBeGreaterThanOrEqual(400)
        expect(result.data).toHaveProperty('error')
      }
    })
  })

  // TEST CATEGORY 7: ADMIN AND ORGANIZATION ENDPOINTS
  test.describe('Admin and Organization Management APIs', () => {
    
    test('Organization data access control', async () => {
      // Test org_admin accessing own organization data
      const ownOrgResult = await apiUtils.apiRequest('/admin/organizations/test-org-123', {
        method: 'GET'
      })

      expect([200, 404]).toContain(ownOrgResult.status)

      // Test org_admin accessing different organization data (should be denied)
      const otherOrgResult = await apiUtils.apiRequest('/admin/organizations/other-org-456', {
        method: 'GET'
      })

      expect([403, 404]).toContain(otherOrgResult.status)
    })

    test('User management API permissions', async () => {
      const userOperations = [
        { method: 'GET', endpoint: '/admin/users' },
        { method: 'POST', endpoint: '/admin/users', data: { email: 'new@test.com' } },
        { method: 'PUT', endpoint: '/admin/users/test-user-123', data: { role: 'user' } },
        { method: 'DELETE', endpoint: '/admin/users/test-user-123' }
      ]

      for (const operation of userOperations) {
        const result = await apiUtils.apiRequest(operation.endpoint, {
          method: operation.method,
          data: operation.data
        })

        // Should require admin permissions
        expect([200, 201, 403, 404]).toContain(result.status)
        
        if (result.status === 403) {
          expect(result.data).toHaveProperty('error')
          expect(result.data.error).toContain('permission')
        }
      }
    })

    test('Survey management and analytics', async () => {
      const surveyOperations = [
        { method: 'GET', endpoint: '/admin/surveys' },
        { method: 'GET', endpoint: '/admin/surveys/test-survey-123/analytics' },
        { method: 'PUT', endpoint: '/admin/surveys/test-survey-123', data: { status: 'archived' } }
      ]

      for (const operation of surveyOperations) {
        const result = await apiUtils.apiRequest(operation.endpoint, {
          method: operation.method,
          data: operation.data
        })

        expect([200, 404, 403]).toContain(result.status)
      }
    })
  })

  // TEST CATEGORY 8: ERROR SCENARIOS AND EDGE CASES
  test.describe('Error Scenarios and Edge Cases', () => {
    
    test('Network timeout simulation', async () => {
      // This would require network manipulation or mock endpoints
      // For now, test with very long analysis requests
      const longResponse = 'A'.repeat(8000) // Very long response

      const result = await apiUtils.apiRequest('/llm/analyze', {
        method: 'POST',
        data: {
          responseId: 'test-timeout',
          responseText: longResponse,
          questionText: 'Process this very long response',
          expectedForce: 'pull_of_new'
        }
      })

      // Should either succeed or timeout gracefully
      expect([200, 408, 500]).toContain(result.status)
      
      if (result.status !== 200) {
        expect(result.data).toHaveProperty('error')
      }
    })

    test('Database connection failures', async () => {
      // This is difficult to test without infrastructure control
      // Testing API behavior when database is unavailable would require
      // mock services or test environment configuration
      
      // For now, verify error handling structure
      const result = await apiUtils.apiRequest('/test-db-failure', {
        method: 'GET'
      })

      // Should return proper error structure even for non-existent endpoints
      expect(result.status).toBe(404)
    })

    test('Memory and resource limits', async () => {
      // Test with multiple concurrent expensive operations
      const expensiveOperations = []
      
      for (let i = 0; i < 5; i++) {
        expensiveOperations.push(
          apiUtils.apiRequest('/llm/batch', {
            method: 'POST',
            data: {
              responses: Array(10).fill(null).map((_, idx) => ({
                responseId: `test-resource-${i}-${idx}`,
                userResponse: 'Resource intensive test response',
                questionText: 'Resource test question',
                expectedForce: 'pull_of_new'
              }))
            }
          })
        )
      }

      const results = await Promise.allSettled(expensiveOperations)
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).status === 200)
      
      // Should handle at least some of the load
      expect(successful.length).toBeGreaterThan(0)
    })
  })
})

// Cleanup and reporting
test.afterAll(async () => {
  // Store test results in memory for coordination
  console.log('API Integration Tests completed')
})