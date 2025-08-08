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
  created_at: z.date(),
  updated_at: z.date()
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
  type: z.enum(['custom', 'survey', 'organization', 'collaboration', 'beta', 'event', 'interview', 'demo', 'trial', 'referral']).default('organization'),
  template_id: z.string().uuid().nullable(),
  target_id: z.string().uuid().nullable(),
  total_count: z.number(),
  sent_count: z.number(),
  processed_count: z.number().default(0),
  success_count: z.number().default(0),
  failed_count: z.number().default(0),
  status: z.enum(['draft', 'scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled']).default('draft'),
  created_by: z.string().uuid(),
  send_rate: z.number().default(10),
  recipients_data: z.array(z.any()).default([]),
  errors: z.array(z.string()).default([]),
  metadata: z.any().default({}),
  created_at: z.date(),
  updated_at: z.date()
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
  metadata: z.any().default({}),
  default_sender_email: z.string().email().default('noreply@example.com'),
  created_at: z.date()
});

// Invitation helper functions
export const validateInvitation = (data: unknown) => InvitationsTableSchema.parse(data);
export const validateEmailTracking = (data: unknown) => EmailTrackingTableSchema.parse(data);
export const validateInvitationTemplate = (data: unknown) => InvitationTemplatesTableSchema.parse(data);
export const validateInvitationBatch = (data: unknown) => InvitationBatchesTableSchema.parse(data);
export const validateInvitationSettings = (data: unknown) => InvitationSettingsTableSchema.parse(data);

// Export types for services
export type Invitation = z.infer<typeof InvitationsTableSchema>;
export type EmailTrackingType = z.infer<typeof EmailTrackingTableSchema>;
export type InvitationTemplate = z.infer<typeof InvitationTemplatesTableSchema>;
export type InvitationAnalytics = z.infer<typeof InvitationAnalyticsTableSchema>;
export type InvitationBatch = z.infer<typeof InvitationBatchesTableSchema>;
export type InvitationSettings = z.infer<typeof InvitationSettingsTableSchema>;

export const generateInvitationToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const createDefaultExpiry = (days: number = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
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
  created_at: z.date(),
  updated_at: z.date()
});

export const SurveyTemplateQuestionsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  question_text: z.string(),
  question_type: z.string(),
  order_index: z.number(),
  created_at: z.date(),
  updated_at: z.date()
});

export const SurveyTemplateVersionsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  version: z.number(),
  changes: z.any(),
  created_at: z.date(),
  updated_at: z.date()
});

export const TemplateSharesTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  shared_with: z.string().uuid(),
  permissions: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date()
});

export const TemplateAnalyticsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  usage_count: z.number(),
  metrics: z.any(),
  created_at: z.date(),
  updated_at: z.date()
});

export const TemplateReviewsTableSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  reviewer_id: z.string().uuid(),
  rating: z.number(),
  comment: z.string(),
  created_at: z.date(),
  updated_at: z.date()
});

// Survey template helper functions
export const validateSurveyTemplate = (data: unknown) => SurveyTemplatesTableSchema.parse(data);
export const validateTemplateQuestion = (data: unknown) => SurveyTemplateQuestionsTableSchema.parse(data);
export const validateTemplateVersion = (data: unknown) => SurveyTemplateVersionsTableSchema.parse(data);
export const validateTemplateShare = (data: unknown) => TemplateSharesTableSchema.parse(data);
export const validateTemplateAnalytics = (data: unknown) => TemplateAnalyticsTableSchema.parse(data);
export const validateTemplateReview = (data: unknown) => TemplateReviewsTableSchema.parse(data);

// Export survey template types
export type SurveyTemplate = z.infer<typeof SurveyTemplatesTableSchema>;
export type SurveyTemplateQuestion = z.infer<typeof SurveyTemplateQuestionsTableSchema>;
export type SurveyTemplateVersion = z.infer<typeof SurveyTemplateVersionsTableSchema>;
export type TemplateShare = z.infer<typeof TemplateSharesTableSchema>;
export type TemplateAnalytics = z.infer<typeof TemplateAnalyticsTableSchema>;
export type TemplateReview = z.infer<typeof TemplateReviewsTableSchema>;

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
  created_at: z.date(),
  updated_at: z.date()
});

