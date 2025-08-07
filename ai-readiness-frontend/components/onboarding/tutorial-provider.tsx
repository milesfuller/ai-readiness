'use client'

import React, { createContext, useContext, useState } from 'react'
import { TutorialOverlay } from './tutorial-overlay'
import { TutorialStep } from '@/lib/types'
import { onboardingService } from '@/lib/services/onboarding-service'

interface TutorialContextType {
  isActive: boolean
  currentStep: number
  steps: TutorialStep[]
  startTutorial: (feature: string) => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
}

const TutorialContext = createContext<TutorialContextType | null>(null)

export const useTutorial = () => {
  const context = useContext(TutorialContext)
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return context
}

interface TutorialProviderProps {
  children: React.ReactNode
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [steps, setSteps] = useState<TutorialStep[]>([])

  const startTutorial = (feature: string) => {
    const tutorialSteps = onboardingService.getTutorialSteps(feature)
    setSteps(tutorialSteps)
    setCurrentStep(0)
    setIsActive(true)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      skipTutorial()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const skipTutorial = () => {
    setIsActive(false)
    setCurrentStep(0)
    setSteps([])
  }

  const value: TutorialContextType = {
    isActive,
    currentStep,
    steps,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TutorialOverlay
        isActive={isActive}
        currentStep={currentStep}
        steps={steps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
        onClose={skipTutorial}
      />
    </TutorialContext.Provider>
  )
}