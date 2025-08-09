-- Secure the schema_migrations table with proper RLS policies
-- This is CRITICAL for security - prevents unauthorized access to migration history

-- Enable RLS on schema_migrations table
ALTER TABLE IF EXISTS schema_migrations ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Schema migrations are read-only for authenticated users" ON schema_migrations;
DROP POLICY IF EXISTS "Only service role can modify schema migrations" ON schema_migrations;
DROP POLICY IF EXISTS "Service role has full access to schema migrations" ON schema_migrations;

-- Create restrictive policies
-- Only service role can read migration data (not even authenticated users)
CREATE POLICY "Service role can read schema migrations"
ON schema_migrations FOR SELECT
TO service_role
USING (true);

-- Only service role can insert migration records
CREATE POLICY "Service role can insert schema migrations"
ON schema_migrations FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can update migration records
CREATE POLICY "Service role can update schema migrations"
ON schema_migrations FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Only service role can delete migration records (for rollbacks)
CREATE POLICY "Service role can delete schema migrations"
ON schema_migrations FOR DELETE
TO service_role
USING (true);

-- Revoke all permissions from public and authenticated roles
REVOKE ALL ON schema_migrations FROM public;
REVOKE ALL ON schema_migrations FROM authenticated;
REVOKE ALL ON schema_migrations FROM anon;

-- Grant necessary permissions only to service role
GRANT ALL ON schema_migrations TO service_role;

-- Add a comment explaining the security model
COMMENT ON TABLE schema_migrations IS 'Migration tracking table - RESTRICTED ACCESS. Only service_role can access this table. This prevents unauthorized users from viewing or modifying migration history.';

-- Create an audit log table for migration changes (optional but recommended)
CREATE TABLE IF NOT EXISTS migration_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    migration_version TEXT,
    executed_by TEXT DEFAULT current_user,
    executed_at TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

-- Enable RLS on audit log
ALTER TABLE migration_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit log
CREATE POLICY "Service role only access to migration audit log"
ON migration_audit_log
TO service_role
USING (true)
WITH CHECK (true);

-- Revoke all permissions from other roles
REVOKE ALL ON migration_audit_log FROM public;
REVOKE ALL ON migration_audit_log FROM authenticated;
REVOKE ALL ON migration_audit_log FROM anon;

-- Grant permissions to service role
GRANT ALL ON migration_audit_log TO service_role;

-- Create trigger to audit migration changes
CREATE OR REPLACE FUNCTION audit_migration_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO migration_audit_log (action, migration_version, details)
        VALUES ('INSERT', NEW.version, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO migration_audit_log (action, migration_version, details)
        VALUES ('UPDATE', NEW.version, jsonb_build_object('old', OLD, 'new', NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO migration_audit_log (action, migration_version, details)
        VALUES ('DELETE', OLD.version, to_jsonb(OLD));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on schema_migrations
DROP TRIGGER IF EXISTS migration_audit_trigger ON schema_migrations;
CREATE TRIGGER migration_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON schema_migrations
FOR EACH ROW EXECUTE FUNCTION audit_migration_changes();

-- Verify RLS is enabled (will throw error if not)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'schema_migrations' 
        AND rowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS is not enabled on schema_migrations table!';
    END IF;
END $$;