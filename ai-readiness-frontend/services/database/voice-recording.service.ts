/**
 * Voice Recording Database Service
 * 
 * This service provides all database operations for voice recordings,
 * transcription segments, and quality metrics using Supabase as the backend.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Database table schemas for validation
const VoiceRecordingTableSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  filename: z.string().min(1),
  audioUrl: z.string().url(),
  duration: z.number().positive(),
  fileSize: z.number().positive(),
  format: z.enum(['wav', 'mp3', 'webm', 'ogg']),
  transcription: z.string().nullable().optional(),
  qualityScore: z.number().min(0).max(1).nullable().optional(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
  metadata: z.object({
    sampleRate: z.number().positive(),
    bitrate: z.number().positive(),
    channels: z.number().int().min(1).max(2),
  }).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const TranscriptionSegmentTableSchema = z.object({
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const VoiceQualityMetricsTableSchema = z.object({
  id: z.string().uuid(),
  voiceRecordingId: z.string().uuid(),
  snr: z.number(),
  volume: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  backgroundNoise: z.number().min(0).max(1),
  speechRate: z.number().positive(),
  pauseCount: z.number().int().min(0),
  overallQuality: z.number().min(0).max(1),
  recommendations: z.array(z.string()),
  analyzedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Type definitions
export type VoiceRecordingStatus = 'uploading' | 'processing' | 'completed' | 'failed';
export type VoiceRecordingFormat = 'wav' | 'mp3' | 'webm' | 'ogg';

export interface VoiceRecording {
  id: string;
  userId: string;
  filename: string;
  audioUrl: string;
  duration: number;
  fileSize: number;
  format: VoiceRecordingFormat;
  transcription?: string | null;
  qualityScore?: number | null;
  status: VoiceRecordingStatus;
  metadata?: {
    sampleRate: number;
    bitrate: number;
    channels: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionSegment {
  id: string;
  voiceRecordingId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speakerId?: string;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceQualityMetrics {
  id: string;
  voiceRecordingId: string;
  snr: number;
  volume: number;
  clarity: number;
  backgroundNoise: number;
  speechRate: number;
  pauseCount: number;
  overallQuality: number;
  recommendations: string[];
  analyzedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceRecordingFilters {
  userId?: string;
  status?: VoiceRecordingStatus;
  format?: VoiceRecordingFormat;
  hasTranscription?: boolean;
  hasQualityScore?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  minDuration?: number;
  maxDuration?: number;
  minQualityScore?: number;
  maxQualityScore?: number;
}

export interface VoiceRecordingQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'duration' | 'qualityScore';
  orderDirection?: 'asc' | 'desc';
}

export class VoiceRecordingService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ============================================================================
  // VOICE RECORDING OPERATIONS
  // ============================================================================

  /**
   * Create a new voice recording record
   */
  async createVoiceRecording(data: Omit<VoiceRecording, 'id' | 'createdAt' | 'updatedAt'>): Promise<VoiceRecording> {
    try {
      const recordingData = {
        userId: data.userId,
        filename: data.filename,
        audioUrl: data.audioUrl,
        duration: data.duration,
        fileSize: data.fileSize,
        format: data.format,
        transcription: data.transcription || null,
        qualityScore: data.qualityScore || null,
        status: data.status,
        metadata: data.metadata || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate data before insert
      VoiceRecordingTableSchema.omit({ id: true }).parse(recordingData);

      const { data: recording, error } = await this.supabase
        .from('voice_recordings')
        .insert(recordingData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!recording) {
        throw new Error('Failed to create voice recording');
      }

      return this.mapToVoiceRecording(recording);

    } catch (error) {
      console.error('Error creating voice recording:', error);
      throw new Error(`Failed to create voice recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get voice recording by ID
   */
  async getVoiceRecording(recordingId: string): Promise<VoiceRecording | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return this.mapToVoiceRecording(data);

    } catch (error) {
      console.error('Error fetching voice recording:', error);
      throw new Error(`Failed to fetch voice recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update voice recording
   */
  async updateVoiceRecording(
    recordingId: string,
    updates: Partial<Omit<VoiceRecording, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<VoiceRecording> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('voice_recordings')
        .update(updateData)
        .eq('id', recordingId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Voice recording not found');
      }

      return this.mapToVoiceRecording(data);

    } catch (error) {
      console.error('Error updating voice recording:', error);
      throw new Error(`Failed to update voice recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete voice recording
   */
  async deleteVoiceRecording(recordingId: string): Promise<void> {
    try {
      // First, delete related transcription segments and quality metrics
      await Promise.all([
        this.deleteTranscriptionSegmentsByRecording(recordingId),
        this.deleteQualityMetricsByRecording(recordingId),
      ]);

      // Then delete the recording
      const { error } = await this.supabase
        .from('voice_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Error deleting voice recording:', error);
      throw new Error(`Failed to delete voice recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List voice recordings with filters and pagination
   */
  async listVoiceRecordings(
    filters: VoiceRecordingFilters = {},
    options: VoiceRecordingQueryOptions = {}
  ): Promise<{ data: VoiceRecording[]; total: number }> {
    try {
      let query = this.supabase.from('voice_recordings').select('*', { count: 'exact' });

      // Apply filters
      if (filters.userId) {
        query = query.eq('userId', filters.userId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.format) {
        query = query.eq('format', filters.format);
      }
      if (filters.hasTranscription !== undefined) {
        query = filters.hasTranscription
          ? query.not('transcription', 'is', null)
          : query.is('transcription', null);
      }
      if (filters.hasQualityScore !== undefined) {
        query = filters.hasQualityScore
          ? query.not('qualityScore', 'is', null)
          : query.is('qualityScore', null);
      }
      if (filters.createdAfter) {
        query = query.gte('createdAt', filters.createdAfter);
      }
      if (filters.createdBefore) {
        query = query.lte('createdAt', filters.createdBefore);
      }
      if (filters.minDuration !== undefined) {
        query = query.gte('duration', filters.minDuration);
      }
      if (filters.maxDuration !== undefined) {
        query = query.lte('duration', filters.maxDuration);
      }
      if (filters.minQualityScore !== undefined) {
        query = query.gte('qualityScore', filters.minQualityScore);
      }
      if (filters.maxQualityScore !== undefined) {
        query = query.lte('qualityScore', filters.maxQualityScore);
      }

      // Apply ordering
      const orderBy = options.orderBy || 'createdAt';
      const orderDirection = options.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, (options.offset) + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        data: (data || []).map(record => this.mapToVoiceRecording(record)),
        total: count || 0
      };

    } catch (error) {
      console.error('Error listing voice recordings:', error);
      throw new Error(`Failed to list voice recordings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update recording status
   */
  async updateRecordingStatus(recordingId: string, status: VoiceRecordingStatus): Promise<VoiceRecording> {
    return this.updateVoiceRecording(recordingId, { status });
  }

  // ============================================================================
  // TRANSCRIPTION SEGMENT OPERATIONS
  // ============================================================================

  /**
   * Create transcription segments for a recording
   */
  async createTranscriptionSegments(segments: Omit<TranscriptionSegment, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<TranscriptionSegment[]> {
    try {
      const segmentData = segments.map(segment => ({
        ...segment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const { data, error } = await this.supabase
        .from('transcription_segments')
        .insert(segmentData)
        .select();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Failed to create transcription segments');
      }

      return data.map(this.mapToTranscriptionSegment);

    } catch (error) {
      console.error('Error creating transcription segments:', error);
      throw new Error(`Failed to create transcription segments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transcription segments for a recording
   */
  async getTranscriptionSegments(voiceRecordingId: string): Promise<TranscriptionSegment[]> {
    try {
      const { data, error } = await this.supabase
        .from('transcription_segments')
        .select('*')
        .eq('voiceRecordingId', voiceRecordingId)
        .order('startTime', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToTranscriptionSegment);

    } catch (error) {
      console.error('Error fetching transcription segments:', error);
      throw new Error(`Failed to fetch transcription segments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete transcription segments for a recording
   */
  async deleteTranscriptionSegmentsByRecording(voiceRecordingId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('transcription_segments')
        .delete()
        .eq('voiceRecordingId', voiceRecordingId);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Error deleting transcription segments:', error);
      throw new Error(`Failed to delete transcription segments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // QUALITY METRICS OPERATIONS
  // ============================================================================

  /**
   * Create quality metrics for a recording
   */
  async createQualityMetrics(data: Omit<VoiceQualityMetrics, 'id' | 'createdAt' | 'updatedAt'>): Promise<VoiceQualityMetrics> {
    try {
      const metricsData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Validate data before insert
      VoiceQualityMetricsTableSchema.omit({ id: true }).parse(metricsData);

      const { data: metrics, error } = await this.supabase
        .from('voice_quality_metrics')
        .insert(metricsData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!metrics) {
        throw new Error('Failed to create quality metrics');
      }

      return this.mapToQualityMetrics(metrics);

    } catch (error) {
      console.error('Error creating quality metrics:', error);
      throw new Error(`Failed to create quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get quality metrics for a recording
   */
  async getQualityMetrics(voiceRecordingId: string): Promise<VoiceQualityMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_quality_metrics')
        .select('*')
        .eq('voiceRecordingId', voiceRecordingId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return this.mapToQualityMetrics(data);

    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      throw new Error(`Failed to fetch quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update quality metrics
   */
  async updateQualityMetrics(
    voiceRecordingId: string,
    updates: Partial<Omit<VoiceQualityMetrics, 'id' | 'voiceRecordingId' | 'createdAt' | 'updatedAt'>>
  ): Promise<VoiceQualityMetrics> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('voice_quality_metrics')
        .update(updateData)
        .eq('voiceRecordingId', voiceRecordingId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Quality metrics not found');
      }

      return this.mapToQualityMetrics(data);

    } catch (error) {
      console.error('Error updating quality metrics:', error);
      throw new Error(`Failed to update quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete quality metrics for a recording
   */
  async deleteQualityMetricsByRecording(voiceRecordingId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('voice_quality_metrics')
        .delete()
        .eq('voiceRecordingId', voiceRecordingId);

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Error deleting quality metrics:', error);
      throw new Error(`Failed to delete quality metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // ANALYTICS AND REPORTING
  // ============================================================================

  /**
   * Get recording statistics for a user
   */
  async getUserRecordingStats(userId: string): Promise<{
    totalRecordings: number;
    completedRecordings: number;
    totalDuration: number;
    averageQuality: number;
    transcriptionRate: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('voice_recordings')
        .select('duration, qualityScore, transcription, status')
        .eq('userId', userId);

      if (error) {
        throw error;
      }

      const recordings = data || [];
      const totalRecordings = recordings.length;
      const completedRecordings = recordings.filter(r => r.status === 'completed').length;
      const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
      
      const qualityScores = recordings
        .map(r => r.qualityScore)
        .filter(score => score !== null && score !== undefined) as number[];
      const averageQuality = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : 0;

      const transcribedCount = recordings.filter(r => r.transcription).length;
      const transcriptionRate = totalRecordings > 0 ? transcribedCount / totalRecordings : 0;

      return {
        totalRecordings,
        completedRecordings,
        totalDuration,
        averageQuality,
        transcriptionRate,
      };

    } catch (error) {
      console.error('Error fetching user recording stats:', error);
      throw new Error(`Failed to fetch user recording stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private mapToVoiceRecording(record: any): VoiceRecording {
    return {
      id: record.id,
      userId: record.userId || record.user_id,
      filename: record.filename,
      audioUrl: record.audioUrl || record.audio_url,
      duration: record.duration,
      fileSize: record.fileSize || record.file_size,
      format: record.format,
      transcription: record.transcription,
      qualityScore: record.qualityScore || record.quality_score,
      status: record.status,
      metadata: record.metadata,
      createdAt: record.createdAt || record.created_at,
      updatedAt: record.updatedAt || record.updated_at,
    };
  }

  private mapToTranscriptionSegment(record: any): TranscriptionSegment {
    return {
      id: record.id,
      voiceRecordingId: record.voiceRecordingId || record.voice_recording_id,
      text: record.text,
      startTime: record.startTime || record.start_time,
      endTime: record.endTime || record.end_time,
      confidence: record.confidence,
      speakerId: record.speakerId || record.speaker_id,
      words: record.words,
      createdAt: record.createdAt || record.created_at,
      updatedAt: record.updatedAt || record.updated_at,
    };
  }

  private mapToQualityMetrics(record: any): VoiceQualityMetrics {
    return {
      id: record.id,
      voiceRecordingId: record.voiceRecordingId || record.voice_recording_id,
      snr: record.snr,
      volume: record.volume,
      clarity: record.clarity,
      backgroundNoise: record.backgroundNoise || record.background_noise,
      speechRate: record.speechRate || record.speech_rate,
      pauseCount: record.pauseCount || record.pause_count,
      overallQuality: record.overallQuality || record.overall_quality,
      recommendations: record.recommendations,
      analyzedAt: record.analyzedAt || record.analyzed_at,
      createdAt: record.createdAt || record.created_at,
      updatedAt: record.updatedAt || record.updated_at,
    };
  }
}

// Factory function for creating service instances
export const createVoiceRecordingService = (
  supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: string = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
) => {
  return new VoiceRecordingService(supabaseUrl, supabaseKey);
};