// API Test Helpers - Utilities for API integration testing
// Provides reusable functions for authentication, data generation, and validation

import { Page, APIResponse } from '@playwright/test'
import type { 
  User, 
  Survey, 
  SurveyResponse, 
  ExportOptions,
  LLMConfig,
  JTBDForceType 
} from '../../lib/types'

export interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
  role?: 'user' | 'org_admin' | 'admin'
}

export interface APITestResponse {
  status: number
  headers: Record<string, string>
  data: any
  response: APIResponse
  duration?: number
}

export interface TestDataSets {
  validUsers: TestUser[]
  invalidUsers: Partial<TestUser>[]
  surveyResponses: any[]
  exportOptions: ExportOptions[]
  xssPayloads: string[]
  sqlInjectionPayloads: string[]
}

export class APITestDataGenerator {
  private static instance: APITestDataGenerator
  private counter = 0

  static getInstance(): APITestDataGenerator {
    if (!APITestDataGenerator.instance) {
      APITestDataGenerator.instance = new APITestDataGenerator()
    }
    return APITestDataGenerator.instance
  }

  private getUniqueId(): string {
    return `${Date.now()}-${++this.counter}`
  }

  generateTestUser(role: 'user' | 'org_admin' | 'admin' = 'user'): TestUser {
    const id = this.getUniqueId()
    return {
      email: `test-${id}@test-aireadiness.com`,
      password: 'TestPassword123!',
      firstName: 'API Test',
      lastName: `User ${id}`,
      organizationName: 'Test Org Inc',
      role
    }
  }

  generateBulkTestUsers(count: number, role: 'user' | 'org_admin' | 'admin' = 'user'): TestUser[] {
    return Array(count).fill(null).map(() => this.generateTestUser(role))
  }

  generateSurveyResponse(force: JTBDForceType = 'pull_of_new', complexity: 'simple' | 'complex' = 'simple') {
    const responses = {
      pull_of_new: {
        simple: "I'm excited about AI automation tools helping with repetitive tasks.",
        complex: "I'm really excited about the potential for AI tools to help automate many of the repetitive, manual processes in my daily workflow. The current state of having to manually process reports, update spreadsheets, and manage routine communications is time-consuming and error-prone. I can see AI helping us become much more efficient and allowing us to focus on higher-value strategic work that requires human creativity and judgment."
      },
      pain_of_old: {
        simple: "Current manual processes are frustrating and inefficient.",
        complex: "The manual processes we currently use are incredibly frustrating and waste so much time. I spend hours each day on data entry, copying information between systems, and generating the same reports over and over. These tasks are error-prone and mind-numbing, and they prevent me from doing more meaningful work. The inefficiency is costing us productivity and employee satisfaction."
      },
      anxiety_of_new: {
        simple: "I'm worried about job security with AI adoption.",
        complex: "I have significant concerns about how AI adoption might affect job security and the nature of our work. Will AI replace human workers? How do we ensure data privacy and security? I'm worried about the learning curve and whether older employees will be able to adapt. There are also concerns about bias in AI systems and making decisions we don't fully understand."
      },
      anchors_to_old: {
        simple: "We have established processes that work well currently.",
        complex: "Our current processes and systems have been refined over years and work well for our organization. We've invested heavily in training, documentation, and integration with existing systems. There's institutional knowledge embedded in our current workflows that might be lost with rapid change. Many team members are comfortable with current tools and changing everything at once could be disruptive to operations."
      },
      demographic: {
        simple: "I work in engineering and have 5 years experience.",
        complex: "I work as a Senior Software Engineer in the Product Development team, reporting to the VP of Engineering. I have 8 years of experience in software development, primarily working with cloud infrastructure and microservices. My department focuses on platform reliability and developer tooling. I'm located in the Austin office and work hybrid (3 days in office, 2 remote)."
      }
    }

    const id = this.getUniqueId()
    return {
      responseId: `test-response-${id}`,
      responseText: responses[force][complexity],
      questionText: this.getQuestionForForce(force),
      expectedForce: force,
      questionContext: 'AI readiness assessment - automated testing',
      organizationId: `test-org-${id}`,
      surveyId: `test-survey-${id}`,
      employeeRole: 'Senior Software Engineer',
      employeeDepartment: 'Engineering'
    }
  }

  private getQuestionForForce(force: JTBDForceType): string {
    const questions = {
      pull_of_new: "What excites you most about AI adoption in your work?",
      pain_of_old: "What are your biggest frustrations with current work processes?",
      anxiety_of_new: "What concerns do you have about AI implementation?",
      anchors_to_old: "What works well about your current processes and tools?",
      demographic: "Tell us about your role and experience in the organization."
    }
    return questions[force]
  }

