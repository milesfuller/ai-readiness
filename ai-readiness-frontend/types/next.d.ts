/**
 * Next.js specific type declarations
 * Includes API routes, middleware, and Next.js-specific functionality
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest, NextResponse } from 'next/server';

// API Route types
export interface MockNextRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  _body?: string;
  json(): Promise<any>;
  text(): Promise<string>;
}

export interface MockNextResponse {
  status: number;
  headers: Map<string, string>;
  json(): Promise<any>;
}

// Mock types for testing
declare global {
  namespace jest {
    interface Mock {
      mockImplementation(fn: (...args: any[]) => any): this;
      mockResolvedValue(value: any): this;
      mockRejectedValue(error: any): this;
    }
  }
}

// Export commonly used types
export type { NextApiRequest, NextApiResponse, NextRequest, NextResponse };