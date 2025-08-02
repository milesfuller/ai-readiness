/**
 * CSRF Protection Implementation
 * Provides Cross-Site Request Forgery protection for forms and API endpoints
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'

// CSRF token configuration
export interface CSRFConfig {
  secret: string
  tokenLength: number
  cookieName: string
  headerName: string
  sessionTimeout: number // in milliseconds
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
}

// Default CSRF configuration
const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  tokenLength: 32,
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
}

// Token store for server-side validation
interface CSRFTokenData {
  token: string
  timestamp: number
  userAgent?: string
  ip?: string
}

class CSRFTokenStore {
  private tokens = new Map<string, CSRFTokenData>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)
  }

  set(sessionId: string, tokenData: CSRFTokenData): void {
    this.tokens.set(sessionId, tokenData)
  }

  get(sessionId: string): CSRFTokenData | undefined {
    const tokenData = this.tokens.get(sessionId)
    if (tokenData && Date.now() - tokenData.timestamp < defaultConfig.sessionTimeout) {
      return tokenData
    }
    if (tokenData) {
      this.tokens.delete(sessionId)
    }
    return undefined
  }

  delete(sessionId: string): void {
    this.tokens.delete(sessionId)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now - tokenData.timestamp >= defaultConfig.sessionTimeout) {
        this.tokens.delete(sessionId)
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.tokens.clear()
  }
}

// Global token store
const tokenStore = new CSRFTokenStore()

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number = defaultConfig.tokenLength): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate HMAC signature for token validation
 */
