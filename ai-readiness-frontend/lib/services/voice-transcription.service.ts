/**
 * Voice Transcription Service
 * 
 * This service handles integration with transcription APIs (OpenAI Whisper, etc.),
 * provides fallback transcription handling, segment processing, and language detection.
 */

import { z } from 'zod';

// Configuration schemas
const TranscriptionConfigSchema = z.object({
  provider: z.enum(['openai', 'assembly', 'google', 'aws']),
  apiKey: z.string().min(1),
  model: z.string().optional(),
  language: z.string().optional(),
  enableWordTimestamps: z.boolean().default(true),
  enableSpeakerDiarization: z.boolean().default(false),
  maxRetries: z.number().min(1).max(5).default(3),
  retryDelay: z.number().min(100).max(10000).default(1000),
});

// Response schemas
const TranscriptionSegmentSchema = z.object({
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

const TranscriptionResultSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  duration: z.number().positive().optional(),
  segments: z.array(TranscriptionSegmentSchema),
});

const QualityAnalysisSchema = z.object({
  snr: z.number(),
  volume: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  backgroundNoise: z.number().min(0).max(1),
  speechRate: z.number().positive(),
  pauseCount: z.number().int().min(0),
  overallQuality: z.number().min(0).max(1),
  recommendations: z.array(z.string()),
});

// Type definitions
export type TranscriptionProvider = 'openai' | 'assembly' | 'google' | 'aws';

export interface TranscriptionConfig {
  provider: TranscriptionProvider;
  apiKey: string;
  model?: string;
  language?: string;
  enableWordTimestamps?: boolean;
  enableSpeakerDiarization?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface TranscriptionSegment {
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
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  confidence?: number;
  duration?: number;
  segments: TranscriptionSegment[];
}

export interface QualityAnalysis {
  snr: number;
  volume: number;
  clarity: number;
  backgroundNoise: number;
  speechRate: number;
  pauseCount: number;
  overallQuality: number;
  recommendations: string[];
}

// Provider-specific interfaces
interface OpenAITranscriptionResponse {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    avg_logprob: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      probability: number;
    }>;
  }>;
  language?: string;
}

interface AssemblyAITranscriptionResponse {
  text: string;
  confidence: number;
  audio_duration: number;
  language_code?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
}

export class VoiceTranscriptionService {
  private config: TranscriptionConfig;
  private fallbackProviders: TranscriptionProvider[];

  constructor(config: TranscriptionConfig) {
    this.config = TranscriptionConfigSchema.parse(config);
    this.fallbackProviders = this.getFallbackProviders(config.provider);
  }

