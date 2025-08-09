'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatsCard } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { 
  FileText, 
  Calendar, 
  Clock, 
  TrendingUp,
  Download,
  Share2,
  Plus,
  Filter,
  Search,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Users,
  Target,
  Database,
  Eye,
  Edit,
  Trash2,
  PlayCircle,
  PauseCircle,
  Settings,
  History,
  Layout
} from 'lucide-react'

// Import report components
import { ReportGenerator } from '@/components/reports/ReportGenerator'
import { ReportsList } from '@/components/reports/ReportsList'
import { ScheduleManager } from '@/components/reports/ScheduleManager'
import { TemplateSelector } from '@/components/reports/TemplateSelector'

interface DashboardStats {
  totalReports: number
  scheduledReports: number
  successRate: number
  lastGenerated: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  variant: 'default' | 'secondary' | 'outline'
}

export default function ReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('generate')

  // Mock data - in real app, this would come from API
  const dashboardStats: DashboardStats = {
    totalReports: 142,
    scheduledReports: 8,
    successRate: 94.2,
    lastGenerated: '2 hours ago'
  }

  const quickActions: QuickAction[] = [
    {
      id: 'quick-assessment',
      title: 'Quick Assessment Report',
      description: 'Generate a rapid AI readiness overview',
      icon: Zap,
      action: () => {
        // Find and select quick assessment template
        setActiveTab('generate')
        // This would trigger template selection
      },
      variant: 'default'
    },
    {
      id: 'schedule-monthly',
      title: 'Schedule Monthly Report',
      description: 'Set up automated monthly reporting',
      icon: Calendar,
      action: () => setActiveTab('scheduled'),
      variant: 'secondary'
    },
    {
      id: 'view-trends',
      title: 'View Progress Trends',
      description: 'Analyze improvement over time',
      icon: TrendingUp,
      action: () => setActiveTab('history'),
      variant: 'outline'
    },
    {
      id: 'customize-template',
      title: 'Customize Template',
      description: 'Create or modify report templates',
      icon: Layout,
      action: () => setActiveTab('templates'),
      variant: 'outline'
    }
  ]

  const recentActivity = [
    {
      id: '1',
      type: 'generated',
      title: 'Comprehensive AI Assessment',
      timestamp: '2 hours ago',
      status: 'completed',
      user: 'John Doe'
    },
    {
      id: '2',
      type: 'scheduled',
      title: 'Monthly Compliance Report',
      timestamp: '1 day ago',
      status: 'active',
      user: 'System'
    },
    {
      id: '3',
      type: 'failed',
      title: 'Strategy Roadmap',
      timestamp: '2 days ago',
      status: 'failed',
      user: 'Jane Smith'
    }
  ]

  const getActivityIcon = (type: string, status: string) => {
    if (status === 'failed') return AlertCircle
    switch (type) {
      case 'generated': return FileText
      case 'scheduled': return Calendar
      case 'failed': return AlertCircle
      default: return FileText
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500'
      case 'active': return 'text-blue-500'
      case 'failed': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Reports Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Generate, schedule, and manage your AI readiness reports
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share Dashboard
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Reports"
          value={dashboardStats.totalReports}
          description="Reports generated"
          icon={FileText}
          trend={{
            value: 12,
            label: 'from last month',
            direction: 'up'
          }}
        />
        <StatsCard
          title="Scheduled Reports"
          value={dashboardStats.scheduledReports}
          description="Active schedules"
          icon={Calendar}
        />
        <StatsCard
          title="Success Rate"
          value={`${dashboardStats.successRate}%`}
          description="Generation success"
          icon={CheckCircle2}
          trend={{
            value: 2.1,
            label: 'improvement',
            direction: 'up'
          }}
        />
        <StatsCard
          title="Last Generated"
          value={dashboardStats.lastGenerated}
          description="Most recent report"
          icon={Clock}
        />
      </div>

      {/* Quick Actions */}
      <Card variant="glass" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks to get you started quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.id}
                  variant={action.variant}
                  className="h-auto p-4 flex flex-col items-center gap-2 text-center"
                  onClick={action.action}
                >
                  <Icon className="h-6 w-6" />
                  <div>
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {action.description}
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-500" />
                Generate New Report
              </CardTitle>
              <CardDescription>
                Create a comprehensive AI readiness report using our professional templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportGenerator />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search report history..."
                leftIcon={Search}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          <ReportsList />
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Scheduled Reports</h3>
              <p className="text-sm text-muted-foreground">
                Manage your automated report generation schedules
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>
          
          <ScheduleManager />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <TemplateSelector
            onTemplateSelect={setSelectedTemplate}
            selectedTemplate={selectedTemplate}
          />
        </TabsContent>
      </Tabs>

      {/* Recent Activity Sidebar */}
      <Card variant="glass" className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-teal-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type, activity.status)
              const statusColor = getStatusColor(activity.status)
              
              return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-teal-500/30 transition-colors">
                  <div className={cn("p-2 rounded-lg", statusColor.includes('green') ? 'bg-green-500/10' : statusColor.includes('red') ? 'bg-red-500/10' : 'bg-blue-500/10')}>
                    <Icon className={cn("h-4 w-4", statusColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'generated' ? 'Generated by' : activity.type === 'scheduled' ? 'Scheduled by' : 'Failed for'} {activity.user}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                  <Badge 
                    variant={activity.status === 'completed' ? 'default' : activity.status === 'failed' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {activity.status}
                  </Badge>
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button variant="ghost" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}