-- Voice Recording System Migration
-- Creates comprehensive voice recording tables with transcription, quality metrics, and security
-- Date: 2025-01-08

-- =============================================================================
-- 1. VOICE RECORDINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Foreign key relationships
  response_id UUID NOT NULL REFERENCES public.survey_session_responses(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL, -- Denormalized for performance
  session_id TEXT NOT NULL, -- Denormalized for performance
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID, -- Nullable for non-org surveys
  
  -- Recording metadata
  recording_url TEXT NOT NULL, -- Storage path/URL for audio file
  original_filename TEXT,
  content_type TEXT NOT NULL DEFAULT 'audio/wav',
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms > 0),
  sample_rate INTEGER DEFAULT 44100,
  bit_depth INTEGER DEFAULT 16,
  channels INTEGER DEFAULT 1 CHECK (channels IN (1, 2)),
  
  -- Processing status
  upload_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (upload_status IN ('pending', 'uploaded', 'processing', 'completed', 'failed', 'deleted')),
  transcription_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  quality_analysis_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (quality_analysis_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  
  -- Processing metadata
  processing_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT voice_recordings_response_unique UNIQUE (response_id),
  CONSTRAINT voice_recordings_duration_reasonable CHECK (duration_ms <= 600000), -- Max 10 minutes
  CONSTRAINT voice_recordings_file_size_reasonable CHECK (file_size <= 100000000) -- Max 100MB
);

-- =============================================================================
-- 2. TRANSCRIPTION SEGMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.transcription_segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Foreign key relationships
  voice_recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  
  -- Segment data
  segment_index INTEGER NOT NULL CHECK (segment_index >= 0),
  text TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL CHECK (start_time_ms >= 0),
  end_time_ms INTEGER NOT NULL CHECK (end_time_ms >= start_time_ms),
  confidence_score DECIMAL(4,3) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  
  -- Language detection
  detected_language TEXT,
  language_confidence DECIMAL(4,3),
  
  -- Word-level timing (optional JSON array)
  word_timings JSONB DEFAULT '[]'::jsonb,
  
  -- Processing metadata
  transcription_engine TEXT DEFAULT 'whisper',
  model_version TEXT,
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT transcription_segments_recording_segment_unique UNIQUE (voice_recording_id, segment_index),
  CONSTRAINT transcription_segments_duration_positive CHECK (end_time_ms > start_time_ms),
  CONSTRAINT transcription_segments_text_not_empty CHECK (LENGTH(TRIM(text)) > 0)
);

-- =============================================================================
-- 3. VOICE QUALITY METRICS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.voice_quality_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Foreign key relationships
  voice_recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  
  -- Audio quality metrics
  signal_to_noise_ratio DECIMAL(5,2), -- in dB
  peak_amplitude DECIMAL(4,3) CHECK (peak_amplitude >= 0.0 AND peak_amplitude <= 1.0),
  rms_amplitude DECIMAL(4,3) CHECK (rms_amplitude >= 0.0 AND rms_amplitude <= 1.0),
  dynamic_range_db DECIMAL(5,2),
  frequency_response_score DECIMAL(4,3) CHECK (frequency_response_score >= 0.0 AND frequency_response_score <= 1.0),
  
  -- Speech quality metrics
  speech_clarity_score DECIMAL(4,3) CHECK (speech_clarity_score >= 0.0 AND speech_clarity_score <= 1.0),
  background_noise_level DECIMAL(5,2), -- in dB
  clipping_detected BOOLEAN DEFAULT FALSE,
  silence_percentage DECIMAL(4,1) CHECK (silence_percentage >= 0.0 AND silence_percentage <= 100.0),
  
  -- Overall quality assessment
  overall_quality_score DECIMAL(4,3) CHECK (overall_quality_score >= 0.0 AND overall_quality_score <= 1.0),
  quality_grade TEXT CHECK (quality_grade IN ('excellent', 'good', 'fair', 'poor', 'unusable')),
  quality_issues TEXT[], -- Array of detected issues
  
  -- Processing metadata
  analysis_engine TEXT DEFAULT 'custom',
  analysis_version TEXT,
  processing_time_ms INTEGER,
  
  -- Raw analysis data (optional)
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT voice_quality_metrics_recording_unique UNIQUE (voice_recording_id)
);

-- =============================================================================
-- 4. PERFORMANCE INDEXES
-- =============================================================================

