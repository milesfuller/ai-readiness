import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createComprehensiveSecurityMiddleware } from './lib/security/middleware'

// Initialize comprehensive security middleware
const securityMiddleware = createComprehensiveSecurityMiddleware({
  headers: {
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    csp: {
      enabled: true,
      reportOnly: process.env.NODE_ENV === 'development',
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-inline'", // Required for Next.js
          "'unsafe-eval'", // Required for Next.js development
          'https://vercel.live',
          'https://va.vercel-scripts.com',
          'https://cdn.vercel-insights.com'
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'", // Required for styled-components
          'https://fonts.googleapis.com'
        ],
        'font-src': [
          "'self'",
          'https://fonts.gstatic.com',
          'data:'
        ],
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https:',
          '*.supabase.co',
          '*.supabase.com'
        ],
        'connect-src': [
          "'self'",
          'https://api.openai.com',
          'https://api.anthropic.com',
          'https://generativelanguage.googleapis.com',
          '*.supabase.co',
          '*.supabase.com',
          'wss://*.supabase.co',
          'wss://*.supabase.com',
          'https://vercel.live',
          'https://va.vercel-scripts.com'
        ],
        'frame-src': ["'self'", 'https://vercel.live'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': []
      }
    }
  },
  rateLimit: {
    enabled: true,
    configs: {} // Will use default configs from middleware
  },
  csrf: {
    enabled: false // Temporarily disabled for Edge Runtime compatibility
  },
  monitoring: {
    enabled: true,
    blockSuspiciousIPs: process.env.NODE_ENV === 'production'
  },
  validation: {
    enabled: true,
    strictMode: process.env.NODE_ENV === 'production'
  }
})

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Apply security middleware first
  const securityResponse = await securityMiddleware(request)
  
  // If security middleware blocked the request, return early
  if (securityResponse.status !== 200 && securityResponse.status !== 301 && securityResponse.status !== 302) {
    return securityResponse
  }

  // Continue with authentication logic
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { session } } = await supabase.auth.getSession()

  // Auth routes that should redirect to dashboard if user is logged in
  const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/survey', '/analytics', '/admin', '/profile']

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/verify-email', '/auth/verify-email-success', '/terms', '/privacy', '/support']

  // Redirect authenticated users away from auth pages
  if (session && authRoutes.includes(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    // Copy security headers to redirect response
    securityResponse.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value)
    })
    return redirectResponse
  }

  // Redirect unauthenticated users to login from protected routes
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    // Copy security headers to redirect response
    securityResponse.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value)
    })
    return redirectResponse
  }

  // For root path, redirect based on auth status
  if (pathname === '/') {
    const redirectUrl = session ? '/dashboard' : '/auth/login'
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url))
    // Copy security headers to redirect response
    securityResponse.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value)
    })
    return redirectResponse
  }

  // Copy security headers to the response
  securityResponse.headers.forEach((value, key) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}