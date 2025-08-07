# LLM Analysis API Endpoint

## Overview

The `/api/llm/analyze` endpoint provides Jobs-to-be-Done (JTBD) framework analysis of survey responses using Large Language Models (OpenAI GPT-4o or Anthropic Claude).

## Authentication

- Requires user authentication via Supabase session
- Requires admin or org_admin role permissions
- Organization admins can only access data from their organization

## Endpoints

### POST `/api/llm/analyze`

Analyzes a single survey response using JTBD force classification.

#### Request Body

```json
{
  "responseId": "uuid-string",
  "responseText": "User's survey response text",
  "questionText": "The survey question that was asked",
  "expectedForce": "pain_of_old|pull_of_new|anchors_to_old|anxiety_of_new|demographic",
  "questionContext": "Context about the question (optional)",
  "organizationId": "uuid-string (optional)",
  "surveyId": "uuid-string (optional)"
}
```

#### Request Validation

- **responseId**: Required, must be valid UUID
- **responseText**: Required string, 1-5000 characters, non-empty
- **questionText**: Required string, 1-1000 characters, non-empty
- **expectedForce**: Required, must be valid JTBD force type
- **questionContext**: Optional string
- **organizationId**: Optional UUID string
- **surveyId**: Optional UUID string

#### Response Structure

```json
{
  "success": true,
  "analysisId": "uuid-string",
  "result": {
    "primaryJtbdForce": "pain_of_old",
    "secondaryJtbdForces": ["anxiety_of_new"],
    "forceStrengthScore": 4,
    "confidenceScore": 5,
    "reasoning": "Analysis explanation...",
    "keyThemes": ["theme1", "theme2", "theme3"],
    "themeCategories": {
      "process": ["process-related themes"],
      "technology": ["tech themes"],
      "people": ["people themes"],
      "organizational": ["org themes"]
    },
    "sentimentAnalysis": {
      "overallScore": 0.2,
      "sentimentLabel": "neutral",
      "emotionalIndicators": ["frustrated", "hopeful"],
      "tone": "cautious"
    },
    "businessImplications": {
      "impactLevel": "high",
      "affectedAreas": ["productivity", "morale"],
      "urgency": "medium",
      "businessValue": "Description of business impact"
    },
    "actionableInsights": {
      "summaryInsight": "Executive summary",
      "detailedAnalysis": "Detailed analysis",
      "immediateActions": ["Action 1", "Action 2"],
      "longTermRecommendations": ["Recommendation 1"]
    },
    "qualityIndicators": {
      "responseQuality": "good",
      "specificityLevel": "specific",
      "actionability": "high",
      "businessRelevance": "high"
    },
    "analysisMetadata": {
      "processingNotes": "Any special considerations",
      "followUpQuestions": ["Question 1"],
      "relatedThemes": ["theme1"]
    }
  },
  "context": {
    "questionContext": "AI readiness assessment",
    "employeeRole": "Developer",
    "employeeDepartment": "Engineering",
    "organizationName": "Company Inc",
    "responseId": "uuid",
    "surveyId": "uuid"
  }
}
```

#### JTBD Forces

1. **Pain of Old** (`pain_of_old`): Current problems and frustrations
2. **Pull of New** (`pull_of_new`): Attraction to AI benefits and opportunities
3. **Anchors to Old** (`anchors_to_old`): Resistance and barriers to change
4. **Anxiety of New** (`anxiety_of_new`): Fears and concerns about AI adoption
5. **Demographic** (`demographic`): Usage patterns and experience data

#### Error Responses

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Missing or invalid request fields |
| 401 | `AUTH_ERROR` | Invalid API key or authentication failed |
| 403 | `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| 404 | `NOT_FOUND` | Survey response not found |
| 408 | `TIMEOUT` | Request timeout |
| 429 | `RATE_LIMITED` | Too many requests |
| 502 | `INVALID_RESPONSE` | LLM returned invalid response |
| 503 | `SERVICE_UNAVAILABLE` | No API keys configured |

### GET `/api/llm/analyze` (Health Check)

Returns the health status of the LLM analysis service.

#### Response

```json
{
  "service": "LLM Analysis API",
  "status": "healthy|degraded|unhealthy",
  "latency": 1250,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "apiKeys": {
    "openai": "configured|missing",
    "anthropic": "configured|missing"
  },
  "config": {
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022"
  },
  "error": "Error message if unhealthy"
}
```

## Environment Variables

### Required
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (at least one required)

### Optional
- `DEFAULT_LLM_PROVIDER` (default: "openai")
- `OPENAI_MODEL` (default: "gpt-4o")
- `ANTHROPIC_MODEL` (default: "claude-3-5-sonnet-20241022")
- `LLM_TIMEOUT_MS` (default: 45000)
- `LLM_RETRY_ATTEMPTS` (default: 3)

## Usage Examples

### Basic Analysis Request

```javascript
const response = await fetch('/api/llm/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    responseId: 'resp_123',
    responseText: 'I find our current data processing very time-consuming and error-prone.',
    questionText: 'What challenges do you face with current processes?',
    expectedForce: 'pain_of_old',
    questionContext: 'AI readiness assessment'
  })
});

const result = await response.json();
```

### Health Check

```javascript
const health = await fetch('/api/llm/analyze');
const status = await health.json();
console.log('Service status:', status.status);
console.log('API keys:', status.apiKeys);
```

## Rate Limiting

- Default: 60 requests per minute per user
- Configurable via `RATE_LIMIT_REQUESTS_PER_MINUTE` environment variable

## Cost Tracking

The endpoint automatically tracks API usage including:
- Token consumption
- Cost estimates
- Processing time
- Success/failure rates
- Organization and survey attribution

## Integration Notes

1. **Graceful Degradation**: Service returns appropriate errors when API keys are missing
2. **Multi-Provider Support**: Automatically falls back between OpenAI and Anthropic
3. **Input Validation**: Comprehensive validation and sanitization of user inputs
4. **Error Classification**: Specific error codes for different failure scenarios
5. **Database Integration**: Automatic storage of analysis results and audit logs