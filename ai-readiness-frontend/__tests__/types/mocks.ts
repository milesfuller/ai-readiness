/**
 * Mock Type Definitions for Testing
 * Comprehensive type definitions for all mock objects and utilities used in tests
 */

import { jest } from '@jest/globals'

// ============================================================================
// NextJS Mock Types
// ============================================================================

export interface MockNextRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>
  _body: string
  json(): Promise<any>
  text(): Promise<string>
}

export interface MockNextResponse {
  status: number
  json(): Promise<any>
  headers: Map<string, string>
}

export interface NextResponseStatic {
  json(data: any, options?: { status?: number; headers?: Record<string, string> }): MockNextResponse
}

export interface NextServerMock {
  NextRequest: new (url: string, options?: MockNextRequestOptions) => MockNextRequest
  NextResponse: NextResponseStatic
}

// ============================================================================
// Jest Mock Types
// ============================================================================

export type MockFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>

export type MockedObject<T> = {
  readonly [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K] extends object
    ? MockedObject<T[K]>
    : T[K]
}

// ============================================================================
// Supabase Mock Types
// ============================================================================

export interface MockUser {
  id: string
  email: string
  password: string
  created_at: string
  updated_at: string
  email_confirm: boolean
  user_metadata: Record<string, any>
}

export interface MockProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  department?: string
  job_title?: string
  preferences?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface MockSupabaseAuthResponse {
  data: { user: MockUser | null; session?: any }
  error: Error | null
}

export interface MockSupabaseQueryBuilder {
  select: jest.MockedFunction<(fields?: string) => MockSupabaseQueryBuilder>
  insert: jest.MockedFunction<(data: any) => MockSupabaseQueryBuilder>
  update: jest.MockedFunction<(data: any) => MockSupabaseQueryBuilder>
  delete: jest.MockedFunction<() => MockSupabaseQueryBuilder>
  eq: jest.MockedFunction<(column: string, value: any) => MockSupabaseQueryBuilder>
  neq: jest.MockedFunction<(column: string, value: any) => MockSupabaseQueryBuilder>
  gte: jest.MockedFunction<(column: string, value: any) => MockSupabaseQueryBuilder>
  order: jest.MockedFunction<(column: string, options?: any) => MockSupabaseQueryBuilder>
  limit: jest.MockedFunction<(count: number) => MockSupabaseQueryBuilder>
  slice: jest.MockedFunction<(start: number, end?: number) => MockSupabaseQueryBuilder>
  single: jest.MockedFunction<() => Promise<{ data: any; error: any }>>
}

export interface MockSupabaseAuth {
  getUser: jest.MockedFunction<() => Promise<MockSupabaseAuthResponse>>
  signInWithPassword: jest.MockedFunction<(credentials: { email: string; password: string }) => Promise<any>>
  signOut: jest.MockedFunction<() => Promise<{ error: any }>>
  signUp: jest.MockedFunction<(credentials: any) => Promise<any>>
  resetPasswordForEmail: jest.MockedFunction<(email: string) => Promise<any>>
  updateUser: jest.MockedFunction<(attributes: any) => Promise<any>>
  onAuthStateChange: jest.MockedFunction<(callback: any) => { data: { subscription: { unsubscribe: jest.MockedFunction<() => void> } } }>
  admin?: {
    createUser: jest.MockedFunction<(userData: any) => Promise<{ data: any; error: any }>>
    deleteUser: jest.MockedFunction<(userId: string) => Promise<{ data: any; error: any }>>
    listUsers: jest.MockedFunction<() => Promise<{ data: { users: any[] }; error: any }>>
  }
}

export interface MockSupabaseClient {
  auth: MockSupabaseAuth
  from: jest.MockedFunction<(table: string) => MockSupabaseQueryBuilder>
  rpc?: jest.MockedFunction<(functionName: string, params?: any) => Promise<{ data: any; error: any }>>
}

// ============================================================================
// LLM Service Mock Types
// ============================================================================

export interface MockLLMAnalysisResult {
  primaryJtbdForce: 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new' | 'demographic'
  secondaryJtbdForces: string[]
  forceStrengthScore: number
  confidenceScore: number
  reasoning: string
  keyThemes: string[]
  themeCategories: {
    process: string[]
    technology: string[]
    people: string[]
    organizational: string[]
  }
  sentimentAnalysis: {
    overallScore: number
    sentimentLabel: 'positive' | 'negative' | 'neutral'
    emotionalIndicators: string[]
    tone: string
  }
  businessImplications: {
    impactLevel: 'low' | 'medium' | 'high'
    affectedAreas: string[]
    urgency: 'low' | 'medium' | 'high'
    businessValue: string
  }
  actionableInsights: {
    summaryInsight: string
    detailedAnalysis: string
    immediateActions: string[]
    longTermRecommendations: string[]
  }
  qualityIndicators: {
    responseQuality: 'poor' | 'fair' | 'good' | 'excellent'
    specificityLevel: 'vague' | 'general' | 'specific' | 'very_specific'
    actionability: 'low' | 'medium' | 'high'
    businessRelevance: 'low' | 'medium' | 'high'
  }
  analysisMetadata: {
    processingNotes: string
    followUpQuestions: string[]
    relatedThemes: string[]
  }
}

export interface MockLLMService {
  analyzeSurveyResponse: jest.MockedFunction<
    (
      responseText: string,
      questionText: string,
      expectedForce: string,
      context?: any
    ) => Promise<MockLLMAnalysisResult>
  >
  healthCheck: jest.MockedFunction<() => Promise<{ status: string; latency: number }>>
  getConfig: jest.MockedFunction<() => {
    provider: string
    model: string
    temperature: number
    maxTokens: number
    timeout: number
    retries: number
  }>
}

