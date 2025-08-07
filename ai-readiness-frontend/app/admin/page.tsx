'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataVisualization, ProgressStoryteller, AchievementSystem } from '@/components/visual-story'
import { 
  Users, 
  FileText, 
  Building2, 
  TrendingUp,
  Clock,
  CheckCircle,
  BarChart3,
  Brain,
  Award,
  Sparkles,
  Eye,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { fetchDashboardStats, type DashboardStats, type ActivityItem } from '@/lib/services/admin'
import { useActivityLogsRealtime } from '@/lib/hooks/useRealtimeUpdates'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    totalUsers: 0,
    organizationCount: 0,
    completionRate: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch real dashboard stats from Supabase
    const loadDashboardStats = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!user) {
          throw new Error('User not authenticated')
        }

        const userRole = user.role as string
        const organizationId = user.organizationId

        const dashboardStats = await fetchDashboardStats(userRole, organizationId)
        setStats(dashboardStats)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
        
        // Fallback to empty state rather than mock data
        setStats({
          totalSurveys: 0,
          activeSurveys: 0,
          totalResponses: 0,
          totalUsers: 0,
          organizationCount: 0,
          completionRate: 0,
          recentActivity: []
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardStats()
  }, [user])

  // Set up real-time updates for activity logs
  useActivityLogsRealtime(
    (newActivity) => {
      // Add the new activity to the beginning of the list
      setStats(prev => ({
        ...prev,
        recentActivity: [
          {
            id: newActivity.id,
            type: newActivity.action.includes('survey') ? 'survey_created' :
                  newActivity.action.includes('response') ? 'survey_completed' :
                  'user_registered',
            description: newActivity.action.replace('_', ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
            timestamp: 'Just now',
            user: 'Unknown' // Would need to join with profile data
          },
          ...prev.recentActivity.slice(0, 9) // Keep only the most recent 10
        ]
      }))
    },
    user?.organizationId,
    !!user // Enable only when user is loaded
  )

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend,
    href 
  }: {
    title: string
    value: string | number
    description: string
    icon: React.ComponentType<{ className?: string }>
    trend?: 'up' | 'down' | 'neutral'
    href?: string
  }) => {
    const CardWrapper = href ? Link : 'div'
    
    return (
      <CardWrapper href={href || ''} className={href ? 'block' : ''}>
        <Card className="glass-card hover:bg-white/5 transition-all duration-200 cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
            <Icon className="h-4 w-4 text-teal-400" />
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
      </CardWrapper>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Dashboard</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Welcome back, {user?.profile?.firstName || user?.email}</p>
        </div>
        <Badge variant="outline" className="text-teal-400 border-teal-400">
          {(user?.role as string) === 'system_admin' ? 'System Admin' : 'Organization Admin'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Surveys"
          value={stats.totalSurveys}
          description="All surveys created"
          icon={FileText}
          trend="up"
          href="/admin/surveys"
        />
        <StatCard
          title="Active Surveys"
          value={stats.activeSurveys}
          description="Currently running"
          icon={CheckCircle}
          trend="neutral"
          href="/admin/surveys?status=active"
        />
        <StatCard
          title="Total Responses"
          value={stats.totalResponses.toLocaleString()}
          description="Across all surveys"
          icon={BarChart3}
          trend="up"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          description="Registered users"
          icon={Users}
          trend="up"
          href="/admin/users"
        />
        {user?.role === 'system_admin' && (
          <StatCard
            title="Organizations"
            value={stats.organizationCount}
            description="Active organizations"
            icon={Building2}
            trend="up"
            href="/admin/organizations"
          />
        )}
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          description="Average across surveys"
          icon={TrendingUp}
          trend="up"
        />
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto flex-col space-y-2 p-4">
              <Link href="/admin/surveys/new">
                <FileText className="h-6 w-6" />
                <span>Create Survey</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col space-y-2 p-4">
              <Link href="/admin/exports">
                <TrendingUp className="h-6 w-6" />
                <span>Export Data</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col space-y-2 p-4">
              <Link href="/admin/analytics">
                <BarChart3 className="h-6 w-6" />
                <span>View Analytics</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto flex-col space-y-2 p-4">
              <Link href="/admin/users">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visual Storytelling Dashboard */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">AI Readiness Insights</CardTitle>
                <CardDescription>Visual storytelling powered analytics</CardDescription>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/visual-story-demo">
                <Eye className="h-4 w-4 mr-2" />
                View Full Demo
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="analytics" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Progress</span>
              </TabsTrigger>
              <TabsTrigger value="achievements" className="flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>Achievements</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="analytics" className="mt-6">
              <DataVisualization className="min-h-[400px]" />
            </TabsContent>
            
            <TabsContent value="progress" className="mt-6">
              <ProgressStoryteller 
                currentChapter="growth" 
                showNarrative={true}
                interactive={false}
                className="min-h-[400px]" 
              />
            </TabsContent>
            
            <TabsContent value="achievements" className="mt-6">
              <AchievementSystem 
                showMilestones={false}
                className="min-h-[400px]" 
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription>Latest actions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-white/5">
                <div className="flex-shrink-0">
                  {activity.type === 'survey_created' && (
                    <FileText className="h-5 w-5 text-blue-400" />
                  )}
                  {activity.type === 'survey_completed' && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {activity.type === 'user_registered' && (
                    <Users className="h-5 w-5 text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{activity.description}</p>
                  {activity.user && (
                    <p className="text-xs text-gray-400">{activity.user}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-400">{activity.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}