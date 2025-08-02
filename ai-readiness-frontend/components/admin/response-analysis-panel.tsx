// Response Analysis Panel for Individual Survey Response Analysis
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExtendedJTBDAnalysisResult, JTBDForceType } from '@/lib/types/llm';
import {
  Brain,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Anchor,
  AlertTriangle,
  Users,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Lightbulb,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react';

interface ResponseAnalysisPanelProps {
  responseId: string;
  responseText: string;
  questionText: string;
  expectedForce?: JTBDForceType;
  existingAnalysis?: ExtendedJTBDAnalysisResult;
  onAnalysisComplete?: (analysis: ExtendedJTBDAnalysisResult) => void;
  context?: {
    employeeRole?: string;
    employeeDepartment?: string;
    organizationName?: string;
  };
}

const FORCE_ICONS = {
  pain_of_old: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  pull_of_new: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  anchors_to_old: { icon: Anchor, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  anxiety_of_new: { icon: AlertTriangle, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  demographic: { icon: Users, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' }
};

const SENTIMENT_COLORS = {
  very_positive: 'text-green-600 bg-green-50',
  positive: 'text-green-500 bg-green-50',
  neutral: 'text-gray-500 bg-gray-50',
  negative: 'text-red-500 bg-red-50',
  very_negative: 'text-red-600 bg-red-50'
};

export function ResponseAnalysisPanel({
  responseId,
  responseText,
  questionText,
  expectedForce,
  existingAnalysis,
  onAnalysisComplete,
  context
}: ResponseAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<ExtendedJTBDAnalysisResult | null>(existingAnalysis || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullResponse, setShowFullResponse] = useState(false);

  // Run analysis
  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          responseText,
          questionText,
          expectedForce: expectedForce || 'demographic',
          questionContext: 'AI readiness assessment',
          organizationId: context?.organizationName,
          ...context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.result);
      onAnalysisComplete?.(result.result);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const forceConfig = analysis ? FORCE_ICONS[analysis.primaryJtbdForce] : null;
  const ForceIcon = forceConfig?.icon || MessageCircle;

  // Truncate long text
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      {/* Response Text Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Survey Response
            </CardTitle>
            {!analysis && (
              <Button onClick={runAnalysis} disabled={analyzing} size="sm">
                {analyzing ? (
                  <>
                    <Brain className="h-4 w-4 mr-2 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            )}
          </div>
          <CardDescription>
            Question: {questionText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">
                {showFullResponse ? responseText : truncateText(responseText)}
              </p>
              {responseText.length > 150 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-2"
                  onClick={() => setShowFullResponse(!showFullResponse)}
                >
                  {showFullResponse ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>

            {context && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {context.employeeRole && (
                  <Badge variant="outline">Role: {context.employeeRole}</Badge>
                )}
                {context.employeeDepartment && (
                  <Badge variant="outline">Dept: {context.employeeDepartment}</Badge>
                )}
                {context.organizationName && (
                  <Badge variant="outline">Org: {context.organizationName}</Badge>
                )}
                {expectedForce && (
                  <Badge variant="outline">
                    Expected: {expectedForce.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Primary Analysis Overview */}
          <Card className={`${forceConfig?.border} ${forceConfig?.bg}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ForceIcon className={`h-5 w-5 ${forceConfig?.color}`} />
                  Primary JTBD Force
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    Strength: {analysis.forceStrengthScore}/5
                  </Badge>
                  <Badge variant="outline">
                    Confidence: {analysis.confidenceScore}/5
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">
                    {analysis.primaryJtbdForce.replace('_', ' ').toUpperCase()}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.reasoning}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Force Strength</div>
                    <Progress value={(analysis.forceStrengthScore / 5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Analysis Confidence</div>
                    <Progress value={(analysis.confidenceScore / 5) * 100} className="h-2" />
                  </div>
                </div>

                {analysis.secondaryJtbdForces.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">Secondary Forces</div>
                    <div className="flex gap-1">
                      {analysis.secondaryJtbdForces.map((force, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {force.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="insights" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              <TabsTrigger value="themes">Themes</TabsTrigger>
              <TabsTrigger value="business">Business Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Actionable Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Executive Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysis.actionableInsights.summaryInsight}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Detailed Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysis.actionableInsights.detailedAnalysis}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <ArrowRight className="h-4 w-4" />
                        Immediate Actions
                      </h4>
                      <ul className="space-y-1">
                        {analysis.actionableInsights.immediateActions.map((action, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Long-term Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {analysis.actionableInsights.longTermRecommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="w-1 h-1 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sentiment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sentiment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(analysis.sentimentAnalysis.overallScore * 100).toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Sentiment Score</div>
                      <Progress 
                        value={((analysis.sentimentAnalysis.overallScore + 1) / 2) * 100} 
                        className="h-2 mt-2" 
                      />
                    </div>

                    <div className="text-center">
                      <Badge 
                        className={`${SENTIMENT_COLORS[analysis.sentimentAnalysis.sentimentLabel]} border-0`}
                      >
                        {analysis.sentimentAnalysis.sentimentLabel.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Overall Sentiment</div>
                    </div>

                    <div className="text-center">
                      <Badge variant="outline">
                        {analysis.sentimentAnalysis.tone}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Emotional Tone</div>
                    </div>
                  </div>

                  {analysis.sentimentAnalysis.emotionalIndicators.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Emotional Indicators</h4>
                      <div className="flex flex-wrap gap-1">
                        {analysis.sentimentAnalysis.emotionalIndicators.map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            "{indicator}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="themes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Themes</CardTitle>
                  <CardDescription>
                    Identified themes and categories from the response
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Primary Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keyThemes.map((theme, idx) => (
                        <Badge key={idx} variant="secondary">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(analysis.themeCategories).map(([category, themes]) => (
                      themes.length > 0 && (
                        <div key={category}>
                          <h4 className="font-medium text-sm mb-2 capitalize">
                            {category} Themes
                          </h4>
                          <div className="space-y-1">
                            {themes.map((theme: string, idx: number) => (
                              <div key={idx} className="text-sm text-muted-foreground">
                                • {theme}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Business Impact</CardTitle>
                  <CardDescription>
                    Organizational implications and business value
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <Badge 
                        variant={
                          analysis.businessImplications.impactLevel === 'critical' ? 'destructive' :
                          analysis.businessImplications.impactLevel === 'high' ? 'default' :
                          'secondary'
                        }
                      >
                        {analysis.businessImplications.impactLevel.toUpperCase()}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Impact Level</div>
                    </div>

                    <div className="text-center p-3 border rounded-lg">
                      <Badge 
                        variant={
                          analysis.businessImplications.urgency === 'high' ? 'destructive' :
                          analysis.businessImplications.urgency === 'medium' ? 'default' :
                          'secondary'
                        }
                      >
                        {analysis.businessImplications.urgency.toUpperCase()}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Urgency</div>
                    </div>

                    <div className="text-center p-3 border rounded-lg">
                      <Badge 
                        variant={
                          analysis.qualityIndicators.responseQuality === 'excellent' ? 'default' :
                          analysis.qualityIndicators.responseQuality === 'good' ? 'secondary' :
                          'outline'
                        }
                      >
                        {analysis.qualityIndicators.responseQuality.toUpperCase()}
                      </Badge>
                      <div className="text-sm text-muted-foreground mt-1">Response Quality</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Affected Areas</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.businessImplications.affectedAreas.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">Business Value</h4>
                    <p className="text-sm text-muted-foreground">
                      {analysis.businessImplications.businessValue}
                    </p>
                  </div>

                  {analysis.analysisMetadata.followUpQuestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Follow-up Questions</h4>
                      <ul className="space-y-1">
                        {analysis.analysisMetadata.followUpQuestions.map((question, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            • {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}