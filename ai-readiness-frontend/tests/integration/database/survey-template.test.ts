/**
 * Integration Tests for Survey Template Database Service
 * 
 * These tests run against a real PostgreSQL database in Docker
 * to ensure our contracts match the actual database schema.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SurveyTemplateService } from '@/services/database/survey-template.service';
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
  QuestionType
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

describe('Survey Template Database Integration Tests', () => {
  let pool: Pool;
  let supabase: SupabaseClient;
  let surveyTemplateService: SurveyTemplateService;
  let testUserId: string;
  let testOrganizationId: string;
  let testTemplateId: string;

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

    // Initialize survey template service
    surveyTemplateService = new SurveyTemplateService(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Run migrations
    await runMigrations();

    // Create test user and organization
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
  // SURVEY TEMPLATE CRUD TESTS
  // ============================================================================

  describe('Survey Template CRUD Operations', () => {
    it('should create a survey template with valid data', async () => {
      const templateData: Partial<SurveyTemplate> = {
        name: 'Test Survey Template',
        title: 'Employee Satisfaction Survey',
        description: 'A comprehensive survey to measure employee satisfaction levels',
        organization_id: testOrganizationId,
        category: 'employee_satisfaction',
        status: 'draft',
        visibility: 'organization',
        is_featured: false,
        tags: ['hr', 'satisfaction', 'annual'],
        estimated_duration_minutes: 15,
        metadata: {
          industry: 'technology',
          department: 'human-resources',
          frequency: 'annual',
          language: 'en',
          compliance: ['gdpr']
        },
        settings: {
          allow_anonymous: false,
          require_authentication: true,
          collect_metadata: true,
          enable_branching: true,
          randomize_questions: false,
          allow_back_navigation: true,
          show_progress: true,
          enable_save_draft: true,
          notification_settings: {
            send_reminders: true,
            reminder_intervals: [7, 3, 1],
            completion_notification: true
          }
        }
      };

      const template = await surveyTemplateService.createTemplate(templateData, testUserId);

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe(templateData.name);
      expect(template.title).toBe(templateData.title);
      expect(template.description).toBe(templateData.description);
      expect(template.organization_id).toBe(testOrganizationId);
      expect(template.created_by).toBe(testUserId);
      expect(template.category).toBe('employee_satisfaction');
      expect(template.status).toBe('draft');
      expect(template.visibility).toBe('organization');
      expect(template.tags).toEqual(['hr', 'satisfaction', 'annual']);
      expect(template.usage_count).toBe(0);
      expect(template.average_rating).toBe(0);
      expect(template.created_at).toBeDefined();
      expect(template.updated_at).toBeDefined();
      expect(template.deleted_at).toBeNull();

      testTemplateId = template.id;
    });

    it('should fail to create template with invalid data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        category: 'invalid-category' as any, // Invalid enum value
        status: 'invalid-status' as any, // Invalid enum value
        visibility: 'invalid-visibility' as any // Invalid enum value
      };

      await expect(
        surveyTemplateService.createTemplate(invalidData, testUserId)
      ).rejects.toThrow();
    });

    it('should get survey template by ID', async () => {
      // First create a template
      const template = await surveyTemplateService.createTemplate(
        { 
          name: 'Get Test Template',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        },
        testUserId
      );

      const fetched = await surveyTemplateService.getTemplate(template.id);

      expect(fetched).toBeDefined();
      expect(fetched?.id).toBe(template.id);
      expect(fetched?.name).toBe('Get Test Template');
    });

    it('should get template with questions', async () => {
      // Create template
      const template = await surveyTemplateService.createTemplate(
        { 
          name: 'Template with Questions',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        },
        testUserId
      );

      // Add some questions
      await surveyTemplateService.addQuestion(template.id, {
        question_text: 'How satisfied are you?',
        question_type: 'rating_scale',
        is_required: true,
        order_index: 0,
        options: {
          scale: { min: 1, max: 5 },
          labels: { min: 'Very Unsatisfied', max: 'Very Satisfied' }
        }
      });

      const fetchedWithQuestions = await surveyTemplateService.getTemplate(template.id, true);

      expect(fetchedWithQuestions).toBeDefined();
      expect(fetchedWithQuestions?.questions).toBeDefined();
    });

    it('should return null for non-existent template', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const result = await surveyTemplateService.getTemplate(nonExistentId);

      expect(result).toBeNull();
    });

    it('should update survey template', async () => {
      // Create template first
      const template = await surveyTemplateService.createTemplate(
        { 
          name: 'Update Test Template',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        },
        testUserId
      );

      // Update it
      const updates = {
        name: 'Updated Template Name',
        description: 'Updated description',
        category: 'employee_feedback' as TemplateCategory,
        status: 'published' as TemplateStatus,
        tags: ['updated', 'test']
      };

      const updated = await surveyTemplateService.updateTemplate(template.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.description).toBe(updates.description);
      expect(updated.category).toBe(updates.category);
      expect(updated.status).toBe(updates.status);
      expect(updated.tags).toEqual(updates.tags);
      expect(updated.updated_at).not.toBe(template.updated_at);
    });

    it('should soft delete survey template', async () => {
      // Create template
      const template = await surveyTemplateService.createTemplate(
        { 
          name: 'Delete Test Template',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        },
        testUserId
      );

      // Delete it
      await surveyTemplateService.deleteTemplate(template.id);

      // Try to fetch - should return null
      const fetched = await surveyTemplateService.getTemplate(template.id);
      expect(fetched).toBeNull();

      // Verify it's soft deleted in database
      const { data } = await supabase
        .from('survey_templates')
        .select('deleted_at')
        .eq('id', template.id)
        .single();

      expect(data?.deleted_at).not.toBeNull();
    });

    it('should publish template', async () => {
      // Create draft template
      const template = await surveyTemplateService.createTemplate(
        { 
          name: 'Publish Test Template',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        },
        testUserId
      );

      // Publish it
      const published = await surveyTemplateService.publishTemplate(template.id);

      expect(published.status).toBe('published');
      expect(published.published_at).toBeDefined();
    });
  });

  // ============================================================================
  // TEMPLATE LISTING AND SEARCH TESTS
  // ============================================================================

  describe('Template Listing and Search', () => {
    let templates: SurveyTemplate[];

    beforeEach(async () => {
      // Create multiple test templates
      templates = await Promise.all([
        surveyTemplateService.createTemplate({
          name: 'Employee Satisfaction Survey',
          organization_id: testOrganizationId,
          category: 'employee_satisfaction',
          status: 'published',
          visibility: 'public',
          tags: ['hr', 'satisfaction']
        }, testUserId),
        surveyTemplateService.createTemplate({
          name: 'Customer Feedback Survey',
          organization_id: testOrganizationId,
          category: 'customer_feedback',
          status: 'published',
          visibility: 'organization',
          tags: ['customer', 'feedback']
        }, testUserId),
        surveyTemplateService.createTemplate({
          name: 'Draft Survey',
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private',
          tags: ['draft', 'test']
        }, testUserId)
      ]);
    });

    it('should list all templates', async () => {
      const { templates: listed, total } = await surveyTemplateService.listTemplates();

      expect(listed.length).toBeGreaterThanOrEqual(3);
      expect(total).toBeGreaterThanOrEqual(3);
      expect(listed.every(t => t.deleted_at === null)).toBe(true);
    });

    it('should filter templates by organization', async () => {
      const { templates: listed } = await surveyTemplateService.listTemplates({
        organizationId: testOrganizationId
      });

      expect(listed.length).toBeGreaterThanOrEqual(3);
      expect(listed.every(t => t.organization_id === testOrganizationId)).toBe(true);
    });

    it('should filter templates by category', async () => {
      const { templates: listed } = await surveyTemplateService.listTemplates({
        category: 'employee_satisfaction'
      });

      expect(listed.length).toBeGreaterThanOrEqual(1);
      expect(listed.every(t => t.category === 'employee_satisfaction')).toBe(true);
    });

    it('should filter templates by status', async () => {
      const { templates: published } = await surveyTemplateService.listTemplates({
        status: 'published'
      });

      const { templates: draft } = await surveyTemplateService.listTemplates({
        status: 'draft'
      });

      expect(published.every(t => t.status === 'published')).toBe(true);
      expect(draft.every(t => t.status === 'draft')).toBe(true);
    });

    it('should search templates by text', async () => {
      const results = await surveyTemplateService.searchTemplates('Employee');

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(t => t.name.includes('Employee'))).toBe(true);
    });

    it('should paginate results', async () => {
      const page1 = await surveyTemplateService.listTemplates({ limit: 2, offset: 0 });
      const page2 = await surveyTemplateService.listTemplates({ limit: 2, offset: 2 });

      expect(page1.templates.length).toBeLessThanOrEqual(2);
      expect(page2.templates.length).toBeLessThanOrEqual(2);
      
      // Should have different templates
      const page1Ids = page1.templates.map(t => t.id);
      const page2Ids = page2.templates.map(t => t.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  // ============================================================================
  // TEMPLATE QUESTIONS TESTS
  // ============================================================================

  describe('Template Questions Management', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await surveyTemplateService.createTemplate({
        name: 'Question Test Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'draft',
        visibility: 'private'
      }, testUserId);
      templateId = template.id;
    });

    it('should add question to template', async () => {
      const questionData: Partial<SurveyTemplateQuestion> = {
        question_text: 'How would you rate our service?',
        question_type: 'rating_scale',
        is_required: true,
        validation_rules: {
          required: true,
          custom_validation: null
        },
        options: {
          scale: { min: 1, max: 10 },
          labels: { min: 'Poor', max: 'Excellent' }
        },
        metadata: {
          analytics_enabled: true,
          show_in_summary: true
        }
      };

      const question = await surveyTemplateService.addQuestion(templateId, questionData);

      expect(question).toBeDefined();
      expect(question.id).toBeDefined();
      expect(question.template_id).toBe(templateId);
      expect(question.question_text).toBe(questionData.question_text);
      expect(question.question_type).toBe(questionData.question_type);
      expect(question.is_required).toBe(questionData.is_required);
      expect(question.order_index).toBe(0);
    });

    it('should add multiple questions in order', async () => {
      const questions = [
        { question_text: 'Question 1', question_type: 'text' as QuestionType },
        { question_text: 'Question 2', question_type: 'multiple_choice' as QuestionType },
        { question_text: 'Question 3', question_type: 'rating_scale' as QuestionType }
      ];

      const addedQuestions = [];
      for (const q of questions) {
        const added = await surveyTemplateService.addQuestion(templateId, q);
        addedQuestions.push(added);
      }

      expect(addedQuestions[0].order_index).toBe(0);
      expect(addedQuestions[1].order_index).toBe(1);
      expect(addedQuestions[2].order_index).toBe(2);
    });

    it('should update template question', async () => {
      // Add a question first
      const question = await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Original question',
        question_type: 'text',
        is_required: false
      });

      // Update it
      const updates = {
        question_text: 'Updated question text',
        is_required: true,
        validation_rules: {
          required: true,
          min_length: 10
        }
      };

      const updated = await surveyTemplateService.updateQuestion(question.id, updates);

      expect(updated.question_text).toBe(updates.question_text);
      expect(updated.is_required).toBe(updates.is_required);
      expect(updated.validation_rules).toEqual(updates.validation_rules);
    });

    it('should reorder questions', async () => {
      // Add multiple questions
      const q1 = await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Question 1', question_type: 'text'
      });
      const q2 = await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Question 2', question_type: 'text'
      });
      const q3 = await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Question 3', question_type: 'text'
      });

      // Reorder them: q3, q1, q2
      const reorderedQuestions = await surveyTemplateService.reorderQuestions(
        templateId,
        [q3.id, q1.id, q2.id]
      );

      expect(reorderedQuestions[0].id).toBe(q3.id);
      expect(reorderedQuestions[0].order_index).toBe(0);
      expect(reorderedQuestions[1].id).toBe(q1.id);
      expect(reorderedQuestions[1].order_index).toBe(1);
      expect(reorderedQuestions[2].id).toBe(q2.id);
      expect(reorderedQuestions[2].order_index).toBe(2);
    });

    it('should delete question', async () => {
      // Add a question
      const question = await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Question to delete',
        question_type: 'text'
      });

      // Delete it
      await surveyTemplateService.deleteQuestion(question.id);

      // Verify it's gone
      const questions = await surveyTemplateService.getTemplateQuestions(templateId);
      expect(questions.find(q => q.id === question.id)).toBeUndefined();
    });

    it('should get template questions in order', async () => {
      // Add multiple questions
      const questionTexts = ['First', 'Second', 'Third'];
      for (const text of questionTexts) {
        await surveyTemplateService.addQuestion(templateId, {
          question_text: text,
          question_type: 'text'
        });
      }

      const questions = await surveyTemplateService.getTemplateQuestions(templateId);

      expect(questions.length).toBe(3);
      expect(questions[0].question_text).toBe('First');
      expect(questions[1].question_text).toBe('Second');
      expect(questions[2].question_text).toBe('Third');
    });
  });

  // ============================================================================
  // TEMPLATE VERSIONS TESTS
  // ============================================================================

  describe('Template Versions Management', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await surveyTemplateService.createTemplate({
        name: 'Version Test Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'draft',
        visibility: 'private'
      }, testUserId);
      templateId = template.id;

      // Add some questions to have content to version
      await surveyTemplateService.addQuestion(templateId, {
        question_text: 'Test question',
        question_type: 'text'
      });
    });

    it('should create template version', async () => {
      const version = await surveyTemplateService.createVersion(
        templateId,
        'Initial version',
        testUserId
      );

      expect(version).toBeDefined();
      expect(version.id).toBeDefined();
      expect(version.template_id).toBe(templateId);
      expect(version.version_number).toBe(1);
      expect(version.version_notes).toBe('Initial version');
      expect(version.created_by).toBe(testUserId);
      expect(version.is_active).toBe(false);
      expect(version.snapshot).toBeDefined();
      expect(version.snapshot.template).toBeDefined();
      expect(version.snapshot.questions).toBeDefined();
    });

    it('should create multiple versions with incremental numbers', async () => {
      const v1 = await surveyTemplateService.createVersion(templateId, 'Version 1', testUserId);
      const v2 = await surveyTemplateService.createVersion(templateId, 'Version 2', testUserId);
      const v3 = await surveyTemplateService.createVersion(templateId, 'Version 3', testUserId);

      expect(v1.version_number).toBe(1);
      expect(v2.version_number).toBe(2);
      expect(v3.version_number).toBe(3);
    });

    it('should activate template version', async () => {
      const version = await surveyTemplateService.createVersion(
        templateId,
        'Test version',
        testUserId
      );

      const activated = await surveyTemplateService.activateVersion(version.id);

      expect(activated.is_active).toBe(true);
    });

    it('should deactivate other versions when activating one', async () => {
      const v1 = await surveyTemplateService.createVersion(templateId, 'V1', testUserId);
      const v2 = await surveyTemplateService.createVersion(templateId, 'V2', testUserId);

      // Activate v1
      await surveyTemplateService.activateVersion(v1.id);

      // Now activate v2
      await surveyTemplateService.activateVersion(v2.id);

      // Check that only v2 is active
      const versions = await surveyTemplateService.getTemplateVersions(templateId);
      const v1Updated = versions.find(v => v.id === v1.id);
      const v2Updated = versions.find(v => v.id === v2.id);

      expect(v1Updated?.is_active).toBe(false);
      expect(v2Updated?.is_active).toBe(true);
    });

    it('should list template versions', async () => {
      await surveyTemplateService.createVersion(templateId, 'V1', testUserId);
      await surveyTemplateService.createVersion(templateId, 'V2', testUserId);
      await surveyTemplateService.createVersion(templateId, 'V3', testUserId);

      const versions = await surveyTemplateService.getTemplateVersions(templateId);

      expect(versions.length).toBe(3);
      // Should be ordered by version number descending
      expect(versions[0].version_number).toBe(3);
      expect(versions[1].version_number).toBe(2);
      expect(versions[2].version_number).toBe(1);
    });
  });

  // ============================================================================
  // TEMPLATE SHARING TESTS
  // ============================================================================

  describe('Template Sharing Management', () => {
    let templateId: string;
    let shareUserId: string;
    let shareOrgId: string;

    beforeEach(async () => {
      const template = await surveyTemplateService.createTemplate({
        name: 'Share Test Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'private'
      }, testUserId);
      templateId = template.id;

      shareUserId = await createTestUser('share@test.com');
      shareOrgId = await createTestOrganization('Share Org');
    });

    it('should share template with user', async () => {
      const share = await surveyTemplateService.shareTemplate(
        templateId,
        'edit',
        testUserId,
        { sharedWithUser: shareUserId }
      );

      expect(share).toBeDefined();
      expect(share.template_id).toBe(templateId);
      expect(share.shared_with_user).toBe(shareUserId);
      expect(share.share_type).toBe('edit');
      expect(share.shared_by).toBe(testUserId);
      expect(share.is_active).toBe(true);
    });

    it('should share template with organization', async () => {
      const share = await surveyTemplateService.shareTemplate(
        templateId,
        'view',
        testUserId,
        { sharedWithOrg: shareOrgId }
      );

      expect(share.shared_with_org).toBe(shareOrgId);
      expect(share.share_type).toBe('view');
      expect(share.share_token).toBeDefined();
    });

    it('should share template with expiration', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const share = await surveyTemplateService.shareTemplate(
        templateId,
        'view',
        testUserId,
        { 
          sharedWithUser: shareUserId,
          expiresAt
        }
      );

      expect(share.expires_at).toBeDefined();
      expect(new Date(share.expires_at!).getTime()).toBeCloseTo(expiresAt.getTime(), -3);
    });

    it('should revoke template share', async () => {
      const share = await surveyTemplateService.shareTemplate(
        templateId,
        'view',
        testUserId,
        { sharedWithUser: shareUserId }
      );

      await surveyTemplateService.revokeShare(share.id);

      // Verify it's revoked
      const shares = await surveyTemplateService.getTemplateShares(templateId);
      expect(shares.find(s => s.id === share.id)).toBeUndefined();
    });

    it('should get template shares', async () => {
      await surveyTemplateService.shareTemplate(templateId, 'view', testUserId, { sharedWithUser: shareUserId });
      await surveyTemplateService.shareTemplate(templateId, 'edit', testUserId, { sharedWithOrg: shareOrgId });

      const shares = await surveyTemplateService.getTemplateShares(templateId);

      expect(shares.length).toBe(2);
      expect(shares.every(s => s.is_active)).toBe(true);
    });
  });

  // ============================================================================
  // TEMPLATE ANALYTICS TESTS
  // ============================================================================

  describe('Template Analytics Management', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await surveyTemplateService.createTemplate({
        name: 'Analytics Test Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'public'
      }, testUserId);
      templateId = template.id;
    });

    it('should track template usage', async () => {
      await surveyTemplateService.trackUsage(templateId, 'view');
      await surveyTemplateService.trackUsage(templateId, 'use');
      await surveyTemplateService.trackUsage(templateId, 'completion');

      // Analytics tracking shouldn't throw errors
      expect(true).toBe(true);
    });

    it('should get template analytics', async () => {
      // Track some usage
      await surveyTemplateService.trackUsage(templateId, 'view');
      await surveyTemplateService.trackUsage(templateId, 'use');

      // Wait a bit for data to be written
      await new Promise(resolve => setTimeout(resolve, 100));

      const analytics = await surveyTemplateService.getTemplateAnalytics(templateId);

      expect(Array.isArray(analytics)).toBe(true);
    });

    it('should update usage count when tracking uses', async () => {
      const initialTemplate = await surveyTemplateService.getTemplate(templateId);
      const initialUsageCount = initialTemplate!.usage_count;

      await surveyTemplateService.trackUsage(templateId, 'use');

      // Wait for database update
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedTemplate = await surveyTemplateService.getTemplate(templateId);
      expect(updatedTemplate!.usage_count).toBe(initialUsageCount + 1);
    });
  });

  // ============================================================================
  // TEMPLATE REVIEWS TESTS
  // ============================================================================

  describe('Template Reviews Management', () => {
    let templateId: string;
    let reviewerUserId: string;

    beforeEach(async () => {
      const template = await surveyTemplateService.createTemplate({
        name: 'Review Test Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'public'
      }, testUserId);
      templateId = template.id;

      reviewerUserId = await createTestUser('reviewer@test.com');
    });

    it('should add review to template', async () => {
      const review = await surveyTemplateService.addReview(
        templateId,
        reviewerUserId,
        5,
        'Excellent template!'
      );

      expect(review).toBeDefined();
      expect(review.template_id).toBe(templateId);
      expect(review.reviewer_id).toBe(reviewerUserId);
      expect(review.rating).toBe(5);
      expect(review.review_text).toBe('Excellent template!');
      expect(review.is_verified_purchase).toBe(false);
    });

    it('should update template review', async () => {
      const review = await surveyTemplateService.addReview(
        templateId,
        reviewerUserId,
        3,
        'Good template'
      );

      const updated = await surveyTemplateService.updateReview(review.id, {
        rating: 4,
        reviewText: 'Actually, great template!'
      });

      expect(updated.rating).toBe(4);
      expect(updated.review_text).toBe('Actually, great template!');
    });

    it('should get template reviews', async () => {
      const reviewer2 = await createTestUser('reviewer2@test.com');

      await surveyTemplateService.addReview(templateId, reviewerUserId, 5, 'Great!');
      await surveyTemplateService.addReview(templateId, reviewer2, 4, 'Good!');

      const { reviews, total } = await surveyTemplateService.getTemplateReviews(templateId);

      expect(reviews.length).toBe(2);
      expect(total).toBe(2);
      expect(reviews.every(r => r.template_id === templateId)).toBe(true);
    });

    it('should update template average rating after reviews', async () => {
      const reviewer2 = await createTestUser('reviewer2@test.com');
      const reviewer3 = await createTestUser('reviewer3@test.com');

      // Add multiple reviews
      await surveyTemplateService.addReview(templateId, reviewerUserId, 5);
      await surveyTemplateService.addReview(templateId, reviewer2, 3);
      await surveyTemplateService.addReview(templateId, reviewer3, 4);

      // Wait for rating update
      await new Promise(resolve => setTimeout(resolve, 100));

      const template = await surveyTemplateService.getTemplate(templateId);
      const expectedAverage = (5 + 3 + 4) / 3;
      
      expect(template!.average_rating).toBeCloseTo(expectedAverage, 2);
    });
  });

  // ============================================================================
  // ACCESS CONTROL TESTS
  // ============================================================================

  describe('Access Control', () => {
    let privateTemplate: SurveyTemplate;
    let organizationTemplate: SurveyTemplate;
    let publicTemplate: SurveyTemplate;
    let otherUserId: string;

    beforeEach(async () => {
      otherUserId = await createTestUser('other@test.com');

      privateTemplate = await surveyTemplateService.createTemplate({
        name: 'Private Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'private'
      }, testUserId);

      organizationTemplate = await surveyTemplateService.createTemplate({
        name: 'Organization Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'organization'
      }, testUserId);

      publicTemplate = await surveyTemplateService.createTemplate({
        name: 'Public Template',
        organization_id: testOrganizationId,
        category: 'custom',
        status: 'published',
        visibility: 'public'
      }, testUserId);
    });

    it('should allow owner to access all templates', async () => {
      const canAccessPrivate = await surveyTemplateService.canAccessTemplate(privateTemplate.id, testUserId);
      const canAccessOrg = await surveyTemplateService.canAccessTemplate(organizationTemplate.id, testUserId);
      const canAccessPublic = await surveyTemplateService.canAccessTemplate(publicTemplate.id, testUserId);

      expect(canAccessPrivate).toBe(true);
      expect(canAccessOrg).toBe(true);
      expect(canAccessPublic).toBe(true);
    });

    it('should allow anyone to access public templates', async () => {
      const canAccess = await surveyTemplateService.canAccessTemplate(publicTemplate.id, otherUserId);
      expect(canAccess).toBe(true);
    });

    it('should deny access to private templates for non-owners', async () => {
      const canAccess = await surveyTemplateService.canAccessTemplate(privateTemplate.id, otherUserId);
      expect(canAccess).toBe(false);
    });

    it('should allow access through sharing', async () => {
      // Share private template with other user
      await surveyTemplateService.shareTemplate(
        privateTemplate.id,
        'view',
        testUserId,
        { sharedWithUser: otherUserId }
      );

      const canAccess = await surveyTemplateService.canAccessTemplate(privateTemplate.id, otherUserId);
      expect(canAccess).toBe(true);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database failures
      // For now, we'll test that errors are properly wrapped
      await expect(
        surveyTemplateService.getTemplate('invalid-uuid-format')
      ).rejects.toThrow();
    });

    it('should validate contract compliance', async () => {
      // Test that invalid data is rejected by contracts
      const invalidData = {
        name: 'Test',
        category: 'invalid-category',
        status: 'invalid-status',
        visibility: 'invalid-visibility'
      } as any;

      await expect(
        surveyTemplateService.createTemplate(invalidData, testUserId)
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Create multiple templates
      const promises = Array.from({ length: 10 }, (_, i) =>
        surveyTemplateService.createTemplate({
          name: `Bulk Template ${i}`,
          organization_id: testOrganizationId,
          category: 'custom',
          status: 'draft',
          visibility: 'private'
        }, testUserId)
      );

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
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
      'template_reviews',
      'template_analytics',
      'template_shares',
      'survey_template_versions',
      'survey_template_questions',
      'survey_templates'
    ];

    for (const table of tables) {
      try {
        await pool.query(`DELETE FROM ${table} WHERE name LIKE '%Test%' OR name LIKE '%test%' OR title LIKE '%Test%' OR title LIKE '%test%'`);
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