'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import type { 
  Database, 
  Tables, 
  Organization, 
  Survey, 
  SurveySession, 
  SurveyResponse,
  OrganizationInsights 
} from '../types/database.types'

// Generic hook for Supabase queries
export function useSupabaseQuery<T>(
  query: () => Promise<{ data: T | null; error: any }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      
      try {
        const result = await query()
        if (result.error) {
          setError(result.error)
        } else {
          setData(result.data)
        }
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  return { data, error, loading, refetch: () => fetchData() }
}

// Hook for organization data
export function useOrganizations() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from('organizations')
      .select('*')
      .eq('is_active', true)
      .order('name')
  })
}

export function useOrganization(organizationId: string | null) {
  return useSupabaseQuery(async () => {
    if (!organizationId) return { data: null, error: null }
    
    return await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
  }, [organizationId])
}

// Hook for survey data
export function useSurveys(organizationId?: string) {
  return useSupabaseQuery(async () => {
    let query = supabase
      .from('surveys')
      .select('*')
      .order('created_at', { ascending: false })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    return await query
  }, [organizationId])
}

export function useSurvey(surveyId: string | null) {
  return useSupabaseQuery(async () => {
    if (!surveyId) return { data: null, error: null }
    
    return await supabase
      .from('surveys')
      .select(`
        *,
        survey_questions (*)
      `)
      .eq('id', surveyId)
      .single()
  }, [surveyId])
}

// Hook for survey sessions
export function useSurveySessions(surveyId?: string, organizationId?: string) {
  return useSupabaseQuery(async () => {
    let query = supabase
      .from('survey_sessions')
      .select(`
        *,
        profiles (
          display_name,
          email,
          job_title,
          department
        )
      `)
      .order('created_at', { ascending: false })

    if (surveyId) {
      query = query.eq('survey_id', surveyId)
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    return await query
  }, [surveyId, organizationId])
}

export function useSurveySession(sessionId: string | null) {
  return useSupabaseQuery(async () => {
    if (!sessionId) return { data: null, error: null }
    
    return await supabase
      .from('survey_sessions')
      .select(`
        *,
        survey_responses (
          *,
          survey_questions (*)
        ),
        surveys (
          title,
          description
        )
      `)
      .eq('id', sessionId)
      .single()
  }, [sessionId])
}

// Hook for survey responses
export function useSurveyResponses(sessionId: string | null) {
  return useSupabaseQuery(async () => {
    if (!sessionId) return { data: null, error: null }
    
    return await supabase
      .from('survey_responses')
      .select(`
        *,
        survey_questions (*),
        response_analysis (*)
      `)
      .eq('session_id', sessionId)
      .order('created_at')
  }, [sessionId])
}

// Hook for organization insights
export function useOrganizationInsights(organizationId: string | null, surveyId?: string) {
  return useSupabaseQuery(async () => {
    if (!organizationId) return { data: null, error: null }
    
    let query = supabase
      .from('organization_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_latest', true)

    if (surveyId) {
      query = query.eq('survey_id', surveyId)
    }

    return await query.order('generated_at', { ascending: false })
  }, [organizationId, surveyId])
}

// Hook for real-time subscriptions
export function useRealtimeSubscription<T extends keyof Database['public']['Tables']>(
  table: T,
  filter?: string,
  callback?: (payload: any) => void
) {
  useEffect(() => {
    let subscription: any

    const setupSubscription = () => {
      subscription = supabase
        .channel(`realtime_${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter,
          },
          (payload) => {
            console.log('Realtime update:', payload)
            if (callback) {
              callback(payload)
            }
          }
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [table, filter, callback])
}

// Hook for survey session progress tracking
export function useSurveyProgress(sessionId: string | null) {
  const [progress, setProgress] = useState({
    currentQuestion: 1,
    totalQuestions: 12,
    completionPercentage: 0,
    timeSpent: 0,
  })

  useEffect(() => {
    if (!sessionId) return

    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('survey_sessions')
        .select('current_question_number, total_questions, completion_percentage, total_time_spent_seconds')
        .eq('id', sessionId)
        .single()

      if (data && !error) {
        setProgress({
          currentQuestion: data.current_question_number,
          totalQuestions: data.total_questions,
          completionPercentage: data.completion_percentage,
          timeSpent: data.total_time_spent_seconds,
        })
      }
    }

    fetchProgress()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`session_progress_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'survey_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const updated = payload.new as any
          setProgress({
            currentQuestion: updated.current_question_number,
            totalQuestions: updated.total_questions,
            completionPercentage: updated.completion_percentage,
            timeSpent: updated.total_time_spent_seconds,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [sessionId])

  return progress
}

// Hook for analytics data
export function useAnalytics(organizationId: string | null, timeframe: '24h' | '7d' | '30d' = '7d') {
  return useSupabaseQuery(async () => {
    if (!organizationId) return { data: null, error: null }

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

    // Get session analytics
    const { data: sessionData, error: sessionError } = await supabase
      .from('survey_sessions')
      .select('status, created_at, completion_percentage, voice_usage_percentage')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())

    if (sessionError) return { data: null, error: sessionError }

    // Get response analytics
    const { data: responseData, error: responseError } = await supabase
      .from('survey_responses')
      .select('input_method, response_quality, created_at')
      .in('session_id', sessionData?.map(s => s.id) || [])

    if (responseError) return { data: null, error: responseError }

    return {
      data: {
        sessions: sessionData,
        responses: responseData,
        totalSessions: sessionData?.length || 0,
        completedSessions: sessionData?.filter(s => s.status === 'completed').length || 0,
        avgCompletion: sessionData?.reduce((acc, s) => acc + (s.completion_percentage || 0), 0) / (sessionData?.length || 1),
        voiceUsage: responseData?.filter(r => r.input_method === 'voice' || r.input_method === 'mixed').length || 0,
      },
      error: null,
    }
  }, [organizationId, timeframe])
}

// Hook for database mutations
export function useSupabaseMutation<T>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const mutate = async (mutation: () => Promise<{ data: T | null; error: any }>) => {
    setLoading(true)
    setError(null)

    try {
      const result = await mutation()
      if (result.error) {
        setError(result.error)
        throw result.error
      }
      return result.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}