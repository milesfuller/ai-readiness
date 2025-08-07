'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Users,
  ArrowRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  Calendar,
  Clock,
  User,
  Building2,
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { fetchResponsesForComparison, type DetailedSurveyResponse, type ResponseComparisonData } from '@/lib/services/response-service'

interface ResponseComparisonToolProps {
  primaryResponse: DetailedSurveyResponse
  organizationId?: string
  surveyId?: string
}

interface ComparisonMetrics {
  sentimentSimilarity: number
  thematicOverlap: number
  confidenceDifference: number
  demographicMatch: number
  overallSimilarity: number
}

export function ResponseComparisonTool({ 
  primaryResponse, 
  organizationId, 
  surveyId 
}: ResponseComparisonToolProps) {
  const [compareResponses, setCompareResponses] = useState<DetailedSurveyResponse[]>([])
  const [selectedComparison, setSelectedComparison] = useState<DetailedSurveyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'similar' | 'different' | 'same_department' | 'same_role'>('all')
  const [comparisonData, setComparisonData] = useState<ResponseComparisonData | null>(null)

  useEffect(() => {
    loadComparisonCandidates()
  }, [primaryResponse.id, organizationId, surveyId, filterBy])

  const loadComparisonCandidates = async () => {
    try {
      setLoading(true)
      
      const criteria = {
        excludeResponseId: primaryResponse.id,
        organizationId,
        surveyId,
        department: filterBy === 'same_department' ? primaryResponse.participant.department : undefined,
        jobTitle: filterBy === 'same_role' ? primaryResponse.participant.jobTitle : undefined,
        similarityThreshold: filterBy === 'similar' ? 0.7 : filterBy === 'different' ? 0.3 : undefined
      }

      const responses = await fetchResponsesForComparison(criteria)
      
      let filteredResponses = responses

      if (searchTerm) {
        filteredResponses = responses.filter(r => 
          r.participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.participant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.participant.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.participant.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setCompareResponses(filteredResponses)
    } catch (error) {
      console.error('Failed to load comparison candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompareSelect = async (response: DetailedSurveyResponse) => {
    setSelectedComparison(response)
    
    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(primaryResponse, response)
    setComparisonData({
      primaryResponse,
      comparisonResponse: response,
      metrics,
      commonThemes: findCommonThemes(primaryResponse, response),
      differentiatingFactors: findDifferentiatingFactors(primaryResponse, response)
    })
  }

  const calculateComparisonMetrics = (primary: DetailedSurveyResponse, comparison: DetailedSurveyResponse): ComparisonMetrics => {
    // Simplified metrics calculation
    // In a real implementation, this would use actual analytics data
    
    const demographicMatch = (
      (primary.participant.department === comparison.participant.department ? 1 : 0) +
      (primary.participant.jobTitle === comparison.participant.jobTitle ? 1 : 0)
    ) / 2

    // Mock sentiment and thematic analysis
    const sentimentSimilarity = 0.75 + (Math.random() * 0.5 - 0.25)
    const thematicOverlap = 0.6 + (Math.random() * 0.4)
    const confidenceDifference = Math.abs(
      (primary.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / primary.answers.length) -
      (comparison.answers.reduce((sum, a) => sum + (a.confidence || 0), 0) / comparison.answers.length)
    ) / 5

    const overallSimilarity = (sentimentSimilarity + thematicOverlap + demographicMatch + (1 - confidenceDifference)) / 4

    return {
      sentimentSimilarity,
      thematicOverlap,
      confidenceDifference,
      demographicMatch,
      overallSimilarity
    }
  }

  const findCommonThemes = (primary: DetailedSurveyResponse, comparison: DetailedSurveyResponse): string[] => {
    // Mock implementation - would use actual NLP analysis
    const themes = ['AI Adoption', 'Training Needs', 'Process Automation', 'Data Management', 'Change Management']
    return themes.slice(0, Math.floor(Math.random() * 4) + 1)
  }

  const findDifferentiatingFactors = (primary: DetailedSurveyResponse, comparison: DetailedSurveyResponse): string[] => {
    const factors: string[] = []
    
    if (primary.participant.department !== comparison.participant.department) {
      factors.push(`Different departments: ${primary.participant.department} vs ${comparison.participant.department}`)
    }
    
    if (primary.participant.jobTitle !== comparison.participant.jobTitle) {
      factors.push(`Different roles: ${primary.participant.jobTitle} vs ${comparison.participant.jobTitle}`)
    }
    
    const primaryCompletion = primary.answers.length / primary.totalQuestions
    const comparisonCompletion = comparison.answers.length / comparison.totalQuestions
    
    if (Math.abs(primaryCompletion - comparisonCompletion) > 0.2) {
      factors.push(`Different completion rates: ${(primaryCompletion * 100).toFixed(0)}% vs ${(comparisonCompletion * 100).toFixed(0)}%`)
    }

    return factors
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500'
    if (score >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getSimilarityLabel = (score: number) => {
    if (score >= 0.8) return 'Very Similar'
    if (score >= 0.6) return 'Moderately Similar'
    if (score >= 0.4) return 'Somewhat Different'
    return 'Very Different'
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, department, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Responses</SelectItem>
            <SelectItem value="similar">Similar Responses</SelectItem>
            <SelectItem value="different">Different Responses</SelectItem>
            <SelectItem value="same_department">Same Department</SelectItem>
            <SelectItem value="same_role">Same Role</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={loadComparisonCandidates} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison Candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Available for Comparison ({compareResponses.length})
            </CardTitle>
            <CardDescription>
              Select a response to compare with the primary response
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {compareResponses.map((response) => (
                  <div 
                    key={response.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedComparison?.id === response.id 
                        ? 'border-blue-500 bg-blue-50/10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCompareSelect(response)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {response.participant.firstName} {response.participant.lastName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {response.participant.department || 'No department'}
                          <Briefcase className="h-3 w-3 ml-2" />
                          {response.participant.jobTitle || 'No title'}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={response.status === 'completed' ? 'default' : 'secondary'}>
                          {response.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {response.answers.length}/{response.totalQuestions} answers
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {compareResponses.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    No responses available for comparison
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Comparison Analysis
            </CardTitle>
            <CardDescription>
              Detailed comparison metrics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedComparison ? (
              <div className="text-center py-8 text-gray-500">
                Select a response from the left to see comparison analysis
              </div>
            ) : comparisonData ? (
              <div className="space-y-6">
                {/* Overall Similarity Score */}
                <div className="text-center p-4 bg-gray-50/5 rounded-lg">
                  <div className={`text-3xl font-bold ${getSimilarityColor(comparisonData.metrics.overallSimilarity)}`}>
                    {(comparisonData.metrics.overallSimilarity * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Overall Similarity - {getSimilarityLabel(comparisonData.metrics.overallSimilarity)}
                  </div>
                </div>

                {/* Detailed Metrics */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Sentiment Similarity</span>
                      <span className="text-sm">{(comparisonData.metrics.sentimentSimilarity * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={comparisonData.metrics.sentimentSimilarity * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Thematic Overlap</span>
                      <span className="text-sm">{(comparisonData.metrics.thematicOverlap * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={comparisonData.metrics.thematicOverlap * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Demographic Match</span>
                      <span className="text-sm">{(comparisonData.metrics.demographicMatch * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={comparisonData.metrics.demographicMatch * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Confidence Alignment</span>
                      <span className="text-sm">{((1 - comparisonData.metrics.confidenceDifference) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={(1 - comparisonData.metrics.confidenceDifference) * 100} className="h-2" />
                  </div>
                </div>

                {/* Common Themes */}
                {comparisonData.commonThemes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Common Themes
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {comparisonData.commonThemes.map((theme, idx) => (
                        <Badge key={idx} variant="default" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Differentiating Factors */}
                {comparisonData.differentiatingFactors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Key Differences
                    </h4>
                    <ul className="space-y-1">
                      {comparisonData.differentiatingFactors.map((factor, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side-by-side Response Comparison */}
      {comparisonData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Side-by-Side Response Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Primary Response */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Primary Response</span>
                  <Badge variant="outline">Original</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Participant:</strong> {primaryResponse.participant.firstName} {primaryResponse.participant.lastName}
                  </div>
                  <div className="text-sm">
                    <strong>Department:</strong> {primaryResponse.participant.department || 'Not specified'}
                  </div>
                  <div className="text-sm">
                    <strong>Role:</strong> {primaryResponse.participant.jobTitle || 'Not specified'}
                  </div>
                  <div className="text-sm">
                    <strong>Completion:</strong> {primaryResponse.answers.length}/{primaryResponse.totalQuestions} 
                    ({((primaryResponse.answers.length / primaryResponse.totalQuestions) * 100).toFixed(0)}%)
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="font-medium text-sm mb-2">Sample Responses:</h5>
                  <div className="space-y-2">
                    {primaryResponse.answers.slice(0, 3).map((answer, idx) => (
                      <div key={idx} className="text-xs bg-gray-50/5 p-2 rounded">
                        <div className="font-medium mb-1">Q{idx + 1}:</div>
                        <div className="text-gray-600">
                          {typeof answer.answer === 'string' ? 
                            (answer.answer.length > 100 ? answer.answer.substring(0, 100) + '...' : answer.answer) :
                            JSON.stringify(answer.answer)
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comparison Response */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Comparison Response</span>
                  <Badge variant="secondary">Comparison</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Participant:</strong> {selectedComparison?.participant.firstName} {selectedComparison?.participant.lastName}
                  </div>
                  <div className="text-sm">
                    <strong>Department:</strong> {selectedComparison?.participant.department || 'Not specified'}
                  </div>
                  <div className="text-sm">
                    <strong>Role:</strong> {selectedComparison?.participant.jobTitle || 'Not specified'}
                  </div>
                  <div className="text-sm">
                    <strong>Completion:</strong> {selectedComparison?.answers.length}/{selectedComparison?.totalQuestions} 
                    ({((selectedComparison?.answers.length || 0) / (selectedComparison?.totalQuestions || 1) * 100).toFixed(0)}%)
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="font-medium text-sm mb-2">Sample Responses:</h5>
                  <div className="space-y-2">
                    {selectedComparison?.answers.slice(0, 3).map((answer, idx) => (
                      <div key={idx} className="text-xs bg-gray-50/5 p-2 rounded">
                        <div className="font-medium mb-1">Q{idx + 1}:</div>
                        <div className="text-gray-600">
                          {typeof answer.answer === 'string' ? 
                            (answer.answer.length > 100 ? answer.answer.substring(0, 100) + '...' : answer.answer) :
                            JSON.stringify(answer.answer)
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}