import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Browser-only Supabase client with explicit configuration
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only log errors in development, and only if not in test environment
    if (process.env.NODE_ENV !== 'production' && !process.env.X_TEST_ENVIRONMENT) {
      console.error('Missing Supabase environment variables:', {
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
        key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING'
      })
    }
    throw new Error('Missing Supabase environment variables')
  }

  // Detect test environment for different configuration
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.ENVIRONMENT === 'test' || 
                   process.env.X_TEST_ENVIRONMENT ||
                   supabaseUrl.includes('localhost:54321')

  // Create client with test-appropriate configuration
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: !isTestEnv, // Disable auto-refresh in tests
      persistSession: true, // Always persist sessions
      detectSessionInUrl: !isTestEnv, // Disable URL detection in tests
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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
}