/**
 * Migration SQL content embedded as strings
 * This allows migrations to be included in the production build
 * without requiring filesystem access or SQL file imports
 */

export const MIGRATION_CONTENT: Record<string, string> = {
  '000_migration_tracking.sql': `
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
`,

  '000_exec_migration_function.sql': `
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
`,

  // For other migrations, we'll just include the critical table creation parts
  // Full migrations should be run manually in Supabase for production
  '001_invitations_schema.sql': `
-- Invitations System
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
`,

  '20240101000005_onboarding_tables.sql': `
-- Onboarding System
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_step VARCHAR(50) DEFAULT 'welcome',
  completed_steps JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_progress(user_id);
`,

  '20240807_survey_system.sql': `
-- Survey System
CREATE TABLE IF NOT EXISTS public.survey_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  survey_id UUID REFERENCES public.surveys(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_question_index INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.survey_session_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.survey_sessions(session_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  answer TEXT NOT NULL,
  input_method TEXT DEFAULT 'text',
  time_spent INTEGER DEFAULT 0,
  confidence_score INTEGER,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_sessions_session_id ON public.survey_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_session_responses_session_id ON public.survey_session_responses(session_id);
`,

  '20241207_organization_settings.sql': `
-- Organization Settings
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "allowSelfRegistration": false,
  "defaultRole": "member",
  "requireEmailVerification": true,
  "dataRetentionDays": 365,
  "enableAuditLogs": false,
  "enable2FA": false,
  "enableSSO": false
}'::jsonb;

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';
`,

  '20250107_survey_templates.sql': `
-- Survey Templates
CREATE TABLE IF NOT EXISTS public.survey_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_survey_templates_category ON public.survey_templates(category);
CREATE INDEX IF NOT EXISTS idx_survey_templates_organization ON public.survey_templates(organization_id);
`
}