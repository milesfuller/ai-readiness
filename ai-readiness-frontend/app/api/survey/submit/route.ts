import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schemas
const SurveyAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.string().min(1, 'Answer is required'),
  inputMethod: z.enum(['text', 'voice']).optional().default('text'),
  timeSpent: z.number().optional(),
  confidence: z.number().min(0).max(100).optional()
})

const SurveySubmissionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  answers: z.array(SurveyAnswerSchema).min(1, 'At least one answer is required'),
  metadata: z.object({
    completionTime: z.number().positive('Completion time must be positive'),
    userAgent: z.string().optional(),
    device: z.string().optional(),
    voiceInputUsed: z.boolean().optional().default(false),
    ipAddress: z.string().optional()
  }).optional()
})

type SurveySubmission = z.infer<typeof SurveySubmissionSchema>

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    console.log('Received survey submission:', { sessionId: body.sessionId, answersCount: body.answers?.length })
    
    const validatedData = SurveySubmissionSchema.parse(body)
    const { sessionId, answers, metadata } = validatedData

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error('Authentication error:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('No authenticated user found')
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // Get client IP and user agent for metadata
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Check if we have an existing active survey for this organization/user
    // For now, we'll use a default survey. In production, this would come from the session or be specified
    let surveyId: string

    // First, try to find an active survey for the user's organization
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get user's organization if they have one
    let organizationId: string | null = null
    if (userProfile) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      organizationId = orgMember?.organization_id || null
    }

    // Try to find an active survey for this organization
    const { data: existingSurvey, error: surveyError } = await supabase
      .from('surveys')
      .select('id')
      .eq('status', 'active')
      .eq('organization_id', organizationId)
      .single()

    if (existingSurvey) {
      surveyId = existingSurvey.id
      console.log('Using existing survey:', surveyId)
    } else {
      // Create a default survey for this submission
      console.log('Creating default survey for organization:', organizationId)
      const { data: newSurvey, error: createError } = await supabase
        .from('surveys')
        .insert({
          title: 'AI Readiness Assessment',
          description: 'Comprehensive AI readiness evaluation based on Jobs-to-be-Done framework',
          organization_id: organizationId,
          created_by: user.id,
          questions: answers.map(a => ({
            id: a.questionId,
            type: 'text',
            question: `Question ${a.questionId}`,
            required: true,
            category: 'general',
            order: 0
          })),
          settings: {
            allowAnonymous: false,
            requireAllQuestions: false,
            voiceEnabled: true
          },
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating survey:', createError)
        return NextResponse.json({ 
          error: 'Failed to create survey',
          details: createError.message 
        }, { status: 500 })
      }

      surveyId = newSurvey!.id
      console.log('Created new survey:', surveyId)
    }

    // Check if user already has a response for this survey
    const { data: existingResponse } = await supabase
      .from('survey_responses')
      .select('id, answers')
      .eq('survey_id', surveyId)
      .eq('respondent_id', user.id)
      .single()

    // Prepare the answers data structure
    const answersData = answers.reduce((acc, answer) => {
      acc[answer.questionId] = {
        answer: answer.answer,
        inputMethod: answer.inputMethod || 'text',
        timeSpent: answer.timeSpent || 0,
        confidence: answer.confidence,
        timestamp: new Date().toISOString()
      }
      return acc
    }, {} as Record<string, any>)

    // Prepare metadata
    const responseMetadata = {
      userAgent,
      ipAddress: clientIP,
      device: metadata?.device || 'unknown',
      completionTime: metadata?.completionTime || 0,
      voiceInputUsed: metadata?.voiceInputUsed || false,
      sessionId,
      submittedAt: new Date().toISOString()
    }

    let responseId: string

    if (existingResponse) {
      // Update existing response
      console.log('Updating existing response:', existingResponse.id)
      const { data: updatedResponse, error: updateError } = await supabase
        .from('survey_responses')
        .update({
          answers: answersData,
          metadata: responseMetadata,
          completion_time: metadata?.completionTime || 0,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingResponse.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating survey response:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update survey response',
          details: updateError.message 
        }, { status: 500 })
      }

      responseId = updatedResponse!.id
    } else {
      // Create new response
      console.log('Creating new survey response')
      const { data: newResponse, error: responseError } = await supabase
        .from('survey_responses')
        .insert({
          survey_id: surveyId,
          respondent_id: user.id,
          answers: answersData,
          metadata: responseMetadata,
          completion_time: metadata?.completionTime || 0
        })
        .select()
        .single()

      if (responseError) {
        console.error('Error creating survey response:', responseError)
        return NextResponse.json({ 
          error: 'Failed to save survey response',
          details: responseError.message 
        }, { status: 500 })
      }

      responseId = newResponse!.id
    }

    console.log('Survey response saved successfully:', responseId)

    // Log activity
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        organization_id: organizationId,
        action: existingResponse ? 'survey_response_updated' : 'survey_response_submitted',
        resource_type: 'survey_response',
        resource_id: responseId,
        details: {
          survey_id: surveyId,
          session_id: sessionId,
          answers_count: answers.length,
          completion_time: metadata?.completionTime || 0
        },
        ip_address: clientIP,
        user_agent: userAgent
      })
    } catch (logError) {
      // Log error but don't fail the main operation
      console.error('Error logging activity:', logError)
    }

    // Trigger LLM analysis (async, don't wait for completion)
    triggerLLMAnalysis(surveyId, responseId, answersData).catch(error => {
      console.error('LLM analysis failed (async):', error)
    })

    return NextResponse.json({
      success: true,
      responseId,
      surveyId,
      message: 'Survey submitted successfully'
    })

  } catch (error) {
    console.error('Survey submission error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Trigger LLM analysis for the survey response (async operation)
 */
async function triggerLLMAnalysis(surveyId: string, responseId: string, answers: Record<string, any>) {
  try {
    console.log('Triggering LLM analysis for response:', responseId)
    
    const supabase = await createClient()

    // Prepare analysis data
    const analysisData = {
      survey_id: surveyId,
      response_id: responseId,
      answers,
      analysis_type: 'jtbd_framework',
      timestamp: new Date().toISOString()
    }

    // Store analysis request
    const { error: analysisError } = await supabase
      .from('llm_analyses')
      .insert({
        survey_id: surveyId,
        analysis_type: 'jtbd_framework',
        results: {
          status: 'pending',
          request_data: analysisData,
          created_at: new Date().toISOString()
        },
        model_used: 'claude-3-haiku',
        tokens_used: 0
      })

    if (analysisError) {
      console.error('Error storing analysis request:', analysisError)
    } else {
      console.log('LLM analysis request stored successfully')
    }

    // In production, this would trigger an actual LLM analysis
    // For now, we'll just log that it would happen
    console.log('LLM analysis would be triggered here with data:', {
      surveyId,
      responseId,
      answersCount: Object.keys(answers).length
    })

  } catch (error) {
    console.error('Error in triggerLLMAnalysis:', error)
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    endpoint: '/api/survey/submit',
    methods: ['POST'],
    version: '1.0.0'
  })
}