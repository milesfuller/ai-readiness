import { Resolvers } from '../types/generated'
import { scalarResolvers } from '../schema'
import { userResolvers } from './user.resolvers'
import { organizationResolvers } from './organization.resolvers'
import { surveyResolvers } from './survey.resolvers'
import { responseResolvers } from './response.resolvers'
import { analyticsResolvers } from './analytics.resolvers'
import { templateResolvers } from './template.resolvers'
import { subscriptionResolvers } from './subscription.resolvers'
import { AuthenticationError, ForbiddenError, ValidationError } from '../errors'
import { GraphQLContext } from '../context'

/**
 * Main GraphQL Resolvers
 * 
 * Combines all resolver modules and provides shared utilities:
 * - Authentication and authorization
 * - Error handling
 * - Data loading with DataLoader
 * - Query complexity and rate limiting
 */

export const resolvers: Resolvers<GraphQLContext> = {
  // Scalar resolvers
  ...scalarResolvers,
  
  // ==========================================
  // QUERY RESOLVERS
  // ==========================================
  Query: {
    // User queries
    me: async (parent, args, context) => {
      const { user, requireAuth } = context
      requireAuth()
      return user
    },
    
    user: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, dataSources } = context
      requireAuth()
      requirePermission('users:read')
      
      return await dataSources.userLoader.load(id)
    },
    
    users: async (parent, { pagination = {}, filters = {} }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('users:read')
      
      const { limit = 20, offset = 0 } = pagination
      return await services.userService.findMany({
        limit: Math.min(limit, 100),
        offset,
        ...filters
      })
    },
    
    // Organization queries
    organization: async (parent, { id }, context) => {
      const { user, requireAuth, dataSources } = context
      requireAuth()
      
      // Use current user's org if no ID provided
      const orgId = id || user?.organizationId
      if (!orgId) throw new ValidationError('Organization ID required')
      
      return await dataSources.organizationLoader.load(orgId)
    },
    
    organizations: async (parent, { pagination = {} }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('organizations:read')
      
      const { limit = 20, offset = 0 } = pagination
      return await services.organizationService.findMany({
        limit: Math.min(limit, 100),
        offset
      })
    },
    
    // Survey queries
    survey: async (parent, { id }, context) => {
      const { requireAuth, dataSources } = context
      requireAuth()
      
      return await dataSources.surveyLoader.load(id)
    },
    
    surveys: async (parent, args, context) => {
      return await surveyResolvers.Query.surveys(parent, args, context)
    },
    
    surveyByShareUrl: async (parent, { shareUrl }, context) => {
      const { services } = context
      return await services.surveyService.findByShareUrl(shareUrl)
    },
    
    // Response queries
    response: async (parent, { id }, context) => {
      const { requireAuth, dataSources } = context
      requireAuth()
      
      return await dataSources.responseLoader.load(id)
    },
    
    responses: async (parent, args, context) => {
      return await responseResolvers.Query.responses(parent, args, context)
    },
    
    // Session queries
    surveySession: async (parent, { id }, context) => {
      const { requireAuth, dataSources } = context
      requireAuth()
      
      return await dataSources.sessionLoader.load(id)
    },
    
    surveySessions: async (parent, args, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('sessions:read')
      
      const { surveyId, pagination = {}, status } = args
      const { limit = 20, offset = 0 } = pagination
      
      return await services.sessionService.findMany({
        surveyId,
        status,
        limit: Math.min(limit, 100),
        offset
      })
    },
    
    // Analytics queries
    surveyAnalytics: async (parent, args, context) => {
      return await analyticsResolvers.Query.surveyAnalytics(parent, args, context)
    },
    
    dashboardAnalytics: async (parent, args, context) => {
      return await analyticsResolvers.Query.dashboardAnalytics(parent, args, context)
    },
    
    responseAnalytics: async (parent, { responseId }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('analytics:read')
      
      return await services.analyticsService.getResponseAnalysis(responseId)
    },
    
    // Template queries
    surveyTemplate: async (parent, { id }, context) => {
      const { requireAuth, dataSources } = context
      requireAuth()
      
      return await dataSources.templateLoader.load(id)
    },
    
    surveyTemplates: async (parent, args, context) => {
      return await templateResolvers.Query.surveyTemplates(parent, args, context)
    },
    
    // API Key queries
    apiKeys: async (parent, { pagination = {} }, context) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      const { limit = 20, offset = 0 } = pagination
      return await services.apiKeyService.findByUser(user!.id, {
        limit: Math.min(limit, 100),
        offset
      })
    },
    
    apiKey: async (parent, { id }, context) => {
      const { user, requireAuth, dataSources } = context
      requireAuth()
      
      const apiKey = await dataSources.apiKeyLoader.load(id)
      if (!apiKey || apiKey.userId !== user!.id) {
        throw new ForbiddenError('API key not found or access denied')
      }
      
      return apiKey
    },
    
    // Search
    search: async (parent, { input }, context) => {
      const { requireAuth, services } = context
      requireAuth()
      
      return await services.searchService.search(input)
    },
    
    // System queries
    systemHealth: async (parent, args, context) => {
      const { requirePermission, services } = context
      requirePermission('system:read')
      
      return await services.systemService.getHealthStatus()
    },
    
    systemMetrics: async (parent, args, context) => {
      const { requirePermission, services } = context
      requirePermission('system:read')
      
      return await services.systemService.getMetrics()
    }
  },
  
  // ==========================================
  // MUTATION RESOLVERS
  // ==========================================
  Mutation: {
    // Survey mutations
    createSurvey: async (parent, args, context) => {
      return await surveyResolvers.Mutation.createSurvey(parent, args, context)
    },
    
    updateSurvey: async (parent, args, context) => {
      return await surveyResolvers.Mutation.updateSurvey(parent, args, context)
    },
    
    deleteSurvey: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('surveys:delete')
      
      return await services.surveyService.delete(id)
    },
    
    duplicateSurvey: async (parent, { id, title }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('surveys:create')
      
      return await services.surveyService.duplicate(id, title)
    },
    
    // Survey status mutations
    publishSurvey: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('surveys:publish')
      
      return await services.surveyService.publish(id)
    },
    
    pauseSurvey: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('surveys:manage')
      
      return await services.surveyService.pause(id)
    },
    
    archiveSurvey: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('surveys:archive')
      
      return await services.surveyService.archive(id)
    },
    
    // Response mutations
    startSurveySession: async (parent, { surveyId, userId }, context) => {
      const { services, user } = context
      
      // Use provided userId or current user
      const sessionUserId = userId || user?.id
      
      return await services.sessionService.create({
        surveyId,
        userId: sessionUserId,
        metadata: {
          ipAddress: context.request?.headers?.get('x-forwarded-for') || 'unknown',
          userAgent: context.request?.headers?.get('user-agent') || 'unknown'
        }
      })
    },
    
    submitResponse: async (parent, args, context) => {
      return await responseResolvers.Mutation.submitResponse(parent, args, context)
    },
    
    updateResponse: async (parent, args, context) => {
      return await responseResolvers.Mutation.updateResponse(parent, args, context)
    },
    
    deleteResponse: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('responses:delete')
      
      return await services.responseService.delete(id)
    },
    
    // Voice recording mutations
    uploadVoiceRecording: async (parent, { questionId, file, metadata }, context) => {
      const { requireAuth, services } = context
      requireAuth()
      
      return await services.voiceService.upload(questionId, file, metadata)
    },
    
    processVoiceRecording: async (parent, { id }, context) => {
      const { requireAuth, services } = context
      requireAuth()
      
      return await services.voiceService.process(id)
    },
    
    // Analysis mutations
    triggerResponseAnalysis: async (parent, { responseIds }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('analytics:write')
      
      return await services.analyticsService.analyzeResponses(responseIds)
    },
    
    triggerSurveyAnalysis: async (parent, { surveyId }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('analytics:write')
      
      return await services.analyticsService.analyzeSurvey(surveyId)
    },
    
    // Export mutations
    generateExport: async (parent, { surveyId, format, filters }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('exports:create')
      
      return await services.exportService.generate({
        surveyId,
        format,
        filters,
        userId: context.user!.id
      })
    },
    
    // Template mutations
    createSurveyTemplate: async (parent, { input }, context) => {
      const { requireAuth, requirePermission, services, user } = context
      requireAuth()
      requirePermission('templates:create')
      
      return await services.templateService.create({
        ...input,
        createdBy: user!.id,
        organizationId: user!.organizationId
      })
    },
    
    updateSurveyTemplate: async (parent, { id, input }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('templates:update')
      
      return await services.templateService.update(id, input)
    },
    
    deleteSurveyTemplate: async (parent, { id }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('templates:delete')
      
      return await services.templateService.delete(id)
    },
    
    duplicateTemplate: async (parent, { id, title }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('templates:create')
      
      return await services.templateService.duplicate(id, title)
    },
    
    // API key mutations
    createApiKey: async (parent, { input }, context) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      return await services.apiKeyService.create({
        ...input,
        userId: user!.id,
        organizationId: user!.organizationId
      })
    },
    
    updateApiKey: async (parent, { id, name, permissions }, context) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      return await services.apiKeyService.update(id, {
        name,
        permissions,
        userId: user!.id
      })
    },
    
    revokeApiKey: async (parent, { id }, context) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      return await services.apiKeyService.revoke(id, user!.id)
    },
    
    // Admin mutations
    updateUserRole: async (parent, { userId, role }, context) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('users:manage')
      
      return await services.userService.updateRole(userId, role)
    },
    
    updateOrganizationSettings: async (parent, { input }, context) => {
      const { user, requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('organizations:manage')
      
      return await services.organizationService.updateSettings(
        user!.organizationId!,
        input
      )
    }
  },
  
  // ==========================================
  // SUBSCRIPTION RESOLVERS
  // ==========================================
  Subscription: {
    responseSubmitted: subscriptionResolvers.responseSubmitted,
    sessionUpdated: subscriptionResolvers.sessionUpdated,
    analysisCompleted: subscriptionResolvers.analysisCompleted,
    surveyAnalysisCompleted: subscriptionResolvers.surveyAnalysisCompleted,
    systemNotification: subscriptionResolvers.systemNotification,
    organizationNotification: subscriptionResolvers.organizationNotification
  },
  
  // ==========================================
  // TYPE RESOLVERS
  // ==========================================
  
  // User type resolvers
  User: {
    ...userResolvers.User,
    
    organization: async (user, args, context) => {
      if (!user.organizationId) return null
      return await context.dataSources.organizationLoader.load(user.organizationId)
    },
    
    surveysCreated: async (user, args, context) => {
      const { services } = context
      return await services.surveyService.countByCreator(user.id)
    },
    
    responsesSubmitted: async (user, args, context) => {
      const { services } = context
      return await services.responseService.countByUser(user.id)
    }
  },
  
  // Organization type resolvers
  Organization: {
    ...organizationResolvers.Organization,
    
    members: async (org, args, context) => {
      const { services } = context
      return await services.userService.findByOrganization(org.id)
    },
    
    surveys: async (org, args, context) => {
      const { services } = context
      return await services.surveyService.findByOrganization(org.id)
    },
    
    apiKeys: async (org, args, context) => {
      const { requirePermission, services } = context
      requirePermission('api_keys:read')
      
      return await services.apiKeyService.findByOrganization(org.id)
    },
    
    memberCount: async (org, args, context) => {
      const { services } = context
      return await services.userService.countByOrganization(org.id)
    },
    
    surveyCount: async (org, args, context) => {
      const { services } = context
      return await services.surveyService.countByOrganization(org.id)
    },
    
    totalResponses: async (org, args, context) => {
      const { services } = context
      return await services.responseService.countByOrganization(org.id)
    }
  },
  
  // Survey type resolvers
  Survey: {
    ...surveyResolvers.Survey,
    
    createdBy: async (survey, args, context) => {
      return await context.dataSources.userLoader.load(survey.createdById)
    },
    
    organization: async (survey, args, context) => {
      return await context.dataSources.organizationLoader.load(survey.organizationId)
    },
    
    template: async (survey, args, context) => {
      if (!survey.templateId) return null
      return await context.dataSources.templateLoader.load(survey.templateId)
    },
    
    responses: async (survey, { limit = 20, offset = 0, status }, context) => {
      const { services } = context
      return await services.responseService.findBySurvey(survey.id, {
        limit: Math.min(limit, 100),
        offset,
        status
      })
    },
    
    sessions: async (survey, args, context) => {
      const { services } = context
      return await services.sessionService.findBySurvey(survey.id)
    },
    
    analytics: async (survey, args, context) => {
      const { requirePermission, services } = context
      requirePermission('analytics:read')
      
      return await services.analyticsService.getSurveyAnalytics(survey.id)
    },
    
    responseCount: async (survey, args, context) => {
      const { services } = context
      return await services.responseService.countBySurvey(survey.id)
    },
    
    completionRate: async (survey, args, context) => {
      const { services } = context
      return await services.analyticsService.getCompletionRate(survey.id)
    },
    
    averageCompletionTime: async (survey, args, context) => {
      const { services } = context
      return await services.analyticsService.getAverageCompletionTime(survey.id)
    },
    
    shareUrl: async (survey, args, context) => {
      const { services } = context
      return await services.surveyService.getShareUrl(survey.id)
    },
    
    embedCode: async (survey, args, context) => {
      const { services } = context
      return await services.surveyService.getEmbedCode(survey.id)
    },
    
    qrCode: async (survey, args, context) => {
      const { services } = context
      return await services.surveyService.getQRCode(survey.id)
    }
  },
  
  // Question type resolvers
  Question: {
    survey: async (question, args, context) => {
      return await context.dataSources.surveyLoader.load(question.surveyId)
    },
    
    responses: async (question, args, context) => {
      const { services } = context
      return await services.responseService.findByQuestion(question.id)
    },
    
    responseCount: async (question, args, context) => {
      const { services } = context
      return await services.responseService.countByQuestion(question.id)
    },
    
    skipRate: async (question, args, context) => {
      const { services } = context
      return await services.analyticsService.getQuestionSkipRate(question.id)
    },
    
    averageTimeSpent: async (question, args, context) => {
      const { services } = context
      return await services.analyticsService.getQuestionAverageTime(question.id)
    },
    
    topAnswers: async (question, args, context) => {
      const { services } = context
      return await services.analyticsService.getQuestionTopAnswers(question.id)
    }
  },
  
  // Response type resolvers
  Response: {
    ...responseResolvers.Response,
    
    survey: async (response, args, context) => {
      return await context.dataSources.surveyLoader.load(response.surveyId)
    },
    
    session: async (response, args, context) => {
      return await context.dataSources.sessionLoader.load(response.sessionId)
    },
    
    user: async (response, args, context) => {
      if (!response.userId) return null
      return await context.dataSources.userLoader.load(response.userId)
    },
    
    answers: async (response, args, context) => {
      const { services } = context
      return await services.responseService.getAnswers(response.id)
    },
    
    analysis: async (response, args, context) => {
      const { services } = context
      return await services.analyticsService.getResponseAnalysis(response.id)
    }
  },
  
  // Question Response type resolvers
  QuestionResponse: {
    question: async (qResponse, args, context) => {
      return await context.dataSources.questionLoader.load(qResponse.questionId)
    },
    
    response: async (qResponse, args, context) => {
      return await context.dataSources.responseLoader.load(qResponse.responseId)
    },
    
    voiceRecording: async (qResponse, args, context) => {
      if (!qResponse.voiceRecordingId) return null
      return await context.dataSources.voiceRecordingLoader.load(qResponse.voiceRecordingId)
    }
  },
  
  // Session type resolvers
  SurveySession: {
    survey: async (session, args, context) => {
      return await context.dataSources.surveyLoader.load(session.surveyId)
    },
    
    user: async (session, args, context) => {
      if (!session.userId) return null
      return await context.dataSources.userLoader.load(session.userId)
    },
    
    responses: async (session, args, context) => {
      const { services } = context
      return await services.responseService.findBySession(session.id)
    }
  },
  
  // Analytics type resolvers
  SurveyAnalytics: {
    ...analyticsResolvers.SurveyAnalytics
  },
  
  // Template type resolvers
  SurveyTemplate: {
    ...templateResolvers.SurveyTemplate,
    
    createdBy: async (template, args, context) => {
      return await context.dataSources.userLoader.load(template.createdById)
    }
  },
  
  // API Key type resolvers
  ApiKey: {
    user: async (apiKey, args, context) => {
      return await context.dataSources.userLoader.load(apiKey.userId)
    },
    
    organization: async (apiKey, args, context) => {
      return await context.dataSources.organizationLoader.load(apiKey.organizationId)
    }
  }
}

/**
 * Error handling middleware
 */
export const errorHandler = (error: any) => {
  console.error('GraphQL Error:', error)
  
  // Map database errors to GraphQL errors
  if (error.code === '23505') {
    return new ValidationError('Duplicate entry')
  }
  
  if (error.code === '23503') {
    return new ValidationError('Referenced record not found')
  }
  
  // Return original error if not mapped
  return error
}

/**
 * Resolver utilities
 */
export const resolverUtils = {
  // Pagination helper
  paginate: (args: any) => ({
    limit: Math.min(args.limit || 20, 100),
    offset: args.offset || 0
  }),
  
  // Filter builder
  buildFilters: (args: any) => {
    const filters: any = {}
    
    Object.keys(args).forEach(key => {
      if (args[key] !== null && args[key] !== undefined) {
        filters[key] = args[key]
      }
    })
    
    return filters
  },
  
  // Sort helper
  buildSort: (orderBy?: string, orderDirection = 'DESC') => ({
    field: orderBy || 'createdAt',
    direction: orderDirection
  })
}

export default resolvers