function generateTokenSignature(token: string, secret: string, timestamp: number): string {
  const data = `${token}:${timestamp}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Create a CSRF token with signature
 */
export function createCSRFToken(
  sessionId: string,
  config: CSRFConfig = defaultConfig,
  userAgent?: string,
  ip?: string
): string {
  const token = generateSecureToken(config.tokenLength)
  const timestamp = Date.now()
  const signature = generateTokenSignature(token, config.secret, timestamp)
  
  // Store token data for server-side validation
  tokenStore.set(sessionId, {
    token,
    timestamp,
    userAgent,
    ip
  })
  
  // Return token with timestamp and signature
  return `${token}:${timestamp}:${signature}`
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(
  sessionId: string,
  providedToken: string,
  config: CSRFConfig = defaultConfig,
  userAgent?: string,
  ip?: string
): { valid: boolean; error?: string } {
  try {
    // Parse provided token
    const parts = providedToken.split(':')
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [token, timestampStr, signature] = parts
    const timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid timestamp in token' }
    }

    // Check token expiration
    if (Date.now() - timestamp > config.sessionTimeout) {
      return { valid: false, error: 'Token has expired' }
    }

    // Verify signature
    const expectedSignature = generateTokenSignature(token, config.secret, timestamp)
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return { valid: false, error: 'Invalid token signature' }
    }

    // Verify against stored token
    const storedTokenData = tokenStore.get(sessionId)
    if (!storedTokenData) {
      return { valid: false, error: 'Token not found or expired' }
    }

    if (storedTokenData.token !== token) {
      return { valid: false, error: 'Token mismatch' }
    }

    // Optional: Verify user agent and IP for additional security
    if (storedTokenData.userAgent && userAgent && storedTokenData.userAgent !== userAgent) {
      return { valid: false, error: 'User agent mismatch' }
    }

    if (storedTokenData.ip && ip && storedTokenData.ip !== ip) {
      return { valid: false, error: 'IP address mismatch' }
    }

    return { valid: true }
  } catch (error) {
    console.error('CSRF validation error:', error)
    return { valid: false, error: 'Token validation failed' }
  }
}

/**
 * Extract session ID from request
 */
function getSessionId(request: NextRequest): string | null {
  // Try to get session ID from Supabase session
  const authCookie = request.cookies.get('sb-access-token')?.value
  if (authCookie) {
    // Use a hash of the auth token as session ID for privacy
    return crypto.createHash('sha256').update(authCookie).digest('hex').substring(0, 32)
  }

  // Fallback to a combination of IP and User-Agent
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex').substring(0, 32)
}

/**
 * Middleware for CSRF protection
 */
export async function csrfProtection(
  request: NextRequest,
  config: Partial<CSRFConfig> = defaultConfig
): Promise<{ success: boolean; error?: string; token?: string }> {
  const finalConfig = { ...defaultConfig, ...config } as CSRFConfig
  const method = request.method
  
  // Skip CSRF protection for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const sessionId = getSessionId(request)
    if (!sessionId) {
      return { success: false, error: 'Unable to establish session' }
    }

    // Generate token for safe methods to be used in subsequent requests
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               request.ip || 
               undefined
    
    const token = createCSRFToken(sessionId, finalConfig, userAgent, ip)
    return { success: true, token }
  }

  // Validate CSRF token for unsafe methods
  const sessionId = getSessionId(request)
  if (!sessionId) {
    return { success: false, error: 'Unable to establish session' }
  }

  // Get token from header or form data
  let token = request.headers.get(finalConfig.headerName)
  
  if (!token) {
    // Try to get token from form data or JSON body
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      token = formData.get('csrf_token') as string
    } else if (contentType?.includes('application/json')) {
      try {
        const body = await request.json()
        token = body.csrf_token
      } catch {
        // Ignore JSON parsing errors
      }
    }
  }

  if (!token) {
    return { success: false, error: 'CSRF token missing' }
  }

  const userAgent = request.headers.get('user-agent') || undefined
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             request.ip || 
             undefined

  const validation = validateCSRFToken(sessionId, token, finalConfig, userAgent, ip)
  
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  return { success: true }
}

/**
 * Create CSRF protection middleware for API routes
 */
export function withCSRFProtection(config?: Partial<CSRFConfig>) {
  const finalConfig = { ...defaultConfig, ...config }

  return function (handler: Function) {
    return async function (request: NextRequest, ...args: any[]) {
      const protection = await csrfProtection(request, finalConfig)
      
      if (!protection.success) {
        return new Response(
          JSON.stringify({
            error: 'CSRF Protection Failed',
            message: protection.error
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }

      // Add CSRF token to response headers for GET requests
      const response = await handler(request, ...args)
      
      if (request.method === 'GET' && protection.token && response instanceof Response) {
        response.headers.set('X-CSRF-Token', protection.token)
      }
      
      return response
    }
  }
}

/**
 * Client-side helper to get CSRF token
 */
export function getCSRFTokenFromResponse(response: Response): string | null {
  return response.headers.get('X-CSRF-Token')
}

/**
 * Generate CSRF token for forms
 */
export async function generateCSRFTokenForForm(sessionId?: string): Promise<string> {
  if (!sessionId) {
    // Generate a temporary session ID if none provided
    sessionId = crypto.randomBytes(16).toString('hex')
  }
  
  return createCSRFToken(sessionId, defaultConfig)
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanup(): void {
  tokenStore.destroy()
}

/**
 * Double Submit Cookie pattern implementation
 */
export class DoubleSubmitCSRF {
  private config: CSRFConfig

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  generateToken(): string {
    return generateSecureToken(this.config.tokenLength)
  }

  validateDoubleSubmit(cookieToken: string, headerToken: string): boolean {
    if (!cookieToken || !headerToken) {
      return false
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(cookieToken, 'hex'),
        Buffer.from(headerToken, 'hex')
      )
    } catch {
      return false
    }
  }

  setCookie(response: Response, token: string): void {
    const cookieValue = `${this.config.cookieName}=${token}; ` +
      `HttpOnly; Secure=${this.config.secure}; ` +
      `SameSite=${this.config.sameSite}; ` +
      `Max-Age=${Math.floor(this.config.sessionTimeout / 1000)}`
    
    response.headers.append('Set-Cookie', cookieValue)
  }
}

export default {
  createCSRFToken,
  validateCSRFToken,
  csrfProtection,
  withCSRFProtection,
  generateCSRFTokenForForm,
  cleanup,
  DoubleSubmitCSRF
}