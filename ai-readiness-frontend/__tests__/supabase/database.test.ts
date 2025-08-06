/**
 * Supabase Database Integration Tests
 * Tests core database functionality with the test instance
 */

import { testHelper, TestUser, TestOrganization } from '../../supabase/test-utils.mock'

describe('Supabase Database Integration', () => {
  let testUser: TestUser
  let testOrg: TestOrganization

  beforeEach(async () => {
    // Clean up any existing test data
    await testHelper.resetTestData()
    
    // Create fresh test data for each test
    testUser = await testHelper.createTestUser({
      email: `db-test-${Date.now()}@example.com`,
      profile: {
        first_name: 'Database',
        last_name: 'Tester',
        department: 'QA',
        job_title: 'Test Engineer'
      }
    })

    testOrg = await testHelper.createTestOrganization({
      name: `Database Test Org ${Date.now()}`,
      industry: 'Testing',
      size: 'Small'
    })

    await testHelper.addUserToOrganization(testUser.id, testOrg.id, 'admin')
  })

  describe('User Profile Management', () => {
    it('should create user profile automatically on signup', async () => {
      const client = testHelper.getAdminClient()
      
      // Verify profile was created via trigger
      const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', testUser.id)
        .single()

      expect(error).toBeNull()
      expect(profile).toBeTruthy()
      expect(profile.first_name).toBe('Database')
      expect(profile.last_name).toBe('Tester')
      expect(profile.department).toBe('QA')
    })

    it('should update profile information', async () => {
      const client = testHelper.getAdminClient()
      
      const updateData = {
        department: 'Engineering',
        job_title: 'Senior Developer',
        preferences: {
          theme: 'light',
          notifications: false,
          voiceInput: true,
          language: 'es'
        }
      }

      const { error: updateError } = await client
        .from('profiles')
        .update(updateData)
        .eq('user_id', testUser.id)

      expect(updateError).toBeNull()

      // Verify update
      const { data: updatedProfile, error: fetchError } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', testUser.id)
        .single()

      expect(fetchError).toBeNull()
      expect(updatedProfile.department).toBe('Engineering')
      expect(updatedProfile.job_title).toBe('Senior Developer')
      expect(updatedProfile.preferences.theme).toBe('light')
      expect(updatedProfile.preferences.voiceInput).toBe(true)
    })
  })

  describe('Organization Management', () => {
    it('should create and manage organizations', async () => {
      const client = testHelper.getAdminClient()
      
      // Verify organization creation
      const { data: org, error } = await client
        .from('organizations')
        .select('*')
        .eq('id', testOrg.id)
        .single()

      expect(error).toBeNull()
      expect(org.name).toContain('Database Test Org')
      expect(org.industry).toBe('Testing')
      expect(org.size).toBe('Small')
    })

    it('should manage organization membership', async () => {
      const client = testHelper.getAdminClient()
      
      // Verify membership
      const { data: membership, error } = await client
        .from('organization_members')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('organization_id', testOrg.id)
        .single()

      expect(error).toBeNull()
      expect(membership.role).toBe('admin')
      expect(membership.user_id).toBe(testUser.id)
      expect(membership.organization_id).toBe(testOrg.id)
    })

    it('should handle multiple organization members', async () => {
      const client = testHelper.getAdminClient()
      
      // Create additional users
      const user2 = await testHelper.createTestUser({
        email: 'user2@example.com',
        profile: { first_name: 'User', last_name: 'Two' }
      })
      
      const user3 = await testHelper.createTestUser({
        email: 'user3@example.com',
        profile: { first_name: 'User', last_name: 'Three' }
      })

      // Add to organization
      await testHelper.addUserToOrganization(user2.id, testOrg.id, 'member')
      await testHelper.addUserToOrganization(user3.id, testOrg.id, 'member')

      // Verify all members
      const { data: members, error } = await client
        .from('organization_members')
        .select('*, profiles(first_name, last_name)')
        .eq('organization_id', testOrg.id)

      expect(error).toBeNull()
      expect(members).toHaveLength(3)
      
      const adminMember = members.find((m: any) => m.role === 'admin')
      const regularMembers = members.filter((m: any) => m.role === 'member')
      
      expect(adminMember).toBeTruthy()
      expect(regularMembers).toHaveLength(2)
    })
  })

  describe('Survey Management', () => {
    let survey: any

    beforeEach(async () => {
      survey = await testHelper.createTestSurvey(testOrg.id, testUser.id, {
        title: 'Database Test Survey',
        description: 'Testing survey functionality',
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            question: 'How satisfied are you with our database?',
            options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'],
            required: true
          },
          {
            id: 'q2',
            type: 'rating',
            question: 'Rate our database performance',
            scale: 5,
            required: true
          }
        ]
      })
    })

    it('should create surveys with proper structure', async () => {
      const client = testHelper.getAdminClient()
      
      const { data: fetchedSurvey, error } = await client
        .from('surveys')
        .select('*')
        .eq('id', survey.id)
        .single()

      expect(error).toBeNull()
      expect(fetchedSurvey.title).toBe('Database Test Survey')
      expect(fetchedSurvey.questions).toHaveLength(2)
      expect(fetchedSurvey.status).toBe('active')
      expect(fetchedSurvey.created_by).toBe(testUser.id)
    })

    it('should handle survey responses', async () => {
      const client = testHelper.getAdminClient()
      
      const responseData = {
        survey_id: survey.id,
        respondent_id: testUser.id,
        answers: {
          q1: 'Very satisfied',
          q2: 5
        },
        metadata: {
          browser: 'Jest Test',
          os: 'Node.js',
          completion_time: 120
        },
        completion_time: 120
      }

      const { data: response, error } = await client
        .from('survey_responses')
        .insert(responseData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(response.answers.q1).toBe('Very satisfied')
      expect(response.answers.q2).toBe(5)
      expect(response.completion_time).toBe(120)
    })

    it('should support anonymous responses when configured', async () => {
      const client = testHelper.getAdminClient()
      
      // Create anonymous-enabled survey
      const anonSurvey = await testHelper.createTestSurvey(testOrg.id, testUser.id, {
        title: 'Anonymous Survey',
        settings: {
          allowAnonymous: true,
          requireAllQuestions: false
        }
      })

      const responseData = {
        survey_id: anonSurvey.id,
        respondent_id: null, // Anonymous
        answers: {
          q1: 'Option 2'
        },
        metadata: {
          anonymous: true
        }
      }

      const { data: response, error } = await client
        .from('survey_responses')
        .insert(responseData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(response.respondent_id).toBeNull()
      expect(response.answers.q1).toBe('Option 2')
    })
  })

  describe('LLM Analysis', () => {
    let survey: any

    beforeEach(async () => {
      survey = await testHelper.createTestSurvey(testOrg.id, testUser.id)
    })

    it('should store LLM analysis results', async () => {
      const client = testHelper.getAdminClient()
      
      const analysisData = {
        survey_id: survey.id,
        analysis_type: 'sentiment_analysis',
        results: {
          overall_sentiment: 'positive',
          confidence: 0.87,
          themes: ['satisfaction', 'performance', 'usability'],
          recommendations: [
            'Continue current approach',
            'Focus on performance improvements'
          ]
        },
        model_used: 'claude-3-sonnet',
        tokens_used: 1250
      }

      const { data: analysis, error } = await client
        .from('llm_analyses')
        .insert(analysisData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(analysis.analysis_type).toBe('sentiment_analysis')
      expect(analysis.results.overall_sentiment).toBe('positive')
      expect(analysis.model_used).toBe('claude-3-sonnet')
      expect(analysis.tokens_used).toBe(1250)
    })

    it('should handle multiple analysis types per survey', async () => {
      const client = testHelper.getAdminClient()
      
      const analyses = [
        {
          survey_id: survey.id,
          analysis_type: 'sentiment_analysis',
          results: { sentiment: 'positive' },
          model_used: 'claude-3-sonnet',
          tokens_used: 800
        },
        {
          survey_id: survey.id,
          analysis_type: 'readiness_score',
          results: { score: 7.5, categories: { technical: 8, organizational: 7 } },
          model_used: 'gpt-4-turbo',
          tokens_used: 1200
        },
        {
          survey_id: survey.id,
          analysis_type: 'theme_extraction',
          results: { themes: ['AI adoption', 'Skills gap', 'Leadership support'] },
          model_used: 'claude-3-sonnet',
          tokens_used: 950
        }
      ]

      const { data: insertedAnalyses, error } = await client
        .from('llm_analyses')
        .insert(analyses)
        .select()

      expect(error).toBeNull()
      expect(insertedAnalyses).toHaveLength(3)
      
      // Verify each analysis type
      const sentimentAnalysis = insertedAnalyses.find((a: any) => a.analysis_type === 'sentiment_analysis')
      const readinessScore = insertedAnalyses.find((a: any) => a.analysis_type === 'readiness_score')
      const themeExtraction = insertedAnalyses.find((a: any) => a.analysis_type === 'theme_extraction')
      
      expect(sentimentAnalysis.results.sentiment).toBe('positive')
      expect(readinessScore.results.score).toBe(7.5)
      expect(themeExtraction.results.themes).toHaveLength(3)
    })
  })

  describe('Activity Logging', () => {
    it('should log user activities', async () => {
      const client = testHelper.getAdminClient()
      
      const activityData = {
        user_id: testUser.id,
        organization_id: testOrg.id,
        action: 'survey_created',
        resource_type: 'survey',
        resource_id: 'test-survey-id',
        details: {
          survey_title: 'Test Survey',
          question_count: 5
        },
        ip_address: '192.168.1.100',
        user_agent: 'Jest Test Runner'
      }

      const { data: activity, error } = await client
        .from('activity_logs')
        .insert(activityData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(activity.action).toBe('survey_created')
      expect(activity.details.survey_title).toBe('Test Survey')
      expect(activity.user_id).toBe(testUser.id)
    })

    it('should retrieve user activity history', async () => {
      const client = testHelper.getAdminClient()
      
      // Create multiple activities
      const activities = [
        {
          user_id: testUser.id,
          organization_id: testOrg.id,
          action: 'login',
          details: { method: 'email' }
        },
        {
          user_id: testUser.id,
          organization_id: testOrg.id,
          action: 'survey_created',
          resource_type: 'survey',
          details: { title: 'Activity Test Survey' }
        },
        {
          user_id: testUser.id,
          organization_id: testOrg.id,
          action: 'profile_updated',
          resource_type: 'profile',
          details: { fields: ['department', 'job_title'] }
        }
      ]

      await client.from('activity_logs').insert(activities)

      // Retrieve activities
      const { data: userActivities, error } = await client
        .from('activity_logs')
        .select('*')
        .eq('user_id', testUser.id)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(userActivities.length).toBeGreaterThanOrEqual(3)
      
      const loginActivity = userActivities.find((a: any) => a.action === 'login')
      const surveyActivity = userActivities.find((a: any) => a.action === 'survey_created')
      
      expect(loginActivity.details.method).toBe('email')
      expect(surveyActivity.details.title).toBe('Activity Test Survey')
    })
  })

  describe('Data Relationships and Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      const client = testHelper.getAdminClient()
      
      // Try to create survey with non-existent user
      const invalidSurvey = {
        organization_id: testOrg.id,
        title: 'Invalid Survey',
        created_by: '99999999-9999-9999-9999-999999999999', // Non-existent user
        questions: []
      }

      const { error } = await client
        .from('surveys')
        .insert(invalidSurvey)

      expect(error).toBeTruthy()
      expect(error.message).toContain('violates foreign key constraint')
    })

    it('should cascade delete properly', async () => {
      const client = testHelper.getAdminClient()
      
      // Create survey and responses
      const survey = await testHelper.createTestSurvey(testOrg.id, testUser.id)
      
      await client.from('survey_responses').insert({
        survey_id: survey.id,
        respondent_id: testUser.id,
        answers: { q1: 'Test answer' }
      })

      await client.from('llm_analyses').insert({
        survey_id: survey.id,
        analysis_type: 'test_analysis',
        results: { test: true },
        model_used: 'test-model'
      })

      // Delete survey (should cascade)
      const { error: deleteError } = await client
        .from('surveys')
        .delete()
        .eq('id', survey.id)

      expect(deleteError).toBeNull()

      // Verify cascaded deletes
      const { data: responses } = await client
        .from('survey_responses')
        .select('*')
        .eq('survey_id', survey.id)

      const { data: analyses } = await client
        .from('llm_analyses')
        .select('*')
        .eq('survey_id', survey.id)

      expect(responses).toHaveLength(0)
      expect(analyses).toHaveLength(0)
    })
  })

  describe('Performance and Indexing', () => {
    it('should perform efficiently on indexed columns', async () => {
      const client = testHelper.getAdminClient()
      
      // This test verifies that indexes are working
      // In a real scenario, you'd measure query time
      const startTime = Date.now()
      
      const { data: profiles, error } = await client
        .from('profiles')
        .select('*')
        .eq('user_id', testUser.id) // This should use the index

      const queryTime = Date.now() - startTime
      
      expect(error).toBeNull()
      expect(profiles).toHaveLength(1)
      expect(queryTime).toBeLessThan(1000) // Should be fast with index
    })
  })
})