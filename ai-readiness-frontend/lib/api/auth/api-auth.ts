/**
 * API Key Authentication System
 * 
 * Provides secure API key authentication for external integrations:
 * - API key generation and management
 * - JWT token validation
 * - Role-based access control
 * - Key rotation and revocation
 * - Usage tracking and analytics
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

// API Key schemas
export const ApiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  key_hash: z.string(),
  prefix: z.string(),
  user_id: z.string(),
  organization_id: z.string(),
  permissions: z.array(z.string()),
  usage_count: z.number().default(0),
  last_used_at: z.string().nullable(),
  expires_at: z.string().nullable(),
  is_active: z.boolean().default(true),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()),
  expiresIn: z.number().optional(), // Days
  description: z.string().optional(),
})

export type ApiKey = z.infer<typeof ApiKeySchema>
export type CreateApiKeyRequest = z.infer<typeof CreateApiKeySchema>

// Authentication result
export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    role: string
    organizationId: string
  }
  apiKey?: {
    id: string
    name: string
    permissions: string[]
  }
  error?: string
}

// Permission definitions
export const ApiPermissions = {
  // Survey permissions
  SURVEYS_READ: 'surveys:read',
  SURVEYS_WRITE: 'surveys:write', 
  SURVEYS_DELETE: 'surveys:delete',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // LLM permissions
  LLM_ANALYZE: 'llm:analyze',
  LLM_BATCH: 'llm:batch',
  
  // User management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  
  // Organization permissions
  ORG_ADMIN: 'organization:admin',
  ORG_BILLING: 'organization:billing',
  
  // Webhook permissions
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_WRITE: 'webhooks:write',
} as const

export const PermissionGroups = {
  READONLY: [
    ApiPermissions.SURVEYS_READ,
    ApiPermissions.ANALYTICS_READ,
    ApiPermissions.USERS_READ,
  ],
  ANALYST: [
    ApiPermissions.SURVEYS_READ,
    ApiPermissions.ANALYTICS_READ,
    ApiPermissions.ANALYTICS_EXPORT,
    ApiPermissions.LLM_ANALYZE,
  ],
  FULL_ACCESS: Object.values(ApiPermissions),
} as const

/**
 * Generate a new API key
 */