  generateBatchAnalysisRequest(size: number = 5) {
    const forces: JTBDForceType[] = ['pull_of_new', 'pain_of_old', 'anxiety_of_new', 'anchors_to_old']
    
    return {
      responses: Array(size).fill(null).map((_, idx) => {
        const force = forces[idx % forces.length]
        const response = this.generateSurveyResponse(force, idx % 2 === 0 ? 'simple' : 'complex')
        return {
          responseId: response.responseId,
          userResponse: response.responseText,
          questionText: response.questionText,
          expectedForce: response.expectedForce,
          employeeRole: response.employeeRole,
          employeeDepartment: response.employeeDepartment,
          organizationName: 'Test Organization Inc'
        }
      }),
      options: {
        parallel: true,
        includeOrganizationalAnalysis: true,
        qualityThreshold: 0.7
      }
    }
  }

  generateExportOptions(format: 'csv' | 'json' | 'pdf' = 'csv'): ExportOptions {
    return {
      format,
      includePersonalData: false,
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      filters: {
        department: 'Engineering',
        status: 'completed',
        role: 'user'
      }
    }
  }

  getSecurityTestPayloads() {
    return {
      xss: [
        '<script>alert("xss")</script>',
        '"><img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg onload=alert("xss")>',
        '${7*7}{{7*7}}',
        '<iframe src="javascript:alert(`xss`)">',
        'data:text/html,<script>alert("xss")</script>'
      ],
      sqlInjection: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts'
      ],
      commandInjection: [
        '; cat /etc/passwd',
        '| whoami',
        '`rm -rf /`',
        '$(id)',
        '&& echo vulnerable'
      ]
    }
  }

  generateLargePayload(sizeKB: number): string {
    const baseString = 'This is a large payload for testing API limits and performance with substantial content. '
    const targetLength = sizeKB * 1024
    const repeatCount = Math.ceil(targetLength / baseString.length)
    return baseString.repeat(repeatCount).substring(0, targetLength)
  }

  generateInvalidDataSets() {
    return {
      emptyStrings: {
        responseText: '',
        questionText: '',
        expectedForce: 'pull_of_new'
      },
      nullValues: {
        responseText: null,
        questionText: null,
        expectedForce: null
      },
      wrongTypes: {
        responseText: 123,
        questionText: [],
        expectedForce: true
      },
      invalidEnums: {
        responseText: 'Valid response',
        questionText: 'Valid question',
        expectedForce: 'invalid_force_type'
      },
      oversizedContent: {
        responseText: this.generateLargePayload(100), // 100KB
        questionText: this.generateLargePayload(10),  // 10KB
        expectedForce: 'pull_of_new'
      }
    }
  }
}

export class APIAuthenticationHelper {
  constructor(private page: Page) {}

  async loginAsRole(role: 'admin' | 'org_admin' | 'user' = 'admin'): Promise<void> {
    const credentials = this.getCredentialsForRole(role)
    
    await this.page.goto('/auth/login')
    await this.page.fill('[name="email"]', credentials.email)
    await this.page.fill('[name="password"]', credentials.password)
    await this.page.click('button[type="submit"]')
    
    // Wait for successful login
    if (role === 'admin') {
      await this.page.waitForURL('/admin', { timeout: 10000 })
    } else {
      await this.page.waitForURL('/dashboard', { timeout: 10000 })
    }
  }

  private getCredentialsForRole(role: string) {
    const credentials = {
      admin: { email: 'admin@test-aireadiness.com', password: 'TestPassword123!' },
      org_admin: { email: 'orgadmin@test-aireadiness.com', password: 'TestPassword123!' },
      user: { email: 'user@test-aireadiness.com', password: 'TestPassword123!' }
    }
    return credentials[role as keyof typeof credentials] || credentials.admin
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const cookies = await this.page.context().cookies()
    const sessionCookie = cookies.find(c => c.name.includes('supabase') || c.name.includes('session'))
    
    return {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : '',
      'User-Agent': 'Playwright API Test',
      'Accept': 'application/json'
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const cookies = await this.page.context().cookies()
      return cookies.some(c => c.name.includes('supabase') && c.value.length > 0)
    } catch {
      return false
    }
  }

  async logout(): Promise<void> {
    await this.page.goto('/auth/logout')
    await this.page.waitForURL('/auth/login', { timeout: 5000 })
  }
}

