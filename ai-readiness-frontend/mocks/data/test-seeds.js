// ============================================================================
// Test Data Seeds for Mock Database
// ============================================================================
// This module provides comprehensive test data for seeding the mock database
// with realistic survey data, user profiles, and AI analysis results.

const crypto = require('crypto');

class TestDataSeeds {
  constructor() {
    this.baseTimestamp = new Date('2024-01-01T00:00:00.000Z');
  }

  generateId(prefix = '') {
    return `${prefix}${crypto.randomUUID()}`;
  }

  generateTimestamp(daysOffset = 0, hoursOffset = 0) {
    const date = new Date(this.baseTimestamp);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(date.getHours() + hoursOffset);
    return date.toISOString();
  }

  // Generate realistic user profiles
  getUserProfiles() {
    return [
      {
        id: this.generateId('profile-'),
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'John',
        last_name: 'Smith',
        organization_name: 'TechCorp Solutions',
        role: 'user',
        avatar_url: null,
        created_at: this.generateTimestamp(0),
        updated_at: this.generateTimestamp(0)
      },
      {
        id: this.generateId('profile-'),
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        first_name: 'Sarah',
        last_name: 'Johnson',
        organization_name: 'Innovation Labs',
        role: 'admin',
        avatar_url: null,
        created_at: this.generateTimestamp(1),
        updated_at: this.generateTimestamp(1)
      },
      {
        id: this.generateId('profile-'),
        user_id: '123e4567-e89b-12d3-a456-426614174002',
        first_name: 'Michael',
        last_name: 'Chen',
        organization_name: 'DataDriven Inc',
        role: 'user',
        avatar_url: null,
        created_at: this.generateTimestamp(2),
        updated_at: this.generateTimestamp(2)
      },
      {
        id: this.generateId('profile-'),
        user_id: '123e4567-e89b-12d3-a456-426614174003',
        first_name: 'Emily',
        last_name: 'Rodriguez',
        organization_name: 'Future Systems',
        role: 'user',
        avatar_url: null,
        created_at: this.generateTimestamp(3),
        updated_at: this.generateTimestamp(3)
      }
    ];
  }

  // Generate test organizations
  getOrganizations() {
    return [
      {
        id: this.generateId('org-'),
        name: 'TechCorp Solutions',
        description: 'Leading technology solutions provider specializing in enterprise software development',
        industry: 'Technology',
        size: 'Medium (51-200 employees)',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        created_at: this.generateTimestamp(0),
        updated_at: this.generateTimestamp(0)
      },
      {
        id: this.generateId('org-'),
        name: 'Innovation Labs',
        description: 'Research and development company focused on emerging technologies',
        industry: 'Research & Development',
        size: 'Small (1-50 employees)',
        created_by: '123e4567-e89b-12d3-a456-426614174001',
        created_at: this.generateTimestamp(1),
        updated_at: this.generateTimestamp(1)
      },
      {
        id: this.generateId('org-'),
        name: 'DataDriven Inc',
        description: 'Data analytics and business intelligence consultancy',
        industry: 'Consulting',
        size: 'Medium (51-200 employees)',
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        created_at: this.generateTimestamp(2),
        updated_at: this.generateTimestamp(2)
      },
      {
        id: this.generateId('org-'),
        name: 'Future Systems',
        description: 'AI and machine learning solutions for healthcare',
        industry: 'Healthcare Technology',
        size: 'Large (201-1000 employees)',
        created_by: '123e4567-e89b-12d3-a456-426614174003',
        created_at: this.generateTimestamp(3),
        updated_at: this.generateTimestamp(3)
      }
    ];
  }

