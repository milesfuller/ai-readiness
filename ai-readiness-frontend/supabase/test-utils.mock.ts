/**
 * Mocked Test utilities for Supabase testing
 * Provides helpers for setting up test data, users, and cleanup using mocks
 */

import { createMockSupabaseClient, mockStorage } from '../__tests__/mocks/supabase'

export interface TestUser {
  id: string
  email: string
  password: string
  profile: {
    first_name: string
    last_name: string
    department?: string
    job_title?: string
  }
}

export interface TestOrganization {
  id: string
  name: string
  industry: string
  size: string
}

export class SupabaseTestHelper {
  private supabase: any
  private adminClient: any

  constructor() {
    // Use mock clients instead of real ones
    this.supabase = createMockSupabaseClient()
    this.adminClient = createMockSupabaseClient()
  }

  /**
   * Create a test user with profile
   */
  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUser: TestUser = {
      id: '',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      profile: {
        first_name: 'Test',
        last_name: 'User',
        department: 'Engineering',
        job_title: 'Developer'
      }
    }

    const user = { ...defaultUser, ...userData }

    // Create user using admin client
    const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        firstName: user.profile.first_name,
        lastName: user.profile.last_name
      }
    })

    if (authError) {
      throw new Error(`Failed to create test user: ${authError.message}`)
    }

    user.id = authData.user.id

    // Profile should be created automatically via mock
    // Wait a moment for mock to process
    await new Promise(resolve => setTimeout(resolve, 10))

    // Update profile with additional data
    const { error: profileError } = await this.adminClient
      .from('profiles')
      .update({
        department: user.profile.department,
        job_title: user.profile.job_title
      })
      .eq('user_id', user.id)

    if (profileError) {
      console.warn('Failed to update profile:', profileError.message)
    }

    return user
  }

  /**
   * Create multiple test users
   */
  async createTestUsers(count: number = 3): Promise<TestUser[]> {
    const users: TestUser[] = []
    
    for (let i = 0; i < count; i++) {
      const user = await this.createTestUser({
        email: `test-user-${i + 1}@example.com`,
        profile: {
          first_name: `User${i + 1}`,
          last_name: 'Test',
          department: ['Engineering', 'Marketing', 'Sales'][i % 3],
          job_title: ['Developer', 'Manager', 'Analyst'][i % 3]
        }
      })
      users.push(user)
    }

    return users
  }

  /**
   * Create test organization
   */
  async createTestOrganization(orgData: Partial<TestOrganization> = {}): Promise<TestOrganization> {
    const defaultOrg: TestOrganization = {
      id: '',
      name: `Test Org ${Date.now()}`,
      industry: 'Technology',
      size: 'Medium'
    }

    const org = { ...defaultOrg, ...orgData }

    const { data, error } = await this.adminClient
      .from('organizations')
      .insert(org)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test organization: ${error.message}`)
    }

    return { ...org, id: data.id }
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(userId: string, organizationId: string, role: 'owner' | 'admin' | 'member' = 'member') {
    const { error } = await this.adminClient
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role
      })

    if (error) {
      throw new Error(`Failed to add user to organization: ${error.message}`)
    }
  }

  /**
   * Create a test survey
   */
  async createTestSurvey(organizationId: string, createdBy: string, surveyData: any = {}) {
    const defaultSurvey = {
      organization_id: organizationId,
      title: 'Test Survey',
      description: 'A test survey for automated testing',
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'Test question?',
          options: ['Option 1', 'Option 2', 'Option 3'],
          required: true
        }
      ],
      settings: {
        allowAnonymous: false,
        requireAllQuestions: true,
        voiceEnabled: true
      },
      status: 'active',
      created_by: createdBy
    }

    const survey = { ...defaultSurvey, ...surveyData }

    const { data, error } = await this.adminClient
      .from('surveys')
      .insert(survey)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create test survey: ${error.message}`)
    }

    return data
  }

  /**
   * Sign in as test user
   */
  async signInAsUser(email: string, password: string) {
    const result = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (result.error) {
      throw new Error(`Failed to sign in as test user: ${result.error.message}`)
    }

    // Return the format expected by tests
    return {
      user: result.user,
      session: result.session
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    await this.supabase.auth.signOut()
  }

  /**
   * Reset test data (clear all mock data)
   */
  async resetTestData() {
    // Call the mock reset function
    const { error } = await this.adminClient.rpc('reset_test_data')
    
    if (error) {
      console.warn('Failed to reset test data via function:', error.message)
    }
  }

  /**
   * Clean up test users (mock implementation)
   */
  async cleanupTestUsers() {
    // In mock mode, this is handled by resetTestData
    await this.resetTestData()
  }

  /**
   * Complete test cleanup (run after test suites)
   */
  async cleanup() {
    await this.resetTestData()
  }

  /**
   * Get the Supabase client for additional operations
   */
  getClient() {
    return this.supabase
  }

  /**
   * Get a new client instance for concurrent session testing
   */
  getNewClient() {
    return createMockSupabaseClient()
  }

  /**
   * Get the admin client for privileged operations
   */
  getAdminClient() {
    return this.adminClient
  }

  /**
   * Verify test instance is running (always true for mocks)
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1)

      return !error
    } catch (error) {
      return true // Mock is always "healthy"
    }
  }
}

// Export singleton instance
export const testHelper = new SupabaseTestHelper()

// Utility functions for common test scenarios
export async function setupTestEnvironment() {
  // Clear any existing test data
  await testHelper.resetTestData()
  
  return testHelper
}

export async function teardownTestEnvironment() {
  await testHelper.cleanup()
}

// Pre-defined test scenarios
export const testScenarios = {
  async basicUserWorkflow() {
    const user = await testHelper.createTestUser()
    const org = await testHelper.createTestOrganization()
    await testHelper.addUserToOrganization(user.id, org.id, 'admin')
    const survey = await testHelper.createTestSurvey(org.id, user.id)
    
    return { user, org, survey }
  },

  async multiUserOrganization() {
    const users = await testHelper.createTestUsers(5)
    const org = await testHelper.createTestOrganization({ name: 'Multi-User Test Org' })
    
    // Add users with different roles
    await testHelper.addUserToOrganization(users[0].id, org.id, 'owner')
    await testHelper.addUserToOrganization(users[1].id, org.id, 'admin')
    await testHelper.addUserToOrganization(users[2].id, org.id, 'member')
    await testHelper.addUserToOrganization(users[3].id, org.id, 'member')
    await testHelper.addUserToOrganization(users[4].id, org.id, 'member')
    
    return { users, org }
  }
}