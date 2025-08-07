// Mock type definitions for testing
export interface MockRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface MockNextRequest {
  method: string;
  url: string;
  headers: Map<string, string>;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export interface MockNextRequestOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  json: () => Promise<any>;
  text: () => Promise<string>;
}

export interface MockSupabaseClient {
  auth: {
    getUser: any;
    getSession: any;
    signInWithOAuth: any;
    signOut: any;
  };
  from: any;
}

export interface MockUser {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
}

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: MockUser;
}