/**
 * Integration Tests for User Profile Database Service
 * 
 * These tests run against a real PostgreSQL database in Docker
 * to ensure our contracts match the actual database schema.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfileService } from '@/services/database/user-profile.service';
import {
  UserProfile,
  OnboardingProgress,
  ProfileMetadata,
  UserSession,
  OnboardingStep,
  UserRole,
  getNextOnboardingStep,
  isOnboardingComplete
} from '@/contracts/schema';
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433'),
  database: process.env.TEST_DB_NAME || 'test_ai_readiness',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'testpass123'
};

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
const SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key';

describe('User Profile Database Integration Tests', () => {
  let pool: Pool;
  let supabase: SupabaseClient;
  let userProfileService: UserProfileService;
  let testUserId: string;
  let testOrganizationId: string;

  // ============================================================================
  // TEST SETUP
  // ============================================================================

  beforeAll(async () => {
    // Start Docker PostgreSQL if not running
    try {
      await execAsync('docker-compose -f test-infrastructure/docker-compose.yml up -d');
      
      // Wait for database to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.log('Docker compose already running or failed to start:', error);
    }

    // Connect to test database
    pool = new Pool(TEST_DB_CONFIG);

    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Initialize user profile service
    userProfileService = new UserProfileService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Run migrations
    await runMigrations();

    // Create test resources
    testUserId = await createTestUser();
    testOrganizationId = await createTestOrganization();
  }, 30000);

  afterAll(async () => {
    // Clean up
    await pool.end();
    
    // Optionally stop Docker
    if (process.env.STOP_DOCKER_AFTER_TEST === 'true') {
      await execAsync('docker-compose -f test-infrastructure/docker-compose.yml down');
    }
  });

  beforeEach(async () => {
    // Clean test data before each test
    await cleanTestData();
  });

  afterEach(async () => {
    // Additional cleanup if needed
  });

  // ============================================================================
  // USER PROFILE CRUD TESTS
  // ============================================================================

  describe('User Profile CRUD Operations', () => {
    it('should create user profile with valid data', async () => {
      const profileData: Partial<UserProfile> = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        role: 'user',
        organization_id: testOrganizationId,
        department: 'Engineering',
        job_title: 'Software Engineer',
        phone_number: '+1-555-0123',
        timezone: 'America/New_York',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Experienced software engineer with a passion for AI and machine learning.',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: {
            email: true,
            push: false,
            sms: false
          },
          dashboard: {
            default_view: 'overview',
            show_welcome: true
          },
          privacy: {
            profile_visibility: 'organization',
            show_activity: true
          }
        },
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'AI/ML'],
        certifications: [
          {
            name: 'AWS Certified Solutions Architect',
            issuer: 'Amazon Web Services',
            date: '2023-06-15',
            url: 'https://aws.amazon.com/certification/'
          }
        ],
        is_active: true
      };

      const profile = await userProfileService.upsertUserProfile(testUserId, profileData);

      expect(profile).toBeDefined();
      expect(profile.id).toBe(testUserId);
      expect(profile.first_name).toBe(profileData.first_name);
      expect(profile.last_name).toBe(profileData.last_name);
      expect(profile.email).toBe(profileData.email);
      expect(profile.role).toBe(profileData.role);
      expect(profile.organization_id).toBe(testOrganizationId);
      expect(profile.department).toBe(profileData.department);
      expect(profile.job_title).toBe(profileData.job_title);
      expect(profile.phone_number).toBe(profileData.phone_number);
      expect(profile.timezone).toBe(profileData.timezone);
      expect(profile.avatar_url).toBe(profileData.avatar_url);
      expect(profile.bio).toBe(profileData.bio);
      expect(profile.linkedin_url).toBe(profileData.linkedin_url);
      expect(profile.preferences).toEqual(profileData.preferences);
      expect(profile.skills).toEqual(profileData.skills);
      expect(profile.certifications).toEqual(profileData.certifications);
      expect(profile.is_active).toBe(true);
      expect(profile.created_at).toBeDefined();
      expect(profile.updated_at).toBeDefined();
      expect(profile.deleted_at).toBeNull();
    });

    it('should update existing user profile', async () => {
      // First create a profile
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        role: 'user'
      });

      // Then update it
      const updates = {
        first_name: 'Jane',
        job_title: 'Senior Engineer',
        department: 'Product',
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: {
            email: false,
            push: true,
            sms: false
          }
        }
      };

      const updated = await userProfileService.upsertUserProfile(testUserId, updates);

      expect(updated.first_name).toBe('Jane');
      expect(updated.last_name).toBe('Doe'); // Should remain unchanged
      expect(updated.job_title).toBe('Senior Engineer');
      expect(updated.department).toBe('Product');
      expect(updated.preferences.theme).toBe('dark');
      expect(updated.preferences.notifications.push).toBe(true);
    });

    it('should get user profile by ID', async () => {
      // Create a profile first
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'admin'
      });

      const profile = await userProfileService.getUserProfile(testUserId);

      expect(profile).toBeDefined();
      expect(profile?.id).toBe(testUserId);
      expect(profile?.first_name).toBe('Test');
      expect(profile?.last_name).toBe('User');
      expect(profile?.role).toBe('admin');
    });

    it('should return null for non-existent profile', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const result = await userProfileService.getUserProfile(nonExistentId);

      expect(result).toBeNull();
    });

    it('should get organization profiles', async () => {
      // Create multiple profiles for the same organization
      const user1 = await createTestUser('user1@example.com');
      const user2 = await createTestUser('user2@example.com');
      const user3 = await createTestUser('user3@example.com');

      await userProfileService.upsertUserProfile(user1, {
        first_name: 'User',
        last_name: 'One',
        email: 'user1@example.com',
        role: 'user',
        organization_id: testOrganizationId,
        is_active: true
      });

      await userProfileService.upsertUserProfile(user2, {
        first_name: 'User',
        last_name: 'Two',
        email: 'user2@example.com',
        role: 'moderator',
        organization_id: testOrganizationId,
        is_active: true
      });

      await userProfileService.upsertUserProfile(user3, {
        first_name: 'User',
        last_name: 'Three',
        email: 'user3@example.com',
        role: 'admin',
        organization_id: testOrganizationId,
        is_active: false // Inactive user
      });

      const profiles = await userProfileService.getOrganizationProfiles(testOrganizationId);

      expect(profiles.length).toBe(2); // Only active users
      expect(profiles.every(p => p.organization_id === testOrganizationId)).toBe(true);
      expect(profiles.every(p => p.is_active)).toBe(true);
    });

    it('should update user role', async () => {
      // Create user with basic role
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user'
      });

      // Update role
      const updated = await userProfileService.updateUserRole(testUserId, 'admin');

      expect(updated.role).toBe('admin');
      expect(updated.updated_at).toBeDefined();
    });

    it('should deactivate user profile', async () => {
      // Create active profile
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user',
        is_active: true
      });

      // Deactivate
      await userProfileService.deactivateUserProfile(testUserId);

      // Verify it's deactivated
      const profile = await userProfileService.getUserProfile(testUserId);
      expect(profile).toBeNull(); // Should return null due to deleted_at filter

      // Check in database directly
      const { data } = await supabase
        .from('user_profiles')
        .select('is_active, deleted_at')
        .eq('id', testUserId)
        .single();

      expect(data?.is_active).toBe(false);
      expect(data?.deleted_at).not.toBeNull();
    });
  });

  // ============================================================================
  // ONBOARDING PROGRESS TESTS
  // ============================================================================

  describe('Onboarding Progress Management', () => {
    it('should create onboarding progress for new user', async () => {
      const progress = await userProfileService.getOnboardingProgress(testUserId);

      expect(progress).toBeDefined();
      expect(progress?.user_id).toBe(testUserId);
      expect(progress?.current_step).toBe('welcome');
      expect(progress?.completed_steps).toEqual([]);
      expect(progress?.metadata).toBeDefined();
      expect(progress?.metadata.organization_created).toBe(false);
      expect(progress?.metadata.profile_completed).toBe(false);
      expect(progress?.metadata.team_invited).toBe(false);
      expect(progress?.metadata.survey_created).toBe(false);
      expect(progress?.started_at).toBeDefined();
      expect(progress?.completed_at).toBeNull();
    });

    it('should update onboarding progress', async () => {
      // Get initial progress
      const initial = await userProfileService.getOnboardingProgress(testUserId);
      expect(initial?.current_step).toBe('welcome');

      // Update to next step
      const updated = await userProfileService.updateOnboardingProgress(
        testUserId,
        'profile_setup',
        { profile_completed: true }
      );

      expect(updated.current_step).toBe('profile_setup');
      expect(updated.completed_steps).toContain('welcome');
      expect(updated.metadata.profile_completed).toBe(true);
      expect(updated.updated_at).toBeDefined();
    });

    it('should complete onboarding', async () => {
      const completed = await userProfileService.completeOnboarding(testUserId);

      expect(completed.current_step).toBe('completed');
      expect(completed.completed_at).toBeDefined();
      expect(completed.metadata.organization_created).toBe(true);
      expect(completed.metadata.profile_completed).toBe(true);
      expect(completed.metadata.team_invited).toBe(true);
      expect(completed.metadata.survey_created).toBe(true);
    });

    it('should skip onboarding step', async () => {
      // Get initial progress
      await userProfileService.getOnboardingProgress(testUserId);

      // Skip the team invitation step
      const skipped = await userProfileService.skipOnboardingStep(testUserId, 'team_invitation');

      expect(skipped.metadata.skipped_steps).toContain('team_invitation');
      
      // Should advance to next step
      const nextStep = getNextOnboardingStep('team_invitation');
      expect(skipped.current_step).toBe(nextStep || 'completed');
    });

    it('should handle onboarding step progression', async () => {
      // Test the step progression logic
      expect(getNextOnboardingStep('welcome')).toBe('profile_setup');
      expect(getNextOnboardingStep('profile_setup')).toBe('organization_setup');
      expect(getNextOnboardingStep('organization_setup')).toBe('team_invitation');
      expect(getNextOnboardingStep('team_invitation')).toBe('first_survey');
      expect(getNextOnboardingStep('first_survey')).toBe('completed');
      expect(getNextOnboardingStep('completed')).toBeNull();
    });

    it('should check if onboarding is complete', async () => {
      // Initial state - not complete
      const initialProgress = await userProfileService.getOnboardingProgress(testUserId);
      expect(isOnboardingComplete(initialProgress!)).toBe(false);

      // Complete onboarding
      const completedProgress = await userProfileService.completeOnboarding(testUserId);
      expect(isOnboardingComplete(completedProgress)).toBe(true);
    });
  });

  // ============================================================================
  // PROFILE METADATA TESTS
  // ============================================================================

  describe('Profile Metadata Management', () => {
    let profileId: string;

    beforeEach(async () => {
      // Create a profile for metadata tests
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user'
      });
      profileId = testUserId;
    });

    it('should set profile metadata', async () => {
      const metadata = await userProfileService.setProfileMetadata(
        profileId,
        'last_survey_completion',
        { survey_id: 'survey-123', completed_at: new Date().toISOString() },
        false
      );

      expect(metadata).toBeDefined();
      expect(metadata.profile_id).toBe(profileId);
      expect(metadata.key).toBe('last_survey_completion');
      expect(metadata.value).toBeDefined();
      expect(metadata.is_public).toBe(false);
    });

    it('should get profile metadata by key', async () => {
      // Set multiple metadata items
      await userProfileService.setProfileMetadata(profileId, 'theme', 'dark');
      await userProfileService.setProfileMetadata(profileId, 'language', 'en');
      await userProfileService.setProfileMetadata(profileId, 'notifications', { email: true });

      // Get specific key
      const themeMetadata = await userProfileService.getProfileMetadata(profileId, 'theme');
      expect(themeMetadata.length).toBe(1);
      expect(themeMetadata[0].key).toBe('theme');
      expect(themeMetadata[0].value).toBe('dark');
    });

    it('should get all profile metadata', async () => {
      // Set multiple metadata items
      await userProfileService.setProfileMetadata(profileId, 'setting1', 'value1');
      await userProfileService.setProfileMetadata(profileId, 'setting2', 'value2');
      await userProfileService.setProfileMetadata(profileId, 'setting3', 'value3');

      // Get all metadata
      const allMetadata = await userProfileService.getProfileMetadata(profileId);
      expect(allMetadata.length).toBeGreaterThanOrEqual(3);
      expect(allMetadata.every(m => m.profile_id === profileId)).toBe(true);
    });

    it('should update metadata with upsert', async () => {
      // Set initial value
      await userProfileService.setProfileMetadata(profileId, 'counter', 1);

      // Update with new value
      const updated = await userProfileService.setProfileMetadata(profileId, 'counter', 5);

      expect(updated.value).toBe(5);

      // Verify only one record exists
      const counterMetadata = await userProfileService.getProfileMetadata(profileId, 'counter');
      expect(counterMetadata.length).toBe(1);
      expect(counterMetadata[0].value).toBe(5);
    });

    it('should handle public and private metadata', async () => {
      await userProfileService.setProfileMetadata(profileId, 'public_info', 'visible', true);
      await userProfileService.setProfileMetadata(profileId, 'private_info', 'hidden', false);

      const publicMetadata = await userProfileService.getProfileMetadata(profileId, 'public_info');
      const privateMetadata = await userProfileService.getProfileMetadata(profileId, 'private_info');

      expect(publicMetadata[0].is_public).toBe(true);
      expect(privateMetadata[0].is_public).toBe(false);
    });
  });

  // ============================================================================
  // USER SESSION TESTS
  // ============================================================================

  describe('User Session Management', () => {
    let profileId: string;

    beforeEach(async () => {
      // Create a profile for session tests
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user'
      });
      profileId = testUserId;
    });

    it('should create user session', async () => {
      const tokenHash = 'hashed-token-123';
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const sessionMetadata = {
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0 Test Browser',
        device_type: 'desktop' as const,
        location: {
          country: 'US',
          city: 'New York'
        }
      };

      const session = await userProfileService.createUserSession(
        profileId,
        tokenHash,
        expiresAt,
        sessionMetadata
      );

      expect(session).toBeDefined();
      expect(session.user_id).toBe(profileId);
      expect(session.token_hash).toBe(tokenHash);
      expect(session.expires_at).toBeDefined();
      expect(session.metadata).toEqual(sessionMetadata);
      expect(session.is_active).toBe(true);
      expect(session.revoked_at).toBeNull();

      // Verify last login was updated
      const profile = await userProfileService.getUserProfile(profileId);
      expect(profile?.last_login_at).toBeDefined();
    });

    it('should get active sessions for user', async () => {
      const now = new Date();
      const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const pastExpiry = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      // Create active session
      await userProfileService.createUserSession(
        profileId,
        'active-token-hash',
        futureExpiry,
        { ip_address: '192.168.1.1', user_agent: 'Test', device_type: 'desktop' }
      );

      // Create expired session
      await userProfileService.createUserSession(
        profileId,
        'expired-token-hash',
        pastExpiry,
        { ip_address: '192.168.1.2', user_agent: 'Test', device_type: 'mobile' }
      );

      const activeSessions = await userProfileService.getActiveSessions(profileId);

      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].token_hash).toBe('active-token-hash');
      expect(activeSessions[0].is_active).toBe(true);
    });

    it('should revoke user session', async () => {
      // Create session
      const session = await userProfileService.createUserSession(
        profileId,
        'revoke-test-token',
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        { ip_address: '192.168.1.1', user_agent: 'Test', device_type: 'desktop' }
      );

      // Revoke it
      await userProfileService.revokeUserSession(session.id);

      // Verify it's revoked
      const activeSessions = await userProfileService.getActiveSessions(profileId);
      expect(activeSessions.find(s => s.id === session.id)).toBeUndefined();

      // Check in database
      const { data } = await supabase
        .from('user_sessions')
        .select('is_active, revoked_at')
        .eq('id', session.id)
        .single();

      expect(data?.is_active).toBe(false);
      expect(data?.revoked_at).not.toBeNull();
    });

    it('should cleanup expired sessions', async () => {
      const pastExpiry = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      // Create multiple expired sessions
      await userProfileService.createUserSession(
        profileId,
        'expired-1',
        pastExpiry,
        { ip_address: '192.168.1.1', user_agent: 'Test', device_type: 'desktop' }
      );
      await userProfileService.createUserSession(
        profileId,
        'expired-2',
        pastExpiry,
        { ip_address: '192.168.1.2', user_agent: 'Test', device_type: 'mobile' }
      );

      // Cleanup expired sessions
      const cleanedCount = await userProfileService.cleanupExpiredSessions();

      expect(cleanedCount).toBeGreaterThanOrEqual(2);

      // Verify they're inactive
      const activeSessions = await userProfileService.getActiveSessions(profileId);
      expect(activeSessions.find(s => s.token_hash.startsWith('expired-'))).toBeUndefined();
    });
  });

  // ============================================================================
  // VALIDATION AND CONTRACT TESTS
  // ============================================================================

  describe('Validation and Contract Compliance', () => {
    it('should validate user profile data against contract', async () => {
      const validData: Partial<UserProfile> = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'user',
        timezone: 'America/New_York'
      };

      // Should not throw
      await expect(
        userProfileService.upsertUserProfile(testUserId, validData)
      ).resolves.toBeDefined();
    });

    it('should reject invalid role values', async () => {
      const invalidData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'invalid-role' as UserRole
      };

      await expect(
        userProfileService.upsertUserProfile(testUserId, invalidData)
      ).rejects.toThrow();
    });

    it('should validate onboarding step enum values', async () => {
      // Valid steps should work
      const validSteps: OnboardingStep[] = [
        'welcome',
        'profile_setup',
        'organization_setup',
        'team_invitation',
        'first_survey',
        'completed'
      ];

      for (const step of validSteps) {
        await expect(
          userProfileService.updateOnboardingProgress(testUserId, step)
        ).resolves.toBeDefined();
      }
    });

    it('should validate session metadata structure', async () => {
      const validMetadata = {
        ip_address: '192.168.1.1',
        user_agent: 'Test Browser',
        device_type: 'desktop' as const,
        location: {
          country: 'US',
          city: 'New York'
        }
      };

      await expect(
        userProfileService.createUserSession(
          testUserId,
          'test-token',
          new Date(Date.now() + 24 * 60 * 60 * 1000),
          validMetadata
        )
      ).resolves.toBeDefined();
    });
  });

  // ============================================================================
  // RELATIONSHIP AND FOREIGN KEY TESTS
  // ============================================================================

  describe('Relationships and Foreign Keys', () => {
    it('should handle user profile with organization relationship', async () => {
      const profile = await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user',
        organization_id: testOrganizationId
      });

      expect(profile.organization_id).toBe(testOrganizationId);

      // Verify the relationship exists in database
      const { data } = await supabase
        .from('user_profiles')
        .select(`
          *,
          organization:organizations(id, name)
        `)
        .eq('id', testUserId)
        .single();

      expect(data?.organization).toBeDefined();
      expect(data?.organization.id).toBe(testOrganizationId);
    });

    it('should handle cascading operations properly', async () => {
      // Create profile with organization
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user',
        organization_id: testOrganizationId
      });

      // Create onboarding progress
      await userProfileService.getOnboardingProgress(testUserId);

      // Create metadata
      await userProfileService.setProfileMetadata(testUserId, 'test', 'value');

      // Deactivate profile
      await userProfileService.deactivateUserProfile(testUserId);

      // Verify related data is handled correctly
      const progress = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(progress.data).toBeDefined(); // Should still exist

      const metadata = await supabase
        .from('profile_metadata')
        .select('*')
        .eq('profile_id', testUserId);

      expect(metadata.data?.length).toBeGreaterThanOrEqual(1); // Should still exist
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test invalid user ID format
      await expect(
        userProfileService.getUserProfile('invalid-uuid-format')
      ).rejects.toThrow();
    });

    it('should handle concurrent session creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        userProfileService.createUserSession(
          testUserId,
          `concurrent-token-${i}`,
          new Date(Date.now() + 24 * 60 * 60 * 1000),
          { ip_address: `192.168.1.${i}`, user_agent: 'Test', device_type: 'desktop' }
        )
      );

      // Should all succeed
      const sessions = await Promise.all(promises);
      expect(sessions.length).toBe(5);
      expect(sessions.every(s => s.is_active)).toBe(true);
    });

    it('should handle metadata with complex data types', async () => {
      await userProfileService.upsertUserProfile(testUserId, {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        role: 'user'
      });

      const complexValue = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
          boolean: true,
          null: null
        }
      };

      const metadata = await userProfileService.setProfileMetadata(
        testUserId,
        'complex_data',
        complexValue
      );

      expect(metadata.value).toEqual(complexValue);
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {
    it('should handle bulk profile operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple profiles
      const users = await Promise.all(
        Array.from({ length: 20 }, (_, i) => createTestUser(`bulk-user-${i}@example.com`))
      );

      const profilePromises = users.map(userId =>
        userProfileService.upsertUserProfile(userId, {
          first_name: 'Bulk',
          last_name: `User ${userId}`,
          email: `bulk-user-${userId}@example.com`,
          role: 'user',
          organization_id: testOrganizationId
        })
      );

      await Promise.all(profilePromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle session cleanup efficiently', async () => {
      // Create many expired sessions
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sessionPromises = Array.from({ length: 100 }, (_, i) =>
        userProfileService.createUserSession(
          testUserId,
          `bulk-session-${i}`,
          expiredDate,
          { ip_address: `192.168.1.${i % 255}`, user_agent: 'Test', device_type: 'desktop' }
        )
      );

      await Promise.all(sessionPromises);

      const startTime = Date.now();
      const cleanedCount = await userProfileService.cleanupExpiredSessions();
      const endTime = Date.now();

      expect(cleanedCount).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function runMigrations() {
    try {
      const migrationFiles = [
        'test-infrastructure/init-scripts/00-supabase-auth-schema.sql',
        'supabase/migrations/00_initial_setup.sql',
        'supabase/migrations/20240101000005_onboarding_tables.sql',
        'supabase/migrations/20241207_organization_settings.sql'
      ];

      for (const file of migrationFiles) {
        try {
          const sql = await import('fs/promises').then(fs => 
            fs.readFile(require('path').join(process.cwd(), file), 'utf-8')
          );
          await pool.query(sql);
        } catch (error) {
          console.log(`Migration file ${file} not found or already applied:`, error);
        }
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  async function createTestUser(email: string = 'test@example.com'): Promise<string> {
    const { rows } = await pool.query(
      `INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [email]
    );
    return rows[0].id;
  }

  async function createTestOrganization(name: string = 'Test Organization'): Promise<string> {
    const { rows } = await pool.query(
      `INSERT INTO organizations (id, name, created_at, updated_at, created_by)
       VALUES (gen_random_uuid(), $1, NOW(), NOW(), $2)
       RETURNING id`,
      [name, testUserId]
    );
    return rows[0].id;
  }

  async function cleanTestData() {
    const tables = [
      'user_sessions',
      'profile_metadata',
      'onboarding_progress',
      'user_profiles'
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table} WHERE email LIKE '%test%' OR email LIKE '%bulk%'`);
      } catch (error) {
        // Table might not exist or column name might be different
        try {
          await pool.query(`DELETE FROM ${table}`);
        } catch {
          // Ignore if table doesn't exist
        }
      }
    }
  }
});

export default {};