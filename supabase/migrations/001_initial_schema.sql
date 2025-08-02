-- AI Readiness Assessment Tool - Initial Database Schema
-- Enhanced schema with role-based access, authentication, and admin capabilities
-- Designed for Supabase with Row Level Security (RLS)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ORGANIZATIONS & MULTI-TENANCY
-- ============================================================================

-- Organizations table for multi-tenant support
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    size_category VARCHAR(50) CHECK (size_category IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    
    -- Contact information
    contact_email VARCHAR(255),
    contact_name VARCHAR(255),
    phone VARCHAR(50),
    
    -- Configuration
    settings JSONB DEFAULT '{}'::jsonb,
    branding JSONB DEFAULT '{}'::jsonb, -- Custom colors, logos, etc.
    
    -- Status and billing
    subscription_tier VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USER PROFILES & ROLE MANAGEMENT
-- ============================================================================

-- Enhanced profiles table with comprehensive role management
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    
    -- Role and organization
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'org_admin', 'admin')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Profile details
    job_title VARCHAR(255),
    department VARCHAR(255),
    manager_email VARCHAR(255),
    
    -- Preferences and settings
    preferences JSONB DEFAULT '{
        "email_notifications": true,
        "voice_input_default": false,
        "theme": "dark",
        "language": "en"
    }'::jsonb,
    
    -- Activity tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    survey_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SURVEY FRAMEWORK & CONFIGURATION
-- ============================================================================

-- Survey templates with JTBD framework integration
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Survey metadata
    title VARCHAR(255) NOT NULL DEFAULT 'AI Readiness Assessment',
    description TEXT,
    instructions TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Configuration
    question_count INTEGER DEFAULT 12,
    estimated_duration_minutes INTEGER DEFAULT 20,
    is_voice_enabled BOOLEAN DEFAULT true,
    is_anonymous BOOLEAN DEFAULT false,
    
    -- JTBD framework settings
    jtbd_framework_version VARCHAR(20) DEFAULT 'v1.0',
    custom_questions JSONB DEFAULT '[]'::jsonb,
    
    -- Status and lifecycle
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    is_template BOOLEAN DEFAULT false,
    
    -- Ownership and permissions
    created_by UUID REFERENCES auth.users(id),
    modified_by UUID REFERENCES auth.users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced survey questions with JTBD mapping
CREATE TABLE IF NOT EXISTS survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- Question details
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_context TEXT, -- JTBD context explanation
    placeholder_text TEXT,
    
    -- JTBD framework mapping
    jtbd_force VARCHAR(50) NOT NULL CHECK (jtbd_force IN (
        'demographic', 'pain_of_old', 'pull_of_new', 
        'anchors_to_old', 'anxiety_of_new'
    )),
    force_description TEXT,
    
    -- Question configuration
    input_type VARCHAR(50) DEFAULT 'text_or_voice' CHECK (input_type IN (
        'text', 'voice', 'text_or_voice', 'multiple_choice'
    )),
    is_required BOOLEAN DEFAULT true,
    max_length INTEGER DEFAULT 2000,
    min_length INTEGER DEFAULT 10,
    
    -- Multiple choice options (if applicable)
    options JSONB DEFAULT '[]'::jsonb,
    
    -- Ordering and display
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(survey_id, question_number),
    UNIQUE(survey_id, order_index)
);

-- ============================================================================
-- SURVEY SESSIONS & RESPONSES
-- ============================================================================

