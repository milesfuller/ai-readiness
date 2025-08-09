/**
 * Consolidated Browser Supabase Client
 * 
 * This client handles all browser-side Supabase operations.
 * Consolidates functionality from client-browser.ts and client.ts with simplified singleton pattern.
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { globalRateLimiter } from '@/lib/utils/rate-limiter'

// Simple in-memory client cache to prevent multiple instances
let clientInstance: SupabaseClient | null = null
let lastCreationTime = 0
const MIN_CREATION_INTERVAL = 1000 // Minimum 1 second between client creations

/**
 * Create a browser-side Supabase client with cookie-based session management
 * This function consolidates client-browser.ts and client.ts functionality
 */
export function createClient(): SupabaseClient {
  // Return existing instance if available (simple singleton)
  if (clientInstance) {
    return clientInstance
  }

  // Rate limit client creation to prevent too many instances
  const now = Date.now()
  if (now - lastCreationTime < MIN_CREATION_INTERVAL) {
    // If we're trying to create too quickly, wait a bit
    const waitTime = MIN_CREATION_INTERVAL - (now - lastCreationTime)
    console.warn(`Rate limiting Supabase client creation. Waiting ${waitTime}ms`)
    
    // Return a placeholder that will throw if used before ready
    if (!clientInstance) {
      throw new Error('Supabase client is being rate limited. Please try again.')
    }
    return clientInstance
  }

  lastCreationTime = now

  // Use staging variables if in preview/staging environment
  const isPreviewOrStaging = process.env.VERCEL_ENV === 'preview' || 
                             process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
                             process.env.NEXT_PUBLIC_IS_PREVIEW === 'true'
  
  const supabaseUrl = isPreviewOrStaging && process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
    ? process.env.STAGING_NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_URL
    
  const supabaseAnonKey = isPreviewOrStaging && process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only log errors in development, and only if not in test environment
    if (process.env.NODE_ENV !== 'production' && !process.env.X_TEST_ENVIRONMENT) {
      console.error('Missing Supabase environment variables:', {
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
        key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
      })
    }
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }

  // Detect test environment for different configuration
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.ENVIRONMENT === 'test' || 
                   !!process.env.X_TEST_ENVIRONMENT ||
                   supabaseUrl.includes('localhost:54321')

  // Create SSR-compatible browser client with cookie-based session management
  clientInstance = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined
        const value = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1]
        return value
      },
      set(name: string, value: string, options?: any) {
        if (typeof document === 'undefined') return
        const cookieOptions = [
          `${name}=${value}`,
          'path=/',
          'samesite=lax',
          ...(options?.maxAge ? [`max-age=${options.maxAge}`] : []),
          ...(options?.httpOnly ? ['httponly'] : []),
          ...(options?.secure || process.env.NODE_ENV === 'production' ? ['secure'] : [])
        ].join('; ')
        document.cookie = cookieOptions
      },
      remove(name: string, options?: any) {
        if (typeof document === 'undefined') return
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
      }
    },
    auth: {
      autoRefreshToken: !isTestEnv, // Disable auto-refresh in tests
      persistSession: true, // Always persist sessions
      detectSessionInUrl: !isTestEnv, // Disable URL detection in tests
      flowType: 'pkce',
      // For tests, use a shorter session timeout
      ...(isTestEnv && {
        storageKey: 'sb-test-auth-token',
        debug: true
      })
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'x-application-name': 'ai-readiness',
        ...(isTestEnv && {
          'x-test-mode': 'true',
          'x-client-info': 'ai-readiness-test'
        })
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: isTestEnv ? 5 : 10 // Reduce events in test
      }
    }
  })

  return clientInstance
}

/**
 * Browser client alias for compatibility
 */
export const createBrowserClient = createClient

/**
 * Legacy singleton instance for backward compatibility
 */
export const supabase = createClient()

/**
 * Clear the client instance (useful for testing)
 */
export function clearClient(): void {
  clientInstance = null
  console.debug('[Browser Client] Client instance cleared')
}

/**
 * Check if client instance exists
 */
export function hasClientInstance(): boolean {
  return clientInstance !== null
}