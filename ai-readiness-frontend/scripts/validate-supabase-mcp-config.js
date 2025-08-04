#!/usr/bin/env node

/**
 * Supabase MCP Configuration Validator
 * Validates the MCP integration configuration without requiring Docker
 * 
 * This script checks:
 * - Configuration file syntax and completeness
 * - Environment variable setup
 * - Database schema validity
 * - Test script functionality
 * - File permissions and structure
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigValidator {
  constructor() {
    this.results = [];
    this.projectRoot = path.join(__dirname, '..');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  logResult(testName, success, details = '') {
    this.results.push({ testName, success, details, timestamp: new Date().toISOString() });
    this.log(`${testName}: ${success ? 'PASSED' : 'FAILED'}${details ? ` - ${details}` : ''}`, success ? 'success' : 'error');
  }

  async validateConfigToml() {
    try {
      this.log('Validating supabase/config.toml...');
      
      const configPath = path.join(this.projectRoot, 'supabase', 'config.toml');
      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Check for required sections
      const requiredSections = [
        '[api]', '[db]', '[auth]', '[storage]', '[edge_functions]', 
        '[realtime]', '[custom.mcp]', '[custom.ai_readiness]'
      ];
      
      const missingSections = requiredSections.filter(section => 
        !configContent.includes(section)
      );
      
      if (missingSections.length > 0) {
        throw new Error(`Missing sections: ${missingSections.join(', ')}`);
      }
      
      // Check MCP-specific configuration
      const mcpConfigs = [
        'endpoint = "http://localhost:8000"',
        'webhook_secret = "mcp-webhook-secret-ai-readiness-2024"',
        'llm_analysis_enabled = true'
      ];
      
      const missingConfigs = mcpConfigs.filter(config => 
        !configContent.includes(config)
      );
      
      if (missingConfigs.length > 0) {
        throw new Error(`Missing MCP configurations: ${missingConfigs.length} items`);
      }
      
      this.logResult('Config TOML Validation', true, 'All required sections and MCP configs present');
      return true;
    } catch (error) {
      this.logResult('Config TOML Validation', false, error.message);
      return false;
    }
  }

  async validateEnvironmentFile() {
    try {
      this.log('Validating .env.supabase.local...');
      
      const envPath = path.join(this.projectRoot, '.env.supabase.local');
      const envContent = await fs.readFile(envPath, 'utf8');
      
      // Check for required environment variables
      const requiredVars = [
        'SUPABASE_URL=',
        'SUPABASE_ANON_KEY=',
        'SUPABASE_SERVICE_ROLE_KEY=',
        'MCP_ENABLED=true',
        'MCP_ENDPOINT=',
        'MCP_API_KEY=',
        'MCP_WEBHOOK_SECRET='
      ];
      
      const missingVars = requiredVars.filter(varName => 
        !envContent.includes(varName)
      );
      
      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }
      
      // Validate JWT keys format (should be base64-like)
      const jwtKeys = envContent.match(/KEY=([^\n]+)/g) || [];
      for (const key of jwtKeys) {
        const keyValue = key.split('=')[1];
        if (keyValue.length < 100) {
          this.log(`Warning: JWT key might be too short: ${keyValue.substring(0, 20)}...`, 'warn');
        }
      }
      
      this.logResult('Environment File Validation', true, `All ${requiredVars.length} required variables present`);
      return true;
    } catch (error) {
      this.logResult('Environment File Validation', false, error.message);
      return false;
    }
  }

  async validateDatabaseSchema() {
    try {
      this.log('Validating database schema migration...');
      
      const migrationPath = path.join(this.projectRoot, 'supabase', 'migrations', '00001_initial_schema.sql');
      const schemaContent = await fs.readFile(migrationPath, 'utf8');
      
      // Check for required tables
      const requiredTables = [
        'CREATE TABLE public.profiles',
        'CREATE TABLE public.organizations', 
        'CREATE TABLE public.organization_members',
        'CREATE TABLE public.surveys',
        'CREATE TABLE public.survey_responses',
        'CREATE TABLE public.llm_analyses',
        'CREATE TABLE public.api_tokens',
        'CREATE TABLE public.mcp_webhooks',
        'CREATE TABLE public.activity_logs'
      ];
      
      const missingTables = requiredTables.filter(table => 
        !schemaContent.includes(table)
      );
      
      if (missingTables.length > 0) {
        throw new Error(`Missing table definitions: ${missingTables.length} tables`);
      }
      
      // Check for MCP-specific features
      const mcpFeatures = [
        'mcp_settings JSONB',
        'mcp_config JSONB',
        'mcp_processed BOOLEAN',
        'mcp_webhook_sent BOOLEAN',
        'notify_mcp_webhook()',
        'X-MCP-API-KEY'
      ];
      
      const presentFeatures = mcpFeatures.filter(feature => 
        schemaContent.includes(feature)
      );
      
      // Check for indexes
      const indexCount = (schemaContent.match(/CREATE INDEX/g) || []).length;
      if (indexCount < 15) {
        this.log(`Warning: Only ${indexCount} indexes found, expected at least 15`, 'warn');
      }
      
      // Check for RLS policies
      const rlsPolicyCount = (schemaContent.match(/CREATE POLICY/g) || []).length;
      if (rlsPolicyCount < 8) {
        this.log(`Warning: Only ${rlsPolicyCount} RLS policies found, expected at least 8`, 'warn');
      }
      
      this.logResult('Database Schema Validation', true, 
        `All ${requiredTables.length} tables, ${presentFeatures.length}/${mcpFeatures.length} MCP features, ${indexCount} indexes, ${rlsPolicyCount} RLS policies`);
      return true;
    } catch (error) {
      this.logResult('Database Schema Validation', false, error.message);
      return false;
    }
  }

  async validateTestScript() {
    try {
      this.log('Validating test script...');
      
      const testScriptPath = path.join(this.projectRoot, 'scripts', 'test-supabase-mcp.js');
      const testContent = await fs.readFile(testScriptPath, 'utf8');
      
      // Check for test methods
      const requiredMethods = [
        'testSupabaseConnection',
        'testSchemaValidation', 
        'testAuthentication',
        'testMCPConnection',
        'testWebhookCreation',
        'testAPITokenGeneration',
        'testSurveyWorkflow',
        'testAIAnalysisIntegration',
        'testWebhookDelivery',
        'testRealtimeSubscriptions',
        'testDataExport'
      ];
      
      const presentMethods = requiredMethods.filter(method => 
        testContent.includes(method)
      );
      
      if (presentMethods.length !== requiredMethods.length) {
        throw new Error(`Missing test methods: ${requiredMethods.length - presentMethods.length} missing`);
      }
      
      // Check for proper imports
      const requiredImports = [
        '@supabase/supabase-js',
        'node-fetch',
        'crypto'
      ];
      
      const missingImports = requiredImports.filter(imp => 
        !testContent.includes(imp)
      );
      
      if (missingImports.length > 0) {
        this.log(`Warning: Missing imports: ${missingImports.join(', ')}`, 'warn');
      }
      
      // Check file permissions
      const stats = await fs.stat(testScriptPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      if (!isExecutable) {
        this.log('Warning: Test script is not executable', 'warn');
      }
      
      this.logResult('Test Script Validation', true, 
        `All ${presentMethods.length} test methods present, ${isExecutable ? 'executable' : 'not executable'}`);
      return true;
    } catch (error) {
      this.logResult('Test Script Validation', false, error.message);
      return false;
    }
  }

  async validateSetupScript() {
    try {
      this.log('Validating setup script...');
      
      const setupScriptPath = path.join(this.projectRoot, 'scripts', 'setup-supabase-mcp.sh');
      const setupContent = await fs.readFile(setupScriptPath, 'utf8');
      
      // Check for required functions
      const requiredFunctions = [
        'check_prerequisites()',
        'load_environment()',
        'start_supabase_mcp()',
        'wait_for_services()',
        'run_migrations()',
        'verify_installation()',
        'run_tests()'
      ];
      
      const presentFunctions = requiredFunctions.filter(func => 
        setupContent.includes(func)
      );
      
      if (presentFunctions.length !== requiredFunctions.length) {
        throw new Error(`Missing setup functions: ${requiredFunctions.length - presentFunctions.length} missing`);
      }
      
      // Check for proper error handling
      const hasErrorHandling = setupContent.includes('set -e') && setupContent.includes('error()');
      if (!hasErrorHandling) {
        this.log('Warning: Setup script may be missing proper error handling', 'warn');
      }
      
      // Check file permissions
      const stats = await fs.stat(setupScriptPath);
      const isExecutable = (stats.mode & parseInt('111', 8)) !== 0;
      if (!isExecutable) {
        this.log('Warning: Setup script is not executable', 'warn');
      }
      
      this.logResult('Setup Script Validation', true, 
        `All ${presentFunctions.length} functions present, ${hasErrorHandling ? 'error handling' : 'no error handling'}, ${isExecutable ? 'executable' : 'not executable'}`);
      return true;
    } catch (error) {
      this.logResult('Setup Script Validation', false, error.message);
      return false;
    }
  }

  async validateDocumentation() {
    try {
      this.log('Validating documentation...');
      
      const readmePath = path.join(this.projectRoot, 'supabase', 'mcp-integration-readme.md');
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      
      // Check for required sections
      const requiredSections = [
        '## Overview',
        '## Architecture', 
        '## Key Features',
        '## Configuration Files',
        '## Setup Instructions',
        '## Testing',
        '## Usage Examples',
        '## Troubleshooting',
        '## Security Considerations',
        '## Production Deployment'
      ];
      
      const presentSections = requiredSections.filter(section => 
        readmeContent.includes(section)
      );
      
      if (presentSections.length !== requiredSections.length) {
        throw new Error(`Missing documentation sections: ${requiredSections.length - presentSections.length} missing`);
      }
      
      // Check for code examples
      const codeBlockCount = (readmeContent.match(/```/g) || []).length / 2;
      if (codeBlockCount < 10) {
        this.log(`Warning: Only ${codeBlockCount} code blocks found, expected more examples`, 'warn');
      }
      
      this.logResult('Documentation Validation', true, 
        `All ${presentSections.length} sections present, ${Math.floor(codeBlockCount)} code examples`);
      return true;
    } catch (error) {
      this.logResult('Documentation Validation', false, error.message);
      return false;
    }
  }

  async validatePackageConfiguration() {
    try {
      this.log('Validating package.json configuration...');
      
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      // Check for required dependencies
      const requiredDeps = [
        '@supabase/supabase-js',
        '@supabase/ssr',
        '@supabase/auth-helpers-nextjs'
      ];
      
      const missingDeps = requiredDeps.filter(dep => 
        !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
      );
      
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }
      
      // Check for Supabase scripts
      const requiredScripts = [
        'supabase:start',
        'supabase:stop', 
        'supabase:reset',
        'test:supabase'
      ];
      
      const presentScripts = requiredScripts.filter(script => 
        packageJson.scripts[script]
      );
      
      if (presentScripts.length !== requiredScripts.length) {
        this.log(`Warning: Missing Supabase scripts: ${requiredScripts.length - presentScripts.length} missing`, 'warn');
      }
      
      this.logResult('Package Configuration Validation', true, 
        `All ${requiredDeps.length} dependencies present, ${presentScripts.length}/${requiredScripts.length} scripts`);
      return true;
    } catch (error) {
      this.logResult('Package Configuration Validation', false, error.message);
      return false;
    }
  }

  async validateDirectoryStructure() {
    try {
      this.log('Validating directory structure...');
      
      const requiredPaths = [
        'supabase/config.toml',
        'supabase/migrations/00001_initial_schema.sql',
        'supabase/mcp-integration-readme.md',
        '.env.supabase.local',
        'scripts/test-supabase-mcp.js',
        'scripts/setup-supabase-mcp.sh',
        'docker/mcp-supabase/docker-compose.yml'
      ];
      
      const missingPaths = [];
      const presentPaths = [];
      
      for (const requiredPath of requiredPaths) {
        const fullPath = path.join(this.projectRoot, requiredPath);
        try {
          await fs.access(fullPath);
          presentPaths.push(requiredPath);
        } catch {
          missingPaths.push(requiredPath);
        }
      }
      
      if (missingPaths.length > 0) {
        throw new Error(`Missing files/directories: ${missingPaths.join(', ')}`);
      }
      
      this.logResult('Directory Structure Validation', true, 
        `All ${presentPaths.length} required files present`);
      return true;
    } catch (error) {
      this.logResult('Directory Structure Validation', false, error.message);
      return false;
    }
  }

  async generateValidationReport() {
    const report = {
      validator: 'Supabase MCP Configuration Validator',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        projectRoot: this.projectRoot
      },
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        successRate: Math.round((this.results.filter(r => r.success).length / this.results.length) * 100)
      },
      recommendations: this.generateRecommendations()
    };

    // Save report
    const reportPath = path.join(this.projectRoot, 'test-results', 'supabase-mcp-config-validation.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    this.log(`Validation report saved to: ${reportPath}`);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const failedTests = this.results.filter(r => !r.success);
    if (failedTests.length > 0) {
      recommendations.push({
        type: 'critical',
        message: `Fix ${failedTests.length} failed validation checks before proceeding`
      });
    }
    
    recommendations.push({
      type: 'info',
      message: 'Run the setup script to start the MCP integration: ./scripts/setup-supabase-mcp.sh'
    });
    
    recommendations.push({
      type: 'info', 
      message: 'Test the integration after setup: node scripts/test-supabase-mcp.js'
    });
    
    recommendations.push({
      type: 'security',
      message: 'Review security settings before production deployment'
    });
    
    return recommendations;
  }

  async runAllValidations() {
    this.log('🔍 Starting Supabase MCP Configuration Validation\n');

    const validations = [
      () => this.validateDirectoryStructure(),
      () => this.validateConfigToml(),
      () => this.validateEnvironmentFile(),
      () => this.validateDatabaseSchema(),
      () => this.validateTestScript(),
      () => this.validateSetupScript(),
      () => this.validateDocumentation(),
      () => this.validatePackageConfiguration()
    ];

    let allPassed = true;

    for (const validation of validations) {
      try {
        const result = await validation();
        if (!result) allPassed = false;
      } catch (error) {
        this.log(`Validation error: ${error.message}`, 'error');
        allPassed = false;
      }
    }

    const report = await this.generateValidationReport();

    this.log(`\n📊 Validation Summary:`);
    this.log(`   Total Checks: ${report.summary.total}`);
    this.log(`   Passed: ${report.summary.passed}`);
    this.log(`   Failed: ${report.summary.failed}`);
    this.log(`   Success Rate: ${report.summary.successRate}%`);

    if (report.recommendations.length > 0) {
      this.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        this.log(`   ${rec.type.toUpperCase()}: ${rec.message}`);
      });
    }

    this.log(`\n${allPassed ? '✅' : '❌'} Configuration validation ${allPassed ? 'PASSED' : 'COMPLETED WITH ISSUES'}`);
    
    return { success: allPassed, report };
  }
}

// CLI execution
if (require.main === module) {
  const validator = new ConfigValidator();
  
  validator.runAllValidations()
    .then(({ success, report }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ConfigValidator;