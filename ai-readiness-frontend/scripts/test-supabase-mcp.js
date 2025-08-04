#!/usr/bin/env node

/**
 * Supabase MCP Integration Test Script
 * Tests the complete integration between Supabase and MCP for AI Readiness
 * 
 * Features tested:
 * - Supabase connection and authentication
 * - Database schema validation
 * - MCP webhook integration
 * - API token generation and validation
 * - Real-time subscriptions
 * - AI analysis triggers
 * - Data export functionality
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  },
  mcp: {
    endpoint: process.env.MCP_ENDPOINT || 'http://localhost:8000',
    apiKey: process.env.MCP_API_KEY || 'test-mcp-api-key-ai-readiness-2024',
    webhookSecret: process.env.MCP_WEBHOOK_SECRET || 'mcp-webhook-secret-ai-readiness-2024'
  },
  test: {
    timeout: 30000,
    retries: 3,
    userEmail: 'mcp-test@aireadiness.local',
    userPassword: 'McpTestPassword123!'
  }
};

class SupabaseMCPTester {
  constructor() {
    this.supabaseClient = null;
    this.supabaseAdmin = null;
    this.testResults = [];
    this.testUser = null;
    this.testOrganization = null;
    this.testSurvey = null;
  }

  // Logging utilities
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  logResult(testName, success, details = '') {
    this.testResults.push({ testName, success, details, timestamp: new Date().toISOString() });
    this.log(`${testName}: ${success ? 'PASSED' : 'FAILED'}${details ? ` - ${details}` : ''}`, success ? 'success' : 'error');
  }

  // Initialize Supabase clients
  async initializeClients() {
    try {
      this.log('Initializing Supabase clients...');
      
      // Anonymous/authenticated client
      this.supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      });

      // Admin client with service role
      this.supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceKey);

      this.logResult('Supabase Client Initialization', true);
      return true;
    } catch (error) {
      this.logResult('Supabase Client Initialization', false, error.message);
      return false;
    }
  }

  // Test Supabase connection
  async testSupabaseConnection() {
    try {
      this.log('Testing Supabase connection...');
      
      const { data, error } = await this.supabaseAdmin
        .from('profiles')
        .select('count(*)')
        .single();

      if (error) throw error;

      this.logResult('Supabase Connection', true, 'Database accessible');
      return true;
    } catch (error) {
      this.logResult('Supabase Connection', false, error.message);
      return false;
    }
  }

  // Test schema validation
  async testSchemaValidation() {
    try {
      this.log('Validating database schema...');
      
      const requiredTables = [
        'profiles', 'organizations', 'organization_members', 
        'surveys', 'survey_responses', 'llm_analyses',
        'api_tokens', 'mcp_webhooks', 'activity_logs'
      ];

      for (const table of requiredTables) {
        const { data, error } = await this.supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          throw new Error(`Table ${table} validation failed: ${error.message}`);
        }
      }

      this.logResult('Schema Validation', true, `All ${requiredTables.length} tables accessible`);
      return true;
    } catch (error) {
      this.logResult('Schema Validation', false, error.message);
      return false;
    }
  }

  // Test user authentication
  async testAuthentication() {
    try {
      this.log('Testing user authentication...');

      // Try to sign up test user
      const { data: signUpData, error: signUpError } = await this.supabaseClient.auth.signUp({
        email: config.test.userEmail,
        password: config.test.userPassword,
        options: {
          data: {
            firstName: 'MCP',
            lastName: 'Tester'
          }
        }
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      // Sign in with test user
      const { data: signInData, error: signInError } = await this.supabaseClient.auth.signInWithPassword({
        email: config.test.userEmail,
        password: config.test.userPassword
      });

      if (signInError) throw signInError;

      this.testUser = signInData.user;
      this.logResult('User Authentication', true, `Authenticated as ${this.testUser.email}`);
      return true;
    } catch (error) {
      this.logResult('User Authentication', false, error.message);
      return false;
    }
  }

  // Test MCP endpoint connectivity
  async testMCPConnection() {
    try {
      this.log('Testing MCP endpoint connection...');

      const response = await fetch(`${config.mcp.endpoint}/health`, {
        method: 'GET',
        headers: {
          'X-MCP-API-KEY': config.mcp.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`MCP endpoint returned ${response.status}: ${data.message || 'Unknown error'}`);
      }

      this.logResult('MCP Connection', true, `MCP endpoint healthy: ${data.status || 'OK'}`);
      return true;
    } catch (error) {
      this.logResult('MCP Connection', false, error.message);
      return false;
    }
  }

  // Test webhook creation and validation
  async testWebhookCreation() {
    try {
      this.log('Testing webhook creation...');

      if (!this.testOrganization) {
        // Create test organization first
        const { data: orgData, error: orgError } = await this.supabaseAdmin
          .from('organizations')
          .insert({
            name: 'MCP Test Organization',
            description: 'Test organization for MCP integration',
            industry: 'Technology',
            size: 'startup'
          })
          .select()
          .single();

        if (orgError) throw orgError;
        this.testOrganization = orgData;

        // Add user as organization member
        await this.supabaseAdmin
          .from('organization_members')
          .insert({
            organization_id: this.testOrganization.id,
            user_id: this.testUser.id,
            role: 'owner'
          });
      }

      // Create test webhook
      const { data: webhookData, error: webhookError } = await this.supabaseAdmin
        .from('mcp_webhooks')
        .insert({
          organization_id: this.testOrganization.id,
          webhook_url: `${config.mcp.endpoint}/webhooks/ai-readiness`,
          webhook_secret: config.mcp.webhookSecret,
          events: ['survey.completed', 'analysis.finished']
        })
        .select()
        .single();

      if (webhookError) throw webhookError;

      this.logResult('Webhook Creation', true, `Webhook created with ID: ${webhookData.id}`);
      return true;
    } catch (error) {
      this.logResult('Webhook Creation', false, error.message);
      return false;
    }
  }

  // Test API token generation
  async testAPITokenGeneration() {
    try {
      this.log('Testing API token generation...');

      const tokenValue = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');

      const { data: tokenData, error: tokenError } = await this.supabaseAdmin
        .from('api_tokens')
        .insert({
          user_id: this.testUser.id,
          organization_id: this.testOrganization.id,
          token_name: 'MCP Test Token',
          token_hash: tokenHash,
          permissions: {
            read: ['surveys', 'responses', 'analyses'],
            write: ['surveys'],
            admin: []
          },
          rate_limit: 1000
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      this.logResult('API Token Generation', true, `Token created: MCP Test Token`);
      return { token: tokenValue, data: tokenData };
    } catch (error) {
      this.logResult('API Token Generation', false, error.message);
      return null;
    }
  }

  // Test survey creation and response handling
  async testSurveyWorkflow() {
    try {
      this.log('Testing survey workflow...');

      // Create test survey
      const { data: surveyData, error: surveyError } = await this.supabaseAdmin
        .from('surveys')
        .insert({
          organization_id: this.testOrganization.id,
          title: 'MCP Integration Test Survey',
          description: 'Testing MCP integration with survey responses',
          questions: [
            {
              id: 'q1',
              type: 'text',
              question: 'What are your thoughts on AI readiness?',
              required: true
            },
            {
              id: 'q2',
              type: 'scale',
              question: 'Rate your organization AI readiness (1-10)',
              scale: { min: 1, max: 10 },
              required: true
            }
          ],
          settings: {
            allowAnonymous: true,
            aiAnalysisEnabled: true,
            mcpIntegration: {
              enableWebhooks: true,
              autoAnalyze: true
            }
          },
          status: 'active',
          created_by: this.testUser.id
        })
        .select()
        .single();

      if (surveyError) throw surveyError;
      this.testSurvey = surveyData;

      // Create test response
      const { data: responseData, error: responseError } = await this.supabaseAdmin
        .from('survey_responses')
        .insert({
          survey_id: this.testSurvey.id,
          respondent_id: this.testUser.id,
          session_id: `mcp-test-${Date.now()}`,
          answers: {
            q1: 'Our organization is actively exploring AI integration opportunities.',
            q2: 7
          },
          metadata: {
            userAgent: 'MCP Test Script',
            deviceType: 'automation'
          },
          completion_time: 120
        })
        .select()
        .single();

      if (responseError) throw responseError;

      this.logResult('Survey Workflow', true, `Survey and response created successfully`);
      return { survey: surveyData, response: responseData };
    } catch (error) {
      this.logResult('Survey Workflow', false, error.message);
      return null;
    }
  }

  // Test AI analysis integration
  async testAIAnalysisIntegration() {
    try {
      this.log('Testing AI analysis integration...');

      if (!this.testSurvey) {
        throw new Error('No test survey available for analysis');
      }

      // Create mock AI analysis
      const { data: analysisData, error: analysisError } = await this.supabaseAdmin
        .from('llm_analyses')
        .insert({
          survey_id: this.testSurvey.id,
          analysis_type: 'sentiment',
          results: {
            sentiment: 'positive',
            confidence: 0.85,
            themes: ['ai_adoption', 'organizational_readiness'],
            recommendations: [
              'Continue exploring AI opportunities',
              'Invest in AI training for staff'
            ]
          },
          model_used: 'gpt-4',
          model_version: '2024-03-01',
          tokens_used: 150,
          processing_time: 2500,
          confidence_score: 0.85,
          cost_usd: 0.0023
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      this.logResult('AI Analysis Integration', true, `Analysis created with confidence: ${analysisData.confidence_score}`);
      return analysisData;
    } catch (error) {
      this.logResult('AI Analysis Integration', false, error.message);
      return null;
    }
  }

  // Test webhook delivery simulation
  async testWebhookDelivery() {
    try {
      this.log('Testing webhook delivery simulation...');

      const webhookPayload = {
        event: 'analysis.completed',
        table: 'llm_analyses',
        action: 'INSERT',
        data: {
          survey_id: this.testSurvey?.id,
          analysis_type: 'sentiment',
          results: { sentiment: 'positive' }
        },
        timestamp: new Date().toISOString()
      };

      const signature = crypto
        .createHmac('sha256', config.mcp.webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      const response = await fetch(`${config.mcp.endpoint}/webhooks/ai-readiness`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MCP-Signature': `sha256=${signature}`,
          'X-MCP-Event': 'analysis.completed'
        },
        body: JSON.stringify(webhookPayload),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      this.logResult('Webhook Delivery', true, `Webhook delivered successfully: ${responseData.status || 'OK'}`);
      return true;
    } catch (error) {
      this.logResult('Webhook Delivery', false, error.message);
      return false;
    }
  }

  // Test real-time subscriptions
  async testRealtimeSubscriptions() {
    try {
      this.log('Testing real-time subscriptions...');

      return new Promise((resolve) => {
        let subscriptionReceived = false;
        const timeout = setTimeout(() => {
          if (!subscriptionReceived) {
            this.logResult('Realtime Subscriptions', false, 'Subscription timeout');
            resolve(false);
          }
        }, 5000);

        const subscription = this.supabaseClient
          .channel('mcp-test-channel')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs'
          }, (payload) => {
            subscriptionReceived = true;
            clearTimeout(timeout);
            this.logResult('Realtime Subscriptions', true, `Received event: ${payload.eventType}`);
            subscription.unsubscribe();
            resolve(true);
          })
          .subscribe();

        // Trigger an event to test subscription
        setTimeout(async () => {
          await this.supabaseAdmin
            .from('activity_logs')
            .insert({
              user_id: this.testUser?.id,
              action: 'mcp.test.realtime',
              resource_type: 'test',
              details: { test: 'realtime_subscription' }
            });
        }, 1000);
      });
    } catch (error) {
      this.logResult('Realtime Subscriptions', false, error.message);
      return false;
    }
  }

  // Test data export functionality
  async testDataExport() {
    try {
      this.log('Testing data export functionality...');

      if (!this.testSurvey) {
        throw new Error('No test survey available for export');
      }

      // Export survey responses
      const { data: responses, error: exportError } = await this.supabaseAdmin
        .from('survey_responses')
        .select(`
          id,
          answers,
          submitted_at,
          completion_time,
          surveys!inner(title, organization_id)
        `)
        .eq('survey_id', this.testSurvey.id);

      if (exportError) throw exportError;

      // Format for export
      const exportData = {
        survey: {
          id: this.testSurvey.id,
          title: this.testSurvey.title,
          exported_at: new Date().toISOString()
        },
        responses: responses,
        metadata: {
          total_responses: responses.length,
          export_type: 'mcp_test',
          format: 'json'
        }
      };

      this.logResult('Data Export', true, `Exported ${responses.length} responses`);
      return exportData;
    } catch (error) {
      this.logResult('Data Export', false, error.message);
      return null;
    }
  }

  // Cleanup test data
  async cleanupTestData() {
    try {
      this.log('Cleaning up test data...');

      const cleanupOperations = [];

      if (this.testSurvey) {
        cleanupOperations.push(
          this.supabaseAdmin.from('llm_analyses').delete().eq('survey_id', this.testSurvey.id),
          this.supabaseAdmin.from('survey_responses').delete().eq('survey_id', this.testSurvey.id),
          this.supabaseAdmin.from('surveys').delete().eq('id', this.testSurvey.id)
        );
      }

      if (this.testOrganization) {
        cleanupOperations.push(
          this.supabaseAdmin.from('mcp_webhooks').delete().eq('organization_id', this.testOrganization.id),
          this.supabaseAdmin.from('api_tokens').delete().eq('organization_id', this.testOrganization.id),
          this.supabaseAdmin.from('organization_members').delete().eq('organization_id', this.testOrganization.id),
          this.supabaseAdmin.from('organizations').delete().eq('id', this.testOrganization.id),
          this.supabaseAdmin.from('activity_logs').delete().eq('organization_id', this.testOrganization.id)
        );
      }

      if (this.testUser) {
        cleanupOperations.push(
          this.supabaseAdmin.from('profiles').delete().eq('user_id', this.testUser.id)
        );
      }

      await Promise.all(cleanupOperations);
      
      this.logResult('Cleanup', true, 'Test data cleaned up successfully');
      return true;
    } catch (error) {
      this.logResult('Cleanup', false, error.message);
      return false;
    }
  }

  // Generate test report
  async generateReport() {
    const report = {
      testSuite: 'Supabase MCP Integration Test',
      timestamp: new Date().toISOString(),
      configuration: {
        supabaseUrl: config.supabase.url,
        mcpEndpoint: config.mcp.endpoint,
        testUser: config.test.userEmail
      },
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length,
        successRate: Math.round((this.testResults.filter(r => r.success).length / this.testResults.length) * 100)
      }
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'test-results', 'supabase-mcp-integration-report.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`Test report saved to: ${reportPath}`);
    this.log(`\n📊 Test Summary:`);
    this.log(`   Total Tests: ${report.summary.total}`);
    this.log(`   Passed: ${report.summary.passed}`);
    this.log(`   Failed: ${report.summary.failed}`);
    this.log(`   Success Rate: ${report.summary.successRate}%`);

    return report;
  }

  // Main test runner
  async runAllTests() {
    this.log('🚀 Starting Supabase MCP Integration Tests\n');

    const tests = [
      () => this.initializeClients(),
      () => this.testSupabaseConnection(),
      () => this.testSchemaValidation(),
      () => this.testAuthentication(),
      () => this.testMCPConnection(),
      () => this.testWebhookCreation(),
      () => this.testAPITokenGeneration(),
      () => this.testSurveyWorkflow(),
      () => this.testAIAnalysisIntegration(),
      () => this.testWebhookDelivery(),
      () => this.testRealtimeSubscriptions(),
      () => this.testDataExport()
    ];

    let allPassed = true;

    for (const test of tests) {
      try {
        const result = await test();
        if (!result) allPassed = false;
      } catch (error) {
        this.log(`Test execution error: ${error.message}`, 'error');
        allPassed = false;
      }
    }

    // Cleanup
    await this.cleanupTestData();

    // Generate report
    const report = await this.generateReport();

    this.log(`\n${allPassed ? '✅' : '❌'} All tests ${allPassed ? 'PASSED' : 'COMPLETED WITH FAILURES'}`);
    
    return { success: allPassed, report };
  }
}

// CLI execution
if (require.main === module) {
  const tester = new SupabaseMCPTester();
  
  tester.runAllTests()
    .then(({ success, report }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = SupabaseMCPTester;