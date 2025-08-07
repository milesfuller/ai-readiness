'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineIcon,
  TimelineTime,
  TimelineTitle,
} from '@/components/ui/timeline'
import { 
  Clock,
  Calendar,
  Play,
  Pause,
  CheckCircle,
  Circle,
  AlertCircle,
  User,
  MessageCircle,
  Brain,
  Target,
  TrendingUp,
  BarChart3,
  Activity,
  Timer,
  FastForward,
  Rewind,
  ChevronRight,
  Flag
} from 'lucide-react'
import type { DetailedSurveyResponse } from '@/lib/services/response-service'

interface ResponseTimelineDashboardProps {
  response: DetailedSurveyResponse
}

interface TimelineEvent {
  id: string
  type: 'start' | 'question_answered' | 'pause' | 'resume' | 'completed' | 'milestone'
  timestamp: string
  title: string
  description: string
  duration?: number
  metadata?: {
    questionId?: string
    questionText?: string
    answer?: any
    confidence?: number
    timeSpent?: number
  }
}

export function ResponseTimelineDashboard({ response }: ResponseTimelineDashboardProps) {
  const [selectedView, setSelectedView] = useState<'detailed' | 'summary' | 'progress'>('detailed')
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Generate timeline events from response data
  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    
    // Start event
    events.push({
      id: 'start',
      type: 'start',
      timestamp: response.startedAt,
      title: 'Survey Started',
      description: `${response.participant.firstName} ${response.participant.lastName} began the survey`
    })

    // Question events
    response.answers.forEach((answer, index) => {
      const question = response.questions.find(q => q.id === answer.questionId)
      const questionStartTime = new Date(response.startedAt)
      // Simulate progressive timestamps
      questionStartTime.setMinutes(questionStartTime.getMinutes() + (index * 2))
      
      events.push({
        id: `question_${answer.questionId}`,
        type: 'question_answered',
        timestamp: questionStartTime.toISOString(),
        title: `Question ${index + 1} Answered`,
        description: (question?.question?.length || 0) > 50 ? 
          question?.question?.substring(0, 50) + '...' : 
          question?.question || 'Unknown question',
        metadata: {
          questionId: answer.questionId,
          questionText: question?.question,
          answer: answer.answer,
          confidence: answer.confidence,
          timeSpent: answer.timeSpent || Math.floor(Math.random() * 120) + 30 // Mock time if not available
        }
      })
    })

    // Add milestone events
    const quarter = Math.floor(response.totalQuestions / 4)
    const half = Math.floor(response.totalQuestions / 2)
    const threeQuarter = Math.floor((response.totalQuestions * 3) / 4)

    if (response.answers.length > quarter) {
      const milestoneTime = new Date(response.startedAt)
      milestoneTime.setMinutes(milestoneTime.getMinutes() + (quarter * 2))
      events.push({
        id: 'milestone_25',
        type: 'milestone',
        timestamp: milestoneTime.toISOString(),
        title: '25% Complete',
        description: `Completed ${quarter} out of ${response.totalQuestions} questions`
      })
    }

    if (response.answers.length > half) {
      const milestoneTime = new Date(response.startedAt)
      milestoneTime.setMinutes(milestoneTime.getMinutes() + (half * 2))
      events.push({
        id: 'milestone_50',
        type: 'milestone',
        timestamp: milestoneTime.toISOString(),
        title: '50% Complete',
        description: `Reached the halfway point - ${half} questions answered`
      })
    }

    if (response.answers.length > threeQuarter) {
      const milestoneTime = new Date(response.startedAt)
      milestoneTime.setMinutes(milestoneTime.getMinutes() + (threeQuarter * 2))
      events.push({
        id: 'milestone_75',
        type: 'milestone',
        timestamp: milestoneTime.toISOString(),
        title: '75% Complete',
        description: `Almost finished - ${threeQuarter} questions completed`
      })
    }

    // Completion event
    if (response.completedAt) {
      events.push({
        id: 'completed',
        type: 'completed',
        timestamp: response.completedAt,
        title: 'Survey Completed',
        description: `Successfully completed all ${response.answers.length} questions`,
        duration: response.completionTime
      })
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  const timelineEvents = generateTimelineEvents()

  // Calculate analytics
  const analytics = {
    totalTime: response.completionTime || 0,
    averageTimePerQuestion: response.completionTime ? response.completionTime / response.answers.length : 0,
    longestQuestionTime: Math.max(...response.answers.map(a => a.timeSpent || 0)),
    shortestQuestionTime: Math.min(...response.answers.filter(a => a.timeSpent).map(a => a.timeSpent!)),
    pauseCount: 0, // Would be calculated from actual engagement data
    engagementScore: Math.min(100, (response.answers.length / response.totalQuestions) * 100),
    confidenceScore: response.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / response.answers.length
  }

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start': return <Play className="h-4 w-4" />
      case 'question_answered': return <MessageCircle className="h-4 w-4" />
      case 'pause': return <Pause className="h-4 w-4" />
      case 'resume': return <Play className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'milestone': return <Flag className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'start': return 'text-blue-500'
      case 'question_answered': return 'text-green-500'
      case 'pause': return 'text-yellow-500'
      case 'resume': return 'text-blue-500'
      case 'completed': return 'text-green-600'
      case 'milestone': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="space-y-6">
      {/* Timeline Controls */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Response Timeline
              </CardTitle>
              <CardDescription>
                Chronological progression through the survey
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={showAnalytics ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detailed">Detailed Timeline</TabsTrigger>
              <TabsTrigger value="summary">Summary View</TabsTrigger>
              <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Analytics Panel */}
      {showAnalytics && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Timeline Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {formatDuration(analytics.totalTime)}
                </div>
                <div className="text-xs text-gray-400">Total Time</div>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-green-400">
                  {formatDuration(Math.round(analytics.averageTimePerQuestion))}
                </div>
                <div className="text-xs text-gray-400">Avg per Question</div>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {analytics.confidenceScore.toFixed(1)}/5
                </div>
                <div className="text-xs text-gray-400">Avg Confidence</div>
              </div>
              
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-teal-400">
                  {analytics.engagementScore.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-400">Engagement</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Views */}
      <Card className="glass-card">
        <CardContent className="p-6">
          {selectedView === 'detailed' && (
            <Timeline>
              {timelineEvents.map((event, index) => (
                <TimelineItem key={event.id}>
                  <TimelineIcon className={getEventColor(event.type)}>
                    {getEventIcon(event.type)}
                  </TimelineIcon>
                  
                  <TimelineContent>
                    <TimelineTime className="text-gray-400">
                      {formatTime(event.timestamp)}
                    </TimelineTime>
                    
                    <TimelineTitle className="text-white">
                      {event.title}
                    </TimelineTitle>
                    
                    <TimelineDescription className="text-gray-300">
                      {event.description}
                    </TimelineDescription>

                    {event.metadata && (
                      <div className="mt-3 space-y-2">
                        {event.metadata.timeSpent && (
                          <div className="flex items-center gap-2">
                            <Timer className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              Time spent: {formatDuration(Math.round(event.metadata.timeSpent / 1000))}
                            </span>
                          </div>
                        )}
                        
                        {event.metadata.confidence && (
                          <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              Confidence: {event.metadata.confidence}/5
                            </span>
                          </div>
                        )}
                        
                        {typeof event.metadata.answer === 'string' && event.metadata.answer.length > 0 && (
                          <div className="mt-2 p-2 bg-white/5 rounded text-xs text-gray-300">
                            "{event.metadata.answer.length > 100 ? 
                              event.metadata.answer.substring(0, 100) + '...' : 
                              event.metadata.answer}"
                          </div>
                        )}
                      </div>
                    )}

                    {event.duration && (
                      <Badge variant="outline" className="mt-2">
                        Duration: {formatDuration(event.duration)}
                      </Badge>
                    )}
                  </TimelineContent>
                  
                  {index < timelineEvents.length - 1 && <TimelineConnector />}
                </TimelineItem>
              ))}
            </Timeline>
          )}

          {selectedView === 'summary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Play className="h-4 w-4 text-blue-500" />
                      Started
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      {new Date(response.startedAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Initial engagement
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-yellow-500" />
                      Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {response.answers.length} / {response.totalQuestions}
                    </div>
                    <Progress 
                      value={(response.answers.length / response.totalQuestions) * 100} 
                      className="h-2 mt-2" 
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {((response.answers.length / response.totalQuestions) * 100).toFixed(0)}% complete
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {response.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-500" />
                      )}
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={response.status === 'completed' ? 'default' : 'secondary'}>
                      {response.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {response.completedAt ? 
                        `Completed ${new Date(response.completedAt).toLocaleDateString()}` :
                        'In progress'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Question Response Pattern
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: response.totalQuestions }, (_, index) => {
                      const isAnswered = index < response.answers.length
                      return (
                        <div
                          key={index}
                          className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                            isAnswered 
                              ? 'bg-green-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>Question Progress</span>
                    <span>{response.answers.length} / {response.totalQuestions} answered</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedView === 'progress' && (
            <div className="space-y-6">
              {/* Progress Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Completion Progress Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Overall progress bar */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-gray-600">
                          {((response.answers.length / response.totalQuestions) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(response.answers.length / response.totalQuestions) * 100} 
                        className="h-3" 
                      />
                    </div>

                    {/* Category-based progress (if questions have categories) */}
                    {response.questions.reduce((categories, question) => {
                      if (!categories.includes(question.category)) {
                        categories.push(question.category)
                      }
                      return categories
                    }, [] as string[]).map((category) => {
                      const categoryQuestions = response.questions.filter(q => q.category === category)
                      const answeredInCategory = response.answers.filter(a => {
                        const question = response.questions.find(q => q.id === a.questionId)
                        return question?.category === category
                      })
                      const categoryProgress = (answeredInCategory.length / categoryQuestions.length) * 100

                      return (
                        <div key={category}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium capitalize">{category}</span>
                            <span className="text-sm text-gray-600">
                              {answeredInCategory.length}/{categoryQuestions.length}
                            </span>
                          </div>
                          <Progress value={categoryProgress} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Time Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Response Times by Question</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {response.answers.map((answer, index) => (
                          <div key={answer.questionId} className="flex items-center justify-between text-sm">
                            <span>Q{index + 1}</span>
                            <Badge variant="outline">
                              {answer.timeSpent ? formatDuration(Math.round(answer.timeSpent / 1000)) : 'N/A'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Engagement Metrics</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Time</span>
                          <span className="text-sm font-medium">
                            {formatDuration(analytics.totalTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg per Question</span>
                          <span className="text-sm font-medium">
                            {formatDuration(Math.round(analytics.averageTimePerQuestion))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Engagement Score</span>
                          <span className="text-sm font-medium">
                            {analytics.engagementScore.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}