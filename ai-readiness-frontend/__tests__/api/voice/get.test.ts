/**
 * Voice Recording Retrieval API Tests
 * 
 * Tests for GET /api/voice/[id] endpoint
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/voice/[id]/route';
import { createMockUser, createMockVoiceRecording, createMockTranscriptionSegments, createMockQualityMetrics } from '@/tests/voice/voice-test-helpers';

// Mock modules
jest.mock('@/lib/auth/middleware', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/services/voice-service', () => ({
  createVoiceService: jest.fn(),
}));

jest.mock('@/services/database/voice-recording.service', () => ({
  createVoiceRecordingService: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { createVoiceService } from '@/lib/services/voice-service';
import { createVoiceRecordingService } from '@/services/database/voice-recording.service';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockCreateVoiceService = createVoiceService as jest.MockedFunction<typeof createVoiceService>;
const mockCreateVoiceRecordingService = createVoiceRecordingService as jest.MockedFunction<typeof createVoiceRecordingService>;

describe('/api/voice/[id]', () => {
  const mockUser = createMockUser();
  const mockRecording = createMockVoiceRecording({ userId: mockUser.id });
  const mockSegments = createMockTranscriptionSegments(mockRecording.id);
  const mockQualityMetrics = createMockQualityMetrics(mockRecording.id);

  const mockVoiceService = {
    getRecording: jest.fn(),
  };

  const mockDbService = {
    getTranscriptionSegments: jest.fn(),
    getQualityMetrics: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

    mockCreateVoiceService.mockReturnValue(mockVoiceService as any);
    mockCreateVoiceRecordingService.mockReturnValue(mockDbService as any);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: null, error: 'Not authenticated' });

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
    });

    it('should return 400 for invalid UUID format', async () => {
      const request = new NextRequest('http://localhost:3000/api/voice/invalid-id');
      const response = await GET(request, { params: { id: 'invalid-id' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });
  });

  describe('Recording Retrieval', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
    });

    it('should return 404 when recording does not exist', async () => {
      mockVoiceService.getRecording.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Recording not found');
    });

    it('should return 403 when user cannot access recording', async () => {
      const otherUserRecording = createMockVoiceRecording({ userId: 'other-user' });
      mockVoiceService.getRecording.mockResolvedValueOnce(otherUserRecording);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should successfully retrieve own recording', async () => {
      mockVoiceService.getRecording.mockResolvedValueOnce(mockRecording);
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockRecording.id);
      expect(data.data.filename).toBe(mockRecording.filename);
    });

    it('should allow system admin to access any recording', async () => {
      const adminUser = createMockUser({ role: 'system_admin' });
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: adminUser });
      mockVoiceService.getRecording.mockResolvedValueOnce(mockRecording);
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      mockVoiceService.getRecording.mockResolvedValueOnce(mockRecording);
    });

    it('should include segments when requested', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce(mockSegments);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?includeSegments=true`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.segments).toHaveLength(2);
      expect(mockDbService.getTranscriptionSegments).toHaveBeenCalledWith(mockRecording.id);
    });

    it('should include quality metrics when requested', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(mockQualityMetrics);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?includeQuality=true`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.qualityMetrics).toBeDefined();
      expect(mockDbService.getQualityMetrics).toHaveBeenCalledWith(mockRecording.id);
    });

    it('should return minimal format when requested', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?format=minimal`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('filename');
      expect(data.data).toHaveProperty('duration');
      expect(data.data).toHaveProperty('status');
      expect(data.data).not.toHaveProperty('audioUrl');
      expect(data.data).not.toHaveProperty('userId');
    });

    it('should return detailed format when requested', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce(mockSegments);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(mockQualityMetrics);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?format=detailed`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveProperty('segments');
      expect(data.data).toHaveProperty('qualityMetrics');
      expect(data.data).toHaveProperty('analytics');
      expect(data.data.analytics).toHaveProperty('segmentCount');
      expect(data.data.analytics).toHaveProperty('averageConfidence');
      expect(data.data.analytics).toHaveProperty('wordCount');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      mockVoiceService.getRecording.mockResolvedValueOnce(mockRecording);
    });

    it('should handle transcription segments fetch failure gracefully', async () => {
      mockDbService.getTranscriptionSegments.mockRejectedValueOnce(new Error('Database error'));
      mockDbService.getQualityMetrics.mockResolvedValueOnce(null);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?includeSegments=true`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.segments).toEqual([]);
    });

    it('should handle quality metrics fetch failure gracefully', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);
      mockDbService.getQualityMetrics.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?includeQuality=true`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.qualityMetrics).toBeNull();
    });

    it('should handle voice service errors', async () => {
      mockVoiceService.getRecording.mockRejectedValueOnce(new Error('Service error'));

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Retrieval failed');
    });
  });

  describe('Analytics Calculation', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      mockVoiceService.getRecording.mockResolvedValueOnce(mockRecording);
      mockDbService.getQualityMetrics.mockResolvedValueOnce(mockQualityMetrics);
    });

    it('should calculate analytics correctly in detailed format', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce(mockSegments);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?format=detailed`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.analytics.segmentCount).toBe(2);
      expect(data.data.analytics.averageConfidence).toBeCloseTo(0.915); // (0.95 + 0.88) / 2
      expect(data.data.analytics.wordCount).toBe(10); // Sum of words in both segments
    });

    it('should handle empty segments in analytics', async () => {
      mockDbService.getTranscriptionSegments.mockResolvedValueOnce([]);

      const request = new NextRequest(`http://localhost:3000/api/voice/${mockRecording.id}?format=detailed`);
      const response = await GET(request, { params: { id: mockRecording.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.analytics.segmentCount).toBe(0);
      expect(data.data.analytics.averageConfidence).toBeNull();
      expect(data.data.analytics.wordCount).toBe(0);
    });
  });
});