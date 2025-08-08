/**
 * JTBD Mapping Database Service
 * 
 * This service provides all database operations for JTBD question-to-force mapping,
 * validation, and distribution analysis.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  JTBDForceType,
  JTBDAnalysisResult,
  ExtendedJTBDAnalysisResult
} from '@/lib/types/llm';
import { z } from 'zod';

// Question to Force Mapping Schema
const QuestionForceMappingSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  survey_template_id: z.string().uuid().nullable(),
  question_id: z.string().uuid(),
  question_text: z.string(),
  question_category: z.string(),
  expected_force: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
  confidence_level: z.number().min(1).max(5),
  mapping_rationale: z.string(),
  validation_rules: z.object({
    required_keywords: z.array(z.string()).default([]),
    expected_sentiment: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive']).nullable(),
    min_response_length: z.number().default(10),
    max_response_length: z.number().default(5000),
    domain_specific_rules: z.array(z.string()).default([])
  }),
  created_by: z.string().uuid(),
  is_active: z.boolean().default(true),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

// Force Distribution Schema  
const ForceDistributionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  question_id: z.string().uuid(),
  expected_force: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
  actual_distribution: z.object({
    pain_of_old: z.number().min(0).max(100),
    pull_of_new: z.number().min(0).max(100),
    anchors_to_old: z.number().min(0).max(100),
    anxiety_of_new: z.number().min(0).max(100),
    demographic: z.number().min(0).max(100)
  }),
  total_responses: z.number().min(0),
  accuracy_score: z.number().min(0).max(100),
  deviation_analysis: z.object({
    primary_deviations: z.array(z.object({
      actual_force: z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic']),
      percentage: z.number().min(0).max(100),
      sample_responses: z.array(z.string()).default([])
    })).default([]),
    deviation_reasons: z.array(z.string()).default([]),
    recommendations: z.array(z.string()).default([])
  }),
  calculated_at: z.date().default(() => new Date()),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

// Force Completion Validation Schema
const ForceCompletionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  validation_results: z.object({
    all_forces_covered: z.boolean(),
    missing_forces: z.array(z.enum(['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'])).default([]),
    force_coverage: z.object({
      pain_of_old: z.object({
        question_count: z.number().min(0),
        question_ids: z.array(z.string().uuid()).default([]),
        coverage_quality: z.enum(['poor', 'fair', 'good', 'excellent'])
      }),
      pull_of_new: z.object({
        question_count: z.number().min(0),
        question_ids: z.array(z.string().uuid()).default([]),
        coverage_quality: z.enum(['poor', 'fair', 'good', 'excellent'])
      }),
      anchors_to_old: z.object({
        question_count: z.number().min(0),
        question_ids: z.array(z.string().uuid()).default([]),
        coverage_quality: z.enum(['poor', 'fair', 'good', 'excellent'])
      }),
      anxiety_of_new: z.object({
        question_count: z.number().min(0),
        question_ids: z.array(z.string().uuid()).default([]),
        coverage_quality: z.enum(['poor', 'fair', 'good', 'excellent'])
      }),
      demographic: z.object({
        question_count: z.number().min(0),
        question_ids: z.array(z.string().uuid()).default([]),
        coverage_quality: z.enum(['poor', 'fair', 'good', 'excellent'])
      })
    }),
    balance_score: z.number().min(0).max(100),
    recommendations: z.array(z.string()).default([])
  }),
  validated_at: z.date().default(() => new Date()),
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

type QuestionForceMapping = z.infer<typeof QuestionForceMappingSchema>;
type ForceDistribution = z.infer<typeof ForceDistributionSchema>;
type ForceCompletion = z.infer<typeof ForceCompletionSchema>;

export class JTBDMappingService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // QUESTION-TO-FORCE MAPPING METHODS
  // ============================================================================

  /**
   * Map a question to its corresponding JTBD force
   */
  async mapQuestionToForce(question: {
    id: string;
    text: string;
    category: string;
    organizationId?: string;
    surveyTemplateId?: string;
  }): Promise<{
    expectedForce: JTBDForceType;
    confidence: number;
    rationale: string;
    validationRules: any;
  }> {
    try {
      const { text, category } = question;

      // Analyze question text and category to determine expected force
      const analysisResult = this.analyzeQuestionForForceMapping(text, category);

      // Check if we have an existing mapping for this question
      const existingMapping = await this.getQuestionMapping(question.id);
      
      if (existingMapping) {
        return {
          expectedForce: existingMapping.expected_force,
          confidence: existingMapping.confidence_level,
          rationale: existingMapping.mapping_rationale,
          validationRules: existingMapping.validation_rules
        };
      }

      // Create new mapping
      const mapping = await this.createQuestionMapping({
        organizationId: question.organizationId || null,
        surveyTemplateId: question.surveyTemplateId || null,
        questionId: question.id,
        questionText: text,
        questionCategory: category,
        expectedForce: analysisResult.expectedForce,
        confidence: analysisResult.confidence,
        rationale: analysisResult.rationale,
        validationRules: analysisResult.validationRules,
        createdBy: 'system' // This would typically be the current user ID
      });

      return {
        expectedForce: mapping.expected_force,
        confidence: mapping.confidence_level,
        rationale: mapping.mapping_rationale,
        validationRules: mapping.validation_rules
      };
    } catch (error) {
      console.error('Error mapping question to force:', error);
      throw new Error(`Failed to map question to force: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate force completion across all survey questions
   */
  async validateForceCompletion(questions: Array<{
    id: string;
    text: string;
    category: string;
  }>): Promise<{
    allForcesCovered: boolean;
    missingForces: JTBDForceType[];
    forceCoverage: Record<JTBDForceType, {
      questionCount: number;
      questionIds: string[];
      coverageQuality: 'poor' | 'fair' | 'good' | 'excellent';
    }>;
    balanceScore: number;
    recommendations: string[];
  }> {
    try {
      if (!questions || questions.length === 0) {
        return {
          allForcesCovered: false,
          missingForces: ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'],
          forceCoverage: {
            pain_of_old: { questionCount: 0, questionIds: [], coverageQuality: 'poor' },
            pull_of_new: { questionCount: 0, questionIds: [], coverageQuality: 'poor' },
            anchors_to_old: { questionCount: 0, questionIds: [], coverageQuality: 'poor' },
            anxiety_of_new: { questionCount: 0, questionIds: [], coverageQuality: 'poor' },
            demographic: { questionCount: 0, questionIds: [], coverageQuality: 'poor' }
          },
          balanceScore: 0,
          recommendations: ['Add questions to cover all JTBD forces']
        };
      }

      // Map each question to its expected force
      const questionMappings = await Promise.all(
        questions.map(async (q) => ({
          ...q,
          mapping: await this.mapQuestionToForce(q)
        }))
      );

      // Calculate force coverage
      const forces: JTBDForceType[] = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
      const forceCoverage: Record<JTBDForceType, {
        questionCount: number;
        questionIds: string[];
        coverageQuality: 'poor' | 'fair' | 'good' | 'excellent';
      }> = {} as any;

      forces.forEach(force => {
        const questionsForForce = questionMappings.filter(q => q.mapping.expectedForce === force);
        const questionCount = questionsForForce.length;
        const questionIds = questionsForForce.map(q => q.id);
        
        // Determine coverage quality based on question count and confidence
        let coverageQuality: 'poor' | 'fair' | 'good' | 'excellent';
        const avgConfidence = questionsForForce.reduce((sum, q) => sum + q.mapping.confidence, 0) / Math.max(1, questionsForForce.length);
        
        if (questionCount === 0) {
          coverageQuality = 'poor';
        } else if (questionCount === 1 && avgConfidence < 3) {
          coverageQuality = 'fair';
        } else if (questionCount >= 1 && avgConfidence >= 3) {
          coverageQuality = 'good';
        } else if (questionCount >= 2 && avgConfidence >= 4) {
          coverageQuality = 'excellent';
        } else {
          coverageQuality = 'fair';
        }

        forceCoverage[force] = {
          questionCount,
          questionIds,
          coverageQuality
        };
      });

      // Find missing forces
      const missingForces = forces.filter(force => forceCoverage[force].questionCount === 0);
      const allForcesCovered = missingForces.length === 0;

      // Calculate balance score
      const totalQuestions = questions.length;
      const expectedQuestionsPerForce = totalQuestions / 5; // 5 forces
      const variance = forces.reduce((sum, force) => {
        const diff = forceCoverage[force].questionCount - expectedQuestionsPerForce;
        return sum + (diff * diff);
      }, 0) / forces.length;
      
      const balanceScore = Math.max(0, Math.min(100, 100 - (variance * 10)));

      // Generate recommendations
      const recommendations = this.generateForceCompletionRecommendations(
        forceCoverage,
        missingForces,
        balanceScore,
        totalQuestions
      );

      return {
        allForcesCovered,
        missingForces,
        forceCoverage,
        balanceScore: Math.round(balanceScore),
        recommendations
      };
    } catch (error) {
      console.error('Error validating force completion:', error);
      throw new Error(`Failed to validate force completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate force distribution from actual survey responses
   */
  async calculateForceDistribution(
    surveyId: string,
    questionId: string,
    responses: Array<{
      responseId: string;
      analysisResult: ExtendedJTBDAnalysisResult;
    }>
  ): Promise<{
    expectedForce: JTBDForceType;
    actualDistribution: Record<JTBDForceType, number>;
    accuracyScore: number;
    deviationAnalysis: {
      primaryDeviations: Array<{
        actualForce: JTBDForceType;
        percentage: number;
        sampleResponses: string[];
      }>;
      deviationReasons: string[];
      recommendations: string[];
    };
  }> {
    try {
      if (!responses || responses.length === 0) {
        throw new Error('No responses provided for distribution calculation');
      }

      // Get expected force for this question
      const questionMapping = await this.getQuestionMapping(questionId);
      const expectedForce = questionMapping?.expected_force || 'demographic';

      // Calculate actual distribution
      const totalResponses = responses.length;
      const forceCount: Record<JTBDForceType, number> = {
        pain_of_old: 0,
        pull_of_new: 0,
        anchors_to_old: 0,
        anxiety_of_new: 0,
        demographic: 0
      };

      // Count primary forces from responses
      responses.forEach(response => {
        const primaryForce = response.analysisResult.primaryJtbdForce;
        forceCount[primaryForce]++;
      });

      // Convert to percentages
      const actualDistribution: Record<JTBDForceType, number> = {
        pain_of_old: Math.round((forceCount.pain_of_old / totalResponses) * 100),
        pull_of_new: Math.round((forceCount.pull_of_new / totalResponses) * 100),
        anchors_to_old: Math.round((forceCount.anchors_to_old / totalResponses) * 100),
        anxiety_of_new: Math.round((forceCount.anxiety_of_new / totalResponses) * 100),
        demographic: Math.round((forceCount.demographic / totalResponses) * 100)
      };

      // Calculate accuracy score (percentage of responses that matched expected force)
      const expectedMatches = forceCount[expectedForce];
      const accuracyScore = Math.round((expectedMatches / totalResponses) * 100);

      // Analyze deviations
      const deviationAnalysis = this.analyzeForceDeviations(
        expectedForce,
        actualDistribution,
        responses,
        accuracyScore
      );

      // Store distribution analysis
      await this.storeForceDistribution(
        surveyId,
        questionId,
        expectedForce,
        actualDistribution,
        totalResponses,
        accuracyScore,
        deviationAnalysis
      );

      return {
        expectedForce,
        actualDistribution,
        accuracyScore,
        deviationAnalysis
      };
    } catch (error) {
      console.error('Error calculating force distribution:', error);
      throw new Error(`Failed to calculate force distribution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate response against expected force rules
   */
  async validateResponseAgainstForce(
    questionId: string,
    userResponse: string,
    analysisResult: ExtendedJTBDAnalysisResult
  ): Promise<{
    isValid: boolean;
    validationScore: number;
    violations: string[];
    recommendations: string[];
  }> {
    try {
      const mapping = await this.getQuestionMapping(questionId);
      
      if (!mapping) {
        return {
          isValid: true,
          validationScore: 100,
          violations: [],
          recommendations: ['No validation rules defined for this question']
        };
      }

      const violations: string[] = [];
      const recommendations: string[] = [];
      let validationScore = 100;

      // Check force alignment
      const expectedForce = mapping.expected_force;
      const actualForce = analysisResult.primaryJtbdForce;
      
      if (actualForce !== expectedForce && !analysisResult.secondaryJtbdForces.includes(expectedForce)) {
        violations.push(`Response force (${actualForce}) doesn't match expected force (${expectedForce})`);
        validationScore -= 30;
        recommendations.push(`Consider revising question to better elicit ${expectedForce} responses`);
      }

      // Check validation rules
      const rules = mapping.validation_rules;

      // Response length validation
      if (userResponse.length < rules.min_response_length) {
        violations.push(`Response too short (${userResponse.length} < ${rules.min_response_length} characters)`);
        validationScore -= 20;
        recommendations.push('Encourage more detailed responses');
      }

      if (userResponse.length > rules.max_response_length) {
        violations.push(`Response too long (${userResponse.length} > ${rules.max_response_length} characters)`);
        validationScore -= 10;
        recommendations.push('Consider breaking into multiple questions');
      }

      // Required keywords validation
      if (rules.required_keywords.length > 0) {
        const foundKeywords = rules.required_keywords.filter(keyword => 
          userResponse.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (foundKeywords.length === 0) {
          violations.push(`No required keywords found: ${rules.required_keywords.join(', ')}`);
          validationScore -= 25;
          recommendations.push('Question may not be effectively prompting desired information');
        }
      }

      // Expected sentiment validation
      if (rules.expected_sentiment && rules.expected_sentiment !== analysisResult.sentimentAnalysis.sentimentLabel) {
        violations.push(`Sentiment mismatch: expected ${rules.expected_sentiment}, got ${analysisResult.sentimentAnalysis.sentimentLabel}`);
        validationScore -= 15;
      }

      const isValid = violations.length === 0;
      validationScore = Math.max(0, validationScore);

      return {
        isValid,
        validationScore,
        violations,
        recommendations
      };
    } catch (error) {
      console.error('Error validating response against force:', error);
      throw new Error(`Failed to validate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // DATABASE METHODS
  // ============================================================================

  /**
   * Create question mapping in database
   */
  private async createQuestionMapping(data: {
    organizationId: string | null;
    surveyTemplateId: string | null;
    questionId: string;
    questionText: string;
    questionCategory: string;
    expectedForce: JTBDForceType;
    confidence: number;
    rationale: string;
    validationRules: any;
    createdBy: string;
  }): Promise<QuestionForceMapping> {
    try {
      const mappingData = {
        id: crypto.randomUUID(),
        organization_id: data.organizationId,
        survey_template_id: data.surveyTemplateId,
        question_id: data.questionId,
        question_text: data.questionText,
        question_category: data.questionCategory,
        expected_force: data.expectedForce,
        confidence_level: data.confidence,
        mapping_rationale: data.rationale,
        validation_rules: data.validationRules,
        created_by: data.createdBy,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const validatedData = QuestionForceMappingSchema.parse(mappingData);

      const { data: result, error } = await this.supabase
        .from('jtbd_question_mappings')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return QuestionForceMappingSchema.parse(result);
    } catch (error) {
      console.error('Error creating question mapping:', error);
      throw new Error(`Failed to create question mapping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get question mapping from database
   */
  private async getQuestionMapping(questionId: string): Promise<QuestionForceMapping | null> {
    try {
      const { data, error } = await this.supabase
        .from('jtbd_question_mappings')
        .select('*')
        .eq('question_id', questionId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
      if (!data) return null;

      return QuestionForceMappingSchema.parse(data);
    } catch (error) {
      console.error('Error getting question mapping:', error);
      return null;
    }
  }

  /**
   * Store force distribution analysis
   */
  private async storeForceDistribution(
    surveyId: string,
    questionId: string,
    expectedForce: JTBDForceType,
    actualDistribution: Record<JTBDForceType, number>,
    totalResponses: number,
    accuracyScore: number,
    deviationAnalysis: any
  ): Promise<void> {
    try {
      const distributionData = {
        id: crypto.randomUUID(),
        organization_id: null, // This would be passed in from context
        survey_id: surveyId,
        question_id: questionId,
        expected_force: expectedForce,
        actual_distribution: actualDistribution,
        total_responses: totalResponses,
        accuracy_score: accuracyScore,
        deviation_analysis: deviationAnalysis,
        calculated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      await this.supabase
        .from('jtbd_force_distributions')
        .upsert(distributionData, { 
          onConflict: 'question_id,survey_id',
          ignoreDuplicates: false 
        });
    } catch (error) {
      console.error('Error storing force distribution:', error);
      // Don't throw to avoid breaking main operation
    }
  }

  // ============================================================================
  // HELPER METHODS  
  // ============================================================================

  /**
   * Analyze question text to determine expected JTBD force
   */
  private analyzeQuestionForForceMapping(questionText: string, category: string): {
    expectedForce: JTBDForceType;
    confidence: number;
    rationale: string;
    validationRules: any;
  } {
    const text = questionText.toLowerCase();
    const cat = category.toLowerCase();

    // Define keyword patterns for each force
    const forcePatterns = {
      pain_of_old: {
        keywords: ['frustration', 'problem', 'challenge', 'difficult', 'slow', 'inefficient', 'waste', 'error', 'manual'],
        confidence: 4
      },
      pull_of_new: {
        keywords: ['opportunity', 'improve', 'better', 'faster', 'automate', 'streamline', 'enhance', 'optimize'],
        confidence: 4
      },
      anchors_to_old: {
        keywords: ['concern', 'risk', 'change', 'budget', 'cost', 'training', 'approval', 'policy', 'process'],
        confidence: 3
      },
      anxiety_of_new: {
        keywords: ['worry', 'fear', 'uncertain', 'security', 'privacy', 'trust', 'reliable', 'job', 'replace'],
        confidence: 3
      },
      demographic: {
        keywords: ['experience', 'currently', 'tools', 'use', 'frequency', 'background', 'role', 'department'],
        confidence: 5
      }
    };

    // Score each force based on keyword matches
    let bestForce: JTBDForceType = 'demographic';
    let highestScore = 0;
    let confidence = 1;

    Object.entries(forcePatterns).forEach(([force, pattern]) => {
      const keywordMatches = pattern.keywords.filter(keyword => 
        text.includes(keyword) || cat.includes(keyword)
      ).length;
      
      const score = keywordMatches * pattern.confidence;
      
      if (score > highestScore) {
        highestScore = score;
        bestForce = force as JTBDForceType;
        confidence = Math.min(5, pattern.confidence + keywordMatches);
      }
    });

    // Generate validation rules based on expected force
    const validationRules = this.generateValidationRules(bestForce, questionText);

    const rationale = `Mapped to ${bestForce} based on keyword analysis. Score: ${highestScore}`;

    return {
      expectedForce: bestForce,
      confidence,
      rationale,
      validationRules
    };
  }

  /**
   * Generate validation rules for a force type
   */
  private generateValidationRules(force: JTBDForceType, questionText: string) {
    const baseRules = {
      required_keywords: [] as string[],
      expected_sentiment: null as 'positive' | 'negative' | 'neutral' | null,
      min_response_length: 20,
      max_response_length: 2000,
      domain_specific_rules: [] as string[]
    };

    switch (force) {
      case 'pain_of_old':
        baseRules.expected_sentiment = 'negative' as const;
        baseRules.required_keywords = ['problem', 'issue', 'challenge', 'difficult'];
        baseRules.min_response_length = 30;
        break;
        
      case 'pull_of_new':
        baseRules.expected_sentiment = 'positive' as const;
        baseRules.required_keywords = ['opportunity', 'improve', 'benefit', 'advantage'];
        break;
        
      case 'anchors_to_old':
        baseRules.expected_sentiment = 'neutral' as const;
        baseRules.required_keywords = ['concern', 'barrier', 'constraint'];
        break;
        
      case 'anxiety_of_new':
        baseRules.expected_sentiment = 'negative' as const;
        baseRules.required_keywords = ['worry', 'concern', 'risk'];
        break;
        
      case 'demographic':
        baseRules.expected_sentiment = 'neutral' as const;
        baseRules.min_response_length = 10;
        break;
    }

    return baseRules;
  }

  /**
   * Analyze deviations from expected force
   */
  private analyzeForceDeviations(
    expectedForce: JTBDForceType,
    actualDistribution: Record<JTBDForceType, number>,
    responses: Array<{ responseId: string; analysisResult: ExtendedJTBDAnalysisResult }>,
    accuracyScore: number
  ) {
    const primaryDeviations: Array<{
      actualForce: JTBDForceType;
      percentage: number;
      sampleResponses: string[];
    }> = [];

    // Find significant deviations (forces with >10% responses that aren't the expected force)
    Object.entries(actualDistribution).forEach(([force, percentage]) => {
      if (force !== expectedForce && percentage >= 10) {
        const sampleResponses = responses
          .filter(r => r.analysisResult.primaryJtbdForce === force)
          .slice(0, 3)
          .map(r => r.responseId);

        primaryDeviations.push({
          actualForce: force as JTBDForceType,
          percentage,
          sampleResponses
        });
      }
    });

    const deviationReasons: string[] = [];
    const recommendations: string[] = [];

    if (accuracyScore < 70) {
      deviationReasons.push('Question may not be effectively prompting the expected force');
      recommendations.push('Consider revising question wording to better align with intended force');
    }

    if (primaryDeviations.length > 2) {
      deviationReasons.push('Responses are distributed across multiple forces');
      recommendations.push('Question may be too broad or ambiguous');
    }

    if (actualDistribution.demographic > 50) {
      deviationReasons.push('Many responses classified as demographic rather than behavioral');
      recommendations.push('Add more context to prompt specific experiences or opinions');
    }

    return {
      primaryDeviations,
      deviationReasons,
      recommendations
    };
  }

  /**
   * Generate force completion recommendations
   */
  private generateForceCompletionRecommendations(
    forceCoverage: any,
    missingForces: JTBDForceType[],
    balanceScore: number,
    totalQuestions: number
  ): string[] {
    const recommendations: string[] = [];

    // Missing forces
    missingForces.forEach(force => {
      const forceLabel = force.replace('_', ' ');
      recommendations.push(`Add questions to cover ${forceLabel} force`);
    });

    // Poor coverage quality
    Object.entries(forceCoverage).forEach(([force, coverage]: [string, any]) => {
      if (coverage.coverageQuality === 'poor' && coverage.questionCount > 0) {
        recommendations.push(`Improve question quality for ${force.replace('_', ' ')} force`);
      }
    });

    // Balance issues
    if (balanceScore < 70) {
      recommendations.push('Rebalance questions across JTBD forces for more comprehensive analysis');
    }

    // Question count recommendations
    if (totalQuestions < 10) {
      recommendations.push('Consider adding more questions for deeper insights');
    } else if (totalQuestions > 25) {
      recommendations.push('Survey may be too long - consider prioritizing key questions');
    }

    return recommendations;
  }
}

// Export singleton instance for use in API routes
export const createJTBDMappingService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
): JTBDMappingService => {
  return new JTBDMappingService(supabaseUrl, supabaseKey);
};