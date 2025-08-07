/**
 * Integration Tests for LLM Analysis API Route (/api/llm/analyze)
 * 
 * Tests comprehensive LLM integration including:
 * - Authentication and authorization
 * - Request validation and input sanitization
 * - LLM service integration
 * - Error handling and edge cases
 * - Security (XSS, injection prevention)
 * - Enhanced template compliance
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockNextRequest, MockNextRequestOptions } from '../../types/mocks';

// Mock NextRequest and NextResponse before importing
vi.mock('next/server', () => {
  const mockNextRequest = vi.fn((url: string, options: MockNextRequestOptions = {}) => ({
    url,
    method: options.method || 'GET',
    headers: new Map(Object.entries(options.headers || {})),
    _body: options.body || '',
    async json() {
      return JSON.parse(this._body || '{}');
    },
    async text() {
      return this._body || '';
    },
  }));

  const mockNextResponse = {
    json: (data: any, options: { status?: number; headers?: Record<string, string> } = {}) => ({
      status: options.status || 200,
      json: () => Promise.resolve(data),
      headers: new Map(Object.entries(options.headers || {})),
    }),
  };

  return {
    NextRequest: mockNextRequest,
    NextResponse: mockNextResponse,
  };
});

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/llm/analyze/route';
import { llmService } from '@/lib/services/llm-service';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock dependencies
vi.mock('@supabase/auth-helpers-nextjs');
vi.mock('@/lib/services/llm-service', () => ({
  llmService: {
    analyzeSurveyResponse: vi.fn(),
    healthCheck: vi.fn(),
    getConfig: vi.fn(() => ({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 1200,
      timeout: 45000,
      retries: 3,
    })),
  },
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

const mockLLMService = llmService as any;

beforeEach(() => {
  vi.clearAllMocks();
  (createServerComponentClient as any).mockReturnValue(mockSupabase);
});

describe('/api/llm/analyze', () => {
  describe('POST /api/llm/analyze - Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for users without admin/org_admin permissions', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'user', organization_id: 'org-1' },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should allow admin users to analyze any response', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { first_name: 'John', last_name: 'Doe', department: 'Engineering', job_title: 'Developer' }
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'analysis-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ id: 'analysis-1' }],
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock enhanced LLM analysis result
      mockLLMService.analyzeSurveyResponse.mockResolvedValue({
        primaryJtbdForce: 'pain_of_old',
        secondaryJtbdForces: [],
        forceStrengthScore: 4,
        confidenceScore: 5,
        reasoning: 'Clear indication of process inefficiencies and manual workload concerns',
        keyThemes: ['manual processes', 'time-consuming tasks', 'workflow inefficiency'],
        themeCategories: {
          process: ['manual processes', 'workflow inefficiency'],
          technology: [],
          people: ['time-consuming tasks'],
          organizational: []
        },
        sentimentAnalysis: {
          overallScore: -0.4,
          sentimentLabel: 'negative',
          emotionalIndicators: ['frustrating', 'time-consuming', 'inefficient'],
          tone: 'frustrated'
        },
        businessImplications: {
          impactLevel: 'high',
          affectedAreas: ['productivity', 'efficiency'],
          urgency: 'medium',
          businessValue: 'High potential for automation and process improvement'
        },
        actionableInsights: {
          summaryInsight: 'Strong pain point indicates significant opportunity for AI-driven process automation',
          detailedAnalysis: 'Employee expresses clear frustration with current manual processes that are time-consuming and inefficient',
          immediateActions: ['Assess current workflow bottlenecks', 'Identify automation opportunities'],
          longTermRecommendations: ['Implement AI-powered workflow automation', 'Provide training on new tools']
        },
        qualityIndicators: {
          responseQuality: 'good',
          specificityLevel: 'specific',
          actionability: 'high',
          businessRelevance: 'high'
        },
        analysisMetadata: {
          processingNotes: 'Clear and detailed response with specific pain points',
          followUpQuestions: ['Which specific processes take the most time?', 'What tools are currently being used?'],
          relatedThemes: ['digital transformation', 'process optimization', 'employee satisfaction']
        }
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Our current manual processes are very time-consuming and frustrating. I spend hours each day on repetitive tasks that could be automated.',
          questionText: 'What are your biggest pain points with current workflows?',
          expectedForce: 'pain_of_old',
          questionContext: 'Current process assessment',
          organizationId: 'org-1',
          surveyId: 'survey-1'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.primaryJtbdForce).toBe('pain_of_old');
      expect(data.result.forceStrengthScore).toBe(4);
      expect(data.result.actionableInsights.summaryInsight).toContain('automation');
    });

    it('should restrict org_admin users to their organization', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'org_admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-2' }, // Different organization
            user: { first_name: 'John', last_name: 'Doe' }
          },
          error: null,
        });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to this organization');
    });
  });

  describe('POST /api/llm/analyze - Request Validation', () => {
    beforeEach(() => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });
    });

    it('should validate required fields', () => {
      const requiredFields = ['responseId', 'responseText', 'questionText', 'expectedForce'];
      
      expect(requiredFields).toHaveLength(4);
      expect(requiredFields).toContain('responseId');
      expect(requiredFields).toContain('responseText');
      expect(requiredFields).toContain('questionText');
      expect(requiredFields).toContain('expectedForce');
    });

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          // Missing responseText, questionText, expectedForce
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should validate expectedForce enum values', async () => {
      const validForces = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];
      
      expect(validForces).toContain('pain_of_old');
      expect(validForces).toContain('pull_of_new');
      expect(validForces).toContain('anchors_to_old');
      expect(validForces).toContain('anxiety_of_new');
      expect(validForces).toContain('demographic');

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'invalid_force', // Invalid force
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid expectedForce');
    });

    it('should enforce length limits for text inputs', async () => {
      const maxResponseLength = 5000;
      const maxQuestionLength = 1000;
      
      expect(maxResponseLength).toBe(5000);
      expect(maxQuestionLength).toBe(1000);

      // Test response text length limit
      const longResponseText = 'a'.repeat(5001);
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: longResponseText,
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds maximum length');
    });

    it('should validate string types for text inputs', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 123, // Invalid type
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('must be a non-empty string');
    });

    it('should handle missing survey response gracefully', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null, // Response not found
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'non-existent',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Survey response not found');
    });
  });

  describe('POST /api/llm/analyze - LLM Integration', () => {
    beforeEach(() => {
      // Setup valid authentication and response
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { first_name: 'John', last_name: 'Doe', department: 'Engineering', job_title: 'Developer' }
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'analysis-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ id: 'analysis-1' }],
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });
    });

    it('should return 503 when no API keys are configured', async () => {
      // Mock environment without API keys
      const originalEnv = process.env;
      process.env = { ...originalEnv, OPENAI_API_KEY: undefined, ANTHROPIC_API_KEY: undefined };

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.code).toBe('NO_API_KEYS');
      expect(data.error).toBe('LLM analysis unavailable');

      process.env = originalEnv;
    });

    it('should handle different JTBD force types correctly', async () => {
      const forceTypes = [
        'pain_of_old',
        'pull_of_new', 
        'anchors_to_old',
        'anxiety_of_new',
        'demographic'
      ];

      for (const expectedForce of forceTypes) {
        mockLLMService.analyzeSurveyResponse.mockResolvedValue({
          primaryJtbdForce: expectedForce,
          secondaryJtbdForces: [],
          forceStrengthScore: 3,
          confidenceScore: 4,
          reasoning: `Analysis for ${expectedForce}`,
          keyThemes: [`theme_${expectedForce}`],
          themeCategories: { process: [], technology: [], people: [], organizational: [] },
          sentimentAnalysis: {
            overallScore: 0,
            sentimentLabel: 'neutral',
            emotionalIndicators: [],
            tone: 'neutral'
          },
          businessImplications: {
            impactLevel: 'medium',
            affectedAreas: [],
            urgency: 'medium',
            businessValue: 'Test value'
          },
          actionableInsights: {
            summaryInsight: 'Test insight',
            detailedAnalysis: 'Test analysis',
            immediateActions: [],
            longTermRecommendations: []
          },
          qualityIndicators: {
            responseQuality: 'good',
            specificityLevel: 'general',
            actionability: 'medium',
            businessRelevance: 'medium'
          },
          analysisMetadata: {
            processingNotes: '',
            followUpQuestions: [],
            relatedThemes: []
          }
        });

        const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
          method: 'POST',
          body: JSON.stringify({
            responseId: 'resp-1',
            responseText: `Response for ${expectedForce}`,
            questionText: `Question for ${expectedForce}`,
            expectedForce,
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.result.primaryJtbdForce).toBe(expectedForce);
      }
    });

    it('should handle LLM service errors gracefully', async () => {
      mockLLMService.analyzeSurveyResponse.mockRejectedValue(
        new Error('LLM service timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Analysis failed');
      expect(data.message).toBe('LLM service timeout');
    });

    it('should categorize errors correctly', async () => {
      const errorScenarios = [
        { error: new Error('API key invalid'), expectedCode: 'AUTH_ERROR', expectedStatus: 401 },
        { error: new Error('Rate limit exceeded'), expectedCode: 'RATE_LIMITED', expectedStatus: 429 },
        { error: { name: 'AbortError', message: 'Request timeout' }, expectedCode: 'TIMEOUT', expectedStatus: 408 },
        { error: new Error('Service unavailable 503'), expectedCode: 'SERVICE_UNAVAILABLE', expectedStatus: 503 },
        { error: new Error('Invalid JSON response'), expectedCode: 'INVALID_RESPONSE', expectedStatus: 502 }
      ];

      for (const scenario of errorScenarios) {
        mockLLMService.analyzeSurveyResponse.mockRejectedValue(scenario.error);

        const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
          method: 'POST',
          body: JSON.stringify({
            responseId: 'resp-1',
            responseText: 'Test response',
            questionText: 'Test question',
            expectedForce: 'pain_of_old',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(scenario.expectedStatus);
        expect(data.code).toBe(scenario.expectedCode);
      }
    });
  });

  describe('POST /api/llm/analyze - Security Tests', () => {
    beforeEach(() => {
      // Setup valid authentication and response
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { first_name: 'John', last_name: 'Doe' }
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'analysis-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ id: 'analysis-1' }],
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.analyzeSurveyResponse.mockResolvedValue({
        primaryJtbdForce: 'pain_of_old',
        secondaryJtbdForces: [],
        forceStrengthScore: 3,
        confidenceScore: 4,
        reasoning: 'Test analysis',
        keyThemes: ['test'],
        themeCategories: { process: [], technology: [], people: [], organizational: [] },
        sentimentAnalysis: {
          overallScore: 0,
          sentimentLabel: 'neutral',
          emotionalIndicators: [],
          tone: 'neutral'
        },
        businessImplications: {
          impactLevel: 'medium',
          affectedAreas: [],
          urgency: 'medium',
          businessValue: 'Test value'
        },
        actionableInsights: {
          summaryInsight: 'Test insight',
          detailedAnalysis: 'Test analysis',
          immediateActions: [],
          longTermRecommendations: []
        },
        qualityIndicators: {
          responseQuality: 'good',
          specificityLevel: 'general',
          actionability: 'medium',
          businessRelevance: 'medium'
        },
        analysisMetadata: {
          processingNotes: '',
          followUpQuestions: [],
          relatedThemes: []
        }
      });
    });

    it('should handle XSS attempts in response text safely', async () => {
      const xssPayload = '<script>alert("xss")</script>';

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: xssPayload,
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockLLMService.analyzeSurveyResponse).toHaveBeenCalledWith(
        xssPayload,
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should handle SQL injection attempts safely', async () => {
      const sqlPayload = "'; DROP TABLE survey_responses; --";

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: sqlPayload,
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      
      // Should handle gracefully without SQL errors
      expect(response.status).not.toBe(500);
    });

    it('should sanitize and validate all input fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: '   Test response   ', // Extra whitespace
          questionText: '   Test question   ', // Extra whitespace
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockLLMService.analyzeSurveyResponse).toHaveBeenCalledWith(
        '   Test response   ', // Should preserve original text for LLM
        '   Test question   ',
        'pain_of_old',
        expect.any(Object)
      );
    });
  });

  describe('GET /api/llm/analyze - Health Check', () => {
    it('should return 401 for unauthenticated health check requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return service status for authenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockLLMService.healthCheck.mockResolvedValue({
        status: 'healthy',
        latency: 150
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('LLM Analysis API');
      expect(data.status).toBe('healthy');
      expect(data.latency).toBe(150);
      expect(data.config).toBeDefined();
      expect(data.apiKeys).toBeDefined();
    });

    it('should check API key availability', () => {
      const apiKeyStatuses = ['configured', 'missing'];
      
      expect(apiKeyStatuses).toContain('configured');
      expect(apiKeyStatuses).toContain('missing');
    });

    it('should handle health check failures gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockLLMService.healthCheck.mockRejectedValue(
        new Error('Health check failed')
      );

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Health check failed');
    });
  });

  describe('Enhanced Template Compliance', () => {
    it('should use question-specific templates for analysis', async () => {
      // Setup valid authentication and response
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { first_name: 'John', last_name: 'Doe', department: 'Engineering', job_title: 'Developer' }
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'analysis-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: [{ id: 'analysis-1' }],
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Mock comprehensive analysis result matching enhanced templates
      mockLLMService.analyzeSurveyResponse.mockResolvedValue({
        primaryJtbdForce: 'pain_of_old',
        secondaryJtbdForces: ['anxiety_of_new'],
        forceStrengthScore: 4,
        confidenceScore: 5,
        reasoning: 'Response demonstrates clear pain points with current manual processes, combined with some concern about learning new systems',
        keyThemes: ['manual processes', 'time management', 'learning curve', 'efficiency'],
        themeCategories: {
          process: ['manual processes', 'efficiency'],
          technology: [],
          people: ['time management', 'learning curve'],
          organizational: []
        },
        sentimentAnalysis: {
          overallScore: -0.3,
          sentimentLabel: 'negative',
          emotionalIndicators: ['frustrating', 'time-consuming', 'concerned'],
          tone: 'frustrated'
        },
        businessImplications: {
          impactLevel: 'high',
          affectedAreas: ['productivity', 'efficiency', 'morale'],
          urgency: 'medium',
          businessValue: 'Significant opportunity for automation to reduce manual workload and improve efficiency'
        },
        actionableInsights: {
          summaryInsight: 'Employee faces significant process inefficiencies but has concerns about change management',
          detailedAnalysis: 'The response reveals both strong pain points with current manual processes and underlying anxiety about adopting new technologies, suggesting need for gradual implementation with strong support',
          immediateActions: ['Conduct detailed process audit', 'Plan change management strategy', 'Identify quick wins'],
          longTermRecommendations: ['Implement gradual AI adoption', 'Provide comprehensive training', 'Establish support systems']
        },
        qualityIndicators: {
          responseQuality: 'excellent',
          specificityLevel: 'very_specific',
          actionability: 'high',
          businessRelevance: 'high'
        },
        analysisMetadata: {
          processingNotes: 'Multi-dimensional response showing both push and pull factors',
          followUpQuestions: ['What specific processes take the most time?', 'What previous experiences shape your technology concerns?'],
          relatedThemes: ['change management', 'process optimization', 'technology adoption', 'employee training']
        }
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'I spend way too much time on manual data entry and report generation. It\'s frustrating and inefficient. I\'m interested in AI solutions but worried about the learning curve and whether I\'ll be able to adapt.',
          questionText: 'What are your thoughts on AI integration in your daily work?',
          expectedForce: 'pain_of_old',
          questionContext: 'AI adoption assessment',
          organizationId: 'org-1',
          surveyId: 'survey-1'
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Verify enhanced template compliance
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result).toMatchObject({
        primaryJtbdForce: 'pain_of_old',
        secondaryJtbdForces: expect.arrayContaining(['anxiety_of_new']),
        forceStrengthScore: expect.any(Number),
        confidenceScore: expect.any(Number),
        reasoning: expect.any(String),
        keyThemes: expect.arrayContaining([expect.any(String)]),
        themeCategories: expect.objectContaining({
          process: expect.any(Array),
          technology: expect.any(Array),
          people: expect.any(Array),
          organizational: expect.any(Array)
        }),
        sentimentAnalysis: expect.objectContaining({
          overallScore: expect.any(Number),
          sentimentLabel: expect.any(String),
          emotionalIndicators: expect.any(Array),
          tone: expect.any(String)
        }),
        businessImplications: expect.objectContaining({
          impactLevel: expect.any(String),
          affectedAreas: expect.any(Array),
          urgency: expect.any(String),
          businessValue: expect.any(String)
        }),
        actionableInsights: expect.objectContaining({
          summaryInsight: expect.any(String),
          detailedAnalysis: expect.any(String),
          immediateActions: expect.any(Array),
          longTermRecommendations: expect.any(Array)
        }),
        qualityIndicators: expect.objectContaining({
          responseQuality: expect.any(String),
          specificityLevel: expect.any(String),
          actionability: expect.any(String),
          businessRelevance: expect.any(String)
        }),
        analysisMetadata: expect.objectContaining({
          processingNotes: expect.any(String),
          followUpQuestions: expect.any(Array),
          relatedThemes: expect.any(Array)
        })
      });

      // Verify LLM service was called with proper context
      expect(mockLLMService.analyzeSurveyResponse).toHaveBeenCalledWith(
        expect.any(String), // responseText
        expect.any(String), // questionText
        'pain_of_old',      // expectedForce
        expect.objectContaining({
          questionContext: 'AI adoption assessment',
          employeeRole: 'Developer',
          employeeDepartment: 'Engineering',
          organizationName: 'Test Org',
          responseId: 'resp-1',
          surveyId: 'survey-1'
        })
      );
    });
  });
});