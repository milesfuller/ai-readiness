-- Survey Templates System Migration
-- Creates comprehensive template management system with versioning and marketplace
-- Date: 2025-01-07

-- Create question types enum
DO $$ BEGIN
    CREATE TYPE question_type AS ENUM (
        'text',
        'textarea',
        'multiple_choice',
        'single_choice', 
        'scale',
        'boolean',
        'jtbd',
        'rating',
        'ranking',
        'matrix',
        'file_upload',
        'date',
        'time',
        'email',
        'number',
        'slider',
        'color',
        'signature'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create template category enum
DO $$ BEGIN
    CREATE TYPE template_category AS ENUM (
        'ai_readiness',
        'customer_feedback',
        'employee_engagement',
        'market_research',
        'product_evaluation',
        'training_assessment',
        'health_wellness',
        'event_feedback',
        'recruitment',
        'ux_research',
        'compliance',
        'satisfaction',
        'performance',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create JTBD category enum 
DO $$ BEGIN
    CREATE TYPE jtbd_category AS ENUM (
        'functional',
        'emotional',
        'social',
        'push_force',
        'pull_force',
        'habit_force',
        'anxiety_force'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create survey_templates table
CREATE TABLE IF NOT EXISTS public.survey_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category template_category NOT NULL DEFAULT 'custom',
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'marketplace')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public', 'marketplace')),
    
    -- Template metadata
    estimated_duration INTEGER DEFAULT 0, -- in minutes
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    tags TEXT[],
    
    -- Template content
    introduction_text TEXT,
    conclusion_text TEXT,
    question_groups JSONB DEFAULT '[]'::jsonb,
    
    -- Customization options
    settings JSONB DEFAULT '{
        "allowAnonymous": true,
        "requireAllQuestions": false,
        "voiceEnabled": true,
        "aiAnalysisEnabled": false,
        "randomizeQuestions": false,
        "showProgressBar": true,
        "allowSkipQuestions": false,
        "saveProgress": true,
        "customCSS": "",
        "customBranding": {}
    }'::jsonb,
    
    -- Ownership and sharing
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    is_system_template BOOLEAN DEFAULT FALSE,
    
    -- Marketplace data
    marketplace_data JSONB DEFAULT '{
        "price": 0,
        "downloads": 0,
        "rating": 0,
        "reviews": 0,
        "featured": false,
        "license": "standard"
    }'::jsonb,
    
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_time DECIMAL(10,2) DEFAULT 0.00, -- in minutes
    
    -- Versioning
    parent_template_id UUID REFERENCES public.survey_templates(id),
    version_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE
);

-- Create survey_template_questions table
CREATE TABLE IF NOT EXISTS public.survey_template_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
    
    -- Question content
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    description TEXT,
    placeholder_text TEXT,
    help_text TEXT,
    
    -- Question configuration
    options JSONB DEFAULT '[]'::jsonb, -- For multiple choice, scale options, etc.
    validation_rules JSONB DEFAULT '{}'::jsonb,
    required BOOLEAN DEFAULT TRUE,
    
    -- Ordering and grouping
    group_id VARCHAR(100),
    group_title VARCHAR(255),
    order_index INTEGER NOT NULL,
    
    -- JTBD specific
    jtbd_category jtbd_category,
    jtbd_weight DECIMAL(3,2) DEFAULT 1.0,
    
    -- Question metadata
    tags TEXT[],
    analytics_enabled BOOLEAN DEFAULT TRUE,
    
    -- Conditional logic
    display_conditions JSONB DEFAULT '{}'::jsonb,
    skip_logic JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create survey_template_versions table for version history
CREATE TABLE IF NOT EXISTS public.survey_template_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Snapshot of template at this version
    template_snapshot JSONB NOT NULL,
    questions_snapshot JSONB NOT NULL,
    
    -- Version metadata
    version_notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Performance at this version
    usage_count INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    UNIQUE(template_id, version_number)
);

