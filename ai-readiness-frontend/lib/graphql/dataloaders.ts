import DataLoader from 'dataloader'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * DataLoaders for efficient database queries and N+1 prevention
 * 
 * DataLoaders batch and cache database queries within a single GraphQL request,
 * preventing the N+1 query problem and improving performance.
 */

export interface DataLoaders {
  userLoader: DataLoader<string, any>
  organizationLoader: DataLoader<string, any>
  surveyLoader: DataLoader<string, any>
  questionLoader: DataLoader<string, any>
  responseLoader: DataLoader<string, any>
  sessionLoader: DataLoader<string, any>
  templateLoader: DataLoader<string, any>
  apiKeyLoader: DataLoader<string, any>
  voiceRecordingLoader: DataLoader<string, any>
  questionResponseLoader: DataLoader<string, any>
  surveyAnalyticsLoader: DataLoader<string, any>
}

/**
 * Create all DataLoaders with Supabase client
 */
export function createDataLoaders(supabase: SupabaseClient): DataLoaders {
  return {
    userLoader: createUserLoader(supabase),
    organizationLoader: createOrganizationLoader(supabase),
    surveyLoader: createSurveyLoader(supabase),
    questionLoader: createQuestionLoader(supabase),
    responseLoader: createResponseLoader(supabase),
    sessionLoader: createSessionLoader(supabase),
    templateLoader: createTemplateLoader(supabase),
    apiKeyLoader: createApiKeyLoader(supabase),
    voiceRecordingLoader: createVoiceRecordingLoader(supabase),
    questionResponseLoader: createQuestionResponseLoader(supabase),
    surveyAnalyticsLoader: createSurveyAnalyticsLoader(supabase)
  }
}

/**
 * User DataLoader
 */
function createUserLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (userIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            *,
            preferences:user_preferences(*)
          )
        `)
        .in('id', [...userIds])
      
      if (error) {
        console.error('Error loading users:', error)
        return userIds.map(() => null)
      }
      
      // Create a map for efficient lookup
      const userMap = new Map()
      data?.forEach(user => {
        userMap.set(user.id, {
          ...user,
          profile: user.user_profiles,
          organizationId: user.organization_id,
          isActive: user.is_active,
          emailVerified: user.email_verified,
          lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : null,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at)
        })
      })
      
      // Return users in the same order as requested
      return userIds.map(id => userMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (users):', error)
      return userIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `user:${key}`,
    maxBatchSize: 100
  })
}

/**
 * Organization DataLoader
 */
function createOrganizationLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (orgIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', [...orgIds])
      
      if (error) {
        console.error('Error loading organizations:', error)
        return orgIds.map(() => null)
      }
      
      const orgMap = new Map()
      data?.forEach(org => {
        orgMap.set(org.id, {
          ...org,
          settings: org.settings || {},
          createdAt: new Date(org.created_at),
          updatedAt: new Date(org.updated_at)
        })
      })
      
      return orgIds.map(id => orgMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (organizations):', error)
      return orgIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `org:${key}`,
    maxBatchSize: 100
  })
}

/**
 * Survey DataLoader
 */
function createSurveyLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (surveyIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          questions (
            *,
            options:question_options(*)
          )
        `)
        .in('id', [...surveyIds])
      
      if (error) {
        console.error('Error loading surveys:', error)
        return surveyIds.map(() => null)
      }
      
      const surveyMap = new Map()
      data?.forEach(survey => {
        surveyMap.set(survey.id, {
          ...survey,
          createdById: survey.created_by,
          organizationId: survey.organization_id,
          templateId: survey.template_id,
          settings: survey.settings || {},
          tags: survey.tags || [],
          questions: survey.questions?.sort((a: any, b: any) => a.order - b.order) || [],
          createdAt: new Date(survey.created_at),
          updatedAt: new Date(survey.updated_at),
          publishedAt: survey.published_at ? new Date(survey.published_at) : null,
          archivedAt: survey.archived_at ? new Date(survey.archived_at) : null
        })
      })
      
      return surveyIds.map(id => surveyMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (surveys):', error)
      return surveyIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `survey:${key}`,
    maxBatchSize: 50
  })
}

/**
 * Question DataLoader
 */
function createQuestionLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (questionIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          options:question_options(*),
          survey:surveys(id, title)
        `)
        .in('id', [...questionIds])
      
      if (error) {
        console.error('Error loading questions:', error)
        return questionIds.map(() => null)
      }
      
      const questionMap = new Map()
      data?.forEach(question => {
        questionMap.set(question.id, {
          ...question,
          surveyId: question.survey_id,
          options: question.options?.sort((a: any, b: any) => a.order - b.order) || [],
          validation: question.validation || {},
          displayConditions: question.display_conditions || {},
          skipLogic: question.skip_logic || {},
          jtbdCategory: question.jtbd_category,
          jtbdWeight: question.jtbd_weight
        })
      })
      
      return questionIds.map(id => questionMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (questions):', error)
      return questionIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `question:${key}`,
    maxBatchSize: 100
  })
}

/**
 * Response DataLoader
 */
function createResponseLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (responseIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          answers:question_responses(
            *,
            voice_recording:voice_recordings(*)
          ),
          survey:surveys(id, title),
          session:survey_sessions(id)
        `)
        .in('id', [...responseIds])
      
      if (error) {
        console.error('Error loading responses:', error)
        return responseIds.map(() => null)
      }
      
      const responseMap = new Map()
      data?.forEach(response => {
        responseMap.set(response.id, {
          ...response,
          surveyId: response.survey_id,
          sessionId: response.session_id,
          userId: response.user_id,
          answers: response.answers || [],
          metadata: response.metadata || {},
          startedAt: new Date(response.started_at),
          completedAt: response.completed_at ? new Date(response.completed_at) : null,
          updatedAt: new Date(response.updated_at)
        })
      })
      
      return responseIds.map(id => responseMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (responses):', error)
      return responseIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `response:${key}`,
    maxBatchSize: 50
  })
}

/**
 * Session DataLoader
 */
function createSessionLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (sessionIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('survey_sessions')
        .select(`
          *,
          survey:surveys(id, title),
          user:users(id, email),
          responses:responses(*)
        `)
        .in('id', [...sessionIds])
      
      if (error) {
        console.error('Error loading sessions:', error)
        return sessionIds.map(() => null)
      }
      
      const sessionMap = new Map()
      data?.forEach(session => {
        sessionMap.set(session.id, {
          ...session,
          surveyId: session.survey_id,
          userId: session.user_id,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          currentQuestionId: session.current_question_id,
          totalTimeSpent: session.total_time_spent || 0,
          questionsAnswered: session.questions_answered || 0,
          questionsSkipped: session.questions_skipped || 0,
          progressPercent: session.progress_percent || 0,
          engagementScore: session.engagement_score,
          attentionScore: session.attention_score,
          startedAt: new Date(session.started_at),
          lastActiveAt: new Date(session.last_active_at),
          completedAt: session.completed_at ? new Date(session.completed_at) : null
        })
      })
      
      return sessionIds.map(id => sessionMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (sessions):', error)
      return sessionIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `session:${key}`,
    maxBatchSize: 50
  })
}

/**
 * Template DataLoader
 */
function createTemplateLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (templateIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('survey_templates')
        .select(`
          *,
          question_groups(
            *,
            questions:template_questions(*)
          )
        `)
        .in('id', [...templateIds])
      
      if (error) {
        console.error('Error loading templates:', error)
        return templateIds.map(() => null)
      }
      
      const templateMap = new Map()
      data?.forEach(template => {
        templateMap.set(template.id, {
          ...template,
          createdById: template.created_by,
          organizationId: template.organization_id,
          isSystemTemplate: template.is_system_template,
          parentTemplateId: template.parent_template_id,
          versionNotes: template.version_notes,
          estimatedDuration: template.estimated_duration,
          difficultyLevel: template.difficulty_level,
          usageCount: template.usage_count || 0,
          completionRate: template.completion_rate || 0,
          averageTime: template.average_time || 0,
          rating: template.rating || 0,
          questionGroups: template.question_groups || [],
          settings: template.settings || {},
          tags: template.tags || [],
          createdAt: new Date(template.created_at),
          updatedAt: new Date(template.updated_at),
          publishedAt: template.published_at ? new Date(template.published_at) : null
        })
      })
      
      return templateIds.map(id => templateMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (templates):', error)
      return templateIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `template:${key}`,
    maxBatchSize: 50
  })
}

/**
 * API Key DataLoader
 */
function createApiKeyLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (keyIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select(`
          *,
          user:users(id, email),
          organization:organizations(id, name)
        `)
        .in('id', [...keyIds])
      
      if (error) {
        console.error('Error loading API keys:', error)
        return keyIds.map(() => null)
      }
      
      const keyMap = new Map()
      data?.forEach(key => {
        keyMap.set(key.id, {
          ...key,
          userId: key.user_id,
          organizationId: key.organization_id,
          keyPrefix: key.key_prefix,
          usageCount: key.usage_count || 0,
          lastUsedAt: key.last_used_at ? new Date(key.last_used_at) : null,
          rateLimitHits: key.rate_limit_hits || 0,
          expiresAt: key.expires_at ? new Date(key.expires_at) : null,
          isActive: key.is_active,
          rateLimitPerHour: key.rate_limit_per_hour || 1000,
          permissions: key.permissions || [],
          createdAt: new Date(key.created_at),
          updatedAt: new Date(key.updated_at)
        })
      })
      
      return keyIds.map(id => keyMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (API keys):', error)
      return keyIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `apikey:${key}`,
    maxBatchSize: 100
  })
}

