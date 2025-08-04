-- AI Readiness MCP Integration Schema
-- Enhanced migration with MCP integration support
-- Version: 2.0.0 - MCP Integration Ready

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
CREATE EXTENSION IF NOT EXISTS "ltree";   -- For hierarchical data

-- Drop existing tables if they exist (for clean migration)
DROP TRIGGER IF EXISTS create_profile_on_signup_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_profile_on_signup();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS notify_mcp_webhook();

-- Clean up existing tables
DROP TABLE IF EXISTS public.mcp_webhooks CASCADE;
DROP TABLE IF EXISTS public.api_tokens CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.llm_analyses CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.surveys CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with MCP integration fields
CREATE TABLE public.profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  avatar TEXT,
  department TEXT,
  job_title TEXT,
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "notifications": true,
    "voiceInput": false,
    "language": "en",
    "mcpIntegration": {
      "enabled": true,
      "webhooks": true,
      "apiAccess": false
    }
  }'::jsonb,
  mcp_settings JSONB DEFAULT '{
    "allowWebhooks": true,
    "apiRateLimit": 1000,
    "dataExportPermissions": ["own", "organization"]
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create organizations table with MCP integration
CREATE TABLE public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  size TEXT CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
  website TEXT,
  logo TEXT,
  settings JSONB DEFAULT '{
    "privacy": {
      "dataRetention": 365,
      "allowExternalIntegrations": true,
      "requireDataProcessingConsent": true
    },
    "mcp": {
      "enabled": true,
      "webhookEndpoint": null,
      "apiAccessLevel": "organization",
      "allowBulkExport": true
    }
  }'::jsonb,
  mcp_config JSONB DEFAULT '{
    "webhooks": {
      "onSurveyComplete": false,
      "onResponseAnalysis": false,
      "onDataExport": true
    },
    "apiKeys": [],
    "integrations": {}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  permissions JSONB DEFAULT '{
    "surveys": ["read"],
    "responses": ["read"],
    "analytics": ["read"],
    "mcp": ["read"]
  }'::jsonb,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

-- Create surveys table with enhanced AI/MCP features
CREATE TABLE public.surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "allowAnonymous": false,
    "requireAllQuestions": true,
    "voiceEnabled": true,
    "aiAnalysisEnabled": true,
    "mcpIntegration": {
      "enableWebhooks": false,
      "autoAnalyze": true,
      "exportOnComplete": false
    }
  }'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'archived')),
  ai_config JSONB DEFAULT '{
    "analysisTypes": ["sentiment", "themes", "recommendations"],
    "modelPreferences": {"provider": "openai", "model": "gpt-4"},
    "processingSchedule": "on_completion"
  }'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create survey_responses table with enhanced tracking
CREATE TABLE public.survey_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL, -- For anonymous responses
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{
    "userAgent": null,
    "ipAddress": null,
    "location": null,
    "deviceType": null,
    "startedAt": null,
    "completedAt": null
  }'::jsonb,
  voice_data JSONB DEFAULT '{}'::jsonb, -- Store voice recording metadata
  completion_time INTEGER, -- in seconds
  quality_score DECIMAL(3,2), -- AI-generated quality score
  ai_flags JSONB DEFAULT '{}'::jsonb, -- AI-detected patterns/issues
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  mcp_processed BOOLEAN DEFAULT false
);

-- Create llm_analyses table with enhanced tracking
CREATE TABLE public.llm_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  response_id UUID REFERENCES public.survey_responses(id),
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'sentiment', 'themes', 'recommendations', 'jtbd', 'persona', 
    'competitive_analysis', 'feature_requests', 'pain_points',
    'custom'
  )),
  results JSONB NOT NULL,
  model_used TEXT NOT NULL,
  model_version TEXT,
  tokens_used INTEGER,
  processing_time INTEGER, -- in milliseconds
  confidence_score DECIMAL(3,2),
  cost_usd DECIMAL(10,4),
  mcp_webhook_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create API tokens table for MCP integration
CREATE TABLE public.api_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  token_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{
    "read": ["surveys", "responses"],
    "write": [],
    "admin": []
  }'::jsonb,
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create MCP webhooks table
CREATE TABLE public.mcp_webhooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['survey.completed', 'analysis.finished'],
  is_active BOOLEAN DEFAULT true,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create activity_logs table with MCP tracking
