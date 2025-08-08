/**
 * Legacy Transcription Service Export
 * 
 * This file provides backward compatibility for tests and other imports
 * that expect the transcription service to be available at this location.
 */

export { 
  VoiceTranscriptionService as TranscriptionService,
  createDefaultTranscriptionService as createTranscriptionService,
  createOpenAITranscriptionService,
  createAssemblyAITranscriptionService,
  type TranscriptionResult,
  type TranscriptionSegment,
  type QualityAnalysis,
  type TranscriptionConfig,
  type TranscriptionProvider
} from './voice-transcription.service';

// Export a default instance factory for simple usage
export default {
  transcribe: async (audioUrl: string) => {
    // Mock implementation for tests
    return {
      text: 'Test transcription',
      segments: [
        {
          text: 'Test transcription',
          startTime: 0,
          endTime: 2.5,
          confidence: 0.95,
        }
      ]
    };
  },
  
  analyzeQuality: async (audioUrl: string) => {
    // Mock implementation for tests
    return {
      snr: 20.5,
      volume: 0.8,
      clarity: 0.9,
      backgroundNoise: 0.1,
      speechRate: 150,
      pauseCount: 2,
      overallQuality: 0.85,
      recommendations: ['Good quality recording'],
    };
  }
};