# LLM Integration for AI Readiness Assessment

This document describes the comprehensive LLM integration system that provides AI-powered analysis of survey responses using the Jobs-to-be-Done (JTBD) framework.

## 🎯 Overview

The LLM integration enables:
- **Automated JTBD Analysis**: Classify survey responses into four forces of progress
- **Sentiment Analysis**: Understand emotional responses to AI adoption
- **Organizational Insights**: Generate comprehensive readiness assessments
- **Cost Tracking**: Monitor API usage and costs
- **Batch Processing**: Analyze multiple responses efficiently

## 🏗️ Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM Integration System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   LLM Service   │  │   API Routes    │  │ UI Components│ │
│  │                 │  │                 │  │              │ │
│  │ • OpenAI        │  │ • /api/llm/     │  │ • Dashboard  │ │
│  │ • Anthropic     │  │   analyze       │  │ • Visualize  │ │
│  │ • Validation    │  │ • /api/llm/     │  │ • Analysis   │ │
│  │ • Error Handle  │  │   batch         │  │   Panel      │ │
│  │ • Cost Track    │  │ • /api/llm/     │  │ • Force      │ │
│  │                 │  │   organizational│  │   Charts     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      JTBD Framework                         │
│                                                             │
│  Pain of Old  │  Pull of New  │  Anchors to Old │ Anxiety   │
│  (Problems)   │  (Benefits)   │  (Barriers)     │ (Fears)   │
└─────────────────────────────────────────────────────────────┘
```

### Files Structure

```
lib/
├── types/llm.ts                    # TypeScript type definitions
├── services/llm-service.ts         # Core LLM service class
├── hooks/use-llm-analysis.ts       # React hooks for LLM operations
├── utils/llm-validation.ts         # Validation utilities
└── config/llm-config.ts           # Configuration management

app/api/llm/
├── analyze/route.ts                # Single response analysis
├── batch/route.ts                  # Batch processing
├── organizational/route.ts         # Organizational insights
└── cost-tracking/route.ts         # Usage monitoring

components/admin/
├── llm-analysis-dashboard.tsx      # Main dashboard
├── jtbd-force-visualization.tsx    # Force visualization
└── response-analysis-panel.tsx     # Individual analysis
```

## 🚀 Getting Started

### 1. Environment Setup

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env.local
```

Add your LLM provider API keys:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o

# Anthropic Configuration  
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Default provider
DEFAULT_LLM_PROVIDER=openai
```

### 2. Database Setup

The LLM integration requires additional database tables. Run the migrations:

```sql
-- LLM Analysis Results
CREATE TABLE llm_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES survey_responses(id),
  survey_id UUID REFERENCES surveys(id),
  organization_id UUID REFERENCES organizations(id),
  analysis_result JSONB NOT NULL,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Usage Logs
CREATE TABLE api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_estimate_cents INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id),
  survey_id UUID REFERENCES surveys(id),
  response_id UUID REFERENCES survey_responses(id)
);

-- Organizational Analysis Results
CREATE TABLE organizational_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  survey_id UUID REFERENCES surveys(id),
  analysis_result JSONB NOT NULL,
  metrics JSONB,
  total_responses INTEGER NOT NULL,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch Analysis Logs
CREATE TABLE batch_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id),
  organization_id UUID REFERENCES organizations(id),
  total_responses INTEGER NOT NULL,
  successful_analyses INTEGER NOT NULL,
  failed_analyses INTEGER NOT NULL,
  total_cost_cents INTEGER NOT NULL,
  total_tokens_used INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  processed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization Settings (extend existing table)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_budget_monthly_cents INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_daily_limit_cents INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_usage_alerts_enabled BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS api_alert_thresholds JSONB;

