'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client-browser'
import { User as AppUser } from '@/lib/types'

interface AuthContextType {
  user: AppUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error?: AuthError }>
  signOut: () => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  updatePassword: (password: string) => Promise<{ error?: AuthError }>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: new Error('Not implemented') as AuthError }),
  signUp: async () => ({ error: new Error('Not implemented') as AuthError }),
  signOut: async () => ({ error: new Error('Not implemented') as AuthError }),
  resetPassword: async () => ({ error: new Error('Not implemented') as AuthError }),
  updatePassword: async () => ({ error: new Error('Not implemented') as AuthError })
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createBrowserClient())

  // Convert Supabase User to AppUser
  const mapSupabaseUserToAppUser = useCallback((supabaseUser: User): AppUser => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role: (supabaseUser.user_metadata?.role as any) || 'user',
      organizationId: supabaseUser.user_metadata?.organization_id,
      profile: supabaseUser.user_metadata?.profile && {
        id: supabaseUser.user_metadata.profile.id,
        userId: supabaseUser.id,
        firstName: supabaseUser.user_metadata.profile.firstName,
        lastName: supabaseUser.user_metadata.profile.lastName,
        avatar: supabaseUser.user_metadata.profile.avatar,
        department: supabaseUser.user_metadata.profile.department,
        jobTitle: supabaseUser.user_metadata.profile.jobTitle,
        preferences: {
          theme: 'dark',
          notifications: true,
          voiceInput: false,
          language: 'en',
          ...supabaseUser.user_metadata.profile.preferences
        }
      },
      createdAt: supabaseUser.created_at,
      updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
      lastLogin: supabaseUser.last_sign_in_at || undefined
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ? mapSupabaseUserToAppUser(session.user) : null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setUser(session?.user ? mapSupabaseUserToAppUser(session.user) : null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth, mapSupabaseUserToAppUser])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth Context] Attempting sign in with:', { email, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('[Auth Context] Sign in error:', error)
        return { error }
      }
      
      if (data?.session) {
        console.log('[Auth Context] Sign in successful, session created:', {
          sessionId: data.session.access_token?.substring(0, 20) + '...',
          userId: data.session.user?.id,
          expires: data.session.expires_at
        })
        
        // Update the user state immediately
        setUser(mapSupabaseUserToAppUser(data.user))
        
        // For test environments, also store session in sessionStorage as backup
        const isTestEnv = process.env.NODE_ENV === 'test' || 
                         process.env.ENVIRONMENT === 'test' ||
                         window.location.hostname === 'localhost'
        
        if (isTestEnv && typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('supabase-test-session', JSON.stringify(data.session))
            console.log('[Auth Context] Test session backup stored')
          } catch (e) {
            console.warn('[Auth Context] Failed to store test session backup:', e)
          }
        }
        
        // Force refresh the session to ensure cookies are properly set
        // This is critical for the middleware to recognize the session
        const { data: refreshedSession } = await supabase.auth.refreshSession()
        if (refreshedSession?.session) {
          console.log('[Auth Context] Session refreshed successfully')
        }
      }
      
      return { error: undefined }
    } catch (err) {
      console.error('[Auth Context] SignIn unexpected error:', err)
      return { error: err as AuthError }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      // Extract firstName and lastName from nested profile if present
      const data = metadata?.profile ? {
        firstName: metadata.profile.firstName || '',
        lastName: metadata.profile.lastName || '',
        organizationName: metadata.profile.organizationName || ''
      } : metadata || {}

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data,
          emailRedirectTo: `${window.location.origin}/auth/verify-email-success`
        }
      })
      return { error: error || undefined }
    } catch (err) {
      console.error('SignUp error:', err)
      return { error: err as AuthError }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error: error || undefined }
    } catch (err) {
      console.error('SignOut error:', err)
      return { error: err as AuthError }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      return { error: error || undefined }
    } catch (err) {
      console.error('ResetPassword error:', err)
      return { error: err as AuthError }
    }
  }

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password
      })
      return { error: error || undefined }
    } catch (err) {
      console.error('UpdatePassword error:', err)
      return { error: err as AuthError }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}