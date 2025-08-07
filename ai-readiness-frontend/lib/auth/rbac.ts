/**
 * Role-Based Access Control (RBAC) System
 * Provides centralized role and permission management
 */

import { UserRole } from '@/lib/types'

// Role definitions and hierarchy
export const ROLES = {
  USER: 'user' as const,
  ORG_ADMIN: 'org_admin' as const,
  SYSTEM_ADMIN: 'system_admin' as const
} as const

// Role hierarchy (higher roles inherit permissions from lower roles)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 1,
  org_admin: 2,
  system_admin: 3
}

// Permission definitions
export const PERMISSIONS = {
  // Survey permissions
  SURVEY_VIEW_OWN: 'survey:view:own',
  SURVEY_CREATE: 'survey:create',
  SURVEY_EDIT_OWN: 'survey:edit:own',
  SURVEY_DELETE_OWN: 'survey:delete:own',
  SURVEY_VIEW_ORG: 'survey:view:org',
  SURVEY_EDIT_ORG: 'survey:edit:org',
  SURVEY_DELETE_ORG: 'survey:delete:org',
  SURVEY_VIEW_ALL: 'survey:view:all',
  SURVEY_EDIT_ALL: 'survey:edit:all',
  SURVEY_DELETE_ALL: 'survey:delete:all',

  // User permissions
  USER_VIEW_OWN: 'user:view:own',
  USER_EDIT_OWN: 'user:edit:own',
  USER_VIEW_ORG: 'user:view:org',
  USER_EDIT_ORG: 'user:edit:org',
  USER_VIEW_ALL: 'user:view:all',
  USER_EDIT_ALL: 'user:edit:all',
  USER_DELETE_ALL: 'user:delete:all',

  // Organization permissions
  ORG_VIEW_OWN: 'org:view:own',
  ORG_EDIT_OWN: 'org:edit:own',
  ORG_VIEW_ALL: 'org:view:all',
  ORG_EDIT_ALL: 'org:edit:all',
  ORG_DELETE_ALL: 'org:delete:all',

  // Admin permissions
  ADMIN_DASHBOARD: 'admin:dashboard',
  ADMIN_SYSTEM_CONFIG: 'admin:system:config',
  ADMIN_ANALYTICS_ALL: 'admin:analytics:all',
  ADMIN_EXPORT_ALL: 'admin:export:all',

  // API permissions
  API_LLM_ACCESS: 'api:llm:access',
  API_EXPORT_ACCESS: 'api:export:access',
  API_ADMIN_ACCESS: 'api:admin:access'
} as const

// Base role permissions
const USER_PERMISSIONS = [
  PERMISSIONS.SURVEY_VIEW_OWN,
  PERMISSIONS.SURVEY_CREATE,
  PERMISSIONS.SURVEY_EDIT_OWN,
  PERMISSIONS.SURVEY_DELETE_OWN,
  PERMISSIONS.USER_VIEW_OWN,
  PERMISSIONS.USER_EDIT_OWN,
  PERMISSIONS.API_LLM_ACCESS
]

const ORG_ADMIN_ADDITIONAL_PERMISSIONS = [
  PERMISSIONS.SURVEY_VIEW_ORG,
  PERMISSIONS.SURVEY_EDIT_ORG,
  PERMISSIONS.SURVEY_DELETE_ORG,
  PERMISSIONS.USER_VIEW_ORG,
  PERMISSIONS.USER_EDIT_ORG,
  PERMISSIONS.ORG_VIEW_OWN,
  PERMISSIONS.ORG_EDIT_OWN,
  PERMISSIONS.API_EXPORT_ACCESS
]

const SYSTEM_ADMIN_ADDITIONAL_PERMISSIONS = [
  PERMISSIONS.SURVEY_VIEW_ALL,
  PERMISSIONS.SURVEY_EDIT_ALL,
  PERMISSIONS.SURVEY_DELETE_ALL,
  PERMISSIONS.USER_VIEW_ALL,
  PERMISSIONS.USER_EDIT_ALL,
  PERMISSIONS.USER_DELETE_ALL,
  PERMISSIONS.ORG_VIEW_ALL,
  PERMISSIONS.ORG_EDIT_ALL,
  PERMISSIONS.ORG_DELETE_ALL,
  PERMISSIONS.ADMIN_DASHBOARD,
  PERMISSIONS.ADMIN_SYSTEM_CONFIG,
  PERMISSIONS.ADMIN_ANALYTICS_ALL,
  PERMISSIONS.ADMIN_EXPORT_ALL,
  PERMISSIONS.API_ADMIN_ACCESS
]