// ============================================================================
// Export Service Mock Types  
// ============================================================================

export interface MockExportService {
  exportData: jest.MockedFunction<(format: string, data: any, options?: any) => Promise<Buffer | string>>
  generateSurveyPDF: jest.MockedFunction<(surveyId: string, options?: any) => Promise<Buffer>>
  generateOrganizationReport: jest.MockedFunction<(orgId: string, options?: any) => Promise<Buffer>>
  getAvailableFormats: jest.MockedFunction<() => Array<{ value: string; label: string; description: string }>>
}

// ============================================================================
// Test Utilities Mock Types
// ============================================================================

export interface MockTestUser {
  email: string
  password: string
  userId: string
  organizationId: string
}

export interface TestHelpers {
  xssPayloads: string[]
  sqlInjectionPayloads: string[]
  mockCsrfToken: string
  simulateRateLimit: (threshold?: number) => () => boolean
}

// ============================================================================
// Global Mock Extensions
// ============================================================================

declare global {
  var testHelpers: TestHelpers
  var mockStorage: any
  var webkitSpeechRecognition: jest.MockedClass<any>
  var SpeechRecognition: jest.MockedClass<any>

  interface Window {
    matchMedia: (query: string) => MediaQueryList
  }

  namespace NodeJS {
    interface Global {
      testHelpers: TestHelpers
      mockStorage: any
      ResizeObserver: jest.MockedClass<typeof ResizeObserver>
      IntersectionObserver: jest.MockedClass<typeof IntersectionObserver>
      MediaRecorder: jest.MockedClass<typeof MediaRecorder>
      webkitSpeechRecognition: jest.MockedClass<any>
      SpeechRecognition: jest.MockedClass<any>
      fetch: jest.MockedFunction<typeof fetch>
    }
  }
}

// ============================================================================
// Mock Web APIs
// ============================================================================

export interface MockRequest {
  url: string
  method: string
  headers: Map<string, string>
  body: string
  _bodyText: string
  json(): Promise<any>
  text(): Promise<string>
}

export interface MockResponse {
  body: string
  status: number
  statusText: string
  headers: Headers
  ok: boolean
  url: string
  type: string
  redirected: boolean
  json(): Promise<any>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  blob(): Promise<Blob>
  clone(): MockResponse
}

export interface MockHeaders {
  get(name: string): string | null
  set(name: string, value: string): void
  has(name: string): boolean
  delete(name: string): boolean
  forEach(callback: (value: string, key: string, map: Map<string, string>) => void, thisArg?: any): void
}

export interface MockURL {
  href: string
  origin: string
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  searchParams: URLSearchParams
}

// ============================================================================
// Mock Next.js Types
// ============================================================================

export interface MockRouter {
  push: jest.MockedFunction<(url: string) => void>
  back: jest.MockedFunction<() => void>
  forward: jest.MockedFunction<() => void>
  refresh: jest.MockedFunction<() => void>
  replace: jest.MockedFunction<(url: string) => void>
  prefetch: jest.MockedFunction<(url: string) => void>
}

export interface MockSearchParams extends URLSearchParams {}

// ============================================================================
// Media API Mock Types
// ============================================================================

export interface MockMediaStream {
  getTracks(): MockMediaStreamTrack[]
}

export interface MockMediaStreamTrack {
  stop: jest.MockedFunction<() => void>
  kind: string
  label: string
  enabled: boolean
}

export interface MockMediaDevices {
  getUserMedia: jest.MockedFunction<(constraints: MediaStreamConstraints) => Promise<MockMediaStream>>
}

export interface MockMediaRecorderInstance {
  start: jest.MockedFunction<() => void>
  stop: jest.MockedFunction<() => void>
  pause: jest.MockedFunction<() => void>
  resume: jest.MockedFunction<() => void>
  ondataavailable: ((event: BlobEvent) => void) | null
  onstop: (() => void) | null
  onstart: (() => void) | null
  state: 'inactive' | 'recording' | 'paused'
}

export interface MockSpeechRecognition {
  start: jest.MockedFunction<() => void>
  stop: jest.MockedFunction<() => void>
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  continuous: boolean
  interimResults: boolean
  lang: string
}

// ============================================================================
// Test Scenario Types
// ============================================================================

export type AuthScenario = 
  | 'authenticated_user'
  | 'authenticated_admin' 
  | 'authenticated_org_admin'
  | 'unauthenticated'
  | 'no_profile'

// ============================================================================
// Utility Types for Mocking
// ============================================================================

export type MockReturnValue<T> = T extends (...args: any[]) => Promise<infer R>
  ? Promise<R>
  : T extends (...args: any[]) => infer R
  ? R
  : T

export type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? jest.MockedFunction<T[K]>
    : T[K] extends object
    ? DeepMocked<T[K]>
    : T[K]
}

// ============================================================================
// Helper Functions Types
// ============================================================================

export interface MockSetupHelpers {
  createMockRequest: (options: MockNextRequestOptions) => MockNextRequest
  setupMockScenario: (scenario: AuthScenario) => void
  resetAllMocks: () => void
  createMockUser: (overrides?: Partial<MockUser>) => MockUser
  createMockProfile: (overrides?: Partial<MockProfile>) => MockProfile
}

// Export commonly used mock types for easy import
export type {
  MockedObject as Jest_MockedObject,
  MockFunction as Jest_MockFunction,
  DeepMocked as Jest_DeepMocked
}