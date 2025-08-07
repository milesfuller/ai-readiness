export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Generate UUID-like string without uuid library
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { surveyId, action = 'start' } = body

    if (!surveyId) {
      return NextResponse.json(
        { error: 'Survey ID is required' },
        { status: 400 }
      )
    }

    // Validate survey exists and is accessible
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      )
    }

    // Check if survey is active
    if (survey.status !== 'active') {
      return NextResponse.json(
        { error: 'Survey is not currently active' },
        { status: 400 }
      )
    }

    // Get user profile to check organization access
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Check if user has access to this survey (same organization or public)
    if (survey.organization_id && userProfile?.organization_id !== survey.organization_id) {
      return NextResponse.json(
        { error: 'Access denied: You do not have permission to access this survey' },
        { status: 403 }
      )
    }

    if (action === 'start') {
      // Check if user already has a response for this survey
      const { data: existingResponse, error: existingError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', surveyId)
        .eq('user_id', user.id)
        .single()

      if (existingError && existingError.code !== 'PGRST116') { // Not found error
        console.error('Error checking existing response:', existingError)
        return NextResponse.json(
          { error: 'Failed to check existing response' },
          { status: 500 }
        )
      }

      let sessionId: string
      let isNewSession = false

      if (existingResponse && existingResponse.status !== 'completed') {
        // Resume existing incomplete response
        sessionId = existingResponse.id
      } else if (existingResponse && existingResponse.status === 'completed') {
        // User already completed this survey
        return NextResponse.json({
          error: 'Survey already completed',
          message: 'You have already completed this survey',
          sessionId: existingResponse.id,
          completedAt: existingResponse.completed_at
        }, { status: 400 })
      } else {
        // Create new response session
        const responseData = {
          id: generateUUID(),
          survey_id: surveyId,
          user_id: user.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          response_data: {
            answers: [],
            metadata: {
              userAgent: request.headers.get('user-agent') || 'unknown',
              startedAt: new Date().toISOString(),
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: newResponse, error: createError } = await supabase
          .from('survey_responses')
          .insert(responseData)
          .select()
          .single()

        if (createError) {
          console.error('Error creating response session:', createError)
          return NextResponse.json(
            { error: 'Failed to create survey session' },
            { status: 500 }
          )
        }

        sessionId = newResponse.id
        isNewSession = true
      }

      return NextResponse.json({
        success: true,
        sessionId,
        surveyId,
        isNewSession,
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          estimatedDuration: survey.metadata?.estimatedDuration || 10,
          totalQuestions: survey.metadata?.totalQuestions || 0
        }
      })

    } else if (action === 'resume') {
      // Get existing session
      const { searchParams } = new URL(request.url)
      const sessionId = searchParams.get('sessionId') || body.sessionId

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Session ID is required for resume action' },
          { status: 400 }
        )
      }

      const { data: response, error: responseError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .eq('survey_id', surveyId)
        .single()

      if (responseError || !response) {
        return NextResponse.json(
          { error: 'Session not found or access denied' },
          { status: 404 }
        )
      }

      if (response.status === 'completed') {
        return NextResponse.json(
          { error: 'Session already completed' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        sessionId: response.id,
        surveyId: response.survey_id,
        currentAnswers: response.response_data?.answers || [],
        status: response.status,
        startedAt: response.started_at
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "resume"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Survey session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const surveyId = searchParams.get('surveyId')

    if (sessionId) {
      // Get specific session details
      const { data: response, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          survey:surveys(
            *,
            organization:organizations(*),
            questions:survey_questions(*)
          )
        `)
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (error || !response) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      // Calculate progress
      const totalQuestions = response.survey?.questions?.length || 0
      const answeredQuestions = response.response_data?.answers?.length || 0
      const progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

      return NextResponse.json({
        session: {
          id: response.id,
          surveyId: response.survey_id,
          status: response.status,
          startedAt: response.started_at,
          completedAt: response.completed_at,
          currentAnswers: response.response_data?.answers || [],
          progress: {
            answered: answeredQuestions,
            total: totalQuestions,
            percentage: Math.round(progressPercentage)
          }
        },
        survey: response.survey
      })

    } else if (surveyId) {
      // Get user's sessions for this survey
      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          survey:surveys(*)
        `)
        .eq('survey_id', surveyId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user sessions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch sessions' },
          { status: 500 }
        )
      }

      return NextResponse.json({ sessions: responses || [] })

    } else {
      // Get all user sessions
      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          survey:surveys(
            *,
            organization:organizations(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching all user sessions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch sessions' },
          { status: 500 }
        )
      }

      return NextResponse.json({ sessions: responses || [] })
    }

  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Verify ownership and that session is not completed
    const { data: response, error: fetchError } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !response) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      )
    }

    if (response.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed survey response' },
        { status: 400 }
      )
    }

    // Delete the session
    const { error: deleteError } = await supabase
      .from('survey_responses')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting session:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })

  } catch (error) {
    console.error('Session delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}