import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

// Voice Recording Schema - Define this first (TDD Red Phase)
const VoiceRecordingSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  filename: z.string().min(1),
  audioUrl: z.string().url(),
  duration: z.number().positive(),
  fileSize: z.number().positive(),
  format: z.enum(['wav', 'mp3', 'webm', 'ogg']),
  transcription: z.string().optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  metadata: z.object({
    sampleRate: z.number().positive(),
    bitrate: z.number().positive(),
    channels: z.number().int().min(1).max(2),
  }).optional(),
});

// Transcription Segment Schema
const TranscriptionSegmentSchema = z.object({
  id: z.string().uuid(),
  voiceRecordingId: z.string().uuid(),
  text: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  confidence: z.number().min(0).max(1),
  speakerId: z.string().optional(),
  words: z.array(z.object({
    word: z.string(),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    confidence: z.number().min(0).max(1),
  })).optional(),
});

// Voice Quality Metrics Schema
const VoiceQualityMetricsSchema = z.object({
  id: z.string().uuid(),
  voiceRecordingId: z.string().uuid(),
  snr: z.number(), // Signal-to-noise ratio
  volume: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  backgroundNoise: z.number().min(0).max(1),
  speechRate: z.number().positive(), // words per minute
  pauseCount: z.number().int().min(0),
  overallQuality: z.number().min(0).max(1),
  recommendations: z.array(z.string()),
  analyzedAt: z.date(),
});

