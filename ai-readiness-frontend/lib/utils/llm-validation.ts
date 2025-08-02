// Validation utilities for LLM analysis results and requests
import { ExtendedJTBDAnalysisResult, JTBDForceType, ValidationResult, OrganizationalAnalysis } from '@/lib/types/llm';

// Validate JTBD force type
export function validateJTBDForce(force: string): force is JTBDForceType {
  const validForces: JTBDForceType[] = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
  return validForces.includes(force as JTBDForceType);
}

// Validate analysis request parameters
export function validateAnalysisRequest(request: {
  responseText: string;
  questionText: string;
  expectedForce?: string;
  responseId?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!request.responseText?.trim()) {
    errors.push('Response text is required');
  } else if (request.responseText.trim().length < 10) {
    warnings.push('Response text is very short (< 10 characters)');
  } else if (request.responseText.trim().length > 5000) {
    warnings.push('Response text is very long (> 5000 characters) - may impact analysis quality');
  }

  if (!request.questionText?.trim()) {
    errors.push('Question text is required');
  } else if (request.questionText.trim().length < 5) {
    warnings.push('Question text is very short');
  }

  // Validate expected force if provided
  if (request.expectedForce && !validateJTBDForce(request.expectedForce)) {
    errors.push(`Invalid expected force: ${request.expectedForce}. Must be one of: pain_of_old, pull_of_new, anchors_to_old, anxiety_of_new, demographic`);
  }

  // Response ID format validation
  if (request.responseId && !/^[a-zA-Z0-9-_]{8,}$/.test(request.responseId)) {
    warnings.push('Response ID format appears invalid');
  }

  // Content quality checks
  const wordCount = request.responseText?.trim().split(/\s+/).length || 0;
  if (wordCount < 3) {
    warnings.push('Response has very few words - analysis may be limited');
  } else if (wordCount > 1000) {
    warnings.push('Response is very long - consider breaking into smaller segments');
  }

  // Language detection (basic)
  const hasNonAscii = /[^\x00-\x7F]/.test(request.responseText || '');
  if (hasNonAscii) {
    warnings.push('Response contains non-ASCII characters - ensure proper encoding');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 1 - (errors.length * 0.3) - (warnings.length * 0.1))
  };
}

