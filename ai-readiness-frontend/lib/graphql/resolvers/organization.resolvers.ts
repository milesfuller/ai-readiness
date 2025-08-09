import { GraphQLContext } from '../context'
import { AuthenticationError, ForbiddenError, ValidationError } from '../errors'
import { Resolvers, Organization, User } from '../types/generated'

/**
 * Organization-specific GraphQL resolvers
 * 
 * Handles organization-related operations:
 * - Organization management and settings
 * - Member management
 * - Organization-level statistics
 * - Settings and preferences
 */

export const organizationResolvers: Partial<Resolvers<GraphQLContext>> = {
  Query: {
    /**
     * Get organization by ID (defaults to current user's org)
     */
    organization: async (
      parent: any,
      { id }: { id?: string },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, dataSources } = context
      requireAuth()
      
      // Use provided ID or current user's organization
      const orgId = id || user?.organizationId
      if (!orgId) {
        throw new ValidationError('Organization ID required')
      }
      
      // Check if user has access to this organization
      if (orgId !== user?.organizationId && 
          !user?.permissions?.includes('organizations:read_all')) {
        throw new ForbiddenError('Access denied to this organization')
      }
      
      try {
        return await dataSources.organizationLoader.load(orgId)
      } catch (error) {
        console.error('Error fetching organization:', error)
        throw new Error('Failed to fetch organization')
      }
    },
    
    /**
     * Get all organizations (admin only)
     */
    organizations: async (
      parent: any,
      { pagination = {} }: { pagination?: { limit?: number; offset?: number } },
      context: GraphQLContext
    ) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('organizations:read_all')
      
      const { limit = 20, offset = 0 } = pagination
      
      try {
        return await services.organizationService.findMany({
          limit: Math.min(limit, 100),
          offset,
          orderBy: 'name',
          orderDirection: 'ASC'
        })
      } catch (error) {
        console.error('Error fetching organizations:', error)
        throw new Error('Failed to fetch organizations')
      }
    }
  },
  
  Mutation: {
    /**
     * Update organization settings
     */
    updateOrganizationSettings: async (
      parent: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      const { user, requireAuth, requirePermission, services, dataSources } = context
      requireAuth()
      
      const organizationId = user!.organizationId!
      if (!organizationId) {
        throw new ValidationError('User must belong to an organization')
      }
      
      // Check if user can manage organization settings
      const canManage = 
        user!.role === 'ORG_ADMIN' ||
        user!.permissions?.includes('organizations:manage')
      
      if (!canManage) {
        throw new ForbiddenError('Insufficient permissions to manage organization settings')
      }
      
      // Validate settings
      const validation = organizationValidators.validateSettings(input)
      if (!validation.valid) {
        throw new ValidationError(`Invalid settings: ${validation.errors.join(', ')}`)
      }
      
      try {
        const updatedOrg = await services.organizationService.updateSettings(
          organizationId,
          input
        )
        
        // Clear cache
        dataSources.organizationLoader.clear(organizationId)
        
        return updatedOrg
      } catch (error) {
        console.error('Error updating organization settings:', error)
        throw new Error('Failed to update organization settings')
      }
    },
    
    /**
     * Create a new organization (system admin only)
     */
    createOrganization: async (
      parent: any,
      { input }: { input: any },
      context: GraphQLContext
    ) => {
      const { requireAuth, requirePermission, services } = context
      requireAuth()
      requirePermission('organizations:create')
      
      // Validate input
      if (!input.name?.trim()) {
        throw new ValidationError('Organization name is required')
      }
      
      if (input.name.length > 100) {
        throw new ValidationError('Organization name must be less than 100 characters')
      }
      
      try {
        return await services.organizationService.create(input)
      } catch (error: any) {
        console.error('Error creating organization:', error)
        if (error?.code === '23505') {
          throw new ValidationError('An organization with this name already exists')
        }
        throw new Error('Failed to create organization')
      }
    },
    
    /**
     * Delete an organization (system admin only)
     */
    deleteOrganization: async (
      parent: any,
      { id }: { id: string },
      context: GraphQLContext
    ) => {
      const { requireAuth, requirePermission, services, dataSources } = context
      requireAuth()
      requirePermission('organizations:delete')
      
      const organization = await dataSources.organizationLoader.load(id)
      if (!organization) {
        throw new ValidationError('Organization not found')
      }
      
      // Check if organization has active surveys or members
      const memberCount = await services.userService.countByOrganization(id)
      const surveyCount = await services.surveyService.countByOrganization(id)
      
      if (memberCount > 0 || surveyCount > 0) {
        throw new ValidationError('Cannot delete organization with active members or surveys')
      }
      
      try {
        await services.organizationService.delete(id)
        
        // Clear cache
        dataSources.organizationLoader.clear(id)
        
        return true
      } catch (error) {
        console.error('Error deleting organization:', error)
        throw new Error('Failed to delete organization')
      }
    }
  },
  
  /**
   * Organization field resolvers
   */
  Organization: {
    /**
     * Get organization members
     */
    members: async (organization: Organization, args: any, context: GraphQLContext) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      // Check if user can view organization members
      const canViewMembers = 
        organization.id === user!.organizationId ||
        user!.permissions?.includes('users:read_all')
      
      if (!canViewMembers) {
        throw new ForbiddenError('Access denied to organization members')
      }
      
      try {
        return await services.userService.findByOrganization(organization.id, {
          orderBy: 'email',
          orderDirection: 'ASC'
        })
      } catch (error) {
        console.error('Error fetching organization members:', error)
        return []
      }
    },
    
    /**
     * Get organization surveys
     */
    surveys: async (organization: Organization, args: any, context: GraphQLContext) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      // Check if user can view organization surveys
      const canViewSurveys = 
        organization.id === user!.organizationId ||
        user!.permissions?.includes('surveys:read_all')
      
      if (!canViewSurveys) {
        throw new ForbiddenError('Access denied to organization surveys')
      }
      
      try {
        return await services.surveyService.findByOrganization(organization.id, {
          orderBy: 'updatedAt',
          orderDirection: 'DESC',
          limit: 50 // Limit to recent surveys
        })
      } catch (error) {
        console.error('Error fetching organization surveys:', error)
        return []
      }
    },
    
    /**
     * Get organization API keys (admin only)
     */
    apiKeys: async (organization: any, args: any, context: GraphQLContext) => {
      const { user, requireAuth, services } = context
      requireAuth()
      
      // Check if user can view API keys
      const canViewApiKeys = 
        (organization.id === user!.organizationId && user!.role === 'ORG_ADMIN') ||
        user!.permissions?.includes('api_keys:read_all')
      
      if (!canViewApiKeys) {
        throw new ForbiddenError('Access denied to organization API keys')
      }
      
      try {
        return await services.apiKeyService.findByOrganization(organization.id)
      } catch (error) {
        console.error('Error fetching organization API keys:', error)
        return []
      }
    },
    
    /**
     * Get organization settings with defaults
     */
    settings: async (organization: any, args: any, context: GraphQLContext) => {
      // Return settings with defaults
      return {
        allowSelfRegistration: false,
        defaultRole: 'USER',
        requireEmailVerification: true,
        dataRetentionDays: 365,
        enableAuditLogs: true,
        enable2FA: false,
        enableSSO: false,
        allowAnonymousResponses: true,
        enableVoiceRecording: false,
        enableJTBDAnalysis: false,
        maxSurveysPerUser: 10,
        ...organization.settings
      }
    },
    
    /**
     * Calculate organization statistics
     */
    memberCount: async (organization: any, args: any, context: GraphQLContext) => {
      const { services } = context
      try {
        return await services.userService.countByOrganization(organization.id)
      } catch (error) {
        console.error('Error counting organization members:', error)
        return 0
      }
    },
    
    surveyCount: async (organization: any, args: any, context: GraphQLContext) => {
      const { services } = context
      try {
        return await services.surveyService.countByOrganization(organization.id)
      } catch (error) {
        console.error('Error counting organization surveys:', error)
        return 0
      }
    },
    
    totalResponses: async (organization: any, args: any, context: GraphQLContext) => {
      const { services } = context
      try {
        return await services.responseService.countByOrganization(organization.id)
      } catch (error) {
        console.error('Error counting organization responses:', error)
        return 0
      }
    }
  }
}