  /**
   * Transcribe audio from URL with fallback support
   */
  async transcribe(audioUrl: string, options?: Partial<TranscriptionConfig>): Promise<TranscriptionResult> {
    const finalConfig = { ...this.config, ...options };
    let lastError: Error | null = null;
    
    // Try primary provider
    try {
      const result = await this.transcribeWithProvider(audioUrl, finalConfig.provider, finalConfig);
      return TranscriptionResultSchema.parse(result);
    } catch (error) {
      console.warn(`Primary provider ${finalConfig.provider} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }

    // Try fallback providers
    for (const fallbackProvider of this.fallbackProviders) {
      try {
        const fallbackConfig = { ...finalConfig, provider: fallbackProvider };
        const result = await this.transcribeWithProvider(audioUrl, fallbackProvider, fallbackConfig);
        return TranscriptionResultSchema.parse(result);
      } catch (error) {
        console.warn(`Fallback provider ${fallbackProvider} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    // If all providers fail, throw the last error
    throw new Error(`All transcription providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Analyze quality of audio recording
   */
  async analyzeQuality(audioUrl: string): Promise<QualityAnalysis> {
    try {
      // This would typically involve downloading and analyzing the audio file
      // For now, we'll simulate quality analysis based on file characteristics
      const analysis = await this.performQualityAnalysis(audioUrl);
      return QualityAnalysisSchema.parse(analysis);
    } catch (error) {
      console.error('Error analyzing audio quality:', error);
      throw new Error(`Failed to analyze quality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect language of audio content
   */
  async detectLanguage(audioUrl: string): Promise<string> {
    try {
      // Use transcription with language detection enabled
      const result = await this.transcribe(audioUrl, { 
        language: undefined // Auto-detect
      });
      return result.language || 'en';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'en'; // Default to English
    }
  }

  /**
   * Batch transcribe multiple audio files
   */
  async batchTranscribe(audioUrls: string[]): Promise<Array<{ url: string; result?: TranscriptionResult; error?: string }>> {
    const results = await Promise.allSettled(
      audioUrls.map(async (url) => ({
        url,
        result: await this.transcribe(url)
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: audioUrls[index],
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async transcribeWithProvider(
    audioUrl: string,
    provider: TranscriptionProvider,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < config.maxRetries!) {
      try {
        switch (provider) {
          case 'openai':
            return await this.transcribeWithOpenAI(audioUrl, config);
          case 'assembly':
            return await this.transcribeWithAssemblyAI(audioUrl, config);
          case 'google':
            return await this.transcribeWithGoogleCloud(audioUrl, config);
          case 'aws':
            return await this.transcribeWithAWS(audioUrl, config);
          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempts < config.maxRetries!) {
          // Wait before retry with exponential backoff
          const delay = config.retryDelay! * Math.pow(2, attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${config.maxRetries} attempts`);
  }

  private async transcribeWithOpenAI(audioUrl: string, config: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      // Download audio file first (OpenAI requires file upload)
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
      }

      const audioBlob = await audioResponse.blob();
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('model', config.model || 'whisper-1');
      formData.append('response_format', 'verbose_json');
      
      if (config.language) {
        formData.append('language', config.language);
      }
      if (config.enableWordTimestamps) {
        formData.append('timestamp_granularities[]', 'word');
      }

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data: OpenAITranscriptionResponse = await response.json();
      return this.mapOpenAIResponse(data);

    } catch (error) {
      console.error('OpenAI transcription error:', error);
      throw new Error(`OpenAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transcribeWithAssemblyAI(audioUrl: string, config: TranscriptionConfig): Promise<TranscriptionResult> {
    try {
      // Submit transcription job
      const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: config.language || 'en',
          word_boost: [],
          boost_param: 'default',
          filter_profanity: false,
          redact_pii: false,
          speaker_labels: config.enableSpeakerDiarization,
          content_safety: false,
          iab_categories: false,
          language_detection: !config.language,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.text();
        throw new Error(`AssemblyAI submit error: ${error}`);
      }

      const submitData = await submitResponse.json();
      const transcriptId = submitData.id;

      // Poll for completion
      let attempts = 0;
      const maxPollingAttempts = 120; // 10 minutes with 5s intervals

      while (attempts < maxPollingAttempts) {
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': config.apiKey,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`AssemblyAI status check failed: ${statusResponse.statusText}`);
        }

        const statusData: AssemblyAITranscriptionResponse = await statusResponse.json();
        
        if (statusData.text && statusData.confidence !== undefined) {
          return this.mapAssemblyAIResponse(statusData);
        }

        if (attempts >= maxPollingAttempts - 1) {
          throw new Error('AssemblyAI transcription timed out');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }

      throw new Error('AssemblyAI transcription timed out');

    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw new Error(`AssemblyAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transcribeWithGoogleCloud(audioUrl: string, config: TranscriptionConfig): Promise<TranscriptionResult> {
    // Placeholder for Google Cloud Speech-to-Text implementation
    throw new Error('Google Cloud Speech-to-Text not implemented yet');
  }

  private async transcribeWithAWS(audioUrl: string, config: TranscriptionConfig): Promise<TranscriptionResult> {
    // Placeholder for AWS Transcribe implementation
    throw new Error('AWS Transcribe not implemented yet');
  }

  private async performQualityAnalysis(audioUrl: string): Promise<QualityAnalysis> {
    try {
      // This is a simplified quality analysis simulation
      // In a real implementation, this would:
      // 1. Download and analyze the audio file
      // 2. Calculate actual SNR, volume levels, etc.
      // 3. Detect background noise, speech rate, pauses
      
      // For now, simulate analysis based on URL characteristics
      const urlLength = audioUrl.length;
      const randomSeed = urlLength % 100;

      // Generate somewhat realistic but deterministic metrics
      const snr = 15 + (randomSeed % 20); // 15-35 dB
      const volume = 0.6 + (randomSeed % 40) / 100; // 0.6-0.99
      const clarity = 0.7 + (randomSeed % 25) / 100; // 0.7-0.94
      const backgroundNoise = 0.05 + (randomSeed % 15) / 100; // 0.05-0.19
      const speechRate = 120 + (randomSeed % 60); // 120-180 WPM
      const pauseCount = Math.floor(randomSeed / 10); // 0-9 pauses

      // Calculate overall quality score
      const qualityFactors = [
        Math.min(snr / 25, 1), // Normalize SNR (25dB = perfect)
        volume,
        clarity,
        1 - backgroundNoise, // Lower noise = higher quality
        Math.min(speechRate / 150, 1), // Optimal around 150 WPM
      ];
      const overallQuality = qualityFactors.reduce((sum, factor) => sum + factor, 0) / qualityFactors.length;

      // Generate recommendations based on metrics
      const recommendations: string[] = [];
      if (snr < 20) recommendations.push('Consider using a quieter environment');
      if (volume < 0.7) recommendations.push('Speak closer to the microphone');
      if (clarity < 0.8) recommendations.push('Ensure clear articulation');
      if (backgroundNoise > 0.15) recommendations.push('Reduce background noise');
      if (speechRate < 100 || speechRate > 180) recommendations.push('Adjust speaking pace');
      if (pauseCount > 6) recommendations.push('Try to maintain consistent speech flow');

      if (recommendations.length === 0) {
        recommendations.push('Good quality recording');
      }

      return {
        snr,
        volume,
        clarity,
        backgroundNoise,
        speechRate,
        pauseCount,
        overallQuality,
        recommendations,
      };

    } catch (error) {
      console.error('Error performing quality analysis:', error);
      
      // Return default/fallback analysis
      return {
        snr: 20,
        volume: 0.8,
        clarity: 0.8,
        backgroundNoise: 0.1,
        speechRate: 150,
        pauseCount: 2,
        overallQuality: 0.75,
        recommendations: ['Quality analysis unavailable - using default metrics'],
      };
    }
  }

  private mapOpenAIResponse(data: OpenAITranscriptionResponse): TranscriptionResult {
    const segments: TranscriptionSegment[] = (data.segments || []).map(segment => ({
      text: segment.text,
      startTime: segment.start,
      endTime: segment.end,
      confidence: Math.exp(segment.avg_logprob), // Convert log probability to confidence
      words: segment.words?.map(word => ({
        word: word.word,
        startTime: word.start,
        endTime: word.end,
        confidence: word.probability,
      })),
    }));

    return {
      text: data.text,
      language: data.language,
      segments,
    };
  }

  private mapAssemblyAIResponse(data: AssemblyAITranscriptionResponse): TranscriptionResult {
    const segments: TranscriptionSegment[] = (data.segments || []).map(segment => ({
      text: segment.text,
      startTime: segment.start / 1000, // Convert ms to seconds
      endTime: segment.end / 1000,
      confidence: segment.confidence,
      speakerId: segment.speaker,
    }));

    return {
      text: data.text,
      language: data.language_code,
      confidence: data.confidence,
      duration: data.audio_duration,
      segments,
    };
  }

  private getFallbackProviders(primaryProvider: TranscriptionProvider): TranscriptionProvider[] {
    const allProviders: TranscriptionProvider[] = ['openai', 'assembly', 'google', 'aws'];
    return allProviders.filter(provider => provider !== primaryProvider);
  }
}

// Factory functions for different configurations
export const createOpenAITranscriptionService = (apiKey: string, options?: Partial<TranscriptionConfig>) => {
  return new VoiceTranscriptionService({
    provider: 'openai',
    apiKey,
    model: 'whisper-1',
    enableWordTimestamps: true,
    maxRetries: 3,
    retryDelay: 1000,
    ...options,
  });
};

export const createAssemblyAITranscriptionService = (apiKey: string, options?: Partial<TranscriptionConfig>) => {
  return new VoiceTranscriptionService({
    provider: 'assembly',
    apiKey,
    enableWordTimestamps: true,
    enableSpeakerDiarization: true,
    maxRetries: 3,
    retryDelay: 1000,
    ...options,
  });
};

// Default service factory (can be configured via environment variables)
export const createDefaultTranscriptionService = () => {
  const provider = (process.env.TRANSCRIPTION_PROVIDER as TranscriptionProvider) || 'openai';
  const apiKey = process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Transcription API key not configured');
  }

  return new VoiceTranscriptionService({
    provider,
    apiKey,
    model: provider === 'openai' ? 'whisper-1' : undefined,
    enableWordTimestamps: true,
    enableSpeakerDiarization: provider === 'assembly',
    maxRetries: 3,
    retryDelay: 1000,
  });
};