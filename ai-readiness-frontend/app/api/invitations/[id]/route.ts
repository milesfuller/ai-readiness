/**
 * API Routes for Individual Invitation Management
 * Handles invitation actions: resend, cancel, validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email-service'
import { createClient } from '@/lib/supabase/server'
import { createInvitationService } from '@/services/database/invitation.service'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { action } = body
    const invitationId = params.id

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use InvitationService to get invitation
    const invitationService = createInvitationService()
    const invitation = await invitationService.getInvitation(invitationId)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (verify they are the sender or an admin)
    if (invitation.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this invitation' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'resend':
        const resendInvitation = await invitationService.resendInvitation(invitationId)
        
        return NextResponse.json({
          success: true,
          message: 'Invitation resent successfully',
          invitation: resendInvitation
        })

      case 'cancel':
        const cancelledInvitation = await invitationService.cancelInvitation(invitationId, user.id)
        
        return NextResponse.json({
          success: true,
          message: 'Invitation cancelled successfully',
          invitation: cancelledInvitation
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in invitation management API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const invitationId = params.id

    // Get current user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use InvitationService to get invitation details
    const invitationService = createInvitationService()
    const invitation = await invitationService.getInvitation(invitationId)

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(invitation)
  } catch (error) {
    console.error('Error fetching invitation details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}