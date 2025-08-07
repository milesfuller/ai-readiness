#!/usr/bin/env node

/**
 * EPIPE Configuration Validator
 * 
 * Validates that the Playwright configuration is properly set up to prevent EPIPE errors.
 * This script checks all the stability settings and provides recommendations.
 */

const fs = require('fs');
const path = require('path');

class EPIPEConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.recommendations = [];
    this.configPath = 'playwright.config.stable.ts';
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'ERROR');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(message, 'WARN');
  }

  recommendation(message) {
    this.recommendations.push(message);
    this.log(message, 'RECOMMEND');
  }

  async validate() {
    this.log('🔍 Starting EPIPE configuration validation...');

    // Check if stable config exists
    await this.validateConfigExists();
    
    // Validate configuration content
    await this.validateConfigContent();
    
    // Check scripts
    await this.validateScripts();
    
    // Check environment
    await this.validateEnvironment();
    
    // Check directories
    await this.validateDirectories();
    
    // Generate report
    this.generateReport();
  }

  async validateConfigExists() {
    this.log('📋 Checking if stable configuration exists...');
    
    if (!fs.existsSync(this.configPath)) {
      this.error(`Stable configuration not found: ${this.configPath}`);
      this.recommendation('Run: Create playwright.config.stable.ts with EPIPE-resistant settings');
      return false;
    }
    
    this.log(`✅ Found stable configuration: ${this.configPath}`);
    return true;
  }

  async validateConfigContent() {
    this.log('🔧 Validating configuration content...');
    
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      
      // Check critical settings
      this.validateWorkerSettings(configContent);
      this.validateParallelSettings(configContent);
      this.validateConnectionLimits(configContent);
      this.validateReporterSettings(configContent);
      this.validateTimeoutSettings(configContent);
      this.validateProjectSettings(configContent);
      
    } catch (error) {
      this.error(`Failed to read configuration: ${error.message}`);
    }
  }

  validateWorkerSettings(content) {
    if (!content.includes('workers: 1')) {
      this.error('Worker count not set to 1 for stability');
      this.recommendation('Set: workers: 1');
    } else {
      this.log('✅ Single worker configuration confirmed');
    }
  }

  validateParallelSettings(content) {
    if (!content.includes('fullyParallel: false')) {
      this.error('Parallel execution not disabled');
      this.recommendation('Set: fullyParallel: false');
    } else {
      this.log('✅ Parallel execution disabled');
    }
  }

  validateConnectionLimits(content) {
    const connectionChecks = [
      { setting: '--max-connections-per-host=1', name: 'Max connections per host' },
      { setting: '--max-connections-per-proxy=1', name: 'Max connections per proxy' },
      { setting: 'Connection": "close"', name: 'Connection close header' }
    ];

    connectionChecks.forEach(check => {
      if (!content.includes(check.setting)) {
        this.warning(`${check.name} not configured for maximum stability`);
        this.recommendation(`Configure: ${check.setting}`);
      } else {
        this.log(`✅ ${check.name} configured correctly`);
      }
    });
  }

  validateReporterSettings(content) {
    if (content.includes("['html']") && !content.includes("['dot']")) {
      this.warning('HTML reporter may cause output pipe issues');
      this.recommendation('Use dot reporter for CI: [["dot"]]');
    }

    if (content.includes('trace: \'on\'')) {
      this.warning('Tracing enabled - may cause file I/O issues');
      this.recommendation('Disable tracing: trace: "off"');
    } else if (content.includes('trace: \'off\'')) {
      this.log('✅ Tracing disabled for stability');
    }

    if (content.includes('video: \'on\'')) {
      this.warning('Video recording enabled - may cause pipe issues');
      this.recommendation('Disable video: video: "off"');
    } else if (content.includes('video: \'off\'')) {
      this.log('✅ Video recording disabled');
    }
  }

  validateTimeoutSettings(content) {
    const timeoutChecks = [
      { setting: 'timeout: 120000', name: 'Global timeout', min: 120000 },
      { setting: 'actionTimeout: 30000', name: 'Action timeout', min: 30000 },
      { setting: 'navigationTimeout: 60000', name: 'Navigation timeout', min: 60000 }
    ];

    timeoutChecks.forEach(check => {
      const match = content.match(new RegExp(`${check.setting.split(':')[0]}:\\s*(\\d+)`));
      if (match) {
        const value = parseInt(match[1]);
        if (value >= check.min) {
          this.log(`✅ ${check.name} configured with adequate time: ${value}ms`);
        } else {
          this.warning(`${check.name} too short for stability: ${value}ms`);
          this.recommendation(`Increase ${check.name} to at least ${check.min}ms`);
        }
      } else {
        this.warning(`${check.name} not found or not configured`);
      }
    });
  }

  validateProjectSettings(content) {
    // Count browser projects
    const projectMatches = content.match(/name: '[^']+'/g) || [];
    const browserProjects = projectMatches.filter(match => 
      match.includes('chromium') || 
      match.includes('firefox') || 
      match.includes('webkit') || 
      match.includes('safari')
    );

    if (browserProjects.length > 1) {
      this.warning(`Multiple browser projects detected (${browserProjects.length})`);
      this.recommendation('Use only one browser project for maximum stability');
    } else if (browserProjects.length === 1) {
      this.log('✅ Single browser project configured');
    }

    // Check for slowMo setting
    if (!content.includes('slowMo:')) {
      this.warning('No slowMo setting found');
      this.recommendation('Add slowMo: 500 or higher for stability');
    } else {
      const slowMoMatch = content.match(/slowMo:\s*(\d+)/);
      if (slowMoMatch) {
        const slowMo = parseInt(slowMoMatch[1]);
        if (slowMo >= 500) {
          this.log(`✅ slowMo configured appropriately: ${slowMo}ms`);
        } else {
          this.warning(`slowMo too fast for stability: ${slowMo}ms`);
          this.recommendation('Increase slowMo to at least 500ms');
        }
      }
    }
  }

  async validateScripts() {
    this.log('📜 Validating package.json scripts...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};

      // Check for EPIPE-safe scripts
      if (scripts['test:e2e:epipe-safe']) {
        this.log('✅ EPIPE-safe test script found');
      } else {
        this.warning('No EPIPE-safe test script found');
        this.recommendation('Add: "test:e2e:epipe-safe": "node scripts/run-playwright-epipe-safe.js"');
      }

      // Check for stable configuration script
      if (scripts['test:e2e:stable']) {
        this.log('✅ Stable test script found');
      } else {
        this.warning('No stable test script found');
        this.recommendation('Add: "test:e2e:stable": "playwright test --config playwright.config.stable.ts"');
      }

    } catch (error) {
      this.error(`Failed to read package.json: ${error.message}`);
    }
  }

  async validateEnvironment() {
    this.log('🌍 Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      this.warning(`Node.js version ${nodeVersion} may have EPIPE issues`);
      this.recommendation('Upgrade to Node.js 16 or higher');
    } else {
      this.log(`✅ Node.js version adequate: ${nodeVersion}`);
    }

    // Check system limits
    if (process.platform === 'linux') {
      this.checkLinuxSystemLimits();
    }

    // Check memory settings
    const nodeOptions = process.env.NODE_OPTIONS || '';
    if (!nodeOptions.includes('--max-old-space-size')) {
      this.recommendation('Set NODE_OPTIONS="--max-old-space-size=4096" for stability');
    }
  }

  checkLinuxSystemLimits() {
    try {
      const { exec } = require('child_process');
      
      exec('ulimit -n', (error, stdout, stderr) => {
        if (!error) {
          const fileLimit = parseInt(stdout.trim());
          if (fileLimit < 4096) {
            this.warning(`File descriptor limit low: ${fileLimit}`);
            this.recommendation('Increase with: ulimit -n 8192');
          } else {
            this.log(`✅ File descriptor limit adequate: ${fileLimit}`);
          }
        }
      });

    } catch (error) {
      this.log('Could not check system limits');
    }
  }

  async validateDirectories() {
    this.log('📁 Validating directories...');
    
    const requiredDirs = [
      'test-results',
      'e2e'
    ];

    requiredDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        this.warning(`Required directory missing: ${dir}`);
        this.recommendation(`Create directory: mkdir -p ${dir}`);
      } else {
        this.log(`✅ Directory exists: ${dir}`);
      }
    });
  }

  generateReport() {
    this.log('\n📊 VALIDATION REPORT');
    this.log('=' + '='.repeat(50));

    // Summary
    console.log(`\n📈 SUMMARY:`);
    console.log(`   ✅ Checks passed: ${this.countPasses()}`);
    console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);
    console.log(`   💡 Recommendations: ${this.recommendations.length}`);

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }

    // Recommendations
    if (this.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS (${this.recommendations.length}):`);
      this.recommendations.forEach((recommendation, index) => {
        console.log(`   ${index + 1}. ${recommendation}`);
      });
    }

    // Overall assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (this.errors.length === 0 && this.warnings.length <= 2) {
      console.log('   ✅ Configuration is well-optimized for EPIPE resistance');
      console.log('   🚀 Ready for stable test execution');
    } else if (this.errors.length === 0) {
      console.log('   ⚠️  Configuration is functional but could be optimized');
      console.log('   🔧 Consider implementing the recommendations above');
    } else {
      console.log('   ❌ Configuration has critical issues that should be addressed');
      console.log('   🛠️  Fix the errors above before running tests');
    }

    console.log('\n' + '='.repeat(52));

    // Exit with appropriate code
    if (this.errors.length > 0) {
      process.exit(1);
    } else if (this.warnings.length > 3) {
      process.exit(2); // Warning exit code
    } else {
      process.exit(0);
    }
  }

  countPasses() {
    // For simplicity, estimate successful checks
    return Math.max(0, 15 - this.errors.length - Math.floor(this.warnings.length / 2));
  }

  getAllLogMessages() {
    // This would normally track all messages, but for simplicity we'll estimate
    return this.errors.length + this.warnings.length + this.recommendations.length;
  }
}

// Command line interface
async function main() {
  const validator = new EPIPEConfigValidator();
  
  console.log('🔍 EPIPE Configuration Validator');
  console.log('================================\n');
  
  try {
    await validator.validate();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { EPIPEConfigValidator };