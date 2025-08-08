/**
 * Voice Transcription API Tests
 * 
 * Tests for POST /api/voice/transcribe endpoint
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/voice/transcribe/route';
import { createMockUser, createMockVoiceRecording, createMockTranscriptionJob } from '@/tests/voice/voice-test-helpers';

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

describe('/api/voice/transcribe', () => {
  const mockUser = createMockUser();
  const mockRecording = createMockVoiceRecording({ userId: mockUser.id, status: 'completed' });
  const mockTranscriptionResult = {
    id: mockRecording.id,
    transcription: 'Hello, this is a test transcription.',
    status: 'completed',
  };

  const mockVoiceService = {
    processTranscription: jest.fn(),
  };

  const mockDbService = {
    getVoiceRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    mockCreateVoiceService.mockReturnValue(mockVoiceService as any);
    mockCreateVoiceRecordingService.mockReturnValue(mockDbService as any);
  });

  describe('POST /api/voice/transcribe', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: null, error: 'Not authenticated' });

        const requestBody = { recordingId: mockRecording.id };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });
    });

    describe('Request Validation', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      });

      it('should return 400 for invalid recording ID format', async () => {
        const requestBody = { recordingId: 'invalid-id' };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });

      it('should validate transcription options', async () => {
        const requestBody = {
          recordingId: mockRecording.id,
          options: {
            model: 'invalid-model',
            temperature: 2.0, // Invalid range
          },
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid request data');
      });
    });

    describe('Recording Access', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      });

      it('should return 404 when recording does not exist', async () => {
        mockDbService.getVoiceRecording.mockResolvedValueOnce(null);

        const requestBody = { recordingId: mockRecording.id };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Recording not found');
      });

      it('should return 403 when user cannot access recording', async () => {
        const otherUserRecording = createMockVoiceRecording({ userId: 'other-user' });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(otherUserRecording);

        const requestBody = { recordingId: mockRecording.id };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Access denied');
      });

      it('should return 400 when recording is not completed', async () => {
        const processingRecording = createMockVoiceRecording({ 
          userId: mockUser.id, 
          status: 'processing' 
        });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(processingRecording);

        const requestBody = { recordingId: mockRecording.id };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Recording not ready');
      });
    });

    describe('Already Transcribed', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      });

      it('should return existing transcription when already transcribed', async () => {
        const transcribedRecording = createMockVoiceRecording({ 
          userId: mockUser.id, 
          transcription: 'Existing transcription' 
        });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(transcribedRecording);

        const requestBody = { recordingId: mockRecording.id };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('already_completed');
        expect(data.data.transcription).toBe('Existing transcription');
      });

      it('should re-transcribe when force option is provided', async () => {
        const transcribedRecording = createMockVoiceRecording({ 
          userId: mockUser.id, 
          transcription: 'Existing transcription' 
        });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(transcribedRecording);
        mockVoiceService.processTranscription.mockResolvedValueOnce(mockTranscriptionResult);

        const requestBody = { 
          recordingId: mockRecording.id,
          force: true,
          async: false
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.status).toBe('completed');
        expect(mockVoiceService.processTranscription).toHaveBeenCalled();
      });
    });

    describe('Async Processing', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(mockRecording);
      });

      it('should return job ID for async processing', async () => {
        const requestBody = { 
          recordingId: mockRecording.id,
          async: true
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toHaveProperty('jobId');
        expect(data.data.status).toBe('pending');
        expect(data.data).toHaveProperty('statusUrl');
      });
    });

    describe('Sync Processing', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(mockRecording);
        mockVoiceService.processTranscription.mockResolvedValueOnce(mockTranscriptionResult);
      });

      it('should return completed transcription for sync processing', async () => {
        const requestBody = { 
          recordingId: mockRecording.id,
          async: false
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('completed');
        expect(data.data.transcription).toBe(mockTranscriptionResult.transcription);
        expect(mockVoiceService.processTranscription).toHaveBeenCalledWith(mockRecording.id, mockUser.id, {});
      });

      it('should pass transcription options to service', async () => {
        const options = {
          model: 'enhanced',
          language: 'en',
          temperature: 0.2,
        };

        const requestBody = { 
          recordingId: mockRecording.id,
          options,
          async: false
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockVoiceService.processTranscription).toHaveBeenCalledWith(
          mockRecording.id, 
          mockUser.id, 
          expect.objectContaining(options)
        );
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
        mockDbService.getVoiceRecording.mockResolvedValueOnce(mockRecording);
      });

      it('should handle transcription service errors', async () => {
        mockVoiceService.processTranscription.mockRejectedValueOnce(new Error('Transcription service failed'));

        const requestBody = { 
          recordingId: mockRecording.id,
          async: false
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Transcription failed');
        expect(data.message).toBe('Transcription service failed');
      });

      it('should handle transcription already in progress error', async () => {
        mockVoiceService.processTranscription.mockRejectedValueOnce(new Error('Transcription already in progress'));

        const requestBody = { 
          recordingId: mockRecording.id,
          async: false
        };
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe('Transcription in progress');
      });
    });
  });

  describe('GET /api/voice/transcribe (Job Status)', () => {
    describe('Authentication', () => {
      it('should return 401 when user is not authenticated', async () => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: null, error: 'Not authenticated' });

        const request = new NextRequest('http://localhost:3000/api/voice/transcribe?jobId=job-123');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Authentication required');
      });
    });

    describe('Job Status Retrieval', () => {
      beforeEach(() => {
        mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      });

      it('should return 400 when job ID is missing', async () => {
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing job ID');
      });

      it('should return 404 when job does not exist', async () => {
        const request = new NextRequest('http://localhost:3000/api/voice/transcribe?jobId=non-existent');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Job not found');
      });
    });
  });
});