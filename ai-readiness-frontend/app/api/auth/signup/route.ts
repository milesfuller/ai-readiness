import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { email, password, firstName, lastName, organizationName } = await request.json()
    
    // Get unified Supabase client (singleton)
    const supabase = await getSupabaseClient()

    // Step 1: Create the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          organizationName
        },
        emailRedirectTo: `${request.headers.get('origin')}/auth/verify-email-success`
      }
    })

    if (authError) {
      return NextResponse.json({
        error: authError.message
      }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({
        error: 'User creation failed'
      }, { status: 500 })
    }

    // Step 2: Create the profile manually (as a backup if trigger fails)
    // This uses the user's own session to create their profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        first_name: firstName || '',
        last_name: lastName || ''
      }, {
        onConflict: 'user_id'
      })

    // Don't fail signup if profile creation fails
    if (profileError) {
      console.error('Profile creation failed:', profileError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      message: 'Please check your email to verify your account'
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({
      error: 'An unexpected error occurred'
    }, { status: 500 })
  }
}