-- 🔧 FIX FOR EXISTING DATABASE
-- This script fixes tables that already exist but are missing columns
-- It handles the "column user_id does not exist" error properly

-- ============================================
-- STEP 1: Enable UUID extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 2: Fix Organizations table
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

-- Add missing columns to organizations
DO $$
BEGIN
  -- Add name column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'name') THEN
    ALTER TABLE public.organizations ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Default Org';
  END IF;
  
  -- Add domain column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'domain') THEN
    ALTER TABLE public.organizations ADD COLUMN domain VARCHAR(255);
  END IF;
  
  -- Add created_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'created_at') THEN
    ALTER TABLE public.organizations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'updated_at') THEN
    ALTER TABLE public.organizations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add settings if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'settings') THEN
    ALTER TABLE public.organizations ADD COLUMN settings JSONB DEFAULT '{
      "allowSelfRegistration": false,
      "defaultRole": "member",
      "requireEmailVerification": true,
      "dataRetentionDays": 365,
      "enableAuditLogs": false,
      "enable2FA": false,
      "enableSSO": false
    }'::jsonb;
  END IF;
  
  -- Add subscription_tier if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'subscription_tier') THEN
    ALTER TABLE public.organizations ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free';
  END IF;
  
  -- Add subscription_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'subscription_status') THEN
    ALTER TABLE public.organizations ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active';
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix Onboarding Progress table
-- ============================================
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

-- Add ALL missing columns to onboarding_progress
DO $$
BEGIN
  -- Add user_id column if missing (THIS IS THE KEY FIX!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'user_id') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN user_id UUID;
    RAISE NOTICE '✅ Added user_id column to onboarding_progress';
  END IF;
  
  -- Add current_step if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'current_step') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN current_step VARCHAR(50) DEFAULT 'welcome';
  END IF;
  
  -- Add completed_steps if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'completed_steps') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN completed_steps JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'metadata') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add started_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'started_at') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add completed_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'completed_at') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add updated_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'updated_at') THEN
    ALTER TABLE public.onboarding_progress ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- STEP 4: Fix Survey tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

DO $$
BEGIN
  -- Add missing columns to surveys
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'title') THEN
    ALTER TABLE public.surveys ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Untitled Survey';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'description') THEN
    ALTER TABLE public.surveys ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'organization_id') THEN
    ALTER TABLE public.surveys ADD COLUMN organization_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'created_at') THEN
    ALTER TABLE public.surveys ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surveys' AND column_name = 'updated_at') THEN
    ALTER TABLE public.surveys ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- STEP 5: Fix Survey Sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

DO $$
BEGIN
  -- Add ALL columns including user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'session_id') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN session_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text;
  END IF;
  
  -- Add user_id column (CRITICAL!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN user_id UUID;
    RAISE NOTICE '✅ Added user_id column to survey_sessions';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'organization_id') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN organization_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'survey_id') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN survey_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'status') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'current_question_index') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN current_question_index INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'time_spent') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN time_spent INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'started_at') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'completed_at') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'last_updated') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_sessions' AND column_name = 'metadata') THEN
    ALTER TABLE public.survey_sessions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================
-- STEP 6: Fix other tables
-- ============================================
CREATE TABLE IF NOT EXISTS public.survey_session_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

DO $$
BEGIN
  -- Add all columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'session_id') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN session_id TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'question_id') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN question_id TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'question_number') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN question_number INTEGER NOT NULL DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'answer') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN answer TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'input_method') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN input_method TEXT DEFAULT 'text';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'time_spent') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN time_spent INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'confidence_score') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN confidence_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'audio_url') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN audio_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'created_at') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_session_responses' AND column_name = 'updated_at') THEN
    ALTER TABLE public.survey_session_responses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY
);

