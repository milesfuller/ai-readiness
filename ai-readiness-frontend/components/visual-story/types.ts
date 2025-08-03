// Type definitions for Visual Storytelling Components

export interface OnboardingStep {
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

export interface Force {
  id: string
  type: 'pull' | 'push' | 'anxiety' | 'habit'
  label: string
  description: string
  strength: number // 1-10
  category: 'business' | 'technical' | 'cultural' | 'strategic'
  icon: React.ComponentType<{ className?: string }>
  color: string
}

export interface JTBDScenario {
  id: string
  title: string
  subtitle: string
  description: string
  currentState: string
  desiredState: string
  forces: Force[]
}

export interface ProgressMilestone {
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

export interface StoryChapter {
  id: string
  title: string
  description: string
  milestones: ProgressMilestone[]
  overallProgress: number
  narrative: string
  visualMetaphor: string
}

export interface Achievement {
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

export interface Milestone {
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

export interface EmptyStateProps {
  type: string
  className?: string
  customTitle?: string
  customDescription?: string
  customActions?: {
    primary?: { label: string; action: () => void }
    secondary?: { label: string; action: () => void }
  }
}

export interface ChartData {
  [key: string]: string | number
}

export interface TrendData {
  value: number
  direction: 'up' | 'down' | 'neutral'
  timeframe: string
}