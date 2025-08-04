# Test Infrastructure Architecture

## Overview

This document describes the complete test infrastructure architecture for the AI Readiness Frontend application. The infrastructure is designed to provide a local, isolated, and fast testing environment that closely mirrors production while optimizing for test execution speed.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Infrastructure                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Frontend  │    │    Kong     │    │   Studio    │         │
│  │  (Next.js)  │    │  Gateway    │    │   (Debug)   │         │
│  │ localhost:  │    │ localhost:  │    │ localhost:  │         │
│  │    3000     │    │    8000     │    │    3010     │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│         │                   │                   │              │
│         └───────────────────┼───────────────────┘              │
│                             │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Supabase Services Layer                   │   │
│  │                                                         │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐  │   │
│  │  │   Auth    │ │   REST    │ │ Realtime  │ │Storage  │  │   │
│  │  │   API     │ │   API     │ │   API     │ │   API   │  │   │
│  │  │   :9999   │ │   :3001   │ │   :4000   │ │  :5000  │  │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                             │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Data Layer                               │   │
│  │                                                         │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐  │   │
│  │  │PostgreSQL │ │  Storage  │ │ Inbucket  │ │ImgProxy │  │   │
│  │  │ Database  │ │  Volume   │ │   Mail    │ │  Image  │  │   │
│  │  │  :54322   │ │   Files   │ │   :9000   │ │  :5001  │  │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Database Layer (PostgreSQL)

**Service**: `supabase-db`
**Port**: 54322 (external), 5432 (internal)
**Image**: `supabase/postgres:15.6.0.117`

**Features**:
- Optimized for testing with relaxed consistency settings
- Pre-configured with all necessary extensions (uuid-ossp, pgcrypto, pgjwt)
- Automatic role and schema creation
- Health checks with retry logic
- Persistent volumes for data retention between test runs

**Performance Optimizations**:
```sql
-- Disabled for speed in test environment
synchronous_commit = 'off'
fsync = 'off'
full_page_writes = 'off'

-- Memory optimizations
shared_buffers = '256MB'
effective_cache_size = '1GB'
wal_buffers = '16MB'
```

### 2. Authentication Service (GoTrue)

**Service**: `supabase-auth`
**Port**: 9999
**Image**: `supabase/gotrue:v2.151.0`

**Features**:
- Disabled rate limiting for fast test execution
- Auto-confirmation for email verification
- Relaxed password requirements (min 6 chars)
- Disabled CAPTCHA verification
- Integration with test mail service (Inbucket)

**Test Optimizations**:
- JWT expiration: 1 hour (3600s)
- No signup restrictions
- Automatic email confirmation
- Disabled security features for testing

### 3. REST API Service (PostgREST)

**Service**: `supabase-rest`
**Port**: 3001
**Image**: `postgrest/postgrest:v12.0.1`

**Features**:
- Direct database connection with optimized pool settings
- Support for multiple schemas (public, storage, graphql_public)
- JWT authentication with test tokens
- Enhanced connection pooling for parallel tests

**Performance Settings**:
- Connection pool: 10 connections
- Max rows per request: 1000
- Ignore privileges mode for testing
- Fast acquisition timeout: 10s

### 4. Realtime Service

**Service**: `supabase-realtime`
**Port**: 4000
**Image**: `supabase/realtime:v2.25.50`

**Features**:
- WebSocket connections for real-time features
- Database change streaming
- Custom search path configuration
- Health check monitoring

### 5. Storage Service

**Service**: `supabase-storage`
**Port**: 5000
**Image**: `supabase/storage-api:v0.46.4`

**Features**:
- File upload/download capabilities
- Image transformation via ImgProxy
- Local filesystem backend for testing
- Integration with main REST API

**Configuration**:
- File size limit: 50MB
- Local file storage in Docker volume
- Image transformation enabled
- Test keys for authentication

### 6. Kong API Gateway (Optional)

**Service**: `kong`
**Port**: 8000 (proxy), 8001 (admin)
**Image**: `kong:2.8-alpine`

**Purpose**:
- Production-like API routing
- CORS handling
- Request/response transformation
- Rate limiting testing (when enabled)

**Features**:
- Declarative configuration
- Service discovery for all Supabase APIs
- Consumer-based authentication
- CORS policies for cross-origin requests

### 7. Supporting Services

#### Supabase Studio
- **Port**: 3010
- **Purpose**: Visual database management and debugging
- **Features**: Table editing, SQL editor, real-time data viewing

#### ImgProxy
- **Port**: 5001
- **Purpose**: Image transformation and optimization
- **Features**: WebP conversion, resizing, format conversion

#### Inbucket (Email Testing)
- **Port**: 9000 (web), 2500 (SMTP)
- **Purpose**: Email testing without external services
- **Features**: SMTP server, web interface for viewing emails

#### Meta Service
- **Port**: 8080
- **Purpose**: Database metadata for Studio
- **Features**: Schema introspection, table relationships

## Network Architecture

### Network Isolation
- Dedicated Docker network: `ai-readiness-test-network`
- Services communicate via internal container names
- External access only through mapped ports

### Service Discovery
```yaml
# Internal communication example
supabase-auth: http://supabase-auth:9999
supabase-rest: http://supabase-rest:3000
supabase-db: postgresql://supabase-db:5432
```

### External Access Points
```yaml
localhost:54322  # PostgreSQL Database
localhost:9999   # Auth API
localhost:3001   # REST API
localhost:4000   # Realtime API
localhost:5000   # Storage API
localhost:8000   # Kong Gateway (unified API)
localhost:3010   # Supabase Studio
localhost:9000   # Email Web Interface
```

