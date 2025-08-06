import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Progress } from '@/components/ui'
import { BarChart3, TrendingUp, Users, Brain, Target, Activity } from 'lucide-react'

export default async function OrganizationAnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <MainLayout user={user} currentPath="/organization/analytics">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Organization Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights into your organization&apos;s AI readiness journey</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Brain className="h-5 w-5 text-teal-400" />
                <span>Overall Readiness</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-teal-400">73%</p>
                <p className="text-sm text-muted-foreground mt-2">Organization Score</p>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+8% this quarter</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Participation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-blue-400">156</p>
                <p className="text-sm text-muted-foreground mt-2">Active Participants</p>
                <Progress value={78} className="mt-3" />
                <p className="text-xs text-muted-foreground mt-1">78% of organization</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Target className="h-5 w-5 text-purple-400" />
                <span>Completion Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold text-purple-400">89%</p>
                <p className="text-sm text-muted-foreground mt-2">Surveys Completed</p>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  <Activity className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Above target</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Department Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Engineering</span>
                  <span className="font-medium">85%</span>
                </div>
                <Progress value={85} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Product</span>
                  <span className="font-medium">78%</span>
                </div>
                <Progress value={78} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Marketing</span>
                  <span className="font-medium">71%</span>
                </div>
                <Progress value={71} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Operations</span>
                  <span className="font-medium">69%</span>
                </div>
                <Progress value={69} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Finance</span>
                  <span className="font-medium">65%</span>
                </div>
                <Progress value={65} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Readiness Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Q1 2024</p>
                    <p className="text-sm text-muted-foreground">January - March</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-400">73%</p>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Q4 2023</p>
                    <p className="text-sm text-muted-foreground">October - December</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-400">68%</p>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Q3 2023</p>
                    <p className="text-sm text-muted-foreground">July - September</p>
                  </div>
                  <p className="text-2xl font-bold text-teal-400">65%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="font-medium text-green-700 dark:text-green-400 mb-1">Strength</p>
                  <p className="text-sm">Technology infrastructure scores consistently above 80%</p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">Opportunity</p>
                  <p className="text-sm">Data maturity shows room for improvement at 68%</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Trend</p>
                  <p className="text-sm">Steady improvement in organizational culture metrics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}