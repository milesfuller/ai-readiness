-- JWT utilities for Supabase test environment
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to extract claims from JWT token
CREATE OR REPLACE FUNCTION auth.jwt_extract_claims(token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  header jsonb;
  payload jsonb;
  signature text;
  parts text[];
BEGIN
  -- Split JWT into parts
  SELECT string_to_array(token, '.') INTO parts;
  
  IF array_length(parts, 1) != 3 THEN
    RAISE EXCEPTION 'Invalid JWT format';
  END IF;
  
  -- Decode header (we don't validate in test environment)
  BEGIN
    SELECT convert_from(decode(replace(replace(parts[1], '-', '+'), '_', '/') || repeat('=', (4 - length(parts[1]) % 4) % 4), 'base64'), 'utf8')::jsonb INTO header;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid JWT header';
  END;
  
  -- Decode payload
  BEGIN
    SELECT convert_from(decode(replace(replace(parts[2], '-', '+'), '_', '/') || repeat('=', (4 - length(parts[2]) % 4) % 4), 'base64'), 'utf8')::jsonb INTO payload;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid JWT payload';
  END;
  
  RETURN payload;
END;
$$;

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Function to get current user role from JWT
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
    'anon'
  )::text
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION auth.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.role() = required_role
$$;

-- Function to get user email from JWT
CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.email', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'email')
  )::text
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth.jwt_extract_claims(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.has_role(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.email() TO anon, authenticated, service_role;