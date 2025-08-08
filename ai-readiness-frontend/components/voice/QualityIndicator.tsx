'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, TrendingUp, Volume2, Mic, Signal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface QualityMetrics {
  overall: number; // 0-100
  audioClarity: number; // 0-100
  backgroundNoise: number; // 0-100 (higher = more noise)
  signalStrength: number; // 0-100
  speechRate: number; // words per minute
  volume: number; // 0-100
  timestamp: number;
}

interface QualityIssue {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

interface QualityIndicatorProps {
  metrics: QualityMetrics;
  isRealTime?: boolean;
  issues?: QualityIssue[];
  onIssueResolve?: (issueId: string) => void;
  showSuggestions?: boolean;
  className?: string;
}

export const QualityIndicator: React.FC<QualityIndicatorProps> = ({
  metrics,
  isRealTime = false,
  issues = [],
  onIssueResolve,
  showSuggestions = true,
  className = ''
}) => {
  const [metricsHistory, setMetricsHistory] = useState<QualityMetrics[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isRealTime) {
      setMetricsHistory(prev => {
        const newHistory = [...prev, metrics].slice(-20); // Keep last 20 measurements
        return newHistory;
      });
    }
  }, [metrics, isRealTime]);

  const getQualityGrade = (score: number): { grade: string; color: string; description: string } => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600 bg-green-100', description: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600 bg-blue-100', description: 'Good' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600 bg-yellow-100', description: 'Fair' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-600 bg-orange-100', description: 'Poor' };
    return { grade: 'F', color: 'text-red-600 bg-red-100', description: 'Very Poor' };
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case 'volume': return <Volume2 className="w-4 h-4" />;
      case 'signal': return <Signal className="w-4 h-4" />;
      case 'clarity': return <Mic className="w-4 h-4" />;
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-blue-300 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const dismissIssue = (issueId: string) => {
    setDismissedIssues(prev => new Set([...prev, issueId]));
    if (onIssueResolve) {
      onIssueResolve(issueId);
    }
  };

  const getAverageMetric = (metricKey: keyof QualityMetrics): number => {
    if (metricsHistory.length === 0) return metrics[metricKey] as number;
    const sum = metricsHistory.reduce((acc, m) => acc + (m[metricKey] as number), 0);
    return sum / metricsHistory.length;
  };

  const getTrend = (metricKey: keyof QualityMetrics): 'up' | 'down' | 'stable' => {
    if (metricsHistory.length < 3) return 'stable';
    const recent = metricsHistory.slice(-3);
    const start = recent[0][metricKey] as number;
    const end = recent[recent.length - 1][metricKey] as number;
    const diff = end - start;
    if (Math.abs(diff) < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getTrendColor = (trend: string, isGoodMetric: boolean = true) => {
    if (trend === 'stable') return 'text-gray-500';
    const isPositive = trend === 'up';
    const shouldBeGreen = isGoodMetric ? isPositive : !isPositive;
    return shouldBeGreen ? 'text-green-500' : 'text-red-500';
  };

  const qualityGrade = getQualityGrade(metrics.overall);
  const visibleIssues = issues.filter(issue => !dismissedIssues.has(issue.id));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Quality Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Audio Quality
            {isRealTime && (
              <Badge variant="secondary" className="ml-2">
                Live
              </Badge>
            )}
          </h3>
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="ghost"
            size="sm"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        <div className="flex items-center space-x-6">
          {/* Grade Circle */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${qualityGrade.color} border-2`}>
            <div className="text-center">
              <div className="text-2xl font-bold">{qualityGrade.grade}</div>
              <div className="text-xs">{Math.round(metrics.overall)}</div>
            </div>
          </div>

          {/* Quality Description */}
          <div className="flex-1">
            <div className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {qualityGrade.description}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Overall audio quality score: {Math.round(metrics.overall)}/100
            </div>
            {isRealTime && metricsHistory.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Average over {metricsHistory.length} samples: {Math.round(getAverageMetric('overall'))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Detailed Metrics */}
      {showDetails && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            Detailed Metrics
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audio Clarity */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getMetricIcon('clarity')}
                  <span className="font-medium text-gray-700 dark:text-gray-300">Audio Clarity</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-semibold">{Math.round(metrics.audioClarity)}</span>
                  <span className={`text-sm ${getTrendColor(getTrend('audioClarity'))}`}>
                    {getTrend('audioClarity') === 'up' ? '↗' : getTrend('audioClarity') === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.audioClarity}%` }}
                />
              </div>
            </div>

            {/* Background Noise */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getMetricIcon('signal')}
                  <span className="font-medium text-gray-700 dark:text-gray-300">Background Noise</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-semibold">{Math.round(metrics.backgroundNoise)}</span>
                  <span className={`text-sm ${getTrendColor(getTrend('backgroundNoise'), false)}`}>
                    {getTrend('backgroundNoise') === 'up' ? '↗' : getTrend('backgroundNoise') === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    metrics.backgroundNoise > 60 ? 'bg-red-500' :
                    metrics.backgroundNoise > 30 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.backgroundNoise}%` }}
                />
              </div>
            </div>

            {/* Signal Strength */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getMetricIcon('signal')}
                  <span className="font-medium text-gray-700 dark:text-gray-300">Signal Strength</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-semibold">{Math.round(metrics.signalStrength)}</span>
                  <span className={`text-sm ${getTrendColor(getTrend('signalStrength'))}`}>
                    {getTrend('signalStrength') === 'up' ? '↗' : getTrend('signalStrength') === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.signalStrength}%` }}
                />
              </div>
            </div>

            {/* Volume Level */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getMetricIcon('volume')}
                  <span className="font-medium text-gray-700 dark:text-gray-300">Volume Level</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-lg font-semibold">{Math.round(metrics.volume)}</span>
                  <span className={`text-sm ${getTrendColor(getTrend('volume'))}`}>
                    {getTrend('volume') === 'up' ? '↗' : getTrend('volume') === 'down' ? '↘' : '→'}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    metrics.volume < 20 || metrics.volume > 90 ? 'bg-red-500' :
                    metrics.volume < 40 || metrics.volume > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.volume}%` }}
                />
              </div>
            </div>
          </div>

          {/* Speech Rate */}
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getMetricIcon('trend')}
                <span className="font-medium text-gray-700 dark:text-gray-300">Speech Rate</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{Math.round(metrics.speechRate)} WPM</div>
                <div className="text-sm text-gray-500">
                  {metrics.speechRate < 120 ? 'Slow' : 
                   metrics.speechRate > 180 ? 'Fast' : 'Normal'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Quality Issues */}
      {visibleIssues.length > 0 && (
        <Card className="p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            Quality Issues ({visibleIssues.length})
          </h4>
          <div className="space-y-3">
            {visibleIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
              >
                <div className="flex items-start space-x-3">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-gray-900">{issue.title}</h5>
                      <Badge variant="outline" className="text-xs">
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                    {showSuggestions && (
                      <div className="bg-white bg-opacity-50 p-2 rounded text-sm text-gray-700">
                        <strong>Suggestion:</strong> {issue.suggestion}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => dismissIssue(issue.id)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quality Tips */}
      {showSuggestions && visibleIssues.length === 0 && metrics.overall < 80 && (
        <Card className="p-6 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Tips to Improve Audio Quality
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Move closer to the microphone</li>
                <li>• Reduce background noise</li>
                <li>• Speak clearly and at a steady pace</li>
                <li>• Ensure good internet connection for real-time processing</li>
                <li>• Use a dedicated microphone if possible</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default QualityIndicator;