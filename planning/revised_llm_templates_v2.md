# AI Readiness Assessment - Revised LLM Templates v2.0

## 🎯 Enhanced LLM Analysis System

Based on lessons learned and the enhanced database schema, these revised templates provide more robust analysis, better error handling, and integration with the new role-based system.

---

## 🔧 System Configuration

### **API Configuration (Updated)**

```javascript
// Enhanced OpenAI/Claude API configuration
const llmConfig = {
  model: "gpt-4o", // Updated to latest model
  temperature: 0.2, // Lower for more consistent results
  max_tokens: 1200, // Increased for detailed analysis
  response_format: { type: "json_object" },
  timeout: 45000, // 45 second timeout
  retries: 3 // Automatic retry on failure
};

// Cost tracking integration
const trackAPIUsage = async (usage) => {
  await supabase.from('api_usage_log').insert({
    service_type: 'llm_analysis',
    provider: 'openai',
    model_name: llmConfig.model,
    tokens_used: usage.total_tokens,
    cost_estimate_cents: Math.round(usage.total_tokens * 0.003), // $0.03 per 1K tokens
    processing_time_ms: usage.processing_time,
    status: 'success'
  });
};
```

---

## 🎯 Master Analysis Prompt (Enhanced)

### **System Prompt v2.0**

```
You are an expert organizational psychologist and AI adoption specialist with deep expertise in the Jobs-to-be-Done (JTBD) Forces of Progress framework. Your role is to analyze employee survey responses about AI readiness and provide structured, actionable insights.

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
- Insights should connect to business outcomes
```

### **Main Analysis Prompt v2.0**

```
Analyze this AI readiness survey response using the JTBD Forces of Progress framework:

**CONTEXT:**
- Survey Question: "{QUESTION_TEXT}"
- Expected JTBD Force: "{EXPECTED_FORCE}"
- Question Context: "{QUESTION_CONTEXT}"
- Employee Role: "{EMPLOYEE_ROLE}"
- Employee Department: "{EMPLOYEE_DEPARTMENT}"
- Organization: "{ORGANIZATION_NAME}"
- Response Length: {WORD_COUNT} words

**EMPLOYEE RESPONSE:**
"{USER_RESPONSE}"

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
}
```

---

## 🔍 Enhanced Question-Specific Templates

### **Demographic Questions (QA-QB)**

```
This is a demographic/usage question. Focus on extracting current AI experience and usage patterns rather than JTBD force analysis.

**Enhanced Analysis for Demographics:**
- Current AI tool usage (specific tools and frequency)
- Experience level indicators (beginner, intermediate, advanced)
- Usage context (work vs personal, formal vs informal)
- Technology adoption patterns
- Learning preferences and barriers

**Response Format:**
{
  "primary_jtbd_force": "demographic",
  "secondary_jtbd_forces": [],
  "force_strength_score": null,
  "confidence_score": 5,
  "reasoning": "Demographic data collection",
  
  "extracted_data": {
    "ai_tools_mentioned": ["tool1", "tool2"],
    "usage_frequency": "daily|weekly|monthly|rarely|never",
    "experience_level": "beginner|intermediate|advanced|expert",
    "usage_context": ["work", "personal", "creative", "analysis"],
    "comfort_level": "uncomfortable|cautious|comfortable|enthusiastic"
  },
  
  "key_themes": ["current_usage", "experience_level", "tool_familiarity"],
  "business_implications": {
    "impact_level": "medium",
    "readiness_indicators": ["Indicators of AI readiness from current usage"]
  },
  
  "actionable_insights": {
    "summary_insight": "Current AI experience and usage profile",
    "training_needs": ["Identified training or support needs"],
    "leverage_opportunities": ["Ways to build on current experience"]
  }
}
```

### **Pain of the Old Questions (Q1-Q2)**