export const OnboardingProgressTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  current_step: z.number(),
  completed_steps: z.array(z.string()),
  created_at: z.date(),
  updated_at: z.date()
});

export const ProfileMetadataTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  metadata: z.any(),
  created_at: z.date(),
  updated_at: z.date()
});

export const UserSessionsTableSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_token: z.string(),
  expires_at: z.date(),
  created_at: z.date(),
  updated_at: z.date()
});

// User profile helper functions
export const validateUserProfile = (data: unknown) => UserProfilesTableSchema.parse(data);
export const validateOnboardingProgress = (data: unknown) => OnboardingProgressTableSchema.parse(data);
export const validateProfileMetadata = (data: unknown) => ProfileMetadataTableSchema.parse(data);
export const validateUserSession = (data: unknown) => UserSessionsTableSchema.parse(data);

export const getNextOnboardingStep = (progress: any) => {
  return progress.current_step + 1;
};

// Export user profile types
export type UserProfile = z.infer<typeof UserProfilesTableSchema>;
export type OnboardingProgress = z.infer<typeof OnboardingProgressTableSchema>;
export type ProfileMetadata = z.infer<typeof ProfileMetadataTableSchema>;
export type UserSession = z.infer<typeof UserSessionsTableSchema>;

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

export const ActivityContextSchema = z.object({
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  location: z.string().optional(),
  metadata: z.any()
});

export const ActivityContext = ActivityContextSchema;
export type ActivityContext = z.infer<typeof ActivityContextSchema>;

export const ActivityFilter = z.object({
  activity_types: z.array(ActivityTypeSchema).optional(),
  entity_types: z.array(EntityTypeSchema).optional(),
  date_from: z.date().optional(),
  date_to: z.date().optional()
});

export const NotificationMethodSchema = z.enum(['email', 'sms', 'push', 'in_app', 'webhook']);
export const NotificationStatusSchema = z.enum(['sent', 'delivered', 'failed', 'pending']);
export const ActivityAggregationPeriodSchema = z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']);

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
  context: ActivityContextSchema,
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

// ============================================================================
// INVITATION ENUM TYPES (Missing exports causing build errors)
// ============================================================================

export const InvitationType = z.enum(['standard', 'bulk', 'automated', 'follow_up', 'reminder']);
export const InvitationStatus = z.enum(['pending', 'accepted', 'expired', 'cancelled', 'declined']);
export const InvitationPriority = z.enum(['low', 'medium', 'high', 'urgent']);
export const InvitationDeliveryMethod = z.enum(['email', 'sms', 'in_app', 'webhook']);
export const InvitationResponseType = z.enum(['accepted', 'declined', 'no_response']);
export const InvitationTrackingStatus = z.enum(['sent', 'delivered', 'opened', 'clicked', 'responded']);
export const EmailEventType = z.enum(['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'rejected']);
export const TemplateType = z.enum(['standard', 'custom', 'system', 'automated']);
export const BatchStatus = z.enum(['draft', 'scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled']);
export const AnalyticsPeriod = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

// Export both schemas and types for invitation enums
export type InvitationType = z.infer<typeof InvitationType>;
export type InvitationStatus = z.infer<typeof InvitationStatus>;
export type InvitationPriority = z.infer<typeof InvitationPriority>;
export type InvitationDeliveryMethod = z.infer<typeof InvitationDeliveryMethod>;
export type InvitationResponseType = z.infer<typeof InvitationResponseType>;
export type InvitationTrackingStatus = z.infer<typeof InvitationTrackingStatus>;
export type EmailEventType = z.infer<typeof EmailEventType>;
export type TemplateType = z.infer<typeof TemplateType>;
export type BatchStatus = z.infer<typeof BatchStatus>;
export type AnalyticsPeriod = z.infer<typeof AnalyticsPeriod>;

// Helper functions for invitation types
export const validateInvitationType = (type: unknown) => InvitationType.parse(type);
export const validateInvitationStatus = (status: unknown) => InvitationStatus.parse(status);
export const validateInvitationPriority = (priority: unknown) => InvitationPriority.parse(priority);
export const validateInvitationDeliveryMethod = (method: unknown) => InvitationDeliveryMethod.parse(method);

export const isValidInvitationType = (type: string): type is InvitationType => InvitationType.safeParse(type).success;
export const isValidInvitationStatus = (status: string): status is InvitationStatus => InvitationStatus.safeParse(status).success;
export const isValidInvitationPriority = (priority: string): priority is InvitationPriority => InvitationPriority.safeParse(priority).success;
export const isValidInvitationDeliveryMethod = (method: string): method is InvitationDeliveryMethod => InvitationDeliveryMethod.safeParse(method).success;

// Additional helper functions required by services
export const isInvitationExpired = (invitation: any) => {
  return new Date(invitation.expires_at) < new Date();
};

export const isInvitationActive = (invitation: any) => {
  return invitation.status === 'pending' && !isInvitationExpired(invitation);
};

export const shouldSendReminder = (invitation: any) => {
  const daysUntilExpiry = Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
};

// ============================================================================
// ORGANIZATION SCHEMAS
// ============================================================================

export const OrganizationsTableSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  domain: z.string().nullable(),
  description: z.string().nullable(),
  logo_url: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).nullable(),
  settings: z.any(),
  deleted_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date()
});

