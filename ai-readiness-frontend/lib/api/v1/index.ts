/**
 * API v1 Router and Configuration
 * 
 * Main API router for version 1 endpoints with:
 * - Request/response validation
 * - Authentication middleware
 * - Rate limiting
 * - Error handling
 * - OpenAPI documentation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkApiKeyAuth } from '../auth/api-auth'
import { enhancedRateLimiter as rateLimiter } from '../rate-limiting/index'
import { WebhookManager } from '../webhooks/webhook-manager'

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.string(),
    version: z.literal('1.0'),
    requestId: z.string(),
  }),
})

export type ApiResponse<T = any> = z.infer<typeof ApiResponseSchema> & {
  data?: T
}

// Standard error codes
export const ApiErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN', 
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  BAD_REQUEST: 'BAD_REQUEST',
} as const

// API Endpoint configurations
export interface ApiEndpointConfig {
  path: string
  methods: string[]
  requiresAuth: boolean
  rateLimitStrategy: string
  description: string
  requestSchema?: z.ZodSchema
  responseSchema?: z.ZodSchema
  webhookEvent?: string
}

// Core API endpoints registry
export const apiEndpoints: Record<string, ApiEndpointConfig> = {
  // Authentication endpoints
  'auth.login': {
    path: '/auth/login',
    methods: ['POST'],
    requiresAuth: false,
    rateLimitStrategy: 'auth',
    description: 'Authenticate user with email/password',
    requestSchema: z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
    responseSchema: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
      user: z.object({
        id: z.string(),
        email: z.string(),
        role: z.string(),
      }),
    }),
  },

  // Survey endpoints
  'surveys.list': {
    path: '/surveys',
    methods: ['GET'],
    requiresAuth: true,
    rateLimitStrategy: 'api',
    description: 'List surveys with pagination',
    responseSchema: z.object({
      surveys: z.array(z.object({
        id: z.string(),
        title: z.string(),
        status: z.string(),
        createdAt: z.string(),
      })),
      pagination: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    }),
  },

  'surveys.create': {
    path: '/surveys',
    methods: ['POST'],
    requiresAuth: true,
    rateLimitStrategy: 'api',
    description: 'Create new survey',
    requestSchema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      questions: z.array(z.object({
        type: z.enum(['multiple_choice', 'text', 'rating', 'voice']),
        question: z.string(),
        options: z.array(z.string()).optional(),
      })),
    }),
    responseSchema: z.object({
      id: z.string(),
      title: z.string(),
      status: z.literal('draft'),
      createdAt: z.string(),
    }),
    webhookEvent: 'survey.created',
  },

  // Analytics endpoints
  'analytics.dashboard': {
    path: '/analytics/dashboard',
    methods: ['GET'],
    requiresAuth: true,
    rateLimitStrategy: 'api',
    description: 'Get dashboard analytics data',
    responseSchema: z.object({
      metrics: z.object({
        totalSurveys: z.number(),
        activeUsers: z.number(),
        completionRate: z.number(),
      }),
      charts: z.array(z.object({
        type: z.string(),
        data: z.array(z.any()),
      })),
    }),
  },

  // LLM Analysis endpoints
  'llm.analyze': {
    path: '/llm/analyze',
    methods: ['POST'],
    requiresAuth: true,
    rateLimitStrategy: 'llm',
    description: 'Analyze text using LLM',
    requestSchema: z.object({
      text: z.string().min(1).max(10000),
      analysisType: z.enum(['sentiment', 'jtbd', 'themes', 'insights']),
      options: z.object({
        includeDetails: z.boolean().optional(),
        language: z.string().optional(),
      }).optional(),
    }),
    responseSchema: z.object({
      analysis: z.object({
        type: z.string(),
        results: z.any(),
        confidence: z.number(),
      }),
      processingTime: z.number(),
      tokenUsage: z.object({
        input: z.number(),
        output: z.number(),
        total: z.number(),
      }),
    }),
    webhookEvent: 'llm.analysis.completed',
  },
}

/**
 * Main API Router class
 */
export class ApiV1Router {
  private webhookManager: WebhookManager

  constructor() {
    this.webhookManager = new WebhookManager()
  }

