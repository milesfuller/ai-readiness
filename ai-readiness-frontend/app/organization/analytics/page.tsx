'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Download,
  Building2,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import {
  getOrganizationAnalytics,
  getAvailableDepartments,
  exportAnalyticsData,
  type OrganizationAnalytics,
  type AnalyticsFilters
} from '@/lib/services/analytics-service'
import {
  LineChart,
  Line,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { DateRange } from 'react-day-picker'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function OrganizationAnalyticsPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<OrganizationAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<string[]>([])
  const [exportLoading, setExportLoading] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState<AnalyticsFilters>({})
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')

  useEffect(() => {
    if (!user?.organizationId) return

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load departments for filter
        const depts = await getAvailableDepartments(user.organizationId!)
        setDepartments(depts)

        // Build filters
        const analyticsFilters: AnalyticsFilters = {}
        if (dateRange?.from && dateRange?.to) {
          analyticsFilters.dateRange = {
            start: dateRange.from.toISOString(),
            end: dateRange.to.toISOString()
          }
        }
        if (selectedDepartment) {
          analyticsFilters.department = selectedDepartment
        }

        const data = await getOrganizationAnalytics(user.organizationId!, analyticsFilters)
        setAnalytics(data)

      } catch (error) {
        console.error('Failed to load analytics:', error)
        setError(error instanceof Error ? error.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [user?.organizationId, dateRange, selectedDepartment])

  const handleExport = async (format: 'csv' | 'json') => {
    if (!user?.organizationId || !analytics) return

    try {
      setExportLoading(true)
      
      const analyticsFilters: AnalyticsFilters = {}
      if (dateRange?.from && dateRange?.to) {
        analyticsFilters.dateRange = {
          start: dateRange.from.toISOString(),
          end: dateRange.to.toISOString()
        }
      }
      if (selectedDepartment) {
        analyticsFilters.department = selectedDepartment
      }

      const blob = await exportAnalyticsData(user.organizationId, format, analyticsFilters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `organization-analytics.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExportLoading(false)
    }
  }

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend,
    color = 'teal'
  }: {
    title: string
    value: string | number
    description: string
    icon: React.ComponentType<{ className?: string }>
    trend?: 'up' | 'down' | 'neutral'
    color?: string
  }) => (
    <Card className="glass-card hover:bg-white/5 transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-400`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="flex items-center space-x-2">
          <p className="text-xs text-gray-400">{description}</p>
          {trend && (
            <TrendingUp className={`h-3 w-3 ${
              trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 'text-gray-400'
            }`} />
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="animate-spin h-8 w-8 text-teal-400" />
          <span className="text-gray-300">Loading analytics...</span>
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
  const departmentChartData = Object.entries(analytics.departmentBreakdown).map(([dept, count]) => ({
    department: dept,
    responses: count
  }))

  const jtbdChartData = [
    { force: 'Push', value: analytics.jtbdForces.push, fullMark: 10 },
    { force: 'Pull', value: analytics.jtbdForces.pull, fullMark: 10 },
    { force: 'Habit', value: analytics.jtbdForces.habit, fullMark: 10 },
    { force: 'Anxiety', value: analytics.jtbdForces.anxiety, fullMark: 10 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Organization Analytics</h1>
          <p className="text-gray-400">Comprehensive insights from survey responses</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            variant="outline"
            size="sm"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('json')}
            disabled={exportLoading}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Filters</CardTitle>
          <CardDescription>Filter analytics data by date range and department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-gray-300 mb-2 block">Date Range</label>
              <DatePickerWithRange
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-gray-300 mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Surveys"
          value={analytics.totalSurveys}
          description="Surveys created"
          icon={BarChart3}
          trend="neutral"
        />
        <StatCard
          title="Total Responses"
          value={analytics.totalResponses.toLocaleString()}
          description="Survey responses"
          icon={CheckCircle}
          trend="up"
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics.completionRate}%`}
          description="Survey completion"
          icon={Target}
          trend={analytics.completionRate > 70 ? 'up' : 'down'}
          color={analytics.completionRate > 70 ? 'green' : 'orange'}
        />
        <StatCard
          title="Avg. Completion Time"
          value={`${Math.floor(analytics.averageCompletionTime / 60)}m ${analytics.averageCompletionTime % 60}s`}
          description="Time per survey"
          icon={Clock}
          trend="neutral"
          color="blue"
        />
        <StatCard
          title="Participation Rate"
          value={`${analytics.participationRate}%`}
          description="Users who responded"
          icon={Users}
          trend={analytics.participationRate > 50 ? 'up' : 'down'}
          color={analytics.participationRate > 50 ? 'green' : 'orange'}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="jtbd">JTBD Analysis</TabsTrigger>
          <TabsTrigger value="surveys">Survey Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Response Trends */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Response Trends</CardTitle>
              <CardDescription>Survey responses over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.responsesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#F9FAFB' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="responses" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Pain Points */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Top Pain Points</CardTitle>
              <CardDescription>Most commonly mentioned issues in responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPainPoints.length > 0 ? (
                  analytics.topPainPoints.map((painPoint, index) => (
                    <div key={painPoint} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center`}>
                          <span className="text-sm font-medium text-red-400">{index + 1}</span>
                        </div>
                        <span className="text-white font-medium capitalize">{painPoint}</span>
                      </div>
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        High Impact
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-center py-4">No pain points identified yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Department Breakdown</CardTitle>
              <CardDescription>Response distribution by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="department" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#F9FAFB' }}
                      />
                      <Bar dataKey="responses" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Pie Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="responses"
                      >
                        {departmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department Stats */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departmentChartData.map((dept) => (
                  <div key={dept.department} className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white">{dept.department}</h4>
                      <Building2 className="h-4 w-4 text-teal-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{dept.responses}</div>
                    <div className="text-xs text-gray-400">
                      {analytics.totalResponses > 0 ? 
                        `${Math.round((dept.responses / analytics.totalResponses) * 100)}% of total` :
                        '0% of total'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jtbd" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Jobs-to-be-Done Forces Analysis</CardTitle>
              <CardDescription>Understanding the forces driving adoption and resistance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={jtbdChartData}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis dataKey="force" tick={{ fill: '#9CA3AF' }} />
                      <PolarRadiusAxis 
                        domain={[0, 10]} 
                        tick={{ fill: '#9CA3AF' }}
                        angle={90}
                      />
                      <Radar
                        name="JTBD Forces"
                        dataKey="value"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Force Explanations */}
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-400/10 border border-green-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-400">Pull Forces</h4>
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        {analytics.jtbdForces.pull.toFixed(1)}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">Benefits and outcomes that attract users to new solutions</p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-400/10 border border-red-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-red-400">Push Forces</h4>
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        {analytics.jtbdForces.push.toFixed(1)}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">Problems and frustrations with current solutions</p>
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-yellow-400">Habit Forces</h4>
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        {analytics.jtbdForces.habit.toFixed(1)}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">Attachment to current ways of working</p>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-400/10 border border-orange-400/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-orange-400">Anxiety Forces</h4>
                      <Badge variant="outline" className="text-orange-400 border-orange-400">
                        {analytics.jtbdForces.anxiety.toFixed(1)}/10
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-300">Concerns and fears about adopting new solutions</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Survey Performance</CardTitle>
              <CardDescription>Individual survey metrics and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.surveyPerformance.length > 0 ? (
                  analytics.surveyPerformance.map((survey) => (
                    <div key={survey.surveyId} className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{survey.surveyTitle}</h4>
                          <p className="text-sm text-gray-400">{survey.responseCount} responses</p>
                        </div>
                        <div className="flex space-x-2">
                          <Badge variant="outline" className="text-teal-400 border-teal-400">
                            {survey.completionRate}% completion
                          </Badge>
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {Math.floor(survey.averageTime / 60)}m {survey.averageTime % 60}s avg
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-400">{survey.jtbdScores.pull.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Pull</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-400">{survey.jtbdScores.push.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Push</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-400">{survey.jtbdScores.habit.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Habit</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-400">{survey.jtbdScores.anxiety.toFixed(1)}</div>
                          <div className="text-xs text-gray-400">Anxiety</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No survey data available</p>
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