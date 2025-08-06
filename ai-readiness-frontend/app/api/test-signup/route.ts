import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    // Method 1: Using Supabase JS Client (singleton)
    console.log('Testing with Supabase JS Client...')
    const { getSupabaseClient } = await import('@/lib/supabase')
    const supabase = await getSupabaseClient()

    const { data: clientData, error: clientError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${request.headers.get('origin')}/auth/verify-email-success`
      }
    })

    // Method 2: Direct REST API call
    console.log('Testing with direct REST API call...')
    const signupUrl = `${url}/auth/v1/signup`
    
    const directResponse = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        options: {
          emailRedirectTo: `${request.headers.get('origin')}/auth/verify-email-success`
        }
      })
    })

    const directStatus = directResponse.status
    const directText = await directResponse.text()
    let directData
    try {
      directData = JSON.parse(directText)
    } catch (_error) {
      directData = { raw: directText }
    }

    return NextResponse.json({
      clientMethod: {
        success: !clientError,
        data: clientData,
        error: clientError
      },
      directMethod: {
        status: directStatus,
        data: directData
      },
      debug: {
        url,
        keyLength: key.length
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Test signup error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}