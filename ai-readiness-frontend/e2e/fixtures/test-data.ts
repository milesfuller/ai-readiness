// Test Data Fixtures - Predefined test data for consistent API testing
// Provides realistic test data that matches production data patterns

import type { 
  User, 
  Survey, 
  SurveyResponse, 
  Organization,
  JTBDForces,
  ExportOptions
} from '../../lib/types'
import type { Route } from '@playwright/test'

// Test Organizations
export const TEST_ORGANIZATIONS = [
  {
    id: 'org-test-001',
    name: 'Test Corporation Inc',
    domain: 'test-corp.com',
    industry: 'Technology',
    size: 'Medium (100-500 employees)',
    settings: {
      allowSelfRegistration: true,
      defaultRole: 'user' as const,
      requireEmailVerification: true
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'org-test-002', 
    name: 'Global Enterprises LLC',
    domain: 'global-ent.com',
    industry: 'Manufacturing',
    size: 'Large (500+ employees)',
    settings: {
      allowSelfRegistration: false,
      defaultRole: 'user' as const,
      requireEmailVerification: true
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
] as const

// Test Users with different roles and characteristics
export const TEST_USERS = [
  {
    id: 'user-admin-001',
    email: 'admin@test-aireadiness.com',
    password: 'TestPassword123!',
    role: 'admin' as const,
    organizationId: 'org-test-001',
    profile: {
      id: 'profile-admin-001',
      userId: 'user-admin-001',
      firstName: 'System',
      lastName: 'Administrator',
      avatar: null,
      department: 'IT',
      jobTitle: 'System Administrator',
      preferences: {
        theme: 'light' as const,
        notifications: true,
        voiceInput: true,
        language: 'en'
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-orgadmin-001',
    email: 'orgadmin@test-aireadiness.com',
    password: 'TestPassword123!',
    role: 'org_admin' as const,
    organizationId: 'org-test-001',
    profile: {
      id: 'profile-orgadmin-001',
      userId: 'user-orgadmin-001',
      firstName: 'Organization',
      lastName: 'Admin',
      avatar: null,
      department: 'Management',
      jobTitle: 'VP of Operations',
      preferences: {
        theme: 'dark' as const,
        notifications: true,
        voiceInput: false,
        language: 'en'
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-regular-001',
    email: 'user@test-aireadiness.com',
    password: 'TestPassword123!',
    role: 'user' as const,
    organizationId: 'org-test-001',
    profile: {
      id: 'profile-regular-001',
      userId: 'user-regular-001',
      firstName: 'Regular',
      lastName: 'User',
      avatar: null,
      department: 'Engineering',
      jobTitle: 'Senior Developer',
      preferences: {
        theme: 'light' as const,
        notifications: true,
        voiceInput: true,
        language: 'en'
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-regular-002',
    email: 'analyst@test-aireadiness.com',
    password: 'TestPassword123!',
    role: 'user' as const,
    organizationId: 'org-test-001',
    profile: {
      id: 'profile-regular-002',
      userId: 'user-regular-002',
      firstName: 'Data',
      lastName: 'Analyst',
      avatar: null,
      department: 'Analytics',
      jobTitle: 'Senior Data Analyst',
      preferences: {
        theme: 'dark' as const,
        notifications: true,
        voiceInput: false,
        language: 'en'
      }
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
] as const

// Test Surveys with various configurations
export const TEST_SURVEYS = [
  {
    id: 'survey-test-001',
    title: 'AI Readiness Assessment 2024',
    description: 'Comprehensive assessment of organizational readiness for AI adoption',
    status: 'active' as const,
    createdBy: 'user-admin-001',
    organizationId: 'org-test-001',
    questions: [
      {
        id: 'q001',
        type: 'jtbd' as const,
        question: 'What are your biggest frustrations with current work processes?',
        options: [],
        required: true,
        category: 'pain_of_old',
        order: 1
      },
      {
        id: 'q002', 
        type: 'jtbd' as const,
        question: 'What excites you most about AI adoption in your work?',
        options: [],
        required: true,
        category: 'pull_of_new',
        order: 2
      },
      {
        id: 'q003',
        type: 'jtbd' as const,
        question: 'What concerns do you have about AI implementation?',
        options: [],
        required: true,
        category: 'anxiety_of_new',
        order: 3
      },
      {
        id: 'q004',
        type: 'jtbd' as const,
        question: 'What works well about your current processes and tools?',
        options: [],
        required: false,
        category: 'anchors_to_old',
        order: 4
      },
      {
        id: 'q005',
        type: 'text' as const,
        question: 'Tell us about your role and experience in the organization.',
        options: [],
        required: true,
        category: 'demographic',
        order: 5
      }
    ],
    metadata: {
      estimatedDuration: 15,
      totalQuestions: 5,
      completionRate: 0.75,
      averageScore: 3.2
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: 'survey-test-002',
    title: 'Quick AI Pulse Check',
    description: 'Short survey to gauge current AI sentiment',
    status: 'active' as const,
    createdBy: 'user-orgadmin-001',
    organizationId: 'org-test-001',
    questions: [
      {
        id: 'q101',
        type: 'scale' as const,
        question: 'How ready do you feel for AI adoption? (1-5 scale)',
        options: ['1', '2', '3', '4', '5'],
        required: true,
        category: 'readiness',
        order: 1
      },
      {
        id: 'q102',
        type: 'multiple_choice' as const,
        question: 'Which AI tools are you most interested in?',
        options: ['Automation tools', 'Data analysis', 'Content generation', 'Communication aids', 'Decision support'],
        required: true,
        category: 'interest',
        order: 2
      }
    ],
    metadata: {
      estimatedDuration: 5,
      totalQuestions: 2,
      completionRate: 0.85,
      averageScore: 3.8
    },
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
] as const

// Test Survey Responses with realistic content
export const TEST_SURVEY_RESPONSES = [
  // Pull of New responses (excitement about AI)
  {
    id: 'response-001',
    surveyId: 'survey-test-001',
    userId: 'user-regular-001',
    questionId: 'q002',
    response: "I'm really excited about AI tools that could help automate code reviews and testing. The potential to catch bugs early and standardize our development process could save hours each week. I also see opportunities for AI to help with documentation generation and maintaining our knowledge base.",
    expectedForce: 'pull_of_new' as const,
    metadata: {
      timeSpent: 45,
      confidence: 0.9,
      department: 'Engineering',
      role: 'Senior Developer'
    }
  },
  {
    id: 'response-002',
    surveyId: 'survey-test-001',
    userId: 'user-regular-002',
    questionId: 'q002',
    response: "AI-powered data analysis tools could revolutionize how we identify patterns and generate insights from our datasets. Instead of spending days on manual analysis, we could get preliminary results in minutes and focus on interpreting the findings and making strategic recommendations.",
    expectedForce: 'pull_of_new' as const,
    metadata: {
      timeSpent: 38,
      confidence: 0.85,
      department: 'Analytics',
      role: 'Senior Data Analyst'
    }
  },

  // Pain of Old responses (frustrations with current processes)
  {
    id: 'response-003',
    surveyId: 'survey-test-001',
    userId: 'user-regular-001',
    questionId: 'q001',
    response: "Manual code reviews are incredibly time-consuming and inconsistent. Different reviewers catch different issues, and we often miss the same types of bugs repeatedly. The back-and-forth process can take days for simple changes, and context switching between reviews and actual development work kills productivity.",
    expectedForce: 'pain_of_old' as const,
    metadata: {
      timeSpent: 52,
      confidence: 0.95,
      department: 'Engineering',
      role: 'Senior Developer'
    }
  },
  {
    id: 'response-004',
    surveyId: 'survey-test-001',
    userId: 'user-regular-002',
    questionId: 'q001',
    response: "Generating monthly reports involves hours of copying data between systems, manual calculations, and formatting. It's error-prone and tedious work that takes me away from actual analysis. I spend more time manipulating data than interpreting it, which isn't adding value to the business.",
    expectedForce: 'pain_of_old' as const,
    metadata: {
      timeSpent: 41,
      confidence: 0.88,
      department: 'Analytics',
      role: 'Senior Data Analyst'
    }
  },

  // Anxiety of New responses (concerns about AI)
  {
    id: 'response-005',
    surveyId: 'survey-test-001',
    userId: 'user-regular-001',
    questionId: 'q003',
    response: "I'm concerned about over-reliance on AI tools without understanding how they work. What if the AI makes mistakes in code generation or suggestions? There's also the question of job security - will AI eventually replace developers? And how do we maintain code quality and learn new skills if AI is doing the work?",
    expectedForce: 'anxiety_of_new' as const,
    metadata: {
      timeSpent: 67,
      confidence: 0.75,
      department: 'Engineering',
      role: 'Senior Developer'
    }
  },
  {
    id: 'response-006',
    surveyId: 'survey-test-001',
    userId: 'user-regular-002',
    questionId: 'q003',
    response: "I worry about data privacy and security when using AI tools. Our datasets contain sensitive business information, and I'm not sure how AI systems handle data privacy. There's also the concern about bias in AI algorithms affecting our analysis results and leading to poor business decisions.",
    expectedForce: 'anxiety_of_new' as const,
    metadata: {
      timeSpent: 55,
      confidence: 0.82,
      department: 'Analytics',
      role: 'Senior Data Analyst'
    }
  },

  // Anchors to Old responses (satisfaction with current state)
  {
    id: 'response-007',
    surveyId: 'survey-test-001',
    userId: 'user-orgadmin-001',
    questionId: 'q004',
    response: "Our current processes have been refined over years and work well for our team size and complexity. We have strong documentation, clear approval workflows, and everyone knows their responsibilities. The manual oversight ensures quality and gives us full control over our operations.",
    expectedForce: 'anchors_to_old' as const,
    metadata: {
      timeSpent: 43,
      confidence: 0.78,
      department: 'Management',
      role: 'VP of Operations'
    }
  },

  // Demographic responses
  {
    id: 'response-008',
    surveyId: 'survey-test-001',
    userId: 'user-regular-001',
    questionId: 'q005',
    response: "I'm a Senior Developer with 8 years of experience, currently working on our core platform infrastructure. I specialize in backend systems and have experience with cloud architecture. I've been with the company for 3 years and work primarily on scalability and performance optimization projects.",
    expectedForce: 'demographic' as const,
    metadata: {
      timeSpent: 35,
      confidence: 1.0,
      department: 'Engineering',
      role: 'Senior Developer'
    }
  }
] as const

// Test Export Options for different scenarios
export const TEST_EXPORT_OPTIONS: ExportOptions[] = [
  {
    format: 'csv',
    includePersonalData: false,
    dateRange: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-12-31T23:59:59Z'
    },
    filters: {
      department: 'Engineering',
      status: 'completed'
    }
  },
  {
    format: 'json',
    includePersonalData: true,
    dateRange: {
      start: '2024-06-01T00:00:00Z',
      end: '2024-06-30T23:59:59Z'
    },
    filters: {
      role: 'user',
      status: 'completed'
    }
  },
  {
    format: 'pdf',
    includePersonalData: false,
    filters: {
      department: 'Analytics'
    }
  }
] as const

// LLM Analysis Test Results for validation
export const SAMPLE_LLM_ANALYSIS_RESULTS = [
  {
    responseId: 'response-001',
    primaryJtbdForce: 'pull_of_new',
    secondaryJtbdForces: ['pain_of_old'],
    forceStrengthScore: 4,
    confidenceScore: 5,
    reasoning: 'Strong positive sentiment with specific automation benefits mentioned',
    keyThemes: ['automation', 'efficiency', 'code_quality', 'time_savings'],
    themeCategories: {
      process: ['code_reviews', 'testing'],
      technology: ['AI_tools', 'automation'],
      people: ['developer_experience'],
      organizational: ['productivity', 'standardization']
    },
    sentimentAnalysis: {
      overallScore: 0.8,
      sentimentLabel: 'very_positive' as const,
      emotionalIndicators: ['excited', 'potential', 'save hours'],
      tone: 'optimistic' as const
    },
    businessImplications: {
      impactLevel: 'high' as const,
      affectedAreas: ['productivity', 'efficiency', 'innovation'],
      urgency: 'medium' as const,
      businessValue: 'Significant time savings and quality improvements in development'
    },
    actionableInsights: {
      summaryInsight: 'High readiness for AI adoption in development automation',
      detailedAnalysis: 'Strong enthusiasm for specific AI applications with clear value proposition',
      immediateActions: ['Pilot AI code review tools', 'Evaluate testing automation'],
      longTermRecommendations: ['Implement comprehensive AI development pipeline', 'Train team on AI tools']
    },
    qualityIndicators: {
      responseQuality: 'excellent' as const,
      specificityLevel: 'very_specific' as const,
      actionability: 'high' as const,
      businessRelevance: 'high' as const
    },
    analysisMetadata: {
      processingNotes: 'High-quality response with specific use cases',
      followUpQuestions: ['Which AI tools are you most interested in?', 'What would be the biggest barrier to adoption?'],
      relatedThemes: ['development_tools', 'process_improvement', 'automation']
    }
  }
] as const

// Performance Benchmarks for API testing
export const PERFORMANCE_BENCHMARKS = {
  endpoints: {
    '/auth/signup': { maxResponseTime: 2000, successRate: 0.99 },
    '/llm/analyze': { maxResponseTime: 30000, successRate: 0.95 },
    '/llm/batch': { maxResponseTime: 60000, successRate: 0.90 },
    '/export': { maxResponseTime: 15000, successRate: 0.98 },
    '/admin/users': { maxResponseTime: 1000, successRate: 0.99 }
  },
  concurrent: {
    maxUsers: 50,
    successRate: 0.85,
    avgResponseTime: 5000
  }
} as const

// Security Test Payloads
export const SECURITY_TEST_PAYLOADS = {
  xss: [
    '<script>alert("xss")</script>',
    '"><img src=x onerror=alert("xss")>',
    'javascript:alert("xss")',
    '<svg onload=alert("xss")>',
    '${7*7}{{7*7}}',
    '<iframe src="javascript:alert(`xss`)">',
    'data:text/html,<script>alert("xss")</script>'
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#",
    "'; INSERT INTO users VALUES ('hacker', 'password'); --"
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '/etc/shadow',
    'C:\\Windows\\System32\\drivers\\etc\\hosts'
  ],
  commandInjection: [
    '; cat /etc/passwd',
    '| whoami',
    '`rm -rf /`',  
    '$(id)',
    '&& echo vulnerable'
  ],
  dosAttacks: [
    'A'.repeat(100000), // Very large string
    Array(1000).fill('test').join(','), // Large array
    JSON.stringify(Array(10000).fill({ key: 'value' })) // Large JSON
  ]
} as const

// Error Response Templates for validation
export const EXPECTED_ERROR_RESPONSES = {
  unauthorized: {
    status: 401,
    body: { error: 'Unauthorized' }
  },
  forbidden: {
    status: 403,
    body: { error: 'Insufficient permissions' }
  },
  badRequest: {
    status: 400,
    body: { error: 'Bad request' }
  },
  notFound: {
    status: 404,
    body: { error: 'Resource not found' }
  },
  rateLimited: {
    status: 429,
    body: { error: 'Rate limit exceeded' }
  },
  serverError: {
    status: 500,
    body: { error: 'Internal server error' }
  }
} as const

// Helper function to get test data by type
export function getTestData(type: 'users' | 'organizations' | 'surveys' | 'responses' | 'exports') {
  const data = {
    users: TEST_USERS,
    organizations: TEST_ORGANIZATIONS,
    surveys: TEST_SURVEYS,
    responses: TEST_SURVEY_RESPONSES,
    exports: TEST_EXPORT_OPTIONS
  }
  return data[type]
}

// Helper function to get credentials for different user types
export function getTestCredentials(role: 'admin' | 'org_admin' | 'user' = 'admin') {
  const user = TEST_USERS.find(u => u.role === role)
  if (!user) throw new Error(`No test user found for role: ${role}`)
  
  return {
    email: user.email,
    password: user.password,
    userId: user.id,
    organizationId: user.organizationId
  }
}

// Export test credentials for common usage
export const TEST_CREDENTIALS = {
  ADMIN_USER: getTestCredentials('admin'),
  ORG_ADMIN_USER: getTestCredentials('org_admin'),
  VALID_USER: getTestCredentials('user'),
} as const;

// Types for test helpers
export interface TestUser {
  email: string;
  password: string;
  userId: string;
  organizationId: string;
}

export interface AuthTestHelpers {
  login: (credentials: TestUser, options?: { expectSuccess?: boolean; timeout?: number }) => Promise<{ success: boolean; url: string }>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<boolean>;
}

export interface TestDataManager {
  cleanup: () => Promise<void>;
  createTestSurvey: (questions: number, title: string) => Promise<{ id: string; title: string; questions: any[] }>;
  generateTestResponses: (survey: any, count: number) => any[];
  simulateNetworkConditions: (condition: 'normal' | 'offline' | 'slow') => Promise<void>;
}

// Create auth test helpers
export function createAuthTestHelpers(page: any): AuthTestHelpers {
  return {
    async login(credentials: TestUser, options: { expectSuccess?: boolean; timeout?: number } = {}) {
      const { expectSuccess = true, timeout = 10000 } = options;
      
      try {
        // Navigate to login page
        await page.goto('/auth/login');
        await page.waitForLoadState('networkidle', { timeout });
        
        // Fill login form
        const emailInput = page.locator('[data-testid="email-input"], input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('[data-testid="password-input"], input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('[data-testid="login-submit"], button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
        
        if (await emailInput.isVisible()) {
          await emailInput.fill(credentials.email);
        }
        
        if (await passwordInput.isVisible()) {
          await passwordInput.fill(credentials.password);
        }
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
        
        // Wait for navigation or error
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const success = currentUrl.includes('/dashboard') || currentUrl.includes('/admin');
        
        return { success, url: currentUrl };
      } catch (error) {
        console.error('Login failed:', error);
        return { success: false, url: page.url() };
      }
    },
    
    async logout() {
      try {
        const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]').first();
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Clear storage
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
    },
    
    async checkAuthState() {
      try {
        const currentUrl = page.url();
        return currentUrl.includes('/dashboard') || currentUrl.includes('/admin');
      } catch (error) {
        return false;
      }
    }
  };
}

// Create test data manager
export function createTestDataManager(page: any): TestDataManager {
  return {
    async cleanup() {
      try {
        // Clear any test data
        await page.evaluate(() => {
          localStorage.removeItem('test-survey-data');
          localStorage.removeItem('test-user-data');
        });
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    },
    
    async createTestSurvey(questions: number, title: string) {
      const survey = {
        id: `test-survey-${Date.now()}`,
        title,
        questions: Array.from({ length: questions }, (_, i) => ({
          id: `q${i + 1}`,
          type: 'text',
          title: `Test Question ${i + 1}`,
          required: true,
          order: i + 1
        }))
      };
      
      // Store in localStorage for mock usage
      await page.evaluate((surveyData: any) => {
        const surveys = JSON.parse(localStorage.getItem('test-surveys') || '[]');
        surveys.push(surveyData);
        localStorage.setItem('test-surveys', JSON.stringify(surveys));
      }, survey);
      
      return survey;
    },
    
    generateTestResponses(survey: any, count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: `response-${i + 1}`,
        surveyId: survey.id,
        userId: `user-${i + 1}`,
        responses: survey.questions.map((q: any) => ({
          questionId: q.id,
          answer: `Test response ${i + 1} for ${q.title}`
        })),
        completedAt: new Date().toISOString()
      }));
    },
    
    async simulateNetworkConditions(condition: 'normal' | 'offline' | 'slow') {
      try {
        if (condition === 'offline') {
          await page.context().setOffline(true);
        } else if (condition === 'slow') {
          await page.context().setOffline(false);
          // Simulate slow network with route delays
          await page.route('**/*', async (route: Route) => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.continue();
          });
        } else {
          await page.context().setOffline(false);
          await page.unrouteAll();
        }
      } catch (error) {
        console.error('Network simulation failed:', error);
      }
    }
  };
}