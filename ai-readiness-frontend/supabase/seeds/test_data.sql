-- Test Seed Data for AI Readiness Application
-- This populates the database with test data for comprehensive testing

-- Insert test organizations
INSERT INTO public.organizations (id, name, description, industry, size, website, settings) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'A large technology company focused on AI innovation', 'Technology', 'Large', 'https://acme.example.com', '{"theme": "corporate", "features": ["advanced_analytics", "custom_branding"]}'),
  ('22222222-2222-2222-2222-222222222222', 'StartupXYZ', 'An innovative startup building the future', 'Startup', 'Small', 'https://startupxyz.example.com', '{"theme": "modern", "features": ["basic_analytics"]}'),
  ('33333333-3333-3333-3333-333333333333', 'Enterprise Ltd', 'Global enterprise with AI transformation goals', 'Enterprise', 'Large', 'https://enterprise.example.com', '{"theme": "professional", "features": ["advanced_analytics", "white_label", "sso"]}');

-- Note: Test users will be created via Supabase Auth API during test setup
-- This ensures proper auth.users entries and profile creation via triggers

-- Test survey templates
INSERT INTO public.surveys (id, organization_id, title, description, questions, settings, status, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'AI Readiness Assessment 2024', 'Comprehensive assessment of organizational AI readiness', '[
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "What is your current level of AI adoption?",
      "options": ["No adoption", "Pilot projects", "Limited deployment", "Widespread deployment"],
      "required": true
    },
    {
      "id": "q2", 
      "type": "rating",
      "question": "How would you rate your organization''s data maturity?",
      "scale": 5,
      "required": true
    },
    {
      "id": "q3",
      "type": "text",
      "question": "What are your biggest challenges in AI adoption?",
      "required": false
    },
    {
      "id": "q4",
      "type": "multiple_select",
      "question": "Which AI technologies are you most interested in?",
      "options": ["Machine Learning", "Natural Language Processing", "Computer Vision", "Robotics", "Predictive Analytics"],
      "required": true
    }
  ]'::jsonb, '{"allowAnonymous": false, "requireAllQuestions": false, "voiceEnabled": true, "timeLimit": 1800}', 'active', '00000000-0000-0000-0000-000000000001'),
  
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Quick AI Pulse Check', 'Fast assessment for startup teams', '[
    {
      "id": "q1",
      "type": "rating",
      "question": "How AI-ready do you feel your team is?",
      "scale": 10,
      "required": true
    },
    {
      "id": "q2",
      "type": "multiple_choice", 
      "question": "What''s your primary AI goal?",
      "options": ["Automation", "Insights", "Customer Experience", "Product Enhancement"],
      "required": true
    }
  ]'::jsonb, '{"allowAnonymous": true, "requireAllQuestions": true, "voiceEnabled": false}', 'active', '00000000-0000-0000-0000-000000000002');

-- Test survey responses (will be populated after users are created)
-- Sample responses that match the survey questions above
INSERT INTO public.survey_responses (id, survey_id, respondent_id, answers, metadata, completion_time) VALUES
  ('rrrrrr01-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', '{
    "q1": "Limited deployment",
    "q2": 4,
    "q3": "Lack of skilled personnel and data quality issues",
    "q4": ["Machine Learning", "Predictive Analytics"]
  }', '{"browser": "Chrome", "os": "Windows", "location": "US"}', 1245),
  
  ('rrrrrr02-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000002', '{
    "q1": "Pilot projects", 
    "q2": 3,
    "q3": "Budget constraints and unclear ROI",
    "q4": ["Natural Language Processing", "Computer Vision"]
  }', '{"browser": "Firefox", "os": "macOS", "location": "CA"}', 892),
  
  ('rrrrrr03-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000003', '{
    "q1": 8,
    "q2": "Product Enhancement"
  }', '{"browser": "Safari", "os": "macOS", "location": "US"}', 156);

-- Test LLM analyses
INSERT INTO public.llm_analyses (id, survey_id, analysis_type, results, model_used, tokens_used) VALUES
  ('llllllll-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'sentiment_analysis', '{
    "overall_sentiment": "cautiously_optimistic",
    "themes": ["skills_gap", "data_quality", "budget_concerns"],
    "recommendations": ["Invest in training", "Improve data governance", "Start with high-ROI use cases"],
    "confidence": 0.85
  }', 'gpt-4-turbo', 1250),
  
  ('llllllll-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'readiness_score', '{
    "overall_score": 6.2,
    "categories": {
      "data_maturity": 5.5,
      "technical_capability": 6.8, 
      "organizational_readiness": 6.0,
      "leadership_support": 7.1
    },
    "strengths": ["Strong technical team", "Leadership buy-in"],
    "areas_for_improvement": ["Data quality", "Change management"]
  }', 'claude-3-sonnet', 890);

-- Test activity logs
INSERT INTO public.activity_logs (user_id, organization_id, action, resource_type, resource_id, details, ip_address, user_agent) VALUES
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'survey_created', 'survey', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"survey_title": "AI Readiness Assessment 2024"}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'survey_response_submitted', 'survey_response', 'rrrrrr02-2222-2222-2222-222222222222', '{"completion_time": 892}', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'llm_analysis_generated', 'llm_analysis', 'llllllll-1111-1111-1111-111111111111', '{"analysis_type": "sentiment_analysis", "tokens_used": 1250}', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- Create test user accounts function (to be called from application tests)
CREATE OR REPLACE FUNCTION create_test_user(
  user_email TEXT,
  user_password TEXT,
  first_name TEXT DEFAULT 'Test',
  last_name TEXT DEFAULT 'User',
  org_id UUID DEFAULT NULL,
  user_role TEXT DEFAULT 'member'
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This would typically be called via Supabase Auth API
  -- This function exists for reference but actual user creation should use auth API
  RAISE NOTICE 'Test user creation should use Supabase Auth API: %', user_email;
  RETURN uuid_generate_v4();
END;
$$ LANGUAGE plpgsql;

-- Reset function for tests
CREATE OR REPLACE FUNCTION reset_test_data() RETURNS void AS $$
BEGIN
  -- Delete in reverse dependency order
  DELETE FROM public.activity_logs;
  DELETE FROM public.llm_analyses;
  DELETE FROM public.survey_responses;
  DELETE FROM public.surveys;
  DELETE FROM public.organization_members;
  DELETE FROM public.profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%example%'
  );
  
  -- Re-insert seed data
  INSERT INTO public.organizations (id, name, description, industry, size, website, settings) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'A large technology company focused on AI innovation', 'Technology', 'Large', 'https://acme.example.com', '{"theme": "corporate", "features": ["advanced_analytics", "custom_branding"]}'),
    ('22222222-2222-2222-2222-222222222222', 'StartupXYZ', 'An innovative startup building the future', 'Startup', 'Small', 'https://startupxyz.example.com', '{"theme": "modern", "features": ["basic_analytics"]}'),
    ('33333333-3333-3333-3333-333333333333', 'Enterprise Ltd', 'Global enterprise with AI transformation goals', 'Enterprise', 'Large', 'https://enterprise.example.com', '{"theme": "professional", "features": ["advanced_analytics", "white_label", "sso"]}')
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Test data reset completed';
END;
$$ LANGUAGE plpgsql;