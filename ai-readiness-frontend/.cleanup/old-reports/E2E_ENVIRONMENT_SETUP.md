# E2E Test Environment Setup Guide

Complete setup and configuration guide for end-to-end testing infrastructure.

## 🚀 Quick Start

```bash
# 1. Setup complete test environment
npm run test:e2e:env:setup

# 2. Validate environment is ready
npm run test:e2e:env:validate

# 3. Run E2E tests
npm run test:e2e

# 4. Cleanup (optional)
docker-compose -f docker-compose.e2e.yml down
```

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 18+ 
- npm or yarn
- Git (for version control)

### System Requirements
- RAM: 4GB minimum, 8GB recommended
- Disk: 2GB free space for Docker images
- Ports: 3000, 3001, 6379, 54321-54326 available

## 🏗️ Architecture Overview

The E2E test environment consists of:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Playwright     │    │   Mock Server   │
│   (port 3000)   │◄──►│   Test Runner   │◄──►│   (port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Services                              │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│   PostgreSQL    │   Supabase API  │     Redis       │  Email    │
│   (port 54322)  │   (port 54321)  │   (port 6379)   │  Testing  │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

## 📁 Environment Configuration

### .env.test File Structure

```bash
# Environment identification
NODE_ENV=test
ENVIRONMENT=test

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Supabase Configuration (Local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Redis Configuration
REDIS_URL=redis://localhost:6379/1

# Rate Limiting (Disabled for tests)
ENABLE_RATE_LIMITING=false
```

### Key Configuration Points

1. **PLAYWRIGHT_BASE_URL**: Essential for Playwright to know where to find the app
2. **Local Supabase**: Using local instance to avoid external dependencies
3. **Disabled Rate Limiting**: Prevents test failures due to throttling
4. **Test-specific credentials**: Isolated from production

## 🐳 Docker Services

### Core Services

| Service | Port | Purpose | Health Check |
|---------|------|---------|--------------|
| PostgreSQL | 54322 | Database | `pg_isready` |
| Supabase API | 54321 | API Gateway | `/health` endpoint |
| PostgREST | 54324 | REST API | Root endpoint |
| Auth Service | 54325 | Authentication | `/health` endpoint |
| Storage Service | 54326 | File storage | Service status |
| Redis | 6379 | Caching/Sessions | `PING` command |
| Mock Server | 3001 | External API mocking | `/mockserver/status` |
| Email Testing | 54325 | Email capture | Web interface |

### Service Dependencies

```
PostgreSQL (Base)
    ├── PostgREST (depends on DB)
    ├── Auth Service (depends on DB)
    └── Storage Service (depends on DB + PostgREST)
            └── Supabase API Gateway (depends on all above)
```

## 🛠️ Setup Scripts

### setup-e2e-environment.sh

Comprehensive environment setup with:
- Docker service orchestration
- Health checks for all services
- Database initialization
- Service connectivity validation

```bash
./scripts/setup-e2e-environment.sh
```

### validate-e2e-environment.sh

Environment validation including:
- Configuration checks
- Service health verification
- API endpoint testing
- Database connectivity
- Permission validation

```bash
./scripts/validate-e2e-environment.sh
```

## 🧪 Testing Workflow

### Standard Testing Flow

```bash
# 1. Environment Setup
npm run test:e2e:env:setup

# 2. Validation
npm run test:e2e:env:validate

# 3. Run specific test suites
npm run test:e2e:auth           # Authentication flows
npm run test:e2e:ui             # UI/UX testing
npm run test:e2e:api            # API integration tests

# 4. Full test suite
npm run test:e2e:full
```

### Available npm Scripts

| Script | Purpose |
|--------|---------|
| `test:e2e:env:setup` | Complete environment setup |
| `test:e2e:env:validate` | Validate environment readiness |
| `test:e2e` | Run all E2E tests |
| `test:e2e:ui` | Run tests with UI |
| `test:e2e:debug` | Debug mode |
| `test:e2e:headed` | Run with browser visible |
| `test:e2e:full` | Setup → Test → Cleanup |

## 🔍 Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000,3001,6379,54321,54322

# Stop conflicting services
docker-compose -f docker-compose.e2e.yml down
```

#### Database Connection Issues
```bash
# Test database directly
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres

# Check database logs
docker-compose -f docker-compose.e2e.yml logs supabase-db
```

#### Service Health Issues
```bash
# Check all service status
docker-compose -f docker-compose.e2e.yml ps

# Restart specific service
docker-compose -f docker-compose.e2e.yml restart [service-name]
```

### Debug Commands

```bash
# View service logs
docker-compose -f docker-compose.e2e.yml logs -f

# Check service health
curl http://localhost:54321/health
curl http://localhost:3001/mockserver/status

# Database connectivity test
nc -zv localhost 54322

# Redis connectivity test
redis-cli -p 6379 ping
```

## 📊 Performance Considerations

### Resource Allocation

- **Memory**: Each service needs ~100-200MB
- **CPU**: Multi-core recommended for parallel testing
- **Disk**: Docker volumes require ~1GB space

### Optimization Tips

1. **Parallel Testing**: Limited workers in CI (`workers: 1`)
2. **Retry Logic**: Built-in exponential backoff
3. **Cleanup**: Automatic cleanup between test runs
4. **Caching**: Redis for session/state management

## 🔒 Security Considerations

### Test Data Isolation

- Separate database instance
- Test-only JWT tokens
- Isolated file storage
- Sandboxed email testing

### Credential Management

- No production credentials in test files
- Cryptographically secure test secrets
- Proper file permissions (600 for .env.test)
- Isolated network for Docker services

## 📈 Monitoring & Analytics

### Health Monitoring

The environment includes built-in health checks:
- Service availability monitoring
- Database connection pooling
- API response time tracking
- Resource usage monitoring

### Test Metrics

- Test execution time
- Success/failure rates
- Coverage reporting
- Performance benchmarks

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
- name: Setup E2E Environment
  run: npm run test:e2e:env:setup

- name: Validate Environment
  run: npm run test:e2e:env:validate

- name: Run E2E Tests
  run: npm run test:e2e

- name: Cleanup
  if: always()
  run: docker-compose -f docker-compose.e2e.yml down
```

### Environment Variables for CI

```bash
CI=true
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=60000
NODE_ENV=test
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Testing](https://nextjs.org/docs/testing)

## 🆘 Support

For issues or improvements:
1. Check this documentation
2. Run validation script: `npm run test:e2e:env:validate`
3. Check service logs: `docker-compose -f docker-compose.e2e.yml logs`
4. Create issue with reproduction steps

---

**Note**: This environment is designed for testing only. Never use these configurations in production.