-- Voice recordings indexes
CREATE INDEX IF NOT EXISTS idx_voice_recordings_response_id ON public.voice_recordings(response_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_survey_id ON public.voice_recordings(survey_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_session_id ON public.voice_recordings(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_id ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_organization_id ON public.voice_recordings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_recordings_upload_status ON public.voice_recordings(upload_status);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_transcription_status ON public.voice_recordings(transcription_status);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_quality_analysis_status ON public.voice_recordings(quality_analysis_status);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_recorded_at ON public.voice_recordings(recorded_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_created_at ON public.voice_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_processing ON public.voice_recordings(upload_status, transcription_status, quality_analysis_status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_voice_recordings_user_survey ON public.voice_recordings(user_id, survey_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_org_survey ON public.voice_recordings(organization_id, survey_id, recorded_at DESC) 
  WHERE organization_id IS NOT NULL;

-- Transcription segments indexes
CREATE INDEX IF NOT EXISTS idx_transcription_segments_recording_id ON public.transcription_segments(voice_recording_id);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_recording_segment ON public.transcription_segments(voice_recording_id, segment_index);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_confidence ON public.transcription_segments(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_transcription_segments_text_search ON public.transcription_segments USING gin(to_tsvector('english', text));

-- Voice quality metrics indexes
CREATE INDEX IF NOT EXISTS idx_voice_quality_metrics_recording_id ON public.voice_quality_metrics(voice_recording_id);
CREATE INDEX IF NOT EXISTS idx_voice_quality_metrics_overall_score ON public.voice_quality_metrics(overall_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_voice_quality_metrics_quality_grade ON public.voice_quality_metrics(quality_grade);
CREATE INDEX IF NOT EXISTS idx_voice_quality_metrics_analyzed_at ON public.voice_quality_metrics(analyzed_at);

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcription_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Voice recordings RLS policies
CREATE POLICY "Users can view their own voice recordings" ON public.voice_recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice recordings" ON public.voice_recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice recordings" ON public.voice_recordings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice recordings" ON public.voice_recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Organization admin policies for voice recordings
CREATE POLICY "Organization admins can view org voice recordings" ON public.voice_recordings
  FOR SELECT USING (
    organization_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = voice_recordings.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Organization admins can manage org voice recordings" ON public.voice_recordings
  FOR ALL USING (
    organization_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = voice_recordings.organization_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
    )
  );

-- Transcription segments RLS policies
CREATE POLICY "Users can view transcriptions of their voice recordings" ON public.transcription_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = transcription_segments.voice_recording_id 
      AND vr.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert transcription segments" ON public.transcription_segments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = transcription_segments.voice_recording_id 
      AND (vr.user_id = auth.uid() OR auth.uid() IS NULL) -- Allow system inserts
    )
  );

CREATE POLICY "System can update transcription segments" ON public.transcription_segments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = transcription_segments.voice_recording_id 
      AND (vr.user_id = auth.uid() OR auth.uid() IS NULL) -- Allow system updates
    )
  );

-- Organization admin policies for transcription segments
CREATE POLICY "Organization admins can view org transcription segments" ON public.transcription_segments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      JOIN public.organization_members om ON om.organization_id = vr.organization_id
      WHERE vr.id = transcription_segments.voice_recording_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
      AND vr.organization_id IS NOT NULL
    )
  );

-- Voice quality metrics RLS policies  
CREATE POLICY "Users can view quality metrics of their voice recordings" ON public.voice_quality_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = voice_quality_metrics.voice_recording_id 
      AND vr.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert voice quality metrics" ON public.voice_quality_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = voice_quality_metrics.voice_recording_id 
      AND (vr.user_id = auth.uid() OR auth.uid() IS NULL) -- Allow system inserts
    )
  );

CREATE POLICY "System can update voice quality metrics" ON public.voice_quality_metrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      WHERE vr.id = voice_quality_metrics.voice_recording_id 
      AND (vr.user_id = auth.uid() OR auth.uid() IS NULL) -- Allow system updates
    )
  );

-- Organization admin policies for voice quality metrics
CREATE POLICY "Organization admins can view org voice quality metrics" ON public.voice_quality_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.voice_recordings vr 
      JOIN public.organization_members om ON om.organization_id = vr.organization_id
      WHERE vr.id = voice_quality_metrics.voice_recording_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('admin', 'owner')
      AND vr.organization_id IS NOT NULL
    )
  );

