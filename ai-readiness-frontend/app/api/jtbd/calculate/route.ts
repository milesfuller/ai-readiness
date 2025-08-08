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

// Input validation schema for JTBD calculation
const CalculationRequestSchema = z.object({
  responses: z.array(z.object({
    responseId: z.string().uuid(),
    questionText: z.string().min(1).max(1000),
    responseText: z.string().min(1).max(5000),
    expectedForce: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
    questionContext: z.string().optional(),
    weight: z.number().min(0.1).max(5.0).default(1.0)
  })).min(1).max(20),
  calculationOptions: z.object({
    includeConfidenceInterval: z.boolean().default(true),
    includeForceInteractions: z.boolean().default(true),
    weightingStrategy: z.enum(['equal', 'confidence', 'quality', 'custom']).default('confidence'),
    outputFormat: z.enum(['summary', 'detailed', 'raw']).default('summary'),
    organizationContext: z.object({
      organizationId: z.string().uuid().optional(),
      industry: z.string().optional(),
      size: z.string().optional()
    }).optional()
  }).optional().default({})
})

/**
 * POST /api/jtbd/calculate
 * Calculate JTBD scores for specific survey responses with advanced analytics
 */
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = CalculationRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'Invalid request data',
          details: validationResult.error.issues
        }, { status: 400 })
      )
    }

    const { responses, calculationOptions } = validationResult.data

    // Verify access to all responses
    const responseIds = responses.map(r => r.responseId)
    const { data: dbResponses, error: accessError } = await supabase
      .from('survey_responses')
      .select(`
        id,
        survey_id,
        respondent_id,
        surveys!inner (
          id,
          organization_id,
          title
        )
      `)
      .in('id', responseIds)

    if (accessError) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Failed to verify response access',
          details: accessError.message 
        }, { status: 500 })
      )
    }

    // Check organization access for all responses
    const accessibleResponseIds = new Set(
      dbResponses?.filter(response => {
        const survey = response.surveys
        if (survey && typeof survey === 'object' && 'organization_id' in survey) {
          return canAccessOrganization(userRole, userOrgId, survey.organization_id as string)
        }
        return false
      }).map(r => r.id) || []
    )

    const inaccessibleResponses = responseIds.filter(id => !accessibleResponseIds.has(id))
    if (inaccessibleResponses.length > 0) {
      return addAPISecurityHeaders(
        NextResponse.json({ 
          error: 'Access denied to some responses',
          inaccessibleResponses,
          userRole,
          userOrgId
        }, { status: 403 })
      )
    }

    // Check if API keys are available before processing
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    
    if (!hasOpenAI && !hasAnthropic) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'LLM analysis unavailable',
          message: 'No LLM API keys configured',
          code: 'NO_API_KEYS'
        }, { status: 503 })
      )
    }

    // Process responses through LLM service
    const analysisStartTime = Date.now()
    const analysisResults = []
    const processingErrors = []

    for (const responseData of responses) {
      try {
        // Get additional context from database
        const dbResponse = dbResponses?.find(r => r.id === responseData.responseId)
        const surveys = Array.isArray(dbResponse?.surveys) ? dbResponse?.surveys[0] : dbResponse?.surveys
        const context = {
          questionContext: responseData.questionContext || 'AI readiness assessment',
          organizationName: surveys?.title || 'Survey',
          responseId: responseData.responseId,
          surveyId: dbResponse?.survey_id
        }

        // Perform LLM analysis
        const analysis = await llmService.analyzeSurveyResponse(
          responseData.responseText,
          responseData.questionText,
          responseData.expectedForce,
          context
        )

        analysisResults.push({
          responseId: responseData.responseId,
          expectedForce: responseData.expectedForce,
          weight: responseData.weight,
          analysis,
          processingTime: Date.now() - analysisStartTime
        })

      } catch (error) {
        console.error(`Analysis error for response ${responseData.responseId}:`, error)
        processingErrors.push({
          responseId: responseData.responseId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    if (analysisResults.length === 0) {
      return addAPISecurityHeaders(
        NextResponse.json({
          error: 'No responses could be analyzed',
          processingErrors,
          timestamp: new Date().toISOString()
        }, { status: 422 })
      )
    }

    // Calculate JTBD scores based on analysis results
    const jtbdCalculation = calculateJTBDScores(analysisResults, calculationOptions)

    // Store calculation results if successful
    try {
      const calculationRecord = {
        user_id: user.id,
        organization_id: calculationOptions.organizationContext?.organizationId || userOrgId,
        response_ids: responseIds,
        calculation_method: calculationOptions.weightingStrategy,
        results: jtbdCalculation,
        processing_metadata: {
          totalResponses: responses.length,
          successfulAnalyses: analysisResults.length,
          errors: processingErrors,
          processingTimeMs: Date.now() - analysisStartTime,
          llmProvider: llmService.getConfig().provider,
          llmModel: llmService.getConfig().model
        },
        created_at: new Date().toISOString()
      }

      const { error: storeError } = await supabase
        .from('jtbd_calculations')
        .insert(calculationRecord)

      if (storeError) {
        console.warn('Failed to store calculation results:', storeError)
        // Continue execution - calculation was successful even if storage failed
      }

    } catch (storeError) {
      console.warn('Calculation storage error:', storeError)
    }

    // Format response based on output format preference
    const responseData = formatCalculationResponse(
      jtbdCalculation,
      calculationOptions.outputFormat || 'summary',
      {
        totalProcessed: analysisResults.length,
        errors: processingErrors,
        processingTimeMs: Date.now() - analysisStartTime
      }
    )

    return addAPISecurityHeaders(
      NextResponse.json({
        success: true,
        calculation: responseData,
        metadata: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          processingStats: {
            totalRequested: responses.length,
            successfullyAnalyzed: analysisResults.length,
            errors: processingErrors.length,
            processingTimeMs: Date.now() - analysisStartTime
          },
          options: calculationOptions
        }
      })
    )

  } catch (error) {
    console.error('JTBD Calculation API Error:', error)
    
    return addAPISecurityHeaders(
      NextResponse.json({
        error: 'Calculation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'CALCULATION_FAILED',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    )
  }
}

/**
 * Calculate JTBD scores from analysis results with advanced weighting
 */
function calculateJTBDScores(
  analysisResults: any[],
  options: any
): {
  overallReadinessScore: number;
  forceScores: Record<JTBDForceType, any>;
  forceInteractions: any;
  confidenceMetrics: any;
  recommendations: string[];
} {
  const forceScores: Record<JTBDForceType, any> = {
    pain_of_old: { score: 0, count: 0, confidence: 0, themes: [] },
    pull_of_new: { score: 0, count: 0, confidence: 0, themes: [] },
    anchors_to_old: { score: 0, count: 0, confidence: 0, themes: [] },
    anxiety_of_new: { score: 0, count: 0, confidence: 0, themes: [] },
    demographic: { score: 0, count: 0, confidence: 0, themes: [] }
  }

  let totalWeight = 0
  const allThemes = new Set()

  // Process each analysis result
  for (const result of analysisResults) {
    const { analysis, weight, expectedForce } = result
    const actualForce = analysis.primaryJtbdForce as JTBDForceType
    
    // Calculate weighted score based on strategy
    let effectiveWeight = weight
    if (options.weightingStrategy === 'confidence') {
      effectiveWeight = weight * (analysis.confidenceScore / 5)
    } else if (options.weightingStrategy === 'quality') {
      const qualityMultiplier = getQualityMultiplier(analysis.qualityIndicators.responseQuality)
      effectiveWeight = weight * qualityMultiplier
    }

    // Update force scores
    forceScores[actualForce].score += analysis.forceStrengthScore * effectiveWeight
    forceScores[actualForce].confidence += analysis.confidenceScore * effectiveWeight
    forceScores[actualForce].count += 1
    
    // Collect themes
    analysis.keyThemes.forEach((theme: string) => {
      forceScores[actualForce].themes.push(theme)
      allThemes.add(theme)
    })

    totalWeight += effectiveWeight
  }

  // Normalize scores
  for (const force of Object.keys(forceScores) as JTBDForceType[]) {
    if (forceScores[force].count > 0) {
      forceScores[force].averageScore = forceScores[force].score / forceScores[force].count
      forceScores[force].averageConfidence = forceScores[force].confidence / forceScores[force].count
      forceScores[force].normalizedScore = forceScores[force].score / totalWeight * 100
      forceScores[force].uniqueThemes = [...new Set(forceScores[force].themes)]
    } else {
      forceScores[force].averageScore = 0
      forceScores[force].averageConfidence = 0
      forceScores[force].normalizedScore = 0
      forceScores[force].uniqueThemes = []
    }
  }

  // Calculate overall readiness score using JTBD framework
  // High pain + high pull - high anchors - high anxiety = high readiness
  const readinessScore = Math.max(0, Math.min(100,
    (forceScores.pain_of_old.normalizedScore * 0.3) +
    (forceScores.pull_of_new.normalizedScore * 0.4) -
    (forceScores.anchors_to_old.normalizedScore * 0.2) -
    (forceScores.anxiety_of_new.normalizedScore * 0.1) +
    50 // Base score
  ))

  // Calculate force interactions if requested
  let forceInteractions = {}
  if (options.includeForceInteractions) {
    forceInteractions = calculateForceInteractions(forceScores)
  }

  // Calculate confidence metrics
  const confidenceMetrics = calculateConfidenceMetrics(analysisResults, options)

  // Generate recommendations
  const recommendations = generateRecommendations(forceScores, readinessScore)

  return {
    overallReadinessScore: Math.round(readinessScore),
    forceScores,
    forceInteractions,
    confidenceMetrics,
    recommendations
  }
}

/**
 * Get quality multiplier for weighting calculations
 */
function getQualityMultiplier(quality: string): number {
  switch (quality) {
    case 'excellent': return 1.2
    case 'good': return 1.0
    case 'fair': return 0.8
    case 'poor': return 0.6
    default: return 1.0
  }
}

/**
 * Calculate interactions between JTBD forces
 */
function calculateForceInteractions(forceScores: Record<JTBDForceType, any>): any {
  return {
    painPullAlignment: calculateAlignment(
      forceScores.pain_of_old.normalizedScore,
      forceScores.pull_of_new.normalizedScore
    ),
    barrierResistance: calculateResistance(
      forceScores.anchors_to_old.normalizedScore,
      forceScores.anxiety_of_new.normalizedScore
    ),
    changeReadiness: calculateChangeReadiness(forceScores),
    criticalFactors: identifyCriticalFactors(forceScores)
  }
}

/**
 * Calculate confidence metrics for the analysis
 */
function calculateConfidenceMetrics(analysisResults: any[], options: any): any {
  const confidenceScores = analysisResults.map(r => r.analysis.confidenceScore)
  const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length

  return {
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    confidenceRange: {
      min: Math.min(...confidenceScores),
      max: Math.max(...confidenceScores)
    },
    consistencyScore: calculateConsistency(confidenceScores),
    sampleSize: analysisResults.length,
    recommendedActions: avgConfidence < 3.5 ? ['Collect more data', 'Refine questions'] : []
  }
}

/**
 * Generate recommendations based on JTBD force analysis
 */
function generateRecommendations(forceScores: Record<JTBDForceType, any>, readinessScore: number): string[] {
  const recommendations = []

  if (readinessScore >= 75) {
    recommendations.push('High readiness detected - proceed with AI implementation')
    recommendations.push('Focus on quick wins to build momentum')
  } else if (readinessScore >= 50) {
    recommendations.push('Moderate readiness - start with pilot projects')
    recommendations.push('Invest in change management and training')
  } else {
    recommendations.push('Low readiness - focus on foundational work')
    recommendations.push('Address barriers before technology implementation')
  }

  // Force-specific recommendations
  if (forceScores.pain_of_old.normalizedScore < 30) {
    recommendations.push('Clarify and quantify current pain points')
  }

  if (forceScores.pull_of_new.normalizedScore < 30) {
    recommendations.push('Develop clearer AI value proposition')
  }

  if (forceScores.anchors_to_old.normalizedScore > 50) {
    recommendations.push('Address organizational resistance and barriers')
  }

  if (forceScores.anxiety_of_new.normalizedScore > 50) {
    recommendations.push('Invest in AI education and anxiety reduction')
  }

  return recommendations
}

/**
 * Helper functions for force interaction calculations
 */
function calculateAlignment(painScore: number, pullScore: number): number {
  return Math.round((painScore + pullScore) / 2)
}

function calculateResistance(anchorScore: number, anxietyScore: number): number {
  return Math.round((anchorScore + anxietyScore) / 2)
}

function calculateChangeReadiness(forceScores: Record<JTBDForceType, any>): number {
  const drivers = forceScores.pain_of_old.normalizedScore + forceScores.pull_of_new.normalizedScore
  const barriers = forceScores.anchors_to_old.normalizedScore + forceScores.anxiety_of_new.normalizedScore
  return Math.round(Math.max(0, drivers - barriers))
}

function identifyCriticalFactors(forceScores: Record<JTBDForceType, any>): string[] {
  const factors = []
  const threshold = 60

  if (forceScores.pain_of_old.normalizedScore > threshold) factors.push('High current pain')
  if (forceScores.pull_of_new.normalizedScore > threshold) factors.push('Strong AI attraction')
  if (forceScores.anchors_to_old.normalizedScore > threshold) factors.push('Significant barriers')
  if (forceScores.anxiety_of_new.normalizedScore > threshold) factors.push('High change anxiety')

  return factors
}

function calculateConsistency(scores: number[]): number {
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
  const standardDeviation = Math.sqrt(variance)
  return Math.round((1 - (standardDeviation / 5)) * 100) / 100 // Normalize to 0-1
}

/**
 * Format calculation response based on output format preference
 */
function formatCalculationResponse(calculation: any, format: string, metadata: any): any {
  switch (format) {
    case 'raw':
      return { ...calculation, processingMetadata: metadata }
    
    case 'detailed':
      return {
        summary: {
          overallReadinessScore: calculation.overallReadinessScore,
          readinessLevel: getReadinessLevel(calculation.overallReadinessScore),
          keyInsights: calculation.recommendations.slice(0, 3)
        },
        forceAnalysis: calculation.forceScores,
        interactions: calculation.forceInteractions,
        confidence: calculation.confidenceMetrics,
        recommendations: calculation.recommendations,
        metadata
      }
    
    case 'summary':
    default:
      return {
        overallReadinessScore: calculation.overallReadinessScore,
        readinessLevel: getReadinessLevel(calculation.overallReadinessScore),
        topForces: getTopForces(calculation.forceScores),
        keyRecommendations: calculation.recommendations.slice(0, 4),
        confidenceLevel: calculation.confidenceMetrics.averageConfidence,
        sampleSize: metadata.totalProcessed
      }
  }
}

function getReadinessLevel(score: number): string {
  if (score >= 80) return 'Ready to Scale'
  if (score >= 70) return 'Ready to Implement'
  if (score >= 60) return 'Ready with Preparation'
  if (score >= 40) return 'Needs Significant Preparation'
  return 'Not Ready - Build Foundation First'
}

function getTopForces(forceScores: Record<JTBDForceType, any>): Array<{force: string, score: number}> {
  return Object.entries(forceScores)
    .map(([force, data]) => ({ force, score: data.normalizedScore }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}