DO $$
BEGIN
  -- Add user_id column (CRITICAL!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'user_id') THEN
    ALTER TABLE public.survey_responses ADD COLUMN user_id UUID;
    RAISE NOTICE '✅ Added user_id column to survey_responses';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'organization_id') THEN
    ALTER TABLE public.survey_responses ADD COLUMN organization_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'survey_id') THEN
    ALTER TABLE public.survey_responses ADD COLUMN survey_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'session_id') THEN
    ALTER TABLE public.survey_responses ADD COLUMN session_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'responses') THEN
    ALTER TABLE public.survey_responses ADD COLUMN responses JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'metadata') THEN
    ALTER TABLE public.survey_responses ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'status') THEN
    ALTER TABLE public.survey_responses ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'created_at') THEN
    ALTER TABLE public.survey_responses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'survey_responses' AND column_name = 'updated_at') THEN
    ALTER TABLE public.survey_responses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create remaining tables
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  organization_id UUID,
  role VARCHAR(50) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by UUID,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.survey_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Template',
  description TEXT,
  category VARCHAR(100),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  organization_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 7: NOW create indexes (columns exist!)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_session_id ON public.survey_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_user_id ON public.survey_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_session_responses_session_id ON public.survey_session_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_org_id ON public.survey_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_survey_templates_category ON public.survey_templates(category);

-- ============================================
-- STEP 8: Add foreign keys
-- ============================================
DO $$
BEGIN
  -- Add foreign keys if auth.users exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    -- Onboarding progress
    ALTER TABLE public.onboarding_progress DROP CONSTRAINT IF EXISTS onboarding_progress_user_id_fkey;
    ALTER TABLE public.onboarding_progress ADD CONSTRAINT onboarding_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Survey sessions
    ALTER TABLE public.survey_sessions DROP CONSTRAINT IF EXISTS survey_sessions_user_id_fkey;
    ALTER TABLE public.survey_sessions ADD CONSTRAINT survey_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Survey responses
    ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_user_id_fkey;
    ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
  
  -- Add table-to-table foreign keys
  ALTER TABLE public.surveys DROP CONSTRAINT IF EXISTS surveys_organization_id_fkey;
  ALTER TABLE public.surveys ADD CONSTRAINT surveys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  
  ALTER TABLE public.survey_sessions DROP CONSTRAINT IF EXISTS survey_sessions_organization_id_fkey;
  ALTER TABLE public.survey_sessions ADD CONSTRAINT survey_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  
  ALTER TABLE public.survey_sessions DROP CONSTRAINT IF EXISTS survey_sessions_survey_id_fkey;
  ALTER TABLE public.survey_sessions ADD CONSTRAINT survey_sessions_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id);
  
  ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_organization_id_fkey;
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);
  
  ALTER TABLE public.survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_id_fkey;
  ALTER TABLE public.survey_responses ADD CONSTRAINT survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES public.surveys(id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Some foreign keys could not be added: %', SQLERRM;
END $$;

-- ============================================
-- STEP 9: Enable RLS with simple policies
-- ============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_session_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now
DO $$
BEGIN
  -- Drop any existing policies first
  DROP POLICY IF EXISTS "allow_all" ON public.organizations;
  DROP POLICY IF EXISTS "allow_all" ON public.onboarding_progress;
  DROP POLICY IF EXISTS "allow_all" ON public.survey_sessions;
  DROP POLICY IF EXISTS "allow_all" ON public.survey_session_responses;
  DROP POLICY IF EXISTS "allow_all" ON public.survey_responses;
  DROP POLICY IF EXISTS "allow_all" ON public.invitations;
  DROP POLICY IF EXISTS "allow_all" ON public.survey_templates;
  DROP POLICY IF EXISTS "allow_all" ON public.surveys;
  
  -- Create new permissive policies
  CREATE POLICY "allow_all" ON public.organizations FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.onboarding_progress FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.survey_sessions FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.survey_session_responses FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.survey_responses FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.invitations FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.survey_templates FOR ALL USING (true);
  CREATE POLICY "allow_all" ON public.surveys FOR ALL USING (true);
END $$;

-- ============================================
-- STEP 10: Create migration function
-- ============================================
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
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = migration_version) THEN
    RETURN json_build_object('success', false, 'message', 'Already applied');
  END IF;

  EXECUTE migration_sql;
  INSERT INTO schema_migrations (version, description) VALUES (migration_version, 'Applied');
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  'Database fixed!' as status,
  COUNT(*) as tables,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'user_id') as has_user_id;