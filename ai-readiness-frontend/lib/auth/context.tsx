'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
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

  // Convert Supabase User to AppUser
  const mapSupabaseUserToAppUser = (supabaseUser: User): AppUser => {
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
  }

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
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error: error || undefined }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { error: error || undefined }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error: error || undefined }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error: error || undefined }
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password
    })
    return { error: error || undefined }
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