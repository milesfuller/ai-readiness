import { createClient } from '@supabase/supabase-js'

export async function signUpUser(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create a fresh client for each signup attempt
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  try {
    // First, try the standard signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email-success`,
        data: {
          // Add any metadata that might be required by the trigger
          firstName: '',
          lastName: ''
        }
      }
    })

    if (error) {
      console.error('Signup error:', error)
      
      // If it's a database error, it might be the trigger failing
      if (error.message.includes('Database error')) {
        // Try without metadata
        const { data: retryData, error: retryError } = await supabase.auth.signUp({
          email,
          password
        })

        if (retryError) {
          throw retryError
        }

        return { data: retryData, error: null }
      }

      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Signup failed:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('Unknown error during signup')
    }
  }
}