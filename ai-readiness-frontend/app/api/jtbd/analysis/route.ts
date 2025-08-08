export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { llmService } from '@/lib/services/llm-service'
import { JTBDForceType } from '@/lib/types/llm'
import { UserRole } from '@/lib/types'
import { hasPermission, PERMISSIONS, canAccessOrganization } from '@/lib/auth/rbac'
import { addAPISecurityHeaders } from '@/lib/security/middleware'

// Input validation schemas
const AnalysisQuerySchema = z.object({
  surveyId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  responseIds: z.array(z.string().uuid()).optional(),
  forceType: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  includeMetadata: z.coerce.boolean().default(false)
})

/**
 * GET /api/jtbd/analysis
 * Analyze survey responses for JTBD forces with filtering options
 */
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
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      )
    }

    // Get user role and organization
    const userRole = (user.user_metadata?.role as UserRole) || 'user'
    const userOrgId = user.user_metadata?.organization_id

    // Check LLM access permission
    if (!hasPermission(userRole, PERMISSIONS.API_LLM_ACCESS)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Access denied. LLM access required.',
          userRole,
          requiredPermission: PERMISSIONS.API_LLM_ACCESS
        }, { status: 403 })
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryResult = AnalysisQuerySchema.safeParse({
      surveyId: searchParams.get('surveyId'),
      organizationId: searchParams.get('organizationId'),
      responseIds: searchParams.get('responseIds')?.split(','),
      forceType: searchParams.get('forceType'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      includeMetadata: searchParams.get('includeMetadata')
    })

    if (!queryResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        }, { status: 400 })
      )
    }

    const { surveyId, organizationId, responseIds, forceType, limit, offset, includeMetadata } = queryResult.data

    // Build base query for survey responses with JTBD analysis
    let query = supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        respondent_id,
        answers,
        submitted_at,
        analysis_status,
        analyzed_at,
        surveys!inner (
          id,
          title,
          organization_id,
          status
        ),
        llm_analysis_results (
          id,
          analysis_result,
          created_at,
          processed_by
        )
      `)

    // Apply filters
    if (surveyId) {
      query = query.eq('survey_id', surveyId)
    }

    if (organizationId) {
      query = query.eq('surveys.organization_id', organizationId)
    }

    if (responseIds && responseIds.length > 0) {
      query = query.in('id', responseIds)
    }

    // Check organization access - filter by user's accessible organizations
    if (userRole !== 'admin') {
      if (userOrgId) {
        query = query.eq('surveys.organization_id', userOrgId)
      } else {
        // User has no organization access
        return addAPISecurityHeaders(
          NextResponse.json({ 
            error: 'No organization access',
            userRole,
            userOrgId: userOrgId || null
          }, { status: 403 })
        )
      }
    }

    // Apply pagination
    query = query
      .range(offset, offset + limit - 1)
      .order('submitted_at', { ascending: false })

    const { data: responses, error: queryError, count } = await query

    if (queryError) {
      console.error('Query error:', queryError)
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Database query failed',
          details: queryError.message 
        }, { status: 500 })
      )
    }

    if (!responses || responses.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          data: [],
          pagination: {
            total: 0,
            limit,
            offset,
            hasMore: false
          },
          summary: {
            totalResponses: 0,
            analyzedResponses: 0,
            forceDistribution: {}
          }
        })
      )
    }

    // Check organization access for returned responses
    const accessibleResponses = responses.filter(response => 
      canAccessOrganization(userRole, userOrgId, response.surveys.organization_id)
    )

    if (accessibleResponses.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'No accessible responses found',
          userRole,
          userOrgId
        }, { status: 403 })
      )
    }

    // Process and analyze responses
    const analysisResults = []
    const forceDistribution: Record<JTBDForceType, number> = {
      pain_of_old: 0,
      pull_of_new: 0,
      anchors_to_old: 0,
      anxiety_of_new: 0,
      demographic: 0
    }

    let analyzedCount = 0

    for (const response of accessibleResponses) {
      const analysisData: any = {
        responseId: response.id,
        surveyId: response.survey_id,
        submittedAt: response.submitted_at,
        analysisStatus: response.analysis_status,
        analyzedAt: response.analyzed_at
      }

      // Include existing LLM analysis if available
      if (response.llm_analysis_results && response.llm_analysis_results.length > 0) {
        const latestAnalysis = response.llm_analysis_results[0]
        const analysisResult = latestAnalysis.analysis_result

        analysisData.jtbdAnalysis = {
          primaryForce: analysisResult.primaryJtbdForce,
          forceStrengthScore: analysisResult.forceStrengthScore,
          confidenceScore: analysisResult.confidenceScore,
          keyThemes: analysisResult.keyThemes,
          sentimentScore: analysisResult.sentimentAnalysis.overallScore,
          businessImpact: analysisResult.businessImplications.impactLevel,
          processedAt: latestAnalysis.created_at
        }

        // Update distribution count
        if (analysisResult.primaryJtbdForce in forceDistribution) {
          forceDistribution[analysisResult.primaryJtbdForce as JTBDForceType]++
        }

        analyzedCount++

        // Include full metadata if requested
        if (includeMetadata) {
          analysisData.fullAnalysis = analysisResult
          analysisData.processingMetadata = {
            processedBy: latestAnalysis.processed_by,
            processingTime: latestAnalysis.created_at
          }
        }
      }

      // Filter by force type if specified
      if (forceType && analysisData.jtbdAnalysis?.primaryForce !== forceType) {
        continue
      }

      analysisResults.push(analysisData)
    }

    // Calculate summary statistics
    const summary = {
      totalResponses: accessibleResponses.length,
      analyzedResponses: analyzedCount,
      analysisRate: analyzedCount > 0 ? Math.round((analyzedCount / accessibleResponses.length) * 100) : 0,
      forceDistribution,
      mostCommonForce: Object.entries(forceDistribution).reduce((a, b) => 
        forceDistribution[a[0] as JTBDForceType] > forceDistribution[b[0] as JTBDForceType] ? a : b
      )[0] as JTBDForceType,
      averageConfidence: analyzedCount > 0 ? 
        analysisResults
          .filter(r => r.jtbdAnalysis)
          .reduce((sum, r) => sum + (r.jtbdAnalysis.confidenceScore || 0), 0) / analyzedCount : 0
    }

    return addAPISecurityHeaders(
      NextResponse.json({
        data: analysisResults,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0)
        },
        summary,
        filters: {
          surveyId,
          organizationId,
          forceType,
          responseIds: responseIds?.slice(0, 5) // Limit shown IDs
        },
        timestamp: new Date().toISOString()
      })
    )

  } catch (error) {
    console.error('JTBD Analysis API Error:', error)
    
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Analysis retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    )
  }
}

/**
 * Health check endpoint for JTBD analysis service
 */
export async function HEAD(request: NextRequest) {
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

    // Basic auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return addAPISecurityHeaders(
        new NextResponse(null, { status: 401 })
      )
    }

    // Check LLM service health
    const healthStatus = await llmService.healthCheck()
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 206 : 503

    return addAPISecurityHeaders(
      new NextResponse(null, { 
        status: statusCode,
        headers: {
          'X-Service-Health': healthStatus.status,
          'X-Service-Latency': healthStatus.latency?.toString() || '0'
        }
      })
    )

  } catch (error) {
    return addAPISecurityHeaders(
      new NextResponse(null, { status: 500 })
    )
  }
}