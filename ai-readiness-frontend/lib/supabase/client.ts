import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { registerClient, getClient } from './singleton'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton function that ensures only one client instance exists
export function createClient(): SupabaseClient {
  // Check if instance already exists in global registry
  const existingClient = getClient('general')
  if (existingClient) {
    return existingClient
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only log errors in development, and only if not in test environment
    if (process.env.NODE_ENV !== 'production' && !process.env.X_TEST_ENVIRONMENT) {
      console.error('Supabase environment variables:', {
        url: supabaseUrl ? 'Set' : 'Missing',
        key: supabaseAnonKey ? 'Set' : 'Missing'
      })
    }
    throw new Error('Missing Supabase environment variables')
  }

  // Create new client instance
  const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'x-application-name': 'ai-readiness'
      }
    }
  })

  // Register in singleton registry and return
  return registerClient('general', client)
}

// For backward compatibility - now uses singleton
export const supabase = createClient()