/**
 * Voice Recording DataLoader
 */
function createVoiceRecordingLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (recordingIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('voice_recordings')
        .select('*')
        .in('id', [...recordingIds])
      
      if (error) {
        console.error('Error loading voice recordings:', error)
        return recordingIds.map(() => null)
      }
      
      const recordingMap = new Map()
      data?.forEach(recording => {
        recordingMap.set(recording.id, {
          ...recording,
          fileSize: recording.file_size,
          quality: recording.quality || {},
          sentiment: recording.sentiment,
          themes: recording.themes || [],
          keywords: recording.keywords || [],
          recordedAt: new Date(recording.recorded_at),
          processedAt: recording.processed_at ? new Date(recording.processed_at) : null
        })
      })
      
      return recordingIds.map(id => recordingMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (voice recordings):', error)
      return recordingIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `voice:${key}`,
    maxBatchSize: 50
  })
}

/**
 * Question Response DataLoader
 */
function createQuestionResponseLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (qResponseIds: readonly string[]) => {
    try {
      const { data, error } = await supabase
        .from('question_responses')
        .select(`
          *,
          question:questions(id, title, type),
          response:responses(id, survey_id),
          voice_recording:voice_recordings(*)
        `)
        .in('id', [...qResponseIds])
      
      if (error) {
        console.error('Error loading question responses:', error)
        return qResponseIds.map(() => null)
      }
      
      const qResponseMap = new Map()
      data?.forEach(qResponse => {
        qResponseMap.set(qResponse.id, {
          ...qResponse,
          questionId: qResponse.question_id,
          responseId: qResponse.response_id,
          textAnswer: qResponse.text_answer,
          numberAnswer: qResponse.number_answer,
          booleanAnswer: qResponse.boolean_answer,
          choiceAnswers: qResponse.choice_answers || [],
          dateAnswer: qResponse.date_answer ? new Date(qResponse.date_answer) : null,
          fileAnswers: qResponse.file_answers || [],
          matrixAnswers: qResponse.matrix_answers,
          voiceRecordingId: qResponse.voice_recording_id,
          jtbdScores: qResponse.jtbd_scores,
          timeSpent: qResponse.time_spent || 0,
          answeredAt: new Date(qResponse.answered_at)
        })
      })
      
      return qResponseIds.map(id => qResponseMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (question responses):', error)
      return qResponseIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `qresponse:${key}`,
    maxBatchSize: 100
  })
}

/**
 * Survey Analytics DataLoader (cached analytics)
 */
function createSurveyAnalyticsLoader(supabase: SupabaseClient) {
  return new DataLoader<string, any>(async (surveyIds: readonly string[]) => {
    try {
      // This would typically load cached analytics data
      const { data, error } = await supabase
        .from('survey_analytics_cache')
        .select('*')
        .in('survey_id', [...surveyIds])
      
      if (error) {
        console.error('Error loading survey analytics:', error)
        return surveyIds.map(() => null)
      }
      
      const analyticsMap = new Map()
      data?.forEach(analytics => {
        analyticsMap.set(analytics.survey_id, {
          ...analytics,
          surveyId: analytics.survey_id,
          totalSessions: analytics.total_sessions || 0,
          totalResponses: analytics.total_responses || 0,
          completedResponses: analytics.completed_responses || 0,
          averageCompletionTime: analytics.average_completion_time || 0,
          completionRate: analytics.completion_rate || 0,
          abandonmentRate: analytics.abandonment_rate || 0,
          responsesOverTime: analytics.responses_over_time || [],
          insights: analytics.insights || [],
          themes: analytics.themes || [],
          sentiment: analytics.sentiment || {},
          demographics: analytics.demographics || {},
          dataQualityScore: analytics.data_quality_score || 0,
          executiveSummary: analytics.executive_summary || '',
          keyFindings: analytics.key_findings || [],
          recommendations: analytics.recommendations || [],
          lastUpdated: analytics.updated_at ? new Date(analytics.updated_at) : null
        })
      })
      
      return surveyIds.map(id => analyticsMap.get(id) || null)
    } catch (error) {
      console.error('DataLoader error (survey analytics):', error)
      return surveyIds.map(() => null)
    }
  }, {
    cacheKeyFn: (key) => `analytics:${key}`,
    maxBatchSize: 20,
    // Analytics can be cached longer since they're computed asynchronously
    cacheMap: new Map(),
    cache: true
  })
}

/**
 * Utility function to clear all DataLoader caches
 */
export function clearDataLoaderCaches(dataSources: DataLoaders) {
  Object.values(dataSources).forEach(loader => {
    loader.clearAll()
  })
}

/**
 * Utility function to prime DataLoader caches
 */
export function primeDataLoaderCache<T>(loader: DataLoader<string, T>, id: string, value: T) {
  loader.prime(id, value)
}