export class APIValidationHelper {
  static validateResponseStructure(response: any, expectedFields: string[]): { valid: boolean; missing: string[] } {
    const missing = expectedFields.filter(field => !(field in response))
    return {
      valid: missing.length === 0,
      missing
    }
  }

  static validateJTBDAnalysisResult(result: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const requiredFields = [
      'primaryJtbdForce',
      'forceStrengthScore',
      'confidenceScore',
      'keyThemes',
      'sentimentAnalysis',
      'actionableInsights'
    ]

    // Check required fields
    const fieldValidation = this.validateResponseStructure(result, requiredFields)
    errors.push(...fieldValidation.missing.map(field => `Missing required field: ${field}`))

    // Validate score ranges
    if (result.forceStrengthScore < 1 || result.forceStrengthScore > 5) {
      errors.push('Force strength score must be between 1 and 5')
    }

    if (result.confidenceScore < 1 || result.confidenceScore > 5) {
      errors.push('Confidence score must be between 1 and 5')
    }

    // Validate JTBD force enum
    const validForces = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']
    if (!validForces.includes(result.primaryJtbdForce)) {
      errors.push(`Invalid primary JTBD force: ${result.primaryJtbdForce}`)
    }

    // Validate sentiment analysis
    if (result.sentimentAnalysis) {
      const sentiment = result.sentimentAnalysis
      if (sentiment.overallScore < -1 || sentiment.overallScore > 1) {
        errors.push('Sentiment score must be between -1 and 1')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  static validateSecurityHeaders(headers: Record<string, string>): { valid: boolean; missing: string[] } {
    const requiredSecurityHeaders = [
      'x-content-type-options',
      'x-frame-options'
    ]

    const missing = requiredSecurityHeaders.filter(header => !headers[header])
    return {
      valid: missing.length === 0,
      missing
    }
  }

  static validatePerformance(duration: number, maxDuration: number): { valid: boolean; message: string } {
    const valid = duration <= maxDuration
    return {
      valid,
      message: valid 
        ? `Performance OK: ${duration}ms <= ${maxDuration}ms`
        : `Performance issue: ${duration}ms > ${maxDuration}ms`
    }
  }
}

export class APIPerformanceMonitor {
  private measurements: Array<{ endpoint: string; method: string; duration: number; timestamp: Date }> = []

  async measureRequest<T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now()
    const result = await requestFn()
    const duration = performance.now() - start

    this.measurements.push({
      endpoint,
      method,
      duration,
      timestamp: new Date()
    })

    return { result, duration }
  }

  getAverageResponseTime(endpoint?: string): number {
    const relevantMeasurements = endpoint 
      ? this.measurements.filter(m => m.endpoint === endpoint)
      : this.measurements

    if (relevantMeasurements.length === 0) return 0

    const total = relevantMeasurements.reduce((sum, m) => sum + m.duration, 0)
    return total / relevantMeasurements.length
  }

  getSlowestEndpoints(limit: number = 5): Array<{ endpoint: string; averageDuration: number }> {
    const endpointStats = new Map<string, { total: number; count: number }>()

    this.measurements.forEach(m => {
      const current = endpointStats.get(m.endpoint) || { total: 0, count: 0 }
      endpointStats.set(m.endpoint, {
        total: current.total + m.duration,
        count: current.count + 1
      })
    })

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageDuration: stats.total / stats.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit)
  }

  generatePerformanceReport(): string {
    const totalRequests = this.measurements.length
    const averageResponseTime = this.getAverageResponseTime()
    const slowestEndpoints = this.getSlowestEndpoints()

    return `
Performance Report:
- Total API requests: ${totalRequests}
- Average response time: ${averageResponseTime.toFixed(2)}ms
- Slowest endpoints:
${slowestEndpoints.map(e => `  - ${e.endpoint}: ${e.averageDuration.toFixed(2)}ms`).join('\n')}
    `.trim()
  }

  reset(): void {
    this.measurements = []
  }
}

// Export singleton instances for shared use
export const testDataGenerator = APITestDataGenerator.getInstance()
export const performanceMonitor = new APIPerformanceMonitor()

// Utility functions for common test patterns
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }

  throw lastError!
}

export function createAPIClient(page: Page) {
  return {
    auth: new APIAuthenticationHelper(page),
    data: testDataGenerator,
    validation: APIValidationHelper,
    performance: performanceMonitor,
    
    async request(endpoint: string, options: any = {}): Promise<APITestResponse> {
      const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
      const url = `${baseUrl}/api${endpoint}`
      
      const authHeaders = await new APIAuthenticationHelper(page).getAuthHeaders()
      
      const response = await page.request.fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
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
  }
}