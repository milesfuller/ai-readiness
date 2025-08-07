export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// GET organization overview/dashboard data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
    }

    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id

    // Check if user can view organization
    if (!hasPermission(userRole, PERMISSIONS.ORG_VIEW_OWN)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied' }, { status: 403 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, params.id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 })
      )
    }

    // Get organization basic info
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        industry,
        size,
        website,
        description,
        created_at
      `)
      .eq('id', params.id)
      .single()

    if (orgError || !organization) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      )
    }

    // First get the survey IDs for response count calculation
    const { data: orgSurveys } = await supabase
      .from('surveys')
      .select('id')
      .eq('organization_id', params.id)
    
    const surveyIds = orgSurveys?.map(s => s.id) || []

    // Get organization statistics
    const [
      { data: surveyStats },
      { data: responseStats },
      { data: memberStats },
      { data: apiKeyStats }
    ] = await Promise.all([
      // Survey counts
      supabase
        .from('surveys')
        .select('id, status', { count: 'exact' })
        .eq('organization_id', params.id),
      
      // Response counts
      supabase
        .from('survey_responses')
        .select('id', { count: 'exact' })
        .in('survey_id', surveyIds),
      
      // Member counts
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('organization_id', params.id),
      
      // API key counts
      supabase
        .from('organization_api_keys')
        .select('id', { count: 'exact' })
        .eq('organization_id', params.id)
        .eq('active', true)
    ])

    // Calculate active surveys
    const activeSurveys = surveyStats?.filter(s => s.status === 'active').length || 0

    // Get recent activity from audit logs
    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        details,
        created_at,
        user:user_id(email)
      `)
      .eq('organization_id', params.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Transform recent activity data
    const formattedActivity = (recentActivity || []).map((activity: any) => {
      const timeAgo = getTimeAgo(new Date(activity.created_at))
      return {
        id: activity.id,
        action: formatActionDescription(activity.action, activity.details),
        user: activity.user?.email || 'Unknown User',
        timestamp: timeAgo,
        type: getActivityType(activity.action)
      }
    })

    // Construct response
    const overview = {
      id: organization.id,
      name: organization.name,
      industry: organization.industry,
      size: organization.size,
      website: organization.website,
      description: organization.description,
      stats: {
        totalSurveys: surveyStats?.length || 0,
        activeSurveys,
        totalResponses: responseStats?.length || 0,
        totalMembers: memberStats?.length || 0,
        apiKeysActive: apiKeyStats?.length || 0,
        lastActivity: formattedActivity.length > 0 ? formattedActivity[0].timestamp : 'No recent activity'
      },
      recentActivity: formattedActivity
    }

    return addAPISecurityHeaders(
      NextResponse.json(overview)
    )

  } catch (error) {
    console.error('Organization overview error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch organization overview' }, { status: 500 })
    )
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Helper function to format action descriptions
function formatActionDescription(action: string, details: any): string {
  switch (action) {
    case 'organization_updated':
      return 'Updated organization settings'
    case 'api_key_created':
      return `Created API key: ${details?.api_key_name || 'Unknown'}`
    case 'api_key_revoked':
      return `Revoked API key: ${details?.api_key_name || 'Unknown'}`
    case 'survey_created':
      return `Created survey: ${details?.survey_name || 'Untitled Survey'}`
    case 'survey_updated':
      return `Updated survey: ${details?.survey_name || 'Unknown Survey'}`
    case 'user_added':
      return `Added team member: ${details?.user_email || 'Unknown User'}`
    case 'user_removed':
      return `Removed team member: ${details?.user_email || 'Unknown User'}`
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
}

// Helper function to determine activity type for icons
function getActivityType(action: string): 'survey' | 'member' | 'setting' {
  if (action.includes('survey')) {
    return 'survey'
  } else if (action.includes('user') || action.includes('member')) {
    return 'member'
  } else {
    return 'setting'
  }
}