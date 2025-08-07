/**
 * API CONTRACTS - IMMUTABLE INTERFACES
 * 
 * WARNING: These interfaces define the contract between all system components.
 * Changes to these interfaces MUST be backwards compatible or require
 * a coordinated migration across all agents.
 * 
 * VALIDATION: Run `npm run validate:contracts` before any modifications
 */

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: UserRole;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly preferences: UserPreferences;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly notifications: NotificationSettings;
  readonly privacy: PrivacySettings;
}

export interface NotificationSettings {
  readonly email: boolean;
  readonly push: boolean;
  readonly sms: boolean;
  readonly frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface PrivacySettings {
  readonly profileVisibility: 'public' | 'private' | 'friends';
  readonly dataSharing: boolean;
  readonly analytics: boolean;
}

export type UserRole = 'admin' | 'user' | 'moderator' | 'readonly';

export interface AuthResponse {
  readonly user: User;
  readonly token: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
  readonly rememberMe?: boolean;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly acceptTerms: boolean;
}

export interface PasswordResetRequest {
  readonly email: string;
}

export interface PasswordResetConfirmRequest {
  readonly token: string;
  readonly newPassword: string;
}

// ============================================================================
// SURVEY SYSTEM
// ============================================================================

export interface Survey {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly questions: Question[];
  readonly settings: SurveySettings;
  readonly status: SurveyStatus;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: number;
}

export interface SurveySettings {
  readonly isPublic: boolean;
  readonly requireAuth: boolean;
  readonly allowAnonymous: boolean;
  readonly maxResponses: number | null;
  readonly expiresAt: Date | null;
  readonly redirectUrl: string | null;
  readonly showProgressBar: boolean;
  readonly allowBackNavigation: boolean;
}

export type SurveyStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';

export interface Question {
  readonly id: string;
  readonly surveyId: string;
  readonly type: QuestionType;
  readonly title: string;
  readonly description?: string;
  readonly required: boolean;
  readonly order: number;
  readonly options: QuestionOption[];
  readonly validation: QuestionValidation;
  readonly conditional: ConditionalLogic | null;
}

export type QuestionType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'date' 
  | 'time' 
  | 'datetime'
  | 'radio' 
  | 'checkbox' 
  | 'select' 
  | 'multiselect'
  | 'rating' 
  | 'scale' 
  | 'matrix'
  | 'file' 
  | 'voice'
  | 'signature';

export interface QuestionOption {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly order: number;
  readonly metadata?: Record<string, unknown>;
}

export interface QuestionValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
  readonly customValidator?: string;
  readonly errorMessage?: string;
}

export interface ConditionalLogic {
  readonly conditions: Condition[];
  readonly action: 'show' | 'hide' | 'require' | 'optional';
  readonly operator: 'and' | 'or';
}

export interface Condition {
  readonly questionId: string;
  readonly operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  readonly value: string | number | boolean;
}

// ============================================================================
// SURVEY RESPONSES
// ============================================================================

export interface SurveySession {
  readonly id: string;
  readonly surveyId: string;
  readonly userId: string | null; // null for anonymous
  readonly status: SessionStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly currentQuestionId: string | null;
  readonly responses: Response[];
  readonly metadata: SessionMetadata;
}

export type SessionStatus = 'started' | 'in_progress' | 'completed' | 'abandoned';

export interface SessionMetadata {
  readonly userAgent: string;
  readonly ipAddress: string;
  readonly referrer: string | null;
  readonly source: string | null;
  readonly deviceInfo: DeviceInfo;
  readonly timeZone: string;
}

export interface DeviceInfo {
  readonly type: 'desktop' | 'mobile' | 'tablet';
  readonly os: string;
  readonly browser: string;
  readonly screenResolution: string;
}

export interface Response {
  readonly id: string;
  readonly sessionId: string;
  readonly questionId: string;
  readonly value: ResponseValue;
  readonly answeredAt: Date;
  readonly timeSpent: number; // seconds
  readonly metadata?: ResponseMetadata;
}

export type ResponseValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | number[] 
  | FileUpload
  | VoiceRecording;

export interface ResponseMetadata {
  readonly confidence?: number;
  readonly source?: 'user' | 'auto' | 'imported';
  readonly editCount?: number;
  readonly validationPassed?: boolean;
}

export interface FileUpload {
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
  readonly url: string;
  readonly checksum: string;
}

