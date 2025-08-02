// LLM Service for JTBD Analysis Integration
import {
  LLMConfig,
  LLMProvider,
  JTBDAnalysisResult,
  ExtendedJTBDAnalysisResult,
  BatchAnalysisRequest,
  BatchAnalysisResult,
  OrganizationalAnalysis,
  APIUsageLog,
  ValidationResult,
  LLMError,
  CostTrackingOptions,
  JTBDForceType
} from '../types/llm';

// Default LLM configurations
const DEFAULT_CONFIGS: Record<LLMProvider, LLMConfig> = {
  openai: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 45000,
    retries: 3
  },
  anthropic: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 1200,
    timeout: 45000,
    retries: 3
  }
};

// Token cost estimates (per 1K tokens in cents)
const TOKEN_COSTS = {
  'gpt-4o': 0.3,
  'gpt-4o-mini': 0.015,
  'claude-3-5-sonnet-20241022': 0.3,
  'claude-3-haiku-20240307': 0.025
};

export class LLMService {
  private config: LLMConfig;
  private costTracking: CostTrackingOptions;
  private apiKey: string;

  constructor(
    provider: LLMProvider = 'openai',
    customConfig?: Partial<LLMConfig>,
    costTracking?: CostTrackingOptions
  ) {
    this.config = { ...DEFAULT_CONFIGS[provider], ...customConfig };
    this.costTracking = costTracking || {
      trackByOrganization: true,
      trackBySurvey: true,
      trackByUser: false,
      alertThresholds: {
        dailyCostCents: 10000, // $100/day
        monthlyCostCents: 200000, // $2000/month
        tokenUsage: 1000000 // 1M tokens
      }
    };

    // Get API key from environment
    this.apiKey = this.getAPIKey(provider);
  }

  private getAPIKey(provider: LLMProvider): string {
    const key = provider === 'openai' 
      ? process.env.OPENAI_API_KEY 
      : process.env.ANTHROPIC_API_KEY;
    
    // During build time, allow missing API keys
    if (!key && process.env.NODE_ENV === 'production') {
      console.warn(`Missing API key for ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.`);
      return 'dummy-key-for-build';
    }
    
    if (!key) {
      throw new Error(`Missing API key for ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.`);
    }
    
    return key;
  }

  /**
   * Analyze a single survey response using JTBD framework
   */
  async analyzeSurveyResponse(
    responseText: string,
    questionText: string,
    expectedForce: JTBDForceType,
    context: {
      questionContext?: string;
      employeeRole?: string;
      employeeDepartment?: string;
      organizationName?: string;
      responseId?: string;
      surveyId?: string;
    } = {}
  ): Promise<ExtendedJTBDAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Generate analysis prompt
      const prompt = this.generateAnalysisPrompt(responseText, questionText, expectedForce, context);
      
      // Call LLM API
      const response = await this.callLLMAPI(prompt);
      
      // Parse and validate response
      const analysisResult = await this.parseAndValidateResponse(response, responseText);
      
      // Track API usage
      const processingTime = Date.now() - startTime;
      await this.trackAPIUsage({
        tokensUsed: response.usage?.total_tokens || 0,
        processingTimeMs: processingTime,
        status: 'success',
        responseId: context.responseId,
        surveyId: context.surveyId
      });

      return analysisResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Track failed API usage
      await this.trackAPIUsage({
        tokensUsed: 0,
        processingTimeMs: processingTime,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseId: context.responseId,
        surveyId: context.surveyId
      });

