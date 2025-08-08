/**
 * Analytics Database Service
 * 
 * Handles comprehensive analytics data processing including JTBD forces trend analysis,
 * voice recording quality metrics aggregation, user engagement scoring, and real-time metrics calculation.
 * 
 * Features:
 * - Time-series data processing and aggregation
 * - JTBD forces trend analysis
 * - Voice quality metrics aggregation
 * - User engagement scoring algorithms
 * - Performance optimization with caching
 * - Background job scheduling
 */

import { createClient } from '@/lib/supabase/client'
import type { JTBDForces } from '@/lib/types'

const supabase = createClient()

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AnalyticsMetrics {
  totalSurveys: number
  totalResponses: number
  totalUsers: number
  completionRate: number
  averageCompletionTime: number
  participationRate: number
  voiceResponseRate: number
  averageVoiceQuality: number
}

export interface TimeSeriesDataPoint {
  timestamp: Date
  value: number
  category?: string
  metadata?: Record<string, any>
}

export interface JTBDTrendData {
  period: 'daily' | 'weekly' | 'monthly'
  data: Array<{
    date: string
    push_forces: number
    pull_forces: number
    habit_forces: number
    anxiety_forces: number
    net_readiness: number
  }>
}

export interface VoiceQualityTrends {
  averageQuality: number
  trends: Array<{
    date: string
    clarity_score: number
    completeness_score: number
    audibility_score: number
    transcription_accuracy: number
  }>
}

export interface UserEngagementMetrics {
  userId: string
  engagementScore: number
  responseFrequency: number
  averageSessionDuration: number
  voiceUsageRate: number
  qualityContributionScore: number
  lastActiveDate: Date
  totalContributions: number
}

export interface AnomalyDetectionResult {
  anomalies: Array<{
    timestamp: Date
    metric: string
    value: number
    expectedValue: number
    deviation: number
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
  }>
  confidence: number
}

// ============================================================================
// ANALYTICS DATA SERVICE
// ============================================================================

