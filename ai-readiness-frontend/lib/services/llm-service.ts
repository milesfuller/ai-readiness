// LLM Service for JTBD Analysis Integration
// Note: Types temporarily defined inline until LLM types are properly set up
import { JTBDForceType } from '@/contracts/schema'

type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'google' | 'local'

interface LLMConfig {
  provider: LLMProvider
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  retries: number
}

interface JTBDAnalysisResult {
  forces: Record<JTBDForceType, number>
  confidence: number
  reasoning: string
}

interface ExtendedJTBDAnalysisResult extends JTBDAnalysisResult {
  recommendations: string[]
  keyInsights: string[]
}

interface BatchAnalysisRequest {
  responses: any[]
  options?: any
}

interface BatchAnalysisResult {
  results: JTBDAnalysisResult[]
  summary: any
}

interface OrganizationalAnalysis {
  overallForces: Record<JTBDForceType, number>
  trends: any
}

interface APIUsageLog {
  id: string
  provider: LLMProvider
  tokens: number
  cost: number
  timestamp: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface LLMError {
  code: string
  message: string
}

interface CostTrackingOptions {
  enableTracking: boolean
  costPerToken?: number
}

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
    // Import config utilities safely
    const isServer = typeof window === 'undefined';
    const isBuild = process.env.NODE_ENV === 'production' && !process.env.VERCEL && !process.env.NEXT_PHASE;
    const isTest = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === 'true';
    
    // During build time or testing, use dummy keys to prevent build failures
    if (isBuild || isTest) {
      return 'dummy-key-for-build';
    }

    // Only access environment variables on the server side
    if (!isServer) {
      console.warn(`API keys should not be accessed on client side. Using dummy key.`);
      return 'dummy-key-for-client';
    }

    const key = provider === 'openai' 
      ? process.env.OPENAI_API_KEY 
      : process.env.ANTHROPIC_API_KEY;
    