      throw this.handleLLMError(error);
    }
  }

  /**
   * Process multiple survey responses in batch
   */
  async batchAnalyzeResponses(request: BatchAnalysisRequest): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const results: (ExtendedJTBDAnalysisResult & { responseId: string })[] = [];
    const errors: { responseId: string; error: string }[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    const processResponse = async (response: any) => {
      try {
        const result = await this.analyzeSurveyResponse(
          response.userResponse,
          response.questionText,
          response.expectedForce,
          {
            questionContext: response.questionContext,
            employeeRole: response.employeeRole,
            employeeDepartment: response.employeeDepartment,
            organizationName: response.organizationName,
            responseId: response.responseId
          }
        );
        
        results.push({ ...result, responseId: response.responseId });
      } catch (error) {
        errors.push({
          responseId: response.responseId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Process in parallel or sequential based on options
    if (request.options?.parallel !== false) {
      await Promise.allSettled(request.responses.map(processResponse));
    } else {
      for (const response of request.responses) {
        await processResponse(response);
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      results,
      summary: {
        totalProcessed: request.responses.length,
        successful: results.length,
        failed: errors.length,
        totalCostCents: totalCost,
        totalTokensUsed: totalTokens,
        processingTimeMs: processingTime
      },
      errors
    };
  }

  /**
   * Generate organizational-level analysis from multiple responses
   */
  async generateOrganizationalAnalysis(
    responses: ExtendedJTBDAnalysisResult[],
    organizationContext: {
      name: string;
      industry?: string;
      size?: string;
      surveyId: string;
    }
  ): Promise<OrganizationalAnalysis> {
    const prompt = this.generateOrganizationalPrompt(responses, organizationContext);
    
    try {
      const response = await this.callLLMAPI(prompt);
      return this.parseOrganizationalResponse(response);
    } catch (error) {
      throw this.handleLLMError(error);
    }
  }

  /**
   * Generate JTBD analysis prompt based on template
   */
  private generateAnalysisPrompt(
    responseText: string,
    questionText: string,
    expectedForce: JTBDForceType,
    context: any
  ): string {
    const wordCount = responseText.split(/\s+/).length;
    
    const systemPrompt = `You are an expert organizational psychologist and AI adoption specialist with deep expertise in the Jobs-to-be-Done (JTBD) Forces of Progress framework. Your role is to analyze employee survey responses about AI readiness and provide structured, actionable insights.

ANALYSIS FRAMEWORK:
You will classify responses according to four forces that drive or hinder organizational change, specifically in the context of AI adoption. These forces work together to create a dynamic tension that determines readiness for change.

CRITICAL REQUIREMENTS:
- Provide consistent, objective analysis suitable for organizational decision-making
- Always respond in valid JSON format with all required fields
- Base classifications on evidence in the response text
- Provide actionable insights that organizations can use
- Consider the business context and practical implications

QUALITY STANDARDS:
- High confidence scores (4-5) for clear signals
- Lower confidence scores (1-3) for ambiguous responses
- Themes should be specific and actionable
- Insights should connect to business outcomes`;

    const mainPrompt = `Analyze this AI readiness survey response using the JTBD Forces of Progress framework:

**CONTEXT:**
- Survey Question: "${questionText}"
- Expected JTBD Force: "${expectedForce}"
- Question Context: "${context.questionContext || 'General AI readiness assessment'}"
- Employee Role: "${context.employeeRole || 'Not specified'}"
- Employee Department: "${context.employeeDepartment || 'Not specified'}"
- Organization: "${context.organizationName || 'Not specified'}"
- Response Length: ${wordCount} words

**EMPLOYEE RESPONSE:**
"${responseText}"

**ANALYSIS FRAMEWORK:**

## JTBD Forces Classification:

### **Pain of the Old** (Current Problems)
Frustrations, inefficiencies, and friction with current tools/processes that create pressure for change.
- Score 1: No significant pain points mentioned
- Score 2: Minor inconveniences or occasional friction
- Score 3: Moderate pain points affecting productivity
- Score 4: Significant frustrations with clear business impact
- Score 5: Severe pain points causing major inefficiency or frustration

### **Pull of the New** (AI Attraction)
Excitement, benefits, and opportunities that AI solutions could provide, creating attraction toward adoption.
- Score 1: No interest or attraction to AI benefits
- Score 2: Minimal awareness of AI potential
- Score 3: Some interest in AI capabilities
- Score 4: Clear enthusiasm with specific use cases identified
- Score 5: Strong desire for AI adoption with detailed vision

### **Anchors to the Old** (Resistance Forces)
Organizational inertia, processes, investments, or comfort with current state that resist change.
- Score 1: No barriers to change mentioned
- Score 2: Minor procedural hurdles
- Score 3: Moderate organizational resistance or process barriers
- Score 4: Significant structural barriers to change
- Score 5: Deep entrenchment or major barriers preventing adoption

### **Anxiety of the New** (Concerns & Fears)
Worries, uncertainties, risks, or fears about adopting AI that create hesitation.
- Score 1: No concerns or anxiety about AI adoption
- Score 2: Minor questions or uncertainties
- Score 3: Moderate concerns about AI implementation
- Score 4: Significant worries about risks or changes
- Score 5: Major fears or strong resistance to AI adoption

## ANALYSIS REQUIREMENTS:

1. **Primary Force**: Identify the strongest force signal in the response
2. **Secondary Forces**: Note any other forces clearly present (limit to 2)
3. **Force Strength**: Score 1-5 based on intensity and specificity
4. **Confidence Level**: How certain are you about this classification?
5. **Key Themes**: Extract 3-5 specific, actionable themes
6. **Sentiment Analysis**: Overall emotional tone toward AI adoption
7. **Business Impact**: What this means for the organization
8. **Recommendations**: Specific actions this insight suggests

## RESPONSE FORMAT (JSON only):

{
  "primary_jtbd_force": "pain_of_old|pull_of_new|anchors_to_old|anxiety_of_new|demographic",
  "secondary_jtbd_forces": ["force1", "force2"],
  "force_strength_score": 1-5,
  "confidence_score": 1-5,
  "reasoning": "Brief explanation of classification logic and evidence",
  
  "key_themes": ["theme1", "theme2", "theme3"],
  "theme_categories": {
    "process": ["process-related themes"],
    "technology": ["technology-related themes"], 
    "people": ["people-related themes"],
    "organizational": ["organizational themes"]
  },
  
  "sentiment_analysis": {
    "overall_score": -1.0 to 1.0,
    "sentiment_label": "very_negative|negative|neutral|positive|very_positive",
    "emotional_indicators": ["specific words/phrases indicating emotion"],
    "tone": "frustrated|excited|cautious|optimistic|concerned"
  },
  
  "business_implications": {
    "impact_level": "low|medium|high|critical",
    "affected_areas": ["productivity", "innovation", "efficiency", "morale"],
    "urgency": "low|medium|high",
    "business_value": "Description of potential business impact"
  },
  
  "actionable_insights": {
    "summary_insight": "1-2 sentence executive summary",
    "detailed_analysis": "Deeper analysis of what this response reveals",
    "immediate_actions": ["Action 1", "Action 2"],
    "long_term_recommendations": ["Recommendation 1", "Recommendation 2"]
  },
  
  "quality_indicators": {
    "response_quality": "poor|fair|good|excellent",
    "specificity_level": "vague|general|specific|very_specific", 
    "actionability": "low|medium|high",
    "business_relevance": "low|medium|high"
  },
  
  "analysis_metadata": {
    "processing_notes": "Any special considerations or caveats",
    "follow_up_questions": ["Questions this response raises"],
    "related_themes": ["Themes that might appear in other responses"]
  }
}`;

    return `${systemPrompt}\n\n${mainPrompt}`;
  }

  /**
   * Generate organizational analysis prompt
   */
  private generateOrganizationalPrompt(
    responses: ExtendedJTBDAnalysisResult[],
    context: any
  ): string {
    const responseData = JSON.stringify(responses, null, 2);
    const completionRate = Math.round((responses.length / (responses.length * 1.2)) * 100); // Estimate

    return `Analyze these survey responses to generate comprehensive organizational AI readiness insights:

**ORGANIZATION CONTEXT:**
- Organization: ${context.name}
- Industry: ${context.industry || 'Not specified'}
- Size: ${context.size || 'Not specified'}
- Survey Responses: ${responses.length}
- Completion Rate: ${completionRate}%

**AGGREGATED RESPONSE DATA:**
${responseData}

**ANALYSIS REQUIREMENTS:**

Generate organizational-level insights that provide actionable intelligence for leadership decision-making about AI adoption strategy.

Provide a comprehensive JSON response with executive summary, force analysis, organizational characteristics, segmentation insights, and strategic recommendations.`;
  }

  /**
   * Call the appropriate LLM API
   */
  private async callLLMAPI(prompt: string): Promise<any> {
    const maxRetries = this.config.retries;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (this.config.provider === 'openai') {
          return await this.callOpenAI(prompt);
        } else {
          return await this.callAnthropic(prompt);
        }
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries && this.isRetryableError(error)) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<any> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
    };
  }

  /**
   * Parse and validate LLM response
   */
  private async parseAndValidateResponse(
    response: any,
    originalText: string
  ): Promise<ExtendedJTBDAnalysisResult> {
    try {
      const parsed = JSON.parse(response.content);
      
      // Validate the response structure
      const validation = this.validateResponse(parsed, originalText);
      if (!validation.isValid) {
        throw new Error(`Invalid response structure: ${validation.errors.join(', ')}`);
      }

      // Transform snake_case to camelCase for TypeScript compatibility
      return this.transformResponseFormat(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('LLM returned invalid JSON response');
      }
      throw error;
    }
  }

  /**
   * Parse organizational analysis response
   */
  private parseOrganizationalResponse(response: any): OrganizationalAnalysis {
    try {
      const parsed = JSON.parse(response.content);
      return this.transformOrganizationalFormat(parsed);
    } catch (error) {
      throw new Error('Failed to parse organizational analysis response');
    }
  }

  /**
   * Validate LLM response structure and content
   */
  private validateResponse(response: any, originalText: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    const requiredFields = [
      'primary_jtbd_force', 'force_strength_score', 'confidence_score',
      'key_themes', 'sentiment_analysis', 'actionable_insights'
    ];

    requiredFields.forEach(field => {
      if (!response[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Score validation
    if (response.force_strength_score < 1 || response.force_strength_score > 5) {
      errors.push('Force strength score must be 1-5');
    }

    if (response.confidence_score < 1 || response.confidence_score > 5) {
      errors.push('Confidence score must be 1-5');
    }

    if (response.sentiment_analysis?.overall_score < -1 || response.sentiment_analysis?.overall_score > 1) {
      errors.push('Sentiment score must be -1 to 1');
    }

    // Content validation
    if (!response.key_themes || response.key_themes.length === 0) {
      warnings.push('No themes extracted - response may be too short or unclear');
    }

    if (response.key_themes && response.key_themes.length > 8) {
      warnings.push('Too many themes extracted - may indicate unfocused response');
    }

    if (!response.actionable_insights?.summary_insight) {
      errors.push('Summary insight is required');
    }

    // Quality assessment
    const responseLength = originalText.length;
    if (responseLength < 20) {
      warnings.push('Very short response - analysis may be limited');
    }

    if (responseLength > 2000) {
      warnings.push('Very long response - may contain multiple themes');
    }

    return { 
      errors, 
      warnings, 
      isValid: errors.length === 0,
      score: Math.max(0, 1 - (errors.length * 0.2) - (warnings.length * 0.1))
    };
  }

  /**
   * Transform response from snake_case to camelCase
   */
  private transformResponseFormat(response: any): ExtendedJTBDAnalysisResult {
    return {
      primaryJtbdForce: response.primary_jtbd_force,
      secondaryJtbdForces: response.secondary_jtbd_forces || [],
      forceStrengthScore: response.force_strength_score,
      confidenceScore: response.confidence_score,
      reasoning: response.reasoning,
      keyThemes: response.key_themes,
      themeCategories: response.theme_categories || {
        process: [],
        technology: [],
        people: [],
        organizational: []
      },
      sentimentAnalysis: {
        overallScore: response.sentiment_analysis.overall_score,
        sentimentLabel: response.sentiment_analysis.sentiment_label,
        emotionalIndicators: response.sentiment_analysis.emotional_indicators || [],
        tone: response.sentiment_analysis.tone
      },
      businessImplications: {
        impactLevel: response.business_implications.impact_level,
        affectedAreas: response.business_implications.affected_areas || [],
        urgency: response.business_implications.urgency,
        businessValue: response.business_implications.business_value
      },
      actionableInsights: {
        summaryInsight: response.actionable_insights.summary_insight,
        detailedAnalysis: response.actionable_insights.detailed_analysis,
        immediateActions: response.actionable_insights.immediate_actions || [],
        longTermRecommendations: response.actionable_insights.long_term_recommendations || []
      },
      qualityIndicators: {
        responseQuality: response.quality_indicators.response_quality,
        specificityLevel: response.quality_indicators.specificity_level,
        actionability: response.quality_indicators.actionability,
        businessRelevance: response.quality_indicators.business_relevance
      },
      analysisMetadata: {
        processingNotes: response.analysis_metadata.processing_notes || '',
        followUpQuestions: response.analysis_metadata.follow_up_questions || [],
        relatedThemes: response.analysis_metadata.related_themes || []
      }
    };
  }

  /**
   * Transform organizational response format
   */
  private transformOrganizationalFormat(response: any): OrganizationalAnalysis {
    // Implementation would transform the organizational response structure
    // This is a simplified version - full implementation would handle all nested objects
    return response as OrganizationalAnalysis;
  }

  /**
   * Track API usage for cost monitoring
   */
  private async trackAPIUsage(usage: Partial<APIUsageLog>): Promise<void> {
    const logEntry: APIUsageLog = {
      serviceType: 'llm_analysis',
      provider: this.config.provider,
      modelName: this.config.model,
      tokensUsed: usage.tokensUsed || 0,
      costEstimateCents: Math.round((usage.tokensUsed || 0) * (TOKEN_COSTS[this.config.model as keyof typeof TOKEN_COSTS] || 0.3)),
      processingTimeMs: usage.processingTimeMs || 0,
      status: usage.status || 'success',
      errorMessage: usage.errorMessage,
      timestamp: new Date().toISOString(),
      organizationId: usage.organizationId,
      surveyId: usage.surveyId,
      responseId: usage.responseId
    };

    // Store in database or logging system
    // Implementation would depend on your data storage solution
    console.log('API Usage:', logEntry);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error.name === 'AbortError') return false; // Timeout
    if (error.message?.includes('401')) return false; // Auth error
    if (error.message?.includes('403')) return false; // Forbidden
    if (error.message?.includes('429')) return true; // Rate limit
    if (error.message?.includes('500')) return true; // Server error
    if (error.message?.includes('502')) return true; // Bad gateway
    if (error.message?.includes('503')) return true; // Service unavailable
    
    return false;
  }

  /**
   * Handle and format LLM errors
   */
  private handleLLMError(error: any): LLMError {
    const llmError: LLMError = {
      code: 'LLM_ERROR',
      message: error.message || 'Unknown LLM error',
      retryable: this.isRetryableError(error),
      timestamp: new Date().toISOString(),
      context: {
        provider: this.config.provider,
        model: this.config.model
      }
    };

    // Categorize specific error types
    if (error.name === 'AbortError') {
      llmError.code = 'TIMEOUT';
      llmError.message = 'Request timeout - LLM service took too long to respond';
    } else if (error.message?.includes('401')) {
      llmError.code = 'AUTH_ERROR';
      llmError.message = 'Invalid API key or authentication failed';
    } else if (error.message?.includes('429')) {
      llmError.code = 'RATE_LIMIT';
      llmError.message = 'Rate limit exceeded - too many requests';
    } else if (error.message?.includes('JSON')) {
      llmError.code = 'PARSE_ERROR';
      llmError.message = 'Failed to parse LLM response as valid JSON';
    }

    return llmError;
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Health check for LLM service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testPrompt = 'Respond with a simple JSON object: {"status": "ok", "message": "Health check successful"}';
      await this.callLLMAPI(testPrompt);
      
      const latency = Date.now() - startTime;
      return { 
        status: latency < 5000 ? 'healthy' : 'degraded', 
        latency 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance for easy use
export const llmService = new LLMService();

// Export factory function for custom configurations
export const createLLMService = (
  provider: LLMProvider,
  config?: Partial<LLMConfig>,
  costTracking?: CostTrackingOptions
) => new LLMService(provider, config, costTracking);