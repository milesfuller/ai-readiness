'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { 
  Download, 
  FileText, 
  Table, 
  BarChart3,
  Settings,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface ExportOptions {
  format: 'csv' | 'json' | 'pdf'
  includePersonalData: boolean
  dateRange: {
    start: string
    end: string
  }
  filters: {
    departments?: string[]
    roles?: string[]
    completedOnly?: boolean
  }
}

interface ExportJob {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  download_url?: string
  error_message?: string
  options: ExportOptions
}

export default function OrganizationExport() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includePersonalData: false,
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    filters: {
      completedOnly: true
    }
  })
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [loadingJobs, setLoadingJobs] = useState(true)
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
      fetchExportJobs()
    }
  }, [user, loading, router])

  const fetchExportJobs = async () => {
    try {
      // Get recent export jobs (would be stored in audit_logs or separate table)
      const { data: auditLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .in('action', ['export_data', 'export_failed'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching export jobs:', error)
        return
      }

      // Process audit logs into export jobs format
      const jobs: ExportJob[] = auditLogs?.map((log, index) => ({
        id: log.id || `job-${index}`,
        type: log.metadata?.format || 'csv',
        status: log.action === 'export_failed' ? 'failed' : 'completed',
        created_at: log.created_at,
        completed_at: log.created_at,
        error_message: log.action === 'export_failed' ? log.metadata?.error : undefined,
        options: {
          format: log.metadata?.format || 'csv',
          includePersonalData: log.metadata?.includePersonalData || false,
          dateRange: {
            start: log.metadata?.dateRange?.start || '',
            end: log.metadata?.dateRange?.end || ''
          },
          filters: log.metadata?.filters || {}
        }
      })) || []

      setExportJobs(jobs)
    } catch (error) {
      console.error('Error fetching export jobs:', error)
    } finally {
      setLoadingJobs(false)
    }
  }

  const handleExport = async (exportType: 'data' | 'survey_report' | 'organization_report') => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: exportOptions,
          type: exportType,
          organizationId: user?.organizationId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Handle file download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = 'export.csv'
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '')
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Refresh export jobs
      fetchExportJobs()
      
      alert('Export completed successfully!')
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading || loadingJobs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900 flex items-center justify-center">
        <div className="text-white">Loading export options...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-teal-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Data Export</h1>
            <p className="text-gray-300">Export organization data and reports</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/organization')}>
            Back to Organization
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Export Options */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Export Options</CardTitle>
                <CardDescription className="text-gray-300">
                  Configure your data export settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Format Selection */}
                <div>
                  <Label className="text-white text-sm font-medium">Export Format</Label>
                  <div className="flex space-x-4 mt-2">
                    {[
                      { value: 'csv', label: 'CSV', icon: Table, description: 'Spreadsheet format' },
                      { value: 'json', label: 'JSON', icon: FileText, description: 'Structured data' },
                      { value: 'pdf', label: 'PDF', icon: FileText, description: 'Report format' }
                    ].map((format) => (
                      <div
                        key={format.value}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          exportOptions.format === format.value
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => setExportOptions({ ...exportOptions, format: format.value as any })}
                      >
                        <format.icon className="w-6 h-6 text-white mb-2" />
                        <h4 className="text-white font-medium">{format.label}</h4>
                        <p className="text-gray-400 text-xs">{format.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-white text-sm font-medium">Date Range</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-gray-300 text-xs">Start Date</Label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.start}
                        onChange={(e) => setExportOptions({
                          ...exportOptions,
                          dateRange: { ...exportOptions.dateRange, start: e.target.value }
                        })}
                        className="w-full bg-white/10 border-white/20 text-white rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">End Date</Label>
                      <input
                        type="date"
                        value={exportOptions.dateRange.end}
                        onChange={(e) => setExportOptions({
                          ...exportOptions,
                          dateRange: { ...exportOptions.dateRange, end: e.target.value }
                        })}
                        className="w-full bg-white/10 border-white/20 text-white rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div>
                  <Label className="text-white text-sm font-medium">Filters</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="completedOnly"
                        checked={exportOptions.filters.completedOnly || false}
                        onCheckedChange={(checked) => setExportOptions({
                          ...exportOptions,
                          filters: { ...exportOptions.filters, completedOnly: checked as boolean }
                        })}
                      />
                      <Label htmlFor="completedOnly" className="text-gray-300 text-sm">
                        Only completed assessments
                      </Label>
                    </div>

                    {user?.role === 'system_admin' && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="includePersonalData"
                          checked={exportOptions.includePersonalData}
                          onCheckedChange={(checked) => setExportOptions({
                            ...exportOptions,
                            includePersonalData: checked as boolean
                          })}
                        />
                        <Label htmlFor="includePersonalData" className="text-gray-300 text-sm">
                          Include personal data (admin only)
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Table className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">Survey Data</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Export raw survey responses and scores
                    </p>
                    <Button 
                      onClick={() => handleExport('data')}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6">
                  <div className="text-center">
                    <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">Analytics Report</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Comprehensive organization analytics
                    </p>
                    <Button 
                      onClick={() => handleExport('organization_report')}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export Report
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">Member List</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Export team member information
                    </p>
                    <Button 
                      onClick={() => router.push('/organization/members')}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export History */}
          <div>
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Export History</CardTitle>
                <CardDescription className="text-gray-300">
                  Recent export activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exportJobs.length > 0 ? (
                  <div className="space-y-3">
                    {exportJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(job.status)}
                          <div>
                            <p className="text-white text-sm font-medium">
                              {job.type.toUpperCase()} Export
                            </p>
                            <p className="text-gray-400 text-xs">
                              {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300 text-sm">No exports yet</p>
                    <p className="text-gray-400 text-xs">Your export history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Tips */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-sm">Export Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-xs">CSV format is best for spreadsheet analysis</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-xs">PDF reports include visualizations</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-gray-300 text-xs">Large exports may take a few minutes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}