    // Provide more helpful error messages
    if (!key) {
      const envVar = `${provider.toUpperCase()}_API_KEY`;
      console.warn(`Missing ${envVar} environment variable. LLM features will not work properly. Please set ${envVar} in your .env.local file.`);
      return 'missing-api-key';
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
   * Generate JTBD analysis prompt based on enhanced template
   */
  private generateAnalysisPrompt(
    responseText: string,
    questionText: string,
    expectedForce: JTBDForceType,
    context: any
  ): string {
    const wordCount = responseText.split(/\s+/).length;
    
    // Use enhanced system prompt from revised templates
    const systemPrompt = this.getEnhancedSystemPrompt();
    
    // Generate question-specific template
    const questionSpecificTemplate = this.getQuestionSpecificTemplate(expectedForce);
    
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

${questionSpecificTemplate}

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
   * Get enhanced system prompt from revised templates
   */
  private getEnhancedSystemPrompt(): string {
    return `You are an expert organizational psychologist and AI adoption specialist with deep expertise in the Jobs-to-be-Done (JTBD) Forces of Progress framework. Your role is to analyze employee survey responses about AI readiness and provide structured, actionable insights.

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
  }

  /**
   * Get question-specific template based on expected force
   */
  private getQuestionSpecificTemplate(expectedForce: JTBDForceType): string {
    switch (expectedForce) {
      case 'pain_of_old':
        return `**PAIN OF THE OLD ANALYSIS:**
Focus on identifying frustrations, inefficiencies, and friction points with current processes. Look for business impact and urgency indicators.

Enhanced Analysis Guidelines:
- Quantify impact when possible (time, money, frustration level)
- Identify root causes vs symptoms
- Assess urgency and priority level
- Consider organizational vs individual pain points
- Look for automation opportunities

Scoring Refinements:
- Score 5: Mentions specific time/cost impact, strong emotional language, systemic issues
- Score 4: Clear frustrations with examples, business impact implied
- Score 3: General inefficiencies mentioned, moderate concern
- Score 2: Minor issues, occasional inconvenience
- Score 1: No significant pain points, satisfaction with current state`;

      case 'pull_of_new':
        return `**PULL OF THE NEW ANALYSIS:**
Focus on AI benefits, opportunities, and positive possibilities that create attraction toward adoption.

Enhanced Analysis Guidelines:
- Distinguish between realistic and aspirational goals
- Assess specificity of AI use cases mentioned
- Identify business value drivers
- Consider feasibility of mentioned applications
- Look for innovation mindset indicators

Scoring Refinements:
- Score 5: Specific AI use cases, clear value proposition, innovation mindset
- Score 4: Strong enthusiasm with concrete examples
- Score 3: General interest in AI benefits
- Score 2: Vague awareness of AI potential
- Score 1: No interest in AI possibilities`;

      case 'anchors_to_old':
        return `**ANCHORS TO THE OLD ANALYSIS:**
Focus on organizational barriers, resistance forces, and factors that maintain status quo.

Enhanced Analysis Guidelines:
- Distinguish between process barriers and cultural resistance
- Assess whether barriers are temporary or structural
- Identify key decision makers and influencers
- Consider regulatory or compliance constraints
- Evaluate change management requirements

Scoring Refinements:
- Score 5: Deep structural barriers, cultural resistance, major change requirements
- Score 4: Significant organizational barriers with specific examples
- Score 3: Moderate resistance or bureaucratic processes
- Score 2: Minor procedural hurdles
- Score 1: Few barriers, organization ready for change`;

      case 'anxiety_of_new':
        return `**ANXIETY OF THE NEW ANALYSIS:**
Focus on concerns, fears, and uncertainties about AI adoption that create hesitation.

Enhanced Analysis Guidelines:
- Distinguish between rational concerns and emotional fears
- Assess whether concerns are founded or unfounded
- Identify specific risk categories (job security, privacy, etc.)
- Consider past experiences influencing current anxiety
- Evaluate mitigation strategies

Scoring Refinements:
- Score 5: Deep fears, job security concerns, past negative experiences
- Score 4: Significant concerns with specific examples
- Score 3: Moderate anxiety about change
- Score 2: Minor concerns, mostly manageable
- Score 1: No anxiety, confident about AI adoption`;

      case 'demographic':
        return `**DEMOGRAPHIC ANALYSIS:**
This is a demographic/usage question. Focus on extracting current AI experience and usage patterns rather than JTBD force analysis.

Enhanced Analysis for Demographics:
- Current AI tool usage (specific tools and frequency)
- Experience level indicators (beginner, intermediate, advanced)
- Usage context (work vs personal, formal vs informal)
- Technology adoption patterns
- Learning preferences and barriers`;

      default:
        return `**GENERAL ANALYSIS:**
Apply standard JTBD framework analysis with focus on identifying the primary force present in the response.`;
    }
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
    // Check if API key is valid before making requests
    if (this.apiKey === 'missing-api-key' || this.apiKey === 'dummy-key-for-client') {
      throw new Error(`Invalid API key. Please set ${this.config.provider.toUpperCase()}_API_KEY environment variable.`);
    }

    // For build-time dummy keys, return mock response
    if (this.apiKey === 'dummy-key-for-build') {
      return this.getMockResponse();
    }

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
   * Get mock response for build time or testing
   */
  private getMockResponse(): any {
    return {
      content: JSON.stringify({
        primary_jtbd_force: "pull_of_new",
        secondary_jtbd_forces: [],
        force_strength_score: 4,
        confidence_score: 3,
        reasoning: "Mock analysis for build time",
        key_themes: ["efficiency", "automation", "productivity"],
        theme_categories: {
          process: ["workflow optimization"],
          technology: ["AI tools", "automation"],
          people: ["skill development"],
          organizational: ["change management"]
        },
        sentiment_analysis: {
          overall_score: 0.6,
          sentiment_label: "positive",
          emotional_indicators: ["excited", "optimistic"],
          tone: "optimistic"
        },
        business_implications: {
          impact_level: "medium",
          affected_areas: ["productivity", "efficiency"],
          urgency: "medium",
          business_value: "Potential for process improvement"
        },
        actionable_insights: {
          summary_insight: "Mock analysis indicates positive sentiment toward change",
          detailed_analysis: "This is a mock response generated during build time",
          immediate_actions: ["Evaluate current tools", "Plan training"],
          long_term_recommendations: ["Implement AI solutions", "Monitor adoption"]
        },
        quality_indicators: {
          response_quality: "fair",
          specificity_level: "general",
          actionability: "medium",
          business_relevance: "medium"
        },
        analysis_metadata: {
          processing_notes: "Mock response for build time",
          follow_up_questions: ["What specific tools are being considered?"],
          related_themes: ["digital transformation", "process optimization"]
        }
      }),
      usage: {
        total_tokens: 150
      }
    };
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
   * Comprehensive response validation based on revised templates
   */
  private validateResponse(response: any, originalText: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation from enhanced templates
    const requiredFields = [
      'primary_jtbd_force', 'force_strength_score', 'confidence_score',
      'reasoning', 'key_themes', 'sentiment_analysis', 'business_implications',
      'actionable_insights', 'quality_indicators', 'analysis_metadata'
    ];

    requiredFields.forEach(field => {
      if (!response[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Enhanced score validation
    if (typeof response.force_strength_score !== 'number' || 
        response.force_strength_score < 1 || response.force_strength_score > 5) {
      errors.push('Force strength score must be numeric 1-5');
    }

    if (typeof response.confidence_score !== 'number' || 
        response.confidence_score < 1 || response.confidence_score > 5) {
      errors.push('Confidence score must be numeric 1-5');
    }

    // Enhanced sentiment validation
    if (response.sentiment_analysis) {
      const sentiment = response.sentiment_analysis;
      if (typeof sentiment.overall_score !== 'number' || 
          sentiment.overall_score < -1 || sentiment.overall_score > 1) {
        errors.push('Sentiment overall_score must be numeric -1 to 1');
      }

      const validSentimentLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
      if (!validSentimentLabels.includes(sentiment.sentiment_label)) {
        errors.push(`Invalid sentiment_label: ${sentiment.sentiment_label}`);
      }

      if (!Array.isArray(sentiment.emotional_indicators)) {
        errors.push('emotional_indicators must be an array');
      }

      if (!sentiment.tone || typeof sentiment.tone !== 'string') {
        errors.push('tone must be a non-empty string');
      }
    }

    // Enhanced business implications validation
    if (response.business_implications) {
      const implications = response.business_implications;
      const validImpactLevels = ['low', 'medium', 'high', 'critical'];
      const validUrgencyLevels = ['low', 'medium', 'high'];

      if (!validImpactLevels.includes(implications.impact_level)) {
        errors.push(`Invalid impact_level: ${implications.impact_level}`);
      }

      if (!validUrgencyLevels.includes(implications.urgency)) {
        errors.push(`Invalid urgency level: ${implications.urgency}`);
      }

      if (!Array.isArray(implications.affected_areas)) {
        errors.push('affected_areas must be an array');
      }

      if (!implications.business_value || typeof implications.business_value !== 'string') {
        errors.push('business_value must be a non-empty string');
      }
    }

    // Enhanced actionable insights validation
    if (response.actionable_insights) {
      const insights = response.actionable_insights;
      
      if (!insights.summary_insight || typeof insights.summary_insight !== 'string') {
        errors.push('summary_insight is required and must be a string');
      }

      if (!insights.detailed_analysis || typeof insights.detailed_analysis !== 'string') {
        errors.push('detailed_analysis is required and must be a string');
      }

      if (!Array.isArray(insights.immediate_actions)) {
        errors.push('immediate_actions must be an array');
      }

      if (!Array.isArray(insights.long_term_recommendations)) {
        errors.push('long_term_recommendations must be an array');
      }
    }

    // Enhanced quality indicators validation
    if (response.quality_indicators) {
      const quality = response.quality_indicators;
      const validQualities = ['poor', 'fair', 'good', 'excellent'];
      const validLevels = ['low', 'medium', 'high'];
      const validSpecificity = ['vague', 'general', 'specific', 'very_specific'];

      if (!validQualities.includes(quality.response_quality)) {
        errors.push(`Invalid response_quality: ${quality.response_quality}`);
      }

      if (!validSpecificity.includes(quality.specificity_level)) {
        errors.push(`Invalid specificity_level: ${quality.specificity_level}`);
      }

      if (!validLevels.includes(quality.actionability)) {
        errors.push(`Invalid actionability: ${quality.actionability}`);
      }

      if (!validLevels.includes(quality.business_relevance)) {
        errors.push(`Invalid business_relevance: ${quality.business_relevance}`);
      }
    }

    // Content quality validation
    if (!response.key_themes || !Array.isArray(response.key_themes) || response.key_themes.length === 0) {
      warnings.push('No themes extracted - response may be too short or unclear');
    } else if (response.key_themes.length > 8) {
      warnings.push('Too many themes extracted - may indicate unfocused response');
    }

    // Theme categories validation
    if (response.theme_categories) {
      const categories = ['process', 'technology', 'people', 'organizational'];
      categories.forEach(category => {
        if (!Array.isArray(response.theme_categories[category])) {
          warnings.push(`theme_categories.${category} should be an array`);
        }
      });
    }

    // Response length assessment
    const responseLength = originalText.length;
    if (responseLength < 20) {
      warnings.push('Very short response - analysis may be limited');
    } else if (responseLength > 2000) {
      warnings.push('Very long response - may contain multiple themes');
    }

    // JTBD force validation
    const validForces = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
    if (!validForces.includes(response.primary_jtbd_force)) {
      errors.push(`Invalid primary_jtbd_force: ${response.primary_jtbd_force}`);
    }

    if (response.secondary_jtbd_forces && Array.isArray(response.secondary_jtbd_forces)) {
      response.secondary_jtbd_forces.forEach((force: string) => {
        if (!validForces.includes(force)) {
          errors.push(`Invalid secondary force: ${force}`);
        }
      });
    }

    // Analysis metadata validation
    if (response.analysis_metadata) {
      const metadata = response.analysis_metadata;
      
      if (!Array.isArray(metadata.follow_up_questions)) {
        warnings.push('follow_up_questions should be an array');
      }

      if (!Array.isArray(metadata.related_themes)) {
        warnings.push('related_themes should be an array');
      }

      if (typeof metadata.processing_notes !== 'string') {
        warnings.push('processing_notes should be a string');
      }
    }

    // Calculate quality score based on enhanced criteria
    let qualityScore = 1.0;
    
    // Deduct points for errors (critical issues)
    qualityScore -= errors.length * 0.25;
    
    // Deduct points for warnings (minor issues)  
    qualityScore -= warnings.length * 0.1;
    
    // Bonus points for completeness
    if (response.theme_categories && Object.keys(response.theme_categories).length === 4) {
      qualityScore += 0.05;
    }
    
    if (response.key_themes && response.key_themes.length >= 3 && response.key_themes.length <= 5) {
      qualityScore += 0.05;
    }

    return { 
      errors, 
      warnings, 
      isValid: errors.length === 0,
      score: Math.max(0, Math.min(1, qualityScore))
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
export const llmService = new LLMService('anthropic');

// Export factory function for custom configurations
export const createLLMService = (
  provider: LLMProvider,
  config?: Partial<LLMConfig>,
  costTracking?: CostTrackingOptions
) => new LLMService(provider, config, costTracking);