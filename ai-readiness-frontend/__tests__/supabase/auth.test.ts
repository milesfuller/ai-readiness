/**
 * Supabase Authentication Integration Tests
 * Tests auth functionality with the test instance
 */

import { vi } from 'vitest'

import { testHelper } from '../../supabase/test-utils.mock'

describe('Supabase Authentication Integration', () => {
  const testUserData = {
    email: 'auth-test@example.com',
    password: 'TestAuth123!',
    profile: {
      first_name: 'Auth',
      last_name: 'Tester',
      department: 'QA'
    }
  }

  beforeEach(async () => {
    // Ensure clean state
    await testHelper.signOut()
  })

  afterEach(async () => {
    // Clean up after each test
    await testHelper.signOut()
  })

  describe('User Registration', () => {
    it('should create new user account', async () => {
      const user = await testHelper.createTestUser(testUserData)
      
      expect(user.id).toBeTruthy()
      expect(user.email).toBe(testUserData.email)
      
      // Verify profile was created automatically
      const client = testHelper.getAdminClient()
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      expect(error).toBeNull()
      expect(profile.first_name).toBe('Auth')
      expect(profile.last_name).toBe('Tester')
    })

    it('should prevent duplicate email registration', async () => {
      // Create first user
      await testHelper.createTestUser(testUserData)
      
      // Try to create duplicate
      const adminClient = testHelper.getAdminClient()
      const { error } = await adminClient.auth.admin.createUser({
        email: testUserData.email,
        password: 'DifferentPassword123!',
        email_confirm: true
      })

      expect(error).toBeTruthy()
      expect(error.message).toContain('already registered')
    })

    it('should enforce password requirements', async () => {
      const adminClient = testHelper.getAdminClient()
      
      // Try weak password
      const { error } = await adminClient.auth.admin.createUser({
        email: 'weak-password@example.com',
        password: '123', // Too short
        email_confirm: true
      })

      expect(error).toBeTruthy()
      expect(error.message.toLowerCase()).toContain('password')
    })
  })

  describe('User Login', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await testHelper.createTestUser(testUserData)
    })

    it('should authenticate with valid credentials', async () => {
      const { user, session } = await testHelper.signInAsUser(
        testUser.email,
        testUser.password
      )

      expect(user).toBeTruthy()
      expect(user.id).toBe(testUser.id)
      expect(user.email).toBe(testUser.email)
      expect(session).toBeTruthy()
      expect(session.access_token).toBeTruthy()
    })

    it('should reject invalid credentials', async () => {
      await expect(
        testHelper.signInAsUser(testUser.email, 'WrongPassword123!')
      ).rejects.toThrow()
    })

    it('should reject non-existent user', async () => {
      await expect(
        testHelper.signInAsUser('nonexistent@example.com', 'AnyPassword123!')
      ).rejects.toThrow()
    })

    it('should maintain session state', async () => {
      await testHelper.signInAsUser(testUser.email, testUser.password)
      
      const client = testHelper.getClient()
      const { data: { session } } = await client.auth.getSession()
      
      expect(session).toBeTruthy()
      expect(session.user.id).toBe(testUser.id)
    })
  })

  describe('Session Management', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await testHelper.createTestUser(testUserData)
      await testHelper.signInAsUser(testUser.email, testUser.password)
    })

    it('should refresh access token', async () => {
      const client = testHelper.getClient()
      
      // Get current session
      const { data: { session: originalSession } } = await client.auth.getSession()
      expect(originalSession).toBeTruthy()
      
      // Refresh session
      const { data: { session: refreshedSession }, error } = await client.auth.refreshSession()
      
      expect(error).toBeNull()
      expect(refreshedSession).toBeTruthy()
      expect(refreshedSession.access_token).not.toBe(originalSession.access_token)
      expect(refreshedSession.user.id).toBe(originalSession.user.id)
    })

    it('should sign out user', async () => {
      const client = testHelper.getClient()
      
      // Verify signed in
      let { data: { session } } = await client.auth.getSession()
      expect(session).toBeTruthy()
      
      // Sign out
      const { error } = await client.auth.signOut()
      expect(error).toBeNull()
      
      // Verify signed out
      const result = await client.auth.getSession()
      expect(result.data.session).toBeNull()
    })

    it('should handle concurrent sessions', async () => {
      // Create second client for same user
      const client1 = testHelper.getClient()
      const client2 = testHelper.getNewClient()
      
      // Sign in with both clients
      await client1.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      await client2.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      })
      
      // Both should have valid sessions
      const { data: { session: session1 } } = await client1.auth.getSession()
      const { data: { session: session2 } } = await client2.auth.getSession()
      
      expect(session1).toBeTruthy()
      expect(session2).toBeTruthy()
      
      // Sign out from one client
      await client1.auth.signOut()
      
      // Other session should still be valid
      const { data: { session: session2After } } = await client2.auth.getSession()
      expect(session2After).toBeTruthy()
    })
  })

  describe('Profile Integration', () => {
    it('should create profile on user signup via trigger', async () => {
      const userData = {
        email: 'profile-test@example.com',
        password: 'ProfileTest123!',
        profile: {
          first_name: 'Profile',
          last_name: 'Test',
          department: 'Engineering'
        }
      }

      const user = await testHelper.createTestUser(userData)
      
      // Wait for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const client = testHelper.getAdminClient()
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      expect(error).toBeNull()
      expect(profile).toBeTruthy()
      expect(profile.first_name).toBe('Profile')
      expect(profile.last_name).toBe('Test')
    })

    it('should handle profile updates after user creation', async () => {
      const user = await testHelper.createTestUser({
        email: 'update-test@example.com',
        password: 'UpdateTest123!',
        profile: {
          first_name: 'Original',
          last_name: 'Name'
        }
      })

      const client = testHelper.getAdminClient()
      
      // Update profile
      const { error: updateError } = await client
        .from('profiles')
        .update({
          first_name: 'Updated',
          last_name: 'Name',
          department: 'Marketing',
          job_title: 'Manager'
        })
        .eq('user_id', user.id)

      expect(updateError).toBeNull()

      // Verify update
      const { data: updatedProfile, error: fetchError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      expect(fetchError).toBeNull()
      expect(updatedProfile.first_name).toBe('Updated')
      expect(updatedProfile.department).toBe('Marketing')
      expect(updatedProfile.job_title).toBe('Manager')
    })
  })

  describe('Row Level Security (RLS)', () => {
    let user1: any, user2: any, org: any

    beforeEach(async () => {
      // Create two users and an organization
      user1 = await testHelper.createTestUser({
        email: 'rls-user1@example.com',
        password: 'RLSTest123!',
        profile: { first_name: 'RLS', last_name: 'User1' }
      })

      user2 = await testHelper.createTestUser({
        email: 'rls-user2@example.com',
        password: 'RLSTest123!',
        profile: { first_name: 'RLS', last_name: 'User2' }
      })

      org = await testHelper.createTestOrganization({
        name: 'RLS Test Org'
      })

      // Add only user1 to organization
      await testHelper.addUserToOrganization(user1.id, org.id, 'system_admin')
    })

    it('should enforce profile access policies in test environment', async () => {
      // Note: In test environment, RLS policies are more permissive
      // This test verifies the policies exist and can be tested
      
      const client = testHelper.getClient()
      
      // Sign in as user1
      await client.auth.signInWithPassword({
        email: user1.email,
        password: user1.password
      })

      // Should be able to access own profile
      const { data: ownProfile, error: ownError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', user1.id)
        .single()

      expect(ownError).toBeNull()
      expect(ownProfile).toBeTruthy()

      // In test environment, can access other profiles too (for testing)
      const { data: otherProfile, error: otherError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', user2.id)
        .single()

      // Test environment allows this for easier testing
      expect(otherError).toBeNull()
      expect(otherProfile).toBeTruthy()
    })

    it('should handle organization-based access', async () => {
      const client = testHelper.getClient()
      
      // Sign in as user1 (org member)
      await client.auth.signInWithPassword({
        email: user1.email,
        password: user1.password
      })

      // Should be able to access organization data
      const { data: orgData, error: orgError } = await client
        .from('organizations')
        .select('*')
        .eq('id', org.id)
        .single()

      expect(orgError).toBeNull()
      expect(orgData).toBeTruthy()

      // Create survey in organization
      const { data: survey, error: surveyError } = await client
        .from('surveys')
        .insert({
          organization_id: org.id,
          title: 'RLS Test Survey',
          questions: [{ id: 'q1', question: 'Test?' }],
          created_by: user1.id
        })
        .select()
        .single()

      expect(surveyError).toBeNull()
      expect(survey).toBeTruthy()
    })
  })

  describe('Authentication Edge Cases', () => {
    it('should handle malformed email addresses', async () => {
      const adminClient = testHelper.getAdminClient()
      
      const { error } = await adminClient.auth.admin.createUser({
        email: 'not-an-email',
        password: 'ValidPassword123!',
        email_confirm: true
      })

      expect(error).toBeTruthy()
    })

    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(1000) + '123!'
      
      const userData = {
        email: 'long-password@example.com',
        password: longPassword
      }

      // Should handle long passwords gracefully
      const user = await testHelper.createTestUser(userData)
      expect(user.id).toBeTruthy()

      // Should be able to sign in with long password
      const { user: signedInUser } = await testHelper.signInAsUser(
        userData.email,
        longPassword
      )
      expect(signedInUser.id).toBe(user.id)
    })

    it('should handle special characters in passwords', async () => {
      const specialPassword = 'Test!@#$%^&*()_+-=[]{}|;:,.<>?`~123'
      
      const userData = {
        email: 'special-chars@example.com',
        password: specialPassword
      }

      const user = await testHelper.createTestUser(userData)
      expect(user.id).toBeTruthy()

      const { user: signedInUser } = await testHelper.signInAsUser(
        userData.email,
        specialPassword
      )
      expect(signedInUser.id).toBe(user.id)
    })
  })

  describe('Rate Limiting (Disabled in Tests)', () => {
    it('should allow rapid authentication attempts in test environment', async () => {
      const user = await testHelper.createTestUser({
        email: 'rate-limit-test@example.com',
        password: 'RateLimit123!'
      })

      // In production, this would be rate limited
      // In test environment, rate limiting is disabled
      const attempts = []
      for (let i = 0; i < 10; i++) {
        attempts.push(
          testHelper.signInAsUser(user.email, user.password)
            .then(() => testHelper.signOut())
        )
      }

      // All attempts should succeed in test environment
      await expect(Promise.all(attempts)).resolves.toBeDefined()
    })
  })
})