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
    
    return NextResponse.json({
      error: 'Analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: error instanceof Error && 'code' in error ? error.code : 'UNKNOWN'
    }, { status: 500 });
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

    // Perform LLM service health check
    const healthStatus = await llmService.healthCheck();
    
    return NextResponse.json({
      service: 'LLM Analysis API',
      status: healthStatus.status,
      latency: healthStatus.latency,
      timestamp: new Date().toISOString(),
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