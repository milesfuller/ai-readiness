-- ============================================================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ============================================================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- Survey sessions indexes
CREATE INDEX IF NOT EXISTS idx_survey_sessions_token ON survey_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_user ON survey_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_sessions_org ON survey_sessions(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_sessions_status ON survey_sessions(status);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_completed ON survey_sessions(is_completed);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_activity ON survey_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_survey_sessions_expires ON survey_sessions(expires_at) WHERE status = 'in_progress';

-- Survey responses indexes
CREATE INDEX IF NOT EXISTS idx_survey_responses_session ON survey_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_input_method ON survey_responses(input_method);
CREATE INDEX IF NOT EXISTS idx_survey_responses_quality ON survey_responses(response_quality);

-- Analysis indexes
CREATE INDEX IF NOT EXISTS idx_response_analysis_response ON response_analysis(response_id);
CREATE INDEX IF NOT EXISTS idx_response_analysis_force ON response_analysis(primary_jtbd_force);
CREATE INDEX IF NOT EXISTS idx_response_analysis_scores ON response_analysis(force_strength_score, confidence_score);
CREATE INDEX IF NOT EXISTS idx_response_analysis_sentiment ON response_analysis(sentiment_score);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON audit_log(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(created_at);

-- API usage indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage_log(usage_date);
CREATE INDEX IF NOT EXISTS idx_api_usage_org ON api_usage_log(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage_log(service_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin' FROM profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is org admin for specific org
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin' OR (role = 'org_admin' AND organization_id = org_id))
    FROM profiles 
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations RLS policies
CREATE POLICY "Users can view their organization" ON organizations
FOR SELECT USING (
  id IN (SELECT organization_id FROM profiles WHERE user_id = auth.uid())
  OR is_admin()
);

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (user_id = auth.uid());

-- Survey sessions RLS policies
CREATE POLICY "Role-based survey sessions access" ON survey_sessions
FOR SELECT USING (
  -- Users can see their own sessions
  user_id = auth.uid()
  OR
  -- Org admins can see sessions from their organization
  (organization_id IS NOT NULL AND is_org_admin(organization_id))
  OR
  -- System admins can see all sessions
  is_admin()
  OR
  -- Anonymous survey access via session token
  session_token IS NOT NULL
);

-- Survey responses RLS policies
CREATE POLICY "Role-based survey responses access" ON survey_responses
FOR SELECT USING (
  session_id IN (
    SELECT id FROM survey_sessions 
    WHERE user_id = auth.uid()
    OR (organization_id IS NOT NULL AND is_org_admin(organization_id))
    OR is_admin()
  )
);

-- Response analysis RLS policies
CREATE POLICY "Role-based analysis access" ON response_analysis
FOR SELECT USING (
  response_id IN (
    SELECT sr.id FROM survey_responses sr
    JOIN survey_sessions ss ON sr.session_id = ss.id
    WHERE ss.user_id = auth.uid()
    OR (ss.organization_id IS NOT NULL AND is_org_admin(ss.organization_id))
    OR is_admin()
  )
);

-- Organization insights RLS policies
CREATE POLICY "Org insights access" ON organization_insights
FOR SELECT USING (
  is_org_admin(organization_id) OR is_admin()
);

-- Audit log RLS policies (admin only)
CREATE POLICY "Admin audit log access" ON audit_log
FOR SELECT USING (is_admin());