-- Create template_shares table for sharing and marketplace
CREATE TABLE IF NOT EXISTS public.template_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
    shared_with_org_id UUID REFERENCES public.organizations(id),
    shared_with_user_id UUID REFERENCES auth.users(id),
    
    -- Sharing metadata
    permission_level VARCHAR(20) DEFAULT 'view' CHECK (permission_level IN ('view', 'use', 'edit', 'admin')),
    shared_by UUID REFERENCES auth.users(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking for shared templates
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create template_analytics table for detailed usage analytics
CREATE TABLE IF NOT EXISTS public.template_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    
    -- Time period for analytics
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Usage metrics
    total_uses INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    average_completion_time DECIMAL(10,2) DEFAULT 0.00,
    
    -- Question performance
    question_analytics JSONB DEFAULT '[]'::jsonb,
    
    -- User feedback
    satisfaction_rating DECIMAL(3,2) DEFAULT 0.00,
    feedback_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_id, organization_id, period_start)
);

-- Create template_reviews table for marketplace reviews
CREATE TABLE IF NOT EXISTS public.template_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID REFERENCES public.organizations(id),
    
    -- Review content
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    review_text TEXT,
    pros TEXT,
    cons TEXT,
    
    -- Review metadata
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(template_id, reviewer_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_templates_category ON public.survey_templates(category);
CREATE INDEX IF NOT EXISTS idx_survey_templates_status ON public.survey_templates(status);
CREATE INDEX IF NOT EXISTS idx_survey_templates_visibility ON public.survey_templates(visibility);
CREATE INDEX IF NOT EXISTS idx_survey_templates_created_by ON public.survey_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_survey_templates_organization ON public.survey_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_marketplace ON public.survey_templates(status, visibility) WHERE status = 'marketplace';
CREATE INDEX IF NOT EXISTS idx_survey_templates_tags ON public.survey_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_survey_templates_usage ON public.survey_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_template_questions_template ON public.survey_template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_order ON public.survey_template_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_template_questions_group ON public.survey_template_questions(template_id, group_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_type ON public.survey_template_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.survey_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_versions_number ON public.survey_template_versions(template_id, version_number);

CREATE INDEX IF NOT EXISTS idx_template_shares_template ON public.template_shares(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_org ON public.template_shares(shared_with_org_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_user ON public.template_shares(shared_with_user_id);

CREATE INDEX IF NOT EXISTS idx_template_analytics_template ON public.template_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_period ON public.template_analytics(template_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_template_reviews_template ON public.template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_rating ON public.template_reviews(template_id, rating DESC);

-- Enable Row Level Security
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_templates
CREATE POLICY "Templates are viewable by organization members" ON public.survey_templates
    FOR SELECT USING (
        -- Public marketplace templates
        (status = 'marketplace' AND visibility = 'public') OR
        -- Organization templates
        (visibility = 'organization' AND organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )) OR
        -- Private templates by creator
        (visibility = 'private' AND created_by = auth.uid()) OR
        -- Templates shared with user
        id IN (
            SELECT template_id FROM public.template_shares 
            WHERE shared_with_user_id = auth.uid()
               OR shared_with_org_id IN (
                   SELECT organization_id FROM public.organization_members 
                   WHERE user_id = auth.uid()
               )
        )
    );

CREATE POLICY "Templates are editable by creators and admins" ON public.survey_templates
    FOR ALL USING (
        created_by = auth.uid() OR
        auth.uid() IN (
            SELECT user_id FROM public.organization_members 
            WHERE organization_id = survey_templates.organization_id 
            AND role IN ('owner', 'admin', 'manager')
        )
    );

-- RLS Policies for survey_template_questions
CREATE POLICY "Template questions follow template access" ON public.survey_template_questions
    FOR ALL USING (
        template_id IN (
            SELECT id FROM public.survey_templates
            WHERE 
                (status = 'marketplace' AND visibility = 'public') OR
                (visibility = 'organization' AND organization_id IN (
                    SELECT organization_id FROM public.organization_members 
                    WHERE user_id = auth.uid()
                )) OR
                (visibility = 'private' AND created_by = auth.uid()) OR
                id IN (
                    SELECT template_id FROM public.template_shares 
                    WHERE shared_with_user_id = auth.uid()
                       OR shared_with_org_id IN (
                           SELECT organization_id FROM public.organization_members 
                           WHERE user_id = auth.uid()
                       )
                )
        )
    );

-- RLS Policies for other tables (similar pattern)
CREATE POLICY "Template versions follow template access" ON public.survey_template_versions
    FOR ALL USING (
        template_id IN (SELECT id FROM public.survey_templates)
    );

CREATE POLICY "Template shares are viewable by involved parties" ON public.template_shares
    FOR ALL USING (
        shared_with_user_id = auth.uid() OR
        shared_by = auth.uid() OR
        shared_with_org_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Template analytics viewable by org members" ON public.template_analytics
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid()
        ) OR
        template_id IN (
            SELECT id FROM public.survey_templates 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Template reviews are publicly viewable" ON public.template_reviews
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users can manage own reviews" ON public.template_reviews
    FOR ALL USING (reviewer_id = auth.uid());

-- Functions for template management

-- Function to create template version
CREATE OR REPLACE FUNCTION create_template_version(
    p_template_id UUID,
    p_version_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_number INTEGER;
    v_version_id UUID;
    v_template_data JSONB;
    v_questions_data JSONB;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO v_version_number
    FROM public.survey_template_versions 
    WHERE template_id = p_template_id;
    
    -- Get template data
    SELECT to_jsonb(st.*) INTO v_template_data
    FROM public.survey_templates st
    WHERE id = p_template_id;
    
    -- Get questions data
    SELECT jsonb_agg(to_jsonb(stq.*)) INTO v_questions_data
    FROM public.survey_template_questions stq
    WHERE template_id = p_template_id
    ORDER BY order_index;
    
    -- Create version record
    INSERT INTO public.survey_template_versions (
        template_id,
        version_number,
        template_snapshot,
        questions_snapshot,
        version_notes,
        created_by
    ) VALUES (
        p_template_id,
        v_version_number,
        v_template_data,
        COALESCE(v_questions_data, '[]'::jsonb),
        p_version_notes,
        auth.uid()
    ) RETURNING id INTO v_version_id;
    
    -- Update template version
    UPDATE public.survey_templates 
    SET version = v_version_number, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_template_id;
    
    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to duplicate template
CREATE OR REPLACE FUNCTION duplicate_template(
    p_template_id UUID,
    p_new_title TEXT,
    p_organization_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_new_template_id UUID;
    v_question_record RECORD;
BEGIN
    -- Create new template
    INSERT INTO public.survey_templates (
        title,
        description,
        category,
        introduction_text,
        conclusion_text,
        question_groups,
        settings,
        created_by,
        organization_id,
        visibility
    )
    SELECT 
        p_new_title,
        description,
        category,
        introduction_text,
        conclusion_text,
        question_groups,
        settings,
        auth.uid(),
        COALESCE(p_organization_id, organization_id),
        'private'
    FROM public.survey_templates
    WHERE id = p_template_id
    RETURNING id INTO v_new_template_id;
    
    -- Copy questions
    FOR v_question_record IN 
        SELECT * FROM public.survey_template_questions 
        WHERE template_id = p_template_id
        ORDER BY order_index
    LOOP
        INSERT INTO public.survey_template_questions (
            template_id,
            question_text,
            question_type,
            description,
            placeholder_text,
            help_text,
            options,
            validation_rules,
            required,
            group_id,
            group_title,
            order_index,
            jtbd_category,
            jtbd_weight,
            tags,
            display_conditions,
            skip_logic
        ) VALUES (
            v_new_template_id,
            v_question_record.question_text,
            v_question_record.question_type,
            v_question_record.description,
            v_question_record.placeholder_text,
            v_question_record.help_text,
            v_question_record.options,
            v_question_record.validation_rules,
            v_question_record.required,
            v_question_record.group_id,
            v_question_record.group_title,
            v_question_record.order_index,
            v_question_record.jtbd_category,
            v_question_record.jtbd_weight,
            v_question_record.tags,
            v_question_record.display_conditions,
            v_question_record.skip_logic
        );
    END LOOP;
    
    RETURN v_new_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template usage stats
CREATE OR REPLACE FUNCTION update_template_usage(
    p_template_id UUID,
    p_completion_time DECIMAL DEFAULT NULL,
    p_completed BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.survey_templates 
    SET 
        usage_count = usage_count + 1,
        average_time = CASE 
            WHEN p_completion_time IS NOT NULL THEN
                (average_time * usage_count + p_completion_time) / (usage_count + 1)
            ELSE average_time
        END,
        completion_rate = CASE 
            WHEN p_completed THEN
                (completion_rate * usage_count + 100) / (usage_count + 1)
            ELSE
                (completion_rate * usage_count) / (usage_count + 1)
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_survey_templates_updated_at 
    BEFORE UPDATE ON public.survey_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_survey_template_questions_updated_at 
    BEFORE UPDATE ON public.survey_template_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_template_reviews_updated_at 
    BEFORE UPDATE ON public.template_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grant permissions
GRANT ALL ON public.survey_templates TO authenticated;
GRANT ALL ON public.survey_template_questions TO authenticated;
GRANT ALL ON public.survey_template_versions TO authenticated;
GRANT ALL ON public.template_shares TO authenticated;
GRANT ALL ON public.template_analytics TO authenticated;
GRANT ALL ON public.template_reviews TO authenticated;

-- Grant limited access to anon users for marketplace
GRANT SELECT ON public.survey_templates TO anon;
GRANT SELECT ON public.survey_template_questions TO anon;
GRANT SELECT ON public.template_reviews TO anon;

-- Insert system default templates
INSERT INTO public.survey_templates (
    title,
    description,
    category,
    status,
    visibility,
    is_system_template,
    introduction_text,
    conclusion_text,
    question_groups,
    settings,
    created_by,
    organization_id
) VALUES 
(
    'AI Readiness Assessment',
    'Comprehensive AI readiness evaluation using Jobs-to-be-Done framework to assess organizational preparedness for AI adoption',
    'ai_readiness',
    'published',
    'public',
    TRUE,
    'This assessment will help evaluate your organization''s readiness for AI adoption across multiple dimensions including technology, culture, processes, and strategic alignment.',
    'Thank you for completing the AI Readiness Assessment. Your responses will help identify key areas for AI implementation and transformation.',
    '[]'::jsonb,
    '{
        "allowAnonymous": false,
        "requireAllQuestions": true,
        "voiceEnabled": true,
        "aiAnalysisEnabled": true,
        "showProgressBar": true,
        "saveProgress": true,
        "customBranding": {
            "primaryColor": "#14B8A6",
            "secondaryColor": "#8B5CF6"
        }
    }'::jsonb,
    (SELECT id FROM auth.users LIMIT 1),
    NULL
),
(
    'Customer Satisfaction Survey',
    'Standard customer satisfaction survey template with NPS and detailed feedback collection',
    'customer_feedback',
    'published',
    'public',
    TRUE,
    'We value your feedback! Please take a few minutes to share your experience with our product or service.',
    'Thank you for your valuable feedback. We will use your responses to improve our offering.',
    '[
        {
            "id": "satisfaction",
            "title": "Overall Satisfaction",
            "description": "Rate your overall experience"
        },
        {
            "id": "nps",
            "title": "Net Promoter Score",
            "description": "Likelihood to recommend"
        },
        {
            "id": "feedback",
            "title": "Detailed Feedback",
            "description": "Share your thoughts and suggestions"
        }
    ]'::jsonb,
    '{
        "allowAnonymous": true,
        "requireAllQuestions": false,
        "voiceEnabled": false,
        "aiAnalysisEnabled": false,
        "showProgressBar": true,
        "saveProgress": false
    }'::jsonb,
    (SELECT id FROM auth.users LIMIT 1),
    NULL
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.survey_templates IS 'Survey templates with versioning and marketplace support';
COMMENT ON TABLE public.survey_template_questions IS 'Questions belonging to survey templates';
COMMENT ON TABLE public.survey_template_versions IS 'Version history for survey templates';
COMMENT ON TABLE public.template_shares IS 'Template sharing and permissions';
COMMENT ON TABLE public.template_analytics IS 'Detailed analytics for template usage';
COMMENT ON TABLE public.template_reviews IS 'User reviews for marketplace templates';