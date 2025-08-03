import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password, action } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required' 
      }, { status: 400 })
    }

    const supabase = createClient()
    
    if (action === 'register') {
      // Test registration
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${request.headers.get('origin')}/auth/verify-email-success`
        }
      })
      
      if (error) {
        console.error('Registration error:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error
        }, { status: 400 })
      }
      
      // Check if user was created
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user?.id)
        .single()
      
      return NextResponse.json({ 
        success: true,
        user: data.user,
        profile: userData,
        profileError: userError
      })
    } else {
      // Test login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Login error:', error)
        return NextResponse.json({ 
          error: error.message,
          details: error
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: true,
        user: data.user,
        session: data.session
      })
    }
  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}