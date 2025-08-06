'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Calendar, 
  Users, 
  Clock,
  Download,
  Eye,
  BarChart3,
  FileText,
  TrendingUp,
  Target,
  Shield,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { Survey, SurveyResponse, JTBDForces } from '@/lib/types'
import { Progress } from '@/components/ui/progress'

export default function SurveyDetailPage() {
  const { user } = useAuth()
  const params = useParams()
  const surveyId = params.id as string
  
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockSurvey: Survey = {
          id: surveyId,
          title: 'AI Readiness Insight Survey – Version D',
          description: 'Structured around the Jobs To Be Done (JTBD) Forces of Progress. Open, reflective prompts to understand what\'s pushing people away from the current state, pulling them toward new possibilities, and holding them back from change.',
          status: 'active',
          createdBy: 'admin@company.com',
          organizationId: 'org1',
          questions: [
            // Force 1: Pain of the Old
            {
              id: 'q1',
              type: 'text',
              question: 'Tell us about a moment recently when your current tools, processes or ways of working got in the way of doing great work. What happened?',
              required: true,
              category: 'Force 1: Pain of the Old',
              order: 1
            },
            {
              id: 'q2',
              type: 'text',
              question: 'What parts of your work feel disproportionately time-consuming or effortful — especially compared to the value they deliver?',
              required: true,
              category: 'Force 1: Pain of the Old',
              order: 2
            },
            // Force 2: Pull of the New
            {
              id: 'q3',
              type: 'text',
              question: 'If AI could work exactly how you needed it to, what would it unlock for you, your team, or your clients?',
              required: true,
              category: 'Force 2: Pull of the New',
              order: 3
            },
            {
              id: 'q4a',
              type: 'text',
              question: 'What&apos;s one part of your work you&apos;d love to make easier, faster, or more impactful — even if you&apos;re not sure how AI could help yet?',
              required: true,
              category: 'Force 2: Pull of the New',
              order: 4
            },
            {
              id: 'q4b',
              type: 'text',
              question: 'If an AI assistant could take care of one thing for you brilliantly — no limitations — what would you hand over?',
              required: true,
              category: 'Force 2: Pull of the New',
              order: 5
            },
            // Force 3: Anchors to the Old
            {
              id: 'q5',
              type: 'text',
              question: 'Even when better tools or ideas are available, what tends to keep things \'business as usual\' in your team or organisation?',
              required: true,
              category: 'Force 3: Anchors to the Old',
              order: 6
            },
            {
              id: 'q6',
              type: 'text',
              question: 'What would realistically stop someone in your team from trying a new AI tool tomorrow?',
              required: true,
              category: 'Force 3: Anchors to the Old',
              order: 7
            },
            {
              id: 'q7',
              type: 'text',
              question: 'Who needs to say yes (or stay quiet) for experimentation to happen?',
              required: true,
              category: 'Force 3: Anchors to the Old',
              order: 8
            },
            // Force 4: Anxiety of the New
            {
              id: 'q8',
              type: 'text',
              question: 'When it comes to adopting new AI tools or ways of working, what concerns come up for you — emotionally, practically, or professionally?',
              required: true,
              category: 'Force 4: Anxiety of the New',
              order: 9
            },
            {
              id: 'q9',
              type: 'text',
              question: 'Have you ever tried an AI tool that left you feeling unsure, disappointed, or exposed? What happened?',
              required: false,
              category: 'Force 4: Anxiety of the New',
              order: 10
            },
            // Experimentation
            {
              id: 'q10',
              type: 'multiple_choice',
              question: 'What role do you tend to play when your team is exploring something new?',
              options: ['Observer', 'Cautious Tester', 'Curious Explorer', 'Experimentation Lead'],
              required: true,
              category: 'Attitude to Experimentation',
              order: 11
            },
            {
              id: 'q11',
              type: 'scale',
              question: 'How does experimenting with something new make you feel?',
              required: true,
              category: 'Attitude to Experimentation',
              order: 12
            }
          ],
          metadata: {
            estimatedDuration: 15,
            totalQuestions: 12,
            completionRate: 78.5,
            averageScore: 7.2
          },
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z'
        }

        const mockResponses: SurveyResponse[] = [
          {
            id: 'r1',
            surveyId,
            userId: 'user1',
            answers: [
              { questionId: 'q1', answer: 'Our current CRM system is slow and outdated. It takes 5 clicks to do what should take 1.', timeSpent: 120 },
              { questionId: 'q3', answer: 'AI could help us analyze customer data patterns and predict needs before they ask.', timeSpent: 95 }
            ],
            status: 'completed',
            startedAt: '2024-01-20T09:00:00Z',
            completedAt: '2024-01-20T09:15:00Z',
            metadata: {
              userAgent: 'Mozilla/5.0...',
              ipAddress: '192.168.1.1',
              device: 'desktop',
              completionTime: 15,
              voiceInputUsed: false
            }
          }
        ]

        const mockAnalytics = {
          totalResponses: 142,
          completionRate: 78.5,
          averageTime: 14.2,
          forceAnalysis: {
            push: 6.8, // Pain of the Old
            pull: 8.2, // Pull of the New  
            habit: 7.1, // Anchors to the Old
            anxiety: 5.9 // Anxiety of the New
          },
          departmentBreakdown: {
            'Engineering': 45,
            'Marketing': 32,
            'Sales': 28,
            'Operations': 22,
            'HR': 15
          },
          topThemes: [
            { theme: 'Process Automation', mentions: 89 },
            { theme: 'Data Analysis', mentions: 76 },
            { theme: 'Customer Service', mentions: 54 },
            { theme: 'Content Creation', mentions: 43 }
          ]
        }

        setSurvey(mockSurvey)
        setResponses(mockResponses)
        setAnalytics(mockAnalytics)
      } catch (error) {
        console.error('Failed to fetch survey data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveyData()
  }, [surveyId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'completed': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getForceIcon = (category: string) => {
    if (category.includes('Pain of the Old')) return <TrendingUp className="h-5 w-5 text-red-400" />
    if (category.includes('Pull of the New')) return <Target className="h-5 w-5 text-green-400" />
    if (category.includes('Anchors to the Old')) return <Shield className="h-5 w-5 text-yellow-400" />
    if (category.includes('Anxiety of the New')) return <Zap className="h-5 w-5 text-orange-400" />
    return <FileText className="h-5 w-5 text-blue-400" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white">Survey Not Found</CardTitle>
            <CardDescription>The survey you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/surveys">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{survey.title}</h1>
          <p className="text-gray-400 mt-1">{survey.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(survey.status)}>
            {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-teal-400" />
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.totalResponses || 0}</p>
                <p className="text-sm text-gray-400">Total Responses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.completionRate}%</p>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.averageTime}m</p>
                <p className="text-sm text-gray-400">Avg. Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{survey.questions.length}</p>
                <p className="text-sm text-gray-400">Questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* JTBD Forces Analysis */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">JTBD Forces Analysis</CardTitle>
              <CardDescription>
                Understanding the forces driving change based on survey responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-red-400" />
                      <span className="text-white font-medium">Pain of the Old</span>
                    </div>
                    <span className="text-red-400 font-bold">{analytics?.forceAnalysis?.push}/10</span>
                  </div>
                  <Progress 
                    value={analytics?.forceAnalysis?.push * 10} 
                    className="bg-gray-700 [&>div]:bg-red-400" 
                  />
                  <p className="text-sm text-gray-400">
                    Friction in current ways of working pushing users toward change
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-400" />
                      <span className="text-white font-medium">Pull of the New</span>
                    </div>
                    <span className="text-green-400 font-bold">{analytics?.forceAnalysis?.pull}/10</span>
                  </div>
                  <Progress 
                    value={analytics?.forceAnalysis?.pull * 10} 
                    className="bg-gray-700 [&>div]:bg-green-400" 
                  />
                  <p className="text-sm text-gray-400">
                    Attraction to the benefits of AI solutions
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-yellow-400" />
                      <span className="text-white font-medium">Anchors to the Old</span>
                    </div>
                    <span className="text-yellow-400 font-bold">{analytics?.forceAnalysis?.habit}/10</span>
                  </div>
                  <Progress 
                    value={analytics?.forceAnalysis?.habit * 10} 
                    className="bg-gray-700 [&>div]:bg-yellow-400" 
                  />
                  <p className="text-sm text-gray-400">
                    What holds people in the current state
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-5 w-5 text-orange-400" />
                      <span className="text-white font-medium">Anxiety of the New</span>
                    </div>
                    <span className="text-orange-400 font-bold">{analytics?.forceAnalysis?.anxiety}/10</span>
                  </div>
                  <Progress 
                    value={analytics?.forceAnalysis?.anxiety * 10} 
                    className="bg-gray-700 [&>div]:bg-orange-400" 
                  />
                  <p className="text-sm text-gray-400">
                    Concerns or uncertainty about switching
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Responses by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analytics?.departmentBreakdown || {}).map(([dept, count]) => {
                  const countNumber = Number(count)
                  const maxCount = Math.max(...Object.values(analytics?.departmentBreakdown || {}).map(v => Number(v)))
                  return (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-gray-300">{dept}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${(countNumber / maxCount) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-white font-medium w-8 text-right">{countNumber}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Survey Questions</CardTitle>
              <CardDescription>
                Questions organized by JTBD Forces of Progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(
                  survey.questions.reduce((acc, q) => {
                    if (!acc[q.category]) acc[q.category] = []
                    acc[q.category].push(q)
                    return acc
                  }, {} as Record<string, any[]>)
                ).map(([category, questions]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      {getForceIcon(category)}
                      <h3 className="text-lg font-semibold text-white">{category}</h3>
                    </div>
                    <div className="space-y-3 ml-7">
                      {questions.map((question, index) => (
                        <div key={question.id} className="border-l-2 border-gray-600 pl-4">
                          <p className="text-sm text-gray-400">Q{question.order}</p>
                          <p className="text-white">{question.question}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">
                              {question.type.replace('_', ' ')}
                            </Badge>
                            {question.required && (
                              <Badge variant="outline" className="text-red-400 border-red-400">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Survey Responses</CardTitle>
                  <CardDescription>Individual response data and analytics</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Responses
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Response Analytics</h3>
                <p className="text-gray-400 mb-4">
                  Detailed response analysis and individual submissions will be displayed here.
                </p>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-white">Top Themes & Insights</CardTitle>
              <CardDescription>Key themes emerging from open-text responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.topThemes?.map((theme: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-white font-medium">{theme.theme}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">{theme.mentions} mentions</span>
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${(theme.mentions / Math.max(...analytics.topThemes.map((t: any) => t.mentions))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}