// Validate LLM analysis result structure
export function validateAnalysisResult(result: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check required top-level fields
    const requiredFields = [
      'primaryJtbdForce',
      'forceStrengthScore',
      'confidenceScore',
      'reasoning',
      'keyThemes',
      'sentimentAnalysis',
      'businessImplications',
      'actionableInsights',
      'qualityIndicators',
      'analysisMetadata'
    ];

    requiredFields.forEach(field => {
      if (!(field in result)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Validate JTBD force
    if (result.primaryJtbdForce && !validateJTBDForce(result.primaryJtbdForce)) {
      errors.push(`Invalid primary JTBD force: ${result.primaryJtbdForce}`);
    }

    // Validate score ranges
    if (result.forceStrengthScore !== undefined) {
      if (typeof result.forceStrengthScore !== 'number' || result.forceStrengthScore < 1 || result.forceStrengthScore > 5) {
        errors.push('Force strength score must be a number between 1 and 5');
      }
    }

    if (result.confidenceScore !== undefined) {
      if (typeof result.confidenceScore !== 'number' || result.confidenceScore < 1 || result.confidenceScore > 5) {
        errors.push('Confidence score must be a number between 1 and 5');
      }
    }

    // Validate sentiment analysis
    if (result.sentimentAnalysis) {
      const sentiment = result.sentimentAnalysis;
      
      if (sentiment.overallScore !== undefined) {
        if (typeof sentiment.overallScore !== 'number' || sentiment.overallScore < -1 || sentiment.overallScore > 1) {
          errors.push('Sentiment overall score must be a number between -1 and 1');
        }
      }

      const validSentimentLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
      if (sentiment.sentimentLabel && !validSentimentLabels.includes(sentiment.sentimentLabel)) {
        errors.push(`Invalid sentiment label: ${sentiment.sentimentLabel}`);
      }

      if (sentiment.emotionalIndicators && !Array.isArray(sentiment.emotionalIndicators)) {
        errors.push('Emotional indicators must be an array');
      }
    } else {
      errors.push('Sentiment analysis is required');
    }

    // Validate business implications
    if (result.businessImplications) {
      const business = result.businessImplications;
      
      const validImpactLevels = ['low', 'medium', 'high', 'critical'];
      if (business.impactLevel && !validImpactLevels.includes(business.impactLevel)) {
        errors.push(`Invalid impact level: ${business.impactLevel}`);
      }

      const validUrgencyLevels = ['low', 'medium', 'high'];
      if (business.urgency && !validUrgencyLevels.includes(business.urgency)) {
        errors.push(`Invalid urgency level: ${business.urgency}`);
      }

      if (business.affectedAreas && !Array.isArray(business.affectedAreas)) {
        errors.push('Affected areas must be an array');
      }
    }

    // Validate actionable insights
    if (result.actionableInsights) {
      const insights = result.actionableInsights;
      
      if (!insights.summaryInsight || typeof insights.summaryInsight !== 'string') {
        errors.push('Summary insight is required and must be a string');
      } else if (insights.summaryInsight.length < 10) {
        warnings.push('Summary insight is very short');
      }

      if (insights.immediateActions && !Array.isArray(insights.immediateActions)) {
        errors.push('Immediate actions must be an array');
      } else if (insights.immediateActions && insights.immediateActions.length === 0) {
        warnings.push('No immediate actions provided');
      }

      if (insights.longTermRecommendations && !Array.isArray(insights.longTermRecommendations)) {
        errors.push('Long-term recommendations must be an array');
      }
    }

    // Validate quality indicators
    if (result.qualityIndicators) {
      const quality = result.qualityIndicators;
      
      const validQualityLevels = ['poor', 'fair', 'good', 'excellent'];
      if (quality.responseQuality && !validQualityLevels.includes(quality.responseQuality)) {
        errors.push(`Invalid response quality: ${quality.responseQuality}`);
      }

      const validSpecificityLevels = ['vague', 'general', 'specific', 'very_specific'];
      if (quality.specificityLevel && !validSpecificityLevels.includes(quality.specificityLevel)) {
        errors.push(`Invalid specificity level: ${quality.specificityLevel}`);
      }

      const validActionabilityLevels = ['low', 'medium', 'high'];
      if (quality.actionability && !validActionabilityLevels.includes(quality.actionability)) {
        errors.push(`Invalid actionability level: ${quality.actionability}`);
      }
    }

    // Validate key themes
    if (result.keyThemes) {
      if (!Array.isArray(result.keyThemes)) {
        errors.push('Key themes must be an array');
      } else {
        if (result.keyThemes.length === 0) {
          warnings.push('No key themes identified');
        } else if (result.keyThemes.length > 10) {
          warnings.push('Too many key themes (> 10) - may indicate unfocused analysis');
        }

        // Check for duplicate themes
        const duplicates = result.keyThemes.filter((theme: any, index: number) => 
          result.keyThemes.indexOf(theme) !== index
        );
        if (duplicates.length > 0) {
          warnings.push('Duplicate themes detected');
        }
      }
    }

    // Validate secondary forces
    if (result.secondaryJtbdForces) {
      if (!Array.isArray(result.secondaryJtbdForces)) {
        errors.push('Secondary JTBD forces must be an array');
      } else {
        result.secondaryJtbdForces.forEach((force: any, index: number) => {
          if (!validateJTBDForce(force)) {
            errors.push(`Invalid secondary JTBD force at index ${index}: ${force}`);
          }
        });

        if (result.secondaryJtbdForces.includes(result.primaryJtbdForce)) {
          warnings.push('Primary force appears in secondary forces list');
        }
      }
    }

    // Quality assessment warnings
    if (result.confidenceScore && result.confidenceScore < 3) {
      warnings.push('Low confidence score - analysis may be uncertain');
    }

    if (result.qualityIndicators?.responseQuality === 'poor') {
      warnings.push('Poor response quality detected - consider re-analysis');
    }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 1 - (errors.length * 0.2) - (warnings.length * 0.05))
  };
}

// Validate organizational analysis structure
export function validateOrganizationalAnalysis(analysis: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check required top-level fields
    if (!analysis.executiveSummary) {
      errors.push('Executive summary is required');
    } else {
      const summary = analysis.executiveSummary;
      
      if (typeof summary.overallReadinessScore !== 'number' || summary.overallReadinessScore < 1 || summary.overallReadinessScore > 5) {
        errors.push('Overall readiness score must be a number between 1 and 5');
      }

      const validReadinessLevels = ['not_ready', 'cautiously_ready', 'ready', 'very_ready'];
      if (!validReadinessLevels.includes(summary.readinessLevel)) {
        errors.push(`Invalid readiness level: ${summary.readinessLevel}`);
      }

      if (!summary.keyFinding || typeof summary.keyFinding !== 'string') {
        errors.push('Key finding is required');
      }
    }

    // Check JTBD force analysis
    if (!analysis.jtbdForceAnalysis) {
      errors.push('JTBD force analysis is required');
    } else {
      const forceAnalysis = analysis.jtbdForceAnalysis;
      const requiredForces = ['painOfOld', 'pullOfNew', 'anchorsToOld', 'anxietyOfNew'];
      
      requiredForces.forEach(force => {
        if (!forceAnalysis[force]) {
          errors.push(`Missing force analysis for: ${force}`);
        } else {
          const forceData = forceAnalysis[force];
          
          if (typeof forceData.averageScore !== 'number' || forceData.averageScore < 1 || forceData.averageScore > 5) {
            errors.push(`Invalid average score for ${force}: must be between 1 and 5`);
          }

          if (!Array.isArray(forceData.topThemes)) {
            errors.push(`Top themes for ${force} must be an array`);
          }
        }
      });
    }

    // Check organizational characteristics
    if (!analysis.organizationalCharacteristics) {
      warnings.push('Organizational characteristics not provided');
    } else {
      const chars = analysis.organizationalCharacteristics;
      
      const validChangeReadiness = ['resistant', 'cautious', 'open', 'pioneering'];
      if (chars.changeReadiness && !validChangeReadiness.includes(chars.changeReadiness)) {
        warnings.push(`Invalid change readiness: ${chars.changeReadiness}`);
      }

      const validAIMaturity = ['beginner', 'developing', 'intermediate', 'advanced'];
      if (chars.aiMaturity && !validAIMaturity.includes(chars.aiMaturity)) {
        warnings.push(`Invalid AI maturity: ${chars.aiMaturity}`);
      }
    }

    // Validate strategic recommendations
    if (analysis.strategicRecommendations) {
      const recs = analysis.strategicRecommendations;
      
      ['immediateActions', 'mediumTermInitiatives', 'longTermStrategy'].forEach(field => {
        if (recs[field] && !Array.isArray(recs[field])) {
          errors.push(`${field} must be an array`);
        } else if (recs[field] && recs[field].length === 0) {
          warnings.push(`No ${field} provided`);
        }
      });
    } else {
      warnings.push('Strategic recommendations not provided');
    }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 1 - (errors.length * 0.2) - (warnings.length * 0.1))
  };
}

