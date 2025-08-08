# GraphQL Implementation

This directory contains a comprehensive GraphQL implementation for the AI Readiness Platform, providing a robust, secure, and scalable API layer.

## Architecture Overview

```
lib/graphql/
├── route.ts                    # Next.js API route handler
├── schema.ts                   # GraphQL type definitions
├── resolvers/
│   ├── index.ts               # Main resolver exports
│   ├── survey.resolvers.ts    # Survey-specific resolvers
│   └── organization.resolvers.ts # Organization resolvers
├── context.ts                  # GraphQL context creation
├── dataloaders.ts             # N+1 query prevention
├── services.ts                # Business logic services
├── plugins.ts                 # Security and monitoring
├── errors.ts                  # Custom error handling
└── types/
    └── generated.ts           # Generated TypeScript types
```

## Key Features

### 🔐 Security & Authorization
- **JWT Authentication**: Bearer token validation with Supabase
- **Role-Based Access Control**: Fine-grained permissions system
- **Rate Limiting**: 100 requests per minute per user/IP
- **Query Depth Limiting**: Maximum 10 levels deep
- **Query Complexity Analysis**: Prevents expensive operations

### ⚡ Performance Optimization
- **DataLoaders**: Batches database queries to prevent N+1 problems
- **Redis Subscriptions**: Scalable real-time updates (production)
- **Query Caching**: Efficient data loading with cache invalidation
- **Pagination**: All list queries support limit/offset pagination

### 🔍 Monitoring & Observability
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Query execution time tracking
- **Complex Query Detection**: Alerts for expensive operations
- **Authentication Tracking**: User activity monitoring

## Schema Overview

### Core Types

**User Management:**
- `User`: Core user entity with profile and preferences
- `Organization`: Multi-tenant organization structure
- `UserProfile`: Extended user information and preferences

**Survey System:**
- `Survey`: Survey definition with questions and settings
- `Question`: Individual survey questions with various types
- `Response`: User responses to surveys
- `SurveySession`: Session tracking for survey completion

**Analytics & Insights:**
- `SurveyAnalytics`: Comprehensive survey analytics
- `ResponseAnalysis`: AI-powered response analysis
- `JTBDAnalysis`: Jobs-to-be-Done framework analysis
- `VoiceAnalytics`: Voice recording analysis

### Query Examples

```graphql
# Get user's surveys with analytics
query GetMySurveys {
  surveys(pagination: { limit: 10 }) {
    id
    title
    status
    responseCount
    completionRate
    analytics {
      totalResponses
      averageCompletionTime
      insights {
        type
        title
        description
      }
    }
  }
}

# Submit survey response
mutation SubmitResponse($input: SubmitResponseInput!) {
  submitResponse(input: $input) {
    id
    status
    answers {
      questionId
      textAnswer
      voiceRecording {
        transcription
        sentiment {
          score
          label
        }
      }
    }
  }
}

# Real-time response updates
subscription ResponseUpdates($surveyId: ID!) {
  responseSubmitted(surveyId: $surveyId) {
    id
    user {
      email
    }
    completedAt
  }
}
```

## Authentication & Authorization

### Authentication Methods
1. **Bearer Token**: `Authorization: Bearer <jwt_token>`
2. **Session Cookie**: Automatic session management
3. **API Key**: For programmatic access

### Permission System
```typescript
// Role hierarchy (higher roles inherit lower permissions)
VIEWER < USER < ANALYST < ORG_ADMIN < SYSTEM_ADMIN

// Permission examples
permissions: [
  'surveys:read',    // Can read surveys
  'surveys:create',  // Can create surveys
  'analytics:read',  // Can view analytics
  'users:manage'     // Can manage users
]
```

### Context Usage
```typescript
// In resolvers
const resolver = async (parent, args, context) => {
  // Require authentication
  const user = context.requireAuth()
  
  // Require specific permission
  context.requirePermission('surveys:create')
  
  // Require minimum role
  context.requireRole('ANALYST')
  
  // Check organization membership
  context.requireOrganization()
}
```

## DataLoaders & Performance

### N+1 Problem Prevention
```typescript
// Instead of this (N+1 queries):
surveys.forEach(survey => {
  const creator = await getUser(survey.createdById) // N queries
})

// DataLoaders batch these:
const creators = await context.dataSources.userLoader.loadMany(
  surveys.map(s => s.createdById) // 1 batched query
)
```

