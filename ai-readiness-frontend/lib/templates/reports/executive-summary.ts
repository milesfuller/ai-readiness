/**
 * Executive Summary Report Template
 * 
 * High-level strategic overview template for executive stakeholders
 * focusing on key metrics, insights, and strategic recommendations.
 */

import type { ReportTemplate, ReportSection } from '@/services/database/reporting.service'

export const executiveSummaryTemplate: Omit<ReportTemplate, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_active'> = {
  name: 'Executive Summary Report',
  type: 'executive',
  description: 'Comprehensive executive overview with key metrics, trends, and strategic recommendations for senior leadership',
  config: {
    sections: [
      {
        id: 'executive_overview',
        type: 'summary',
        title: 'Executive Overview',
        content: {
          template: 'executive_overview',
          fields: [
            'organization_summary',
            'reporting_period',
            'key_highlights',
            'critical_issues'
          ]
        },
        order: 1,
        required: true
      },
      {
        id: 'performance_scorecard',
        type: 'metrics',
        title: 'Performance Scorecard',
        content: {
          template: 'scorecard',
          metrics: [
            {
              name: 'AI Readiness Score',
              field: 'analytics.readiness_score',
              format: 'percentage',
              target: 75,
              critical: true
            },
            {
              name: 'Survey Completion Rate',
              field: 'analytics.completionRate',
              format: 'percentage',
              target: 80,
              critical: true
            },
            {
              name: 'Employee Participation',
              field: 'analytics.participationRate',
              format: 'percentage',
              target: 90,
              critical: true
            },
            {
              name: 'Voice Response Adoption',
              field: 'analytics.voiceResponseRate',
              format: 'percentage',
              target: 60,
              critical: false
            }
          ]
        },
        order: 2,
        required: true
      },
      {
        id: 'strategic_insights',
        type: 'insights',
        title: 'Strategic Insights',
        content: {
          template: 'strategic_insights',
          categories: [
            'organizational_readiness',
            'technology_adoption',
            'workforce_sentiment',
            'risk_assessment'
          ],
          analysis_depth: 'executive'
        },
        order: 3,
        required: true
      },
      {
        id: 'trend_analysis',
        type: 'charts',
        title: 'Trend Analysis',
        content: {
          template: 'executive_charts',
          charts: [
            {
              type: 'line',
              title: 'AI Readiness Progression',
              data_source: 'trends.readiness_over_time',
              time_period: '3_months'
            },
            {
              type: 'bar',
              title: 'Departmental Readiness Comparison',
              data_source: 'segments.department_comparison',
              show_benchmarks: true
            }
          ]
        },
        order: 4,
        required: false,
        conditional: {
          field: 'analytics.totalResponses',
          operator: 'greater_than',
          value: 50
        }
      },
      {
        id: 'action_priorities',
        type: 'recommendations',
        title: 'Strategic Action Priorities',
        content: {
          template: 'executive_recommendations',
          categories: [
            {
              name: 'Immediate Actions (0-30 days)',
              priority: 'critical',
              focus: 'quick_wins'
            },
            {
              name: 'Short-term Initiatives (1-3 months)',
              priority: 'high',
              focus: 'capacity_building'
            },
            {
              name: 'Long-term Strategy (3-12 months)',
              priority: 'medium',
              focus: 'transformation'
            }
          ],
          include_budget_estimates: true,
          include_roi_projections: true
        },
        order: 5,
        required: true
      },
      {
        id: 'risk_mitigation',
        type: 'insights',
        title: 'Risk Assessment & Mitigation',
        content: {
          template: 'risk_analysis',
          risk_categories: [
            'adoption_resistance',
            'skill_gaps',
            'technology_readiness',
            'organizational_change'
          ],
          mitigation_strategies: true,
          severity_matrix: true
        },
        order: 6,
        required: true
      }
    ],
    formatting: {
      theme: 'corporate',
      colors: [
        '#1f2937', // Dark gray - primary
        '#3b82f6', // Blue - accent
        '#10b981', // Green - positive
        '#ef4444', // Red - critical
        '#f59e0b', // Amber - warning
        '#8b5cf6'  // Purple - secondary
      ],
      fonts: [
        'Inter',
        'Segoe UI',
        'Arial',
        'sans-serif'
      ],
      layout: 'single-column',
      pageSize: 'A4',
      orientation: 'portrait'
    },
    filters: {
      dateRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        end: new Date()
      }
    },
    aggregations: [
      {
        field: 'readiness_score',
        function: 'avg',
        groupBy: ['department', 'week']
      },
      {
        field: 'completion_rate',
        function: 'avg',
        groupBy: ['month']
      },
      {
        field: 'engagement_score',
        function: 'avg',
        groupBy: ['department']
      }
    ],
    visualizations: [
      {
        type: 'radar',
        title: 'Organizational AI Readiness Radar',
        data: {
          dimensions: [
            'Technology Infrastructure',
            'Data Quality & Accessibility',
            'Skills & Capabilities',
            'Leadership Support',
            'Change Management',
            'Risk Management'
          ]
        },
        config: {
          scale: { min: 0, max: 100 },
          showPoints: true,
          showLabels: true
        }
      },
      {
        type: 'heatmap',
        title: 'Departmental Readiness Heatmap',
        data: {
          x_axis: 'departments',
          y_axis: 'readiness_categories',
          value: 'readiness_score'
        },
        config: {
          colorScale: ['#ef4444', '#f59e0b', '#10b981'],
          showValues: true
        }
      }
    ]
  }
}

