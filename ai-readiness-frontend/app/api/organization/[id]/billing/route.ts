export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// GET billing information
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

    // Check if user can view organization billing
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

    // Get current usage statistics
    const { data: surveyCount } = await supabase
      .from('surveys')
      .select('id', { count: 'exact' })
      .eq('organization_id', params.id)

    // First get the survey IDs for the organization
    const { data: orgSurveys } = await supabase
      .from('surveys')
      .select('id')
      .eq('organization_id', params.id)

    const surveyIds = orgSurveys?.map(s => s.id) || []

    const { data: responseCount } = await supabase
      .from('survey_responses')
      .select('id', { count: 'exact' })
      .in('survey_id', surveyIds)

    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact' })
      .eq('organization_id', params.id)

    // Mock billing data for demonstration
    // In a real implementation, this would come from a billing service like Stripe
    const billingInfo = {
      plan: 'free' as const,
      status: 'active' as const,
      nextBillingDate: null,
      usage: {
        surveys: surveyCount?.length || 0,
        responses: responseCount?.length || 0,
        users: userCount?.length || 0
      },
      limits: {
        surveys: 10,
        responses: 1000,
        users: 50
      }
    }

    return addAPISecurityHeaders(
      NextResponse.json(billingInfo)
    )

  } catch (error) {
    console.error('Billing GET error:', error)
    return addAPISecurityHeaders(
      NextResponse.json({ error: 'Failed to fetch billing information' }, { status: 500 })
    )
  }
}