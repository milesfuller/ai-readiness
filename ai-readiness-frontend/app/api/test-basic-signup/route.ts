import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    // Direct REST API call to Supabase Auth with minimal payload
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`
    
    // Test 1: Absolute minimal signup - no options at all
    const minimalResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const minimalResult = await minimalResponse.json()

    // Test 2: With empty data object
    const withEmptyDataResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      },
      body: JSON.stringify({
        email: email.replace('@', '2@'), // Different email
        password,
        data: {}
      })
    })

    const withEmptyDataResult = await withEmptyDataResponse.json()

    // Test 3: Check if the issue is with the Supabase service itself
    const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    })

    const healthResult = await healthCheck.text()

    return NextResponse.json({
      tests: {
        minimal: {
          status: minimalResponse.status,
          result: minimalResult
        },
        withEmptyData: {
          status: withEmptyDataResponse.status,
          result: withEmptyDataResult
        },
        health: {
          status: healthCheck.status,
          result: healthResult
        }
      },
      debug: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}