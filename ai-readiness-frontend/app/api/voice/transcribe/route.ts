/**
 * Voice Transcription API Endpoint
 * 
 * POST /api/voice/transcribe
 * Triggers transcription process for voice recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { withRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter';
import { createVoiceService } from '@/lib/services/voice-service';
import { VoiceTranscriptionService } from '@/lib/services/voice-transcription.service';
import { createVoiceRecordingService } from '@/services/database/voice-recording.service';

// Request body schema
const TranscribeRequestSchema = z.object({
  recordingId: z.string().uuid('Invalid recording ID format'),
  options: z.object({
    language: z.string().optional(),
    model: z.enum(['whisper-1', 'enhanced']).optional().default('whisper-1'),
    prompt: z.string().max(500).optional(),
    temperature: z.number().min(0).max(1).optional().default(0),
    response_format: z.enum(['json', 'text', 'srt', 'vtt']).optional().default('json'),
    timestamp_granularities: z.array(z.enum(['word', 'segment'])).optional(),
  }).optional().default({}),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal'),
  async: z.boolean().optional().default(true),
});

// Job status tracking (in production, use Redis or database)
const transcriptionJobs = new Map<string, {
  id: string;
  recordingId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}>();

/**
 * Generate unique job ID
 */
function generateJobId(recordingId: string, userId: string): string {
  return `transcribe_${recordingId}_${userId}_${Date.now()}`;
}

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
 * Check if user can transcribe the recording
 */
async function canTranscribeRecording(userId: string, recordingUserId: string, userRole?: string): Promise<boolean> {
  // Users can transcribe their own recordings
  if (userId === recordingUserId) {
    return true;
  }

  // System admins can transcribe any recording
  if (userRole === 'system_admin') {
    return true;
  }

  // Organization admins can transcribe recordings from their org members
  if (userRole === 'org_admin') {
    // TODO: Implement organization membership check
    return false;
  }

  return false;
}

/**
 * Process transcription asynchronously
 */
