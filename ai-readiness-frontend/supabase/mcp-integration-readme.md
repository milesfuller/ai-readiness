# Supabase MCP Integration for AI Readiness

This document describes the Supabase MCP (Model Context Protocol) integration setup for the AI Readiness Frontend application.

## Overview

The MCP integration provides seamless connectivity between Supabase and external AI services, enabling:

- **Real-time webhook notifications** for survey events
- **API token management** for secure external access
- **AI analysis triggers** for automated processing
- **Data export capabilities** for external integrations
- **Enhanced security** with comprehensive audit logging

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Readiness  │    │    Supabase     │    │   MCP Docker    │
│    Frontend     │────│   Local DB      │────│   Container     │
│  (Next.js App)  │    │  (PostgreSQL)   │    │  (Integration)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │              ┌─────────────────┐
         │                       │              │   External      │
         └───────────────────────────────────────│   AI Services   │
                                │              │  (via webhooks) │
                                │              └─────────────────┘
                       ┌─────────────────┐
                       │   MCP Webhooks  │
                       │   & API Tokens  │
                       └─────────────────┘
```

## Key Features

### 1. Enhanced Database Schema

The integration includes comprehensive tables for MCP functionality:

- **`api_tokens`**: Secure API access for external services
- **`mcp_webhooks`**: Webhook configuration and management
- **`activity_logs`**: Enhanced logging with MCP context
- **Enhanced survey tables**: AI analysis configuration and tracking

### 2. Real-time Event Processing

- Automatic webhook triggers on survey completion
- AI analysis result notifications
- Real-time data synchronization
- Event-driven architecture with PostgreSQL triggers

### 3. Security Features

- Row Level Security (RLS) policies for all tables
- Encrypted API token storage with SHA-256 hashing
- Webhook signature verification
- Rate limiting and access controls
- Comprehensive audit logging

### 4. AI Integration Ready

- Built-in support for LLM analysis workflows
- Token usage tracking and cost monitoring
- Model performance metrics
- Confidence scoring and quality assessment

## Configuration Files

### 1. `supabase/config.toml`

Enhanced Supabase configuration with MCP-specific settings:

```toml
[custom.mcp]
enabled = true
endpoint = "http://localhost:8000"
api_key_header = "X-MCP-API-KEY"
webhook_secret = "mcp-webhook-secret-ai-readiness-2024"
timeout = 30000
retry_attempts = 3

[custom.ai_readiness]
llm_analysis_enabled = true
voice_input_enabled = true
export_formats = ["json", "csv", "pdf"]
max_survey_responses = 10000
batch_processing_enabled = true
```

### 2. `.env.supabase.local`

Local environment configuration with all necessary variables:

```bash
# Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MCP Integration
MCP_ENABLED=true
MCP_ENDPOINT=http://localhost:8000
MCP_API_KEY=test-mcp-api-key-ai-readiness-2024
MCP_WEBHOOK_SECRET=mcp-webhook-secret-ai-readiness-2024

# AI/LLM Configuration
LLM_PROVIDER=openai
LLM_MODEL=gpt-4
LLM_API_KEY=sk-test-key-for-local-development
```

### 3. Database Schema (`migrations/00001_initial_schema.sql`)

Comprehensive database schema including:

- **Core tables**: profiles, organizations, surveys, responses
- **MCP tables**: api_tokens, mcp_webhooks, activity_logs
- **AI tables**: llm_analyses with enhanced tracking
- **Indexes**: Performance-optimized indexes for all queries
- **Triggers**: Automatic webhook and audit log generation
- **Functions**: Utility functions for MCP integration

## Setup Instructions

### 1. Quick Setup

Run the setup script to configure everything automatically:

```bash
chmod +x scripts/setup-supabase-mcp.sh
./scripts/setup-supabase-mcp.sh
```

### 2. Manual Setup

1. **Start Docker MCP Container**:
   ```bash
   cd docker/mcp-supabase
   docker-compose up -d
   ```

2. **Wait for Services**:
   ```bash
   # Wait for Supabase API
   curl http://localhost:54321/health
   
   # Wait for PostgreSQL
   pg_isready -h localhost -p 54322 -U postgres
   ```

3. **Run Migrations**:
   ```bash
   docker exec mcp-supabase-container psql \
     -h localhost -p 5432 -U postgres -d postgres \
     -f /app/supabase-host/migrations/00001_initial_schema.sql
   ```

4. **Verify Setup**:
   ```bash
   node scripts/test-supabase-mcp.js
   ```

## Testing

### 1. Integration Test Suite

The comprehensive test suite validates all MCP functionality:

```bash
node scripts/test-supabase-mcp.js
```

**Test Coverage**:
- ✅ Supabase connection and authentication
- ✅ Database schema validation
- ✅ MCP endpoint connectivity
- ✅ Webhook creation and delivery
- ✅ API token generation and validation
- ✅ Survey workflow with AI analysis
- ✅ Real-time subscriptions
- ✅ Data export functionality

### 2. Manual Testing

**Test Webhook Delivery**:
```bash
curl -X POST http://localhost:8000/webhooks/ai-readiness \
  -H "Content-Type: application/json" \
  -H "X-MCP-Signature: sha256=..." \
  -d '{"event":"survey.completed","data":{...}}'