-- Enhanced survey sessions with comprehensive tracking
CREATE TABLE IF NOT EXISTS survey_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Respondent information (for anonymous surveys)
    respondent_email VARCHAR(255),
    respondent_name VARCHAR(255),
    respondent_role VARCHAR(255),
    respondent_department VARCHAR(255),
    respondent_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Session management
    session_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
    current_question_number INTEGER DEFAULT 1,
    total_questions INTEGER DEFAULT 12,
    
    -- Session status
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN (
        'not_started', 'in_progress', 'completed', 'abandoned', 'expired'
    )),
    is_completed BOOLEAN DEFAULT false,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Timing and analytics
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    total_time_spent_seconds INTEGER DEFAULT 0,
    
    -- Technical metadata
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(50), -- 'mobile', 'tablet', 'desktop'
    browser_info JSONB DEFAULT '{}'::jsonb,
    
    -- Quality indicators
    quality_score DECIMAL(3,2), -- 0-1 scale
    voice_usage_percentage DECIMAL(5,2) DEFAULT 0,
    edit_count INTEGER DEFAULT 0,
    
    -- Analysis results (populated after completion)
    overall_readiness_score DECIMAL(3,2),
    jtbd_scores JSONB DEFAULT '{
        "pain_of_old": null,
        "pull_of_new": null,
        "anchors_to_old": null,
        "anxiety_of_new": null
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced survey responses with multi-modal support
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES survey_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE,
    
    -- Response content
    response_text TEXT,
    original_text TEXT, -- Before any edits
    
    -- Voice-specific data
    voice_recording_url VARCHAR(500),
    voice_recording_duration_seconds INTEGER,
    transcription_text TEXT,
    transcription_confidence DECIMAL(3,2), -- 0-1 scale
    was_transcription_edited BOOLEAN DEFAULT false,
    transcription_edit_count INTEGER DEFAULT 0,
    
    -- Input method and quality
    input_method VARCHAR(20) NOT NULL CHECK (input_method IN ('text', 'voice', 'mixed')),
    response_quality VARCHAR(20) DEFAULT 'good' CHECK (response_quality IN ('poor', 'fair', 'good', 'excellent')),
    word_count INTEGER,
    character_count INTEGER,
    
    -- Timing data
    time_spent_seconds INTEGER DEFAULT 0,
    first_response_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    final_response_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Revision tracking
    revision_count INTEGER DEFAULT 0,
    edit_history JSONB DEFAULT '[]'::jsonb,
    
    -- Response metadata
    is_complete BOOLEAN DEFAULT true,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_id, question_id)
);

-- ============================================================================
-- AI ANALYSIS & INSIGHTS
-- ============================================================================

-- Enhanced AI analysis with comprehensive JTBD classification
CREATE TABLE IF NOT EXISTS response_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID UNIQUE REFERENCES survey_responses(id) ON DELETE CASCADE,
    
    -- JTBD Classification
    primary_jtbd_force VARCHAR(50) NOT NULL CHECK (primary_jtbd_force IN (
        'demographic', 'pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new'
    )),
    secondary_jtbd_forces VARCHAR(50)[] DEFAULT '{}',
    force_distribution JSONB DEFAULT '{}'::jsonb, -- Percentage breakdown if mixed
    
    -- Scoring and confidence
    force_strength_score INTEGER CHECK (force_strength_score >= 1 AND force_strength_score <= 5),
    confidence_score INTEGER CHECK (confidence_score >= 1 AND confidence_score <= 5),
    consistency_score DECIMAL(3,2), -- How consistent with other responses
    
    -- Sentiment and themes
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    sentiment_label VARCHAR(20) CHECK (sentiment_label IN ('very_negative', 'negative', 'neutral', 'positive', 'very_positive')),
    key_themes TEXT[] DEFAULT '{}',
    theme_confidence JSONB DEFAULT '{}'::jsonb, -- Confidence per theme
    
    -- Extracted insights
    summary_insight TEXT NOT NULL,
    detailed_analysis TEXT,
    actionable_recommendations TEXT[],
    risk_indicators TEXT[],
    opportunity_indicators TEXT[],
    
    -- AI model metadata
    llm_model VARCHAR(50) NOT NULL,
    llm_provider VARCHAR(50),
    prompt_version VARCHAR(20),
    api_cost_cents INTEGER DEFAULT 0,
    
    -- Processing metadata
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- Quality assurance
    is_reviewed BOOLEAN DEFAULT false,
    reviewer_id UUID REFERENCES auth.users(id),
    reviewer_notes TEXT,
    manual_override JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'manual_review'
    )),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AGGREGATED INSIGHTS & REPORTING
-- ============================================================================