  // Generate comprehensive survey templates
  getSurveys() {
    const aiReadinessQuestions = [
      {
        id: 'strategic_alignment',
        type: 'multiple_choice',
        text: 'What is your primary business objective for AI implementation?',
        options: [
          'Improve operational efficiency',
          'Enhance customer experience',
          'Drive product innovation',
          'Reduce operational costs',
          'Gain competitive advantage',
          'Automate repetitive tasks',
          'Improve decision making',
          'Other'
        ],
        required: true,
        category: 'strategy'
      },
      {
        id: 'data_maturity',
        type: 'scale',
        text: 'How would you rate your organization\'s current data quality and accessibility?',
        scale: { 
          min: 1, 
          max: 10, 
          labels: { 
            1: 'Very Poor - Data is fragmented and unreliable', 
            5: 'Average - Some data quality issues exist',
            10: 'Excellent - High-quality, accessible, well-governed data' 
          }
        },
        required: true,
        category: 'data'
      },
      {
        id: 'technical_infrastructure',
        type: 'multiple_choice',
        text: 'Which best describes your current technical infrastructure?',
        options: [
          'Primarily on-premises with legacy systems',
          'Hybrid cloud with some modern architecture',
          'Cloud-first with microservices architecture',
          'Fully cloud-native with containerized services',
          'Modern infrastructure with AI/ML capabilities',
          'Unsure about current infrastructure'
        ],
        required: true,
        category: 'technology'
      },
      {
        id: 'ai_experience',
        type: 'multiple_choice',
        text: 'What is your organization\'s current experience with AI/ML?',
        options: [
          'No prior experience with AI/ML',
          'Proof of concepts or pilot projects only',
          'Limited production use cases',
          'Several successful AI implementations',
          'AI is core to our business strategy',
          'We are an AI-first organization'
        ],
        required: true,
        category: 'experience'
      },
      {
        id: 'talent_readiness',
        type: 'scale',
        text: 'How would you rate your team\'s current AI/ML skills and expertise?',
        scale: {
          min: 1,
          max: 10,
          labels: {
            1: 'No AI/ML expertise',
            5: 'Basic understanding, need training',
            10: 'Expert-level AI/ML capabilities'
          }
        },
        required: true,
        category: 'talent'
      },
      {
        id: 'governance_concerns',
        type: 'multiple_select',
        text: 'What are your main concerns about AI governance and ethics?',
        options: [
          'Data privacy and security',
          'Algorithmic bias and fairness',
          'Regulatory compliance',
          'Transparency and explainability',
          'Job displacement',
          'Vendor lock-in',
          'Model accuracy and reliability',
          'Intellectual property protection',
          'None of the above'
        ],
        required: false,
        category: 'governance'
      },
      {
        id: 'budget_allocation',
        type: 'multiple_choice',
        text: 'What is your planned budget allocation for AI initiatives in the next 12 months?',
        options: [
          'Less than $50,000',
          '$50,000 - $250,000',
          '$250,000 - $500,000',
          '$500,000 - $1,000,000',
          'More than $1,000,000',
          'Budget not yet determined',
          'Prefer not to disclose'
        ],
        required: false,
        category: 'investment'
      },
      {
        id: 'implementation_timeline',
        type: 'multiple_choice',
        text: 'What is your preferred timeline for AI implementation?',
        options: [
          'Immediate (within 3 months)',
          'Short-term (3-6 months)',
          'Medium-term (6-12 months)',
          'Long-term (1-2 years)',
          'Extended timeline (2+ years)',
          'Timeline not yet determined'
        ],
        required: true,
        category: 'timeline'
      },
      {
        id: 'success_metrics',
        type: 'multiple_select',
        text: 'How will you measure the success of your AI initiatives?',
        options: [
          'Cost reduction',
          'Revenue increase',
          'Process efficiency improvements',
          'Customer satisfaction scores',
          'Employee productivity gains',
          'Time-to-market improvements',
          'Quality improvements',
          'Risk reduction',
          'Innovation metrics',
          'Other'
        ],
        required: true,
        category: 'metrics'
      },
      {
        id: 'additional_context',
        type: 'text',
        text: 'Is there any additional context about your AI readiness journey that you\'d like to share?',
        placeholder: 'Please share any specific challenges, goals, or unique aspects of your organization...',
        required: false,
        category: 'context'
      }
    ];

    return [
      {
        id: this.generateId('survey-'),
        title: 'Comprehensive AI Readiness Assessment',
        description: 'A thorough evaluation of your organization\'s readiness for AI implementation, covering strategy, data, technology, talent, and governance aspects.',
        status: 'active',
        organization_id: this.generateId('org-'),
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        questions: aiReadinessQuestions,
        settings: {
          allowAnonymous: true,
          requireAuth: false,
          enableVoiceRecording: true,
          autoSave: true,
          showProgressBar: true,
          allowBackNavigation: true,
          randomizeQuestions: false,
          estimatedDuration: '15-20 minutes'
        },
        created_at: this.generateTimestamp(0),
        updated_at: this.generateTimestamp(0),
        started_at: this.generateTimestamp(0)
      },
      {
        id: this.generateId('survey-'),
        title: 'Quick AI Strategy Check',
        description: 'A brief assessment to understand your organization\'s AI strategy and immediate needs.',
        status: 'active',
        organization_id: this.generateId('org-'),
        created_by: '123e4567-e89b-12d3-a456-426614174001',
        questions: aiReadinessQuestions.slice(0, 5), // Shorter version
        settings: {
          allowAnonymous: true,
          requireAuth: false,
          enableVoiceRecording: false,
          autoSave: true,
          showProgressBar: true,
          allowBackNavigation: true,
          randomizeQuestions: false,
          estimatedDuration: '5-7 minutes'
        },
        created_at: this.generateTimestamp(1),
        updated_at: this.generateTimestamp(1),
        started_at: this.generateTimestamp(1)
      },
      {
        id: this.generateId('survey-'),
        title: 'Post-Implementation AI Feedback',
        description: 'Feedback collection for organizations that have already implemented AI solutions.',
        status: 'draft',
        organization_id: this.generateId('org-'),
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        questions: [
          {
            id: 'implementation_success',
            type: 'scale',
            text: 'How successful was your AI implementation?',
            scale: { min: 1, max: 10, labels: { 1: 'Not successful', 10: 'Highly successful' }},
            required: true
          },
          {
            id: 'lessons_learned',
            type: 'text',
            text: 'What were the key lessons learned during implementation?',
            required: true
          }
        ],
        settings: {
          allowAnonymous: false,
          requireAuth: true,
          enableVoiceRecording: true,
          autoSave: true
        },
        created_at: this.generateTimestamp(2),
        updated_at: this.generateTimestamp(2)
      }
    ];
  }

