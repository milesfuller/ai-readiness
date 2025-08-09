/**
 * Invitation Database Service
 * 
 * This service provides all database operations for invitations using
 * the contracts as the single source of truth for data validation.
 * Follows the exact pattern from organization.service.ts for consistency.
 */

import { createClient } from '@supabase/supabase-js';
import type { 
  // Core Invitation Types
  Invitation,
  EmailTrackingType,
  InvitationTemplate,
  InvitationAnalytics,
  InvitationBatch,
  InvitationSettings,
  
  // Enum Types
  InvitationType,
  InvitationStatus,
  InvitationPriority,
  InvitationDeliveryMethod,
  EmailEventType,
  TemplateType,
  BatchStatus,
  AnalyticsPeriod
} from '@/contracts/schema';

import { 
  // Validation Functions
  validateInvitation,
  validateEmailTracking,
  validateInvitationTemplate,
  validateInvitationBatch,
  validateInvitationSettings,
  
  // Schema Types
  InvitationsTableSchema,
  EmailTrackingTableSchema,
  InvitationTemplatesTableSchema,
  InvitationBatchesTableSchema,
  InvitationSettingsTableSchema,
  InvitationAnalyticsTableSchema,
  
  // Helper Functions
  generateInvitationToken,
  createDefaultExpiry,
  isInvitationExpired,
  isInvitationActive,
  canInvitationBeAccepted,
  renderTemplate,
  validateTemplateVariables,
  shouldSendReminder
} from '@/contracts/schema';
import { z } from 'zod';

