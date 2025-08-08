/**
 * API v2 Router and Configuration
 * 
 * Next-generation API with advanced features:
 * - GraphQL integration
 * - Enhanced authentication with JWT + API keys
 * - Real-time subscriptions via WebSockets
 * - Advanced caching and optimization
 * - Improved error handling and validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkApiKeyAuth } from '../auth/api-auth'
import { enhancedRateLimiter } from '../rate-limiting'
import { webhookManager } from '../webhooks/webhook-manager'

// V2 API Response with enhanced metadata
export const ApiV2ResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    field: z.string().optional(), // For validation errors
  }).optional(),
  meta: z.object({
    timestamp: z.string(),
    version: z.literal('2.0'),
    requestId: z.string(),
    processingTime: z.number(),
    rateLimitInfo: z.object({
      limit: z.number(),
      remaining: z.number(),
      reset: z.number(),
    }).optional(),
  }),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }).optional(),
})

export type ApiV2Response<T = any> = z.infer<typeof ApiV2ResponseSchema> & {
  data?: T
}

// Enhanced error codes for v2
export const ApiV2ErrorCodes = {
  // Standard HTTP errors
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  
  // External service errors
  LLM_SERVICE_ERROR: 'LLM_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const

// Pagination parameters
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

// Filtering and searching
export const FilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
})

// V2 API endpoint configuration with enhanced features
export interface ApiV2EndpointConfig {
  path: string
  methods: string[]
  version: '2.0'
  
  // Authentication & Authorization
  requiresAuth: boolean
  requiredPermissions: string[]
  allowedRoles: string[]
  
  // Rate limiting
  rateLimitStrategy: string
  customRateLimits?: Record<string, number>
  
  // Validation
  requestSchema?: z.ZodSchema
  responseSchema?: z.ZodSchema
  querySchema?: z.ZodSchema
  
  // Features
  supportsPagination: boolean
  supportsFiltering: boolean
  supportsRealtime: boolean
  cacheable: boolean
  cacheMaxAge?: number
  
  // Webhooks
  webhookEvents: string[]
  
  // Documentation
  description: string
  examples?: {
    request?: any
    response?: any
  }
  deprecated?: boolean
  deprecationMessage?: string
}

// V2 API endpoints registry
export const apiV2Endpoints: Record<string, ApiV2EndpointConfig> = {
  // Enhanced Survey Management
  'surveys.list.v2': {
    path: '/surveys',
    methods: ['GET'],
    version: '2.0',
    requiresAuth: true,
    requiredPermissions: ['surveys:read'],
    allowedRoles: ['admin', 'analyst', 'user'],
    rateLimitStrategy: 'api.authenticated',
    supportsPagination: true,
    supportsFiltering: true,
    supportsRealtime: true,
    cacheable: true,
    cacheMaxAge: 300, // 5 minutes
    webhookEvents: [],
    querySchema: PaginationSchema.extend(FilterSchema.shape),
    responseSchema: z.object({
      surveys: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        status: z.enum(['draft', 'published', 'paused', 'archived']),
        questionCount: z.number(),
        responseCount: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
        createdBy: z.object({
          id: z.string(),
          name: z.string(),
          email: z.string(),
        }),
      })),
    }),
    description: 'List surveys with advanced filtering and pagination',
  },

  'surveys.create.v2': {
    path: '/surveys',
    methods: ['POST'],
    version: '2.0',
    requiresAuth: true,
    requiredPermissions: ['surveys:write'],
    allowedRoles: ['admin', 'analyst'],
    rateLimitStrategy: 'api.surveys.create',
    supportsPagination: false,
    supportsFiltering: false,
    supportsRealtime: true,
    cacheable: false,
    webhookEvents: ['survey.created', 'survey.published'],
    requestSchema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      questions: z.array(z.object({
        id: z.string().optional(),
        type: z.enum(['multiple_choice', 'text', 'rating', 'voice', 'jtbd']),
        question: z.string().min(1).max(500),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
        metadata: z.record(z.any()).optional(),
      })).min(1).max(50),
      settings: z.object({
        allowAnonymous: z.boolean().default(true),
        requireAuth: z.boolean().default(false),
        enableVoice: z.boolean().default(false),
        enableJTBD: z.boolean().default(false),
        thankYouMessage: z.string().optional(),
        redirectUrl: z.string().url().optional(),
      }).optional(),
      tags: z.array(z.string()).max(10).optional(),
      publishImmediately: z.boolean().default(false),
    }),
    responseSchema: z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(['draft', 'published']),
      shareUrl: z.string(),
      createdAt: z.string(),
      questionCount: z.number(),
    }),
    description: 'Create a new survey with advanced configuration options',
  },

  // Enhanced Analytics
  'analytics.dashboard.v2': {
    path: '/analytics/dashboard',
    methods: ['GET'],
    version: '2.0',
    requiresAuth: true,
    requiredPermissions: ['analytics:read'],
    allowedRoles: ['admin', 'analyst'],
    rateLimitStrategy: 'api.authenticated',
    supportsPagination: false,
    supportsFiltering: true,
    supportsRealtime: true,
    cacheable: true,
    cacheMaxAge: 180, // 3 minutes
    webhookEvents: [],
    querySchema: z.object({
      timeframe: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).default('week'),
      organizationId: z.string().optional(),
      surveyIds: z.array(z.string()).optional(),
      includeDetails: z.boolean().default(false),
    }),
    responseSchema: z.object({
      summary: z.object({
        totalSurveys: z.number(),
        totalResponses: z.number(),
        averageCompletionRate: z.number(),
        activeUsers: z.number(),
      }),
      trends: z.array(z.object({
        metric: z.string(),
        value: z.number(),
        change: z.number(),
        changePercent: z.number(),
        period: z.string(),
      })),
      charts: z.array(z.object({
        type: z.enum(['line', 'bar', 'pie', 'area']),
        title: z.string(),
        data: z.array(z.any()),
        config: z.record(z.any()),
      })),
      insights: z.array(z.object({
        type: z.enum(['trend', 'anomaly', 'recommendation']),
        title: z.string(),
        description: z.string(),
        confidence: z.number(),
        actionable: z.boolean(),
      })),
    }),
    description: 'Advanced dashboard analytics with insights and trends',
  },

  // Enhanced LLM Analysis
  'llm.analyze.v2': {
    path: '/llm/analyze',
    methods: ['POST'],
    version: '2.0',
    requiresAuth: true,
    requiredPermissions: ['llm:analyze'],
    allowedRoles: ['admin', 'analyst'],
    rateLimitStrategy: 'api.llm.analyze',
    supportsPagination: false,
    supportsFiltering: false,
    supportsRealtime: true,
    cacheable: true,
    cacheMaxAge: 3600, // 1 hour for expensive operations
    webhookEvents: ['llm.analysis.started', 'llm.analysis.completed', 'llm.analysis.failed'],
    requestSchema: z.object({
      input: z.object({
        text: z.string().min(1).max(50000),
        type: z.enum(['response', 'transcript', 'survey_data']),
        context: z.object({
          surveyId: z.string().optional(),
          questionId: z.string().optional(),
          userId: z.string().optional(),
        }).optional(),
      }),
      analysis: z.object({
        types: z.array(z.enum(['sentiment', 'jtbd', 'themes', 'insights', 'summary', 'categorization'])),
        options: z.object({
          language: z.string().default('en'),
          includeConfidence: z.boolean().default(true),
          includeExplanation: z.boolean().default(false),
          maxTopics: z.number().min(1).max(20).default(5),
          detailLevel: z.enum(['minimal', 'standard', 'detailed']).default('standard'),
        }),
      }),
      preferences: z.object({
        async: z.boolean().default(false),
        webhookUrl: z.string().url().optional(),
        priority: z.enum(['low', 'normal', 'high']).default('normal'),
      }).optional(),
    }),
    responseSchema: z.object({
      jobId: z.string(),
      status: z.enum(['pending', 'processing', 'completed', 'failed']),
      results: z.object({
        sentiment: z.object({
          score: z.number(),
          label: z.enum(['positive', 'negative', 'neutral']),
          confidence: z.number(),
        }).optional(),
        themes: z.array(z.object({
          theme: z.string(),
          frequency: z.number(),
          confidence: z.number(),
          examples: z.array(z.string()),
        })).optional(),
        jtbd: z.object({
          jobs: z.array(z.object({
            job: z.string(),
            forces: z.object({
              progress: z.number(),
              anxiety: z.number(),
            }),
            confidence: z.number(),
          })),
        }).optional(),
        insights: z.array(z.object({
          insight: z.string(),
          type: z.enum(['pattern', 'anomaly', 'trend', 'recommendation']),
          confidence: z.number(),
          evidence: z.array(z.string()),
        })).optional(),
      }).optional(),
      metadata: z.object({
        tokenUsage: z.object({
          input: z.number(),
          output: z.number(),
          total: z.number(),
        }),
        processingTime: z.number(),
        model: z.string(),
        cost: z.number().optional(),
      }),
    }),
    description: 'Advanced LLM analysis with multiple analysis types and async processing',
  },

  // Real-time Features
  'realtime.subscribe': {
    path: '/realtime/subscribe',
    methods: ['POST'],
    version: '2.0',
    requiresAuth: true,
    requiredPermissions: ['realtime:subscribe'],
    allowedRoles: ['admin', 'analyst', 'user'],
    rateLimitStrategy: 'api.authenticated',
    supportsPagination: false,
    supportsFiltering: false,
    supportsRealtime: true,
    cacheable: false,
    webhookEvents: [],
    requestSchema: z.object({
      channels: z.array(z.string()).min(1).max(10),
      events: z.array(z.string()).optional(),
      filters: z.record(z.any()).optional(),
    }),
    description: 'Subscribe to real-time events via WebSocket connection',
  },
}

/**
 * Enhanced API V2 Router class
 */
