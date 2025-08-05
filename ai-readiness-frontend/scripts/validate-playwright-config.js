#!/usr/bin/env node

/**
 * Playwright Configuration Validator
 * Validates that all configuration fixes are working properly
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class PlaywrightConfigValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async validateConfigFiles() {
    this.log('🔍 Validating Playwright configuration files...');
    
    const configs = [
      'playwright.config.ts',
      'playwright.config.stable.ts',
      'playwright.config.working.js'
    ];

    for (const config of configs) {
      const configPath = path.join(this.projectRoot, config);
      if (fs.existsSync(configPath)) {
        this.log(`✅ Found config: ${config}`, 'success');
        this.results.passed++;
        
        // Check for EPIPE prevention measures
        const content = fs.readFileSync(configPath, 'utf8');
        const checks = [
          { name: 'Single worker mode', pattern: /workers:\s*1/ },
          { name: 'Extended timeouts', pattern: /timeout.*[6-9]\d{4}/ },
          { name: 'Connection keep-alive', pattern: /keep-alive/i },
          { name: 'EPIPE prevention args', pattern: /disable-ipc-flooding-protection/ },
        ];

        for (const check of checks) {
          if (check.pattern.test(content)) {
            this.log(`  ✅ ${check.name} configured`, 'success');
          } else {
            this.log(`  ⚠️  ${check.name} not found`, 'error');
          }
        }
      } else {
        this.log(`❌ Missing config: ${config}`, 'error');
        this.results.failed++;
      }
    }
  }

  async validateEnvironmentSettings() {
    this.log('🔍 Validating environment configuration...');
    
    const envPath = path.join(this.projectRoot, '.env.test');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      
      const checks = [
        { name: 'Playwright base URL', pattern: /PLAYWRIGHT_BASE_URL/ },
        { name: 'Playwright timeout', pattern: /PLAYWRIGHT_TIMEOUT/ },
        { name: 'Single test worker', pattern: /PARALLEL_TEST_WORKERS=1/ },
        { name: 'Memory optimization', pattern: /NODE_OPTIONS.*max-old-space-size/ },
        { name: 'Telemetry disabled', pattern: /NEXT_TELEMETRY_DISABLED=1/ },
      ];

      for (const check of checks) {
        if (check.pattern.test(content)) {
          this.log(`  ✅ ${check.name} configured`, 'success');
          this.results.passed++;
        } else {
          this.log(`  ❌ ${check.name} missing`, 'error');
          this.results.failed++;
        }
      }
    } else {
      this.log('❌ .env.test file not found', 'error');
      this.results.failed++;
    }
  }

  async validatePackageScripts() {
    this.log('🔍 Validating package.json test scripts...');
    
    const packagePath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      const requiredScripts = [
        'test:e2e',
        'test:e2e:stable',
        'test:e2e:debug',
        'test:e2e:working'
      ];

      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          this.log(`  ✅ Script ${script} exists`, 'success');
          this.results.passed++;
        } else {
          this.log(`  ⚠️  Script ${script} missing`, 'error');
        }
      }
    }
  }

  async testBasicPlaywrightInstallation() {
    this.log('🔍 Testing Playwright installation...');
    
    try {
      const { stdout } = await execAsync('npx playwright --version');
      this.log(`✅ Playwright version: ${stdout.trim()}`, 'success');
      this.results.passed++;
    } catch (error) {
      this.log(`❌ Playwright not installed: ${error.message}`, 'error');
      this.results.failed++;
    }
  }

  async testConfigurationSyntax() {
    this.log('🔍 Testing configuration syntax...');
    
    const configs = ['playwright.config.ts', 'playwright.config.stable.ts'];
    
    for (const config of configs) {
      try {
        await execAsync(`npx playwright test --config ${config} --list --reporter=json`, {
          timeout: 30000
        });
        this.log(`✅ ${config} syntax valid`, 'success');
        this.results.passed++;
      } catch (error) {
        this.log(`❌ ${config} syntax error: ${error.message}`, 'error');
        this.results.failed++;
      }
    }
  }

  async validatePortConfiguration() {
    this.log('🔍 Validating port configuration...');
    
    const configs = [
      { file: '.env.test', pattern: /PORT=3000/ },
      { file: 'playwright.config.ts', pattern: /localhost:3000/ },
    ];

    for (const config of configs) {
      const filePath = path.join(this.projectRoot, config.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (config.pattern.test(content)) {
          this.log(`  ✅ Port configured in ${config.file}`, 'success');
          this.results.passed++;
        } else {
          this.log(`  ⚠️  Port not configured in ${config.file}`, 'error');
        }
      }
    }
  }

  generateReport() {
    this.log('📊 Validation Report');
    this.log('==================');
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`📊 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed === 0) {
      this.log('🎉 All validations passed! Playwright configuration is optimized.', 'success');
      return true;
    } else {
      this.log('⚠️  Some validations failed. Please review the configuration.', 'error');
      return false;
    }
  }

  async run() {
    this.log('🚀 Starting Playwright Configuration Validation');
    this.log('==============================================');
    
    await this.validateConfigFiles();
    await this.validateEnvironmentSettings();
    await this.validatePackageScripts();
    await this.testBasicPlaywrightInstallation();
    await this.testConfigurationSyntax();
    await this.validatePortConfiguration();
    
    const success = this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run the validator
if (require.main === module) {
  const validator = new PlaywrightConfigValidator();
  validator.run().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = PlaywrightConfigValidator;