export type UserRole = 'user' | 'org_admin' | 'system_admin'

export interface User {
  id: string
  email: string
  role: UserRole
  organizationId?: string
  profile?: UserProfile
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface UserProfile {
  id: string
  userId: string
  firstName?: string
  lastName?: string
  avatar?: string
  department?: string
  jobTitle?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
  voiceInput: boolean
  language: string
}

export interface Organization {
  id: string
  name: string
  domain: string
  settings: OrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface OrganizationSettings {
  allowSelfRegistration: boolean
  defaultRole: UserRole
  requireEmailVerification: boolean
}

export interface Survey {
  id: string
  title: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  createdBy: string
  organizationId: string
  questions: SurveyQuestion[]
  metadata: SurveyMetadata
  createdAt: string
  updatedAt: string
  responses?: SurveyResponse[]
}

export interface SurveyQuestion {
  id: string
  type: 'text' | 'multiple_choice' | 'scale' | 'boolean' | 'jtbd'
  question: string
  options?: string[]
  required: boolean
  category: string
  order: number
}

export interface SurveyMetadata {
  estimatedDuration: number
  totalQuestions: number
  completionRate: number
  averageScore?: number
}

export interface SurveyResponse {
  id: string
  surveyId: string
  userId: string
  answers: SurveyAnswer[]
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  metadata: ResponseMetadata
}

export interface SurveyAnswer {
  questionId: string
  answer: string | number | boolean | string[]
  confidence?: number
  timeSpent?: number
}

export interface ResponseMetadata {
  userAgent: string
  ipAddress: string
  device: string
  completionTime: number
  voiceInputUsed: boolean
}

export interface JTBDForces {
  push: number
  pull: number
  habit: number
  anxiety: number
}

export interface Analytics {
  totalResponses: number
  completionRate: number
  averageTime: number
  topIssues: string[]
  departmentBreakdown: Record<string, number>
  jtbdAnalysis: JTBDForces
}

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'json'
  includePersonalData: boolean
  dateRange?: {
    start: string
    end: string
  }
  filters?: {
    department?: string
    role?: string
    status?: string
  }
}

export interface AdminFilters {
  search?: string
  status?: string
  department?: string
  role?: string
  dateRange?: {
    start: string
    end: string
  }
  organization?: string
}