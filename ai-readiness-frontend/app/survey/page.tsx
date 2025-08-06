import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainLayout } from '@/components/layout/main-layout'
import { Button, Card, CardHeader, CardTitle, CardContent, Progress } from '@/components/ui'
import { Brain, CheckCircle, Clock, Users } from 'lucide-react'

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

export default async function SurveyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <MainLayout user={mockUser} currentPath="/survey">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold gradient-text">
            AI Readiness Assessment
          </h1>
          <p className="text-muted-foreground text-lg">
            Complete your comprehensive AI readiness evaluation
          </p>
        </div>

        {/* Survey Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-teal-400" />
                <span>Assessment Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">AI Readiness Survey</h3>
                  <p className="text-muted-foreground">
                    This comprehensive assessment evaluates your organization&apos;s readiness for AI adoption 
                    across multiple dimensions including technology infrastructure, data maturity, 
                    organizational culture, and strategic alignment.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">15-20 minutes</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="font-medium">Questions</p>
                      <p className="text-sm text-muted-foreground">45 questions</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="font-medium">Categories</p>
                      <p className="text-sm text-muted-foreground">5 areas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Assessment Categories</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Technology Infrastructure</span>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded">Not Started</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Data & Analytics Maturity</span>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded">Not Started</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Organizational Culture</span>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded">Not Started</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Strategic Alignment</span>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded">Not Started</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Risk & Governance</span>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 px-2 py-1 rounded">Not Started</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Sidebar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="0, 100"
                      className="text-gray-200 dark:text-gray-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">0%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Assessment Complete</p>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Questions Answered</span>
                    <span>0/45</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Time Spent</span>
                    <span>0 min</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </div>

              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={() => {
                  // Generate unique session ID
                  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                  window.location.href = `/survey/${sessionId}`
                }}
              >
                Start Assessment
              </Button>
              
              <div className="text-center">
                <Button variant="ghost" size="sm">
                  Save & Continue Later
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>What to Expect</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">During the Assessment</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Answer questions honestly based on your current state</li>
                  <li>• Use &quot;Not Applicable&quot; if a question doesn&apos;t apply to your organization</li>
                  <li>• Save your progress at any time and return later</li>
                  <li>• Review and modify answers before final submission</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">After Completion</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Receive a comprehensive readiness score</li>
                  <li>• Get detailed recommendations for improvement</li>
                  <li>• Access benchmarking data against industry peers</li>
                  <li>• Download detailed reports for stakeholders</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}