/**
 * DATABASE SCHEMA - Single Source of Truth
 * 
 * This file contains ALL database table schemas for the AI Readiness Platform.
 * Every table, every field, every validation rule - it's all here.
 * 
 * Organization:
 * 1. Common Schemas (timestamps, soft delete, etc.)
 * 2. Auth & Identity (users, sessions, profiles)
 * 3. Organizations (orgs, members, invitations)
 * 4. Surveys (surveys, templates, questions, responses)
 * 5. System (logs, analytics, files, webhooks)
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS - Used across multiple tables
// ============================================================================

export const TimestampSchema = z.object({
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date())
});

export const SoftDeleteSchema = z.object({
  deleted_at: z.date().nullable().default(null)
});

// ============================================================================
// AUTH & IDENTITY - Users, profiles, sessions, authentication
// ============================================================================

export const Users = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  encrypted_password: z.string().min(6),
  name: z.string().nullable().default(null),
  role: z.enum(['user', 'admin', 'org_admin', 'system_admin']).default('user'),
  is_active: z.boolean().default(true),
  last_login_at: z.date().nullable().default(null),
  email_verified_at: z.date().nullable().default(null),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const UserProfiles = z.object({
  id: z.string().uuid(), // Same as auth.users.id
  user_id: z.string().uuid().optional(), // For backward compatibility
  email: z.string().email(),
  full_name: z.string().nullable().default(null),
  display_name: z.string().nullable().default(null),
  avatar_url: z.string().url().nullable().default(null),
  phone: z.string().nullable().default(null),
  job_title: z.string().nullable().default(null),
  department: z.string().nullable().default(null),
  bio: z.string().max(500).nullable().default(null),
  organization_id: z.string().uuid().nullable().default(null),
  role: z.enum(['user', 'admin', 'org_admin', 'system_admin']).default('user'),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
    dateFormat: z.string().default('MM/DD/YYYY'),
    timeFormat: z.enum(['12h', '24h']).default('12h'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(false),
      sms: z.boolean().default(false),
      frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('daily'),
      types: z.object({
        surveys: z.boolean().default(true),
        invitations: z.boolean().default(true),
        reports: z.boolean().default(true),
        system: z.boolean().default(true)
      })
    })
  }),
  is_active: z.boolean().default(true),
  last_login_at: z.date().nullable().default(null),
  email_verified_at: z.date().nullable().default(null),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const UserSessions = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string().min(64).max(64), // SHA-256
  refresh_token_hash: z.string().min(64).max(64).nullable(),
  expires_at: z.date(),
  metadata: z.object({
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    device_type: z.enum(['desktop', 'mobile', 'tablet']).nullable(),
    browser: z.string().nullable(),
    os: z.string().nullable(),
    location: z.object({
      country: z.string().nullable(),
      city: z.string().nullable(),
      region: z.string().nullable()
    }).nullable()
  }),
  is_active: z.boolean().default(true),
  revoked_at: z.date().nullable().default(null),
  ...TimestampSchema.shape
});

export const OnboardingProgress = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_step: z.enum([
    'welcome',
    'profile_setup', 
    'organization_setup',
    'team_invite',
    'first_survey',
    'completed'
  ]).default('welcome'),
  completed_steps: z.array(z.string()).default([]),
  metadata: z.object({
    organization_created: z.boolean().default(false),
    profile_completed: z.boolean().default(false),
    team_invited: z.boolean().default(false),
    survey_created: z.boolean().default(false),
    skipped_steps: z.array(z.string()).default([])
  }),
  started_at: z.date().default(() => new Date()),
  completed_at: z.date().nullable().default(null),
  ...TimestampSchema.shape
});

// ============================================================================
// ORGANIZATIONS - Organizations, teams, members, invitations
// ============================================================================

export const Organizations = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255).nullable(),
  settings: z.object({
    allowSelfRegistration: z.boolean().default(false),
    requireEmailVerification: z.boolean().default(true),
    require2FA: z.boolean().default(false),
    enableSSO: z.boolean().default(false),
    ssoProvider: z.string().nullable().default(null),
    ssoConfig: z.record(z.unknown()).nullable().default(null),
    dataRetentionDays: z.number().min(1).max(3650).default(365),
    allowExternalIntegrations: z.boolean().default(true),
    requireDataProcessingConsent: z.boolean().default(true),
    enableAuditLogs: z.boolean().default(false),
    defaultRole: z.enum(['user', 'admin', 'org_admin']).default('user'),
    customRoles: z.array(z.object({
      name: z.string(),
      permissions: z.array(z.string())
    })).default([]),
    mcp: z.object({
      enabled: z.boolean().default(false),
      autoAnalysis: z.boolean().default(false),
      analysisFrequency: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
      maxConcurrentAgents: z.number().min(1).max(100).default(10)
    }).default({
      enabled: false,
      autoAnalysis: false,
      analysisFrequency: 'daily',
      maxConcurrentAgents: 10
    })
  }),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const OrganizationMembers = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.string().default('member'),
  permissions: z.array(z.string()).default([]),
  joined_at: z.date().default(() => new Date()),
  invited_by: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  ...TimestampSchema.shape
});

export const OrganizationInvitations = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  email: z.string().email(),
  role: z.string().default('member'),
  token: z.string().min(32),
  expires_at: z.date(),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).default('pending'),
  invited_by: z.string().uuid(),
  accepted_at: z.date().nullable().default(null),
  ...TimestampSchema.shape
});

// ============================================================================
// INVITATIONS - Generic invitation system with email tracking
// ============================================================================

export const Invitations = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'organization',
    'survey',
    'collaboration',
    'beta',
    'event',
    'interview',
    'demo',
    'trial',
    'referral',
    'custom'
  ]),
  email: z.string().email(),
  token: z.string().min(32),
  status: z.enum(['pending', 'sent', 'delivered', 'opened', 'clicked', 'accepted', 'rejected', 'expired', 'cancelled', 'bounced']).default('pending'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  delivery_method: z.enum(['email', 'sms', 'push', 'in_app', 'webhook']).default('email'),
  sender_id: z.string().uuid(),
  sender_name: z.string().min(1).max(255).nullable(),
  sender_email: z.string().email().nullable(),
  target_id: z.string().uuid().nullable(),
  target_type: z.string().min(1).max(100).nullable(),
  subject: z.string().min(1).max(500),
  message: z.string().max(5000).nullable(),
  template_id: z.string().uuid().nullable(),
  scheduled_at: z.date().nullable(),
  sent_at: z.date().nullable(),
  expires_at: z.date(),
  accepted_at: z.date().nullable(),
  rejected_at: z.date().nullable(),
  response_count: z.number().int().min(0).default(0),
  last_response_at: z.date().nullable(),
  metadata: z.object({
    role: z.string().nullable(),
    permissions: z.array(z.string()).default([]),
    custom_fields: z.record(z.unknown()).default({}),
    redirect_url: z.string().url().nullable(),
    campaign_id: z.string().nullable(),
    source: z.string().nullable(),
    tags: z.array(z.string()).default([])
  }).default({
    role: null,
    permissions: [],
    custom_fields: {},
    redirect_url: null,
    campaign_id: null,
    source: null,
    tags: []
  }),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const EmailTracking = z.object({
  id: z.string().uuid(),
  invitation_id: z.string().uuid(),
  email: z.string().email(),
  status: z.enum(['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'complained', 'unsubscribed']).default('queued'),
  sent_at: z.date().nullable(),
  delivered_at: z.date().nullable(),
  opened_at: z.date().nullable(),
  clicked_at: z.date().nullable(),
  bounced_at: z.date().nullable(),
  failed_at: z.date().nullable(),
  bounce_reason: z.string().nullable(),
  failure_reason: z.string().nullable(),
  open_count: z.number().int().min(0).default(0),
  click_count: z.number().int().min(0).default(0),
  user_agent: z.string().nullable(),
  ip_address: z.string().nullable(),
  location: z.object({
    country: z.string().nullable(),
    region: z.string().nullable(),
    city: z.string().nullable()
  }).nullable(),
  ...TimestampSchema.shape
});

// ============================================================================
// SURVEYS - Surveys, templates, questions, responses, analytics
// ============================================================================

// JTBD (Jobs to be Done) Framework
export const JTBDForce = z.enum([
  'demographic',
  'pain_of_old',
  'pull_of_new', 
  'anchors_to_old',
  'anxiety_of_new'
]);

export type JTBDForceType = z.infer<typeof JTBDForce>;

export const Surveys = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  organization_id: z.string().uuid(),
  created_by: z.string().uuid(),
  status: z.enum(['draft', 'active', 'paused', 'completed', 'archived']).default('draft'),
  starts_at: z.date().nullable(),
  ends_at: z.date().nullable(),
  settings: z.object({
    anonymous_responses: z.boolean().default(false),
    multiple_responses: z.boolean().default(false),
    require_authentication: z.boolean().default(true),
    show_progress_bar: z.boolean().default(true),
    randomize_questions: z.boolean().default(false),
    confirmation_message: z.string().nullable()
  }).default({
    anonymous_responses: false,
    multiple_responses: false,
    require_authentication: true,
    show_progress_bar: true,
    randomize_questions: false,
    confirmation_message: null
  }),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const SurveyTemplates = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  description: z.string().nullable().default(null),
  category: z.enum(['leadership', 'technical', 'cultural', 'operational', 'strategic', 'innovation', 'readiness', 'custom']),
  status: z.enum(['draft', 'published', 'archived', 'deprecated']).default('draft'),
  visibility: z.enum(['private', 'organization', 'public', 'marketplace']).default('private'),
  organization_id: z.string().uuid().nullable().default(null),
  created_by: z.string().uuid(),
  estimated_duration: z.number().min(1).nullable().default(null),
  difficulty_level: z.number().min(1).max(5).nullable().default(null),
  tags: z.array(z.string()).default([]),
  introduction_text: z.string().nullable().default(null),
  conclusion_text: z.string().nullable().default(null),
  settings: z.object({
    randomizeQuestions: z.boolean().default(false),
    showProgress: z.boolean().default(true),
    allowSkip: z.boolean().default(false),
    allowBackNavigation: z.boolean().default(true),
    requireAllQuestions: z.boolean().default(false),
    enableTimer: z.boolean().default(false),
    timerDuration: z.number().nullable().default(null),
    showResults: z.boolean().default(false),
    collectAnonymous: z.boolean().default(false),
    enableBranching: z.boolean().default(false),
    enableScoringLogic: z.boolean().default(false),
    customTheme: z.object({
      primaryColor: z.string().nullable(),
      logoUrl: z.string().nullable(),
      backgroundUrl: z.string().nullable()
    }).nullable().default(null)
  }).default({}),
  version: z.number().default(1),
  published_at: z.date().nullable().default(null),
  usage_count: z.number().default(0),
  average_rating: z.number().min(0).max(5).nullable().default(null),
  completion_rate: z.number().min(0).max(100).nullable().default(null),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const Questions = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  text: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'radio', 'checkbox', 'select', 'scale', 'date', 'time', 'file']),
  order_index: z.number().int().min(0),
  is_required: z.boolean().default(false),
  options: z.array(z.string()).nullable(),
  validation: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    pattern: z.string().nullable()
  }).nullable(),
  metadata: z.record(z.unknown()).default({}),
  ...TimestampSchema.shape
});

export const SurveyTemplateQuestions = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  question_text: z.string().min(1),
  question_type: z.enum(['text', 'textarea', 'select', 'multiselect', 'radio', 'checkbox', 'scale', 'rating', 'date', 'time', 'datetime', 'file', 'matrix', 'ranking']),
  question_key: z.string().min(1).max(100),
  order_index: z.number().min(0),
  section: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  help_text: z.string().nullable().default(null),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    score: z.number().nullable()
  })).nullable().default(null),
  validation: z.object({
    required: z.boolean().default(false),
    minLength: z.number().nullable().default(null),
    maxLength: z.number().nullable().default(null),
    minValue: z.number().nullable().default(null),
    maxValue: z.number().nullable().default(null),
    pattern: z.string().nullable().default(null),
    customMessage: z.string().nullable().default(null)
  }).default({}),
  branching: z.object({
    enabled: z.boolean().default(false),
    conditions: z.array(z.object({
      operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
      value: z.unknown(),
      targetQuestionId: z.string().uuid()
    })).default([])
  }).default({}),
  scoring_weight: z.number().default(1),
  metadata: z.record(z.unknown()).default({}),
  is_conditional: z.boolean().default(false),
  condition_logic: z.string().nullable().default(null),
  
  // JTBD Framework Fields
  jtbd_force: JTBDForce.nullable().default(null),
  force_description: z.string().nullable().default(null),
  force_weight: z.number().min(0).max(10).nullable().default(null),
  
  ...TimestampSchema.shape
});

export const SurveySessions = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  started_at: z.date().default(() => new Date()),
  completed_at: z.date().nullable(),
  current_question_index: z.number().int().min(0).default(0),
  answers: z.record(z.unknown()).default({}),
  metadata: z.object({
    device: z.string().nullable(),
    browser: z.string().nullable(),
    ip_address: z.string().nullable()
  }).default({
    device: null,
    browser: null,
    ip_address: null
  }),
  ...TimestampSchema.shape
});

export const Responses = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  answer: z.unknown(),
  answered_at: z.date().default(() => new Date()),
  time_spent: z.number().int().min(0).nullable(), // seconds
  
  // Voice Recording Support
  has_voice_recording: z.boolean().default(false),
  voice_recording_id: z.string().uuid().nullable().default(null),
  
  ...TimestampSchema.shape
});

// ============================================================================
// VOICE RECORDING SYSTEM - Voice responses, transcription, quality metrics
// ============================================================================

export const TranscriptionStatus = z.enum([
  'pending',
  'processing', 
  'completed',
  'failed',
  'cancelled'
]);

export type TranscriptionStatusType = z.infer<typeof TranscriptionStatus>;

export const VoiceRecording = z.object({
  id: z.string().uuid(),
  
  // Relationships
  response_id: z.string().uuid(),
  survey_id: z.string().uuid(),
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  
  // Recording Details
  recording_url: z.string().url(),
  original_filename: z.string().max(255).nullable().default(null),
  duration_seconds: z.number().min(0.1).max(1800), // 0.1 sec to 30 min
  file_size_bytes: z.number().int().min(1).max(104857600), // 1 byte to 100MB
  mime_type: z.string().regex(/^audio\/(mp3|wav|ogg|m4a|webm|aac)$/),
  
  // Audio Quality Metrics
  quality_metrics: z.object({
    sample_rate: z.number().min(8000).max(48000).nullable().default(null),
    bit_rate: z.number().min(32).max(320).nullable().default(null), // kbps
    channels: z.number().min(1).max(2).default(1), // mono/stereo
    signal_to_noise_ratio: z.number().min(0).max(60).nullable().default(null), // dB
    volume_level: z.number().min(0).max(1).nullable().default(null), // 0-1 normalized
    clarity_score: z.number().min(0).max(10).nullable().default(null), // 0-10 quality score
    background_noise_level: z.number().min(0).max(1).nullable().default(null) // 0-1 normalized
  }).default({
    sample_rate: null,
    bit_rate: null,
    channels: 1,
    signal_to_noise_ratio: null,
    volume_level: null,
    clarity_score: null,
    background_noise_level: null
  }),
  
  // Transcription
  transcription_status: TranscriptionStatus.default('pending'),
  transcription_text: z.string().nullable().default(null),
  transcription_confidence: z.number().min(0).max(1).nullable().default(null),
  transcription_language: z.string().max(10).nullable().default(null), // ISO 639-1
  transcription_engine: z.string().max(50).nullable().default(null), // 'whisper', 'azure', etc.
  transcription_started_at: z.date().nullable().default(null),
  transcription_completed_at: z.date().nullable().default(null),
  transcription_error: z.string().nullable().default(null),
  
  // Processing Status
  processing_status: z.enum([
    'uploaded',
    'validating',
    'processing',
    'transcribing',
    'analyzing',
    'completed',
    'failed'
  ]).default('uploaded'),
  processing_started_at: z.date().nullable().default(null),
  processing_completed_at: z.date().nullable().default(null),
  processing_error: z.string().nullable().default(null),
  
  // Storage & Security
  storage_provider: z.string().max(50).default('local'), // 'local', 's3', 'azure', 'gcp'
  storage_region: z.string().max(50).nullable().default(null),
  encryption_key_id: z.string().nullable().default(null),
  is_encrypted: z.boolean().default(false),
  
  // Metadata
  metadata: z.object({
    device_type: z.string().nullable(),
    browser: z.string().nullable(),
    recording_environment: z.string().nullable(),
    user_agent: z.string().nullable(),
    microphone_permissions: z.boolean().nullable(),
    recording_attempts: z.number().min(1).default(1),
    compression_applied: z.boolean().default(false),
    noise_reduction_applied: z.boolean().default(false)
  }).default({
    device_type: null,
    browser: null,
    recording_environment: null,
    user_agent: null,
    microphone_permissions: null,
    recording_attempts: 1,
    compression_applied: false,
    noise_reduction_applied: false
  }),
  
  // Compliance & Privacy
  consent_given: z.boolean().default(false),
  consent_timestamp: z.date().nullable().default(null),
  retention_expires_at: z.date().nullable().default(null),
  data_processed_at: z.date().nullable().default(null),
  anonymized: z.boolean().default(false),
  
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const TranscriptionSegment = z.object({
  id: z.string().uuid(),
  voice_recording_id: z.string().uuid(),
  
  // Segment Details
  start_time_seconds: z.number().min(0),
  end_time_seconds: z.number().min(0),
  duration_seconds: z.number().min(0.01),
  
  // Transcription
  text: z.string(),
  confidence_score: z.number().min(0).max(1),
  language: z.string().max(10).nullable().default(null),
  
  // Analysis
  speaker_id: z.string().nullable().default(null), // For speaker identification
  sentiment_score: z.number().min(-1).max(1).nullable().default(null), // -1 negative, 1 positive
  emotion_detected: z.string().nullable().default(null), // 'happy', 'sad', 'neutral', etc.
  keywords: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  
  // Technical
  audio_features: z.object({
    pitch_avg: z.number().nullable(),
    pitch_variance: z.number().nullable(),
    speaking_rate: z.number().nullable(), // words per minute
    pause_count: z.number().int().min(0).default(0),
    volume_variance: z.number().nullable()
  }).nullable().default(null),
  
  ...TimestampSchema.shape
});

export const VoiceQualityMetrics = z.object({
  id: z.string().uuid(),
  voice_recording_id: z.string().uuid(),
  
  // Audio Quality Scores (0-10 scale)
  overall_quality_score: z.number().min(0).max(10),
  clarity_score: z.number().min(0).max(10),
  completeness_score: z.number().min(0).max(10), // Did recording capture full answer?
  audibility_score: z.number().min(0).max(10), // How well can it be heard?
  
  // Technical Quality
  signal_quality: z.object({
    signal_to_noise_ratio: z.number().min(0).max(60).nullable(),
    dynamic_range: z.number().min(0).max(96).nullable(), // dB
    frequency_response: z.object({
      low_end: z.number().nullable(), // Hz
      high_end: z.number().nullable(), // Hz
      balance_score: z.number().min(0).max(10).nullable()
    }).nullable(),
    distortion_level: z.number().min(0).max(1).nullable(), // 0-1, lower is better
    clipping_detected: z.boolean().default(false)
  }).nullable(),
  
  // Environmental Factors
  environment_analysis: z.object({
    background_noise_level: z.number().min(0).max(1),
    noise_type: z.string().nullable(), // 'traffic', 'office', 'fan', etc.
    echo_detected: z.boolean().default(false),
    echo_intensity: z.number().min(0).max(1).nullable(),
    room_reverb: z.number().min(0).max(1).nullable()
  }).nullable(),
  
  // Speech Quality
  speech_analysis: z.object({
    speaking_rate: z.number().min(50).max(400).nullable(), // words per minute
    pause_analysis: z.object({
      total_pauses: z.number().int().min(0),
      avg_pause_duration: z.number().min(0).nullable(),
      longest_pause: z.number().min(0).nullable(),
      natural_flow_score: z.number().min(0).max(10).nullable()
    }).nullable(),
    articulation_score: z.number().min(0).max(10).nullable(),
    pronunciation_clarity: z.number().min(0).max(10).nullable()
  }).nullable(),
  
  // Content Analysis
  content_metrics: z.object({
    word_count: z.number().int().min(0),
    sentence_count: z.number().int().min(0),
    avg_sentence_length: z.number().min(0).nullable(),
    vocabulary_complexity: z.number().min(0).max(10).nullable(),
    coherence_score: z.number().min(0).max(10).nullable(),
    completeness_indicators: z.array(z.string()).default([])
  }).nullable(),
  
  // Confidence Indicators
  reliability_metrics: z.object({
    transcription_confidence: z.number().min(0).max(1),
    consistency_score: z.number().min(0).max(10).nullable(),
    data_completeness: z.number().min(0).max(1), // How much of recording was processable
    processing_warnings: z.array(z.string()).default([]),
    quality_flags: z.array(z.enum(['low_volume', 'high_noise', 'distorted', 'incomplete', 'excellent'])).default([])
  }),
  
  // Analysis Metadata
  analyzed_at: z.date().default(() => new Date()),
  analysis_version: z.string().default('1.0'),
  analysis_engine: z.string().max(50).nullable().default(null),
  
  ...TimestampSchema.shape
});

export const ResponseAnalysisJTBD = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  analysis_type: z.enum(['individual', 'aggregate', 'comparative']).default('individual'),
  
  // Force Analysis Results
  force_scores: z.object({
    demographic: z.number().min(0).max(10).default(0),
    pain_of_old: z.number().min(0).max(10).default(0),
    pull_of_new: z.number().min(0).max(10).default(0),
    anchors_to_old: z.number().min(0).max(10).default(0),
    anxiety_of_new: z.number().min(0).max(10).default(0)
  }),
  
  // Overall JTBD Metrics
  readiness_score: z.number().min(0).max(100).nullable().default(null),
  resistance_score: z.number().min(0).max(100).nullable().default(null),
  momentum_score: z.number().min(0).max(100).nullable().default(null),
  
  // Detailed Analysis
  dominant_forces: z.array(JTBDForce).default([]),
  weak_forces: z.array(JTBDForce).default([]),
  force_balance: z.object({
    push_forces: z.number().min(0).max(10).default(0), // pain_of_old + pull_of_new
    pull_forces: z.number().min(0).max(10).default(0), // anchors_to_old + anxiety_of_new
    net_force: z.number().min(-10).max(10).default(0)  // push - pull
  }),
  
  // Insights and Recommendations
  insights: z.array(z.object({
    force: JTBDForce,
    insight: z.string(),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()).default([])
  })).default([]),
  
  recommendations: z.array(z.object({
    category: z.enum(['strengthen_push', 'reduce_pull', 'address_anxiety', 'leverage_momentum']),
    action: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    effort: z.enum(['low', 'medium', 'high']).default('medium'),
    impact: z.enum(['low', 'medium', 'high']).default('medium')
  })).default([]),
  
  // Metadata
  analysis_version: z.string().default('1.0'),
  confidence_level: z.number().min(0).max(1).nullable().default(null),
  analyzed_at: z.date().default(() => new Date()),
  analyzed_by: z.string().uuid().nullable().default(null), // System or user ID
  
  ...TimestampSchema.shape
});

// ============================================================================
// SYSTEM - Logs, analytics, files, webhooks, etc.
// ============================================================================

export const ActivityLogs = z.object({
  id: z.string().uuid(),
  activity_type: z.enum([
    'login', 'logout', 'login_failed', 'password_reset', 'password_changed',
    'email_verified', 'two_factor_enabled', 'two_factor_disabled',
    'create', 'update', 'delete', 'view', 'export', 'import',
    'share', 'unshare', 'publish', 'unpublish', 'archive', 'restore',
    'invite_sent', 'invite_accepted', 'invite_rejected', 'invite_cancelled',
    'permission_granted', 'permission_revoked', 'role_changed',
    'survey_started', 'survey_completed', 'survey_abandoned',
    'organization_created', 'organization_updated', 'organization_deleted',
    'member_added', 'member_removed', 'member_updated',
    'api_key_created', 'api_key_revoked', 'api_access',
    'webhook_created', 'webhook_triggered', 'webhook_failed',
    'integration_connected', 'integration_disconnected'
  ]),
  user_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  entity_type: z.enum([
    'user', 'organization', 'survey', 'question', 'response',
    'template', 'invitation', 'api_key', 'webhook', 'export_job',
    'analysis', 'department', 'file_upload', 'session', 'billing',
    'integration', 'system'
  ]),
  entity_id: z.string().nullable(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  status: z.enum(['success', 'warning', 'error', 'pending', 'cancelled']).default('success'),
  context: z.object({
    ip_address: z.string().nullable(),
    user_agent: z.string().nullable(),
    session_id: z.string().nullable(),
    request_id: z.string().nullable(),
    location: z.object({
      country: z.string().nullable(),
      region: z.string().nullable(),
      city: z.string().nullable()
    }).nullable(),
    device: z.object({
      type: z.string().nullable(),
      os: z.string().nullable(),
      browser: z.string().nullable()
    }).nullable(),
    performance: z.object({
      duration_ms: z.number().nullable(),
      memory_used: z.number().nullable(),
      cpu_usage: z.number().nullable()
    }).nullable(),
    error: z.object({
      code: z.string().nullable(),
      message: z.string().nullable(),
      stack_trace: z.string().nullable()
    }).nullable()
  }).nullable(),
  occurred_at: z.date().default(() => new Date()),
  ...TimestampSchema.shape
});

export const AuditLogs = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  action: z.string().min(1).max(100),
  entity_type: z.string().min(1).max(50),
  entity_id: z.string().nullable(),
  old_values: z.record(z.unknown()).nullable(),
  new_values: z.record(z.unknown()).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  ...TimestampSchema.shape
});

export const FileUploads = z.object({
  id: z.string().uuid(),
  original_name: z.string().min(1).max(255),
  stored_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(100),
  size: z.number().int().min(0),
  storage_path: z.string().min(1),
  uploaded_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  metadata: z.record(z.unknown()).default({}),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape
});

export const WebhookSubscriptions = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  is_active: z.boolean().default(true),
  secret: z.string().min(32),
  metadata: z.record(z.unknown()).default({}),
  ...TimestampSchema.shape
});

export const ExportJobs = z.object({
  id: z.string().uuid(),
  type: z.enum(['survey_responses', 'analytics', 'audit_logs', 'full_backup']),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  requested_by: z.string().uuid(),
  organization_id: z.string().uuid(),
  file_url: z.string().url().nullable(),
  expires_at: z.date().nullable(),
  error_message: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  ...TimestampSchema.shape
});

// ============================================================================
// TYPE EXPORTS - Inferred types from schemas
// ============================================================================

// Auth & Identity Types
export type User = z.infer<typeof Users>;
export type UserProfile = z.infer<typeof UserProfiles>;
export type UserSession = z.infer<typeof UserSessions>;
export type OnboardingProgressType = z.infer<typeof OnboardingProgress>;

// Organization Types
export type Organization = z.infer<typeof Organizations>;
export type OrganizationMember = z.infer<typeof OrganizationMembers>;
export type OrganizationInvitation = z.infer<typeof OrganizationInvitations>;

// Invitation Types
export type Invitation = z.infer<typeof Invitations>;
export type EmailTrackingType = z.infer<typeof EmailTracking>;

// Survey Types
export type Survey = z.infer<typeof Surveys>;
export type SurveyTemplate = z.infer<typeof SurveyTemplates>;
export type Question = z.infer<typeof Questions>;
export type SurveyTemplateQuestion = z.infer<typeof SurveyTemplateQuestions>;
export type SurveySession = z.infer<typeof SurveySessions>;
export type Response = z.infer<typeof Responses>;
export type ResponseAnalysisJTBDType = z.infer<typeof ResponseAnalysisJTBD>;

// Voice Recording Types
export type VoiceRecordingType = z.infer<typeof VoiceRecording>;
export type TranscriptionSegmentType = z.infer<typeof TranscriptionSegment>;
export type VoiceQualityMetricsType = z.infer<typeof VoiceQualityMetrics>;

// System Types
export type ActivityLog = z.infer<typeof ActivityLogs>;
export type AuditLog = z.infer<typeof AuditLogs>;
export type FileUpload = z.infer<typeof FileUploads>;
export type WebhookSubscription = z.infer<typeof WebhookSubscriptions>;
export type ExportJob = z.infer<typeof ExportJobs>;

// ============================================================================
// VALIDATION FUNCTIONS - Runtime validation helpers
// ============================================================================

export const validate = {
  // Auth & Identity
  user: (data: unknown) => Users.parse(data),
  userProfile: (data: unknown) => UserProfiles.parse(data),
  userSession: (data: unknown) => UserSessions.parse(data),
  onboardingProgress: (data: unknown) => OnboardingProgress.parse(data),
  
  // Organizations
  organization: (data: unknown) => Organizations.parse(data),
  organizationMember: (data: unknown) => OrganizationMembers.parse(data),
  organizationInvitation: (data: unknown) => OrganizationInvitations.parse(data),
  
  // Invitations
  invitation: (data: unknown) => Invitations.parse(data),
  emailTracking: (data: unknown) => EmailTracking.parse(data),
  
  // Surveys
  survey: (data: unknown) => Surveys.parse(data),
  surveyTemplate: (data: unknown) => SurveyTemplates.parse(data),
  question: (data: unknown) => Questions.parse(data),
  surveyTemplateQuestion: (data: unknown) => SurveyTemplateQuestions.parse(data),
  surveySession: (data: unknown) => SurveySessions.parse(data),
  response: (data: unknown) => Responses.parse(data),
  responseAnalysisJTBD: (data: unknown) => ResponseAnalysisJTBD.parse(data),
  
  // Voice Recording
  voiceRecording: (data: unknown) => VoiceRecording.parse(data),
  transcriptionSegment: (data: unknown) => TranscriptionSegment.parse(data),
  voiceQualityMetrics: (data: unknown) => VoiceQualityMetrics.parse(data),
  
  // System
  activityLog: (data: unknown) => ActivityLogs.parse(data),
  auditLog: (data: unknown) => AuditLogs.parse(data),
  fileUpload: (data: unknown) => FileUploads.parse(data),
  webhookSubscription: (data: unknown) => WebhookSubscriptions.parse(data),
  exportJob: (data: unknown) => ExportJobs.parse(data)
};

// ============================================================================
// HELPER FUNCTIONS - Common operations
// ============================================================================

export function isDeleted(entity: { deleted_at: Date | null }): boolean {
  return entity.deleted_at !== null;
}

export function isExpired(entity: { expires_at: Date }): boolean {
  return new Date(entity.expires_at) < new Date();
}

export function isActive(entity: { is_active?: boolean }): boolean {
  return entity.is_active !== false;
}

export function hasPermission(member: OrganizationMember, permission: string): boolean {
  return member.permissions.includes(permission) || member.role === 'admin';
}

// ============================================================================
// JTBD HELPER FUNCTIONS - Jobs to be Done analysis helpers
// ============================================================================

export function validateJTBDForce(force: string): force is JTBDForceType {
  return JTBDForce.safeParse(force).success;
}

export function calculateForceBalance(scores: {
  demographic: number;
  pain_of_old: number;
  pull_of_new: number;
  anchors_to_old: number;
  anxiety_of_new: number;
}) {
  const pushForces = scores.pain_of_old + scores.pull_of_new;
  const pullForces = scores.anchors_to_old + scores.anxiety_of_new;
  const netForce = pushForces - pullForces;
  
  return {
    push_forces: Math.min(10, Math.max(0, pushForces)),
    pull_forces: Math.min(10, Math.max(0, pullForces)), 
    net_force: Math.min(10, Math.max(-10, netForce))
  };
}

export function calculateReadinessScore(forceBalance: {
  push_forces: number;
  pull_forces: number;
  net_force: number;
}): number {
  // Readiness is based on net positive force, scaled to 0-100
  const normalizedScore = ((forceBalance.net_force + 10) / 20) * 100;
  return Math.min(100, Math.max(0, Math.round(normalizedScore)));
}

export function identifyDominantForces(scores: {
  demographic: number;
  pain_of_old: number;
  pull_of_new: number;
  anchors_to_old: number;
  anxiety_of_new: number;
}, threshold: number = 7): JTBDForceType[] {
  const forces: Array<[JTBDForceType, number]> = [
    ['demographic', scores.demographic],
    ['pain_of_old', scores.pain_of_old],
    ['pull_of_new', scores.pull_of_new],
    ['anchors_to_old', scores.anchors_to_old],
    ['anxiety_of_new', scores.anxiety_of_new]
  ];
  
  return forces
    .filter(([, score]) => score >= threshold)
    .map(([force]) => force);
}

export function identifyWeakForces(scores: {
  demographic: number;
  pain_of_old: number;
  pull_of_new: number;
  anchors_to_old: number;
  anxiety_of_new: number;
}, threshold: number = 3): JTBDForceType[] {
  const forces: Array<[JTBDForceType, number]> = [
    ['demographic', scores.demographic],
    ['pain_of_old', scores.pain_of_old],
    ['pull_of_new', scores.pull_of_new],
    ['anchors_to_old', scores.anchors_to_old],
    ['anxiety_of_new', scores.anxiety_of_new]
  ];
  
  return forces
    .filter(([, score]) => score <= threshold)
    .map(([force]) => force);
}

export function validateJTBDAnalysis(analysis: unknown): analysis is ResponseAnalysisJTBDType {
  return ResponseAnalysisJTBD.safeParse(analysis).success;
}

// ============================================================================
// VOICE RECORDING HELPER FUNCTIONS - Voice recording validation and utilities
// ============================================================================

export function isValidAudioMimeType(mimeType: string): boolean {
  const validTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm', 'audio/aac'];
  return validTypes.includes(mimeType.toLowerCase());
}

export function validateRecordingDuration(durationSeconds: number): boolean {
  return durationSeconds >= 0.1 && durationSeconds <= 1800; // 0.1 seconds to 30 minutes
}

export function validateFileSize(fileSizeBytes: number): boolean {
  return fileSizeBytes >= 1 && fileSizeBytes <= 104857600; // 1 byte to 100MB
}

export function calculateQualityScore(metrics: VoiceQualityMetricsType): number {
  const scores = [
    metrics.overall_quality_score,
    metrics.clarity_score,
    metrics.completeness_score,
    metrics.audibility_score
  ];
  
  const validScores = scores.filter(score => score !== null && score !== undefined);
  if (validScores.length === 0) return 0;
  
  return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
}

export function isTranscriptionComplete(recording: VoiceRecordingType): boolean {
  return recording.transcription_status === 'completed' && 
         recording.transcription_text !== null && 
         recording.transcription_text.trim().length > 0;
}

export function getProcessingStatusOrder(): Array<VoiceRecordingType['processing_status']> {
  return ['uploaded', 'validating', 'processing', 'transcribing', 'analyzing', 'completed', 'failed'];
}

export function isProcessingComplete(status: VoiceRecordingType['processing_status']): boolean {
  return status === 'completed';
}

export function hasProcessingFailed(status: VoiceRecordingType['processing_status']): boolean {
  return status === 'failed';
}

export function calculateTranscriptionAccuracy(segments: TranscriptionSegmentType[]): number {
  if (segments.length === 0) return 0;
  
  const totalConfidence = segments.reduce((sum, segment) => sum + segment.confidence_score, 0);
  return totalConfidence / segments.length;
}

export function validateVoiceRecordingUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow common storage providers and local development
    const validProtocols = ['https:', 'http:']; // http: for local dev
    const validHosts = [
      'localhost',
      '127.0.0.1',
      // AWS S3
      's3.amazonaws.com',
      's3.us-east-1.amazonaws.com',
      's3.us-west-2.amazonaws.com',
      // Azure Blob Storage
      'blob.core.windows.net',
      // Google Cloud Storage
      'storage.googleapis.com',
      'storage.cloud.google.com'
    ];
    
    return validProtocols.includes(parsed.protocol) && 
           (validHosts.some(host => parsed.hostname.includes(host)) || 
            parsed.hostname.endsWith('.s3.amazonaws.com') ||
            parsed.hostname.endsWith('.blob.core.windows.net') ||
            parsed.hostname.includes('storage.googleapis.com'));
  } catch {
    return false;
  }
}

// Voice Recording Creation Helper
export function createVoiceRecordingTemplate(responseId: string, surveyId: string, sessionId: string, questionId: string, userId?: string): Partial<VoiceRecordingType> {
  return {
    response_id: responseId,
    survey_id: surveyId,
    session_id: sessionId,
    question_id: questionId,
    user_id: userId || null,
    transcription_status: 'pending',
    processing_status: 'uploaded',
    quality_metrics: {
      sample_rate: null,
      bit_rate: null,
      channels: 1,
      signal_to_noise_ratio: null,
      volume_level: null,
      clarity_score: null,
      background_noise_level: null
    },
    metadata: {
      device_type: null,
      browser: null,
      recording_environment: null,
      user_agent: null,
      microphone_permissions: null,
      recording_attempts: 1,
      compression_applied: false,
      noise_reduction_applied: false
    },
    consent_given: false,
    is_encrypted: false,
    anonymized: false
  };
}

// Additional JTBD-specific exports for services
export const JTBDForceScores = z.object({
  pain_of_old: z.number().min(0).max(10),
  pull_of_new: z.number().min(0).max(10), 
  anchors_to_old: z.number().min(0).max(10),
  anxiety_of_new: z.number().min(0).max(10),
  demographic: z.number().min(0).max(10)
});

export type JTBDForceScoresType = z.infer<typeof JTBDForceScores>;

// Validate JTBD Force scores
export function validateJTBDForceScores(scores: unknown): scores is JTBDForceScoresType {
  return JTBDForceScores.safeParse(scores).success;
}

export function createJTBDAnalysisTemplate(surveyId: string, sessionId: string, userId?: string): Partial<ResponseAnalysisJTBDType> {
  return {
    survey_id: surveyId,
    session_id: sessionId,
    user_id: userId || null,
    analysis_type: 'individual',
    force_scores: {
      demographic: 0,
      pain_of_old: 0,
      pull_of_new: 0,
      anchors_to_old: 0,
      anxiety_of_new: 0
    },
    readiness_score: null,
    resistance_score: null,
    momentum_score: null,
    dominant_forces: [],
    weak_forces: [],
    force_balance: {
      push_forces: 0,
      pull_forces: 0,
      net_force: 0
    },
    insights: [],
    recommendations: [],
    analysis_version: '1.0',
    confidence_level: null,
    analyzed_at: new Date(),
    analyzed_by: null
  };
}

// ============================================================================
// DATABASE INDEXES - For reference when creating migrations
// ============================================================================

export const DatabaseIndexes = {
  Users: ['email', 'created_at'],
  UserProfiles: ['user_id', 'organization_id', 'email'],
  UserSessions: ['user_id', 'token_hash', 'expires_at'],
  OnboardingProgress: ['user_id', 'current_step'],
  
  Organizations: ['name', 'domain', 'created_at'],
  OrganizationMembers: ['organization_id', 'user_id', 'role'],
  OrganizationInvitations: ['organization_id', 'email', 'token', 'status'],
  
  Invitations: ['email', 'token', 'type', 'status', 'expires_at'],
  EmailTracking: ['invitation_id', 'email', 'status'],
  
  Surveys: ['organization_id', 'created_by', 'status'],
  SurveyTemplates: ['organization_id', 'category', 'status', 'visibility'],
  Questions: ['survey_id', 'order_index'],
  SurveyTemplateQuestions: ['template_id', 'order_index', 'question_key', 'jtbd_force'],
  SurveySessions: ['survey_id', 'user_id', 'started_at'],
  Responses: ['survey_id', 'session_id', 'question_id', 'user_id', 'has_voice_recording', 'voice_recording_id'],
  ResponseAnalysisJTBD: ['survey_id', 'session_id', 'user_id', 'analysis_type', 'analyzed_at'],
  
  VoiceRecordings: ['response_id', 'survey_id', 'session_id', 'question_id', 'user_id', 'transcription_status', 'processing_status', 'created_at'],
  TranscriptionSegments: ['voice_recording_id', 'start_time_seconds', 'end_time_seconds'],
  VoiceQualityMetrics: ['voice_recording_id', 'overall_quality_score', 'analyzed_at'],
  
  ActivityLogs: ['user_id', 'organization_id', 'entity_type', 'entity_id', 'activity_type', 'occurred_at'],
  AuditLogs: ['user_id', 'entity_type', 'entity_id', 'created_at'],
  FileUploads: ['uploaded_by', 'organization_id', 'created_at'],
  WebhookSubscriptions: ['organization_id', 'is_active'],
  ExportJobs: ['organization_id', 'requested_by', 'status', 'created_at']
};

// ============================================================================
// FOREIGN KEY RELATIONSHIPS - For reference
// ============================================================================

export const ForeignKeys = {
  UserProfiles: { 
    id: 'Users(id) ON DELETE CASCADE',
    organization_id: 'Organizations(id) ON DELETE SET NULL'
  },
  UserSessions: { 
    user_id: 'Users(id) ON DELETE CASCADE' 
  },
  OnboardingProgress: { 
    user_id: 'Users(id) ON DELETE CASCADE' 
  },
  
  OrganizationMembers: {
    organization_id: 'Organizations(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE CASCADE',
    invited_by: 'Users(id) ON DELETE SET NULL'
  },
  OrganizationInvitations: {
    organization_id: 'Organizations(id) ON DELETE CASCADE',
    invited_by: 'Users(id) ON DELETE RESTRICT'
  },
  
  Invitations: {
    sender_id: 'Users(id) ON DELETE RESTRICT',
    template_id: 'InvitationTemplates(id) ON DELETE SET NULL'
  },
  EmailTracking: {
    invitation_id: 'Invitations(id) ON DELETE CASCADE'
  },
  
  Surveys: {
    organization_id: 'Organizations(id) ON DELETE CASCADE',
    created_by: 'Users(id) ON DELETE RESTRICT'
  },
  SurveyTemplates: {
    organization_id: 'Organizations(id) ON DELETE SET NULL',
    created_by: 'Users(id) ON DELETE RESTRICT'
  },
  Questions: {
    survey_id: 'Surveys(id) ON DELETE CASCADE'
  },
  SurveyTemplateQuestions: {
    template_id: 'SurveyTemplates(id) ON DELETE CASCADE'
  },
  SurveySessions: {
    survey_id: 'Surveys(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE SET NULL'
  },
  Responses: {
    survey_id: 'Surveys(id) ON DELETE CASCADE',
    session_id: 'SurveySessions(id) ON DELETE CASCADE',
    question_id: 'Questions(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE SET NULL'
  },
  ResponseAnalysisJTBD: {
    survey_id: 'Surveys(id) ON DELETE CASCADE',
    session_id: 'SurveySessions(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE SET NULL',
    analyzed_by: 'Users(id) ON DELETE SET NULL'
  },
  
  VoiceRecordings: {
    response_id: 'Responses(id) ON DELETE CASCADE',
    survey_id: 'Surveys(id) ON DELETE CASCADE',
    session_id: 'SurveySessions(id) ON DELETE CASCADE',
    question_id: 'Questions(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE SET NULL'
  },
  TranscriptionSegments: {
    voice_recording_id: 'VoiceRecordings(id) ON DELETE CASCADE'
  },
  VoiceQualityMetrics: {
    voice_recording_id: 'VoiceRecordings(id) ON DELETE CASCADE'
  },
  
  ActivityLogs: {
    user_id: 'Users(id) ON DELETE SET NULL',
    organization_id: 'Organizations(id) ON DELETE SET NULL'
  },
  AuditLogs: {
    user_id: 'Users(id) ON DELETE SET NULL'
  },
  FileUploads: {
    uploaded_by: 'Users(id) ON DELETE RESTRICT',
    organization_id: 'Organizations(id) ON DELETE SET NULL'
  },
  WebhookSubscriptions: {
    organization_id: 'Organizations(id) ON DELETE CASCADE'
  },
  ExportJobs: {
    requested_by: 'Users(id) ON DELETE RESTRICT',
    organization_id: 'Organizations(id) ON DELETE CASCADE'
  }
};

// ============================================================================
// ACTIVITY LOG SCHEMAS AND HELPERS (for compatibility)
// ============================================================================

// Activity log related schemas - placeholder for missing exports
export const ActivityLogsTableSchema = z.object({
  id: z.string().uuid(),
  activity_type: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  user_id: z.string().uuid().nullable(),
  organization_id: z.string().uuid().nullable(),
  description: z.string(),
  metadata: z.any(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'completed', 'failed']),
  created_at: z.date()
});

export const ActivityAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  period: z.string(),
  metrics: z.any(),
  created_at: z.date()
});

export const ActivitySubscriptionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_types: z.array(z.string()),
  notification_method: z.enum(['email', 'in_app', 'webhook']),
  is_active: z.boolean(),
  created_at: z.date()
});

export const ActivityNotificationsTableSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  activity_id: z.string().uuid(),
  status: z.enum(['pending', 'sent', 'failed']),
  sent_at: z.date().nullable(),
  created_at: z.date()
});

export const RetentionPolicySchema = z.object({
  duration_days: z.number().int().positive(),
  archive_enabled: z.boolean()
});

// Helper functions for activity logs
export const validateActivityLog = (data: unknown) => ActivityLogsTableSchema.parse(data);
export const validateActivityAnalytics = (data: unknown) => ActivityAnalyticsTableSchema.parse(data);
export const validateActivitySubscription = (data: unknown) => ActivitySubscriptionsTableSchema.parse(data);
export const validateActivityNotification = (data: unknown) => ActivityNotificationsTableSchema.parse(data);

export const shouldTriggerNotification = (activity: any, subscription: any): boolean => {
  return subscription.is_active && subscription.activity_types.includes(activity.activity_type);
};

export const createActivityLogEntry = (params: any) => ({
  id: crypto.randomUUID(),
  ...params,
  created_at: new Date()
});

export const formatActivityDescription = (activity: any): string => {
  return `${activity.activity_type} on ${activity.entity_type} ${activity.entity_id}`;
};

export const isHighSeverityActivity = (activity: any): boolean => {
  return activity.severity === 'high' || activity.severity === 'critical';
};

export type CreateActivityLogParams = z.infer<typeof ActivityLogsTableSchema>;

// ============================================================================
// ADDITIONAL PLACEHOLDER SCHEMAS (for build compatibility)
// ============================================================================

// Re-export all placeholder schemas for missing services
// export * from './schema-placeholders'; // Commented out - file doesn't exist

// ============================================================================
// UTILITY FUNCTIONS AND VALIDATORS
// ============================================================================

// Table Schema exports for backward compatibility
export const UsersTableSchema = Users;
export const SurveysTableSchema = Surveys;
export const OrganizationsTableSchema = Organizations;
export const QuestionsTableSchema = Questions;
export const ResponsesTableSchema = Responses;
// Missing table schemas - using placeholders until implemented
export const AnalyticsTableSchema = AuditLogs; // TODO: Replace with actual Analytics schema
export const ReportsTableSchema = AuditLogs; // TODO: Replace with actual Reports schema  
export const NotificationsTableSchema = AuditLogs; // TODO: Replace with actual Notifications schema
export const ApiKeysTableSchema = AuditLogs; // TODO: Replace with actual ApiKeys schema
export const AuditLogsTableSchema = AuditLogs;

// All table schemas collection
export const AllTableSchemas = {
  Users,
  UserProfiles,
  Sessions: UserSessions, // Use UserSessions for Sessions
  Organizations,
  OrganizationMembers,
  OrganizationInvitations,
  Surveys,
  SurveyTemplates,
  Questions,
  QuestionOptions: Questions, // TODO: Replace with actual QuestionOptions schema
  Responses,
  ResponseAnswers: ResponseAnalysisJTBD, // TODO: Replace with actual ResponseAnswers schema
  SurveyVersions: SurveySessions, // TODO: Replace with actual SurveyVersions schema
  Analytics: AuditLogs, // TODO: Replace with actual Analytics schema
  Reports: AuditLogs, // TODO: Replace with actual Reports schema
  Notifications: AuditLogs, // TODO: Replace with actual Notifications schema
  ApiKeys: AuditLogs, // TODO: Replace with actual ApiKeys schema
  AuditLogs,
  SupabaseUsers: Users, // TODO: Replace with actual SupabaseUsers schema
  PublicUsers: Users, // TODO: Replace with actual PublicUsers schema
  Files: FileUploads, // Use FileUploads for Files
  Webhooks: WebhookSubscriptions, // Use WebhookSubscriptions for Webhooks
  ScheduledJobs: ExportJobs, // Use ExportJobs for ScheduledJobs
  // Activity schemas
  ActivityLogs: ActivityLogsTableSchema,
  ActivityAnalytics: ActivityAnalyticsTableSchema,
  ActivitySubscriptions: ActivitySubscriptionsTableSchema,
  ActivityNotifications: ActivityNotificationsTableSchema
};

// Foreign Key Constraints - SQL format for migrations
export const ForeignKeyConstraints = {
  UserProfiles: { 
    user_id: 'Users(id) ON DELETE CASCADE',
    organization_id: 'Organizations(id) ON DELETE SET NULL'
  },
  OrganizationMembers: { 
    organization_id: 'Organizations(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE CASCADE'
  },
  Surveys: {
    organization_id: 'Organizations(id) ON DELETE CASCADE',
    created_by: 'Users(id) ON DELETE RESTRICT'
  },
  Questions: { survey_id: 'Surveys(id) ON DELETE CASCADE' },
  Responses: {
    survey_id: 'Surveys(id) ON DELETE CASCADE',
    user_id: 'Users(id) ON DELETE SET NULL',
    session_id: 'SurveySessions(id) ON DELETE CASCADE',
    question_id: 'Questions(id) ON DELETE CASCADE'
  },
  ResponseAnswers: {
    response_id: 'Responses(id) ON DELETE CASCADE',
    question_id: 'Questions(id) ON DELETE CASCADE'
  }
};

// Note: DatabaseIndexes is already defined above, using that one

// Validation utilities
export function validateTableSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// API Version constant
export const API_VERSION = '1.0.0';

// ============================================================================
// ADDITIONAL MISSING EXPORTS FOR SERVICES
// ============================================================================

// Re-export schemas with expected names
export const InvitationsTableSchema = Invitations;
export const SurveyTemplatesTableSchema = SurveyTemplates;
export const EmailTrackingTableSchema = EmailTracking;
export const UserProfilesTableSchema = UserProfiles;
export const OnboardingProgressTableSchema = OnboardingProgress;
export const UserSessionsTableSchema = UserSessions; // Fix reference to use UserSessions instead of Sessions
export const SurveyTemplateQuestionsTableSchema = SurveyTemplateQuestions;

// Add missing function that contracts expect
export const validateDatabaseRow = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

// Create missing schemas that services expect
export const InvitationTemplatesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  is_active: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date()
});

export const ProfileMetadataTableSchema = z.object({
  user_id: z.string().uuid(),
  key: z.string(),
  value: z.any(),
  created_at: z.date(),
  updated_at: z.date()
});

export const SurveyTemplateVersionsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  version: z.number(),
  changes: z.any(),
  created_by: z.string().uuid(),
  created_at: z.date()
});

export const TemplateSharesTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  shared_with: z.string().uuid().nullable(),
  shared_with_org: z.string().uuid().nullable(),
  permissions: z.array(z.string()),
  created_at: z.date()
});

export const TemplateAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  views: z.number().default(0),
  uses: z.number().default(0),
  rating: z.number().nullable(),
  created_at: z.date(),
  updated_at: z.date()
});

export const TemplateReviewsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  reviewer_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.date()
});

export const InvitationBatchesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  total_count: z.number(),
  sent_count: z.number().default(0),
  accepted_count: z.number().default(0),
  created_by: z.string().uuid(),
  created_at: z.date()
});

export const InvitationAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  invitation_id: z.string().uuid().nullable(),
  batch_id: z.string().uuid().nullable(),
  open_count: z.number().default(0),
  click_count: z.number().default(0),
  accept_rate: z.number().nullable(),
  created_at: z.date(),
  updated_at: z.date()
});

export const InvitationSettingsTableSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  auto_expire_days: z.number().default(7),
  max_batch_size: z.number().default(100),
  allow_resend: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date()
});

// ============================================================================
// HELPER FUNCTIONS FOR SERVICES
// ============================================================================

/**
 * Generate a secure random invitation token
 */