// Role-to-permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  user: USER_PERMISSIONS,
  org_admin: [
    // Inherit all user permissions
    ...USER_PERMISSIONS,
    // Additional org admin permissions
    ...ORG_ADMIN_ADDITIONAL_PERMISSIONS
  ],
  system_admin: [
    // Inherit all permissions from lower roles
    ...USER_PERMISSIONS,
    ...ORG_ADMIN_ADDITIONAL_PERMISSIONS,
    // Additional system admin permissions
    ...SYSTEM_ADMIN_ADDITIONAL_PERMISSIONS
  ]
}

// Route-to-permission mapping
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  // Admin routes
  '/admin': [PERMISSIONS.ADMIN_DASHBOARD],
  '/admin/surveys': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.SURVEY_VIEW_ALL],
  '/admin/users': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.USER_VIEW_ALL],
  '/admin/organizations': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ORG_VIEW_ALL],
  '/admin/analytics': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_ANALYTICS_ALL],
  '/admin/reports': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_ANALYTICS_ALL],
  '/admin/export': [PERMISSIONS.ADMIN_DASHBOARD, PERMISSIONS.ADMIN_EXPORT_ALL],
  '/system': [PERMISSIONS.ADMIN_SYSTEM_CONFIG],
  '/system/config': [PERMISSIONS.ADMIN_SYSTEM_CONFIG],
  '/system/ai': [PERMISSIONS.ADMIN_SYSTEM_CONFIG],

  // Organization routes
  '/organization': [PERMISSIONS.ORG_VIEW_OWN],
  '/organization/surveys': [PERMISSIONS.SURVEY_VIEW_ORG],
  '/organization/analytics': [PERMISSIONS.SURVEY_VIEW_ORG],
  '/organization/reports': [PERMISSIONS.SURVEY_VIEW_ORG],

  // API routes
  '/api/admin': [PERMISSIONS.API_ADMIN_ACCESS],
  '/api/llm': [PERMISSIONS.API_LLM_ACCESS],
  '/api/export': [PERMISSIONS.API_EXPORT_ACCESS]
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Find matching route pattern
  const matchingRoute = Object.keys(ROUTE_PERMISSIONS).find(routePattern => {
    // Exact match
    if (route === routePattern) return true
    // Pattern match (e.g., /admin/* matches /admin/users)
    if (routePattern.endsWith('/*') && route.startsWith(routePattern.slice(0, -2))) return true
    // Prefix match for API routes
    if (route.startsWith(routePattern) && routePattern.startsWith('/api/')) return true
    return false
  })

  if (!matchingRoute) {
    // If no specific permissions are required, allow access
    return true
  }

  const requiredPermissions = ROUTE_PERMISSIONS[matchingRoute]
  return hasAnyPermission(userRole, requiredPermissions)
}

/**
 * Check if a user role is higher than or equal to another role
 */
export function isRoleEqualOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Check if a user can access organization data
 */
export function canAccessOrganization(
  userRole: UserRole, 
  userOrgId: string | undefined, 
  targetOrgId: string
): boolean {
  // System admins can access all organizations
  if (userRole === ROLES.SYSTEM_ADMIN) {
    return true
  }
  
  // Org admins and users can only access their own organization
  if (userRole === ROLES.ORG_ADMIN || userRole === ROLES.USER) {
    return userOrgId === targetOrgId
  }
  
  return false
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Check if a user can perform an action on a resource
 */
export interface ResourceCheck {
  resource: 'survey' | 'user' | 'organization'
  action: 'view' | 'create' | 'edit' | 'delete'
  scope: 'own' | 'org' | 'all'
  resourceOrgId?: string
  resourceUserId?: string
}

export function canPerformAction(
  userRole: UserRole,
  userOrgId: string | undefined,
  userId: string,
  check: ResourceCheck
): boolean {
  const permission = `${check.resource}:${check.action}:${check.scope}`
  
  if (!hasPermission(userRole, permission)) {
    return false
  }

  // Additional checks based on scope
  switch (check.scope) {
    case 'own':
      // User can only access their own resources
      return check.resourceUserId === userId
    
    case 'org':
      // User can access resources in their organization
      return userOrgId === check.resourceOrgId
    
    case 'all':
      // System admin can access all resources
      return userRole === ROLES.SYSTEM_ADMIN
    
    default:
      return false
  }
}

/**
 * Role validation utilities
 */
export const RoleUtils = {
  isUser: (role: UserRole) => role === ROLES.USER,
  isOrgAdmin: (role: UserRole) => role === ROLES.ORG_ADMIN,
  isSystemAdmin: (role: UserRole) => role === ROLES.SYSTEM_ADMIN,
  isAdmin: (role: UserRole) => role === ROLES.ORG_ADMIN || role === ROLES.SYSTEM_ADMIN,
  canManageOrg: (role: UserRole) => role === ROLES.ORG_ADMIN || role === ROLES.SYSTEM_ADMIN,
  canManageSystem: (role: UserRole) => role === ROLES.SYSTEM_ADMIN
}