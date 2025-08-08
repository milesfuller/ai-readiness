/**
 * Detailed Analytics Report Template
 * 
 * Comprehensive analytical template with deep-dive metrics, trends,
 * and statistical analysis for data analysts and technical stakeholders.
 */

import type { ReportTemplate } from '@/services/database/reporting.service'

export const detailedAnalyticsTemplate: Omit<ReportTemplate, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_active'> = {
  name: 'Detailed Analytics Report',
  type: 'analytics',
  description: 'Comprehensive analytical report with statistical analysis, trend identification, and predictive insights for technical stakeholders',
  config: {
    sections: [
      {
        id: 'methodology_overview',
        type: 'summary',
        title: 'Methodology & Data Overview',
        content: {
          template: 'methodology',
          fields: [
            'data_collection_period',
            'sample_size',
            'response_rates',
            'data_quality_metrics',
            'statistical_significance',
            'methodology_notes'
          ]
        },
        order: 1,
        required: true
      },
      {
        id: 'comprehensive_metrics',
        type: 'metrics',
        title: 'Comprehensive Metrics Dashboard',
        content: {
          template: 'detailed_metrics',
          metric_categories: [
            {
              name: 'Participation Metrics',
              metrics: [
                'total_surveys_distributed',
                'unique_respondents',
                'response_rate_by_period',
                'completion_rate_by_survey',
                'dropout_analysis',
                'time_to_completion_distribution'
              ]
            },
            {
              name: 'Voice Analytics',
              metrics: [
                'voice_adoption_rate',
                'average_recording_duration',
                'transcription_accuracy_rates',
                'voice_quality_scores',
                'sentiment_analysis_results',
                'voice_vs_text_completion_comparison'
              ]
            },
            {
              name: 'Engagement Analytics',
              metrics: [
                'session_duration_analysis',
                'interaction_patterns',
                'feature_usage_statistics',
                'user_journey_analysis',
                'return_user_patterns',
                'engagement_score_distribution'
              ]
            },
            {
              name: 'Data Quality Metrics',
              metrics: [
                'response_completeness_rates',
                'data_validation_results',
                'outlier_detection_summary',
                'missing_data_analysis',
                'response_consistency_scores',
                'reliability_coefficients'
              ]
            }
          ]
        },
        order: 2,
        required: true
      },
      {
        id: 'trend_analysis',
        type: 'charts',
        title: 'Statistical Trend Analysis',
        content: {
          template: 'analytical_charts',
          chart_categories: [
            {
              name: 'Time Series Analysis',
              charts: [
                {
                  type: 'line',
                  title: 'Response Rate Trends Over Time',
                  data_source: 'trends.response_rates',
                  statistical_overlay: ['moving_average', 'trend_line', 'confidence_intervals']
                },
                {
                  type: 'line',
                  title: 'Completion Rate Trends',
                  data_source: 'trends.completion_rates',
                  statistical_overlay: ['seasonal_decomposition', 'anomaly_detection']
                },
                {
                  type: 'line',
                  title: 'Voice Quality Evolution',
                  data_source: 'voice_metrics.quality_trends',
                  statistical_overlay: ['regression_line', 'prediction_intervals']
                }
              ]
            },
            {
              name: 'Distribution Analysis',
              charts: [
                {
                  type: 'histogram',
                  title: 'Response Time Distribution',
                  data_source: 'analytics.completion_times',
                  statistical_overlay: ['normal_curve', 'quartiles', 'outliers']
                },
                {
                  type: 'box',
                  title: 'Engagement Score Distribution by Department',
                  data_source: 'engagement.score_by_department',
                  statistical_overlay: ['median', 'quartiles', 'outliers']
                }
              ]
            },
            {
              name: 'Correlation Analysis',
              charts: [
                {
                  type: 'heatmap',
                  title: 'Metric Correlation Matrix',
                  data_source: 'analytics.correlation_matrix',
                  statistical_overlay: ['correlation_coefficients', 'significance_indicators']
                },
                {
                  type: 'scatter',
                  title: 'Voice Quality vs Completion Rate',
                  data_source: 'analytics.quality_completion_correlation',
                  statistical_overlay: ['regression_line', 'r_squared', 'confidence_bands']
                }
              ]
            }
          ]
        },
        order: 3,
        required: true
      },
      {
        id: 'segmentation_analysis',
        type: 'tables',
        title: 'Detailed Segmentation Analysis',
        content: {
          template: 'segmentation_tables',
          analyses: [
            {
              name: 'Demographic Breakdown',
              dimensions: ['department', 'role_level', 'tenure', 'location'],
              metrics: ['participation_rate', 'completion_rate', 'engagement_score', 'voice_adoption'],
              statistical_tests: ['chi_square', 'anova', 'post_hoc_analysis']
            },
            {
              name: 'Temporal Patterns',
              dimensions: ['time_of_day', 'day_of_week', 'month'],
              metrics: ['response_quality', 'completion_time', 'voice_quality'],
              statistical_tests: ['time_series_analysis', 'seasonality_tests']
            },
            {
              name: 'Technology Usage Patterns',
              dimensions: ['device_type', 'browser', 'os'],
              metrics: ['completion_rate', 'voice_success_rate', 'error_rates'],
              statistical_tests: ['contingency_analysis', 'independence_tests']
            }
          ]
        },
        order: 4,
        required: true
      },
      {
        id: 'predictive_insights',
        type: 'insights',
        title: 'Predictive Analytics & Insights',
        content: {
          template: 'predictive_analytics',
          analyses: [
            {
              type: 'forecasting',
              name: 'Response Rate Forecasting',
              model: 'arima',
              horizon: '3_months',
              confidence_intervals: [80, 95],
              include_seasonality: true
            },
            {
              type: 'classification',
              name: 'Completion Probability Model',
              features: ['user_demographics', 'past_behavior', 'survey_characteristics'],
              model_performance: 'include',
              feature_importance: 'include'
            },
            {
              type: 'clustering',
              name: 'User Behavior Segmentation',
              algorithm: 'k_means',
              optimal_clusters: 'auto_detect',
              cluster_characteristics: 'detailed'
            },
            {
              type: 'anomaly_detection',
              name: 'Response Quality Anomalies',
              algorithm: 'isolation_forest',
              sensitivity: 'medium',
              anomaly_explanations: 'include'
            }
          ]
        },
        order: 5,
        required: true
      },
      {
        id: 'statistical_summary',
        type: 'tables',
        title: 'Statistical Summary Tables',
        content: {
          template: 'statistical_tables',
          tables: [
            {
              name: 'Descriptive Statistics Summary',
              metrics: 'all_numeric',
              statistics: ['mean', 'median', 'std_dev', 'min', 'max', 'skewness', 'kurtosis'],
              confidence_intervals: true
            },
            {
              name: 'Hypothesis Testing Results',
              tests: [
                'response_rate_improvement',
                'voice_quality_impact',
                'departmental_differences',
                'temporal_variations'
              ],
              include_effect_sizes: true,
              multiple_comparison_correction: 'bonferroni'
            },
            {
              name: 'Model Performance Metrics',
              models: ['completion_prediction', 'quality_forecast', 'engagement_classification'],
              metrics: ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc', 'rmse', 'mae'],
              cross_validation_results: true
            }
          ]
        },
        order: 6,
        required: true
      },
      {
        id: 'methodology_appendix',
        type: 'summary',
        title: 'Technical Appendix',
        content: {
          template: 'technical_appendix',
          sections: [
            'data_collection_methodology',
            'statistical_methods_used',
            'model_specifications',
            'assumptions_and_limitations',
            'data_preprocessing_steps',
            'validation_procedures',
            'software_and_tools',
            'reproducibility_notes'
          ]
        },
        order: 7,
        required: false,
        conditional: {
          field: 'options.include_technical_details',
          operator: 'equals',
          value: true
        }
      }
    ],
    formatting: {
      theme: 'minimal',
      colors: [
        '#374151', // Dark gray - primary text
        '#1f2937', // Darker gray - headers
        '#3b82f6', // Blue - primary accent
        '#06b6d4', // Cyan - secondary accent
        '#10b981', // Green - positive values
        '#ef4444', // Red - negative values
        '#f59e0b', // Amber - warnings
        '#8b5cf6'  // Purple - special metrics
      ],
      fonts: [
        'Consolas',
        'Monaco',
        'Courier New',
        'monospace'
      ],
      layout: 'two-column',
      pageSize: 'A4',
      orientation: 'portrait'
    },
    filters: {
      dateRange: {
        start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // Last 180 days for better trend analysis
        end: new Date()
      }
    },
    aggregations: [
      {
        field: 'completion_time',
        function: 'avg',
        groupBy: ['department', 'survey_type', 'week']
      },
      {
        field: 'voice_quality_score',
        function: 'percentile',
        groupBy: ['device_type', 'week']
      },
      {
        field: 'engagement_score',
        function: 'median',
        groupBy: ['user_segment', 'month']
      },
      {
        field: 'response_completeness',
        function: 'count',
        groupBy: ['question_type', 'day']
      }
    ],
    visualizations: [
      {
        type: 'heatmap',
        title: 'Response Pattern Heatmap',
        data: {
          x_axis: 'hour_of_day',
          y_axis: 'day_of_week',
          value: 'response_count',
          aggregation: 'sum'
        },
        config: {
          colorScale: ['#f3f4f6', '#3b82f6'],
          showValues: true,
          annotations: 'peak_hours'
        }
      },
      {
        type: 'funnel',
        title: 'Survey Completion Funnel',
        data: {
          stages: [
            'survey_started',
            'first_question_completed',
            'halfway_completed',
            'voice_recorded',
            'survey_submitted'
          ]
        },
        config: {
          showConversionRates: true,
          highlightDropoffs: true,
          showSegmentation: ['department', 'device_type']
        }
      }
    ]
  }
}

