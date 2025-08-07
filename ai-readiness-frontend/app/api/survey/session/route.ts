import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const SessionCreateSchema = z.object({
  sessionId: z.string().optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    device: z.string().optional(),
    startedAt: z.string().optional()
  }).optional()
})

const SessionUpdateSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  status: z.enum(['in_progress', 'completed', 'abandoned']).optional(),
  currentQuestionIndex: z.number().min(0).optional(),
  timeSpent: z.number().min(0).optional(),
  answers: z.record(z.string(), z.any()).optional()
})

/**
 * Create or get survey session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SessionCreateSchema.parse(body)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Generate session ID if not provided
    const sessionId = validatedData.sessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Get client info
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Store session metadata in activity logs for tracking
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'survey_session_started',
      resource_type: 'survey_session',
      resource_id: sessionId,
      details: {
        session_id: sessionId,
        user_agent: userAgent,
        device: validatedData.metadata?.device || 'unknown',
        started_at: new Date().toISOString()
      },
      ip_address: clientIP,
      user_agent: userAgent
    })

    return NextResponse.json({
      success: true,
      sessionId,
      userId: user.id,
      startedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Session creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Update survey session
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = SessionUpdateSchema.parse(body)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Log session update
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'survey_session_updated',
      resource_type: 'survey_session',
      resource_id: validatedData.sessionId,
      details: {
        session_id: validatedData.sessionId,
        status: validatedData.status,
        current_question: validatedData.currentQuestionIndex,
        time_spent: validatedData.timeSpent,
        answers_count: validatedData.answers ? Object.keys(validatedData.answers).length : 0,
        updated_at: new Date().toISOString()
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      sessionId: validatedData.sessionId,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Session update error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}

/**
 * Get survey session data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get session data from activity logs
    const { data: sessionLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('resource_id', sessionId)
      .eq('user_id', user.id)
      .eq('resource_type', 'survey_session')
      .order('created_at', { ascending: false })

    if (!sessionLogs || sessionLogs.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get the latest session info
    const latestLog = sessionLogs[0]
    const startLog = sessionLogs.find(log => log.action === 'survey_session_started')

    return NextResponse.json({
      sessionId,
      userId: user.id,
      status: latestLog.details?.status || 'in_progress',
      startedAt: startLog?.created_at || latestLog.created_at,
      lastUpdated: latestLog.created_at,
      currentQuestionIndex: latestLog.details?.current_question || 0,
      timeSpent: latestLog.details?.time_spent || 0,
      answersCount: latestLog.details?.answers_count || 0
    })

  } catch (error) {
    console.error('Session get error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}