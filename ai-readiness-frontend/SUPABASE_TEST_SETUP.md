# 🧪 Supabase Test Instance - Quick Setup Guide

## ✅ Complete Test Infrastructure Ready

The Supabase test instance has been fully configured for the AI Readiness application with:

### 🏗️ Infrastructure Components
- **Docker Compose Stack** - Complete Supabase services locally
- **Test Database Schema** - Optimized for testing with relaxed RLS policies
- **Seed Data** - Organizations, surveys, users, and responses
- **Test Utilities** - Comprehensive helper functions for test creation
- **Integration Tests** - Database and authentication test suites

### 🚀 Quick Start Commands

```bash
# Start the complete test stack
npm run supabase:start

# Run all Supabase tests
npm run test:supabase

# Stop the test stack
npm run supabase:stop
```

### 📊 Service URLs (When Running)
- **API Gateway**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323  
- **PostgreSQL**: postgresql://postgres:postgres@localhost:54322/postgres
- **Email UI**: http://localhost:54324

### 🔑 Test Credentials
```
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

### 🧪 Test Features
- **No Rate Limits** - Perfect for automated testing
- **Fast Reset** - Quick cleanup between test runs
- **Comprehensive Seed Data** - Ready-to-use test scenarios
- **Mock-Ready Environment** - Test credentials configured
- **Performance Optimized** - Fast database operations

### 📁 Key Files Created
```
supabase/
├── docker-compose.test.yml     # Complete Docker stack
├── config.toml                 # Supabase configuration
├── kong.yml                    # API Gateway routing
├── start-test-instance.sh      # Setup script
├── reset-test-db.sh           # Reset script
├── test-utils.ts              # Test helper utilities
├── migrations/                # Database schema
│   └── 20240803000001_test_schema.sql
├── seeds/                     # Test data
│   └── test_data.sql
└── README.md                  # Complete documentation

__tests__/supabase/            # Integration tests
├── database.test.ts           # Database functionality tests
└── auth.test.ts              # Authentication tests

.env.test                      # Test environment variables
jest.config.test.js           # Jest test configuration
```

### 🎯 Usage Examples

#### Basic Test Setup
```typescript
import { testHelper } from './supabase/test-utils'

// Create test user
const user = await testHelper.createTestUser({
  email: 'test@example.com',
  password: 'TestPass123!'
})

// Create organization  
const org = await testHelper.createTestOrganization({
  name: 'Test Company'
})

// Add user to organization
await testHelper.addUserToOrganization(user.id, org.id, 'admin')

// Sign in as user
await testHelper.signInAsUser(user.email, user.password)
```

#### Available Test Scenarios
```typescript
import { testScenarios } from './supabase/test-utils'

// Basic workflow (user + org + survey)
const { user, org, survey } = await testScenarios.basicUserWorkflow()

// Multi-user organization (5 users with different roles)
const { users, org } = await testScenarios.multiUserOrganization()
```

### 🔧 Maintenance Commands
```bash
# View logs
npm run supabase:logs

# Reset database to clean state
npm run supabase:reset

# Open Supabase Studio
npm run supabase:studio

# Run specific test types
npm run test:db        # Database tests only
npm run test:auth      # Authentication tests only

# Full integration test cycle
npm run test:integration:full
```

### ⚡ Performance Expectations
- Database operations: < 50ms
- Authentication: < 100ms  
- API requests: < 200ms
- Test setup/teardown: < 2s
- Full test suite: < 30s

### 🛡️ Security Notes
**FOR TESTING ONLY** - This configuration:
- Uses default/weak secrets
- Disables rate limiting
- Has permissive security policies
- Should NEVER be used in production

### 📋 Next Steps
1. **Start the test instance**: `npm run supabase:start`
2. **Verify it's working**: `npm run test:supabase`
3. **Begin development**: Use test utilities in your tests
4. **Integration**: Connect with your application tests

### 🆘 Need Help?
- Check `supabase/README.md` for detailed documentation
- View logs with `npm run supabase:logs`
- Reset environment with `npm run supabase:reset`

---

**✅ The Supabase test instance is now ready for comprehensive testing!**