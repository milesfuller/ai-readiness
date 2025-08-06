/**
 * Supabase Client Unified Export
 * 
 * This module provides a unified way to get the appropriate Supabase client
 * for the current environment while ensuring singleton behavior.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the appropriate Supabase client for the current environment
 * - Browser: Returns SSR-compatible browser client with cookie management
 * - Server: Returns server client with cookie handling
 * - General: Falls back to standard client
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  // Detect environment
  const isBrowser = typeof window !== 'undefined'
  const isServer = typeof window === 'undefined' && typeof process !== 'undefined'
  
  if (isBrowser) {
    // Browser environment - use browser client with cookie management
    const { createBrowserClient } = await import('./client-browser')
    return createBrowserClient()
  } else if (isServer) {
    // Server environment - use server client with cookie handling
    const { createClient } = await import('./server')
    return createClient()
  } else {
    // Fallback to general client
    const { createClient } = await import('./client')
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
  
  // Use dynamic import to avoid SSR issues
  try {
    const { createBrowserClient } = require('./client-browser')
    return createBrowserClient()
  } catch (error) {
    // Fallback to general client if browser client fails
    const { createClient } = require('./client')
    return createClient()
  }
}

/**
 * Export individual clients for specific use cases
 */
export { createClient } from './client'
export { createBrowserClient } from './client-browser'
export { createClient as createServerClient } from './server'

/**
 * Export singleton utilities
 */
export { 
  getRegistryStatus, 
  clearClients,
  cleanup 
} from './singleton'

/**
 * Legacy export for backward compatibility
 */
export { supabase } from './client'