export const executiveTemplateHelpers = {
  /**
   * Generate executive summary text based on data
   */
  generateExecutiveOverview: (data: any) => {
    const readinessScore = data.analytics?.readiness_score || 0
    const completionRate = data.analytics?.completionRate || 0
    const participationRate = data.analytics?.participationRate || 0
    
    let assessment = ''
    if (readinessScore >= 80) {
      assessment = 'The organization demonstrates strong AI readiness with robust foundations in place.'
    } else if (readinessScore >= 60) {
      assessment = 'The organization shows moderate AI readiness with several areas requiring focused improvement.'
    } else {
      assessment = 'The organization faces significant challenges in AI readiness requiring comprehensive transformation efforts.'
    }

    return {
      organization_summary: assessment,
      reporting_period: `Analysis period: ${data.metadata?.filters?.dateRange?.start || 'N/A'} to ${data.metadata?.filters?.dateRange?.end || 'N/A'}`,
      key_highlights: [
        `Overall AI Readiness Score: ${readinessScore}%`,
        `Survey Completion Rate: ${completionRate}%`,
        `Employee Participation: ${participationRate}%`,
        `Voice Response Adoption: ${data.analytics?.voiceResponseRate || 0}%`
      ],
      critical_issues: executiveTemplateHelpers.identifyCriticalIssues(data)
    }
  },

  /**
   * Identify critical issues requiring executive attention
   */
  identifyCriticalIssues: (data: any) => {
    const issues = []
    
    if ((data.analytics?.completionRate || 0) < 50) {
      issues.push({
        category: 'Engagement',
        severity: 'Critical',
        description: 'Low survey completion rates indicate potential engagement challenges',
        impact: 'High - affects data quality and decision-making'
      })
    }

    if ((data.analytics?.participationRate || 0) < 60) {
      issues.push({
        category: 'Adoption',
        severity: 'High',
        description: 'Limited employee participation in AI readiness assessment',
        impact: 'Medium - may not represent full organizational sentiment'
      })
    }

    if ((data.analytics?.readiness_score || 0) < 40) {
      issues.push({
        category: 'Readiness',
        severity: 'Critical',
        description: 'Overall AI readiness score below acceptable threshold',
        impact: 'High - indicates fundamental challenges in AI adoption capability'
      })
    }

    return issues.length > 0 ? issues : [{
      category: 'Status',
      severity: 'Low',
      description: 'No critical issues identified in current assessment period',
      impact: 'Positive - organization showing healthy AI readiness progression'
    }]
  },

  /**
   * Generate strategic recommendations based on data analysis
   */
  generateStrategicRecommendations: (data: any) => {
    const recommendations: {
      immediate: any[]
      short_term: any[]
      long_term: any[]
    } = {
      immediate: [],
      short_term: [],
      long_term: []
    }

    const readinessScore = data.analytics?.readiness_score || 0
    const completionRate = data.analytics?.completionRate || 0
    const voiceAdoption = data.analytics?.voiceResponseRate || 0

    // Immediate actions (0-30 days)
    if (completionRate < 70) {
      recommendations.immediate.push({
        title: 'Improve Survey Engagement',
        description: 'Implement immediate measures to increase survey completion rates',
        estimated_effort: 'Low',
        expected_impact: 'High',
        budget_estimate: '$5,000 - $15,000',
        success_metrics: ['Completion rate > 80%', 'Response quality improvement']
      })
    }

    if (voiceAdoption < 30) {
      recommendations.immediate.push({
        title: 'Enhance Voice Recording Experience',
        description: 'Address technical barriers and user experience issues with voice responses',
        estimated_effort: 'Medium',
        expected_impact: 'Medium',
        budget_estimate: '$10,000 - $25,000',
        success_metrics: ['Voice adoption > 50%', 'Recording quality improvement']
      })
    }

    // Short-term initiatives (1-3 months)
    if (readinessScore < 60) {
      recommendations.short_term.push({
        title: 'AI Literacy Program',
        description: 'Launch comprehensive AI education and training initiative',
        estimated_effort: 'High',
        expected_impact: 'High',
        budget_estimate: '$50,000 - $150,000',
        success_metrics: ['Training completion > 90%', 'Knowledge assessment scores', 'Readiness score improvement']
      })
    }

    recommendations.short_term.push({
      title: 'Department-Specific Action Plans',
      description: 'Develop targeted improvement plans for underperforming departments',
      estimated_effort: 'Medium',
      expected_impact: 'High',
      budget_estimate: '$25,000 - $75,000',
      success_metrics: ['Department score alignment', 'Cross-department collaboration metrics']
    })

    // Long-term strategy (3-12 months)
    recommendations.long_term.push({
      title: 'AI Center of Excellence',
      description: 'Establish dedicated AI capability center to drive organizational transformation',
      estimated_effort: 'High',
      expected_impact: 'Very High',
      budget_estimate: '$200,000 - $500,000',
      success_metrics: ['AI project success rate', 'Innovation pipeline', 'Competitive advantage metrics']
    })

    recommendations.long_term.push({
      title: 'Cultural Transformation Initiative',
      description: 'Implement long-term change management program for AI-ready culture',
      estimated_effort: 'Very High',
      expected_impact: 'Very High',
      budget_estimate: '$100,000 - $300,000',
      success_metrics: ['Cultural assessment scores', 'Employee satisfaction', 'Innovation metrics']
    })

    return recommendations
  },

  /**
   * Calculate ROI projections for recommendations
   */
  calculateROIProjections: (recommendations: any) => {
    const projections = {
      year_1: {
        investment: 0,
        benefits: 0,
        roi: 0
      },
      year_2: {
        investment: 0,
        benefits: 0,
        roi: 0
      },
      year_3: {
        investment: 0,
        benefits: 0,
        roi: 0
      }
    }

    // Simple ROI calculation based on recommendation categories
    // This would be more sophisticated in a real implementation
    const baseInvestment = 250000 // Base investment for AI readiness
    const expectedBenefits = {
      productivity_gain: 0.15, // 15% productivity improvement
      cost_reduction: 0.10,    // 10% operational cost reduction
      revenue_opportunity: 0.05 // 5% new revenue opportunities
    }

    projections.year_1.investment = baseInvestment * 0.6 // 60% in year 1
    projections.year_1.benefits = baseInvestment * expectedBenefits.productivity_gain * 0.3 // 30% realization
    projections.year_1.roi = ((projections.year_1.benefits - projections.year_1.investment) / projections.year_1.investment) * 100

    projections.year_2.investment = baseInvestment * 0.3 // 30% in year 2
    projections.year_2.benefits = baseInvestment * (expectedBenefits.productivity_gain + expectedBenefits.cost_reduction) * 0.7
    projections.year_2.roi = ((projections.year_2.benefits - projections.year_2.investment) / projections.year_2.investment) * 100

    projections.year_3.investment = baseInvestment * 0.1 // 10% in year 3
    projections.year_3.benefits = baseInvestment * (expectedBenefits.productivity_gain + expectedBenefits.cost_reduction + expectedBenefits.revenue_opportunity)
    projections.year_3.roi = ((projections.year_3.benefits - projections.year_3.investment) / projections.year_3.investment) * 100

    return projections
  }
}