```
Focus on identifying frustrations, inefficiencies, and friction points with current processes. Look for business impact and urgency indicators.

**Enhanced Analysis Guidelines:**
- Quantify impact when possible (time, money, frustration level)
- Identify root causes vs symptoms
- Assess urgency and priority level
- Consider organizational vs individual pain points
- Look for automation opportunities

**Scoring Refinements:**
- Score 5: Mentions specific time/cost impact, strong emotional language, systemic issues
- Score 4: Clear frustrations with examples, business impact implied
- Score 3: General inefficiencies mentioned, moderate concern
- Score 2: Minor issues, occasional inconvenience
- Score 1: No significant pain points, satisfaction with current state

**Additional Requirements:**
{
  "pain_analysis": {
    "pain_type": "process|technology|people|organizational",
    "frequency": "daily|weekly|monthly|occasional",
    "business_impact": "revenue|productivity|quality|morale|compliance",
    "root_cause": "Description of underlying cause",
    "automation_potential": "low|medium|high"
  },
  
  "urgency_indicators": {
    "time_sensitivity": "low|medium|high|critical",
    "cost_implications": "minimal|moderate|significant|severe",
    "scaling_issues": "Will this get worse over time?"
  }
}
```

### **Pull of the New Questions (Q3-Q5)**

```
Focus on AI benefits, opportunities, and positive possibilities that create attraction toward adoption.

**Enhanced Analysis Guidelines:**
- Distinguish between realistic and aspirational goals
- Assess specificity of AI use cases mentioned
- Identify business value drivers
- Consider feasibility of mentioned applications
- Look for innovation mindset indicators

**Scoring Refinements:**
- Score 5: Specific AI use cases, clear value proposition, innovation mindset
- Score 4: Strong enthusiasm with concrete examples
- Score 3: General interest in AI benefits
- Score 2: Vague awareness of AI potential
- Score 1: No interest in AI possibilities

**Additional Requirements:**
{
  "opportunity_analysis": {
    "use_case_specificity": "vague|general|specific|very_specific",
    "feasibility": "low|medium|high",
    "value_potential": "low|medium|high|transformational",
    "innovation_readiness": "conservative|cautious|open|pioneering",
    "business_alignment": "How well do mentioned benefits align with business goals?"
  },
  
  "implementation_considerations": {
    "technical_complexity": "low|medium|high|very_high",
    "resource_requirements": "minimal|moderate|significant|extensive",
    "timeline_realistic": "short_term|medium_term|long_term|unclear"
  }
}
```

### **Anchors to the Old Questions (Q6-Q8)**

```
Focus on organizational barriers, resistance forces, and factors that maintain status quo.

**Enhanced Analysis Guidelines:**
- Distinguish between process barriers and cultural resistance
- Assess whether barriers are temporary or structural
- Identify key decision makers and influencers
- Consider regulatory or compliance constraints
- Evaluate change management requirements

**Scoring Refinements:**
- Score 5: Deep structural barriers, cultural resistance, major change requirements
- Score 4: Significant organizational barriers with specific examples
- Score 3: Moderate resistance or bureaucratic processes
- Score 2: Minor procedural hurdles
- Score 1: Few barriers, organization ready for change

**Additional Requirements:**
{
  "barrier_analysis": {
    "barrier_type": "cultural|process|technical|financial|regulatory",
    "decision_makers": ["Identified gatekeepers or influencers"],
    "change_magnitude": "minimal|moderate|significant|transformational",
    "bypass_potential": "Can barriers be worked around?",
    "timeline_to_overcome": "weeks|months|quarters|years"
  },
  
  "change_management": {
    "stakeholder_alignment": "low|medium|high",
    "communication_needs": "minimal|moderate|extensive",
    "training_requirements": "basic|intermediate|advanced|comprehensive"
  }
}
```

### **Anxiety of the New Questions (Q9-Q10)**

