/**
 * Voice Recording Retrieval API Endpoint
 * 
 * GET /api/voice/[id]
 * Retrieves voice recording details with transcription and quality metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { withRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter';
import { createVoiceService } from '@/lib/services/voice-service';
import { VoiceTranscriptionService } from '@/lib/services/voice-transcription.service';
import { createVoiceRecordingService } from '@/services/database/voice-recording.service';

// Query parameters schema
const QueryParamsSchema = z.object({
  includeTranscription: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  includeQuality: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  includeSegments: z
    .string()
    .optional()
    .transform(val => val === 'true'),
  format: z
    .enum(['json', 'minimal', 'detailed'])
    .optional()
    .default('json'),
});

// Path parameters schema
const ParamsSchema = z.object({
  id: z.string().uuid('Invalid recording ID format'),
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
 * Check if user can access the recording
 */
async function canAccessRecording(userId: string, recordingUserId: string, userRole?: string): Promise<boolean> {
  // Users can access their own recordings
  if (userId === recordingUserId) {
    return true;
  }

  // System admins can access any recording
  if (userRole === 'system_admin') {
    return true;
  }

  // Organization admins can access recordings from their org members (would need org check)
  if (userRole === 'org_admin') {
    // TODO: Implement organization membership check
    return false;
  }

  return false;
}

/**
 * Format response based on requested format
 */
function formatResponse(recording: any, segments: any[] = [], qualityMetrics: any = null, format: string) {
  switch (format) {
    case 'minimal':
      return {
        id: recording.id,
        filename: recording.filename,
        duration: recording.duration,
        status: recording.status,
        createdAt: recording.createdAt,
      };

    case 'detailed':
      return {
        id: recording.id,
        userId: recording.userId,
        filename: recording.filename,
        audioUrl: recording.audioUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
        format: recording.format,
        transcription: recording.transcription,
        qualityScore: recording.qualityScore,
        status: recording.status,
        metadata: recording.metadata,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt,
        segments,
        qualityMetrics,
        analytics: {
          segmentCount: segments.length,
          averageConfidence: segments.length > 0
            ? segments.reduce((sum, s) => sum + (s.confidence || 0), 0) / segments.length
            : null,
          wordCount: segments.reduce((count, s) => count + (s.text?.split(' ').length || 0), 0),
        },
      };

    default: // 'json'
      return {
        id: recording.id,
        userId: recording.userId,
        filename: recording.filename,
        audioUrl: recording.audioUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
        format: recording.format,
        transcription: recording.transcription,
        qualityScore: recording.qualityScore,
        status: recording.status,
        metadata: recording.metadata,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt,
        ...(segments.length > 0 && { segments }),
        ...(qualityMetrics && { qualityMetrics }),
      };
  }
}

/**
 * GET handler for voice recording retrieval
 */
async function handleGet(
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
      includeTranscription: url.searchParams.get('includeTranscription'),
      includeQuality: url.searchParams.get('includeQuality'),
      includeSegments: url.searchParams.get('includeSegments'),
      format: url.searchParams.get('format'),
    });

    // Initialize services
    const supabase = createSupabaseClient();
    const transcriptionService = new VoiceTranscriptionService({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    const voiceService = createVoiceService(supabase, transcriptionService);
    const dbService = createVoiceRecordingService();

    // Get voice recording
    const recording = await voiceService.getRecording(recordingId);
    
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
    const hasAccess = await canAccessRecording(user.id, recording.userId, user.role);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to access this recording'
        },
        { status: 403 }
      );
    }

    // Gather additional data based on query parameters
    let segments: any[] = [];
    let qualityMetrics: any = null;

    const dataPromises: Promise<any>[] = [];

    if (queryParams.includeSegments || queryParams.format === 'detailed') {
      dataPromises.push(
        dbService.getTranscriptionSegments(recordingId).then(result => {
          segments = result;
        }).catch(error => {
          console.warn('Failed to fetch transcription segments:', error);
        })
      );
    }

    if (queryParams.includeQuality || queryParams.format === 'detailed') {
      dataPromises.push(
        dbService.getQualityMetrics(recordingId).then(result => {
          qualityMetrics = result;
        }).catch(error => {
          console.warn('Failed to fetch quality metrics:', error);
        })
      );
    }

    // Wait for all additional data to be fetched
    await Promise.allSettled(dataPromises);

    // Format and return response
    const responseData = formatResponse(recording, segments, qualityMetrics, queryParams.format);

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Voice recording retrieved successfully'
    });

  } catch (error) {
    console.error('Voice recording retrieval error:', error);
    
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
            message: 'Voice recording service is not properly configured'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Retrieval failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the retrieval endpoint
export const GET = withRateLimit(
  {
    ...rateLimitConfigs.api,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200, // 200 requests per 15 minutes
    message: 'Too many recording retrieval requests. Please try again later.',
  },
  (request) => {
    // Use user ID for authenticated requests
    const userId = request.headers.get('x-user-id');
    return userId ? `voice-get:user:${userId}` : 'voice-get:anonymous';
  }
)(handleGet);

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