-- Organization-level insights with comprehensive analytics
CREATE TABLE IF NOT EXISTS organization_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    
    -- Overall readiness metrics
    overall_readiness_score DECIMAL(3,2),
    readiness_level VARCHAR(50) CHECK (readiness_level IN (
        'not_ready', 'cautiously_ready', 'ready', 'very_ready'
    )),
    confidence_level VARCHAR(50) CHECK (confidence_level IN (
        'low', 'medium', 'high', 'very_high'
    )),
    
    -- JTBD force analysis
    pain_of_old_score DECIMAL(3,2),
    pull_of_new_score DECIMAL(3,2),
    anchors_to_old_score DECIMAL(3,2),
    anxiety_of_new_score DECIMAL(3,2),
    
    -- Response statistics
    total_responses INTEGER DEFAULT 0,
    completed_responses INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    avg_time_to_complete_minutes DECIMAL(6,2),
    voice_usage_rate DECIMAL(5,2),
    mobile_usage_rate DECIMAL(5,2),
    
    -- Quality metrics
    avg_response_quality DECIMAL(3,2),
    high_quality_responses_count INTEGER DEFAULT 0,
    flagged_responses_count INTEGER DEFAULT 0,
    
    -- Theme analysis
    top_themes_overall JSONB DEFAULT '{}'::jsonb,
    themes_by_force JSONB DEFAULT '{
        "pain_of_old": {},
        "pull_of_new": {},
        "anchors_to_old": {},
        "anxiety_of_new": {}
    }'::jsonb,
    
    -- Sentiment analysis
    sentiment_distribution JSONB DEFAULT '{
        "very_positive": 0,
        "positive": 0,
        "neutral": 0,
        "negative": 0,
        "very_negative": 0
    }'::jsonb,
    avg_sentiment_score DECIMAL(3,2),
    
    -- Segmentation insights
    insights_by_role JSONB DEFAULT '{}'::jsonb,
    insights_by_department JSONB DEFAULT '{}'::jsonb,
    insights_by_seniority JSONB DEFAULT '{}'::jsonb,
    
    -- Recommendations and actions
    key_insights TEXT[],
    priority_recommendations TEXT[],
    implementation_roadmap JSONB DEFAULT '[]'::jsonb,
    risk_factors TEXT[],
    success_factors TEXT[],
    
    -- Report metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID REFERENCES auth.users(id),
    is_latest BOOLEAN DEFAULT true,
    report_version VARCHAR(20) DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Segment-specific insights for detailed analysis
CREATE TABLE IF NOT EXISTS segment_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_insight_id UUID REFERENCES organization_insights(id) ON DELETE CASCADE,
    
    -- Segment definition
    segment_type VARCHAR(50) NOT NULL CHECK (segment_type IN (
        'role', 'department', 'seniority', 'location', 'custom'
    )),
    segment_name VARCHAR(255) NOT NULL,
    segment_filter JSONB NOT NULL,
    
    -- Segment metrics
    response_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    avg_readiness_score DECIMAL(3,2),
    
    -- JTBD force scores for segment
    pain_of_old_score DECIMAL(3,2),
    pull_of_new_score DECIMAL(3,2),
    anchors_to_old_score DECIMAL(3,2),
    anxiety_of_new_score DECIMAL(3,2),
    
    -- Segment-specific insights
    top_themes JSONB DEFAULT '{}'::jsonb,
    avg_sentiment DECIMAL(3,2),
    unique_characteristics TEXT[],
    recommendations TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SYSTEM ADMINISTRATION & MONITORING
-- ============================================================================

-- Comprehensive audit log for compliance and debugging
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) CHECK (event_category IN (
        'authentication', 'survey', 'admin', 'data_access', 'export', 'system'
    )),
    description TEXT,
    
    -- User and organization context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    affected_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Entity information
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Technical details
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Event data
    event_data JSONB DEFAULT '{}'::jsonb,
    before_state JSONB,
    after_state JSONB,
    
    -- Status and impact
    status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning')),
    impact_level VARCHAR(50) DEFAULT 'low' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking for cost management and monitoring
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Usage context
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Service details
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN (
        'llm_analysis', 'voice_transcription', 'report_generation', 'email_service'
    )),
    provider VARCHAR(50),
    model_name VARCHAR(50),
    
    -- Usage metrics
    usage_count INTEGER DEFAULT 1,
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost_estimate_cents INTEGER DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Request details
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    request_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'timeout', 'rate_limited')),
    error_details TEXT,
    
    -- Date partitioning for performance
    usage_date DATE DEFAULT CURRENT_DATE,
    usage_hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System notifications and alerts
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Notification details
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) CHECK (notification_type IN (
        'info', 'warning', 'error', 'success', 'maintenance'
    )),
    
    -- Targeting
    target_type VARCHAR(50) CHECK (target_type IN (
        'all_users', 'organization', 'role', 'specific_user'
    )),
    target_criteria JSONB DEFAULT '{}'::jsonb,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Scheduling and delivery
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_method VARCHAR(50)[] DEFAULT '{"in_app"}',
    
    -- Status and tracking
    is_active BOOLEAN DEFAULT true,
    is_sent BOOLEAN DEFAULT false,
    read_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Timestamps
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);