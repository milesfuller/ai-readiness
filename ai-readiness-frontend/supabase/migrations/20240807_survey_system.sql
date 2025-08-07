-- Survey System Migration
-- Creates survey_sessions and survey_responses tables for working survey system
-- Date: 2024-08-07

-- Create survey_sessions table
CREATE TABLE IF NOT EXISTS public.survey_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  survey_id UUID REFERENCES public.surveys(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_question_index INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in seconds
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create survey_responses table for individual answers
CREATE TABLE IF NOT EXISTS public.survey_session_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.survey_sessions(session_id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  answer TEXT NOT NULL,
  input_method TEXT DEFAULT 'text' CHECK (input_method IN ('text', 'voice')),
  time_spent INTEGER DEFAULT 0,
  confidence_score INTEGER,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_sessions_session_id ON public.survey_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_user_id ON public.survey_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_status ON public.survey_sessions(status);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_started_at ON public.survey_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_survey_session_responses_session_id ON public.survey_session_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_session_responses_question_id ON public.survey_session_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_session_responses_created_at ON public.survey_session_responses(created_at);

-- Enable Row Level Security
ALTER TABLE public.survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_session_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_sessions
CREATE POLICY "Users can access own survey sessions" ON public.survey_sessions
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = survey_sessions.organization_id 
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- RLS Policies for survey_session_responses
CREATE POLICY "Users can access own session responses" ON public.survey_session_responses
  FOR ALL USING (
    session_id IN (
      SELECT session_id FROM public.survey_sessions 
      WHERE user_id = auth.uid()
    ) OR
    session_id IN (
      SELECT ss.session_id FROM public.survey_sessions ss
      JOIN public.organization_members om ON ss.organization_id = om.organization_id
      WHERE om.user_id = auth.uid() 
      AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_survey_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_survey_sessions_updated_at 
  BEFORE UPDATE ON public.survey_sessions
  FOR EACH ROW EXECUTE FUNCTION update_survey_session_updated_at();

CREATE TRIGGER update_survey_session_responses_updated_at 
  BEFORE UPDATE ON public.survey_session_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON public.survey_sessions TO authenticated;
GRANT ALL ON public.survey_session_responses TO authenticated;
GRANT ALL ON public.survey_sessions TO anon;
GRANT ALL ON public.survey_session_responses TO anon;

-- Insert a default survey for the AI Readiness Assessment
INSERT INTO public.surveys (
  title,
  description,
  status,
  questions,
  settings,
  created_by,
  organization_id
) VALUES (
  'AI Readiness Assessment',
  'Comprehensive AI readiness evaluation using Jobs-to-be-Done framework',
  'active',
  '[]'::jsonb, -- Questions will be loaded dynamically from frontend
  '{
    "allowAnonymous": true,
    "requireAllQuestions": true,
    "voiceEnabled": true,
    "aiAnalysisEnabled": true
  }'::jsonb,
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM public.organizations LIMIT 1)
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.survey_sessions IS 'Survey session tracking with progress and metadata';
COMMENT ON TABLE public.survey_session_responses IS 'Individual question responses within survey sessions';