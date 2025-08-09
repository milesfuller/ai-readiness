/**
 * Voice Quality Analysis API Endpoint
 * 
 * GET /api/voice/quality/[id]
 * Retrieves quality analysis and recommendations for voice recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { withRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter';
import { createVoiceService } from '@/lib/services/voice-service';
import { VoiceTranscriptionService } from '@/lib/services/voice-transcription.service';
import { createVoiceRecordingService } from '@/services/database/voice-recording.service';

// Path parameters schema
const ParamsSchema = z.object({
  id: z.string().uuid('Invalid recording ID format'),
});

// Query parameters schema
const QueryParamsSchema = z.object({
  refresh: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  includeRecommendations: z
    .string()
    .optional()
    .transform(val => val !== 'false'), // Default to true
  format: z
    .enum(['json', 'summary', 'detailed'])
    .optional()
    .default('json'),
  realtime: z
    .string()
    .optional()
    .transform(val => val === 'true'),
});

/**
 * Create Supabase client for server-side operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Check if user can access quality metrics for the recording
 */
async function canAccessQualityMetrics(userId: string, recordingUserId: string, userRole?: string): Promise<boolean> {
  // Users can access quality metrics for their own recordings
  if (userId === recordingUserId) {
    return true;
  }

  // System admins can access any recording's quality metrics
  if (userRole === 'system_admin') {
    return true;
  }

  // Organization admins can access quality metrics from their org members
  if (userRole === 'org_admin') {
    // TODO: Implement organization membership check
    return false;
  }

  return false;
}

/**
 * Generate quality recommendations based on metrics
 */
function generateDetailedRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  // SNR recommendations
  if (metrics.snr < 10) {
    recommendations.push('Poor signal-to-noise ratio detected. Try recording in a quieter environment.');
  } else if (metrics.snr < 20) {
    recommendations.push('Signal-to-noise ratio could be improved. Consider using noise cancellation.');
  } else if (metrics.snr > 40) {
    recommendations.push('Excellent signal-to-noise ratio. Great recording environment!');
  }

  // Volume recommendations
  if (metrics.volume < 0.3) {
    recommendations.push('Audio volume is too low. Speak louder or move closer to the microphone.');
  } else if (metrics.volume > 0.9) {
    recommendations.push('Audio volume is too high and may be distorted. Reduce input gain or speak softer.');
  } else if (metrics.volume >= 0.5 && metrics.volume <= 0.8) {
    recommendations.push('Good audio volume level.');
  }

  // Clarity recommendations
  if (metrics.clarity < 0.5) {
    recommendations.push('Audio clarity is poor. Check microphone quality and reduce background noise.');
  } else if (metrics.clarity < 0.7) {
    recommendations.push('Audio clarity could be improved. Ensure good microphone positioning.');
  } else if (metrics.clarity > 0.8) {
    recommendations.push('Excellent audio clarity!');
  }

  // Background noise recommendations
  if (metrics.backgroundNoise > 0.7) {
    recommendations.push('High background noise detected. Use noise cancellation or record in a quieter space.');
  } else if (metrics.backgroundNoise > 0.3) {
    recommendations.push('Moderate background noise present. Consider recording in a quieter environment.');
  } else if (metrics.backgroundNoise < 0.1) {
    recommendations.push('Very low background noise. Excellent recording conditions!');
  }

  // Speech rate recommendations
  if (metrics.speechRate < 100) {
    recommendations.push('Speech rate is quite slow. Consider speaking at a normal pace for better transcription.');
  } else if (metrics.speechRate > 200) {
    recommendations.push('Speech rate is very fast. Slowing down may improve transcription accuracy.');
  } else if (metrics.speechRate >= 120 && metrics.speechRate <= 180) {
    recommendations.push('Good speech rate for optimal transcription.');
  }

  // Pause recommendations
  if (metrics.pauseCount < 2) {
    recommendations.push('Very few pauses detected. Natural pauses can improve transcription quality.');
  } else if (metrics.pauseCount > 20) {
    recommendations.push('Many pauses detected. This might indicate hesitation or poor audio quality.');
  }

  // Overall quality assessment
  if (metrics.overallQuality > 0.8) {
    recommendations.push('Overall excellent recording quality!');
  } else if (metrics.overallQuality > 0.6) {
    recommendations.push('Good overall recording quality with room for minor improvements.');
  } else if (metrics.overallQuality > 0.4) {
    recommendations.push('Moderate recording quality. Several areas could be improved.');
  } else {
    recommendations.push('Poor recording quality. Consider re-recording with better conditions.');
  }

  return recommendations;
}

