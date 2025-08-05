import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check if environment variables exist
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        status: 'unhealthy',
        connection: false,
        error: 'Missing Supabase environment variables',
        diagnostics: {
          url: !!supabaseUrl,
          key: !!supabaseKey
        }
      })
    }

    // Simple health check - just test if we can reach the Supabase REST API
    const healthCheckUrl = `${supabaseUrl}/rest/v1/`
    
    try {
      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      })

      const isHealthy = response.ok || response.status === 404 // 404 is ok, it means API is reachable
      
      return NextResponse.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        connection: isHealthy,
        diagnostics: {
          restApi: {
            status: response.status,
            statusText: response.statusText,
            reachable: true
          },
          environment: {
            url: supabaseUrl ? 'SET' : 'NOT SET',
            key: supabaseKey ? 'SET' : 'NOT SET',
            urlLength: supabaseUrl?.length || 0,
            keyLength: supabaseKey?.length || 0
          }
        },
        timestamp: new Date().toISOString()
      })
    } catch (fetchError) {
      return NextResponse.json({
        status: 'unhealthy',
        connection: false,
        error: 'Failed to connect to Supabase',
        diagnostics: {
          restApi: {
            reachable: false,
            error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
          },
          environment: {
            url: 'SET',
            key: 'SET'
          }
        },
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      connection: false,
      error: 'Diagnostics failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}