-- Add analysis status to survey responses
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending';
ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX idx_llm_analysis_results_response_id ON llm_analysis_results(response_id);
CREATE INDEX idx_llm_analysis_results_organization_id ON llm_analysis_results(organization_id);
CREATE INDEX idx_api_usage_log_timestamp ON api_usage_log(timestamp);
CREATE INDEX idx_api_usage_log_organization_id ON api_usage_log(organization_id);
CREATE INDEX idx_organizational_analysis_org_id ON organizational_analysis_results(organization_id);
CREATE INDEX idx_batch_analysis_logs_org_id ON batch_analysis_logs(organization_id);
```

## 📊 JTBD Framework Implementation

### The Four Forces of Progress

Our implementation analyzes responses according to Clayton Christensen's JTBD framework:

#### 1. **Pain of the Old** (Current Problems)
- **Description**: Frustrations and inefficiencies with current processes
- **Analysis Focus**: Time impact, cost implications, frequency of issues
- **Scoring**: 1 (no pain) to 5 (severe pain causing major inefficiency)

#### 2. **Pull of the New** (AI Attraction)  
- **Description**: Benefits and opportunities that AI could provide
- **Analysis Focus**: Specific use cases, value potential, innovation readiness
- **Scoring**: 1 (no interest) to 5 (strong desire with detailed vision)

#### 3. **Anchors to the Old** (Resistance Forces)
- **Description**: Organizational barriers and resistance to change
- **Analysis Focus**: Cultural resistance, process barriers, decision makers
- **Scoring**: 1 (few barriers) to 5 (deep entrenchment preventing adoption)

#### 4. **Anxiety of the New** (Concerns & Fears)
- **Description**: Worries and uncertainties about AI adoption
- **Analysis Focus**: Job security, privacy, competency concerns
- **Scoring**: 1 (no anxiety) to 5 (major fears or strong resistance)

### Enhanced Analysis Features

```typescript
interface ExtendedJTBDAnalysisResult {
  // Core JTBD Classification
  primaryJtbdForce: JTBDForceType;
  secondaryJtbdForces: JTBDForceType[];
  forceStrengthScore: number; // 1-5
  confidenceScore: number; // 1-5
  reasoning: string;
  
  // Extracted Insights
  keyThemes: string[];
  themeCategories: {
    process: string[];
    technology: string[];
    people: string[];
    organizational: string[];
  };
  
  // Sentiment Analysis
  sentimentAnalysis: {
    overallScore: number; // -1.0 to 1.0
    sentimentLabel: SentimentLabel;
    emotionalIndicators: string[];
    tone: string;
  };
  
  // Business Impact
  businessImplications: {
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    affectedAreas: string[];
    urgency: 'low' | 'medium' | 'high';
    businessValue: string;
  };
  
  // Actionable Insights
  actionableInsights: {
    summaryInsight: string;
    detailedAnalysis: string;
    immediateActions: string[];
    longTermRecommendations: string[];
  };
  
  // Quality Indicators
  qualityIndicators: {
    responseQuality: 'poor' | 'fair' | 'good' | 'excellent';
    specificityLevel: 'vague' | 'general' | 'specific' | 'very_specific';
    actionability: 'low' | 'medium' | 'high';
    businessRelevance: 'low' | 'medium' | 'high';
  };
}
```

## 🔌 API Usage

### Single Response Analysis

```typescript
// Analyze individual survey response
const response = await fetch('/api/llm/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    responseId: 'response-123',
    responseText: 'I find current processes very inefficient...',
    questionText: 'What are your biggest challenges with current tools?',
    expectedForce: 'pain_of_old',
    questionContext: 'Pain point identification',
    employeeRole: 'Manager',
    employeeDepartment: 'Operations',
    organizationName: 'Acme Corp'
  })
});

const result = await response.json();
console.log(result.result); // ExtendedJTBDAnalysisResult
```

### Batch Processing

```typescript
// Process multiple responses at once
const batchResponse = await fetch('/api/llm/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    surveyId: 'survey-456',
    organizationId: 'org-789',
    options: {
      parallel: true,
      priority: 'high',
      retryFailures: true
    }
  })
});

