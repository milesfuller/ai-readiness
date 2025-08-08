import { GraphQLError } from 'graphql'

/**
 * Custom GraphQL Error Classes
 * 
 * Provides typed error handling for GraphQL resolvers with proper
 * error codes, messages, and HTTP status codes for client consumption.
 */

/**
 * Base GraphQL Error
 */
export class CustomGraphQLError extends GraphQLError {
  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    extensions?: Record<string, any>
  ) {
    super(message, {
      extensions: {
        code,
        statusCode,
        timestamp: new Date().toISOString(),
        ...extensions
      }
    })
  }
}

/**
 * Authentication required error
 */
export class AuthenticationError extends CustomGraphQLError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHENTICATED', 401)
  }
}

/**
 * Insufficient permissions error
 */
export class ForbiddenError extends CustomGraphQLError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403)
  }
}

/**
 * Validation error
 */
export class ValidationError extends CustomGraphQLError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, {
      field
    })
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends CustomGraphQLError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`
    
    super(message, 'NOT_FOUND', 404, {
      resource,
      id
    })
  }
}

/**
 * Resource conflict error (e.g., duplicate entries)
 */
export class ConflictError extends CustomGraphQLError {
  constructor(message: string, field?: string) {
    super(message, 'CONFLICT', 409, {
      field
    })
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends CustomGraphQLError {
  constructor(limit: number, windowMs: number) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowMs / 1000} seconds`,
      'RATE_LIMIT_EXCEEDED',
      429,
      {
        limit,
        windowMs,
        retryAfter: Math.ceil(windowMs / 1000)
      }
    )
  }
}

/**
 * Internal server error
 */
export class InternalError extends CustomGraphQLError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500)
  }
}

/**
 * Bad user input error
 */
export class UserInputError extends CustomGraphQLError {
  constructor(message: string, invalidArgs?: Record<string, any>) {
    super(message, 'BAD_USER_INPUT', 400, {
      invalidArgs
    })
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends CustomGraphQLError {
  constructor(service: string, retryAfter?: number) {
    super(
      `Service unavailable: ${service}`,
      'SERVICE_UNAVAILABLE',
      503,
      {
        service,
        retryAfter
      }
    )
  }
}

/**
 * Query complexity too high error
 */
export class QueryComplexityError extends CustomGraphQLError {
  constructor(complexity: number, maxComplexity: number) {
    super(
      `Query complexity ${complexity} exceeds maximum ${maxComplexity}`,
      'QUERY_TOO_COMPLEX',
      400,
      {
        complexity,
        maxComplexity
      }
    )
  }
}

/**
 * Query depth too high error
 */
export class QueryDepthError extends CustomGraphQLError {
  constructor(depth: number, maxDepth: number) {
    super(
      `Query depth ${depth} exceeds maximum ${maxDepth}`,
      'QUERY_TOO_DEEP',
      400,
      {
        depth,
        maxDepth
      }
    )
  }
}

/**
 * File upload error
 */
export class UploadError extends CustomGraphQLError {
  constructor(message: string, filename?: string) {
    super(message, 'UPLOAD_ERROR', 400, {
      filename
    })
  }
}

/**
 * External API error
 */
export class ExternalAPIError extends CustomGraphQLError {
  constructor(service: string, statusCode: number, message?: string) {
    super(
      message || `External API error from ${service}`,
      'EXTERNAL_API_ERROR',
      502,
      {
        service,
        externalStatusCode: statusCode
      }
    )
  }
}

/**
 * Database error
 */
export class DatabaseError extends CustomGraphQLError {
  constructor(message: string = 'Database error', operation?: string) {
    super(message, 'DATABASE_ERROR', 500, {
      operation
    })
  }
}

/**
 * Error handler middleware
 */
export function formatError(error: any) {
  // Log the error for debugging
  console.error('GraphQL Error:', {
    message: error.message,
    code: error.extensions?.code,
    path: error.path,
    locations: error.locations,
    source: error.source?.body,
    stack: error.stack
  })
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !error.extensions?.code) {
    return new InternalError()
  }
  
  // Map common database errors to user-friendly messages
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('This record already exists')
      case '23503': // Foreign key violation
        return new ValidationError('Referenced record does not exist')
      case '23502': // Not null violation
        return new ValidationError('Required field is missing')
      case '42703': // Undefined column
        return new ValidationError('Invalid field specified')
      case '42P01': // Undefined table
        return new InternalError('Database schema error')
    }
  }
  
  return error
}

/**
 * Error classification helper
 */
export function isUserError(error: any): boolean {
  const userErrorCodes = [
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'CONFLICT',
    'BAD_USER_INPUT',
    'QUERY_TOO_COMPLEX',
    'QUERY_TOO_DEEP',
    'UPLOAD_ERROR'
  ]
  
  return userErrorCodes.includes(error.extensions?.code)
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: any): ErrorSeverity {
  const code = error.extensions?.code
  const statusCode = error.extensions?.statusCode
  
  if (statusCode >= 500) {
    return ErrorSeverity.CRITICAL
  }
  
  if (statusCode >= 400) {
    switch (code) {
      case 'UNAUTHENTICATED':
      case 'FORBIDDEN':
        return ErrorSeverity.HIGH
      case 'VALIDATION_ERROR':
      case 'NOT_FOUND':
      case 'BAD_USER_INPUT':
        return ErrorSeverity.MEDIUM
      case 'RATE_LIMIT_EXCEEDED':
        return ErrorSeverity.LOW
      default:
        return ErrorSeverity.MEDIUM
    }
  }
  
  return ErrorSeverity.LOW
}

/**
 * Error reporting helper
 */
export function reportError(error: any, context?: any) {
  const severity = getErrorSeverity(error)
  
  const errorData = {
    message: error.message,
    code: error.extensions?.code,
    severity,
    timestamp: new Date().toISOString(),
    path: error.path,
    user: context?.user?.id,
    organizationId: context?.user?.organizationId,
    request: {
      ip: context?.request?.headers?.get('x-forwarded-for'),
      userAgent: context?.request?.headers?.get('user-agent'),
      referer: context?.request?.headers?.get('referer')
    },
    stack: error.stack
  }
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, DataDog, etc.
    // Example: Sentry.captureException(error, { contexts: { graphql: errorData } })
  }
  
  // Log based on severity
  if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
    console.error('Critical GraphQL Error:', errorData)
  } else {
    console.warn('GraphQL Error:', errorData)
  }
}

/**
 * Validation helpers
 */
export const validators = {
  required: (value: any, fieldName: string) => {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${fieldName} is required`)
    }
  },
  
  minLength: (value: string, min: number, fieldName: string) => {
    if (typeof value === 'string' && value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters`)
    }
  },
  
  maxLength: (value: string, max: number, fieldName: string) => {
    if (typeof value === 'string' && value.length > max) {
      throw new ValidationError(`${fieldName} must be no more than ${max} characters`)
    }
  },
  
  email: (value: string, fieldName: string = 'Email') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof value === 'string' && !emailRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid email address`)
    }
  },
  
  url: (value: string, fieldName: string = 'URL') => {
    try {
      new URL(value)
    } catch {
      throw new ValidationError(`${fieldName} must be a valid URL`)
    }
  },
  
  positiveNumber: (value: number, fieldName: string) => {
    if (typeof value !== 'number' || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`)
    }
  }
}
