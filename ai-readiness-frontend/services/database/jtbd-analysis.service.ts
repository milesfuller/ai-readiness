/**
 * JTBD Analysis Database Service
 * 
 * This service provides all database operations for JTBD (Jobs-to-be-Done) analysis
 * using the contracts as the single source of truth for data validation.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  JTBDForceType,
  JTBDAnalysisResult,
  ExtendedJTBDAnalysisResult,
  SentimentLabel,
  ImpactLevel,
  ResponseQuality
} from '@/lib/types/llm';
import { z } from 'zod';

// JTBD Force Score Schema for validation
const JTBDForceScoreSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  response_id: z.string().uuid(),
  force_type: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
  force_score: z.number().min(1).max(5),
  confidence_score: z.number().min(1).max(5),
  reasoning: z.string(),
  key_themes: z.array(z.string()).default([]),
  sentiment_score: z.number().min(-1).max(1),
  sentiment_label: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
  impact_level: z.enum(['low', 'medium', 'high', 'critical']),
  response_quality: z.enum(['poor', 'fair', 'good', 'excellent']),
  metadata: z.object({
    processing_notes: z.string().optional(),
    follow_up_questions: z.array(z.string()).default([]),
    related_themes: z.array(z.string()).default([]),
    analysis_version: z.string().default('1.0')
  }),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

// Response Analysis Schema
const ResponseAnalysisSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  response_id: z.string().uuid(),
  question_id: z.string().uuid(),
  user_response: z.string(),
  primary_force: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
  secondary_forces: z.array(z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'])).default([]),
  analysis_data: z.object({
    sentiment_analysis: z.object({
      overall_score: z.number().min(-1).max(1),
      sentiment_label: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']),
      emotional_indicators: z.array(z.string()).default([]),
      tone: z.string()
    }),
    business_implications: z.object({
      impact_level: z.enum(['low', 'medium', 'high', 'critical']),
      affected_areas: z.array(z.string()).default([]),
      urgency: z.enum(['low', 'medium', 'high']),
      business_value: z.string()
    }),
    actionable_insights: z.object({
      summary_insight: z.string(),
      detailed_analysis: z.string(),
      immediate_actions: z.array(z.string()).default([]),
      long_term_recommendations: z.array(z.string()).default([])
    }),
    quality_indicators: z.object({
      response_quality: z.enum(['poor', 'fair', 'good', 'excellent']),
      specificity_level: z.enum(['vague', 'general', 'specific', 'very_specific']),
      actionability: z.enum(['low', 'medium', 'high']),
      business_relevance: z.enum(['low', 'medium', 'high'])
    })
  }),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

type JTBDForceScore = z.infer<typeof JTBDForceScoreSchema>;
type ResponseAnalysis = z.infer<typeof ResponseAnalysisSchema>;

export class JTBDAnalysisService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // FORCE CALCULATION METHODS
  // ============================================================================

  /**
   * Calculate force score for a specific JTBD force from survey responses
   */
  async calculateForceScore(
    responses: Array<{ responseId: string; analysisResult: ExtendedJTBDAnalysisResult }>,
    force: JTBDForceType
  ): Promise<{
    averageScore: number;
    totalResponses: number;
    confidence: number;
    strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  }> {
    try {
      if (!responses || responses.length === 0) {
        return {
          averageScore: 0,
          totalResponses: 0,
          confidence: 0,
          strength: 'weak'
        };
      }

      // Filter responses that match the primary or secondary force
      const relevantResponses = responses.filter(r => 
        r.analysisResult.primaryJtbdForce === force || 
        r.analysisResult.secondaryJtbdForces.includes(force)
      );

      if (relevantResponses.length === 0) {
        return {
          averageScore: 0,
          totalResponses: 0,
          confidence: 0,
          strength: 'weak'
        };
      }

      // Calculate weighted average (primary forces have more weight)
      let totalScore = 0;
      let totalWeight = 0;

      relevantResponses.forEach(response => {
        const result = response.analysisResult;
        const weight = result.primaryJtbdForce === force ? 2 : 1; // Primary forces weigh more
        totalScore += result.forceStrengthScore * weight;
        totalWeight += weight;
      });

      const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Calculate confidence based on sample size and score consistency
      const scores = relevantResponses.map(r => r.analysisResult.forceStrengthScore);
      const variance = this.calculateVariance(scores);
      const confidence = Math.min(5, Math.max(1, 
        (relevantResponses.length / responses.length) * 5 * (1 - variance / 25)
      ));

      // Determine strength level
      let strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
      if (averageScore >= 4.5) strength = 'very_strong';
      else if (averageScore >= 3.5) strength = 'strong';
      else if (averageScore >= 2.5) strength = 'moderate';
      else strength = 'weak';

      return {
        averageScore: Math.round(averageScore * 100) / 100,
        totalResponses: relevantResponses.length,
        confidence: Math.round(confidence * 100) / 100,
        strength
      };
    } catch (error) {
      console.error('Error calculating force score:', error);
      throw new Error(`Failed to calculate force score: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze which JTBD forces a response relates to
   */
  async analyzeResponseForces(response: {
    questionText: string;
    userResponse: string;
    analysisResult: ExtendedJTBDAnalysisResult;
  }): Promise<{
    primaryForce: JTBDForceType;
    secondaryForces: JTBDForceType[];
    forceDistribution: Record<JTBDForceType, number>;
    reasoning: string;
  }> {
    try {
      const { analysisResult } = response;
      
      // Calculate force distribution based on analysis
      const forceDistribution: Record<JTBDForceType, number> = {
        pain_of_old: 0,
        pull_of_new: 0,
        anchors_to_old: 0,
        anxiety_of_new: 0,
        demographic: 0
      };

      // Primary force gets highest weight
      forceDistribution[analysisResult.primaryJtbdForce] = analysisResult.forceStrengthScore;

      // Secondary forces get proportional weight
      const secondaryWeight = analysisResult.forceStrengthScore * 0.6;
      analysisResult.secondaryJtbdForces.forEach(force => {
        forceDistribution[force] = Math.max(forceDistribution[force], secondaryWeight);
      });

      // Analyze specific indicators for additional insights
      if (analysisResult.painAnalysis) {
        forceDistribution.pain_of_old += this.calculatePainIndicatorScore(analysisResult.painAnalysis);
      }

      if (analysisResult.opportunityAnalysis) {
        forceDistribution.pull_of_new += this.calculateOpportunityIndicatorScore(analysisResult.opportunityAnalysis);
      }

      if (analysisResult.barrierAnalysis) {
        forceDistribution.anchors_to_old += this.calculateBarrierIndicatorScore(analysisResult.barrierAnalysis);
      }

      if (analysisResult.anxietyAnalysis) {
        forceDistribution.anxiety_of_new += this.calculateAnxietyIndicatorScore(analysisResult.anxietyAnalysis);
      }

      if (analysisResult.demographicAnalysis) {
        forceDistribution.demographic += this.calculateDemographicIndicatorScore(analysisResult.demographicAnalysis);
      }

      const reasoning = `Primary force: ${analysisResult.primaryJtbdForce} (${analysisResult.forceStrengthScore}/5). ${analysisResult.reasoning}`;

      return {
        primaryForce: analysisResult.primaryJtbdForce,
        secondaryForces: analysisResult.secondaryJtbdForces,
        forceDistribution,
        reasoning
      };
    } catch (error) {
      console.error('Error analyzing response forces:', error);
      throw new Error(`Failed to analyze response forces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Aggregate force scores across multiple responses
   */
  async aggregateForceScores(
    organizationId: string,
    surveyId: string,
    responses: Array<{ responseId: string; analysisResult: ExtendedJTBDAnalysisResult }>
  ): Promise<{
    overallScores: Record<JTBDForceType, {
      score: number;
      confidence: number;
      strength: string;
      responseCount: number;
      topThemes: string[];
    }>;
    dominantForce: JTBDForceType;
    forceBalance: {
      pushForces: number; // pain_of_old + pull_of_new
      resistanceForces: number; // anchors_to_old + anxiety_of_new
      neutralForces: number; // demographic
    };
    insights: string[];
  }> {
    try {
      if (!responses || responses.length === 0) {
        throw new Error('No responses provided for aggregation');
      }

      const forces: JTBDForceType[] = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
      const overallScores: Record<JTBDForceType, any> = {
        demographic: null,
        pain_of_old: null,
        pull_of_new: null,
        anchors_to_old: null,
        anxiety_of_new: null
      };

      // Calculate scores for each force
      for (const force of forces) {
        const forceResult = await this.calculateForceScore(responses, force);
        const themes = this.extractTopThemesForForce(responses, force);
        
        overallScores[force] = {
          score: forceResult.averageScore,
          confidence: forceResult.confidence,
          strength: forceResult.strength,
          responseCount: forceResult.totalResponses,
          topThemes: themes.slice(0, 5) // Top 5 themes
        };
      }

      // Find dominant force
      const dominantForce = forces.reduce((prev, current) => 
        overallScores[current].score > overallScores[prev].score ? current : prev
      );

      // Calculate force balance
      const forceBalance = {
        pushForces: (overallScores.pain_of_old.score + overallScores.pull_of_new.score) / 2,
        resistanceForces: (overallScores.anchors_to_old.score + overallScores.anxiety_of_new.score) / 2,
        neutralForces: overallScores.demographic.score
      };

      // Generate insights
      const insights = this.generateAggregateInsights(overallScores, forceBalance, dominantForce);

      // Store aggregated results
      await this.storeAggregatedScores(organizationId, surveyId, overallScores, forceBalance);

      return {
        overallScores,
        dominantForce,
        forceBalance,
        insights
      };
    } catch (error) {
      console.error('Error aggregating force scores:', error);
      throw new Error(`Failed to aggregate force scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // RESPONSE ANALYSIS METHODS
  // ============================================================================

  /**
   * Store individual response analysis in database
   */
  async storeResponseAnalysis(
    organizationId: string,
    surveyId: string,
    responseId: string,
    questionId: string,
    userResponse: string,
    analysisResult: ExtendedJTBDAnalysisResult
  ): Promise<ResponseAnalysis> {
    try {
      const analysisData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        survey_id: surveyId,
        response_id: responseId,
        question_id: questionId,
        user_response: userResponse,
        primary_force: analysisResult.primaryJtbdForce,
        secondary_forces: analysisResult.secondaryJtbdForces,
        analysis_data: {
          sentiment_analysis: analysisResult.sentimentAnalysis,
          business_implications: analysisResult.businessImplications,
          actionable_insights: analysisResult.actionableInsights,
          quality_indicators: analysisResult.qualityIndicators
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const validatedData = ResponseAnalysisSchema.parse(analysisData);

      const { data, error } = await this.supabase
        .from('jtbd_response_analysis')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return ResponseAnalysisSchema.parse(data);
    } catch (error) {
      console.error('Error storing response analysis:', error);
      throw new Error(`Failed to store response analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get response analyses for a survey
   */
  async getResponseAnalyses(
    surveyId: string,
    options: {
      organizationId?: string;
      force?: JTBDForceType;
      qualityThreshold?: ResponseQuality;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: ResponseAnalysis[]; total: number; hasMore: boolean }> {
    try {
      const { organizationId, force, qualityThreshold, limit = 50, offset = 0 } = options;

      let query = this.supabase
        .from('jtbd_response_analysis')
        .select('*', { count: 'exact' })
        .eq('survey_id', surveyId);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (force) {
        query = query.or(`primary_force.eq.${force},secondary_forces.cs.{${force}}`);
      }

      if (qualityThreshold) {
        const qualityOrder = { poor: 0, fair: 1, good: 2, excellent: 3 };
        const minQuality = qualityOrder[qualityThreshold];
        // This would need a proper implementation based on your database structure
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const analyses = data.map(analysis => ResponseAnalysisSchema.parse(analysis));
      const total = count || 0;
      const hasMore = offset + limit < total;

      return { data: analyses, total, hasMore };
    } catch (error) {
      console.error('Error fetching response analyses:', error);
      throw new Error(`Failed to fetch response analyses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate variance for confidence scoring
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Calculate pain indicator score from pain analysis
   */
  private calculatePainIndicatorScore(painAnalysis: any): number {
    let score = 0;
    if (painAnalysis.frequency === 'daily') score += 1;
    if (painAnalysis.urgencyIndicators?.timeSensitivity === 'critical') score += 1;
    if (painAnalysis.businessImpact === 'revenue') score += 0.5;
    return Math.min(2, score);
  }

  /**
   * Calculate opportunity indicator score from opportunity analysis
   */
  private calculateOpportunityIndicatorScore(opportunityAnalysis: any): number {
    let score = 0;
    if (opportunityAnalysis.valuePotential === 'transformational') score += 1;
    if (opportunityAnalysis.feasibility === 'high') score += 0.5;
    if (opportunityAnalysis.innovationReadiness === 'pioneering') score += 0.5;
    return Math.min(2, score);
  }

  /**
   * Calculate barrier indicator score from barrier analysis
   */
  private calculateBarrierIndicatorScore(barrierAnalysis: any): number {
    let score = 0;
    if (barrierAnalysis.changeMagnitude === 'transformational') score += 1;
    if (barrierAnalysis.timelineToOvercome === 'years') score += 0.5;
    if (barrierAnalysis.changeManagement?.stakeholderAlignment === 'low') score += 0.5;
    return Math.min(2, score);
  }

  /**
   * Calculate anxiety indicator score from anxiety analysis
   */
  private calculateAnxietyIndicatorScore(anxietyAnalysis: any): number {
    let score = 0;
    if (anxietyAnalysis.severity === 'severe') score += 1;
    if (anxietyAnalysis.mitigationPotential === 'very_difficult') score += 0.5;
    if (anxietyAnalysis.concernType === 'job_security') score += 0.5;
    return Math.min(2, score);
  }

  /**
   * Calculate demographic indicator score from demographic analysis
   */
  private calculateDemographicIndicatorScore(demographicAnalysis: any): number {
    let score = 1; // Base demographic score
    if (demographicAnalysis.extractedData?.experienceLevel === 'expert') score += 0.5;
    if (demographicAnalysis.extractedData?.comfortLevel === 'enthusiastic') score += 0.5;
    return Math.min(2, score);
  }

  /**
   * Extract top themes for a specific force
   */
  private extractTopThemesForForce(
    responses: Array<{ responseId: string; analysisResult: ExtendedJTBDAnalysisResult }>,
    force: JTBDForceType
  ): string[] {
    const themes: string[] = [];
    
    responses.forEach(response => {
      const result = response.analysisResult;
      if (result.primaryJtbdForce === force || result.secondaryJtbdForces.includes(force)) {
        themes.push(...result.keyThemes);
        
        // Add themes from specific analyses
        if (result.analysisMetadata?.relatedThemes) {
          themes.push(...result.analysisMetadata.relatedThemes);
        }
      }
    });

    // Count theme frequency and return top themes
    const themeCount = new Map<string, number>();
    themes.forEach(theme => {
      themeCount.set(theme, (themeCount.get(theme) || 0) + 1);
    });

    return Array.from(themeCount.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([theme]) => theme);
  }

  /**
   * Generate insights from aggregated data
   */
  private generateAggregateInsights(
    overallScores: Record<JTBDForceType, any>,
    forceBalance: any,
    dominantForce: JTBDForceType
  ): string[] {
    const insights: string[] = [];

    // Dominant force insight
    insights.push(`The dominant JTBD force is ${dominantForce.replace('_', ' ')} with a score of ${overallScores[dominantForce].score}/5`);

    // Force balance insight
    const pushVsResistance = forceBalance.pushForces - forceBalance.resistanceForces;
    if (pushVsResistance > 1) {
      insights.push('Strong push forces indicate high motivation for change');
    } else if (pushVsResistance < -1) {
      insights.push('Strong resistance forces may hinder adoption');
    } else {
      insights.push('Push and resistance forces are balanced - careful change management needed');
    }

    // Quality insight
    const avgConfidence = Object.values(overallScores).reduce((sum: number, score: any) => sum + score.confidence, 0) / 5;
    if (avgConfidence >= 4) {
      insights.push('High confidence in analysis results based on response quality');
    } else if (avgConfidence < 3) {
      insights.push('Lower confidence suggests need for additional data collection');
    }

    return insights;
  }

  /**
   * Store aggregated scores in database
   */
  private async storeAggregatedScores(
    organizationId: string,
    surveyId: string,
    overallScores: Record<JTBDForceType, any>,
    forceBalance: any
  ): Promise<void> {
    try {
      const aggregateData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        survey_id: surveyId,
        overall_scores: overallScores,
        force_balance: forceBalance,
        calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.supabase
        .from('jtbd_aggregate_scores')
        .upsert(aggregateData, { 
          onConflict: 'survey_id',
          ignoreDuplicates: false 
        });
    } catch (error) {
      console.error('Error storing aggregated scores:', error);
      // Don't throw here to avoid breaking the main operation
    }
  }
}

// Export singleton instance for use in API routes
export const createJTBDAnalysisService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
): JTBDAnalysisService => {
  return new JTBDAnalysisService(supabaseUrl, supabaseKey);
};