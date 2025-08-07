/**
 * Survey Service
 * 
 * Handles survey-related business logic, data access, and API interactions
 */

import { createClient } from '@/lib/supabase/client'

export interface SurveyAnswer {
  questionId: string
  answer: string
  inputMethod: 'text' | 'voice'
  timeSpent?: number
  confidence?: number
  audioUrl?: string
}

export interface SurveySubmission {
  sessionId: string
  answers: SurveyAnswer[]
  metadata: {
    completionTime: number
    userAgent?: string
    device?: string
    voiceInputUsed?: boolean
    ipAddress?: string
  }
}

export interface SurveySession {
  sessionId: string
  userId: string
  surveyId?: string
  answers: Record<string, SurveyAnswer>
  currentQuestionIndex: number
  startedAt: Date
  lastUpdated: Date
  timeSpent: number
  status: 'in_progress' | 'completed' | 'abandoned'
}

export interface SurveyResponse {
  id: string
  surveyId: string
  userId: string
  answers: Record<string, any>
  status: 'in_progress' | 'completed'
  startedAt: string
  completedAt?: string
  metadata: any
}

/**
 * Client-side survey service for browser operations
 */
export class SurveyService {
  private supabase = createClient()
  
  /**
   * Submit complete survey responses to the server
   */
  async submitSurvey(submission: SurveySubmission): Promise<{
    success: boolean
    responseId?: string
    surveyId?: string
    error?: string
  }> {
    try {
      console.log('Submitting survey via API:', {
        sessionId: submission.sessionId,
        answersCount: submission.answers.length
      })

      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Survey submission failed:', data)
        return {
          success: false,
          error: data.error || 'Failed to submit survey'
        }
      }

      console.log('Survey submitted successfully:', data)
      return {
        success: true,
        responseId: data.responseId,
        surveyId: data.surveyId
      }
      
    } catch (error) {
      console.error('Error submitting survey:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Save survey progress (for auto-save functionality)
   */
  async saveProgress(sessionId: string, answers: Record<string, SurveyAnswer>): Promise<boolean> {
    try {
      // Store progress in local storage as backup
      const progressData = {
        sessionId,
        answers,
        lastSaved: new Date().toISOString()
      }
      
      localStorage.setItem(`survey_progress_${sessionId}`, JSON.stringify(progressData))
      
      // Save to server for cross-device sync
      const response = await fetch('/api/survey/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers,
          timeSpent: Date.now(), // This would be calculated properly in real implementation
        })
      })
      
      if (response.ok) {
        console.log('Survey progress saved to server:', { sessionId, answersCount: Object.keys(answers).length })
      } else {
        console.warn('Failed to save progress to server, using local storage only')
      }
      
      return true
    } catch (error) {
      console.error('Error saving survey progress:', error)
      return false
    }
  }

  /**
   * Load survey progress from storage
   */
  async loadProgress(sessionId: string): Promise<Record<string, SurveyAnswer> | null> {
    try {
      const stored = localStorage.getItem(`survey_progress_${sessionId}`)
      if (stored) {
        const data = JSON.parse(stored)
        console.log('Loaded survey progress from local storage:', { 
          sessionId: data.sessionId, 
          answersCount: Object.keys(data.answers || {}).length 
        })
        return data.answers || {}
      }
      return null
    } catch (error) {
      console.error('Error loading survey progress:', error)
      return null
    }
  }

  /**
   * Get survey session data
   */
  async getSession(sessionId: string): Promise<SurveySession | null> {
    try {
      // For now, create a basic session object
      // In production, this would fetch from the database
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user for session')
        return null
      }

      const answers = await this.loadProgress(sessionId) || {}

      return {
        sessionId,
        userId: user.id,
        answers,
        currentQuestionIndex: 0,
        startedAt: new Date(),
        lastUpdated: new Date(),
        timeSpent: 0,
        status: 'in_progress'
      }
    } catch (error) {
      console.error('Error getting survey session:', error)
      return null
    }
  }

  /**
   * Clear survey progress (useful for testing or reset)
   */
  clearProgress(sessionId: string): void {
    try {
      localStorage.removeItem(`survey_progress_${sessionId}`)
      console.log('Survey progress cleared for session:', sessionId)
    } catch (error) {
      console.error('Error clearing survey progress:', error)
    }
  }

  /**
   * Get user's survey responses
   */
  async getUserResponses(): Promise<SurveyResponse[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return []
      }

      const { data, error } = await this.supabase
        .from('survey_responses')
        .select(`
          id,
          survey_id,
          answers,
          metadata,
          submitted_at,
          surveys (
            id,
            title,
            description
          )
        `)
        .eq('respondent_id', user.id)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.error('Error fetching user responses:', error)
        return []
      }

      return data.map(response => ({
        id: response.id,
        surveyId: response.survey_id,
        userId: user.id,
        answers: response.answers,
        status: 'completed' as const,
        startedAt: response.submitted_at,
        completedAt: response.submitted_at,
        metadata: response.metadata
      }))
      
    } catch (error) {
      console.error('Error in getUserResponses:', error)
      return []
    }
  }
}


// Export singleton instance for client-side use
export const surveyService = new SurveyService()

// Utility functions
export function validateSurveyAnswers(answers: SurveyAnswer[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!answers || answers.length === 0) {
    errors.push('No answers provided')
    return { isValid: false, errors }
  }

  answers.forEach((answer, index) => {
    if (!answer.questionId) {
      errors.push(`Answer ${index + 1}: Question ID is required`)
    }
    
    if (!answer.answer || answer.answer.trim().length === 0) {
      errors.push(`Answer ${index + 1}: Answer text is required`)
    }
    
    if (answer.inputMethod && !['text', 'voice'].includes(answer.inputMethod)) {
      errors.push(`Answer ${index + 1}: Invalid input method`)
    }
    
    if (answer.confidence !== undefined && (answer.confidence < 0 || answer.confidence > 100)) {
      errors.push(`Answer ${index + 1}: Confidence must be between 0 and 100`)
    }
  })

  return { isValid: errors.length === 0, errors }
}

export function formatSurveyAnswersForSubmission(
  sessionId: string,
  answers: Record<string, SurveyAnswer>,
  metadata: Partial<SurveySubmission['metadata']>
): SurveySubmission {
  return {
    sessionId,
    answers: Object.values(answers),
    metadata: {
      completionTime: metadata.completionTime || 0,
      userAgent: metadata.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : undefined),
      device: metadata.device || 'unknown',
      voiceInputUsed: metadata.voiceInputUsed || Object.values(answers).some(a => a.inputMethod === 'voice'),
      ipAddress: metadata.ipAddress
    }
  }
}