export class AnalyticsService {
  private cache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map()
  private readonly CACHE_DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get comprehensive analytics metrics for an organization
   */
  async getOrganizationMetrics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsMetrics> {
    const cacheKey = `org_metrics_${organizationId}_${dateRange?.start?.toISOString()}_${dateRange?.end?.toISOString()}`
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Build base queries with date filters
      let surveysQuery = supabase
        .from('surveys')
        .select('id, created_at, status')
        .eq('organization_id', organizationId)

      let responsesQuery = supabase
        .from('survey_responses')
        .select(`
          id,
          survey_id,
          respondent_id,
          completion_time,
          submitted_at,
          has_voice_recording,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)

      let usersQuery = supabase
        .from('profiles')
        .select(`
          id,
          organization_members!inner(organization_id)
        `)
        .eq('organization_members.organization_id', organizationId)

      // Apply date range filters
      if (dateRange) {
        if (dateRange.start) {
          surveysQuery = surveysQuery.gte('created_at', dateRange.start.toISOString())
          responsesQuery = responsesQuery.gte('submitted_at', dateRange.start.toISOString())
        }
        if (dateRange.end) {
          surveysQuery = surveysQuery.lte('created_at', dateRange.end.toISOString())
          responsesQuery = responsesQuery.lte('submitted_at', dateRange.end.toISOString())
        }
      }

      // Execute queries in parallel
      const [surveysResult, responsesResult, usersResult, voiceQualityResult] = await Promise.all([
        surveysQuery,
        responsesQuery,
        usersQuery,
        this.getVoiceQualityMetrics(organizationId, dateRange)
      ])

      if (surveysResult.error) throw surveysResult.error
      if (responsesResult.error) throw responsesResult.error
      if (usersResult.error) throw usersResult.error

      const surveys = surveysResult.data || []
      const responses = responsesResult.data || []
      const users = usersResult.data || []

      // Calculate metrics
      const totalSurveys = surveys.length
      const totalResponses = responses.length
      const totalUsers = users.length
      
      // Completion rate: completed responses / total expected responses
      const totalExpectedResponses = surveys.length * users.length
      const completionRate = totalExpectedResponses > 0 ? 
        (totalResponses / totalExpectedResponses) * 100 : 0

      // Average completion time
      const completionTimes = responses
        .filter(r => r.completion_time)
        .map(r => r.completion_time)
      const averageCompletionTime = completionTimes.length > 0 ?
        completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length : 0

      // Participation rate: unique users who responded / total users
      const uniqueRespondents = new Set(responses.map(r => r.respondent_id)).size
      const participationRate = totalUsers > 0 ? (uniqueRespondents / totalUsers) * 100 : 0

      // Voice response rate
      const voiceResponses = responses.filter(r => r.has_voice_recording).length
      const voiceResponseRate = totalResponses > 0 ? (voiceResponses / totalResponses) * 100 : 0

      const metrics: AnalyticsMetrics = {
        totalSurveys,
        totalResponses,
        totalUsers,
        completionRate: Math.round(completionRate * 10) / 10,
        averageCompletionTime: Math.round(averageCompletionTime),
        participationRate: Math.round(participationRate * 10) / 10,
        voiceResponseRate: Math.round(voiceResponseRate * 10) / 10,
        averageVoiceQuality: voiceQualityResult.averageQuality
      }

      // Cache the result
      this.setCache(cacheKey, metrics, this.CACHE_DEFAULT_TTL)
      
      return metrics

    } catch (error) {
      console.error('Error fetching organization metrics:', error)
      throw error
    }
  }

  /**
   * Get JTBD forces trend analysis
   */
  async getJTBDTrends(
    organizationId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly',
    dateRange?: { start: Date; end: Date }
  ): Promise<JTBDTrendData> {
    const cacheKey = `jtbd_trends_${organizationId}_${period}_${dateRange?.start?.toISOString()}_${dateRange?.end?.toISOString()}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Get JTBD analysis data
      let analysisQuery = supabase
        .from('response_analysis_jtbd')
        .select(`
          analyzed_at,
          force_scores,
          readiness_score,
          resistance_score,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)
        .order('analyzed_at', { ascending: true })

      // Apply date range
      if (dateRange) {
        if (dateRange.start) {
          analysisQuery = analysisQuery.gte('analyzed_at', dateRange.start.toISOString())
        }
        if (dateRange.end) {
          analysisQuery = analysisQuery.lte('analyzed_at', dateRange.end.toISOString())
        }
      }

      const { data: analysisData, error } = await analysisQuery

      if (error) throw error

      // Process and aggregate data by period
      const trendData = this.aggregateJTBDByPeriod(analysisData || [], period)

      const result: JTBDTrendData = {
        period,
        data: trendData
      }

      // Cache for shorter time due to real-time nature
      this.setCache(cacheKey, result, 2 * 60 * 1000) // 2 minutes
      
      return result

    } catch (error) {
      console.error('Error fetching JTBD trends:', error)
      throw error
    }
  }

  /**
   * Get voice quality trends and metrics
   */
  async getVoiceQualityMetrics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<VoiceQualityTrends> {
    const cacheKey = `voice_quality_${organizationId}_${dateRange?.start?.toISOString()}_${dateRange?.end?.toISOString()}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Get voice quality metrics
      let qualityQuery = supabase
        .from('voice_quality_metrics')
        .select(`
          overall_quality_score,
          clarity_score,
          completeness_score,
          audibility_score,
          analyzed_at,
          voice_recordings!inner(
            survey_id,
            transcription_confidence,
            surveys!inner(organization_id)
          )
        `)
        .eq('voice_recordings.surveys.organization_id', organizationId)
        .order('analyzed_at', { ascending: true })

      // Apply date range
      if (dateRange) {
        if (dateRange.start) {
          qualityQuery = qualityQuery.gte('analyzed_at', dateRange.start.toISOString())
        }
        if (dateRange.end) {
          qualityQuery = qualityQuery.lte('analyzed_at', dateRange.end.toISOString())
        }
      }

      const { data: qualityData, error } = await qualityQuery

      if (error) throw error

      const data = qualityData || []

      // Calculate average quality
      const averageQuality = data.length > 0 ?
        data.reduce((sum, item) => sum + item.overall_quality_score, 0) / data.length : 0

      // Aggregate trends by day
      const trendMap: Record<string, {
        clarity_scores: number[]
        completeness_scores: number[]
        audibility_scores: number[]
        transcription_accuracies: number[]
      }> = {}

      data.forEach(item => {
        const date = new Date(item.analyzed_at).toISOString().split('T')[0]
        if (!trendMap[date]) {
          trendMap[date] = {
            clarity_scores: [],
            completeness_scores: [],
            audibility_scores: [],
            transcription_accuracies: []
          }
        }
        
        trendMap[date].clarity_scores.push(item.clarity_score)
        trendMap[date].completeness_scores.push(item.completeness_score)
        trendMap[date].audibility_scores.push(item.audibility_score)
        
        const voiceRecording = item.voice_recordings as any
        if (voiceRecording?.transcription_confidence) {
          trendMap[date].transcription_accuracies.push(voiceRecording.transcription_confidence * 10) // Scale to 0-10
        }
      })

      // Calculate daily averages
      const trends = Object.entries(trendMap).map(([date, scores]) => ({
        date,
        clarity_score: this.calculateAverage(scores.clarity_scores),
        completeness_score: this.calculateAverage(scores.completeness_scores),
        audibility_score: this.calculateAverage(scores.audibility_scores),
        transcription_accuracy: this.calculateAverage(scores.transcription_accuracies)
      })).sort((a, b) => a.date.localeCompare(b.date))

      const result: VoiceQualityTrends = {
        averageQuality: Math.round(averageQuality * 10) / 10,
        trends
      }

      this.setCache(cacheKey, result, this.CACHE_DEFAULT_TTL)
      
      return result

    } catch (error) {
      console.error('Error fetching voice quality metrics:', error)
      return { averageQuality: 0, trends: [] }
    }
  }

  /**
   * Calculate user engagement scores
   */
  async getUserEngagementMetrics(
    organizationId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UserEngagementMetrics[]> {
    const cacheKey = `user_engagement_${organizationId}_${dateRange?.start?.toISOString()}_${dateRange?.end?.toISOString()}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      // Get user response data with engagement metrics
      let userDataQuery = supabase
        .from('survey_responses')
        .select(`
          respondent_id,
          completion_time,
          submitted_at,
          has_voice_recording,
          survey_sessions!inner(
            started_at,
            surveys!inner(organization_id)
          )
        `)
        .eq('survey_sessions.surveys.organization_id', organizationId)

      // Apply date range
      if (dateRange) {
        if (dateRange.start) {
          userDataQuery = userDataQuery.gte('submitted_at', dateRange.start.toISOString())
        }
        if (dateRange.end) {
          userDataQuery = userDataQuery.lte('submitted_at', dateRange.end.toISOString())
        }
      }

      const { data: responseData, error } = await userDataQuery

      if (error) throw error

      // Process user engagement data
      const userMetrics: Record<string, {
        responses: any[]
        voiceCount: number
        totalCompletionTime: number
        sessionDurations: number[]
        lastActive: Date
      }> = {} as any

      (responseData || []).forEach(response => {
        const userId = response.respondent_id
        if (!userId) return

        if (!userMetrics[userId]) {
          userMetrics[userId] = {
            responses: [],
            voiceCount: 0,
            totalCompletionTime: 0,
            sessionDurations: [],
            lastActive: new Date(response.submitted_at)
          }
        }

        const userMetric = userMetrics[userId]
        userMetric.responses.push(response)
        
        if (response.has_voice_recording) {
          userMetric.voiceCount++
        }
        
        if (response.completion_time) {
          userMetric.totalCompletionTime += response.completion_time
        }

        const submittedAt = new Date(response.submitted_at)
        if (submittedAt > userMetric.lastActive) {
          userMetric.lastActive = submittedAt
        }

        // Calculate session duration
        const session = response.survey_sessions as any
        if (session?.started_at && response.submitted_at) {
          const duration = new Date(response.submitted_at).getTime() - new Date(session.started_at).getTime()
          userMetric.sessionDurations.push(duration / 1000 / 60) // Convert to minutes
        }
      })

      // Calculate engagement scores
      const engagementMetrics: UserEngagementMetrics[] = Object.entries(userMetrics).map(([userId, metrics]) => {
        const totalResponses = metrics.responses.length
        const responseFrequency = this.calculateResponseFrequency(metrics.responses, dateRange)
        const averageSessionDuration = metrics.sessionDurations.length > 0 ?
          metrics.sessionDurations.reduce((sum, duration) => sum + duration, 0) / metrics.sessionDurations.length : 0
        const voiceUsageRate = totalResponses > 0 ? (metrics.voiceCount / totalResponses) * 100 : 0
        
        // Engagement score calculation (0-100)
        const engagementScore = this.calculateEngagementScore({
          responseCount: totalResponses,
          responseFrequency,
          voiceUsageRate,
          averageSessionDuration,
          averageCompletionTime: metrics.totalCompletionTime / totalResponses || 0
        })

        // Quality contribution score based on response completeness and voice usage
        const qualityContributionScore = this.calculateQualityContribution({
          totalResponses,
          voiceCount: metrics.voiceCount,
          averageCompletionTime: metrics.totalCompletionTime / totalResponses || 0
        })

        return {
          userId,
          engagementScore: Math.round(engagementScore * 10) / 10,
          responseFrequency: Math.round(responseFrequency * 10) / 10,
          averageSessionDuration: Math.round(averageSessionDuration * 10) / 10,
          voiceUsageRate: Math.round(voiceUsageRate * 10) / 10,
          qualityContributionScore: Math.round(qualityContributionScore * 10) / 10,
          lastActiveDate: metrics.lastActive,
          totalContributions: totalResponses
        }
      })

      this.setCache(cacheKey, engagementMetrics, this.CACHE_DEFAULT_TTL)
      
      return engagementMetrics.sort((a, b) => b.engagementScore - a.engagementScore)

    } catch (error) {
      console.error('Error calculating user engagement metrics:', error)
      throw error
    }
  }

  /**
   * Detect anomalies in analytics data
   */
  async detectAnomalies(
    organizationId: string,
    metrics: string[] = ['completion_rate', 'response_time', 'voice_quality'],
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<AnomalyDetectionResult> {
    try {
      const anomalies: AnomalyDetectionResult['anomalies'] = []
      const thresholds = this.getAnomalyThresholds(sensitivity)

      // Get historical data for baseline comparison
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)) // 30 days back

      const historicalMetrics = await this.getOrganizationMetrics(organizationId, {
        start: startDate,
        end: endDate
      })

      // Get recent data (last 24 hours)
      const recentStartDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000))
      const recentMetrics = await this.getOrganizationMetrics(organizationId, {
        start: recentStartDate,
        end: endDate
      })

      // Check for anomalies in each requested metric
      for (const metric of metrics) {
        const anomaly = this.detectMetricAnomaly(
          metric,
          historicalMetrics,
          recentMetrics,
          thresholds
        )
        
        if (anomaly) {
          anomalies.push({
            timestamp: endDate,
            metric,
            value: anomaly.currentValue,
            expectedValue: anomaly.expectedValue,
            deviation: anomaly.deviation,
            severity: anomaly.severity,
            description: anomaly.description
          })
        }
      }

      return {
        anomalies,
        confidence: anomalies.length > 0 ? 
          anomalies.reduce((sum, a) => sum + (a.severity === 'critical' ? 0.9 : a.severity === 'high' ? 0.7 : 0.5), 0) / anomalies.length :
          0
      }

    } catch (error) {
      console.error('Error detecting anomalies:', error)
      return { anomalies: [], confidence: 0 }
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeMetrics(organizationId: string): Promise<{
    activeUsers: number
    ongoingSurveys: number
    recentResponses: number
    systemHealth: 'healthy' | 'warning' | 'critical'
  }> {
    try {
      const now = new Date()
      const fifteenMinutesAgo = new Date(now.getTime() - (15 * 60 * 1000))
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))

      // Get active users (users who submitted responses in last 15 minutes)
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('survey_responses')
        .select(`
          respondent_id,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)
        .gte('submitted_at', fifteenMinutesAgo.toISOString())

      if (activeUsersError) throw activeUsersError

      const activeUsers = new Set((activeUsersData || []).map(r => r.respondent_id)).size

      // Get ongoing surveys (active surveys)
      const { data: ongoingSurveysData, error: ongoingSurveysError } = await supabase
        .from('surveys')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (ongoingSurveysError) throw ongoingSurveysError

      const ongoingSurveys = (ongoingSurveysData || []).length

      // Get recent responses (last hour)
      const { data: recentResponsesData, error: recentResponsesError } = await supabase
        .from('survey_responses')
        .select(`
          id,
          surveys!inner(organization_id)
        `)
        .eq('surveys.organization_id', organizationId)
        .gte('submitted_at', oneHourAgo.toISOString())

      if (recentResponsesError) throw recentResponsesError

      const recentResponses = (recentResponsesData || []).length

      // Determine system health
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (activeUsers === 0 && ongoingSurveys > 0) {
        systemHealth = 'warning'
      }
      
      if (recentResponses === 0 && ongoingSurveys > 2) {
        systemHealth = 'critical'
      }

      return {
        activeUsers,
        ongoingSurveys,
        recentResponses,
        systemHealth
      }

    } catch (error) {
      console.error('Error fetching real-time metrics:', error)
      return {
        activeUsers: 0,
        ongoingSurveys: 0,
        recentResponses: 0,
        systemHealth: 'critical'
      }
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && (Date.now() - cached.timestamp.getTime()) < cached.ttl) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key) // Clean up expired cache
    }
    return null
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    })
  }

  private aggregateJTBDByPeriod(data: any[], period: 'daily' | 'weekly' | 'monthly') {
    const aggregated: Record<string, {
      push_forces: number[]
      pull_forces: number[]
      habit_forces: number[]
      anxiety_forces: number[]
      readiness_scores: number[]
    }> = {}

    data.forEach(item => {
      const date = new Date(item.analyzed_at)
      let periodKey: string

      switch (period) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0]
          break
        case 'weekly':
          const weekStart = new Date(date.getTime() - (date.getDay() * 24 * 60 * 60 * 1000))
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        default:
          periodKey = date.toISOString().split('T')[0]
      }

      if (!aggregated[periodKey]) {
        aggregated[periodKey] = {
          push_forces: [],
          pull_forces: [],
          habit_forces: [],
          anxiety_forces: [],
          readiness_scores: []
        }
      }

      const scores = item.force_scores
      aggregated[periodKey].push_forces.push(scores.pain_of_old + scores.pull_of_new)
      aggregated[periodKey].pull_forces.push(scores.anchors_to_old + scores.anxiety_of_new)
      aggregated[periodKey].habit_forces.push(scores.anchors_to_old)
      aggregated[periodKey].anxiety_forces.push(scores.anxiety_of_new)
      
      if (item.readiness_score !== null) {
        aggregated[periodKey].readiness_scores.push(item.readiness_score)
      }
    })

    return Object.entries(aggregated).map(([date, values]) => ({
      date,
      push_forces: this.calculateAverage(values.push_forces),
      pull_forces: this.calculateAverage(values.pull_forces),
      habit_forces: this.calculateAverage(values.habit_forces),
      anxiety_forces: this.calculateAverage(values.anxiety_forces),
      net_readiness: this.calculateAverage(values.readiness_scores)
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const sum = numbers.reduce((acc, num) => acc + num, 0)
    return Math.round((sum / numbers.length) * 10) / 10
  }

  private calculateResponseFrequency(responses: any[], dateRange?: { start: Date; end: Date }): number {
    if (responses.length === 0) return 0

    const dates = responses.map(r => new Date(r.submitted_at))
    const minDate = dateRange?.start || new Date(Math.min(...dates.map(d => d.getTime())))
    const maxDate = dateRange?.end || new Date(Math.max(...dates.map(d => d.getTime())))
    
    const daysDiff = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000))
    
    return responses.length / daysDiff
  }

  private calculateEngagementScore(params: {
    responseCount: number
    responseFrequency: number
    voiceUsageRate: number
    averageSessionDuration: number
    averageCompletionTime: number
  }): number {
    // Normalized scoring (0-100)
    const responseScore = Math.min(100, (params.responseCount / 10) * 30) // 30% weight
    const frequencyScore = Math.min(100, params.responseFrequency * 20) // 20% weight
    const voiceScore = (params.voiceUsageRate / 100) * 20 // 20% weight
    const sessionScore = Math.min(100, (params.averageSessionDuration / 30) * 15) // 15% weight
    const completionScore = Math.min(100, (300 - params.averageCompletionTime) / 3) * 0.15 // 15% weight, lower time = higher score
    
    return Math.max(0, responseScore + frequencyScore + voiceScore + sessionScore + completionScore)
  }

  private calculateQualityContribution(params: {
    totalResponses: number
    voiceCount: number
    averageCompletionTime: number
  }): number {
    // Quality based on thoroughness and voice contribution
    const responseQuality = Math.min(100, (params.totalResponses / 5) * 40) // More responses = higher quality
    const voiceQuality = params.totalResponses > 0 ? (params.voiceCount / params.totalResponses) * 40 : 0
    const thoroughnessQuality = Math.min(20, Math.max(0, (params.averageCompletionTime - 60) / 10)) // Sweet spot around 60-180 seconds
    
    return responseQuality + voiceQuality + thoroughnessQuality
  }

  private getAnomalyThresholds(sensitivity: 'low' | 'medium' | 'high') {
    const thresholds = {
      low: { deviation: 2.5, change: 0.5 },
      medium: { deviation: 2.0, change: 0.3 },
      high: { deviation: 1.5, change: 0.2 }
    }
    return thresholds[sensitivity]
  }

  private detectMetricAnomaly(
    metric: string,
    historical: AnalyticsMetrics,
    recent: AnalyticsMetrics,
    thresholds: { deviation: number; change: number }
  ) {
    const getValue = (metrics: AnalyticsMetrics, metricName: string): number => {
      switch (metricName) {
        case 'completion_rate': return metrics.completionRate
        case 'response_time': return metrics.averageCompletionTime
        case 'voice_quality': return metrics.averageVoiceQuality
        case 'participation_rate': return metrics.participationRate
        default: return 0
      }
    }

    const historicalValue = getValue(historical, metric)
    const recentValue = getValue(recent, metric)

    if (historicalValue === 0) return null // Can't compare with no baseline

    const deviation = Math.abs(recentValue - historicalValue) / historicalValue
    
    if (deviation > thresholds.change) {
      const severity: 'low' | 'medium' | 'high' | 'critical' = 
        deviation > 0.8 ? 'critical' :
        deviation > 0.5 ? 'high' :
        deviation > 0.3 ? 'medium' : 'low'

      return {
        currentValue: recentValue,
        expectedValue: historicalValue,
        deviation,
        severity,
        description: `${metric.replace('_', ' ')} has ${recentValue > historicalValue ? 'increased' : 'decreased'} by ${Math.round(deviation * 100)}% from baseline`
      }
    }

    return null
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()