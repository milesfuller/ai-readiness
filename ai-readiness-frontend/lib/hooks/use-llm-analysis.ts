// Custom React Hook for LLM Analysis Operations
import { useState, useCallback, useEffect } from 'react';
import { ExtendedJTBDAnalysisResult, OrganizationalAnalysis, BatchAnalysisResult, JTBDForceType } from '@/lib/types/llm';

interface UseLLMAnalysisOptions {
  organizationId?: string;
  surveyId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface LLMAnalysisState {
  analyses: ExtendedJTBDAnalysisResult[];
  organizationalAnalysis: OrganizationalAnalysis | null;
  summary: {
    totalAnalyses: number;
    successRate: number;
    avgConfidence: number;
    forceDistribution: Record<JTBDForceType, number>;
  } | null;
  loading: boolean;
  error: string | null;
}

interface LLMAnalysisActions {
  analyzeResponse: (
    responseId: string,
    responseText: string,
    questionText: string,
    expectedForce?: JTBDForceType,
    context?: any
  ) => Promise<ExtendedJTBDAnalysisResult>;
  
  runBatchAnalysis: (options?: {
    parallel?: boolean;
    priority?: 'low' | 'medium' | 'high';
    retryFailures?: boolean;
  }) => Promise<BatchAnalysisResult>;
  
  generateOrganizationalInsights: (includeRaw?: boolean) => Promise<OrganizationalAnalysis>;
  
  refreshData: () => Promise<void>;
  
  clearError: () => void;
}

export function useLLMAnalysis(options: UseLLMAnalysisOptions = {}): LLMAnalysisState & LLMAnalysisActions {
  const { organizationId, surveyId, autoRefresh = false, refreshInterval = 30000 } = options;

  const [state, setState] = useState<LLMAnalysisState>({
    analyses: [],
    organizationalAnalysis: null,
    summary: null,
    loading: false,
    error: null
  });

  // Fetch analysis data
  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Fetch analysis summary
      const summaryParams = new URLSearchParams({
        ...(organizationId && { organizationId }),
        ...(surveyId && { surveyId }),
        timeframe: '30d'
      });

      const summaryResponse = await fetch(`/api/llm/analytics/summary?${summaryParams}`);
      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch analysis summary');
      }
      const summaryData = await summaryResponse.json();

      // Fetch organizational analysis if available
      let orgAnalysis: any = null;
      if (organizationId) {
        const orgParams = new URLSearchParams({
          organizationId,
          ...(surveyId && { surveyId }),
          latest: 'true'
        });

        const orgResponse = await fetch(`/api/llm/organizational?${orgParams}`);
        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          orgAnalysis = orgData.latest?.analysis_result || null;
        }
      }

      setState(prev => ({
        ...prev,
        summary: summaryData.summary,
        organizationalAnalysis: orgAnalysis,
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        loading: false
      }));
    }
  }, [organizationId, surveyId]);

  // Analyze individual response
  const analyzeResponse = useCallback(async (
    responseId: string,
    responseText: string,
    questionText: string,
    expectedForce?: JTBDForceType,
    context?: any
  ): Promise<ExtendedJTBDAnalysisResult> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId,
          responseText,
          questionText,
          expectedForce: expectedForce || 'demographic',
          questionContext: 'AI readiness assessment',
          organizationId,
          surveyId,
          ...context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const result = await response.json();
      
      // Update analyses list
      setState(prev => ({
        ...prev,
        analyses: [result.result, ...prev.analyses.filter(a => a !== result.result)]
      }));

      // Refresh summary data
      await fetchData();

      return result.result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [organizationId, surveyId, fetchData]);

  // Run batch analysis
  const runBatchAnalysis = useCallback(async (options = {}): Promise<BatchAnalysisResult> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(surveyId && { surveyId }),
          ...(organizationId && { organizationId }),
          options: {
            parallel: true,
            priority: 'high',
            retryFailures: true,
            ...options
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Batch analysis failed');
      }

      const result = await response.json();

      // Update analyses with new results
      setState(prev => ({
        ...prev,
        analyses: [...result.results, ...prev.analyses]
      }));

      // Refresh data
      await fetchData();

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch analysis failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [organizationId, surveyId, fetchData]);

  // Generate organizational insights
  const generateOrganizationalInsights = useCallback(async (includeRaw = false): Promise<OrganizationalAnalysis> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const response = await fetch('/api/llm/organizational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organizationId || '',
          ...(surveyId && { surveyId }),
          includeRaw
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate organizational insights');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        organizationalAnalysis: result.analysis
      }));

      return result.analysis;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate insights';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [organizationId, surveyId]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    // Initial fetch
    fetchData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh, refreshInterval]);

  return {
    ...state,
    analyzeResponse,
    runBatchAnalysis,
    generateOrganizationalInsights,
    refreshData,
    clearError
  };
}

// Hook for cost tracking
export function useLLMCostTracking(organizationId?: string, timeframe: string = '7d') {
  const [costData, setCostData] = useState<{
    summary: any;
    timeSeries: any[];
    breakdowns: any;
    alerts: any[];
    loading: boolean;
    error: string | null;
  }>({
    summary: null,
    timeSeries: [],
    breakdowns: null,
    alerts: [],
    loading: false,
    error: null
  });

  const fetchCostData = useCallback(async () => {
    try {
      setCostData(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        ...(organizationId && { organizationId }),
        timeframe,
        groupBy: 'day'
      });

      const response = await fetch(`/api/llm/cost-tracking?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cost data');
      }

      const data = await response.json();

      setCostData(prev => ({
        ...prev,
        summary: data.summary,
        timeSeries: data.timeSeries,
        breakdowns: data.breakdowns,
        alerts: data.alerts,
        loading: false
      }));

    } catch (error) {
      setCostData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch cost data',
        loading: false
      }));
    }
  }, [organizationId, timeframe]);

  const updateBudgetSettings = useCallback(async (settings: {
    monthlyBudgetCents?: number;
    dailyLimitCents?: number;
    alertThresholds?: any;
    enableAlerts?: boolean;
  }) => {
    try {
      const response = await fetch('/api/llm/cost-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...settings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      // Refresh cost data
      await fetchCostData();

    } catch (error) {
      setCostData(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update settings'
      }));
      throw error;
    }
  }, [organizationId, fetchCostData]);

  useEffect(() => {
    fetchCostData();
  }, [fetchCostData]);

  return {
    ...costData,
    refreshData: fetchCostData,
    updateBudgetSettings
  };
}

// Hook for health monitoring
export function useLLMHealthMonitoring() {
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
    lastCheck?: string;
    loading: boolean;
  }>({
    status: 'healthy',
    loading: false
  });

  const checkHealth = useCallback(async () => {
    try {
      setHealth(prev => ({ ...prev, loading: true }));

      const response = await fetch('/api/llm/analyze', { method: 'GET' });
      const data = await response.json();

      setHealth({
        status: data.status,
        latency: data.latency,
        error: data.error,
        lastCheck: new Date().toISOString(),
        loading: false
      });

    } catch (error) {
      setHealth({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheck: new Date().toISOString(),
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    ...health,
    checkHealth
  };
}