export class InvitationService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // INVITATION CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new invitation
   */
  async createInvitation(
    data: Partial<Invitation>, 
    senderId: string,
    autoSend: boolean = true
  ): Promise<Invitation> {
    try {
      // Generate secure token and set expiry
      const token = generateInvitationToken();
      const expiresAt = data.expires_at || createDefaultExpiry(7);
      
      // Prepare invitation data
      const invitationData = {
        ...data,
        token,
        sender_id: senderId,
        expires_at: expiresAt,
        status: 'pending' as InvitationStatus,
        response_count: 0,
        metadata: {
          permissions: [],
          custom_fields: {},
          tags: [],
          ...data.metadata
        }
      };

      // Validate input data
      const validatedData = InvitationsTableSchema.omit({ 
        id: true, 
        created_at: true
      }).parse(invitationData);

      const { data: invitation, error } = await this.supabase
        .from('invitations')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      const validatedInvitation = invitation as Invitation;

      // Auto-send if requested
      if (autoSend) {
        await this.sendInvitation(validatedInvitation.id);
      }

      return validatedInvitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new Error(`Failed to create invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send invitation (mark as sent and track)
   */
  async sendInvitation(invitationId: string): Promise<Invitation> {
    try {
      // Update invitation status
      const { data: invitation, error } = await this.supabase
        .from('invitations')
        .update({
          status: 'pending',
          sent_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;

      // Create email tracking entry
      await this.createEmailTrackingType(invitationId, 'queued', {
        email: (invitation as any).email || (invitation as any).recipient_email || 'unknown@example.com',
        status: 'queued'
      });

      // TODO: Integrate with actual email service here
      // This is where you would integrate with SendGrid, SES, etc.
      console.log('Email service integration point - invitation ready to send');

      return invitation as Invitation;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw new Error(`Failed to send invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitation(id: string): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? data as Invitation : null;
    } catch (error) {
      console.error('Error fetching invitation:', error);
      throw new Error(`Failed to fetch invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? data as Invitation : null;
    } catch (error) {
      console.error('Error fetching invitation by token:', error);
      throw new Error(`Failed to fetch invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token: string, acceptorUserId?: string): Promise<Invitation> {
    try {
      const invitation = await this.getInvitationByToken(token);
      
      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (!canInvitationBeAccepted(invitation)) {
        throw new Error('Invitation cannot be accepted (expired, already processed, etc.)');
      }

      const { data: updatedInvitation, error } = await this.supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date(),
          response_count: invitation.response_count + 1,
          last_response_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', invitation.id)
        .select()
        .single();

      if (error) throw error;

      // Track acceptance
      await this.createEmailTrackingType(invitation.id, 'clicked', {
        email: (invitation as any).email || (invitation as any).recipient_email || 'unknown@example.com',
        status: 'clicked',
        click_count: 1
      });

      return updatedInvitation as Invitation;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reject invitation
   */
  async rejectInvitation(token: string, reason?: string): Promise<Invitation> {
    try {
      const invitation = await this.getInvitationByToken(token);
      
      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      if (!canInvitationBeAccepted(invitation)) {
        throw new Error('Invitation cannot be rejected (expired, already processed, etc.)');
      }

      const { data: updatedInvitation, error } = await this.supabase
        .from('invitations')
        .update({
          status: 'rejected',
          rejected_at: new Date(),
          response_count: invitation.response_count + 1,
          last_response_at: new Date(),
          metadata: {
            ...invitation.metadata,
            rejection_reason: reason || null
          },
          updated_at: new Date()
        })
        .eq('id', invitation.id)
        .select()
        .single();

      if (error) throw error;

      return updatedInvitation as Invitation;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw new Error(`Failed to reject invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(id: string, cancelledBy: string): Promise<Invitation> {
    try {
      const { data: invitation, error } = await this.supabase
        .from('invitations')
        .update({
          status: 'cancelled',
          updated_at: new Date(),
          metadata: {
            cancelled_by: cancelledBy,
            cancelled_at: new Date()
          }
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return invitation as Invitation;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw new Error(`Failed to cancel invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(id: string): Promise<Invitation> {
    try {
      const invitation = await this.getInvitation(id);
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Generate new token and extend expiry
      const newToken = generateInvitationToken();
      const newExpiry = createDefaultExpiry(7);

      const { data: updatedInvitation, error } = await this.supabase
        .from('invitations')
        .update({
          token: newToken,
          expires_at: newExpiry,
          status: 'pending',
          sent_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Track resend
      await this.createEmailTrackingType(id, 'queued', {
        email: 'queued@example.com', // Placeholder email for queued emails
        status: 'queued'
      });

      return updatedInvitation as Invitation;
    } catch (error) {
      console.error('Error resending invitation:', error);
      throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitations with filtering and pagination
   */
  async getInvitations(filters: {
    type?: InvitationType;
    status?: InvitationStatus;
    senderId?: string;
    targetId?: string;
    email?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ invitations: Invitation[]; total: number }> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.senderId) query = query.eq('sender_id', filters.senderId);
      if (filters.targetId) query = query.eq('target_id', filters.targetId);
      if (filters.email) query = query.ilike('email', `%${filters.email}%`);

      query = query.order('created_at', { ascending: false });

      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        invitations: data.map(invitation => invitation as Invitation),
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw new Error(`Failed to fetch invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // EMAIL TRACKING OPERATIONS
  // ============================================================================

  /**
   * Create email tracking entry
   */
  async createEmailTrackingType(
    invitationId: string,
    eventType: EmailEventType,
    trackingData: Partial<EmailTrackingType>
  ): Promise<EmailTrackingType> {
    try {
      const trackingEntry = {
        invitation_id: invitationId,
        event_type: eventType,
        status: eventType,
        timestamp: new Date(),
        click_count: 0,
        metadata: {},
        ...trackingData
      };

      const validatedData = EmailTrackingTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(trackingEntry);

      const { data, error } = await this.supabase
        .from('email_tracking')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return data as EmailTrackingType;
    } catch (error) {
      console.error('Error creating email tracking:', error);
      throw new Error(`Failed to create email tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track email open
   */
  async trackEmailOpen(invitationId: string, ipAddress?: string, userAgent?: string): Promise<EmailTrackingType> {
    try {
      // Update invitation status if first open
      const invitation = await this.getInvitation(invitationId);
      if (invitation && invitation.status === 'delivered') {
        await this.supabase
          .from('invitations')
          .update({ status: 'opened', updated_at: new Date() })
          .eq('id', invitationId);
      }

      return await this.createEmailTrackingType(invitationId, 'opened', {
        email: 'opened@example.com',
        status: 'opened',
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Error tracking email open:', error);
      throw new Error(`Failed to track email open: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track email click
   */
  async trackEmailClick(
    invitationId: string, 
    clickedUrl: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<EmailTrackingType> {
    try {
      // Update invitation status if first click
      const invitation = await this.getInvitation(invitationId);
      if (invitation && (invitation.status === 'delivered' || invitation.status === 'opened')) {
        await this.supabase
          .from('invitations')
          .update({ status: 'clicked', updated_at: new Date() })
          .eq('id', invitationId);
      }

      return await this.createEmailTrackingType(invitationId, 'clicked', {
        email: 'clicked@example.com',
        status: 'clicked',
        click_count: 1,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    } catch (error) {
      console.error('Error tracking email click:', error);
      throw new Error(`Failed to track email click: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track email bounce
   */
  async trackEmailBounce(
    invitationId: string,
    bounceType: 'hard' | 'soft' | 'block',
    bounceReason: string
  ): Promise<EmailTrackingType> {
    try {
      // Update invitation status
      await this.supabase
        .from('invitations')
        .update({ status: 'bounced', updated_at: new Date() })
        .eq('id', invitationId);

      return await this.createEmailTrackingType(invitationId, 'bounced', {
        email: 'bounced@example.com',
        status: 'bounced',
        bounce_reason: bounceReason
      });
    } catch (error) {
      console.error('Error tracking email bounce:', error);
      throw new Error(`Failed to track email bounce: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get email tracking for invitation
   */
  async getEmailTrackingType(invitationId: string): Promise<EmailTrackingType[]> {
    try {
      const { data, error } = await this.supabase
        .from('email_tracking')
        .select('*')
        .eq('invitation_id', invitationId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      return data.map(tracking => tracking as EmailTrackingType);
    } catch (error) {
      console.error('Error fetching email tracking:', error);
      throw new Error(`Failed to fetch email tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // INVITATION TEMPLATE OPERATIONS
  // ============================================================================

  /**
   * Create invitation template
   */
  async createTemplate(data: Partial<InvitationTemplate>, createdBy: string): Promise<InvitationTemplate> {
    try {
      const templateData = {
        name: (data as any).name || 'Default Template',
        subject: (data as any).subject || 'Default Subject',
        body: (data as any).body || 'Default Body',
        variables: (data as any).variables || []
      };

      const validatedData = InvitationTemplatesTableSchema.omit({
        id: true,
        created_at: true
      }).parse(templateData);

      const { data: template, error } = await this.supabase
        .from('invitation_templates')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateInvitationTemplate(template);
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<InvitationTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitation_templates')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? validateInvitationTemplate(data) : null;
    } catch (error) {
      console.error('Error fetching template:', error);
      throw new Error(`Failed to fetch template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, updates: Partial<InvitationTemplate>): Promise<InvitationTemplate> {
    try {
      const validatedUpdates = InvitationTemplatesTableSchema.partial().omit({
        id: true,
        created_at: true
      }).parse(updates);

      const { data, error } = await this.supabase
        .from('invitation_templates')
        .update({
          ...validatedUpdates,
          updated_at: new Date()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      return validateInvitationTemplate(data);
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('invitation_templates')
        .update({
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Render template with variables
   */
  async renderTemplateContent(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<{ subject: string; body: string; html?: string }> {
    try {
      const template = await this.getTemplate(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate variables
      const isValid = validateTemplateVariables((template as any).body || '', variables);
      if (!isValid) {
        throw new Error(`Template validation failed: Invalid variables provided`);
      }

      // Render template with variables
      return {
        subject: renderTemplate((template as any).subject || '', variables),
        body: renderTemplate((template as any).body || '', variables)
      };
    } catch (error) {
      console.error('Error rendering template:', error);
      throw new Error(`Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get templates with filtering
   */
  async getTemplates(filters: {
    type?: TemplateType;
    organizationId?: string;
    createdBy?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: InvitationTemplate[]; total: number }> {
    try {
      let query = this.supabase
        .from('invitation_templates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      if (filters.type) query = query.eq('type', filters.type);
      if (filters.organizationId) query = query.eq('organization_id', filters.organizationId);
      if (filters.createdBy) query = query.eq('created_by', filters.createdBy);
      if (filters.active !== undefined) query = query.eq('active', filters.active);

      query = query.order('created_at', { ascending: false });

      if (filters.limit) query = query.limit(filters.limit);
      if (filters.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 10) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        templates: data.map(template => validateInvitationTemplate(template)),
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error(`Failed to fetch templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // BATCH INVITATION OPERATIONS
  // ============================================================================

  /**
   * Create invitation batch
   */
  async createBatch(
    data: Partial<InvitationBatch>, 
    createdBy: string
  ): Promise<InvitationBatch> {
    try {
      const batchData = {
        ...data,
        created_by: createdBy,
        status: 'draft' as BatchStatus,
        total_count: data.recipients_data?.length || 0,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        send_rate: data.send_rate || 10,
        recipients_data: data.recipients_data || [],
        errors: [],
        metadata: data.metadata || {}
      };

      // Use the data directly as we're not including the auto-generated fields
      const validatedData = batchData;

      const { data: batch, error } = await this.supabase
        .from('invitation_batches')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateInvitationBatch(batch);
    } catch (error) {
      console.error('Error creating batch:', error);
      throw new Error(`Failed to create batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send batch invitations
   */
  async sendBatch(batchId: string): Promise<InvitationBatch> {
    try {
      const batch = await this.getBatch(batchId);
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      if (batch.status !== 'draft' && batch.status !== 'scheduled') {
        throw new Error('Batch cannot be sent in current status');
      }

      // Update batch status to processing
      await this.supabase
        .from('invitation_batches')
        .update({
          status: 'processing',
          started_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', batchId);

      // Process invitations (this would typically be done in a background job)
      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{ email: string; error: string; timestamp: Date }> = [];

      for (const recipient of batch.recipients_data) {
        try {
          await this.createInvitation({
            type: batch.type || undefined,
            email: recipient.email,
            template_id: batch.template_id || undefined,
            target_id: batch.target_id,
            subject: `Invitation - ${recipient.name || recipient.email}`,
            metadata: {
              role: null,
              permissions: [],
              custom_fields: {
                batch_id: batchId,
                recipient_variables: recipient.variables
              },
              redirect_url: null,
              campaign_id: null,
              source: null,
              tags: []
            }
          }, batch.created_by, true);

          successCount++;
        } catch (error) {
          failedCount++;
          errors.push({
            email: recipient.email,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
          });
        }
      }

      // Update batch with results
      const { data: updatedBatch, error: updateError } = await this.supabase
        .from('invitation_batches')
        .update({
          status: 'completed',
          completed_at: new Date(),
          processed_count: batch.total_count,
          success_count: successCount,
          failed_count: failedCount,
          errors: errors,
          updated_at: new Date()
        })
        .eq('id', batchId)
        .select()
        .single();

      if (updateError) throw updateError;

      return validateInvitationBatch(updatedBatch);
    } catch (error) {
      console.error('Error sending batch:', error);
      throw new Error(`Failed to send batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get batch by ID
   */
  async getBatch(id: string): Promise<InvitationBatch | null> {
    try {
      const { data, error } = await this.supabase
        .from('invitation_batches')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? validateInvitationBatch(data) : null;
    } catch (error) {
      console.error('Error fetching batch:', error);
      throw new Error(`Failed to fetch batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get batch progress
   */
  async getBatchProgress(batchId: string): Promise<{
    total: number;
    processed: number;
    success: number;
    failed: number;
    progress: number;
    status: BatchStatus;
  }> {
    try {
      const batch = await this.getBatch(batchId);
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      const progress = batch.total_count > 0 ? (batch.processed_count / batch.total_count) * 100 : 0;

      return {
        total: batch.total_count,
        processed: batch.processed_count,
        success: batch.success_count,
        failed: batch.failed_count,
        progress: Math.round(progress * 100) / 100,
        status: batch.status
      };
    } catch (error) {
      console.error('Error fetching batch progress:', error);
      throw new Error(`Failed to fetch batch progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ANALYTICS OPERATIONS
  // ============================================================================

  /**
   * Get invitation analytics
   */
  async getAnalytics(filters: {
    period?: AnalyticsPeriod;
    startDate?: Date;
    endDate?: Date;
    type?: InvitationType;
    templateId?: string;
  } = {}): Promise<InvitationAnalytics[]> {
    try {
      let query = this.supabase
        .from('invitation_analytics')
        .select('*');

      if (filters.period) query = query.eq('period', filters.period);
      if (filters.startDate) query = query.gte('period_start', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('period_end', filters.endDate.toISOString());

      query = query.order('period_start', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data.map(analytics => InvitationAnalyticsTableSchema.parse(analytics));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: InvitationType;
    senderId?: string;
  } = {}): Promise<{
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    accepted: number;
    rejected: number;
    expired: number;
    bounced: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    acceptanceRate: number;
    bounceRate: number;
  }> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('status, sent_at')
        .is('deleted_at', null);

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.senderId) query = query.eq('sender_id', filters.senderId);

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data.length,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
        bounced: 0
      };

      data.forEach(invitation => {
        if (invitation.sent_at) stats.sent++;
        
        switch (invitation.status) {
          case 'delivered': stats.delivered++; break;
          case 'opened': stats.opened++; break;
          case 'clicked': stats.clicked++; break;
          case 'accepted': stats.accepted++; break;
          case 'rejected': stats.rejected++; break;
          case 'expired': stats.expired++; break;
          case 'bounced': stats.bounced++; break;
        }
      });

      return {
        ...stats,
        deliveryRate: stats.sent > 0 ? stats.delivered / stats.sent : 0,
        openRate: stats.delivered > 0 ? stats.opened / stats.delivered : 0,
        clickRate: stats.delivered > 0 ? stats.clicked / stats.delivered : 0,
        acceptanceRate: stats.delivered > 0 ? stats.accepted / stats.delivered : 0,
        bounceRate: stats.sent > 0 ? stats.bounced / stats.sent : 0
      };
    } catch (error) {
      console.error('Error fetching invitation stats:', error);
      throw new Error(`Failed to fetch invitation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get acceptance rates by type
   */
  async getAcceptanceRatesByType(filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<Record<InvitationType, number>> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('type, status')
        .is('deleted_at', null);

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      const typeStats: Record<string, { total: number; accepted: number }> = {};

      data.forEach(invitation => {
        const invitationType = invitation.type as InvitationType;
        if (!typeStats[invitationType]) {
          typeStats[invitationType] = { total: 0, accepted: 0 };
        }
        typeStats[invitationType].total++;
        if (invitation.status === 'accepted') {
          typeStats[invitationType].accepted++;
        }
      });

      const rates: Record<InvitationType, number> = {} as any;
      
      Object.entries(typeStats).forEach(([type, stats]) => {
        rates[type as InvitationType] = stats.total > 0 ? stats.accepted / stats.total : 0;
      });

      return rates;
    } catch (error) {
      console.error('Error fetching acceptance rates by type:', error);
      throw new Error(`Failed to fetch acceptance rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get delivery rates by template
   */
  async getDeliveryRatesByTemplate(filters: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<Record<string, number>> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('template_id, status, sent_at')
        .not('template_id', 'is', null)
        .is('deleted_at', null);

      if (filters.startDate) query = query.gte('created_at', filters.startDate.toISOString());
      if (filters.endDate) query = query.lte('created_at', filters.endDate.toISOString());

      const { data, error } = await query;

      if (error) throw error;

      const templateStats: Record<string, { sent: number; delivered: number }> = {};

      data.forEach(invitation => {
        const templateId = invitation.template_id as string;
        if (!templateStats[templateId]) {
          templateStats[templateId] = { sent: 0, delivered: 0 };
        }
        if (invitation.sent_at) {
          templateStats[templateId].sent++;
          if (invitation.status === 'delivered' || invitation.status === 'opened' || 
              invitation.status === 'clicked' || invitation.status === 'accepted') {
            templateStats[templateId].delivered++;
          }
        }
      });

      const rates: Record<string, number> = {};
      
      Object.entries(templateStats).forEach(([templateId, stats]) => {
        rates[templateId] = stats.sent > 0 ? stats.delivered / stats.sent : 0;
      });

      return rates;
    } catch (error) {
      console.error('Error fetching delivery rates by template:', error);
      throw new Error(`Failed to fetch delivery rates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if email already has pending invitation
   */
  async hasPendingInvitation(email: string, type?: InvitationType, targetId?: string): Promise<boolean> {
    try {
      let query = this.supabase
        .from('invitations')
        .select('id')
        .eq('email', email)
        .in('status', ['pending', 'delivered', 'opened', 'clicked'])
        .gt('expires_at', new Date().toISOString())
        .is('deleted_at', null);

      if (type) query = query.eq('type', type);
      if (targetId) query = query.eq('target_id', targetId);

      const { data, error } = await query;

      if (error) return false;

      return data && data.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('invitations')
        .update({
          status: 'expired',
          updated_at: new Date()
        })
        .lt('expires_at', new Date().toISOString())
        .in('status', ['pending', 'delivered', 'opened', 'clicked'])
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      throw new Error(`Failed to cleanup expired invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitation settings
   */
  async getSettings(organizationId?: string): Promise<InvitationSettings | null> {
    try {
      let query = this.supabase
        .from('invitation_settings')
        .select('*');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? validateInvitationSettings(data) : null;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw new Error(`Failed to fetch settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update invitation settings
   */
  async updateSettings(
    settings: Partial<InvitationSettings>, 
    organizationId?: string
  ): Promise<InvitationSettings> {
    try {
      const settingsData = {
        ...settings,
        organization_id: organizationId || null,
        metadata: settings.metadata || {}
      };

      const validatedData = InvitationSettingsTableSchema.partial().omit({
        id: true,
        created_at: true
      }).parse(settingsData);

      // Try to update existing settings first
      const existingSettings = await this.getSettings(organizationId);
      
      if (existingSettings) {
        const { data, error } = await this.supabase
          .from('invitation_settings')
          .update({
            ...validatedData,
            updated_at: new Date()
          })
          .eq('id', existingSettings.id)
          .select()
          .single();

        if (error) throw error;
        return validateInvitationSettings(data);
      } else {
        // Create new settings
        const { data, error } = await this.supabase
          .from('invitation_settings')
          .insert({
            ...validatedData,
            default_sender_email: settings.default_sender_email || 'noreply@example.com'
          })
          .select()
          .single();

        if (error) throw error;
        return validateInvitationSettings(data);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new Error(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance for use in API routes
export const createInvitationService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new InvitationService(supabaseUrl, supabaseKey);
};