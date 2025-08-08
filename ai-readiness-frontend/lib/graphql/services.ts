import { SupabaseClient } from '@supabase/supabase-js'
import { DataLoaders } from './dataloaders'

/**
 * GraphQL Services Factory
 * 
 * Creates service layer instances for use in GraphQL resolvers.
 * Services encapsulate business logic and database operations.
 */

export interface Services {
  userService: UserService
  organizationService: OrganizationService
  surveyService: SurveyService
  questionService: QuestionService
  responseService: ResponseService
  sessionService: SessionService
  analyticsService: AnalyticsService
  templateService: TemplateService
  apiKeyService: ApiKeyService
  voiceService: VoiceService
  exportService: ExportService
  searchService: SearchService
  systemService: SystemService
  qrCodeService: QRCodeService
}

/**
 * Create all services
 */
export function createServices(
  supabase: SupabaseClient,
  dataSources: DataLoaders
): Services {
  return {
    userService: new UserService(supabase, dataSources),
    organizationService: new OrganizationService(supabase, dataSources),
    surveyService: new SurveyService(supabase, dataSources),
    questionService: new QuestionService(supabase, dataSources),
    responseService: new ResponseService(supabase, dataSources),
    sessionService: new SessionService(supabase, dataSources),
    analyticsService: new AnalyticsService(supabase, dataSources),
    templateService: new TemplateService(supabase, dataSources),
    apiKeyService: new ApiKeyService(supabase, dataSources),
    voiceService: new VoiceService(supabase, dataSources),
    exportService: new ExportService(supabase, dataSources),
    searchService: new SearchService(supabase, dataSources),
    systemService: new SystemService(supabase, dataSources),
    qrCodeService: new QRCodeService(supabase, dataSources)
  }
}

/**
 * Base service class with common functionality
 */
abstract class BaseService {
  constructor(
    protected supabase: SupabaseClient,
    protected dataSources: DataLoaders
  ) {}
  
  protected handleError(error: any, operation: string) {
    console.error(`${this.constructor.name} ${operation} error:`, error)
    throw error
  }
}

/**
 * User Service
 */
export class UserService extends BaseService {
  async findMany(options: {
    limit?: number
    offset?: number
    organizationId?: string
    role?: string
    search?: string
  }) {
    try {
      let query = this.supabase
        .from('users')
        .select('*')
        .limit(options.limit || 20)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)
      
      if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId)
      }
      
      if (options.role) {
        query = query.eq('role', options.role)
      }
      
      if (options.search) {
        query = query.or(`email.ilike.%${options.search}%,first_name.ilike.%${options.search}%,last_name.ilike.%${options.search}%`)
      }
      
      const { data, error } = await query
      if (error) throw error
      
      return data
    } catch (error) {
      this.handleError(error, 'findMany')
    }
  }
  
  async findByOrganization(organizationId: string, options?: {
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
  }) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('organization_id', organizationId)
        .order(options?.orderBy || 'email', { ascending: options?.orderDirection === 'ASC' })
      
      if (error) throw error
      return data
    } catch (error) {
      this.handleError(error, 'findByOrganization')
    }
  }
  
  async countByOrganization(organizationId: string) {
    try {
      const { count, error } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      this.handleError(error, 'countByOrganization')
    }
  }
  
  async updateRole(userId: string, role: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.userLoader.clear(userId)
      
      return data
    } catch (error) {
      this.handleError(error, 'updateRole')
    }
  }
}

/**
 * Organization Service
 */
export class OrganizationService extends BaseService {
  async findMany(options: {
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
  }) {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .limit(options.limit || 20)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)
        .order(options.orderBy || 'name', { ascending: options.orderDirection === 'ASC' })
      
