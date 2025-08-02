-- ============================================================================
-- AUTOMATED TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_sessions_updated_at BEFORE UPDATE ON survey_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_responses_updated_at BEFORE UPDATE ON survey_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email = 'rosaleen.tighe@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profiles for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update session statistics
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completion percentage
  NEW.completion_percentage = (
    SELECT COUNT(*)::DECIMAL / NEW.total_questions * 100
    FROM survey_responses 
    WHERE session_id = NEW.id
  );
  
  -- Update voice usage percentage
  NEW.voice_usage_percentage = (
    SELECT COALESCE(
      COUNT(CASE WHEN input_method IN ('voice', 'mixed') THEN 1 END)::DECIMAL / 
      NULLIF(COUNT(*), 0) * 100, 0
    )
    FROM survey_responses 
    WHERE session_id = NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_stats_trigger
  BEFORE UPDATE ON survey_sessions
  FOR EACH ROW EXECUTE FUNCTION update_session_stats();

-- ============================================================================
-- HELPFUL VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Comprehensive survey progress view
CREATE VIEW survey_progress_view AS
SELECT 
    ss.id as session_id,
    ss.survey_id,
    ss.organization_id,
    ss.user_id,
    p.email as user_email,
    p.display_name,
    p.role as user_role,
    ss.status,
    ss.completion_percentage,
    ss.started_at,
    ss.completed_at,
    ss.total_time_spent_seconds,
    COUNT(sr.id) as responses_count,
    ss.total_questions,
    ss.voice_usage_percentage,
    ss.overall_readiness_score,
    o.name as organization_name,
    s.title as survey_title
FROM survey_sessions ss
LEFT JOIN profiles p ON ss.user_id = p.user_id
LEFT JOIN organizations o ON ss.organization_id = o.id
LEFT JOIN surveys s ON ss.survey_id = s.id
LEFT JOIN survey_responses sr ON ss.id = sr.session_id
GROUP BY 
    ss.id, ss.survey_id, ss.organization_id, ss.user_id,
    p.email, p.display_name, p.role, ss.status, ss.completion_percentage,
    ss.started_at, ss.completed_at, ss.total_time_spent_seconds,
    ss.total_questions, ss.voice_usage_percentage, ss.overall_readiness_score,
    o.name, s.title;

-- Organization analytics view
CREATE VIEW organization_analytics_view AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.size_category,
    o.industry,
    COUNT(DISTINCT ss.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.id END) as completed_sessions,
    ROUND(
        COUNT(DISTINCT CASE WHEN ss.status = 'completed' THEN ss.id END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT ss.id), 0) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT p.user_id) as active_users,
    AVG(ss.completion_percentage) as avg_completion_percentage,
    AVG(ss.total_time_spent_seconds) as avg_time_spent_seconds,
    AVG(ss.voice_usage_percentage) as avg_voice_usage,
    COUNT(DISTINCT sr.id) as total_responses,
    COUNT(DISTINCT CASE WHEN sr.input_method = 'voice' THEN sr.id END) as voice_responses,
    MAX(ss.created_at) as last_session_date
FROM organizations o
LEFT JOIN survey_sessions ss ON o.id = ss.organization_id
LEFT JOIN profiles p ON ss.user_id = p.user_id
LEFT JOIN survey_responses sr ON ss.id = sr.session_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.size_category, o.industry;

-- Response analysis summary view
CREATE VIEW response_analysis_summary_view AS
SELECT 
    ra.primary_jtbd_force,
    ra.sentiment_label,
    COUNT(*) as response_count,
    AVG(ra.force_strength_score) as avg_force_strength,
    AVG(ra.confidence_score) as avg_confidence,
    AVG(ra.sentiment_score) as avg_sentiment,
    ARRAY_AGG(DISTINCT unnest(ra.key_themes)) as all_themes,
    ss.organization_id,
    o.name as organization_name
