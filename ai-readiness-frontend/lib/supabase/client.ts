import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a function that creates the client when called
export function createClient() {
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

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
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
}

// For backward compatibility
export const supabase = createClient()