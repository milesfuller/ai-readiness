'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTutorial } from '@/components/onboarding/tutorial-provider'
import { 
  HelpCircle, 
  Play, 
  Book, 
  MessageCircle,
  X,
  Brain,
  BarChart3,
  Users,
  FileText,
  Target
} from 'lucide-react'

const TUTORIAL_FEATURES = [
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard Tour',
    description: 'Learn to navigate your main dashboard'
  },
  {
    id: 'assessment',
    icon: Brain,
    title: 'Assessment Guide',
    description: 'How to take AI readiness assessments'
  },
  {
    id: 'analytics',
    icon: Target,
    title: 'Analytics Tutorial',
    description: 'Understanding JTBD analysis and insights'
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Management',
    description: 'Managing organization members'
  },
  {
    id: 'reports',
    icon: FileText,
    title: 'Reports & Export',
    description: 'Generate and export reports'
  }
]

interface HelpMenuProps {
  className?: string
}

export const HelpMenu: React.FC<HelpMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false)
  const { startTutorial } = useTutorial()

  const handleStartTutorial = (featureId: string) => {
    startTutorial(featureId)
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={className}
        title="Help & Tutorials"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card variant="glass" className="w-full max-w-md mx-4 backdrop-blur-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold gradient-text">Help & Tutorials</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center space-x-2">
                <Play className="h-4 w-4 text-teal-400" />
                <span>Interactive Tutorials</span>
              </h3>
              
              <div className="space-y-2">
                {TUTORIAL_FEATURES.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <button
                      key={feature.id}
                      onClick={() => handleStartTutorial(feature.id)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-teal-500/10 border border-teal-500/20 rounded flex items-center justify-center">
                        <Icon className="h-4 w-4 text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 space-y-3">
              <h3 className="font-medium flex items-center space-x-2">
                <Book className="h-4 w-4 text-purple-400" />
                <span>Resources</span>
              </h3>
              
              <div className="space-y-2">
                <a
                  href="/help"
                  className="block p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  📚 Help Center
                </a>
                <a
                  href="/docs"
                  className="block p-2 rounded hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  📖 Documentation
                </a>
                <a
                  href="/support"
                  className="block p-2 rounded hover:bg-muted/50 transition-colors text-sm flex items-center space-x-2"
                  onClick={() => setIsOpen(false)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Contact Support</span>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}