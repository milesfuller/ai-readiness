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

// Query parameter validation schema
const SurveyJTBDQuerySchema = z.object({
  includeRaw: z.coerce.boolean().default(false),
  forceType: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']).optional(),
  minConfidence: z.coerce.number().min(1).max(5).default(1),
  aggregationType: z.enum(['simple', 'weighted', 'normalized']).default('weighted'),
  includeRespondentDetails: z.coerce.boolean().default(false),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  limit: z.coerce.number().int().positive().max(500).default(100)
})

/**
 * GET /api/surveys/[id]/jtbd
 * Get comprehensive JTBD analysis for a specific survey
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const surveyId = params.id
    
    // Validate survey ID format
    if (!surveyId || typeof surveyId !== 'string') {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Invalid survey ID' }, { status: 400 })
      )
    }

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
    const queryResult = SurveyJTBDQuerySchema.safeParse({
      includeRaw: searchParams.get('includeRaw'),
      forceType: searchParams.get('forceType'),
      minConfidence: searchParams.get('minConfidence'),
      aggregationType: searchParams.get('aggregationType'),
      includeRespondentDetails: searchParams.get('includeRespondentDetails'),
      dateRange: searchParams.get('startDate') || searchParams.get('endDate') ? {
        start: searchParams.get('startDate') || undefined,
        end: searchParams.get('endDate') || undefined
      } : undefined,
      limit: searchParams.get('limit')
    })

    if (!queryResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid query parameters',
          details: queryResult.error.issues
        }, { status: 400 })
      )
    }

    const { includeRaw, forceType, minConfidence, aggregationType, includeRespondentDetails, dateRange, limit } = queryResult.data

    // First, get and verify survey access
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        id,
        title,
        description,
        organization_id,
        status,
        created_at,
        settings
      `)
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      return addAPISecurityHeaders(
        NextResponse.json({ error: 'Survey not found' }, { status: 404 })
      )
    }

    // Check organization access
    if (!canAccessOrganization(userRole, userOrgId, survey.organization_id)) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Access denied to this survey',
          userRole,
          userOrgId,
          surveyOrgId: survey.organization_id
        }, { status: 403 })
      )
    }

    // Build query for survey responses with JTBD analysis
    let responsesQuery = supabase
      .from('survey_responses')
      .select(`
        id,
        respondent_id,
        answers,
        submitted_at,
        analysis_status,
        analyzed_at,
        completion_time,
        metadata,
        profiles!respondent_id (
          first_name,
          last_name,
          job_title,
          department
        ),
        llm_analysis_results (
          id,
          analysis_result,
          created_at,
          processed_by
        )
      `)
      .eq('survey_id', surveyId)
      .not('submitted_at', 'is', null)

    // Apply date range filter if specified
    if (dateRange?.start) {
      responsesQuery = responsesQuery.gte('submitted_at', dateRange.start)
    }
    if (dateRange?.end) {
      responsesQuery = responsesQuery.lte('submitted_at', dateRange.end)
    }

    // Apply limit
    responsesQuery = responsesQuery
      .order('submitted_at', { ascending: false })
      .limit(limit)

    const { data: responses, error: responsesError } = await responsesQuery

    if (responsesError) {
      console.error('Responses query error:', responsesError)
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Failed to fetch survey responses',
          details: responsesError.message 
        }, { status: 500 })
      )
    }

    if (!responses || responses.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          surveyId,
          surveyTitle: survey.title,
          analysis: {
            totalResponses: 0,
            analyzedResponses: 0,
            analysisRate: 0,
            message: 'No responses found for this survey'
          },
          timestamp: new Date().toISOString()
        })
      )
    }

    // Process JTBD analysis data
    const analysisData = []
    const forceDistribution: Record<JTBDForceType, number> = {
      pain_of_old: 0,
      pull_of_new: 0,
      anchors_to_old: 0,
      anxiety_of_new: 0,
      demographic: 0
    }

    let analyzedCount = 0
    let totalConfidence = 0
    const allThemes = new Set<string>()
    const responsesByForce: Record<JTBDForceType, any[]> = {
      pain_of_old: [],
      pull_of_new: [],
      anchors_to_old: [],
      anxiety_of_new: [],
      demographic: []
    }

    for (const response of responses) {
      if (response.llm_analysis_results && response.llm_analysis_results.length > 0) {
        const latestAnalysis = response.llm_analysis_results[0]
        const analysisResult = latestAnalysis.analysis_result

        // Apply minimum confidence filter
        if (analysisResult.confidenceScore < minConfidence) {
          continue
        }

        // Apply force type filter if specified
        if (forceType && analysisResult.primaryJtbdForce !== forceType) {
          continue
        }

        const primaryForce = analysisResult.primaryJtbdForce as JTBDForceType

        // Collect data for aggregation
        const responseAnalysis = {
          responseId: response.id,
          submittedAt: response.submitted_at,
          primaryForce,
          forceStrengthScore: analysisResult.forceStrengthScore,
          confidenceScore: analysisResult.confidenceScore,
          keyThemes: analysisResult.keyThemes,
          sentimentScore: analysisResult.sentimentAnalysis.overallScore,
          businessImpact: analysisResult.businessImplications.impactLevel,
          urgency: analysisResult.businessImplications.urgency,
          actionableInsights: analysisResult.actionableInsights,
          qualityIndicators: analysisResult.qualityIndicators,
          respondentInfo: includeRespondentDetails ? {
            jobTitle: response.profiles && typeof response.profiles === 'object' && 'job_title' in response.profiles ? response.profiles.job_title as string : undefined,
            department: response.profiles && typeof response.profiles === 'object' && 'department' in response.profiles ? response.profiles.department as string : undefined,
            firstName: response.profiles && typeof response.profiles === 'object' && 'first_name' in response.profiles ? response.profiles.first_name as string : undefined,
            lastName: response.profiles && typeof response.profiles === 'object' && 'last_name' in response.profiles ? response.profiles.last_name as string : undefined
          } : null,
          rawAnalysis: includeRaw ? analysisResult : null
        }

        analysisData.push(responseAnalysis)
        responsesByForce[primaryForce].push(responseAnalysis)

        // Update aggregation data
        forceDistribution[primaryForce]++
        totalConfidence += analysisResult.confidenceScore
        analysisResult.keyThemes.forEach((theme: string) => allThemes.add(theme))
        analyzedCount++
      }
    }

    if (analyzedCount === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          surveyId,
          surveyTitle: survey.title,
          analysis: {
            totalResponses: responses.length,
            analyzedResponses: 0,
            analysisRate: 0,
            message: 'No analyzed responses match the specified criteria'
          },
          filters: { forceType, minConfidence, dateRange },
          timestamp: new Date().toISOString()
        })
      )
    }

    // Generate aggregated JTBD analysis based on aggregation type
    const aggregatedAnalysis = generateSurveyJTBDAnalysis(
      responsesByForce,
      forceDistribution,
      analyzedCount,
      aggregationType,
      {
        totalConfidence,
        allThemes: Array.from(allThemes),
        surveyTitle: survey.title,
        organizationId: survey.organization_id
      }
    )

    // Generate organizational insights if sufficient data
    let organizationalInsights = null
    if (analyzedCount >= 5) {
      try {
        organizationalInsights = await generateOrganizationalInsights(
          analysisData,
          survey,
          aggregationType
        )
      } catch (error) {
        console.warn('Failed to generate organizational insights:', error)
      }
    }

    // Build comprehensive response
    const jtbdAnalysisResponse = {
      surveyId,
      surveyTitle: survey.title,
      surveyStatus: survey.status,
      organizationId: survey.organization_id,
      analysis: {
        totalResponses: responses.length,
        analyzedResponses: analyzedCount,
        analysisRate: Math.round((analyzedCount / responses.length) * 100),
        averageConfidence: Math.round((totalConfidence / analyzedCount) * 100) / 100,
        dataQualityScore: calculateDataQualityScore(analysisData)
      },
      jtbdForces: aggregatedAnalysis,
      organizationalInsights,
      themes: {
        all: Array.from(allThemes),
        byForce: extractThemesByForce(responsesByForce),
        trending: identifyTrendingThemes(analysisData)
      },
      segmentation: generateSegmentation(analysisData, includeRespondentDetails),
      recommendations: generateSurveyRecommendations(aggregatedAnalysis, analyzedCount),
      filters: { forceType, minConfidence, dateRange, aggregationType },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataRangeStart: responses[responses.length - 1]?.submitted_at,
        dataRangeEnd: responses[0]?.submitted_at,
        processingVersion: '1.0.0'
      },
      // Include individual response data if requested
      ...(includeRaw && { individualResponses: analysisData })
    }

    return addAPISecurityHeaders(
      NextResponse.json(jtbdAnalysisResponse)
    )

  } catch (error) {
    console.error('Survey JTBD Analysis API Error:', error)
    
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Survey JTBD analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        surveyId: params.id,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    )
  }
}

/**
 * Generate aggregated JTBD analysis for the survey
 */