export interface VoiceRecording {
  readonly url: string;
  readonly duration: number;
  readonly format: string;
  readonly size: number;
  readonly transcription?: string;
  readonly confidence?: number;
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export interface SurveyAnalytics {
  readonly surveyId: string;
  readonly totalResponses: number;
  readonly completionRate: number;
  readonly averageTimeToComplete: number;
  readonly dropoffPoints: DropoffPoint[];
  readonly responseRate: ResponseRate;
  readonly demographics: Demographics;
  readonly questionAnalytics: QuestionAnalytics[];
  readonly generatedAt: Date;
}

export interface DropoffPoint {
  readonly questionId: string;
  readonly dropoffCount: number;
  readonly dropoffRate: number;
}

export interface ResponseRate {
  readonly daily: TimeSeriesData[];
  readonly hourly: TimeSeriesData[];
  readonly bySource: SourceData[];
}

export interface TimeSeriesData {
  readonly date: Date;
  readonly count: number;
}

export interface SourceData {
  readonly source: string;
  readonly count: number;
  readonly percentage: number;
}

export interface Demographics {
  readonly ageGroups: AgeGroupData[];
  readonly genderDistribution: GenderData[];
  readonly locationDistribution: LocationData[];
  readonly deviceDistribution: DeviceData[];
}

export interface AgeGroupData {
  readonly ageGroup: string;
  readonly count: number;
  readonly percentage: number;
}

export interface GenderData {
  readonly gender: string;
  readonly count: number;
  readonly percentage: number;
}

export interface LocationData {
  readonly country: string;
  readonly region?: string;
  readonly city?: string;
  readonly count: number;
  readonly percentage: number;
}

export interface DeviceData {
  readonly deviceType: string;
  readonly count: number;
  readonly percentage: number;
}

export interface QuestionAnalytics {
  readonly questionId: string;
  readonly responseCount: number;
  readonly skipCount: number;
  readonly averageTimeSpent: number;
  readonly responseDistribution: ResponseDistribution;
  readonly sentiment?: SentimentAnalysis;
}

export interface ResponseDistribution {
  readonly options: OptionDistribution[];
  readonly textAnalysis?: TextAnalysis;
  readonly numericStats?: NumericStats;
}

export interface OptionDistribution {
  readonly optionId: string;
  readonly count: number;
  readonly percentage: number;
}

export interface TextAnalysis {
  readonly wordCloud: WordCloudData[];
  readonly themes: ThemeData[];
  readonly averageLength: number;
  readonly sentiment: SentimentAnalysis;
}

export interface WordCloudData {
  readonly word: string;
  readonly frequency: number;
  readonly sentiment: number;
}

export interface ThemeData {
  readonly theme: string;
  readonly mentions: number;
  readonly sentiment: number;
}

export interface SentimentAnalysis {
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
  readonly averageScore: number;
}

export interface NumericStats {
  readonly mean: number;
  readonly median: number;
  readonly mode: number[];
  readonly standardDeviation: number;
  readonly min: number;
  readonly max: number;
  readonly distribution: NumberDistribution[];
}

export interface NumberDistribution {
  readonly range: string;
  readonly count: number;
  readonly percentage: number;
}

// ============================================================================
// API ENDPOINTS SPECIFICATION
// ============================================================================

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly metadata?: ApiMetadata;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly traceId: string;
}

