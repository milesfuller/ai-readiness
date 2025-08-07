'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { useAuth } from '@/lib/hooks/use-auth'
import { 
  Brain, 
  Users, 
  BarChart3, 
  Shield, 
  Zap, 
  Target,
  CheckCircle2
} from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Readiness Assessment',
    description: 'Comprehensive evaluation of your organization\'s AI readiness across multiple dimensions'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Involve your entire team in the assessment process with role-based access and permissions'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Get detailed insights with JTBD analysis, trends, and actionable recommendations'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Your data is protected with enterprise-grade security and privacy controls'
  },
  {
    icon: Zap,
    title: 'Real-time Voice Input',
    description: 'Use voice commands and responses to speed up the assessment process'
  },
  {
    icon: Target,
    title: 'Actionable Insights',
    description: 'Transform assessment results into concrete action plans for AI implementation'
  }
]

export default function WelcomePage() {
  const { user } = useAuth()
  const { state, steps, completeStep, nextStep, loading, error } = useOnboarding()
  const router = useRouter()
  const [isGettingStarted, setIsGettingStarted] = useState(false)

  useEffect(() => {
    // Redirect if user doesn't need onboarding
    if (state.isComplete) {
      router.push('/dashboard')
    }
  }, [state.isComplete, router])

  const handleGetStarted = async () => {
    setIsGettingStarted(true)
    try {
      await completeStep('welcome')
      nextStep()
    } catch (err) {
      console.error('Failed to start onboarding:', err)
    } finally {
      setIsGettingStarted(false)
    }
  }

  const handleSkipOnboarding = () => {
    router.push('/dashboard')
  }

  return (
    <OnboardingLayout
      title="Welcome to AI Readiness"
      subtitle="Your journey to AI transformation starts here"
      currentStep={state.currentStep}
      totalSteps={state.totalSteps}
      steps={steps}
      canGoNext={false} // We handle navigation manually
      canGoPrev={false} // First step
      showSkip={true}
      onSkip={handleSkipOnboarding}
      isLoading={loading}
    >
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-center">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Welcome Message */}
        <div className="text-center space-y-4 animate-fade-in">
          <h3 className="text-xl font-semibold">
            Hello {user?.profile?.firstName || user?.email?.split('@')[0]}! 👋
          </h3>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're excited to help your organization assess and improve its AI readiness. 
            Let's take a few minutes to set up your profile and get you started with the platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in animation-delay-100">
          {FEATURES.map((feature, index) => (
            <Card 
              key={index} 
              variant="glass" 
              className="hover:scale-105 transition-all duration-300"
            >
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What to Expect */}
        <Card variant="glass" className="animate-fade-in animation-delay-200">
          <CardContent className="p-6 space-y-4">
            <h4 className="text-lg font-semibold flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-teal-400" />
              <span>What to Expect</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>• Complete your profile (2 minutes)</p>
                <p>• Join or create your organization</p>
                <p>• Set up permissions and roles</p>
              </div>
              <div className="space-y-2">
                <p>• Take a quick tour of key features</p>
                <p>• Access your personalized dashboard</p>
                <p>• Start your first AI readiness assessment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center animate-fade-in animation-delay-300">
          <Button
            size="lg"
            onClick={handleGetStarted}
            loading={isGettingStarted}
            className="px-8 py-3 text-lg"
          >
            {isGettingStarted ? 'Getting Started...' : 'Get Started'}
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            This will take about 5 minutes to complete
          </p>
        </div>
      </div>
    </OnboardingLayout>
  )
}