/**
 * API Routes for Invitation Management
 * Handles invitation creation, validation, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email-service'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, role = 'user', organizationId, firstName, lastName, message } = body

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email and organization ID are required' },
        { status: 400 }
      )
    }

    // Verify user has permission to invite to this organization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('organization_members!inner(organization_id, role)')
      .eq('user_id', user.id)
      .eq('organization_members.organization_id', organizationId)
      .single()

    if (!userProfile) {
      return NextResponse.json(
        { error: 'You do not have permission to invite users to this organization' },
        { status: 403 }
      )
    }

    const userRole = userProfile.organization_members?.[0]?.role
    if (userRole !== 'org_admin' && userRole !== 'system_admin') {
      return NextResponse.json(
        { error: 'Only administrators can send invitations' },
        { status: 403 }
      )
    }

    // Check if user already exists in the organization
    const { data: existingMember } = await supabase
      .from('profiles')
      .select('organization_members!inner(*)')
      .eq('email', email)
      .eq('organization_members.organization_id', organizationId)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      )
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 400 }
      )
    }

    // Send invitation
    const result = await emailService.sendInvitation({
      email,
      organizationId,
      role,
      invitedBy: user.id,
      firstName,
      lastName,
      message
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        trackingId: result.trackingId
      })
    } else {
      // Handle fallback case where email service is unavailable
      if (result.error?.includes('Manual link:') || result.error?.includes('share this link manually:')) {
        const linkMatch = result.error.match(/(https?:\/\/[^\s]+)/)
        return NextResponse.json({
          success: false,
          error: 'Email service unavailable',
          fallbackLink: linkMatch?.[1],
          message: 'Please share the invitation link manually'
        }, { status: 503 })
      }

      return NextResponse.json(
        { error: result.error || 'Failed to send invitation' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in invitation API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get invitation statistics
    const stats = await emailService.getInvitationStats(organizationId || undefined)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}