import { GraphQLContext } from '../context'
import { CreateSurveyInput, UpdateSurveyInput, SurveyStatus, SurveyVisibility } from '../types/generated'
import { AuthenticationError, ForbiddenError, ValidationError } from '../errors'
import { withFilter } from 'graphql-subscriptions'

/**
 * Survey-specific GraphQL resolvers
 * 
 * Handles all survey-related operations:
 * - CRUD operations with proper authorization
 * - Status management (draft, published, paused, archived)
 * - Sharing and embedding
 * - Real-time updates
 */

export const surveyResolvers = {
  Query: {
    /**
     * Get multiple surveys with filtering and pagination
     */
    surveys: async (
      parent: any,
      args: {
        pagination?: { limit?: number; offset?: number; orderBy?: string; orderDirection?: 'ASC' | 'DESC' }
        status?: SurveyStatus
        visibility?: SurveyVisibility
        search?: string
        tags?: string[]
        createdBy?: string
      },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      const {
        pagination = {},
        status,
        visibility,
        search,
        tags,
        createdBy
      } = args
      
      const {
        limit = 20,
        offset = 0,
        orderBy = 'updatedAt',
        orderDirection = 'DESC'
      } = pagination
      
      // Build filters based on user permissions
      const filters: any = {
        // Users can only see surveys from their organization unless they're system admin
        ...(!user?.permissions?.includes('surveys:read_all') && {
          organizationId: user?.organizationId
        }),
        
        // Apply provided filters
        ...(status && { status }),
        ...(visibility && { visibility }),
        ...(search && { search }),
        ...(tags && { tags }),
        ...(createdBy && { createdById: createdBy })
      }
      
      try {
        return await services.surveyService.findMany({
          filters,
          limit: Math.min(limit, 100),
          offset,
          orderBy,
          orderDirection
        })
      } catch (error) {
        console.error('Error fetching surveys:', error)
        throw new Error('Failed to fetch surveys')
      }
    }
  },
  
  Mutation: {
    /**
     * Create a new survey
     */
    createSurvey: async (
      parent: any,
      { input }: { input: CreateSurveyInput },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, requirePermission, services, pubsub } = context
      requireAuth()
      requirePermission('surveys:create')
      
      // Validate input
      if (!input.title?.trim()) {
        throw new ValidationError('Survey title is required')
      }
      
      if (!input.questions || input.questions.length === 0) {
        throw new ValidationError('Survey must have at least one question')
      }
      
      // Validate questions
      input.questions.forEach((question, index) => {
        if (!question.title?.trim()) {
          throw new ValidationError(`Question ${index + 1} title is required`)
        }
        
        if (!question.type) {
          throw new ValidationError(`Question ${index + 1} type is required`)
        }
        
        // Validate question-type specific requirements
        if (['MULTIPLE_CHOICE', 'SINGLE_CHOICE'].includes(question.type)) {
          if (!question.options || question.options.length < 2) {
            throw new ValidationError(`Question ${index + 1} must have at least 2 options`)
          }
        }
      })
      
      try {
        const survey = await services.surveyService.create({
          ...input,
          createdById: user!.id,
          organizationId: user!.organizationId!,
          status: input.publishImmediately ? SurveyStatus.PUBLISHED : SurveyStatus.DRAFT
        })
        
        // Publish real-time notification
        if (pubsub) {
          await pubsub.publish('SURVEY_CREATED', {
            surveyCreated: survey,
            organizationId: user!.organizationId
          })
        }
        
        return survey
      } catch (error) {
        console.error('Error creating survey:', error)
        throw new Error('Failed to create survey')
      }
    },
    
    /**
     * Update an existing survey
     */
    updateSurvey: async (
      parent: any,
      { id, input }: { id: string; input: UpdateSurveyInput },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, requirePermission, services, dataSources, pubsub } = context
      requireAuth()
      
      // Check if survey exists and user has permission
      const existingSurvey = await dataSources.surveyLoader.load(id)
      if (!existingSurvey) {
        throw new ValidationError('Survey not found')
      }
      
      // Check ownership or permissions
      const canEdit = 
        existingSurvey.createdById === user!.id ||
        user!.permissions?.includes('surveys:edit_all') ||
        (user!.role === 'ORG_ADMIN' && existingSurvey.organizationId === user!.organizationId)
      
      if (!canEdit) {
        throw new ForbiddenError('You do not have permission to edit this survey')
      }
      
      // Prevent editing published surveys without proper permissions
      if (existingSurvey.status === SurveyStatus.PUBLISHED && 
          !user!.permissions?.includes('surveys:edit_published')) {
        throw new ForbiddenError('Cannot edit published surveys')
      }
      
      try {
        const updatedSurvey = await services.surveyService.update(id, input)
        
        // Clear DataLoader cache
        dataSources.surveyLoader.clear(id)
        
        // Publish real-time notification
        if (pubsub) {
          await pubsub.publish('SURVEY_UPDATED', {
            surveyUpdated: updatedSurvey,
            organizationId: existingSurvey.organizationId
          })
        }
        
        return updatedSurvey
      } catch (error) {
        console.error('Error updating survey:', error)
        throw new Error('Failed to update survey')
      }
    },
    
    /**
     * Publish a draft survey
     */
    publishSurvey: async (
      parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, services, dataSources, pubsub } = context
      requireAuth()
      
      const survey = await dataSources.surveyLoader.load(id)
      if (!survey) {
        throw new ValidationError('Survey not found')
      }
      
      // Check permissions
      const canPublish = 
        survey.createdById === user!.id ||
        user!.permissions?.includes('surveys:publish') ||
        user!.role === 'ORG_ADMIN'
      
      if (!canPublish) {
        throw new ForbiddenError('You do not have permission to publish this survey')
      }
      
      if (survey.status !== SurveyStatus.DRAFT && survey.status !== SurveyStatus.PAUSED) {
        throw new ValidationError('Only draft or paused surveys can be published')
      }
      
      // Validate survey before publishing
      const validation = await services.surveyService.validateForPublishing(id)
      if (!validation.valid) {
        throw new ValidationError(`Cannot publish survey: ${validation.errors.join(', ')}`)
      }
      
      try {
        const publishedSurvey = await services.surveyService.publish(id)
        
        // Clear cache
        dataSources.surveyLoader.clear(id)
        
        // Publish notification
        if (pubsub) {
          await pubsub.publish('SURVEY_PUBLISHED', {
            surveyPublished: publishedSurvey,
            organizationId: survey.organizationId
          })
        }
        
        return publishedSurvey
      } catch (error) {
        console.error('Error publishing survey:', error)
        throw new Error('Failed to publish survey')
      }
    },
    
    /**
     * Pause a published survey
     */
    pauseSurvey: async (
      parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, services, dataSources, pubsub } = context
      requireAuth()
      
      const survey = await dataSources.surveyLoader.load(id)
      if (!survey) {
        throw new ValidationError('Survey not found')
      }
      
      // Check permissions
      const canPause = 
        survey.createdById === user!.id ||
        user!.permissions?.includes('surveys:manage') ||
        user!.role === 'ORG_ADMIN'
      
      if (!canPause) {
        throw new ForbiddenError('You do not have permission to pause this survey')
      }
      
      if (survey.status !== SurveyStatus.PUBLISHED) {
        throw new ValidationError('Only published surveys can be paused')
      }
      
      try {
        const pausedSurvey = await services.surveyService.pause(id)
        
        // Clear cache
        dataSources.surveyLoader.clear(id)
        
        // Publish notification
        if (pubsub) {
          await pubsub.publish('SURVEY_PAUSED', {
            surveyPaused: pausedSurvey,
            organizationId: survey.organizationId
          })
        }
        
        return pausedSurvey
      } catch (error) {
        console.error('Error pausing survey:', error)
        throw new Error('Failed to pause survey')
      }
    },
    
    /**
     * Archive a survey
     */
    archiveSurvey: async (
      parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, services, dataSources, pubsub } = context
      requireAuth()
      
      const survey = await dataSources.surveyLoader.load(id)
      if (!survey) {
        throw new ValidationError('Survey not found')
      }
      
      // Check permissions
      const canArchive = 
        survey.createdById === user!.id ||
        user!.permissions?.includes('surveys:archive') ||
        user!.role === 'ORG_ADMIN'
      
      if (!canArchive) {
        throw new ForbiddenError('You do not have permission to archive this survey')
      }
      
      try {
        const archivedSurvey = await services.surveyService.archive(id)
        
        // Clear cache
        dataSources.surveyLoader.clear(id)
        
        // Publish notification
        if (pubsub) {
          await pubsub.publish('SURVEY_ARCHIVED', {
            surveyArchived: archivedSurvey,
            organizationId: survey.organizationId
          })
        }
        
        return archivedSurvey
      } catch (error) {
        console.error('Error archiving survey:', error)
        throw new Error('Failed to archive survey')
      }
    }
  },
  
  /**
   * Survey field resolvers
   */
  Survey: {
    /**
     * Get survey questions with proper ordering
     */
    questions: async (survey: any, args: any, context: GraphQLContext) => {
      const { services } = context
      return await services.questionService.findBySurvey(survey.id, {
        orderBy: 'order',
        orderDirection: 'ASC'
      })
    },
    
    /**
     * Get survey settings with defaults
     */
    settings: async (survey: any, args: any, context: GraphQLContext) => {
      // Return survey settings with defaults
      return {
        allowAnonymous: true,
        requireAuth: false,
        oneResponsePerUser: true,
        enableVoice: false,
        enableJTBD: false,
        collectMetadata: true,
        randomizeQuestions: false,
        showProgressBar: true,
        allowPreviousNavigation: true,
        ...survey.settings
      }
    },
    
    /**
     * Calculate survey statistics
     */
    responseCount: async (survey: any, args: any, context: GraphQLContext) => {
      const { services } = context
      return await services.responseService.countBySurvey(survey.id)
    },
    
    completionRate: async (survey: any, args: any, context: GraphQLContext) => {
      const { services } = context
      return await services.analyticsService.getCompletionRate(survey.id)
    },
    
    averageCompletionTime: async (survey: any, args: any, context: GraphQLContext) => {
      const { services } = context
      return await services.analyticsService.getAverageCompletionTime(survey.id)
    },
    
    /**
     * Generate sharing URLs
     */
    shareUrl: async (survey: any, args: any, context: GraphQLContext) => {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      return `${baseUrl}/survey/${survey.id}`
    },
    
    embedCode: async (survey: any, args: any, context: GraphQLContext) => {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      return `<iframe src="${baseUrl}/survey/${survey.id}?embed=true" width="100%" height="600" frameborder="0"></iframe>`
    },
    
    qrCode: async (survey: any, args: any, context: GraphQLContext) => {
      const { services } = context
      return await services.qrCodeService.generate(`/survey/${survey.id}`)
    }
  }
}

