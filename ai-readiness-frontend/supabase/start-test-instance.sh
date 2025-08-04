#!/bin/bash

# Start Supabase Test Instance
# This script starts a local Supabase instance optimized for testing

set -e

echo "🚀 Starting Supabase Test Instance..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Set script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p auth
mkdir -p storage
mkdir -p postgres_data
mkdir -p init

# Create init script for database setup
cat > init/01-setup.sql << 'EOF'
-- Initial database setup for Supabase test instance
-- This runs before migrations

-- Create necessary roles and users
DO $$
BEGIN
  -- Create roles if they don't exist
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN CREATEDB CREATEROLE;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin LOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END
$$;

-- Set passwords
ALTER USER supabase_admin PASSWORD 'postgres';
ALTER USER supabase_auth_admin PASSWORD 'postgres';
ALTER USER supabase_storage_admin PASSWORD 'postgres';
ALTER USER authenticator PASSWORD 'postgres';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO authenticator;

-- Grant role memberships
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS _analytics;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant permissions on schemas
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
GRANT ALL ON SCHEMA public TO supabase_admin;
GRANT ALL ON SCHEMA realtime TO supabase_admin;
GRANT ALL ON SCHEMA _analytics TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" SCHEMA extensions;

EOF

# Create PostgreSQL configuration
cat > postgresql.conf << 'EOF'
# PostgreSQL configuration for Supabase test instance
listen_addresses = '*'
port = 5432
max_connections = 100
shared_buffers = 128MB
dynamic_shared_memory_type = posix
log_timezone = 'UTC'
datestyle = 'iso, mdy'
timezone = 'UTC'
lc_messages = 'en_US.utf8'
lc_monetary = 'en_US.utf8'
lc_numeric = 'en_US.utf8'
lc_time = 'en_US.utf8'
default_text_search_config = 'pg_catalog.english'

# Enable logical replication for realtime
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

# Performance tuning for tests
fsync = off
synchronous_commit = off
checkpoint_segments = 32
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_cache_size = 512MB
EOF

# Create Vector configuration
cat > vector.yml << 'EOF'
data_dir: /var/lib/vector/
api:
  enabled: true
  address: 0.0.0.0:9001
sources:
  docker_host:
    type: docker_logs
    docker_host: unix:///var/run/docker.sock
    include_containers:
      - supabase-db-test
      - supabase-auth-test
      - supabase-rest-test
      - supabase-realtime-test
      - supabase-storage-test
sinks:
  logflare_logs:
    type: http
    inputs:
      - docker_host
    uri: http://analytics:4000/api/logs?source=*
    method: post
    healthcheck_uri: http://analytics:4000/health
    headers:
      X-API-KEY: your-super-secret-and-long-logflare-key
      Content-Type: application/json
    encoding:
      codec: json
    batch:
      max_bytes: 1048576
    request:
      retry_attempts: 3
EOF

# Check if docker-compose is available
COMPOSE_CMD="docker compose"
if ! command -v "docker-compose" > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
    echo "❌ Neither 'docker-compose' nor 'docker compose' is available."
    exit 1
elif command -v "docker-compose" > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
fi

echo "📦 Using Docker Compose command: $COMPOSE_CMD"

# Stop any existing containers
echo "🛑 Stopping any existing test containers..."
$COMPOSE_CMD -f docker-compose.test.yml down --remove-orphans --volumes || true

# Start the services
echo "🚀 Starting Supabase services..."
$COMPOSE_CMD -f docker-compose.test.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if $COMPOSE_CMD -f docker-compose.test.yml ps --format json | jq -r '.[].Health' | grep -q "unhealthy"; then
        echo "⏳ Services starting... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    else
        break
    fi
done

# Check if all services are running
echo "🔍 Checking service status..."
$COMPOSE_CMD -f docker-compose.test.yml ps

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout=60
counter=0
until docker exec supabase-db-test pg_isready -h localhost -p 5432 -U postgres; do
    sleep 2
    counter=$((counter + 2))
    if [ $counter -ge $timeout ]; then
        echo "❌ Database failed to start within $timeout seconds"
        exit 1
    fi
done

# Run migrations
echo "📊 Running database migrations..."
if [ -f "migrations/20240803000001_test_schema.sql" ]; then
    docker exec -i supabase-db-test psql -U postgres -d postgres < migrations/20240803000001_test_schema.sql
    echo "✅ Schema migration completed"
else
    echo "⚠️  Migration file not found, skipping..."
fi

# Run seed data
echo "🌱 Seeding test data..."
if [ -f "seeds/test_data.sql" ]; then
    docker exec -i supabase-db-test psql -U postgres -d postgres < seeds/test_data.sql
    echo "✅ Test data seeded"
else
    echo "⚠️  Seed file not found, skipping..."
fi

# Final health check
echo "🏥 Performing final health check..."
sleep 5

# Check Kong (API Gateway)
if curl -s -f http://localhost:54321/health > /dev/null; then
    echo "✅ API Gateway (Kong) is healthy"
else
    echo "⚠️  API Gateway health check failed"
fi

# Check Auth service
if curl -s -f http://localhost:54321/auth/v1/health > /dev/null; then
    echo "✅ Auth service is healthy"
else
    echo "⚠️  Auth service health check failed"
fi

# Check REST API
if curl -s -f http://localhost:54321/rest/v1/ > /dev/null; then
    echo "✅ REST API is healthy"
else
    echo "⚠️  REST API health check failed"
fi

echo ""
echo "🎉 Supabase Test Instance is ready!"
echo ""
echo "📊 Service URLs:"
echo "  • API Gateway: http://localhost:54321"
echo "  • Supabase Studio: http://localhost:54323"
echo "  • Database: postgresql://postgres:postgres@localhost:54322/postgres"
echo "  • Email UI (Inbucket): http://localhost:54324"
echo ""
echo "🔑 Test Credentials:"
echo "  • Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
echo "  • Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
echo ""
echo "🧪 To run tests:"
echo "  npm run test -- --env=test"
echo ""
echo "🛑 To stop the test instance:"
echo "  $COMPOSE_CMD -f docker-compose.test.yml down --volumes"
echo ""