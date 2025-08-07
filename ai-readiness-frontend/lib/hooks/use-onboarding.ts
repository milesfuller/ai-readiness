'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { onboardingService } from '@/lib/services/onboarding-service'
import { OnboardingState, OnboardingStep, TutorialStep } from '@/lib/types'

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Get started with AI Readiness',
    completed: false,
    required: true,
    path: '/onboarding/welcome'
  },
  {
    id: 'profile',
    title: 'Profile Setup',
    description: 'Complete your profile information',
    completed: false,
    required: true,
    path: '/onboarding/profile'
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Join or create an organization',
    completed: false,
    required: true,
    path: '/onboarding/organization'
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Set up your role and permissions',
    completed: false,
    required: true,
    path: '/onboarding/permissions'
  },
  {
    id: 'tutorial',
    title: 'Tutorial',
    description: 'Learn key features',
    completed: false,
    required: false,
    path: '/onboarding/tutorial'
  }
]

export function useOnboarding() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completedSteps: [],
    totalSteps: ONBOARDING_STEPS.length,
    isComplete: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tutorialActive, setTutorialActive] = useState(false)
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0)
  const [tutorialSteps, setTutorialSteps] = useState<TutorialStep[]>([])

  // Load onboarding progress
  const loadProgress = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const progress = await onboardingService.getOnboardingProgress(user.id)
      
      if (progress) {
        setState(prev => ({
          ...prev,
          currentStep: progress.currentStep >= 0 ? progress.currentStep : ONBOARDING_STEPS.length,
          completedSteps: progress.completedSteps || [],
          isComplete: !!progress.completedAt,
          ...progress.data
        }))
      } else {
        // Initialize new onboarding
        await onboardingService.saveOnboardingProgress(user.id, {
          userId: user.id,
          currentStep: 0,
          completedSteps: [],
          data: {},
          startedAt: new Date().toISOString()
        })
      }
    } catch (err) {
      console.error('Failed to load onboarding progress:', err)
      setError('Failed to load onboarding progress')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Save progress to backend
  const saveProgress = useCallback(async (updates: Partial<OnboardingState>) => {
    if (!user) return

    try {
      await onboardingService.saveOnboardingProgress(user.id, {
        userId: user.id,
        currentStep: updates.currentStep ?? state.currentStep,
        completedSteps: updates.completedSteps ?? state.completedSteps,
        data: {
          profile: updates.profile,
          selectedOrganization: updates.selectedOrganization,
          createdOrganization: updates.createdOrganization,
          selectedRole: updates.selectedRole,
          permissions: updates.permissions
        }
      })

      setState(prev => ({ ...prev, ...updates }))
    } catch (err) {
      console.error('Failed to save onboarding progress:', err)
      setError('Failed to save progress')
    }
  }, [user, state])

  // Navigate to specific step
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < ONBOARDING_STEPS.length) {
      const step = ONBOARDING_STEPS[stepIndex]
      router.push(step.path)
      saveProgress({ currentStep: stepIndex })
    }
  }, [router, saveProgress])

  // Complete current step
  const completeStep = useCallback(async (stepId: string, stepData?: any) => {
    const newCompletedSteps = [...state.completedSteps]
    if (!newCompletedSteps.includes(stepId)) {
      newCompletedSteps.push(stepId)
    }

    const updates: Partial<OnboardingState> = {
      completedSteps: newCompletedSteps,
      ...stepData
    }

    await saveProgress(updates)
    
    // Auto-advance to next step if all required steps for current are done
    const currentStepIndex = ONBOARDING_STEPS.findIndex(s => s.id === stepId)
    if (currentStepIndex >= 0 && currentStepIndex < ONBOARDING_STEPS.length - 1) {
      const nextStepIndex = currentStepIndex + 1
      await saveProgress({ ...updates, currentStep: nextStepIndex })
    }
  }, [state.completedSteps, saveProgress])

  // Move to next step
  const nextStep = useCallback(() => {
    const nextStepIndex = state.currentStep + 1
    if (nextStepIndex < ONBOARDING_STEPS.length) {
      goToStep(nextStepIndex)
    } else {
      completeOnboarding()
    }
  }, [state.currentStep, goToStep])

  // Move to previous step
  const prevStep = useCallback(() => {
    const prevStepIndex = state.currentStep - 1
    if (prevStepIndex >= 0) {
      goToStep(prevStepIndex)
    }
  }, [state.currentStep, goToStep])

  // Check if can proceed to next step
  const canGoNext = useCallback(() => {
    const currentStepObj = ONBOARDING_STEPS[state.currentStep]
    if (!currentStepObj) return false
    
    return state.completedSteps.includes(currentStepObj.id) || !currentStepObj.required
  }, [state.currentStep, state.completedSteps])

  // Complete entire onboarding
  const completeOnboarding = useCallback(async () => {
    if (!user) return

    try {
      await onboardingService.completeOnboarding(user.id)
      setState(prev => ({ ...prev, isComplete: true }))
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
      setError('Failed to complete onboarding')
    }
  }, [user, router])

  // Start tutorial for specific feature
  const startTutorial = useCallback((feature: string) => {
    const steps = onboardingService.getTutorialSteps(feature)
    setTutorialSteps(steps)
    setCurrentTutorialStep(0)
    setTutorialActive(true)
  }, [])

  // Navigate tutorial
  const nextTutorialStep = useCallback(() => {
    if (currentTutorialStep < tutorialSteps.length - 1) {
      setCurrentTutorialStep(prev => prev + 1)
    } else {
      setTutorialActive(false)
      setCurrentTutorialStep(0)
    }
  }, [currentTutorialStep, tutorialSteps.length])

  const prevTutorialStep = useCallback(() => {
    if (currentTutorialStep > 0) {
      setCurrentTutorialStep(prev => prev - 1)
    }
  }, [currentTutorialStep])

  const skipTutorial = useCallback(() => {
    setTutorialActive(false)
    setCurrentTutorialStep(0)
  }, [])

  // Check if user needs onboarding
  const needsOnboarding = useCallback(async () => {
    if (!user) return false
    return await onboardingService.needsOnboarding(user.id)
  }, [user])

  // Load progress when user changes
  useEffect(() => {
    if (user && !authLoading) {
      loadProgress()
    }
  }, [user, authLoading, loadProgress])

  // Get current step data
  const getCurrentStep = useCallback(() => {
    return ONBOARDING_STEPS[state.currentStep] || null
  }, [state.currentStep])

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    return Math.round((state.completedSteps.length / ONBOARDING_STEPS.length) * 100)
  }, [state.completedSteps.length])

  return {
    // State
    state,
    loading: loading || authLoading,
    error,
    steps: ONBOARDING_STEPS,
    
    // Navigation
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    
    // Step management
    completeStep,
    getCurrentStep,
    getProgressPercentage,
    
    // Completion
    completeOnboarding,
    needsOnboarding,
    
    // Tutorial
    tutorialActive,
    currentTutorialStep,
    tutorialSteps,
    startTutorial,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial,
    
    // Utilities
    saveProgress,
    loadProgress
  }
}