import { NextRequest } from 'next/server'
import DataLoader from 'dataloader'
import { createClient } from '@supabase/supabase-js'
import { PubSub } from 'graphql-subscriptions'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { AuthenticationError, ForbiddenError } from './errors'
import { createDataLoaders } from './dataloaders'
import { createServices } from './services'

/**
 * GraphQL Context Interface
 * 
 * Provides all the necessary context for GraphQL resolvers:
 * - Authentication and user information
 * - Database connections and services
 * - DataLoaders for efficient data fetching
 * - PubSub for real-time subscriptions
 * - Request information
 */
export interface GraphQLContext {
  // Authentication
  user: User | null
  isAuthenticated: boolean
  
  // Request information
  request: NextRequest
  
  // Database and services
  supabase: any
  services: Services
  
  // DataLoaders for N+1 query prevention
  dataSources: DataLoaders
  
  // PubSub for real-time subscriptions
  pubsub: PubSub | RedisPubSub | null
  
  // Helper functions
  requireAuth: () => User
  requirePermission: (permission: string) => User
  requireRole: (role: UserRole) => User
  requireOrganization: () => User
}

export interface User {
  id: string
  email: string
  role: UserRole
  organizationId?: string
  permissions?: string[]
  profile?: UserProfile
  isActive: boolean
  emailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  avatar?: string
  department?: string
  jobTitle?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: string
  notifications: boolean
  voiceInput: boolean
  language: string
  timezone?: string
}

export type UserRole = 'SYSTEM_ADMIN' | 'ORG_ADMIN' | 'ANALYST' | 'USER' | 'VIEWER'

export interface DataLoaders {
  userLoader: DataLoader<string, User>
  organizationLoader: DataLoader<string, any>
  surveyLoader: DataLoader<string, any>
  questionLoader: DataLoader<string, any>
  responseLoader: DataLoader<string, any>
  sessionLoader: DataLoader<string, any>
  templateLoader: DataLoader<string, any>
  apiKeyLoader: DataLoader<string, any>
  voiceRecordingLoader: DataLoader<string, any>
}

export interface Services {
  userService: any
  organizationService: any
  surveyService: any
  questionService: any
  responseService: any
  sessionService: any
  analyticsService: any
  templateService: any
  apiKeyService: any
  voiceService: any
  exportService: any
  searchService: any
  systemService: any
  qrCodeService: any
}

/**
 * Create GraphQL context from request
 */
