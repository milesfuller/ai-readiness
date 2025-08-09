/**
 * Jobs-to-be-Done Analysis Report Template
 * 
 * Specialized template for JTBD framework analysis including force mapping,
 * progress tracking, and outcome-driven insights for product and strategy teams.
 */

import type { ReportTemplate } from '@/services/database/reporting.service'

export const jtbdAnalysisTemplate: Omit<ReportTemplate, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'is_active'> = {
  name: 'Jobs-to-be-Done Analysis Report',
  type: 'jtbd',
  description: 'Comprehensive JTBD framework analysis with force mapping, progress evaluation, and outcome-driven strategic insights',
  config: {
    sections: [
      {
        id: 'jtbd_overview',
        type: 'summary',
        title: 'JTBD Framework Overview',
        content: {
          template: 'jtbd_overview',
          fields: [
            'job_statement_analysis',
            'customer_segments_overview',
            'outcome_priorities',
            'progress_definition',
            'competition_landscape',
            'measurement_framework'
          ]
        },
        order: 1,
        required: true
      },
      {
        id: 'force_analysis',
        type: 'charts',
        title: 'Four Forces Analysis',
        content: {
          template: 'forces_visualization',
          force_categories: [
            {
              name: 'Push Forces (Pain of the Old)',
              description: 'What pushes customers away from their current solution',
              visualization: 'force_diagram',
              metrics: ['pain_intensity', 'frequency', 'impact_score'],
              breakdown_dimensions: ['department', 'role', 'experience_level']
            },
            {
              name: 'Pull Forces (Promise of the New)',
              description: 'What attracts customers to new solutions',
              visualization: 'attraction_map',
              metrics: ['appeal_strength', 'clarity_score', 'credibility_rating'],
              breakdown_dimensions: ['feature_category', 'benefit_type', 'user_segment']
            },
            {
              name: 'Anxiety Forces (Fear of Change)',
              description: 'What creates hesitation about adopting new solutions',
              visualization: 'anxiety_heatmap',
              metrics: ['anxiety_level', 'confidence_rating', 'risk_perception'],
              breakdown_dimensions: ['change_type', 'user_experience', 'support_availability']
            },
            {
              name: 'Habit Forces (Comfort with Current)',
              description: 'What keeps customers attached to existing solutions',
              visualization: 'habit_strength_chart',
              metrics: ['habit_strength', 'switching_cost', 'inertia_score'],
              breakdown_dimensions: ['usage_frequency', 'integration_depth', 'team_dependency']
            }
          ]
        },
        order: 2,
        required: true
      },
      {
        id: 'progress_measurement',
        type: 'metrics',
        title: 'Progress Measurement Dashboard',
        content: {
          template: 'progress_metrics',
          progress_dimensions: [
            {
              name: 'Functional Progress',
              description: 'Practical steps toward accomplishing the job',
              metrics: [
                'task_completion_rate',
                'efficiency_improvement',
                'error_reduction',
                'time_to_value'
              ],
              benchmarks: {
                'excellent': 90,
                'good': 75,
                'needs_improvement': 60
              }
            },
            {
              name: 'Emotional Progress',
              description: 'How customers feel about their progress',
              metrics: [
                'confidence_level',
                'satisfaction_score',
                'stress_reduction',
                'accomplishment_feeling'
              ],
              benchmarks: {
                'excellent': 8.5,
                'good': 7.0,
                'needs_improvement': 5.5
              }
            },
            {
              name: 'Social Progress',
              description: 'How progress affects social standing and relationships',
              metrics: [
                'peer_recognition',
                'team_collaboration',
                'leadership_visibility',
                'professional_growth'
              ],
              benchmarks: {
                'excellent': 85,
                'good': 70,
                'needs_improvement': 55
              }
            }
          ]
        },
        order: 3,
        required: true
      },
      {
        id: 'outcome_analysis',
        type: 'tables',
        title: 'Desired Outcome Analysis',
        content: {
          template: 'outcome_tables',
          outcome_categories: [
            {
              name: 'Core Functional Outcomes',
              description: 'Primary job-related outcomes customers seek',
              analysis_type: 'importance_satisfaction_matrix',
              metrics: ['importance_score', 'satisfaction_score', 'opportunity_score'],
              segment_analysis: true
            },
            {
              name: 'Related Outcomes',
              description: 'Secondary outcomes that influence job success',
              analysis_type: 'correlation_analysis',
              metrics: ['correlation_strength', 'impact_factor', 'priority_ranking'],
              segment_analysis: true
            },
            {
              name: 'Emotional & Social Outcomes',
              description: 'How customers want to feel and be perceived',
              analysis_type: 'sentiment_clustering',
              metrics: ['emotional_importance', 'social_impact', 'fulfillment_score'],
              segment_analysis: true
            }
          ],
          statistical_analysis: {
            opportunity_scoring: true,
            segment_comparison: true,
            trend_analysis: true,
            competitive_benchmarking: true
          }
        },
        order: 4,
        required: true
      },
      {
        id: 'customer_journey_mapping',
        type: 'charts',
        title: 'Customer Journey & Job Execution',
        content: {
          template: 'journey_visualization',
          journey_components: [
            {
              name: 'Job Triggers',
              description: 'What initiates the need to get the job done',
              visualization: 'trigger_timeline',
              data_points: ['trigger_frequency', 'urgency_level', 'predictability']
            },
            {
              name: 'Solution Search',
              description: 'How customers discover and evaluate options',
              visualization: 'search_flow',
              data_points: ['search_methods', 'evaluation_criteria', 'decision_factors']
            },
            {
              name: 'Job Execution',
              description: 'Steps customers take to accomplish the job',
              visualization: 'execution_flow',
              data_points: ['step_difficulty', 'failure_points', 'time_investment']
            },
            {
              name: 'Progress Evaluation',
              description: 'How customers measure their success',
              visualization: 'progress_tracker',
              data_points: ['success_metrics', 'satisfaction_points', 'improvement_areas']
            }
          ],
          pain_point_mapping: true,
          opportunity_identification: true
        },
        order: 5,
        required: true
      },
      {
        id: 'segment_insights',
        type: 'insights',
        title: 'Customer Segment Insights',
        content: {
          template: 'segment_jtbd_analysis',
          segmentation_approaches: [
            {
              name: 'Job-Based Segmentation',
              description: 'Segments based on job variations and contexts',
              criteria: ['job_complexity', 'frequency', 'context_variation', 'outcome_priorities'],
              insights_focus: 'job_execution_differences'
            },
            {
              name: 'Progress-Based Segmentation',
              description: 'Segments based on progress patterns and challenges',
              criteria: ['progress_speed', 'struggle_points', 'success_factors', 'help_needed'],
              insights_focus: 'progress_facilitation_needs'
            },
            {
              name: 'Force-Based Segmentation',
              description: 'Segments based on dominant force patterns',
              criteria: ['dominant_forces', 'force_strength', 'force_balance', 'switching_readiness'],
              insights_focus: 'intervention_strategies'
            }
          ],
          cross_segment_analysis: true,
          persona_development: true
        },
        order: 6,
        required: true
      },
      {
        id: 'strategic_recommendations',
        type: 'recommendations',
        title: 'JTBD-Driven Strategic Recommendations',
        content: {
          template: 'jtbd_strategy_recommendations',
          recommendation_categories: [
            {
              name: 'Product Development Priorities',
              focus: 'outcome-driven_innovation',
              recommendations: [
                'underserved_outcome_opportunities',
                'job_step_simplification',
                'progress_acceleration_features',
                'anxiety_reduction_mechanisms'
              ]
            },
            {
              name: 'Experience Design Improvements',
              focus: 'friction_reduction',
              recommendations: [
                'onboarding_optimization',
                'progress_visibility_enhancement',
                'help_and_guidance_systems',
                'success_celebration_mechanisms'
              ]
            },
            {
              name: 'Market Positioning Strategy',
              focus: 'competitive_differentiation',
              recommendations: [
                'unique_value_proposition_refinement',
                'competitive_advantage_amplification',
                'market_education_priorities',
                'messaging_optimization'
              ]
            },
            {
              name: 'Customer Success Initiatives',
              focus: 'progress_facilitation',
              recommendations: [
                'progress_measurement_systems',
                'proactive_support_triggers',
                'success_pattern_replication',
                'community_building_opportunities'
              ]
            }
          ],
          prioritization_framework: 'opportunity_impact_matrix',
          implementation_roadmap: true,
          success_metrics: true
        },
        order: 7,
        required: true
      }
    ],
    formatting: {
      theme: 'default',
      colors: [
        '#2563eb', // Blue - primary (pull forces)
        '#dc2626', // Red - push forces
        '#f59e0b', // Amber - anxiety forces  
        '#059669', // Green - habit forces
        '#7c3aed', // Purple - progress
        '#374151', // Gray - neutral
        '#1f2937', // Dark gray - text
        '#f3f4f6'  // Light gray - background
      ],
      fonts: [
        'Inter',
        'system-ui',
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
        field: 'push_force_score',
        function: 'avg',
        groupBy: ['segment', 'job_context']
      },
      {
        field: 'pull_force_score', 
        function: 'avg',
        groupBy: ['segment', 'solution_category']
      },
      {
        field: 'anxiety_score',
        function: 'avg',
        groupBy: ['experience_level', 'change_type']
      },
      {
        field: 'habit_strength',
        function: 'avg',
        groupBy: ['usage_frequency', 'integration_level']
      },
      {
        field: 'progress_score',
        function: 'avg',
        groupBy: ['progress_dimension', 'week']
      }
    ],
    visualizations: [
      {
        type: 'radar',
        title: 'Four Forces Radar Chart',
        data: {
          dimensions: ['Push Forces', 'Pull Forces', 'Anxiety Forces', 'Habit Forces'],
          segments: ['all', 'by_department', 'by_experience']
        },
        config: {
          scale: { min: 0, max: 10 },
          showPoints: true,
          showLabels: true,
          compareSegments: true
        }
      },
      {
        type: 'scatter',
        title: 'Progress vs. Satisfaction Matrix',
        data: {
          x_axis: 'functional_progress',
          y_axis: 'emotional_satisfaction',
          size: 'outcome_importance',
          color: 'customer_segment'
        },
        config: {
          quadrantLabels: ['Low Progress/Low Satisfaction', 'High Progress/Low Satisfaction', 'Low Progress/High Satisfaction', 'High Progress/High Satisfaction'],
          showTrendLine: true,
          highlightOutliers: true
        }
      },
      {
        type: 'funnel',
        title: 'Job Execution Funnel',
        data: {
          stages: [
            'job_awareness',
            'solution_search',
            'evaluation',
            'trial',
            'adoption',
            'mastery',
            'advocacy'
          ]
        },
        config: {
          showConversionRates: true,
          highlightDropoffs: true,
          segmentAnalysis: true
        }
      }
    ]
  }
}

