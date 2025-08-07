// Mock factory functions for testing
import { MockUser, MockSession, MockSupabaseClient } from '../types/mocks';

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    ...overrides
  };
}

export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  const user = createMockUser(overrides.user);
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600 * 1000,
    user,
    ...overrides
  };
}

export function createMockSupabaseClient(overrides: Partial<MockSupabaseClient> = {}): MockSupabaseClient {
  return {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: vi.fn()
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: vi.fn()
        }))
      })),
      delete: jest.fn(() => ({
        eq: vi.fn()
      }))
    })),
    ...overrides
  };
}

export function createMockRequest(overrides: Partial<{ method: string; url: string; headers: Record<string, string>; body: any }> = {}) {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: null,
    ...overrides
  };
}

export function createMockResponse(overrides: Partial<{ status: number; headers: Record<string, string>; data: any }> = {}) {
  const data = overrides.data || {};
  return {
    status: overrides.status || 200,
    headers: overrides.headers || {},
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data))
  };
}

export function createMockNextRequest(overrides: Partial<{ method: string; url: string; headers: Record<string, string>; body: any }> = {}) {
  const headers = new Map();
  Object.entries(overrides.headers || {}).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return {
    method: overrides.method || 'GET',
    url: overrides.url || 'http://localhost:3000',
    headers,
    json: vi.fn().mockResolvedValue(overrides.body || {}),
    text: vi.fn().mockResolvedValue(JSON.stringify(overrides.body || {}))
  };
}

export function createMockNextResponse(overrides: Partial<{ status: number; headers: Record<string, string>; data: any }> = {}) {
  const data = overrides.data || {};
  return {
    status: overrides.status || 200,
    headers: overrides.headers || {},
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data))
  };
}