function generateSurveyJTBDAnalysis(
  responsesByForce: Record<JTBDForceType, any[]>,
  forceDistribution: Record<JTBDForceType, number>,
  totalResponses: number,
  aggregationType: string,
  metadata: any
): Record<JTBDForceType, any> {
  const forces: Record<JTBDForceType, any> = {} as Record<JTBDForceType, any>

  for (const [force, responses] of Object.entries(responsesByForce) as [JTBDForceType, any[]][]) {
    if (responses.length === 0) {
      forces[force] = {
        count: 0,
        percentage: 0,
        averageStrength: 0,
        averageConfidence: 0,
        sentiment: { average: 0, distribution: {} },
        themes: [],
        businessImpacts: [],
        urgencyLevels: [],
        insights: 'No responses for this force'
      }
      continue
    }

    // Calculate aggregated metrics based on aggregation type
    let strengthSum = 0
    let confidenceSum = 0
    let sentimentSum = 0
    const themes = new Set<string>()
    const businessImpacts: string[] = []
    const urgencyLevels: string[] = []
    const sentimentDistribution: Record<string, number> = {}

    // Apply weighting if needed
    const weights = aggregationType === 'weighted' 
      ? responses.map(r => r.confidenceScore / 5) 
      : responses.map(() => 1)

    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    responses.forEach((response, index) => {
      const weight = weights[index]
      
      strengthSum += response.forceStrengthScore * weight
      confidenceSum += response.confidenceScore * weight
      sentimentSum += response.sentimentScore * weight

      response.keyThemes.forEach((theme: string) => themes.add(theme))
      businessImpacts.push(response.businessImpact)
      urgencyLevels.push(response.urgency)

      // Track sentiment distribution
      const sentimentLabel = getSentimentLabel(response.sentimentScore)
      sentimentDistribution[sentimentLabel] = (sentimentDistribution[sentimentLabel] || 0) + 1
    })

    forces[force] = {
      count: responses.length,
      percentage: Math.round((responses.length / totalResponses) * 100),
      averageStrength: Math.round((strengthSum / totalWeight) * 100) / 100,
      averageConfidence: Math.round((confidenceSum / totalWeight) * 100) / 100,
      normalizedScore: aggregationType === 'normalized' ? 
        normalizeScore(strengthSum / totalWeight, force) : strengthSum / totalWeight,
      sentiment: {
        average: Math.round((sentimentSum / totalWeight) * 100) / 100,
        distribution: sentimentDistribution
      },
      themes: Array.from(themes),
      topThemes: getTopThemes(Array.from(themes), responses),
      businessImpacts: getImpactDistribution(businessImpacts),
      urgencyLevels: getUrgencyDistribution(urgencyLevels),
      qualityMetrics: calculateForceQuality(responses),
      insights: generateForceInsights(force, responses, strengthSum / totalWeight)
    }
  }

  return forces
}

