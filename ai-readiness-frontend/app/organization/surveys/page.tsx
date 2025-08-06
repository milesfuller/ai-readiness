import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui'
import { ClipboardList, Users, Calendar, TrendingUp, Download } from 'lucide-react'

export default async function TeamSurveysPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // Mock team survey data
  const teamSurveys = [
    {
      id: 1,
      department: 'Engineering',
      participants: 24,
      totalMembers: 30,
      completionRate: 80,
      averageScore: 78,
      lastUpdated: '2024-03-20',
      status: 'active'
    },
    {
      id: 2,
      department: 'Marketing',
      participants: 15,
      totalMembers: 20,
      completionRate: 75,
      averageScore: 71,
      lastUpdated: '2024-03-18',
      status: 'active'
    },
    {
      id: 3,
      department: 'Operations',
      participants: 18,
      totalMembers: 25,
      completionRate: 72,
      averageScore: 69,
      lastUpdated: '2024-03-15',
      status: 'completed'
    }
  ]

  return (
    <MainLayout user={user} currentPath="/organization/surveys">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Team Surveys</h1>
            <p className="text-muted-foreground">Monitor and manage AI readiness assessments across your organization</p>
          </div>
          <Button>
            <ClipboardList className="h-4 w-4 mr-2" />
            New Survey Campaign
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Surveys</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
                <ClipboardList className="h-8 w-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Participants</p>
                  <p className="text-2xl font-bold">57</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Completion</p>
                  <p className="text-2xl font-bold">76%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Score</p>
                  <p className="text-2xl font-bold">73%</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Survey List */}
        <Card>
          <CardHeader>
            <CardTitle>Department Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamSurveys.map((survey) => (
                <div key={survey.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{survey.department}</h3>
                        <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                          {survey.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {survey.participants}/{survey.totalMembers} participants • 
                        {survey.completionRate}% completion rate
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {survey.lastUpdated}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-2xl font-bold text-teal-400">{survey.averageScore}%</p>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">View Details</Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}