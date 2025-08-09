import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from './context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date; }
  JSON: { input: any; output: any; }
  Upload: { input: any; output: any; }
};

export type AnalyticsFilters = {
  dateFrom?: InputMaybe<Scalars['DateTime']['input']>;
  dateTo?: InputMaybe<Scalars['DateTime']['input']>;
  departments?: InputMaybe<Array<Scalars['String']['input']>>;
  devices?: InputMaybe<Array<Scalars['String']['input']>>;
  includeAnonymous?: InputMaybe<Scalars['Boolean']['input']>;
  minQualityScore?: InputMaybe<Scalars['Float']['input']>;
  questionTypes?: InputMaybe<Array<QuestionType>>;
  responseStatuses?: InputMaybe<Array<ResponseStatus>>;
  roles?: InputMaybe<Array<Scalars['String']['input']>>;
  surveyIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type AnalyticsInsight = {
  __typename?: 'AnalyticsInsight';
  actionable: Scalars['Boolean']['output'];
  category: Scalars['String']['output'];
  confidence: Scalars['Float']['output'];
  data?: Maybe<Scalars['JSON']['output']>;
  description: Scalars['String']['output'];
  detectedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  priority: InsightPriority;
  recommendations: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: InsightType;
};

export type Anomaly = {
  __typename?: 'Anomaly';
  affectedMetrics: Array<Scalars['String']['output']>;
  confidence: Scalars['Float']['output'];
  data: Scalars['JSON']['output'];
  description: Scalars['String']['output'];
  detectedAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  recommendations: Array<Scalars['String']['output']>;
  severity: AnomalySeverity;
  type: Scalars['String']['output'];
};

export enum AnomalySeverity {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type AnswerFrequency = {
  __typename?: 'AnswerFrequency';
  answer: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
};

export type AnswerInput = {
  booleanAnswer?: InputMaybe<Scalars['Boolean']['input']>;
  choiceAnswers?: InputMaybe<Array<Scalars['String']['input']>>;
  confidence?: InputMaybe<Scalars['Float']['input']>;
  dateAnswer?: InputMaybe<Scalars['DateTime']['input']>;
  jtbdScores?: InputMaybe<JtbdScoresInput>;
  numberAnswer?: InputMaybe<Scalars['Float']['input']>;
  questionId: Scalars['ID']['input'];
  textAnswer?: InputMaybe<Scalars['String']['input']>;
  timeSpent?: InputMaybe<Scalars['Int']['input']>;
  voiceRecordingId?: InputMaybe<Scalars['String']['input']>;
};

export type ApiKey = {
  __typename?: 'ApiKey';
  createdAt: Scalars['DateTime']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  keyPrefix: Scalars['String']['output'];
  lastUsedAt?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  organization: Organization;
  permissions: Array<Scalars['String']['output']>;
  rateLimitHits: Scalars['Int']['output'];
  rateLimitPerHour: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
  user: User;
};

export type AspectSentiment = {
  __typename?: 'AspectSentiment';
  aspect: Scalars['String']['output'];
  confidence: Scalars['Float']['output'];
  mentions: Scalars['Int']['output'];
  sentiment: Scalars['Float']['output'];
};

export type CreateApiKeyInput = {
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  permissions: Array<Scalars['String']['input']>;
  rateLimitPerHour?: InputMaybe<Scalars['Int']['input']>;
};

export type CreateQuestionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  displayConditions?: InputMaybe<Scalars['JSON']['input']>;
  jtbdCategory?: InputMaybe<JtbdCategory>;
  jtbdWeight?: InputMaybe<Scalars['Float']['input']>;
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  options?: InputMaybe<Array<QuestionOptionInput>>;
  required?: InputMaybe<Scalars['Boolean']['input']>;
  skipLogic?: InputMaybe<Scalars['JSON']['input']>;
  title: Scalars['String']['input'];
  type: QuestionType;
  validation?: InputMaybe<QuestionValidationInput>;
};

export type CreateSurveyInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  publishImmediately?: InputMaybe<Scalars['Boolean']['input']>;
  questions: Array<CreateQuestionInput>;
  settings?: InputMaybe<SurveySettingsInput>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  templateId?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  visibility?: InputMaybe<SurveyVisibility>;
};

export type DemographicBreakdown = {
  __typename?: 'DemographicBreakdown';
  category: Scalars['String']['output'];
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
  trend?: Maybe<TrendDirection>;
};

export type Demographics = {
  __typename?: 'Demographics';
  ageGroups: Array<DemographicBreakdown>;
  browsers: Array<DemographicBreakdown>;
  departments: Array<DemographicBreakdown>;
  devices: Array<DemographicBreakdown>;
  industries: Array<DemographicBreakdown>;
  locations: Array<DemographicBreakdown>;
  roles: Array<DemographicBreakdown>;
};

export type Emotion = {
  __typename?: 'Emotion';
  confidence: Scalars['Float']['output'];
  emotion: Scalars['String']['output'];
  intensity: Scalars['Float']['output'];
};

export type FileUpload = {
  __typename?: 'FileUpload';
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  mimeType: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploadedAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
};

export type Force = {
  __typename?: 'Force';
  category?: Maybe<Scalars['String']['output']>;
  confidence: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  examples: Array<Scalars['String']['output']>;
  frequency: Scalars['Int']['output'];
  impact: Scalars['Float']['output'];
  strength: Scalars['Float']['output'];
};

export type ForceAnalysis = {
  __typename?: 'ForceAnalysis';
  anxietyForces: Array<Force>;
  energy: Scalars['Float']['output'];
  friction: Scalars['Float']['output'];
  habitForces: Array<Force>;
  momentum: Scalars['Float']['output'];
  pullForces: Array<Force>;
  pushForces: Array<Force>;
  totalAnxiety: Scalars['Float']['output'];
  totalHabit: Scalars['Float']['output'];
  totalPull: Scalars['Float']['output'];
  totalPush: Scalars['Float']['output'];
};

export type FormatDistribution = {
  __typename?: 'FormatDistribution';
  count: Scalars['Int']['output'];
  format: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
};

export enum InsightPriority {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM',
  Urgent = 'URGENT'
}

export enum InsightType {
  Anomaly = 'ANOMALY',
  Correlation = 'CORRELATION',
  Opportunity = 'OPPORTUNITY',
  Outlier = 'OUTLIER',
  Pattern = 'PATTERN',
  Recommendation = 'RECOMMENDATION',
  Trend = 'TREND',
  Warning = 'WARNING'
}

export type JtbdAnalysis = {
  __typename?: 'JTBDAnalysis';
  forces: ForceAnalysis;
  jobs: Array<Job>;
  moments: Array<Moment>;
  opportunities: Array<Opportunity>;
  outcomes: Array<Outcome>;
  overallMomentum: Scalars['Float']['output'];
  recommendations: Array<Scalars['String']['output']>;
  satisfactionGap: Scalars['Float']['output'];
  switchingProbability: Scalars['Float']['output'];
};

export enum JtbdCategory {
  AnxietyForce = 'ANXIETY_FORCE',
  Emotional = 'EMOTIONAL',
  Functional = 'FUNCTIONAL',
  HabitForce = 'HABIT_FORCE',
  PullForce = 'PULL_FORCE',
  PushForce = 'PUSH_FORCE',
  Social = 'SOCIAL'
}

export type JtbdScores = {
  __typename?: 'JTBDScores';
  anxiety: Scalars['Float']['output'];
  friction: Scalars['Float']['output'];
  habit: Scalars['Float']['output'];
  momentum: Scalars['Float']['output'];
  progress: Scalars['Float']['output'];
  pullForces: Scalars['Float']['output'];
  pushForces: Scalars['Float']['output'];
  social: Scalars['Float']['output'];
  switchingProbability: Scalars['Float']['output'];
};

export type JtbdScoresInput = {
  anxiety: Scalars['Float']['input'];
  habit?: InputMaybe<Scalars['Float']['input']>;
  progress: Scalars['Float']['input'];
  social?: InputMaybe<Scalars['Float']['input']>;
};

export type Job = {
  __typename?: 'Job';
  category: JtbdCategory;
  confidence: Scalars['Float']['output'];
  examples: Array<Scalars['String']['output']>;
  frequency: Scalars['Int']['output'];
  importance: Scalars['Float']['output'];
  opportunity: Scalars['Float']['output'];
  satisfaction: Scalars['Float']['output'];
  statement: Scalars['String']['output'];
};

export type LanguageDistribution = {
  __typename?: 'LanguageDistribution';
  confidence: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  language: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
};

export type Moment = {
  __typename?: 'Moment';
  context: Scalars['String']['output'];
  description: Scalars['String']['output'];
  emotions: Array<Scalars['String']['output']>;
  frequency: Scalars['Int']['output'];
  intensity: Scalars['Float']['output'];
  opportunities: Array<Scalars['String']['output']>;
  trigger: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  archiveSurvey: Survey;
  createApiKey: ApiKey;
  createSurvey: Survey;
  createSurveyTemplate: SurveyTemplate;
  deleteResponse: Scalars['Boolean']['output'];
  deleteSurvey: Scalars['Boolean']['output'];
  deleteSurveyTemplate: Scalars['Boolean']['output'];
  duplicateSurvey: Survey;
  duplicateTemplate: SurveyTemplate;
  generateExport: Scalars['String']['output'];
  pauseSurvey: Survey;
  processVoiceRecording: VoiceRecording;
  publishSurvey: Survey;
  revokeApiKey: Scalars['Boolean']['output'];
  startSurveySession: SurveySession;
  submitResponse: Response;
  triggerResponseAnalysis: Array<ResponseAnalysis>;
  triggerSurveyAnalysis: SurveyAnalytics;
  updateApiKey: ApiKey;
  updateOrganizationSettings: Organization;
  updateResponse: Response;
  updateSurvey: Survey;
  updateSurveyTemplate: SurveyTemplate;
  updateUserRole: User;
  uploadVoiceRecording: VoiceRecording;
};


export type MutationArchiveSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateApiKeyArgs = {
  input: CreateApiKeyInput;
};


export type MutationCreateSurveyArgs = {
  input: CreateSurveyInput;
};


