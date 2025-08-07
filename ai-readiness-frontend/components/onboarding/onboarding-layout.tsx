'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepProgress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnboardingStep } from '@/lib/types'

interface OnboardingLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  currentStep: number
  totalSteps: number
  steps: OnboardingStep[]
  canGoNext?: boolean
  canGoPrev?: boolean
  onNext?: () => void
  onPrev?: () => void
  onSkip?: () => void
  showSkip?: boolean
  isLoading?: boolean
  className?: string
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  steps,
  canGoNext = false,
  canGoPrev = true,
  onNext,
  onPrev,
  onSkip,
  showSkip = false,
  isLoading = false,
  className
}) => {
  // Convert steps to progress format
  const progressSteps = steps.map((step, index) => ({
    id: step.id || `step-${index}`,
    title: step.title,
    completed: step.completed || index < currentStep
  }))

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-pink-500/3 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-8 w-8 text-teal-400" />
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
              AI Readiness Setup
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let's get you set up for success
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 animate-fade-in animation-delay-100">
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/40">
            <div className="hidden md:block">
              <StepProgress 
                steps={progressSteps}
                currentStep={steps[currentStep]?.id || `step-${currentStep}`}
              />
            </div>
            <div className="md:hidden">
              <StepProgress 
                steps={progressSteps}
                currentStep={steps[currentStep]?.id || `step-${currentStep}`}
              />
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <span className="text-sm font-medium text-teal-500">
                  {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Card 
          variant="glass" 
          className={cn(
            "backdrop-blur-xl border-white/10 animate-fade-in animation-delay-200",
            className
          )}
        >
          <div className="p-6 sm:p-8 lg:p-10">
            {/* Step Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-2">
                {title}
              </h2>
              {subtitle && (
                <p className="text-muted-foreground text-lg">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Step Content */}
            <div className="space-y-6">
              {children}
            </div>

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border/40">
              <div className="flex items-center space-x-2">
                {canGoPrev && onPrev && (
                  <Button
                    variant="outline"
                    onClick={onPrev}
                    disabled={isLoading}
                    leftIcon={ArrowLeft}
                    className="whitespace-nowrap"
                  >
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {showSkip && onSkip && (
                  <Button
                    variant="ghost"
                    onClick={onSkip}
                    disabled={isLoading}
                    className="whitespace-nowrap"
                  >
                    Skip for now
                  </Button>
                )}
                
                {onNext && (
                  <Button
                    onClick={onNext}
                    disabled={!canGoNext || isLoading}
                    loading={isLoading}
                    rightIcon={ArrowRight}
                    className="whitespace-nowrap"
                  >
                    {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Continue'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 animate-fade-in animation-delay-300">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our{' '}
            <a 
              href="/support" 
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              support team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}