/**
 * Test utilities for Supabase testing
 * Provides helpers for setting up test data, users, and cleanup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

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
  private supabase: SupabaseClient
  private adminClient: SupabaseClient

  constructor() {
    // Regular client for user operations
    this.supabase = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    )

    // Admin client for privileged operations
    this.adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
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

    // Profile should be created automatically via trigger
    // Wait a moment for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 100))

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
  async addUserToOrganization(userId: string, organizationId: string, role: 'owner' | 'system_admin' | 'member' = 'member') {
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
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw new Error(`Failed to sign in as test user: ${error.message}`)
    }

    return data
  }

  /**
   * Sign out current user
   */
  async signOut() {
    await this.supabase.auth.signOut()
  }

  /**
   * Reset test data (delete all test records)
   */
  async resetTestData() {
    // Call the reset function from the database
    const { error } = await this.adminClient.rpc('reset_test_data')
    
    if (error) {
      console.warn('Failed to reset test data via function:', error.message)
      
      // Fallback: manual cleanup
      await this.adminClient.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.adminClient.from('llm_analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.adminClient.from('survey_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.adminClient.from('surveys').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.adminClient.from('organization_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await this.adminClient.from('organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  /**
   * Clean up test users (remove from auth)
   */
  async cleanupTestUsers() {
    // Get all test users (those with emails containing 'test' or 'example')
    const { data: users, error } = await this.adminClient.auth.admin.listUsers()
    
    if (error) {
      console.warn('Failed to list users for cleanup:', error.message)
      return
    }

    const testUsers = users.users.filter(user => 
      user.email?.includes('test') || user.email?.includes('example')
    )

    for (const user of testUsers) {
      try {
        await this.adminClient.auth.admin.deleteUser(user.id)
      } catch (error) {
        console.warn(`Failed to delete test user ${user.email}:`, error)
      }
    }
  }

  /**
   * Complete test cleanup (run after test suites)
   */
  async cleanup() {
    await this.resetTestData()
    await this.cleanupTestUsers()
  }

  /**
   * Get the Supabase client for additional operations
   */
  getClient() {
    return this.supabase
  }

  /**
   * Get the admin client for privileged operations
   */
  getAdminClient() {
    return this.adminClient
  }

  /**
   * Verify test instance is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('count')
        .limit(1)

      return !error
    } catch (error) {
      return false
    }
  }
}

// Export singleton instance
export const testHelper = new SupabaseTestHelper()

// Utility functions for common test scenarios
export async function setupTestEnvironment() {
  const isHealthy = await testHelper.healthCheck()
  if (!isHealthy) {
    throw new Error('Supabase test instance is not available. Make sure Docker is running with the test configuration.')
  }

  // Clean up any existing test data
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
    await testHelper.addUserToOrganization(user.id, org.id, 'system_admin')
    const survey = await testHelper.createTestSurvey(org.id, user.id)
    
    return { user, org, survey }
  },

  async multiUserOrganization() {
    const users = await testHelper.createTestUsers(5)
    const org = await testHelper.createTestOrganization({ name: 'Multi-User Test Org' })
    
    // Add users with different roles
    await testHelper.addUserToOrganization(users[0].id, org.id, 'owner')
    await testHelper.addUserToOrganization(users[1].id, org.id, 'system_admin')
    await testHelper.addUserToOrganization(users[2].id, org.id, 'member')
    await testHelper.addUserToOrganization(users[3].id, org.id, 'member')
    await testHelper.addUserToOrganization(users[4].id, org.id, 'member')
    
    return { users, org }
  }
}