/**
 * Simplified Supabase Client Exports
 * 
 * This module provides a clean interface to the consolidated Supabase clients.
 * No more complex singleton pattern - just two simple clients: server and browser.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the appropriate Supabase client for the current environment
 * - Browser: Returns SSR-compatible browser client with cookie management
 * - Server: Returns server client with cookie handling
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  // Detect environment
  const isBrowser = typeof window !== 'undefined'
  
  if (isBrowser) {
    // Browser environment - use consolidated browser client
    const { createClient } = await import('./client')
    return createClient()
  } else {
    // Server environment - use consolidated server client
    const { createClient } = await import('./server')
    return createClient()
  }
}

/**
 * Synchronous version for browser-only usage
 * Use this when you're certain you're in a browser environment
 */
export function getSupabaseClientSync(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClientSync can only be used in browser environments')
  }
  
  // Use require to avoid SSR issues with synchronous access
  const { createClient } = require('./client')
  return createClient()
}

/**
 * Export consolidated clients
 */
export { createClient } from './client'
export { createBrowserClient } from './client' // Alias for compatibility
// Server client should be imported directly from './server' to avoid next/headers in client components

/**
 * Export server client helper function (for convenience)
 */
export async function getServerClient() {
  const { createClient } = await import('./server')
  return createClient()
}

/**
 * Legacy export for backward compatibility
 */
export { supabase } from './client'

/**
 * Export utility functions from consolidated client
 */
export { clearClient, hasClientInstance } from './client'