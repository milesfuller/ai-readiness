/**
 * API Routes for Individual Invitation Management
 * Handles invitation actions: resend, cancel, validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email-service'
import { createClient } from '@/lib/supabase/server'

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

    // Verify the invitation exists and user has permission
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations!inner(
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Check if user has permission (must be admin in the same organization)
    const userMember = invitation.organizations.organization_members.find(
      (member: any) => member.user_id === user.id
    )

    if (!userMember || (userMember.role !== 'org_admin' && userMember.role !== 'system_admin')) {
      return NextResponse.json(
        { error: 'You do not have permission to manage this invitation' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'resend':
        const resendResult = await emailService.resendInvitation(invitationId)
        
        if (resendResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Invitation resent successfully'
          })
        } else {
          // Handle fallback case
          if (resendResult.error?.includes('Manual link:')) {
            const linkMatch = resendResult.error.match(/(https?:\/\/[^\s]+)/)
            return NextResponse.json({
              success: false,
              error: 'Email service unavailable',
              fallbackLink: linkMatch?.[1],
              message: 'Please share the invitation link manually'
            }, { status: 503 })
          }

          return NextResponse.json(
            { error: resendResult.error || 'Failed to resend invitation' },
            { status: 500 }
          )
        }

      case 'cancel':
        const cancelResult = await emailService.cancelInvitation(invitationId)
        
        if (cancelResult.success) {
          return NextResponse.json({
            success: true,
            message: 'Invitation cancelled successfully'
          })
        } else {
          return NextResponse.json(
            { error: cancelResult.error || 'Failed to cancel invitation' },
            { status: 500 }
          )
        }

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

    // Get invitation details
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        *,
        organizations (name),
        profiles (first_name, last_name, email)
      `)
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
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