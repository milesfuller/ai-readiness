/**
 * Integration Tests for LLM Batch Analysis API (/api/llm/batch)
 * 
 * Tests include:
 * - Authentication and authorization
 * - Request validation
 * - Batch processing scenarios
 * - Rate limiting
 * - Security (XSS, SQL injection, CSRF)
 * - Error handling
 * - Performance and concurrency
 */

// Import types first
import type { MockNextRequest, MockNextRequestOptions } from '../../types/mocks'

// Mock NextRequest and NextResponse before importing
jest.mock('next/server', () => {
  class MockNextRequest {
    public url: string
    public method: string
    public headers: Map<string, string>
    public _body: string

    constructor(url: string, options: MockNextRequestOptions = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this._body = options.body || ''
    }

    async json(): Promise<any> {
      return JSON.parse(this._body || '{}')
    }

    async text(): Promise<string> {
      return this._body || ''
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json: (data: any, options: { status?: number; headers?: Record<string, string> } = {}) => ({
        status: options.status || 200,
        json: () => Promise.resolve(data),
        headers: new Map(Object.entries(options.headers || {})),
      }),
    },
  }
})

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/llm/batch/route';
import { llmService } from '@/lib/services/llm-service';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('@/lib/services/llm-service', () => ({
  llmService: {
    batchAnalyzeResponses: jest.fn(),
    healthCheck: jest.fn(),
    getConfig: jest.fn(() => ({
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.2,
      maxTokens: 1200,
      timeout: 45000,
      retries: 3,
    })),
  },
}));
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

const mockLLMService = llmService as jest.Mocked<typeof llmService>;

beforeEach(() => {
  jest.clearAllMocks();
  (createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase);
});

