/**
 * Voice Recording Upload API Endpoint
 * 
 * POST /api/voice/upload
 * Handles multipart form data uploads for voice recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth/middleware';
import { withRateLimit, rateLimitConfigs } from '@/lib/security/rate-limiter';
import { createVoiceService } from '@/lib/services/voice-service';
import { VoiceTranscriptionService } from '@/lib/services/voice-transcription.service';

// Input validation schema
const UploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  format: z.enum(['wav', 'mp3', 'webm', 'ogg']),
  duration: z.number().positive().optional(),
  metadata: z.object({
    sampleRate: z.number().positive().optional(),
    bitrate: z.number().positive().optional(),
    channels: z.number().int().min(1).max(2).optional(),
  }).optional(),
});

// File validation constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const SUPPORTED_MIME_TYPES = [
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
];

/**
 * Validate uploaded file
 */
function validateFile(file: File): void {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file format: ${file.type}. Supported formats: ${SUPPORTED_MIME_TYPES.join(', ')}`);
  }

  // Check filename
  if (!file.name || file.name.trim().length === 0) {
    throw new Error('File must have a valid filename');
  }

  // Security check for malicious filenames
  const dangerousPatterns = [
    /\.\./g,     // Directory traversal
    /[<>:"|?*]/g, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
  ];

  if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
    throw new Error('Invalid filename contains forbidden characters or patterns');
  }
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
 * Extract metadata from request
 */
async function extractMetadataFromRequest(request: NextRequest): Promise<any> {
  try {
    const metadataHeader = request.headers.get('x-voice-metadata');
    if (metadataHeader) {
      return JSON.parse(metadataHeader);
    }
    return null;
  } catch (error) {
    console.warn('Failed to parse metadata header:', error);
    return null;
  }
}

/**
 * POST handler for voice recording upload
 */
async function handleUpload(request: NextRequest): Promise<NextResponse> {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { 
          error: 'No file provided',
          message: 'Please upload a valid audio file'
        },
        { status: 400 }
      );
    }

    // Validate file
    validateFile(file);

    // Extract additional metadata from form data or headers
    const metadata = await extractMetadataFromRequest(request);
    const userMetadata = formData.get('metadata') ? JSON.parse(formData.get('metadata') as string) : null;
    const finalMetadata = { ...metadata, ...userMetadata };

    // Validate metadata if provided
    if (finalMetadata) {
      try {
        UploadRequestSchema.partial().parse({
          filename: file.name,
          format: file.type.split('/')[1] as any,
          metadata: finalMetadata,
        });
      } catch (validationError) {
        return NextResponse.json(
          { 
            error: 'Invalid metadata',
            message: validationError instanceof Error ? validationError.message : 'Validation failed',
            details: validationError
          },
          { status: 400 }
        );
      }
    }

    // Initialize services
    const supabase = createSupabaseClient();
    const transcriptionService = new VoiceTranscriptionService({
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    const voiceService = createVoiceService(supabase, transcriptionService);

    // Create voice recording
    const recording = await voiceService.createRecording(user.id, file);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: recording.id,
        filename: recording.filename,
        audioUrl: recording.audioUrl,
        duration: recording.duration,
        fileSize: recording.fileSize,
        format: recording.format,
        status: recording.status,
        createdAt: recording.createdAt,
        metadata: recording.metadata,
      },
      message: 'Voice recording uploaded successfully'
    });

  } catch (error) {
    console.error('Voice upload error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('File size exceeds')) {
        return NextResponse.json(
          { 
            error: 'File too large',
            message: error.message 
          },
          { status: 413 }
        );
      }
      
      if (error.message.includes('Invalid file format') || error.message.includes('Invalid filename')) {
        return NextResponse.json(
          { 
            error: 'Invalid file',
            message: error.message 
          },
          { status: 400 }
        );
      }

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
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting to the upload endpoint
export const POST = withRateLimit(
  {
    ...rateLimitConfigs.upload,
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 25, // 25 uploads per hour
    message: 'Too many voice uploads. Please try again later.',
  },
  (request) => {
    // Use user ID for authenticated requests
    const userId = request.headers.get('x-user-id');
    return userId ? `voice-upload:user:${userId}` : 'voice-upload:anonymous';
  }
)(handleUpload);

// Enable CORS for preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-voice-metadata',
      'Access-Control-Max-Age': '86400',
    },
  });
}