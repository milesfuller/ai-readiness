import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

// Browser-only Supabase client with cookie-based session management
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

  // Create SSR client with cookie-based session management
  return createSSRBrowserClient(supabaseUrl, supabaseAnonKey, {
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
        document.cookie = `${name}=${value}; path=/; ${options?.maxAge ? `max-age=${options.maxAge};` : ''} ${options?.httpOnly ? 'httponly;' : ''} ${options?.secure ? 'secure;' : ''} samesite=lax`
      },
      remove(name: string, options?: any) {
        if (typeof document === 'undefined') return
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
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