describe('Voice Schema Validation Tests', () => {
  describe('VoiceRecordingSchema', () => {
    let validVoiceRecording: any;

    beforeEach(() => {
      validVoiceRecording = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        filename: 'recording_001.wav',
        audioUrl: 'https://example.com/audio/recording_001.wav',
        duration: 120.5,
        fileSize: 1048576,
        format: 'wav',
        transcription: 'Hello world, this is a test recording.',
        qualityScore: 0.85,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:05:00Z'),
        status: 'completed',
        metadata: {
          sampleRate: 44100,
          bitrate: 128000,
          channels: 1,
        },
      };
    });

    it('should validate a valid voice recording', () => {
      const result = VoiceRecordingSchema.safeParse(validVoiceRecording);
      expect(result.success).toBe(true);
    });

    it('should fail validation without required fields', () => {
      const invalid = { ...validVoiceRecording };
      delete invalid.id;
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with invalid UUID format', () => {
      const invalid = { ...validVoiceRecording, id: 'not-a-uuid' };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with invalid URL format', () => {
      const invalid = { ...validVoiceRecording, audioUrl: 'not-a-url' };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with negative duration', () => {
      const invalid = { ...validVoiceRecording, duration: -10 };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with zero file size', () => {
      const invalid = { ...validVoiceRecording, fileSize: 0 };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with unsupported format', () => {
      const invalid = { ...validVoiceRecording, format: 'flac' };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with quality score out of range', () => {
      const invalid = { ...validVoiceRecording, qualityScore: 1.5 };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with invalid status', () => {
      const invalid = { ...validVoiceRecording, status: 'unknown' };
      
      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate without optional fields', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        filename: 'recording.wav',
        audioUrl: 'https://example.com/recording.wav',
        duration: 30,
        fileSize: 500000,
        format: 'wav',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'uploading',
      };

      const result = VoiceRecordingSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should validate metadata with proper structure', () => {
      const validWithMetadata = {
        ...validVoiceRecording,
        metadata: {
          sampleRate: 22050,
          bitrate: 64000,
          channels: 2,
        },
      };

      const result = VoiceRecordingSchema.safeParse(validWithMetadata);
      expect(result.success).toBe(true);
    });

    it('should fail validation with invalid metadata channels', () => {
      const invalid = {
        ...validVoiceRecording,
        metadata: {
          sampleRate: 44100,
          bitrate: 128000,
          channels: 3, // Invalid: more than 2 channels
        },
      };

      const result = VoiceRecordingSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('TranscriptionSegmentSchema', () => {
    let validSegment: any;

    beforeEach(() => {
      validSegment = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        voiceRecordingId: '123e4567-e89b-12d3-a456-426614174000',
        text: 'Hello world',
        startTime: 0.5,
        endTime: 2.3,
        confidence: 0.95,
        speakerId: 'speaker_1',
        words: [
          {
            word: 'Hello',
            startTime: 0.5,
            endTime: 1.0,
            confidence: 0.98,
          },
          {
            word: 'world',
            startTime: 1.2,
            endTime: 2.3,
            confidence: 0.92,
          },
        ],
      };
    });

    it('should validate a valid transcription segment', () => {
      const result = TranscriptionSegmentSchema.safeParse(validSegment);
      expect(result.success).toBe(true);
    });

    it('should fail validation with negative start time', () => {
      const invalid = { ...validSegment, startTime: -1 };
      
      const result = TranscriptionSegmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with confidence out of range', () => {
      const invalid = { ...validSegment, confidence: 1.2 };
      
      const result = TranscriptionSegmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate without optional fields', () => {
      const minimal = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        voiceRecordingId: '123e4567-e89b-12d3-a456-426614174000',
        text: 'Hello',
        startTime: 0,
        endTime: 1,
        confidence: 0.8,
      };

      const result = TranscriptionSegmentSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should fail validation with invalid word structure', () => {
      const invalid = {
        ...validSegment,
        words: [
          {
            word: 'Hello',
            startTime: -1, // Invalid negative time
            endTime: 1.0,
            confidence: 0.98,
          },
        ],
      };

      const result = TranscriptionSegmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('VoiceQualityMetricsSchema', () => {
    let validMetrics: any;

    beforeEach(() => {
      validMetrics = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        voiceRecordingId: '123e4567-e89b-12d3-a456-426614174000',
        snr: 25.5,
        volume: 0.7,
        clarity: 0.85,
        backgroundNoise: 0.1,
        speechRate: 150,
        pauseCount: 5,
        overallQuality: 0.8,
        recommendations: ['Reduce background noise', 'Speak closer to microphone'],
        analyzedAt: new Date('2024-01-01T00:10:00Z'),
      };
    });

    it('should validate valid voice quality metrics', () => {
      const result = VoiceQualityMetricsSchema.safeParse(validMetrics);
      expect(result.success).toBe(true);
    });

    it('should fail validation with volume out of range', () => {
      const invalid = { ...validMetrics, volume: 1.5 };
      
      const result = VoiceQualityMetricsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with negative speech rate', () => {
      const invalid = { ...validMetrics, speechRate: -10 };
      
      const result = VoiceQualityMetricsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with negative pause count', () => {
      const invalid = { ...validMetrics, pauseCount: -1 };
      
      const result = VoiceQualityMetricsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail validation with overall quality out of range', () => {
      const invalid = { ...validMetrics, overallQuality: 2.0 };
      
      const result = VoiceQualityMetricsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate with empty recommendations array', () => {
      const validWithEmptyRecommendations = {
        ...validMetrics,
        recommendations: [],
      };

      const result = VoiceQualityMetricsSchema.safeParse(validWithEmptyRecommendations);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maximum file size validation', () => {
      const maxSizeRecording = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        filename: 'large_file.wav',
        audioUrl: 'https://example.com/large_file.wav',
        duration: 3600, // 1 hour
        fileSize: 104857600, // 100MB
        format: 'wav',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
      };

      const result = VoiceRecordingSchema.safeParse(maxSizeRecording);
      expect(result.success).toBe(true);
    });

    it('should handle minimum valid duration', () => {
      const minDurationRecording = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        filename: 'short.wav',
        audioUrl: 'https://example.com/short.wav',
        duration: 0.1, // 100ms
        fileSize: 1000,
        format: 'wav',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
      };

      const result = VoiceRecordingSchema.safeParse(minDurationRecording);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in filename', () => {
      const specialCharRecording = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        filename: 'recording_2024-01-01_10:30:45_user@domain.wav',
        audioUrl: 'https://example.com/recording.wav',
        duration: 30,
        fileSize: 500000,
        format: 'wav',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed',
      };

      const result = VoiceRecordingSchema.safeParse(specialCharRecording);
      expect(result.success).toBe(true);
    });

    it('should handle zero confidence transcription segments', () => {
      const zeroConfidenceSegment = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        voiceRecordingId: '123e4567-e89b-12d3-a456-426614174000',
        text: 'unclear speech',
        startTime: 0,
        endTime: 1,
        confidence: 0, // Minimum confidence
      };

      const result = TranscriptionSegmentSchema.safeParse(zeroConfidenceSegment);
      expect(result.success).toBe(true);
    });

    it('should handle perfect quality metrics', () => {
      const perfectQuality = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        voiceRecordingId: '123e4567-e89b-12d3-a456-426614174000',
        snr: 50,
        volume: 1.0,
        clarity: 1.0,
        backgroundNoise: 0.0,
        speechRate: 180,
        pauseCount: 0,
        overallQuality: 1.0,
        recommendations: [],
        analyzedAt: new Date(),
      };

      const result = VoiceQualityMetricsSchema.safeParse(perfectQuality);
      expect(result.success).toBe(true);
    });
  });
});