import { NextResponse } from 'next/server'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { headers } from 'next/headers'

export const runtime = 'edge'

export async function POST(request: Request) {
  const supabase = createClientComponentClient()
  const requestData = await request.json()
  const { email, password } = requestData

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'Not set',
      headers: Object.fromEntries(headers().entries())
    },
    tests: [] as any[]
  }

  // Test 1: Check Supabase client initialization
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    diagnostics.tests.push({
      test: 'Supabase client initialization',
      success: true,
      result: 'Client initialized successfully'
    })
  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Supabase client initialization',
      success: false,
      error: error.message
    })
  }

  // Test 2: Direct API call to Supabase Auth
  try {
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          timestamp: new Date().toISOString()
        }
      })
    })

    const authResult = await authResponse.json()
    diagnostics.tests.push({
      test: 'Direct Auth API call',
      success: authResponse.ok,
      status: authResponse.status,
      result: authResult
    })
  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Direct Auth API call',
      success: false,
      error: error.message
    })
  }

  // Test 3: Check auth settings via REST API
  try {
    const settingsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`
    const settingsResponse = await fetch(settingsUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    })

    const settings = await settingsResponse.json()
    diagnostics.tests.push({
      test: 'Auth settings check',
      success: settingsResponse.ok,
      result: settings
    })
  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Auth settings check',
      success: false,
      error: error.message
    })
  }

  // Test 4: Try signUp with Supabase client
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          test_timestamp: new Date().toISOString()
        }
      }
    })

    diagnostics.tests.push({
      test: 'Supabase client signUp',
      success: !error,
      data: data ? {
        user: data.user?.id,
        session: !!data.session
      } : null,
      error: error?.message,
      errorDetails: error
    })
  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Supabase client signUp',
      success: false,
      error: error.message,
      errorStack: error.stack
    })
  }

  // Test 5: Check database connectivity
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(0)

    diagnostics.tests.push({
      test: 'Database connectivity',
      success: !error,
      error: error?.message
    })
  } catch (error: any) {
    diagnostics.tests.push({
      test: 'Database connectivity',
      success: false,
      error: error.message
    })
  }

  return NextResponse.json(diagnostics, { status: 200 })
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method with email and password to run diagnostics',
    example: {
      email: 'test@example.com',
      password: 'testpassword123'
    }
  })
}