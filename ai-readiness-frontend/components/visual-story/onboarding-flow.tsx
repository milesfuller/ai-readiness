'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Users, 
  Database, 
  Shield, 
  Target, 
  ArrowRight, 
  CheckCircle,
  Lightbulb,
  TrendingUp,
  Building2
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  gradient: string
  visualMetaphor: string
  insights: string[]
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your AI Journey',
    subtitle: 'Discover Your Organization\'s AI Potential',
    description: 'Like climbing a mountain, AI readiness is a journey with multiple paths. We\'ll be your guide, helping you navigate each step with confidence.',
    icon: Brain,
    color: 'teal',
    gradient: 'from-teal-500 to-cyan-500',
    visualMetaphor: 'mountain-path',
    insights: [
      'Every organization starts somewhere',
      'The journey is unique to you',
      'Progress is more important than perfection'
    ]
  },
  {
    id: 'assessment',
    title: 'Comprehensive Assessment',
    subtitle: 'Five Critical Dimensions',
    description: 'Think of this as taking your organization\'s vital signs. We examine five key areas that determine AI success, like a doctor checking different systems of the body.',
    icon: Target,
    color: 'purple',
    gradient: 'from-purple-500 to-pink-500',
    visualMetaphor: 'vital-signs',
    insights: [
      'Technology Infrastructure - Your foundation',
      'Data & Analytics - Your fuel',
      'Culture & People - Your engine',
      'Strategy - Your compass',
      'Governance - Your guardrails'
    ]
  },
  {
    id: 'insights',
    title: 'Personalized Insights',
    subtitle: 'Your Unique AI Readiness Story',
    description: 'Like a mirror reflecting your true state, our analysis reveals not just where you are, but illuminates the clearest path forward.',
    icon: Lightbulb,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-500',
    visualMetaphor: 'mirror-reflection',
    insights: [
      'Strengths to leverage',
      'Gaps to address',
      'Quick wins to pursue',
      'Long-term investments to consider'
    ]
  },
  {
    id: 'roadmap',
    title: 'Strategic Roadmap',
    subtitle: 'Your Path to AI Excellence',
    description: 'Every great journey needs a map. We provide a detailed roadmap with milestones, like waypoints on a GPS, guiding you to AI maturity.',
    icon: TrendingUp,
    color: 'green',
    gradient: 'from-green-500 to-emerald-500',
    visualMetaphor: 'gps-navigation',
    insights: [
      'Prioritized action items',
      'Timeline recommendations',
      'Resource requirements',
      'Success metrics'
    ]
  },
  {
    id: 'community',
    title: 'Join the AI-Ready Community',
    subtitle: 'Benchmark & Learn from Peers',
    description: 'Like joining a community of travelers, compare your progress with industry peers and learn from their experiences.',
    icon: Users,
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-500',
    visualMetaphor: 'community-network',
    insights: [
      'Industry benchmarks',
      'Peer comparisons',
      'Best practice sharing',
      'Continuous improvement'
    ]
  }
]

interface OnboardingFlowProps {
  onComplete: () => void
  className?: string
}

export function OnboardingFlow({ onComplete, className }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setProgress((currentStep / (onboardingSteps.length - 1)) * 100)
  }, [currentStep])

  const nextStep = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(prev => prev + 1)
        setIsAnimating(false)
      }, 300)
    } else {
      onComplete()
    }
  }

  const currentStepData = onboardingSteps[currentStep]
  const Icon = currentStepData.icon

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Step {currentStep + 1} of {onboardingSteps.length}
          </h2>
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress 
          value={progress} 
          variant="gradient"
          className="h-2 bg-gray-200 dark:bg-gray-700"
        />
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-background to-muted/20">
            <div className={`h-2 bg-gradient-to-r ${currentStepData.gradient}`} />
            
            <CardHeader className="text-center pb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                className={`mx-auto mb-6 p-4 rounded-full bg-gradient-to-br ${currentStepData.gradient} shadow-lg`}
              >
                <Icon className="h-8 w-8 text-white" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <CardTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  {currentStepData.title}
                </CardTitle>
                <p className="text-lg text-muted-foreground font-medium">
                  {currentStepData.subtitle}
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Description with Visual Metaphor */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                  {currentStepData.description}
                </p>
              </motion.div>

              {/* Key Insights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {currentStepData.insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                    className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30 border border-muted"
                  >
                    <CheckCircle className={`h-5 w-5 mt-0.5 text-${currentStepData.color}-500 flex-shrink-0`} />
                    <p className="text-sm font-medium">{insight}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Visual Story Element */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="relative"
              >
                <div className={`h-32 rounded-xl bg-gradient-to-r ${currentStepData.gradient} opacity-10 flex items-center justify-center`}>
                  <div className="text-center">
                    <Icon className={`h-16 w-16 text-${currentStepData.color}-500 mx-auto mb-2 opacity-30`} />
                    <p className="text-sm font-medium text-muted-foreground">
                      {currentStepData.visualMetaphor.replace('-', ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="flex justify-center pt-6"
              >
                <Button
                  onClick={nextStep}
                  disabled={isAnimating}
                  className={`px-8 py-3 text-lg font-semibold bg-gradient-to-r ${currentStepData.gradient} hover:shadow-lg hover:shadow-${currentStepData.color}-500/25 transition-all duration-300`}
                >
                  {currentStep === onboardingSteps.length - 1 ? 'Start Assessment' : 'Continue'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Step Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="flex justify-center mt-8 space-x-2"
      >
        {onboardingSteps.map((step, index) => (
          <div
            key={step.id}
            className={`h-2 rounded-full transition-all duration-300 ${
              index <= currentStep 
                ? `bg-gradient-to-r ${step.gradient} w-8` 
                : 'bg-muted w-2'
            }`}
          />
        ))}
      </motion.div>
    </div>
  )
}

// Interactive Step Indicators Component
export function StepIndicators({ 
  steps, 
  currentStep, 
  onStepClick 
}: {
  steps: OnboardingStep[]
  currentStep: number
  onStepClick: (step: number) => void
}) {
  return (
    <div className="flex justify-center space-x-4 mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon
        const isActive = index === currentStep
        const isCompleted = index < currentStep
        
        return (
          <motion.button
            key={step.id}
            onClick={() => onStepClick(index)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-3 rounded-full transition-all duration-300 ${
              isActive 
                ? `bg-gradient-to-r ${step.gradient} shadow-lg` 
                : isCompleted
                ? 'bg-muted-foreground/20 text-green-500'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
            }`}
          >
            {isCompleted ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
            
            {/* Step number indicator */}
            <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center ${
              isActive 
                ? 'bg-white text-gray-900' 
                : 'bg-muted-foreground text-background'
            }`}>
              {index + 1}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}