## Security Configuration

### Test Environment Security
- **JWT Secret**: Fixed test secret for consistency
- **CORS**: Permissive settings for testing
- **Rate Limiting**: Disabled for fast test execution
- **CSRF Protection**: Disabled for API testing
- **SSL/TLS**: HTTP only (no certificates needed)

### Authentication Tokens
```bash
# Anon Key (public)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Service Role Key (private)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Data Management

### Volume Strategy
```yaml
volumes:
  supabase-test-db:     # PostgreSQL data persistence
  supabase-test-storage: # File storage persistence
```

### Data Lifecycle
1. **Initialization**: Database schema and seed data loaded on startup
2. **Test Execution**: Data isolation per test suite
3. **Cleanup**: Optional volume cleanup between runs
4. **Backup**: Snapshot capability for test data

### Test Data Seeding
- **Migrations**: Applied automatically from `supabase/migrations/`
- **Seeds**: Test data from `supabase/seeds/` and `docker/test-data/`
- **Sample Users**: Pre-created test accounts with known credentials

## Performance Characteristics

### Startup Times
- **Database**: ~10-15 seconds to healthy state
- **Auth Service**: ~5-8 seconds after database
- **REST API**: ~3-5 seconds after database
- **Full Stack**: ~20-30 seconds total startup

### Resource Usage
- **CPU**: ~2-4 cores during heavy testing
- **Memory**: ~2-4GB RAM for full stack
- **Storage**: ~1-2GB for containers + data volumes
- **Network**: Internal-only, minimal external traffic

### Scalability
- **Concurrent Tests**: Optimized for 2-4 parallel test workers
- **Database Connections**: Pool of 20 connections
- **File Storage**: Local filesystem, fast I/O
- **API Throughput**: 1000+ requests/second per service

## Monitoring and Health Checks

### Health Check Strategy
All services implement health checks with:
- **Interval**: 10-30 seconds
- **Timeout**: 5-10 seconds
- **Retries**: 3-5 attempts
- **Start Period**: 5-10 seconds grace period

### Health Check Endpoints
```bash
# Database
pg_isready -U postgres -d postgres

# Auth API
curl http://localhost:9999/health

# REST API
curl http://localhost:3001/

# Realtime
curl http://localhost:4000/

# Storage
curl http://localhost:5000/status
```

### Logging Strategy
- **Level**: Info/Debug for test environments
- **Output**: stdout/stderr for Docker logs
- **Aggregation**: Centralized via Docker Compose logs
- **Retention**: Session-based, cleaned up after tests

## Usage Patterns

### Local Development Testing
```bash
# Start infrastructure
./scripts/test-infrastructure.sh start

# Run specific test suite
./scripts/test-infrastructure.sh test integration

# Check service health
./scripts/test-infrastructure.sh health

# View logs for debugging
./scripts/test-infrastructure.sh logs supabase-auth
```

### CI/CD Integration
```bash
# Fast startup for CI
docker-compose -f docker-compose.test.yml up -d --wait

# Run tests with timeout
timeout 300 npm run test:ci

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Development Debugging
- **Studio Access**: http://localhost:3010 for visual database management
- **Email Testing**: http://localhost:9000 for viewing test emails
- **API Testing**: Direct service access for debugging individual components

## Configuration Management

### Environment Files
- `.env.test`: Main test configuration
- `docker-compose.test.yml`: Service definitions
- `docker-compose.override.test.yml`: Local development overrides

### Service Configuration
- `docker/kong.yml`: API gateway routing rules
- `docker/test-db-init.sql`: Database initialization
- `docker/test-data/`: Sample data for testing

### Application Integration
- `jest.config.test-infrastructure.js`: Test runner configuration
- Test utilities and fixtures for common operations
- Supabase client configuration for test environment

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Check for existing services on ports 54322, 9999, 3001, etc.
   - Use `netstat -tulpn` to identify conflicts
   - Modify ports in docker-compose.test.yml if needed

2. **Database Connection Issues**
   - Wait for health checks to pass
   - Check database logs: `docker logs ai-readiness-test-db`
   - Verify database initialization completed

3. **Auth Service Problems**
   - Check JWT secret configuration
   - Verify email service connectivity
   - Review auth service logs for detailed errors

4. **Performance Issues**
   - Monitor Docker resource usage
   - Adjust connection pool sizes
   - Consider reducing parallel test workers

### Debug Commands
```bash
# Check all service status
docker-compose -f docker-compose.test.yml ps

# View specific service logs
docker-compose -f docker-compose.test.yml logs -f supabase-auth

# Connect to database directly
docker exec -it ai-readiness-test-db psql -U postgres -d postgres

# Check network connectivity
docker network inspect ai-readiness-test-network
```

## Future Enhancements

### Planned Improvements
1. **Auto-scaling**: Dynamic resource allocation based on test load
2. **Caching Layer**: Redis integration for session and data caching
3. **Metrics Collection**: Prometheus/Grafana integration for monitoring
4. **Test Isolation**: Database per test suite for better isolation
5. **Snapshot Testing**: Faster test data reset using database snapshots

### Integration Opportunities
1. **GitHub Actions**: Automated infrastructure setup in CI
2. **Local Development**: Hot reloading and file watching
3. **Performance Testing**: Load testing infrastructure integration
4. **Security Testing**: Automated security scanning integration

## Conclusion

This test infrastructure provides a comprehensive, isolated, and performant environment for testing the AI Readiness Frontend application. It closely mirrors production while optimizing for test execution speed and developer productivity. The modular design allows for easy customization and scaling based on specific testing needs.