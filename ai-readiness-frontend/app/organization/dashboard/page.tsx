'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Eye,
  Plus,
  Download
} from 'lucide-react'

interface DashboardStats {
  totalMembers: number
  surveysCompleted: number
  averageScore: number
  completionRate: number
  recentActivity: {
    newResponses: number
    newMembers: number
  }
}

interface RecentSurvey {
  id: string
  title: string
  completedAt: string
  score: number
  respondent: string
}

interface OrganizationInsight {
  category: string
  score: number
  trend: 'up' | 'down' | 'stable'
  recommendation: string
}

export default function OrganizationDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSurveys, setRecentSurveys] = useState<RecentSurvey[]>([])
  const [insights, setInsights] = useState<OrganizationInsight[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    if (!loading && user && (!user.role || !['org_admin', 'system_admin'].includes(user.role))) {
      router.push('/dashboard')
      return
    }

    if (user && user.organizationId) {
      fetchDashboardData()
    }
  }, [user, loading, router])

  const fetchDashboardData = async () => {
    try {
      // Get organization members count
      const { count: memberCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user?.organizationId)

      // Get completed surveys
      const { data: completedSurveys, error: surveysError } = await supabase
        .from('survey_sessions')
        .select(`
          *,
          profiles(first_name, last_name)
        `)
        .eq('organization_id', user?.organizationId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10)

      if (surveysError) {
        console.error('Error fetching surveys:', surveysError)
      }

      // Calculate average score from completed surveys
      const totalScore = completedSurveys?.reduce((sum, session) => {
        return sum + (session.final_score || 0)
      }, 0) || 0
      const averageScore = completedSurveys?.length ? totalScore / completedSurveys.length : 0

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { count: newResponses } = await supabase
        .from('survey_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user?.organizationId)
        .gte('created_at', sevenDaysAgo)

      const { count: newMembers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', user?.organizationId)
        .gte('created_at', sevenDaysAgo)

      const dashboardStats: DashboardStats = {
        totalMembers: memberCount || 0,
        surveysCompleted: completedSurveys?.length || 0,
        averageScore: Math.round(averageScore),
        completionRate: memberCount ? Math.round(((completedSurveys?.length || 0) / memberCount) * 100) : 0,
        recentActivity: {
          newResponses: newResponses || 0,
          newMembers: newMembers || 0
        }
      }

      const recentSurveyData: RecentSurvey[] = completedSurveys?.slice(0, 5).map(session => ({
        id: session.id,
        title: 'AI Readiness Assessment',
        completedAt: session.completed_at || session.created_at,
        score: session.final_score || 0,
        respondent: `${session.profiles?.first_name || 'Anonymous'} ${session.profiles?.last_name || 'User'}`
      })) || []

      // Generate insights based on the data
      const organizationInsights: OrganizationInsight[] = [
        {
          category: 'Overall Readiness',
          score: averageScore,
          trend: averageScore > 65 ? 'up' : averageScore > 45 ? 'stable' : 'down',
          recommendation: averageScore > 65 
            ? 'Excellent progress! Focus on maintaining momentum.'
            : averageScore > 45
            ? 'Good foundation. Consider targeted training programs.'
            : 'Significant opportunity for improvement. Start with basic AI literacy.'
        },
        {
          category: 'Participation',
          score: dashboardStats.completionRate,
          trend: dashboardStats.completionRate > 70 ? 'up' : dashboardStats.completionRate > 40 ? 'stable' : 'down',
          recommendation: dashboardStats.completionRate > 70
            ? 'Great engagement! Consider advanced assessments.'
            : dashboardStats.completionRate > 40
            ? 'Good participation. Send reminders to increase completion.'
            : 'Low participation. Consider incentives or mandatory assessments.'
        }
      ]

      setStats(dashboardStats)
      setRecentSurveys(recentSurveyData)
      setInsights(organizationInsights)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Dashboard Unavailable</CardTitle>
            <CardDescription className="text-gray-300">
              Unable to load dashboard data. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/organization')} className="w-full">
              Back to Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Organization Dashboard</h1>
            <p className="text-gray-300">AI Readiness Overview</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => router.push('/organization/analytics')} variant="outline">
              <BarChart3 className="w-4 h-4 mr-2" />
              Detailed Analytics
            </Button>
            <Button onClick={() => router.push('/organization/export')}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Team Members</p>
                  <p className="text-2xl font-bold text-white">{stats.totalMembers}</p>
                  <p className="text-xs text-blue-400">+{stats.recentActivity.newMembers} this week</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Completed Assessments</p>
                  <p className="text-2xl font-bold text-white">{stats.surveysCompleted}</p>
                  <p className="text-xs text-green-400">+{stats.recentActivity.newResponses} this week</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Average AI Readiness</p>
                  <p className="text-2xl font-bold text-white">{stats.averageScore}/100</p>
                  <Progress value={stats.averageScore} className="w-20 mt-2" />
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">Completion Rate</p>
                  <p className="text-2xl font-bold text-white">{stats.completionRate}%</p>
                  <Progress value={stats.completionRate} className="w-20 mt-2" />
                </div>
                <BarChart3 className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* AI Readiness Insights */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                AI Readiness Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="border-b border-white/10 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{insight.category}</h4>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        insight.trend === 'up' ? 'default' : 
                        insight.trend === 'stable' ? 'secondary' : 'destructive'
                      }>
                        {insight.score}
                        {insight.trend === 'up' && '↗'}
                        {insight.trend === 'down' && '↘'}
                        {insight.trend === 'stable' && '→'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">{insight.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Survey Completions */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Recent Completions
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => router.push('/organization/surveys')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSurveys.length > 0 ? (
                <div className="space-y-3">
                  {recentSurveys.map((survey) => (
                    <div key={survey.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{survey.respondent}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(survey.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={survey.score > 70 ? 'default' : survey.score > 50 ? 'secondary' : 'destructive'}>
                          {survey.score}/100
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-300">No completed assessments yet</p>
                  <p className="text-gray-400 text-sm">Encourage team members to take the assessment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Recommended Actions</CardTitle>
            <CardDescription className="text-gray-300">
              Based on your organization's current AI readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                <Users className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium mb-1">Increase Participation</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    {stats.totalMembers - stats.surveysCompleted} team members haven't completed the assessment yet.
                  </p>
                  <Button size="sm" onClick={() => router.push('/organization/members')}>
                    Send Reminders
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium mb-1">Analyze Results</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Dive deeper into your team's AI readiness patterns and trends.
                  </p>
                  <Button size="sm" onClick={() => router.push('/organization/analytics')}>
                    View Analytics
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                <Plus className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-white font-medium mb-1">Create Training Plan</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    Develop targeted AI training based on assessment results.
                  </p>
                  <Button size="sm" onClick={() => router.push('/organization/training')}>
                    Start Planning
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}