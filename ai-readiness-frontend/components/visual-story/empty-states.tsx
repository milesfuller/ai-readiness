'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain,
  Users,
  Database,
  Shield,
  Target,
  Lightbulb,
  BookOpen,
  FileText,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  Play,
  Compass,
  Map,
  Rocket,
  Sparkles,
  Heart,
  Coffee,
  Search,
  Sprout
} from 'lucide-react'

interface EmptyState {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  illustration: string
  color: string
  gradient: string
  primaryAction: {
    label: string
    action: () => void
  }
  secondaryAction?: {
    label: string
    action: () => void
  }
  tips: string[]
  motivationalMessage: string
}

const emptyStates: Record<string, EmptyState> = {
  'no-surveys': {
    id: 'no-surveys',
    title: 'Your AI Journey Begins Here',
    subtitle: 'No surveys completed yet',
    description: 'Like a blank canvas waiting for the first brushstroke, your AI readiness story is ready to unfold. Every expert was once a beginner.',
    icon: Compass,
    illustration: 'journey-start',
    color: 'teal',
    gradient: 'from-teal-400 to-cyan-500',
    primaryAction: {
      label: 'Start Your First Assessment',
      action: () => console.log('Start survey')
    },
    secondaryAction: {
      label: 'Learn About AI Readiness',
      action: () => console.log('Learn more')
    },
    tips: [
      'The assessment takes about 15-20 minutes',
      'You can save progress and return later',
      'Your responses help create personalized recommendations'
    ],
    motivationalMessage: 'The journey of a thousand miles begins with one step. Take yours today.'
  },
  
  'no-data': {
    id: 'no-data',
    title: 'Data is the New Oil',
    subtitle: 'No analysis data available',
    description: 'Your data story is waiting to be written. Like seeds in fertile soil, your insights are ready to grow into wisdom.',
    icon: Database,
    illustration: 'data-seeds',
    color: 'blue',
    gradient: 'from-blue-400 to-indigo-500',
    primaryAction: {
      label: 'Upload Data',
      action: () => console.log('Upload data')
    },
    secondaryAction: {
      label: 'Connect Data Sources',
      action: () => console.log('Connect sources')
    },
    tips: [
      'Connect multiple data sources for richer insights',
      'Data is automatically anonymized and secured',
      'Real-time synchronization keeps information current'
    ],
    motivationalMessage: 'Every dataset tells a story. Yours is about to become extraordinary.'
  },
  
  'no-reports': {
    id: 'no-reports',
    title: 'Reports That Tell Stories',
    subtitle: 'No reports generated yet',
    description: 'Reports transform raw data into narratives that inspire action. Your first report is like opening a book to discover your organization\'s AI potential.',
    icon: FileText,
    illustration: 'story-book',
    color: 'purple',
    gradient: 'from-purple-400 to-pink-500',
    primaryAction: {
      label: 'Generate First Report',
      action: () => console.log('Generate report')
    },
    secondaryAction: {
      label: 'Browse Report Templates',
      action: () => console.log('Browse templates')
    },
    tips: [
      'Reports automatically update with new data',
      'Export in multiple formats (PDF, Excel, PowerPoint)',
      'Customize reports for different stakeholders'
    ],
    motivationalMessage: 'Great leaders make decisions with great stories. Your story starts with your first report.'
  },
  
  'no-team': {
    id: 'no-team',
    title: 'Every Revolution Needs Revolutionaries',
    subtitle: 'No team members added',
    description: 'AI transformation is a team sport. Like a symphony orchestra, each member plays a crucial part in creating beautiful harmony.',
    icon: Users,
    illustration: 'team-building',
    color: 'green',
    gradient: 'from-green-400 to-emerald-500',
    primaryAction: {
      label: 'Invite Team Members',
      action: () => console.log('Invite team')
    },
    secondaryAction: {
      label: 'Set Team Roles',
      action: () => console.log('Set roles')
    },
    tips: [
      'Different roles provide different perspectives',
      'Team assessments reveal collective readiness',
      'Collaborative features enhance decision-making'
    ],
    motivationalMessage: 'Alone we can do so little; together we can do so much. Build your AI dream team.'
  },
  
  'no-projects': {
    id: 'no-projects',
    title: 'Every Master Was Once a Disaster',
    subtitle: 'No AI projects started',
    description: 'Your first AI project is like planting a tree. You may not see immediate results, but with time and care, it will grow into something magnificent.',
    icon: Rocket,
    illustration: 'rocket-launch',
    color: 'orange',
    gradient: 'from-orange-400 to-red-500',
    primaryAction: {
      label: 'Start Your First Project',
      action: () => console.log('Start project')
    },
    secondaryAction: {
      label: 'Explore Project Ideas',
      action: () => console.log('Explore ideas')
    },
    tips: [
      'Start small with pilot projects',
      'Track progress with built-in metrics',
      'Learn from both successes and failures'
    ],
    motivationalMessage: 'The best time to plant a tree was 20 years ago. The second best time is now.'
  },
  
  'search-no-results': {
    id: 'search-no-results',
    title: 'The Search Continues',
    subtitle: 'No results found',
    description: 'Sometimes the best discoveries happen when we&apos;re looking for something else. Your search is leading you toward new possibilities.',
    icon: Search,
    illustration: 'exploration',
    color: 'indigo',
    gradient: 'from-indigo-400 to-purple-500',
    primaryAction: {
      label: 'Refine Search',
      action: () => console.log('Refine search')
    },
    secondaryAction: {
      label: 'Browse All Items',
      action: () => console.log('Browse all')
    },
    tips: [
      'Try different keywords or filters',
      'Use quotation marks for exact phrases',
      'Browse categories for inspiration'
    ],
    motivationalMessage: 'Every search is a step toward discovery. Keep exploring.'
  }
}

