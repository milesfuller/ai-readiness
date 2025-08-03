import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Test 1: Check auth.users table permissions
    let authTest = null
    let authError: any = null
    try {
      const result = await supabase.rpc('get_auth_users_count').single()
      authTest = result.data
      authError = result.error
    } catch (e) {
      authError = 'Function does not exist'
    }

    // Test 2: Check profiles table
    const { count: profileCount, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Test 3: Check if we can read from auth schema (usually restricted)
    const { data: sessionTest, error: sessionError } = await supabase.auth.getSession()

    // Test 4: Check RLS policies
    let policies = null
    let policiesError: any = null
    try {
      const result = await supabase.rpc('get_policies', { table_name: 'profiles' })
      policies = result.data
      policiesError = result.error
    } catch (e) {
      policiesError = 'Function does not exist'
    }

    // Test 5: Direct REST API test
    const restUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=count`
    const restResponse = await fetch(restUrl, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Prefer': 'count=exact'
      }
    })

    return NextResponse.json({
      diagnostics: {
        authUsers: {
          success: !authError,
          error: authError
        },
        profiles: {
          count: profileCount,
          error: profileError
        },
        session: {
          hasSession: !!sessionTest?.session,
          error: sessionError
        },
        policies: {
          data: policies,
          error: policiesError
        },
        restApi: {
          status: restResponse.status,
          headers: Object.fromEntries(restResponse.headers.entries())
        }
      },
      project: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}