  // Generate realistic survey sessions
  getSurveySessions(surveyIds) {
    const sessions = [];
    
    // Complete sessions
    sessions.push({
      id: this.generateId('session-'),
      survey_id: surveyIds[0],
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'completed',
      current_question: 10,
      responses: {
        strategic_alignment: { 
          value: 'Improve operational efficiency', 
          timestamp: this.generateTimestamp(5, 1),
          confidence: 0.9
        },
        data_maturity: { 
          value: 7, 
          timestamp: this.generateTimestamp(5, 2),
          confidence: 0.8
        },
        technical_infrastructure: { 
          value: 'Hybrid cloud with some modern architecture', 
          timestamp: this.generateTimestamp(5, 3),
          confidence: 0.85
        },
        ai_experience: { 
          value: 'Proof of concepts or pilot projects only', 
          timestamp: this.generateTimestamp(5, 4),
          confidence: 0.9
        },
        talent_readiness: { 
          value: 5, 
          timestamp: this.generateTimestamp(5, 5),
          confidence: 0.7
        },
        governance_concerns: { 
          value: ['Data privacy and security', 'Algorithmic bias and fairness', 'Regulatory compliance'], 
          timestamp: this.generateTimestamp(5, 6),
          confidence: 0.95
        },
        budget_allocation: { 
          value: '$250,000 - $500,000', 
          timestamp: this.generateTimestamp(5, 7),
          confidence: 0.8
        },
        implementation_timeline: { 
          value: 'Medium-term (6-12 months)', 
          timestamp: this.generateTimestamp(5, 8),
          confidence: 0.85
        },
        success_metrics: { 
          value: ['Cost reduction', 'Process efficiency improvements', 'Quality improvements'], 
          timestamp: this.generateTimestamp(5, 9),
          confidence: 0.9
        },
        additional_context: { 
          value: 'We are particularly interested in automating our customer service processes while maintaining high quality interactions.', 
          timestamp: this.generateTimestamp(5, 10),
          confidence: 0.95
        }
      },
      metadata: {
        browser: 'Chrome/120.0.0.0',
        platform: 'Windows',
        startTime: this.generateTimestamp(5, 0),
        totalTime: 1247, // seconds
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      started_at: this.generateTimestamp(5, 0),
      completed_at: this.generateTimestamp(5, 1),
      updated_at: this.generateTimestamp(5, 1)
    });

    // In-progress session
    sessions.push({
      id: this.generateId('session-'),
      survey_id: surveyIds[0],
      user_id: '123e4567-e89b-12d3-a456-426614174002',
      status: 'in_progress',
      current_question: 5,
      responses: {
        strategic_alignment: { 
          value: 'Enhance customer experience', 
          timestamp: this.generateTimestamp(6, 1),
          confidence: 0.85
        },
        data_maturity: { 
          value: 8, 
          timestamp: this.generateTimestamp(6, 2),
          confidence: 0.9
        },
        technical_infrastructure: { 
          value: 'Cloud-first with microservices architecture', 
          timestamp: this.generateTimestamp(6, 3),
          confidence: 0.95
        },
        ai_experience: { 
          value: 'Several successful AI implementations', 
          timestamp: this.generateTimestamp(6, 4),
          confidence: 0.9
        },
        talent_readiness: { 
          value: 8, 
          timestamp: this.generateTimestamp(6, 5),
          confidence: 0.85
        }
      },
      metadata: {
        browser: 'Safari/17.2',
        platform: 'macOS',
        startTime: this.generateTimestamp(6, 0),
        totalTime: 894, // seconds so far
        deviceType: 'desktop',
        screenResolution: '2560x1440',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
      },
      started_at: this.generateTimestamp(6, 0),
      completed_at: null,
      updated_at: this.generateTimestamp(6, 5)
    });

    // Anonymous session
    sessions.push({
      id: this.generateId('session-'),
      survey_id: surveyIds[1], // Quick survey
      user_id: null, // Anonymous
      status: 'completed',
      current_question: 5,
      responses: {
        strategic_alignment: { 
          value: 'Drive product innovation', 
          timestamp: this.generateTimestamp(7, 1),
          confidence: 0.8
        },
        data_maturity: { 
          value: 6, 
          timestamp: this.generateTimestamp(7, 2),
          confidence: 0.75
        },
        technical_infrastructure: { 
          value: 'Primarily on-premises with legacy systems', 
          timestamp: this.generateTimestamp(7, 3),
          confidence: 0.9
        },
        ai_experience: { 
          value: 'No prior experience with AI/ML', 
          timestamp: this.generateTimestamp(7, 4),
          confidence: 0.95
        },
        talent_readiness: { 
          value: 3, 
          timestamp: this.generateTimestamp(7, 5),
          confidence: 0.8
        }
      },
      metadata: {
        browser: 'Firefox/121.0',
        platform: 'Linux',
        startTime: this.generateTimestamp(7, 0),
        totalTime: 421, // seconds
        deviceType: 'desktop',
        screenResolution: '1920x1080',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        anonymous: true
      },
      started_at: this.generateTimestamp(7, 0),
      completed_at: this.generateTimestamp(7, 0, 7), // 7 minutes later
      updated_at: this.generateTimestamp(7, 0, 7)
    });

    return sessions;
  }

  // Generate AI analysis results
  getAIAnalysisResults(surveyIds) {
    return [
      {
        id: this.generateId('analysis-'),
        survey_id: surveyIds[0],
        analysis_type: 'readiness_score',
        results: {
          overall_score: 72,
          category_scores: {
            strategy: 85,
            data: 70,
            technology: 68,
            talent: 50,
            governance: 78,
            investment: 75,
            timeline: 80
          },
          recommendations: [
            {
              priority: 'high',
              category: 'talent',
              title: 'Invest in AI/ML training programs',
              description: 'Your team\'s AI expertise is below the recommended level for successful implementation.',
              impact: 'critical',
              effort: 'medium',
              timeline: '3-6 months'
            },
            {
              priority: 'high',
              category: 'data',
              title: 'Implement data quality improvement initiatives',
              description: 'Ensure data quality and accessibility before AI implementation.',
              impact: 'high',
              effort: 'high',
              timeline: '6-12 months'
            },
            {
              priority: 'medium',
              category: 'technology',
              title: 'Modernize infrastructure for AI workloads',
              description: 'Consider cloud-native solutions for scalable AI deployment.',
              impact: 'high',
              effort: 'high',
              timeline: '6-18 months'
            }
          ],
          insights: [
            'Strong strategic alignment with clear business objectives',
            'Good governance awareness, particularly around privacy and bias',
            'Realistic timeline and budget expectations',
            'Need to focus on talent development and data quality',
            'Consider starting with pilot projects in customer service automation'
          ],
          risk_factors: [
            {
              factor: 'Limited AI expertise',
              risk_level: 'high',
              mitigation: 'Implement comprehensive training program'
            },
            {
              factor: 'Data quality concerns',
              risk_level: 'medium',
              mitigation: 'Establish data governance framework'
            }
          ],
          next_steps: [
            'Conduct detailed data audit',
            'Develop AI talent acquisition strategy',
            'Create pilot project roadmap',
            'Establish AI governance committee'
          ]
        },
        confidence_score: 0.87,
        model_used: 'gpt-4-analysis-v1',
        processing_time: '00:00:03.247',
        created_at: this.generateTimestamp(5, 2),
        updated_at: this.generateTimestamp(5, 2)
      },
      {
        id: this.generateId('analysis-'),
        survey_id: surveyIds[1],
        analysis_type: 'quick_assessment',
        results: {
          overall_score: 45,
          maturity_level: 'Beginner',
          key_findings: [
            'Organization is in early stages of AI adoption',
            'Legacy infrastructure presents challenges',
            'Strong innovation focus provides good foundation',
            'Significant investment in modernization needed'
          ],
          immediate_actions: [
            'Assess current technical infrastructure',
            'Define AI strategy and use cases',
            'Plan infrastructure modernization',
            'Build internal AI awareness'
          ],
          estimated_readiness_timeline: '12-18 months'
        },
        confidence_score: 0.82,
        model_used: 'gpt-4-quick-v1',
        processing_time: '00:00:01.891',
        created_at: this.generateTimestamp(7, 1),
        updated_at: this.generateTimestamp(7, 1)
      }
    ];
  }

  // Generate audit logs
  getAuditLogs() {
    return [
      {
        id: this.generateId('audit-'),
        table_name: 'survey_sessions',
        record_id: 'session-12345',
        action: 'INSERT',
        old_values: null,
        new_values: { status: 'in_progress', survey_id: 'survey-123' },
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        created_at: this.generateTimestamp(5, 0)
      },
      {
        id: this.generateId('audit-'),
        table_name: 'survey_sessions',
        record_id: 'session-12345',
        action: 'UPDATE',
        old_values: { status: 'in_progress', current_question: 3 },
        new_values: { status: 'completed', current_question: 10 },
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        created_at: this.generateTimestamp(5, 1)
      }
    ];
  }

  // Get all seed data
  getAllSeedData() {
    const surveys = this.getSurveys();
    const surveyIds = surveys.map(s => s.id);

    return {
      profiles: this.getUserProfiles(),
      organizations: this.getOrganizations(),
      surveys: surveys,
      survey_sessions: this.getSurveySessions(surveyIds),
      ai_analysis_results: this.getAIAnalysisResults(surveyIds),
      audit_logs: this.getAuditLogs()
    };
  }
}

module.exports = TestDataSeeds;