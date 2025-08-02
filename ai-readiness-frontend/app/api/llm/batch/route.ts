// API Route for Batch LLM Analysis of Multiple Survey Responses
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { llmService } from '@/lib/services/llm-service';
import { BatchAnalysisRequest, JTBDForceType } from '@/lib/types/llm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions (admin or org_admin)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { surveyId, organizationId, responseIds, options } = body;

    // Validate required fields
    if (!surveyId && !responseIds?.length) {
      return NextResponse.json({
        error: 'Either surveyId or responseIds array is required'
      }, { status: 400 });
    }

    // Build query for responses to analyze
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        answers,
        survey:surveys(
          id,
          title,
          organization_id,
          questions
        ),
        user:profiles(
          first_name,
          last_name,
          department,
          job_title
        )
      `);

    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    } else {
      query = query.in('id', responseIds);
    }

    // Add organization filter for org_admin users
    if (userProfile.role === 'org_admin') {
      // We'll filter after the query since we need to check the survey's organization
    }

    const { data: responses, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching responses:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
    }

    if (!responses?.length) {
      return NextResponse.json({ error: 'No responses found' }, { status: 404 });
    }

    // Filter by organization for org_admin users
    const filteredResponses = userProfile.role === 'org_admin'
      ? responses.filter((r: any) => r.survey?.organization_id === userProfile.organization_id)
      : responses;

    if (!filteredResponses.length) {
      return NextResponse.json({ error: 'No accessible responses found' }, { status: 403 });
    }

    // Get organization details
    const orgId = organizationId || (filteredResponses[0] as any).survey?.organization_id;
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, industry, size')
      .eq('id', orgId)
      .single();

    // Prepare batch analysis request
    const batchRequest: BatchAnalysisRequest = {
      responses: [],
      options: {
        parallel: options?.parallel !== false,
        priority: options?.priority || 'medium',
        retryFailures: options?.retryFailures !== false
      }
    };

    // Process each response and extract questions/answers
    for (const response of filteredResponses) {
      const survey = response.survey;
      const answers = response.answers;

      // Process each answer in the response
      for (const answer of answers) {
        const question = (survey as any).questions?.find((q: any) => q.id === answer.question_id);
        if (!question) continue;

        // Determine expected JTBD force based on question category or type
        let expectedForce: JTBDForceType = 'demographic';
        
        if (question.category) {
          switch (question.category.toLowerCase()) {
            case 'pain':
            case 'problems':
            case 'current_issues':
              expectedForce = 'pain_of_old';
              break;
            case 'benefits':
            case 'opportunities':
            case 'ai_potential':
              expectedForce = 'pull_of_new';
              break;
            case 'barriers':
            case 'resistance':
            case 'organizational':
              expectedForce = 'anchors_to_old';
              break;
            case 'concerns':
            case 'fears':
            case 'risks':
              expectedForce = 'anxiety_of_new';
              break;
            case 'demographic':
            case 'usage':
            case 'experience':
              expectedForce = 'demographic';
              break;
          }
        }

        // Skip demographic questions in batch analysis unless specifically requested
        if (expectedForce === 'demographic' && !options?.includeDemographic) {
          continue;
        }

        batchRequest.responses.push({
          responseId: response.id,
          questionText: question.question,
          expectedForce,
          questionContext: question.category || 'AI readiness assessment',
          userResponse: typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer),
          employeeRole: (response as any).user?.job_title || 'Not specified',
          employeeDepartment: (response as any).user?.department || 'Not specified',
          organizationName: organization?.name || 'Not specified'
        });
      }
    }

    if (!batchRequest.responses.length) {
      return NextResponse.json({
        error: 'No analyzable responses found',
        message: 'All responses appear to be demographic or empty'
      }, { status: 400 });
    }

    // Perform batch LLM analysis
    const batchResult = await llmService.batchAnalyzeResponses(batchRequest);

    // Store batch analysis results
    const analysisRecords = batchResult.results.map(result => {
      const response = (filteredResponses as any[]).find((r: any) => r.id === result.responseId);
      return {
        response_id: result.responseId,
        survey_id: surveyId || response?.survey?.id,
        organization_id: orgId,
        analysis_result: result,
        processed_by: user.id,
        created_at: new Date().toISOString()
      };
    });

    if (analysisRecords.length > 0) {
      const { error: storeError } = await supabase
        .from('llm_analysis_results')
        .insert(analysisRecords);

      if (storeError) {
        console.error('Error storing batch analysis results:', storeError);
        // Continue execution - analysis was successful even if storage failed
      }

      // Update responses with analysis status
      const responseIds = batchResult.results.map(r => r.responseId);
      await supabase
        .from('survey_responses')
        .update({ 
          analysis_status: 'completed',
          analyzed_at: new Date().toISOString()
        })
        .in('id', responseIds);
    }

    // Store batch analysis summary
    const { data: batchSummary } = await supabase
      .from('batch_analysis_logs')
      .insert({
        survey_id: surveyId,
        organization_id: orgId,
        total_responses: batchRequest.responses.length,
        successful_analyses: batchResult.summary.successful,
        failed_analyses: batchResult.summary.failed,
        total_cost_cents: batchResult.summary.totalCostCents,
        total_tokens_used: batchResult.summary.totalTokensUsed,
        processing_time_ms: batchResult.summary.processingTimeMs,
        processed_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      batchId: batchSummary?.id,
      summary: batchResult.summary,
      results: batchResult.results,
      errors: batchResult.errors,
      organizationContext: {
        name: organization?.name,
        id: orgId
      }
    });

  } catch (error) {
    console.error('Batch LLM Analysis Error:', error);
    
    return NextResponse.json({
      error: 'Batch analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: error instanceof Error && 'code' in error ? error.code : 'UNKNOWN'
    }, { status: 500 });
  }
}

// Get batch analysis status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const surveyId = searchParams.get('surveyId');
    const organizationId = searchParams.get('organizationId');

    // Check user permissions
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    let query = supabase
      .from('batch_analysis_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (batchId) {
      query = query.eq('id', batchId);
    } else if (surveyId) {
      query = query.eq('survey_id', surveyId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Filter by organization for org_admin users
    if (userProfile.role === 'org_admin') {
      query = query.eq('organization_id', userProfile.organization_id);
    }

    const { data: batchLogs, error: fetchError } = await query.limit(20);

    if (fetchError) {
      console.error('Error fetching batch logs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch batch analysis logs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      batches: batchLogs || [],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Batch Analysis Error:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve batch analysis status',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}