/**
 * Generate organizational insights from JTBD analysis
 */
async function generateOrganizationalInsights(
  analysisData: any[],
  survey: any,
  aggregationType: string
): Promise<any> {
  // This would typically use the LLM service for deeper insights
  // For now, return structured analytical insights
  
  const totalResponses = analysisData.length
  const forceStrengths = analysisData.reduce((acc, response) => {
    acc[response.primaryForce] = (acc[response.primaryForce] || []).concat(response.forceStrengthScore)
    return acc
  }, {} as Record<string, number[]>)

  // Calculate readiness indicators
  const painScores = forceStrengths.pain_of_old || []
  const pullScores = forceStrengths.pull_of_new || []
  const anchorScores = forceStrengths.anchors_to_old || []
  const anxietyScores = forceStrengths.anxiety_of_new || []

  const avgPain = painScores.length > 0 ? painScores.reduce((a: number, b: number) => a + b, 0) / painScores.length : 0
  const avgPull = pullScores.length > 0 ? pullScores.reduce((a: number, b: number) => a + b, 0) / pullScores.length : 0
  const avgAnchors = anchorScores.length > 0 ? anchorScores.reduce((a: number, b: number) => a + b, 0) / anchorScores.length : 0
  const avgAnxiety = anxietyScores.length > 0 ? anxietyScores.reduce((a: number, b: number) => a + b, 0) / anxietyScores.length : 0

  // Calculate overall readiness using JTBD formula
  const readinessScore = Math.max(0, Math.min(100,
    (avgPain * 20) + (avgPull * 25) - (avgAnchors * 15) - (avgAnxiety * 10) + 30
  ))

  return {
    overallReadinessScore: Math.round(readinessScore),
    readinessLevel: getReadinessLevel(readinessScore),
    keyFindings: generateKeyFindings(forceStrengths, totalResponses),
    forceBalance: {
      drivers: Math.round(avgPain + avgPull),
      barriers: Math.round(avgAnchors + avgAnxiety),
      netForce: Math.round((avgPain + avgPull) - (avgAnchors + avgAnxiety))
    },
    riskFactors: identifyRiskFactors(forceStrengths),
    opportunities: identifyOpportunities(forceStrengths),
    nextSteps: generateNextSteps(readinessScore, forceStrengths)
  }
}

