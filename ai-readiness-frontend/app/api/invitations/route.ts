/**
 * API Routes for Invitation Management
 * Handles invitation creation, validation, and management
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email-service'
import { createClient } from '@/lib/supabase/server'
import { createInvitationService } from '@/services/database/invitation.service'
import { createUserProfileService } from '@/services/database/user-profile.service'

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

    // Use UserProfileService to verify user permissions
    const userProfileService = createUserProfileService()
    const userProfile = await userProfileService.getUserProfile(user.id)
    
    if (!userProfile || userProfile.role !== 'org_admin' && userProfile.role !== 'system_admin') {
      return NextResponse.json(
        { error: 'Only administrators can send invitations' },
        { status: 403 }
      )
    }

    // Use InvitationService to check for existing invitations
    const invitationService = createInvitationService()
    const hasPending = await invitationService.hasPendingInvitation(
      email, 
      'organization', 
      organizationId
    )
    
    if (hasPending) {
      return NextResponse.json(
        { error: 'A pending invitation already exists for this email' },
        { status: 400 }
      )
    }

    // Create invitation using InvitationService
    const invitation = await invitationService.createInvitation({
      type: 'organization',
      email,
      target_id: organizationId,
      metadata: {
        role,
        permissions: [],
        custom_fields: {
          first_name: firstName,
          last_name: lastName,
          message
        },
        redirect_url: null,
        campaign_id: null,
        source: null,
        tags: []
      },
      priority: 'normal',
      delivery_method: 'email',
      subject: `Invitation to join organization`
    }, user.id, true)
    
    const result = { success: true, trackingId: invitation.id }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        trackingId: result.trackingId
      })
    } else {
      // Handle fallback case where email service is unavailable
      const error = (result as any).error
      if (error?.includes('Manual link:') || error?.includes('share this link manually:')) {
        const linkMatch = error.match(/(https?:\/\/[^\s]+)/)
        return NextResponse.json({
          success: false,
          error: 'Email service unavailable',
          fallbackLink: linkMatch?.[1],
          message: 'Please share the invitation link manually'
        }, { status: 503 })
      }

      return NextResponse.json(
        { error: error || 'Failed to send invitation' },
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