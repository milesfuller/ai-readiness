import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../supabase/server'
import { ServerAuthHelpers, AuditLogger } from '../auth/auth-helpers'
import type { UserRole } from '../types/database.types'

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  metadata?: Record<string, any>
}

// API error class
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Response helpers
export class ApiHelpers {
  // Success responses
  static success<T>(data: T, metadata?: Record<string, any>): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      metadata,
    })
  }

  static created<T>(data: T, metadata?: Record<string, any>): NextResponse<ApiResponse<T>> {
    return NextResponse.json({
      success: true,
      data,
      metadata,
    }, { status: HTTP_STATUS.CREATED })
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: HTTP_STATUS.NO_CONTENT })
  }

  // Error responses
  static error(
    statusCode: number,
    code: string,
    message: string,
    details?: any
  ): NextResponse<ApiResponse> {
    return NextResponse.json({
      success: false,
      error: {
        code,
        message,
        details,
      },
    }, { status: statusCode })
  }

  static badRequest(message: string, details?: any): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST', message, details)
  }

  static unauthorized(message: string = 'Authentication required'): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED', message)
  }

  static forbidden(message: string = 'Insufficient permissions'): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.FORBIDDEN, 'FORBIDDEN', message)
  }

  static notFound(message: string = 'Resource not found'): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', message)
  }

  static methodNotAllowed(method: string): NextResponse<ApiResponse> {
    return this.error(
      HTTP_STATUS.METHOD_NOT_ALLOWED,
      'METHOD_NOT_ALLOWED',
      `Method ${method} not allowed`
    )
  }

  static conflict(message: string, details?: any): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.CONFLICT, 'CONFLICT', message, details)
  }

  static validationError(message: string, details?: any): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', message, details)
  }

  static internalServerError(message: string = 'Internal server error'): NextResponse<ApiResponse> {
    return this.error(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR', message)
  }

  // Pagination helpers
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    metadata?: Record<string, any>
  ): NextResponse<ApiResponse<T[]>> {
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      metadata,
    })
  }

  // Request parsing
  static async parseBody<T>(request: NextRequest): Promise<T> {
    try {
      const body = await request.json()
      return body as T
    } catch (error) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'INVALID_JSON',
        'Invalid JSON in request body'
      )
    }
  }

  static getQueryParams(request: NextRequest): URLSearchParams {
    return new URL(request.url).searchParams
  }

  static getPathParams(request: NextRequest, paramName: string): string | null {
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const paramIndex = pathSegments.findIndex(segment => segment === paramName)
    return paramIndex !== -1 && paramIndex < pathSegments.length - 1
      ? pathSegments[paramIndex + 1]
      : null
  }

  // Validation helpers
  static validateRequired(data: Record<string, any>, fields: string[]): void {
    const missing = fields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    )

    if (missing.length > 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'MISSING_FIELDS',
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      )
    }
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static validateUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  // Rate limiting (basic implementation)
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>()

  static checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000 // 1 minute
  ): boolean {
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [key, value] of this.rateLimitMap.entries()) {
      if (value.resetTime < windowStart) {
        this.rateLimitMap.delete(key)
      }
    }

    const current = this.rateLimitMap.get(identifier)

    if (!current) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now })
      return true
    }

    if (current.resetTime < windowStart) {
      this.rateLimitMap.set(identifier, { count: 1, resetTime: now })
      return true
    }

    if (current.count >= maxRequests) {
      return false
    }

    current.count += 1
    return true
  }

  // IP address extraction
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const clientIP = request.ip

    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    return realIP || clientIP || 'unknown'
  }

  // User agent extraction
  static getUserAgent(request: NextRequest): string {
    return request.headers.get('user-agent') || 'unknown'
  }
}

// API handler wrapper with common functionality
export function createApiHandler<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    try {
      // Rate limiting
      const clientIP = ApiHelpers.getClientIP(request)
      if (!ApiHelpers.checkRateLimit(clientIP)) {
        return ApiHelpers.error(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          'RATE_LIMIT_EXCEEDED',
          'Too many requests'
        )
      }

      // Execute handler
      const response = await handler(request, context)

      // Log successful API calls
      await AuditLogger.log({
        eventType: 'api_call',
        eventCategory: 'system',
        description: `API call: ${request.method} ${new URL(request.url).pathname}`,
        eventData: {
          method: request.method,
          path: new URL(request.url).pathname,
          userAgent: ApiHelpers.getUserAgent(request),
          ipAddress: clientIP,
        },
        status: 'success',
        impactLevel: 'low',
        userAgent: ApiHelpers.getUserAgent(request),
        ipAddress: clientIP,
      })

      return response
    } catch (error) {
      console.error('API handler error:', error)

      // Log failed API calls
      await AuditLogger.log({
        eventType: 'api_error',
        eventCategory: 'system',
        description: `API error: ${request.method} ${new URL(request.url).pathname}`,
        eventData: {
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
          userAgent: ApiHelpers.getUserAgent(request),
          ipAddress: ApiHelpers.getClientIP(request),
        },
        status: 'failure',
        impactLevel: 'medium',
        userAgent: ApiHelpers.getUserAgent(request),
        ipAddress: ApiHelpers.getClientIP(request),
      })

      if (error instanceof ApiError) {
        return ApiHelpers.error(error.statusCode, error.code, error.message, error.details)
      }

      return ApiHelpers.internalServerError()
    }
  }
}

// Authentication middleware
export function withAuth<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>,
  options: {
    requireRole?: UserRole
    requireOrgAdmin?: boolean
  } = {}
) {
  return createApiHandler(async (request: NextRequest, context?: any) => {
    try {
      // Check authentication
      const user = await ServerAuthHelpers.getCurrentUser()
      if (!user) {
        return ApiHelpers.unauthorized()
      }

      // Check role requirements
      if (options.requireRole) {
        const hasRole = await ServerAuthHelpers.hasRole(options.requireRole)
        if (!hasRole) {
          return ApiHelpers.forbidden(`Role '${options.requireRole}' required`)
        }
      }

      // Check org admin requirements
      if (options.requireOrgAdmin) {
        const profile = await ServerAuthHelpers.getUserProfile()
        if (!profile || (profile.role !== 'admin' && profile.role !== 'org_admin')) {
          return ApiHelpers.forbidden('Organization admin role required')
        }
      }

      return handler(request, context)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'AUTH_ERROR',
        'Authentication check failed'
      )
    }
  })
}

// Method validation middleware
export function withMethods<T = any>(
  handlers: Partial<Record<string, (request: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>>>,
  globalAuth?: {
    requireRole?: UserRole
    requireOrgAdmin?: boolean
  }
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    const method = request.method
    const handler = handlers[method]

    if (!handler) {
      return ApiHelpers.methodNotAllowed(method)
    }

    // Apply global auth if specified
    if (globalAuth) {
      return withAuth(handler, globalAuth)(request, context)
    }

    return createApiHandler(handler)(request, context)
  }
}

// CORS headers
export function withCors<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<ApiResponse<T>>>,
  options: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>> => {
    const response = await handler(request, context)

    // Add CORS headers
    const origin = options.origin || '*'
    const methods = options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    const headers = options.headers || ['Content-Type', 'Authorization']

    if (typeof origin === 'string') {
      response.headers.set('Access-Control-Allow-Origin', origin)
    } else if (Array.isArray(origin)) {
      const requestOrigin = request.headers.get('origin')
      if (requestOrigin && origin.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin)
      }
    }

    response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '))
    response.headers.set('Access-Control-Max-Age', '86400')

    return response
  }
}