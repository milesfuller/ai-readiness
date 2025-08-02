import { createMiddlewareSupabaseClient } from './lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/survey',
  '/analytics',
  '/settings',
  '/profile'
]

// Define admin-only routes
const adminRoutes = [
  '/admin'
]

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/callback',
  '/survey/anonymous',
  '/api/webhook'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return response
  }

  // Allow API routes to handle their own auth
  if (pathname.startsWith('/api/')) {
    return response
  }

  // Allow static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return response
  }

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareSupabaseClient(request, response)

    // Get user session
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    // If there's an auth error or no user, redirect to signin
    if (error || !user) {
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if route requires authentication
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Check admin routes
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
    
    if (isAdminRoute && user) {
      // Get user profile to check role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile || profile.role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // For survey routes, check if user has access to the specific survey/organization
    if (pathname.startsWith('/survey/') && !pathname.startsWith('/survey/anonymous')) {
      const surveyId = pathname.split('/')[2]
      
      if (surveyId && surveyId !== 'new') {
        // Get survey and check permissions
        const { data: survey, error: surveyError } = await supabase
          .from('surveys')
          .select('organization_id')
          .eq('id', surveyId)
          .single()

        if (surveyError) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .single()

        if (profileError) {
          return NextResponse.redirect(new URL('/auth/signin', request.url))
        }

        // Check if user has access to this survey
        const hasAccess = 
          profile.role === 'admin' || 
          (profile.role === 'org_admin' && profile.organization_id === survey.organization_id) ||
          profile.organization_id === survey.organization_id

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    }

    // For organization-specific routes
    if (pathname.startsWith('/organization/')) {
      const orgId = pathname.split('/')[2]
      
      if (orgId && orgId !== 'new') {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, organization_id')
          .eq('user_id', user.id)
          .single()

        if (profileError) {
          return NextResponse.redirect(new URL('/auth/signin', request.url))
        }

        // Check if user has access to this organization
        const hasAccess = 
          profile.role === 'admin' || 
          (profile.role === 'org_admin' && profile.organization_id === orgId) ||
          profile.organization_id === orgId

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    
    // On error, redirect to signin for protected routes
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}