/**
 * DATABASE CONTRACTS - SCHEMA DEFINITIONS
 * 
 * WARNING: These schemas define the database structure for all system components.
 * Changes to these schemas MUST include migration scripts and backwards compatibility.
 * 
 * VALIDATION: Run `npm run validate:schema` before any modifications
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const TimestampSchema = z.object({
  created_at: z.date().default(() => new Date()),
  updated_at: z.date().default(() => new Date()),
});

export const SoftDeleteSchema = z.object({
  deleted_at: z.date().nullable().default(null),
});

export const MetadataSchema = z.record(z.unknown()).default({});

// ============================================================================
// USER MANAGEMENT TABLES
// ============================================================================

export const UserRoleSchema = z.enum(['admin', 'user', 'moderator', 'readonly']);

export const NotificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  sms: z.boolean().default(false),
  frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('daily'),
});

export const PrivacySettingsSchema = z.object({
  profile_visibility: z.enum(['public', 'private', 'friends']).default('private'),
  data_sharing: z.boolean().default(false),
  analytics: z.boolean().default(true),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  notifications: NotificationSettingsSchema,
  privacy: PrivacySettingsSchema,
});

export const UsersTableSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string().nullable(),
  role: UserRoleSchema.default('user'),
  is_active: z.boolean().default(true),
  last_login_at: z.date().nullable(),
  email_verified_at: z.date().nullable(),
  preferences: UserPreferencesSchema,
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

export const UserSessionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string(),
  refresh_token_hash: z.string(),
  expires_at: z.date(),
  user_agent: z.string().nullable(),
  ip_address: z.string().nullable(),
  is_active: z.boolean().default(true),
  ...TimestampSchema.shape,
});

export const PasswordResetsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string(),
  expires_at: z.date(),
  used_at: z.date().nullable(),
  ...TimestampSchema.shape,
});

// ============================================================================
// SURVEY MANAGEMENT TABLES
// ============================================================================

export const SurveyStatusSchema = z.enum(['draft', 'published', 'paused', 'closed', 'archived']);

export const SurveySettingsSchema = z.object({
  is_public: z.boolean().default(false),
  require_auth: z.boolean().default(false),
  allow_anonymous: z.boolean().default(true),
  max_responses: z.number().int().positive().nullable(),
  expires_at: z.date().nullable(),
  redirect_url: z.string().url().nullable(),
  show_progress_bar: z.boolean().default(true),
  allow_back_navigation: z.boolean().default(true),
});

export const SurveysTableSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable(),
  settings: SurveySettingsSchema,
  status: SurveyStatusSchema.default('draft'),
  created_by: z.string().uuid(),
  version: z.number().int().positive().default(1),
  published_at: z.date().nullable(),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

// ============================================================================
// QUESTION MANAGEMENT TABLES
// ============================================================================

export const QuestionTypeSchema = z.enum([
  'text', 'textarea', 'number', 'email', 'phone', 'url', 'date', 'time', 'datetime',
  'radio', 'checkbox', 'select', 'multiselect',
  'rating', 'scale', 'matrix',
  'file', 'voice', 'signature'
]);

export const QuestionValidationSchema = z.object({
  min_length: z.number().int().min(0).nullable(),
  max_length: z.number().int().min(0).nullable(),
  min_value: z.number().nullable(),
  max_value: z.number().nullable(),
  pattern: z.string().nullable(),
  custom_validator: z.string().nullable(),
  error_message: z.string().nullable(),
});

export const ConditionalLogicSchema = z.object({
  conditions: z.array(z.object({
    question_id: z.string().uuid(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })),
  action: z.enum(['show', 'hide', 'require', 'optional']),
  operator: z.enum(['and', 'or']),
});

export const QuestionsTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  type: QuestionTypeSchema,
  title: z.string().min(1).max(1000),
  description: z.string().max(2000).nullable(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
  validation: QuestionValidationSchema,
  conditional_logic: ConditionalLogicSchema.nullable(),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

export const QuestionOptionsTableSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  label: z.string().min(1).max(500),
  value: z.string().min(1).max(500),
  order: z.number().int().min(0),
  metadata: MetadataSchema,
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

// ============================================================================
// RESPONSE MANAGEMENT TABLES
// ============================================================================

export const SessionStatusSchema = z.enum(['started', 'in_progress', 'completed', 'abandoned']);

export const DeviceInfoSchema = z.object({
  type: z.enum(['desktop', 'mobile', 'tablet']),
  os: z.string(),
  browser: z.string(),
  screen_resolution: z.string(),
});

export const SessionMetadataSchema = z.object({
  user_agent: z.string(),
  ip_address: z.string(),
  referrer: z.string().nullable(),
  source: z.string().nullable(),
  device_info: DeviceInfoSchema,
  time_zone: z.string(),
});

export const SurveySessionsTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(), // null for anonymous
  status: SessionStatusSchema.default('started'),
  started_at: z.date().default(() => new Date()),
  completed_at: z.date().nullable(),
  current_question_id: z.string().uuid().nullable(),
  metadata: SessionMetadataSchema,
  ...TimestampSchema.shape,
});

export const FileUploadSchema = z.object({
  filename: z.string(),
  mime_type: z.string(),
  size: z.number().int().positive(),
  url: z.string().url(),
  checksum: z.string(),
});

export const VoiceRecordingSchema = z.object({
  url: z.string().url(),
  duration: z.number().positive(),
  format: z.string(),
  size: z.number().int().positive(),
  transcription: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
});

export const ResponseValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  FileUploadSchema,
  VoiceRecordingSchema,
]);

export const ResponseMetadataSchema = z.object({
  confidence: z.number().min(0).max(1).nullable(),
  source: z.enum(['user', 'auto', 'imported']).default('user'),
  edit_count: z.number().int().min(0).default(0),
  validation_passed: z.boolean().nullable(),
});

export const ResponsesTableSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  question_id: z.string().uuid(),
  value: ResponseValueSchema,
  answered_at: z.date().default(() => new Date()),
  time_spent: z.number().int().min(0), // seconds
  metadata: ResponseMetadataSchema,
  ...TimestampSchema.shape,
});

// ============================================================================
// ANALYTICS TABLES
// ============================================================================

export const SurveyAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  total_responses: z.number().int().min(0),
  completion_rate: z.number().min(0).max(1),
  average_time_to_complete: z.number().min(0), // seconds
  analytics_data: z.record(z.unknown()), // JSON field for complex analytics
  generated_at: z.date().default(() => new Date()),
  ...TimestampSchema.shape,
});

export const QuestionAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  question_id: z.string().uuid(),
  response_count: z.number().int().min(0),
  skip_count: z.number().int().min(0),
  average_time_spent: z.number().min(0),
  analytics_data: z.record(z.unknown()), // JSON field for complex analytics
  generated_at: z.date().default(() => new Date()),
  ...TimestampSchema.shape,
});

// ============================================================================
// LLM INTEGRATION TABLES
// ============================================================================

export const AnalysisTypeSchema = z.enum(['sentiment', 'themes', 'insights', 'recommendations', 'summary']);

export const LLMAnalysisOptionsSchema = z.object({
  include_questions: z.array(z.string().uuid()).nullable(),
  exclude_questions: z.array(z.string().uuid()).nullable(),
  min_confidence: z.number().min(0).max(1).default(0.5),
  max_tokens: z.number().int().positive().default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const TokenUsageSchema = z.object({
  prompt: z.number().int().min(0),
  completion: z.number().int().min(0),
  total: z.number().int().min(0),
});

export const LLMMetadataSchema = z.object({
  model: z.string(),
  version: z.string(),
  token_usage: TokenUsageSchema,
  processing_time: z.number().min(0), // milliseconds
  parameters: z.record(z.unknown()),
});

export const LLMAnalysisTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  analysis_type: AnalysisTypeSchema,
  options: LLMAnalysisOptionsSchema,
  results: z.record(z.unknown()), // JSON field for analysis results
  confidence: z.number().min(0).max(1),
  metadata: LLMMetadataSchema,
  status: z.enum(['queued', 'processing', 'completed', 'failed']).default('queued'),
  error_message: z.string().nullable(),
  generated_at: z.date().nullable(),
  ...TimestampSchema.shape,
});

// ============================================================================
// EXPORT MANAGEMENT TABLES
// ============================================================================

export const ExportFormatSchema = z.enum(['csv', 'xlsx', 'json', 'pdf']);
export const ExportStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed', 'expired']);

export const ExportOptionsSchema = z.object({
  include_metadata: z.boolean().default(false),
  include_timestamps: z.boolean().default(true),
  include_analytics: z.boolean().default(false),
  date_range: z.object({
    from: z.date(),
    to: z.date(),
  }).nullable(),
  filters: z.object({
    status: z.array(SessionStatusSchema).nullable(),
    completed_only: z.boolean().default(false),
    exclude_test: z.boolean().default(true),
  }).nullable(),
});

export const ExportJobsTableSchema = z.object({
  id: z.string().uuid(),
  survey_id: z.string().uuid(),
  user_id: z.string().uuid(),
  format: ExportFormatSchema,
  options: ExportOptionsSchema,
  status: ExportStatusSchema.default('queued'),
  progress: z.number().min(0).max(100).default(0),
  file_path: z.string().nullable(),
  download_url: z.string().url().nullable(),
  file_size: z.number().int().min(0).nullable(),
  error_message: z.string().nullable(),
  expires_at: z.date(),
  completed_at: z.date().nullable(),
  ...TimestampSchema.shape,
});

// ============================================================================
// WEBHOOK MANAGEMENT TABLES
// ============================================================================

export const WebhookEventTypeSchema = z.enum([
  'survey.created', 'survey.updated', 'survey.published', 'survey.completed',
  'response.received', 'response.updated',
  'user.registered', 'user.updated',
  'analysis.completed', 'export.completed'
]);

export const WebhookSubscriptionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(WebhookEventTypeSchema),
  secret: z.string(),
  is_active: z.boolean().default(true),
  last_triggered: z.date().nullable(),
  failure_count: z.number().int().min(0).default(0),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

export const WebhookEventsTableSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  event_type: WebhookEventTypeSchema,
  payload: z.record(z.unknown()), // JSON field for event payload
  status: z.enum(['pending', 'delivered', 'failed', 'retrying']).default('pending'),
  attempts: z.number().int().min(0).default(0),
  last_attempt: z.date().nullable(),
  delivered_at: z.date().nullable(),
  error_message: z.string().nullable(),
  ...TimestampSchema.shape,
});

// ============================================================================
// AUDIT & LOGGING TABLES
// ============================================================================

export const AuditActionTypeSchema = z.enum([
  'create', 'update', 'delete', 'view', 'export', 'login', 'logout',
  'publish', 'unpublish', 'archive', 'restore'
]);

export const AuditLogsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  action: AuditActionTypeSchema,
  resource_type: z.string(),
  resource_id: z.string().uuid(),
  changes: z.record(z.unknown()).nullable(), // JSON field for change tracking
  metadata: z.object({
    ip_address: z.string(),
    user_agent: z.string(),
    session_id: z.string().uuid().nullable(),
  }),
  created_at: z.date().default(() => new Date()),
});

export const SystemLogsTableSchema = z.object({
  id: z.string().uuid(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  message: z.string(),
  context: z.record(z.unknown()).nullable(),
  stack_trace: z.string().nullable(),
  created_at: z.date().default(() => new Date()),
});

// ============================================================================
// FILE MANAGEMENT TABLES
// ============================================================================

export const FileUploadsTableSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  size: z.number().int().positive(),
  path: z.string(),
  url: z.string().url(),
  checksum: z.string(),
  uploaded_by: z.string().uuid().nullable(),
  response_id: z.string().uuid().nullable(), // Link to response if applicable
  is_public: z.boolean().default(false),
  expires_at: z.date().nullable(),
  ...TimestampSchema.shape,
  ...SoftDeleteSchema.shape,
});

// ============================================================================
// DATABASE INDEXES
// ============================================================================

export const DatabaseIndexes = {
  users: [
    'email', // Unique index
    'role',
    'is_active',
    'created_at',
  ],
  user_sessions: [
    'user_id',
    'token_hash', // Unique index
    'expires_at',
    'is_active',
  ],
  surveys: [
    'created_by',
    'status',
    'published_at',
    'created_at',
  ],
  questions: [
    'survey_id',
    'type',
    'order',
  ],
  question_options: [
    'question_id',
    'order',
  ],
  survey_sessions: [
    'survey_id',
    'user_id',
    'status',
    'started_at',
    'completed_at',
  ],
  responses: [
    'session_id',
    'question_id',
    'answered_at',
  ],
  survey_analytics: [
    'survey_id',
    'generated_at',
  ],
  llm_analysis: [
    'survey_id',
    'analysis_type',
    'status',
    'generated_at',
  ],
  export_jobs: [
    'survey_id',
    'user_id',
    'status',
    'expires_at',
  ],
  webhook_subscriptions: [
    'user_id',
    'is_active',
  ],
  audit_logs: [
    'user_id',
    'action',
    'resource_type',
    'created_at',
  ],
  file_uploads: [
    'uploaded_by',
    'response_id',
    'created_at',
    'expires_at',
  ],
} as const;

// ============================================================================
// FOREIGN KEY CONSTRAINTS
// ============================================================================

export const ForeignKeyConstraints = {
  user_sessions: {
    user_id: 'users(id) ON DELETE CASCADE',
  },
  password_resets: {
    user_id: 'users(id) ON DELETE CASCADE',
  },
  surveys: {
    created_by: 'users(id) ON DELETE SET NULL',
  },
  questions: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
  },
  question_options: {
    question_id: 'questions(id) ON DELETE CASCADE',
  },
  survey_sessions: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    user_id: 'users(id) ON DELETE SET NULL',
  },
  responses: {
    session_id: 'survey_sessions(id) ON DELETE CASCADE',
    question_id: 'questions(id) ON DELETE CASCADE',
  },
  survey_analytics: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
  },
  question_analytics: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    question_id: 'questions(id) ON DELETE CASCADE',
  },
  llm_analysis: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
  },
  export_jobs: {
    survey_id: 'surveys(id) ON DELETE CASCADE',
    user_id: 'users(id) ON DELETE SET NULL',
  },
  webhook_subscriptions: {
    user_id: 'users(id) ON DELETE CASCADE',
  },
  webhook_events: {
    subscription_id: 'webhook_subscriptions(id) ON DELETE CASCADE',
  },
  audit_logs: {
    user_id: 'users(id) ON DELETE SET NULL',
  },
  file_uploads: {
    uploaded_by: 'users(id) ON DELETE SET NULL',
    response_id: 'responses(id) ON DELETE CASCADE',
  },
} as const;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export interface MigrationScript {
  readonly version: string;
  readonly description: string;
  readonly up: string[];
  readonly down: string[];
  readonly dependencies: string[];
}

export const BaseMigrationQueries = {
  createUUIDExtension: 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  createUpdatedAtTrigger: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `,
  addUpdatedAtTrigger: (tableName: string) => `
    CREATE TRIGGER update_${tableName}_updated_at
      BEFORE UPDATE ON ${tableName}
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserRole = z.infer<typeof UserRoleSchema>;
export type SurveyStatus = z.infer<typeof SurveyStatusSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type SessionStatus = z.infer<typeof SessionStatusSchema>;
export type AnalysisType = z.infer<typeof AnalysisTypeSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ExportStatus = z.infer<typeof ExportStatusSchema>;
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;
export type AuditActionType = z.infer<typeof AuditActionTypeSchema>;

export type UsersTable = z.infer<typeof UsersTableSchema>;
export type SurveysTable = z.infer<typeof SurveysTableSchema>;
export type QuestionsTable = z.infer<typeof QuestionsTableSchema>;
export type ResponsesTable = z.infer<typeof ResponsesTableSchema>;
export type SurveySessionsTable = z.infer<typeof SurveySessionsTableSchema>;
export type ExportJobsTable = z.infer<typeof ExportJobsTableSchema>;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateTableSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidEmail(value: string): boolean {
  return z.string().email().safeParse(value).success;
}

export function isValidJSON(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

export const AllTableSchemas = {
  users: UsersTableSchema,
  user_sessions: UserSessionsTableSchema,
  password_resets: PasswordResetsTableSchema,
  surveys: SurveysTableSchema,
  questions: QuestionsTableSchema,
  question_options: QuestionOptionsTableSchema,
  survey_sessions: SurveySessionsTableSchema,
  responses: ResponsesTableSchema,
  survey_analytics: SurveyAnalyticsTableSchema,
  question_analytics: QuestionAnalyticsTableSchema,
  llm_analysis: LLMAnalysisTableSchema,
  export_jobs: ExportJobsTableSchema,
  webhook_subscriptions: WebhookSubscriptionsTableSchema,
  webhook_events: WebhookEventsTableSchema,
  audit_logs: AuditLogsTableSchema,
  system_logs: SystemLogsTableSchema,
  file_uploads: FileUploadsTableSchema,
} as const;

export function validateDatabaseRow(tableName: keyof typeof AllTableSchemas, data: unknown) {
  const schema = AllTableSchemas[tableName];
  return schema.parse(data);
}

/**
 * END OF DATABASE CONTRACTS
 * 
 * Any changes to these schemas must include migration scripts
 * and be validated through the contract test suite.
 */