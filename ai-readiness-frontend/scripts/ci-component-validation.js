#!/usr/bin/env node

/**
 * CI Component Validation Script
 * Runs component validation in CI/CD environments with proper exit codes and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

class CIComponentValidator {
  constructor() {
    this.isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    this.resultsFile = process.env.VALIDATION_RESULTS_FILE || 'component-validation-results.json';
    this.reportFormat = process.env.VALIDATION_REPORT_FORMAT || 'console'; // console, json, junit
  }

  /**
   * Run component validation with CI-specific settings
   */
  async runValidation() {
    console.log(`${colors.bold}${colors.blue}🚀 Running Component Validation in CI/CD${colors.reset}\n`);
    
    try {
      // Set environment to validate all files in CI
      process.env.VALIDATE_ALL_FILES = 'true';
      
      // Import and run the validator
      const ComponentValidator = require('../.claude/hooks/validate-components.js');
      const validator = new ComponentValidator();
      
      const startTime = Date.now();
      const success = validator.run();
      const duration = Date.now() - startTime;
      
      // Create results object
      const results = {
        success,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        errors: validator.errors || [],
        warnings: validator.warnings || [],
        summary: {
          filesChecked: validator.errors?.length + validator.warnings?.length || 0,
          errorCount: validator.errors?.length || 0,
          warningCount: validator.warnings?.length || 0
        }
      };
      
      // Save results if requested
      if (this.resultsFile) {
        await this.saveResults(results);
      }
      
      // Generate reports based on format
      await this.generateReport(results);
      
      // Exit with appropriate code
      if (!success) {
        console.log(`\n${colors.red}${colors.bold}❌ Component validation failed in CI/CD${colors.reset}`);
        process.exit(1);
      } else {
        console.log(`\n${colors.green}${colors.bold}✅ Component validation passed in CI/CD${colors.reset}`);
        process.exit(0);
      }
      
    } catch (error) {
      console.error(`${colors.red}${colors.bold}💥 Component validation crashed:${colors.reset}`);
      console.error(error.message);
      
      if (this.isCI) {
        // In CI, treat crashes as failures
        process.exit(1);
      } else {
        // In local development, just warn
        console.log(`${colors.yellow}⚠️  Continuing despite validation crash...${colors.reset}`);
        process.exit(0);
      }
    }
  }
  
  /**
   * Save validation results to file
   */
  async saveResults(results) {
    try {
      fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
      console.log(`${colors.cyan}📄 Results saved to: ${this.resultsFile}${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Failed to save results: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Generate reports in different formats
   */
  async generateReport(results) {
    switch (this.reportFormat) {
      case 'json':
        await this.generateJSONReport(results);
        break;
      case 'junit':
        await this.generateJUnitReport(results);
        break;
      case 'github':
        await this.generateGitHubReport(results);
        break;
      default:
        this.generateConsoleReport(results);
    }
  }
  
  /**
   * Generate console report (default)
   */
  generateConsoleReport(results) {
    console.log(`\n${colors.bold}${colors.cyan}📊 CI Validation Summary${colors.reset}`);
    console.log(`${colors.cyan}├── Duration: ${results.duration}${colors.reset}`);
    console.log(`${colors.cyan}├── Files Checked: ${results.summary.filesChecked}${colors.reset}`);
    console.log(`${colors.cyan}├── Errors: ${colors.red}${results.summary.errorCount}${colors.cyan}${colors.reset}`);
    console.log(`${colors.cyan}└── Warnings: ${colors.yellow}${results.summary.warningCount}${colors.cyan}${colors.reset}`);
    
    if (results.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}🚨 Critical Issues (Must Fix):${colors.reset}`);
      results.errors.forEach((error, index) => {
        console.log(`${colors.red}  ${index + 1}. ${error.file}${colors.reset}`);
        console.log(`${colors.red}     ${error.message}${colors.reset}`);
        console.log(`${colors.green}     Fix: ${error.fix}${colors.reset}\n`);
      });
    }
    
    if (results.warnings.length > 0) {
      console.log(`${colors.yellow}${colors.bold}⚠️  Optimization Suggestions:${colors.reset}`);
      results.warnings.forEach((warning, index) => {
        console.log(`${colors.yellow}  ${index + 1}. ${warning.file}${colors.reset}`);
        console.log(`${colors.yellow}     ${warning.message}${colors.reset}`);
        console.log(`${colors.blue}     Suggestion: ${warning.fix}${colors.reset}\n`);
      });
    }
  }
  
  /**
   * Generate JSON report for programmatic consumption
   */
  async generateJSONReport(results) {
    const reportFile = 'component-validation-report.json';
    try {
      fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
      console.log(`${colors.cyan}📄 JSON report saved to: ${reportFile}${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Failed to save JSON report: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Generate JUnit XML report for CI systems
   */
  async generateJUnitReport(results) {
    const reportFile = 'component-validation-junit.xml';
    
    const testSuites = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Component Validation" tests="${results.summary.filesChecked}" failures="${results.summary.errorCount}" warnings="${results.summary.warningCount}" time="${parseFloat(results.duration) / 1000}">
  <testsuite name="React Component Boundaries" tests="${results.summary.filesChecked}" failures="${results.summary.errorCount}" time="${parseFloat(results.duration) / 1000}">
    ${results.errors.map(error => `
    <testcase name="${error.file}" classname="ComponentValidation">
      <failure message="${error.type}: ${error.message}" type="${error.type}">
        ${error.message}
        Fix: ${error.fix}
      </failure>
    </testcase>`).join('')}
    ${results.warnings.map(warning => `
    <testcase name="${warning.file}" classname="ComponentValidation">
      <system-out>WARNING: ${warning.message}. Suggestion: ${warning.fix}</system-out>
    </testcase>`).join('')}
  </testsuite>
</testsuites>`;
    
    try {
      fs.writeFileSync(reportFile, testSuites);
      console.log(`${colors.cyan}📄 JUnit report saved to: ${reportFile}${colors.reset}`);
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Failed to save JUnit report: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Generate GitHub Actions compatible report
   */
  async generateGitHubReport(results) {
    if (!process.env.GITHUB_ACTIONS) {
      return;
    }
    
    // GitHub Actions annotations
    results.errors.forEach(error => {
      console.log(`::error file=${error.file}::${error.message}. Fix: ${error.fix}`);
    });
    
    results.warnings.forEach(warning => {
      console.log(`::warning file=${warning.file}::${warning.message}. Suggestion: ${warning.fix}`);
    });
    
    // GitHub Actions summary
    const summary = `
## 🔍 Component Validation Results

- **Files Checked:** ${results.summary.filesChecked}
- **Errors:** ${results.summary.errorCount}
- **Warnings:** ${results.summary.warningCount}
- **Duration:** ${results.duration}

${results.summary.errorCount === 0 ? '✅ All component boundaries are valid!' : '❌ Component validation failed - see errors above'}
`;
    
    try {
      if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
      }
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Failed to write GitHub summary: ${error.message}${colors.reset}`);
    }
  }
  
  /**
   * Check if component validation should run in this CI context
   */
  shouldRun() {
    // Always run in CI unless explicitly disabled
    if (process.env.SKIP_COMPONENT_VALIDATION === 'true') {
      console.log(`${colors.yellow}⏭️  Component validation skipped (SKIP_COMPONENT_VALIDATION=true)${colors.reset}`);
      return false;
    }
    
    // Check if this is a documentation-only change
    if (this.isDocumentationOnlyChange()) {
      console.log(`${colors.yellow}⏭️  Component validation skipped (documentation-only change)${colors.reset}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if changes are documentation-only
   */
  isDocumentationOnlyChange() {
    if (!this.isCI || !process.env.GITHUB_ACTIONS) {
      return false;
    }
    
    try {
      // Get changed files from GitHub Actions context
      const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' })
        .split('\n')
        .filter(file => file.trim());
      
      // Check if all changed files are documentation
      const nonDocFiles = changedFiles.filter(file => 
        !file.match(/\.(md|txt|rst)$/i) && 
        !file.startsWith('docs/') && 
        !file.includes('README')
      );
      
      return nonDocFiles.length === 0 && changedFiles.length > 0;
    } catch (error) {
      return false;
    }
  }
}

// Run the CI validator
if (require.main === module) {
  const validator = new CIComponentValidator();
  
  if (validator.shouldRun()) {
    validator.runValidation();
  } else {
    process.exit(0);
  }
}

module.exports = CIComponentValidator;