### Cache Management
```typescript
// Clear cache after updates
context.dataSources.surveyLoader.clear(surveyId)

// Prime cache with known data
context.dataSources.userLoader.prime(userId, userData)
```

## Error Handling

### Custom Error Types
```typescript
throw new ValidationError('Survey title is required')
throw new AuthenticationError('Login required')
throw new ForbiddenError('Insufficient permissions')
throw new NotFoundError('Survey', surveyId)
```

### Error Response Format
```json
{
  "errors": [{
    "message": "Survey title is required",
    "extensions": {
      "code": "VALIDATION_ERROR",
      "statusCode": 400,
      "field": "title",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }]
}
```

## Real-time Subscriptions

### Setup
```typescript
// Production (Redis)
export const pubsub = new RedisPubSub({
  connection: { host: 'redis-server' }
})

// Development (In-memory)
export const pubsub = new PubSub()
```

### Usage
```typescript
// Publish event
pubsub.publish('RESPONSE_SUBMITTED', {
  responseSubmitted: response,
  surveyId: response.surveyId
})

// Subscribe with filtering
const subscription = {
  subscribe: withFilter(
    () => pubsub.asyncIterator('RESPONSE_SUBMITTED'),
    (payload, variables) => payload.surveyId === variables.surveyId
  )
}
```

## Development Setup

### 1. Install Dependencies
```bash
npm install graphql @graphql-tools/schema graphql-yoga
npm install dataloader graphql-scalars
npm install graphql-subscriptions graphql-redis-subscriptions
```

### 2. Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Redis (production)
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. GraphQL Playground
Access at: `http://localhost:3000/api/graphql` (development only)

## Security Best Practices

### Input Validation
```typescript
// Validate all inputs
validators.required(input.title, 'title')
validators.email(input.email, 'email')
validators.maxLength(input.description, 1000, 'description')
```

### Query Limits
```typescript
// Configured in plugins.ts
const securityPlugins = [
  useDepthLimit({ maxDepth: 10 }),
  useQueryComplexity({ maximumComplexity: 1000 }),
  useRateLimiter({ max: 100, window: 60000 })
]
```

### Data Access Control
```typescript
// Organization-scoped queries
const surveys = await supabase
  .from('surveys')
  .select('*')
  .eq('organization_id', user.organizationId) // Scope to user's org
```

## Production Considerations

### 1. Caching Strategy
- **Query Results**: Cache expensive analytics queries
- **DataLoaders**: Per-request caching prevents N+1 queries
- **Redis**: External cache for subscriptions and sessions

### 2. Monitoring
- **Error Tracking**: Integrate with Sentry or similar
- **Performance Metrics**: Track query execution times
- **Business Metrics**: Monitor API usage patterns

### 3. Scaling
- **Horizontal Scaling**: Multiple server instances
- **Database Optimization**: Proper indexing and query optimization
- **Redis Cluster**: Scale real-time subscriptions

## Testing

### Unit Tests
```typescript
// Test resolvers
describe('Survey Resolvers', () => {
  it('creates survey with proper validation', async () => {
    const result = await testServer.executeOperation({
      query: CREATE_SURVEY,
      variables: { input: validSurveyData }
    })
    expect(result.data.createSurvey.id).toBeDefined()
  })
})
```

### Integration Tests
```typescript
// Test with database
it('enforces organization isolation', async () => {
  const result = await request(app)
    .post('/api/graphql')
    .set('Authorization', `Bearer ${otherOrgUser.token}`)
    .send({ query: GET_SURVEYS })
  
  expect(result.body.data.surveys).toHaveLength(0)
})
```

## Contributing

### Adding New Types
1. Add type definitions in `schema.ts`
2. Create resolvers in appropriate resolver file
3. Add DataLoader if needed in `dataloaders.ts`
4. Add service methods in `services.ts`
5. Add tests

### Adding New Resolvers
1. Follow existing patterns in resolver files
2. Include proper authentication/authorization
3. Handle errors gracefully
4. Add input validation
5. Clear relevant caches on mutations

## Support

For questions or issues with the GraphQL implementation:
1. Check the error logs for detailed error messages
2. Use GraphQL Playground to test queries
3. Review the schema documentation
4. Check DataLoader cache behavior