export interface ApiMetadata {
  readonly pagination?: PaginationMeta;
  readonly timing?: TimingMeta;
  readonly version: string;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

export interface TimingMeta {
  readonly requestId: string;
  readonly processingTime: number;
  readonly timestamp: Date;
}

export interface ListRequest {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly filters?: Record<string, unknown>;
  readonly sort?: SortOption[];
}

export interface SortOption {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export interface ExportRequest {
  readonly surveyId: string;
  readonly format: ExportFormat;
  readonly options: ExportOptions;
}

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';

export interface ExportOptions {
  readonly includeMetadata: boolean;
  readonly includeTimestamps: boolean;
  readonly includeAnalytics: boolean;
  readonly dateRange?: DateRange;
  readonly filters?: ExportFilters;
}

export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

export interface ExportFilters {
  readonly status?: SessionStatus[];
  readonly completedOnly?: boolean;
  readonly excludeTest?: boolean;
}

export interface ExportJob {
  readonly id: string;
  readonly status: ExportStatus;
  readonly progress: number;
  readonly downloadUrl?: string;
  readonly error?: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
  readonly expiresAt: Date;
}

export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

// ============================================================================
// LLM INTEGRATION
// ============================================================================

export interface LLMAnalysisRequest {
  readonly surveyId: string;
  readonly analysisType: AnalysisType;
  readonly options: LLMAnalysisOptions;
}

export type AnalysisType = 'sentiment' | 'themes' | 'insights' | 'recommendations' | 'summary';

export interface LLMAnalysisOptions {
  readonly includeQuestions?: string[];
  readonly excludeQuestions?: string[];
  readonly minConfidence?: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
}

export interface LLMAnalysisResponse {
  readonly analysisId: string;
  readonly type: AnalysisType;
  readonly results: LLMAnalysisResults;
  readonly confidence: number;
  readonly metadata: LLMMetadata;
  readonly generatedAt: Date;
}

export interface LLMAnalysisResults {
  readonly sentiment?: SentimentAnalysis;
  readonly themes?: ThemeAnalysis[];
  readonly insights?: InsightData[];
  readonly recommendations?: RecommendationData[];
  readonly summary?: string;
}

export interface ThemeAnalysis {
  readonly theme: string;
  readonly description: string;
  readonly frequency: number;
  readonly sentiment: number;
  readonly examples: string[];
  readonly confidence: number;
}

export interface InsightData {
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly importance: number;
  readonly evidence: EvidenceData[];
  readonly confidence: number;
}

export interface EvidenceData {
  readonly type: 'quote' | 'statistic' | 'pattern';
  readonly content: string;
  readonly source: string;
  readonly confidence: number;
}

export interface RecommendationData {
  readonly title: string;
  readonly description: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly category: string;
  readonly actionItems: ActionItem[];
  readonly expectedImpact: string;
  readonly confidence: number;
}

export interface ActionItem {
  readonly description: string;
  readonly effort: 'low' | 'medium' | 'high';
  readonly timeline: string;
  readonly owner?: string;
}

export interface LLMMetadata {
  readonly model: string;
  readonly version: string;
  readonly tokenUsage: TokenUsage;
  readonly processingTime: number;
  readonly parameters: Record<string, unknown>;
}

export interface TokenUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

// ============================================================================
// VALIDATION & TYPE GUARDS
// ============================================================================

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly value?: unknown;
}

export interface ValidationWarning {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
}

// ============================================================================
// WEBHOOK & EVENTS
// ============================================================================

export interface WebhookEvent {
  readonly id: string;
  readonly type: WebhookEventType;
  readonly data: WebhookEventData;
  readonly timestamp: Date;
  readonly version: string;
}

export type WebhookEventType = 
  | 'survey.created'
  | 'survey.updated'
  | 'survey.published'
  | 'survey.completed'
  | 'response.received'
  | 'response.updated'
  | 'user.registered'
  | 'user.updated'
  | 'analysis.completed'
  | 'export.completed';

export type WebhookEventData = 
  | Survey
  | SurveySession
  | Response
  | User
  | LLMAnalysisResponse
  | ExportJob;

export interface WebhookSubscription {
  readonly id: string;
  readonly url: string;
  readonly events: WebhookEventType[];
  readonly isActive: boolean;
  readonly secret: string;
  readonly createdAt: Date;
  readonly lastTriggered?: Date;
}

// ============================================================================
// TYPE ASSERTIONS & GUARDS
// ============================================================================

export function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj && 'role' in obj;
}

export function isSurvey(obj: unknown): obj is Survey {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'title' in obj && 'questions' in obj;
}

export function isResponse(obj: unknown): obj is Response {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'sessionId' in obj && 'questionId' in obj;
}

export function isApiResponse<T>(obj: unknown): obj is ApiResponse<T> {
  return typeof obj === 'object' && obj !== null && 'success' in obj;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const API_VERSION = '1.0.0' as const;
export const MAX_PAGE_SIZE = 100 as const;
export const DEFAULT_PAGE_SIZE = 20 as const;
export const MAX_EXPORT_SIZE = 10000 as const;
export const MAX_FILE_SIZE = 10485760; // 10MB (10 * 1024 * 1024)
export const SUPPORTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/wav'] as const;
export const MAX_VOICE_DURATION = 300 as const; // 5 minutes
export const SESSION_TIMEOUT = 86400000; // 24 hours (24 * 60 * 60 * 1000)
export const TOKEN_EXPIRY = 3600000; // 1 hour (60 * 60 * 1000)
export const REFRESH_TOKEN_EXPIRY = 604800000; // 7 days (7 * 24 * 60 * 60 * 1000)

/**
 * END OF API CONTRACTS
 * 
 * Any changes to these interfaces must be coordinated across all agents
 * and validated through the contract test suite.
 */