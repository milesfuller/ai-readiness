'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  OnboardingFlow,
  JTBDForceDiagram,
  ProgressStoryteller,
  DataVisualization,
  EmptyStateGallery,
  AchievementSystem
} from '@/components/visual-story'
import {
  Palette,
  Brain,
  TrendingUp,
  BarChart3,
  Award,
  FileText,
  Sparkles,
  Eye,
  Play
} from 'lucide-react'

const demoSections = [
  {
    id: 'onboarding',
    title: 'Onboarding Flow',
    description: 'Progressive disclosure with visual metaphors',
    icon: Brain,
    color: 'teal',
    component: 'onboarding'
  },
  {
    id: 'jtbd',
    title: 'JTBD Force Diagram',
    description: 'Visualizing change dynamics and resistance',
    icon: TrendingUp,
    color: 'purple',
    component: 'jtbd'
  },
  {
    id: 'progress',
    title: 'Progress Storyteller',
    description: 'Milestone-based narrative progression',
    icon: Award,
    color: 'green',
    component: 'progress'
  },
  {
    id: 'visualization',
    title: 'Data Visualization',
    description: 'Interactive charts with smooth transitions',
    icon: BarChart3,
    color: 'blue',
    component: 'visualization'
  },
  {
    id: 'empty-states',
    title: 'Empty States',
    description: 'Motivational empty states that guide users',
    icon: FileText,
    color: 'orange',
    component: 'empty-states'
  },
  {
    id: 'achievements',
    title: 'Achievement System',
    description: 'Gamified milestones and rewards',
    icon: Sparkles,
    color: 'pink',
    component: 'achievements'
  }
]

export default function VisualStoryDemo() {
  const [activeSection, setActiveSection] = useState('onboarding')
  const [showOnboarding, setShowOnboarding] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-teal-500 to-purple-500">
              <Palette className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Visual Storytelling Components
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Transform complex AI readiness data into compelling visual narratives that engage, 
            inform, and inspire action. Each component tells a story that guides users through 
            their AI journey with clarity and purpose.
          </p>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoSections.map((section) => {
            const Icon = section.icon
            return (
              <Card 
                key={section.id} 
                className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                  activeSection === section.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${section.color}-100 dark:bg-${section.color}-900/30`}>
                      <Icon className={`h-6 w-6 text-${section.color}-600 dark:text-${section.color}-400`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {activeSection === section.id && (
                        <Badge className="mt-1 bg-primary text-primary-foreground">
                          <Eye className="h-3 w-3 mr-1" />
                          Viewing
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Demo Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg bg-primary/10`}>
                  {React.createElement(
                    demoSections.find(s => s.id === activeSection)?.icon || Brain,
                    { className: "h-6 w-6 text-primary" }
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {demoSections.find(s => s.id === activeSection)?.title}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    {demoSections.find(s => s.id === activeSection)?.description}
                  </p>
                </div>
              </div>
              
              {activeSection === 'onboarding' && (
                <Button
                  onClick={() => setShowOnboarding(true)}
                  className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Demo
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="min-h-[600px]">
            {/* Onboarding Flow Demo */}
            {activeSection === 'onboarding' && !showOnboarding && (
              <div className="flex items-center justify-center h-96 text-center space-y-4">
                <div>
                  <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Interactive Onboarding Flow</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Experience the progressive disclosure pattern with visual metaphors 
                    that guide users through complex AI concepts.
                  </p>
                  <Button
                    onClick={() => setShowOnboarding(true)}
                    size="lg"
                    className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Experience Onboarding
                  </Button>
                </div>
              </div>
            )}

            {activeSection === 'onboarding' && showOnboarding && (
              <OnboardingFlow 
                onComplete={() => setShowOnboarding(false)}
                className="py-8"
              />
            )}

            {/* JTBD Force Diagram */}
            {activeSection === 'jtbd' && (
              <JTBDForceDiagram className="py-8" />
            )}

            {/* Progress Storyteller */}
            {activeSection === 'progress' && (
              <ProgressStoryteller className="py-8" />
            )}

            {/* Data Visualization */}
            {activeSection === 'visualization' && (
              <DataVisualization className="py-8" />
            )}

            {/* Empty States Gallery */}
            {activeSection === 'empty-states' && (
              <EmptyStateGallery />
            )}

            {/* Achievement System */}
            {activeSection === 'achievements' && (
              <AchievementSystem className="py-8" />
            )}
          </CardContent>
        </Card>

        {/* Usage Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Storytelling Principles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-teal-600 dark:text-teal-400">
                  Progressive Disclosure
                </h4>
                <p className="text-sm text-muted-foreground">
                  Reveal complexity gradually, allowing users to build understanding step by step 
                  without overwhelming them with information.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-600 dark:text-purple-400">
                  Visual Metaphors
                </h4>
                <p className="text-sm text-muted-foreground">
                  Use familiar concepts (journeys, building foundations, growth) to make 
                  abstract AI concepts more relatable and memorable.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600 dark:text-green-400">
                  Emotional Connection
                </h4>
                <p className="text-sm text-muted-foreground">
                  Create emotional resonance through storytelling, motivation, and recognition 
                  to drive engagement and action.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-600 dark:text-blue-400">
                  Data-Driven Narratives
                </h4>
                <p className="text-sm text-muted-foreground">
                  Transform raw metrics into compelling stories that highlight insights, 
                  trends, and opportunities for improvement.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600 dark:text-orange-400">
                  Motivational Design
                </h4>
                <p className="text-sm text-muted-foreground">
                  Turn empty states and setbacks into opportunities for inspiration and 
                  guidance toward positive action.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-pink-600 dark:text-pink-400">
                  Achievement Psychology
                </h4>
                <p className="text-sm text-muted-foreground">
                  Leverage gamification principles to create sense of progress, accomplishment, 
                  and continuous improvement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Implementation Notes */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>Implementation Ready</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                All components are built with:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Framer Motion animations for smooth transitions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Responsive design for all screen sizes</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span>Dark mode compatibility</span>
                  </li>
                </ul>
                
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span>TypeScript for type safety</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-teal-500 rounded-full" />
                    <span>Accessibility considerations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-pink-500 rounded-full" />
                    <span>Customizable themes and colors</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}