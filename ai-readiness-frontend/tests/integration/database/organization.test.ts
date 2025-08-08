/**
 * Integration Tests for Organization Database Service
 * 
 * These tests run against a real PostgreSQL database in Docker
 * to ensure our contracts match the actual database schema.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrganizationService } from '@/services/database/organization.service';
import { 
  Organization,
  OrganizationMember,
  OrganizationInvitation
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

describe('Organization Database Integration Tests', () => {
  let pool: Pool;
  let supabase: SupabaseClient;
  let organizationService: OrganizationService;
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

    // Initialize organization service
    organizationService = new OrganizationService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Run migrations
    await runMigrations();

    // Create test user
    testUserId = await createTestUser();
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
  // ORGANIZATION CRUD TESTS
  // ============================================================================

  describe('Organization CRUD Operations', () => {
    it('should create an organization with valid data', async () => {
      const orgData: Partial<Organization> = {
        name: 'Test Organization',
        domain: 'testorg.com',
        description: 'A test organization',
        industry: 'technology',
        size: 'medium',
        website: 'https://testorg.com',
        settings: {
          allowSelfRegistration: false,
          requireEmailVerification: true,
          require2FA: false,
          enableSSO: false,
          ssoProvider: null,
          ssoConfig: null,
          dataRetentionDays: 365,
          allowExternalIntegrations: true,
          requireDataProcessingConsent: true,
          enableAuditLogs: true,
          defaultRole: 'user',
          customRoles: [],
          mcp: {
            enabled: true,
            autoAnalysis: false,
            analysisFrequency: 'daily',
            maxConcurrentAgents: 10
          }
        },
        deleted_at: null
      };

      const organization = await organizationService.createOrganization(orgData, testUserId);

      expect(organization).toBeDefined();
      expect(organization.id).toBeDefined();
      expect(organization.name).toBe(orgData.name);
      expect(organization.domain).toBe(orgData.domain);
      expect(organization.industry).toBe(orgData.industry);
      expect(organization.size).toBe(orgData.size);
      expect(organization.settings.enableAuditLogs).toBe(true);

      testOrganizationId = organization.id;

      // Verify owner was added
      const members = await organizationService.getMembers(organization.id);
      expect(members).toHaveLength(1);
      expect(members[0].user_id).toBe(testUserId);
      expect(members[0].role).toBe('owner');
    });

    it('should fail to create organization with invalid data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        domain: 'not-a-domain', // This might be valid depending on validation
        size: 'invalid-size' as any // Invalid enum value
      };

      await expect(
        organizationService.createOrganization(invalidData, testUserId)
      ).rejects.toThrow();
    });

    it('should get organization by ID', async () => {
      // First create an organization
      const org = await organizationService.createOrganization(
        { name: 'Get Test Org', deleted_at: null },
        testUserId
      );

      const fetched = await organizationService.getOrganization(org.id);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(org.id);
      expect(fetched?.name).toBe('Get Test Org');
    });

    it('should return null for non-existent organization', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const result = await organizationService.getOrganization(nonExistentId);

      expect(result).toBeNull();
    });

    it('should update organization', async () => {
      // Create organization first
      const org = await organizationService.createOrganization(
        { name: 'Update Test Org', deleted_at: null },
        testUserId
      );

      // Update it
      const updates = {
        name: 'Updated Org Name',
        description: 'Updated description',
        industry: 'healthcare' as const
      };

      const updated = await organizationService.updateOrganization(org.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.description).toBe(updates.description);
      expect(updated.industry).toBe(updates.industry);
      expect(updated.updated_at).not.toBe(org.updated_at);
    });

    it('should soft delete organization', async () => {
      // Create organization
      const org = await organizationService.createOrganization(
        { name: 'Delete Test Org', deleted_at: null },
        testUserId
      );

      // Delete it
      await organizationService.deleteOrganization(org.id);

      // Try to fetch - should return null
      const fetched = await organizationService.getOrganization(org.id);
      expect(fetched).toBeNull();

      // Verify it's soft deleted in database
      const { data } = await supabase
        .from('organizations')
        .select('deleted_at')
        .eq('id', org.id)
        .single();

      expect(data?.deleted_at).not.toBeNull();
    });
  });

  // ============================================================================
  // MEMBER MANAGEMENT TESTS
  // ============================================================================

  describe('Member Management', () => {
    let orgId: string;
    let secondUserId: string;

    beforeEach(async () => {
      // Create org and second user for member tests
      const org = await organizationService.createOrganization(
        { name: 'Member Test Org', deleted_at: null },
        testUserId
      );
      orgId = org.id;
      secondUserId = await createTestUser('user2@test.com');
    });

    it('should add member to organization', async () => {
      const member = await organizationService.addMember(
        orgId,
        secondUserId,
        'moderator',
        testUserId
      );

      expect(member).toBeDefined();
      expect(member.organization_id).toBe(orgId);
      expect(member.user_id).toBe(secondUserId);
      expect(member.role).toBe('moderator');
      expect(member.status).toBe('active');
    });

    it('should get organization members', async () => {
      // Add a member
      await organizationService.addMember(orgId, secondUserId, 'user');

      const members = await organizationService.getMembers(orgId);

      expect(members).toHaveLength(2); // Owner + new member
      expect(members.some(m => m.user_id === testUserId)).toBe(true);
      expect(members.some(m => m.user_id === secondUserId)).toBe(true);
    });

    it('should update member role', async () => {
      // Add member
      await organizationService.addMember(orgId, secondUserId, 'user');

      // Update role
      const updated = await organizationService.updateMemberRole(
        orgId,
        secondUserId,
        'admin'
      );

      expect(updated.role).toBe('admin');
    });

    it('should not allow changing owner role', async () => {
      await expect(
        organizationService.updateMemberRole(orgId, testUserId, 'admin')
      ).rejects.toThrow('Cannot change owner role');
    });

    it('should remove member from organization', async () => {
      // Add member
      await organizationService.addMember(orgId, secondUserId, 'user');

      // Remove member
      await organizationService.removeMember(orgId, secondUserId, testUserId);

      // Check they're removed
      const members = await organizationService.getMembers(orgId);
      expect(members.some(m => m.user_id === secondUserId)).toBe(false);
    });

    it('should not allow removing owner', async () => {
      await expect(
        organizationService.removeMember(orgId, testUserId, testUserId)
      ).rejects.toThrow('Cannot remove organization owner');
    });
  });

  // ============================================================================
  // INVITATION TESTS
  // ============================================================================

  describe('Invitation Management', () => {
    let orgId: string;

    beforeEach(async () => {
      const org = await organizationService.createOrganization(
        { name: 'Invitation Test Org', deleted_at: null },
        testUserId
      );
      orgId = org.id;
    });

    it('should create invitation', async () => {
      const invitation = await organizationService.createInvitation(
        orgId,
        'invitee@test.com',
        'user',
        testUserId,
        'Welcome to our organization!'
      );

      expect(invitation).toBeDefined();
      expect(invitation.organization_id).toBe(orgId);
      expect(invitation.email).toBe('invitee@test.com');
      expect(invitation.role).toBe('user');
      expect(invitation.status).toBe('pending');
      expect(invitation.token).toHaveLength(32);
      expect(invitation.metadata.message).toBe('Welcome to our organization!');
    });

    it('should accept invitation', async () => {
      // Create invitation
      const invitation = await organizationService.createInvitation(
        orgId,
        'accept@test.com',
        'moderator',
        testUserId
      );

      // Create user for the invitee
      const inviteeId = await createTestUser('accept@test.com');

      // Accept invitation
      const member = await organizationService.acceptInvitation(
        invitation.token,
        inviteeId
      );

      expect(member).toBeDefined();
      expect(member.organization_id).toBe(orgId);
      expect(member.user_id).toBe(inviteeId);
      expect(member.role).toBe('moderator');
      expect(member.status).toBe('active');

      // Verify invitation status updated
      const { data } = await supabase
        .from('organization_invitations')
        .select('status, accepted_at')
        .eq('id', invitation.id)
        .single();

      expect(data?.status).toBe('accepted');
      expect(data?.accepted_at).not.toBeNull();
    });

    it('should get pending invitations', async () => {
      // Create multiple invitations
      await organizationService.createInvitation(orgId, 'user1@test.com', 'user', testUserId);
      await organizationService.createInvitation(orgId, 'user2@test.com', 'admin', testUserId);

      const invitations = await organizationService.getPendingInvitations(orgId);

      expect(invitations).toHaveLength(2);
      expect(invitations.every(i => i.status === 'pending')).toBe(true);
    });

    it('should not accept expired invitation', async () => {
      // Create invitation
      const invitation = await organizationService.createInvitation(
        orgId,
        'expired@test.com',
        'user',
        testUserId
      );

      // Manually expire it
      await supabase
        .from('organization_invitations')
        .update({ expires_at: new Date('2020-01-01') })
        .eq('id', invitation.id);

      const inviteeId = await createTestUser('expired@test.com');

      await expect(
        organizationService.acceptInvitation(invitation.token, inviteeId)
      ).rejects.toThrow('Invitation has expired');
    });
  });

  // ============================================================================
  // PERMISSION AND ACCESS TESTS
  // ============================================================================

  describe('Permissions and Access', () => {
    let orgId: string;
    let memberId: string;

    beforeEach(async () => {
      const org = await organizationService.createOrganization(
        { name: 'Permission Test Org', deleted_at: null },
        testUserId
      );
      orgId = org.id;
      memberId = await createTestUser('member@test.com');
    });

    it('should check if user is member', async () => {
      // Owner should be member
      let isMember = await organizationService.isMember(orgId, testUserId);
      expect(isMember).toBe(true);

      // Non-member should not be member
      isMember = await organizationService.isMember(orgId, memberId);
      expect(isMember).toBe(false);

      // Add as member
      await organizationService.addMember(orgId, memberId, 'user');

      // Now should be member
      isMember = await organizationService.isMember(orgId, memberId);
      expect(isMember).toBe(true);
    });

    it('should get user role in organization', async () => {
      // Owner role
      let role = await organizationService.getUserRole(orgId, testUserId);
      expect(role).toBe('owner');

      // Non-member has no role
      role = await organizationService.getUserRole(orgId, memberId);
      expect(role).toBeNull();

      // Add as admin
      await organizationService.addMember(orgId, memberId, 'admin');

      // Should have admin role
      role = await organizationService.getUserRole(orgId, memberId);
      expect(role).toBe('admin');
    });

    it('should get user organizations', async () => {
      // Create multiple orgs
      const org2 = await organizationService.createOrganization(
        { name: 'Second Org', deleted_at: null },
        testUserId
      );

      const orgs = await organizationService.getUserOrganizations(testUserId);

      expect(orgs.length).toBeGreaterThanOrEqual(2);
      expect(orgs.some(o => o.id === orgId)).toBe(true);
      expect(orgs.some(o => o.id === org2.id)).toBe(true);
    });
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  async function runMigrations() {
    try {
      // Run all SQL migrations
      const migrationFiles = [
        'test-infrastructure/init-scripts/00-supabase-auth-schema.sql',
        'supabase/migrations/00_initial_setup.sql',
        'supabase/migrations/20240101000005_onboarding_tables.sql',
        'supabase/migrations/20241207_organization_settings.sql'
      ];

      for (const file of migrationFiles) {
        const sql = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
        await pool.query(sql);
      }
    } catch (error) {
      console.error('Migration error:', error);
      // Continue - migrations might already be applied
    }
  }

  async function createTestUser(email: string = 'test@example.com'): Promise<string> {
    // In a real Supabase environment, we'd use auth.admin.createUser
    // For testing, we'll insert directly into auth.users
    const { rows } = await pool.query(
      `INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, NOW(), NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [email]
    );
    return rows[0].id;
  }

  async function cleanTestData() {
    // Clean in reverse order of foreign key dependencies
    const tables = [
      'organization_invitations',
      'organization_api_keys',
      'department_members',
      'organization_departments',
      'organization_billing',
      'organization_members',
      'organizations'
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table} WHERE name LIKE '%Test%' OR name LIKE '%test%'`);
      } catch {
        // Table might not exist
      }
    }
  }
});

// For running tests with Jest
import * as fs from 'fs/promises';
import * as path from 'path';

export default {};