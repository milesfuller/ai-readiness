-- Create a function to execute migration SQL
-- This is needed because Supabase JS client can't execute raw SQL directly
-- SECURITY: This function should only be callable by service role

CREATE OR REPLACE FUNCTION exec_migration(
  migration_sql TEXT,
  migration_version VARCHAR(255)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  error_message TEXT;
  error_detail TEXT;
BEGIN
  -- Check if migration already exists
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = migration_version) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Migration already applied',
      'version', migration_version
    );
  END IF;

  -- Execute the migration SQL
  BEGIN
    EXECUTE migration_sql;
    
    -- Record successful migration
    INSERT INTO schema_migrations (version, description, applied_at)
    VALUES (migration_version, 'Applied via exec_migration function', NOW())
    ON CONFLICT (version) DO NOTHING;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Migration applied successfully',
      'version', migration_version
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Capture error details
    GET STACKED DIAGNOSTICS 
      error_message = MESSAGE_TEXT,
      error_detail = PG_EXCEPTION_DETAIL;
    
    RETURN json_build_object(
      'success', false,
      'message', error_message,
      'detail', error_detail,
      'version', migration_version
    );
  END;
END;
$$;

-- Restrict function to service role only
REVOKE ALL ON FUNCTION exec_migration FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_migration FROM anon;
REVOKE ALL ON FUNCTION exec_migration FROM authenticated;

-- Note: Service role has full access by default