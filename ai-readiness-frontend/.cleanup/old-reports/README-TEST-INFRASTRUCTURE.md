# Test Infrastructure for AI Readiness Frontend

## 🎯 Overview

This document describes the complete test infrastructure setup for the AI Readiness Frontend project. The infrastructure provides a robust testing environment with local Supabase instances, rate limiting protection, and comprehensive CI/CD integration.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm
- PostgreSQL client (for validation)

### One-Command Setup

```bash
# Setup and validate entire test infrastructure
npm run test:infra
```

This command will:
1. Start the Supabase test infrastructure
2. Validate all services are running
3. Run the login redirect validation tests

### Manual Setup

```bash
# Start test infrastructure
npm run infra:setup

# Validate infrastructure
npm run infra:validate

# Run specific login redirect tests
npm run test:e2e:login

# Check infrastructure status
npm run infra:status

# Stop infrastructure
npm run infra:stop
```

## 📋 Infrastructure Components

### 1. Docker Compose Stack (`docker-compose.test.yml`)

Complete Supabase stack running locally:

- **PostgreSQL Database** (Port: 54322)
- **Kong API Gateway** (Port: 54321) 
- **GoTrue Auth Service** (Port: 9999)
- **PostgREST API** (Port: 3000)
- **Realtime Server** (Port: 4000)
- **Storage API** (Port: 5000)
- **Supabase Studio** (Port: 54323)
- **Analytics/Logflare** (Port: 4000)
- **Inbucket Email Testing** (Port: 54324)

### 2. Environment Configuration (`.env.test`)

Pre-configured environment variables for test environment:

```bash
# Supabase Test Instance
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<test_key>
SUPABASE_SERVICE_ROLE_KEY=<service_key>

# Database
POSTGRES_PASSWORD=test_postgres_password
DATABASE_URL=postgresql://postgres:test_postgres_password@localhost:54322/postgres

# Application
NODE_ENV=test
NEXTAUTH_URL=http://localhost:3000

# Rate Limiting (Disabled by default in tests)
ENABLE_RATE_LIMITING=false
RATE_LIMIT_MAX_REQUESTS=1000
```

### 3. Rate Limiting Handler (`lib/test-utils/rate-limit-handler.ts`)

Intelligent rate limiting with exponential backoff:

```typescript
import { TestRateLimitHandler } from '@/lib/test-utils/rate-limit-handler';

const handler = new TestRateLimitHandler({
  skipRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'true',
  maxRetries: 5,
  baseDelay: 1000,
});

await handler.executeWithRetry(async () => {
  return await fetch('/api/endpoint');
});
```

### 4. Playwright Configuration (Updated)

Optimized for test environment with:

- Sequential execution in CI to avoid rate limits
- Retry logic with exponential backoff
- Custom timeouts for test infrastructure
- Rate limit bypass headers

### 5. Test Fixtures (`e2e/fixtures/test-setup.ts`)

Comprehensive test utilities:

```typescript
import { test, expect } from './fixtures/test-setup';

test('my test', async ({ authenticatedPage, supabaseUtils }) => {
  // Pre-authenticated page ready to use
  await authenticatedPage.goto('/dashboard');
  
  // Supabase utilities with rate limiting
  await supabaseUtils.createTestUser('test@example.com', 'password');
});
```

## 🧪 Running Tests

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (for debugging)
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed

# Run specific login redirect tests
npm run test:e2e:login

# Debug mode
npm run test:e2e:debug
```

### Login Redirect Validation

The infrastructure includes comprehensive tests for the login redirect fix:

```bash
# Run login redirect validation
npm run test:e2e:login
```

Tests cover:
- ✅ Successful login redirects to dashboard
- ✅ Login errors handled gracefully
- ✅ Authenticated users redirected away from login
- ✅ Redirect URL preservation
- ✅ Concurrent login attempt handling
- ✅ Network error recovery

### Unit and Integration Tests

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# Security tests
npm run test:security

# All tests
npm run test:all
```

## 🔧 Infrastructure Management

### Status and Monitoring

```bash
# Check infrastructure status
npm run infra:status

# Validate all services
npm run infra:validate

# View service logs
npm run infra:logs

# Docker container status
docker-compose -f docker-compose.test.yml ps
```

