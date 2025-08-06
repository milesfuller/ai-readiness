/**
 * Test Orchestration Utilities
 * Centralized utilities for coordinating test execution across the comprehensive test architecture
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TestEnvironment {
  database: SupabaseClient
  apiBaseUrl: string
  environment: 'test' | 'local' | 'staging'
}

export interface TestUser {
  id: string
  email: string
  password: string
  role: 'admin' | 'user'
  verified: boolean
}

export interface TestSurvey {
  id: string
  title: string
  questions: Array<{
    id: string
    text: string
    type: 'scale' | 'multiple_choice' | 'text'
    options?: string[]
  }>
}

/**
 * Test Environment Manager
 * Handles setup and teardown of test environments across different test types
 */
export class TestEnvironmentManager {
  private environment: TestEnvironment
  private testUsers: TestUser[] = []
  private testSurveys: TestSurvey[] = []

  constructor(env: 'test' | 'local' | 'staging' = 'test') {
    this.environment = {
      database: createClient(),
      apiBaseUrl: this.getApiBaseUrl(env),
      environment: env
    }
  }

  private getApiBaseUrl(env: string): string {
    const urls = {
      test: 'http://localhost:3000',
      local: 'http://localhost:3000', 
      staging: process.env.STAGING_URL || 'https://staging.example.com'
    }
    return urls[env as keyof typeof urls] || urls.test
  }

  /**
   * Initialize test environment with clean state
   */
  async initialize(): Promise<void> {
    await this.cleanupTestData()
    await this.seedTestData()
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    await this.cleanupTestData()
  }

  private async cleanupTestData(): Promise<void> {
    const { database } = this.environment
    
    // Clean up in dependency order
    await database.from('survey_responses').delete().like('email', '%test%')
    await database.from('survey_sessions').delete().like('user_email', '%test%')
    await database.from('surveys').delete().like('title', '%Test%')
    
    // Clean up auth users (if admin permissions available)
    try {
      const { data: users } = await database.auth.admin.listUsers()
      const testUsers = users?.users.filter(u => u.email?.includes('test')) || []
      
      for (const user of testUsers) {
        await database.auth.admin.deleteUser(user.id)
      }
    } catch (error) {
      // Admin permissions not available in test environment
      console.warn('Could not clean up auth users:', error)
    }
  }

  private async seedTestData(): Promise<void> {
    // Seed test surveys
    const testSurvey: TestSurvey = {
      id: 'test-survey-1',
      title: 'Test AI Readiness Survey',
      questions: [
        {
          id: 'q1',
          text: 'How familiar are you with AI technologies?',
          type: 'scale',
          options: ['1', '2', '3', '4', '5']
        },
        {
          id: 'q2', 
          text: 'Which AI applications are you most interested in?',
          type: 'multiple_choice',
          options: ['Machine Learning', 'Natural Language Processing', 'Computer Vision', 'Robotics']
        }
      ]
    }

    const { error } = await this.environment.database
      .from('surveys')
      .insert([{
        id: testSurvey.id,
        title: testSurvey.title,
        questions: testSurvey.questions,
        created_at: new Date().toISOString(),
        status: 'active'
      }])

    if (error) {
      console.warn('Could not seed survey data:', error)
    }

    this.testSurveys.push(testSurvey)
  }

  /**
   * Create test user for authentication testing
   */
  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const testUser: TestUser = {
      id: '',
      email: userData.email || `test-${Date.now()}@example.com`,
      password: userData.password || 'TestPassword123!',
      role: userData.role || 'user',
      verified: userData.verified ?? false
    }

    const { data, error } = await this.environment.database.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          role: testUser.role
        }
      }
    })

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`)
    }

    testUser.id = data.user?.id || ''
    this.testUsers.push(testUser)

    return testUser
  }

  /**
   * Sign in as test user
   */
  async signInAsUser(email: string, password: string): Promise<{ user: any; session: any }> {
    const { data, error } = await this.environment.database.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Failed to sign in test user: ${error.message}`)
    }

    return { user: data.user, session: data.session }
  }

  /**
   * Get test survey data
   */
  getTestSurvey(id?: string): TestSurvey | undefined {
    return id ? this.testSurveys.find(s => s.id === id) : this.testSurveys[0]
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): TestEnvironment {
    return this.environment
  }
}

/**
 * Test Performance Monitor
 * Tracks and validates performance metrics during testing
 */