interface AnimatedIllustrationProps {
  type: string
  color: string
  className?: string
}

function AnimatedIllustration({ type, color, className }: AnimatedIllustrationProps) {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4)
    }, 2000)
    
    return () => clearInterval(timer)
  }, [])

  const getIllustrationElements = () => {
    switch (type) {
      case 'journey-start':
        return (
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              animate={{
                rotate: animationPhase * 90,
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 2 }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r from-${color}-400 to-${color}-600 opacity-20`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass className={`h-16 w-16 text-${color}-500`} />
            </div>
          </div>
        )
      
      case 'data-seeds':
        return (
          <div className="relative w-32 h-32 mx-auto">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity
                }}
                className={`absolute top-${i * 8} left-${i * 8} w-8 h-8 rounded-full bg-${color}-400 opacity-60`}
              />
            ))}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sprout className={`h-16 w-16 text-${color}-500`} />
            </div>
          </div>
        )
      
      case 'rocket-launch':
        return (
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Rocket className={`h-16 w-16 text-${color}-500`} />
            </motion.div>
            {/* Sparkles */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  rotate: [0, 180]
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.2,
                  repeat: Infinity
                }}
                className={`absolute w-2 h-2 bg-${color}-400 rounded-full`}
                style={{
                  top: `${20 + i * 10}%`,
                  left: `${60 + (i % 2) * 20}%`
                }}
              />
            ))}
          </div>
        )
      
      default:
        return (
          <div className="relative w-32 h-32 mx-auto">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
              className={`absolute inset-0 rounded-full bg-gradient-to-r from-${color}-400 to-${color}-600 opacity-20`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className={`h-16 w-16 text-${color}-500`} />
            </div>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {getIllustrationElements()}
    </motion.div>
  )
}

interface EmptyStateProps {
  type: keyof typeof emptyStates
  className?: string
  customTitle?: string
  customDescription?: string
  customActions?: {
    primary?: { label: string; action: () => void }
    secondary?: { label: string; action: () => void }
  }
}

export function EmptyState({ 
  type, 
  className, 
  customTitle, 
  customDescription,
  customActions 
}: EmptyStateProps) {
  const state = emptyStates[type]
  const [showTips, setShowTips] = useState(false)

  if (!state) {
    return null
  }

  const Icon = state.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`max-w-2xl mx-auto text-center space-y-8 ${className}`}
    >
      {/* Illustration */}
      <AnimatedIllustration 
        type={state.illustration} 
        color={state.color}
        className="mb-8"
      />

      {/* Content */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {customTitle || state.title}
          </h2>
          <p className="text-lg text-muted-foreground mt-2">{state.subtitle}</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-muted-foreground leading-relaxed max-w-lg mx-auto"
        >
          {customDescription || state.description}
        </motion.p>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className={`p-4 bg-gradient-to-r ${state.gradient} bg-opacity-10 border-${state.color}-200 dark:border-${state.color}-800`}>
            <div className="flex items-center space-x-3">
              <Heart className={`h-5 w-5 text-${state.color}-500 flex-shrink-0`} />
              <p className="text-sm italic text-muted-foreground">
                {state.motivationalMessage}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-center"
      >
        <Button
          onClick={customActions?.primary?.action || state.primaryAction.action}
          className={`px-8 py-3 text-lg font-semibold bg-gradient-to-r ${state.gradient} hover:shadow-lg hover:shadow-${state.color}-500/25 transition-all duration-300`}
        >
          {customActions?.primary?.label || state.primaryAction.label}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        
        {(customActions?.secondary || state.secondaryAction) && (
          <Button
            variant="outline"
            onClick={customActions?.secondary?.action || state.secondaryAction?.action}
            className="px-8 py-3 text-lg font-semibold"
          >
            {customActions?.secondary?.label || state.secondaryAction?.label}
          </Button>
        )}
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Button
          variant="ghost"
          onClick={() => setShowTips(!showTips)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          {showTips ? 'Hide Tips' : 'Show Helpful Tips'}
        </Button>

        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <Card className="p-4 bg-muted/30">
                <div className="space-y-3">
                  {state.tips.map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.4 }}
                      className="flex items-start space-x-3"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full bg-${state.color}-500 mt-2 flex-shrink-0`} />
                      <p className="text-sm text-muted-foreground">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

// Gallery of empty states for demonstration
export function EmptyStateGallery() {
  const [selectedState, setSelectedState] = useState<keyof typeof emptyStates>('no-surveys')

  return (
    <div className="space-y-8">
      {/* State Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {Object.keys(emptyStates).map((stateKey) => {
          const state = emptyStates[stateKey as keyof typeof emptyStates]
          const Icon = state.icon
          
          return (
            <motion.button
              key={stateKey}
              onClick={() => setSelectedState(stateKey as keyof typeof emptyStates)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedState === stateKey
                  ? `bg-gradient-to-r ${state.gradient} text-white shadow-lg`
                  : 'bg-muted hover:bg-muted-foreground/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{state.title.split(' ').slice(0, 2).join(' ')}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Selected Empty State */}
      <div className="min-h-[600px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedState}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <EmptyState type={selectedState} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}