/**
 * Organization validation utilities
 */
export const organizationValidators = {
  /**
   * Validate organization settings
   */
  validateSettings: (settings: any) => {
    const errors: string[] = []
    
    // Validate data retention days
    if (settings.dataRetentionDays !== undefined) {
      if (!Number.isInteger(settings.dataRetentionDays) || settings.dataRetentionDays < 30) {
        errors.push('Data retention days must be at least 30')
      }
      
      if (settings.dataRetentionDays > 2555) { // ~7 years
        errors.push('Data retention days cannot exceed 2555 (7 years)')
      }
    }
    
    // Validate max surveys per user
    if (settings.maxSurveysPerUser !== undefined) {
      if (!Number.isInteger(settings.maxSurveysPerUser) || settings.maxSurveysPerUser < 1) {
        errors.push('Max surveys per user must be at least 1')
      }
      
      if (settings.maxSurveysPerUser > 1000) {
        errors.push('Max surveys per user cannot exceed 1000')
      }
    }
    
    // Validate default role
    if (settings.defaultRole && 
        !['USER', 'ANALYST', 'ORG_ADMIN'].includes(settings.defaultRole)) {
      errors.push('Invalid default role')
    }
    
    // Validate SSO configuration
    if (settings.enableSSO && !settings.ssoProvider) {
      errors.push('SSO provider is required when SSO is enabled')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  },
  
  /**
   * Validate organization creation data
   */
  validateOrganizationData: (input: any) => {
    const errors: string[] = []
    
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Organization name is required')
    }
    
    if (input.name && input.name.length > 100) {
      errors.push('Organization name must be less than 100 characters')
    }
    
    if (input.domain && !/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(input.domain)) {
      errors.push('Invalid domain format')
    }
    
    if (input.description && input.description.length > 500) {
      errors.push('Organization description must be less than 500 characters')
    }
    
    if (input.website && !/^https?:\/\/.+/.test(input.website)) {
      errors.push('Website must be a valid URL')
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Organization utility functions
 */
export const organizationUtils = {
  /**
   * Check if user can access organization
   */
  canAccessOrganization: (user: any, organizationId: string) => {
    return user.organizationId === organizationId || 
           user.permissions?.includes('organizations:read_all')
  },
  
  /**
   * Check if user can manage organization
   */
  canManageOrganization: (user: any, organizationId: string) => {
    return (
      user.organizationId === organizationId && user.role === 'ORG_ADMIN'
    ) || user.permissions?.includes('organizations:manage')
  },
  
  /**
   * Get organization permissions for user
   */
  getOrganizationPermissions: (user: any, organizationId: string) => {
    const permissions: string[] = []
    
    if (user.organizationId === organizationId) {
      permissions.push('read', 'surveys:read', 'responses:read')
      
      if (user.role === 'ORG_ADMIN') {
        permissions.push('manage', 'members:manage', 'settings:manage')
      }
      
      if (user.role === 'ANALYST') {
        permissions.push('analytics:read', 'reports:create')
      }
    }
    
    // Add system-level permissions
    if (user.permissions) {
      permissions.push(...user.permissions.filter((p: string) => 
        p.startsWith('organizations:') || p.startsWith('system:')
      ))
    }
    
    return [...new Set(permissions)] // Remove duplicates
  }
}

export default organizationResolvers