export type MutationCreateSurveyTemplateArgs = {
  input: Scalars['JSON']['input'];
};


export type MutationDeleteResponseArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteSurveyTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDuplicateSurveyArgs = {
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationDuplicateTemplateArgs = {
  id: Scalars['ID']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateExportArgs = {
  filters?: InputMaybe<AnalyticsFilters>;
  format: Scalars['String']['input'];
  surveyId: Scalars['ID']['input'];
};


export type MutationPauseSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationProcessVoiceRecordingArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishSurveyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRevokeApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationStartSurveySessionArgs = {
  surveyId: Scalars['ID']['input'];
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationSubmitResponseArgs = {
  input: SubmitResponseInput;
};


export type MutationTriggerResponseAnalysisArgs = {
  responseIds: Array<Scalars['ID']['input']>;
};


export type MutationTriggerSurveyAnalysisArgs = {
  surveyId: Scalars['ID']['input'];
};


export type MutationUpdateApiKeyArgs = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationUpdateOrganizationSettingsArgs = {
  input: Scalars['JSON']['input'];
};


export type MutationUpdateResponseArgs = {
  id: Scalars['ID']['input'];
  input: SubmitResponseInput;
};


export type MutationUpdateSurveyArgs = {
  id: Scalars['ID']['input'];
  input: UpdateSurveyInput;
};


export type MutationUpdateSurveyTemplateArgs = {
  id: Scalars['ID']['input'];
  input: Scalars['JSON']['input'];
};


export type MutationUpdateUserRoleArgs = {
  role: UserRole;
  userId: Scalars['ID']['input'];
};


export type MutationUploadVoiceRecordingArgs = {
  file: Scalars['Upload']['input'];
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  questionId: Scalars['ID']['input'];
};

export type Opportunity = {
  __typename?: 'Opportunity';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  effort: Scalars['Float']['output'];
  impact: Scalars['Float']['output'];
  priority: OpportunityPriority;
  recommendations: Array<Scalars['String']['output']>;
};

export enum OpportunityPriority {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export enum OrderDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Organization = {
  __typename?: 'Organization';
  apiKeys: Array<ApiKey>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  domain?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  industry?: Maybe<Scalars['String']['output']>;
  memberCount: Scalars['Int']['output'];
  members: Array<User>;
  name: Scalars['String']['output'];
  settings: OrganizationSettings;
  size?: Maybe<Scalars['String']['output']>;
  surveyCount: Scalars['Int']['output'];
  surveys: Array<Survey>;
  totalResponses: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type OrganizationSettings = {
  __typename?: 'OrganizationSettings';
  allowAnonymousResponses: Scalars['Boolean']['output'];
  allowSelfRegistration: Scalars['Boolean']['output'];
  customBranding?: Maybe<Scalars['JSON']['output']>;
  dataRetentionDays: Scalars['Int']['output'];
  defaultRole: UserRole;
  enable2FA: Scalars['Boolean']['output'];
  enableAuditLogs: Scalars['Boolean']['output'];
  enableJTBDAnalysis: Scalars['Boolean']['output'];
  enableSSO: Scalars['Boolean']['output'];
  enableVoiceRecording: Scalars['Boolean']['output'];
  maxSurveysPerUser: Scalars['Int']['output'];
  requireEmailVerification: Scalars['Boolean']['output'];
  ssoProvider?: Maybe<Scalars['String']['output']>;
};

export type Outcome = {
  __typename?: 'Outcome';
  category: Scalars['String']['output'];
  description: Scalars['String']['output'];
  examples: Array<Scalars['String']['output']>;
  frequency: Scalars['Int']['output'];
  gap: Scalars['Float']['output'];
  importance: Scalars['Float']['output'];
  satisfaction: Scalars['Float']['output'];
};

export type PaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Scalars['String']['input']>;
  orderDirection?: InputMaybe<OrderDirection>;
};

export type QualityDistribution = {
  __typename?: 'QualityDistribution';
  count: Scalars['Int']['output'];
  percentage: Scalars['Float']['output'];
  qualityRange: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  apiKey?: Maybe<ApiKey>;
  apiKeys: Array<ApiKey>;
  dashboardAnalytics: Scalars['JSON']['output'];
  me?: Maybe<User>;
  organization?: Maybe<Organization>;
  organizations: Array<Organization>;
  response?: Maybe<Response>;
  responseAnalytics?: Maybe<ResponseAnalysis>;
  responses: Array<Response>;
  search: Scalars['JSON']['output'];
  survey?: Maybe<Survey>;
  surveyAnalytics: SurveyAnalytics;
  surveyByShareUrl?: Maybe<Survey>;
  surveySession?: Maybe<SurveySession>;
  surveySessions: Array<SurveySession>;
  surveyTemplate?: Maybe<SurveyTemplate>;
  surveyTemplates: Array<SurveyTemplate>;
  surveys: Array<Survey>;
  systemHealth: Scalars['JSON']['output'];
  systemMetrics: Scalars['JSON']['output'];
  user?: Maybe<User>;
  users: Array<User>;
};


export type QueryApiKeyArgs = {
  id: Scalars['ID']['input'];
};


export type QueryApiKeysArgs = {
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryDashboardAnalyticsArgs = {
  filters?: InputMaybe<AnalyticsFilters>;
};


export type QueryOrganizationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryOrganizationsArgs = {
  pagination?: InputMaybe<PaginationInput>;
};


export type QueryResponseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryResponseAnalyticsArgs = {
  responseId: Scalars['ID']['input'];
};


export type QueryResponsesArgs = {
  filters?: InputMaybe<AnalyticsFilters>;
  pagination?: InputMaybe<PaginationInput>;
  status?: InputMaybe<ResponseStatus>;
  surveyId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySearchArgs = {
  input: SearchInput;
};


export type QuerySurveyArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySurveyAnalyticsArgs = {
  filters?: InputMaybe<AnalyticsFilters>;
  surveyId: Scalars['ID']['input'];
};


export type QuerySurveyByShareUrlArgs = {
  shareUrl: Scalars['String']['input'];
};


export type QuerySurveySessionArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySurveySessionsArgs = {
  pagination?: InputMaybe<PaginationInput>;
  status?: InputMaybe<SessionStatus>;
  surveyId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySurveyTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySurveyTemplatesArgs = {
  category?: InputMaybe<TemplateCategory>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<TemplateVisibility>;
};


export type QuerySurveysArgs = {
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<SurveyStatus>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  visibility?: InputMaybe<SurveyVisibility>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  filters?: InputMaybe<Scalars['JSON']['input']>;
  pagination?: InputMaybe<PaginationInput>;
};

export type Question = {
  __typename?: 'Question';
  averageTimeSpent: Scalars['Int']['output'];
  description?: Maybe<Scalars['String']['output']>;
  displayConditions?: Maybe<Scalars['JSON']['output']>;
  id: Scalars['ID']['output'];
  jtbdCategory?: Maybe<JtbdCategory>;
  jtbdWeight?: Maybe<Scalars['Float']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  options?: Maybe<Array<QuestionOption>>;
  order: Scalars['Int']['output'];
  required: Scalars['Boolean']['output'];
  responseCount: Scalars['Int']['output'];
  responses: Array<QuestionResponse>;
  skipLogic?: Maybe<Scalars['JSON']['output']>;
  skipRate: Scalars['Float']['output'];
  survey: Survey;
  title: Scalars['String']['output'];
  topAnswers: Array<AnswerFrequency>;
  type: QuestionType;
  validation?: Maybe<QuestionValidation>;
};

export type QuestionAnalytics = {
  __typename?: 'QuestionAnalytics';
  answerDistribution: Scalars['JSON']['output'];
  averageTextLength?: Maybe<Scalars['Int']['output']>;
  averageTimeSpent: Scalars['Int']['output'];
  confidenceScore: Scalars['Float']['output'];
  qualityScore: Scalars['Float']['output'];
  question: Question;
  sentiment?: Maybe<SentimentSummary>;
  skipCount: Scalars['Int']['output'];
  skipRate: Scalars['Float']['output'];
  themes: Array<Theme>;
  topAnswers: Array<AnswerFrequency>;
  totalResponses: Scalars['Int']['output'];
  uniqueAnswers: Scalars['Int']['output'];
  validResponses: Scalars['Int']['output'];
  voiceAnalytics?: Maybe<VoiceAnalytics>;
  wordCloud: Array<WordFrequency>;
};

export type QuestionGroup = {
  __typename?: 'QuestionGroup';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  orderIndex: Scalars['Int']['output'];
  questions: Array<TemplateQuestion>;
  settings: QuestionGroupSettings;
  title: Scalars['String']['output'];
};

export type QuestionGroupSettings = {
  __typename?: 'QuestionGroupSettings';
  maxQuestionsToShow?: Maybe<Scalars['Int']['output']>;
  randomizeQuestions: Scalars['Boolean']['output'];
  requiredQuestions?: Maybe<Scalars['Int']['output']>;
};

export type QuestionOption = {
  __typename?: 'QuestionOption';
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  order: Scalars['Int']['output'];
  text: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type QuestionOptionInput = {
  metadata?: InputMaybe<Scalars['JSON']['input']>;
  order: Scalars['Int']['input'];
  text: Scalars['String']['input'];
  value: Scalars['String']['input'];
};

export type QuestionResponse = {
  __typename?: 'QuestionResponse';
  answeredAt: Scalars['DateTime']['output'];
  booleanAnswer?: Maybe<Scalars['Boolean']['output']>;
  choiceAnswers?: Maybe<Array<Scalars['String']['output']>>;
  confidence?: Maybe<Scalars['Float']['output']>;
  dateAnswer?: Maybe<Scalars['DateTime']['output']>;
  fileAnswers?: Maybe<Array<FileUpload>>;
  id: Scalars['ID']['output'];
  jtbdScores?: Maybe<JtbdScores>;
  matrixAnswers?: Maybe<Scalars['JSON']['output']>;
  numberAnswer?: Maybe<Scalars['Float']['output']>;
  question: Question;
  response: Response;
  skipped: Scalars['Boolean']['output'];
  textAnswer?: Maybe<Scalars['String']['output']>;
  timeSpent: Scalars['Int']['output'];
  voiceRecording?: Maybe<VoiceRecording>;
};

export enum QuestionType {
  Boolean = 'BOOLEAN',
  Date = 'DATE',
  Email = 'EMAIL',
  FileUpload = 'FILE_UPLOAD',
  Jtbd = 'JTBD',
  Matrix = 'MATRIX',
  MultipleChoice = 'MULTIPLE_CHOICE',
  Number = 'NUMBER',
  Phone = 'PHONE',
  Ranking = 'RANKING',
  Rating = 'RATING',
  Scale = 'SCALE',
  Signature = 'SIGNATURE',
  SingleChoice = 'SINGLE_CHOICE',
  Text = 'TEXT',
  Textarea = 'TEXTAREA',
  Time = 'TIME',
  Url = 'URL',
  Voice = 'VOICE'
}

export type QuestionValidation = {
  __typename?: 'QuestionValidation';
  customMessage?: Maybe<Scalars['String']['output']>;
  maxLength?: Maybe<Scalars['Int']['output']>;
  maxValue?: Maybe<Scalars['Float']['output']>;
  minLength?: Maybe<Scalars['Int']['output']>;
  minValue?: Maybe<Scalars['Float']['output']>;
  pattern?: Maybe<Scalars['String']['output']>;
};

export type QuestionValidationInput = {
  customMessage?: InputMaybe<Scalars['String']['input']>;
  maxLength?: InputMaybe<Scalars['Int']['input']>;
  maxValue?: InputMaybe<Scalars['Float']['input']>;
  minLength?: InputMaybe<Scalars['Int']['input']>;
  minValue?: InputMaybe<Scalars['Float']['input']>;
  pattern?: InputMaybe<Scalars['String']['input']>;
};

export type Response = {
  __typename?: 'Response';
  analysis?: Maybe<ResponseAnalysis>;
  answers: Array<QuestionResponse>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  metadata: ResponseMetadata;
  qualityScore?: Maybe<Scalars['Float']['output']>;
  session: SurveySession;
  startedAt: Scalars['DateTime']['output'];
  status: ResponseStatus;
  survey: Survey;
  updatedAt: Scalars['DateTime']['output'];
  user?: Maybe<User>;
};

export type ResponseAnalysis = {
  __typename?: 'ResponseAnalysis';
  anomalies: Array<Anomaly>;
  confidence: Scalars['Float']['output'];
  flags: Array<Scalars['String']['output']>;
  insights: Array<Scalars['String']['output']>;
  jtbdAnalysis?: Maybe<JtbdAnalysis>;
  modelVersion: Scalars['String']['output'];
  processedAt: Scalars['DateTime']['output'];
  processingTime: Scalars['Int']['output'];
  qualityScore: Scalars['Float']['output'];
  response: Response;
  sentiment: SentimentAnalysis;
  summary: Scalars['String']['output'];
  themes: Array<Theme>;
};

export type ResponseMetadata = {
  __typename?: 'ResponseMetadata';
  browser?: Maybe<Scalars['String']['output']>;
  device?: Maybe<Scalars['String']['output']>;
  ipAddress?: Maybe<Scalars['String']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  os?: Maybe<Scalars['String']['output']>;
  screenResolution?: Maybe<Scalars['String']['output']>;
  timezone?: Maybe<Scalars['String']['output']>;
  totalTimeSpent: Scalars['Int']['output'];
  userAgent: Scalars['String']['output'];
  voiceInputUsed: Scalars['Boolean']['output'];
};

export type ResponseMetadataInput = {
  browser?: InputMaybe<Scalars['String']['input']>;
  device?: InputMaybe<Scalars['String']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  os?: InputMaybe<Scalars['String']['input']>;
  screenResolution?: InputMaybe<Scalars['String']['input']>;
  timezone?: InputMaybe<Scalars['String']['input']>;
  userAgent?: InputMaybe<Scalars['String']['input']>;
};

export enum ResponseStatus {
  Abandoned = 'ABANDONED',
  Completed = 'COMPLETED',
  Invalid = 'INVALID',
  InProgress = 'IN_PROGRESS',
  Started = 'STARTED'
}

export type SearchInput = {
  filters?: InputMaybe<Scalars['JSON']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  query: Scalars['String']['input'];
  types?: InputMaybe<Array<SearchType>>;
};

export enum SearchType {
  Organizations = 'ORGANIZATIONS',
  Responses = 'RESPONSES',
  Surveys = 'SURVEYS',
  Templates = 'TEMPLATES',
  Themes = 'THEMES',
  Users = 'USERS'
}

export type SentimentAnalysis = {
  __typename?: 'SentimentAnalysis';
  aspects: Array<AspectSentiment>;
  confidence: Scalars['Float']['output'];
  emotions: Array<Emotion>;
  label: SentimentLabel;
  overallScore: Scalars['Float']['output'];
};

export type SentimentDistribution = {
  __typename?: 'SentimentDistribution';
  count: Scalars['Int']['output'];
  label: SentimentLabel;
  percentage: Scalars['Float']['output'];
};

export enum SentimentLabel {
  Negative = 'NEGATIVE',
  Neutral = 'NEUTRAL',
  Positive = 'POSITIVE',
  VeryNegative = 'VERY_NEGATIVE',
  VeryPositive = 'VERY_POSITIVE'
}

export type SentimentSummary = {
  __typename?: 'SentimentSummary';
  averageScore: Scalars['Float']['output'];
  distribution: Array<SentimentDistribution>;
  negative: Scalars['Int']['output'];
  neutral: Scalars['Int']['output'];
  positive: Scalars['Int']['output'];
};

export enum SessionStatus {
  Abandoned = 'ABANDONED',
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
  Paused = 'PAUSED'
}

export type SubmitResponseInput = {
  answers: Array<AnswerInput>;
  metadata?: InputMaybe<ResponseMetadataInput>;
  sessionId: Scalars['ID']['input'];
  surveyId: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  analysisCompleted: ResponseAnalysis;
  organizationNotification: Scalars['JSON']['output'];
  responseSubmitted: Response;
  sessionUpdated: SurveySession;
  surveyAnalysisCompleted: SurveyAnalytics;
  systemNotification: Scalars['JSON']['output'];
};


export type SubscriptionAnalysisCompletedArgs = {
  responseId: Scalars['ID']['input'];
};


export type SubscriptionOrganizationNotificationArgs = {
  organizationId: Scalars['ID']['input'];
};


export type SubscriptionResponseSubmittedArgs = {
  surveyId: Scalars['ID']['input'];
};


export type SubscriptionSessionUpdatedArgs = {
  sessionId: Scalars['ID']['input'];
};


export type SubscriptionSurveyAnalysisCompletedArgs = {
  surveyId: Scalars['ID']['input'];
};


export type SubscriptionSystemNotificationArgs = {
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Survey = {
  __typename?: 'Survey';
  analytics: SurveyAnalytics;
  archivedAt?: Maybe<Scalars['DateTime']['output']>;
  averageCompletionTime: Scalars['Int']['output'];
  completionRate: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  description?: Maybe<Scalars['String']['output']>;
  embedCode: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  organization: Organization;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  qrCode: Scalars['String']['output'];
  questions: Array<Question>;
  responseCount: Scalars['Int']['output'];
  responses: Array<Response>;
  sessions: Array<SurveySession>;
  settings: SurveySettings;
  shareUrl: Scalars['String']['output'];
  status: SurveyStatus;
  tags: Array<Scalars['String']['output']>;
  template?: Maybe<SurveyTemplate>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  visibility: SurveyVisibility;
};


export type SurveyResponsesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<ResponseStatus>;
};

export type SurveyAnalytics = {
  __typename?: 'SurveyAnalytics';
  abandonmentRate: Scalars['Float']['output'];
  anomalies: Array<Anomaly>;
  averageCompletionTime: Scalars['Int']['output'];
  completedResponses: Scalars['Int']['output'];
  completionRate: Scalars['Float']['output'];
  completionRateOverTime: Array<TimeSeries>;
  dataQualityScore: Scalars['Float']['output'];
  demographics?: Maybe<Demographics>;
  executiveSummary: Scalars['String']['output'];
  exportFormats: Array<Scalars['String']['output']>;
  insights: Array<AnalyticsInsight>;
  jtbdAnalysis?: Maybe<JtbdAnalysis>;
  keyFindings: Array<Scalars['String']['output']>;
  lastExportedAt?: Maybe<Scalars['DateTime']['output']>;
  questionAnalytics: Array<QuestionAnalytics>;
  recommendations: Array<Scalars['String']['output']>;
  responseQualityDistribution: Array<QualityDistribution>;
  responsesOverTime: Array<TimeSeries>;
  sentiment: SentimentSummary;
  survey: Survey;
  themes: Array<Theme>;
  totalResponses: Scalars['Int']['output'];
  totalSessions: Scalars['Int']['output'];
};

export type SurveySession = {
  __typename?: 'SurveySession';
  attentionScore?: Maybe<Scalars['Float']['output']>;
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  currentQuestionId?: Maybe<Scalars['String']['output']>;
  device?: Maybe<Scalars['String']['output']>;
  engagementScore?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  ipAddress?: Maybe<Scalars['String']['output']>;
  lastActiveAt: Scalars['DateTime']['output'];
  progressPercent: Scalars['Float']['output'];
  questionsAnswered: Scalars['Int']['output'];
  questionsSkipped: Scalars['Int']['output'];
  referrer?: Maybe<Scalars['String']['output']>;
  responses: Array<Response>;
  startedAt: Scalars['DateTime']['output'];
  status: SessionStatus;
  survey: Survey;
  totalTimeSpent: Scalars['Int']['output'];
  user?: Maybe<User>;
  userAgent?: Maybe<Scalars['String']['output']>;
};

export type SurveySettings = {
  __typename?: 'SurveySettings';
  allowAnonymous: Scalars['Boolean']['output'];
  allowPreviousNavigation: Scalars['Boolean']['output'];
  collectMetadata: Scalars['Boolean']['output'];
  enableJTBD: Scalars['Boolean']['output'];
  enableVoice: Scalars['Boolean']['output'];
  expiresAt?: Maybe<Scalars['DateTime']['output']>;
  maxResponses?: Maybe<Scalars['Int']['output']>;
  oneResponsePerUser: Scalars['Boolean']['output'];
  randomizeQuestions: Scalars['Boolean']['output'];
  redirectUrl?: Maybe<Scalars['String']['output']>;
  requireAuth: Scalars['Boolean']['output'];
  showProgressBar: Scalars['Boolean']['output'];
  thankYouMessage?: Maybe<Scalars['String']['output']>;
  welcomeMessage?: Maybe<Scalars['String']['output']>;
};

export type SurveySettingsInput = {
  allowAnonymous?: InputMaybe<Scalars['Boolean']['input']>;
  allowPreviousNavigation?: InputMaybe<Scalars['Boolean']['input']>;
  collectMetadata?: InputMaybe<Scalars['Boolean']['input']>;
  enableJTBD?: InputMaybe<Scalars['Boolean']['input']>;
  enableVoice?: InputMaybe<Scalars['Boolean']['input']>;
  expiresAt?: InputMaybe<Scalars['DateTime']['input']>;
  maxResponses?: InputMaybe<Scalars['Int']['input']>;
  oneResponsePerUser?: InputMaybe<Scalars['Boolean']['input']>;
  randomizeQuestions?: InputMaybe<Scalars['Boolean']['input']>;
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
  requireAuth?: InputMaybe<Scalars['Boolean']['input']>;
  showProgressBar?: InputMaybe<Scalars['Boolean']['input']>;
  thankYouMessage?: InputMaybe<Scalars['String']['input']>;
  welcomeMessage?: InputMaybe<Scalars['String']['input']>;
};

export enum SurveyStatus {
  Archived = 'ARCHIVED',
  Deleted = 'DELETED',
  Draft = 'DRAFT',
  Paused = 'PAUSED',
  Published = 'PUBLISHED'
}

export type SurveyTemplate = {
  __typename?: 'SurveyTemplate';
  averageTime: Scalars['Int']['output'];
  category: TemplateCategory;
  completionRate: Scalars['Float']['output'];
  conclusionText?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  createdBy: User;
  description?: Maybe<Scalars['String']['output']>;
  difficultyLevel: Scalars['Int']['output'];
  estimatedDuration: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  introductionText?: Maybe<Scalars['String']['output']>;
  isSystemTemplate: Scalars['Boolean']['output'];
  organizationId?: Maybe<Scalars['String']['output']>;
  parentTemplateId?: Maybe<Scalars['String']['output']>;
  publishedAt?: Maybe<Scalars['DateTime']['output']>;
  questionGroups: Array<QuestionGroup>;
  rating: Scalars['Float']['output'];
  settings: TemplateSettings;
  status: TemplateStatus;
  tags: Array<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  usageCount: Scalars['Int']['output'];
  version: Scalars['Int']['output'];
  versionNotes?: Maybe<Scalars['String']['output']>;
  visibility: TemplateVisibility;
};

export enum SurveyVisibility {
  InvitedOnly = 'INVITED_ONLY',
  Organization = 'ORGANIZATION',
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export enum TemplateCategory {
  AiReadiness = 'AI_READINESS',
  Compliance = 'COMPLIANCE',
  Custom = 'CUSTOM',
  CustomerFeedback = 'CUSTOMER_FEEDBACK',
  EmployeeEngagement = 'EMPLOYEE_ENGAGEMENT',
  EventFeedback = 'EVENT_FEEDBACK',
  HealthWellness = 'HEALTH_WELLNESS',
  MarketResearch = 'MARKET_RESEARCH',
  Performance = 'PERFORMANCE',
  ProductEvaluation = 'PRODUCT_EVALUATION',
  Recruitment = 'RECRUITMENT',
  Satisfaction = 'SATISFACTION',
  TrainingAssessment = 'TRAINING_ASSESSMENT',
  UxResearch = 'UX_RESEARCH'
}

export type TemplateQuestion = {
  __typename?: 'TemplateQuestion';
  analyticsEnabled: Scalars['Boolean']['output'];
  description?: Maybe<Scalars['String']['output']>;
  displayConditions?: Maybe<Scalars['JSON']['output']>;
  helpText?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jtbdCategory?: Maybe<JtbdCategory>;
  jtbdWeight?: Maybe<Scalars['Float']['output']>;
  options?: Maybe<Array<QuestionOption>>;
  orderIndex: Scalars['Int']['output'];
  placeholderText?: Maybe<Scalars['String']['output']>;
  questionText: Scalars['String']['output'];
  questionType: QuestionType;
  required: Scalars['Boolean']['output'];
  skipLogic?: Maybe<Scalars['JSON']['output']>;
  tags: Array<Scalars['String']['output']>;
  validation?: Maybe<QuestionValidation>;
};

export type TemplateSettings = {
  __typename?: 'TemplateSettings';
  aiAnalysisEnabled: Scalars['Boolean']['output'];
  allowAnonymous: Scalars['Boolean']['output'];
  allowSkipQuestions: Scalars['Boolean']['output'];
  customBranding?: Maybe<Scalars['JSON']['output']>;
  customCSS?: Maybe<Scalars['String']['output']>;
  randomizeQuestions: Scalars['Boolean']['output'];
  requireAllQuestions: Scalars['Boolean']['output'];
  saveProgress: Scalars['Boolean']['output'];
  showProgressBar: Scalars['Boolean']['output'];
  voiceEnabled: Scalars['Boolean']['output'];
};

export enum TemplateStatus {
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Marketplace = 'MARKETPLACE',
  Published = 'PUBLISHED'
}

export enum TemplateVisibility {
  Marketplace = 'MARKETPLACE',
  Organization = 'ORGANIZATION',
  Private = 'PRIVATE',
  Public = 'PUBLIC'
}

export type Theme = {
  __typename?: 'Theme';
  category?: Maybe<Scalars['String']['output']>;
  confidence: Scalars['Float']['output'];
  description?: Maybe<Scalars['String']['output']>;
  examples: Array<Scalars['String']['output']>;
  frequency: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
  previousFrequency?: Maybe<Scalars['Int']['output']>;
  questions: Array<Question>;
  responses: Array<Response>;
  trend: TrendDirection;
};

export type TimeSeries = {
  __typename?: 'TimeSeries';
  label?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  timestamp: Scalars['DateTime']['output'];
  value: Scalars['Float']['output'];
};

export enum TrendDirection {
  Decreasing = 'DECREASING',
  Increasing = 'INCREASING',
  New = 'NEW',
  Stable = 'STABLE'
}

export type UpdateSurveyInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  settings?: InputMaybe<SurveySettingsInput>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
  title?: InputMaybe<Scalars['String']['input']>;
  visibility?: InputMaybe<SurveyVisibility>;
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  emailVerified: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  lastLoginAt?: Maybe<Scalars['DateTime']['output']>;
  organization?: Maybe<Organization>;
  organizationId?: Maybe<Scalars['String']['output']>;
  permissions: Array<Scalars['String']['output']>;
  profile?: Maybe<UserProfile>;
  responsesSubmitted: Scalars['Int']['output'];
  role: UserRole;
  surveysCreated: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UserPreferences = {
  __typename?: 'UserPreferences';
  language: Scalars['String']['output'];
  notifications: Scalars['Boolean']['output'];
  theme: Scalars['String']['output'];
  timezone?: Maybe<Scalars['String']['output']>;
  voiceInput: Scalars['Boolean']['output'];
};

export type UserProfile = {
  __typename?: 'UserProfile';
  avatar?: Maybe<Scalars['String']['output']>;
  department?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jobTitle?: Maybe<Scalars['String']['output']>;
  lastName?: Maybe<Scalars['String']['output']>;
  preferences: UserPreferences;
  userId: Scalars['String']['output'];
};

export enum UserRole {
  Analyst = 'ANALYST',
  OrgAdmin = 'ORG_ADMIN',
  SystemAdmin = 'SYSTEM_ADMIN',
  User = 'USER',
  Viewer = 'VIEWER'
}

export type VoiceAnalytics = {
  __typename?: 'VoiceAnalytics';
  averageDuration: Scalars['Int']['output'];
  averageFileSize: Scalars['Int']['output'];
  averageQualityScore: Scalars['Float']['output'];
  formatDistribution: Array<FormatDistribution>;
  languageDistribution: Array<LanguageDistribution>;
  qualityDistribution: Array<QualityDistribution>;
  sentiment: SentimentSummary;
  themes: Array<Theme>;
  topKeywords: Array<WordFrequency>;
  totalDuration: Scalars['Int']['output'];
  totalRecordings: Scalars['Int']['output'];
  transcriptionAccuracy: Scalars['Float']['output'];
};

export type VoiceQuality = {
  __typename?: 'VoiceQuality';
  audioQuality: Scalars['String']['output'];
  clarity: Scalars['Float']['output'];
  noiseLevel: Scalars['Float']['output'];
  overallScore: Scalars['Float']['output'];
  volume: Scalars['Float']['output'];
};

export type VoiceRecording = {
  __typename?: 'VoiceRecording';
  confidence?: Maybe<Scalars['Float']['output']>;
  duration: Scalars['Int']['output'];
  fileSize: Scalars['Int']['output'];
  format: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  keywords: Array<Scalars['String']['output']>;
  processedAt?: Maybe<Scalars['DateTime']['output']>;
  quality: VoiceQuality;
  recordedAt: Scalars['DateTime']['output'];
  sentiment?: Maybe<SentimentAnalysis>;
  themes: Array<Theme>;
  transcription?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type WordFrequency = {
  __typename?: 'WordFrequency';
  frequency: Scalars['Int']['output'];
  sentiment?: Maybe<Scalars['Float']['output']>;
  significance: Scalars['Float']['output'];
  word: Scalars['String']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AnalyticsFilters: AnalyticsFilters;
  AnalyticsInsight: ResolverTypeWrapper<AnalyticsInsight>;
  Anomaly: ResolverTypeWrapper<Anomaly>;
  AnomalySeverity: AnomalySeverity;
  AnswerFrequency: ResolverTypeWrapper<AnswerFrequency>;
  AnswerInput: AnswerInput;
  ApiKey: ResolverTypeWrapper<Omit<ApiKey, 'organization' | 'user'> & { organization: ResolversTypes['Organization'], user: ResolversTypes['User'] }>;
  AspectSentiment: ResolverTypeWrapper<AspectSentiment>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CreateApiKeyInput: CreateApiKeyInput;
  CreateQuestionInput: CreateQuestionInput;
  CreateSurveyInput: CreateSurveyInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DemographicBreakdown: ResolverTypeWrapper<DemographicBreakdown>;
  Demographics: ResolverTypeWrapper<Demographics>;
  Emotion: ResolverTypeWrapper<Emotion>;
  FileUpload: ResolverTypeWrapper<FileUpload>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Force: ResolverTypeWrapper<Force>;
  ForceAnalysis: ResolverTypeWrapper<ForceAnalysis>;
  FormatDistribution: ResolverTypeWrapper<FormatDistribution>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InsightPriority: InsightPriority;
  InsightType: InsightType;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JTBDAnalysis: ResolverTypeWrapper<JtbdAnalysis>;
  JTBDCategory: JtbdCategory;
  JTBDScores: ResolverTypeWrapper<JtbdScores>;
  JTBDScoresInput: JtbdScoresInput;
  Job: ResolverTypeWrapper<Job>;
  LanguageDistribution: ResolverTypeWrapper<LanguageDistribution>;
  Moment: ResolverTypeWrapper<Moment>;
  Mutation: ResolverTypeWrapper<{}>;
  Opportunity: ResolverTypeWrapper<Opportunity>;
  OpportunityPriority: OpportunityPriority;
  OrderDirection: OrderDirection;
  Organization: ResolverTypeWrapper<Organization>;
  OrganizationSettings: ResolverTypeWrapper<OrganizationSettings>;
  Outcome: ResolverTypeWrapper<Outcome>;
  PaginationInput: PaginationInput;
  QualityDistribution: ResolverTypeWrapper<QualityDistribution>;
  Query: ResolverTypeWrapper<{}>;
  Question: ResolverTypeWrapper<Omit<Question, 'responses' | 'survey'> & { responses: Array<ResolversTypes['QuestionResponse']>, survey: ResolversTypes['Survey'] }>;
  QuestionAnalytics: ResolverTypeWrapper<Omit<QuestionAnalytics, 'question' | 'themes' | 'voiceAnalytics'> & { question: ResolversTypes['Question'], themes: Array<ResolversTypes['Theme']>, voiceAnalytics?: Maybe<ResolversTypes['VoiceAnalytics']> }>;
  QuestionGroup: ResolverTypeWrapper<QuestionGroup>;
  QuestionGroupSettings: ResolverTypeWrapper<QuestionGroupSettings>;
  QuestionOption: ResolverTypeWrapper<QuestionOption>;
  QuestionOptionInput: QuestionOptionInput;
  QuestionResponse: ResolverTypeWrapper<Omit<QuestionResponse, 'question' | 'response' | 'voiceRecording'> & { question: ResolversTypes['Question'], response: ResolversTypes['Response'], voiceRecording?: Maybe<ResolversTypes['VoiceRecording']> }>;
  QuestionType: QuestionType;
  QuestionValidation: ResolverTypeWrapper<QuestionValidation>;
  QuestionValidationInput: QuestionValidationInput;
  Response: ResolverTypeWrapper<Response>;
  ResponseAnalysis: ResolverTypeWrapper<Omit<ResponseAnalysis, 'response' | 'themes'> & { response: ResolversTypes['Response'], themes: Array<ResolversTypes['Theme']> }>;
  ResponseMetadata: ResolverTypeWrapper<ResponseMetadata>;
  ResponseMetadataInput: ResponseMetadataInput;
  ResponseStatus: ResponseStatus;
  SearchInput: SearchInput;
  SearchType: SearchType;
  SentimentAnalysis: ResolverTypeWrapper<SentimentAnalysis>;
  SentimentDistribution: ResolverTypeWrapper<SentimentDistribution>;
  SentimentLabel: SentimentLabel;
  SentimentSummary: ResolverTypeWrapper<SentimentSummary>;
  SessionStatus: SessionStatus;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  SubmitResponseInput: SubmitResponseInput;
  Subscription: ResolverTypeWrapper<{}>;
  Survey: ResolverTypeWrapper<Survey>;
  SurveyAnalytics: ResolverTypeWrapper<Omit<SurveyAnalytics, 'questionAnalytics' | 'survey' | 'themes'> & { questionAnalytics: Array<ResolversTypes['QuestionAnalytics']>, survey: ResolversTypes['Survey'], themes: Array<ResolversTypes['Theme']> }>;
  SurveySession: ResolverTypeWrapper<Omit<SurveySession, 'responses' | 'survey' | 'user'> & { responses: Array<ResolversTypes['Response']>, survey: ResolversTypes['Survey'], user?: Maybe<ResolversTypes['User']> }>;
  SurveySettings: ResolverTypeWrapper<SurveySettings>;
  SurveySettingsInput: SurveySettingsInput;
  SurveyStatus: SurveyStatus;
  SurveyTemplate: ResolverTypeWrapper<Omit<SurveyTemplate, 'createdBy'> & { createdBy: ResolversTypes['User'] }>;
  SurveyVisibility: SurveyVisibility;
  TemplateCategory: TemplateCategory;
  TemplateQuestion: ResolverTypeWrapper<TemplateQuestion>;
  TemplateSettings: ResolverTypeWrapper<TemplateSettings>;
  TemplateStatus: TemplateStatus;
  TemplateVisibility: TemplateVisibility;
  Theme: ResolverTypeWrapper<Omit<Theme, 'questions' | 'responses'> & { questions: Array<ResolversTypes['Question']>, responses: Array<ResolversTypes['Response']> }>;
  TimeSeries: ResolverTypeWrapper<TimeSeries>;
  TrendDirection: TrendDirection;
  UpdateSurveyInput: UpdateSurveyInput;
  Upload: ResolverTypeWrapper<Scalars['Upload']['output']>;
  User: ResolverTypeWrapper<User>;
  UserPreferences: ResolverTypeWrapper<UserPreferences>;
  UserProfile: ResolverTypeWrapper<UserProfile>;
  UserRole: UserRole;
  VoiceAnalytics: ResolverTypeWrapper<Omit<VoiceAnalytics, 'themes'> & { themes: Array<ResolversTypes['Theme']> }>;
  VoiceQuality: ResolverTypeWrapper<VoiceQuality>;
  VoiceRecording: ResolverTypeWrapper<Omit<VoiceRecording, 'themes'> & { themes: Array<ResolversTypes['Theme']> }>;
  WordFrequency: ResolverTypeWrapper<WordFrequency>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AnalyticsFilters: AnalyticsFilters;
  AnalyticsInsight: AnalyticsInsight;
  Anomaly: Anomaly;
  AnswerFrequency: AnswerFrequency;
  AnswerInput: AnswerInput;
  ApiKey: Omit<ApiKey, 'organization' | 'user'> & { organization: ResolversParentTypes['Organization'], user: ResolversParentTypes['User'] };
  AspectSentiment: AspectSentiment;
  Boolean: Scalars['Boolean']['output'];
  CreateApiKeyInput: CreateApiKeyInput;
  CreateQuestionInput: CreateQuestionInput;
  CreateSurveyInput: CreateSurveyInput;
  DateTime: Scalars['DateTime']['output'];
  DemographicBreakdown: DemographicBreakdown;
  Demographics: Demographics;
  Emotion: Emotion;
  FileUpload: FileUpload;
  Float: Scalars['Float']['output'];
  Force: Force;
  ForceAnalysis: ForceAnalysis;
  FormatDistribution: FormatDistribution;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  JTBDAnalysis: JtbdAnalysis;
  JTBDScores: JtbdScores;
  JTBDScoresInput: JtbdScoresInput;
  Job: Job;
  LanguageDistribution: LanguageDistribution;
  Moment: Moment;
  Mutation: {};
  Opportunity: Opportunity;
  Organization: Organization;
  OrganizationSettings: OrganizationSettings;
  Outcome: Outcome;
  PaginationInput: PaginationInput;
  QualityDistribution: QualityDistribution;
  Query: {};
  Question: Omit<Question, 'responses' | 'survey'> & { responses: Array<ResolversParentTypes['QuestionResponse']>, survey: ResolversParentTypes['Survey'] };
  QuestionAnalytics: Omit<QuestionAnalytics, 'question' | 'themes' | 'voiceAnalytics'> & { question: ResolversParentTypes['Question'], themes: Array<ResolversParentTypes['Theme']>, voiceAnalytics?: Maybe<ResolversParentTypes['VoiceAnalytics']> };
  QuestionGroup: QuestionGroup;
  QuestionGroupSettings: QuestionGroupSettings;
  QuestionOption: QuestionOption;
  QuestionOptionInput: QuestionOptionInput;
  QuestionResponse: Omit<QuestionResponse, 'question' | 'response' | 'voiceRecording'> & { question: ResolversParentTypes['Question'], response: ResolversParentTypes['Response'], voiceRecording?: Maybe<ResolversParentTypes['VoiceRecording']> };
  QuestionValidation: QuestionValidation;
  QuestionValidationInput: QuestionValidationInput;
  Response: Response;
  ResponseAnalysis: Omit<ResponseAnalysis, 'response' | 'themes'> & { response: ResolversParentTypes['Response'], themes: Array<ResolversParentTypes['Theme']> };
  ResponseMetadata: ResponseMetadata;
  ResponseMetadataInput: ResponseMetadataInput;
  SearchInput: SearchInput;
  SentimentAnalysis: SentimentAnalysis;
  SentimentDistribution: SentimentDistribution;
  SentimentSummary: SentimentSummary;
  String: Scalars['String']['output'];
  SubmitResponseInput: SubmitResponseInput;
  Subscription: {};
  Survey: Survey;
  SurveyAnalytics: Omit<SurveyAnalytics, 'questionAnalytics' | 'survey' | 'themes'> & { questionAnalytics: Array<ResolversParentTypes['QuestionAnalytics']>, survey: ResolversParentTypes['Survey'], themes: Array<ResolversParentTypes['Theme']> };
  SurveySession: Omit<SurveySession, 'responses' | 'survey' | 'user'> & { responses: Array<ResolversParentTypes['Response']>, survey: ResolversParentTypes['Survey'], user?: Maybe<ResolversParentTypes['User']> };
  SurveySettings: SurveySettings;
  SurveySettingsInput: SurveySettingsInput;
  SurveyTemplate: Omit<SurveyTemplate, 'createdBy'> & { createdBy: ResolversParentTypes['User'] };
  TemplateQuestion: TemplateQuestion;
  TemplateSettings: TemplateSettings;
  Theme: Omit<Theme, 'questions' | 'responses'> & { questions: Array<ResolversParentTypes['Question']>, responses: Array<ResolversParentTypes['Response']> };
  TimeSeries: TimeSeries;
  UpdateSurveyInput: UpdateSurveyInput;
  Upload: Scalars['Upload']['output'];
  User: User;
  UserPreferences: UserPreferences;
  UserProfile: UserProfile;
  VoiceAnalytics: Omit<VoiceAnalytics, 'themes'> & { themes: Array<ResolversParentTypes['Theme']> };
  VoiceQuality: VoiceQuality;
  VoiceRecording: Omit<VoiceRecording, 'themes'> & { themes: Array<ResolversParentTypes['Theme']> };
  WordFrequency: WordFrequency;
}>;

export type AnalyticsInsightResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnalyticsInsight'] = ResolversParentTypes['AnalyticsInsight']> = ResolversObject<{
  actionable?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  data?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  detectedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['InsightPriority'], ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['InsightType'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AnomalyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Anomaly'] = ResolversParentTypes['Anomaly']> = ResolversObject<{
  affectedMetrics?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  data?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  detectedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  severity?: Resolver<ResolversTypes['AnomalySeverity'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AnswerFrequencyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AnswerFrequency'] = ResolversParentTypes['AnswerFrequency']> = ResolversObject<{
  answer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiKeyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ApiKey'] = ResolversParentTypes['ApiKey']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  keyPrefix?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastUsedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  rateLimitHits?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  rateLimitPerHour?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  usageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AspectSentimentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AspectSentiment'] = ResolversParentTypes['AspectSentiment']> = ResolversObject<{
  aspect?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  mentions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type DemographicBreakdownResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DemographicBreakdown'] = ResolversParentTypes['DemographicBreakdown']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  trend?: Resolver<Maybe<ResolversTypes['TrendDirection']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DemographicsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Demographics'] = ResolversParentTypes['Demographics']> = ResolversObject<{
  ageGroups?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  browsers?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  departments?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  devices?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  industries?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  locations?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  roles?: Resolver<Array<ResolversTypes['DemographicBreakdown']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EmotionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Emotion'] = ResolversParentTypes['Emotion']> = ResolversObject<{
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  emotion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  intensity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FileUploadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FileUpload'] = ResolversParentTypes['FileUpload']> = ResolversObject<{
  filename?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mimeType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  size?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uploadedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ForceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Force'] = ResolversParentTypes['Force']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  impact?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  strength?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ForceAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ForceAnalysis'] = ResolversParentTypes['ForceAnalysis']> = ResolversObject<{
  anxietyForces?: Resolver<Array<ResolversTypes['Force']>, ParentType, ContextType>;
  energy?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  friction?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  habitForces?: Resolver<Array<ResolversTypes['Force']>, ParentType, ContextType>;
  momentum?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pullForces?: Resolver<Array<ResolversTypes['Force']>, ParentType, ContextType>;
  pushForces?: Resolver<Array<ResolversTypes['Force']>, ParentType, ContextType>;
  totalAnxiety?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalHabit?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPull?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalPush?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type FormatDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FormatDistribution'] = ResolversParentTypes['FormatDistribution']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  format?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JtbdAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JTBDAnalysis'] = ResolversParentTypes['JTBDAnalysis']> = ResolversObject<{
  forces?: Resolver<ResolversTypes['ForceAnalysis'], ParentType, ContextType>;
  jobs?: Resolver<Array<ResolversTypes['Job']>, ParentType, ContextType>;
  moments?: Resolver<Array<ResolversTypes['Moment']>, ParentType, ContextType>;
  opportunities?: Resolver<Array<ResolversTypes['Opportunity']>, ParentType, ContextType>;
  outcomes?: Resolver<Array<ResolversTypes['Outcome']>, ParentType, ContextType>;
  overallMomentum?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  satisfactionGap?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  switchingProbability?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type JtbdScoresResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JTBDScores'] = ResolversParentTypes['JTBDScores']> = ResolversObject<{
  anxiety?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  friction?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  habit?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  momentum?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  progress?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pullForces?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pushForces?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  social?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  switchingProbability?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type JobResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Job'] = ResolversParentTypes['Job']> = ResolversObject<{
  category?: Resolver<ResolversTypes['JTBDCategory'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  importance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  opportunity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  satisfaction?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  statement?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type LanguageDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LanguageDistribution'] = ResolversParentTypes['LanguageDistribution']> = ResolversObject<{
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MomentResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Moment'] = ResolversParentTypes['Moment']> = ResolversObject<{
  context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emotions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  intensity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  opportunities?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  trigger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  archiveSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationArchiveSurveyArgs, 'id'>>;
  createApiKey?: Resolver<ResolversTypes['ApiKey'], ParentType, ContextType, RequireFields<MutationCreateApiKeyArgs, 'input'>>;
  createSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationCreateSurveyArgs, 'input'>>;
  createSurveyTemplate?: Resolver<ResolversTypes['SurveyTemplate'], ParentType, ContextType, RequireFields<MutationCreateSurveyTemplateArgs, 'input'>>;
  deleteResponse?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteResponseArgs, 'id'>>;
  deleteSurvey?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSurveyArgs, 'id'>>;
  deleteSurveyTemplate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSurveyTemplateArgs, 'id'>>;
  duplicateSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationDuplicateSurveyArgs, 'id'>>;
  duplicateTemplate?: Resolver<ResolversTypes['SurveyTemplate'], ParentType, ContextType, RequireFields<MutationDuplicateTemplateArgs, 'id'>>;
  generateExport?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationGenerateExportArgs, 'format' | 'surveyId'>>;
  pauseSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationPauseSurveyArgs, 'id'>>;
  processVoiceRecording?: Resolver<ResolversTypes['VoiceRecording'], ParentType, ContextType, RequireFields<MutationProcessVoiceRecordingArgs, 'id'>>;
  publishSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationPublishSurveyArgs, 'id'>>;
  revokeApiKey?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationRevokeApiKeyArgs, 'id'>>;
  startSurveySession?: Resolver<ResolversTypes['SurveySession'], ParentType, ContextType, RequireFields<MutationStartSurveySessionArgs, 'surveyId'>>;
  submitResponse?: Resolver<ResolversTypes['Response'], ParentType, ContextType, RequireFields<MutationSubmitResponseArgs, 'input'>>;
  triggerResponseAnalysis?: Resolver<Array<ResolversTypes['ResponseAnalysis']>, ParentType, ContextType, RequireFields<MutationTriggerResponseAnalysisArgs, 'responseIds'>>;
  triggerSurveyAnalysis?: Resolver<ResolversTypes['SurveyAnalytics'], ParentType, ContextType, RequireFields<MutationTriggerSurveyAnalysisArgs, 'surveyId'>>;
  updateApiKey?: Resolver<ResolversTypes['ApiKey'], ParentType, ContextType, RequireFields<MutationUpdateApiKeyArgs, 'id'>>;
  updateOrganizationSettings?: Resolver<ResolversTypes['Organization'], ParentType, ContextType, RequireFields<MutationUpdateOrganizationSettingsArgs, 'input'>>;
  updateResponse?: Resolver<ResolversTypes['Response'], ParentType, ContextType, RequireFields<MutationUpdateResponseArgs, 'id' | 'input'>>;
  updateSurvey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType, RequireFields<MutationUpdateSurveyArgs, 'id' | 'input'>>;
  updateSurveyTemplate?: Resolver<ResolversTypes['SurveyTemplate'], ParentType, ContextType, RequireFields<MutationUpdateSurveyTemplateArgs, 'id' | 'input'>>;
  updateUserRole?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateUserRoleArgs, 'role' | 'userId'>>;
  uploadVoiceRecording?: Resolver<ResolversTypes['VoiceRecording'], ParentType, ContextType, RequireFields<MutationUploadVoiceRecordingArgs, 'file' | 'questionId'>>;
}>;

export type OpportunityResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Opportunity'] = ResolversParentTypes['Opportunity']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  effort?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  impact?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['OpportunityPriority'], ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Organization'] = ResolversParentTypes['Organization']> = ResolversObject<{
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  industry?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  memberCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['OrganizationSettings'], ParentType, ContextType>;
  size?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  surveyCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  surveys?: Resolver<Array<ResolversTypes['Survey']>, ParentType, ContextType>;
  totalResponses?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OrganizationSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OrganizationSettings'] = ResolversParentTypes['OrganizationSettings']> = ResolversObject<{
  allowAnonymousResponses?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  allowSelfRegistration?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  customBranding?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  dataRetentionDays?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  defaultRole?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  enable2FA?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableAuditLogs?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableJTBDAnalysis?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableSSO?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableVoiceRecording?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxSurveysPerUser?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  requireEmailVerification?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  ssoProvider?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OutcomeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Outcome'] = ResolversParentTypes['Outcome']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  gap?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  importance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  satisfaction?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QualityDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QualityDistribution'] = ResolversParentTypes['QualityDistribution']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  qualityRange?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  apiKey?: Resolver<Maybe<ResolversTypes['ApiKey']>, ParentType, ContextType, RequireFields<QueryApiKeyArgs, 'id'>>;
  apiKeys?: Resolver<Array<ResolversTypes['ApiKey']>, ParentType, ContextType, Partial<QueryApiKeysArgs>>;
  dashboardAnalytics?: Resolver<ResolversTypes['JSON'], ParentType, ContextType, Partial<QueryDashboardAnalyticsArgs>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType, Partial<QueryOrganizationArgs>>;
  organizations?: Resolver<Array<ResolversTypes['Organization']>, ParentType, ContextType, Partial<QueryOrganizationsArgs>>;
  response?: Resolver<Maybe<ResolversTypes['Response']>, ParentType, ContextType, RequireFields<QueryResponseArgs, 'id'>>;
  responseAnalytics?: Resolver<Maybe<ResolversTypes['ResponseAnalysis']>, ParentType, ContextType, RequireFields<QueryResponseAnalyticsArgs, 'responseId'>>;
  responses?: Resolver<Array<ResolversTypes['Response']>, ParentType, ContextType, Partial<QueryResponsesArgs>>;
  search?: Resolver<ResolversTypes['JSON'], ParentType, ContextType, RequireFields<QuerySearchArgs, 'input'>>;
  survey?: Resolver<Maybe<ResolversTypes['Survey']>, ParentType, ContextType, RequireFields<QuerySurveyArgs, 'id'>>;
  surveyAnalytics?: Resolver<ResolversTypes['SurveyAnalytics'], ParentType, ContextType, RequireFields<QuerySurveyAnalyticsArgs, 'surveyId'>>;
  surveyByShareUrl?: Resolver<Maybe<ResolversTypes['Survey']>, ParentType, ContextType, RequireFields<QuerySurveyByShareUrlArgs, 'shareUrl'>>;
  surveySession?: Resolver<Maybe<ResolversTypes['SurveySession']>, ParentType, ContextType, RequireFields<QuerySurveySessionArgs, 'id'>>;
  surveySessions?: Resolver<Array<ResolversTypes['SurveySession']>, ParentType, ContextType, Partial<QuerySurveySessionsArgs>>;
  surveyTemplate?: Resolver<Maybe<ResolversTypes['SurveyTemplate']>, ParentType, ContextType, RequireFields<QuerySurveyTemplateArgs, 'id'>>;
  surveyTemplates?: Resolver<Array<ResolversTypes['SurveyTemplate']>, ParentType, ContextType, Partial<QuerySurveyTemplatesArgs>>;
  surveys?: Resolver<Array<ResolversTypes['Survey']>, ParentType, ContextType, Partial<QuerySurveysArgs>>;
  systemHealth?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  systemMetrics?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'id'>>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType, Partial<QueryUsersArgs>>;
}>;

export type QuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Question'] = ResolversParentTypes['Question']> = ResolversObject<{
  averageTimeSpent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayConditions?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jtbdCategory?: Resolver<Maybe<ResolversTypes['JTBDCategory']>, ParentType, ContextType>;
  jtbdWeight?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  options?: Resolver<Maybe<Array<ResolversTypes['QuestionOption']>>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  responseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  responses?: Resolver<Array<ResolversTypes['QuestionResponse']>, ParentType, ContextType>;
  skipLogic?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  skipRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  survey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  topAnswers?: Resolver<Array<ResolversTypes['AnswerFrequency']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['QuestionType'], ParentType, ContextType>;
  validation?: Resolver<Maybe<ResolversTypes['QuestionValidation']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionAnalyticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionAnalytics'] = ResolversParentTypes['QuestionAnalytics']> = ResolversObject<{
  answerDistribution?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  averageTextLength?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  averageTimeSpent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  confidenceScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  qualityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  question?: Resolver<ResolversTypes['Question'], ParentType, ContextType>;
  sentiment?: Resolver<Maybe<ResolversTypes['SentimentSummary']>, ParentType, ContextType>;
  skipCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skipRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  themes?: Resolver<Array<ResolversTypes['Theme']>, ParentType, ContextType>;
  topAnswers?: Resolver<Array<ResolversTypes['AnswerFrequency']>, ParentType, ContextType>;
  totalResponses?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  uniqueAnswers?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  validResponses?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  voiceAnalytics?: Resolver<Maybe<ResolversTypes['VoiceAnalytics']>, ParentType, ContextType>;
  wordCloud?: Resolver<Array<ResolversTypes['WordFrequency']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionGroupResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionGroup'] = ResolversParentTypes['QuestionGroup']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  orderIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['TemplateQuestion']>, ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['QuestionGroupSettings'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionGroupSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionGroupSettings'] = ResolversParentTypes['QuestionGroupSettings']> = ResolversObject<{
  maxQuestionsToShow?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  randomizeQuestions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requiredQuestions?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionOptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionOption'] = ResolversParentTypes['QuestionOption']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  order?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionResponse'] = ResolversParentTypes['QuestionResponse']> = ResolversObject<{
  answeredAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  booleanAnswer?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  choiceAnswers?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
  confidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  dateAnswer?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  fileAnswers?: Resolver<Maybe<Array<ResolversTypes['FileUpload']>>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jtbdScores?: Resolver<Maybe<ResolversTypes['JTBDScores']>, ParentType, ContextType>;
  matrixAnswers?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  numberAnswer?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  question?: Resolver<ResolversTypes['Question'], ParentType, ContextType>;
  response?: Resolver<ResolversTypes['Response'], ParentType, ContextType>;
  skipped?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  textAnswer?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timeSpent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  voiceRecording?: Resolver<Maybe<ResolversTypes['VoiceRecording']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QuestionValidationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['QuestionValidation'] = ResolversParentTypes['QuestionValidation']> = ResolversObject<{
  customMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  maxLength?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  maxValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  minLength?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  minValue?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  pattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResponseResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Response'] = ResolversParentTypes['Response']> = ResolversObject<{
  analysis?: Resolver<Maybe<ResolversTypes['ResponseAnalysis']>, ParentType, ContextType>;
  answers?: Resolver<Array<ResolversTypes['QuestionResponse']>, ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  metadata?: Resolver<ResolversTypes['ResponseMetadata'], ParentType, ContextType>;
  qualityScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  session?: Resolver<ResolversTypes['SurveySession'], ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ResponseStatus'], ParentType, ContextType>;
  survey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResponseAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResponseAnalysis'] = ResolversParentTypes['ResponseAnalysis']> = ResolversObject<{
  anomalies?: Resolver<Array<ResolversTypes['Anomaly']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  flags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  insights?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  jtbdAnalysis?: Resolver<Maybe<ResolversTypes['JTBDAnalysis']>, ParentType, ContextType>;
  modelVersion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  processedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  processingTime?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  qualityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  response?: Resolver<ResolversTypes['Response'], ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['SentimentAnalysis'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  themes?: Resolver<Array<ResolversTypes['Theme']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ResponseMetadataResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ResponseMetadata'] = ResolversParentTypes['ResponseMetadata']> = ResolversObject<{
  browser?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  device?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ipAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  language?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  os?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  screenResolution?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  timezone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  totalTimeSpent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  userAgent?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  voiceInputUsed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SentimentAnalysisResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SentimentAnalysis'] = ResolversParentTypes['SentimentAnalysis']> = ResolversObject<{
  aspects?: Resolver<Array<ResolversTypes['AspectSentiment']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  emotions?: Resolver<Array<ResolversTypes['Emotion']>, ParentType, ContextType>;
  label?: Resolver<ResolversTypes['SentimentLabel'], ParentType, ContextType>;
  overallScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SentimentDistributionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SentimentDistribution'] = ResolversParentTypes['SentimentDistribution']> = ResolversObject<{
  count?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['SentimentLabel'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SentimentSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SentimentSummary'] = ResolversParentTypes['SentimentSummary']> = ResolversObject<{
  averageScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  distribution?: Resolver<Array<ResolversTypes['SentimentDistribution']>, ParentType, ContextType>;
  negative?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  neutral?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  positive?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  analysisCompleted?: SubscriptionResolver<ResolversTypes['ResponseAnalysis'], "analysisCompleted", ParentType, ContextType, RequireFields<SubscriptionAnalysisCompletedArgs, 'responseId'>>;
  organizationNotification?: SubscriptionResolver<ResolversTypes['JSON'], "organizationNotification", ParentType, ContextType, RequireFields<SubscriptionOrganizationNotificationArgs, 'organizationId'>>;
  responseSubmitted?: SubscriptionResolver<ResolversTypes['Response'], "responseSubmitted", ParentType, ContextType, RequireFields<SubscriptionResponseSubmittedArgs, 'surveyId'>>;
  sessionUpdated?: SubscriptionResolver<ResolversTypes['SurveySession'], "sessionUpdated", ParentType, ContextType, RequireFields<SubscriptionSessionUpdatedArgs, 'sessionId'>>;
  surveyAnalysisCompleted?: SubscriptionResolver<ResolversTypes['SurveyAnalytics'], "surveyAnalysisCompleted", ParentType, ContextType, RequireFields<SubscriptionSurveyAnalysisCompletedArgs, 'surveyId'>>;
  systemNotification?: SubscriptionResolver<ResolversTypes['JSON'], "systemNotification", ParentType, ContextType, Partial<SubscriptionSystemNotificationArgs>>;
}>;

export type SurveyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Survey'] = ResolversParentTypes['Survey']> = ResolversObject<{
  analytics?: Resolver<ResolversTypes['SurveyAnalytics'], ParentType, ContextType>;
  archivedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  averageCompletionTime?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completionRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  embedCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  organization?: Resolver<ResolversTypes['Organization'], ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  qrCode?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType>;
  responseCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  responses?: Resolver<Array<ResolversTypes['Response']>, ParentType, ContextType, RequireFields<SurveyResponsesArgs, 'limit' | 'offset'>>;
  sessions?: Resolver<Array<ResolversTypes['SurveySession']>, ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['SurveySettings'], ParentType, ContextType>;
  shareUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SurveyStatus'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  template?: Resolver<Maybe<ResolversTypes['SurveyTemplate']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  visibility?: Resolver<ResolversTypes['SurveyVisibility'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SurveyAnalyticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SurveyAnalytics'] = ResolversParentTypes['SurveyAnalytics']> = ResolversObject<{
  abandonmentRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  anomalies?: Resolver<Array<ResolversTypes['Anomaly']>, ParentType, ContextType>;
  averageCompletionTime?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedResponses?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completionRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  completionRateOverTime?: Resolver<Array<ResolversTypes['TimeSeries']>, ParentType, ContextType>;
  dataQualityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  demographics?: Resolver<Maybe<ResolversTypes['Demographics']>, ParentType, ContextType>;
  executiveSummary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  exportFormats?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  insights?: Resolver<Array<ResolversTypes['AnalyticsInsight']>, ParentType, ContextType>;
  jtbdAnalysis?: Resolver<Maybe<ResolversTypes['JTBDAnalysis']>, ParentType, ContextType>;
  keyFindings?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  lastExportedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  questionAnalytics?: Resolver<Array<ResolversTypes['QuestionAnalytics']>, ParentType, ContextType>;
  recommendations?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  responseQualityDistribution?: Resolver<Array<ResolversTypes['QualityDistribution']>, ParentType, ContextType>;
  responsesOverTime?: Resolver<Array<ResolversTypes['TimeSeries']>, ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['SentimentSummary'], ParentType, ContextType>;
  survey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType>;
  themes?: Resolver<Array<ResolversTypes['Theme']>, ParentType, ContextType>;
  totalResponses?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalSessions?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SurveySessionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SurveySession'] = ResolversParentTypes['SurveySession']> = ResolversObject<{
  attentionScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  currentQuestionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  device?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  engagementScore?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  ipAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastActiveAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  progressPercent?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  questionsAnswered?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  questionsSkipped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  referrer?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  responses?: Resolver<Array<ResolversTypes['Response']>, ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['SessionStatus'], ParentType, ContextType>;
  survey?: Resolver<ResolversTypes['Survey'], ParentType, ContextType>;
  totalTimeSpent?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  userAgent?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SurveySettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SurveySettings'] = ResolversParentTypes['SurveySettings']> = ResolversObject<{
  allowAnonymous?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  allowPreviousNavigation?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  collectMetadata?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableJTBD?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  enableVoice?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  expiresAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  maxResponses?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  oneResponsePerUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  randomizeQuestions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  redirectUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  requireAuth?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  showProgressBar?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  thankYouMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  welcomeMessage?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type SurveyTemplateResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['SurveyTemplate'] = ResolversParentTypes['SurveyTemplate']> = ResolversObject<{
  averageTime?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  category?: Resolver<ResolversTypes['TemplateCategory'], ParentType, ContextType>;
  completionRate?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  conclusionText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  difficultyLevel?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  estimatedDuration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  introductionText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  isSystemTemplate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  organizationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  parentTemplateId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  publishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  questionGroups?: Resolver<Array<ResolversTypes['QuestionGroup']>, ParentType, ContextType>;
  rating?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  settings?: Resolver<ResolversTypes['TemplateSettings'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TemplateStatus'], ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  usageCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  version?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  versionNotes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  visibility?: Resolver<ResolversTypes['TemplateVisibility'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TemplateQuestionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TemplateQuestion'] = ResolversParentTypes['TemplateQuestion']> = ResolversObject<{
  analyticsEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  displayConditions?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  helpText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jtbdCategory?: Resolver<Maybe<ResolversTypes['JTBDCategory']>, ParentType, ContextType>;
  jtbdWeight?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  options?: Resolver<Maybe<Array<ResolversTypes['QuestionOption']>>, ParentType, ContextType>;
  orderIndex?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  placeholderText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  questionText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  questionType?: Resolver<ResolversTypes['QuestionType'], ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  skipLogic?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  tags?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  validation?: Resolver<Maybe<ResolversTypes['QuestionValidation']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TemplateSettingsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TemplateSettings'] = ResolversParentTypes['TemplateSettings']> = ResolversObject<{
  aiAnalysisEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  allowAnonymous?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  allowSkipQuestions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  customBranding?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  customCSS?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  randomizeQuestions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  requireAllQuestions?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  saveProgress?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  showProgressBar?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  voiceEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ThemeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Theme'] = ResolversParentTypes['Theme']> = ResolversObject<{
  category?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  examples?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  percentage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  previousFrequency?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  questions?: Resolver<Array<ResolversTypes['Question']>, ParentType, ContextType>;
  responses?: Resolver<Array<ResolversTypes['Response']>, ParentType, ContextType>;
  trend?: Resolver<ResolversTypes['TrendDirection'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TimeSeriesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['TimeSeries'] = ResolversParentTypes['TimeSeries']> = ResolversObject<{
  label?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface UploadScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Upload'], any> {
  name: 'Upload';
}

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  emailVerified?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  lastLoginAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  organization?: Resolver<Maybe<ResolversTypes['Organization']>, ParentType, ContextType>;
  organizationId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  profile?: Resolver<Maybe<ResolversTypes['UserProfile']>, ParentType, ContextType>;
  responsesSubmitted?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['UserRole'], ParentType, ContextType>;
  surveysCreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserPreferencesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserPreferences'] = ResolversParentTypes['UserPreferences']> = ResolversObject<{
  language?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  notifications?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  theme?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timezone?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  voiceInput?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserProfileResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UserProfile'] = ResolversParentTypes['UserProfile']> = ResolversObject<{
  avatar?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  department?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobTitle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  preferences?: Resolver<ResolversTypes['UserPreferences'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VoiceAnalyticsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VoiceAnalytics'] = ResolversParentTypes['VoiceAnalytics']> = ResolversObject<{
  averageDuration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  averageFileSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  averageQualityScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  formatDistribution?: Resolver<Array<ResolversTypes['FormatDistribution']>, ParentType, ContextType>;
  languageDistribution?: Resolver<Array<ResolversTypes['LanguageDistribution']>, ParentType, ContextType>;
  qualityDistribution?: Resolver<Array<ResolversTypes['QualityDistribution']>, ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['SentimentSummary'], ParentType, ContextType>;
  themes?: Resolver<Array<ResolversTypes['Theme']>, ParentType, ContextType>;
  topKeywords?: Resolver<Array<ResolversTypes['WordFrequency']>, ParentType, ContextType>;
  totalDuration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalRecordings?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  transcriptionAccuracy?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VoiceQualityResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VoiceQuality'] = ResolversParentTypes['VoiceQuality']> = ResolversObject<{
  audioQuality?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  clarity?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  noiseLevel?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overallScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  volume?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type VoiceRecordingResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['VoiceRecording'] = ResolversParentTypes['VoiceRecording']> = ResolversObject<{
  confidence?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  duration?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  fileSize?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  format?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  keywords?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  processedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  quality?: Resolver<ResolversTypes['VoiceQuality'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  sentiment?: Resolver<Maybe<ResolversTypes['SentimentAnalysis']>, ParentType, ContextType>;
  themes?: Resolver<Array<ResolversTypes['Theme']>, ParentType, ContextType>;
  transcription?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WordFrequencyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WordFrequency'] = ResolversParentTypes['WordFrequency']> = ResolversObject<{
  frequency?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  sentiment?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  significance?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  word?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  AnalyticsInsight?: AnalyticsInsightResolvers<ContextType>;
  Anomaly?: AnomalyResolvers<ContextType>;
  AnswerFrequency?: AnswerFrequencyResolvers<ContextType>;
  ApiKey?: ApiKeyResolvers<ContextType>;
  AspectSentiment?: AspectSentimentResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  DemographicBreakdown?: DemographicBreakdownResolvers<ContextType>;
  Demographics?: DemographicsResolvers<ContextType>;
  Emotion?: EmotionResolvers<ContextType>;
  FileUpload?: FileUploadResolvers<ContextType>;
  Force?: ForceResolvers<ContextType>;
  ForceAnalysis?: ForceAnalysisResolvers<ContextType>;
  FormatDistribution?: FormatDistributionResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JTBDAnalysis?: JtbdAnalysisResolvers<ContextType>;
  JTBDScores?: JtbdScoresResolvers<ContextType>;
  Job?: JobResolvers<ContextType>;
  LanguageDistribution?: LanguageDistributionResolvers<ContextType>;
  Moment?: MomentResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Opportunity?: OpportunityResolvers<ContextType>;
  Organization?: OrganizationResolvers<ContextType>;
  OrganizationSettings?: OrganizationSettingsResolvers<ContextType>;
  Outcome?: OutcomeResolvers<ContextType>;
  QualityDistribution?: QualityDistributionResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Question?: QuestionResolvers<ContextType>;
  QuestionAnalytics?: QuestionAnalyticsResolvers<ContextType>;
  QuestionGroup?: QuestionGroupResolvers<ContextType>;
  QuestionGroupSettings?: QuestionGroupSettingsResolvers<ContextType>;
  QuestionOption?: QuestionOptionResolvers<ContextType>;
  QuestionResponse?: QuestionResponseResolvers<ContextType>;
  QuestionValidation?: QuestionValidationResolvers<ContextType>;
  Response?: ResponseResolvers<ContextType>;
  ResponseAnalysis?: ResponseAnalysisResolvers<ContextType>;
  ResponseMetadata?: ResponseMetadataResolvers<ContextType>;
  SentimentAnalysis?: SentimentAnalysisResolvers<ContextType>;
  SentimentDistribution?: SentimentDistributionResolvers<ContextType>;
  SentimentSummary?: SentimentSummaryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Survey?: SurveyResolvers<ContextType>;
  SurveyAnalytics?: SurveyAnalyticsResolvers<ContextType>;
  SurveySession?: SurveySessionResolvers<ContextType>;
  SurveySettings?: SurveySettingsResolvers<ContextType>;
  SurveyTemplate?: SurveyTemplateResolvers<ContextType>;
  TemplateQuestion?: TemplateQuestionResolvers<ContextType>;
  TemplateSettings?: TemplateSettingsResolvers<ContextType>;
  Theme?: ThemeResolvers<ContextType>;
  TimeSeries?: TimeSeriesResolvers<ContextType>;
  Upload?: GraphQLScalarType;
  User?: UserResolvers<ContextType>;
  UserPreferences?: UserPreferencesResolvers<ContextType>;
  UserProfile?: UserProfileResolvers<ContextType>;
  VoiceAnalytics?: VoiceAnalyticsResolvers<ContextType>;
  VoiceQuality?: VoiceQualityResolvers<ContextType>;
  VoiceRecording?: VoiceRecordingResolvers<ContextType>;
  WordFrequency?: WordFrequencyResolvers<ContextType>;
}>;

