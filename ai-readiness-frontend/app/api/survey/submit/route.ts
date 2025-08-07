export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
    const { 
      sessionId,
      surveyId,
      answers,
      status = 'in_progress',
      responseData,
      metadata
    } = body

    // Validate required fields
    if (!sessionId && !surveyId) {
      return NextResponse.json(
        { error: 'Either sessionId or surveyId is required' },
        { status: 400 }
      )
    }

    // Get or create survey response
    let surveyResponse
    let responseId = sessionId

    if (sessionId) {
      // Update existing response
      const { data: existingResponse, error: fetchError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
        console.error('Error fetching existing response:', fetchError)
        return NextResponse.json(
          { error: 'Failed to fetch existing response' },
          { status: 500 }
        )
      }

      if (existingResponse) {
        // Update existing response
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        }

        if (answers) {
          updateData.response_data = {
            answers,
            metadata: metadata || {}
          }
        } else if (responseData) {
          updateData.response_data = responseData
        }

        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString()
        }

        const { data: updatedResponse, error: updateError } = await supabase
          .from('survey_responses')
          .update(updateData)
          .eq('id', sessionId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating response:', updateError)
          return NextResponse.json(
            { error: 'Failed to update response' },
            { status: 500 }
          )
        }

        surveyResponse = updatedResponse
      } else {
        return NextResponse.json(
          { error: 'Survey response not found' },
          { status: 404 }
        )
      }
    } else if (surveyId) {
      // Create new response
      const responseData: {
        survey_id: any;
        user_id: string;
        status: any;
        started_at: string;
        response_data: {
          answers: any;
          metadata: any;
        };
        created_at: string;
        updated_at: string;
        completed_at?: string;
      } = {
        survey_id: surveyId,
        user_id: user.id,
        status,
        started_at: new Date().toISOString(),
        response_data: {
          answers: answers || [],
          metadata: metadata || {}
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (status === 'completed') {
        responseData.completed_at = new Date().toISOString()
      }

      const { data: newResponse, error: createError } = await supabase
        .from('survey_responses')
        .insert(responseData)
        .select()
        .single()

      if (createError) {
        console.error('Error creating response:', createError)
        return NextResponse.json(
          { error: 'Failed to create response' },
          { status: 500 }
        )
      }

      surveyResponse = newResponse
      responseId = newResponse.id
    }

    // If the response is completed, trigger LLM analysis for relevant answers
    if (status === 'completed' && answers) {
      try {
        await triggerLLMAnalysis(supabase, responseId, surveyId || surveyResponse.survey_id, answers, user.id)
      } catch (analysisError) {
        console.error('Failed to trigger LLM analysis:', analysisError)
        // Don't fail the request if analysis fails
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: responseId,
      response: surveyResponse,
      message: sessionId ? 'Response updated successfully' : 'Response created successfully'
    })

  } catch (error) {
    console.error('Survey submit error:', error)
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

    if (!sessionId && !surveyId) {
      return NextResponse.json(
        { error: 'Either sessionId or surveyId is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('survey_responses')
      .select(`
        *,
        survey:surveys(
          *,
          organization:organizations(*)
        ),
        user:profiles(*)
      `)
      .eq('user_id', user.id)

    if (sessionId) {
      query = query.eq('id', sessionId)
    } else if (surveyId) {
      query = query.eq('survey_id', surveyId)
    }

    const { data: responses, error } = await query

    if (error) {
      console.error('Error fetching responses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    if (sessionId) {
      const response = responses?.[0]
      if (!response) {
        return NextResponse.json(
          { error: 'Response not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ response })
    } else {
      return NextResponse.json({ responses })
    }

  } catch (error) {
    console.error('Survey fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to trigger LLM analysis for completed responses
async function triggerLLMAnalysis(
  supabase: any,
  responseId: string,
  surveyId: string,
  answers: any[],
  userId: string
) {
  // Get survey questions to understand the context
  const { data: survey, error: surveyError } = await supabase
    .from('surveys')
    .select(`
      *,
      questions:survey_questions(*)
    `)
    .eq('id', surveyId)
    .single()

  if (surveyError) {
    console.error('Error fetching survey for analysis:', surveyError)
    return
  }

  // Get user profile for context
  const { data: userProfile } = await supabase
    .from('profiles')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('id', userId)
    .single()

  // Process text answers that need JTBD analysis
  const textAnswers = answers.filter(answer => {
    const question = survey.questions?.find((q: any) => q.id === answer.questionId)
    return question && (question.type === 'text' || question.category === 'jtbd')
  })

  for (const answer of textAnswers) {
    if (!answer.answer || typeof answer.answer !== 'string' || answer.answer.trim().length < 10) {
      continue // Skip empty or too short answers
    }

    try {
      const question = survey.questions?.find((q: any) => q.id === answer.questionId)
      if (!question) continue

      // Determine expected JTBD force based on question category or content
      const expectedForce = determineExpectedForce(question)

      // Call the LLM analysis API internally
      const analysisResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/llm/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Internal API call
        },
        body: JSON.stringify({
          responseId,
          responseText: answer.answer,
          questionText: question.question,
          expectedForce,
          questionContext: question.category || 'AI readiness assessment',
          organizationId: userProfile?.organization?.id,
          surveyId
        })
      })

      if (!analysisResponse.ok) {
        console.error('LLM analysis API failed:', await analysisResponse.text())
      }
    } catch (error) {
      console.error('Error calling LLM analysis API:', error)
    }
  }
}

// Helper function to determine expected JTBD force from question
function determineExpectedForce(question: any): string {
  const questionText = question.question.toLowerCase()
  const category = question.category?.toLowerCase() || ''

  // Map question content to JTBD forces
  if (category.includes('pain') || questionText.includes('frustrat') || 
      questionText.includes('problem') || questionText.includes('challeng')) {
    return 'pain_of_old'
  }
  
  if (category.includes('pull') || questionText.includes('benefit') || 
      questionText.includes('opportunit') || questionText.includes('improv')) {
    return 'pull_of_new'
  }
  
  if (category.includes('anchor') || questionText.includes('barrier') || 
      questionText.includes('resist') || questionText.includes('prevent')) {
    return 'anchors_to_old'
  }
  
  if (category.includes('anxiety') || questionText.includes('concern') || 
      questionText.includes('worry') || questionText.includes('fear')) {
    return 'anxiety_of_new'
  }

  if (category.includes('demographic') || questionText.includes('experience') || 
      questionText.includes('use') || questionText.includes('familiar')) {
    return 'demographic'
  }

  // Default to pull_of_new for general questions
  return 'pull_of_new'
}