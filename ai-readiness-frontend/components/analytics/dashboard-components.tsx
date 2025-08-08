// Re-export all analytics dashboard components for easy importing
export { MetricsCard, VoiceMetricsCard, JTBDMetricsCard } from './MetricsCard'
export { JTBDAnalyticsChart } from './JTBDAnalyticsChart'
export { VoiceAnalyticsChart } from './VoiceAnalyticsChart'
export { UserEngagementChart } from './UserEngagementChart'
export { ExportControls } from './ExportControls'

// Type definitions for analytics data
export interface AnalyticsFilters {
  dateRange?: {
    start: string
    end: string
  }
  department?: string
  metric?: string
}

export interface VoiceAnalytics {
  totalRecordings: number
  averageDuration: number
  transcriptionAccuracy: number
  sentimentDistribution: Record<string, number>
}

export interface JTBDForces {
  push: number
  pull: number
  habit: number
  anxiety: number
}

export interface UserEngagement {
  dailyActiveUsers: Array<{ date: string; users: number }>
  sessionDuration: Array<{ date: string; duration: number }>
  featureUsage: Record<string, number>
}

export interface DashboardAnalytics {
  totalResponses: number
  completionRate: number
  averageTime: number
  activeUsers: number
  departmentBreakdown: Record<string, number>
  jtbdForces: JTBDForces
  voiceAnalytics: VoiceAnalytics
  userEngagement: UserEngagement
  trends: {
    responseGrowth: number
    engagementChange: number
    completionTrend: number
  }
}