/**
 * Format quality response based on requested format
 */
function formatQualityResponse(metrics: any, format: string) {
  const baseMetrics = {
    id: metrics.id,
    voiceRecordingId: metrics.voiceRecordingId,
    overallQuality: metrics.overallQuality,
    analyzedAt: metrics.analyzedAt,
  };

  switch (format) {
    case 'summary':
      return {
        ...baseMetrics,
        summary: {
          grade: getQualityGrade(metrics.overallQuality),
          score: Math.round(metrics.overallQuality * 100),
          primaryIssue: getPrimaryIssue(metrics),
          recommendation: getTopRecommendation(metrics),
        },
      };

    case 'detailed':
      return {
        ...metrics,
        analysis: {
          grade: getQualityGrade(metrics.overallQuality),
          score: Math.round(metrics.overallQuality * 100),
          breakdown: {
            snr: { value: metrics.snr, grade: getMetricGrade(metrics.snr, [10, 20, 30, 40]) },
            volume: { value: metrics.volume, grade: getMetricGrade(metrics.volume, [0.3, 0.5, 0.7, 0.9]) },
            clarity: { value: metrics.clarity, grade: getMetricGrade(metrics.clarity, [0.4, 0.6, 0.8, 0.9]) },
            backgroundNoise: { value: metrics.backgroundNoise, grade: getMetricGrade(1 - metrics.backgroundNoise, [0.3, 0.5, 0.7, 0.9]) },
          },
          recommendations: generateDetailedRecommendations(metrics),
        },
      };

    default: // 'json'
      return metrics;
  }
}

/**
 * Get quality grade (A-F) based on score
 */
function getQualityGrade(score: number): string {
  if (score >= 0.9) return 'A';
  if (score >= 0.8) return 'B';
  if (score >= 0.7) return 'C';
  if (score >= 0.6) return 'D';
  return 'F';
}

/**
 * Get metric grade for individual metrics
 */
function getMetricGrade(value: number, thresholds: number[]): string {
  const grades = ['F', 'D', 'C', 'B', 'A'];
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]) {
      return grades[i];
    }
  }
  return grades[grades.length - 1];
}

/**
 * Identify the primary quality issue
 */
function getPrimaryIssue(metrics: any): string {
  const issues: any[] = [];
  
  if (metrics.snr < 15) issues.push({ type: 'noise', severity: 20 - metrics.snr });
  if (metrics.volume < 0.3 || metrics.volume > 0.9) issues.push({ type: 'volume', severity: Math.abs(0.6 - metrics.volume) * 2 });
  if (metrics.clarity < 0.6) issues.push({ type: 'clarity', severity: 0.6 - metrics.clarity });
  if (metrics.backgroundNoise > 0.4) issues.push({ type: 'background', severity: metrics.backgroundNoise });

  if (issues.length === 0) return 'none';
  
  const primaryIssue = issues.reduce((prev, curr) => prev.severity > curr.severity ? prev : curr);
  return primaryIssue.type;
}

/**
 * Get the top recommendation
 */
function getTopRecommendation(metrics: any): string {
  const primaryIssue = getPrimaryIssue(metrics);
  
  const recommendationMap: Record<string, string> = {
    noise: 'Reduce background noise for better quality',
    volume: 'Adjust microphone volume to optimal level',
    clarity: 'Improve microphone positioning and quality',
    background: 'Record in a quieter environment',
    none: 'Great recording! No major improvements needed',
  };

  return recommendationMap[primaryIssue] || 'Consider general recording quality improvements';
}

