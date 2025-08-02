// LLM Analysis Types for JTBD Framework Integration

export type JTBDForceType = 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new' | 'demographic';

export type SentimentLabel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export type ResponseQuality = 'poor' | 'fair' | 'good' | 'excellent';

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
}

export interface APIUsageLog {
  id?: string;
  serviceType: string;
  provider: LLMProvider;
  modelName: string;
  tokensUsed: number;
  costEstimateCents: number;
  processingTimeMs: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  timestamp: string;
  organizationId?: string;
  surveyId?: string;
  responseId?: string;
}

export interface SentimentAnalysis {
  overallScore: number; // -1.0 to 1.0
  sentimentLabel: SentimentLabel;
  emotionalIndicators: string[];
  tone: string;
}

export interface BusinessImplications {
  impactLevel: ImpactLevel;
  affectedAreas: string[];
  urgency: 'low' | 'medium' | 'high';
  businessValue: string;
}

export interface ActionableInsights {
  summaryInsight: string;
  detailedAnalysis: string;
  immediateActions: string[];
  longTermRecommendations: string[];
}

export interface QualityIndicators {
  responseQuality: ResponseQuality;
  specificityLevel: 'vague' | 'general' | 'specific' | 'very_specific';
  actionability: 'low' | 'medium' | 'high';
  businessRelevance: 'low' | 'medium' | 'high';
}

export interface AnalysisMetadata {
  processingNotes: string;
  followUpQuestions: string[];
  relatedThemes: string[];
}

export interface ThemeCategories {
  process: string[];
  technology: string[];
  people: string[];
  organizational: string[];
}

// Enhanced JTBD Analysis Response Structure
export interface JTBDAnalysisResult {
  primaryJtbdForce: JTBDForceType;
  secondaryJtbdForces: JTBDForceType[];
  forceStrengthScore: number; // 1-5
  confidenceScore: number; // 1-5
  reasoning: string;
  
  keyThemes: string[];
  themeCategories: ThemeCategories;
  
  sentimentAnalysis: SentimentAnalysis;
  businessImplications: BusinessImplications;
  actionableInsights: ActionableInsights;
  qualityIndicators: QualityIndicators;
  analysisMetadata: AnalysisMetadata;
}

// Demographic Analysis for QA-QB questions
export interface DemographicAnalysis {
  extractedData: {
    aiToolsMentioned: string[];
    usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely' | 'never';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    usageContext: string[];
    comfortLevel: 'uncomfortable' | 'cautious' | 'comfortable' | 'enthusiastic';
  };
  keyThemes: string[];
  businessImplications: {
    impactLevel: ImpactLevel;
    readinessIndicators: string[];
  };
  actionableInsights: {
    summaryInsight: string;
    trainingNeeds: string[];
    leverageOpportunities: string[];
  };
}

// Pain Analysis for Q1-Q2 questions
export interface PainAnalysis {
  painType: 'process' | 'technology' | 'people' | 'organizational';
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  businessImpact: 'revenue' | 'productivity' | 'quality' | 'morale' | 'compliance';
  rootCause: string;
  automationPotential: 'low' | 'medium' | 'high';
  urgencyIndicators: {
    timeSensitivity: 'low' | 'medium' | 'high' | 'critical';
    costImplications: 'minimal' | 'moderate' | 'significant' | 'severe';
    scalingIssues: string;
  };
}

// Opportunity Analysis for Q3-Q5 questions
export interface OpportunityAnalysis {
  useCaseSpecificity: 'vague' | 'general' | 'specific' | 'very_specific';
  feasibility: 'low' | 'medium' | 'high';
  valuePotential: 'low' | 'medium' | 'high' | 'transformational';
  innovationReadiness: 'conservative' | 'cautious' | 'open' | 'pioneering';
  businessAlignment: string;
  implementationConsiderations: {
    technicalComplexity: 'low' | 'medium' | 'high' | 'very_high';
    resourceRequirements: 'minimal' | 'moderate' | 'significant' | 'extensive';
    timelineRealistic: 'short_term' | 'medium_term' | 'long_term' | 'unclear';
  };
}

