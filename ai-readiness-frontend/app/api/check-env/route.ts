import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Get environment variables in the format expected by tests
  const response = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    // Additional diagnostic info for debugging
    debug: {
      exists: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY
      },
      lengths: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        anthropic: process.env.ANTHROPIC_API_KEY?.length || 0
      },
      validation: {
        urlStartsCorrectly: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://'),
        keyIsJWT: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ'),
        urlHasQuotes: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('"') || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("'"),
        keyHasQuotes: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('"') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("'")
      },
      masked: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 'NOT SET',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
        anthropic: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET'
      }
    }
  }

  return NextResponse.json(response, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}