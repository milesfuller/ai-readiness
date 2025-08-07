'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Brain,
  Users,
  BarChart3
} from 'lucide-react'

export default function OnboardingCompletePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { state, startTutorial } = useOnboarding()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Show confetti animation
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const handleStartTutorial = () => {
    startTutorial('dashboard')
    router.push('/dashboard')
  }

  const getOrganizationName = () => {
    return state.selectedOrganization?.name || state.createdOrganization?.name || 'your organization'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/5 rounded-full blur-2xl" />
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="h-4 w-4 text-teal-400 opacity-70" />
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-2xl">
        <Card variant="glass" className="backdrop-blur-xl border-white/10 animate-scale-in">
          <CardContent className="p-8 sm:p-12 text-center space-y-8">
            {/* Success Icon */}
            <div className="relative">
              <div className="w-24 h-24 bg-teal-500/20 border-2 border-teal-500/40 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <CheckCircle2 className="h-12 w-12 text-teal-400" />
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-teal-400/20 rounded-full mx-auto animate-ping" />
            </div>

            {/* Success Message */}
            <div className="space-y-4 animate-fade-in animation-delay-200">
              <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
                Welcome to AI Readiness! 🎉
              </h1>
              <p className="text-lg text-muted-foreground">
                Your setup is complete, {user?.profile?.firstName || 'there'}! 
                You're now ready to start assessing and improving your organization's AI readiness.
              </p>
            </div>

            {/* Setup Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in animation-delay-300">
              <div className="bg-card/50 rounded-lg p-4 border border-border/40">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="font-semibold text-sm">Profile Complete</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.profile?.firstName} {state.profile?.lastName}
                </p>
              </div>

              <div className="bg-card/50 rounded-lg p-4 border border-border/40">
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-sm">Organization Set</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {getOrganizationName()}
                </p>
              </div>

              <div className="bg-card/50 rounded-lg p-4 border border-border/40">
                <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="font-semibold text-sm">Role Assigned</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {state.selectedRole === 'org_admin' ? 'Organization Admin' : 'Team Member'}
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <Card variant="glass" className="animate-fade-in animation-delay-400">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center justify-center space-x-2">
                  <Brain className="h-5 w-5 text-teal-400" />
                  <span>What's Next?</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <p>✨ Explore your personalized dashboard</p>
                    <p>🧠 Take your first AI readiness assessment</p>
                    <p>📊 View real-time analytics and insights</p>
                  </div>
                  <div className="space-y-2">
                    <p>👥 Invite team members to join</p>
                    <p>📈 Track progress over time</p>
                    <p>📋 Generate detailed reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in animation-delay-500">
              <Button
                variant="outline"
                size="lg"
                onClick={handleStartTutorial}
                className="flex-1"
              >
                Take Quick Tour
              </Button>
              
              <Button
                size="lg"
                onClick={handleGoToDashboard}
                rightIcon={ArrowRight}
                className="flex-1"
              >
                Go to Dashboard
              </Button>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-border/40 animate-fade-in animation-delay-600">
              <p className="text-sm text-muted-foreground">
                Need help getting started? Check out our{' '}
                <a 
                  href="/help" 
                  className="text-teal-400 hover:text-teal-300 transition-colors"
                >
                  help center
                </a>{' '}
                or{' '}
                <a 
                  href="/support" 
                  className="text-teal-400 hover:text-teal-300 transition-colors"
                >
                  contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}