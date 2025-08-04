# Supabase Test Instance Setup

This directory contains the complete Supabase test instance configuration for the AI Readiness application. The test instance provides a local, isolated environment optimized for testing with no rate limits and relaxed security policies.

## 🚀 Quick Start

### 1. Start Test Instance
```bash
npm run supabase:start
# OR
./supabase/start-test-instance.sh
```

### 2. Run Tests
```bash
npm run test:supabase
```

### 3. Stop Test Instance
```bash
npm run supabase:stop
```

## 📋 Available Scripts

### Instance Management
- `npm run supabase:start` - Start the complete Supabase test stack
- `npm run supabase:stop` - Stop and clean up test containers
- `npm run supabase:reset` - Reset database to clean state
- `npm run supabase:logs` - View container logs
- `npm run supabase:studio` - Open Supabase Studio UI

### Testing
- `npm run test:supabase` - Run all Supabase integration tests
- `npm run test:supabase:watch` - Watch mode for test development
- `npm run test:db` - Database-specific tests only
- `npm run test:auth` - Authentication-specific tests only
- `npm run test:integration:full` - Full integration test (start → test → stop)

## 🏗️ Architecture

### Docker Services
The test instance includes all Supabase services:

- **Kong** (API Gateway) - `localhost:54321`
- **Supabase Studio** - `localhost:54323`
- **PostgreSQL Database** - `localhost:54322`
- **GoTrue Auth** - Internal service
- **PostgREST API** - Internal service
- **Realtime** - Internal service
- **Storage** - Internal service
- **Email UI (Inbucket)** - `localhost:54324`

### Database Schema
- **Test-optimized migration** - More permissive RLS policies
- **Comprehensive seed data** - Organizations, users, surveys, responses
- **Performance indexes** - Optimized for test queries
- **Auto-reset functions** - Quick cleanup between tests

## 🧪 Test Environment Features

### No Rate Limiting
- Authentication attempts unlimited
- API requests unlimited
- Perfect for automated testing

### Relaxed Security
- More permissive RLS policies for testing
- Easy data access across tests
- Simplified auth requirements

### Fast Reset
- Quick database cleanup between tests
- Automated seed data restoration
- Isolated test runs

### Mock-Ready
- Test-specific environment variables
- Mock LLM API keys configured
- Predictable test data

## 📊 Test Data

### Pre-seeded Organizations
```javascript
- Acme Corporation (Large Tech)
- StartupXYZ (Small Startup) 
- Enterprise Ltd (Large Enterprise)
```

### Sample Surveys
- AI Readiness Assessment 2024 (Comprehensive)
- Quick AI Pulse Check (Startup-focused)

### Test Users
Users are created dynamically during tests with configurable:
- Email/password
- Profile data
- Organization membership
- Roles and permissions

## 🔧 Configuration Files

### Core Configuration
- `config.toml` - Supabase service configuration
- `docker-compose.test.yml` - Complete Docker stack
- `kong.yml` - API Gateway routing
- `.env.test` - Test environment variables

### Database
- `migrations/20240803000001_test_schema.sql` - Database schema
- `seeds/test_data.sql` - Sample data
- `setup-database.sql` - Production schema reference

### Testing
- `test-utils.ts` - Test helper utilities
- `test-setup.js` - Jest setup configuration
- `test-env.js` - Environment variable loader
- `jest.config.test.js` - Jest configuration

## 🎯 Test Utilities

### SupabaseTestHelper Class
```typescript
import { testHelper } from './supabase/test-utils'

// Create test users
const user = await testHelper.createTestUser({
  email: 'test@example.com',
  password: 'TestPass123!',
  profile: { first_name: 'Test', last_name: 'User' }
})

// Create organizations
const org = await testHelper.createTestOrganization({
  name: 'Test Org',
  industry: 'Technology'
})

// Add users to organizations
await testHelper.addUserToOrganization(user.id, org.id, 'admin')

// Create surveys
const survey = await testHelper.createTestSurvey(org.id, user.id)

// Authentication
await testHelper.signInAsUser(user.email, user.password)
await testHelper.signOut()

// Cleanup
await testHelper.resetTestData()
await testHelper.cleanup()
```

### Pre-built Test Scenarios
```typescript
import { testScenarios } from './supabase/test-utils'

// Basic user workflow
const { user, org, survey } = await testScenarios.basicUserWorkflow()

// Multi-user organization
const { users, org } = await testScenarios.multiUserOrganization()
```

## 🔍 Health Checks

The test instance includes comprehensive health monitoring:

```bash
# API Gateway
curl http://localhost:54321/health

# Auth Service  
curl http://localhost:54321/auth/v1/health

# REST API
curl http://localhost:54321/rest/v1/

# Database
docker exec supabase-db-test pg_isready -h localhost -p 5432 -U postgres
```

## 📈 Performance

### Optimizations for Testing
- Disabled fsync for faster writes
- Increased shared buffers
- Optimized checkpoint settings
- Memory-based temporary storage
- Reduced log verbosity

### Expected Performance
- Database operations: < 50ms
- Authentication: < 100ms
- API requests: < 200ms
- Test setup/teardown: < 2s

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Check Docker status
docker info

# Restart Docker service
sudo systemctl restart docker

# Clean up containers
docker system prune -f
```

#### Port Conflicts
```bash
# Check port usage
lsof -i :54321
lsof -i :54322
lsof -i :54323
lsof -i :54324

# Kill processes on ports
sudo kill -9 $(lsof -t -i:54321)
```

#### Database Connection Issues
```bash
# Check database logs
docker logs supabase-db-test

# Test direct connection
psql postgresql://postgres:postgres@localhost:54322/postgres

# Reset database
npm run supabase:reset
```

#### Test Failures
```bash
# Reset test environment
npm run supabase:stop
npm run supabase:start

# Run specific test
npm run test:supabase -- --testNamePattern="specific test"

# Debug mode
npm run test:supabase -- --verbose --no-cache
```

### Debug Mode
Enable debug logging by setting environment variables:
```bash
export DEBUG=supabase:*
export SUPABASE_DEBUG=true
npm run test:supabase
```

## 🔐 Security Notes

### Test Environment Only
This configuration is designed specifically for testing:
- Uses default/weak secrets
- Disables rate limiting
- Has permissive CORS settings
- Uses predictable JWT secrets

### Do NOT Use in Production
- Secrets are publicly visible
- Security policies are relaxed
- Performance optimizations may impact stability
- Debug features are enabled

## 📚 Additional Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)
- [Jest Integration Testing](https://jestjs.io/docs/testing-frameworks)

## 🤝 Contributing

When adding new tests:

1. Use the `testHelper` utilities
2. Clean up after each test
3. Use descriptive test names
4. Include both positive and negative test cases
5. Test error conditions and edge cases
6. Verify RLS policies work correctly
7. Check performance implications

Example test structure:
```typescript
describe('Feature Name', () => {
  beforeEach(async () => {
    // Setup test data
  })

  afterEach(async () => {
    // Clean up if needed
  })

  it('should handle success case', async () => {
    // Test implementation
  })

  it('should handle error case', async () => {
    // Error testing
  })

  it('should enforce security policies', async () => {
    // Security testing
  })
})
```