const batchResult = await batchResponse.json();
console.log(`Processed ${batchResult.summary.successful} responses`);
```

### Organizational Insights

```typescript
// Generate organizational-level analysis
const orgResponse = await fetch('/api/llm/organizational', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-789',
    surveyId: 'survey-456', // optional
    includeRaw: false
  })
});

const orgAnalysis = await orgResponse.json();
console.log(orgAnalysis.analysis); // OrganizationalAnalysis
```

## 🎨 UI Components

### LLM Analysis Dashboard

```typescript
import { LLMAnalysisDashboard } from '@/components/admin/llm-analysis-dashboard';

function AdminPage() {
  return (
    <LLMAnalysisDashboard 
      organizationId="org-123"
      surveyId="survey-456"
    />
  );
}
```

### JTBD Force Visualization

```typescript
import { JTBDForceVisualization } from '@/components/admin/jtbd-force-visualization';

function AnalysisPage({ analyses, organizationalAnalysis }) {
  return (
    <JTBDForceVisualization
      analyses={analyses}
      organizationalAnalysis={organizationalAnalysis}
      showIndividualResults={true}
    />
  );
}
```

### Response Analysis Panel

```typescript
import { ResponseAnalysisPanel } from '@/components/admin/response-analysis-panel';

function ResponseDetail({ response }) {
  return (
    <ResponseAnalysisPanel
      responseId={response.id}
      responseText={response.text}
      questionText={response.question}
      expectedForce="pain_of_old"
      context={{
        employeeRole: response.user.role,
        employeeDepartment: response.user.department,
        organizationName: response.organization.name
      }}
      onAnalysisComplete={(analysis) => {
        console.log('Analysis completed:', analysis);
      }}
    />
  );
}
```

## 🪝 React Hooks

### useLLMAnalysis Hook

```typescript
import { useLLMAnalysis } from '@/lib/hooks/use-llm-analysis';