### Service Endpoints

When infrastructure is running:

- **API Gateway**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323  
- **Database**: localhost:54322
- **Email Testing**: http://localhost:54324

### Troubleshooting

#### Common Issues

1. **Port Conflicts**
   ```bash
   # Stop any conflicting services
   npm run infra:stop
   
   # Check for port usage
   lsof -i :54321
   ```

2. **Database Connection Issues**
   ```bash
   # Validate database connection
   npm run infra:validate database
   
   # Check database logs
   docker logs supabase-db-test
   ```

3. **Rate Limiting Issues**
   ```bash
   # Disable rate limiting for tests
   echo "ENABLE_RATE_LIMITING=false" >> .env.local
   
   # Or wait for rate limit reset
   # Tests will automatically wait and retry
   ```

#### Debug Commands

```bash
# Validate only containers
node scripts/validate-test-infrastructure.js containers

# Validate only endpoints
node scripts/validate-test-infrastructure.js endpoints

# Full validation with detailed output
node scripts/validate-test-infrastructure.js validate
```

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The infrastructure includes a complete CI/CD workflow (`.github/workflows/test-infrastructure.yml`):

1. **Setup Phase**: Provision test environment
2. **Unit Tests**: Run with test database
3. **Integration Tests**: API and database integration
4. **E2E Tests**: Full application flow tests
5. **Security Tests**: Security scanning
6. **Performance Tests**: Performance validation
7. **Cleanup**: Resource cleanup

### Environment Variables for CI

```yaml
env:
  NODE_ENV: test
  PLAYWRIGHT_BASE_URL: http://localhost:3000
  CI: true
  GITHUB_ACTIONS: true
```

## 🛡️ Security Considerations

### Test Data Isolation

- Dedicated test database with isolated schemas
- Test user creation with cleanup procedures
- Automatic data cleanup after tests

### Rate Limiting Protection

- Built-in exponential backoff and retry logic
- Configurable rate limits for different test types
- Bypass mechanisms for test environments

### Environment Security

- Test-specific credentials (not production)
- Local-only access by default
- Automatic cleanup of sensitive test data

## 📊 Performance Monitoring

### Metrics Tracked

- Test execution time
- Service startup time
- Database query performance
- API response times
- Rate limit hit rates

### Optimization Tips

1. **Parallel Execution**: Disabled in CI to prevent rate limiting
2. **Connection Pooling**: Configured for optimal database performance
3. **Caching**: Docker layer caching for faster builds
4. **Resource Limits**: Optimized for test workloads

## 📚 Available Scripts Reference

### Infrastructure Commands

| Command | Description |
|---------|-------------|
| `npm run infra:setup` | Start complete test infrastructure |
| `npm run infra:stop` | Stop and cleanup infrastructure |
| `npm run infra:restart` | Restart infrastructure |
| `npm run infra:status` | Show infrastructure status |
| `npm run infra:validate` | Validate all services |
| `npm run infra:logs` | View service logs |

### Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:infra` | Complete infrastructure test |
| `npm run test:e2e:login` | Login redirect validation |
| `npm run test:e2e` | All E2E tests |
| `npm run test:e2e:ui` | E2E tests with UI |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests only |

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run env:test` | Copy test environment |
| `npm run env:cleanup` | Cleanup environment files |

## 🔮 Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Screenshot comparison tests
2. **Load Testing**: Performance under load
3. **Multi-Environment**: Staging and production-like environments  
4. **Advanced Monitoring**: Real-time metrics dashboard
5. **Test Data Management**: Advanced seeding and fixtures

### Contributing

When adding new tests or infrastructure components:

1. Update relevant documentation
2. Add validation to health check scripts
3. Include in CI/CD pipeline
4. Test rate limiting scenarios
5. Verify cleanup procedures

## 📞 Support

For infrastructure issues:

1. Check this documentation
2. Run validation scripts
3. Review service logs
4. Check GitHub Issues
5. Contact the development team

---

**Last Updated**: 2025-08-03  
**Infrastructure Version**: 1.0.0  
**Orchestrator**: Test Infrastructure Orchestrator  
**Swarm ID**: swarm_1754252346990_2xzw1ve7c