-- =============================================================================
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_voice_recordings_updated_at 
  BEFORE UPDATE ON public.voice_recordings 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transcription_segments_updated_at 
  BEFORE UPDATE ON public.transcription_segments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_quality_metrics_updated_at 
  BEFORE UPDATE ON public.voice_quality_metrics 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 7. UTILITY FUNCTIONS
-- =============================================================================

-- Function to get voice recording statistics
CREATE OR REPLACE FUNCTION public.get_voice_recording_stats(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_recordings BIGINT,
  total_duration_ms BIGINT,
  total_file_size BIGINT,
  avg_quality_score DECIMAL(4,3),
  completed_transcriptions BIGINT,
  processing_recordings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_recordings,
    COALESCE(SUM(vr.duration_ms), 0)::BIGINT as total_duration_ms,
    COALESCE(SUM(vr.file_size), 0)::BIGINT as total_file_size,
    ROUND(AVG(vqm.overall_quality_score), 3) as avg_quality_score,
    COUNT(CASE WHEN vr.transcription_status = 'completed' THEN 1 END)::BIGINT as completed_transcriptions,
    COUNT(CASE WHEN vr.upload_status IN ('pending', 'processing') OR 
                    vr.transcription_status = 'processing' OR 
                    vr.quality_analysis_status = 'processing' THEN 1 END)::BIGINT as processing_recordings
  FROM public.voice_recordings vr
  LEFT JOIN public.voice_quality_metrics vqm ON vqm.voice_recording_id = vr.id
  WHERE (target_user_id IS NULL OR vr.user_id = target_user_id)
    AND vr.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE public.voice_recordings IS 'Stores voice recording metadata and processing status for survey responses';
COMMENT ON TABLE public.transcription_segments IS 'Stores transcription segments with timing and confidence scores';
COMMENT ON TABLE public.voice_quality_metrics IS 'Stores audio quality analysis results for voice recordings';

COMMENT ON COLUMN public.voice_recordings.response_id IS 'Links to the survey response this recording belongs to';
COMMENT ON COLUMN public.voice_recordings.recording_url IS 'Storage path/URL for the audio file (e.g., Supabase Storage path)';
COMMENT ON COLUMN public.voice_recordings.duration_ms IS 'Duration of the recording in milliseconds';
COMMENT ON COLUMN public.voice_recordings.file_size IS 'Size of the audio file in bytes';
COMMENT ON COLUMN public.voice_recordings.upload_status IS 'Current status of file upload process';
COMMENT ON COLUMN public.voice_recordings.transcription_status IS 'Current status of transcription process';
COMMENT ON COLUMN public.voice_recordings.quality_analysis_status IS 'Current status of quality analysis process';

COMMENT ON COLUMN public.transcription_segments.segment_index IS 'Sequential index of this segment within the recording';
COMMENT ON COLUMN public.transcription_segments.confidence_score IS 'Transcription confidence score (0.0 to 1.0)';
COMMENT ON COLUMN public.transcription_segments.word_timings IS 'Optional word-level timing data as JSON array';

COMMENT ON COLUMN public.voice_quality_metrics.overall_quality_score IS 'Overall quality score (0.0 to 1.0, higher is better)';
COMMENT ON COLUMN public.voice_quality_metrics.quality_grade IS 'Human-readable quality assessment';
COMMENT ON COLUMN public.voice_quality_metrics.signal_to_noise_ratio IS 'Signal-to-noise ratio in decibels';

-- =============================================================================
-- 9. ROLLBACK STATEMENTS
-- =============================================================================

/*
-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration, run the following commands in order:

-- Drop triggers
DROP TRIGGER IF EXISTS update_voice_recordings_updated_at ON public.voice_recordings;
DROP TRIGGER IF EXISTS update_transcription_segments_updated_at ON public.transcription_segments;
DROP TRIGGER IF EXISTS update_voice_quality_metrics_updated_at ON public.voice_quality_metrics;

-- Drop utility functions
DROP FUNCTION IF EXISTS public.get_voice_recording_stats(UUID);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS public.voice_quality_metrics;
DROP TABLE IF EXISTS public.transcription_segments;
DROP TABLE IF EXISTS public.voice_recordings;

-- Note: This will permanently delete all voice recording data
-- Make sure to backup data before running rollback in production
*/

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcription_segments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_quality_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_voice_recording_stats(UUID) TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;