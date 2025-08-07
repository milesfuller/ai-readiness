-- Production State Baseline
-- This represents the current state of your production Supabase database
-- Used to initialize test database to match production

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auth schema (minimal version for testing)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table (as it exists in production)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  settings JSONB DEFAULT '{"allowSelfRegistration": false}'::jsonb,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active'
);

-- Schema migrations table
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER
);

-- Other tables as they exist in production
CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  survey_id UUID REFERENCES public.surveys(id),
  session_id TEXT,
  responses JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_session_id ON public.survey_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_user_id ON public.survey_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_session_responses_session_id ON public.survey_session_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_org_id ON public.survey_responses(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_survey_templates_category ON public.survey_templates(category);

-- Migration function
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

-- RLS Policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_session_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

-- Simple policies
CREATE POLICY "allow_all" ON public.organizations FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.onboarding_progress FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.survey_sessions FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.survey_session_responses FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.survey_responses FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.invitations FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.survey_templates FOR ALL USING (true);
CREATE POLICY "allow_all" ON public.surveys FOR ALL USING (true);

-- Record existing migrations
INSERT INTO public.schema_migrations (version, description) VALUES 
  ('000_migration_tracking', 'Migration tracking system'),
  ('001_invitations_schema', 'Invitations system'),
  ('20240101000005_onboarding_tables', 'Onboarding tables'),
  ('20240807_survey_system', 'Survey system'),
  ('20241207_organization_settings', 'Organization settings'),
  ('20250107_survey_templates', 'Survey templates')
ON CONFLICT (version) DO NOTHING;