FROM response_analysis ra
JOIN survey_responses sr ON ra.response_id = sr.id
JOIN survey_sessions ss ON sr.session_id = ss.id
JOIN organizations o ON ss.organization_id = o.id
WHERE ra.status = 'completed'
GROUP BY ra.primary_jtbd_force, ra.sentiment_label, ss.organization_id, o.name;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to calculate readiness score
CREATE OR REPLACE FUNCTION calculate_readiness_score(session_uuid UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    total_score DECIMAL(10,2) := 0;
    response_count INTEGER := 0;
    force_scores JSONB;
BEGIN
    -- Get all force strength scores for the session
    SELECT 
        jsonb_object_agg(
            ra.primary_jtbd_force, 
            AVG(ra.force_strength_score)
        )
    INTO force_scores
    FROM response_analysis ra
    JOIN survey_responses sr ON ra.response_id = sr.id
    WHERE sr.session_id = session_uuid
    AND ra.status = 'completed';
    
    -- Calculate weighted readiness score
    -- Pain of old: 25%, Pull of new: 35%, Anchors to old: 20%, Anxiety of new: 20%
    total_score := 
        COALESCE((force_scores->>'pain_of_old')::DECIMAL * 0.25, 0) +
        COALESCE((force_scores->>'pull_of_new')::DECIMAL * 0.35, 0) +
        COALESCE((force_scores->>'anchors_to_old')::DECIMAL * -0.20, 0) + -- Negative weight
        COALESCE((force_scores->>'anxiety_of_new')::DECIMAL * -0.20, 0);  -- Negative weight
    
    -- Normalize to 0-1 scale
    RETURN GREATEST(0, LEAST(1, total_score / 5.0));
END;
$$ LANGUAGE plpgsql;

-- Function to generate session summary
CREATE OR REPLACE FUNCTION generate_session_summary(session_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    session_data JSONB;
    response_data JSONB;
    analysis_data JSONB;
    result JSONB;
BEGIN
    -- Get session data
    SELECT to_jsonb(ss.*) 
    INTO session_data
    FROM survey_sessions ss 
    WHERE ss.id = session_uuid;
    
    -- Get response data
    SELECT jsonb_agg(to_jsonb(sr.*))
    INTO response_data
    FROM survey_responses sr
    WHERE sr.session_id = session_uuid;
    
    -- Get analysis data
    SELECT jsonb_agg(to_jsonb(ra.*))
    INTO analysis_data
    FROM response_analysis ra
    JOIN survey_responses sr ON ra.response_id = sr.id
    WHERE sr.session_id = session_uuid;
    
    -- Combine into summary
    result := jsonb_build_object(
        'session', session_data,
        'responses', COALESCE(response_data, '[]'::jsonb),
        'analysis', COALESCE(analysis_data, '[]'::jsonb),
        'generated_at', NOW(),
        'readiness_score', calculate_readiness_score(session_uuid)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Mark sessions as expired if past expiration date and not completed
    UPDATE survey_sessions 
    SET status = 'expired'
    WHERE expires_at < NOW() 
    AND status = 'in_progress';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_log (
        event_type,
        event_category,
        description,
        event_data,
        status,
        impact_level
    ) VALUES (
        'session_cleanup',
        'system',
        'Automated cleanup of expired sessions',
        jsonb_build_object('expired_sessions', cleanup_count),
        'success',
        'low'
    );
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to validate survey response
CREATE OR REPLACE FUNCTION validate_survey_response(
    p_session_id UUID,
    p_question_id UUID,
    p_response_text TEXT,
    p_input_method VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
    question_config JSONB;
    validation_result JSONB := '{"valid": true, "errors": []}'::jsonb;
    errors TEXT[] := '{}';
BEGIN
    -- Get question configuration
    SELECT to_jsonb(sq.*) 
    INTO question_config
    FROM survey_questions sq
    WHERE sq.id = p_question_id;
    
    -- Validate required field
    IF (question_config->>'is_required')::BOOLEAN = true AND 
       (p_response_text IS NULL OR LENGTH(TRIM(p_response_text)) = 0) THEN
        errors := array_append(errors, 'Response is required');
    END IF;
    
    -- Validate length constraints
    IF p_response_text IS NOT NULL THEN
        IF LENGTH(p_response_text) < (question_config->>'min_length')::INTEGER THEN
            errors := array_append(errors, 
                'Response too short (minimum ' || (question_config->>'min_length') || ' characters)');
        END IF;
        
        IF LENGTH(p_response_text) > (question_config->>'max_length')::INTEGER THEN
            errors := array_append(errors, 
                'Response too long (maximum ' || (question_config->>'max_length') || ' characters)');
        END IF;
    END IF;
    
    -- Validate input method
    IF (question_config->>'input_type') = 'text' AND p_input_method != 'text' THEN
        errors := array_append(errors, 'Only text input allowed for this question');
    END IF;
    
    IF (question_config->>'input_type') = 'voice' AND p_input_method != 'voice' THEN
        errors := array_append(errors, 'Only voice input allowed for this question');
    END IF;
    
    -- Build result
    IF array_length(errors, 1) > 0 THEN
        validation_result := jsonb_build_object(
            'valid', false,
            'errors', to_jsonb(errors)
        );
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;