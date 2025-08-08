'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatsCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Download,
  Target,
  Activity,
  PieChart,
  Filter,
  RotateCcw as Refresh,
  Loader2,
  AlertCircle
} from 'lucide-react'
import {
  MetricsCard,
  JTBDAnalyticsChart,
  VoiceAnalyticsChart,
  UserEngagementChart,
  ExportControls
} from '@/components/analytics/dashboard-components'
import { DateRange } from 'react-day-picker'
import { toast } from 'sonner'

interface AnalyticsData {
  totalResponses: number
  completionRate: number
  averageTime: number
  activeUsers: number
  departmentBreakdown: Record<string, number>
  jtbdForces: {
    push: number
    pull: number
    habit: number
    anxiety: number
  }
  voiceAnalytics: {
    totalRecordings: number
    averageDuration: number
    transcriptionAccuracy: number
    sentimentDistribution: Record<string, number>
  }
  userEngagement: {
    dailyActiveUsers: Array<{ date: string; users: number }>
    sessionDuration: Array<{ date: string; duration: number }>
    featureUsage: Record<string, number>
  }
  trends: {
    responseGrowth: number
    engagementChange: number
    completionTrend: number
  }
}

export default function AnalyticsDashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  })
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedMetric, setSelectedMetric] = useState<string>('all')

  // Mock data for demonstration
  const generateMockAnalytics = (): AnalyticsData => ({
    totalResponses: 1247,
    completionRate: 87.3,
    averageTime: 342, // seconds
    activeUsers: 89,
    departmentBreakdown: {
      'Engineering': 245,
      'Product': 189,
      'Sales': 156,
      'Marketing': 134,
      'HR': 98,
      'Finance': 87,
      'Operations': 76,
      'Customer Success': 67,
      'Design': 45,
      'Legal': 23
    },
    jtbdForces: {
      push: 6.8,
      pull: 7.2,
      habit: 4.1,
      anxiety: 3.9
    },
    voiceAnalytics: {
      totalRecordings: 428,
      averageDuration: 47.3, // seconds
      transcriptionAccuracy: 94.7,
      sentimentDistribution: {
        'Positive': 45.2,
        'Neutral': 38.1,
        'Negative': 16.7
      }
    },
    userEngagement: {
      dailyActiveUsers: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        users: Math.floor(Math.random() * 40) + 50
      })),
      sessionDuration: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        duration: Math.floor(Math.random() * 300) + 180
      })),
      featureUsage: {
        'Survey Creation': 234,
        'Response Analysis': 189,
        'Export Reports': 145,
        'Team Collaboration': 123,
        'Voice Recording': 98,
        'Data Visualization': 87
      }
    },
    trends: {
      responseGrowth: 23.4,
      engagementChange: 12.7,
      completionTrend: -2.1
    }
  })

  const loadAnalytics = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For now, use mock data
      const data = generateMockAnalytics()
      setAnalytics(data)

    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [dateRange, selectedDepartment])

  const handleRefresh = () => {
    loadAnalytics(true)
    toast.success('Analytics refreshed')
  }

  const handleExport = async (options: { format: 'csv' | 'json' | 'pdf' | 'png', sections?: string[] }) => {
    try {
      toast.info(`Preparing ${options.format.toUpperCase()} export...`)
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast.success(`Analytics exported as ${options.format.toUpperCase()}`)
    } catch (error) {
      toast.error('Export failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin h-8 w-8 text-teal-400" />
          <span className="text-gray-300">Loading analytics dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Analytics</h3>
            <p className="text-gray-400 mb-4">{error || 'No analytics data available'}</p>
            <Button onClick={() => loadAnalytics()}>
              <Refresh className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <Refresh className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <ExportControls onExport={handleExport} />
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-teal-400" />
            <CardTitle>Filters</CardTitle>
          </div>
          <CardDescription>Customize your analytics view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Date Range</label>
              <DatePickerWithRange
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.keys(analytics.departmentBreakdown).map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Metric Focus</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue placeholder="All Metrics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="responses">Response Metrics</SelectItem>
                  <SelectItem value="engagement">User Engagement</SelectItem>
                  <SelectItem value="voice">Voice Analytics</SelectItem>
                  <SelectItem value="jtbd">JTBD Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Responses"
          value={analytics.totalResponses.toLocaleString()}
          icon={Users}
          trend={{
            value: analytics.trends.responseGrowth,
            label: 'vs last month',
            direction: analytics.trends.responseGrowth > 0 ? 'up' : 'down'
          }}
          description="Survey responses collected"
        />
        <MetricsCard
          title="Completion Rate"
          value={`${analytics.completionRate}%`}
          icon={Target}
          trend={{
            value: Math.abs(analytics.trends.completionTrend),
            label: 'vs last month',
            direction: analytics.trends.completionTrend > 0 ? 'up' : 'down'
          }}
          description="Average completion rate"
        />
        <MetricsCard
          title="Avg. Response Time"
          value={`${Math.floor(analytics.averageTime / 60)}m ${analytics.averageTime % 60}s`}
          icon={Clock}
          trend={{
            value: 8.3,
            label: 'vs target',
            direction: 'up'
          }}
          description="Time per survey"
        />
        <MetricsCard
          title="Active Users"
          value={analytics.activeUsers}
          icon={Activity}
          trend={{
            value: analytics.trends.engagementChange,
            label: 'vs last week',
            direction: analytics.trends.engagementChange > 0 ? 'up' : 'down'
          }}
          description="Users in last 30 days"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="jtbd" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>JTBD Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Voice Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="engagement" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>User Engagement</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-teal-400" />
                    <CardTitle>Department Distribution</CardTitle>
                  </div>
                  <Badge variant="outline">{Object.keys(analytics.departmentBreakdown).length} departments</Badge>
                </div>
                <CardDescription>Response breakdown by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analytics.departmentBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 8)
                    .map(([dept, count], index) => {
                      const percentage = (count / analytics.totalResponses) * 100
                      return (
                        <div key={dept} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm font-medium">{dept}</span>
                            <div className="text-right">
                              <span className="text-white font-medium">{count}</span>
                              <span className="text-gray-400 text-sm ml-2">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Feature Usage */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-teal-400" />
                  <CardTitle>Feature Usage</CardTitle>
                </div>
                <CardDescription>Most used platform features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.userEngagement.featureUsage)
                    .sort(([, a], [, b]) => b - a)
                    .map(([feature, count], index) => {
                      const maxCount = Math.max(...Object.values(analytics.userEngagement.featureUsage))
                      const percentage = (count / maxCount) * 100
                      
                      return (
                        <div key={feature} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm font-medium">{feature}</span>
                            <span className="text-white font-medium">{count}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jtbd" className="space-y-6">
          <JTBDAnalyticsChart 
            forces={analytics.jtbdForces}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="voice" className="space-y-6">
          <VoiceAnalyticsChart 
            voiceAnalytics={analytics.voiceAnalytics}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <UserEngagementChart 
            engagementData={analytics.userEngagement}
            className="w-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}