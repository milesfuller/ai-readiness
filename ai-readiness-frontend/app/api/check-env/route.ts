import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Get all environment variables
  const envVars = {
    // Check different ways the env vars might be accessed
    directAccess: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    },
    // Check if they exist at all
    exists: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    },
    // Check lengths
    lengths: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      anthropic: process.env.ANTHROPIC_API_KEY?.length || 0
    },
    // Check for common issues
    issues: {
      urlHasQuotes: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('"') || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("'"),
      keyHasQuotes: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('"') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("'"),
      urlHasSpaces: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(' '),
      keyHasSpaces: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes(' '),
      urlStartsCorrectly: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://'),
      keyIsJWT: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ')
    },
    // Masked values for debugging
    masked: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 'NOT SET',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
      anthropic: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET'
    }
  }

  return NextResponse.json(envVars, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  })
}