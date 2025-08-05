-- Test Database Initialization Script
-- This script sets up the test database with optimized settings for testing

-- Create necessary users and roles
DO $$
BEGIN
    -- Create service users if they don't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin WITH LOGIN PASSWORD 'postgres' SUPERUSER;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE ROLE supabase_auth_admin WITH LOGIN PASSWORD 'postgres';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE ROLE supabase_storage_admin WITH LOGIN PASSWORD 'postgres';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator WITH LOGIN PASSWORD 'postgres' NOINHERIT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role WITH NOLOGIN BYPASSRLS;
    END IF;
END
$$;

-- Grant necessary permissions
GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;

-- Create extensions needed by Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create auth schema and tables for GoTrue
CREATE SCHEMA IF NOT EXISTS auth;

-- Set up RLS policies for testing (permissive for test environment)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- Create storage schema and tables
CREATE SCHEMA IF NOT EXISTS storage;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA auth TO authenticator, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO authenticator, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated, service_role;

-- Set up realtime schema
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;

GRANT USAGE ON SCHEMA _realtime TO authenticator, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA realtime TO authenticator, anon, authenticated, service_role;

-- Performance optimizations for testing
-- Disable synchronous commit for faster tests (trade consistency for speed in test env)
ALTER SYSTEM SET synchronous_commit = 'off';
ALTER SYSTEM SET fsync = 'off';
ALTER SYSTEM SET full_page_writes = 'off';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Reload configuration
SELECT pg_reload_conf();

-- Create a test-specific database for isolation (optional)
-- CREATE DATABASE ai_readiness_test WITH OWNER postgres;

COMMENT ON DATABASE postgres IS 'AI Readiness Test Database - Optimized for fast testing with relaxed consistency';