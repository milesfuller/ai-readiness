-- Create custom types for our application
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superadmin');

-- Create the roles that Supabase requires
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Create authenticator role (used by PostgREST)
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'test_postgres_password';
GRANT anon, authenticated, service_role TO authenticator;

-- Create admin users for Supabase services
CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'test_postgres_password';
CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'test_postgres_password';
CREATE ROLE supabase_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'test_postgres_password';
CREATE ROLE supabase_realtime_admin NOINHERIT CREATEROLE LOGIN PASSWORD 'test_postgres_password';

-- Grant necessary permissions to admin roles
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_auth_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_storage_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_realtime_admin;

-- Create application-specific roles
CREATE ROLE app_user NOINHERIT;
CREATE ROLE app_admin NOINHERIT;

-- Grant permissions for application roles
GRANT authenticated TO app_user;
GRANT authenticated, app_user TO app_admin;

-- Set up Row Level Security policies (will be expanded in migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;