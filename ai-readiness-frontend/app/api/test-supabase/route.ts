import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 })
    }

    // Test 1: Direct API call to Supabase
    const healthUrl = `${url}/rest/v1/`
    const healthResponse = await fetch(healthUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    })

    const healthStatus = healthResponse.status
    const healthText = await healthResponse.text()

    // Test 2: Try to query a table
    const tablesUrl = `${url}/rest/v1/profiles?select=count`
    const tablesResponse = await fetch(tablesUrl, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    })

    const tablesStatus = tablesResponse.status
    const tablesText = await tablesResponse.text()

    // Test 3: Create Supabase client (using singleton)
    const { getSupabaseClient } = await import('@/lib/supabase')
    const supabase = await getSupabaseClient()
    
    // Try to get session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    return NextResponse.json({
      tests: {
        health: {
          status: healthStatus,
          response: healthText
        },
        tables: {
          status: tablesStatus,
          response: tablesText
        },
        client: {
          session: sessionData?.session ? 'Has session' : 'No session',
          error: sessionError?.message || null
        }
      },
      environment: {
        url: url,
        keyLength: key.length,
        keyPrefix: key.substring(0, 20) + '...'
      }
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}