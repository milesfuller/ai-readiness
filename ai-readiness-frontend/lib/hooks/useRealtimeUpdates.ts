'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeUpdateHookProps {
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  onUpdate: (payload: any) => void
  filter?: string
  enabled?: boolean
}

/**
 * Hook for subscribing to real-time updates from Supabase
 */
export function useRealtimeUpdates({
  table,
  event,
  onUpdate,
  filter,
  enabled = true
}: RealtimeUpdateHookProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Create a unique channel name
    const channelName = `${table}_${event}_${Date.now()}`
    
    try {
      // Create the channel
      const channel = supabase.channel(channelName)

      // Set up the subscription
      let subscription = channel.on(
        'postgres_changes' as any,
        {
          event: event,
          schema: 'public',
          table: table,
          ...(filter && { filter })
        },
        (payload) => {
          console.log(`[Realtime] ${table} ${event}:`, payload)
          onUpdate(payload)
        }
      )

      // Subscribe to the channel
      subscription.subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status)
      })

      channelRef.current = channel
    } catch (error) {
      console.error('[Realtime] Failed to set up subscription:', error)
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log(`[Realtime] Cleaning up ${table} subscription`)
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, event, filter, enabled, onUpdate])

  return {
    isConnected: !!channelRef.current
  }
}

/**
 * Hook for surveys real-time updates
 */
export function useSurveysRealtime(
  onUpdate: (type: 'INSERT' | 'UPDATE' | 'DELETE', survey: any) => void,
  organizationId?: string,
  enabled: boolean = true
) {
  const filter = organizationId ? `organization_id=eq.${organizationId}` : undefined

  return useRealtimeUpdates({
    table: 'surveys',
    event: '*',
    filter,
    enabled,
    onUpdate: (payload) => {
      onUpdate(payload.eventType, payload.new || payload.old)
    }
  })
}

/**
 * Hook for survey responses real-time updates
 */
export function useSurveyResponsesRealtime(
  onUpdate: (type: 'INSERT' | 'UPDATE' | 'DELETE', response: any) => void,
  surveyId?: string,
  enabled: boolean = true
) {
  const filter = surveyId ? `survey_id=eq.${surveyId}` : undefined

  return useRealtimeUpdates({
    table: 'survey_responses',
    event: '*',
    filter,
    enabled,
    onUpdate: (payload) => {
      onUpdate(payload.eventType, payload.new || payload.old)
    }
  })
}

/**
 * Hook for activity logs real-time updates
 */
export function useActivityLogsRealtime(
  onUpdate: (activity: any) => void,
  organizationId?: string,
  enabled: boolean = true
) {
  const filter = organizationId ? `organization_id=eq.${organizationId}` : undefined

  return useRealtimeUpdates({
    table: 'activity_logs',
    event: 'INSERT',
    filter,
    enabled,
    onUpdate: (payload) => {
      onUpdate(payload.new)
    }
  })
}

/**
 * Hook for users/profiles real-time updates
 */
export function useUsersRealtime(
  onUpdate: (type: 'INSERT' | 'UPDATE' | 'DELETE', user: any) => void,
  enabled: boolean = true
) {
  return useRealtimeUpdates({
    table: 'profiles',
    event: '*',
    enabled,
    onUpdate: (payload) => {
      onUpdate(payload.eventType, payload.new || payload.old)
    }
  })
}