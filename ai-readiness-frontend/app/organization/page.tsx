'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatsCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
  TrendingUp,
  Clock,
  CheckCircle,
  Eye,
  Settings,
  Shield,
  Key,
  AlertCircle,
  Globe
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface OrganizationOverview {
  id: string
  name: string
  industry?: string
  size?: string
  website?: string
  description?: string
  stats: {
    totalSurveys: number
    activeSurveys: number
    totalResponses: number
    totalMembers: number
    apiKeysActive: number
    lastActivity: string
  }
  recentActivity: Array<{
    id: string
    action: string
    user: string
    timestamp: string
    type: 'survey' | 'member' | 'setting'
  }>
}

export default function OrganizationOverviewPage() {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<OrganizationOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.organizationId) {
      loadOrganizationOverview()
    }
  }, [user])

  const loadOrganizationOverview = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/organization/${user?.organizationId}/overview`)
      
      if (response.ok) {
        const data = await response.json()
        setOrganization(data)
      } else {
        throw new Error('Failed to load organization overview')
      }
    } catch (error) {
      console.error('Failed to load organization overview:', error)
      setError(error instanceof Error ? error.message : 'Failed to load organization data')
      
      // Fallback mock data for development
      setOrganization({
        id: user?.organizationId || '',
        name: 'Your Organization',
        industry: 'Technology',
        size: '11-50',
        website: 'https://example.com',
        description: 'A forward-thinking organization focused on AI readiness.',
        stats: {
          totalSurveys: 12,
          activeSurveys: 3,
          totalResponses: 1247,
          totalMembers: 28,
          apiKeysActive: 2,
          lastActivity: '2 hours ago'
        },
        recentActivity: [
          {
            id: '1',
            action: 'Created new survey: Q4 AI Readiness Assessment',
            user: 'John Doe',
            timestamp: '2 hours ago',
            type: 'survey'
          },
          {
            id: '2', 
            action: 'Added new team member: Sarah Johnson',
            user: 'Admin',
            timestamp: '1 day ago',
            type: 'member'
          },
          {
            id: '3',
            action: 'Updated security settings',
            user: 'Admin',
            timestamp: '3 days ago',
            type: 'setting'
          }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (error && !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Failed to Load Organization</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button onClick={loadOrganizationOverview}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Organization Found</h3>
            <p className="text-gray-400">You don't appear to be a member of any organization.</p>
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
          <h1 className="text-3xl font-bold text-white">Organization Overview</h1>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-gray-400">Welcome to {organization.name}</p>
            {organization.industry && (
              <Badge variant="outline" className="text-teal-400 border-teal-400">
                {organization.industry}
              </Badge>
            )}
            {organization.size && (
              <Badge variant="outline" className="text-purple-400 border-purple-400">
                {organization.size} employees
              </Badge>
            )}
          </div>
        </div>
        {user?.role === 'org_admin' && (
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href="/organization/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        )}
      </div>

      {/* Organization Info Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-lg bg-gradient-to-r from-teal-500 to-purple-500">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-2xl">{organization.name}</CardTitle>
                {organization.description && (
                  <CardDescription className="mt-1">
                    {organization.description}
                  </CardDescription>
                )}
                {organization.website && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <a 
                      href={organization.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:text-teal-300 text-sm underline"
                    >
                      {organization.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
            <Badge className="bg-green-600 text-white">
              <CheckCircle className="h-4 w-4 mr-1" />
              Active
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Surveys"
          value={organization.stats.totalSurveys}
          description="All surveys created"
          icon={FileText}
          trend={{ value: 12, label: 'vs last month', direction: 'up' }}
        />
        <StatsCard
          title="Active Surveys" 
          value={organization.stats.activeSurveys}
          description="Currently running"
          icon={CheckCircle}
          trend={{ value: 0, label: 'no change', direction: 'neutral' }}
        />
        <StatsCard
          title="Total Responses"
          value={organization.stats.totalResponses.toLocaleString()}
          description="Across all surveys"
          icon={BarChart3}
          trend={{ value: 23, label: 'vs last month', direction: 'up' }}
        />
        <StatsCard
          title="Team Members"
          value={organization.stats.totalMembers}
          description="Active users"
          icon={Users}
          trend={{ value: 8, label: 'vs last month', direction: 'up' }}
        />
        <StatsCard
          title="API Keys"
          value={organization.stats.apiKeysActive}
          description="Active integrations"
          icon={Key}
          trend={{ value: 0, label: 'no change', direction: 'neutral' }}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-2 glass-card p-1">
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Recent Activity</span>
          </TabsTrigger>
          <TabsTrigger value="quick-actions" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Quick Actions</span>
          </TabsTrigger>
        </TabsList>

        {/* Recent Activity */}
        <TabsContent value="activity" className="mt-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
              <CardDescription>
                Latest actions in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {organization.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 rounded-lg bg-white/5">
                    <div className="flex-shrink-0 mt-1">
                      {activity.type === 'survey' && (
                        <FileText className="h-5 w-5 text-blue-400" />
                      )}
                      {activity.type === 'member' && (
                        <Users className="h-5 w-5 text-green-400" />
                      )}
                      {activity.type === 'setting' && (
                        <Settings className="h-5 w-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {activity.action}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">{activity.user}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">{activity.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Actions */}
        <TabsContent value="quick-actions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href="/organization/surveys" className="block">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <FileText className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Create Survey</h3>
                      <p className="text-gray-400 text-sm">Start a new assessment</p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href="/organization/analytics" className="block">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <BarChart3 className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">View Analytics</h3>
                      <p className="text-gray-400 text-sm">Analyze survey results</p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {user?.role === 'org_admin' && (
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <Link href="/organization/members" className="block">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-purple-500/20">
                        <Users className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Manage Members</h3>
                        <p className="text-gray-400 text-sm">Add or remove users</p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {user?.role === 'org_admin' && (
              <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <Link href="/organization/security" className="block">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-red-500/20">
                        <Shield className="h-6 w-6 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">Security Settings</h3>
                        <p className="text-gray-400 text-sm">Manage access & security</p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card hover:bg-white/10 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href="/admin/exports" className="block">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-lg bg-teal-500/20">
                      <Eye className="h-6 w-6 text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">Export Data</h3>
                      <p className="text-gray-400 text-sm">Download reports</p>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}