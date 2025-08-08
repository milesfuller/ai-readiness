'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Clock, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  LineChart as LineChartIcon,
  Calendar,
  Zap,
  Eye,
  MousePointer,
  UserCheck,
  Target
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts'

interface UserEngagement {
  dailyActiveUsers: Array<{ date: string; users: number }>
  sessionDuration: Array<{ date: string; duration: number }>
  featureUsage: Record<string, number>
}

interface UserEngagementChartProps {
  engagementData: UserEngagement
  className?: string
  timeRange?: '7d' | '30d' | '90d'
  onTimeRangeChange?: (range: '7d' | '30d' | '90d') => void
}

export const UserEngagementChart: React.FC<UserEngagementChartProps> = ({
  engagementData,
  className = '',
  timeRange = '30d',
  onTimeRangeChange
}) => {
  const [activeMetric, setActiveMetric] = useState('users')
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area')

  // Generate additional mock engagement data
  const generateDetailedEngagementData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      activeUsers: Math.floor(Math.random() * 40) + 50,
      newUsers: Math.floor(Math.random() * 15) + 5,
      returningUsers: Math.floor(Math.random() * 35) + 35,
      sessionDuration: Math.floor(Math.random() * 300) + 180,
      pageViews: Math.floor(Math.random() * 200) + 100,
      bounceRate: Math.random() * 30 + 20,
      conversionRate: Math.random() * 10 + 2
    }))
  }

  const generateHourlyData = () => {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      users: Math.floor(Math.random() * 50) + 10,
      activity: Math.floor(Math.random() * 100) + 20
    }))
  }

  const generateCohortData = () => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    return weeks.map(week => ({
      week,
      retention: Math.random() * 40 + 60,
      newUsers: Math.floor(Math.random() * 50) + 30,
      churned: Math.floor(Math.random() * 20) + 5
    }))
  }

  const detailedData = generateDetailedEngagementData()
  const hourlyData = generateHourlyData()
  const cohortData = generateCohortData()

  // Prepare feature usage data for charts
  const featureUsageData = Object.entries(engagementData.featureUsage).map(([feature, usage]) => ({
    name: feature,
    usage,
    percentage: (usage / Math.max(...Object.values(engagementData.featureUsage))) * 100
  })).sort((a, b) => b.usage - a.usage)

  // Calculate key metrics
  const totalUsers = engagementData.dailyActiveUsers.reduce((sum, day) => sum + day.users, 0)
  const avgDailyUsers = Math.round(totalUsers / engagementData.dailyActiveUsers.length)
  const avgSessionDuration = Math.round(
    engagementData.sessionDuration.reduce((sum, day) => sum + day.duration, 0) / engagementData.sessionDuration.length
  )
  
  // Calculate trends
  const recentUsers = engagementData.dailyActiveUsers.slice(-7).reduce((sum, day) => sum + day.users, 0) / 7
  const previousUsers = engagementData.dailyActiveUsers.slice(-14, -7).reduce((sum, day) => sum + day.users, 0) / 7
  const userGrowth = ((recentUsers - previousUsers) / previousUsers * 100)

  const COLORS = ['#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#f97316', '#ec4899']

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-300">
                {entry.dataKey}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = (data: any[], dataKey: string) => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="#14b8a6"
                strokeWidth={3}
                dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="#14b8a6"
                fill="url(#colorGradient)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        )
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey={dataKey} fill="#14b8a6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Daily Users</p>
                <p className="text-2xl font-bold text-teal-400">{avgDailyUsers}</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                <Users className="h-6 w-6 text-teal-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              {userGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
              )}
              <span className={userGrowth >= 0 ? "text-green-400" : "text-red-400"}>
                {Math.abs(userGrowth).toFixed(1)}%
              </span>
              <span className="text-gray-400 ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Avg Session</p>
                <p className="text-2xl font-bold text-purple-400">
                  {Math.floor(avgSessionDuration / 60)}m {avgSessionDuration % 60}s
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Activity className="h-3 w-3 text-blue-400 mr-1" />
              <span className="text-blue-400">+8.5%</span>
              <span className="text-gray-400 ml-1">engagement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Feature Adoption</p>
                <p className="text-2xl font-bold text-green-400">
                  {Object.keys(engagementData.featureUsage).length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Target className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Zap className="h-3 w-3 text-yellow-400 mr-1" />
              <span className="text-yellow-400">87.3%</span>
              <span className="text-gray-400 ml-1">active rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:scale-105 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Retention Rate</p>
                <p className="text-2xl font-bold text-orange-400">76.4%</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <UserCheck className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-green-400">+3.2%</span>
              <span className="text-gray-400 ml-1">vs target</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Section */}
      <Tabs defaultValue="trends" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="trends" className="flex items-center space-x-2">
              <LineChartIcon className="h-4 w-4" />
              <span>Trends</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Features</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Behavior</span>
            </TabsTrigger>
            <TabsTrigger value="cohorts" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Cohorts</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="90d">90d</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Active Users */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-teal-400" />
                    <span>Daily Active Users</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-teal-400 border-teal-400/50">
                    {timeRange}
                  </Badge>
                </div>
                <CardDescription>User activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {renderChart(engagementData.dailyActiveUsers, 'users')}
                </div>
              </CardContent>
            </Card>

            {/* Session Duration */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-teal-400" />
                  <span>Session Duration</span>
                </CardTitle>
                <CardDescription>Average time spent per session</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {renderChart(engagementData.sessionDuration, 'duration')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Multi-metric Overview */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-teal-400" />
                <span>Comprehensive User Metrics</span>
              </CardTitle>
              <CardDescription>Multiple engagement metrics in one view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={detailedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="activeUsers" fill="#14b8a6" radius={[2, 2, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="sessionDuration" stroke="#8b5cf6" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#f59e0b" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Usage Bar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-teal-400" />
                  <span>Feature Usage</span>
                </CardTitle>
                <CardDescription>Most popular platform features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureUsageData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={120} fontSize={11} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="usage" radius={[0, 4, 4, 0]}>
                        {featureUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Feature Adoption Details */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Feature Adoption Details</CardTitle>
                <CardDescription>Detailed usage statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {featureUsageData.slice(0, 6).map((feature, index) => (
                  <div key={feature.name} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{feature.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline"
                          style={{ 
                            color: COLORS[index % COLORS.length], 
                            borderColor: COLORS[index % COLORS.length] + '50'
                          }}
                        >
                          {feature.usage}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${feature.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Activity */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-teal-400" />
                  <span>Hourly Activity Pattern</span>
                </CardTitle>
                <CardDescription>User activity throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={10} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#8b5cf6"
                        fill="url(#purpleGradient)"
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Peak Activity Insights */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Peak Activity Insights</CardTitle>
                <CardDescription>Optimal engagement times</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <h4 className="font-semibold text-teal-400 mb-2">Peak Hours</h4>
                  <p className="text-sm text-gray-300 mb-2">Highest activity between 9:00 - 11:00 and 14:00 - 16:00</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-teal-400 border-teal-400/50">Morning: 9-11 AM</Badge>
                    <Badge variant="outline" className="text-teal-400 border-teal-400/50">Afternoon: 2-4 PM</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <h4 className="font-semibold text-purple-400 mb-2">Optimal Scheduling</h4>
                  <p className="text-sm text-gray-300">
                    Schedule important notifications and updates during peak hours for maximum engagement.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <h4 className="font-semibold text-orange-400 mb-2">Low Activity Periods</h4>
                  <p className="text-sm text-gray-300">
                    Consider system maintenance or batch processing during 22:00 - 06:00 window.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-teal-400" />
                <span>User Cohort Analysis</span>
              </CardTitle>
              <CardDescription>User retention and lifecycle patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Retention Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cohortData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="newUsers" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      <Line type="monotone" dataKey="retention" stroke="#14b8a6" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Cohort Insights */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <h4 className="font-semibold text-green-400 mb-2">Strong Retention</h4>
                    <p className="text-sm text-gray-300">
                      Week 1 retention at 76% indicates strong initial user experience and value proposition.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h4 className="font-semibold text-blue-400 mb-2">Growth Opportunity</h4>
                    <p className="text-sm text-gray-300">
                      Focus on improving Week 2-3 retention through enhanced onboarding and feature discovery.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <div className="text-2xl font-bold text-teal-400">68%</div>
                      <div className="text-xs text-gray-400">4-week retention</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <div className="text-2xl font-bold text-purple-400">12d</div>
                      <div className="text-xs text-gray-400">Avg lifecycle</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default UserEngagementChart