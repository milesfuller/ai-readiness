import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create the most minimal client possible
    const supabase = createClient(url, key)

    // Try the simplest signup possible
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      // Try to get more details about the error
      console.error('Signup error:', error)
      
      // Check if we can query the auth schema directly
      const { data: authCheck, error: authError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)

      return NextResponse.json({
        signupError: {
          message: error.message,
          status: error.status,
          code: error.code || 'unknown',
          details: error.message
        },
        dbCheck: {
          success: !authError,
          error: authError?.message
        },
        environment: {
          url,
          keyLength: key.length,
          keyPrefix: key.substring(0, 20) + '...'
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: data.user?.id,
      email: data.user?.email,
      session: !!data.session
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}