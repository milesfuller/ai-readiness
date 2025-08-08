/**
 * Placeholder schemas for missing exports
 * These are temporary placeholders to fix build errors
 * TODO: Implement proper schemas for these entities
 */

import { z } from 'zod';

// ============================================================================
// INVITATION SCHEMAS
// ============================================================================

export const InvitationsTableSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  recipient_email: z.string().email(),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']),
  expires_at: z.date(),
  created_at: z.date()
});

export const EmailTrackingTableSchema = z.object({
  id: z.string().uuid(),
  invitation_id: z.string().uuid(),
  event_type: z.string(),
  timestamp: z.date()
});

export const InvitationTemplatesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  created_at: z.date()
});

export const InvitationBatchesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  total_count: z.number(),
  sent_count: z.number(),
  created_at: z.date()
});

export const InvitationAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  metrics: z.any(),
  created_at: z.date()
});

export const InvitationSettingsTableSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  settings: z.any(),
  created_at: z.date()
});

// Invitation helper functions
export const validateInvitation = (data: unknown) => InvitationsTableSchema.parse(data);
export const validateEmailTracking = (data: unknown) => EmailTrackingTableSchema.parse(data);
export const validateInvitationTemplate = (data: unknown) => InvitationTemplatesTableSchema.parse(data);
export const validateInvitationBatch = (data: unknown) => InvitationBatchesTableSchema.parse(data);
export const validateInvitationSettings = (data: unknown) => InvitationSettingsTableSchema.parse(data);

export const generateInvitationToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const createDefaultExpiry = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // 7 days default
  return date;
};

export const canInvitationBeAccepted = (invitation: any) => {
  return invitation.status === 'pending' && new Date(invitation.expires_at) > new Date();
};

export const validateTemplateVariables = (template: string, variables: Record<string, any>) => {
  return true; // Placeholder
};

export const renderTemplate = (template: string, variables: Record<string, any>) => {
  return template; // Placeholder
};

// ============================================================================
// SURVEY TEMPLATE SCHEMAS
// ============================================================================

export const SurveyTemplatesTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  questions: z.array(z.any()),
  created_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),
  created_at: z.date()
});

export const SurveyTemplateQuestionsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  question_text: z.string(),
  question_type: z.string(),
  order_index: z.number(),
  created_at: z.date()
});

export const SurveyTemplateVersionsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  version: z.number(),
  changes: z.any(),
  created_at: z.date()
});

export const TemplateSharesTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  shared_with: z.string().uuid(),
  permissions: z.array(z.string()),
  created_at: z.date()
});

export const TemplateAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  usage_count: z.number(),
  metrics: z.any(),
  created_at: z.date()
});

export const TemplateReviewsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  reviewer_id: z.string().uuid(),
  rating: z.number(),
  comment: z.string(),
  created_at: z.date()
});

// Survey template helper functions
export const validateSurveyTemplate = (data: unknown) => SurveyTemplatesTableSchema.parse(data);
export const validateTemplateQuestion = (data: unknown) => SurveyTemplateQuestionsTableSchema.parse(data);
export const validateTemplateVersion = (data: unknown) => SurveyTemplateVersionsTableSchema.parse(data);
export const validateTemplateShare = (data: unknown) => TemplateSharesTableSchema.parse(data);
export const validateTemplateAnalytics = (data: unknown) => TemplateAnalyticsTableSchema.parse(data);
export const validateTemplateReview = (data: unknown) => TemplateReviewsTableSchema.parse(data);

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const UserProfilesTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  created_at: z.date()
});

export const OnboardingProgressTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_step: z.number(),
  completed_steps: z.array(z.string()),
  created_at: z.date()
});

export const ProfileMetadataTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  metadata: z.any(),
  created_at: z.date()
});

export const UserSessionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_token: z.string(),
  expires_at: z.date(),
  created_at: z.date()
});

// User profile helper functions
export const validateUserProfile = (data: unknown) => UserProfilesTableSchema.parse(data);
export const validateOnboardingProgress = (data: unknown) => OnboardingProgressTableSchema.parse(data);
export const validateProfileMetadata = (data: unknown) => ProfileMetadataTableSchema.parse(data);
export const validateUserSession = (data: unknown) => UserSessionsTableSchema.parse(data);

export const getNextOnboardingStep = (progress: any) => {
  return progress.current_step + 1;
};

// ============================================================================
// ACTIVITY LOG SCHEMAS
// ============================================================================

