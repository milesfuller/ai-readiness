/**
 * Admin service functions for Supabase integration
 * Handles all admin dashboard data operations
 */

import { createClient } from '@/lib/supabase/client'
import type { User, Survey, Organization, AdminFilters } from '@/lib/types'

const supabase = createClient()

// Dashboard Statistics
export interface DashboardStats {
  totalSurveys: number
  activeSurveys: number
  totalResponses: number
  totalUsers: number
  organizationCount: number
  completionRate: number
  recentActivity: ActivityItem[]
}

export interface PaginationOptions {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ActivityItem {
  id: string
  type: 'survey_created' | 'survey_completed' | 'user_registered'
  description: string
  timestamp: string
  user?: string
  userId?: string
}

/**
 * Fetch dashboard statistics from Supabase
 */
export async function fetchDashboardStats(userRole: string, organizationId?: string): Promise<DashboardStats> {
  try {
    // Fetch surveys count
    let surveysQuery = supabase.from('surveys').select('id, status, created_at')
    if (userRole === 'org_admin' && organizationId) {
      surveysQuery = surveysQuery.eq('organization_id', organizationId)
    }
    const { data: surveys, error: surveysError } = await surveysQuery
    if (surveysError) throw surveysError

    // Fetch responses count
    let responsesQuery = supabase
      .from('survey_responses')
      .select('id, survey_id, submitted_at')
    
    if (userRole === 'org_admin' && organizationId) {
      responsesQuery = responsesQuery
        .in('survey_id', surveys?.map(s => s.id) || [])
    }
    const { data: responses, error: responsesError } = await responsesQuery
    if (responsesError) throw responsesError

    // Fetch users count
    let usersQuery = supabase
      .from('profiles')
      .select(`
        id, 
        user_id, 
        first_name, 
        last_name, 
        email,
        created_at,
        organization_members!inner(organization_id, role)
      `)
    
    if (userRole === 'org_admin' && organizationId) {
      usersQuery = usersQuery.eq('organization_members.organization_id', organizationId)
    }
    const { data: users, error: usersError } = await usersQuery
    if (usersError) throw usersError

    // Fetch organizations count (for system admins only)
    let organizationsCount = 0
    if (userRole === 'system_admin') {
      const { count, error: orgError } = await supabase
        .from('organizations')
        .select('id', { count: 'exact' })
      if (orgError) throw orgError
      organizationsCount = count || 0
    }

    // Calculate completion rate
    const completedResponses = responses?.filter(r => r.submitted_at) || []
    const completionRate = responses?.length ? 
      (completedResponses.length / responses.length) * 100 : 0

    // Fetch recent activity
    let activityQuery = supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        created_at,
        user_id,
        profiles!inner(first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (userRole === 'org_admin' && organizationId) {
      activityQuery = activityQuery.eq('organization_id', organizationId)
    }

    const { data: activities, error: activityError } = await activityQuery
    if (activityError) throw activityError

    // Transform activity data
    const recentActivity: ActivityItem[] = (activities || []).map(activity => {
      const profile = activity.profiles as any
      const userDisplayName = profile ? 
        `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email :
        'System'

      let type: ActivityItem['type']
      let description: string

      switch (activity.action) {
        case 'survey.created':
          type = 'survey_created'
          description = 'New survey created'
          break
        case 'response.submitted':
          type = 'survey_completed'
          description = 'Survey response submitted'
          break
        case 'user.signup':
          type = 'user_registered'
          description = 'New user registered'
          break
        default:
          type = 'survey_created'
          description = activity.action.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase())
      }

      return {
        id: activity.id,
        type,
        description,
        timestamp: formatTimeAgo(activity.created_at),
        user: userDisplayName,
        userId: activity.user_id
      }
    })

    return {
      totalSurveys: surveys?.length || 0,
      activeSurveys: surveys?.filter(s => s.status === 'active').length || 0,
      totalResponses: responses?.length || 0,
      totalUsers: users?.length || 0,
      organizationCount: organizationsCount,
      completionRate: Math.round(completionRate * 10) / 10,
      recentActivity
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
}

/**
 * Fetch surveys with filters and pagination
 */
export async function fetchSurveys(
  userRole: string, 
  organizationId?: string,
  filters: AdminFilters = {},
  pagination?: PaginationOptions
): Promise<PaginatedResult<Survey>> {
  try {
    let query = supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        status,
        created_at,
        updated_at,
        questions,
        created_by,
        organization_id,
        profiles!surveys_created_by_fkey(first_name, last_name, email),
        survey_responses(id, submitted_at)
      `)

    // Apply role-based filtering
    if (userRole === 'org_admin' && organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Apply status filter
    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // Apply date range filter
    if (filters.dateRange?.start) {
      query = query.gte('created_at', filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      query = query.lte('created_at', filters.dateRange.end)
    }

    // Get total count first
    const countQuery = supabase
      .from('surveys')
      .select('*', { count: 'exact', head: true })

    // Apply the same filters to count query
    if (userRole === 'org_admin' && organizationId) {
      countQuery.eq('organization_id', organizationId)
    }
    if (filters.search) {
      countQuery.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }
    if (filters.status) {
      countQuery.eq('status', filters.status)
    }
    if (filters.dateRange?.start) {
      countQuery.gte('created_at', filters.dateRange.start)
    }
    if (filters.dateRange?.end) {
      countQuery.lte('created_at', filters.dateRange.end)
    }

    const { count, error: countError } = await countQuery
    if (countError) throw countError

    // Apply pagination if provided
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.pageSize
      query = query.range(offset, offset + pagination.pageSize - 1)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    // Transform data to match Survey interface
    const surveys = (data || []).map(survey => {
      const profile = survey.profiles as any
      const responses = survey.survey_responses as any[] || []
      const questions = Array.isArray(survey.questions) ? survey.questions : []
      const completedResponses = responses.filter(r => r.submitted_at)

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description || '',
        status: survey.status as Survey['status'],
        createdBy: profile ? 
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email :
          'Unknown',
        organizationId: survey.organization_id,
        questions: questions,
        metadata: {
          estimatedDuration: 15, // Default estimate
          totalQuestions: questions.length,
          completionRate: responses.length > 0 ? 
            (completedResponses.length / responses.length) * 100 : 0,
          averageScore: 0 // Would need additional calculation
        },
        createdAt: survey.created_at,
        updatedAt: survey.updated_at,
        responses: [] // Not needed for list view
      }
    })

    const total = count || 0
    const page = pagination?.page || 1
    const pageSize = pagination?.pageSize || total
    const totalPages = Math.ceil(total / pageSize)

    return {
      data: surveys,
      total,
      page,
      pageSize,
      totalPages
    }
  } catch (error) {
    console.error('Error fetching surveys:', error)
    throw error
  }
}

/**
 * Fetch users with filters and pagination
 */
export async function fetchUsers(
  userRole: string,
  organizationId?: string,
  filters: AdminFilters = {},
  pagination?: PaginationOptions
): Promise<PaginatedResult<User>> {
  try {
    let query = supabase
      .from('profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        department,
        job_title,
        preferences,
        created_at,
        updated_at,
        organization_members!inner(
          organization_id,
          role,
          joined_at
        )
      `)

    // Apply role-based filtering
    if (userRole === 'org_admin' && organizationId) {
      query = query.eq('organization_members.organization_id', organizationId)
    }

    // Apply search filter
    if (filters.search) {
      query = query.or(`
        first_name.ilike.%${filters.search}%,
        last_name.ilike.%${filters.search}%,
        email.ilike.%${filters.search}%,
        department.ilike.%${filters.search}%
      `)
    }

    // Apply role filter
    if (filters.role) {
      query = query.eq('organization_members.role', filters.role)
    }

    // Apply department filter
    if (filters.department) {
      query = query.eq('department', filters.department)
    }

    // Get total count first
    const countQuery = supabase
      .from('profiles')
      .select('organization_members!inner(*)', { count: 'exact', head: true })

    // Apply the same filters to count query
    if (userRole === 'org_admin' && organizationId) {
      countQuery.eq('organization_members.organization_id', organizationId)
    }
    if (filters.search) {
      countQuery.or(`
        first_name.ilike.%${filters.search}%,
        last_name.ilike.%${filters.search}%,
        email.ilike.%${filters.search}%,
        department.ilike.%${filters.search}%
      `)
    }
    if (filters.role) {
      countQuery.eq('organization_members.role', filters.role)
    }
    if (filters.department) {
      countQuery.eq('department', filters.department)
    }

    const { count, error: countError } = await countQuery
    if (countError) throw countError

    // Apply pagination if provided
    if (pagination) {
      const offset = (pagination.page - 1) * pagination.pageSize
      query = query.range(offset, offset + pagination.pageSize - 1)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    // Get last login data from auth.users (if accessible)
    const userIds = data?.map(u => u.user_id) || []
    const { data: authData } = await supabase
      .from('auth.users')
      .select('id, last_sign_in_at')
      .in('id', userIds)

    const authMap = new Map(authData?.map(u => [u.id, u.last_sign_in_at]) || [])

    const users = (data || []).map(user => {
      const orgMember = user.organization_members as any
      
      return {
        id: user.user_id,
        email: user.email,
        role: orgMember?.role || 'user',
        organizationId: orgMember?.organization_id,
        profile: {
          id: user.id,
          userId: user.user_id,
          firstName: user.first_name,
          lastName: user.last_name,
          department: user.department,
          jobTitle: user.job_title,
          preferences: user.preferences || {
            theme: 'dark',
            notifications: true,
            voiceInput: false,
            language: 'en'
          }
        },
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: authMap.get(user.user_id) || undefined
      }
    })

    const total = count || 0
    const page = pagination?.page || 1
    const pageSize = pagination?.pageSize || total
    const totalPages = Math.ceil(total / pageSize)

    return {
      data: users,
      total,
      page,
      pageSize,
      totalPages
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

/**
 * Fetch organizations (system admin only)
 */
export async function fetchOrganizations(filters: AdminFilters = {}): Promise<Organization[]> {
  try {
    let query = supabase
      .from('organizations')
      .select(`
        id,
        name,
        description,
        industry,
        size,
        website,
        logo,
        settings,
        created_at,
        updated_at,
        organization_members(id, role)
      `)

    // Apply search filter
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    return (data || []).map(org => ({
      id: org.id,
      name: org.name,
      domain: '', // Not stored in current schema
      settings: {
        allowSelfRegistration: true,
        defaultRole: 'user' as const,
        requireEmailVerification: true,
        dataRetentionDays: 365,
        enableAuditLogs: false,
        enable2FA: false,
        enableSSO: false
      },
      createdAt: org.created_at,
      updatedAt: org.updated_at
    }))
  } catch (error) {
    console.error('Error fetching organizations:', error)
    throw error
  }
}

/**
 * Create a new survey
 */
export async function createSurvey(surveyData: Partial<Survey>, createdBy: string): Promise<Survey> {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .insert([{
        title: surveyData.title,
        description: surveyData.description,
        questions: surveyData.questions || [],
        status: 'draft',
        created_by: createdBy,
        organization_id: surveyData.organizationId
      }])
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      createdBy: createdBy,
      organizationId: data.organization_id,
      questions: data.questions || [],
      metadata: {
        estimatedDuration: 15,
        totalQuestions: (data.questions || []).length,
        completionRate: 0,
        averageScore: 0
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      responses: []
    }
  } catch (error) {
    console.error('Error creating survey:', error)
    throw error
  }
}

/**
 * Update a survey
 */
export async function updateSurvey(surveyId: string, updates: Partial<Survey>): Promise<Survey> {
  try {
    const { data, error } = await supabase
      .from('surveys')
      .update({
        title: updates.title,
        description: updates.description,
        questions: updates.questions,
        status: updates.status
      })
      .eq('id', surveyId)
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      status: data.status,
      createdBy: data.created_by,
      organizationId: data.organization_id,
      questions: data.questions || [],
      metadata: {
        estimatedDuration: 15,
        totalQuestions: (data.questions || []).length,
        completionRate: 0,
        averageScore: 0
      },
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      responses: []
    }
  } catch (error) {
    console.error('Error updating survey:', error)
    throw error
  }
}

/**
 * Delete a survey
 */
export async function deleteSurvey(surveyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', surveyId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting survey:', error)
    throw error
  }
}

/**
 * Utility function to format time ago
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ]

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count >= 1) {
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`
    }
  }

  return 'Just now'
}