async function processTranscriptionAsync(
  jobId: string,
  recordingId: string,
  userId: string,
  options: any
): Promise<void> {
  const job = transcriptionJobs.get(jobId);
  if (!job) return;

  try {
    // Update job status to processing
    job.status = 'processing';
    job.progress = 10;
    job.updatedAt = new Date();
    transcriptionJobs.set(jobId, job);

    // Initialize services
    const supabase = createSupabaseClient();
    const transcriptionService = new VoiceTranscriptionService({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
      model: options.model || 'whisper-1',
      language: options.language,
      prompt: options.prompt,
      temperature: options.temperature,
      response_format: options.response_format,
      timestamp_granularities: options.timestamp_granularities,
    });
    const voiceService = createVoiceService(supabase, transcriptionService);

    // Update progress
    job.progress = 30;
    job.updatedAt = new Date();
    transcriptionJobs.set(jobId, job);

    // Process transcription
    const result = await voiceService.processTranscription(recordingId);

    // Update job with success
    job.status = 'completed';
    job.progress = 100;
    job.result = result;
    job.updatedAt = new Date();
    transcriptionJobs.set(jobId, job);

    console.log(`Transcription job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`Transcription job ${jobId} failed:`, error);
    
    // Update job with failure
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Transcription failed';
    job.updatedAt = new Date();
    transcriptionJobs.set(jobId, job);
  }

  // Clean up job after 1 hour
  setTimeout(() => {
    transcriptionJobs.delete(jobId);
  }, 60 * 60 * 1000);
}

/**
 * Process transcription synchronously
 */
async function processTranscriptionSync(
  recordingId: string,
  userId: string,
  options: any
): Promise<any> {
  // Initialize services
  const supabase = createSupabaseClient();
  const transcriptionService = new VoiceTranscriptionService({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: options.model || 'whisper-1',
    language: options.language,
    prompt: options.prompt,
    temperature: options.temperature,
    response_format: options.response_format,
    timestamp_granularities: options.timestamp_granularities,
  });
  const voiceService = createVoiceService(supabase, transcriptionService);

  // Process transcription
  return await voiceService.processTranscription(recordingId);
}

/**
 * POST handler for voice transcription
 */
async function handleTranscribe(request: NextRequest): Promise<NextResponse> {
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

    // Parse request body
    const body = await request.json();
    const { recordingId, options, priority, async } = TranscribeRequestSchema.parse(body);

    // Initialize database service to check recording
    const dbService = createVoiceRecordingService();
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
    const hasAccess = await canTranscribeRecording(user.id, recording.userId, user.role);
    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to transcribe this recording'
        },
        { status: 403 }
      );
    }

    // Check if recording is in a valid state for transcription
    if (recording.status !== 'completed') {
      return NextResponse.json(
        { 
          error: 'Recording not ready',
          message: `Recording must be in 'completed' status for transcription. Current status: ${recording.status}`
        },
        { status: 400 }
      );
    }

    // Check if already transcribed (unless force option is provided)
    if (recording.transcription && !body.force) {
      return NextResponse.json(
        {
          success: true,
          data: {
            recordingId,
            transcription: recording.transcription,
            status: 'already_completed',
            message: 'Recording is already transcribed. Use force=true to re-transcribe.'
          }
        }
      );
    }

    // Handle async vs sync processing
    if (async) {
      // Async processing - return job ID immediately
      const jobId = generateJobId(recordingId, user.id);
      
      // Create job record
      transcriptionJobs.set(jobId, {
        id: jobId,
        recordingId,
        userId: user.id,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Start processing in background
      processTranscriptionAsync(jobId, recordingId, user.id, options).catch(error => {
        console.error('Async transcription processing failed:', error);
      });

      return NextResponse.json({
        success: true,
        data: {
          jobId,
          recordingId,
          status: 'pending',
          message: 'Transcription job started. Use the job ID to check progress.',
          statusUrl: `/api/voice/transcribe/status/${jobId}`,
        }
      });

    } else {
      // Sync processing - wait for completion
      const result = await processTranscriptionSync(recordingId, user.id, options);

      return NextResponse.json({
        success: true,
        data: {
          recordingId,
          transcription: result.transcription,
          status: 'completed',
          result,
          message: 'Transcription completed successfully'
        }
      });
    }

  } catch (error) {
    console.error('Voice transcription error:', error);
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          message: 'The provided request data is invalid',
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
            message: 'Transcription service is not properly configured'
          },
          { status: 500 }
        );
      }

      if (error.message.includes('Transcription already in progress')) {
        return NextResponse.json(
          { 
            error: 'Transcription in progress',
            message: error.message
          },
          { status: 409 }
        );
      }

      if (error.message.includes('Transcription service failed')) {
        return NextResponse.json(
          { 
            error: 'Transcription service error',
            message: error.message
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Transcription failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for job status (if job ID provided as query param)
 */
async function handleGetJobStatus(request: NextRequest): Promise<NextResponse> {
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

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { 
          error: 'Missing job ID',
          message: 'Job ID parameter is required'
        },
        { status: 400 }
      );
    }

    const job = transcriptionJobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { 
          error: 'Job not found',
          message: 'The requested transcription job does not exist or has expired'
        },
        { status: 404 }
      );
    }

    // Check if user owns this job
    if (job.userId !== user.id && user.role !== 'system_admin') {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'You do not have permission to access this job'
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        recordingId: job.recordingId,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      }
    });

  } catch (error) {
    console.error('Job status retrieval error:', error);
    return NextResponse.json(
      { 
        error: 'Status retrieval failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the transcription endpoint
export const POST = withRateLimit(
  {
    ...rateLimitConfigs.llm,
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 transcriptions per hour
    message: 'Too many transcription requests. Please try again later.',
  },
  (request) => {
    // Use user ID for authenticated requests
    const userId = request.headers.get('x-user-id');
    return userId ? `voice-transcribe:user:${userId}` : undefined;
  }
)(handleTranscribe);

export const GET = withRateLimit(
  rateLimitConfigs.api,
  (request) => {
    const userId = request.headers.get('x-user-id');
    return userId ? `voice-transcribe-status:user:${userId}` : undefined;
  }
)(handleGetJobStatus);

// Enable CORS for preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}