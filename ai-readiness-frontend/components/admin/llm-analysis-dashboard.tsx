// LLM Analysis Dashboard for Admin Interface
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExtendedJTBDAnalysisResult, OrganizationalAnalysis, BatchAnalysisResult, JTBDForceType } from '@/lib/types/llm';
import { 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Target,
  Filter
} from 'lucide-react';

interface LLMAnalysisDashboardProps {
  organizationId?: string;
  surveyId?: string;
}

interface AnalysisSummary {
  totalAnalyses: number;
  completedToday: number;
  successRate: number;
  totalCost: number;
  avgConfidence: number;
  forceDistribution: Record<JTBDForceType, number>;
}

interface CostSummary {
  totalCostCents: number;
  totalTokens: number;
  totalRequests: number;
  successRate: number;
  dailyCosts: Array<{ date: string; cost: number }>;
}

export function LLMAnalysisDashboard({ organizationId, surveyId }: LLMAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [organizationalAnalysis, setOrganizationalAnalysis] = useState<OrganizationalAnalysis | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<ExtendedJTBDAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load analysis summary
      const summaryResponse = await fetch(`/api/llm/analytics/summary?${new URLSearchParams({
        ...(organizationId && { organizationId }),
        ...(surveyId && { surveyId }),
        timeframe: selectedTimeframe
      })}`);

      if (!summaryResponse.ok) {
        throw new Error('Failed to load analysis summary');
      }

      const summaryData = await summaryResponse.json();
      setAnalysisSummary(summaryData.summary);

      // Load cost tracking data
      const costResponse = await fetch(`/api/llm/cost-tracking?${new URLSearchParams({
        ...(organizationId && { organizationId }),
        ...(surveyId && { surveyId }),
        timeframe: selectedTimeframe
      })}`);

      if (costResponse.ok) {
        const costData = await costResponse.json();
        setCostSummary(costData.summary);
      }

      // Load organizational analysis if available
      if (organizationId) {
        const orgResponse = await fetch(`/api/llm/organizational?${new URLSearchParams({
          organizationId,
          ...(surveyId && { surveyId }),
          latest: 'true'
        })}`);

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          if (orgData.latest) {
            setOrganizationalAnalysis(orgData.latest.analysis_result);
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [organizationId, surveyId, selectedTimeframe]);

  // Run batch analysis
  const runBatchAnalysis = async () => {
    try {
      setBatchProcessing(true);
      setError(null);

      const response = await fetch('/api/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(surveyId && { surveyId }),
          ...(organizationId && { organizationId }),
          options: {
            parallel: true,
            priority: 'high',
            retryFailures: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Batch analysis failed');
      }

      const result: BatchAnalysisResult = await response.json();
      
      // Refresh dashboard data
      await loadDashboardData();

      // Show success message
      alert(`Batch analysis completed successfully!\n\n` +
            `✅ Processed: ${result.summary.totalProcessed} responses\n` +
            `✅ Successful: ${result.summary.successful}\n` +
            `❌ Failed: ${result.summary.failed}\n` +
            `💰 Cost: $${(result.summary.totalCostCents / 100).toFixed(2)}\n` +
            `⏱️ Time: ${(result.summary.processingTimeMs / 1000).toFixed(1)}s`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch analysis failed');
    } finally {
      setBatchProcessing(false);
    }
  };

  // Generate organizational insights
  const generateOrganizationalInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/llm/organizational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...(surveyId && { surveyId }),
          includeRaw: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate organizational insights');
      }

      const result = await response.json();
      setOrganizationalAnalysis(result.analysis);

      alert('Organizational insights generated successfully!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading && !analysisSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 animate-spin" />
          <span>Loading LLM analysis dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6" />
            LLM Analysis Dashboard
          </h2>
          <p className="text-muted-foreground">
            AI-powered JTBD analysis and insights for survey responses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisSummary?.totalAnalyses || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{analysisSummary?.completedToday || 0} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisSummary?.successRate?.toFixed(1) || 0}%</div>
            <Progress value={analysisSummary?.successRate || 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((costSummary?.totalCostCents || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {costSummary?.totalTokens?.toLocaleString() || 0} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisSummary?.avgConfidence?.toFixed(1) || 0}</div>
            <Progress value={(analysisSummary?.avgConfidence || 0) * 20} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis Results</TabsTrigger>
          <TabsTrigger value="insights">Organizational Insights</TabsTrigger>
          <TabsTrigger value="cost">Cost Tracking</TabsTrigger>
          <TabsTrigger value="batch">Batch Processing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* JTBD Force Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>JTBD Force Distribution</CardTitle>
                <CardDescription>
                  Distribution of responses across the four forces of progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisSummary?.forceDistribution && Object.entries(analysisSummary.forceDistribution).map(([force, count]) => (
                    <div key={force} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {force.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{count}</span>
                        <div className="w-20 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ 
                              width: `${(count / (analysisSummary?.totalAnalyses || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Analysis Quality */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Quality Metrics</CardTitle>
                <CardDescription>
                  Quality indicators for recent analyses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Quality</span>
                    <Badge variant="secondary">Good</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Specificity Level</span>
                    <Badge variant="secondary">Specific</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Business Relevance</span>
                    <Badge variant="secondary">High</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Actionability</span>
                    <Badge variant="secondary">Medium</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <AnalysisResultsView 
            organizationId={organizationId}
            surveyId={surveyId}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <OrganizationalInsightsView 
            analysis={organizationalAnalysis}
            onGenerate={generateOrganizationalInsights}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <CostTrackingView 
            organizationId={organizationId}
            surveyId={surveyId}
            timeframe={selectedTimeframe}
          />
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <BatchProcessingView 
            organizationId={organizationId}
            surveyId={surveyId}
            onRunBatch={runBatchAnalysis}
            processing={batchProcessing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Sub-components for each tab
function AnalysisResultsView({ organizationId, surveyId }: { organizationId?: string; surveyId?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Analysis Results</CardTitle>
        <CardDescription>
          Latest JTBD analysis results from survey responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Analysis results table would be implemented here
        </div>
      </CardContent>
    </Card>
  );
}

function OrganizationalInsightsView({ 
  analysis, 
  onGenerate, 
  loading 
}: { 
  analysis: OrganizationalAnalysis | null; 
  onGenerate: () => void;
  loading: boolean;
}) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organizational AI Readiness Insights</CardTitle>
          <CardDescription>
            Generate comprehensive insights from analyzed survey responses
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            No organizational insights available yet
          </p>
          <Button onClick={onGenerate} disabled={loading}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{analysis.executiveSummary.overallReadinessScore}/5</div>
              <div className="text-sm text-muted-foreground">Readiness Score</div>
            </div>
            <div className="text-center">
              <Badge variant="secondary" className="text-sm">
                {analysis.executiveSummary.readinessLevel.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Readiness Level</div>
            </div>
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                {analysis.executiveSummary.confidenceLevel.toUpperCase()}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">Confidence</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{analysis.executiveSummary.keyFinding}</p>
        </CardContent>
      </Card>

      {/* Force Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(analysis.jtbdForceAnalysis).map(([force, data]) => (
          <Card key={force}>
            <CardHeader>
              <CardTitle className="text-sm">
                {force.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average Score</span>
                  <Badge variant="outline">{data.averageScore}/5</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Strength</span>
                  <Badge variant="secondary">{data.strength}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Top themes: {data.topThemes.slice(0, 3).join(', ')}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CostTrackingView({ 
  organizationId, 
  surveyId, 
  timeframe 
}: { 
  organizationId?: string; 
  surveyId?: string; 
  timeframe: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Tracking & Usage</CardTitle>
        <CardDescription>
          Monitor API usage costs and token consumption
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          Cost tracking charts and metrics would be implemented here
        </div>
      </CardContent>
    </Card>
  );
}

function BatchProcessingView({ 
  organizationId, 
  surveyId, 
  onRunBatch, 
  processing 
}: { 
  organizationId?: string; 
  surveyId?: string; 
  onRunBatch: () => void;
  processing: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Analysis Processing</CardTitle>
        <CardDescription>
          Run analysis on multiple survey responses at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <h4 className="font-medium">Run Batch Analysis</h4>
            <p className="text-sm text-muted-foreground">
              Process all unanalyzed responses in this {surveyId ? 'survey' : 'organization'}
            </p>
          </div>
          <Button onClick={onRunBatch} disabled={processing}>
            {processing ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Pending Responses</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Processing</div>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}