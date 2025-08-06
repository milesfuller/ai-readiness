'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Award,
  Trophy,
  Star,
  Target,
  Zap,
  Brain,
  Users,
  Database,
  Shield,
  Lightbulb,
  TrendingUp,
  Rocket,
  Crown,
  Medal,
  Gem,
  Sparkles,
  Flag,
  Mountain,
  Compass,
  CheckCircle,
  Lock,
  Clock
} from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  category: 'milestone' | 'progress' | 'mastery' | 'collaboration' | 'innovation'
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  icon: React.ComponentType<{ className?: string }>
  points: number
  unlocked: boolean
  progress: number
  maxProgress: number
  unlockedAt?: Date
  requirements: string[]
  story: string
  nextLevel?: string
}

interface Milestone {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
  maxProgress: number
  completed: boolean
  rewards: Achievement[]
  story: string
}

const achievements: Achievement[] = [
  {
    id: 'first-assessment',
    title: 'First Steps',
    description: 'Completed your first AI readiness assessment',
    category: 'milestone',
    tier: 'bronze',
    icon: Compass,
    points: 100,
    unlocked: true,
    progress: 1,
    maxProgress: 1,
    unlockedAt: new Date(),
    requirements: ['Complete at least one assessment'],
    story: 'Every journey begins with a single step. You&apos;ve taken yours into the world of AI readiness.',
    nextLevel: 'assessment-streak'
  },
  {
    id: 'assessment-streak',
    title: 'Consistent Explorer',
    description: 'Completed 5 assessments',
    category: 'progress',
    tier: 'silver',
    icon: Target,
    points: 250,
    unlocked: false,
    progress: 1,
    maxProgress: 5,
    requirements: ['Complete 5 different assessments'],
    story: 'Consistency is the mother of mastery. Your dedication to understanding AI readiness is evident.',
    nextLevel: 'assessment-master'
  },
  {
    id: 'data-champion',
    title: 'Data Champion',
    description: 'Achieved 90%+ in Data & Analytics category',
    category: 'mastery',
    tier: 'gold',
    icon: Database,
    points: 500,
    unlocked: false,
    progress: 82,
    maxProgress: 90,
    requirements: ['Score 90% or higher in Data & Analytics assessment'],
    story: 'You understand that data is the lifeblood of AI. Your mastery opens new possibilities.',
    nextLevel: 'data-guru'
  },
  {
    id: 'team-builder',
    title: 'Team Builder',
    description: 'Invited 10+ team members',
    category: 'collaboration',
    tier: 'silver',
    icon: Users,
    points: 300,
    unlocked: true,
    progress: 12,
    maxProgress: 10,
    unlockedAt: new Date(Date.now() - 86400000), // Yesterday
    requirements: ['Invite at least 10 team members to the platform'],
    story: 'Great leaders know that transformation is a team effort. You&apos;re building the foundation for collective success.',
    nextLevel: 'community-leader'
  },
  {
    id: 'innovation-catalyst',
    title: 'Innovation Catalyst',
    description: 'Started first AI pilot project',
    category: 'innovation',
    tier: 'gold',
    icon: Lightbulb,
    points: 750,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    requirements: ['Create and launch your first AI pilot project'],
    story: 'Innovation requires courage to try something new. You&apos;re ready to turn ideas into reality.',
    nextLevel: 'transformation-leader'
  },
  {
    id: 'ai-readiness-expert',
    title: 'AI Readiness Expert',
    description: 'Achieved 95%+ overall readiness score',
    category: 'mastery',
    tier: 'platinum',
    icon: Brain,
    points: 1000,
    unlocked: false,
    progress: 76,
    maxProgress: 95,
    requirements: ['Achieve an overall AI readiness score of 95% or higher'],
    story: 'You&apos;ve mastered the art and science of AI readiness. Others look to you for guidance.',
    nextLevel: 'ai-visionary'
  },
  {
    id: 'ai-visionary',
    title: 'AI Visionary',
    description: 'Industry leadership in AI adoption',
    category: 'mastery',
    tier: 'diamond',
    icon: Crown,
    points: 2000,
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    requirements: ['Recognized as industry leader in AI adoption', 'Mentor other organizations'],
    story: 'You&apos;ve transcended being an adopter to become a leader. Your vision shapes the future of AI.',
  }
]

