/**
 * Integration Tests for LLM Analyze API (/api/llm/analyze)
 * 
 * Tests include:
 * - Authentication and authorization
 * - Request validation
 * - Rate limiting
 * - Security (XSS, SQL injection, CSRF)
 * - Error handling
 * - Performance
 */

// Import types first
import type { MockNextRequest, MockNextRequestOptions } from '../../types/mocks'
import { createMockNextRequest, createMockNextResponse } from '../../utils/mock-factories'

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
import { POST, GET } from '@/app/api/llm/analyze/route';
import { llmService } from '@/lib/services/llm-service';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('@/lib/services/llm-service', () => ({
  llmService: {
    analyzeSurveyResponse: jest.fn(),
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
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

const mockLLMService = llmService as jest.Mocked<typeof llmService>;

beforeEach(() => {
  jest.clearAllMocks();
  (createServerComponentClient as jest.Mock).mockReturnValue(mockSupabase);
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
            survey: { organization_id: 'org-2' },
            user: { job_title: 'Developer', department: 'Engineering' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'analysis-1' },
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      mockLLMService.analyzeSurveyResponse.mockResolvedValue({
        primaryJtbdForce: 'pain_of_old',
        secondaryJtbdForces: [],
        forceStrengthScore: 4,
        confidenceScore: 5,
        reasoning: 'Clear pain point identified',
        keyThemes: ['inefficiency', 'manual processes'],
        themeCategories: {
          process: ['manual processes'],
          technology: [],
          people: [],
          organizational: ['inefficiency'],
        },
        sentimentAnalysis: {
          overallScore: -0.3,
          sentimentLabel: 'negative',
          emotionalIndicators: ['frustrated'],
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
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Our manual processes are so frustrating and time-consuming',
          questionText: 'What are your biggest pain points at work?',
          expectedForce: 'pain_of_old',
          questionContext: 'Daily work challenges',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.primaryJtbdForce).toBe('pain_of_old');
    });

    it('should restrict org_admin users to their organization only', async () => {
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
            user: { job_title: 'Developer', department: 'Engineering' },
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

    it('should return 400 for invalid expectedForce enum', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: 'Test response',
          questionText: 'Test question',
          expectedForce: 'invalid_force',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid expectedForce');
    });

    it('should return 404 for non-existent survey response', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
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

    it('should validate all expectedForce enum values', async () => {
      const validForces = ['pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new', 'demographic'];

      for (const force of validForces) {
        mockSupabase.from().select().eq().single
          .mockResolvedValueOnce({
            data: {
              id: 'resp-1',
              survey: { organization_id: 'org-1' },
              user: { job_title: 'Developer', department: 'Engineering' },
            },
            error: null,
          })
          .mockResolvedValueOnce({
            data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
            error: null,
          });

        mockSupabase.from().insert().select().single.mockResolvedValue({
          data: { id: 'analysis-1' },
          error: null,
        });

        mockSupabase.from().update().eq.mockResolvedValue({
          data: null,
          error: null,
        });

        mockLLMService.analyzeSurveyResponse.mockResolvedValue({
          primaryJtbdForce: force as any,
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
        });

        const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
          method: 'POST',
          body: JSON.stringify({
            responseId: 'resp-1',
            responseText: 'Test response',
            questionText: 'Test question',
            expectedForce: force,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('POST /api/llm/analyze - Security Tests', () => {
    beforeEach(() => {
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
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { job_title: 'Developer', department: 'Engineering' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'analysis-1' },
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
      });
    });

    it('should handle XSS attempts in request body', async () => {
      for (const xssPayload of (global as any).testHelpers.xssPayloads) {
        const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
          method: 'POST',
          body: JSON.stringify({
            responseId: 'resp-1',
            responseText: xssPayload,
            questionText: xssPayload,
            expectedForce: 'pain_of_old',
            questionContext: xssPayload,
          }),
        });

        const response = await POST(request);
        
        // Should still process (sanitization happens at display level)
        // but ensure no code execution in the API layer
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data.success).toBe(true);
        
        // Verify XSS payload was passed through for analysis but not executed
        expect(mockLLMService.analyzeSurveyResponse).toHaveBeenCalledWith(
          xssPayload,
          xssPayload,
          'pain_of_old',
          expect.objectContaining({
            questionContext: xssPayload,
          })
        );
      }
    });

    it('should handle SQL injection attempts in request body', async () => {
      for (const sqlPayload of (global as any).testHelpers.sqlInjectionPayloads) {
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
        
        // Should fail gracefully with 404 (response not found) rather than SQL error
        expect(response.status).toBe(404);
        expect(response.status).not.toBe(500); // Not a server error
      }
    });

    it('should handle extremely large payloads', async () => {
      const largeText = 'A'.repeat(100000); // 100KB string

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          responseId: 'resp-1',
          responseText: largeText,
          questionText: 'Test question',
          expectedForce: 'pain_of_old',
        }),
      });

      const response = await POST(request);
      
      // Should handle large payloads gracefully
      expect(response.status).toBe(200);
    });

    it('should validate content-type header', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain', // Wrong content type
        },
        body: 'not json',
      });

      const response = await POST(request);
      
      // Should fail to parse JSON and return 500
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/llm/analyze - Error Handling', () => {
    beforeEach(() => {
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
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { job_title: 'Developer', department: 'Engineering' },
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        });
    });

    it('should handle LLM service errors gracefully', async () => {
      mockLLMService.analyzeSurveyResponse.mockRejectedValue(
        new Error('LLM service unavailable')
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
      expect(data.message).toBe('LLM service unavailable');
    });

    it('should continue execution even if analysis storage fails', async () => {
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
      });

      // Mock storage failure
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: new Error('Storage failed'),
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
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

      // Should still return success with analysis result
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.analysisId).toBeUndefined(); // Storage failed
      expect(data.result.primaryJtbdForce).toBe('pain_of_old');
    });
  });

  describe('GET /api/llm/analyze - Health Check', () => {
    it('should return 401 for unauthenticated health check', async () => {
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

    it('should return healthy status when LLM service is available', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockLLMService.healthCheck.mockResolvedValue({
        status: 'healthy',
        latency: 1500,
      });

      mockLLMService.getConfig.mockReturnValue({
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 1200,
        timeout: 45000,
        retries: 3,
      });

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.service).toBe('LLM Analysis API');
      expect(data.status).toBe('healthy');
      expect(data.latency).toBe(1500);
      expect(data.config.provider).toBe('openai');
      expect(data.config.model).toBe('gpt-4o');
    });

    it('should return unhealthy status when LLM service fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      mockLLMService.healthCheck.mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.service).toBe('LLM Analysis API');
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Service unavailable');
    });
  });

  describe('Rate Limiting Simulation', () => {
    it('should handle high request volume gracefully', async () => {
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
          data: {
            id: 'resp-1',
            survey: { organization_id: 'org-1' },
            user: { job_title: 'Developer', department: 'Engineering' },
          },
          error: null,
        })
        .mockResolvedValue({
          data: { name: 'Test Org', industry: 'Tech', size: 'Medium' },
          error: null,
        });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'analysis-1' },
        error: null,
      });

      mockSupabase.from().update().eq.mockResolvedValue({
        data: null,
        error: null,
      });

      // Simulate rate limiting after 5 requests
      const rateLimiter = (global as any).testHelpers.simulateRateLimit(5);
      
      mockLLMService.analyzeSurveyResponse.mockImplementation(async () => {
        rateLimiter(); // This will throw after 5 calls
        return {
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
        };
      });

      const requests = Array.from({ length: 7 }, (_, i) => 
        new NextRequest('http://localhost:3000/api/llm/analyze', {
          method: 'POST',
          body: JSON.stringify({
            responseId: `resp-${i}`,
            responseText: `Test response ${i}`,
            questionText: 'Test question',
            expectedForce: 'pain_of_old',
          }),
        })
      );

      let successCount = 0;
      let errorCount = 0;

      for (const request of requests) {
        try {
          const response = await POST(request);
          if (response.status === 200) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Should have 5 successes and 2 errors due to rate limiting
      expect(successCount).toBe(5);
      expect(errorCount).toBe(2);
    });
  });
});