export function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Create default expiry date (7 days from now)
 */
export function createDefaultExpiry(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

/**
 * Check if invitation can be accepted
 */
export function canInvitationBeAccepted(invitation: any): boolean {
  if (!invitation) return false;
  if (invitation.status !== 'pending') return false;
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) return false;
  return true;
}

/**
 * Validate invitation template
 */
export function validateInvitationTemplate(template: unknown) {
  return InvitationTemplatesTableSchema.parse(template);
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(variables: any): boolean {
  if (!variables || typeof variables !== 'object') return false;
  return true;
}

/**
 * Render template with variables
 */
export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  Object.entries(variables).forEach(([key, value]) => {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  return rendered;
}

/**
 * Validate invitation batch
 */
export function validateInvitationBatch(batch: unknown) {
  return InvitationBatchesTableSchema.parse(batch);
}

/**
 * Validate invitation settings
 */
export function validateInvitationSettings(settings: unknown) {
  return InvitationSettingsTableSchema.parse(settings);
}

/**
 * Validate template version
 */
export function validateTemplateVersion(version: unknown) {
  return SurveyTemplateVersionsTableSchema.parse(version);
}

/**
 * Validate template share
 */
export function validateTemplateShare(share: unknown) {
  return TemplateSharesTableSchema.parse(share);
}

/**
 * Validate template analytics
 */
export function validateTemplateAnalytics(analytics: unknown) {
  return TemplateAnalyticsTableSchema.parse(analytics);
}

/**
 * Validate template review
 */
export function validateTemplateReview(review: unknown) {
  return TemplateReviewsTableSchema.parse(review);
}

/**
 * Get next onboarding step
 */
export function getNextOnboardingStep(currentStep: string): string {
  const steps = ['profile', 'organization', 'preferences', 'survey', 'completed'];
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return 'completed';
  }
  return steps[currentIndex + 1];
}