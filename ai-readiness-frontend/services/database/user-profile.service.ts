/**
 * User Profile Database Service
 * 
 * This service provides all database operations for user profiles and onboarding
 * using the contracts as the single source of truth for data validation.
 */

import { createClient } from '@supabase/supabase-js';
import {
  UserProfile,
  OnboardingProgress,
  ProfileMetadata,
  UserSession,
  validateUserProfile,
  validateOnboardingProgress,
  validateProfileMetadata,
  validateUserSession,
  UserProfilesTableSchema,
  OnboardingProgressTableSchema,
  ProfileMetadataTableSchema,
  UserSessionsTableSchema,
  OnboardingStep,
  UserRole,
  getNextOnboardingStep,
  isOnboardingComplete
} from '@/contracts/schema';
import { z } from 'zod';

export class UserProfileService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // USER PROFILE OPERATIONS
  // ============================================================================

  /**
   * Create or update user profile
   */
  async upsertUserProfile(userId: string, data: Partial<UserProfile>): Promise<any> {
    try {
      const validatedData = UserProfilesTableSchema.partial().parse({
        ...data,
        id: userId, // Ensure ID matches user ID
        updated_at: new Date()
      });

      const { data: profile, error } = await this.supabase
        .from('user_profiles')
        .upsert({
          ...validatedData,
          id: userId,
          user_id: userId // For backward compatibility
        })
        .select()
        .single();

      if (error) throw error;

      return profile as any;
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw new Error(`Failed to upsert user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data as any;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error(`Failed to fetch user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get profiles by organization
   */
  async getOrganizationProfiles(organizationId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(profile => profile as any);
    } catch (error) {
      console.error('Error fetching organization profiles:', error);
      throw new Error(`Failed to fetch organization profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({ 
          role,
          updated_at: new Date()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new Error(`Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deactivate user profile
   */
  async deactivateUserProfile(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({ 
          is_active: false,
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating user profile:', error);
      throw new Error(`Failed to deactivate user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ONBOARDING OPERATIONS
  // ============================================================================

  /**
   * Get onboarding progress
   */
  async getOnboardingProgress(userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create default progress if not exists
          return await this.createOnboardingProgress(userId);
        }
        throw error;
      }

      return data as any;
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
      throw new Error(`Failed to fetch onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create onboarding progress
   */
  async createOnboardingProgress(userId: string): Promise<any> {
    try {
      const progressData = {
        user_id: userId,
        current_step: 'welcome' as OnboardingStep,
        completed_steps: [],
        metadata: {
          organization_created: false,
          profile_completed: false,
          team_invited: false,
          survey_created: false,
          skipped_steps: []
        },
        started_at: new Date()
      };

      const validatedData = OnboardingProgressTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(progressData);

      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error creating onboarding progress:', error);
      throw new Error(`Failed to create onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    userId: string,
    currentStep: OnboardingStep,
    metadata?: any
  ): Promise<any> {
    try {
      // Get current progress
      const current = await this.getOnboardingProgress(userId);
      if (!current) {
        throw new Error('Onboarding progress not found');
      }

      // Add current step to completed if moving forward
      const completedSteps = current.completed_steps.includes(current.current_step)
        ? current.completed_steps
        : [...current.completed_steps, current.current_step];

      // Check if onboarding is complete
      const isComplete = currentStep === 'completed';

      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .update({
          current_step: currentStep,
          completed_steps: completedSteps,
          metadata: metadata ? { ...current.metadata, ...metadata } : current.metadata,
          completed_at: isComplete ? new Date() : null,
          updated_at: new Date()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      throw new Error(`Failed to update onboarding progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(userId: string): Promise<any> {
    return await this.updateOnboardingProgress(userId, 'completed', {
      organization_created: true,
      profile_completed: true,
      team_invited: true,
      survey_created: true
    });
  }

  /**
   * Skip onboarding step
   */
  async skipOnboardingStep(userId: string, step: OnboardingStep): Promise<any> {
    try {
      const current = await this.getOnboardingProgress(userId);
      if (!current) {
        throw new Error('Onboarding progress not found');
      }

      const nextStep = getNextOnboardingStep(step);
      if (!nextStep) {
        return await this.completeOnboarding(userId);
      }

      const skippedSteps = current.metadata.skipped_steps || [];
      if (!skippedSteps.includes(step)) {
        skippedSteps.push(step);
      }

      return await this.updateOnboardingProgress(userId, nextStep as OnboardingStep, {
        skipped_steps: skippedSteps
      });
    } catch (error) {
      console.error('Error skipping onboarding step:', error);
      throw new Error(`Failed to skip onboarding step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PROFILE METADATA OPERATIONS
  // ============================================================================

  /**
   * Set profile metadata
   */
  async setProfileMetadata(
    profileId: string,
    key: string,
    value: unknown,
    isPublic: boolean = false
  ): Promise<any> {
    try {
      const metadataData = {
        profile_id: profileId,
        key,
        value,
        is_public: isPublic
      };

      // Use the data directly as we're not including auto-generated fields
      const validatedData = metadataData;

      const { data, error } = await this.supabase
        .from('profile_metadata')
        .upsert(validatedData)
        .select()
        .single();

      if (error) throw error;

      return data as any;
    } catch (error) {
      console.error('Error setting profile metadata:', error);
      throw new Error(`Failed to set profile metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get profile metadata
   */
  async getProfileMetadata(profileId: string, key?: string): Promise<any[]> {
    try {
      let query = this.supabase
        .from('profile_metadata')
        .select('*')
        .eq('profile_id', profileId);

      if (key) {
        query = query.eq('key', key);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(item => item as any);
    } catch (error) {
      console.error('Error fetching profile metadata:', error);
      throw new Error(`Failed to fetch profile metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // SESSION OPERATIONS
  // ============================================================================

  /**
   * Create user session
   */
  async createUserSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata: UserSession['metadata']
  ): Promise<any> {
    try {
      const sessionData = {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        metadata,
        is_active: true
      };

      const validatedData = UserSessionsTableSchema.omit({
        id: true,
        created_at: true,
        updated_at: true
      }).parse(sessionData);

      const { data, error } = await this.supabase
        .from('user_sessions')
        .insert(validatedData)
        .select()
        .single();

      if (error) throw error;

      // Update last login time
      await this.supabase
        .from('user_profiles')
        .update({ last_login_at: new Date() })
        .eq('id', userId);

      return data as any;
    } catch (error) {
      console.error('Error creating user session:', error);
      throw new Error(`Failed to create user session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke user session
   */
  async revokeUserSession(sessionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          revoked_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error revoking user session:', error);
      throw new Error(`Failed to revoke user session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(session => session as any);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      throw new Error(`Failed to fetch active sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          updated_at: new Date()
        })
        .eq('is_active', true)
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw new Error(`Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance for use in API routes
export const createUserProfileService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new UserProfileService(supabaseUrl, supabaseKey);
};