/**
 * Survey subscription resolvers
 */
export const surveySubscriptions = {
  surveyUpdated: {
    subscribe: withFilter(
      (parent: any, args: any, context: GraphQLContext) => {
        const { requireAuth, pubsub } = context
        requireAuth()
        return pubsub!.asyncIterator(['SURVEY_UPDATED'])
      },
      (payload: any, variables: any, context: GraphQLContext) => {
        // Only send updates to users in the same organization
        return payload.organizationId === context.user?.organizationId
      }
    )
  },
  
  surveyPublished: {
    subscribe: withFilter(
      (parent: any, args: any, context: GraphQLContext) => {
        const { requireAuth, pubsub } = context
        requireAuth()
        return pubsub!.asyncIterator(['SURVEY_PUBLISHED'])
      },
      (payload: any, variables: any, context: GraphQLContext) => {
        return payload.organizationId === context.user?.organizationId
      }
    )
  }
}

/**
 * Survey validation utilities
 */
export const surveyValidators = {
  /**
   * Validate survey data before creation/update
   */
  validateSurveyData: (input: CreateSurveyInput | UpdateSurveyInput) => {
    const errors: string[] = []
    
    if ('title' in input && (!input.title || input.title.trim().length === 0)) {
      errors.push('Survey title is required')
    }
    
    if ('title' in input && input.title && input.title.length > 200) {
      errors.push('Survey title must be less than 200 characters')
    }
    
    if ('description' in input && input.description && input.description.length > 1000) {
      errors.push('Survey description must be less than 1000 characters')
    }
    
    if ('questions' in input && input.questions) {
      if (input.questions.length === 0) {
        errors.push('Survey must have at least one question')
      }
      
      if (input.questions.length > 100) {
        errors.push('Survey cannot have more than 100 questions')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  },
  
  /**
   * Validate question data
   */
  validateQuestion: (question: any, index: number) => {
    const errors: string[] = []
    
    if (!question.title || question.title.trim().length === 0) {
      errors.push(`Question ${index + 1}: Title is required`)
    }
    
    if (!question.type) {
      errors.push(`Question ${index + 1}: Type is required`)
    }
    
    // Validate options for choice questions
    if (['MULTIPLE_CHOICE', 'SINGLE_CHOICE'].includes(question.type)) {
      if (!question.options || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`)
      }
      
      if (question.options && question.options.length > 20) {
        errors.push(`Question ${index + 1}: Cannot have more than 20 options`)
      }
    }
    
    // Validate scale questions
    if (question.type === 'SCALE' || question.type === 'RATING') {
      if (question.validation) {
        const { minValue, maxValue } = question.validation
        if (minValue !== undefined && maxValue !== undefined && minValue >= maxValue) {
          errors.push(`Question ${index + 1}: Min value must be less than max value`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default surveyResolvers