export class ApiV2Router {
  private webhookManager = webhookManager

  /**
   * Handle V2 API request with enhanced middleware stack
   */
  async handleRequest(
    request: NextRequest,
    endpoint: string,
    handler: (req: NextRequest, context: ApiV2Context) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()
    
    try {
      // Get endpoint configuration
      const config = apiV2Endpoints[endpoint]
      if (!config) {
        return this.errorResponse({
          code: ApiV2ErrorCodes.NOT_FOUND,
          message: 'API endpoint not found',
          requestId,
        }, 404)
      }

      // Check deprecation
      if (config.deprecated) {
        console.warn(`Deprecated API endpoint accessed: ${endpoint}`)
      }

      // Method validation
      if (!config.methods.includes(request.method)) {
        return this.errorResponse({
          code: ApiV2ErrorCodes.METHOD_NOT_ALLOWED,
          message: `Method ${request.method} not allowed`,
          requestId,
        }, 405)
      }

      // Enhanced rate limiting with multi-level checks
      const rateLimitResult = await enhancedRateLimiter.checkMultipleRateLimits(
        request,
        config.rateLimitStrategy,
        {
          // These would be extracted from the authenticated user
          userId: undefined,
          organizationId: undefined,
          tier: undefined,
        }
      )

      if (!rateLimitResult.overall.success) {
        return this.errorResponse({
          code: ApiV2ErrorCodes.RATE_LIMIT_EXCEEDED,
          message: rateLimitResult.overall.error || 'Rate limit exceeded',
          requestId,
          details: {
            retryAfter: rateLimitResult.overall.retryAfter,
            limits: {
              user: rateLimitResult.user,
              organization: rateLimitResult.organization,
              global: rateLimitResult.global,
            },
          },
        }, 429)
      }

      // Authentication
      let authResult: any = { success: false }
      if (config.requiresAuth) {
        authResult = await checkApiKeyAuth(request)
        if (!authResult.success) {
          return this.errorResponse({
            code: ApiV2ErrorCodes.UNAUTHORIZED,
            message: 'Authentication required',
            requestId,
          }, 401)
        }

        // Check permissions
        if (config.requiredPermissions.length > 0) {
          const hasRequiredPerms = config.requiredPermissions.every(perm =>
            authResult.apiKey?.permissions.includes(perm) ||
            authResult.user?.role === 'admin'
          )
          
          if (!hasRequiredPerms) {
            return this.errorResponse({
              code: ApiV2ErrorCodes.INSUFFICIENT_PERMISSIONS,
              message: 'Insufficient permissions',
              requestId,
              details: {
                required: config.requiredPermissions,
                provided: authResult.apiKey?.permissions || [],
              },
            }, 403)
          }
        }
      }

      // Query parameter validation
      let validatedQuery = {}
      if (config.querySchema) {
        try {
          const query = Object.fromEntries(new URL(request.url).searchParams.entries())
          validatedQuery = config.querySchema.parse(query)
        } catch (error) {
          return this.errorResponse({
            code: ApiV2ErrorCodes.VALIDATION_ERROR,
            message: 'Invalid query parameters',
            requestId,
            details: error,
          }, 400)
        }
      }

      // Request body validation
      let validatedData = {}
      if (config.requestSchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json()
          validatedData = config.requestSchema.parse(body)
        } catch (error) {
          return this.errorResponse({
            code: ApiV2ErrorCodes.VALIDATION_ERROR,
            message: 'Invalid request body',
            requestId,
            details: error,
          }, 400)
        }
      }

      // Build request context
      const context: ApiV2Context = {
        requestId,
        startTime,
        config,
        user: authResult.user,
        apiKey: authResult.apiKey,
        query: validatedQuery,
        data: validatedData,
        rateLimitResult: rateLimitResult.overall,
      }

      // Execute handler
      const response = await handler(request, context)

      // Response validation (if configured)
      if (config.responseSchema && response.ok) {
        try {
          const responseData = await response.clone().json()
          if (responseData.data) {
            config.responseSchema.parse(responseData.data)
          }
        } catch (error) {
          console.error('Response validation failed:', error)
        }
      }

      // Trigger webhooks
      if (config.webhookEvents.length > 0 && response.ok) {
        try {
          const responseData = await response.clone().json()
          for (const eventType of config.webhookEvents) {
            await this.webhookManager.triggerWebhook({
              event: eventType,
              data: responseData.data,
              timestamp: new Date().toISOString(),
              requestId,
              organizationId: authResult.user?.organizationId || '',
              userId: authResult.user?.id,
            })
          }
        } catch (error) {
          console.error('Webhook trigger failed:', error)
        }
      }

      // Add enhanced headers
      this.addV2Headers(response, context)
      
      return response

    } catch (error) {
      console.error('API v2 request failed:', error)
      return this.errorResponse({
        code: ApiV2ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId,
      }, 500)
    }
  }

  /**
   * Create enhanced successful response
   */
  successResponse<T>(
    data: T,
    context: ApiV2Context,
    pagination?: any
  ): NextResponse {
    const response: ApiV2Response<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        requestId: context.requestId,
        processingTime: Date.now() - context.startTime,
        rateLimitInfo: {
          limit: context.rateLimitResult.limit,
          remaining: context.rateLimitResult.remaining,
          reset: context.rateLimitResult.reset,
        },
      },
      pagination,
    }

    return NextResponse.json(response, { status: 200 })
  }

  /**
   * Create enhanced error response
   */
  errorResponse(
    error: {
      code: string
      message: string
      requestId: string
      details?: any
      field?: string
    },
    status: number = 400
  ): NextResponse {
    const response: ApiV2Response = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        field: error.field,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0',
        requestId: error.requestId,
        processingTime: 0,
      },
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Add V2-specific headers
   */
  private addV2Headers(response: NextResponse, context: ApiV2Context): void {
    response.headers.set('X-Request-ID', context.requestId)
    response.headers.set('X-API-Version', '2.0')
    response.headers.set('X-Processing-Time', `${Date.now() - context.startTime}ms`)
    response.headers.set('X-Rate-Limit-Remaining', context.rateLimitResult.remaining.toString())
    response.headers.set('X-Rate-Limit-Reset', context.rateLimitResult.reset.toString())
    
    // Enhanced CORS
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Request-ID')
    response.headers.set('Access-Control-Expose-Headers', 'X-Request-ID, X-API-Version, X-Processing-Time')
    
    // Cache headers for cacheable endpoints
    if (context.config.cacheable && context.config.cacheMaxAge) {
      response.headers.set('Cache-Control', `public, max-age=${context.config.cacheMaxAge}`)
    }
  }
}

// Request context for V2 API
export interface ApiV2Context {
  requestId: string
  startTime: number
  config: ApiV2EndpointConfig
  user?: any
  apiKey?: any
  query: any
  data: any
  rateLimitResult: any
}

// Export singleton instance
export const apiV2Router = new ApiV2Router()

/**
 * Generate OpenAPI 3.1 specification for V2
 */
export function generateOpenApiV2Spec(): any {
  return {
    openapi: '3.1.0',
    info: {
      title: 'AI Readiness API v2',
      version: '2.0.0',
      description: 'Advanced API for AI Readiness Assessment Platform with enhanced features',
      contact: {
        name: 'API Support',
        url: 'https://aireadiness.com/support',
        email: 'api-support@aireadiness.com',
      },
    },
    servers: [
      {
        url: '/api/v2',
        description: 'Version 2 API',
      },
    ],
    paths: {}, // Generated from endpoints
    components: {
      schemas: {
        ApiV2Response: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
                field: { type: 'string' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string', enum: ['2.0'] },
                requestId: { type: 'string', format: 'uuid' },
                processingTime: { type: 'number' },
                rateLimitInfo: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number' },
                    remaining: { type: 'number' },
                    reset: { type: 'number' },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' },
              },
            },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  }
}