  /**
   * Handle API request with full middleware stack
   */
  async handleRequest(
    request: NextRequest,
    endpoint: string,
    handler: (req: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> {
    const requestId = crypto.randomUUID()
    const startTime = Date.now()

    try {
      // Get endpoint configuration
      const config = apiEndpoints[endpoint]
      if (!config) {
        return this.errorResponse({
          code: ApiErrorCodes.NOT_FOUND,
          message: 'API endpoint not found',
          requestId,
        })
      }

      // Method validation
      if (!config.methods.includes(request.method)) {
        return this.errorResponse({
          code: ApiErrorCodes.METHOD_NOT_ALLOWED,
          message: `Method ${request.method} not allowed for this endpoint`,
          requestId,
        }, 405)
      }

      // Rate limiting
      const rateLimitResult = await rateLimiter.checkRateLimit(
        request,
        config.rateLimitStrategy || 'standard'
      )

      if (!rateLimitResult.success) {
        return this.errorResponse({
          code: ApiErrorCodes.RATE_LIMIT_EXCEEDED,
          message: rateLimitResult.error || 'Rate limit exceeded',
          requestId,
          details: {
            retryAfter: rateLimitResult.retryAfter,
            limit: rateLimitResult.limit,
          },
        }, 429)
      }

      // Authentication
      if (config.requiresAuth) {
        const authResult = await checkApiKeyAuth(request)
        if (!authResult.success) {
          return this.errorResponse({
            code: ApiErrorCodes.UNAUTHORIZED,
            message: authResult.error || 'Authentication required',
            requestId,
          }, 401)
        }

        // Add user context to request
        ;(request as any).user = authResult.user
      }

      // Request validation
      if (config.requestSchema && request.method !== 'GET') {
        try {
          const body = await request.json()
          const validatedData = config.requestSchema.parse(body)
          ;(request as any).validatedData = validatedData
        } catch (error) {
          return this.errorResponse({
            code: ApiErrorCodes.VALIDATION_ERROR,
            message: 'Invalid request data',
            requestId,
            details: error,
          }, 400)
        }
      }

      // Execute handler
      const response = await handler(request)

      // Response validation (if configured)
      if (config.responseSchema && response.ok) {
        try {
          const responseData = await response.clone().json()
          if (responseData.data) {
            config.responseSchema.parse(responseData.data)
          }
        } catch (error) {
          console.error('Response validation failed:', error)
          // Log but don't fail the request
        }
      }

      // Trigger webhook if configured
      if (config.webhookEvent && response.ok) {
        try {
          const responseData = await response.clone().json()
          const user = (request as any).user
          await this.webhookManager.triggerWebhook({
            event: config.webhookEvent,
            data: responseData.data,
            timestamp: new Date().toISOString(),
            requestId,
            organizationId: user?.organizationId || 'system',
            userId: user?.id,
          })
        } catch (error) {
          console.error('Webhook trigger failed:', error)
          // Don't fail the request for webhook errors
        }
      }

      // Add standard headers
      this.addStandardHeaders(response, requestId, startTime)
      
      return response

    } catch (error) {
      console.error('API request failed:', error)
      return this.errorResponse({
        code: ApiErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        requestId,
      }, 500)
    }
  }

  /**
   * Create successful API response
   */
  successResponse<T>(data: T, requestId: string): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId,
      },
    }

    return NextResponse.json(response, { status: 200 })
  }

  /**
   * Create error API response
   */
  errorResponse(
    error: {
      code: string
      message: string
      requestId: string
      details?: any
    },
    status: number = 400
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId: error.requestId,
      },
    }

    return NextResponse.json(response, { status })
  }

  /**
   * Add standard headers to response
   */
  private addStandardHeaders(
    response: NextResponse,
    requestId: string,
    startTime: number
  ): void {
    response.headers.set('X-Request-ID', requestId)
    response.headers.set('X-API-Version', '1.0')
    response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`)
    
    // CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')
  }
}

// Export singleton instance
export const apiV1Router = new ApiV1Router()

/**
 * Generate OpenAPI specification
 */
export function generateOpenApiSpec(): any {
  const spec: any = {
    openapi: '3.0.0',
    info: {
      title: 'AI Readiness API',
      version: '1.0.0',
      description: 'API for AI Readiness Assessment Platform',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Version 1 API',
      },
    ],
    paths: {},
    components: {
      schemas: {
        ApiResponse: {
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
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                version: { type: 'string' },
                requestId: { type: 'string' },
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
      },
    },
  }

  // Generate paths from endpoint configurations
  Object.entries(apiEndpoints).forEach(([key, config]) => {
    // Convert path to OpenAPI format
    const path = config.path.replace(/:(\w+)/g, '{$1}')
    
    if (!spec.paths[path]) {
      spec.paths[path] = {}
    }

    config.methods.forEach(method => {
      (spec.paths[path] as any)[method.toLowerCase()] = {
        summary: config.description,
        operationId: key,
        security: config.requiresAuth ? [{ ApiKeyAuth: [] }] : [],
        responses: {
          200: {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          400: {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          429: {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
        },
      }
    })
  })

  return spec
}