export class TestPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private thresholds = {
    apiResponse: 2000, // 2 seconds
    pageLoad: 5000, // 5 seconds
    databaseQuery: 100, // 100ms
    componentRender: 50 // 50ms
  }

  /**
   * Start performance measurement
   */
  startMeasurement(label: string): () => number {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric(label, duration)
      return duration
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(label: string, duration: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, [])
    }
    this.metrics.get(label)!.push(duration)
  }

  /**
   * Get performance statistics for a metric
   */
  getStats(label: string): {
    avg: number
    min: number
    max: number
    p95: number
    count: number
  } | null {
    const values = this.metrics.get(label)
    if (!values || values.length === 0) return null

    const sorted = [...values].sort((a, b) => a - b)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const p95Index = Math.floor(values.length * 0.95)

    return {
      avg,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Index] || sorted[sorted.length - 1],
      count: values.length
    }
  }

  /**
   * Validate performance against thresholds
   */
  validatePerformance(): {
    passed: boolean
    violations: Array<{ metric: string; threshold: number; actual: number }>
  } {
    const violations: Array<{ metric: string; threshold: number; actual: number }> = []

    for (const [metric, threshold] of Object.entries(this.thresholds)) {
      const stats = this.getStats(metric)
      if (stats && stats.p95 > threshold) {
        violations.push({
          metric,
          threshold,
          actual: stats.p95
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear()
  }
}

/**
 * Component Boundary Validator
 * Validates Next.js component boundaries to prevent deployment issues
 */
export class ComponentBoundaryValidator {
  private violations: Array<{
    file: string
    violation: string
    severity: 'error' | 'warning'
    line?: number
  }> = []

  /**
   * Validate component boundaries in a directory
   */
  async validateDirectory(directory: string): Promise<{
    passed: boolean
    violations: typeof this.violations
  }> {
    this.violations = []
    
    // This would integrate with the existing validation logic
    // For now, return a mock implementation
    return {
      passed: this.violations.length === 0,
      violations: this.violations
    }
  }

  /**
   * Validate specific component file
   */
  async validateFile(filePath: string): Promise<{
    passed: boolean
    violations: typeof this.violations
  }> {
    // Implementation would check for:
    // - Server imports in client components
    // - Client APIs in server components  
    // - Proper 'use client' directives
    // - Serialization compliance
    
    return {
      passed: true,
      violations: []
    }
  }
}

/**
 * Test Data Factory
 * Generates consistent test data across test suites
 */
export class TestDataFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: overrides.id || `user-${Date.now()}`,
      email: overrides.email || `test-${Date.now()}@example.com`,
      password: overrides.password || 'TestPassword123!',
      role: overrides.role || 'user',
      verified: overrides.verified ?? true
    }
  }

  static createSurveyResponse(userId: string, surveyId: string, responses: Record<string, any> = {}) {
    return {
      id: `response-${Date.now()}`,
      user_id: userId,
      survey_id: surveyId,
      responses: {
        q1: responses.q1 || '4',
        q2: responses.q2 || ['Machine Learning', 'Computer Vision'],
        ...responses
      },
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  }

  static createSurvey(overrides: Partial<TestSurvey> = {}): TestSurvey {
    return {
      id: overrides.id || `survey-${Date.now()}`,
      title: overrides.title || 'Test Survey',
      questions: overrides.questions || [
        {
          id: 'q1',
          text: 'Sample question',
          type: 'scale'
        }
      ]
    }
  }
}

/**
 * API Test Helper
 * Utilities for testing API endpoints
 */
export class APITestHelper {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(
    endpoint: string, 
    options: RequestInit = {},
    authToken?: string
  ): Promise<Response> {
    const headers = new Headers(options.headers)
    
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    })
  }

  /**
   * Test API endpoint response time
   */
  async testResponseTime(
    endpoint: string,
    expectedMaxTime: number = 2000
  ): Promise<{ passed: boolean; actualTime: number }> {
    const startTime = performance.now()
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`)
      const actualTime = performance.now() - startTime
      
      return {
        passed: actualTime <= expectedMaxTime && response.ok,
        actualTime
      }
    } catch (error) {
      return {
        passed: false,
        actualTime: performance.now() - startTime
      }
    }
  }

  /**
   * Test API endpoint error handling
   */
  async testErrorHandling(endpoint: string, invalidData: any): Promise<{
    handlesErrors: boolean
    statusCode: number
    errorMessage?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      const data = await response.json()

      return {
        handlesErrors: response.status >= 400 && response.status < 500,
        statusCode: response.status,
        errorMessage: data.message || data.error
      }
    } catch (error) {
      return {
        handlesErrors: false,
        statusCode: 500,
        errorMessage: 'Network error'
      }
    }
  }
}

// Export singleton instances for common use
export const testEnvironment = new TestEnvironmentManager()
export const performanceMonitor = new TestPerformanceMonitor()
export const boundaryValidator = new ComponentBoundaryValidator()
export const apiHelper = new APITestHelper()

// Global test setup and teardown helpers
export async function globalTestSetup(): Promise<void> {
  await testEnvironment.initialize()
  performanceMonitor.reset()
}

export async function globalTestTeardown(): Promise<void> {
  await testEnvironment.cleanup()
  
  // Validate performance metrics
  const perfResults = performanceMonitor.validatePerformance()
  if (!perfResults.passed) {
    console.warn('Performance threshold violations detected:', perfResults.violations)
  }
}