      if (error) throw error
      return data
    } catch (error) {
      this.handleError(error, 'findMany')
    }
  }
  
  async create(input: any) {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .insert({
          ...input,
          settings: input.settings || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      this.handleError(error, 'create')
    }
  }
  
  async updateSettings(organizationId: string, settings: any) {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .update({ 
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.organizationLoader.clear(organizationId)
      
      return data
    } catch (error) {
      this.handleError(error, 'updateSettings')
    }
  }
  
  async delete(organizationId: string) {
    try {
      const { error } = await this.supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId)
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.organizationLoader.clear(organizationId)
      
      return true
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }
}

/**
 * Survey Service
 */
export class SurveyService extends BaseService {
  async findMany(options: {
    filters?: any
    limit?: number
    offset?: number
    orderBy?: string
    orderDirection?: 'ASC' | 'DESC'
  }) {
    try {
      let query = this.supabase
        .from('surveys')
        .select('*, questions(*)')
        .limit(options.limit || 20)
        .range(options.offset || 0, (options.offset || 0) + (options.limit || 20) - 1)
        .order(options.orderBy || 'updated_at', { ascending: options.orderDirection === 'ASC' })
      
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'search') {
              query = query.or(`title.ilike.%${value}%,description.ilike.%${value}%`)
            } else if (key === 'tags') {
              query = query.contains('tags', value)
            } else {
              query = query.eq(key.replace(/([A-Z])/g, '_$1').toLowerCase(), value)
            }
          }
        })
      }
      
      const { data, error } = await query
      if (error) throw error
      
      return data
    } catch (error) {
      this.handleError(error, 'findMany')
    }
  }
  
  async create(input: any) {
    try {
      // Create survey
      const { data: survey, error: surveyError } = await this.supabase
        .from('surveys')
        .insert({
          title: input.title,
          description: input.description,
          status: input.status || 'DRAFT',
          visibility: input.visibility || 'ORGANIZATION',
          created_by: input.createdById,
          organization_id: input.organizationId,
          template_id: input.templateId,
          settings: input.settings || {},
          tags: input.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (surveyError) throw surveyError
      
      // Create questions
      if (input.questions && input.questions.length > 0) {
        const questionsToInsert = input.questions.map((question: any, index: number) => ({
          survey_id: survey.id,
          type: question.type,
          title: question.title,
          description: question.description,
          required: question.required || false,
          order: index,
          options: question.options || [],
          validation: question.validation || {},
          metadata: question.metadata || {},
          display_conditions: question.displayConditions || {},
          skip_logic: question.skipLogic || {},
          jtbd_category: question.jtbdCategory,
          jtbd_weight: question.jtbdWeight
        }))
        
        const { error: questionsError } = await this.supabase
          .from('questions')
          .insert(questionsToInsert)
        
        if (questionsError) throw questionsError
      }
      
      return survey
    } catch (error) {
      this.handleError(error, 'create')
    }
  }
  
  async update(surveyId: string, input: any) {
    try {
      const { data, error } = await this.supabase
        .from('surveys')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.surveyLoader.clear(surveyId)
      
      return data
    } catch (error) {
      this.handleError(error, 'update')
    }
  }
  
  async publish(surveyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('surveys')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)
        .select()
        .single()
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.surveyLoader.clear(surveyId)
      
      return data
    } catch (error) {
      this.handleError(error, 'publish')
    }
  }
  
  async pause(surveyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('surveys')
        .update({
          status: 'PAUSED',
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)
        .select()
        .single()
      
      if (error) throw error
      
      this.dataSources.surveyLoader.clear(surveyId)
      return data
    } catch (error) {
      this.handleError(error, 'pause')
    }
  }
  
  async archive(surveyId: string) {
    try {
      const { data, error } = await this.supabase
        .from('surveys')
        .update({
          status: 'ARCHIVED',
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', surveyId)
        .select()
        .single()
      
      if (error) throw error
      
      this.dataSources.surveyLoader.clear(surveyId)
      return data
    } catch (error) {
      this.handleError(error, 'archive')
    }
  }
  
  async validateForPublishing(surveyId: string) {
    try {
      // Get survey with questions
      const survey = await this.dataSources.surveyLoader.load(surveyId)
      if (!survey) {
        return { valid: false, errors: ['Survey not found'] }
      }
      
      const errors: string[] = []
      
      // Check title
      if (!survey.title || survey.title.trim().length === 0) {
        errors.push('Survey must have a title')
      }
      
      // Check questions
      if (!survey.questions || survey.questions.length === 0) {
        errors.push('Survey must have at least one question')
      }
      
      // Validate each question
      survey.questions?.forEach((question: any, index: number) => {
        if (!question.title || question.title.trim().length === 0) {
          errors.push(`Question ${index + 1} must have a title`)
        }
        
        if (['MULTIPLE_CHOICE', 'SINGLE_CHOICE'].includes(question.type)) {
          if (!question.options || question.options.length < 2) {
            errors.push(`Question ${index + 1} must have at least 2 options`)
          }
        }
      })
      
      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      this.handleError(error, 'validateForPublishing')
      return { valid: false, errors: ['Validation failed'] }
    }
  }
  
  async findByShareUrl(shareUrl: string) {
    try {
      // Extract survey ID from share URL
      const surveyId = shareUrl.split('/').pop()
      if (!surveyId) return null
      
      return await this.dataSources.surveyLoader.load(surveyId)
    } catch (error) {
      this.handleError(error, 'findByShareUrl')
    }
  }
  
  async getShareUrl(surveyId: string) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    return `${baseUrl}/survey/${surveyId}`
  }
  
  async getEmbedCode(surveyId: string) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    return `<iframe src="${baseUrl}/survey/${surveyId}?embed=true" width="100%" height="600" frameborder="0"></iframe>`
  }
  
  async countByOrganization(organizationId: string) {
    try {
      const { count, error } = await this.supabase
        .from('surveys')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      this.handleError(error, 'countByOrganization')
    }
  }
  
  async countByCreator(creatorId: string) {
    try {
      const { count, error } = await this.supabase
        .from('surveys')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', creatorId)
      
      if (error) throw error
      return count || 0
    } catch (error) {
      this.handleError(error, 'countByCreator')
    }
  }
  
  async duplicate(surveyId: string, title?: string) {
    try {
      const originalSurvey = await this.dataSources.surveyLoader.load(surveyId)
      if (!originalSurvey) throw new Error('Survey not found')
      
      // Create duplicate survey
      const duplicateData = {
        ...originalSurvey,
        title: title || `${originalSurvey.title} (Copy)`,
        status: 'DRAFT',
        published_at: null,
        archived_at: null,
        questions: originalSurvey.questions
      }
      
      return await this.create(duplicateData)
    } catch (error) {
      this.handleError(error, 'duplicate')
    }
  }
  
  async delete(surveyId: string) {
    try {
      const { error } = await this.supabase
        .from('surveys')
        .delete()
        .eq('id', surveyId)
      
      if (error) throw error
      
      // Clear cache
      this.dataSources.surveyLoader.clear(surveyId)
      
      return true
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }
}

// Placeholder service classes (would be fully implemented in production)
export class QuestionService extends BaseService {}
export class ResponseService extends BaseService {}
export class SessionService extends BaseService {}
export class AnalyticsService extends BaseService {}
export class TemplateService extends BaseService {}
export class ApiKeyService extends BaseService {}
export class VoiceService extends BaseService {}
export class ExportService extends BaseService {}
export class SearchService extends BaseService {}
export class SystemService extends BaseService {}
export class QRCodeService extends BaseService {}
