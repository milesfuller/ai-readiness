import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Button, Card, CardHeader, CardTitle, CardContent, StatsCard, CircularProgress, Progress } from '@/components/ui'
import { Brain, Users, TrendingUp, Clock, CheckCircle2, BarChart3 } from 'lucide-react'

// Mock user data for demonstration
const mockUser = {
  id: '1',
  email: 'john.doe@company.com',
  role: 'org_admin' as const,
  organizationId: 'org-1',
  profile: {
    id: 'profile-1',
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    avatar: undefined,
    department: 'IT Leadership',
    jobTitle: 'Director of Technology',
    preferences: {
      theme: 'dark' as const,
      notifications: true,
      voiceInput: true,
      language: 'en'
    }
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-08-01T00:00:00Z',
  lastLogin: '2024-08-02T19:00:00Z'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <MainLayout user={mockUser} currentPath="/dashboard">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold gradient-text">
            AI Readiness Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome back, {mockUser.profile?.firstName}! Here's your organization's AI readiness overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Surveys"
            value="247"
            description="Active assessments"
            icon={Brain}
            trend={{
              value: 12,
              label: "vs last month",
              direction: "up"
            }}
          />
          <StatsCard
            title="Completion Rate"
            value="89%"
            description="Survey completions"
            icon={CheckCircle2}
            trend={{
              value: 5,
              label: "improvement",
              direction: "up"
            }}
          />
          <StatsCard
            title="Active Users"
            value="156"
            description="Organization members"
            icon={Users}
            trend={{
              value: 8,
              label: "new this week",
              direction: "up"
            }}
          />
          <StatsCard
            title="Avg. Time"
            value="18min"
            description="Per assessment"
            icon={Clock}
            trend={{
              value: 2,
              label: "faster",
              direction: "down"
            }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* AI Readiness Score */}
          <Card variant="glass" className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-teal-400" />
                <span>Overall AI Readiness</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <CircularProgress
                value={73}
                size={140}
                strokeWidth={10}
              />
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Your organization shows <span className="text-teal-400 font-medium">strong readiness</span> for AI adoption
                </p>
                <Button variant="outline" size="sm">
                  View Detailed Analysis
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card variant="glass" className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                <span>JTBD Forces Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Force indicators */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Pull of New Solutions</span>
                    <span className="text-teal-400">8.2/10</span>
                  </div>
                  <Progress value={82} variant="gradient" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Pain of Current State</span>
                    <span className="text-orange-400">7.1/10</span>
                  </div>
                  <Progress value={71} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Anxiety of Change</span>
                    <span className="text-red-400">4.8/10</span>
                  </div>
                  <Progress value={48} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Anchor to Current</span>
                    <span className="text-blue-400">3.9/10</span>
                  </div>
                  <Progress value={39} />
                </div>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Button variant="secondary" className="w-full">
                  Generate Detailed Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="interactive" className="cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <Brain className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Take Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    Start your AI readiness survey
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="interactive" className="cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Team Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    View organization insights
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="interactive" className="cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <BarChart3 className="h-6 w-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Export Reports</h3>
                  <p className="text-sm text-muted-foreground">
                    Download analysis data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}