'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress, CircularProgress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp,
  Star,
  Award,
  Zap,
  Brain,
  Users,
  Database,
  Shield,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

interface ProgressMilestone {
  id: string
  title: string
  description: string
  value: number
  threshold: number
  achieved: boolean
  icon: React.ComponentType<{ className?: string }>
  color: string
  gradient: string
  story: string
  impact: string
}

interface StoryChapter {
  id: string
  title: string
  description: string
  milestones: ProgressMilestone[]
  overallProgress: number
  narrative: string
  visualMetaphor: string
}

const progressStory: StoryChapter[] = [
  {
    id: 'foundation',
    title: 'Building the Foundation',
    description: 'Establishing the groundwork for AI readiness',
    overallProgress: 25,
    narrative: 'Like constructing a skyscraper, AI readiness begins with a solid foundation. Every organization starts here.',
    visualMetaphor: 'foundation-building',
    milestones: [
      {
        id: 'data-infrastructure',
        title: 'Data Infrastructure',
        description: 'Basic data collection and storage systems',
        value: 30,
        threshold: 25,
        achieved: true,
        icon: Database,
        color: 'blue',
        gradient: 'from-blue-400 to-cyan-500',
        story: 'Your data infrastructure is taking shape, like laying the first stones of a foundation.',
        impact: 'Enables basic data-driven decision making'
      },
      {
        id: 'team-awareness',
        title: 'Team Awareness',
        description: 'Staff understanding of AI concepts',
        value: 20,
        threshold: 20,
        achieved: true,
        icon: Users,
        color: 'green',
        gradient: 'from-green-400 to-emerald-500',
        story: 'Your team is becoming aware of AI possibilities, like seeds beginning to sprout.',
        impact: 'Creates openness to AI initiatives'
      },
      {
        id: 'governance-basics',
        title: 'Basic Governance',
        description: 'Initial policies and guidelines',
        value: 15,
        threshold: 30,
        achieved: false,
        icon: Shield,
        color: 'purple',
        gradient: 'from-purple-400 to-pink-500',
        story: 'Governance structures are forming, like establishing the blueprint for construction.',
        impact: 'Provides framework for safe AI adoption'
      }
    ]
  },
  {
    id: 'growth',
    title: 'Accelerating Growth',
    description: 'Building capabilities and momentum',
    overallProgress: 55,
    narrative: 'With foundations in place, growth accelerates. Like a plant reaching toward sunlight, progress becomes visible.',
    visualMetaphor: 'growth-acceleration',
    milestones: [
      {
        id: 'pilot-projects',
        title: 'Pilot Projects',
        description: 'First AI implementation attempts',
        value: 60,
        threshold: 50,
        achieved: true,
        icon: Lightbulb,
        color: 'yellow',
        gradient: 'from-yellow-400 to-orange-500',
        story: 'Your first AI pilots are showing promise, like early blooms proving the soil is fertile.',
        impact: 'Demonstrates AI value and builds confidence'
      },
      {
        id: 'skill-development',
        title: 'Skill Development',
        description: 'Team training and capability building',
        value: 50,
        threshold: 60,
        achieved: false,
        icon: Brain,
        color: 'teal',
        gradient: 'from-teal-400 to-blue-500',
        story: 'Skills are developing steadily, like muscles strengthening with exercise.',
        impact: 'Builds internal AI capabilities'
      }
    ]
  },
  {
    id: 'transformation',
    title: 'Digital Transformation',
    description: 'Achieving significant AI integration',
    overallProgress: 80,
    narrative: 'Transformation is evident. Like a butterfly emerging from chrysalis, your organization is becoming AI-native.',
    visualMetaphor: 'transformation-emergence',
    milestones: [
      {
        id: 'enterprise-adoption',
        title: 'Enterprise Adoption',
        description: 'AI integrated across business units',
        value: 85,
        threshold: 75,
        achieved: true,
        icon: Target,
        color: 'green',
        gradient: 'from-green-500 to-emerald-600',
        story: 'AI is woven into your operations, like blood flowing through healthy veins.',
        impact: 'Creates sustainable competitive advantage'
      },
      {
        id: 'innovation-culture',
        title: 'Innovation Culture',
        description: 'AI-first mindset across organization',
        value: 75,
        threshold: 80,
        achieved: false,
        icon: Star,
        color: 'purple',
        gradient: 'from-purple-500 to-pink-600',
        story: 'Innovation culture is blossoming, like a garden coming into full bloom.',
        impact: 'Drives continuous AI advancement'
      }
    ]
  },
  {
    id: 'mastery',
    title: 'AI Mastery',  
    description: 'Leading-edge AI capabilities',
    overallProgress: 95,
    narrative: 'Mastery achieved. Like a master craftsperson, you create AI solutions that others admire and emulate.',
    visualMetaphor: 'mastery-excellence',
    milestones: [
      {
        id: 'ai-leadership',
        title: 'Industry Leadership',
        description: 'Recognized as AI industry leader',
        value: 95,
        threshold: 90,
        achieved: true,
        icon: Award,
        color: 'gold',
        gradient: 'from-yellow-500 to-orange-600',
        story: 'Your AI leadership shines like a beacon, guiding others in the industry.',
        impact: 'Establishes market leadership position'
      }
    ]
  }
]

interface ProgressStorytellerProps {
  currentChapter?: string
  showNarrative?: boolean
  interactive?: boolean
  className?: string
}

