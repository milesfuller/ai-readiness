import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const envCheck = {
    supabase: {
      url: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        format: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') && 
                process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co'),
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
               process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET'
      },
      anonKey: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        format: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ'),
        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
               process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'NOT SET'
      }
    },
    anthropic: {
      apiKey: {
        exists: !!process.env.ANTHROPIC_API_KEY,
        format: process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-api03-'),
        value: process.env.ANTHROPIC_API_KEY ? 'SET (hidden)' : 'NOT SET'
      }
    },
    nodeEnv: process.env.NODE_ENV,
    vercel: {
      env: process.env.VERCEL_ENV,
      url: process.env.VERCEL_URL
    }
  }

  return NextResponse.json(envCheck, { status: 200 })
}