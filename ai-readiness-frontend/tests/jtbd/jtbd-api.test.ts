/**
 * JTBD API ENDPOINT TESTS (TDD RED PHASE)
 * 
 * Tests for Jobs-to-be-Done API endpoints and HTTP layer.
 * These tests will FAIL initially until API implementation is complete.
 * 
 * RUN: npm run test:jtbd-api
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// API and HTTP types (will fail until implemented)
import {
  JTBDAnalysisAPI,
  JTBDConfigurationAPI,
  JTBDQuestionMappingAPI,
  JTBDCacheAPI,
  JTBDMetricsAPI
} from '../../src/api/jtbd-api';

// Express app and middleware (will fail until implemented)
import { createJTBDApp } from '../../src/app';
import { JTBDAuthMiddleware } from '../../src/middleware/jtbd-auth';
import { JTBDValidationMiddleware } from '../../src/middleware/jtbd-validation';
import { JTBDRateLimitMiddleware } from '../../src/middleware/jtbd-rate-limit';

// JTBD Types
import {
  JTBDAnalysisRequest,
  JTBDAnalysisResult,
  JTBDForceDistribution,
  JTBDQuestionForceMapping,
  JTBDAnalysisOptions,
  JTBDApiError,
  JTBDApiResponse,
  JTBDMetrics
} from '../../src/types/jtbd-schema';

// Mock data
import { Response, Question, Survey, User } from '../../contracts/api';

// ============================================================================
// TEST SETUP AND MOCKS (TDD - These will fail until types exist)
// ============================================================================

let app: any;
let server: any;

const createMockUser = (): User => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isActive: true,
  lastLoginAt: null,
  preferences: {
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false,
      frequency: 'daily'
    },
    privacy: {
      profileVisibility: 'private',
      dataSharing: false,
      analytics: true
    }
  }
});

const createMockJTBDApiRequest = (): JTBDAnalysisRequest => ({
  surveyId: '423e4567-e89b-12d3-a456-426614174000',
  responses: [
    {
      id: '1',
      sessionId: 'session-1',
      questionId: 'q1-demographic',
      value: 'Age: 25-34, Role: Manager',
      answeredAt: new Date('2024-01-01'),
      timeSpent: 15
    },
    {
      id: '2',
      sessionId: 'session-1',
      questionId: 'q2-pain',
      value: 'Current system is slow and unreliable, causing frequent downtime',
      answeredAt: new Date('2024-01-01'),
      timeSpent: 60
    },
    {
      id: '3',
      sessionId: 'session-1',
      questionId: 'q3-pull',
      value: 'Need faster performance, better reliability, and modern UI',
      answeredAt: new Date('2024-01-01'),
      timeSpent: 45
    },
    {
      id: '4',
      sessionId: 'session-2',
      questionId: 'q4-anchors',
      value: 'Already invested $100K, team trained on current system',
      answeredAt: new Date('2024-01-01'),
      timeSpent: 30
    },
    {
      id: '5',
      sessionId: 'session-2',
      questionId: 'q5-anxiety',
      value: 'Concerned about migration complexity and potential data loss',
      answeredAt: new Date('2024-01-01'),
      timeSpent: 35
    }
  ],
  questionMappings: [
    {
      questionId: 'q1-demographic',
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      force: 'demographic',
      weight: 1.0,
      confidence: 0.9,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      questionId: 'q2-pain',
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      force: 'pain_of_old',
      weight: 1.5,
      confidence: 0.95,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      questionId: 'q3-pull',
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      force: 'pull_of_new',
      weight: 1.3,
      confidence: 0.9,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      questionId: 'q4-anchors',
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      force: 'anchors_to_old',
      weight: 1.2,
      confidence: 0.88,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      questionId: 'q5-anxiety',
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      force: 'anxiety_of_new',
      weight: 1.1,
      confidence: 0.85,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ],
  options: {
    includeConfidenceIntervals: true,
    includeRecommendations: true,
    minimumSampleSize: 30,
    confidenceLevel: 0.95,
    aggregationMethod: 'weighted_average',
    excludeOutliers: true,
    cacheResults: true
  },
  requestedAt: new Date('2024-01-01')
});

beforeAll(async () => {
  // This will FAIL until createJTBDApp is implemented
  app = await createJTBDApp({
    env: 'test',
    database: {
      url: 'sqlite::memory:',
      logging: false
    },
    cache: {
      enabled: true,
      store: 'memory'
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    }
  });
  
  server = app.listen(0); // Random port for testing
});

afterAll(async () => {
  if (server) {
    server.close();
  }
});

// ============================================================================
// JTBD ANALYSIS API TESTS (RED PHASE)
// ============================================================================

describe('JTBD Analysis API', () => {
  describe('POST /api/v1/jtbd/analyze', () => {
    test('analyzes survey responses and returns JTBD results', async () => {
      // This test will FAIL until /api/v1/jtbd/analyze endpoint is implemented
      const analysisRequest = createMockJTBDApiRequest();
      
      const response = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('surveyId');
      expect(response.body.data).toHaveProperty('forceDistribution');
      expect(response.body.data).toHaveProperty('switchLikelihood');
      expect(response.body.data).toHaveProperty('primaryDrivers');
      expect(response.body.data).toHaveProperty('barriers');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('confidence');

      // Validate force distribution structure
      const distribution = response.body.data.forceDistribution;
      expect(distribution).toHaveProperty('demographic');
      expect(distribution).toHaveProperty('pain_of_old');
      expect(distribution).toHaveProperty('pull_of_new');
      expect(distribution).toHaveProperty('anchors_to_old');
      expect(distribution).toHaveProperty('anxiety_of_new');

      // Validate each force has required properties
      ['demographic', 'pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new'].forEach(force => {
        expect(distribution[force]).toHaveProperty('strength');
        expect(distribution[force]).toHaveProperty('confidence');
        expect(distribution[force]).toHaveProperty('sampleSize');
        expect(distribution[force].strength).toBeGreaterThanOrEqual(1);
        expect(distribution[force].strength).toBeLessThanOrEqual(5);
      });

      // Validate recommendations
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);
    });

    test('validates required fields in analysis request', async () => {
      // This test will FAIL until request validation is implemented
      const invalidRequests = [
        {}, // Empty request
        { surveyId: '' }, // Empty survey ID
        { surveyId: '423e4567-e89b-12d3-a456-426614174000' }, // Missing responses
        { 
          surveyId: '423e4567-e89b-12d3-a456-426614174000', 
          responses: []
        }, // Empty responses
        {
          surveyId: '423e4567-e89b-12d3-a456-426614174000',
          responses: createMockJTBDApiRequest().responses
          // Missing questionMappings
        }
      ];

      for (const invalidRequest of invalidRequests) {
        await request(app)
          .post('/api/v1/jtbd/analyze')
          .set('Authorization', 'Bearer valid-test-token')
          .send(invalidRequest)
          .expect(400);
      }
    });

    test('validates survey ID format', async () => {
      // This test will FAIL until UUID validation is implemented
      const invalidSurveyIds = [
        'invalid-uuid',
        '123',
        'not-a-real-uuid-format',
        ''
      ];

      for (const invalidId of invalidSurveyIds) {
        const request_data = {
          ...createMockJTBDApiRequest(),
          surveyId: invalidId
        };

        await request(app)
          .post('/api/v1/jtbd/analyze')
          .set('Authorization', 'Bearer valid-test-token')
          .send(request_data)
          .expect(400);
      }
    });

    test('handles analysis with confidence intervals', async () => {
      // This test will FAIL until confidence intervals are implemented
      const requestWithCI = {
        ...createMockJTBDApiRequest(),
        options: {
          ...createMockJTBDApiRequest().options,
          includeConfidenceIntervals: true,
          confidenceLevel: 0.95
        }
      };

      const response = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(requestWithCI)
        .expect(200);

      expect(response.body.data).toHaveProperty('confidenceIntervals');
      
      const ci = response.body.data.confidenceIntervals;
      ['demographic', 'pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new'].forEach(force => {
        expect(ci[force]).toHaveProperty('lowerBound');
        expect(ci[force]).toHaveProperty('upperBound');
        expect(ci[force]).toHaveProperty('confidenceLevel', 0.95);
        expect(ci[force].lowerBound).toBeLessThan(ci[force].upperBound);
      });
    });

    test('returns cached results for identical requests', async () => {
      // This test will FAIL until caching is implemented
      const analysisRequest = createMockJTBDApiRequest();
      
      // First request - should calculate
      const startTime1 = Date.now();
      const response1 = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest)
        .expect(200);
      const duration1 = Date.now() - startTime1;

      // Second identical request - should use cache
      const startTime2 = Date.now();
      const response2 = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest)
        .expect(200);
      const duration2 = Date.now() - startTime2;

      expect(response1.body.data).toEqual(response2.body.data);
      expect(duration2).toBeLessThan(duration1 * 0.5); // Cached should be faster
      expect(response2.headers['x-cache-status']).toBe('hit');
    });

    test('requires authentication', async () => {
      // This test will FAIL until authentication middleware is implemented
      const analysisRequest = createMockJTBDApiRequest();

      await request(app)
        .post('/api/v1/jtbd/analyze')
        .send(analysisRequest)
        .expect(401);
    });

    test('handles rate limiting', async () => {
      // This test will FAIL until rate limiting is implemented
      const analysisRequest = createMockJTBDApiRequest();
      
      // Make many requests quickly to trigger rate limit
      const requests = Array(102).fill(null).map(() => 
        request(app)
          .post('/api/v1/jtbd/analyze')
          .set('Authorization', 'Bearer valid-test-token')
          .send(analysisRequest)
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/jtbd/analysis/:id', () => {
    test('retrieves existing analysis by ID', async () => {
      // This test will FAIL until GET analysis endpoint is implemented
      // First create an analysis
      const analysisRequest = createMockJTBDApiRequest();
      const createResponse = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest)
        .expect(200);

      const analysisId = createResponse.body.data.id;

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/api/v1/jtbd/analysis/${analysisId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(getResponse.body.data).toEqual(createResponse.body.data);
    });

    test('returns 404 for non-existent analysis', async () => {
      // This test will FAIL until 404 handling is implemented
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .get(`/api/v1/jtbd/analysis/${nonExistentId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(404);
    });

    test('validates analysis ID format', async () => {
      // This test will FAIL until ID validation is implemented
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-format'
      ];

      for (const invalidId of invalidIds) {
        await request(app)
          .get(`/api/v1/jtbd/analysis/${invalidId}`)
          .set('Authorization', 'Bearer valid-test-token')
          .expect(400);
      }
    });
  });

  describe('GET /api/v1/jtbd/surveys/:surveyId/analyses', () => {
    test('lists all analyses for a survey', async () => {
      // This test will FAIL until survey analysis listing is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      // Create multiple analyses for the same survey
      const analysisRequest = createMockJTBDApiRequest();
      await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest);

      await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send({ ...analysisRequest, requestedAt: new Date() });

      // List analyses
      const response = await request(app)
        .get(`/api/v1/jtbd/surveys/${surveyId}/analyses`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      response.body.data.forEach((analysis: any) => {
        expect(analysis.surveyId).toBe(surveyId);
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('createdAt');
      });
    });

    test('supports pagination for survey analyses', async () => {
      // This test will FAIL until pagination is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/jtbd/surveys/${surveyId}/analyses`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('pagination');
      expect(response.body.metadata.pagination).toHaveProperty('page', 1);
      expect(response.body.metadata.pagination).toHaveProperty('limit', 10);
    });
  });
});

// ============================================================================
// JTBD QUESTION MAPPING API TESTS (RED PHASE)
// ============================================================================

describe('JTBD Question Mapping API', () => {
  describe('POST /api/v1/jtbd/mappings', () => {
    test('creates new question-to-force mapping', async () => {
      // This test will FAIL until mapping creation endpoint is implemented
      const mappingData = {
        questionId: 'q1-test-question',
        surveyId: '423e4567-e89b-12d3-a456-426614174000',
        force: 'pain_of_old',
        weight: 1.3,
        confidence: 0.88
      };

      const response = await request(app)
        .post('/api/v1/jtbd/mappings')
        .set('Authorization', 'Bearer valid-test-token')
        .send(mappingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questionId', mappingData.questionId);
      expect(response.body.data).toHaveProperty('force', mappingData.force);
      expect(response.body.data).toHaveProperty('weight', mappingData.weight);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('createdAt');
    });

    test('validates force enum values', async () => {
      // This test will FAIL until force validation is implemented
      const invalidForces = [
        'invalid_force',
        'pain',
        'pull',
        'demographic_info',
        ''
      ];

      for (const invalidForce of invalidForces) {
        const mappingData = {
          questionId: 'q1-test',
          surveyId: '423e4567-e89b-12d3-a456-426614174000',
          force: invalidForce,
          weight: 1.0,
          confidence: 0.8
        };

        await request(app)
          .post('/api/v1/jtbd/mappings')
          .set('Authorization', 'Bearer valid-test-token')
          .send(mappingData)
          .expect(400);
      }
    });

    test('validates weight range (0.1 - 2.0)', async () => {
      // This test will FAIL until weight validation is implemented
      const invalidWeights = [0, 0.05, -1, 2.5, 3.0];

      for (const invalidWeight of invalidWeights) {
        const mappingData = {
          questionId: 'q1-test',
          surveyId: '423e4567-e89b-12d3-a456-426614174000',
          force: 'pain_of_old',
          weight: invalidWeight,
          confidence: 0.8
        };

        await request(app)
          .post('/api/v1/jtbd/mappings')
          .set('Authorization', 'Bearer valid-test-token')
          .send(mappingData)
          .expect(400);
      }
    });

    test('validates confidence range (0-1)', async () => {
      // This test will FAIL until confidence validation is implemented
      const invalidConfidences = [-0.1, 1.1, 2.0, -1];

      for (const invalidConfidence of invalidConfidences) {
        const mappingData = {
          questionId: 'q1-test',
          surveyId: '423e4567-e89b-12d3-a456-426614174000',
          force: 'pain_of_old',
          weight: 1.0,
          confidence: invalidConfidence
        };

        await request(app)
          .post('/api/v1/jtbd/mappings')
          .set('Authorization', 'Bearer valid-test-token')
          .send(mappingData)
          .expect(400);
      }
    });
  });

  describe('GET /api/v1/jtbd/surveys/:surveyId/mappings', () => {
    test('retrieves all mappings for a survey', async () => {
      // This test will FAIL until mapping retrieval is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      // Create some mappings first
      const mappings = [
        {
          questionId: 'q1-demo',
          surveyId: surveyId,
          force: 'demographic',
          weight: 1.0,
          confidence: 0.9
        },
        {
          questionId: 'q2-pain',
          surveyId: surveyId,
          force: 'pain_of_old',
          weight: 1.5,
          confidence: 0.95
        }
      ];

      for (const mapping of mappings) {
        await request(app)
          .post('/api/v1/jtbd/mappings')
          .set('Authorization', 'Bearer valid-test-token')
          .send(mapping);
      }

      // Retrieve all mappings
      const response = await request(app)
        .get(`/api/v1/jtbd/surveys/${surveyId}/mappings`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      
      response.body.data.forEach((mapping: any) => {
        expect(mapping.surveyId).toBe(surveyId);
        expect(['demographic', 'pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new'])
          .toContain(mapping.force);
      });
    });

    test('filters mappings by force type', async () => {
      // This test will FAIL until force filtering is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/jtbd/surveys/${surveyId}/mappings`)
        .query({ force: 'pain_of_old' })
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      response.body.data.forEach((mapping: any) => {
        expect(mapping.force).toBe('pain_of_old');
      });
    });
  });

  describe('PUT /api/v1/jtbd/mappings/:id', () => {
    test('updates existing mapping', async () => {
      // This test will FAIL until mapping update endpoint is implemented
      // Create a mapping first
      const mappingData = {
        questionId: 'q1-update-test',
        surveyId: '423e4567-e89b-12d3-a456-426614174000',
        force: 'pain_of_old',
        weight: 1.0,
        confidence: 0.8
      };

      const createResponse = await request(app)
        .post('/api/v1/jtbd/mappings')
        .set('Authorization', 'Bearer valid-test-token')
        .send(mappingData);

      const mappingId = createResponse.body.data.id;

      // Update the mapping
      const updateData = {
        weight: 1.5,
        confidence: 0.9
      };

      const updateResponse = await request(app)
        .put(`/api/v1/jtbd/mappings/${mappingId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.weight).toBe(1.5);
      expect(updateResponse.body.data.confidence).toBe(0.9);
      expect(updateResponse.body.data).toHaveProperty('updatedAt');
    });

    test('returns 404 for non-existent mapping', async () => {
      // This test will FAIL until 404 handling is implemented
      const nonExistentId = '999e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .put(`/api/v1/jtbd/mappings/${nonExistentId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .send({ weight: 1.5 })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/jtbd/mappings/:id', () => {
    test('deletes existing mapping', async () => {
      // This test will FAIL until mapping deletion is implemented
      // Create a mapping first
      const mappingData = {
        questionId: 'q1-delete-test',
        surveyId: '423e4567-e89b-12d3-a456-426614174000',
        force: 'pain_of_old',
        weight: 1.0,
        confidence: 0.8
      };

      const createResponse = await request(app)
        .post('/api/v1/jtbd/mappings')
        .set('Authorization', 'Bearer valid-test-token')
        .send(mappingData);

      const mappingId = createResponse.body.data.id;

      // Delete the mapping
      await request(app)
        .delete(`/api/v1/jtbd/mappings/${mappingId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/api/v1/jtbd/mappings/${mappingId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(404);
    });
  });
});

// ============================================================================
// JTBD CONFIGURATION API TESTS (RED PHASE)
// ============================================================================

describe('JTBD Configuration API', () => {
  describe('GET /api/v1/jtbd/config', () => {
    test('returns JTBD system configuration', async () => {
      // This test will FAIL until configuration endpoint is implemented
      const response = await request(app)
        .get('/api/v1/jtbd/config')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('forces');
      expect(response.body.data).toHaveProperty('strengthRange');
      expect(response.body.data).toHaveProperty('defaultOptions');
      expect(response.body.data).toHaveProperty('supportedAggregationMethods');

      // Validate forces configuration
      expect(response.body.data.forces).toEqual([
        'demographic',
        'pain_of_old',
        'pull_of_new',
        'anchors_to_old',
        'anxiety_of_new'
      ]);

      // Validate strength range
      expect(response.body.data.strengthRange).toEqual({
        min: 1,
        max: 5
      });
    });

    test('includes available aggregation methods', async () => {
      // This test will FAIL until aggregation methods are exposed
      const response = await request(app)
        .get('/api/v1/jtbd/config')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data.supportedAggregationMethods).toContain('weighted_average');
      expect(response.body.data.supportedAggregationMethods).toContain('median');
      expect(response.body.data.supportedAggregationMethods).toContain('mode');
    });
  });

  describe('GET /api/v1/jtbd/config/defaults', () => {
    test('returns default analysis options', async () => {
      // This test will FAIL until defaults endpoint is implemented
      const response = await request(app)
        .get('/api/v1/jtbd/config/defaults')
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('includeConfidenceIntervals', true);
      expect(response.body.data).toHaveProperty('includeRecommendations', true);
      expect(response.body.data).toHaveProperty('minimumSampleSize', 30);
      expect(response.body.data).toHaveProperty('confidenceLevel', 0.95);
      expect(response.body.data).toHaveProperty('aggregationMethod', 'weighted_average');
      expect(response.body.data).toHaveProperty('excludeOutliers', true);
      expect(response.body.data).toHaveProperty('cacheResults', true);
    });
  });
});

// ============================================================================
// JTBD CACHE API TESTS (RED PHASE)
// ============================================================================

describe('JTBD Cache API', () => {
  describe('DELETE /api/v1/jtbd/cache/:surveyId', () => {
    test('invalidates cache for specific survey', async () => {
      // This test will FAIL until cache invalidation endpoint is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      // First create cached analysis
      const analysisRequest = createMockJTBDApiRequest();
      await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest);

      // Invalidate cache
      await request(app)
        .delete(`/api/v1/jtbd/cache/${surveyId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(204);

      // Next analysis should not use cache
      const response = await request(app)
        .post('/api/v1/jtbd/analyze')
        .set('Authorization', 'Bearer valid-test-token')
        .send(analysisRequest)
        .expect(200);

      expect(response.headers['x-cache-status']).toBe('miss');
    });

    test('requires admin authorization for cache operations', async () => {
      // This test will FAIL until admin authorization is implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .delete(`/api/v1/jtbd/cache/${surveyId}`)
        .set('Authorization', 'Bearer user-test-token') // Non-admin token
        .expect(403);
    });
  });

  describe('DELETE /api/v1/jtbd/cache', () => {
    test('clears entire JTBD cache', async () => {
      // This test will FAIL until global cache clear is implemented
      await request(app)
        .delete('/api/v1/jtbd/cache')
        .set('Authorization', 'Bearer admin-test-token')
        .expect(204);
    });
  });

  describe('GET /api/v1/jtbd/cache/stats', () => {
    test('returns cache statistics', async () => {
      // This test will FAIL until cache stats endpoint is implemented
      const response = await request(app)
        .get('/api/v1/jtbd/cache/stats')
        .set('Authorization', 'Bearer admin-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('hitRate');
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('cacheSize');
      expect(response.body.data).toHaveProperty('avgResponseTime');
    });
  });
});

// ============================================================================
// JTBD METRICS API TESTS (RED PHASE)
// ============================================================================

describe('JTBD Metrics API', () => {
  describe('GET /api/v1/jtbd/metrics', () => {
    test('returns system performance metrics', async () => {
      // This test will FAIL until metrics endpoint is implemented
      const response = await request(app)
        .get('/api/v1/jtbd/metrics')
        .set('Authorization', 'Bearer admin-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('analysisCount');
      expect(response.body.data).toHaveProperty('avgAnalysisTime');
      expect(response.body.data).toHaveProperty('cacheHitRate');
      expect(response.body.data).toHaveProperty('errorRate');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('peakUsage');
    });

    test('supports time range filtering', async () => {
      // This test will FAIL until time filtering is implemented
      const response = await request(app)
        .get('/api/v1/jtbd/metrics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', 'Bearer admin-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('timeRange');
      expect(response.body.data.timeRange.start).toBe('2024-01-01T00:00:00.000Z');
      expect(response.body.data.timeRange.end).toBe('2024-01-31T23:59:59.999Z');
    });
  });

  describe('GET /api/v1/jtbd/metrics/surveys/:surveyId', () => {
    test('returns metrics for specific survey', async () => {
      // This test will FAIL until survey-specific metrics are implemented
      const surveyId = '423e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/v1/jtbd/metrics/surveys/${surveyId}`)
        .set('Authorization', 'Bearer valid-test-token')
        .expect(200);

      expect(response.body.data).toHaveProperty('surveyId', surveyId);
      expect(response.body.data).toHaveProperty('analysisCount');
      expect(response.body.data).toHaveProperty('avgConfidence');
      expect(response.body.data).toHaveProperty('commonDrivers');
      expect(response.body.data).toHaveProperty('avgSwitchLikelihood');
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS (RED PHASE)
// ============================================================================

describe('JTBD API Error Handling', () => {
  test('returns structured error responses', async () => {
    // This test will FAIL until error response structure is implemented
    const response = await request(app)
      .post('/api/v1/jtbd/analyze')
      .set('Authorization', 'Bearer valid-test-token')
      .send({}) // Empty request to trigger validation error
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('details');
  });

  test('handles internal server errors gracefully', async () => {
    // This test will FAIL until error middleware is implemented
    // Mock internal error by sending malformed data that passes validation
    const malformedRequest = {
      surveyId: '423e4567-e89b-12d3-a456-426614174000',
      responses: [{ 
        id: '1',
        sessionId: 'session-1',
        questionId: 'q1',
        value: null, // This should cause internal processing error
        answeredAt: new Date(),
        timeSpent: 10
      }],
      questionMappings: [],
      options: {}
    };

    const response = await request(app)
      .post('/api/v1/jtbd/analyze')
      .set('Authorization', 'Bearer valid-test-token')
      .send(malformedRequest)
      .expect(500);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toContain('An internal error occurred');
  });

  test('validates request timeout scenarios', async () => {
    // This test will FAIL until timeout handling is implemented
    const largeRequest = {
      ...createMockJTBDApiRequest(),
      responses: Array(10000).fill(null).map((_, i) => ({
        id: `large-${i}`,
        sessionId: `session-${Math.floor(i / 10)}`,
        questionId: `q${i % 5}`,
        value: `Response ${i}`.repeat(100), // Large response text
        answeredAt: new Date(),
        timeSpent: 30
      }))
    };

    const response = await request(app)
      .post('/api/v1/jtbd/analyze')
      .set('Authorization', 'Bearer valid-test-token')
      .send(largeRequest)
      .timeout(5000) // 5 second timeout
      .expect(408); // Request timeout

    expect(response.body.error.code).toBe('REQUEST_TIMEOUT');
  });
});

// ============================================================================
// INTEGRATION TESTS (RED PHASE)
// ============================================================================

describe('JTBD API Integration', () => {
  test('complete workflow: create mappings, run analysis, get results', async () => {
    // This test will FAIL until full workflow integration is implemented
    const surveyId = '423e4567-e89b-12d3-a456-426614174000';

    // 1. Create question mappings
    const mappings = [
      { questionId: 'q1', surveyId, force: 'demographic', weight: 1.0, confidence: 0.9 },
      { questionId: 'q2', surveyId, force: 'pain_of_old', weight: 1.5, confidence: 0.95 },
      { questionId: 'q3', surveyId, force: 'pull_of_new', weight: 1.3, confidence: 0.9 },
      { questionId: 'q4', surveyId, force: 'anchors_to_old', weight: 1.2, confidence: 0.85 },
      { questionId: 'q5', surveyId, force: 'anxiety_of_new', weight: 1.1, confidence: 0.8 }
    ];

    for (const mapping of mappings) {
      await request(app)
        .post('/api/v1/jtbd/mappings')
        .set('Authorization', 'Bearer valid-test-token')
        .send(mapping)
        .expect(201);
    }

    // 2. Run analysis
    const analysisRequest = createMockJTBDApiRequest();
    const analysisResponse = await request(app)
      .post('/api/v1/jtbd/analyze')
      .set('Authorization', 'Bearer valid-test-token')
      .send(analysisRequest)
      .expect(200);

    const analysisId = analysisResponse.body.data.id;

    // 3. Retrieve analysis
    const getResponse = await request(app)
      .get(`/api/v1/jtbd/analysis/${analysisId}`)
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(getResponse.body.data).toEqual(analysisResponse.body.data);

    // 4. List survey analyses
    const listResponse = await request(app)
      .get(`/api/v1/jtbd/surveys/${surveyId}/analyses`)
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(listResponse.body.data).toBeInstanceOf(Array);
    expect(listResponse.body.data.some((a: any) => a.id === analysisId)).toBe(true);
  });

  test('analysis persists and can be retrieved after server restart', async () => {
    // This test will FAIL until database persistence is implemented
    const analysisRequest = createMockJTBDApiRequest();
    
    const analysisResponse = await request(app)
      .post('/api/v1/jtbd/analyze')
      .set('Authorization', 'Bearer valid-test-token')
      .send(analysisRequest)
      .expect(200);

    const analysisId = analysisResponse.body.data.id;

    // Simulate server restart by clearing in-memory cache
    await request(app)
      .delete('/api/v1/jtbd/cache')
      .set('Authorization', 'Bearer admin-test-token')
      .expect(204);

    // Should still be able to retrieve from database
    const getResponse = await request(app)
      .get(`/api/v1/jtbd/analysis/${analysisId}`)
      .set('Authorization', 'Bearer valid-test-token')
      .expect(200);

    expect(getResponse.body.data.id).toBe(analysisId);
  });
});

/**
 * TDD RED PHASE API TEST SUMMARY
 * 
 * These tests will FAIL until the following API components are implemented:
 * ❌ Express app setup with JTBD routes
 * ❌ POST /api/v1/jtbd/analyze - Main analysis endpoint
 * ❌ GET /api/v1/jtbd/analysis/:id - Retrieve analysis
 * ❌ GET /api/v1/jtbd/surveys/:surveyId/analyses - List analyses
 * ❌ POST /api/v1/jtbd/mappings - Create question mappings
 * ❌ GET /api/v1/jtbd/surveys/:surveyId/mappings - Get mappings
 * ❌ PUT /api/v1/jtbd/mappings/:id - Update mappings
 * ❌ DELETE /api/v1/jtbd/mappings/:id - Delete mappings
 * ❌ GET /api/v1/jtbd/config - System configuration
 * ❌ GET /api/v1/jtbd/config/defaults - Default options
 * ❌ Cache management endpoints
 * ❌ Metrics and monitoring endpoints
 * ❌ Request validation middleware
 * ❌ Authentication middleware
 * ❌ Rate limiting middleware
 * ❌ Error handling middleware
 * ❌ Response caching
 * ❌ Database persistence
 * ❌ Input sanitization and validation
 * ❌ Structured error responses
 * ❌ Pagination support
 * ❌ Query filtering
 * 
 * Run: npm run test:jtbd-api to see all failing tests
 * 
 * Next Phase: Implement API routes, middleware, and database layer to make tests pass (GREEN phase)
 */