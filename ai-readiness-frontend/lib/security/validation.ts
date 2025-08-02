/**
 * Input Validation and Sanitization Utilities
 * Provides comprehensive input validation and sanitization for security
 */

import { z } from 'zod'

// HTML sanitization patterns
const HTML_TAGS_REGEX = /<[^>]*>/g
const SCRIPT_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
const JAVASCRIPT_PROTOCOL_REGEX = /javascript:/gi
const DATA_URL_REGEX = /data:[^;]*;base64/gi
const SQL_INJECTION_PATTERNS = [
  /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi,
  /((\%27)|(\')|((\%3D)|(=)))/gi,
  /((\%3C)|(<)|((\%3E)|(>)))/gi,
  /((\%22)|(")|(\%27)|(\'))/gi
]

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload=/gi,
  /onerror=/gi,
  /onclick=/gi,
  /onmouseover=/gi
]

// Common validation schemas
export const validationSchemas = {
  // User input validation
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),

  email: z.string()
    .email('Invalid email format')
    .max(320, 'Email must not exceed 320 characters'),

  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  // Survey and form validation
  surveyResponse: z.string()
    .max(5000, 'Response must not exceed 5000 characters')
    .transform(sanitizeHtml),

  organizationName: z.string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must not exceed 100 characters')
    .transform(sanitizeBasic),

  // File upload validation
  fileName: z.string()
    .max(255, 'File name must not exceed 255 characters')
    .regex(/^[^<>:"/\\|?*]+$/, 'Invalid file name characters'),

  // API input validation
  apiKey: z.string()
    .min(10, 'API key must be at least 10 characters')
    .max(255, 'API key must not exceed 255 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format'),

  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .max(2048, 'URL must not exceed 2048 characters'),

  // ID validation
  uuid: z.string()
    .uuid('Invalid UUID format'),

  // Numeric validation
  positiveInteger: z.number()
    .int('Must be an integer')
    .positive('Must be positive'),

  // Text content validation
  safeText: z.string()
    .max(1000, 'Text must not exceed 1000 characters')
    .transform(sanitizeHtml),

  // Search query validation
  searchQuery: z.string()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Search query must not exceed 500 characters')
    .transform(sanitizeSearchQuery)
}

/**
 * Sanitize HTML content by removing dangerous elements
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return ''
  
  let sanitized = input
  
  // Remove script tags and their content
  sanitized = sanitized.replace(SCRIPT_REGEX, '')
  
  // Remove javascript: protocols
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL_REGEX, '')
  
  // Remove potentially dangerous HTML tags
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'link', 'meta', 'style',
    'form', 'input', 'button', 'select', 'textarea'
  ]
  
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })
  
  // Remove event handlers
  const eventHandlers = [
    'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown',
    'onkeyup', 'onkeypress'
  ]
  
  eventHandlers.forEach(handler => {
    const regex = new RegExp(`${handler}\\s*=\\s*["\'][^"\']*["\']`, 'gi')
    sanitized = sanitized.replace(regex, '')
  })
  
  return sanitized.trim()
}

/**
 * Basic sanitization for simple text inputs
 */
export function sanitizeBasic(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .trim()
}

/**
 * Sanitize search queries to prevent injection attacks
 */
export function sanitizeSearchQuery(input: string): string {
  if (typeof input !== 'string') return ''
  
  let sanitized = input
  
  // Remove SQL injection patterns
  SQL_INJECTION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })
  
  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '')
  })
  
  return sanitized.trim()
}

/**
 * Validate and sanitize file uploads
 */
export interface FileValidationOptions {
  maxSize: number // in bytes
  allowedTypes: string[]
  allowedExtensions: string[]
}

export function validateFile(
  file: File,
  options: FileValidationOptions
): { valid: boolean; error?: string; sanitizedName?: string } {
  // Check file size
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${options.maxSize} bytes`
    }
  }
  
  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`
    }
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !options.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension .${extension} is not allowed`
    }
  }
  
  // Sanitize file name
  const sanitizedName = sanitizeFileName(file.name)
  
  return {
    valid: true,
    sanitizedName
  }
}

/**
 * Sanitize file names
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special characters with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255) // Limit length
}

/**
 * Validate JSON input
 */
export function validateJSON(input: string): { valid: boolean; data?: any; error?: string } {
  try {
    // Check for potential JSON injection patterns
    if (/__proto__|constructor|prototype/.test(input)) {
      return {
        valid: false,
        error: 'Potentially dangerous JSON structure detected'
      }
    }
    
    const data = JSON.parse(input)
    
    // Additional validation can be added here
    if (typeof data === 'object' && data !== null) {
      // Check for prototype pollution attempts
      if (hasPrototypePollution(data)) {
        return {
          valid: false,
          error: 'Prototype pollution attempt detected'
        }
      }
    }
    
    return { valid: true, data }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid JSON format'
    }
  }
}

/**
 * Check for prototype pollution in objects
 */
function hasPrototypePollution(obj: any, depth = 0): boolean {
  if (depth > 10) return false // Prevent deep recursion
  
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  
  for (const key in obj) {
    if (dangerousKeys.includes(key)) {
      return true
    }
    
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (hasPrototypePollution(obj[key], depth + 1)) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Rate limiting for validation (prevent abuse)
 */
const validationAttempts = new Map<string, { count: number; resetTime: number }>()

export function checkValidationRateLimit(identifier: string): boolean {
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxAttempts = 100
  
  const existing = validationAttempts.get(identifier)
  
  if (existing) {
    if (existing.resetTime > now) {
      if (existing.count >= maxAttempts) {
        return false
      }
      existing.count += 1
    } else {
      validationAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
    }
  } else {
    validationAttempts.set(identifier, { count: 1, resetTime: now + windowMs })
  }
  
  return true
}

/**
 * Comprehensive input validation function
 */
export function validateInput(
  input: any,
  schema: z.ZodSchema,
  identifier?: string
): { valid: boolean; data?: any; errors?: string[] } {
  try {
    // Rate limiting check
    if (identifier && !checkValidationRateLimit(identifier)) {
      return {
        valid: false,
        errors: ['Too many validation attempts. Please try again later.']
      }
    }
    
    const result = schema.safeParse(input)
    
    if (result.success) {
      return {
        valid: true,
        data: result.data
      }
    } else {
      return {
        valid: false,
        errors: result.error.errors.map(err => err.message)
      }
    }
  } catch (error) {
    return {
      valid: false,
      errors: ['Validation error occurred']
    }
  }
}

/**
 * Export common file validation options
 */
export const fileValidationOptions = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'text/plain', 'application/msword'],
    allowedExtensions: ['pdf', 'txt', 'doc', 'docx']
  },
  csv: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['text/csv', 'application/csv'],
    allowedExtensions: ['csv']
  }
}