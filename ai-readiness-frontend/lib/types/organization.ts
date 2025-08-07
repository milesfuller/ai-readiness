// Additional organization-related types

export interface APIKey {
  id: string
  name: string
  key: string
  masked: boolean
  created_at: string
  last_used_at?: string
  permissions: string[]
  active: boolean
}

export interface BillingInfo {
  plan: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due'
  nextBillingDate?: string
  usage: {
    surveys: number
    responses: number
    users: number
  }
  limits: {
    surveys: number
    responses: number
    users: number
  }
}

export interface AuditLog {
  id: string
  organization_id: string
  user_id: string
  action: string
  resource_type?: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface OrganizationStats {
  totalSurveys: number
  totalResponses: number
  totalUsers: number
  activeApiKeys: number
  storageUsed: number
  lastActivity: string
}

export const ORGANIZATION_INDUSTRIES = [
  'technology',
  'healthcare',
  'finance',
  'education',
  'manufacturing',
  'retail',
  'other'
] as const

export const ORGANIZATION_SIZES = [
  '1-10',
  '11-50', 
  '51-200',
  '201-1000',
  '1000+'
] as const

export const API_KEY_PERMISSIONS = [
  'read_surveys',
  'read_responses', 
  'read_analytics',
  'write_surveys',
  'admin_access'
] as const

export const SSO_PROVIDERS = [
  'google',
  'microsoft',
  'okta', 
  'auth0',
  'saml'
] as const

export type OrganizationIndustry = typeof ORGANIZATION_INDUSTRIES[number]
export type OrganizationSize = typeof ORGANIZATION_SIZES[number]
export type APIKeyPermission = typeof API_KEY_PERMISSIONS[number]
export type SSOProvider = typeof SSO_PROVIDERS[number]