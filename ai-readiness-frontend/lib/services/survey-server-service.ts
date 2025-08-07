/**
 * Server-side Survey Service
 * 
 * This file should ONLY be imported by API routes and server components.
 * Never import this in client components to avoid build errors.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Server-side survey service for API routes only
 */
export async function createServerSurveyService() {
  const supabase = await createClient()

  return {
    /**
     * Get survey response by ID
     */
    async getResponse(responseId: string) {
      try {
        const { data, error } = await supabase
          .from('survey_responses')
          .select('*')
          .eq('id', responseId)
          .single()

        if (error) {
          console.error('Error fetching survey response:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('Error in getResponse:', error)
        return null
      }
    },

    /**
     * Get survey by ID
     */
    async getSurvey(surveyId: string) {
      try {
        const { data, error } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', surveyId)
          .single()

        if (error) {
          console.error('Error fetching survey:', error)
          return null
        }

        return data
      } catch (error) {
        console.error('Error in getSurvey:', error)
        return null
      }
    },

    /**
     * Update survey status
     */
    async updateSurveyStatus(surveyId: string, status: 'draft' | 'active' | 'closed') {
      try {
        const { error } = await supabase
          .from('surveys')
          .update({ 
            status,
            updated_at: new Date().toISOString(),
            ...(status === 'closed' && { closed_at: new Date().toISOString() })
          })
          .eq('id', surveyId)

        if (error) {
          console.error('Error updating survey status:', error)
          return false
        }

        return true
      } catch (error) {
        console.error('Error in updateSurveyStatus:', error)
        return false
      }
    }
  }
}