export const OrganizationMembersTableSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'user']),
  permissions: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).default('active'),
  invited_by: z.string().uuid().nullable(),
  is_active: z.boolean().default(true),
  joined_at: z.date(),
  created_at: z.date(),
  updated_at: z.date()
});

export const OrganizationInvitationsTableSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'user']),
  invited_by: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).default('pending'),
  token: z.string(),
  expires_at: z.date(),
  accepted_at: z.date().nullable(),
  created_at: z.date(),
  updated_at: z.date()
});

// Organization validation functions
export const validateOrganization = (data: unknown) => OrganizationsTableSchema.parse(data);
export const validateOrganizationMember = (data: unknown) => OrganizationMembersTableSchema.parse(data);
export const validateOrganizationInvitation = (data: unknown) => OrganizationInvitationsTableSchema.parse(data);

// Export organization types
export type Organization = z.infer<typeof OrganizationsTableSchema>;
export type OrganizationMember = z.infer<typeof OrganizationMembersTableSchema>;
export type OrganizationInvitation = z.infer<typeof OrganizationInvitationsTableSchema>;
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer' | 'user';

// ============================================================================
// SURVEY TEMPLATE ADDITIONAL ENUM TYPES
// ============================================================================

export const TemplateCategory = z.enum(['survey', 'form', 'quiz', 'assessment', 'feedback', 'poll', 'custom', 'performance', 'research', 'evaluation', 'registration', 'satisfaction', 'demographic', 'ai_readiness']);
export const TemplateStatus = z.enum(['draft', 'active', 'inactive', 'archived', 'published']);
export const TemplateVisibility = z.enum(['public', 'private', 'organization', 'shared']);
export const ShareType = z.enum(['read', 'write', 'admin', 'owner', 'view']);
export const ReviewStatus = z.enum(['pending', 'approved', 'rejected', 'under_review']);
export const QuestionType = z.enum(['text', 'number', 'email', 'select', 'multiselect', 'boolean', 'date', 'rating', 'scale']);

export type TemplateCategory = z.infer<typeof TemplateCategory>;
export type TemplateStatus = z.infer<typeof TemplateStatus>;
export type TemplateVisibility = z.infer<typeof TemplateVisibility>;
export type ShareType = z.infer<typeof ShareType>;
export type ReviewStatus = z.infer<typeof ReviewStatus>;
export type QuestionType = z.infer<typeof QuestionType>;

// ============================================================================
// USER PROFILE ADDITIONAL ENUM TYPES
// ============================================================================

export const OnboardingStep = z.enum(['profile', 'organization', 'preferences', 'verification', 'completed']);
export const UserRole = z.enum(['user', 'admin', 'moderator', 'guest', 'premium']);
export const UserStatus = z.enum(['active', 'inactive', 'suspended', 'pending']);

export type OnboardingStep = z.infer<typeof OnboardingStep>;
export type UserRole = z.infer<typeof UserRole>;
export type UserStatus = z.infer<typeof UserStatus>;

// Helper functions for user profiles
export const isOnboardingComplete = (step: OnboardingStep) => step === 'completed';
export const getNextStep = (currentStep: OnboardingStep): OnboardingStep => {
  const steps = ['profile', 'organization', 'preferences', 'verification', 'completed'] as const;
  const currentIndex = steps.indexOf(currentStep);
  return steps[currentIndex + 1] || 'completed';
};