# AI Readiness Assessment API Documentation

## 📚 Overview

This is the comprehensive developer guide for the AI Readiness Assessment API. Our API provides endpoints for survey management, analytics, LLM-powered analysis, voice transcription, and user management.

## 🚀 Quick Start

### 1. Access API Documentation

Visit our interactive Swagger UI documentation:
- **Production**: https://ai-readiness-frontend.vercel.app/api/docs
- **Development**: http://localhost:3000/api/docs

### 2. Authentication

All API endpoints require authentication using either:

**JWT Bearer Token** (Recommended):
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://ai-readiness-frontend.vercel.app/api/survey/submit
```

**Session Cookie**:
```bash
curl --cookie "sb-access-token=YOUR_SESSION_COOKIE" \
  https://ai-readiness-frontend.vercel.app/api/analytics/dashboard
```

### 3. Basic Usage Example

```typescript
// Submit a survey response
const response = await fetch('/api/survey/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    surveyId: 'uuid-survey-id',
    answers: [
      {
        questionId: 'q1',
        answer: 'We face challenges with data integration'
      }
    ],
    status: 'completed'
  })
})

const result = await response.json()
console.log('Survey submitted:', result.sessionId)
```

## 📖 API Reference

### 🔐 Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Register new user account |
| `/auth/logout` | POST | Log out current user |
| `/auth/check-permission` | GET | Verify user permissions |

### 📋 Survey Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/survey/submit` | POST | Submit/update survey response |
| `/survey/submit` | GET | Retrieve survey responses |
| `/survey/session` | POST | Create new survey session |

### 📊 Analytics & Reporting

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/dashboard` | GET | Get dashboard metrics |
| `/analytics/dashboard` | POST | Advanced analytics queries |
| `/analytics/export` | GET | Export analytics data |

### 🤖 LLM Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/llm/analyze` | POST | Analyze response with AI |
| `/llm/analyze` | GET | LLM service health check |
| `/llm/batch` | POST | Batch analysis processing |

### 🎤 Voice Features

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/voice/upload` | POST | Upload voice recordings |
| `/voice/transcribe` | POST | Transcribe speech to text |
| `/voice/{id}` | GET | Get voice recording details |

### 📝 Templates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/templates` | GET | List survey templates |
| `/templates` | POST | Create new template |
| `/templates/{id}` | GET | Get template details |

## 🔒 Authentication & Authorization

### Authentication Methods

1. **JWT Bearer Token**: Use the `Authorization: Bearer <token>` header
2. **Session Cookie**: Automatic with browser requests

### User Roles & Permissions

| Role | Permissions |
|------|------------|
| `user` | Submit surveys, view own responses |
| `org_admin` | Manage organization data, view analytics |
| `system_admin` | Full system access, manage all organizations |

### Permission Checks

```typescript
// Check if user has specific permission
const permissionCheck = await fetch('/api/auth/check-permission?permission=analytics_view')
const { hasPermission, role } = await permissionCheck.json()
```

## 📊 Analytics Integration

### Dashboard Metrics

Get comprehensive dashboard data:

```typescript
const analytics = await fetch('/api/analytics/dashboard?metrics=overview,jtbd_trends&period=weekly')
const data = await analytics.json()

console.log('Total responses:', data.data.overview.totalResponses)
console.log('JTBD readiness score:', data.data.jtbd_trends.readinessScore)
```

### Available Metrics

- **overview**: Basic response statistics and growth
- **jtbd_trends**: Jobs-to-be-Done analysis and forces
- **voice_quality**: Voice recording metrics and quality
- **user_engagement**: User activity and retention
- **real_time**: Live system metrics

### Export Options

```typescript
// Export as CSV
const csvData = await fetch('/api/analytics/dashboard?export=true&format=csv')
const csvContent = await csvData.text()

// Export as JSON with filters
const jsonData = await fetch('/api/analytics/dashboard', {
  method: 'POST',
  body: JSON.stringify({
    organizationId: 'org-uuid',
    dateRange: { start: '2024-01-01', end: '2024-12-31' },
    metrics: ['overview', 'jtbd_trends']
  })
})
```

## 🤖 LLM Analysis

### Jobs-to-be-Done Analysis

Our LLM analysis endpoints provide AI-powered insights using Jobs-to-be-Done framework:

```typescript
const analysis = await fetch('/api/llm/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    responseId: 'response-uuid',
    responseText: 'We struggle with data quality and integration',
    questionText: 'What challenges do you face?',
    expectedForce: 'pain_of_old',
    questionContext: 'AI readiness assessment'
  })
})

const result = await analysis.json()
console.log('JTBD Force:', result.result.force)
console.log('Intensity:', result.result.intensity)
console.log('Themes:', result.result.themes)
```

### JTBD Forces

| Force | Description |
|-------|-------------|
| `pain_of_old` | Current system frustrations |
| `pull_of_new` | Benefits of new solutions |
| `anchors_to_old` | Barriers to change |
| `anxiety_of_new` | Concerns about change |
| `demographic` | User characteristics |

### Health Check

