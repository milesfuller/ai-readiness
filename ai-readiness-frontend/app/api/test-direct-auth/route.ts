import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        details: {
          url: !!supabaseUrl,
          key: !!supabaseAnonKey
        }
      }, { status: 500 })
    }

    // Make direct API call to Supabase
    const signupUrl = `${supabaseUrl}/auth/v1/signup`
    
    console.log('Making request to:', signupUrl)
    console.log('With API key:', supabaseAnonKey.substring(0, 20) + '...')

    const response = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
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

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { raw: responseText }
    }

    console.log('Response status:', response.status)
    console.log('Response data:', data)

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Supabase API error',
        status: response.status,
        details: data
      }, { status: response.status })
    }

    return NextResponse.json({ 
      success: true,
      data
    })
  } catch (error) {
    console.error('Direct auth error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}