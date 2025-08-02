'use client'

import { useState, useEffect, useContext, createContext } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '../types/database.types'
import { AuthHelpers } from '../auth/auth-helpers'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: any) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>
  hasRole: (role: 'user' | 'org_admin' | 'admin') => boolean
  isOrgAdmin: (organizationId: string) => boolean
  refetchProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    async function initializeAuth() {
      try {
        const session = await AuthHelpers.getSession()
        setSession(session)
        setUser(session?.user || null)

        if (session?.user) {
          const profile = await AuthHelpers.getUserProfile()
          setProfile(profile)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = AuthHelpers.onAuthStateChange(async (session) => {
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        const profile = await AuthHelpers.getUserProfile()
        setProfile(profile)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      await AuthHelpers.signIn(email, password)
      // Auth state change will handle profile loading
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true)
    try {
      await AuthHelpers.signUp(email, password, metadata)
      // Auth state change will handle profile loading
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await AuthHelpers.signOut()
      router.push('/auth/signin')
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    await AuthHelpers.resetPassword(email)
  }

  const updatePassword = async (newPassword: string) => {
    await AuthHelpers.updatePassword(newPassword)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('User not authenticated')
    
    const updatedProfile = await AuthHelpers.updateProfile(updates)
    setProfile(updatedProfile)
    return updatedProfile
  }

  const hasRole = (role: 'user' | 'org_admin' | 'admin') => {
    if (!profile) return false

    if (role === 'admin') {
      return profile.role === 'admin'
    }
    
    if (role === 'org_admin') {
      return profile.role === 'admin' || profile.role === 'org_admin'
    }

    return true // All authenticated users have 'user' role
  }

  const isOrgAdmin = (organizationId: string) => {
    if (!profile) return false

    return (
      profile.role === 'admin' || 
      (profile.role === 'org_admin' && profile.organization_id === organizationId)
    )
  }

  const refetchProfile = async () => {
    if (!user) return
    
    const profile = await AuthHelpers.getUserProfile()
    setProfile(profile)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    hasRole,
    isOrgAdmin,
    refetchProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireRole?: 'user' | 'org_admin' | 'admin'
    requireOrgAdmin?: string // organization ID
    redirectTo?: string
  } = {}
) {
  return function AuthenticatedComponent(props: P) {
    const { user, profile, loading, hasRole, isOrgAdmin } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (loading) return

      if (!user) {
        router.push(options.redirectTo || '/auth/signin')
        return
      }

      if (options.requireRole && !hasRole(options.requireRole)) {
        router.push('/unauthorized')
        return
      }

      if (options.requireOrgAdmin && !isOrgAdmin(options.requireOrgAdmin)) {
        router.push('/unauthorized')
        return
      }
    }, [user, profile, loading, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user) {
      return null
    }

    if (options.requireRole && !hasRole(options.requireRole)) {
      return null
    }

    if (options.requireOrgAdmin && !isOrgAdmin(options.requireOrgAdmin)) {
      return null
    }

    return <Component {...props} />
  }
}

// Hook for protecting pages that require authentication
export function useRequireAuth(options: {
  requireRole?: 'user' | 'org_admin' | 'admin'
  requireOrgAdmin?: string
  redirectTo?: string
} = {}) {
  const { user, profile, loading, hasRole, isOrgAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(options.redirectTo || '/auth/signin')
      return
    }

    if (options.requireRole && !hasRole(options.requireRole)) {
      router.push('/unauthorized')
      return
    }

    if (options.requireOrgAdmin && !isOrgAdmin(options.requireOrgAdmin)) {
      router.push('/unauthorized')
      return
    }
  }, [user, profile, loading, router])

  return { user, profile, loading }
}