```

**Test API Access**:
```bash
curl -X GET http://localhost:54321/rest/v1/surveys \
  -H "apikey: YOUR_API_TOKEN" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

## Usage Examples

### 1. Create API Token

```javascript
const { data: token } = await supabase
  .from('api_tokens')
  .insert({
    user_id: user.id,
    organization_id: org.id,
    token_name: 'External Integration',
    token_hash: hashedToken,
    permissions: {
      read: ['surveys', 'responses'],
      write: ['surveys'],
      admin: []
    }
  });
```

### 2. Configure Webhook

```javascript
const { data: webhook } = await supabase
  .from('mcp_webhooks')
  .insert({
    organization_id: org.id,
    webhook_url: 'https://your-service.com/webhooks',
    webhook_secret: 'your-secret',
    events: ['survey.completed', 'analysis.finished']
  });
```

### 3. Trigger AI Analysis

```javascript
const { data: analysis } = await supabase
  .from('llm_analyses')
  .insert({
    survey_id: survey.id,
    analysis_type: 'sentiment',
    results: aiResults,
    model_used: 'gpt-4',
    tokens_used: 150,
    confidence_score: 0.85
  });
```

## Monitoring and Maintenance

### 1. Health Checks

- **Supabase API**: `http://localhost:54321/health`
- **PostgreSQL**: `pg_isready -h localhost -p 54322`
- **MCP Container**: `docker logs mcp-supabase-container`

### 2. Log Monitoring

```bash
# Container logs
docker logs mcp-supabase-container --tail=100 -f

# Database logs
psql -h localhost -p 54322 -U postgres -d postgres \
  -c "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50;"
```

### 3. Performance Monitoring

```sql
-- Monitor webhook delivery success rates
SELECT 
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE last_success_at IS NOT NULL) as successful,
  COUNT(*) FILTER (WHERE last_failure_at IS NOT NULL) as failed
FROM mcp_webhooks;

-- Monitor API token usage
SELECT 
  token_name,
  last_used_at,
  COUNT(*) as request_count
FROM api_tokens t
JOIN activity_logs l ON t.id = l.api_token_id
GROUP BY t.id, token_name, last_used_at;
```

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Check if Docker container is running: `docker ps`
   - Verify port mapping: Supabase API should be on 54321

2. **Database Migration Fails**:
   - Check PostgreSQL logs: `docker logs mcp-supabase-container`
   - Verify migration file exists and is readable

3. **Webhook Delivery Fails**:
   - Check webhook URL accessibility
   - Verify webhook secret matches
   - Review signature generation

4. **API Token Invalid**:
   - Ensure token is properly hashed with SHA-256
   - Check token permissions match required access
   - Verify token hasn't expired

### Debug Commands

```bash
# Check service status
./scripts/setup-supabase-mcp.sh status

# View container logs
./scripts/setup-supabase-mcp.sh logs

# Restart services
./scripts/setup-supabase-mcp.sh restart

# Run test suite
./scripts/setup-supabase-mcp.sh test
```

## Security Considerations

1. **API Token Security**:
   - Tokens are stored as SHA-256 hashes
   - Implement proper rate limiting
   - Regularly rotate tokens

2. **Webhook Security**:
   - Always verify webhook signatures
   - Use HTTPS in production
   - Implement proper retry logic

3. **Database Security**:
   - RLS policies protect all data access
   - Audit logs track all operations
   - Regular security updates

## Production Deployment

When deploying to production:

1. **Update Environment Variables**:
   - Use production Supabase instance
   - Configure real webhook endpoints
   - Set proper JWT secrets

2. **SSL/TLS Configuration**:
   - Enable HTTPS for all endpoints
   - Configure SSL certificates
   - Update webhook URLs to HTTPS

3. **Monitoring Setup**:
   - Configure log aggregation
   - Set up alerting for failures
   - Monitor performance metrics

4. **Backup Strategy**:
   - Regular database backups
   - Webhook configuration backup
   - API token management

## Support

For issues or questions regarding the MCP integration:

1. Check the test results: `test-results/supabase-mcp-integration-report.json`
2. Review container logs: `docker logs mcp-supabase-container`
3. Run the diagnostic script: `node scripts/test-supabase-mcp.js`
4. Consult the troubleshooting section above

## Version History

- **v2.0.0**: Initial MCP integration with comprehensive testing
- **v2.0.1**: Enhanced webhook delivery and retry logic
- **v2.0.2**: Added API token management and security improvements