const milestones: Milestone[] = [
  {
    id: 'foundation',
    title: 'Building Foundation',
    description: 'Establish basic AI readiness',
    icon: Mountain,
    progress: 75,
    maxProgress: 100,
    completed: false,
    story: 'Like building a house, AI readiness starts with a solid foundation.',
    rewards: achievements.filter(a => a.tier === 'bronze')
  },
  {
    id: 'growth',
    title: 'Accelerating Growth',
    description: 'Develop capabilities and momentum',
    icon: Rocket,
    progress: 45,
    maxProgress: 100,
    completed: false,
    story: 'Your AI capabilities are taking flight, reaching new heights.',
    rewards: achievements.filter(a => a.tier === 'silver')
  },
  {
    id: 'mastery',
    title: 'Achieving Mastery',
    description: 'Excel in AI implementation',
    icon: Trophy,
    progress: 20,
    maxProgress: 100,
    completed: false,
    story: 'Mastery is not a destination but a way of traveling.',
    rewards: achievements.filter(a => a.tier === 'gold')
  }
]

const tierConfig = {
  bronze: { color: 'amber', gradient: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/25' },
  silver: { color: 'gray', gradient: 'from-gray-400 to-gray-600', glow: 'shadow-gray-500/25' },
  gold: { color: 'yellow', gradient: 'from-yellow-400 to-yellow-600', glow: 'shadow-yellow-500/25' },
  platinum: { color: 'purple', gradient: 'from-purple-400 to-purple-600', glow: 'shadow-purple-500/25' },
  diamond: { color: 'cyan', gradient: 'from-cyan-400 to-blue-500', glow: 'shadow-cyan-500/25' }
}

interface AchievementCardProps {
  achievement: Achievement
  onClick?: () => void
  showProgress?: boolean
}

function AchievementCard({ achievement, onClick, showProgress = true }: AchievementCardProps) {
  const Icon = achievement.icon
  const tierStyle = tierConfig[achievement.tier]
  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className={`relative overflow-hidden transition-all duration-300 ${
        achievement.unlocked 
          ? `border-${tierStyle.color}-300 dark:border-${tierStyle.color}-700 hover:shadow-lg ${tierStyle.glow}` 
          : 'border-gray-300 dark:border-gray-700 opacity-60'
      }`}>
        {/* Tier indicator */}
        <div className={`h-1 bg-gradient-to-r ${tierStyle.gradient}`} />
        
        {/* Unlock status indicator */}
        <div className="absolute top-3 right-3 z-10">
          {achievement.unlocked ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle className="h-5 w-5 text-green-500" />
            </motion.div>
          ) : (
            <Lock className="h-5 w-5 text-gray-400" />
          )}
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start space-x-3">
            <div className={`p-3 rounded-lg ${
              achievement.unlocked 
                ? `bg-gradient-to-r ${tierStyle.gradient} shadow-lg` 
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              <Icon className={`h-6 w-6 ${achievement.unlocked ? 'text-white' : 'text-gray-400'}`} />
            </div>
            <div className="flex-1">
              <CardTitle className={`text-lg ${achievement.unlocked ? '' : 'text-gray-500'}`}>
                {achievement.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{achievement.description}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {achievement.tier.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {achievement.points} PTS
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          {showProgress && achievement.maxProgress > 1 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{achievement.progress}/{achievement.maxProgress}</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className={`h-2 ${achievement.unlocked ? '' : 'opacity-50'}`}
              />
            </div>
          )}

          {/* Story */}
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm italic text-muted-foreground">
              {achievement.story}
            </p>
          </div>

          {/* Unlock date */}
          {achievement.unlocked && achievement.unlockedAt && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Unlocked {achievement.unlockedAt.toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface MilestoneProgressProps {
  milestone: Milestone
}

function MilestoneProgress({ milestone }: MilestoneProgressProps) {
  const Icon = milestone.icon
  const progressPercentage = (milestone.progress / milestone.maxProgress) * 100

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className={`p-3 rounded-lg ${
            milestone.completed 
              ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
              : 'bg-gradient-to-r from-blue-400 to-purple-500'
          }`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">{milestone.title}</h3>
            <p className="text-muted-foreground">{milestone.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm font-bold">{Math.round(progressPercentage)}%</span>
          </div>
          
          <Progress value={progressPercentage} className="h-3" />
          
          <p className="text-sm italic text-muted-foreground">
            {milestone.story}
          </p>
        </div>
      </Card>
    </motion.div>
  )
}

interface AchievementSystemProps {
  className?: string
  showMilestones?: boolean
}

export function AchievementSystem({ className, showMilestones = true }: AchievementSystemProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [filterTier, setFilterTier] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'points' | 'progress' | 'unlock'>('points')

  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
  const completionRate = (unlockedAchievements.length / achievements.length) * 100

  const filteredAchievements = achievements
    .filter(a => filterTier === 'all' || a.tier === filterTier)
    .sort((a, b) => {
      if (sortBy === 'points') return b.points - a.points
      if (sortBy === 'progress') return (b.progress/b.maxProgress) - (a.progress/a.maxProgress)
      if (sortBy === 'unlock') return Number(b.unlocked) - Number(a.unlocked)
      return 0
    })

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <Trophy className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {unlockedAchievements.length}
          </div>
          <div className="text-sm text-muted-foreground">Achievements</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
          <Star className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalPoints.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Points</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <Target className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {Math.round(completionRate)}%
          </div>
          <div className="text-sm text-muted-foreground">Completion</div>
        </Card>
        
        <Card className="p-4 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <Gem className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {achievements.filter(a => a.tier === 'diamond').length}
          </div>
          <div className="text-sm text-muted-foreground">Elite Goals</div>
        </Card>
      </motion.div>

      {/* Milestones */}
      {showMilestones && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Journey Milestones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <MilestoneProgress milestone={milestone} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Filter by tier:</span>
          <div className="flex space-x-1">
            {['all', 'bronze', 'silver', 'gold', 'platinum', 'diamond'].map((tier) => (
              <Button
                key={tier}
                variant={filterTier === tier ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTier(tier)}
                className="text-xs"
              >
                {tier === 'all' ? 'All' : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border rounded-md bg-background"
          >
            <option value="points">Points</option>
            <option value="progress">Progress</option>
            <option value="unlock">Unlock Status</option>
          </select>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <AchievementCard
              achievement={achievement}
              onClick={() => setSelectedAchievement(achievement)}
            />
          </motion.div>
        ))}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAchievement(null)}
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
                    <div className={`p-4 rounded-lg bg-gradient-to-r ${tierConfig[selectedAchievement.tier].gradient}`}>
                      <selectedAchievement.icon className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{selectedAchievement.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={`bg-gradient-to-r ${tierConfig[selectedAchievement.tier].gradient} text-white`}>
                          {selectedAchievement.tier.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {selectedAchievement.points} Points
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0 space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{selectedAchievement.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Story</h4>
                    <p className="text-muted-foreground italic">{selectedAchievement.story}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Requirements</h4>
                    <ul className="space-y-2">
                      {selectedAchievement.requirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-muted-foreground">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedAchievement.maxProgress > 1 && (
                    <div>
                      <h4 className="font-semibold mb-2">Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Current Progress</span>
                          <span className="font-medium">
                            {selectedAchievement.progress}/{selectedAchievement.maxProgress}
                          </span>
                        </div>
                        <Progress 
                          value={(selectedAchievement.progress / selectedAchievement.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}

                  {selectedAchievement.nextLevel && (
                    <div className="p-4 rounded-lg bg-muted/30">
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Flag className="h-4 w-4 mr-2" />
                        Next Level
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {achievements.find(a => a.id === selectedAchievement.nextLevel)?.title || 'Unknown Achievement'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}