export async function generateApiKey(
  userId: string,
  organizationId: string,
  request: CreateApiKeyRequest
): Promise<{ key: string; apiKeyId: string }> {
  const supabase = createServerSupabaseClient()
  
  // Generate key components
  const prefix = 'airead'
  const keyId = crypto.randomBytes(4).toString('hex')
  const secret = crypto.randomBytes(24).toString('hex')
  const fullKey = `${prefix}_${keyId}_${secret}`
  
  // Hash the key for storage
  const keyHash = crypto
    .createHash('sha256')
    .update(fullKey)
    .digest('hex')

  // Calculate expiration
  const expiresAt = request.expiresIn 
    ? new Date(Date.now() + request.expiresIn * 24 * 60 * 60 * 1000).toISOString()
    : null

  // Store in database
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      name: request.name,
      key_hash: keyHash,
      prefix,
      user_id: userId,
      organization_id: organizationId,
      permissions: request.permissions,
      expires_at: expiresAt,
      description: request.description,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`)
  }

  return {
    key: fullKey,
    apiKeyId: data.id,
  }
}

/**
 * Validate API key from request
 */
export async function checkApiKeyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Try API key authentication first
    const apiKey = request.headers.get('X-API-Key')
    if (apiKey) {
      return await validateApiKey(apiKey)
    }

    // Try JWT authentication
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      return await validateJwtToken(token)
    }

    return {
      success: false,
      error: 'No authentication provided',
    }
  } catch (error) {
    console.error('API authentication failed:', error)
    return {
      success: false,
      error: 'Authentication failed',
    }
  }
}

/**
 * Validate API key
 */
async function validateApiKey(apiKey: string): Promise<AuthResult> {
  // Check key format
  if (!apiKey.startsWith('airead_')) {
    return {
      success: false,
      error: 'Invalid API key format',
    }
  }

  // Hash the provided key
  const keyHash = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')

  const supabase = createServerSupabaseClient()

  // Find the API key
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .select(`
      id,
      name,
      permissions,
      user_id,
      organization_id,
      usage_count,
      expires_at,
      is_active,
      users:user_id (
        id,
        email,
        role
      )
    `)
    .eq('key_hash', keyHash)
    .single()

  if (error || !apiKeyData) {
    return {
      success: false,
      error: 'Invalid API key',
    }
  }

  // Check if key is active
  if (!apiKeyData.is_active) {
    return {
      success: false,
      error: 'API key is deactivated',
    }
  }

  // Check expiration
  if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
    }
  }

  // Update usage tracking (async, don't wait)
  supabase
    .from('api_keys')
    .update({
      usage_count: apiKeyData.usage_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', apiKeyData.id)
    .then(() => {})
    .catch(console.error)

  return {
    success: true,
    user: {
      id: apiKeyData.users.id,
      email: apiKeyData.users.email,
      role: apiKeyData.users.role,
      organizationId: apiKeyData.organization_id,
    },
    apiKey: {
      id: apiKeyData.id,
      name: apiKeyData.name,
      permissions: apiKeyData.permissions,
    },
  }
}

/**
 * Validate JWT token
 */
async function validateJwtToken(token: string): Promise<AuthResult> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = jwt.verify(token, secret) as any
    
    // Get user from database
    const supabase = createServerSupabaseClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, organization_id')
      .eq('id', decoded.sub)
      .single()

    if (error || !user) {
      return {
        success: false,
        error: 'User not found',
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JWT token',
    }
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission) ||
         userPermissions.includes(ApiPermissions.ORG_ADMIN)
}

/**
 * Middleware to check specific permissions
 */
export function requirePermission(permission: string) {
  return async (request: NextRequest, authResult: AuthResult): Promise<boolean> => {
    if (!authResult.success || !authResult.apiKey) {
      return false
    }

    return hasPermission(authResult.apiKey.permissions, permission)
  }
}

/**
 * List API keys for a user/organization
 */
export async function listApiKeys(
  userId: string,
  organizationId: string
): Promise<ApiKey[]> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`)
  }

  // Remove sensitive data
  return data.map(key => ({
    ...key,
    key_hash: undefined,
  }))
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  apiKeyId: string,
  userId: string,
  organizationId: string
): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', apiKeyId)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to revoke API key: ${error.message}`)
  }
}

/**
 * Update API key permissions
 */
export async function updateApiKeyPermissions(
  apiKeyId: string,
  permissions: string[],
  userId: string,
  organizationId: string
): Promise<void> {
  const supabase = createServerSupabaseClient()
  
  const { error } = await supabase
    .from('api_keys')
    .update({ 
      permissions,
      updated_at: new Date().toISOString(),
    })
    .eq('id', apiKeyId)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to update API key: ${error.message}`)
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyStats(
  organizationId: string,
  timeframe: 'day' | 'week' | 'month' = 'week'
): Promise<{
  totalKeys: number
  activeKeys: number
  totalUsage: number
  usageByKey: Array<{
    id: string
    name: string
    usageCount: number
    lastUsed: string | null
  }>
}> {
  const supabase = createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, usage_count, last_used_at, is_active')
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to get API key stats: ${error.message}`)
  }

  const totalKeys = data.length
  const activeKeys = data.filter(key => key.is_active).length
  const totalUsage = data.reduce((sum, key) => sum + key.usage_count, 0)
  
  const usageByKey = data.map(key => ({
    id: key.id,
    name: key.name,
    usageCount: key.usage_count,
    lastUsed: key.last_used_at,
  }))

  return {
    totalKeys,
    activeKeys,
    totalUsage,
    usageByKey,
  }
}