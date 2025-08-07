export const dynamic = 'force-dynamic'

// API Route for LLM Analysis of Survey Responses
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { llmService } from '@/lib/services/llm-service';
import { JTBDForceType } from '@/lib/types/llm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions (admin or org_admin)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      responseId,
      responseText,
      questionText,
      expectedForce,
      questionContext,
      organizationId,
      surveyId
    } = body;

    // Validate required fields
    if (!responseId || !responseText || !questionText || !expectedForce) {
      return NextResponse.json({
        error: 'Missing required fields: responseId, responseText, questionText, expectedForce'
      }, { status: 400 });
    }

    // Input sanitization and length validation
    if (typeof responseText !== 'string' || responseText.trim().length === 0) {
      return NextResponse.json({
        error: 'responseText must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof questionText !== 'string' || questionText.trim().length === 0) {
      return NextResponse.json({
        error: 'questionText must be a non-empty string'
      }, { status: 400 });
    }

    // Length validation
    if (responseText.length > 5000) {
      return NextResponse.json({
        error: 'responseText exceeds maximum length of 5000 characters'
      }, { status: 400 });
    }

    if (questionText.length > 1000) {
      return NextResponse.json({
        error: 'questionText exceeds maximum length of 1000 characters'
      }, { status: 400 });
    }

    // Validate expectedForce enum
    const validForces: JTBDForceType[] = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
    if (!validForces.includes(expectedForce)) {
      return NextResponse.json({
        error: `Invalid expectedForce. Must be one of: ${validForces.join(', ')}`
      }, { status: 400 });
    }

    // Get additional context from the database
    const { data: response } = await supabase
      .from('survey_responses')
      .select(`
        *,
        survey:surveys(title, organization_id),
        user:profiles(first_name, last_name, department, job_title)
      `)
      .eq('id', responseId)
      .single();

    if (!response) {
      return NextResponse.json({ error: 'Survey response not found' }, { status: 404 });
    }

    // Check organization access
    if (userProfile.role === 'org_admin' && response.survey.organization_id !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, industry, size')
      .eq('id', response.survey.organization_id)
      .single();

    // Prepare context for LLM analysis
    const analysisContext = {
      questionContext: questionContext || 'AI readiness assessment',
      employeeRole: response.user?.job_title || 'Not specified',
      employeeDepartment: response.user?.department || 'Not specified',
      organizationName: organization?.name || 'Not specified',
      responseId,
      surveyId: surveyId || response.survey_id
    };

    // Check if API keys are available before attempting analysis
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasOpenAI && !hasAnthropic) {
      return NextResponse.json({
        error: 'LLM analysis unavailable',
        message: 'No LLM API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.',
        code: 'NO_API_KEYS'
      }, { status: 503 });
    }

    // Perform LLM analysis
    const analysisResult = await llmService.analyzeSurveyResponse(
      responseText,
      questionText,
      expectedForce,
      analysisContext
    );

    // Store analysis result in database
    const { data: storedAnalysis, error: storeError } = await supabase
      .from('llm_analysis_results')
      .insert({
        response_id: responseId,
        survey_id: surveyId || response.survey_id,
        organization_id: response.survey.organization_id,
        analysis_result: analysisResult,
        processed_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing analysis result:', storeError);
      // Continue execution - analysis was successful even if storage failed
    }

    // Update response with analysis status
    await supabase
      .from('survey_responses')
      .update({ 
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString()
      })
      .eq('id', responseId);

    return NextResponse.json({
      success: true,
      analysisId: storedAnalysis?.id,
      result: analysisResult,
      context: analysisContext
    });

  } catch (error) {
    console.error('LLM Analysis Error:', error);
    
    // Determine appropriate error code and status
    let errorCode = 'ANALYSIS_FAILED';
    let statusCode = 500;
    let message = 'Analysis failed';

    if (error instanceof Error) {
      message = error.message;
      
      // API key related errors
      if (error.message.includes('API key') || error.message.includes('401')) {
        errorCode = 'AUTH_ERROR';
        statusCode = 401;
      }
      // Rate limiting errors
      else if (error.message.includes('429') || error.message.includes('rate limit')) {
        errorCode = 'RATE_LIMITED';
        statusCode = 429;
      }
      // Timeout errors
      else if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorCode = 'TIMEOUT';
        statusCode = 408;
      }
      // Service unavailable
      else if (error.message.includes('503') || error.message.includes('service unavailable')) {
        errorCode = 'SERVICE_UNAVAILABLE';
        statusCode = 503;
      }
      // JSON parsing errors
      else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorCode = 'INVALID_RESPONSE';
        statusCode = 502;
      }
    }
    
    return NextResponse.json({
      error: 'Analysis failed',
      message,
      code: errorCode,
      timestamp: new Date().toISOString()
    }, { status: statusCode });
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication for health check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check API key availability
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    const apiKeyStatus = {
      openai: hasOpenAI ? 'configured' : 'missing',
      anthropic: hasAnthropic ? 'configured' : 'missing'
    };

    // Perform LLM service health check if any API key is available
    let healthStatus: { status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number; error?: string } = { 
      status: 'unhealthy', 
      error: 'No API keys configured' 
    };
    
    if (hasOpenAI || hasAnthropic) {
      try {
        healthStatus = await llmService.healthCheck();
      } catch (error) {
        healthStatus = { 
          status: 'unhealthy', 
          error: error instanceof Error ? error.message : 'Health check failed' 
        };
      }
    }
    
    return NextResponse.json({
      service: 'LLM Analysis API',
      status: healthStatus.status,
      latency: healthStatus.latency,
      timestamp: new Date().toISOString(),
      apiKeys: apiKeyStatus,
      config: {
        provider: llmService.getConfig().provider,
        model: llmService.getConfig().model
      },
      error: healthStatus.error
    });

  } catch (error) {
    return NextResponse.json({
      service: 'LLM Analysis API',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}