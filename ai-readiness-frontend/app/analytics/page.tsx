'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  User, 
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  Award,
  Activity
} from 'lucide-react'
import {
  getPersonalAnalytics,
  type PersonalAnalytics
} from '@/lib/services/analytics-service'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from 'recharts'

export default function PersonalAnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getPersonalAnalytics(user.id, user.organizationId)
        setAnalytics(data)

      } catch (error) {
        console.error('Failed to load personal analytics:', error)
        setError(error instanceof Error ? error.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user?.id, user?.organizationId])

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    color = 'teal',
    comparison
  }: {
    title: string
    value: string | number
    description: string
    icon: React.ComponentType<{ className?: string }>
    color?: string
    comparison?: { label: string; value: number; isPositive?: boolean }
  }) => (
    <Card className="glass-card hover:bg-white/5 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-400`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-gray-400 mb-2">{description}</p>
        {comparison && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${
                comparison.isPositive 
                  ? 'text-green-400 border-green-400' 
                  : 'text-orange-400 border-orange-400'
              }`}
            >
              {comparison.label}: {comparison.value}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin h-8 w-8 text-teal-400" />
          <span className="text-gray-300">Loading your analytics...</span>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Analytics</h3>
            <p className="text-gray-400 mb-4">{error || 'No analytics data available'}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare chart data
  const jtbdHistoryChart = analytics.personalJTBDHistory.slice(-6).map(item => {
    const date = new Date(item.date)
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      push: item.forces.push,
      pull: item.forces.pull,
      habit: item.forces.habit,
      anxiety: item.forces.anxiety
    }
  })

  const comparisonData = [
    {
      metric: 'Push Forces',
      personal: analytics.comparisonToOrg.jtbdForces.personal.push,
      organization: analytics.comparisonToOrg.jtbdForces.orgAverage.push
    },
    {
      metric: 'Pull Forces',
      personal: analytics.comparisonToOrg.jtbdForces.personal.pull,
      organization: analytics.comparisonToOrg.jtbdForces.orgAverage.pull
    },
    {
      metric: 'Habit Forces',
      personal: analytics.comparisonToOrg.jtbdForces.personal.habit,
      organization: analytics.comparisonToOrg.jtbdForces.orgAverage.habit
    },
    {
      metric: 'Anxiety Forces',
      personal: analytics.comparisonToOrg.jtbdForces.personal.anxiety,
      organization: analytics.comparisonToOrg.jtbdForces.orgAverage.anxiety
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Analytics</h1>
          <p className="text-gray-400">Personal insights from your survey responses</p>
        </div>
        <Badge variant="outline" className="text-teal-400 border-teal-400">
          {analytics.totalResponses} Response{analytics.totalResponses !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Responses"
          value={analytics.totalResponses}
          description="Surveys completed"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics.completionRate}%`}
          description="Survey completion"
          icon={Target}
          color="teal"
        />
        <StatCard
          title="Avg. Completion Time"
          value={`${Math.floor(analytics.averageCompletionTime / 60)}m ${analytics.averageCompletionTime % 60}s`}
          description="Time per survey"
          icon={Clock}
          color="blue"
          comparison={{
            label: 'Org avg',
            value: Math.floor(analytics.comparisonToOrg.completionTime.orgAverage / 60),
            isPositive: analytics.averageCompletionTime <= analytics.comparisonToOrg.completionTime.orgAverage
          }}
        />
        <StatCard
          title="Latest Response"
          value={analytics.responseHistory.length > 0 ? 
            new Date(analytics.responseHistory[0].completedAt).toLocaleDateString() : 'N/A'}
          description="Most recent survey"
          icon={Calendar}
          color="purple"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jtbd">JTBD Trends</TabsTrigger>
          <TabsTrigger value="history">Response History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Personal vs Organization Comparison */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Personal vs Organization</CardTitle>
              <CardDescription>How your responses compare to organization averages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Comparison Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={comparisonData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: '#9CA3AF' }} />
                      <PolarRadiusAxis 
                        domain={[0, 10]} 
                        tick={{ fill: '#9CA3AF' }}
                        angle={90}
                      />
                      <Radar
                        name="Your Scores"
                        dataKey="personal"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Organization Average"
                        dataKey="organization"
                        stroke="#6B7280"
                        fill="#6B7280"
                        fillOpacity={0.1}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#F9FAFB' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Comparison Details */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <h4 className="font-semibold text-white mb-3">Key Insights</h4>
                    <div className="space-y-3">
                      {analytics.comparisonToOrg.jtbdForces.personal.push > analytics.comparisonToOrg.jtbdForces.orgAverage.push && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-red-400" />
                          <span className="text-sm text-gray-300">
                            Higher push forces than average - you experience more problems than most
                          </span>
                        </div>
                      )}
                      {analytics.comparisonToOrg.jtbdForces.personal.pull > analytics.comparisonToOrg.jtbdForces.orgAverage.pull && (
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-gray-300">
                            Higher pull forces than average - you see more benefits in new solutions
                          </span>
                        </div>
                      )}
                      {analytics.averageCompletionTime < analytics.comparisonToOrg.completionTime.orgAverage && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-gray-300">
                            Faster than average completion time - efficient responder
                          </span>
                        </div>
                      )}
                      {analytics.totalResponses > 3 && (
                        <div className="flex items-center space-x-2">
                          <Award className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm text-gray-300">
                            Active participant - {analytics.totalResponses} surveys completed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-green-400/10">
                      <div className="text-2xl font-bold text-green-400">
                        {analytics.comparisonToOrg.jtbdForces.personal.pull.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">Your Pull Score</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-400/10">
                      <div className="text-2xl font-bold text-gray-400">
                        {analytics.comparisonToOrg.jtbdForces.orgAverage.pull.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">Org Average</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jtbd" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">JTBD Forces Over Time</CardTitle>
              <CardDescription>How your forces have evolved across recent surveys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={jtbdHistoryChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" domain={[0, 10]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#F9FAFB' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pull"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.6}
                      name="Pull Forces"
                    />
                    <Area
                      type="monotone"
                      dataKey="push"
                      stackId="1"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.6}
                      name="Push Forces"
                    />
                    <Area
                      type="monotone"
                      dataKey="habit"
                      stackId="1"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.6}
                      name="Habit Forces"
                    />
                    <Area
                      type="monotone"
                      dataKey="anxiety"
                      stackId="1"
                      stroke="#F97316"
                      fill="#F97316"
                      fillOpacity={0.6}
                      name="Anxiety Forces"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* JTBD Trends Analysis */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-400/10 border border-green-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-400">Pull</h4>
                    <Activity className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {analytics.comparisonToOrg.jtbdForces.personal.pull.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-400">Current score</p>
                </div>
                
                <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-red-400">Push</h4>
                    <Activity className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {analytics.comparisonToOrg.jtbdForces.personal.push.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-400">Current score</p>
                </div>
                
                <div className="p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-yellow-400">Habit</h4>
                    <Activity className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {analytics.comparisonToOrg.jtbdForces.personal.habit.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-400">Current score</p>
                </div>
                
                <div className="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-orange-400">Anxiety</h4>
                    <Activity className="h-4 w-4 text-orange-400" />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {analytics.comparisonToOrg.jtbdForces.personal.anxiety.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-400">Current score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Survey Response History</CardTitle>
              <CardDescription>All your completed surveys and their details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.responseHistory.length > 0 ? (
                  analytics.responseHistory.map((response) => (
                    <div key={response.id} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{response.surveyTitle}</h4>
                          <p className="text-sm text-gray-400">
                            Completed on {new Date(response.completedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {Math.floor(response.completionTime / 60)}m {response.completionTime % 60}s
                          </Badge>
                        </div>
                      </div>
                      
                      {response.jtbdForces && (
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-400">
                              {response.jtbdForces.pull.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Pull</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-400">
                              {response.jtbdForces.push.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Push</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-yellow-400">
                              {response.jtbdForces.habit.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Habit</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-orange-400">
                              {response.jtbdForces.anxiety.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-400">Anxiety</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No survey responses yet</p>
                    <p className="text-sm text-gray-500 mt-2">Complete a survey to see your analytics</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}