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
  users: ['email', 'created_at'],
  user_profiles: ['user_id', 'organization_id', 'email'],
  user_sessions: ['user_id', 'token_hash', 'expires_at'],
  onboarding_progress: ['user_id', 'current_step'],
  
  organizations: ['name', 'domain', 'created_at'],
  organization_members: ['organization_id', 'user_id', 'role'],
  organization_invitations: ['organization_id', 'email', 'token', 'status'],
  
  invitations: ['email', 'token', 'type', 'status', 'expires_at'],
  email_tracking: ['invitation_id', 'email', 'status'],
  
  surveys: ['organization_id', 'created_by', 'status'],
  survey_templates: ['organization_id', 'category', 'status', 'visibility'],
  questions: ['survey_id', 'order_index'],
  survey_template_questions: ['template_id', 'order_index', 'question_key', 'jtbd_force'],
  survey_sessions: ['survey_id', 'user_id', 'started_at'],
  responses: ['survey_id', 'session_id', 'question_id', 'user_id'],
  response_analysis_jtbd: ['survey_id', 'session_id', 'user_id', 'analysis_type', 'analyzed_at'],
  
  activity_logs: ['user_id', 'organization_id', 'entity_type', 'entity_id', 'activity_type', 'occurred_at'],
  audit_logs: ['user_id', 'entity_type', 'entity_id', 'created_at'],
  file_uploads: ['uploaded_by', 'organization_id', 'created_at'],
  webhook_subscriptions: ['organization_id', 'is_active'],
  export_jobs: ['organization_id', 'requested_by', 'status', 'created_at']
};

// ============================================================================
// FOREIGN KEY RELATIONSHIPS - For reference
// ============================================================================

export const ForeignKeys = {
  user_profiles: { 
    id: 'auth.users(id) ON DELETE CASCADE',
    organization_id: 'organizations(id) ON DELETE SET NULL'
  },
  user_sessions: { 
    user_id: 'auth.users(id) ON DELETE CASCADE' 
  },
  onboarding_progress: { 
    user_id: 'auth.users(id) ON DELETE CASCADE' 
  },
  
  organization_members: {
    organization_id: 'organizations(id) ON DELETE CASCADE',
    user_id: 'auth.users(id) ON DELETE CASCADE',
    invited_by: 'auth.users(id) ON DELETE SET NULL'
  },
  organization_invitations: {
    organization_id: 'organizations(id) ON DELETE CASCADE',
    invited_by: 'auth.users(id) ON DELETE RESTRICT'
  },
  
  invitations: {
    sender_id: 'auth.users(id) ON DELETE RESTRICT',
    template_id: 'invitation_templates(id) ON DELETE SET NULL'
  },
  email_tracking: {
    invitation_id: 'invitations(id) ON DELETE CASCADE'
  },
  
  surveys: {
    organization_id: 'organizations(id) ON DELETE CASCADE',
    created_by: 'auth.users(id) ON DELETE RESTRICT'
  },
  survey_templates: {
    organization_id: 'organizations(id) ON DELETE SET NULL',
    created_by: 'auth.users(id) ON DELETE RESTRICT'
  },
  questions: {
    survey_id: 'surveys(id) ON DELETE CASCADE'
  },
  survey_template_questions: {
    template_id: 'survey_templates(id) ON DELETE CASCADE'
  },
  survey_sessions: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    user_id: 'auth.users(id) ON DELETE SET NULL'
  },
  responses: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    session_id: 'survey_sessions(id) ON DELETE CASCADE',
    question_id: 'questions(id) ON DELETE CASCADE',
    user_id: 'auth.users(id) ON DELETE SET NULL'
  },
  response_analysis_jtbd: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    session_id: 'survey_sessions(id) ON DELETE CASCADE',
    user_id: 'auth.users(id) ON DELETE SET NULL',
    analyzed_by: 'auth.users(id) ON DELETE SET NULL'
  },
  
  activity_logs: {
    user_id: 'auth.users(id) ON DELETE SET NULL',
    organization_id: 'organizations(id) ON DELETE SET NULL'
  },
  audit_logs: {
    user_id: 'auth.users(id) ON DELETE SET NULL'
  },
  file_uploads: {
    uploaded_by: 'auth.users(id) ON DELETE RESTRICT',
    organization_id: 'organizations(id) ON DELETE SET NULL'
  },
  webhook_subscriptions: {
    organization_id: 'organizations(id) ON DELETE CASCADE'
  },
  export_jobs: {
    requested_by: 'auth.users(id) ON DELETE RESTRICT',
    organization_id: 'organizations(id) ON DELETE CASCADE'
  }
};