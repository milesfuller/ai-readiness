-- Migration Tracking System
-- This should be the FIRST migration run on any database
-- It creates a table to track which migrations have been applied

-- Create schema migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
  ON public.schema_migrations(applied_at DESC);

-- Helper function to check if migration has been applied
CREATE OR REPLACE FUNCTION migration_exists(migration_version VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.schema_migrations 
    WHERE version = migration_version
  );
END;
$$ LANGUAGE plpgsql;

-- Helper function to record migration
CREATE OR REPLACE FUNCTION record_migration(
  migration_version VARCHAR,
  migration_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.schema_migrations (version, description)
  VALUES (migration_version, migration_description)
  ON CONFLICT (version) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Record this migration
SELECT record_migration('000_migration_tracking', 'Migration tracking system');

-- Create a view to see migration status
CREATE OR REPLACE VIEW migration_status AS
SELECT 
  version,
  description,
  applied_at,
  execution_time_ms,
  CASE 
    WHEN applied_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'Recent'
    WHEN applied_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'This Month'
    ELSE 'Older'
  END as age_category
FROM public.schema_migrations
ORDER BY applied_at DESC;