```typescript
const health = await fetch('/api/llm/analyze')
const status = await health.json()
console.log('LLM Status:', status.status) // healthy, degraded, unhealthy
```

## 🎤 Voice Integration

### Upload Voice Recordings

```typescript
const formData = new FormData()
formData.append('audio', audioFile)
formData.append('responseId', 'response-uuid')

const upload = await fetch('/api/voice/upload', {
  method: 'POST',
  body: formData
})

const { recordingId } = await upload.json()
```

### Transcription

```typescript
const transcription = await fetch('/api/voice/transcribe', {
  method: 'POST',
  body: JSON.stringify({
    recordingId: 'recording-uuid',
    language: 'en-US'
  })
})

const { transcription: text, confidence } = await transcription.json()
```

## 🚦 Rate Limiting

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| General API | 1,000 requests | 1 hour |
| LLM Analysis | 100 requests | 1 hour |
| Voice Upload | 50 requests | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Window reset time

## ❌ Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "message": "Detailed description",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Code Reference

| Code | Category | Description |
|------|----------|-------------|
| `AUTH_REQUIRED` | Authentication | User must be authenticated |
| `VALIDATION_ERROR` | Validation | Request validation failed |
| `RATE_LIMITED` | Rate Limiting | Too many requests |
| `ANALYSIS_FAILED` | LLM | AI analysis failed |
| `SERVICE_UNAVAILABLE` | System | Service temporarily down |

## 🔧 Development Tools

### OpenAPI Generator

Regenerate API documentation from code:

```bash
npm run generate:openapi
```

### Testing with cURL

```bash
# Get dashboard analytics
curl -H "Authorization: Bearer $JWT_TOKEN" \
  "https://ai-readiness-frontend.vercel.app/api/analytics/dashboard?metrics=overview"

# Submit survey response
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"surveyId":"uuid","answers":[{"questionId":"q1","answer":"test"}]}' \
  "https://ai-readiness-frontend.vercel.app/api/survey/submit"
```

### SDK Examples

#### JavaScript/TypeScript

```typescript
class AIReadinessAPI {
  constructor(private baseURL: string, private token: string) {}
  
  async submitSurvey(data: SurveySubmission) {
    const response = await fetch(`${this.baseURL}/survey/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    return response.json()
  }
  
  async getDashboard(params?: AnalyticsParams) {
    const query = new URLSearchParams(params as any).toString()
    const response = await fetch(`${this.baseURL}/analytics/dashboard?${query}`)
    return response.json()
  }
}

// Usage
const api = new AIReadinessAPI('https://ai-readiness-frontend.vercel.app/api', token)
const result = await api.submitSurvey({ surveyId: 'uuid', answers: [...] })
```

#### Python

```python
import requests

class AIReadinessAPI:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def submit_survey(self, data: dict):
        response = requests.post(
            f'{self.base_url}/survey/submit',
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_dashboard(self, params=None):
        response = requests.get(
            f'{self.base_url}/analytics/dashboard',
            params=params,
            headers=self.headers
        )
        return response.json()

# Usage
api = AIReadinessAPI('https://ai-readiness-frontend.vercel.app/api', token)
result = api.submit_survey({'surveyId': 'uuid', 'answers': [...]})
```

## 🔍 Troubleshooting

### Common Issues

#### Authentication Errors

```javascript
// Problem: 401 Unauthorized
// Solution: Check token validity
const tokenCheck = await fetch('/api/auth/check-permission')
if (!tokenCheck.ok) {
  // Token expired or invalid - redirect to login
  window.location.href = '/auth/login'
}
```

#### Rate Limiting

```javascript
// Problem: 429 Too Many Requests  
// Solution: Implement retry with exponential backoff
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)
    
    if (response.status !== 429) return response
    
    // Wait before retry (exponential backoff)
    const delay = Math.pow(2, i) * 1000
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
```

#### LLM Analysis Failures

```javascript
// Problem: LLM service unavailable
// Solution: Check service health first
const health = await fetch('/api/llm/analyze')
const { status } = await health.json()

if (status !== 'healthy') {
  console.warn('LLM service degraded, analysis may fail')
  // Implement fallback logic
}
```

### Debug Mode

Enable debug logging in development:

```typescript
// Add debug headers to requests
const response = await fetch('/api/survey/submit', {
  headers: {
    'X-Debug': 'true',
    'X-Request-ID': generateRequestId()
  }
})
```

## 📞 Support & Resources

### Getting Help

- **Interactive Documentation**: [API Docs](http://localhost:3000/api/docs)
- **GitHub Issues**: Report bugs and request features
- **Developer Support**: support@ai-readiness.com

### Additional Resources

- [OpenAPI Specification](http://localhost:3000/api/docs?format=json)
- [Postman Collection](./postman-collection.json)
- [Rate Limiting Guide](./rate-limiting.md)
- [Authentication Guide](./authentication.md)

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial API release |
| 1.1.0 | 2024-02-01 | Added LLM analysis endpoints |
| 1.2.0 | 2024-03-01 | Voice recording features |

---

**Note**: This API is under active development. Check the [changelog](./CHANGELOG.md) for the latest updates and breaking changes.