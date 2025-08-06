import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { FileText, Download, Calendar, Share2, Filter, Eye } from 'lucide-react'

export default async function OrganizationReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Mock reports data
  const reports = [
    {
      id: 1,
      title: 'Q1 2024 AI Readiness Report',
      type: 'Quarterly',
      date: '2024-03-31',
      status: 'ready',
      format: 'PDF',
      size: '2.4 MB',
      departments: ['All Departments'],
      score: 73
    },
    {
      id: 2,
      title: 'Engineering Department Analysis',
      type: 'Department',
      date: '2024-03-25',
      status: 'ready',
      format: 'PDF',
      size: '1.8 MB',
      departments: ['Engineering'],
      score: 85
    },
    {
      id: 3,
      title: 'Executive Summary - March 2024',
      type: 'Executive',
      date: '2024-03-20',
      status: 'ready',
      format: 'PDF',
      size: '850 KB',
      departments: ['All Departments'],
      score: 73
    },
    {
      id: 4,
      title: 'Comparative Analysis Q4 2023 vs Q1 2024',
      type: 'Comparative',
      date: '2024-03-15',
      status: 'processing',
      format: 'PDF',
      size: '---',
      departments: ['All Departments'],
      score: null
    }
  ]

  return (
    <MainLayout user={user} currentPath="/organization/reports">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Generate and download AI readiness reports for your organization</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Report Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="text-left">
                  <p className="font-medium">Executive Summary</p>
                  <p className="text-xs text-muted-foreground">High-level overview for stakeholders</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="text-left">
                  <p className="font-medium">Department Analysis</p>
                  <p className="text-xs text-muted-foreground">Detailed department-specific insights</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto p-4 justify-start">
                <div className="text-left">
                  <p className="font-medium">Trend Report</p>
                  <p className="text-xs text-muted-foreground">Historical performance analysis</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Generated Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <FileText className="h-6 w-6 text-teal-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{report.title}</h3>
                          <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.type} Report • {report.date} • {report.format}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.departments.join(', ')} {report.size !== '---' && `• ${report.size}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {report.score && (
                        <div className="text-right">
                          <p className="text-2xl font-bold text-teal-400">{report.score}%</p>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        {report.status === 'ready' && (
                          <>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {report.status === 'processing' && (
                          <Button size="sm" variant="outline" disabled>
                            Processing...
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                PowerPoint
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}