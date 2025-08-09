'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Target,
  Download,
  Filter,
  Calendar,
  PieChart,
  Activity
} from 'lucide-react'
import { Analytics, JTBDForces } from '@/lib/types'
import { ExportDialog } from '@/components/admin/export-dialog'
import { exportService } from '@/lib/services/export-service'

interface AnalyticsDashboardProps {
  analytics: Analytics
  organizationId?: string
  surveyId?: string
  className?: string
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = React.memo(({
  analytics,
  organizationId,
  surveyId,
  className = ''
}) => {
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const handleExport = async (options: any) => {
    setLoading(true)
    try {
      if (options.format === 'pdf') {
        let blob: Blob
        if (surveyId) {
          blob = await exportService.generateSurveyPDF(surveyId, options)
          exportService.downloadFile(blob, `survey-report-${surveyId}.pdf`, 'application/pdf')
        } else if (organizationId) {
          blob = await exportService.generateOrganizationReport(organizationId, options)
          exportService.downloadFile(blob, `org-report-${organizationId}.pdf`, 'application/pdf')
        }
      } else {
        const result = await exportService.exportData(options)
        if (result instanceof Blob) {
          const extension = options.format === 'csv' ? 'csv' : 'json'
          const mimeType = options.format === 'csv' ? 'text/csv' : 'application/json'
          exportService.downloadFile(result, `export-${Date.now()}.${extension}`, mimeType)
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
      // TODO: Show toast notification
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
  }

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-400'
    if (rate >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getJTBDColor = (value: number): string => {
    if (value >= 4) return 'bg-green-500'
    if (value >= 3) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400">Insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <ExportDialog
            title="Export Analytics"
            description="Export analytics data and reports"
            onExport={handleExport}
          >
            <Button variant="outline" size="sm" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Exporting...' : 'Export'}
            </Button>
          </ExportDialog>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Responses</p>
              <p className="text-2xl font-bold text-white">{analytics.totalResponses}</p>
            </div>
            <Users className="h-8 w-8 text-teal-400" />
          </div>
          <div className="mt-4">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% vs last month
            </Badge>
          </div>
        </Card>

        <Card className="glass-card border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completion Rate</p>
              <p className={`text-2xl font-bold ${getCompletionColor(analytics.completionRate)}`}>
                {analytics.completionRate.toFixed(1)}%
              </p>
            </div>
            <Target className="h-8 w-8 text-teal-400" />
          </div>
          <div className="mt-4">
            <Progress 
              value={analytics.completionRate} 
              className="h-2"
            />
          </div>
        </Card>

        <Card className="glass-card border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg. Time</p>
              <p className="text-2xl font-bold text-white">
                {formatTime(analytics.averageTime)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-teal-400" />
          </div>
          <div className="mt-4">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              -5% vs target
            </Badge>
          </div>
        </Card>

        <Card className="glass-card border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Top Issues</p>
              <p className="text-2xl font-bold text-white">{analytics.topIssues.length}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-teal-400" />
          </div>
          <div className="mt-4">
            <Badge variant="outline" className="text-xs">
              Identified areas
            </Badge>
          </div>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-white/5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="jtbd">JTBD Analysis</TabsTrigger>
          <TabsTrigger value="issues">Top Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <Card className="glass-card border-gray-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Department Breakdown</h3>
                <PieChart className="h-5 w-5 text-teal-400" />
              </div>
              <div className="space-y-3">
                {Object.entries(analytics.departmentBreakdown).map(([dept, count]) => {
                  const percentage = (count / analytics.totalResponses) * 100
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-sm">{dept}</span>
                        <span className="text-white font-medium">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* JTBD Quick View */}
            <Card className="glass-card border-gray-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">JTBD Forces</h3>
                <Target className="h-5 w-5 text-teal-400" />
              </div>
              <div className="space-y-4">
                {Object.entries(analytics.jtbdAnalysis).map(([force, value]) => (
                  <div key={force} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 capitalize">{force}</span>
                      <span className="text-white font-medium">{value.toFixed(1)}/5</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getJTBDColor(value)}`}
                        style={{ width: `${(value / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card className="glass-card border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Department Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analytics.departmentBreakdown).map(([dept, count]) => {
                const percentage = (count / analytics.totalResponses) * 100
                return (
                  <Card key={dept} className="bg-white/5 border-gray-600 p-4">
                    <div className="text-center">
                      <h4 className="text-white font-medium mb-2">{dept}</h4>
                      <div className="text-2xl font-bold text-teal-400 mb-1">{count}</div>
                      <div className="text-gray-400 text-sm">{percentage.toFixed(1)}% of total</div>
                      <Progress value={percentage} className="h-2 mt-3" />
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="jtbd" className="space-y-4">
          <Card className="glass-card border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Jobs-to-be-Done Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(analytics.jtbdAnalysis).map(([force, value]) => {
                const description = {
                  push: 'Factors pushing users away from current solutions',
                  pull: 'Factors attracting users to new solutions',
                  habit: 'Existing habits that resist change',
                  anxiety: 'Concerns about adopting new solutions'
                }[force] || ''

                return (
                  <Card key={force} className="bg-white/5 border-gray-600 p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium capitalize">{force} Forces</h4>
                        <Badge variant="outline" className={`${getJTBDColor(value)} text-white`}>
                          {value.toFixed(1)}/5
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{description}</p>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${getJTBDColor(value)} transition-all duration-500`}
                          style={{ width: `${(value / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card className="glass-card border-gray-600 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Top Issues Identified</h3>
            <div className="space-y-3">
              {analytics.topIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="text-white">{issue}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">High Priority</Badge>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
})

AnalyticsDashboard.displayName = 'AnalyticsDashboard'

export { AnalyticsDashboard }
export default AnalyticsDashboard