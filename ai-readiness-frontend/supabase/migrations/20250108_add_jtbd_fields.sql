-- ============================================================================
-- Migration: Add JTBD (Jobs-to-be-Done) Framework Fields
-- Created: 2025-01-08
-- Description: Adds JTBD force fields to survey questions and creates response analysis table
-- ============================================================================

-- UP Migration
BEGIN;

-- Check if we need to add JTBD fields to survey_questions
DO $$ 
BEGIN
    -- Add jtbd_force column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'survey_questions' AND column_name = 'jtbd_force'
    ) THEN
        ALTER TABLE survey_questions 
        ADD COLUMN jtbd_force VARCHAR(50) CHECK (jtbd_force IN (
            'demographic', 'pain_of_old', 'pull_of_new', 
            'anchors_to_old', 'anxiety_of_new'
        ));
    END IF;

    -- Add force_description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'survey_questions' AND column_name = 'force_description'
    ) THEN
        ALTER TABLE survey_questions 
        ADD COLUMN force_description TEXT;
    END IF;

    -- Add force_weight column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'survey_questions' AND column_name = 'force_weight'
    ) THEN
        ALTER TABLE survey_questions 
        ADD COLUMN force_weight DECIMAL(3,2) DEFAULT 1.0 CHECK (force_weight >= 0.0 AND force_weight <= 5.0);
    END IF;
END $$;

-- Create response_analysis_jtbd table for storing JTBD analysis results
CREATE TABLE IF NOT EXISTS response_analysis_jtbd (
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
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_questions_jtbd_force ON survey_questions(jtbd_force) WHERE jtbd_force IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_survey_questions_force_weight ON survey_questions(force_weight) WHERE force_weight IS NOT NULL;

-- Response analysis JTBD indexes
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_response ON response_analysis_jtbd(response_id);
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_force ON response_analysis_jtbd(primary_jtbd_force);
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_scores ON response_analysis_jtbd(force_strength_score, confidence_score);
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_sentiment ON response_analysis_jtbd(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_status ON response_analysis_jtbd(status);
CREATE INDEX IF NOT EXISTS idx_response_analysis_jtbd_timestamp ON response_analysis_jtbd(analysis_timestamp);

-- Enable RLS on the new table
ALTER TABLE response_analysis_jtbd ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for response_analysis_jtbd
CREATE POLICY "Role-based JTBD analysis access" ON response_analysis_jtbd
FOR SELECT USING (
  response_id IN (
    SELECT sr.id FROM survey_responses sr
    JOIN survey_sessions ss ON sr.session_id = ss.id
    WHERE ss.user_id = auth.uid()
    OR ss.organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid()
    )
  )
  OR is_admin()
);

CREATE POLICY "Admin JTBD analysis management" ON response_analysis_jtbd
FOR ALL USING (is_admin());

CREATE POLICY "Organization JTBD analysis management" ON response_analysis_jtbd
FOR ALL USING (
  response_id IN (
    SELECT sr.id FROM survey_responses sr
    JOIN survey_sessions ss ON sr.session_id = ss.id
    JOIN organization_members om ON ss.organization_id = om.organization_id
    WHERE om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_response_analysis_jtbd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_response_analysis_jtbd_updated_at
    BEFORE UPDATE ON response_analysis_jtbd
    FOR EACH ROW
    EXECUTE FUNCTION update_response_analysis_jtbd_updated_at();

-- Add helpful comments
COMMENT ON TABLE response_analysis_jtbd IS 'JTBD (Jobs-to-be-Done) framework analysis results for survey responses';
COMMENT ON COLUMN response_analysis_jtbd.primary_jtbd_force IS 'Primary JTBD force identified in the response';
COMMENT ON COLUMN response_analysis_jtbd.force_distribution IS 'JSON object with percentage distribution across multiple forces';
COMMENT ON COLUMN response_analysis_jtbd.force_strength_score IS 'Strength of the identified force (1-5 scale)';
COMMENT ON COLUMN response_analysis_jtbd.confidence_score IS 'AI confidence in the classification (1-5 scale)';

COMMENT ON COLUMN survey_questions.jtbd_force IS 'JTBD force category this question is designed to assess';
COMMENT ON COLUMN survey_questions.force_description IS 'Explanation of how this question relates to the JTBD force';
COMMENT ON COLUMN survey_questions.force_weight IS 'Relative importance of this question for the force (0.0-5.0)';

COMMIT;

-- ============================================================================
-- DOWN Migration (Rollback)
-- ============================================================================

-- To rollback this migration, run the following:
/*

BEGIN;

-- Drop the response analysis JTBD table
DROP TABLE IF EXISTS response_analysis_jtbd CASCADE;

-- Remove JTBD columns from survey_questions
ALTER TABLE survey_questions DROP COLUMN IF EXISTS jtbd_force;
ALTER TABLE survey_questions DROP COLUMN IF EXISTS force_description;
ALTER TABLE survey_questions DROP COLUMN IF EXISTS force_weight;

-- Drop indexes (will be dropped automatically with columns/table)
-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_update_response_analysis_jtbd_updated_at ON response_analysis_jtbd;
DROP FUNCTION IF EXISTS update_response_analysis_jtbd_updated_at();

COMMIT;

*/