export function ProgressStoryteller({ 
  currentChapter = 'foundation',
  showNarrative = true, 
  interactive = true,
  className 
}: ProgressStorytellerProps) {
  const [activeChapter, setActiveChapter] = useState(currentChapter)
  const [animationPhase, setAnimationPhase] = useState(0)
  const [selectedMilestone, setSelectedMilestone] = useState<ProgressMilestone | null>(null)

  const chapter = progressStory.find(c => c.id === activeChapter) || progressStory[0]

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 3)
    }, 4000)
    
    return () => clearInterval(timer)
  }, [])

  const getTrendIcon = (milestone: ProgressMilestone) => {
    if (milestone.value > milestone.threshold) return ArrowUp
    if (milestone.value < milestone.threshold) return ArrowDown
    return Minus
  }

  const getTrendColor = (milestone: ProgressMilestone) => {
    if (milestone.value > milestone.threshold) return 'text-green-500'
    if (milestone.value < milestone.threshold) return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Chapter Navigation */}
      {interactive && (
        <div className="flex justify-center">
          <div className="flex space-x-2 p-2 bg-muted/50 rounded-lg">
            {progressStory.map((story, index) => (
              <motion.button
                key={story.id}
                onClick={() => setActiveChapter(story.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeChapter === story.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-muted-foreground/10'
                }`}
              >
                Chapter {index + 1}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Chapter Header */}
      <motion.div
        key={activeChapter}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-4"
      >
        <div className="relative">
          <motion.div
            animate={{
              scale: animationPhase === 0 ? 1.05 : 1,
            }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-muted-foreground bg-clip-text text-transparent">
              {chapter.title}
            </h2>
          </motion.div>
          
          {/* Progress Ring */}
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
            className="absolute -top-4 -right-4 lg:-right-16"
          >
            <CircularProgress
              value={chapter.overallProgress}
              size={60}
              strokeWidth={6}
              className="text-primary"
            />
          </motion.div>
        </div>

        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {chapter.description}
        </p>

        {showNarrative && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Card className="max-w-3xl mx-auto p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <p className="text-muted-foreground italic leading-relaxed">
                "{chapter.narrative}"
              </p>
            </Card>
          </motion.div>
        )}
      </motion.div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chapter.milestones.map((milestone, index) => {
          const Icon = milestone.icon
          const TrendIcon = getTrendIcon(milestone)
          const trendColor = getTrendColor(milestone)

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className="cursor-pointer"
              onClick={() => setSelectedMilestone(milestone)}
            >
              <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-${milestone.color}-500/50`}>
                {/* Achievement Badge */}
                {milestone.achieved && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.2 + 0.5, duration: 0.5 }}
                    className="absolute top-2 right-2 z-10"
                  >
                    <div className="p-1 rounded-full bg-green-500 shadow-lg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </motion.div>
                )}

                {/* Gradient Header */}
                <div className={`h-1 bg-gradient-to-r ${milestone.gradient}`} />

                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg bg-${milestone.color}-100 dark:bg-${milestone.color}-900/20`}>
                      <Icon className={`h-6 w-6 text-${milestone.color}-600 dark:text-${milestone.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold">{milestone.value}%</span>
                        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Progress 
                        value={milestone.value} 
                        className="h-3"
                      />
                      {/* Threshold Indicator */}
                      <div 
                        className="absolute top-0 w-0.5 h-3 bg-gray-400 dark:bg-gray-600"
                        style={{ left: `${milestone.threshold}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Current: {milestone.value}%</span>
                      <span>Target: {milestone.threshold}%</span>
                    </div>
                  </div>

                  {/* Story Text */}
                  <motion.div
                    animate={{
                      opacity: animationPhase === 1 ? 1 : 0.7,
                    }}
                    transition={{ duration: 0.5 }}
                    className="p-3 rounded-lg bg-muted/30"
                  >
                    <p className="text-sm italic text-muted-foreground">
                      {milestone.story}
                    </p>
                  </motion.div>

                  {/* Impact Badge */}
                  <Badge 
                    variant="outline" 
                    className={`text-xs border-${milestone.color}-500/30 text-${milestone.color}-600 dark:text-${milestone.color}-400`}
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {milestone.impact}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Overall Chapter Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <Card className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Chapter Progress</h3>
            
            <div className="max-w-md mx-auto">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Completion</span>
                <span className="text-sm font-bold">{chapter.overallProgress}%</span>
              </div>
              
              <Progress 
                value={chapter.overallProgress} 
                variant="gradient"
                className="h-4"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {chapter.milestones.filter(m => m.achieved).length}
                </div>
                <div className="text-sm text-muted-foreground">Achieved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {chapter.milestones.filter(m => !m.achieved && m.value >= m.threshold * 0.7).length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-500">
                  {chapter.milestones.filter(m => !m.achieved && m.value < m.threshold * 0.7).length}
                </div>
                <div className="text-sm text-muted-foreground">Not Started</div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Milestone Detail Modal */}
      <AnimatePresence>
        {selectedMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMilestone(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full"
            >
              <Card className="p-6">
                <CardHeader className="p-0 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-lg bg-${selectedMilestone.color}-100 dark:bg-${selectedMilestone.color}-900/20`}>
                      <selectedMilestone.icon className={`h-8 w-8 text-${selectedMilestone.color}-600 dark:text-${selectedMilestone.color}-400`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{selectedMilestone.title}</CardTitle>
                      {selectedMilestone.achieved && (
                        <Badge className="mt-1 bg-green-500 text-white">
                          <Award className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Story</h4>
                    <p className="text-muted-foreground italic">{selectedMilestone.story}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Impact</h4>
                    <p className="text-muted-foreground">{selectedMilestone.impact}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Progress Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Current Progress</span>
                        <span className="font-medium">{selectedMilestone.value}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Target Threshold</span>
                        <span className="font-medium">{selectedMilestone.threshold}%</span>
                      </div>
                      <Progress value={selectedMilestone.value} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}