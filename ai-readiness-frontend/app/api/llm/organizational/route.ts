// API Route for Organizational-Level AI Readiness Analysis
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { llmService } from '@/lib/services/llm-service';
import { ExtendedJTBDAnalysisResult } from '@/lib/types/llm';

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
    const { organizationId, surveyId, includeRaw } = body;

    // Validate required fields
    if (!organizationId && !surveyId) {
      return NextResponse.json({
        error: 'Either organizationId or surveyId is required'
      }, { status: 400 });
    }

    // Check organization access for org_admin users
    if (userProfile.role === 'org_admin' && organizationId !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Get organization details
    const targetOrgId = organizationId || userProfile.organization_id;
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', targetOrgId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build query for analysis results
    let query = supabase
      .from('llm_analysis_results')
      .select(`
        *,
        survey:surveys(
          id,
          title,
          status,
          created_at,
          responses:survey_responses(count)
        )
      `)
      .eq('organization_id', targetOrgId);

    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    }

    const { data: analysisResults, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching analysis results:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch analysis results' }, { status: 500 });
    }

    if (!analysisResults?.length) {
      return NextResponse.json({
        error: 'No analysis results found',
        message: 'Run individual or batch analysis first to generate organizational insights'
      }, { status: 404 });
    }

    // Extract analysis results from database records
    const results: ExtendedJTBDAnalysisResult[] = analysisResults.map(record => record.analysis_result);

    // Get survey statistics
    const { data: surveyStats } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        status,
        created_at,
        responses:survey_responses(count),
        completed_responses:survey_responses(count, status.eq.completed)
      `)
      .eq('organization_id', targetOrgId);

    // Prepare organization context
    const organizationContext = {
      name: organization.name,
      industry: organization.industry,
      size: organization.size,
      surveyId: surveyId || 'multiple'
    };

    // Generate organizational analysis using LLM
    const organizationalAnalysis = await llmService.generateOrganizationalAnalysis(
      results,
      organizationContext
    );

    // Calculate additional metrics
    const analytics = calculateOrganizationalMetrics(results, analysisResults);

    // Store organizational analysis result
    const { data: storedOrgAnalysis, error: storeError } = await supabase
      .from('organizational_analysis_results')
      .insert({
        organization_id: targetOrgId,
        survey_id: surveyId,
        analysis_result: organizationalAnalysis,
        metrics: analytics,
        total_responses: results.length,
        processed_by: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storeError) {
      console.error('Error storing organizational analysis:', storeError);
      // Continue execution - analysis was successful even if storage failed
    }

    // Prepare response
    const response: any = {
      success: true,
      organizationId: targetOrgId,
      organizationName: organization.name,
      analysisId: storedOrgAnalysis?.id,
      analysis: organizationalAnalysis,
      metrics: analytics,
      metadata: {
        totalResponses: results.length,
        surveysAnalyzed: surveyStats?.length || 0,
        generatedAt: new Date().toISOString(),
        surveyId: surveyId || null
      }
    };

    // Include raw analysis data if requested
    if (includeRaw) {
      response.rawAnalyses = results;
      response.surveyDetails = surveyStats;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Organizational Analysis Error:', error);
    
    return NextResponse.json({
      error: 'Organizational analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: error instanceof Error && 'code' in error ? error.code : 'UNKNOWN'
    }, { status: 500 });
  }
}

// Get existing organizational analysis
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const surveyId = searchParams.get('surveyId');
    const latest = searchParams.get('latest') === 'true';

    // Check user permissions
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const targetOrgId = organizationId || userProfile.organization_id;

    // Check organization access for org_admin users
    if (userProfile.role === 'org_admin' && targetOrgId !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Build query for organizational analysis results
    let query = supabase
      .from('organizational_analysis_results')
      .select('*')
      .eq('organization_id', targetOrgId)
      .order('created_at', { ascending: false });

    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    }

    if (latest) {
      query = query.limit(1);
    } else {
      query = query.limit(10);
    }

    const { data: orgAnalyses, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching organizational analyses:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch organizational analyses' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      organizationId: targetOrgId,
      analyses: orgAnalyses || [],
      latest: latest && orgAnalyses?.[0] ? orgAnalyses[0] : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get Organizational Analysis Error:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve organizational analysis',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper function to calculate organizational metrics
function calculateOrganizationalMetrics(results: ExtendedJTBDAnalysisResult[], dbResults: any[]) {
  if (!results.length) {
    return {
      averageConfidence: 0,
      forceDistribution: {},
      sentimentDistribution: {},
      themeFrequency: {},
      qualityScore: 0
    };
  }

  // Calculate force distribution
  const forceDistribution = results.reduce((acc, result) => {
    acc[result.primaryJtbdForce] = (acc[result.primaryJtbdForce] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate sentiment distribution
  const sentimentDistribution = results.reduce((acc, result) => {
    acc[result.sentimentAnalysis.sentimentLabel] = (acc[result.sentimentAnalysis.sentimentLabel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate theme frequency
  const themeFrequency = results.reduce((acc, result) => {
    result.keyThemes.forEach(theme => {
      acc[theme] = (acc[theme] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Calculate average scores
  const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length;
  const avgForceStrength = results.reduce((sum, r) => sum + r.forceStrengthScore, 0) / results.length;
  const avgSentiment = results.reduce((sum, r) => sum + r.sentimentAnalysis.overallScore, 0) / results.length;

  return {
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    averageForceStrength: Math.round(avgForceStrength * 100) / 100,
    averageSentiment: Math.round(avgSentiment * 100) / 100,
    forceDistribution,
    sentimentDistribution,
    themeFrequency: Object.fromEntries(
      Object.entries(themeFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20) // Top 20 themes
    ),
    qualityScore: results.reduce((sum, r) => {
      const qualityMap = { poor: 1, fair: 2, good: 3, excellent: 4 };
      return sum + (qualityMap[r.qualityIndicators.responseQuality] || 2);
    }, 0) / results.length,
    totalResponses: results.length,
    dateRange: {
      earliest: Math.min(...dbResults.map(r => new Date(r.created_at).getTime())),
      latest: Math.max(...dbResults.map(r => new Date(r.created_at).getTime()))
    }
  };
}