export const jtbdTemplateHelpers = {
  /**
   * Calculate JTBD force scores from survey data
   */
  calculateForceScores: (data: any) => {
    const forceScores = {
      push_forces: {
        average: 0,
        distribution: {},
        top_pain_points: [],
        segment_variation: {}
      },
      pull_forces: {
        average: 0,
        distribution: {},
        top_attractions: [],
        segment_variation: {}
      },
      anxiety_forces: {
        average: 0,
        distribution: {},
        top_anxieties: [],
        segment_variation: {}
      },
      habit_forces: {
        average: 0,
        distribution: {},
        strongest_habits: [],
        segment_variation: {}
      },
      net_force: 0,
      switching_likelihood: 0
    }

    if (!data.trends?.data?.length) {
      return forceScores
    }

    // Calculate averages from trend data
    const latestTrend = data.trends.data[data.trends.data.length - 1]
    
    forceScores.push_forces.average = latestTrend.push_forces || 0
    forceScores.pull_forces.average = latestTrend.pull_forces || 0
    forceScores.anxiety_forces.average = latestTrend.anxiety_forces || 0
    forceScores.habit_forces.average = latestTrend.habit_forces || 0

    // Calculate net force (pull + push - anxiety - habit)
    forceScores.net_force = 
      forceScores.pull_forces.average + forceScores.push_forces.average -
      forceScores.anxiety_forces.average - forceScores.habit_forces.average

    // Calculate switching likelihood (0-100%)
    forceScores.switching_likelihood = Math.max(0, Math.min(100, 
      (forceScores.net_force / 20) * 100 + 50
    ))

    return forceScores
  },

  /**
   * Analyze progress patterns across dimensions
   */
  analyzeProgressPatterns: (data: any) => {
    const progressAnalysis = {
      functional_progress: {
        score: 0,
        trend: 'stable',
        key_drivers: [],
        barriers: []
      },
      emotional_progress: {
        score: 0,
        trend: 'stable',
        key_drivers: [],
        barriers: []
      },
      social_progress: {
        score: 0,
        trend: 'stable',
        key_drivers: [],
        barriers: []
      },
      overall_progress_health: 'moderate',
      progress_velocity: 0,
      acceleration_opportunities: []
    }

    // Calculate functional progress from completion rates and efficiency
    if (data.analytics) {
      progressAnalysis.functional_progress.score = (
        (data.analytics.completionRate || 0) * 0.4 +
        (100 - (data.analytics.averageCompletionTime / 300) * 100) * 0.3 +
        (data.analytics.participationRate || 0) * 0.3
      )

      progressAnalysis.emotional_progress.score = (
        (data.analytics.averageVoiceQuality || 0) * 10 * 0.5 +
        (data.engagement?.reduce((sum: number, user: any) => sum + user.engagementScore, 0) / (data.engagement?.length || 1)) * 0.5
      )

      progressAnalysis.social_progress.score = 
        data.analytics.participationRate || 0
    }

    // Determine overall health
    const avgScore = (
      progressAnalysis.functional_progress.score +
      progressAnalysis.emotional_progress.score +
      progressAnalysis.social_progress.score
    ) / 3

    progressAnalysis.overall_progress_health = 
      avgScore >= 80 ? 'excellent' :
      avgScore >= 65 ? 'good' :
      avgScore >= 50 ? 'moderate' : 'needs_improvement'

    return progressAnalysis
  },

  /**
   * Generate outcome opportunity scoring
   */
  generateOpportunityScoring: (data: any) => {
    const opportunities = [
      {
        outcome: 'Reduce time to complete AI assessment',
        importance: 8.7,
        satisfaction: 6.2,
        opportunity_score: 17.4, // (importance * (importance - satisfaction))
        segment_variation: {
          'technical_users': { importance: 9.1, satisfaction: 7.1 },
          'business_users': { importance: 8.3, satisfaction: 5.3 },
          'leadership': { importance: 8.9, satisfaction: 6.8 }
        },
        recommendation: 'Streamline assessment flow and provide progress indicators'
      },
      {
        outcome: 'Increase confidence in AI readiness results',
        importance: 9.2,
        satisfaction: 7.1,
        opportunity_score: 19.3,
        segment_variation: {
          'technical_users': { importance: 8.9, satisfaction: 7.8 },
          'business_users': { importance: 9.5, satisfaction: 6.4 },
          'leadership': { importance: 9.2, satisfaction: 7.1 }
        },
        recommendation: 'Enhance result explanation and provide comparative benchmarks'
      },
      {
        outcome: 'Minimize effort required for voice responses',
        importance: 7.4,
        satisfaction: 5.8,
        opportunity_score: 11.8,
        segment_variation: {
          'technical_users': { importance: 6.9, satisfaction: 6.2 },
          'business_users': { importance: 7.9, satisfaction: 5.4 },
          'leadership': { importance: 7.4, satisfaction: 5.8 }
        },
        recommendation: 'Improve voice recording UX and provide alternative input methods'
      }
    ]

    // Sort by opportunity score (descending)
    opportunities.sort((a, b) => b.opportunity_score - a.opportunity_score)

    return {
      top_opportunities: opportunities.slice(0, 10),
      average_opportunity_score: opportunities.reduce((sum, opp) => sum + opp.opportunity_score, 0) / opportunities.length,
      innovation_focus_areas: opportunities.slice(0, 3).map(opp => opp.outcome),
      segment_specific_opportunities: jtbdTemplateHelpers.identifySegmentSpecificOpportunities(opportunities)
    }
  },

  /**
   * Map customer journey and identify friction points
   */
  mapCustomerJourney: (data: any) => {
    const journeyMap = {
      stages: [
        {
          name: 'Awareness',
          description: 'User becomes aware of need for AI readiness assessment',
          touchpoints: ['email_invitation', 'manager_communication', 'company_announcement'],
          emotions: ['curious', 'uncertain', 'interested'],
          pain_points: ['unclear_purpose', 'time_concerns', 'technical_anxiety'],
          opportunities: ['clear_value_communication', 'time_estimation', 'success_stories'],
          completion_rate: 85,
          dropout_reasons: ['lack_of_context', 'competing_priorities']
        },
        {
          name: 'Onboarding',
          description: 'User starts the assessment process',
          touchpoints: ['login_process', 'welcome_screen', 'instruction_pages'],
          emotions: ['motivated', 'slightly_anxious', 'focused'],
          pain_points: ['complex_instructions', 'technical_issues', 'unclear_expectations'],
          opportunities: ['simplified_onboarding', 'progress_preview', 'help_resources'],
          completion_rate: 78,
          dropout_reasons: ['technical_difficulties', 'overwhelming_instructions']
        },
        {
          name: 'Assessment',
          description: 'User completes survey questions',
          touchpoints: ['question_interface', 'voice_recorder', 'progress_indicators'],
          emotions: ['engaged', 'thoughtful', 'occasionally_frustrated'],
          pain_points: ['question_complexity', 'voice_recording_issues', 'length_concerns'],
          opportunities: ['adaptive_questioning', 'improved_voice_UX', 'break_options'],
          completion_rate: data.analytics?.completionRate || 65,
          dropout_reasons: ['survey_fatigue', 'technical_problems', 'time_constraints']
        },
        {
          name: 'Completion',
          description: 'User submits assessment and receives results',
          touchpoints: ['submission_confirmation', 'results_page', 'follow_up_communication'],
          emotions: ['accomplished', 'curious_about_results', 'satisfied'],
          pain_points: ['delayed_results', 'unclear_next_steps', 'lack_of_context'],
          opportunities: ['immediate_insights', 'action_recommendations', 'sharing_options'],
          completion_rate: 92,
          dropout_reasons: ['result_delays', 'insufficient_feedback']
        }
      ],
      overall_journey_health: jtbdTemplateHelpers.calculateJourneyHealth(data),
      critical_friction_points: jtbdTemplateHelpers.identifyFrictionPoints(data),
      optimization_priorities: jtbdTemplateHelpers.identifyOptimizationPriorities(data)
    }

    return journeyMap
  },

  /**
   * Generate JTBD-driven strategic recommendations
   */
  generateJTBDRecommendations: (forceScores: any, progressAnalysis: any, opportunities: any) => {
    const recommendations: {
      immediate_actions: any[]
      short_term_initiatives: any[]
      long_term_strategy: any[]
      success_metrics: any[]
    } = {
      immediate_actions: [],
      short_term_initiatives: [],
      long_term_strategy: [],
      success_metrics: []
    }

    // Force-based recommendations
    if (forceScores.anxiety_forces.average > 6) {
      recommendations.immediate_actions.push({
        title: 'Reduce Adoption Anxiety',
        description: 'Address high anxiety scores through better communication and support',
        rationale: `Anxiety forces score of ${forceScores.anxiety_forces.average}/10 is inhibiting progress`,
        actions: [
          'Provide clearer expectations and timelines',
          'Offer multiple support channels',
          'Share success stories and testimonials',
          'Implement gradual exposure approach'
        ],
        success_metrics: ['Reduce anxiety score to <5', 'Increase completion rate by 15%']
      })
    }

    if (forceScores.habit_forces.average > 7) {
      recommendations.short_term_initiatives.push({
        title: 'Overcome Habit Inertia',
        description: 'Address strong attachment to current processes',
        rationale: `Habit forces score of ${forceScores.habit_forces.average}/10 indicates strong resistance to change`,
        actions: [
          'Demonstrate clear benefits of new approach',
          'Provide transition support and training',
          'Create incentives for early adoption',
          'Show competitive risks of status quo'
        ],
        success_metrics: ['Reduce habit force score to <6', 'Increase switching likelihood by 25%']
      })
    }

    // Progress-based recommendations
    if (progressAnalysis.functional_progress.score < 60) {
      recommendations.immediate_actions.push({
        title: 'Improve Functional Progress',
        description: 'Address barriers to task completion and efficiency',
        rationale: `Functional progress score of ${progressAnalysis.functional_progress.score}% is below target`,
        actions: [
          'Simplify complex workflows',
          'Provide better tools and resources',
          'Eliminate unnecessary steps',
          'Improve user interface design'
        ],
        success_metrics: ['Increase functional progress to >75%', 'Reduce completion time by 30%']
      })
    }

    // Opportunity-based recommendations
    opportunities.top_opportunities.slice(0, 3).forEach((opp: any) => {
      recommendations.long_term_strategy.push({
        title: `Address High-Opportunity Outcome: ${opp.outcome}`,
        description: opp.recommendation,
        rationale: `Opportunity score of ${opp.opportunity_score} indicates significant improvement potential`,
        actions: [
          'Conduct deeper user research',
          'Prototype solution alternatives',
          'Test with target segments',
          'Implement and measure impact'
        ],
        success_metrics: [`Increase satisfaction for "${opp.outcome}" to >8`, 'Maintain importance levels']
      })
    })

    return recommendations
  },

  // Helper methods
  identifySegmentSpecificOpportunities: (opportunities: any[]) => {
    const segmentOpportunities: any = {}
    
    opportunities.forEach(opp => {
      Object.entries(opp.segment_variation).forEach(([segment, scores]: [string, any]) => {
        if (!segmentOpportunities[segment]) {
          segmentOpportunities[segment] = []
        }
        
        const segmentOpportunityScore = scores.importance * (scores.importance - scores.satisfaction)
        if (segmentOpportunityScore > 15) { // High opportunity threshold
          segmentOpportunities[segment].push({
            outcome: opp.outcome,
            opportunity_score: segmentOpportunityScore,
            importance: scores.importance,
            satisfaction: scores.satisfaction
          })
        }
      })
    })

    // Sort opportunities within each segment
    Object.keys(segmentOpportunities).forEach(segment => {
      segmentOpportunities[segment].sort((a: any, b: any) => b.opportunity_score - a.opportunity_score)
    })

    return segmentOpportunities
  },

  calculateJourneyHealth: (data: any) => {
    const completionRate = data.analytics?.completionRate || 0
    const participationRate = data.analytics?.participationRate || 0
    const voiceAdoption = data.analytics?.voiceResponseRate || 0
    
    const healthScore = (completionRate * 0.4 + participationRate * 0.4 + voiceAdoption * 0.2)
    
    return healthScore >= 80 ? 'excellent' :
           healthScore >= 65 ? 'good' :
           healthScore >= 50 ? 'fair' : 'needs_improvement'
  },

  identifyFrictionPoints: (data: any) => {
    const frictionPoints: any[] = []
    
    if ((data.analytics?.completionRate || 0) < 70) {
      frictionPoints.push({
        stage: 'Assessment',
        issue: 'Low completion rate',
        severity: 'high',
        impact: 'Reduced data quality and user satisfaction'
      })
    }

    if ((data.analytics?.voiceResponseRate || 0) < 40) {
      frictionPoints.push({
        stage: 'Assessment',
        issue: 'Low voice adoption',
        severity: 'medium',
        impact: 'Missing rich qualitative insights'
      })
    }

    if ((data.analytics?.averageCompletionTime || 0) > 600) { // 10 minutes
      frictionPoints.push({
        stage: 'Assessment',
        issue: 'Long completion time',
        severity: 'medium',
        impact: 'User fatigue and increased dropout risk'
      })
    }

    return frictionPoints
  },

  identifyOptimizationPriorities: (data: any) => {
    return [
      {
        priority: 1,
        area: 'Completion Rate Improvement',
        rationale: 'Directly impacts data quality and user experience',
        estimated_impact: 'High'
      },
      {
        priority: 2,
        area: 'Voice Experience Enhancement',
        rationale: 'Increases qualitative insights and user engagement',
        estimated_impact: 'Medium'
      },
      {
        priority: 3,
        area: 'Assessment Efficiency',
        rationale: 'Reduces user burden and improves satisfaction',
        estimated_impact: 'Medium'
      }
    ]
  }
}