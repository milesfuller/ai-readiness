'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui'
import { BarChart3, TrendingUp, Award, Download, Calendar, FileText, Users } from 'lucide-react'

// Mock user for demonstration
const mockUser = {
  id: '1',
  email: 'john.doe@company.com',
  role: 'user' as const,
  organizationId: 'org-1',
  profile: {
    id: 'profile-1',
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    avatar: undefined,
    department: 'Product Management',
    jobTitle: 'Senior Product Manager',
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

export default function ResultsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUser(user)
      setLoading(false)
    }
    
    checkAuth()
  }, [router])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  // Mock results data
  const results = [
    {
      id: 1,
      date: '2024-03-15',
      score: 73,
      status: 'Completed',
      categories: {
        technology: 85,
        data: 68,
        culture: 72,
        strategy: 65,
        governance: 75
      }
    },
    {
      id: 2,
      date: '2024-01-10',
      score: 68,
      status: 'Completed',
      categories: {
        technology: 78,
        data: 62,
        culture: 68,
        strategy: 60,
        governance: 72
      }
    }
  ]

  return (
    <MainLayout user={mockUser} currentPath="/results">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Assessment Results</h1>
          <p className="text-muted-foreground">View and analyze your AI readiness assessment results</p>
        </div>

        {/* Latest Score */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-teal-400" />
                <span>Latest Assessment</span>
              </span>
              <span className="text-sm text-muted-foreground">March 15, 2024</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-teal-400 mb-2">73%</div>
                <p className="text-sm text-muted-foreground">Overall AI Readiness Score</p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+5% from last assessment</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Technology Infrastructure</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Data & Analytics</span>
                    <span>68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Organizational Culture</span>
                    <span>72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Strategic Alignment</span>
                    <span>65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Risk & Governance</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-4 mt-6 pt-6 border-t">
              <Button 
                className="flex-1"
                onClick={() => {
                  console.log('Viewing detailed analysis...')
                  // Navigate to detailed analysis page
                  router.push('/dashboard/analytics')
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Detailed Analysis
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  console.log('Downloading report...')
                  // Mock download functionality
                  const link = document.createElement('a')
                  link.href = 'data:text/plain;charset=utf-8,Mock AI Readiness Report - Score: 73%\nDate: March 15, 2024\n\nDetailed results would be here...'
                  link.download = 'ai-readiness-report.txt'
                  link.click()
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assessment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Assessment History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Assessment #{result.id}</p>
                      <p className="text-sm text-muted-foreground">{result.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-400">{result.score}%</p>
                      <p className="text-sm text-muted-foreground">{result.status}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log(`Viewing details for assessment #${result.id}...`)
                        // Navigate to detailed view
                        router.push(`/results/${result.id}`)
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log(`Comparing assessment #${result.id}...`)
                        // Navigate to comparison view
                        router.push(`/results/compare?ids=${result.id},1`)
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Compare
                    </Button>
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