```
Focus on concerns, fears, and uncertainties about AI adoption that create hesitation.

**Enhanced Analysis Guidelines:**
- Distinguish between rational concerns and emotional fears
- Assess whether concerns are founded or unfounded
- Identify specific risk categories (job security, privacy, etc.)
- Consider past experiences influencing current anxiety
- Evaluate mitigation strategies

**Scoring Refinements:**
- Score 5: Deep fears, job security concerns, past negative experiences
- Score 4: Significant concerns with specific examples
- Score 3: Moderate anxiety about change
- Score 2: Minor concerns, mostly manageable
- Score 1: No anxiety, confident about AI adoption

**Additional Requirements:**
{
  "anxiety_analysis": {
    "concern_type": "job_security|privacy|competency|control|ethics|reliability",
    "foundation": "rational|emotional|experiential|cultural",
    "severity": "mild|moderate|significant|severe",
    "mitigation_potential": "easy|moderate|difficult|very_difficult",
    "past_experiences": "Description of relevant past experiences"
  },
  
  "risk_assessment": {
    "perceived_risks": ["List of specific risks mentioned"],
    "actual_risk_level": "low|medium|high",
    "risk_mitigation": ["Potential strategies to address concerns"]
  }
}
```

---

## 🔄 Enhanced Error Handling & Validation

### **Response Validation Template**

```javascript
// Comprehensive response validation
const validateLLMResponse = (response, originalText) => {
  const errors = [];
  const warnings = [];
  
  // Required field validation
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
  
  return { errors, warnings, isValid: errors.length === 0 };
};
```

---

## 📊 Organizational Analysis Templates

### **Organization-Level Aggregation Prompt**

```
Analyze these survey responses to generate comprehensive organizational AI readiness insights:

**ORGANIZATION CONTEXT:**
- Organization: {ORG_NAME}
- Industry: {INDUSTRY}
- Size: {ORGANIZATION_SIZE}
- Survey Responses: {RESPONSE_COUNT}
- Completion Rate: {COMPLETION_RATE}%

**AGGREGATED RESPONSE DATA:**
{STRUCTURED_RESPONSES_JSON}

**ANALYSIS REQUIREMENTS:**

Generate organizational-level insights that provide actionable intelligence for leadership decision-making about AI adoption strategy.

## RESPONSE FORMAT:

{
  "executive_summary": {
    "overall_readiness_score": 1-5,
    "readiness_level": "not_ready|cautiously_ready|ready|very_ready",
    "confidence_level": "low|medium|high|very_high",
    "key_finding": "One sentence executive summary",
    "critical_insight": "Most important insight for leadership"
  },
  
  "jtbd_force_analysis": {
    "pain_of_old": {
      "average_score": 1-5,
      "strength": "weak|moderate|strong|very_strong",
      "top_themes": ["theme1", "theme2", "theme3"],
      "business_impact": "Description of cumulative impact",
      "urgency_level": "low|medium|high|critical"
    },
    "pull_of_new": {
      "average_score": 1-5,
      "strength": "weak|moderate|strong|very_strong", 
      "top_themes": ["theme1", "theme2", "theme3"],
      "opportunity_areas": ["area1", "area2", "area3"],
      "innovation_readiness": "low|medium|high|very_high"
    },
    "anchors_to_old": {
      "average_score": 1-5,
      "strength": "weak|moderate|strong|very_strong",
      "top_themes": ["theme1", "theme2", "theme3"],
      "barrier_types": ["cultural", "process", "technical", "financial"],
      "change_complexity": "low|medium|high|very_high"
    },
    "anxiety_of_new": {
      "average_score": 1-5,
      "strength": "weak|moderate|strong|very_strong",
      "top_themes": ["theme1", "theme2", "theme3"],
      "concern_categories": ["job_security", "privacy", "competency"],
      "mitigation_priority": "low|medium|high|critical"
    }
  },
  
  "organizational_characteristics": {
    "change_readiness": "resistant|cautious|open|pioneering",
    "ai_maturity": "beginner|developing|intermediate|advanced",
    "cultural_factors": ["Organizational culture indicators"],
    "leadership_alignment": "low|medium|high",
    "resource_availability": "limited|adequate|abundant"
  },
  
  "segmentation_insights": {
    "by_role": {
      "leadership": "Insights for leadership segment",
      "management": "Insights for management segment", 
      "individual_contributors": "Insights for IC segment"
    },
    "by_department": {
      "department_variations": "How departments differ in readiness"
    },
    "high_readiness_segmen