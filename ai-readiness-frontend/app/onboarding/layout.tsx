'use client'

import { TutorialOverlay } from '@/components/onboarding/tutorial-overlay'
import { useOnboarding } from '@/lib/hooks/use-onboarding'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    tutorialActive,
    currentTutorialStep,
    tutorialSteps,
    nextTutorialStep,
    prevTutorialStep,
    skipTutorial
  } = useOnboarding()

  return (
    <>
      {children}
      
      {/* Global Tutorial Overlay */}
      <TutorialOverlay
        isActive={tutorialActive}
        currentStep={currentTutorialStep}
        steps={tutorialSteps}
        onNext={nextTutorialStep}
        onPrev={prevTutorialStep}
        onSkip={skipTutorial}
        onClose={skipTutorial}
      />
    </>
  )
}