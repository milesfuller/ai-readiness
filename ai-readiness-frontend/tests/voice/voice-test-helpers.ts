/**
 * Voice API Test Helpers
 * 
 * Utility functions for creating mock data and testing voice-related functionality
 */

/**
 * Create a mock audio file for testing
 */
export function createMockAudioFile({
  name = 'test.wav',
  type = 'audio/wav',
  size = 1024000, // 1MB default
  content = 'mock audio content',
}: {
  name?: string;
  type?: string;
  size?: number;
  content?: string;
} = {}): File {
  const blob = new Blob([content], { type });
  Object.defineProperty(blob, 'size', { value: size });
  
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  
  return file;
}

/**
 * Create mock FormData with audio file
 */
export function createMockFormData({
  filename = 'test.wav',
  fileType = 'audio/wav',
  fileSize = 1024000,
  metadata,
}: {
  filename?: string;
  fileType?: string;
  fileSize?: number;
  metadata?: any;
} = {}): FormData {
  const formData = new FormData();
  const audioFile = createMockAudioFile({
    name: filename,
    type: fileType,
    size: fileSize,
  });
  
  formData.append('file', audioFile);
  
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata));
  }
  
  return formData;
}

/**
 * Mock voice recording data
 */
export function createMockVoiceRecording({
  id = 'recording-123',
  userId = 'user-456',
  filename = 'test.wav',
  audioUrl = 'https://example.com/audio/test.wav',
  duration = 30.5,
  fileSize = 1024000,
  format = 'wav' as const,
  transcription = null,
  qualityScore = null,
  status = 'completed' as const,
  metadata = null,
  createdAt = new Date().toISOString(),
  updatedAt = new Date().toISOString(),
}: Partial<any> = {}) {
  return {
    id,
    userId,
    filename,
    audioUrl,
    duration,
    fileSize,
    format,
    transcription,
    qualityScore,
    status,
    metadata,
    createdAt,
    updatedAt,
  };
}

/**
 * Mock transcription segments data
 */
export function createMockTranscriptionSegments(recordingId: string = 'recording-123'): any[] {
  return [
    {
      id: 'segment-1',
      voiceRecordingId: recordingId,
      text: 'Hello, this is a test recording.',
      startTime: 0,
      endTime: 2.5,
      confidence: 0.95,
      speakerId: 'speaker-1',
      words: [
        { word: 'Hello', startTime: 0, endTime: 0.5, confidence: 0.98 },
        { word: 'this', startTime: 0.6, endTime: 0.9, confidence: 0.92 },
        { word: 'is', startTime: 1.0, endTime: 1.2, confidence: 0.96 },
        { word: 'a', startTime: 1.3, endTime: 1.4, confidence: 0.89 },
        { word: 'test', startTime: 1.5, endTime: 1.8, confidence: 0.97 },
        { word: 'recording', startTime: 1.9, endTime: 2.5, confidence: 0.94 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'segment-2',
      voiceRecordingId: recordingId,
      text: 'The quality seems good.',
      startTime: 3.0,
      endTime: 5.2,
      confidence: 0.88,
      speakerId: 'speaker-1',
      words: [
        { word: 'The', startTime: 3.0, endTime: 3.2, confidence: 0.91 },
        { word: 'quality', startTime: 3.3, endTime: 3.8, confidence: 0.86 },
        { word: 'seems', startTime: 3.9, endTime: 4.3, confidence: 0.89 },
        { word: 'good', startTime: 4.4, endTime: 5.2, confidence: 0.85 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Mock quality metrics data
 */
export function createMockQualityMetrics(recordingId: string = 'recording-123'): any {
  return {
    id: 'quality-789',
    voiceRecordingId: recordingId,
    snr: 25.5,
    volume: 0.7,
    clarity: 0.85,
    backgroundNoise: 0.15,
    speechRate: 150,
    pauseCount: 3,
    overallQuality: 0.82,
    recommendations: [
      'Good overall recording quality',
      'Excellent signal-to-noise ratio',
      'Good speech rate for optimal transcription',
    ],
    analyzedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Mock transcription job data
 */
export function createMockTranscriptionJob({
  id = 'job-123',
  recordingId = 'recording-456',
  userId = 'user-789',
  status = 'pending' as const,
  progress = 0,
  result = null,
  error = null,
  createdAt = new Date(),
  updatedAt = new Date(),
}: Partial<any> = {}) {
  return {
    id,
    recordingId,
    userId,
    status,
    progress,
    result,
    error,
    createdAt,
    updatedAt,
  };
}

/**
 * Create mock authenticated user
 */
export function createMockUser({
  id = 'user-123',
  email = 'test@example.com',
  role = 'user' as const,
  organizationId = 'org-456',
}: {
  id?: string;
  email?: string;
  role?: 'user' | 'org_admin' | 'system_admin';
  organizationId?: string;
} = {}) {
  return {
    id,
    email,
    role,
    organizationId,
  };
}

/**
 * Mock NextRequest with authentication headers
 */
export function createMockAuthenticatedRequest({
  url = 'http://localhost:3000/api/voice/test',
  method = 'GET',
  body = null,
  headers = {},
  userId = 'user-123',
}: {
  url?: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  userId?: string;
} = {}) {
  return new Request(url, {
    method,
    body,
    headers: {
      'x-user-id': userId,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Mock error responses for testing
 */
export const mockErrorResponses = {
  unauthorized: {
    error: 'Authentication required',
    message: 'No valid session found',
  },
  forbidden: {
    error: 'Access denied',
    message: 'You do not have permission to access this resource',
  },
  notFound: {
    error: 'Recording not found',
    message: 'The requested voice recording does not exist',
  },
  badRequest: {
    error: 'Invalid request data',
    message: 'The provided request data is invalid',
  },
  serverError: {
    error: 'Server error',
    message: 'An unexpected error occurred',
  },
  rateLimited: {
    error: 'Too many requests',
    message: 'Rate limit exceeded',
  },
};

/**
 * Mock successful responses for testing
 */
export const mockSuccessResponses = {
  upload: (data: any) => ({
    success: true,
    data,
    message: 'Voice recording uploaded successfully',
  }),
  retrieve: (data: any) => ({
    success: true,
    data,
    message: 'Voice recording retrieved successfully',
  }),
  transcribe: (data: any) => ({
    success: true,
    data,
    message: 'Transcription completed successfully',
  }),
  quality: (data: any) => ({
    success: true,
    data,
    message: 'Quality metrics retrieved successfully',
  }),
};

/**
 * Delay utility for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export function generateRandomId(prefix: string = 'test'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock WebSocket for real-time testing
 */
export class MockWebSocket {
  public readyState: number = 1; // OPEN
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {}

  send(data: string): void {
    // Mock send - could trigger mock responses
    console.log('MockWebSocket send:', data);
  }

  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Mock incoming message
  mockMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Mock connection open
  mockOpen(): void {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  // Mock error
  mockError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

/**
 * Test utilities for async operations
 */
export class TestUtils {
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await delay(100);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async waitForElement(
    selector: string,
    timeout: number = 5000
  ): Promise<Element | null> {
    await this.waitFor(() => document.querySelector(selector) !== null, timeout);
    return document.querySelector(selector);
  }
}