// Validate batch analysis request
export function validateBatchRequest(request: {
  responses?: any[];
  surveyId?: string;
  organizationId?: string;
  options?: any;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.responses?.length && !request.surveyId) {
    errors.push('Either responses array or surveyId is required');
  }

  if (request.responses) {
    if (!Array.isArray(request.responses)) {
      errors.push('Responses must be an array');
    } else {
      if (request.responses.length === 0) {
        errors.push('Responses array cannot be empty');
      } else if (request.responses.length > 1000) {
        warnings.push('Large batch request (> 1000 responses) - consider processing in smaller chunks');
      }

      // Validate individual response items
      request.responses.forEach((response, index) => {
        if (!response.responseText || !response.questionText) {
          errors.push(`Response at index ${index} missing required fields`);
        }
        
        if (response.expectedForce && !validateJTBDForce(response.expectedForce)) {
          errors.push(`Invalid expected force at index ${index}: ${response.expectedForce}`);
        }
      });
    }
  }

  if (request.organizationId && !/^[a-zA-Z0-9-_]{8,}$/.test(request.organizationId)) {
    warnings.push('Organization ID format appears invalid');
  }

  if (request.surveyId && !/^[a-zA-Z0-9-_]{8,}$/.test(request.surveyId)) {
    warnings.push('Survey ID format appears invalid');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 1 - (errors.length * 0.3) - (warnings.length * 0.1))
  };
}

// Sanitize user input for LLM analysis
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 5000); // Limit length
}

// Validate API key format
export function validateAPIKey(key: string, provider: 'openai' | 'anthropic'): boolean {
  if (!key || typeof key !== 'string') return false;
  
  switch (provider) {
    case 'openai':
      return /^sk-[a-zA-Z0-9]{48,}$/.test(key);
    case 'anthropic':
      return /^sk-ant-[a-zA-Z0-9-_]{32,}$/.test(key);
    default:
      return false;
  }
}

// Calculate analysis quality score
export function calculateQualityScore(analysis: ExtendedJTBDAnalysisResult): number {
  let score = 0;
  const weights = {
    confidence: 0.3,
    forceStrength: 0.2,
    themeCount: 0.15,
    responseQuality: 0.2,
    businessRelevance: 0.15
  };

  // Confidence score contribution
  score += (analysis.confidenceScore / 5) * weights.confidence;

  // Force strength contribution
  score += (analysis.forceStrengthScore / 5) * weights.forceStrength;

  // Theme count contribution (optimal range: 3-7 themes)
  const themeCount = analysis.keyThemes.length;
  const themeScore = themeCount >= 3 && themeCount <= 7 ? 1 : 
                   themeCount >= 1 && themeCount <= 10 ? 0.7 : 0.3;
  score += themeScore * weights.themeCount;

  // Response quality contribution
  const qualityMap = { poor: 0.2, fair: 0.5, good: 0.8, excellent: 1.0 };
  score += (qualityMap[analysis.qualityIndicators.responseQuality] || 0.5) * weights.responseQuality;

  // Business relevance contribution
  const relevanceMap = { low: 0.3, medium: 0.7, high: 1.0 };
  score += (relevanceMap[analysis.qualityIndicators.businessRelevance] || 0.7) * weights.businessRelevance;

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}