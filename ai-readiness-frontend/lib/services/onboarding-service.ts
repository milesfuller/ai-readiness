'use client'

import { createClient } from '@/lib/supabase/client'
import { OnboardingState, OnboardingProgress, Organization, UserProfile } from '@/lib/types'

export class OnboardingService {
  private supabase = createClient()

  // Get onboarding progress for a user
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
    try {
      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        throw error
      }

      return data || null
    } catch (error) {
      console.error('Error fetching onboarding progress:', error)
      return null
    }
  }

  // Save onboarding progress
  async saveOnboardingProgress(
    userId: string, 
    progress: Partial<OnboardingProgress>
  ): Promise<OnboardingProgress> {
    try {
      const { data, error } = await this.supabase
        .from('onboarding_progress')
        .upsert({
          user_id: userId,
          current_step: progress.currentStep,
          completed_steps: progress.completedSteps,
          data: progress.data,
          started_at: progress.startedAt || new Date().toISOString(),
          completed_at: progress.completedAt
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving onboarding progress:', error)
      throw error
    }
  }

  // Complete onboarding
  async completeOnboarding(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('onboarding_progress')
        .update({
          completed_at: new Date().toISOString(),
          current_step: -1 // Mark as complete
        })
        .eq('user_id', userId)

      if (error) throw error

      // Update user metadata to mark onboarding as complete
      const { error: userError } = await this.supabase.auth.updateUser({
        data: {
          onboarding_completed: true
        }
      })

      if (userError) throw userError
    } catch (error) {
      console.error('Error completing onboarding:', error)
      throw error
    }
  }

  // Save profile data
  async saveProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          first_name: profile.firstName,
          last_name: profile.lastName,
          avatar: profile.avatar,
          department: profile.department,
          job_title: profile.jobTitle,
          preferences: profile.preferences || {
            theme: 'dark',
            notifications: true,
            voiceInput: false,
            language: 'en'
          }
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving profile:', error)
      throw error
    }
  }

  // Get organizations for selection
  async getOrganizations(): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('settings->allowSelfRegistration', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching organizations:', error)
      return []
    }
  }

  // Create new organization
  async createOrganization(
    organizationData: Partial<Organization>,
    userId: string
  ): Promise<Organization> {
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .insert({
          name: organizationData.name,
          domain: organizationData.domain,
          settings: {
            allowSelfRegistration: true,
            defaultRole: 'user',
            requireEmailVerification: false,
            ...organizationData.settings
          }
        })
        .select()
        .single()

      if (error) throw error

      // Assign user as admin of the new organization
      await this.assignUserToOrganization(userId, data.id, 'org_admin')

      return data
    } catch (error) {
      console.error('Error creating organization:', error)
      throw error
    }
  }

  // Assign user to organization
  async assignUserToOrganization(
    userId: string, 
    organizationId: string, 
    role: string = 'user'
  ): Promise<void> {
    try {
      // Update user metadata with organization info
      const { error: userError } = await this.supabase.auth.updateUser({
        data: {
          organization_id: organizationId,
          role: role
        }
      })

      if (userError) throw userError

      // Create organization membership record if needed
      const { error: memberError } = await this.supabase
        .from('organization_members')
        .upsert({
          user_id: userId,
          organization_id: organizationId,
          role: role,
          joined_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,organization_id'
        })

      if (memberError) throw memberError
    } catch (error) {
      console.error('Error assigning user to organization:', error)
      throw error
    }
  }

  // Check if user needs onboarding
  async needsOnboarding(userId: string): Promise<boolean> {
    try {
      const progress = await this.getOnboardingProgress(userId)
      
      // If no progress exists, user needs onboarding
      if (!progress) return true
      
      // If completed_at is set, onboarding is done
      if (progress.completedAt) return false
      
      // Check if all required steps are completed
      const requiredSteps = ['welcome', 'profile', 'organization', 'permissions']
      const completedSteps = progress.completedSteps || []
      
      return !requiredSteps.every(step => completedSteps.includes(step))
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      return true // Default to needing onboarding if error
    }
  }

  // Get tutorial steps for a specific feature
  getTutorialSteps(feature: string) {
    const tutorialSteps = {
      dashboard: [
        {
          id: 'dashboard-overview',
          title: 'Welcome to your Dashboard',
          description: 'This is your main hub for monitoring AI readiness across your organization.',
          target: '[data-tutorial="dashboard-overview"]',
          position: 'bottom' as const
        },
        {
          id: 'stats-cards',
          title: 'Key Metrics',
          description: 'View important statistics about surveys, completion rates, and user engagement.',
          target: '[data-tutorial="stats-cards"]',
          position: 'bottom' as const
        },
        {
          id: 'readiness-score',
          title: 'AI Readiness Score',
          description: 'Your organization\'s overall AI readiness score based on completed assessments.',
          target: '[data-tutorial="readiness-score"]',
          position: 'right' as const
        },
        {
          id: 'jtbd-analysis',
          title: 'JTBD Forces Analysis',
          description: 'Jobs-to-be-Done analysis showing the forces driving AI adoption in your organization.',
          target: '[data-tutorial="jtbd-analysis"]',
          position: 'left' as const
        },
        {
          id: 'action-cards',
          title: 'Quick Actions',
          description: 'Access common tasks like taking assessments, viewing analytics, and exporting reports.',
          target: '[data-tutorial="action-cards"]',
          position: 'top' as const
        }
      ],
      survey: [
        {
          id: 'survey-start',
          title: 'AI Readiness Assessment',
          description: 'Complete this comprehensive assessment to understand your organization\'s AI readiness.',
          target: '[data-tutorial="survey-start"]',
          position: 'bottom' as const
        },
        {
          id: 'voice-input',
          title: 'Voice Input Available',
          description: 'You can use voice input for responses by clicking the microphone icon.',
          target: '[data-tutorial="voice-input"]',
          position: 'left' as const
        },
        {
          id: 'progress-tracker',
          title: 'Track Your Progress',
          description: 'Monitor your progress through the assessment with this progress indicator.',
          target: '[data-tutorial="progress-tracker"]',
          position: 'bottom' as const
        }
      ]
    }

    return tutorialSteps[feature as keyof typeof tutorialSteps] || []
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService()