'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { 
  Play, 
  SkipForward, 
  CheckCircle2,
  Brain,
  BarChart3,
  Users,
  FileText,
  Zap,
  Target
} from 'lucide-react'

const TUTORIAL_FEATURES = [
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard Overview',
    description: 'Learn how to navigate your main dashboard and understand key metrics',
    duration: '2 min',
    steps: 5
  },
  {
    id: 'assessment',
    icon: Brain,
    title: 'AI Readiness Assessment',
    description: 'Take your first assessment and explore voice input features',
    duration: '3 min',
    steps: 7
  },
  {
    id: 'analytics',
    icon: Target,
    title: 'Analytics & Insights',
    description: 'Understand JTBD analysis and how to interpret results',
    duration: '2 min',
    steps: 4
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Management',
    description: 'Manage organization members and view team progress',
    duration: '2 min',
    steps: 3
  },
  {
    id: 'reports',
    icon: FileText,
    title: 'Reports & Export',
    description: 'Generate and export detailed reports',
    duration: '1 min',
    steps: 3
  }
]

export default function TutorialPage() {
  const router = useRouter()
  const { state, steps, completeStep, completeOnboarding, startTutorial } = useOnboarding()
  const [selectedTutorials, setSelectedTutorials] = useState<string[]>(['dashboard'])
  const [isCompleting, setIsCompleting] = useState(false)

  const handleToggleTutorial = (tutorialId: string) => {
    setSelectedTutorials(prev => {
      if (prev.includes(tutorialId)) {
        return prev.filter(id => id !== tutorialId)
      } else {
        return [...prev, tutorialId]
      }
    })
  }

  const handleStartTutorials = async () => {
    setIsCompleting(true)

    try {
      // Complete the tutorial step
      await completeStep('tutorial', {
        selectedTutorials
      })

      // Complete the entire onboarding
      await completeOnboarding()

      // Start the first selected tutorial if any
      if (selectedTutorials.length > 0) {
        startTutorial(selectedTutorials[0])
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkipTutorials = async () => {
    setIsCompleting(true)

    try {
      // Complete tutorial step
      await completeStep('tutorial', {
        selectedTutorials: []
      })

      // Complete onboarding
      await completeOnboarding()
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <OnboardingLayout
      title="Interactive Tutorials"
      subtitle="Learn the platform with guided walkthroughs"
      currentStep={state.currentStep}
      totalSteps={state.totalSteps}
      steps={steps}
      canGoNext={true}
      canGoPrev={true}
      onNext={handleStartTutorials}
      onPrev={() => router.push('/onboarding/permissions')}
      showSkip={true}
      onSkip={handleSkipTutorials}
      isLoading={isCompleting}
    >
      <div className="space-y-6">
        {/* Introduction */}
        <Card variant="glass" className="animate-fade-in">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 rounded-full flex items-center justify-center mx-auto">
              <Play className="h-8 w-8 text-teal-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Welcome to AI Readiness! 🎉
              </h3>
              <p className="text-muted-foreground">
                Your setup is complete! Choose which features you'd like to learn about with 
                interactive tutorials. You can always access these later from the help menu.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tutorial Selection */}
        <div className="space-y-4 animate-fade-in animation-delay-100">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Choose Your Learning Path</h3>
            <p className="text-muted-foreground">
              Select the tutorials you'd like to take now. You can skip any and return later.
            </p>
          </div>

          <div className="grid gap-4">
            {TUTORIAL_FEATURES.map((tutorial) => {
              const isSelected = selectedTutorials.includes(tutorial.id)
              const Icon = tutorial.icon

              return (
                <Card 
                  key={tutorial.id}
                  variant={isSelected ? "bordered" : "glass"}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    isSelected ? 'border-teal-500/40' : ''
                  }`}
                  onClick={() => handleToggleTutorial(tutorial.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected 
                          ? 'bg-teal-500/20 border border-teal-500/40' 
                          : 'bg-muted/50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isSelected ? 'text-teal-400' : 'text-muted-foreground'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center space-x-2">
                          <span>{tutorial.title}</span>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-teal-400" />
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {tutorial.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>{tutorial.duration}</span>
                          <span>•</span>
                          <span>{tutorial.steps} steps</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Selection Summary */}
        {selectedTutorials.length > 0 && (
          <Card variant="glass" className="animate-fade-in animation-delay-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-teal-400" />
                  <div>
                    <p className="font-medium">
                      {selectedTutorials.length} tutorial{selectedTutorials.length !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total time: ~{TUTORIAL_FEATURES
                        .filter(t => selectedTutorials.includes(t.id))
                        .reduce((acc, t) => acc + parseInt(t.duration), 0)} minutes
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTutorials([])}
                  leftIcon={SkipForward}
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-fade-in animation-delay-300">
          <Button
            variant="outline"
            onClick={handleSkipTutorials}
            disabled={isCompleting}
            className="flex-1"
            leftIcon={SkipForward}
          >
            Skip Tutorials - Go to Dashboard
          </Button>
          
          <Button
            onClick={handleStartTutorials}
            disabled={isCompleting}
            loading={isCompleting}
            className="flex-1"
            rightIcon={Play}
          >
            {selectedTutorials.length > 0 
              ? `Start ${selectedTutorials.length} Tutorial${selectedTutorials.length !== 1 ? 's' : ''}`
              : 'Go to Dashboard'
            }
          </Button>
        </div>

        {/* Help Note */}
        <div className="text-center text-sm text-muted-foreground animate-fade-in animation-delay-400">
          <p>
            💡 Tip: You can restart any tutorial from the Help menu in your dashboard
          </p>
        </div>
      </div>
    </OnboardingLayout>
  )
}