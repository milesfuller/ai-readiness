import { createServerSupabaseClient } from '../supabase/server'
import { supabase } from '../supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile, UserRole } from '../types/database.types'

// Client-side auth helpers
export class AuthHelpers {
  // Sign up new user
  static async signUp(email: string, password: string, metadata?: {
    firstName?: string
    lastName?: string
    jobTitle?: string
    organization?: string
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`)
    }

    return data
  }

  // Sign in user
  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`)
    }

    return data
  }

  // Sign out user
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }
  }

  // Reset password
  static async resetPassword(email: string, redirectTo?: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      throw new Error(`Password reset failed: ${error.message}`)
    }
  }

  // Update password
  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      throw new Error(`Password update failed: ${error.message}`)
    }
  }

  // Get current session
  static async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  }

  // Get current user
  static async getCurrentUser(): Promise<User | null> {
    const session = await this.getSession()
    return session?.user || null
  }

  // Get user profile with role information
  static async getUserProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error getting user profile:', error)
      return null
    }

    return profile
  }

  // Check if user has specific role
  static async hasRole(role: UserRole): Promise<boolean> {
    const profile = await this.getUserProfile()
    if (!profile) return false

    if (role === 'admin') {
      return profile.role === 'admin'
    }
    
    if (role === 'org_admin') {
      return profile.role === 'admin' || profile.role === 'org_admin'
    }

    return true // All authenticated users have 'user' role
  }

  // Check if user is admin of specific organization
  static async isOrgAdmin(organizationId: string): Promise<boolean> {
    const profile = await this.getUserProfile()
    if (!profile) return false

    return (
      profile.role === 'admin' || 
      (profile.role === 'org_admin' && profile.organization_id === organizationId)
    )
  }

  // Update user profile
  static async updateProfile(updates: Partial<Profile>) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`)
    }

    return data
  }

  // Subscribe to auth state changes
  static onAuthStateChange(callback: (session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session)
    })
  }
}

// Server-side auth helpers
export class ServerAuthHelpers {
  // Get session from server request
  static async getSession() {
    const supabase = createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting server session:', error)
      return null
    }
    
    return session
  }

  // Get current user from server request
  static async getCurrentUser() {
    const session = await this.getSession()
    return session?.user || null
  }

  // Get user profile with role information (server-side)
  static async getUserProfile(): Promise<Profile | null> {
    const supabase = createServerSupabaseClient()
    const user = await this.getCurrentUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error getting user profile:', error)
      return null
    }

    return profile
  }

  // Server-side role checking
  static async hasRole(role: UserRole): Promise<boolean> {
    const profile = await this.getUserProfile()
    if (!profile) return false

    if (role === 'admin') {
      return profile.role === 'admin'
    }
    
    if (role === 'org_admin') {
      return profile.role === 'admin' || profile.role === 'org_admin'
    }

    return true
  }

  // Server-side organization admin check
  static async isOrgAdmin(organizationId: string): Promise<boolean> {
    const profile = await this.getUserProfile()
    if (!profile) return false

    return (
      profile.role === 'admin' || 
      (profile.role === 'org_admin' && profile.organization_id === organizationId)
    )
  }

  // Require authentication (throws if not authenticated)
  static async requireAuth() {
    const user = await this.getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  }

  // Require specific role (throws if insufficient permissions)
  static async requireRole(role: UserRole) {
    await this.requireAuth()
    const hasRequiredRole = await this.hasRole(role)
    if (!hasRequiredRole) {
      throw new Error(`Insufficient permissions: ${role} role required`)
    }
  }

  // Require organization admin (throws if not org admin)
  static async requireOrgAdmin(organizationId: string) {
    await this.requireAuth()
    const isOrgAdmin = await this.isOrgAdmin(organizationId)
    if (!isOrgAdmin) {
      throw new Error('Organization admin permissions required')
    }
  }
}

// Audit logging helper
export class AuditLogger {
  static async log(params: {
    eventType: string
    eventCategory: 'authentication' | 'survey' | 'admin' | 'data_access' | 'export' | 'system'
    description?: string
    entityType?: string
    entityId?: string
    eventData?: Record<string, any>
    beforeState?: Record<string, any>
    afterState?: Record<string, any>
    status?: 'success' | 'failure' | 'warning'
    impactLevel?: 'low' | 'medium' | 'high' | 'critical'
    userAgent?: string
    ipAddress?: string
  }) {
    try {
      const supabase = createServerSupabaseClient()
      const user = await ServerAuthHelpers.getCurrentUser()
      const profile = await ServerAuthHelpers.getUserProfile()

      await supabase.from('audit_log').insert({
        event_type: params.eventType,
        event_category: params.eventCategory,
        description: params.description,
        user_id: user?.id,
        organization_id: profile?.organization_id,
        entity_type: params.entityType,
        entity_id: params.entityId,
        event_data: params.eventData || {},
        before_state: params.beforeState,
        after_state: params.afterState,
        status: params.status || 'success',
        impact_level: params.impactLevel || 'low',
        user_agent: params.userAgent,
        ip_address: params.ipAddress,
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging should not break the main flow
    }
  }

  // Convenience methods for common audit events
  static async logAuth(event: 'signin' | 'signout' | 'signup' | 'password_reset', userEmail?: string) {
    await this.log({
      eventType: event,
      eventCategory: 'authentication',
      description: `User ${event}: ${userEmail || 'unknown'}`,
      status: 'success',
      impactLevel: 'medium',
    })
  }

  static async logSurveyAction(action: string, sessionId: string, description?: string) {
    await this.log({
      eventType: `survey_${action}`,
      eventCategory: 'survey',
      description: description || `Survey ${action}`,
      entityType: 'survey_session',
      entityId: sessionId,
      status: 'success',
      impactLevel: 'low',
    })
  }

  static async logAdminAction(action: string, affectedUserId?: string, description?: string) {
    await this.log({
      eventType: `admin_${action}`,
      eventCategory: 'admin',
      description: description || `Admin ${action}`,
      entityType: 'user',
      entityId: affectedUserId,
      status: 'success',
      impactLevel: 'high',
    })
  }
}