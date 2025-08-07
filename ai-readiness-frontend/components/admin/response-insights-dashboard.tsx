'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BarChart3,
  PieChart,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Star,
  Award,
  Zap,
  Activity,
  Building2,
  Briefcase,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  ArrowDown,
  Equal,
  Eye,
  Download
} from 'lucide-react'
import type { DetailedSurveyResponse, ResponseAnalytics } from '@/lib/services/response-service'

interface ResponseInsightsDashboardProps {
  response: DetailedSurveyResponse
  analytics: ResponseAnalytics | null
}

interface InsightCard {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

export function ResponseInsightsDashboard({ response, analytics }: ResponseInsightsDashboardProps) {
  const [selectedInsightType, setSelectedInsightType] = useState<'overview' | 'behavioral' | 'comparative' | 'predictive'>('overview')

  // Generate insights based on response data
  const generateInsights = () => {
    if (!analytics) return []

    const insights: InsightCard[] = [
      {
        title: 'Overall Sentiment',
        value: analytics.overallSentimentScore > 0 ? `+${(analytics.overallSentimentScore * 100).toFixed(0)}%` : `${(analytics.overallSentimentScore * 100).toFixed(0)}%`,
        change: analytics.overallSentimentScore * 100,
        icon: analytics.overallSentimentScore > 0 ? TrendingUp : analytics.overallSentimentScore < 0 ? TrendingDown : Equal,
        color: analytics.overallSentimentScore > 0 ? 'text-green-500' : analytics.overallSentimentScore < 0 ? 'text-red-500' : 'text-gray-500',
        description: analytics.overallSentimentScore > 0.2 ? 'Positive outlook on AI adoption' : 
                    analytics.overallSentimentScore < -0.2 ? 'Concerns about AI implementation' : 
                    'Neutral stance on AI changes'
      },
      {
        title: 'Readiness Score',
        value: `${(analytics.readinessScore * 100).toFixed(0)}%`,
        icon: Target,
        color: analytics.readinessScore > 0.7 ? 'text-green-500' : analytics.readinessScore > 0.4 ? 'text-yellow-500' : 'text-red-500',
        description: analytics.readinessScore > 0.7 ? 'High readiness for AI adoption' : 
                    analytics.readinessScore > 0.4 ? 'Moderate readiness, needs support' : 
                    'Low readiness, requires significant preparation'
      },
      {
        title: 'Engagement Level',
        value: `${(analytics.engagementScore * 100).toFixed(0)}%`,
        icon: Activity,
        color: analytics.engagementScore > 0.8 ? 'text-green-500' : analytics.engagementScore > 0.6 ? 'text-yellow-500' : 'text-red-500',
        description: analytics.engagementScore > 0.8 ? 'Highly engaged participant' : 
                    analytics.engagementScore > 0.6 ? 'Moderately engaged responses' : 
                    'Limited engagement in survey'
      },
      {
        title: 'Business Impact',
        value: analytics.businessImpactLevel.charAt(0).toUpperCase() + analytics.businessImpactLevel.slice(1),
        icon: Building2,
        color: analytics.businessImpactLevel === 'high' ? 'text-red-500' : 
               analytics.businessImpactLevel === 'medium' ? 'text-yellow-500' : 'text-green-500',
        description: analytics.businessImpactLevel === 'high' ? 'Critical areas need immediate attention' : 
                    analytics.businessImpactLevel === 'medium' ? 'Some areas require planning' : 
                    'Well-positioned for AI adoption'
      }
    ]

    return insights
  }

  const insights = generateInsights()

  // JTBD Forces Analysis
  const jtbdAnalysis = analytics?.jtbdForces ? {
    push: {
      score: analytics.jtbdForces.push,
      label: 'Push Forces',
      description: 'Pain points driving change',
      color: 'text-red-500',
      icon: TrendingDown
    },
    pull: {
      score: analytics.jtbdForces.pull,
      label: 'Pull Forces', 
      description: 'Benefits attracting change',
      color: 'text-green-500',
      icon: TrendingUp
    },
    habit: {
      score: analytics.jtbdForces.habit,
      label: 'Habit Forces',
      description: 'Inertia preventing change',
      color: 'text-yellow-500',
      icon: Users
    },
    anxiety: {
      score: analytics.jtbdForces.anxiety,
      label: 'Anxiety Forces',
      description: 'Fears about change',
      color: 'text-purple-500',
      icon: AlertTriangle
    }
  } : null

  // Behavioral patterns based on response data
  const behavioralPatterns = {
    responseStyle: response.answers.some(a => typeof a.answer === 'string' && a.answer.length > 200) ? 'detailed' : 'concise',
    confidencePattern: response.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / response.answers.length,
    completionSpeed: response.completionTime ? response.completionTime / response.answers.length : 0,
    thematicFocus: analytics?.keyThemes.slice(0, 3) || []
  }

  return (
    <div className="space-y-6">
      {/* Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          return (
            <Card key={index} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">{insight.title}</p>
                    <p className="text-2xl font-bold text-white">{insight.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{insight.description}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${insight.color}`} />
                </div>
                {insight.change !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1">
                      {insight.change > 0 ? (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      ) : insight.change < 0 ? (
                        <ArrowDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <Equal className="h-3 w-3 text-gray-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        vs. organization avg
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detailed Insights Tabs */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Detailed Insights Analysis
          </CardTitle>
          <CardDescription>
            Deep dive into response patterns and behavioral insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedInsightType} onValueChange={(value: any) => setSelectedInsightType(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
              <TabsTrigger value="comparative">Comparative</TabsTrigger>
              <TabsTrigger value="predictive">Predictive</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* JTBD Forces */}
              {jtbdAnalysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Jobs-to-be-Done Forces
                    </CardTitle>
                    <CardDescription>
                      Understanding the forces influencing AI adoption decisions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(jtbdAnalysis).map(([key, force]) => {
                        const Icon = force.icon
                        return (
                          <div key={key} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-5 w-5 ${force.color}`} />
                              <h4 className="font-medium">{force.label}</h4>
                              <Badge variant="outline">{force.score.toFixed(1)}/5</Badge>
                            </div>
                            <Progress value={(force.score / 5) * 100} className="h-2" />
                            <p className="text-sm text-gray-600">{force.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Themes */}
              {analytics?.keyThemes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Thematic Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-3">Primary Themes</h4>
                        <div className="flex flex-wrap gap-2">
                          {analytics.keyThemes.slice(0, 8).map((theme, idx) => (
                            <Badge key={idx} variant="secondary">{theme}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3">Response Quality</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Avg Confidence</span>
                            <span className="text-sm font-medium">{analytics.averageConfidence.toFixed(1)}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Completion Rate</span>
                            <span className="text-sm font-medium">
                              {((response.answers.length / response.totalQuestions) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Response Depth</span>
                            <span className="text-sm font-medium">
                              {behavioralPatterns.responseStyle === 'detailed' ? 'Detailed' : 'Concise'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Behavioral Tab */}
            <TabsContent value="behavioral" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Response Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Response Style</span>
                        <Badge variant={behavioralPatterns.responseStyle === 'detailed' ? 'default' : 'secondary'}>
                          {behavioralPatterns.responseStyle === 'detailed' ? 'Detailed' : 'Concise'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        {behavioralPatterns.responseStyle === 'detailed' ? 
                          'Provides comprehensive, thoughtful responses' : 
                          'Tends to give brief, to-the-point answers'}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Confidence Level</span>
                        <span className="text-sm font-medium">
                          {behavioralPatterns.confidencePattern.toFixed(1)}/5
                        </span>
                      </div>
                      <Progress value={(behavioralPatterns.confidencePattern / 5) * 100} className="h-2" />
                      <p className="text-xs text-gray-600 mt-1">
                        {behavioralPatterns.confidencePattern >= 4 ? 'High confidence in responses' :
                         behavioralPatterns.confidencePattern >= 3 ? 'Moderate confidence level' :
                         'Lower confidence, may need support'}
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Completion Speed</span>
                        <span className="text-sm font-medium">
                          {behavioralPatterns.completionSpeed ? 
                            `${Math.round(behavioralPatterns.completionSpeed / 60)}m/q` : 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {behavioralPatterns.completionSpeed > 180 ? 'Thoughtful, takes time to consider' :
                         behavioralPatterns.completionSpeed > 60 ? 'Moderate pace, balanced approach' :
                         'Quick responses, efficient completion'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Engagement Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-green-400">
                          {response.answers.filter(a => a.confidence && a.confidence >= 4).length}
                        </div>
                        <div className="text-xs text-gray-400">High Confidence</div>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-lg">
                        <div className="text-xl font-bold text-blue-400">
                          {response.answers.filter(a => typeof a.answer === 'string' && a.answer.length > 100).length}
                        </div>
                        <div className="text-xs text-gray-400">Detailed Answers</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Focus Areas</h4>
                      <div className="flex flex-wrap gap-1">
                        {behavioralPatterns.thematicFocus.map((theme, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Comparative Tab */}
            <TabsContent value="comparative" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Peer Comparison
                    </CardTitle>
                    <CardDescription>
                      How this response compares to similar participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">vs. Same Department</span>
                        <Badge variant="secondary">Above Average</Badge>
                      </div>
                      <Progress value={75} className="h-2" />
                      <p className="text-xs text-gray-600 mt-1">
                        Sentiment 15% higher than department average
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">vs. Same Role Level</span>
                        <Badge variant="outline">Average</Badge>
                      </div>
                      <Progress value={60} className="h-2" />
                      <p className="text-xs text-gray-600 mt-1">
                        Readiness score aligns with peer group
                      </p>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">vs. Organization</span>
                        <Badge variant="default">Top Quartile</Badge>
                      </div>
                      <Progress value={85} className="h-2" />
                      <p className="text-xs text-gray-600 mt-1">
                        Engagement in top 25% of all responses
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Statistical Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold">75th</div>
                        <div className="text-xs text-gray-600">Percentile</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-lg font-bold">+2.3σ</div>
                        <div className="text-xs text-gray-600">Std Dev</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2">Outlier Analysis</h4>
                      <ul className="text-xs text-gray-600 space-y-1">
                        <li>• Exceptionally high confidence scores</li>
                        <li>• Above-average response length</li>
                        <li>• Strong positive sentiment indicators</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Predictive Tab */}
            <TabsContent value="predictive" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      AI Adoption Likelihood
                    </CardTitle>
                    <CardDescription>
                      Predicted success factors for AI implementation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">82%</div>
                      <div className="text-sm text-gray-600">Success Probability</div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Technical Readiness</span>
                          <span>High</span>
                        </div>
                        <Progress value={85} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Change Acceptance</span>
                          <span>Moderate</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Support Needs</span>
                          <span>Low</span>
                        </div>
                        <Progress value={25} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        High Priority
                      </h4>
                      <ul className="text-xs text-gray-600 space-y-1 ml-5">
                        <li>• Include in early adopter program</li>
                        <li>• Assign as peer mentor role</li>
                        <li>• Fast-track advanced training</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Considerations
                      </h4>
                      <ul className="text-xs text-gray-600 space-y-1 ml-5">
                        <li>• Monitor change management concerns</li>
                        <li>• Provide leadership communication updates</li>
                        <li>• Regular check-ins during rollout</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Briefcase className="h-4 w-4 text-blue-500" />
                        Role Optimization
                      </h4>
                      <ul className="text-xs text-gray-600 space-y-1 ml-5">
                        <li>• Excellent candidate for AI-augmented workflows</li>
                        <li>• Consider for cross-functional AI projects</li>
                        <li>• Potential AI champion within department</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}