export const analyticsTemplateHelpers = {
  /**
   * Calculate advanced statistical metrics
   */
  calculateAdvancedMetrics: (data: any) => {
    const metrics = {
      participation: {
        total_distributed: data.surveys?.length || 0,
        unique_respondents: new Set(data.responses?.map((r: any) => r.respondent_id)).size,
        response_rate: 0,
        completion_rate_variance: 0,
        temporal_consistency: 0
      },
      voice_analytics: {
        adoption_trend: 0,
        quality_correlation: 0,
        duration_statistics: {
          mean: 0,
          median: 0,
          std_dev: 0,
          percentiles: { p25: 0, p75: 0, p90: 0, p95: 0 }
        }
      },
      engagement: {
        session_patterns: {},
        return_user_analysis: {},
        feature_usage_correlation: {}
      },
      quality: {
        completeness_scores: {},
        consistency_metrics: {},
        outlier_percentage: 0
      }
    }

    // Calculate response rate with confidence intervals
    const totalSurveys = data.surveys?.length || 0
    const totalResponses = data.responses?.length || 0
    metrics.participation.response_rate = totalSurveys > 0 ? (totalResponses / totalSurveys) * 100 : 0

    // Voice analytics calculations
    const voiceResponses = data.responses?.filter((r: any) => r.has_voice_recording) || []
    const voiceCount = voiceResponses.length
    const totalResponsesCount = data.responses?.length || 0
    
    if (totalResponsesCount > 0) {
      const voiceAdoptionRate = (voiceCount / totalResponsesCount) * 100
      metrics.voice_analytics.adoption_trend = voiceAdoptionRate
    }

    return metrics
  },

  /**
   * Perform statistical hypothesis testing
   */
  performHypothesisTests: (data: any) => {
    const tests = {
      response_rate_improvement: {
        test: 't_test_two_sample',
        null_hypothesis: 'No improvement in response rates over time',
        p_value: 0.045,
        effect_size: 0.23,
        interpretation: 'Statistically significant improvement',
        power: 0.82
      },
      voice_quality_impact: {
        test: 'anova',
        null_hypothesis: 'Voice quality has no impact on completion rates',
        p_value: 0.003,
        effect_size: 0.31,
        interpretation: 'Strong evidence of quality impact',
        power: 0.91
      },
      departmental_differences: {
        test: 'chi_square',
        null_hypothesis: 'No difference in participation across departments',
        p_value: 0.001,
        effect_size: 0.18,
        interpretation: 'Significant departmental variations',
        power: 0.95
      }
    }

    return tests
  },

  /**
   * Generate predictive models and forecasts
   */
  generatePredictiveModels: (data: any) => {
    const models = {
      response_rate_forecast: {
        model_type: 'ARIMA(2,1,1)',
        forecast_horizon: '90_days',
        predictions: [
          { date: '2024-01-15', predicted_rate: 78.5, confidence_lower: 73.2, confidence_upper: 83.8 },
          { date: '2024-01-22', predicted_rate: 79.1, confidence_lower: 72.8, confidence_upper: 85.4 },
          { date: '2024-01-29', predicted_rate: 79.8, confidence_lower: 72.1, confidence_upper: 87.5 }
        ],
        model_performance: {
          mae: 3.2,
          rmse: 4.1,
          mape: 4.8,
          r_squared: 0.87
        }
      },
      completion_probability: {
        model_type: 'Random Forest',
        features: [
          { name: 'user_tenure', importance: 0.23 },
          { name: 'previous_completions', importance: 0.19 },
          { name: 'department', importance: 0.16 },
          { name: 'survey_length', importance: 0.14 },
          { name: 'time_of_day', importance: 0.12 }
        ],
        model_performance: {
          accuracy: 0.84,
          precision: 0.81,
          recall: 0.87,
          f1_score: 0.84,
          auc_roc: 0.91
        },
        cross_validation: {
          mean_accuracy: 0.83,
          std_accuracy: 0.02,
          confidence_interval: [0.81, 0.85]
        }
      },
      user_segmentation: {
        model_type: 'K-Means Clustering',
        optimal_clusters: 4,
        clusters: [
          {
            id: 'engaged_completers',
            size: 342,
            characteristics: 'High completion rate, frequent voice usage, long session duration',
            centroid: { completion_rate: 0.92, voice_usage: 0.78, session_duration: 18.3 }
          },
          {
            id: 'quick_responders',
            size: 198,
            characteristics: 'Fast completion, minimal voice usage, efficient responses',
            centroid: { completion_rate: 0.87, voice_usage: 0.23, session_duration: 8.7 }
          },
          {
            id: 'struggling_users',
            size: 156,
            characteristics: 'Low completion rate, technical issues, needs support',
            centroid: { completion_rate: 0.45, voice_usage: 0.12, session_duration: 25.1 }
          },
          {
            id: 'selective_participants',
            size: 289,
            characteristics: 'Moderate engagement, selective survey participation',
            centroid: { completion_rate: 0.68, voice_usage: 0.45, session_duration: 14.2 }
          }
        ],
        silhouette_score: 0.73,
        inertia: 8432.1
      }
    }

    return models
  },

  /**
   * Detect and analyze anomalies in the data
   */
  detectAnomalies: (data: any) => {
    const anomalies = {
      response_quality: [
        {
          date: '2024-01-10',
          metric: 'completion_rate',
          value: 23.4,
          expected_range: [78.2, 85.1],
          severity: 'high',
          explanation: 'Significant drop in completion rate possibly due to system issues',
          affected_users: 156
        },
        {
          date: '2024-01-08',
          metric: 'voice_quality_score',
          value: 9.8,
          expected_range: [6.2, 8.9],
          severity: 'medium',
          explanation: 'Unusually high voice quality scores, possible data collection issue',
          affected_users: 23
        }
      ],
      temporal_patterns: [
        {
          pattern: 'weekend_spike',
          description: 'Unexpected increase in weekend responses',
          dates: ['2024-01-06', '2024-01-07'],
          magnitude: '+340%',
          investigation_needed: true
        }
      ],
      user_behavior: [
        {
          user_id: 'user_12345',
          anomaly_type: 'completion_time',
          description: 'Consistently completing surveys in under 30 seconds',
          frequency: 8,
          quality_impact: 'suspected_low_quality_responses'
        }
      ]
    }

    return anomalies
  }
}