CREATE TABLE public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  mcp_context JSONB DEFAULT '{}'::jsonb, -- MCP-specific context
  ip_address INET,
  user_agent TEXT,
  api_token_id UUID REFERENCES public.api_tokens(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comprehensive indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_role ON public.organization_members(role);
CREATE INDEX idx_surveys_organization_id ON public.surveys(organization_id);
CREATE INDEX idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_published_at ON public.surveys(published_at);
CREATE INDEX idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_respondent_id ON public.survey_responses(respondent_id);
CREATE INDEX idx_survey_responses_session_id ON public.survey_responses(session_id);
CREATE INDEX idx_survey_responses_submitted_at ON public.survey_responses(submitted_at);
CREATE INDEX idx_survey_responses_mcp_processed ON public.survey_responses(mcp_processed);
CREATE INDEX idx_llm_analyses_survey_id ON public.llm_analyses(survey_id);
CREATE INDEX idx_llm_analyses_response_id ON public.llm_analyses(response_id);
CREATE INDEX idx_llm_analyses_analysis_type ON public.llm_analyses(analysis_type);
CREATE INDEX idx_llm_analyses_created_at ON public.llm_analyses(created_at);
CREATE INDEX idx_api_tokens_user_id ON public.api_tokens(user_id);
CREATE INDEX idx_api_tokens_organization_id ON public.api_tokens(organization_id);
CREATE INDEX idx_api_tokens_token_hash ON public.api_tokens(token_hash);
CREATE INDEX idx_api_tokens_is_active ON public.api_tokens(is_active);
CREATE INDEX idx_mcp_webhooks_organization_id ON public.mcp_webhooks(organization_id);
CREATE INDEX idx_mcp_webhooks_is_active ON public.mcp_webhooks(is_active);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_organization_id ON public.activity_logs(organization_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX idx_activity_logs_api_token_id ON public.activity_logs(api_token_id);

-- Full-text search indexes
CREATE INDEX idx_surveys_title_search ON public.surveys USING gin(to_tsvector('english', title));
CREATE INDEX idx_surveys_description_search ON public.surveys USING gin(to_tsvector('english', description));

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Enhanced for MCP integration

-- Profiles - Users can access their own profile and organization members
CREATE POLICY "Users can access own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Organization members can view each other" ON public.profiles
  FOR SELECT USING (
    user_id IN (
      SELECT om.user_id FROM public.organization_members om
      WHERE om.organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Organizations - Members can access their organizations
CREATE POLICY "Organization members can access organization" ON public.organizations
  FOR ALL USING (
    id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Organization members - Users can view memberships of their organizations
CREATE POLICY "Users can access organization memberships" ON public.organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Surveys - Organization members can access surveys
CREATE POLICY "Organization members can access surveys" ON public.surveys
  FOR ALL USING (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Survey responses - Respondents and organization members can access
CREATE POLICY "Respondents can access own responses" ON public.survey_responses
  FOR ALL USING (auth.uid() = respondent_id);

CREATE POLICY "Organization members can access responses" ON public.survey_responses
  FOR SELECT USING (
    survey_id IN (
      SELECT s.id FROM public.surveys s
      JOIN public.organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- LLM analyses - Organization members can access
CREATE POLICY "Organization members can access analyses" ON public.llm_analyses
  FOR ALL USING (
    survey_id IN (
      SELECT s.id FROM public.surveys s
      JOIN public.organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- API tokens - Users can manage their own tokens
CREATE POLICY "Users can manage own tokens" ON public.api_tokens
  FOR ALL USING (auth.uid() = user_id);

-- MCP webhooks - Organization admins can manage webhooks
CREATE POLICY "Organization admins can manage webhooks" ON public.mcp_webhooks
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Activity logs - Users can view logs related to them or their organizations
CREATE POLICY "Users can view related activity logs" ON public.activity_logs
  FOR SELECT USING (
    auth.uid() = user_id OR
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- MCP webhook notification function
CREATE OR REPLACE FUNCTION notify_mcp_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_record RECORD;
  payload JSONB;
BEGIN
  -- Build webhook payload
  payload := jsonb_build_object(
    'event', TG_ARGV[0],
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'data', row_to_json(NEW),
    'timestamp', CURRENT_TIMESTAMP
  );

  -- Send to all active webhooks for the organization
  IF NEW.organization_id IS NOT NULL THEN
    FOR webhook_record IN 
      SELECT * FROM public.mcp_webhooks 
      WHERE organization_id = NEW.organization_id 
      AND is_active = true
      AND TG_ARGV[0] = ANY(events)
    LOOP
      -- Insert webhook delivery job (would be processed by background worker)
      INSERT INTO public.activity_logs (
        organization_id, action, resource_type, resource_id, details, mcp_context
      ) VALUES (
        webhook_record.organization_id,
        'webhook.queued',
        TG_TABLE_NAME,
        NEW.id,
        payload,
        jsonb_build_object(
          'webhook_id', webhook_record.id,
          'webhook_url', webhook_record.webhook_url,
          'event', TG_ARGV[0]
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create MCP webhook triggers
CREATE TRIGGER survey_mcp_webhook AFTER INSERT OR UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION notify_mcp_webhook('survey.changed');

CREATE TRIGGER response_mcp_webhook AFTER INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION notify_mcp_webhook('response.submitted');

CREATE TRIGGER analysis_mcp_webhook AFTER INSERT ON public.llm_analyses
  FOR EACH ROW EXECUTE FUNCTION notify_mcp_webhook('analysis.completed');

-- Create profile on user signup with enhanced data
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, first_name, last_name, email, preferences, mcp_settings
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'firstName', 'Test'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', 'User'),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->'preferences',
      '{
        "theme": "dark",
        "notifications": true,
        "voiceInput": false,
        "language": "en",
        "mcpIntegration": {
          "enabled": true,
          "webhooks": true,
          "apiAccess": false
        }
      }'::jsonb
    ),
    '{
      "allowWebhooks": true,
      "apiRateLimit": 1000,
      "dataExportPermissions": ["own"]
    }'::jsonb
  );
  
  -- Log the signup
  INSERT INTO public.activity_logs (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    NEW.id,
    'user.signup',
    'profiles',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'signup_method', COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic profile creation
CREATE TRIGGER create_profile_on_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Enhanced test permissions for MCP integration
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Create test data for MCP integration
INSERT INTO public.organizations (name, description, industry, size, settings) VALUES
('Test Organization', 'Organization for MCP integration testing', 'Technology', 'startup', '{
  "privacy": {
    "dataRetention": 365,
    "allowExternalIntegrations": true,
    "requireDataProcessingConsent": false
  },
  "mcp": {
    "enabled": true,
    "webhookEndpoint": "http://localhost:8000/webhooks/ai-readiness",
    "apiAccessLevel": "organization",
    "allowBulkExport": true
  }
}'::jsonb);

-- Create test survey
INSERT INTO public.surveys (
  organization_id, 
  title, 
  description, 
  questions, 
  settings,
  status,
  created_by
) VALUES (
  (SELECT id FROM public.organizations WHERE name = 'Test Organization'),
  'MCP Integration Test Survey',
  'Test survey for validating MCP integration functionality',
  '[
    {
      "id": "q1",
      "type": "text",
      "question": "What is your primary pain point with current AI tools?",
      "required": true
    },
    {
      "id": "q2", 
      "type": "scale",
      "question": "How ready is your organization for AI adoption?",
      "scale": {"min": 1, "max": 10},
      "required": true
    }
  ]'::jsonb,
  '{
    "allowAnonymous": true,
    "requireAllQuestions": true,
    "voiceEnabled": true,
    "aiAnalysisEnabled": true,
    "mcpIntegration": {
      "enableWebhooks": true,
      "autoAnalyze": true,
      "exportOnComplete": true
    }
  }'::jsonb,
  'active',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Add MCP integration comments
COMMENT ON TABLE public.api_tokens IS 'API tokens for MCP integration and external access';
COMMENT ON TABLE public.mcp_webhooks IS 'Webhook configurations for MCP integration';
COMMENT ON COLUMN public.survey_responses.mcp_processed IS 'Flag indicating if response has been processed by MCP integration';
COMMENT ON COLUMN public.llm_analyses.mcp_webhook_sent IS 'Flag indicating if webhook notification was sent for this analysis';