export const ActivityAnalyticsSchema = z.object({
  id: z.string().uuid(),
  metrics: z.any(),
  created_at: z.date()
});

export const ActivitySubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_types: z.array(z.string()),
  created_at: z.date()
});

export const ActivityNotificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_id: z.string().uuid(),
  read: z.boolean(),
  created_at: z.date()
});

export const RetentionPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  days: z.number(),
  created_at: z.date()
});

export const ActivityAnalytics = ActivityAnalyticsSchema;
export const ActivitySubscription = ActivitySubscriptionSchema;
export const ActivityNotification = ActivityNotificationSchema;
export const RetentionPolicy = RetentionPolicySchema;

export type ActivityAnalytics = z.infer<typeof ActivityAnalyticsSchema>;
export type ActivitySubscription = z.infer<typeof ActivitySubscriptionSchema>;
export type ActivityNotification = z.infer<typeof ActivityNotificationSchema>;
export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;

export const ActivityTypeSchema = z.enum(['create', 'update', 'delete', 'view', 'share', 'export', 'import']);
export const EntityTypeSchema = z.enum(['survey', 'template', 'organization', 'user', 'report']);
export const ActivitySeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ActivityStatusSchema = z.enum(['pending', 'completed', 'failed']);

// Export both schemas and types
export const ActivityType = ActivityTypeSchema;
export const EntityType = EntityTypeSchema;
export const ActivitySeverity = ActivitySeveritySchema;
export const ActivityStatus = ActivityStatusSchema;

export type ActivityType = z.infer<typeof ActivityTypeSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type ActivitySeverity = z.infer<typeof ActivitySeveritySchema>;
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

export const ActivityContext = z.object({
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  location: z.string().optional(),
  metadata: z.any()
});

export const ActivityFilter = z.object({
  activity_types: z.array(ActivityTypeSchema).optional(),
  entity_types: z.array(EntityTypeSchema).optional(),
  date_from: z.date().optional(),
  date_to: z.date().optional()
});

export const NotificationMethodSchema = z.enum(['email', 'sms', 'push', 'in_app']);
export const NotificationStatusSchema = z.enum(['sent', 'delivered', 'failed', 'pending']);
export const ActivityAggregationPeriodSchema = z.enum(['hour', 'day', 'week', 'month']);

export const NotificationMethod = NotificationMethodSchema;
export const NotificationStatus = NotificationStatusSchema;
export const ActivityAggregationPeriod = ActivityAggregationPeriodSchema;

export type NotificationMethod = z.infer<typeof NotificationMethodSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type ActivityAggregationPeriod = z.infer<typeof ActivityAggregationPeriodSchema>;

// Table schemas
export const ActivityLogsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  activity_type: ActivityTypeSchema,
  entity_type: EntityTypeSchema,
  entity_id: z.string(),
  description: z.string(),
  context: ActivityContext,
  created_at: z.date()
});

export const ActivityAnalyticsTableSchema = ActivityAnalyticsSchema;
export const ActivitySubscriptionsTableSchema = ActivitySubscriptionSchema;
export const ActivityNotificationsTableSchema = ActivityNotificationSchema;

// Helper functions
export const validateActivityLog = (data: unknown) => ActivityLogsTableSchema.parse(data);
export const validateActivityAnalytics = (data: unknown) => ActivityAnalyticsTableSchema.parse(data);
export const validateActivitySubscription = (data: unknown) => ActivitySubscriptionsTableSchema.parse(data);
export const validateActivityNotification = (data: unknown) => ActivityNotificationsTableSchema.parse(data);

export const shouldTriggerNotification = (activity: any, subscription: any) => {
  return true; // Placeholder
};

// Helper types and functions
export interface CreateActivityLogParams {
  activityType: string;
  entityType: string;
  entityId: string;
  userId?: string;
  organizationId?: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export const createActivityLogEntry = (params: CreateActivityLogParams) => {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    activity_type: params.activityType,
    entity_type: params.entityType,
    entity_id: params.entityId,
    user_id: params.userId || null,
    organization_id: params.organizationId || null,
    description: params.description || null,
    severity: params.severity || 'low',
    status: 'success' as const,
    metadata: params.metadata || {},
    context: {
      timestamp: new Date().toISOString()
    },
    created_at: new Date(),
    updated_at: new Date(),
    occurred_at: new Date()
  };
};

// Use the ActivityLog type from main schema
export type { ActivityLog } from './schema';