/**
 * Helper functions for analysis processing
 */
function getSentimentLabel(score: number): string {
  if (score <= -0.6) return 'very_negative'
  if (score <= -0.2) return 'negative'
  if (score <= 0.2) return 'neutral'
  if (score <= 0.6) return 'positive'
  return 'very_positive'
}

function normalizeScore(score: number, force: JTBDForceType): number {
  // Normalize scores to 0-100 scale with force-specific adjustments
  const baseScore = (score / 5) * 100
  
  // Invert negative forces for readiness calculation
  if (force === 'anchors_to_old' || force === 'anxiety_of_new') {
    return Math.max(0, 100 - baseScore)
  }
  
  return Math.max(0, baseScore)
}

function getTopThemes(themes: string[], responses: any[]): string[] {
  const themeCount: Record<string, number> = {}
  
  responses.forEach(response => {
    response.keyThemes.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1
    })
  })

  return Object.entries(themeCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
}

function getImpactDistribution(impacts: string[]): Record<string, number> {
  return impacts.reduce((acc, impact) => {
    acc[impact] = (acc[impact] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function getUrgencyDistribution(urgencies: string[]): Record<string, number> {
  return urgencies.reduce((acc, urgency) => {
    acc[urgency] = (acc[urgency] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function calculateForceQuality(responses: any[]): any {
  const qualityScores = responses.map(r => getQualityScore(r.qualityIndicators.responseQuality))
  const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length

  return {
    averageQuality: Math.round(avgQuality * 100) / 100,
    distribution: responses.reduce((acc, r) => {
      const quality = r.qualityIndicators.responseQuality
      acc[quality] = (acc[quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }
}

function getQualityScore(quality: string): number {
  switch (quality) {
    case 'excellent': return 4
    case 'good': return 3
    case 'fair': return 2
    case 'poor': return 1
    default: return 2
  }
}

function generateForceInsights(force: JTBDForceType, responses: any[], averageStrength: number): string {
  const strength = averageStrength >= 4 ? 'strong' : averageStrength >= 3 ? 'moderate' : 'weak'
  
  switch (force) {
    case 'pain_of_old':
      return `${strength} motivation for change driven by current inefficiencies (${responses.length} responses)`
    case 'pull_of_new':
      return `${strength} attraction to AI benefits and opportunities (${responses.length} responses)`
    case 'anchors_to_old':
      return `${strength} organizational barriers to change (${responses.length} responses)`
    case 'anxiety_of_new':
      return `${strength} concerns about AI implementation (${responses.length} responses)`
    case 'demographic':
      return `Current AI usage and experience patterns (${responses.length} responses)`
    default:
      return `Analysis of ${responses.length} responses`
  }
}

function calculateDataQualityScore(analysisData: any[]): number {
  if (analysisData.length === 0) return 0

  const qualityFactors = analysisData.map(response => {
    const confidence = response.confidenceScore / 5
    const quality = getQualityScore(response.qualityIndicators.responseQuality) / 4
    const completeness = response.keyThemes.length >= 2 ? 1 : 0.7
    
    return (confidence + quality + completeness) / 3
  })

  const avgQuality = qualityFactors.reduce((sum, score) => sum + score, 0) / qualityFactors.length
  return Math.round(avgQuality * 100)
}

function extractThemesByForce(responsesByForce: Record<JTBDForceType, any[]>): Record<JTBDForceType, string[]> {
  const themesByForce: Record<JTBDForceType, string[]> = {} as Record<JTBDForceType, string[]>

  for (const [force, responses] of Object.entries(responsesByForce) as [JTBDForceType, any[]][]) {
    const themes = new Set<string>()
    responses.forEach(response => {
      response.keyThemes.forEach((theme: string) => themes.add(theme))
    })
    themesByForce[force] = Array.from(themes)
  }

  return themesByForce
}

function identifyTrendingThemes(analysisData: any[]): string[] {
  // Simple implementation - could be enhanced with time-based trending
  const themeCount: Record<string, number> = {}
  
  analysisData.forEach(response => {
    response.keyThemes.forEach((theme: string) => {
      themeCount[theme] = (themeCount[theme] || 0) + 1
    })
  })

  return Object.entries(themeCount)
    .filter(([, count]) => count >= Math.max(2, analysisData.length * 0.1))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([theme]) => theme)
}

function generateSegmentation(analysisData: any[], includeRespondentDetails: boolean): any {
  if (!includeRespondentDetails) {
    return { message: 'Segmentation requires respondent details' }
  }

  const byDepartment: Record<string, any> = {}
  const byJobTitle: Record<string, any> = {}

  analysisData.forEach(response => {
    if (response.respondentInfo) {
      const dept = response.respondentInfo.department || 'Unknown'
      const title = response.respondentInfo.jobTitle || 'Unknown'

      // Department segmentation
      if (!byDepartment[dept]) {
        byDepartment[dept] = { count: 0, forces: {} as Record<JTBDForceType, number> }
      }
      byDepartment[dept].count++
      byDepartment[dept].forces[response.primaryForce] = 
        (byDepartment[dept].forces[response.primaryForce] || 0) + 1

      // Job title segmentation
      if (!byJobTitle[title]) {
        byJobTitle[title] = { count: 0, forces: {} as Record<JTBDForceType, number> }
      }
      byJobTitle[title].count++
      byJobTitle[title].forces[response.primaryForce] = 
        (byJobTitle[title].forces[response.primaryForce] || 0) + 1
    }
  })

  return { byDepartment, byJobTitle }
}

function generateSurveyRecommendations(aggregatedAnalysis: Record<JTBDForceType, any>, totalResponses: number): string[] {
  const recommendations = []

  // Overall data recommendations
  if (totalResponses < 20) {
    recommendations.push('Consider collecting more responses for statistically significant insights')
  }

  // Force-specific recommendations
  const painScore = aggregatedAnalysis.pain_of_old?.averageStrength || 0
  const pullScore = aggregatedAnalysis.pull_of_new?.averageStrength || 0
  const anchorScore = aggregatedAnalysis.anchors_to_old?.averageStrength || 0
  const anxietyScore = aggregatedAnalysis.anxiety_of_new?.averageStrength || 0

  if (painScore < 3) {
    recommendations.push('Focus on identifying and articulating current pain points more clearly')
  }

  if (pullScore < 3) {
    recommendations.push('Develop stronger AI value proposition and success stories')
  }

  if (anchorScore > 3) {
    recommendations.push('Address organizational barriers and resistance to change')
  }

  if (anxietyScore > 3) {
    recommendations.push('Implement comprehensive change management and AI education programs')
  }

  // Overall readiness recommendations
  const overallReadiness = (painScore + pullScore - anchorScore - anxietyScore + 10) / 2
  
  if (overallReadiness >= 7) {
    recommendations.push('Organization shows high readiness - proceed with AI pilot programs')
  } else if (overallReadiness >= 5) {
    recommendations.push('Moderate readiness - start with low-risk AI implementations')
  } else {
    recommendations.push('Low readiness - focus on foundational change management first')
  }

  return recommendations
}

function generateKeyFindings(forceStrengths: Record<string, number[]>, totalResponses: number): string[] {
  const findings = []
  
  // Find strongest and weakest forces
  const forceAverages = Object.entries(forceStrengths).map(([force, scores]) => ({
    force,
    average: scores.reduce((a, b) => a + b, 0) / scores.length
  })).sort((a, b) => b.average - a.average)

  if (forceAverages.length > 0) {
    findings.push(`Strongest force: ${forceAverages[0].force} (avg: ${forceAverages[0].average.toFixed(1)})`)
    if (forceAverages.length > 1) {
      findings.push(`Weakest force: ${forceAverages[forceAverages.length - 1].force} (avg: ${forceAverages[forceAverages.length - 1].average.toFixed(1)})`)
    }
  }

  findings.push(`Analysis based on ${totalResponses} responses`)

  return findings
}

function identifyRiskFactors(forceStrengths: Record<string, number[]>): string[] {
  const risks = []
  
  const anchorScores = forceStrengths.anchors_to_old || []
  const anxietyScores = forceStrengths.anxiety_of_new || []
  
  if (anchorScores.length > 0) {
    const avgAnchors = anchorScores.reduce((a, b) => a + b, 0) / anchorScores.length
    if (avgAnchors > 3.5) risks.push('High organizational resistance to change')
  }
  
  if (anxietyScores.length > 0) {
    const avgAnxiety = anxietyScores.reduce((a, b) => a + b, 0) / anxietyScores.length
    if (avgAnxiety > 3.5) risks.push('Significant anxiety about AI implementation')
  }

  return risks
}

function identifyOpportunities(forceStrengths: Record<string, number[]>): string[] {
  const opportunities = []
  
  const painScores = forceStrengths.pain_of_old || []
  const pullScores = forceStrengths.pull_of_new || []
  
  if (painScores.length > 0) {
    const avgPain = painScores.reduce((a, b) => a + b, 0) / painScores.length
    if (avgPain > 3.5) opportunities.push('Strong motivation for change driven by current problems')
  }
  
  if (pullScores.length > 0) {
    const avgPull = pullScores.reduce((a, b) => a + b, 0) / pullScores.length
    if (avgPull > 3.5) opportunities.push('High attraction to AI benefits and possibilities')
  }

  return opportunities
}

function generateNextSteps(readinessScore: number, forceStrengths: Record<string, number[]>): string[] {
  const steps = []

  if (readinessScore >= 70) {
    steps.push('Begin AI pilot program selection and planning')
    steps.push('Establish AI governance and ethics framework')
  } else if (readinessScore >= 50) {
    steps.push('Develop comprehensive change management strategy')
    steps.push('Start AI education and awareness programs')
  } else {
    steps.push('Focus on building foundational change readiness')
    steps.push('Address organizational barriers before technology implementation')
  }

  return steps
}

function getReadinessLevel(score: number): string {
  if (score >= 80) return 'Ready to Scale'
  if (score >= 70) return 'Ready to Implement'
  if (score >= 60) return 'Ready with Preparation'
  if (score >= 40) return 'Needs Significant Preparation'
  return 'Not Ready - Build Foundation First'
}