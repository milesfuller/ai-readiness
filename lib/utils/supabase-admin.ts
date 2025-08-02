import { createAdminSupabaseClient } from '../supabase/server'
import type { 
  Organization, 
  Profile, 
  Survey, 
  SurveySession, 
  OrganizationInsert,
  ProfileInsert,
  SurveyInsert 
} from '../types/database.types'

// Admin utilities for managing Supabase data
export class SupabaseAdmin {
  private static supabase = createAdminSupabaseClient()

  // Organization management
  static async createOrganization(orgData: OrganizationInsert): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`)
    }

    return data
  }

  static async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const { data, error } = await this.supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`)
    }

    return data
  }

  static async deleteOrganization(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`)
    }
  }

  static async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get organizations: ${error.message}`)
    }

    return data || []
  }

  // Profile management
  static async createProfile(profileData: ProfileInsert): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`)
    }

    return data
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return data
  }

  static async updateUserRole(userId: string, role: 'user' | 'org_admin' | 'admin'): Promise<Profile> {
    return this.updateProfile(userId, { role })
  }

  static async assignUserToOrganization(userId: string, organizationId: string): Promise<Profile> {
    return this.updateProfile(userId, { organization_id: organizationId })
  }

  static async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get profiles: ${error.message}`)
    }

    return data || []
  }

  static async getProfilesByOrganization(organizationId: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get organization profiles: ${error.message}`)
    }

    return data || []
  }

  // Survey management
  static async createSurvey(surveyData: SurveyInsert): Promise<Survey> {
    const { data, error } = await this.supabase
      .from('surveys')
      .insert(surveyData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create survey: ${error.message}`)
    }

    return data
  }

  static async cloneSurveyTemplate(templateId: string, organizationId: string): Promise<Survey> {
    // Get template survey
    const { data: template, error: templateError } = await this.supabase
      .from('surveys')
      .select('*, survey_questions(*)')
      .eq('id', templateId)
      .eq('is_template', true)
      .single()

    if (templateError || !template) {
      throw new Error('Survey template not found')
    }

    // Create new survey
    const { data: newSurvey, error: surveyError } = await this.supabase
      .from('surveys')
      .insert({
        organization_id: organizationId,
        title: template.title,
        description: template.description,
        instructions: template.instructions,
        version: template.version,
        question_count: template.question_count,
        estimated_duration_minutes: template.estimated_duration_minutes,
        is_voice_enabled: template.is_voice_enabled,
        is_anonymous: template.is_anonymous,
        jtbd_framework_version: template.jtbd_framework_version,
        custom_questions: template.custom_questions,
        status: 'active',
        is_template: false,
      })
      .select()
      .single()

    if (surveyError) {
      throw new Error(`Failed to create survey: ${surveyError.message}`)
    }

    // Clone questions
    if (template.survey_questions && template.survey_questions.length > 0) {
      const questionsData = template.survey_questions.map((q: any) => ({
        survey_id: newSurvey.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_context: q.question_context,
        placeholder_text: q.placeholder_text,
        jtbd_force: q.jtbd_force,
        force_description: q.force_description,
        input_type: q.input_type,
        is_required: q.is_required,
        max_length: q.max_length,
        min_length: q.min_length,
        options: q.options,
        order_index: q.order_index,
        is_active: q.is_active,
      }))

      const { error: questionsError } = await this.supabase
        .from('survey_questions')
        .insert(questionsData)

      if (questionsError) {
        throw new Error(`Failed to clone survey questions: ${questionsError.message}`)
      }
    }

    return newSurvey
  }

  // Session management
  static async getSurveySessionsWithDetails(organizationId?: string): Promise<any[]> {
    let query = this.supabase
      .from('survey_sessions')
      .select(`
        *,
        profiles (
          display_name,
          email,
          job_title,
          department,
          role
        ),
        surveys (
          title,
          organization_id
        ),
        organizations (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get survey sessions: ${error.message}`)
    }

    return data || []
  }

  static async getSessionAnalytics(organizationId?: string): Promise<any> {
    let baseQuery = this.supabase
      .from('survey_sessions')
      .select('status, created_at, completion_percentage, voice_usage_percentage, total_time_spent_seconds')

    if (organizationId) {
      baseQuery = baseQuery.eq('organization_id', organizationId)
    }

    const { data: sessions, error } = await baseQuery

    if (error) {
      throw new Error(`Failed to get session analytics: ${error.message}`)
    }

    const total = sessions?.length || 0
    const completed = sessions?.filter(s => s.status === 'completed').length || 0
    const inProgress = sessions?.filter(s => s.status === 'in_progress').length || 0
    const avgCompletion = sessions?.reduce((acc, s) => acc + (s.completion_percentage || 0), 0) / total || 0
    const avgTime = sessions?.reduce((acc, s) => acc + (s.total_time_spent_seconds || 0), 0) / total || 0
    const avgVoiceUsage = sessions?.reduce((acc, s) => acc + (s.voice_usage_percentage || 0), 0) / total || 0

    return {
      totalSessions: total,
      completedSessions: completed,
      inProgressSessions: inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      avgCompletionPercentage: avgCompletion,
      avgTimeSpentSeconds: avgTime,
      avgVoiceUsagePercentage: avgVoiceUsage,
    }
  }

  // Audit and monitoring
  static async getAuditLogs(
    limit: number = 100,
    eventCategory?: string,
    organizationId?: string
  ): Promise<any[]> {
    let query = this.supabase
      .from('audit_log')
      .select(`
        *,
        profiles!audit_log_user_id_fkey (
          display_name,
          email
        ),
        organizations (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (eventCategory) {
      query = query.eq('event_category', eventCategory)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`)
    }

    return data || []
  }

  static async getApiUsage(
    organizationId?: string,
    timeframe: '24h' | '7d' | '30d' = '7d'
  ): Promise<any> {
    const now = new Date()
    const startDate = new Date()
    
    switch (timeframe) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
    }

    let query = this.supabase
      .from('api_usage_log')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get API usage: ${error.message}`)
    }

    const totalCalls = data?.length || 0
    const totalTokens = data?.reduce((acc, log) => acc + (log.tokens_used || 0), 0) || 0
    const totalCost = data?.reduce((acc, log) => acc + (log.cost_estimate_cents || 0), 0) || 0
    const avgProcessingTime = data?.reduce((acc, log) => acc + (log.processing_time_ms || 0), 0) / totalCalls || 0

    const byService = data?.reduce((acc, log) => {
      const service = log.service_type
      if (!acc[service]) {
        acc[service] = { calls: 0, tokens: 0, cost: 0 }
      }
      acc[service].calls += 1
      acc[service].tokens += log.tokens_used || 0
      acc[service].cost += log.cost_estimate_cents || 0
      return acc
    }, {} as Record<string, any>) || {}

    return {
      totalCalls,
      totalTokens,
      totalCostCents: totalCost,
      avgProcessingTimeMs: avgProcessingTime,
      byService,
      timeframe,
    }
  }

  // System maintenance
  static async cleanupExpiredSessions(): Promise<number> {
    const { data, error } = await this.supabase.rpc('cleanup_expired_sessions')

    if (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error.message}`)
    }

    return data || 0
  }

  static async generateSystemReport(): Promise<any> {
    try {
      const [
        organizations,
        profiles,
        sessionAnalytics,
        auditLogs,
        apiUsage
      ] = await Promise.all([
        this.getAllOrganizations(),
        this.getAllProfiles(),
        this.getSessionAnalytics(),
        this.getAuditLogs(50),
        this.getApiUsage(undefined, '7d')
      ])

      return {
        summary: {
          totalOrganizations: organizations.length,
          totalUsers: profiles.length,
          activeOrganizations: organizations.filter(o => o.is_active).length,
          activeUsers: profiles.filter(p => p.is_active).length,
        },
        sessionAnalytics,
        apiUsage,
        recentActivity: auditLogs.slice(0, 10),
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`Failed to generate system report: ${error}`)
    }
  }

  // Database utilities
  static async runMigration(migrationSql: string): Promise<void> {
    const { error } = await this.supabase.rpc('exec', { sql: migrationSql })

    if (error) {
      throw new Error(`Migration failed: ${error.message}`)
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('count(*)')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }

  // Backup and restore (basic implementation)
  static async exportOrganizationData(organizationId: string): Promise<any> {
    try {
      const [organization, profiles, surveys, sessions] = await Promise.all([
        this.supabase.from('organizations').select('*').eq('id', organizationId).single(),
        this.supabase.from('profiles').select('*').eq('organization_id', organizationId),
        this.supabase.from('surveys').select('*, survey_questions(*)').eq('organization_id', organizationId),
        this.supabase.from('survey_sessions').select('*, survey_responses(*, response_analysis(*))').eq('organization_id', organizationId)
      ])

      return {
        organization: organization.data,
        profiles: profiles.data,
        surveys: surveys.data,
        sessions: sessions.data,
        exportedAt: new Date().toISOString(),
      }
    } catch (error) {
      throw new Error(`Failed to export organization data: ${error}`)
    }
  }
}