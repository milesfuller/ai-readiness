/**
 * API Route for Invitation Token Validation
 * Validates invitation tokens and returns invitation details
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailService } from '@/lib/services/email-service'

interface RouteParams {
  params: {
    token: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const token = params.token

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Validate the invitation token
    const validation = await emailService.validateInvitation(token)

    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: validation.error || 'Invalid invitation token' 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: validation.invitation
    })
  } catch (error) {
    console.error('Error validating invitation token:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const token = params.token
    const body = await request.json()
    const { password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Accept the invitation
    const result = await emailService.acceptInvitation(token, password)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to accept invitation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      user: result.user
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}