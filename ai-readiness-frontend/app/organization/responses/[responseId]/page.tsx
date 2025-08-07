'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ResponseAnalysisPanel } from '@/components/admin/response-analysis-panel'
import { ResponseComparisonTool } from '@/components/admin/response-comparison-tool'
import { ResponseTimelineDashboard } from '@/components/admin/response-timeline-dashboard'
import { ResponseStatusManager } from '@/components/admin/response-status-manager'
import { ResponseInsightsDashboard } from '@/components/admin/response-insights-dashboard'
import { ResponseExportDialog } from '@/components/admin/response-export-dialog'
import { 
  ArrowLeft, 
  User, 
  Clock, 
  Calendar,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Brain,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Flag,
  Download,
  Share2,
  Eye,
  Edit3,
  Star,
  Users,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  FileText,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { fetchResponseById, fetchResponseAnalytics, updateResponseStatus, addResponseNote, type DetailedSurveyResponse, type ResponseAnalytics, type AdminNotes } from '@/lib/services/response-service'

export default function ResponseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const responseId = params?.responseId as string
  
  const [response, setResponse] = useState<DetailedSurveyResponse | null>(null)
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [showComparison, setShowComparison] = useState(false)
  const [adminNotes, setAdminNotes] = useState<AdminNotes[]>([])

  // Get return URL from query params or default
  const returnUrl = searchParams.get('returnUrl') || '/admin/responses'

  useEffect(() => {
    if (!responseId || !user) return

    const loadResponseData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [responseData, analyticsData] = await Promise.all([
          fetchResponseById(responseId, user.role as string, user.organizationId),
          fetchResponseAnalytics(responseId, user.role as string, user.organizationId)
        ])

        setResponse(responseData)
        setAnalytics(analyticsData)
        setAdminNotes(responseData.adminNotes || [])
      } catch (err) {
        console.error('Failed to load response data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load response data')
      } finally {
        setLoading(false)
      }
    }

    loadResponseData()
  }, [responseId, user])

  const handleStatusUpdate = async (status: string, note?: string) => {
    if (!response) return

    try {
      await updateResponseStatus(responseId, status, note, user?.id || '')
      setResponse({
        ...response,
        adminStatus: status as any
      })
      
      if (note) {
        const newNote = {
          id: Date.now().toString(),
          note,
          createdBy: user?.profile?.firstName + ' ' + user?.profile?.lastName || user?.email || 'Admin',
          createdAt: new Date().toISOString(),
          type: 'status_update' as const
        }
        setAdminNotes([...adminNotes, newNote])
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleAddNote = async (note: string, type: 'general' | 'follow_up' | 'concern' = 'general') => {
    try {
      await addResponseNote(responseId, note, type, user?.id || '')
      
      const newNote = {
        id: Date.now().toString(),
        note,
        createdBy: user?.profile?.firstName + ' ' + user?.profile?.lastName || user?.email || 'Admin',
        createdAt: new Date().toISOString(),
        type
      }
      setAdminNotes([...adminNotes, newNote])
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    )
  }

  if (error || !response) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass-card max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Response Not Found</h3>
            <p className="text-gray-400 mb-4">{error || 'The requested response could not be found.'}</p>
            <Button onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-teal-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href={returnUrl}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Responses
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Response Details</h1>
              <p className="text-gray-400">Individual response analysis and insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ResponseExportDialog responseId={responseId} />
            <Button variant="outline" size="sm" onClick={() => setShowComparison(true)}>
              <Share2 className="h-4 w-4 mr-2" />
              Compare
            </Button>
          </div>
        </div>

        {/* Participant Overview */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-gradient-to-r from-teal-500 to-purple-500">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Participant Information</CardTitle>
                  <CardDescription>User profile and context details</CardDescription>
                </div>
              </div>
              <Badge variant={
                response.status === 'completed' ? 'default' :
                response.status === 'in_progress' ? 'secondary' : 'outline'
              }>
                {response.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Name</span>
                </div>
                <p className="text-white font-medium">
                  {response.participant.firstName} {response.participant.lastName}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Email</span>
                </div>
                <p className="text-white font-medium">{response.participant.email}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Role</span>
                </div>
                <p className="text-white font-medium">
                  {response.participant.jobTitle || 'Not specified'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Department</span>
                </div>
                <p className="text-white font-medium">
                  {response.participant.department || 'Not specified'}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Started</span>
                </div>
                <p className="text-white font-medium">
                  {new Date(response.startedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Duration</span>
                </div>
                <p className="text-white font-medium">
                  {response.completionTime ? `${Math.round(response.completionTime / 60)} min` : 'In Progress'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Completion Progress</span>
                <span className="text-sm text-white font-medium">
                  {response.answers.length}/{response.totalQuestions} questions
                </span>
              </div>
              <Progress 
                value={(response.answers.length / response.totalQuestions) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="answers">Responses</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Survey Information */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Survey Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Title</h4>
                    <p className="text-white">{response.surveyTitle}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-300 mb-2">Description</h4>
                    <p className="text-gray-400 text-sm">{response.surveyDescription}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-300 mb-1">Total Questions</h4>
                      <p className="text-white font-bold text-2xl">{response.totalQuestions}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-300 mb-1">Answered</h4>
                      <p className="text-teal-400 font-bold text-2xl">{response.answers.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Quick Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-2xl font-bold text-teal-400">
                            {analytics.overallSentimentScore > 0 ? '+' : ''}{(analytics.overallSentimentScore * 100).toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-400">Sentiment Score</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-2xl font-bold text-purple-400">
                            {analytics.averageConfidence.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-400">Avg Confidence</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-400">
                            {analytics.keyThemes.length}
                          </div>
                          <div className="text-xs text-gray-400">Key Themes</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-lg">
                          <div className="text-2xl font-bold text-green-400">
                            {analytics.businessImpactLevel === 'high' ? 'High' :
                             analytics.businessImpactLevel === 'medium' ? 'Med' : 'Low'}
                          </div>
                          <div className="text-xs text-gray-400">Impact Level</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-300 mb-2">Top Themes</h4>
                        <div className="flex flex-wrap gap-1">
                          {analytics.keyThemes.slice(0, 5).map((theme, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* JTBD Forces Overview */}
            {analytics?.jtbdForces && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Jobs-to-be-Done Forces Analysis
                  </CardTitle>
                  <CardDescription>
                    Understanding the forces driving behavior change
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 border border-red-200 bg-red-50/10 rounded-lg">
                      <TrendingUp className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-red-400">
                        {analytics.jtbdForces.push.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-300">Push Forces</div>
                      <div className="text-xs text-gray-400 mt-1">Pain points driving change</div>
                    </div>
                    
                    <div className="text-center p-4 border border-green-200 bg-green-50/10 rounded-lg">
                      <Star className="h-8 w-8 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-green-400">
                        {analytics.jtbdForces.pull.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-300">Pull Forces</div>
                      <div className="text-xs text-gray-400 mt-1">Benefits attracting change</div>
                    </div>
                    
                    <div className="text-center p-4 border border-yellow-200 bg-yellow-50/10 rounded-lg">
                      <Users className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-400">
                        {analytics.jtbdForces.habit.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-300">Habit Forces</div>
                      <div className="text-xs text-gray-400 mt-1">Inertia preventing change</div>
                    </div>
                    
                    <div className="text-center p-4 border border-purple-200 bg-purple-50/10 rounded-lg">
                      <AlertCircle className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-purple-400">
                        {analytics.jtbdForces.anxiety.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-300">Anxiety Forces</div>
                      <div className="text-xs text-gray-400 mt-1">Fears about change</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Answers Tab */}
          <TabsContent value="answers" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Survey Responses ({response.answers.length})
                </CardTitle>
                <CardDescription>
                  Individual answers with context and metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {response.answers.map((answer, index) => (
                    <div key={answer.questionId} className="border-l-2 border-teal-400 pl-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            Question {index + 1}
                          </Badge>
                          {answer.timeSpent && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {Math.round(answer.timeSpent / 1000)}s
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-white mb-2">
                          {response.questions.find(q => q.id === answer.questionId)?.question || 'Question not found'}
                        </h4>
                        <div className="bg-white/5 p-3 rounded-lg">
                          <p className="text-gray-300">
                            {typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer)}
                          </p>
                        </div>
                        {answer.confidence && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-400">Response Confidence</span>
                              <span className="text-gray-300">{answer.confidence}/5</span>
                            </div>
                            <Progress value={(answer.confidence / 5) * 100} className="h-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="space-y-6">
              {response.answers.map((answer, index) => {
                const question = response.questions.find(q => q.id === answer.questionId)
                if (!question || typeof answer.answer !== 'string') return null
                
                return (
                  <ResponseAnalysisPanel
                    key={answer.questionId}
                    responseId={`${responseId}-${answer.questionId}`}
                    responseText={answer.answer}
                    questionText={question.question}
                    expectedForce={question.category as any}
                    context={{
                      employeeRole: response.participant.jobTitle,
                      employeeDepartment: response.participant.department,
                      organizationName: user?.organizationId
                    }}
                  />
                )
              })}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <ResponseTimelineDashboard response={response} />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <ResponseInsightsDashboard 
              response={response} 
              analytics={analytics} 
            />
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="space-y-6">
            <ResponseStatusManager
              response={response}
              adminNotes={adminNotes}
              onStatusUpdate={handleStatusUpdate}
              onAddNote={handleAddNote}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Responses</DialogTitle>
            <DialogDescription>
              Compare this response with others from the same survey or organization
            </DialogDescription>
          </DialogHeader>
          <ResponseComparisonTool 
            primaryResponse={response}
            organizationId={user?.organizationId}
            surveyId={response.surveyId}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}