/**
 * Activity Logs Database Service
 * 
 * This service provides all database operations for activity logs using
 * the contracts as the single source of truth for data validation.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  ActivityLog,
  ActivityAnalytics,
  ActivitySubscription,
  ActivityNotification,
  RetentionPolicy,
  ActivityType,
  EntityType,
  ActivitySeverity,
  ActivityStatus,
  ActivityContext,
  ActivityFilter,
  NotificationMethod,
  NotificationStatus,
  ActivityAggregationPeriod,
  validateActivityLog,
  validateActivityAnalytics,
  validateActivitySubscription,
  validateActivityNotification,
  ActivityLogsTableSchema,
  ActivityAnalyticsTableSchema,
  ActivitySubscriptionsTableSchema,
  ActivityNotificationsTableSchema,
  RetentionPolicySchema,
  shouldTriggerNotification,
  createActivityLogEntry,
  CreateActivityLogParams,
  formatActivityDescription,
  isHighSeverityActivity
} from '@/contracts/schema';
import { z } from 'zod';

export class ActivityLogService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // ACTIVITY LOGS CRUD OPERATIONS
  // ============================================================================

  /**
   * Log a new activity
   */
  async logActivity(params: CreateActivityLogParams): Promise<ActivityLog> {
    try {
      // Create validated activity log entry
      const activityLog = createActivityLogEntry(params);

      const { data, error } = await this.supabase
        .from('activity_logs')
        .insert(activityLog)
        .select()
        .single();

      if (error) throw error;

      const validatedActivity = validateActivityLog(data);

      // Trigger notifications asynchronously
      this.processNotifications(validatedActivity).catch(err => 
        console.error('Error processing notifications:', err)
      );

      return validatedActivity;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw new Error(`Failed to log activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getActivityLogs(options: {
    organizationId?: string;
    userId?: string;
    activityTypes?: ActivityType[];
    entityTypes?: EntityType[];
    severities?: ActivitySeverity[];
    statuses?: ActivityStatus[];
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    orderBy?: 'occurred_at' | 'created_at';
    orderDirection?: 'asc' | 'desc';
  } = {}): Promise<{ data: ActivityLog[]; total: number; hasMore: boolean }> {
    try {
      const {
        organizationId,
        userId,
        activityTypes,
        entityTypes,
        severities,
        statuses,
        entityId,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
        orderBy = 'occurred_at',
        orderDirection = 'desc'
      } = options;

      let query = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact' });

      // Apply filters
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (activityTypes && activityTypes.length > 0) {
        query = query.in('activity_type', activityTypes);
      }

      if (entityTypes && entityTypes.length > 0) {
        query = query.in('entity_type', entityTypes);
      }

      if (severities && severities.length > 0) {
        query = query.in('severity', severities);
      }

      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      if (startDate) {
        query = query.gte('occurred_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('occurred_at', endDate.toISOString());
      }

      // Apply ordering and pagination
      query = query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      const activities = data.map(activity => validateActivityLog(activity));
      const total = count || 0;
      const hasMore = offset + limit < total;

      return { data: activities, total, hasMore };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw new Error(`Failed to fetch activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search activity logs by text
   */
  async searchActivityLogs(
    query: string,
    options: {
      organizationId?: string;
      userId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: ActivityLog[]; total: number; hasMore: boolean }> {
    try {
      const {
        organizationId,
        userId,
        limit = 50,
        offset = 0
      } = options;

      let dbQuery = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .or(`description.ilike.%${query}%,entity_name.ilike.%${query}%,activity_type.ilike.%${query}%`);

      if (organizationId) {
        dbQuery = dbQuery.eq('organization_id', organizationId);
      }

      if (userId) {
        dbQuery = dbQuery.eq('user_id', userId);
      }

      dbQuery = dbQuery
        .order('occurred_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) throw error;

      const activities = data.map(activity => validateActivityLog(activity));
      const total = count || 0;
      const hasMore = offset + limit < total;

      return { data: activities, total, hasMore };
    } catch (error) {
      console.error('Error searching activity logs:', error);
      throw new Error(`Failed to search activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete old activity logs
   */
  async deleteOldLogs(olderThanDays: number, organizationId?: string): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let query = this.supabase
        .from('activity_logs')
        .delete()
        .lt('occurred_at', cutoffDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error deleting old logs:', error);
      throw new Error(`Failed to delete old logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get activity logs for specific entity
   */
  async getEntityActivityLogs(
    entityType: EntityType,
    entityId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(activity => validateActivityLog(activity));
    } catch (error) {
      console.error('Error fetching entity activity logs:', error);
      throw new Error(`Failed to fetch entity activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ACTIVITY ANALYTICS OPERATIONS
  // ============================================================================

  /**
   * Generate activity analytics for a period
   */
  async generateAnalytics(
    organizationId: string | null,
    period: ActivityAggregationPeriod,
    startDate: Date,
    endDate: Date,
    activityType?: ActivityType,
    entityType?: EntityType
  ): Promise<ActivityAnalytics> {
    try {
      let query = this.supabase
        .from('activity_logs')
        .select('*')
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data: activities, error } = await query;

      if (error) throw error;

      // Aggregate the data
      const totalCount = activities.length;
      const uniqueUsers = new Set(activities.map(a => a.user_id).filter(Boolean)).size;
      const successCount = activities.filter(a => a.status === 'success').length;
      const errorCount = activities.filter(a => a.status === 'error').length;

      // Generate detailed analytics data
      const analyticsData = {
        severityBreakdown: this.aggregateBySeverity(activities),
        entityTypeBreakdown: this.aggregateByEntityType(activities),
        hourlyDistribution: this.aggregateByHour(activities),
        topUsers: this.getTopUsers(activities),
        errorAnalysis: this.analyzeErrors(activities.filter(a => a.status === 'error'))
      };

      const analytics: ActivityAnalytics = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        period,
        period_start: startDate,
        period_end: endDate,
        activity_type: activityType || null,
        entity_type: entityType || null,
        total_count: totalCount,
        unique_users: uniqueUsers,
        success_count: successCount,
        error_count: errorCount,
        analytics_data: analyticsData,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Store analytics
      const { data: savedAnalytics, error: saveError } = await this.supabase
        .from('activity_analytics')
        .insert(validateActivityAnalytics(analytics))
        .select()
        .single();

      if (saveError) throw saveError;

      return validateActivityAnalytics(savedAnalytics);
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw new Error(`Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get activity trends
   */
  async getActivityTrends(
    organizationId: string | null,
    period: ActivityAggregationPeriod,
    limit: number = 30
  ): Promise<ActivityAnalytics[]> {
    try {
      let query = this.supabase
        .from('activity_analytics')
        .select('*')
        .eq('period', period);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query
        .order('period_start', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(analytics => validateActivityAnalytics(analytics));
    } catch (error) {
      console.error('Error fetching activity trends:', error);
      throw new Error(`Failed to fetch activity trends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top activities for organization
   */
  async getTopActivities(
    organizationId: string,
    period: ActivityAggregationPeriod,
    limit: number = 10
  ): Promise<Array<{ activityType: ActivityType; count: number; percentage: number }>> {
    try {
      const endDate = new Date();
      const startDate = this.getPeriodStartDate(endDate, period);

      const { data: activities, error } = await this.supabase
        .from('activity_logs')
        .select('activity_type')
        .eq('organization_id', organizationId)
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString());

      if (error) throw error;

      // Count activities by type
      const activityCounts = new Map<ActivityType, number>();
      activities.forEach(activity => {
        const type = activity.activity_type as ActivityType;
        activityCounts.set(type, (activityCounts.get(type) || 0) + 1);
      });

      const total = activities.length;
      const sortedActivities = Array.from(activityCounts.entries())
        .map(([activityType, count]) => ({
          activityType,
          count,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return sortedActivities;
    } catch (error) {
      console.error('Error fetching top activities:', error);
      throw new Error(`Failed to fetch top activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ACTIVITY SUBSCRIPTIONS OPERATIONS
  // ============================================================================

  /**
   * Create activity subscription
   */
  async createSubscription(subscriptionData: Partial<ActivitySubscription>): Promise<ActivitySubscription> {
    try {
      const validatedData = ActivitySubscriptionsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse({
        ...subscriptionData,
        id: crypto.randomUUID()
      });

      const { data, error } = await this.supabase
        .from('activity_subscriptions')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateActivitySubscription(data);
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string, organizationId?: string): Promise<ActivitySubscription[]> {
    try {
      let query = this.supabase
        .from('activity_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(sub => validateActivitySubscription(sub));
    } catch (error) {
      console.error('Error fetching user subscriptions:', error);
      throw new Error(`Failed to fetch user subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(id: string, updates: Partial<ActivitySubscription>): Promise<ActivitySubscription> {
    try {
      const validatedUpdates = ActivitySubscriptionsTableSchema.partial().omit({
        id: true,
        created_at: true
      }).parse(updates);

      const { data, error } = await this.supabase
        .from('activity_subscriptions')
        .update({
          ...validatedUpdates,
          updated_at: new Date()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      return validateActivitySubscription(data);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete subscription (soft delete)
   */
  async deleteSubscription(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('activity_subscriptions')
        .update({ 
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw new Error(`Failed to delete subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ACTIVITY NOTIFICATIONS OPERATIONS
  // ============================================================================

  /**
   * Create notification for activity
   */
  async createNotification(
    subscriptionId: string,
    activityLogId: string,
    notificationMethod: NotificationMethod,
    payload: Record<string, unknown>
  ): Promise<ActivityNotification> {
    try {
      const notification: ActivityNotification = {
        id: crypto.randomUUID(),
        subscription_id: subscriptionId,
        activity_log_id: activityLogId,
        notification_method: notificationMethod,
        status: 'pending',
        scheduled_at: new Date(),
        sent_at: null,
        attempts: 0,
        max_attempts: 3,
        error_message: null,
        payload,
        metadata: {
          delivery_id: null,
          response_status: null,
          response_body: null
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      const validatedNotification = validateActivityNotification(notification);

      const { data, error } = await this.supabase
        .from('activity_notifications')
        .insert(validatedNotification)
        .select()
        .single();

      if (error) throw error;

      return validateActivityNotification(data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error(`Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications(limit: number = 100): Promise<number> {
    try {
      const { data: notifications, error } = await this.supabase
        .from('activity_notifications')
        .select('*')
        .in('status', ['pending', 'retrying'])
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      let processedCount = 0;

      for (const notification of notifications) {
        try {
          await this.sendNotification(notification as ActivityNotification);
          processedCount++;
        } catch (notificationError) {
          console.error(`Error sending notification ${notification.id}:`, notificationError);
          
          // Update notification with error and retry logic
          await this.handleNotificationError(notification as ActivityNotification, notificationError as Error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error processing notifications:', error);
      throw new Error(`Failed to process notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark notification as sent
   */
  async markNotificationAsSent(
    notificationId: string,
    deliveryId?: string,
    responseStatus?: number,
    responseBody?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('activity_notifications')
        .update({
          status: 'sent',
          sent_at: new Date(),
          metadata: {
            delivery_id: deliveryId || null,
            response_status: responseStatus || null,
            response_body: responseBody || null
          },
          updated_at: new Date()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw new Error(`Failed to mark notification as sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // RETENTION POLICIES OPERATIONS
  // ============================================================================

  /**
   * Create retention policy
   */
  async createRetentionPolicy(policyData: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
    try {
      const validatedData = RetentionPolicySchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(policyData);

      const { data, error } = await this.supabase
        .from('retention_policies')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return RetentionPolicySchema.parse(data);
    } catch (error) {
      console.error('Error creating retention policy:', error);
      throw new Error(`Failed to create retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply retention policies
   */
  async applyRetentionPolicies(): Promise<{ policiesApplied: number; recordsDeleted: number }> {
    try {
      const { data: policies, error } = await this.supabase
        .from('retention_policies')
        .select('*')
        .eq('auto_apply', true)
        .is('deleted_at', null);

      if (error) throw error;

      let policiesApplied = 0;
      let recordsDeleted = 0;

      for (const policy of policies) {
        const validatedPolicy = RetentionPolicySchema.parse(policy);
        const deletedCount = await this.applyRetentionPolicy(validatedPolicy);
        recordsDeleted += deletedCount;
        policiesApplied++;

        // Update last applied timestamp
        await this.supabase
          .from('retention_policies')
          .update({ last_applied: new Date() })
          .eq('id', validatedPolicy.id);
      }

      return { policiesApplied, recordsDeleted };
    } catch (error) {
      console.error('Error applying retention policies:', error);
      throw new Error(`Failed to apply retention policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  async cleanupOldData(organizationId?: string): Promise<number> {
    try {
      const { data: policies, error } = await this.supabase
        .from('retention_policies')
        .select('*')
        .eq('auto_apply', true)
        .is('deleted_at', null);

      if (error) throw error;

      let totalDeleted = 0;

      // Apply organization-specific policies first
      const orgPolicies = policies.filter(p => p.organization_id === organizationId);
      for (const policy of orgPolicies) {
        totalDeleted += await this.applyRetentionPolicy(policy as RetentionPolicy);
      }

      // Apply system-wide policies if no organization specified
      if (!organizationId) {
        const systemPolicies = policies.filter(p => !p.organization_id);
        for (const policy of systemPolicies) {
          totalDeleted += await this.applyRetentionPolicy(policy as RetentionPolicy);
        }
      }

      return totalDeleted;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw new Error(`Failed to cleanup old data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Process notifications for new activity
   */
  private async processNotifications(activity: ActivityLog): Promise<void> {
    try {
      // Get all active subscriptions for the organization
      let query = this.supabase
        .from('activity_subscriptions')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null);

      if (activity.organization_id) {
        query = query.eq('organization_id', activity.organization_id);
      }

      const { data: subscriptions, error } = await query;

      if (error) throw error;

      // Check each subscription to see if it should trigger
      for (const subscription of subscriptions) {
        const validatedSubscription = validateActivitySubscription(subscription);
        
        if (shouldTriggerNotification(activity, validatedSubscription)) {
          // Create notification payload
          const payload = {
            activity,
            subscription: validatedSubscription,
            formattedDescription: formatActivityDescription(activity)
          };

          await this.createNotification(
            validatedSubscription.id,
            activity.id,
            validatedSubscription.notification_method,
            payload
          );

          // Update subscription trigger count and last triggered
          await this.supabase
            .from('activity_subscriptions')
            .update({
              trigger_count: (validatedSubscription.trigger_count as number) + 1,
              last_triggered: new Date(),
              updated_at: new Date()
            })
            .eq('id', validatedSubscription.id);
        }
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
      // Don't throw here to avoid breaking the main activity logging
    }
  }

  /**
   * Send notification (placeholder - implement based on notification method)
   */
  private async sendNotification(notification: ActivityNotification): Promise<void> {
    // This is a placeholder - implement actual notification sending logic
    // based on the notification method (email, webhook, push, etc.)
    
    switch (notification.notification_method) {
      case 'email':
        // Implement email sending
        break;
      case 'webhook':
        // Implement webhook calling
        break;
      case 'push':
        // Implement push notification
        break;
      default:
        throw new Error(`Unsupported notification method: ${notification.notification_method}`);
    }

    // For now, just mark as sent
    await this.markNotificationAsSent(notification.id);
  }

  /**
   * Handle notification sending error
   */
  private async handleNotificationError(
    notification: ActivityNotification,
    error: Error
  ): Promise<void> {
    const newAttempts = notification.attempts + 1;
    const isMaxAttemptsReached = newAttempts >= notification.max_attempts;

    await this.supabase
      .from('activity_notifications')
      .update({
        status: isMaxAttemptsReached ? 'failed' : 'retrying',
        attempts: newAttempts,
        error_message: error.message,
        updated_at: new Date(),
        // Schedule retry for later if not max attempts
        scheduled_at: isMaxAttemptsReached ? notification.scheduled_at : new Date(Date.now() + (newAttempts * 60000)) // Exponential backoff
      })
      .eq('id', notification.id);
  }

  /**
   * Apply single retention policy
   */
  private async applyRetentionPolicy(policy: RetentionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    let query = this.supabase
      .from('activity_logs')
      .delete()
      .lt('occurred_at', cutoffDate.toISOString());

    // Apply filters from the policy
    const { filters } = policy;

    if (policy.organization_id) {
      query = query.eq('organization_id', policy.organization_id);
    }

    if (filters.activity_types && filters.activity_types.length > 0) {
      query = query.in('activity_type', filters.activity_types);
    }

    if (filters.entity_types && filters.entity_types.length > 0) {
      query = query.in('entity_type', filters.entity_types);
    }

    if (filters.severities && filters.severities.length > 0) {
      query = query.in('severity', filters.severities);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  }

  /**
   * Get period start date
   */
  private getPeriodStartDate(endDate: Date, period: ActivityAggregationPeriod): Date {
    const startDate = new Date(endDate);
    
    switch (period) {
      case 'hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return startDate;
  }

  /**
   * Aggregate activities by severity
   */
  private aggregateBySeverity(activities: ActivityLog[]): Record<ActivitySeverity, number> {
    const severityCount = { low: 0, medium: 0, high: 0, critical: 0 };
    
    activities.forEach(activity => {
      severityCount[activity.severity]++;
    });

    return severityCount;
  }

  /**
   * Aggregate activities by entity type
   */
  private aggregateByEntityType(activities: ActivityLog[]): Record<string, number> {
    const entityCount: Record<string, number> = {};
    
    activities.forEach(activity => {
      entityCount[activity.entity_type] = (entityCount[activity.entity_type] || 0) + 1;
    });

    return entityCount;
  }

  /**
   * Aggregate activities by hour
   */
  private aggregateByHour(activities: ActivityLog[]): Record<number, number> {
    const hourCount: Record<number, number> = {};
    
    // Initialize all hours to 0
    for (let i = 0; i < 24; i++) {
      hourCount[i] = 0;
    }
    
    activities.forEach(activity => {
      const hour = new Date(activity.occurred_at).getHours();
      hourCount[hour]++;
    });

    return hourCount;
  }

  /**
   * Get top users by activity count
   */
  private getTopUsers(activities: ActivityLog[]): Array<{ userId: string; count: number }> {
    const userCount = new Map<string, number>();
    
    activities.forEach(activity => {
      if (activity.user_id) {
        userCount.set(activity.user_id, (userCount.get(activity.user_id) || 0) + 1);
      }
    });

    return Array.from(userCount.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Analyze errors
   */
  private analyzeErrors(errorActivities: ActivityLog[]): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    commonErrors: Array<{ message: string; count: number }>;
  } {
    const errorsByType: Record<string, number> = {};
    const errorMessages = new Map<string, number>();

    errorActivities.forEach(activity => {
      // Count by activity type
      errorsByType[activity.activity_type] = (errorsByType[activity.activity_type] || 0) + 1;

      // Count error messages
      const errorMessage = activity.context.error_message;
      if (errorMessage) {
        errorMessages.set(errorMessage, (errorMessages.get(errorMessage) || 0) + 1);
      }
    });

    const commonErrors = Array.from(errorMessages.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: errorActivities.length,
      errorsByType,
      commonErrors
    };
  }

  // ============================================================================
  // ACTIVITY TRACKING HELPERS
  // ============================================================================

  /**
   * Track user login
   */
  async trackUserLogin(
    userId: string,
    organizationId: string | null,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'login',
      userId,
      organizationId: organizationId || undefined,
      entityType: 'user',
      entityId: userId,
      severity: 'medium',
      context
    });
  }

  /**
   * Track user logout
   */
  async trackUserLogout(
    userId: string,
    organizationId: string | null,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'logout',
      userId,
      organizationId: organizationId || undefined,
      entityType: 'user',
      entityId: userId,
      severity: 'low',
      context
    });
  }

  /**
   * Track survey creation
   */
  async trackSurveyCreated(
    userId: string,
    organizationId: string,
    surveyId: string,
    surveyName?: string,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'create',
      userId,
      organizationId,
      entityType: 'survey',
      entityId: surveyId,
      entityName: surveyName,
      severity: 'medium',
      description: `Created survey: ${surveyName || 'Unnamed Survey'}`,
      context
    });
  }

  /**
   * Track API key usage
   */
  async trackApiKeyUsage(
    organizationId: string,
    apiKeyId: string,
    endpoint: string,
    responseTime: number,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'api_key_used',
      organizationId,
      entityType: 'api_key',
      entityId: apiKeyId,
      entityName: endpoint,
      severity: 'low',
      description: `API key used for ${endpoint}`,
      context: {
        ...context,
        response_time: responseTime
      }
    });
  }

  /**
   * Track error occurrence
   */
  async trackError(
    userId: string | null,
    organizationId: string | null,
    entityType: EntityType,
    entityId: string,
    errorMessage: string,
    stackTrace?: string,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'error_occurred',
      userId: userId || undefined,
      organizationId: organizationId || undefined,
      entityType,
      entityId,
      severity: 'high',
      status: 'error',
      description: `Error occurred: ${errorMessage}`,
      context: {
        ...context,
        error_message: errorMessage,
        stack_trace: stackTrace || null
      }
    });
  }

  /**
   * Track data export
   */
  async trackDataExport(
    userId: string,
    organizationId: string,
    entityType: EntityType,
    entityId: string,
    exportFormat: string,
    recordCount: number,
    context?: Partial<ActivityContext>
  ): Promise<ActivityLog> {
    return this.logActivity({
      activityType: 'export',
      userId,
      organizationId,
      entityType,
      entityId,
      severity: 'medium',
      description: `Exported ${recordCount} ${entityType} records as ${exportFormat}`,
      context: {
        ...context,
        bytes_processed: recordCount
      },
      metadata: {
        export_format: exportFormat,
        record_count: recordCount
      }
    });
  }
}

// Export singleton instance for use in API routes
export const createActivityLogService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new ActivityLogService(supabaseUrl, supabaseKey);
};