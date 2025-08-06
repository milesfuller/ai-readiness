// Mock utilities for Supabase testing
import { createMockSupabaseClient, createMockUser, createMockSession } from '../__tests__/utils/mock-factories';
import type { MockSupabaseClient } from '../__tests__/types/mocks';

// Export mock factories
export { createMockSupabaseClient, createMockUser, createMockSession };
export type { MockSupabaseClient };

// Default mock client
export const mockSupabaseClient = createMockSupabaseClient();

// Mock server-side Supabase client creation
export const mockCreateServerClient = jest.fn(() => mockSupabaseClient);

// Mock browser-side Supabase client creation
export const mockCreateBrowserClient = jest.fn(() => mockSupabaseClient);

// Common test data
export const mockTestUser = createMockUser({
  id: 'test-user-123',
  email: 'testuser@example.com'
});

export const mockTestSession = createMockSession({
  user: mockTestUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token'
});

// Helper to reset all mocks
export function resetAllMocks() {
  mockCreateServerClient.mockClear();
  mockCreateBrowserClient.mockClear();
  mockSupabaseClient.auth.getUser.mockClear();
  mockSupabaseClient.auth.getSession.mockClear();
  mockSupabaseClient.auth.signInWithOAuth.mockClear();
  mockSupabaseClient.auth.signOut.mockClear();
  mockSupabaseClient.from.mockClear();
}

// Default successful auth responses
export function setupSuccessfulAuth() {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockTestUser },
    error: null
  });
  
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: mockTestSession },
    error: null
  });
}

// Default failed auth responses
export function setupFailedAuth() {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'User not authenticated' }
  });
  
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: { message: 'No active session' }
  });
}