describe('/api/llm/batch', () => {
  describe('POST /api/llm/batch - Authentication & Authorization', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
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

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Insufficient permissions');
    });

    it('should allow admin users to batch analyze any survey', async () => {
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
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'batch-1' },
          error: null,
        });

      // Mock survey responses query
      mockSupabase.from().select.mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        resolve: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [
                {
                  question_id: 'q1',
                  answer: 'Manual processes are frustrating'
                }
              ],
              survey: {
                id: 'survey-1',
                title: 'AI Readiness Survey',
                organization_id: 'org-1',
                questions: [
                  {
                    id: 'q1',
                    question: 'What are your biggest pain points?',
                    category: 'pain'
                  }
                ]
              },
              user: {
                first_name: 'John',
                last_name: 'Doe',
                department: 'Engineering',
                job_title: 'Developer'
              }
            }
          ],
          error: null,
        }),
      });

      // Resolve the query mock
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [
                {
                  question_id: 'q1',
                  answer: 'Manual processes are frustrating'
                }
              ],
              survey: {
                id: 'survey-1',
                title: 'AI Readiness Survey',
                organization_id: 'org-1',
                questions: [
                  {
                    id: 'q1',
                    question: 'What are your biggest pain points?',
                    category: 'pain'
                  }
                ]
              },
              user: {
                first_name: 'John',
                last_name: 'Doe',
                department: 'Engineering',
                job_title: 'Developer'
              }
            }
          ],
          error: null,
        }),
      });

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from().update().in.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: [
          {
            responseId: 'resp-1',
            primaryJtbdForce: 'pain_of_old',
            secondaryJtbdForces: [],
            forceStrengthScore: 4,
            confidenceScore: 5,
            reasoning: 'Clear pain point identified',
            keyThemes: ['manual processes', 'frustration'],
            themeCategories: {
              process: ['manual processes'],
              technology: [],
              people: [],
              organizational: ['frustration'],
            },
            sentimentAnalysis: {
              overallScore: -0.4,
              sentimentLabel: 'negative',
              emotionalIndicators: ['frustrating'],
              tone: 'frustrated',
            },
            businessImplications: {
              impactLevel: 'high',
              affectedAreas: ['productivity'],
              urgency: 'medium',
              businessValue: 'High potential for automation',
            },
            actionableInsights: {
              summaryInsight: 'Process automation opportunity',
              detailedAnalysis: 'Manual processes causing frustration',
              immediateActions: ['Assess automation tools'],
              longTermRecommendations: ['Implement AI solutions'],
            },
            qualityIndicators: {
              responseQuality: 'good',
              specificityLevel: 'specific',
              actionability: 'high',
              businessRelevance: 'high',
            },
            analysisMetadata: {
              processingNotes: 'Clear response',
              followUpQuestions: [],
              relatedThemes: [],
            },
          }
        ],
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          totalCostCents: 30,
          totalTokensUsed: 1000,
          processingTimeMs: 2500,
        },
        errors: [],
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
          options: {
            parallel: true,
            priority: 'high',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.successful).toBe(1);
      expect(data.results.length).toBe(1);
    });

    it('should restrict org_admin users to their organization only', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'org_admin', organization_id: 'org-1' },
        error: null,
      });

      // Mock responses from different organization
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              survey: { organization_id: 'org-2' }, // Different organization
            }
          ],
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No accessible responses found');
    });
  });

  describe('POST /api/llm/batch - Request Validation', () => {
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

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          // Missing surveyId and responseIds
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Either surveyId or responseIds array is required');
    });

    it('should return 404 for non-existent survey responses', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'non-existent',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('No responses found');
    });

    it('should handle responseIds array input', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'in', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: 'Test answer' }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'batch-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from().update().in.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: [
          {
            responseId: 'resp-1',
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
              tone: 'neutral',
            },
            businessImplications: {
              impactLevel: 'medium',
              affectedAreas: [],
              urgency: 'medium',
              businessValue: 'Test value',
            },
            actionableInsights: {
              summaryInsight: 'Test insight',
              detailedAnalysis: 'Test analysis',
              immediateActions: [],
              longTermRecommendations: [],
            },
            qualityIndicators: {
              responseQuality: 'good',
              specificityLevel: 'general',
              actionability: 'medium',
              businessRelevance: 'medium',
            },
            analysisMetadata: {
              processingNotes: '',
              followUpQuestions: [],
              relatedThemes: [],
            },
          }
        ],
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          totalCostCents: 20,
          totalTokensUsed: 500,
          processingTimeMs: 1500,
        },
        errors: [],
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          responseIds: ['resp-1', 'resp-2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for no analyzable responses (all demographic)', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: 'I use AI daily' }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'How often do you use AI?', category: 'demographic' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
          options: { includeDemographic: false }, // Exclude demographic
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No analyzable responses found');
      expect(data.message).toContain('demographic');
    });
  });

  describe('POST /api/llm/batch - Security Tests', () => {
    beforeEach(() => {
      // Setup valid authentication and responses
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
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'batch-1' },
          error: null,
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from().update().in.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: [],
        summary: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          totalCostCents: 0,
          totalTokensUsed: 0,
          processingTimeMs: 100,
        },
        errors: [],
      });
    });

    it('should handle XSS attempts in survey responses', async () => {
      const xssPayload = global.testHelpers.xssPayloads[0];

      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: xssPayload }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      
      // Should process XSS payload without executing it
      expect(response.status).toBe(200);
      
      // Verify XSS payload was passed to LLM service but not executed
      expect(mockLLMService.batchAnalyzeResponses).toHaveBeenCalledWith(
        expect.objectContaining({
          responses: expect.arrayContaining([
            expect.objectContaining({
              userResponse: xssPayload,
            }),
          ]),
        })
      );
    });

    it('should handle SQL injection attempts in survey IDs', async () => {
      const sqlPayload = global.testHelpers.sqlInjectionPayloads[0];

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: sqlPayload,
        }),
      });

      const response = await POST(request);
      
      // Should handle gracefully without SQL errors
      expect(response.status).not.toBe(500);
      // Likely 404 since the malicious survey ID won't exist
      expect([404, 400]).toContain(response.status);
    });

    it('should handle extremely large batch requests', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => `resp-${i}`);

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          responseIds: largeBatch,
        }),
      });

      const response = await POST(request);
      
      // Should handle large batches gracefully
      expect(response.status).not.toBe(500);
    });

    it('should validate JSON payload structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/llm/batch - Error Handling', () => {
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

    it('should handle database fetch errors gracefully', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch responses');
    });

    it('should handle LLM service errors gracefully', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: 'Test answer' }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { name: 'Test Org' },
        error: null,
      });

      mockLLMService.batchAnalyzeResponses.mockRejectedValue(
        new Error('LLM service timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Batch analysis failed');
      expect(data.message).toBe('LLM service timeout');
    });

    it('should continue execution even if batch log storage fails', async () => {
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: 'Test answer' }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: new Error('Log storage failed'),
        });

      mockSupabase.from().insert.mockResolvedValue({
        data: null,
        error: null,
      });

      mockSupabase.from().update().in.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: [
          {
            responseId: 'resp-1',
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
              tone: 'neutral',
            },
            businessImplications: {
              impactLevel: 'medium',
              affectedAreas: [],
              urgency: 'medium',
              businessValue: 'Test value',
            },
            actionableInsights: {
              summaryInsight: 'Test insight',
              detailedAnalysis: 'Test analysis',
              immediateActions: [],
              longTermRecommendations: [],
            },
            qualityIndicators: {
              responseQuality: 'good',
              specificityLevel: 'general',
              actionability: 'medium',
              businessRelevance: 'medium',
            },
            analysisMetadata: {
              processingNotes: '',
              followUpQuestions: [],
              relatedThemes: [],
            },
          }
        ],
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          totalCostCents: 20,
          totalTokensUsed: 500,
          processingTimeMs: 1500,
        },
        errors: [],
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still return success despite log storage failure
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.batchId).toBeUndefined(); // Log storage failed
      expect(data.summary.successful).toBe(1);
    });
  });

  describe('GET /api/llm/batch - Batch Status', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch?batchId=batch-1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return batch analysis logs for admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      // Mock batch logs query
      mockSupabase.from().select().order().limit.mockResolvedValue({
        data: [
          {
            id: 'batch-1',
            survey_id: 'survey-1',
            organization_id: 'org-1',
            total_responses: 10,
            successful_analyses: 8,
            failed_analyses: 2,
            total_cost_cents: 500,
            total_tokens_used: 5000,
            processing_time_ms: 30000,
            created_at: '2024-01-01T00:00:00Z',
          }
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch?surveyId=survey-1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.batches).toHaveLength(1);
      expect(data.batches[0].total_responses).toBe(10);
      expect(data.batches[0].successful_analyses).toBe(8);
    });

    it('should filter batch logs by organization for org_admin users', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'org-admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'org_admin', organization_id: 'org-1' },
        error: null,
      });

      // Mock filtered query
      mockSupabase.from().select().order().eq().limit.mockResolvedValue({
        data: [
          {
            id: 'batch-1',
            organization_id: 'org-1', // Same organization
            total_responses: 5,
            successful_analyses: 5,
            failed_analyses: 0,
          }
        ],
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.batches).toHaveLength(1);
      expect(data.batches[0].organization_id).toBe('org-1');
    });

    it('should handle database fetch errors for batch logs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { role: 'admin', organization_id: 'org-1' },
        error: null,
      });

      mockSupabase.from().select().order().limit.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch batch analysis logs');
    });
  });

  describe('Batch Processing Performance', () => {
    it('should handle concurrent batch requests', async () => {
      // Setup valid authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1' } },
        error: null,
      });

      mockSupabase.from().select().eq().single
        .mockResolvedValue({
          data: { role: 'admin', organization_id: 'org-1' },
          error: null,
        })
        .mockResolvedValue({
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValue({
          data: { id: 'batch-1' },
          error: null,
        });

      // Mock concurrent responses
      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'resp-1',
              answers: [{ question_id: 'q1', answer: 'Test answer' }],
              survey: {
                id: 'survey-1',
                organization_id: 'org-1',
                questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
              },
              user: { job_title: 'Developer', department: 'Engineering' }
            }
          ],
          error: null,
        }),
      });

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });
      mockSupabase.from().update().in.mockResolvedValue({ data: null, error: null });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: [],
        summary: {
          totalProcessed: 1,
          successful: 1,
          failed: 0,
          totalCostCents: 20,
          totalTokensUsed: 500,
          processingTimeMs: Math.random() * 1000 + 500, // Random processing time
        },
        errors: [],
      });

      // Create multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/llm/batch', {
          method: 'POST',
          body: JSON.stringify({
            surveyId: `survey-${i}`,
            options: { parallel: true },
          }),
        })
      );

      // Execute requests concurrently
      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }

      // Verify service was called for each request
      expect(mockLLMService.batchAnalyzeResponses).toHaveBeenCalledTimes(5);
    });

    it('should handle large batch processing efficiently', async () => {
      // Setup valid authentication
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
          data: { name: 'Test Org' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { id: 'batch-1' },
          error: null,
        });

      // Mock large batch of responses
      const largeResponseSet = Array.from({ length: 100 }, (_, i) => ({
        id: `resp-${i}`,
        answers: [{ question_id: 'q1', answer: `Test answer ${i}` }],
        survey: {
          id: 'survey-1',
          organization_id: 'org-1',
          questions: [{ id: 'q1', question: 'Test question', category: 'pain' }]
        },
        user: { job_title: 'Developer', department: 'Engineering' }
      }));

      Object.defineProperty(mockSupabase.from().select(), 'eq', {
        value: jest.fn().mockResolvedValue({
          data: largeResponseSet,
          error: null,
        }),
      });

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });
      mockSupabase.from().update().in.mockResolvedValue({ data: null, error: null });

      mockLLMService.batchAnalyzeResponses.mockResolvedValue({
        results: largeResponseSet.map((_, i) => ({
          responseId: `resp-${i}`,
          primaryJtbdForce: 'pain_of_old' as const,
          secondaryJtbdForces: [],
          forceStrengthScore: 3,
          confidenceScore: 4,
          reasoning: 'Test analysis',
          keyThemes: ['test'],
          themeCategories: { process: [], technology: [], people: [], organizational: [] },
          sentimentAnalysis: {
            overallScore: 0,
            sentimentLabel: 'neutral' as const,
            emotionalIndicators: [],
            tone: 'neutral',
          },
          businessImplications: {
            impactLevel: 'medium' as const,
            affectedAreas: [],
            urgency: 'medium' as const,
            businessValue: 'Test value',
          },
          actionableInsights: {
            summaryInsight: 'Test insight',
            detailedAnalysis: 'Test analysis',
            immediateActions: [],
            longTermRecommendations: [],
          },
          qualityIndicators: {
            responseQuality: 'good' as const,
            specificityLevel: 'general' as const,
            actionability: 'medium' as const,
            businessRelevance: 'medium' as const,
          },
          analysisMetadata: {
            processingNotes: '',
            followUpQuestions: [],
            relatedThemes: [],
          },
        })),
        summary: {
          totalProcessed: 100,
          successful: 100,
          failed: 0,
          totalCostCents: 2000,
          totalTokensUsed: 50000,
          processingTimeMs: 45000, // 45 seconds for 100 responses
        },
        errors: [],
      });

      const startTime = Date.now();

      const request = new NextRequest('http://localhost:3000/api/llm/batch', {
        method: 'POST',
        body: JSON.stringify({
          surveyId: 'survey-1',
          options: {
            parallel: true,
            priority: 'high',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.totalProcessed).toBe(100);
      expect(data.summary.successful).toBe(100);
      
      // Should complete within reasonable time (less than 50 seconds for test)
      expect(endTime - startTime).toBeLessThan(50000);
    });
  });
});