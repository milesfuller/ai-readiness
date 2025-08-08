/**
 * Survey Template Database Service
 * 
 * This service provides all database operations for survey templates using
 * the contracts as the single source of truth for data validation.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  SurveyTemplate,
  SurveyTemplateQuestion,
  SurveyTemplateVersion,
  TemplateShare,
  TemplateAnalytics,
  TemplateReview,
  TemplateCategory,
  TemplateStatus,
  TemplateVisibility,
  ShareType,
  QuestionType,
  validateSurveyTemplate,
  validateTemplateQuestion,
  validateTemplateVersion,
  validateTemplateShare,
  validateTemplateAnalytics,
  validateTemplateReview,
  SurveyTemplatesTableSchema,
  SurveyTemplateQuestionsTableSchema,
  SurveyTemplateVersionsTableSchema,
  TemplateSharesTableSchema,
  TemplateAnalyticsTableSchema,
  TemplateReviewsTableSchema
} from '@/contracts/schema';
import { z } from 'zod';

export class SurveyTemplateService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // SURVEY TEMPLATE CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new survey template
   */
  async createTemplate(data: Partial<SurveyTemplate>, creatorUserId: string): Promise<SurveyTemplate> {
    try {
      // Validate input data
      const validatedData = SurveyTemplatesTableSchema.omit({ 
        id: true, 
        created_at: true, 
        updated_at: true 
      }).parse({
        ...data,
        created_by: creatorUserId
      });

      const { data: template, error } = await this.supabase
        .from('survey_templates')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateSurveyTemplate(template);
    } catch (error) {
      console.error('Error creating survey template:', error);
      throw new Error(`Failed to create survey template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get survey template by ID
   */
  async getTemplate(id: string, includeQuestions = false): Promise<SurveyTemplate | null> {
    try {
      let query = this.supabase
        .from('survey_templates')
        .select(includeQuestions ? '*, questions:survey_template_questions(*)' : '*')
        .eq('id', id)
        .is('deleted_at', null);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? validateSurveyTemplate(data) : null;
    } catch (error) {
      console.error('Error fetching survey template:', error);
      throw new Error(`Failed to fetch survey template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update survey template
   */
  async updateTemplate(id: string, updates: Partial<SurveyTemplate>): Promise<SurveyTemplate> {
    try {
      const validatedUpdates = SurveyTemplatesTableSchema.partial().omit({
        id: true,
        created_at: true,
        created_by: true
      }).parse(updates);

      const { data, error } = await this.supabase
        .from('survey_templates')
        .update({
          ...validatedUpdates,
          updated_at: new Date()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      return validateSurveyTemplate(data);
    } catch (error) {
      console.error('Error updating survey template:', error);
      throw new Error(`Failed to update survey template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Soft delete survey template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('survey_templates')
        .update({ 
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting survey template:', error);
      throw new Error(`Failed to delete survey template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List survey templates with filtering and pagination
   */
  async listTemplates(options: {
    organizationId?: string;
    category?: TemplateCategory;
    status?: TemplateStatus;
    visibility?: TemplateVisibility;
    createdBy?: string;
    search?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: SurveyTemplate[]; total: number }> {
    try {
      let query = this.supabase
        .from('survey_templates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Apply filters
      if (options.organizationId) {
        query = query.eq('organization_id', options.organizationId);
      }
      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }
      if (options.visibility) {
        query = query.eq('visibility', options.visibility);
      }
      if (options.createdBy) {
        query = query.eq('created_by', options.createdBy);
      }
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }
      if (options.tags && options.tags.length > 0) {
        query = query.contains('tags', options.tags);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        templates: data?.map(template => validateSurveyTemplate(template)) || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error listing survey templates:', error);
      throw new Error(`Failed to list survey templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search templates by text
   */
  async searchTemplates(query: string, options: {
    organizationId?: string;
    category?: TemplateCategory;
    limit?: number;
  } = {}): Promise<SurveyTemplate[]> {
    try {
      let searchQuery = this.supabase
        .from('survey_templates')
        .select('*')
        .is('deleted_at', null)
        .or(`name.ilike.%${query}%,title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`);

      if (options.organizationId) {
        searchQuery = searchQuery.eq('organization_id', options.organizationId);
      }
      if (options.category) {
        searchQuery = searchQuery.eq('category', options.category);
      }

      searchQuery = searchQuery
        .limit(options.limit || 20)
        .order('usage_count', { ascending: false });

      const { data, error } = await searchQuery;

      if (error) throw error;

      return data?.map(template => validateSurveyTemplate(template)) || [];
    } catch (error) {
      console.error('Error searching survey templates:', error);
      throw new Error(`Failed to search survey templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // TEMPLATE QUESTIONS MANAGEMENT
  // ============================================================================

  /**
   * Add question to template
   */
  async addQuestion(
    templateId: string,
    questionData: Partial<SurveyTemplateQuestion>
  ): Promise<SurveyTemplateQuestion> {
    try {
      // Get next order index
      const { data: lastQuestion } = await this.supabase
        .from('survey_template_questions')
        .select('order_index')
        .eq('template_id', templateId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrderIndex = ((lastQuestion?.order_index as number) ?? -1) + 1;

      const validatedData = SurveyTemplateQuestionsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse({
        ...questionData,
        template_id: templateId,
        order_index: questionData.order_index ?? nextOrderIndex
      });

      const { data, error } = await this.supabase
        .from('survey_template_questions')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateTemplateQuestion(data);
    } catch (error) {
      console.error('Error adding question to template:', error);
      throw new Error(`Failed to add question to template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template question
   */
  async updateQuestion(
    questionId: string,
    updates: Partial<SurveyTemplateQuestion>
  ): Promise<SurveyTemplateQuestion> {
    try {
      const validatedUpdates = SurveyTemplateQuestionsTableSchema.partial().omit({
        id: true,
        template_id: true,
        created_at: true
      }).parse(updates);

      const { data, error } = await this.supabase
        .from('survey_template_questions')
        .update({
          ...validatedUpdates,
          updated_at: new Date()
        })
        .eq('id', questionId)
        .select()
        .single();

      if (error) throw error;

      return validateTemplateQuestion(data);
    } catch (error) {
      console.error('Error updating template question:', error);
      throw new Error(`Failed to update template question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reorder template questions
   */
  async reorderQuestions(
    templateId: string,
    questionIds: string[]
  ): Promise<SurveyTemplateQuestion[]> {
    try {
      // Update order_index for each question
      const updates = questionIds.map((questionId, index) => 
        this.supabase
          .from('survey_template_questions')
          .update({ 
            order_index: index,
            updated_at: new Date()
          })
          .eq('id', questionId)
          .eq('template_id', templateId)
      );

      await Promise.all(updates);

      // Return updated questions
      const { data, error } = await this.supabase
        .from('survey_template_questions')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data?.map(question => validateTemplateQuestion(question)) || [];
    } catch (error) {
      console.error('Error reordering template questions:', error);
      throw new Error(`Failed to reorder template questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete template question
   */
  async deleteQuestion(questionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('survey_template_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting template question:', error);
      throw new Error(`Failed to delete template question: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template questions
   */
  async getTemplateQuestions(templateId: string): Promise<SurveyTemplateQuestion[]> {
    try {
      const { data, error } = await this.supabase
        .from('survey_template_questions')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data?.map(question => validateTemplateQuestion(question)) || [];
    } catch (error) {
      console.error('Error fetching template questions:', error);
      throw new Error(`Failed to fetch template questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // TEMPLATE VERSIONS MANAGEMENT
  // ============================================================================

  /**
   * Create new template version
   */
  async createVersion(
    templateId: string,
    versionNotes: string,
    createdBy: string
  ): Promise<SurveyTemplateVersion> {
    try {
      // Get current template with questions
      const template = await this.getTemplate(templateId, true);
      if (!template) throw new Error('Template not found');

      const questions = await this.getTemplateQuestions(templateId);

      // Get next version number
      const { data: lastVersion } = await this.supabase
        .from('survey_template_versions')
        .select('version_number')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = ((lastVersion?.version_number as number) ?? 0) + 1;

      // Create snapshot
      const snapshot = {
        template,
        questions,
        created_at: new Date()
      };

      const versionData = {
        template_id: templateId,
        version_number: nextVersion,
        version_notes: versionNotes,
        snapshot,
        created_by: createdBy,
        is_active: false
      };

      const validatedData = SurveyTemplateVersionsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(versionData);

      const { data, error } = await this.supabase
        .from('survey_template_versions')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateTemplateVersion(data);
    } catch (error) {
      console.error('Error creating template version:', error);
      throw new Error(`Failed to create template version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate template version
   */
  async activateVersion(versionId: string): Promise<SurveyTemplateVersion> {
    try {
      // Get version
      const { data: version, error: versionError } = await this.supabase
        .from('survey_template_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (versionError) throw versionError;

      // Deactivate all other versions for this template
      await this.supabase
        .from('survey_template_versions')
        .update({ is_active: false })
        .eq('template_id', version.template_id as string);

      // Activate this version
      const { data, error } = await this.supabase
        .from('survey_template_versions')
        .update({ is_active: true })
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;

      return validateTemplateVersion(data);
    } catch (error) {
      console.error('Error activating template version:', error);
      throw new Error(`Failed to activate template version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List template versions
   */
  async getTemplateVersions(templateId: string): Promise<SurveyTemplateVersion[]> {
    try {
      const { data, error } = await this.supabase
        .from('survey_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return data?.map(version => validateTemplateVersion(version)) || [];
    } catch (error) {
      console.error('Error fetching template versions:', error);
      throw new Error(`Failed to fetch template versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // TEMPLATE SHARING MANAGEMENT
  // ============================================================================

  /**
   * Share template with user or organization
   */
  async shareTemplate(
    templateId: string,
    shareType: ShareType,
    sharedBy: string,
    options: {
      sharedWithUser?: string;
      sharedWithOrg?: string;
      expiresAt?: Date;
      shareToken?: string;
    }
  ): Promise<TemplateShare> {
    try {
      const shareData = {
        template_id: templateId,
        shared_with_user: options.sharedWithUser || null,
        shared_with_org: options.sharedWithOrg || null,
        share_type: shareType,
        shared_by: sharedBy,
        expires_at: options.expiresAt || null,
        share_token: options.shareToken || (shareType === 'view' ? this.generateSecureToken() : null),
        is_active: true
      };

      const validatedData = TemplateSharesTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(shareData);

      const { data, error } = await this.supabase
        .from('template_shares')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return validateTemplateShare(data);
    } catch (error) {
      console.error('Error sharing template:', error);
      throw new Error(`Failed to share template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke template share
   */
  async revokeShare(shareId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('template_shares')
        .update({ 
          is_active: false,
          updated_at: new Date()
        })
        .eq('id', shareId);

      if (error) throw error;
    } catch (error) {
      console.error('Error revoking template share:', error);
      throw new Error(`Failed to revoke template share: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template shares
   */
  async getTemplateShares(templateId: string): Promise<TemplateShare[]> {
    try {
      const { data, error } = await this.supabase
        .from('template_shares')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(share => validateTemplateShare(share)) || [];
    } catch (error) {
      console.error('Error fetching template shares:', error);
      throw new Error(`Failed to fetch template shares: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // TEMPLATE ANALYTICS MANAGEMENT
  // ============================================================================

  /**
   * Track template usage
   */
  async trackUsage(
    templateId: string,
    eventType: 'view' | 'use' | 'completion',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get or create today's analytics record
      const { data: existing } = await this.supabase
        .from('template_analytics')
        .select('*')
        .eq('template_id', templateId)
        .eq('date', today.toISOString())
        .single();

      if (existing) {
        // Update existing record
        const updates: any = { updated_at: new Date() };
        switch (eventType) {
          case 'view':
            updates.views = (existing.views as number) + 1;
            break;
          case 'use':
            updates.uses = (existing.uses as number) + 1;
            break;
          case 'completion':
            updates.completions = (existing.completions as number) + 1;
            break;
        }

        await this.supabase
          .from('template_analytics')
          .update(updates)
          .eq('id', existing.id as string);
      } else {
        // Create new record
        const analyticsData = {
          template_id: templateId,
          date: today,
          views: eventType === 'view' ? 1 : 0,
          uses: eventType === 'use' ? 1 : 0,
          completions: eventType === 'completion' ? 1 : 0,
          by_question_analytics: {}
        };

        const validatedData = TemplateAnalyticsTableSchema.omit({
          id: true,
          created_at: true,
          updated_at: true
        }).parse(analyticsData);

        await this.supabase
          .from('template_analytics')
          .insert(validatedData);
      }

      // Also update template usage count
      if (eventType === 'use') {
        await this.supabase
          .from('survey_templates')
          .update({ 
            // Note: Supabase increment would be handled via RPC call in production
            updated_at: new Date()
          })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error('Error tracking template usage:', error);
      // Don't throw error for analytics - it shouldn't break main functionality
    }
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(
    templateId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TemplateAnalytics[]> {
    try {
      let query = this.supabase
        .from('template_analytics')
        .select('*')
        .eq('template_id', templateId);

      if (startDate) {
        query = query.gte('date', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('date', endDate.toISOString());
      }

      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(analytics => validateTemplateAnalytics(analytics)) || [];
    } catch (error) {
      console.error('Error fetching template analytics:', error);
      throw new Error(`Failed to fetch template analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // TEMPLATE REVIEWS MANAGEMENT
  // ============================================================================

  /**
   * Add review to template
   */
  async addReview(
    templateId: string,
    reviewerId: string,
    rating: number,
    reviewText?: string
  ): Promise<TemplateReview> {
    try {
      const reviewData = {
        template_id: templateId,
        reviewer_id: reviewerId,
        rating,
        review_text: reviewText || null,
        is_verified_purchase: false // TODO: Implement purchase verification
      };

      const validatedData = TemplateReviewsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(reviewData);

      const { data, error } = await this.supabase
        .from('template_reviews')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      // Update template average rating
      await this.updateTemplateRating(templateId);

      return validateTemplateReview(data);
    } catch (error) {
      console.error('Error adding template review:', error);
      throw new Error(`Failed to add template review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template review
   */
  async updateReview(
    reviewId: string,
    updates: { rating?: number; reviewText?: string }
  ): Promise<TemplateReview> {
    try {
      const validatedUpdates = TemplateReviewsTableSchema.partial().omit({
        id: true,
        template_id: true,
        reviewer_id: true,
        created_at: true
      }).parse({
        rating: updates.rating,
        review_text: updates.reviewText,
        updated_at: new Date()
      });

      const { data, error } = await this.supabase
        .from('template_reviews')
        .update(validatedUpdates)
        .eq('id', reviewId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;

      // Update template average rating
      await this.updateTemplateRating(data.template_id as string);

      return validateTemplateReview(data);
    } catch (error) {
      console.error('Error updating template review:', error);
      throw new Error(`Failed to update template review: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template reviews
   */
  async getTemplateReviews(
    templateId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ reviews: TemplateReview[]; total: number }> {
    try {
      let query = this.supabase
        .from('template_reviews')
        .select('*', { count: 'exact' })
        .eq('template_id', templateId)
        .is('deleted_at', null);

      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 10)) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        reviews: data?.map(review => validateTemplateReview(review)) || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching template reviews:', error);
      throw new Error(`Failed to fetch template reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if user can access template
   */
  async canAccessTemplate(templateId: string, userId: string): Promise<boolean> {
    try {
      // Check if user owns the template
      const { data: template } = await this.supabase
        .from('survey_templates')
        .select('created_by, visibility, organization_id')
        .eq('id', templateId)
        .is('deleted_at', null)
        .single();

      if (!template) return false;
      if (template.created_by === userId) return true;
      if (template.visibility === 'public') return true;

      // Check if template is shared with user
      const { data: share } = await this.supabase
        .from('template_shares')
        .select('id')
        .eq('template_id', templateId)
        .eq('shared_with_user', userId)
        .eq('is_active', true)
        .single();

      if (share) return true;

      // Check organization access if template is organization-visible
      if (template.visibility === 'organization' && template.organization_id) {
        const { data: member } = await this.supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', template.organization_id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        return !!member;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Publish template
   */
  async publishTemplate(templateId: string): Promise<SurveyTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('survey_templates')
        .update({
          status: 'published',
          published_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', templateId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;

      return validateSurveyTemplate(data);
    } catch (error) {
      console.error('Error publishing template:', error);
      throw new Error(`Failed to publish template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template rating based on reviews
   */
  private async updateTemplateRating(templateId: string): Promise<void> {
    try {
      const { data: reviews } = await this.supabase
        .from('template_reviews')
        .select('rating')
        .eq('template_id', templateId)
        .is('deleted_at', null);

      if (reviews && reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + (review.rating as number), 0) / reviews.length;
        
        await this.supabase
          .from('survey_templates')
          .update({ 
            average_rating: averageRating,
            updated_at: new Date()
          })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error('Error updating template rating:', error);
      // Don't throw - this is a helper operation
    }
  }

  /**
   * Generate secure token for sharing
   */
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

// Export singleton instance for use in API routes
export const createSurveyTemplateService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new SurveyTemplateService(supabaseUrl, supabaseKey);
};