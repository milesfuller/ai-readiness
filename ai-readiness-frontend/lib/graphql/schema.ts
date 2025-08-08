import { gql } from 'graphql-tag'
import { DateTimeResolver, JSONResolver, DateTimeTypeDefinition, JSONTypeDefinition } from 'graphql-scalars'
import { GraphQLUpload } from 'graphql-upload'

/**
 * GraphQL Type Definitions for AI Readiness Platform
 * 
 * Comprehensive schema covering:
 * - User management and authentication
 * - Organization and team management  
 * - Survey creation and management
 * - Response collection and analysis
 * - Real-time subscriptions
 * - Analytics and reporting
 * - Voice recording support
 * - JTBD (Jobs-to-be-Done) analysis
 * - API key and webhook management
 */

export const typeDefs = gql`
  # Scalar types
  scalar DateTime
  scalar JSON
  scalar Upload
  
  # ==========================================
  # USER AND AUTHENTICATION TYPES
  # ==========================================
  
  type User {
    id: ID!
    email: String!
    role: UserRole!
    profile: UserProfile
    organizationId: String
    organization: Organization
    
    # Permissions and access
    permissions: [String!]!
    isActive: Boolean!
    emailVerified: Boolean!
    
    # Activity tracking
    lastLoginAt: DateTime
    surveysCreated: Int!
    responsesSubmitted: Int!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  type UserProfile {
    id: ID!
    userId: String!
    firstName: String
    lastName: String
    avatar: String
    department: String
    jobTitle: String
    preferences: UserPreferences!
  }
  
  type UserPreferences {
    theme: String!
    notifications: Boolean!
    voiceInput: Boolean!
    language: String!
    timezone: String
  }
  
  enum UserRole {
    SYSTEM_ADMIN
    ORG_ADMIN  
    ANALYST
    USER
    VIEWER
  }
  
  # ==========================================
  # ORGANIZATION TYPES
  # ==========================================
  
  type Organization {
    id: ID!
    name: String!
    domain: String
    industry: String
    size: String
    description: String
    settings: OrganizationSettings!
    
    # Relationships
    members: [User!]!
    surveys: [Survey!]!
    apiKeys: [ApiKey!]!
    
    # Statistics
    memberCount: Int!
    surveyCount: Int!
    totalResponses: Int!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  type OrganizationSettings {
    allowSelfRegistration: Boolean!
    defaultRole: UserRole!
    requireEmailVerification: Boolean!
    dataRetentionDays: Int!
    enableAuditLogs: Boolean!
    enable2FA: Boolean!
    enableSSO: Boolean!
    ssoProvider: String
    
    # Survey settings
    allowAnonymousResponses: Boolean!
    enableVoiceRecording: Boolean!
    enableJTBDAnalysis: Boolean!
    maxSurveysPerUser: Int!
    customBranding: JSON
  }
  
  # ==========================================
  # SURVEY TYPES
  # ==========================================
  
  type Survey {
    id: ID!
    title: String!
    description: String
    status: SurveyStatus!
    visibility: SurveyVisibility!
    
    # Configuration
    settings: SurveySettings!
    questions: [Question!]!
    tags: [String!]!
    
    # Relationships
    createdBy: User!
    organization: Organization!
    template: SurveyTemplate
    responses(limit: Int = 20, offset: Int = 0, status: ResponseStatus): [Response!]!
    sessions: [SurveySession!]!
    
    # Analytics
    analytics: SurveyAnalytics!
    responseCount: Int!
    completionRate: Float!
    averageCompletionTime: Int!
    
    # Sharing
    shareUrl: String!
    embedCode: String!
    qrCode: String!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    publishedAt: DateTime
    archivedAt: DateTime
  }
  
  enum SurveyStatus {
    DRAFT
    PUBLISHED
    PAUSED
    ARCHIVED
    DELETED
  }
  
  enum SurveyVisibility {
    PUBLIC
    ORGANIZATION
    PRIVATE
    INVITED_ONLY
  }
  
  type SurveySettings {
    allowAnonymous: Boolean!
    requireAuth: Boolean!
    oneResponsePerUser: Boolean!
    enableVoice: Boolean!
    enableJTBD: Boolean!
    collectMetadata: Boolean!
    
    # Messages
    welcomeMessage: String
    thankYouMessage: String
    
    # Behavior
    redirectUrl: String
    maxResponses: Int
    expiresAt: DateTime
    randomizeQuestions: Boolean!
    showProgressBar: Boolean!
    allowPreviousNavigation: Boolean!
  }
  
  type Question {
    id: ID!
    type: QuestionType!
    title: String!
    description: String
    required: Boolean!
    order: Int!
    
    # Question configuration
    options: [QuestionOption!]
    validation: QuestionValidation
    metadata: JSON
    
    # Conditional logic
    displayConditions: JSON
    skipLogic: JSON
    
    # Relationships
    survey: Survey!
    responses: [QuestionResponse!]!
    
    # Analytics
    responseCount: Int!
    skipRate: Float!
    averageTimeSpent: Int!
    topAnswers: [AnswerFrequency!]!
    
    # JTBD specific
    jtbdCategory: JTBDCategory
    jtbdWeight: Float
  }
  
  type QuestionOption {
    id: ID!
    text: String!
    value: String!
    order: Int!
    metadata: JSON
  }
  
  type QuestionValidation {
    minLength: Int
    maxLength: Int
    minValue: Float
    maxValue: Float
    pattern: String
    customMessage: String
  }
  
  enum QuestionType {
    TEXT
    TEXTAREA
    MULTIPLE_CHOICE
    SINGLE_CHOICE
    RATING
    SCALE
    BOOLEAN
    JTBD
    VOICE
    DATE
    TIME
    NUMBER
    EMAIL
    PHONE
    URL
    FILE_UPLOAD
    SIGNATURE
    MATRIX
    RANKING
  }
  
  enum JTBDCategory {
    FUNCTIONAL
    EMOTIONAL
    SOCIAL
    PUSH_FORCE
    PULL_FORCE
    HABIT_FORCE
    ANXIETY_FORCE
  }
  
  # ==========================================
  # RESPONSE TYPES
  # ==========================================
  
  type Response {
    id: ID!
    status: ResponseStatus!
    
    # Relationships
    survey: Survey!
    session: SurveySession!
    user: User
    
    # Response data
    answers: [QuestionResponse!]!
    metadata: ResponseMetadata!
    
    # Analysis
    analysis: ResponseAnalysis
    qualityScore: Float
    
    # Timestamps
    startedAt: DateTime!
    completedAt: DateTime
    updatedAt: DateTime!
  }
  
  enum ResponseStatus {
    STARTED
    IN_PROGRESS
    COMPLETED
    ABANDONED
    INVALID
  }
  
  type ResponseMetadata {
    userAgent: String!
    ipAddress: String
    device: String
    browser: String
    os: String
    screenResolution: String
    language: String
    timezone: String
    voiceInputUsed: Boolean!
    totalTimeSpent: Int!
  }
  
  type QuestionResponse {
    id: ID!
    question: Question!
    response: Response!
    
    # Answer data (union-like approach)
    textAnswer: String
    numberAnswer: Float
    booleanAnswer: Boolean
    choiceAnswers: [String!]
    dateAnswer: DateTime
    fileAnswers: [FileUpload!]
    matrixAnswers: JSON
    
    # Special answer types
    voiceRecording: VoiceRecording
    jtbdScores: JTBDScores
    
    # Metadata
    timeSpent: Int!
    skipped: Boolean!
    confidence: Float
    
    # Timestamps
    answeredAt: DateTime!
  }
  
  type FileUpload {
    id: ID!
    filename: String!
    url: String!
    size: Int!
    mimeType: String!
    uploadedAt: DateTime!
  }
  
  type VoiceRecording {
    id: ID!
    url: String!
    duration: Int!
    fileSize: Int!
    format: String!
    
    # Processing results
    transcription: String
    confidence: Float
    quality: VoiceQuality!
    
    # AI Analysis
    sentiment: SentimentAnalysis
    themes: [Theme!]!
    keywords: [String!]!
    
    # Timestamps
    recordedAt: DateTime!
    processedAt: DateTime
  }
  
  type VoiceQuality {
    overallScore: Float!
    noiseLevel: Float!
    clarity: Float!
    volume: Float!
    audioQuality: String!
  }
  
  type JTBDScores {
    # Core forces
    progress: Float!
    anxiety: Float!
    habit: Float!
    social: Float!
    
    # Calculated metrics
    pushForces: Float!
    pullForces: Float!
    momentum: Float!
    friction: Float!
    switchingProbability: Float!
  }
  
  # ==========================================
  # SESSION TYPES
  # ==========================================
  
  type SurveySession {
    id: ID!
    survey: Survey!
    user: User
    
    # Session tracking
    status: SessionStatus!
    startedAt: DateTime!
    lastActiveAt: DateTime!
    completedAt: DateTime
    
    # Session metadata
    ipAddress: String
    userAgent: String
    device: String
    referrer: String
    
    # Progress tracking
    currentQuestionId: String
    responses: [Response!]!
    totalTimeSpent: Int!
    questionsAnswered: Int!
    questionsSkipped: Int!
    progressPercent: Float!
    
    # Quality metrics
    engagementScore: Float
    attentionScore: Float
  }
  
  enum SessionStatus {
    ACTIVE
    PAUSED
    COMPLETED
    ABANDONED
    EXPIRED
  }
  
  # ==========================================
  # ANALYTICS TYPES
  # ==========================================
  
  type SurveyAnalytics {
    survey: Survey!
    
    # Basic metrics
    totalSessions: Int!
    totalResponses: Int!
    completedResponses: Int!
    averageCompletionTime: Int!
    completionRate: Float!
    abandonmentRate: Float!
    
    # Time-based analysis
    responsesOverTime: [TimeSeries!]!
    completionRateOverTime: [TimeSeries!]!
    
    # Question analytics
    questionAnalytics: [QuestionAnalytics!]!
    
    # Advanced insights
    insights: [AnalyticsInsight!]!
    anomalies: [Anomaly!]!
    themes: [Theme!]!
    sentiment: SentimentSummary!
    
    # Demographic breakdowns
    demographics: Demographics
    
    # Quality metrics
    dataQualityScore: Float!
    responseQualityDistribution: [QualityDistribution!]!
    
    # Generated content
    executiveSummary: String!
    keyFindings: [String!]!
    recommendations: [String!]!
    
    # JTBD Analysis (if enabled)
    jtbdAnalysis: JTBDAnalysis
    
    # Export capabilities
    exportFormats: [String!]!
    lastExportedAt: DateTime
  }
  
  type QuestionAnalytics {
    question: Question!
    
    # Response metrics
    totalResponses: Int!
    validResponses: Int!
    skipCount: Int!
    skipRate: Float!
    averageTimeSpent: Int!
    
    # Answer analysis
    answerDistribution: JSON!
    topAnswers: [AnswerFrequency!]!
    uniqueAnswers: Int!
    
    # Text analysis (for text questions)
    wordCloud: [WordFrequency!]!
    themes: [Theme!]!
    sentiment: SentimentSummary
    averageTextLength: Int
    
    # Voice analysis (for voice questions)
    voiceAnalytics: VoiceAnalytics
    
    # Quality metrics
    qualityScore: Float!
    confidenceScore: Float!
  }
  
  type VoiceAnalytics {
    totalRecordings: Int!
    averageDuration: Int!
    totalDuration: Int!
    averageQualityScore: Float!
    transcriptionAccuracy: Float!
    
    # Content analysis
    themes: [Theme!]!
    sentiment: SentimentSummary!
    topKeywords: [WordFrequency!]!
    languageDistribution: [LanguageDistribution!]!
    
    # Technical metrics
    averageFileSize: Int!
    formatDistribution: [FormatDistribution!]!
    qualityDistribution: [QualityDistribution!]!
  }
  
  type LanguageDistribution {
    language: String!
    count: Int!
    percentage: Float!
    confidence: Float!
  }
  
  type FormatDistribution {
    format: String!
    count: Int!
    percentage: Float!
  }
  
  type QualityDistribution {
    qualityRange: String!
    count: Int!
    percentage: Float!
  }
  
  # ==========================================
  # ANALYSIS TYPES
  # ==========================================
  
  type ResponseAnalysis {
    response: Response!
    
    # AI-generated insights
    sentiment: SentimentAnalysis!
    themes: [Theme!]!
    insights: [String!]!
    summary: String!
    
    # JTBD analysis (if applicable)
    jtbdAnalysis: JTBDAnalysis
    
    # Quality assessment
    qualityScore: Float!
    anomalies: [Anomaly!]!
    flags: [String!]!
    
    # Processing metadata
    processedAt: DateTime!
    processingTime: Int!
    modelVersion: String!
    confidence: Float!
  }
  
  type SentimentAnalysis {
    overallScore: Float! # -1 to 1
    label: SentimentLabel!
    confidence: Float!
    emotions: [Emotion!]!
    aspects: [AspectSentiment!]!
  }
  
  type AspectSentiment {
    aspect: String!
    sentiment: Float!
    confidence: Float!
    mentions: Int!
  }
  
  enum SentimentLabel {
    VERY_POSITIVE
    POSITIVE
    NEUTRAL
    NEGATIVE
    VERY_NEGATIVE
  }
  
  type Emotion {
    emotion: String!
    intensity: Float!
    confidence: Float!
  }
  
  type Theme {
    id: ID!
    name: String!
    description: String
    frequency: Int!
    percentage: Float!
    confidence: Float!
    examples: [String!]!
    category: String
    
    # Relationships
    responses: [Response!]!
    questions: [Question!]!
    
    # Trend analysis
    trend: TrendDirection!
    previousFrequency: Int
  }
  
  enum TrendDirection {
    INCREASING
    DECREASING
    STABLE
    NEW
  }
  
  type JTBDAnalysis {
    # Job statements
    jobs: [Job!]!
    
    # Force analysis
    forces: ForceAnalysis!
    
    # Outcomes and satisfaction
    outcomes: [Outcome!]!
    
    # Switching moments
    moments: [Moment!]!
    
    # Strategic insights
    opportunities: [Opportunity!]!
    recommendations: [String!]!
    
    # Quantitative metrics
    overallMomentum: Float!
    switchingProbability: Float!
    satisfactionGap: Float!
  }
  
  type Job {
    statement: String!
    category: JTBDCategory!
    frequency: Int!
    importance: Float!
    satisfaction: Float!
    opportunity: Float! # importance - satisfaction
    examples: [String!]!
    confidence: Float!
  }
  
  type ForceAnalysis {
    # Push forces (problems with current solution)
    pushForces: [Force!]!
    
    # Pull forces (attraction to new solution)
    pullForces: [Force!]!
    
    # Anxiety forces (fear of new solution)
    anxietyForces: [Force!]!
    
    # Habit forces (comfort with current solution)
    habitForces: [Force!]!
    
    # Calculated aggregates
    totalPush: Float!
    totalPull: Float!
    totalAnxiety: Float!
    totalHabit: Float!
    
    # Net forces
    momentum: Float! # (push + pull) - (anxiety + habit)
    friction: Float! # anxiety + habit
    energy: Float! # push + pull
  }
  
  type Force {
    description: String!
    strength: Float!
    frequency: Int!
    impact: Float!
    confidence: Float!
    category: String
    examples: [String!]!
  }
  
  type Outcome {
    description: String!
    category: String!
    frequency: Int!
    importance: Float!
    satisfaction: Float!
    gap: Float! # importance - satisfaction
    examples: [String!]!
  }
  
  type Moment {
    description: String!
    trigger: String!
    context: String!
    frequency: Int!
    intensity: Float!
    emotions: [String!]!
    opportunities: [String!]!
  }
  
  type Opportunity {
    description: String!
    impact: Float!
    effort: Float!
    priority: OpportunityPriority!
    category: String!
    recommendations: [String!]!
  }
  
  enum OpportunityPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
  
  # ==========================================
  # TEMPLATE TYPES
  # ==========================================
  
  type SurveyTemplate {
    id: ID!
    title: String!
    description: String
    category: TemplateCategory!
    version: Int!
    status: TemplateStatus!
    visibility: TemplateVisibility!
    
    # Template content
    introductionText: String
    conclusionText: String
    questionGroups: [QuestionGroup!]!
    
    # Configuration
    settings: TemplateSettings!
    tags: [String!]!
    estimatedDuration: Int!
    difficultyLevel: Int!
    
    # Ownership
    createdBy: User!
    organizationId: String
    isSystemTemplate: Boolean!
    
    # Usage statistics
    usageCount: Int!
    completionRate: Float!
    averageTime: Int!
    rating: Float!
    
    # Versioning
    parentTemplateId: String
    versionNotes: String
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    publishedAt: DateTime
  }
  
  enum TemplateCategory {
    AI_READINESS
    CUSTOMER_FEEDBACK
    EMPLOYEE_ENGAGEMENT
    MARKET_RESEARCH
    PRODUCT_EVALUATION
    TRAINING_ASSESSMENT
    HEALTH_WELLNESS
    EVENT_FEEDBACK
    RECRUITMENT
    UX_RESEARCH
    COMPLIANCE
    SATISFACTION
    PERFORMANCE
    CUSTOM
  }
  
  enum TemplateStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
    MARKETPLACE
  }
  
  enum TemplateVisibility {
    PRIVATE
    ORGANIZATION
    PUBLIC
    MARKETPLACE
  }
  
  type TemplateSettings {
    allowAnonymous: Boolean!
    requireAllQuestions: Boolean!
    voiceEnabled: Boolean!
    aiAnalysisEnabled: Boolean!
    randomizeQuestions: Boolean!
    showProgressBar: Boolean!
    allowSkipQuestions: Boolean!
    saveProgress: Boolean!
    customCSS: String
    customBranding: JSON
  }
  
  type QuestionGroup {
    id: ID!
    title: String!
    description: String
    orderIndex: Int!
    questions: [TemplateQuestion!]!
    settings: QuestionGroupSettings!
  }
  
  type QuestionGroupSettings {
    randomizeQuestions: Boolean!
    maxQuestionsToShow: Int
    requiredQuestions: Int
  }
  
  type TemplateQuestion {
    id: ID!
    questionText: String!
    questionType: QuestionType!
    description: String
    placeholderText: String
    helpText: String
    
    # Configuration
    options: [QuestionOption!]
    validation: QuestionValidation
    required: Boolean!
    
    # Ordering and grouping
    orderIndex: Int!
    
    # JTBD specific
    jtbdCategory: JTBDCategory
    jtbdWeight: Float
    
    # Conditional logic
    displayConditions: JSON
    skipLogic: JSON
    
    # Metadata
    tags: [String!]!
    analyticsEnabled: Boolean!
  }
  
  # ==========================================
  # API MANAGEMENT TYPES
  # ==========================================
  
  type ApiKey {
    id: ID!
    name: String!
    keyPrefix: String! # Only show first 8 chars
    permissions: [String!]!
    
    # Usage tracking
    usageCount: Int!
    lastUsedAt: DateTime
    rateLimitHits: Int!
    
    # Configuration
    expiresAt: DateTime
    isActive: Boolean!
    rateLimitPerHour: Int!
    
    # Relationships
    user: User!
    organization: Organization!
    
    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  # ==========================================
  # UTILITY TYPES
  # ==========================================
  
  type TimeSeries {
    timestamp: DateTime!
    value: Float!
    label: String
    metadata: JSON
  }
  
  type AnswerFrequency {
    answer: String!
    count: Int!
    percentage: Float!
  }
  
  type WordFrequency {
    word: String!
    frequency: Int!
    significance: Float!
    sentiment: Float
  }
  
  type SentimentSummary {
    positive: Int!
    negative: Int!
    neutral: Int!
    averageScore: Float!
    distribution: [SentimentDistribution!]!
  }
  
  type SentimentDistribution {
    label: SentimentLabel!
    count: Int!
    percentage: Float!
  }
  
  type Demographics {
    ageGroups: [DemographicBreakdown!]!
    locations: [DemographicBreakdown!]!
    departments: [DemographicBreakdown!]!
    roles: [DemographicBreakdown!]!
    industries: [DemographicBreakdown!]!
    devices: [DemographicBreakdown!]!
    browsers: [DemographicBreakdown!]!
  }
  
  type DemographicBreakdown {
    category: String!
    count: Int!
    percentage: Float!
    trend: TrendDirection
  }
  
  type AnalyticsInsight {
    id: ID!
    type: InsightType!
    title: String!
    description: String!
    confidence: Float!
    actionable: Boolean!
    priority: InsightPriority!
    category: String!
    data: JSON
    recommendations: [String!]!
    detectedAt: DateTime!
  }
  
  enum InsightType {
    TREND
    ANOMALY
    CORRELATION
    RECOMMENDATION
    WARNING
    OPPORTUNITY
    PATTERN
    OUTLIER
  }
  
  enum InsightPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
    URGENT
  }
  
  type Anomaly {
    id: ID!
    type: String!
    description: String!
    severity: AnomalySeverity!
    confidence: Float!
    data: JSON!
    affectedMetrics: [String!]!
    recommendations: [String!]!
    detectedAt: DateTime!
  }
  
  enum AnomalySeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
  
  # ==========================================
  # INPUT TYPES
  # ==========================================
  
  input CreateSurveyInput {
    title: String!
    description: String
    templateId: String
    questions: [CreateQuestionInput!]!
    settings: SurveySettingsInput
    tags: [String!]
    publishImmediately: Boolean = false
    visibility: SurveyVisibility = ORGANIZATION
  }
  
  input CreateQuestionInput {
    type: QuestionType!
    title: String!
    description: String
    required: Boolean = false
    options: [QuestionOptionInput!]
    validation: QuestionValidationInput
    metadata: JSON
    displayConditions: JSON
    skipLogic: JSON
    jtbdCategory: JTBDCategory
    jtbdWeight: Float
  }
  
  input QuestionOptionInput {
    text: String!
    value: String!
    order: Int!
    metadata: JSON
  }
  
  input QuestionValidationInput {
    minLength: Int
    maxLength: Int
    minValue: Float
    maxValue: Float
    pattern: String
    customMessage: String
  }
  
  input SurveySettingsInput {
    allowAnonymous: Boolean = true
    requireAuth: Boolean = false
    oneResponsePerUser: Boolean = true
    enableVoice: Boolean = false
    enableJTBD: Boolean = false
    collectMetadata: Boolean = true
    welcomeMessage: String
    thankYouMessage: String
    redirectUrl: String
    maxResponses: Int
    expiresAt: DateTime
    randomizeQuestions: Boolean = false
    showProgressBar: Boolean = true
    allowPreviousNavigation: Boolean = true
  }
  
  input UpdateSurveyInput {
    title: String
    description: String
    settings: SurveySettingsInput
    tags: [String!]
    visibility: SurveyVisibility
  }
  
  input SubmitResponseInput {
    surveyId: ID!
    sessionId: ID!
    answers: [AnswerInput!]!
    metadata: ResponseMetadataInput
  }
  
  input AnswerInput {
    questionId: ID!
    textAnswer: String
    numberAnswer: Float
    booleanAnswer: Boolean
    choiceAnswers: [String!]
    dateAnswer: DateTime
    voiceRecordingId: String
    jtbdScores: JTBDScoresInput
    confidence: Float
    timeSpent: Int
  }
  
  input JTBDScoresInput {
    progress: Float!
    anxiety: Float!
    habit: Float = 0
    social: Float = 0
  }
  
  input ResponseMetadataInput {
    userAgent: String
    device: String
    browser: String
    os: String
    screenResolution: String
    language: String
    timezone: String
  }
  
  input AnalyticsFilters {
    dateFrom: DateTime
    dateTo: DateTime
    surveyIds: [ID!]
    questionTypes: [QuestionType!]
    responseStatuses: [ResponseStatus!]
    includeAnonymous: Boolean = true
    minQualityScore: Float
    departments: [String!]
    roles: [String!]
    devices: [String!]
  }
  
  input CreateApiKeyInput {
    name: String!
    permissions: [String!]!
    expiresAt: DateTime
    rateLimitPerHour: Int = 1000
  }
  
  input PaginationInput {
    limit: Int = 20
    offset: Int = 0
    orderBy: String
    orderDirection: OrderDirection = DESC
  }
  
  enum OrderDirection {
    ASC
    DESC
  }
  
  input SearchInput {
    query: String!
    types: [SearchType!] = [SURVEYS, RESPONSES]
    filters: JSON
    pagination: PaginationInput
  }
  
  enum SearchType {
    SURVEYS
    RESPONSES
    USERS
    ORGANIZATIONS
    TEMPLATES
    THEMES
  }
  
  # ==========================================
  # ROOT TYPES
  # ==========================================
  
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(pagination: PaginationInput, filters: JSON): [User!]!
    
    # Organization queries
    organization(id: ID): Organization
    organizations(pagination: PaginationInput): [Organization!]!
    
    # Survey queries
    survey(id: ID!): Survey
    surveys(
      pagination: PaginationInput
      status: SurveyStatus
      visibility: SurveyVisibility
      search: String
      tags: [String!]
      createdBy: ID
    ): [Survey!]!
    surveyByShareUrl(shareUrl: String!): Survey
    
    # Response queries
    response(id: ID!): Response
    responses(
      surveyId: ID
      pagination: PaginationInput
      status: ResponseStatus
      filters: AnalyticsFilters
    ): [Response!]!
    
    # Session queries
    surveySession(id: ID!): SurveySession
    surveySessions(
      surveyId: ID
      pagination: PaginationInput
      status: SessionStatus
    ): [SurveySession!]!
    
    # Analytics queries
    surveyAnalytics(surveyId: ID!, filters: AnalyticsFilters): SurveyAnalytics!
    dashboardAnalytics(filters: AnalyticsFilters): JSON!
    responseAnalytics(responseId: ID!): ResponseAnalysis
    
    # Template queries
    surveyTemplate(id: ID!): SurveyTemplate
    surveyTemplates(
      pagination: PaginationInput
      category: TemplateCategory
      visibility: TemplateVisibility
      search: String
    ): [SurveyTemplate!]!
    
    # API management queries
    apiKeys(pagination: PaginationInput): [ApiKey!]!
    apiKey(id: ID!): ApiKey
    
    # Search
    search(input: SearchInput!): JSON!
    
    # System queries
    systemHealth: JSON!
    systemMetrics: JSON!
  }
  
  type Mutation {
    # Survey mutations
    createSurvey(input: CreateSurveyInput!): Survey!
    updateSurvey(id: ID!, input: UpdateSurveyInput!): Survey!
    deleteSurvey(id: ID!): Boolean!
    duplicateSurvey(id: ID!, title: String): Survey!
    
    # Survey status mutations
    publishSurvey(id: ID!): Survey!
    pauseSurvey(id: ID!): Survey!
    archiveSurvey(id: ID!): Survey!
    
    # Response mutations
    startSurveySession(surveyId: ID!, userId: ID): SurveySession!
    submitResponse(input: SubmitResponseInput!): Response!
    updateResponse(id: ID!, input: SubmitResponseInput!): Response!
    deleteResponse(id: ID!): Boolean!
    
    # Voice recording mutations
    uploadVoiceRecording(
      questionId: ID!
      file: Upload!
      metadata: JSON
    ): VoiceRecording!
    processVoiceRecording(id: ID!): VoiceRecording!
    
    # Analysis mutations
    triggerResponseAnalysis(responseIds: [ID!]!): [ResponseAnalysis!]!
    triggerSurveyAnalysis(surveyId: ID!): SurveyAnalytics!
    
    # Export mutations
    generateExport(
      surveyId: ID!
      format: String!
      filters: AnalyticsFilters
    ): String! # Returns download URL
    
    # Template mutations
    createSurveyTemplate(input: JSON!): SurveyTemplate!
    updateSurveyTemplate(id: ID!, input: JSON!): SurveyTemplate!
    deleteSurveyTemplate(id: ID!): Boolean!
    duplicateTemplate(id: ID!, title: String): SurveyTemplate!
    
    # API key mutations
    createApiKey(input: CreateApiKeyInput!): ApiKey!
    updateApiKey(id: ID!, name: String, permissions: [String!]): ApiKey!
    revokeApiKey(id: ID!): Boolean!
    
    # Admin mutations
    updateUserRole(userId: ID!, role: UserRole!): User!
    updateOrganizationSettings(input: JSON!): Organization!
  }
  
  type Subscription {
    # Real-time survey responses
    responseSubmitted(surveyId: ID!): Response!
    
    # Session updates
    sessionUpdated(sessionId: ID!): SurveySession!
    
    # Analysis completion
    analysisCompleted(responseId: ID!): ResponseAnalysis!
    surveyAnalysisCompleted(surveyId: ID!): SurveyAnalytics!
    
    # System notifications
    systemNotification(userId: ID): JSON!
    organizationNotification(organizationId: ID!): JSON!
  }
`

/**
 * Custom scalar resolvers
 */
export const scalarResolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Upload: GraphQLUpload,
}
