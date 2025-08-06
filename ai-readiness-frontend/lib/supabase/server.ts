/**
 * Consolidated Server Supabase Client
 * 
 * This client handles all server-side Supabase operations with proper cookie management.
 * Consolidates functionality from server-client.ts and parts of singleton.ts.
 */

import { createServerClient as createSupabaseServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

// Rate limiting for server-side client creation
let lastServerCreationTime = 0
const MIN_SERVER_CREATION_INTERVAL = 100 // 100ms between server client creations

/**
 * Create a server-side Supabase client with cookie management
 * This function consolidates the previous server-client.ts functionality
 */
export async function createClient(): Promise<SupabaseClient> {
  // Simple rate limiting to prevent too many simultaneous connections
  const now = Date.now()
  const timeSinceLastCreation = now - lastServerCreationTime
  if (timeSinceLastCreation < MIN_SERVER_CREATION_INTERVAL) {
    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, MIN_SERVER_CREATION_INTERVAL - timeSinceLastCreation))
  }
  lastServerCreationTime = Date.now()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }

  const cookieStore = await cookies()

  // Detect test environment for different configuration
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.ENVIRONMENT === 'test' || 
                   !!process.env.X_TEST_ENVIRONMENT ||
                   supabaseUrl.includes('localhost:54321')

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
          })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          if (!isTestEnv) {
            console.debug('[Server Client] Cookie set failed in Server Component context')
          }
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
            maxAge: 0,
          })
        } catch (error) {
          // The `remove` method was called from a Server Component.
          if (!isTestEnv) {
            console.debug('[Server Client] Cookie removal failed in Server Component context')
          }
        }
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: isTestEnv, // Enable persistence in test mode for better session handling
      debug: isTestEnv,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'x-application-name': 'ai-readiness',
        ...(isTestEnv && {
          'x-test-mode': 'true',
          'x-server-client': 'true'
        })
      }
    },
    db: {
      schema: 'public'
    }
  })
}

/**
 * Synchronous version for legacy compatibility
 * Note: This creates a new client each time - use sparingly
 */
export function createServerClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
          })
        } catch (error) {
          // Ignored in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
            maxAge: 0,
          })
        } catch (error) {
          // Ignored in Server Components  
        }
      },
    },
  })
}

// Alias for backwards compatibility
export const createServerClientWithAuth = createClient