// Barrier Analysis for Q6-Q8 questions
export interface BarrierAnalysis {
  barrierType: 'cultural' | 'process' | 'technical' | 'financial' | 'regulatory';
  decisionMakers: string[];
  changeMagnitude: 'minimal' | 'moderate' | 'significant' | 'transformational';
  bypassPotential: string;
  timelineToOvercome: 'weeks' | 'months' | 'quarters' | 'years';
  changeManagement: {
    stakeholderAlignment: 'low' | 'medium' | 'high';
    communicationNeeds: 'minimal' | 'moderate' | 'extensive';
    trainingRequirements: 'basic' | 'intermediate' | 'advanced' | 'comprehensive';
  };
}

// Anxiety Analysis for Q9-Q10 questions
export interface AnxietyAnalysis {
  concernType: 'job_security' | 'privacy' | 'competency' | 'control' | 'ethics' | 'reliability';
  foundation: 'rational' | 'emotional' | 'experiential' | 'cultural';
  severity: 'mild' | 'moderate' | 'significant' | 'severe';
  mitigationPotential: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  pastExperiences: string;
  riskAssessment: {
    perceivedRisks: string[];
    actualRiskLevel: 'low' | 'medium' | 'high';
    riskMitigation: string[];
  };
}

// Extended Analysis Results that include specialized analysis
export interface ExtendedJTBDAnalysisResult extends JTBDAnalysisResult {
  painAnalysis?: PainAnalysis;
  opportunityAnalysis?: OpportunityAnalysis;
  barrierAnalysis?: BarrierAnalysis;
  anxietyAnalysis?: AnxietyAnalysis;
  demographicAnalysis?: DemographicAnalysis;
}

// Batch Processing Types
export interface BatchAnalysisRequest {
  responses: {
    responseId: string;
    questionText: string;
    expectedForce: JTBDForceType;
    questionContext: string;
    userResponse: string;
    employeeRole?: string;
    employeeDepartment?: string;
    organizationName?: string;
  }[];
  options?: {
    parallel: boolean;
    priority: 'low' | 'medium' | 'high';
    retryFailures: boolean;
  };
}

export interface BatchAnalysisResult {
  results: (ExtendedJTBDAnalysisResult & { responseId: string })[];
  summary: {
    totalProcessed: number;
    successful: number;
    failed: number;
    totalCostCents: number;
    totalTokensUsed: number;
    processingTimeMs: number;
  };
  errors: {
    responseId: string;
    error: string;
  }[];
}

// Organizational Analysis Types
export interface OrganizationalAnalysis {
  executiveSummary: {
    overallReadinessScore: number; // 1-5
    readinessLevel: 'not_ready' | 'cautiously_ready' | 'ready' | 'very_ready';
    confidenceLevel: 'low' | 'medium' | 'high' | 'very_high';
    keyFinding: string;
    criticalInsight: string;
  };
  
  jtbdForceAnalysis: {
    painOfOld: {
      averageScore: number;
      strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
      topThemes: string[];
      businessImpact: string;
      urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    };
    pullOfNew: {
      averageScore: number;
      strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
      topThemes: string[];
      opportunityAreas: string[];
      innovationReadiness: 'low' | 'medium' | 'high' | 'very_high';
    };
    anchorsToOld: {
      averageScore: number;
      strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
      topThemes: string[];
      barrierTypes: string[];
      changeComplexity: 'low' | 'medium' | 'high' | 'very_high';
    };
    anxietyOfNew: {
      averageScore: number;
      strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
      topThemes: string[];
      concernCategories: string[];
      mitigationPriority: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  
  organizationalCharacteristics: {
    changeReadiness: 'resistant' | 'cautious' | 'open' | 'pioneering';
    aiMaturity: 'beginner' | 'developing' | 'intermediate' | 'advanced';
    culturalFactors: string[];
    leadershipAlignment: 'low' | 'medium' | 'high';
    resourceAvailability: 'limited' | 'adequate' | 'abundant';
  };
  
  segmentationInsights: {
    byRole: Record<string, string>;
    byDepartment: Record<string, string>;
    highReadinessSegments: string[];
    lowReadinessSegments: string[];
  };
  
  strategicRecommendations: {
    immediateActions: string[];
    mediumTermInitiatives: string[];
    longTermStrategy: string[];
    riskMitigation: string[];
    successMetrics: string[];
  };
}

// Cost Tracking Types
export interface CostTrackingOptions {
  trackByOrganization: boolean;
  trackBySurvey: boolean;
  trackByUser: boolean;
  alertThresholds: {
    dailyCostCents: number;
    monthlyCostCents: number;
    tokenUsage: number;
  };
}

// Error Handling Types
export interface LLMError {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: string;
  context?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-1 quality score
}