/**
 * Global type declarations for the AI Readiness Frontend
 * Includes module declarations, global types, and environment variable types
 */

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    NEXT_PUBLIC_SUPABASE_URL: string
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY?: string
    NEXTAUTH_URL?: string
    NEXTAUTH_SECRET?: string
    LLM_API_KEY?: string
    LLM_API_ENDPOINT?: string
    PLAYWRIGHT_TEST_BASE_URL?: string
  }
}

// Global augmentations
declare global {
  interface Window {
    // Add any window-specific properties here
    __NEXT_DATA__: any;
  }

  // Add any global types that might be needed
  var __DEV__: boolean;
  var __TEST__: boolean;
}

// Module declarations for packages without types
declare module 'lodash' {
  const _: any;
  export = _;
}

declare module 'lodash/*' {
  const _: any;
  export = _;
}

// Test utilities
declare module '@testing-library/jest-dom' {
  interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R;
    toHaveClass(className: string): R;
    toHaveAttribute(attr: string, value?: string): R;
    toBeVisible(): R;
  }
}

// Playwright global types
declare global {
  var page: import('@playwright/test').Page;
  var browser: import('@playwright/test').Browser;
  var context: import('@playwright/test').BrowserContext;
}

export {};