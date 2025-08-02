'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress, CircularProgress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Brain, 
  Clock, 
  Download, 
  Mail, 
  Share2,
  BarChart3,
  TrendingUp,
  Award,
  Eye,
  Calendar
} from 'lucide-react'
import { surveyCategories, surveyQuestions } from '@/lib/data/survey-questions'

interface Props {
  params: Promise<{ sessionId: string }>
}

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

// Mock analysis results based on JTBD framework
const mockAnalysisResults = {
  overallScore: 73,
  completionTime: '18 minutes',
  categoriesAnalyzed: 4,
  totalQuestions: 12,
  completionDate: new Date().toISOString(),
  
  categoryScores: {
    pain_of_old: { score: 82, strength: 'High', trend: 'up' },
    pull_of_new: { score: 78, strength: 'High', trend: 'up' },
    anchors_to_old: { score: 65, strength: 'Medium', trend: 'neutral' },
    anxiety_of_new: { score: 69, strength: 'Medium', trend: 'down' }
  },
  
  keyInsights: [
    'Strong motivation for change driven by current inefficiencies',
    'Clear vision of AI benefits and competitive advantages',
    'Moderate concerns about implementation complexity',
    'Healthy awareness of challenges while maintaining optimism'
  ],
  
  recommendations: [
    'Start with high-impact, low-risk AI pilot projects',
    'Invest in change management and training programs',
    'Establish clear governance and ethical guidelines',
    'Focus on augmentation rather than replacement strategies'
  ],
  
  readinessLevel: 'Ready with Preparation',
  confidenceLevel: 85
}

export default async function SurveyCompletePage({ params }: Props) {
  const resolvedParams = await params
  const router = useRouter()
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    // Simulate AI analysis processing
    const timer = setTimeout(() => {
      setAnalysisComplete(true)
      setTimeout(() => setShowResults(true), 500)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const getCategoryColor = (categoryId: string) => {
    const category = surveyCategories.find(c => c.id === categoryId)
    return category?.color || 'text-gray-400'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const downloadReport = () => {
    // Mock download functionality
    console.log('Downloading comprehensive report...')
  }

  const shareResults = () => {
    // Mock sharing functionality
    console.log('Sharing results...')
  }

  const viewDashboard = () => {
    router.push('/dashboard')
  }

  const scheduleFollowUp = () => {
    // Mock scheduling functionality
    console.log('Scheduling follow-up...')
  }

  return (
    <MainLayout user={mockUser} currentPath={`/survey/${resolvedParams.sessionId}/complete`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-400" />
          </div>
          <h1 className="text-4xl font-bold gradient-text">
            Assessment Complete!
          </h1>
          <p className="text-xl text-muted-foreground">
            Thank you for completing the AI Readiness Assessment
          </p>
        </div>

        {/* Analysis Status */}
        {!analysisComplete ? (
          <Card variant="glass" className="p-8 text-center">
            <div className="space-y-6">
              <div className="w-16 h-16 mx-auto">
                <CircularProgress 
                  value={75}
                  size={64}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Analyzing Your Responses</h3>
                <p className="text-muted-foreground">
                  Our AI is processing your answers and generating personalized insights...
                </p>
              </div>
              <div className="bg-teal-950/20 border border-teal-500/20 rounded-lg p-4">
                <p className="text-sm text-teal-400">
                  ⚡ Using advanced JTBD framework analysis to evaluate your AI readiness
                </p>
              </div>
            </div>
          </Card>
        ) : (
          showResults && (
            <div className="space-y-6">
              {/* Overall Score */}
              <Card variant="gradient" className="p-8 text-center">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold">Your AI Readiness Score</h2>
                  <div className="flex items-center justify-center space-x-8">
                    <div className="text-center">
                      <CircularProgress 
                        value={mockAnalysisResults.overallScore}
                        size={120}
                      />
                      <p className="mt-2 text-sm text-muted-foreground">Overall Readiness</p>
                    </div>
                    <div className="text-left space-y-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-teal-400" />
                        <span className="text-sm">Completed in {mockAnalysisResults.completionTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-teal-400" />
                        <span className="text-sm">{mockAnalysisResults.readinessLevel}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-teal-400" />
                        <span className="text-sm">{mockAnalysisResults.confidenceLevel}% Confidence</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Category Breakdown */}
              <Card variant="glass" className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-teal-400" />
                    <span>JTBD Framework Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(mockAnalysisResults.categoryScores).map(([categoryId, data]) => {
                      const category = surveyCategories.find(c => c.id === categoryId)
                      if (!category) return null

                      return (
                        <div key={categoryId} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{category.icon}</span>
                              <span className="font-medium">{category.label}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${getScoreColor(data.score)}`}>
                                {data.score}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {data.strength}
                              </div>
                            </div>
                          </div>
                          <Progress value={data.score} variant="gradient" className="h-2" />
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card variant="glass" className="p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg">Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <ul className="space-y-3">
                      {mockAnalysisResults.keyInsights.map((insight, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle2 className="h-4 w-4 text-teal-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card variant="glass" className="p-6">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 pb-0">
                    <ul className="space-y-3">
                      {mockAnalysisResults.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <TrendingUp className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <Card variant="glass" className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg">Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button
                      onClick={downloadReport}
                      variant="default"
                      className="w-full"
                      leftIcon={Download}
                    >
                      Download Report
                    </Button>
                    
                    <Button
                      onClick={shareResults}
                      variant="outline"
                      className="w-full"
                      leftIcon={Share2}
                    >
                      Share Results
                    </Button>
                    
                    <Button
                      onClick={viewDashboard}
                      variant="secondary"
                      className="w-full"
                      leftIcon={Eye}
                    >
                      View Dashboard
                    </Button>
                    
                    <Button
                      onClick={scheduleFollowUp}
                      variant="ghost"
                      className="w-full"
                      leftIcon={Calendar}
                    >
                      Schedule Follow-up
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results Preview */}
              <Card variant="glass" className="p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-teal-400" />
                    <span>Detailed Analysis Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground mb-4">
                      Your comprehensive analysis includes:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-bold text-teal-400">12</div>
                        <div>Questions Analyzed</div>
                      </div>
                      <div>
                        <div className="font-bold text-purple-400">4</div>
                        <div>JTBD Categories</div>
                      </div>
                      <div>
                        <div className="font-bold text-pink-400">15+</div>
                        <div>Key Insights</div>
                      </div>
                      <div>
                        <div className="font-bold text-green-400">8</div>
                        <div>Recommendations</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Notification */}
              <Card variant="glass" className="p-6">
                <div className="flex items-center space-x-4">
                  <Mail className="h-8 w-8 text-teal-400" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Results Sent to Your Email</h3>
                    <p className="text-sm text-muted-foreground">
                      A comprehensive report has been sent to {mockUser.email}. 
                      Check your inbox for detailed insights and next steps.
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
              </Card>
            </div>
          )
        )}
      </div>
    </MainLayout>
  )
}