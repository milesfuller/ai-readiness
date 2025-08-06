#!/usr/bin/env node

/**
 * Master Pre-Deployment Validation Orchestrator
 * Coordinates all validation scripts and provides comprehensive deployment readiness report
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import individual validators
const EnvironmentValidator = require('./validate-env');
const ComponentBoundaryValidator = require('./validate-boundaries');
const APIHealthValidator = require('./validate-api');
const DatabaseValidator = require('./validate-database');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class MasterDeploymentValidator {
  constructor(options = {}) {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
    this.isCI = process.env.CI === 'true';
    this.exitCode = 0;
    this.validationResults = {};
    this.startTime = Date.now();
    
    // Configuration options
    this.options = {
      skipApi: false,
      skipDatabase: false,
      skipBoundaries: false,
      skipEnvironment: false,
      parallel: true,
      verbose: false,
      generateReport: true,
      ...options
    };
    
    // Parse command line arguments
    this.parseArguments();
  }

  parseArguments() {
    const args = process.argv.slice(2);
    
    args.forEach(arg => {
      switch (arg) {
        case '--skip-api':
          this.options.skipApi = true;
          break;
        case '--skip-database':
          this.options.skipDatabase = true;
          break;
        case '--skip-boundaries':
          this.options.skipBoundaries = true;
          break;
        case '--skip-environment':
          this.options.skipEnvironment = true;
          break;
        case '--sequential':
          this.options.parallel = false;
          break;
        case '--verbose':
          this.options.verbose = true;
          break;
        case '--no-report':
          this.options.generateReport = false;
          break;
        case '--help':
          this.printHelp();
          process.exit(0);
          break;
      }
    });
  }

  printHelp() {
    console.log(`
🚀 Master Pre-Deployment Validation Orchestrator

USAGE:
  node validate-deployment.js [options]

OPTIONS:
  --skip-api          Skip API health validation
  --skip-database     Skip database connectivity validation
  --skip-boundaries   Skip component boundary validation
  --skip-environment  Skip environment variable validation
  --sequential        Run validations sequentially instead of parallel
  --verbose           Enable verbose output
  --no-report         Skip generating deployment report
  --help              Show this help message

EXAMPLES:
  # Full validation (default)
  node validate-deployment.js

  # Skip database validation (useful for CI without DB access)
  node validate-deployment.js --skip-database

  # Run sequentially with verbose output
  node validate-deployment.js --sequential --verbose

  # Quick environment and boundary check only
  node validate-deployment.js --skip-api --skip-database
    `);
  }

  log(message, color = 'reset') {
    if (!this.isCI || this.options.verbose) {
      console.log(`${colors[color]}${message}${colors.reset}`);
    } else {
      console.log(message);
    }
  }

  error(message, context = '') {
    const errorMsg = context ? `${context}: ${message}` : message;
    this.errors.push(errorMsg);
    this.log(`❌ ERROR: ${errorMsg}`, 'red');
  }

  warning(message, context = '') {
    const warningMsg = context ? `${context}: ${message}` : message;
    this.warnings.push(warningMsg);
    this.log(`⚠️  WARNING: ${warningMsg}`, 'yellow');
  }

  success(message) {
    this.successes.push(message);
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'cyan');
  }

  // Run individual validator
  async runValidator(ValidatorClass, name) {
    try {
      this.log(`\n🔄 Running ${name} validation...`, 'blue');
      const validator = new ValidatorClass();
      const exitCode = await validator.validate();
      
      this.validationResults[name] = {
        success: exitCode === 0,
        exitCode,
        errors: validator.errors || [],
        warnings: validator.warnings || [],
        successes: validator.successes || []
      };

      if (exitCode === 0) {
        this.success(`${name} validation completed successfully`);
      } else {
        this.error(`${name} validation failed with exit code ${exitCode}`, name);
        this.exitCode = 1;
      }

      return exitCode;
    } catch (err) {
      this.error(`${name} validation threw an exception: ${err.message}`, name);
      this.validationResults[name] = {
        success: false,
        exitCode: 1,
        errors: [err.message],
        warnings: [],
        successes: []
      };
      this.exitCode = 1;
      return 1;
    }
  }

  // Run all validators in parallel
  async runValidatorsParallel() {
    const validators = [];

    if (!this.options.skipEnvironment) {
      validators.push({ class: EnvironmentValidator, name: 'Environment' });
    }

    if (!this.options.skipBoundaries) {
      validators.push({ class: ComponentBoundaryValidator, name: 'Component Boundaries' });
    }

    if (!this.options.skipApi) {
      validators.push({ class: APIHealthValidator, name: 'API Health' });
    }

    if (!this.options.skipDatabase) {
      validators.push({ class: DatabaseValidator, name: 'Database' });
    }

    if (validators.length === 0) {
      this.warning('No validators selected - all validations skipped');
      return;
    }

    this.info(`Running ${validators.length} validators in parallel...`);

    const promises = validators.map(({ class: ValidatorClass, name }) => 
      this.runValidator(ValidatorClass, name)
    );

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const validatorName = validators[index].name;
        this.error(`${validatorName} validation promise rejected: ${result.reason}`, validatorName);
        this.exitCode = 1;
      }
    });
  }

  // Run all validators sequentially
  async runValidatorsSequential() {
    const validators = [];

    if (!this.options.skipEnvironment) {
      validators.push({ class: EnvironmentValidator, name: 'Environment' });
    }

    if (!this.options.skipBoundaries) {
      validators.push({ class: ComponentBoundaryValidator, name: 'Component Boundaries' });
    }

    if (!this.options.skipApi) {
      validators.push({ class: APIHealthValidator, name: 'API Health' });
    }

    if (!this.options.skipDatabase) {
      validators.push({ class: DatabaseValidator, name: 'Database' });
    }

    if (validators.length === 0) {
      this.warning('No validators selected - all validations skipped');
      return;
    }

    this.info(`Running ${validators.length} validators sequentially...`);

    for (const { class: ValidatorClass, name } of validators) {
      await this.runValidator(ValidatorClass, name);
    }
  }

  // Run additional deployment checks
  async runAdditionalChecks() {
    this.log('\n🔧 Running Additional Deployment Checks:', 'bold');

    // Check Node.js version
    this.checkNodeVersion();

    // Check package dependencies
    this.checkDependencies();

    // Check build configuration
    this.checkBuildConfiguration();

    // Check for security vulnerabilities
    await this.runSecurityAudit();

    // Check disk space and memory (if applicable)
    this.checkSystemResources();

    // Verify deployment configuration files
    this.checkDeploymentFiles();
  }

  checkNodeVersion() {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.success(`Node.js version ${nodeVersion} is supported`);
      } else if (majorVersion >= 16) {
        this.warning(`Node.js version ${nodeVersion} is older but supported`);
      } else {
        this.error(`Node.js version ${nodeVersion} is not supported (minimum: v16)`, 'Node Version');
      }
    } catch (err) {
      this.warning(`Could not check Node.js version: ${err.message}`);
    }
  }

  checkDependencies() {
    try {
      // Check if package-lock.json exists
      if (fs.existsSync('package-lock.json')) {
        this.success('package-lock.json exists - dependencies will be installed consistently');
      } else if (fs.existsSync('yarn.lock')) {
        this.success('yarn.lock exists - dependencies will be installed consistently');
      } else {
        this.warning('No lock file found - consider using npm ci or yarn install --frozen-lockfile');
      }

      // Check for common problematic dependencies
      if (fs.existsSync('package.json')) {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

        // Check for known problematic packages
        const problematicPackages = ['fsevents', 'sharp'];
        problematicPackages.forEach(pkg => {
          if (allDeps[pkg]) {
            this.info(`Optional dependency detected: ${pkg} (platform-specific)`);
          }
        });
      }
    } catch (err) {
      this.warning(`Could not check dependencies: ${err.message}`);
    }
  }

  checkBuildConfiguration() {
    try {
      // Check Next.js config
      if (fs.existsSync('next.config.js')) {
        this.success('next.config.js found');
        
        // Basic validation of Next.js config
        const configContent = fs.readFileSync('next.config.js', 'utf8');
        if (configContent.includes('experimental')) {
          this.warning('next.config.js contains experimental features - verify compatibility');
        }
      }

      // Check TypeScript config
      if (fs.existsSync('tsconfig.json')) {
        this.success('tsconfig.json found');
      }

      // Check Tailwind config
      if (fs.existsSync('tailwind.config.js')) {
        this.success('tailwind.config.js found');
      }

      // Check for build output directory
      if (fs.existsSync('.next')) {
        this.info('.next directory exists - previous build artifacts present');
      }

    } catch (err) {
      this.warning(`Could not check build configuration: ${err.message}`);
    }
  }

  async runSecurityAudit() {
    try {
      this.info('Running security audit...');
      
      // Run npm audit
      const auditResult = execSync('npm audit --json', { 
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 30000 
      });

      const audit = JSON.parse(auditResult);
      
      if (audit.metadata) {
        const { vulnerabilities } = audit.metadata;
        const total = Object.values(vulnerabilities).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
          this.success('No security vulnerabilities found');
        } else {
          const critical = vulnerabilities.critical || 0;
          const high = vulnerabilities.high || 0;
          
          if (critical > 0) {
            this.error(`${critical} critical security vulnerabilities found`, 'Security');
          } else if (high > 0) {
            this.warning(`${high} high security vulnerabilities found`);
          } else {
            this.info(`${total} low/moderate security vulnerabilities found`);
          }
        }
      }
    } catch (err) {
      this.warning(`Could not run security audit: ${err.message}`);
    }
  }

  checkSystemResources() {
    try {
      // Check if we're in a constrained environment
      if (process.env.VERCEL === '1') {
        this.info('Deployment target: Vercel (serverless)');
      } else if (process.env.NETLIFY === 'true') {
        this.info('Deployment target: Netlify');
      } else if (process.env.GITHUB_ACTIONS === 'true') {
        this.info('Running in GitHub Actions');
      } else {
        this.info('Local or custom deployment environment');
      }

      // Basic memory check
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (memUsedMB > 512) {
        this.warning(`High memory usage detected: ${memUsedMB}MB`);
      } else {
        this.success(`Memory usage: ${memUsedMB}MB`);
      }

    } catch (err) {
      this.warning(`Could not check system resources: ${err.message}`);
    }
  }

  checkDeploymentFiles() {
    const deploymentFiles = [
      { file: 'vercel.json', platform: 'Vercel' },
      { file: 'netlify.toml', platform: 'Netlify' },
      { file: 'Dockerfile', platform: 'Docker' },
      { file: '.github/workflows', platform: 'GitHub Actions' }
    ];

    deploymentFiles.forEach(({ file, platform }) => {
      if (fs.existsSync(file)) {
        this.success(`${platform} deployment configuration found: ${file}`);
      }
    });

    // Check for environment variable files
    const envFiles = ['.env.example', '.env.local', '.env.production'];
    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.info(`Environment file found: ${file}`);
      }
    });
  }

  // Generate deployment report
  generateDeploymentReport() {
    if (!this.options.generateReport) return;

    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: this.isCI,
        nodeEnv: process.env.NODE_ENV || 'development'
      },
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalSuccesses: this.successes.length,
        deploymentReady: this.exitCode === 0
      },
      validationResults: this.validationResults,
      errors: this.errors,
      warnings: this.warnings,
      successes: this.successes
    };

    try {
      // Write report to file
      const reportPath = path.join(process.cwd(), 'deployment-validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.success(`Deployment report saved to: ${reportPath}`);

      // Also create a human-readable summary
      this.generateHumanReadableReport(report);

    } catch (err) {
      this.warning(`Could not generate deployment report: ${err.message}`);
    }
  }

  generateHumanReadableReport(report) {
    const summaryPath = path.join(process.cwd(), 'deployment-validation-summary.md');
    
    let markdown = `# Deployment Validation Report

**Generated:** ${report.timestamp}  
**Duration:** ${report.duration}  
**Status:** ${report.summary.deploymentReady ? '🟢 READY' : '🔴 BLOCKED'}  

## Summary

- ✅ **Successes:** ${report.summary.totalSuccesses}
- ⚠️ **Warnings:** ${report.summary.totalWarnings}  
- ❌ **Errors:** ${report.summary.totalErrors}

## Environment

- **Node.js:** ${report.environment.nodeVersion}
- **Platform:** ${report.environment.platform}
- **CI:** ${report.environment.ci ? 'Yes' : 'No'}
- **NODE_ENV:** ${report.environment.nodeEnv}

## Validation Results

`;

    Object.entries(report.validationResults).forEach(([name, result]) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      markdown += `### ${name} - ${status}

- **Errors:** ${result.errors.length}
- **Warnings:** ${result.warnings.length}
- **Successes:** ${result.successes.length}

`;
    });

    if (report.errors.length > 0) {
      markdown += `## 🚨 Errors (Deployment Blockers)

`;
      report.errors.forEach((error, index) => {
        markdown += `${index + 1}. ${error}\n`;
      });
      markdown += '\n';
    }

    if (report.warnings.length > 0) {
      markdown += `## ⚠️ Warnings

`;
      report.warnings.forEach((warning, index) => {
        markdown += `${index + 1}. ${warning}\n`;
      });
      markdown += '\n';
    }

    markdown += `## Next Steps

${report.summary.deploymentReady 
  ? '🎉 **Your application is ready for deployment!**' 
  : '🔧 **Fix the errors above before deploying.**'}

---
*Report generated by AI Readiness Pre-Deployment Validator*
`;

    try {
      fs.writeFileSync(summaryPath, markdown);
      this.success(`Human-readable report saved to: ${summaryPath}`);
    } catch (err) {
      this.warning(`Could not generate human-readable report: ${err.message}`);
    }
  }

  // Print comprehensive summary
  printSummary() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.log('\n' + '='.repeat(80), 'blue');
    this.log('📊 MASTER DEPLOYMENT VALIDATION SUMMARY', 'bold');
    this.log('='.repeat(80), 'blue');
    
    this.log(`⏱️  Total Duration: ${duration}s`, 'cyan');
    this.log(`🔄 Validators Run: ${Object.keys(this.validationResults).length}`, 'cyan');
    this.log(`✅ Total Successes: ${this.successes.length}`, 'green');
    this.log(`⚠️  Total Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`❌ Total Errors: ${this.errors.length}`, 'red');

    // Validation results breakdown
    this.log('\n📋 Validation Results:', 'bold');
    Object.entries(this.validationResults).forEach(([name, result]) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      this.log(`  ${name}: ${status} (E:${result.errors.length} W:${result.warnings.length} S:${result.successes.length})`, 
               result.success ? 'green' : 'red');
    });

    if (this.exitCode === 0) {
      this.log('\n🎉 DEPLOYMENT READY!', 'bold');
      this.log('All validations passed successfully. Your application is ready for deployment.', 'green');
      
      if (this.warnings.length > 0) {
        this.log('\n💡 Consider addressing the following warnings for optimal deployment:', 'yellow');
        this.warnings.slice(0, 5).forEach((warning, index) => {
          this.log(`${index + 1}. ${warning}`, 'yellow');
        });
        if (this.warnings.length > 5) {
          this.log(`... and ${this.warnings.length - 5} more warnings`, 'dim');
        }
      }
    } else {
      this.log('\n🚨 DEPLOYMENT BLOCKED!', 'bold');
      this.log('Fix the following critical errors before deploying:', 'red');
      
      this.errors.slice(0, 10).forEach((error, index) => {
        this.log(`${index + 1}. ${error}`, 'red');
      });
      
      if (this.errors.length > 10) {
        this.log(`... and ${this.errors.length - 10} more errors`, 'dim');
      }
    }

    this.log('\n' + '='.repeat(80), 'blue');
    
    if (this.options.generateReport) {
      this.log('📄 Detailed reports saved to deployment-validation-report.json and deployment-validation-summary.md', 'cyan');
    }
  }

  // Main validation method
  async validate() {
    this.log('\n🚀 MASTER PRE-DEPLOYMENT VALIDATION STARTING\n', 'bold');
    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`, 'cyan');
    this.log(`Platform: ${process.platform}`, 'cyan');
    this.log(`CI: ${this.isCI ? 'Yes' : 'No'}`, 'cyan');
    this.log(`Parallel: ${this.options.parallel ? 'Yes' : 'No'}`, 'cyan');

    try {
      // Run core validators
      if (this.options.parallel) {
        await this.runValidatorsParallel();
      } else {
        await this.runValidatorsSequential();
      }

      // Run additional checks
      await this.runAdditionalChecks();

      // Generate deployment report
      this.generateDeploymentReport();

      // Print comprehensive summary
      this.printSummary();

    } catch (err) {
      this.error(`Master validation failed: ${err.message}`, 'System');
      this.exitCode = 1;
    }

    return this.exitCode;
  }
}

// Run validation if called directly
if (require.main === module) {
  const options = {};
  
  // Parse command line options
  const args = process.argv.slice(2);
  if (args.includes('--verbose')) options.verbose = true;
  if (args.includes('--sequential')) options.parallel = false;
  if (args.includes('--no-report')) options.generateReport = false;

  const validator = new MasterDeploymentValidator(options);
  validator.validate().then(exitCode => {
    // Use coordination hooks
    const { execSync } = require('child_process');
    try {
      execSync('npx claude-flow@alpha hooks notify --message "Pre-deployment validation completed" --telemetry true', { stdio: 'pipe' });
      execSync('npx claude-flow@alpha hooks post-task --task-id "pre-deploy-validation" --analyze-performance true', { stdio: 'pipe' });
    } catch (hookErr) {
      // Hooks are optional - continue with exit
    }
    
    process.exit(exitCode);
  }).catch(err => {
    console.error('Master validation failed:', err);
    process.exit(1);
  });
}

module.exports = MasterDeploymentValidator;