export async function createContext(request: NextRequest): Promise<GraphQLContext> {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  // Extract user from authentication
  let user: User | null = null
  let isAuthenticated = false
  
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      // Verify JWT token
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token)
      
      if (supabaseUser && !error) {
        // Fetch full user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            user_profiles (
              *,
              preferences:user_preferences(*)
            )
          `)
          .eq('id', supabaseUser.id)
          .single()
        
        if (userProfile && !profileError) {
          user = {
            id: userProfile.id,
            email: userProfile.email,
            role: userProfile.role,
            organizationId: userProfile.organization_id,
            permissions: userProfile.permissions || [],
            profile: userProfile.user_profiles,
            isActive: userProfile.is_active,
            emailVerified: userProfile.email_verified,
            lastLoginAt: userProfile.last_login_at ? new Date(userProfile.last_login_at) : undefined,
            createdAt: new Date(userProfile.created_at),
            updatedAt: new Date(userProfile.updated_at)
          }
          isAuthenticated = true
          
          // Update last login
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      }
    }
    
    // Also try to get user from session cookie
    if (!user) {
      const cookieAuth = request.headers.get('Cookie')
      if (cookieAuth) {
        // Extract session from cookie and verify
        // Implementation depends on your session management
      }
    }
  } catch (error) {
    console.error('Error authenticating user:', error)
    // Continue with unauthenticated context
  }
  
  // Create DataLoaders
  const dataSources = createDataLoaders(supabase)
  
  // Create services
  const services = createServices(supabase, dataSources)
  
  // Initialize PubSub for subscriptions
  let pubsub: PubSub | RedisPubSub | null = null
  
  try {
    if (process.env.REDIS_URL) {
      // Use Redis for production subscriptions
      pubsub = new RedisPubSub({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3
        }
      })
    } else {
      // Use in-memory PubSub for development
      pubsub = new PubSub()
    }
  } catch (error) {
    console.warn('Failed to initialize PubSub, subscriptions will be disabled:', error)
  }
  
  // Helper functions
  const requireAuth = (): User => {
    if (!user) {
      throw new AuthenticationError('Authentication required')
    }
    return user
  }
  
  const requirePermission = (permission: string): User => {
    const authenticatedUser = requireAuth()
    
    // System admins have all permissions
    if (authenticatedUser.role === 'SYSTEM_ADMIN') {
      return authenticatedUser
    }
    
    // Check if user has the specific permission
    if (!authenticatedUser.permissions?.includes(permission)) {
      throw new ForbiddenError(`Permission required: ${permission}`)
    }
    
    return authenticatedUser
  }
  
  const requireRole = (role: UserRole): User => {
    const authenticatedUser = requireAuth()
    
    // System admins can access everything
    if (authenticatedUser.role === 'SYSTEM_ADMIN') {
      return authenticatedUser
    }
    
    // Check role hierarchy
    const roleHierarchy: UserRole[] = ['VIEWER', 'USER', 'ANALYST', 'ORG_ADMIN', 'SYSTEM_ADMIN']
    const userLevel = roleHierarchy.indexOf(authenticatedUser.role)
    const requiredLevel = roleHierarchy.indexOf(role)
    
    if (userLevel < requiredLevel) {
      throw new ForbiddenError(`Role required: ${role}`)
    }
    
    return authenticatedUser
  }
  
  const requireOrganization = (): User => {
    const authenticatedUser = requireAuth()
    
    if (!authenticatedUser.organizationId) {
      throw new ForbiddenError('User must belong to an organization')
    }
    
    return authenticatedUser
  }
  
  return {
    user,
    isAuthenticated,
    request,
    supabase,
    services,
    dataSources,
    pubsub,
    requireAuth,
    requirePermission,
    requireRole,
    requireOrganization
  }
}

/**
 * Context factory for GraphQL Yoga
 */
export const contextFactory = async (context: any) => {
  return await createContext(context.request)
}

/**
 * Permission definitions
 */
export const PERMISSIONS = {
  // User permissions
  USERS_READ: 'users:read',
  USERS_READ_ALL: 'users:read_all',
  USERS_WRITE: 'users:write',
  USERS_MANAGE: 'users:manage',
  
  // Organization permissions
  ORGANIZATIONS_READ: 'organizations:read',
  ORGANIZATIONS_READ_ALL: 'organizations:read_all',
  ORGANIZATIONS_CREATE: 'organizations:create',
  ORGANIZATIONS_MANAGE: 'organizations:manage',
  ORGANIZATIONS_DELETE: 'organizations:delete',
  
  // Survey permissions
  SURVEYS_READ: 'surveys:read',
  SURVEYS_READ_ALL: 'surveys:read_all',
  SURVEYS_CREATE: 'surveys:create',
  SURVEYS_UPDATE: 'surveys:update',
  SURVEYS_DELETE: 'surveys:delete',
  SURVEYS_PUBLISH: 'surveys:publish',
  SURVEYS_MANAGE: 'surveys:manage',
  SURVEYS_ARCHIVE: 'surveys:archive',
  SURVEYS_EDIT_PUBLISHED: 'surveys:edit_published',
  
  // Response permissions
  RESPONSES_READ: 'responses:read',
  RESPONSES_READ_ALL: 'responses:read_all',
  RESPONSES_CREATE: 'responses:create',
  RESPONSES_UPDATE: 'responses:update',
  RESPONSES_DELETE: 'responses:delete',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_READ_ALL: 'analytics:read_all',
  ANALYTICS_WRITE: 'analytics:write',
  
  // Template permissions
  TEMPLATES_READ: 'templates:read',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  
  // API Key permissions
  API_KEYS_READ: 'api_keys:read',
  API_KEYS_READ_ALL: 'api_keys:read_all',
  API_KEYS_CREATE: 'api_keys:create',
  API_KEYS_MANAGE: 'api_keys:manage',
  
  // Export permissions
  EXPORTS_CREATE: 'exports:create',
  EXPORTS_READ: 'exports:read',
  
  // Session permissions
  SESSIONS_READ: 'sessions:read',
  SESSIONS_MANAGE: 'sessions:manage',
  
  // System permissions
  SYSTEM_READ: 'system:read',
  SYSTEM_MANAGE: 'system:manage'
} as const

/**
 * Role-based permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  VIEWER: [
    PERMISSIONS.SURVEYS_READ,
    PERMISSIONS.RESPONSES_READ,
    PERMISSIONS.ANALYTICS_READ
  ],
  
  USER: [
    ...ROLE_PERMISSIONS.VIEWER,
    PERMISSIONS.SURVEYS_CREATE,
    PERMISSIONS.SURVEYS_UPDATE,
    PERMISSIONS.RESPONSES_CREATE,
    PERMISSIONS.RESPONSES_UPDATE
  ],
  
  ANALYST: [
    ...ROLE_PERMISSIONS.USER,
    PERMISSIONS.ANALYTICS_WRITE,
    PERMISSIONS.EXPORTS_CREATE,
    PERMISSIONS.TEMPLATES_READ,
    PERMISSIONS.TEMPLATES_CREATE
  ],
  
  ORG_ADMIN: [
    ...ROLE_PERMISSIONS.ANALYST,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.SURVEYS_MANAGE,
    PERMISSIONS.SURVEYS_PUBLISH,
    PERMISSIONS.SURVEYS_ARCHIVE,
    PERMISSIONS.RESPONSES_READ_ALL,
    PERMISSIONS.ANALYTICS_READ_ALL,
    PERMISSIONS.ORGANIZATIONS_MANAGE,
    PERMISSIONS.API_KEYS_CREATE,
    PERMISSIONS.API_KEYS_MANAGE,
    PERMISSIONS.SESSIONS_READ,
    PERMISSIONS.SESSIONS_MANAGE
  ],
  
  SYSTEM_ADMIN: [
    // System admins have all permissions
    ...Object.values(PERMISSIONS)
  ]
}

/**
 * Get permissions for a user role
 */
export function getPermissionsForRole(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if user has permission
 */
export function hasPermission(user: User, permission: string): boolean {
  if (user.role === 'SYSTEM_ADMIN') return true
  return user.permissions?.includes(permission) || false
}

/**
 * Check if user has any of the given permissions
 */
export function hasAnyPermission(user: User, permissions: string[]): boolean {
  if (user.role === 'SYSTEM_ADMIN') return true
  return permissions.some(permission => user.permissions?.includes(permission))
}

/**
 * Check if user has all of the given permissions
 */
export function hasAllPermissions(user: User, permissions: string[]): boolean {
  if (user.role === 'SYSTEM_ADMIN') return true
  return permissions.every(permission => user.permissions?.includes(permission))
}
