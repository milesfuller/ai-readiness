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
  domain?: string
  industry?: string
  size?: string
  website?: string
  description?: string
  settings: OrganizationSettings
  createdAt: string
  updatedAt: string
}

export interface OrganizationSettings {
  allowSelfRegistration: boolean
  defaultRole: UserRole
  requireEmailVerification: boolean
  dataRetentionDays: number
  enableAuditLogs: boolean
  enable2FA: boolean
  enableSSO: boolean
  ssoProvider?: string
  ssoConfig?: any
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
    surveyId?: string
    organizationId?: string
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

export interface Invitation {
  id: string
  email: string
  token: string
  organizationId: string
  role: UserRole
  invitedBy: string
  firstName?: string
  lastName?: string
  customMessage?: string
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  createdAt: string
  updatedAt: string
  expiresAt: string
  acceptedAt?: string
  acceptedByUserId?: string
  resentCount?: number
  lastSentAt?: string
}

export interface EmailTracking {
  id: string
  email: string
  type: 'invitation' | 'reminder' | 'welcome'
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed'
  sentAt?: string
  deliveredAt?: string
  openedAt?: string
  error?: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

// Survey Template System Types
export type QuestionType = 
  | 'text'
  | 'textarea' 
  | 'multiple_choice'
  | 'single_choice'
  | 'scale'
  | 'boolean'
  | 'jtbd'
  | 'rating'
  | 'ranking'
  | 'matrix'
  | 'file_upload'
  | 'date'
  | 'time'
  | 'email'
  | 'number'
  | 'slider'
  | 'color'
  | 'signature'

export type TemplateCategory = 
  | 'ai_readiness'
  | 'customer_feedback'
  | 'employee_engagement'
  | 'market_research'
  | 'product_evaluation'
  | 'training_assessment'
  | 'health_wellness'
  | 'event_feedback'
  | 'recruitment'
  | 'ux_research'
  | 'compliance'
  | 'satisfaction'
  | 'performance'
  | 'custom'

export type JTBDCategory = 
  | 'functional'
  | 'emotional'
  | 'social'
  | 'push_force'
  | 'pull_force'
  | 'habit_force'
  | 'anxiety_force'

export interface SurveyTemplate {
  id: string
  title: string
  description?: string
  category: TemplateCategory
  version: number
  status: 'draft' | 'published' | 'archived' | 'marketplace'
  visibility: 'private' | 'organization' | 'public' | 'marketplace'
  
  // Template metadata
  estimatedDuration: number // in minutes
  difficultyLevel: number // 1-5
  tags: string[]
  
  // Template content
  introductionText?: string
  conclusionText?: string
  questionGroups: QuestionGroup[]
  
  // Customization options
  settings: TemplateSettings
  
  // Ownership and sharing
  createdBy: string
  organizationId?: string
  isSystemTemplate: boolean
  
  // Marketplace data
  marketplaceData: MarketplaceData
  
  // Performance tracking
  usageCount: number
  completionRate: number
  averageTime: number // in minutes
  
  // Versioning
  parentTemplateId?: string
  versionNotes?: string
  
  createdAt: string
  updatedAt: string
  publishedAt?: string
  archivedAt?: string
}

export interface TemplateQuestion {
  id: string
  templateId: string
  
  // Question content
  questionText: string
  questionType: QuestionType
  description?: string
  placeholderText?: string
  helpText?: string
  
  // Question configuration
  options: any[] // For multiple choice, scale options, etc.
  validationRules: Record<string, any>
  required: boolean
  
  // Ordering and grouping
  groupId?: string
  groupTitle?: string
  orderIndex: number
  
  // JTBD specific
  jtbdCategory?: JTBDCategory
  jtbdWeight: number
  
  // Question metadata
  tags: string[]
  analyticsEnabled: boolean
  
  // Conditional logic
  displayConditions: Record<string, any>
  skipLogic: Record<string, any>
  
  createdAt: string
  updatedAt: string
}

export interface QuestionGroup {
  id: string
  title: string
  description?: string
  orderIndex: number
  questions: TemplateQuestion[]
}

export interface TemplateSettings {
  allowAnonymous: boolean
  requireAllQuestions: boolean
  voiceEnabled: boolean
  aiAnalysisEnabled: boolean
  randomizeQuestions: boolean
  showProgressBar: boolean
  allowSkipQuestions: boolean
  saveProgress: boolean
  customCSS?: string
  customBranding: Record<string, any>
}

export interface MarketplaceData {
  price: number
  downloads: number
  rating: number
  reviews: number
  featured: boolean
  license: string
}

export interface TemplateVersion {
  id: string
  templateId: string
  versionNumber: number
  templateSnapshot: any
  questionsSnapshot: any
  versionNotes?: string
  createdBy: string
  createdAt: string
  usageCount: number
  completionRate: number
}

export interface TemplateShare {
  id: string
  templateId: string
  sharedWithOrgId?: string
  sharedWithUserId?: string
  permissionLevel: 'view' | 'use' | 'edit' | 'admin'
  sharedBy: string
  sharedAt: string
  expiresAt?: string
  timesUsed: number
  lastUsedAt?: string
}

export interface TemplateAnalytics {
  id: string
  templateId: string
  organizationId?: string
  periodStart: string
  periodEnd: string
  totalUses: number
  totalCompletions: number
  uniqueUsers: number
  completionRate: number
  averageCompletionTime: number
  questionAnalytics: QuestionAnalytics[]
  satisfactionRating: number
  feedbackCount: number
  createdAt: string
}

export interface QuestionAnalytics {
  questionId: string
  responseRate: number
  averageTime: number
  skipRate: number
  satisfactionScore?: number
  commonResponses?: string[]
}

export interface TemplateReview {
  id: string
  templateId: string
  reviewerId: string
  organizationId?: string
  rating: number // 1-5
  title?: string
  reviewText?: string
  pros?: string
  cons?: string
  verifiedPurchase: boolean
  helpfulVotes: number
  totalVotes: number
  createdAt: string
  updatedAt: string
}

export interface TemplateFilters {
  search?: string
  category?: TemplateCategory
  status?: string
  visibility?: string
  tags?: string[]
  rating?: number
  difficultyLevel?: number
  createdBy?: string
  organizationId?: string
}

export interface QuestionLibraryItem {
  id: string
  questionText: string
  questionType: QuestionType
  category: string
  description?: string
  tags: string[]
  options?: any[]
  validationRules?: Record<string, any>
  isSystemQuestion: boolean
  usageCount: number
  rating: number
  createdBy: string
  createdAt: string
}

// Onboarding types
export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  required: boolean
  path: string
}

export interface OnboardingState {
  currentStep: number
  completedSteps: string[]
  totalSteps: number
  isComplete: boolean
  profile?: Partial<UserProfile>
  selectedOrganization?: Organization | null
  createdOrganization?: Partial<Organization>
  selectedRole?: UserRole
  permissions?: string[]
}

export interface OnboardingProgress {
  userId: string
  currentStep: number
  completedSteps: string[]
  data: Record<string, any>
  startedAt: string
  completedAt?: string
}

export interface TutorialStep {
  id: string
  title: string
  description: string
  target?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  showSkip?: boolean
  action?: {
    type: 'click' | 'hover' | 'scroll'
    target: string
  }
}