/**
 * GET handler for quality metrics retrieval
 */
async function handleGetQuality(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Authentication check
    const { user, error: authError } = await getAuthenticatedUser(request);
    if (!user || authError) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: authError || 'No valid session found'
        },
        { status: 401 }
      );
    }

    // Validate path parameters
    const { id: recordingId } = ParamsSchema.parse(params);

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = QueryParamsSchema.parse({
      refresh: url.searchParams.get('refresh'),
      includeRecommendations: url.searchParams.get('includeRecommendations'),
      format: url.searchParams.get('format'),
      realtime: url.searchParams.get('realtime'),
    });

    // Initialize services
    const supabase = createSupabaseClient();
    const dbService = createVoiceRecordingService();

    // Get voice recording to check ownership
    const recording = await dbService.getVoiceRecording(recordingId);
    
    if (!recording) {
      return NextResponse.json(
        { 
          error: 'Recording not found',
          message: 'The requested voice recording does not exist'
        },
        { status: 404 }
      );
    }

    // Check access permissions
    const hasAccess = await canAccessQualityMetrics(user.id, recording.userId, user.role);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to access quality metrics for this recording'
        },
        { status: 403 }
      );
    }

    // Get existing quality metrics
    let qualityMetrics = await dbService.getQualityMetrics(recordingId);

    // If no metrics exist or refresh requested, analyze quality
    if (!qualityMetrics || queryParams.refresh) {
      if (recording.status !== 'completed') {
        return NextResponse.json(
          { 
            error: 'Recording not ready',
            message: `Recording must be in 'completed' status for quality analysis. Current status: ${recording.status}`
          },
          { status: 400 }
        );
      }

      try {
        // Initialize voice service and analyze quality
        const transcriptionService = new VoiceTranscriptionService({
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY || '',
        });
        const voiceService = createVoiceService(supabase, transcriptionService);

        const analysisResult = await voiceService.analyzeQuality(recordingId);
        qualityMetrics = analysisResult;
      } catch (error) {
        console.error('Quality analysis failed:', error);
        return NextResponse.json(
          { 
            error: 'Quality analysis failed',
            message: error instanceof Error ? error.message : 'Failed to analyze recording quality'
          },
          { status: 500 }
        );
      }
    }

    if (!qualityMetrics) {
      return NextResponse.json(
        { 
          error: 'No quality metrics available',
          message: 'Quality analysis has not been performed for this recording'
        },
        { status: 404 }
      );
    }

    // Add enhanced recommendations if requested
    if (queryParams.includeRecommendations && !qualityMetrics.recommendations?.length) {
      qualityMetrics.recommendations = generateDetailedRecommendations(qualityMetrics);
    }

    // Format response
    const responseData = formatQualityResponse(qualityMetrics, queryParams.format);

    // Add real-time updates info if requested
    if (queryParams.realtime) {
      responseData.realtime = {
        enabled: true,
        updateInterval: 30000, // 30 seconds
        websocketUrl: `/api/voice/quality/${recordingId}/stream`,
      };
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Quality metrics retrieved successfully'
    });

  } catch (error) {
    console.error('Quality metrics retrieval error:', error);
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          message: 'The provided parameters are invalid',
          details: error.errors
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Missing Supabase configuration')) {
        return NextResponse.json(
          { 
            error: 'Server configuration error',
            message: 'Quality analysis service is not properly configured'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Quality retrieval failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the quality metrics endpoint
export const GET = withRateLimit(
  {
    ...rateLimitConfigs.api,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 150, // 150 requests per 15 minutes
    message: 'Too many quality analysis requests. Please try again later.',
  },
  (request) => {
    // Use user ID for authenticated requests
    const userId = request.headers.get('x-user-id');
    return userId ? `voice-quality:user:${userId}` : 'voice-quality:anonymous';
  }
)(handleGetQuality);

// Enable CORS for preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}