function AnalysisDashboard() {
  const {
    analyses,
    organizationalAnalysis,
    summary,
    loading,
    error,
    analyzeResponse,
    runBatchAnalysis,
    generateOrganizationalInsights,
    refreshData,
    clearError
  } = useLLMAnalysis({
    organizationId: 'org-123',
    surveyId: 'survey-456',
    autoRefresh: true,
    refreshInterval: 30000
  });

  const handleAnalyze = async () => {
    try {
      await runBatchAnalysis({
        parallel: true,
        priority: 'high'
      });
    } catch (error) {
      console.error('Batch analysis failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>AI Readiness Analysis</h1>
      <p>Total Analyses: {summary?.totalAnalyses}</p>
      <p>Success Rate: {summary?.successRate}%</p>
      <button onClick={handleAnalyze}>Run Batch Analysis</button>
    </div>
  );
}
```

### useLLMCostTracking Hook

```typescript
import { useLLMCostTracking } from '@/lib/hooks/use-llm-analysis';

function CostMonitoring() {
  const {
    summary,
    timeSeries,
    breakdowns,
    alerts,
    loading,
    error,
    refreshData,
    updateBudgetSettings
  } = useLLMCostTracking('org-123', '30d');

  return (
    <div>
      <h2>Cost Tracking</h2>
      <p>Total Cost: ${(summary?.totalCostCents / 100).toFixed(2)}</p>
      <p>Total Tokens: {summary?.totalTokens?.toLocaleString()}</p>
      {alerts.map(alert => (
        <div key={alert.type} className={`alert ${alert.severity}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}
```

## 💰 Cost Management

### Monitoring Usage

The system automatically tracks:
- **Token consumption** per request
- **Cost estimates** based on current pricing
- **Processing time** for performance monitoring
- **Success/failure rates** for reliability tracking

### Budget Controls

```typescript
// Set monthly budget and daily limits
await updateBudgetSettings({
  monthlyBudgetCents: 50000, // $500/month
  dailyLimitCents: 2000,     // $20/day
  alertThresholds: {
    monthlyWarning: 75,       // Alert at 75% of monthly budget
    dailyWarning: 80          // Alert at 80% of daily limit
  },
  enableAlerts: true
});
```

### Cost Optimization

- **Batch Processing**: More efficient than individual requests
- **Response Caching**: Avoid re-analyzing identical responses  
- **Quality Thresholds**: Skip low-quality responses
- **Model Selection**: Use appropriate models for different tasks

## 🔒 Security & Privacy

### Input Sanitization

```typescript
import { sanitizeInput, validateAnalysisRequest } from '@/lib/utils/llm-validation';

// Sanitize user input before analysis
const cleanedText = sanitizeInput(userResponse);

// Validate request parameters
const validation = validateAnalysisRequest({
  responseText: cleanedText,
  questionText: question,
  expectedForce: 'pain_of_old'
});

if (!validation.isValid) {
  throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
}
```

### API Key Management

- Store API keys securely in environment variables
- Use different keys for development/production
- Implement key rotation procedures
- Monitor for unusual usage patterns

### Data Privacy

- **No PII Storage**: Personal information is not sent to LLM providers
- **Anonymization**: Responses are anonymized before analysis
- **Retention Policies**: Analysis results have configurable retention
- **Access Controls**: Role-based access to analysis features

## 📈 Performance Optimization

### Batch Processing

Process multiple responses efficiently:

```typescript
const batchResult = await runBatchAnalysis({
  parallel: true,      // Process in parallel for speed
  priority: 'high',    // High priority queue
  retryFailures: true, // Retry failed analyses
  batchSize: 10        // Optimal batch size
});
```

### Caching Strategy

```typescript
// Enable response caching for identical inputs
const cacheConfig = {
  enableResponseCaching: true,
  cacheTTLMinutes: 60,
  cacheMaxSize: 1000
};
```

### Rate Limiting

```typescript
// Configure rate limits to avoid API throttling
const rateLimits = {
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
  burstLimit: 10
};
```

## 🧪 Testing

### Unit Tests

```typescript
import { LLMService } from '@/lib/services/llm-service';
import { validateAnalysisResult } from '@/lib/utils/llm-validation';

describe('LLM Service', () => {
  it('should analyze survey response correctly', async () => {
    const service = new LLMService('openai');
    
    const result = await service.analyzeSurveyResponse(
      'Our current tools are slow and inefficient',
      'What challenges do you face with current processes?',
      'pain_of_old',
      { organizationName: 'Test Corp' }
    );
    
    expect(result.primaryJtbdForce).toBe('pain_of_old');
    expect(result.forceStrengthScore).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
    
    const validation = validateAnalysisResult(result);
    expect(validation.isValid).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('LLM API Integration', () => {
  it('should process batch analysis successfully', async () => {
    const response = await fetch('/api/llm/batch', {
      method: 'POST',
      body: JSON.stringify({
        surveyId: 'test-survey',
        options: { parallel: true }
      })
    });
    
    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.summary.totalProcessed).toBeGreaterThan(0);
  });
});
```

## 🚨 Error Handling

### Common Error Scenarios

1. **API Key Issues**
   ```typescript
   // Check API key validity
   if (!validateAPIKey(apiKey, 'openai')) {
     throw new Error('Invalid OpenAI API key format');
   }
   ```

2. **Rate Limiting**
   ```typescript
   // Handle rate limit errors with exponential backoff
   if (error.message.includes('429')) {
     await new Promise(resolve => setTimeout(resolve, retryDelay * 2));
     return retry();
   }
   ```

3. **Timeout Handling**
   ```typescript
   // Set appropriate timeouts for different operations
   const timeout = operation === 'batch' ? 300000 : 45000; // 5min for batch, 45s for single
   ```

4. **Validation Errors**
   ```typescript
   // Validate inputs before processing
   const validation = validateAnalysisRequest(request);
   if (!validation.isValid) {
     return { error: validation.errors.join(', ') };
   }
   ```

## 📚 Advanced Usage

### Custom Analysis Prompts

Extend the analysis with custom prompts for specific use cases:

```typescript
// Override default prompts for specialized analysis
const customService = new LLMService('openai', {
  temperature: 0.1, // More deterministic
  maxTokens: 1500,  // Allow longer responses
});

// Add custom context for industry-specific analysis
const result = await customService.analyzeSurveyResponse(
  responseText,
  questionText,
  expectedForce,
  {
    industryContext: 'Healthcare',
    regulatoryEnvironment: 'HIPAA-compliant',
    organizationSize: 'Enterprise'
  }
);
```

### Multi-Provider Failover

```typescript
// Implement failover between providers
class RobustLLMService {
  private providers = ['openai', 'anthropic'];
  
  async analyzeWithFailover(text: string) {
    for (const provider of this.providers) {
      try {
        const service = new LLMService(provider);
        return await service.analyzeSurveyResponse(text, ...args);
      } catch (error) {
        console.warn(`Provider ${provider} failed, trying next...`);
        continue;
      }
    }
    throw new Error('All providers failed');
  }
}
```

### Organizational Benchmarking

```typescript
// Compare organization against industry benchmarks
const benchmarkingAnalysis = await generateOrganizationalInsights(
  responses,
  {
    name: 'Acme Corp',
    industry: 'Technology',
    size: 'Medium',
    benchmarkAgainst: ['Technology', 'Fortune500']
  }
);
```

## 🔧 Troubleshooting

### Common Issues

1. **High API Costs**
   - Review batch processing settings
   - Implement response caching
   - Use smaller models for simple tasks
   - Set appropriate budget limits

2. **Low Analysis Quality**
   - Check input response quality
   - Verify prompt templates
   - Increase confidence thresholds
   - Review model selection

3. **Performance Issues**
   - Enable parallel processing
   - Optimize batch sizes
   - Monitor API rate limits
   - Check network connectivity

4. **Integration Errors**
   - Verify database schema
   - Check API permissions
   - Validate environment variables
   - Review error logs

### Debugging Tools

```typescript
// Enable detailed logging
const debugService = new LLMService('openai', {
  enableDebugLogging: true,
  logLevel: 'verbose'
});

// Health check endpoint
const health = await fetch('/api/llm/analyze?health=true');
const status = await health.json();
console.log('LLM Service Status:', status);
```

## 📖 Best Practices

### 1. **Response Quality**
- Ensure responses are substantive (>20 words)
- Filter out low-quality responses
- Provide clear question context

### 2. **Cost Management**
- Monitor usage regularly
- Set appropriate budget limits
- Use batch processing for efficiency
- Cache common responses

### 3. **Data Privacy**
- Anonymize personal information
- Implement data retention policies
- Use secure API key storage
- Audit access patterns

### 4. **Performance**
- Process responses in batches
- Use appropriate model sizes
- Implement proper error handling
- Monitor API rate limits

### 5. **Analysis Quality**
- Validate input before processing
- Check analysis confidence scores
- Review organizational insights
- Continuously refine prompts

## 🚀 Future Enhancements

### Planned Features

1. **Advanced Analytics**
   - Trend analysis over time
   - Predictive readiness modeling
   - Comparative benchmarking
   - Real-time monitoring

2. **Enhanced Integrations**
   - Additional LLM providers
   - Custom model fine-tuning
   - Enterprise SSO integration
   - Advanced reporting tools

3. **AI Improvements**
   - Multi-language support
   - Industry-specific models
   - Automated prompt optimization
   - Context-aware analysis

4. **Operational Features**
   - Automated alerting
   - Custom dashboards
   - API rate optimization
   - Advanced caching

## 💬 Support

For questions or issues with the LLM integration:

1. Check the troubleshooting section above
2. Review error logs in the dashboard
3. Verify environment configuration
4. Contact the development team

## 📄 License

This LLM integration is part of the AI Readiness Assessment platform and follows the same licensing terms as the main project.