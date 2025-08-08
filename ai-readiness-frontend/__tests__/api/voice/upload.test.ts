/**
 * Voice Upload API Endpoint Tests
 * 
 * Tests for POST /api/voice/upload endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/voice/upload/route';
import { createMockFormData, createMockAudioFile } from '@/tests/voice/voice-test-helpers';

// Mock modules
jest.mock('@/lib/auth/middleware', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('@/lib/services/voice-service', () => ({
  createVoiceService: jest.fn(),
}));

jest.mock('@/lib/services/voice-transcription.service', () => ({
  VoiceTranscriptionService: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { createVoiceService } from '@/lib/services/voice-service';
import { VoiceTranscriptionService } from '@/lib/services/voice-transcription.service';
import { createClient } from '@supabase/supabase-js';

const mockGetAuthenticatedUser = getAuthenticatedUser as jest.MockedFunction<typeof getAuthenticatedUser>;
const mockCreateVoiceService = createVoiceService as jest.MockedFunction<typeof createVoiceService>;
const mockVoiceTranscriptionService = VoiceTranscriptionService as jest.MockedClass<typeof VoiceTranscriptionService>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/voice/upload', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user' as const,
    organizationId: 'org-456',
  };

  const mockVoiceService = {
    createRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    mockCreateClient.mockReturnValue({} as any);
    mockCreateVoiceService.mockReturnValue(mockVoiceService as any);
    mockVoiceTranscriptionService.mockImplementation(() => ({}) as any);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: null, error: 'Not authenticated' });

      const formData = createMockFormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 401 when authentication fails', async () => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: null, error: 'Session expired' });

      const formData = createMockFormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Session expired');
    });
  });

  describe('File Validation', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
    });

    it('should return 400 when no file is provided', async () => {
      const formData = new FormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should return 413 when file is too large', async () => {
      const largeFile = createMockAudioFile({
        name: 'large.wav',
        size: 101 * 1024 * 1024, // 101MB (over 100MB limit)
        type: 'audio/wav',
      });

      const formData = new FormData();
      formData.append('file', largeFile);

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error).toBe('File too large');
    });

    it('should return 400 for unsupported file types', async () => {
      const unsupportedFile = createMockAudioFile({
        name: 'test.txt',
        type: 'text/plain',
      });

      const formData = new FormData();
      formData.append('file', unsupportedFile);

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid file');
      expect(data.message).toContain('Invalid file format');
    });

    it('should return 400 for files with malicious names', async () => {
      const maliciousFile = createMockAudioFile({
        name: '../../../etc/passwd',
        type: 'audio/wav',
      });

      const formData = new FormData();
      formData.append('file', maliciousFile);

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid file');
      expect(data.message).toContain('Invalid filename');
    });
  });

  describe('Successful Upload', () => {
    const mockRecording = {
      id: 'recording-789',
      filename: 'test.wav',
      audioUrl: 'https://example.com/audio/test.wav',
      duration: 30.5,
      fileSize: 1024000,
      format: 'wav',
      status: 'completed',
      createdAt: new Date(),
      metadata: {
        sampleRate: 44100,
        bitrate: 128000,
        channels: 1,
      },
    };

    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      mockVoiceService.createRecording.mockResolvedValueOnce(mockRecording);
    });

    it('should successfully upload a valid audio file', async () => {
      const audioFile = createMockAudioFile({
        name: 'test.wav',
        type: 'audio/wav',
        size: 1024000,
      });

      const formData = new FormData();
      formData.append('file', audioFile);

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockRecording.id);
      expect(data.data.filename).toBe(mockRecording.filename);
      expect(data.data.duration).toBe(mockRecording.duration);
      expect(data.message).toBe('Voice recording uploaded successfully');

      expect(mockVoiceService.createRecording).toHaveBeenCalledWith(mockUser.id, audioFile);
    });

    it('should handle metadata from headers', async () => {
      const audioFile = createMockAudioFile();
      const formData = new FormData();
      formData.append('file', audioFile);

      const metadata = {
        sampleRate: 48000,
        bitrate: 256000,
        channels: 2,
      };

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'x-voice-metadata': JSON.stringify(metadata),
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockVoiceService.createRecording).toHaveBeenCalled();
    });

    it('should handle metadata from form data', async () => {
      const audioFile = createMockAudioFile();
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('metadata', JSON.stringify({
        sampleRate: 48000,
        bitrate: 256000,
      }));

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should support different audio formats', async () => {
      const formats = ['audio/wav', 'audio/mp3', 'audio/webm', 'audio/ogg'];

      for (const format of formats) {
        const audioFile = createMockAudioFile({
          name: `test.${format.split('/')[1]}`,
          type: format,
        });

        const formData = new FormData();
        formData.append('file', audioFile);

        const request = new NextRequest('http://localhost:3000/api/voice/upload', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
    });

    it('should handle voice service errors', async () => {
      mockVoiceService.createRecording.mockRejectedValueOnce(new Error('Storage upload failed'));

      const formData = createMockFormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Upload failed');
      expect(data.message).toBe('Storage upload failed');
    });

    it('should handle missing Supabase configuration', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const formData = createMockFormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server configuration error');
    });

    it('should handle invalid metadata gracefully', async () => {
      const audioFile = createMockAudioFile();
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('metadata', 'invalid-json');

      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      // Should still proceed with upload despite invalid metadata
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockGetAuthenticatedUser.mockResolvedValueOnce({ user: mockUser });
      // Disable rate limiting for tests
      process.env.ENABLE_RATE_LIMITING = 'false';
    });

    it('should bypass rate limiting when disabled', async () => {
      const formData = createMockFormData();
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      expect(response.status).not.toBe(429);
    });
  });

  describe('CORS', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const { OPTIONS } = await import('@/app/api/voice/upload/route');
      const request = new NextRequest('http://localhost:3000/api/voice/upload', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    });
  });
});