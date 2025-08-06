import { createServerClient as createSSRServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = await cookies()

  // Detect test environment
  const isTestEnv = process.env.NODE_ENV === 'test' || 
                   process.env.ENVIRONMENT === 'test' || 
                   supabaseUrl.includes('localhost:54321')

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options?: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options?: any) {
        cookieStore.delete(name)
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: isTestEnv, // Enable persistence in test mode for better session handling
      debug: isTestEnv
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        ...(isTestEnv && {
          'x-test-mode': 'true',
          'x-server-client': 'true'
        })
      }
    }
  })
}

// Export createServerClient as an alias
export const createServerClient = createClient

// Create a server client with cookie handling for auth
export async function createServerClientWithAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    }
  })
}