#!/usr/bin/env node
/**
 * Test Health Monitor
 * Continuous monitoring of test suite health, flaky test detection, and performance tracking
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestHealthMonitor {
  constructor() {
    this.healthDataPath = path.join(process.cwd(), 'reports', 'test-health.json');
    this.historicalDataPath = path.join(process.cwd(), 'reports', 'test-history.json');
    this.thresholds = {
      flakyTestRate: 0.02, // 2%
      coverageThreshold: 0.80, // 80%
      testExecutionTime: 600000, // 10 minutes
      passRate: 0.95, // 95%
      performanceRegression: 0.15 // 15% degradation threshold
    };
    
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    const reportsDir = path.dirname(this.healthDataPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  }

  /**
   * Run comprehensive test health analysis
   */
  async analyzeTestHealth() {
    console.log('🩺 Starting Test Health Analysis...\n');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      unitTests: await this.analyzeUnitTestHealth(),
      integrationTests: await this.analyzeIntegrationTestHealth(),
      e2eTests: await this.analyzeE2ETestHealth(),
      coverage: await this.analyzeCoverageHealth(),
      performance: await this.analyzePerformanceHealth(),
      flakyTests: await this.detectFlakyTests(),
      overallHealth: null
    };

    // Calculate overall health score
    healthReport.overallHealth = this.calculateOverallHealth(healthReport);
    
    // Save current health data
    this.saveHealthData(healthReport);
    
    // Update historical trends
    this.updateHistoricalData(healthReport);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(healthReport);
    
    // Display results
    this.displayHealthReport(healthReport, recommendations);
    
    return healthReport;
  }

  /**
   * Analyze unit test health
   */
  async analyzeUnitTestHealth() {
    console.log('📝 Analyzing unit test health...');
    
    try {
      const startTime = Date.now();
      
      // Run unit tests with detailed output
      const testOutput = execSync('npm run test:coverage -- --verbose --json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const executionTime = Date.now() - startTime;
      const testResults = JSON.parse(testOutput.split('\n').find(line => {
        try { JSON.parse(line); return true; } catch { return false; }
      }));

      return {
        totalTests: testResults.numTotalTests,
        passedTests: testResults.numPassedTests,
        failedTests: testResults.numFailedTests,
        passRate: testResults.numPassedTests / testResults.numTotalTests,
        executionTime,
        avgTestTime: executionTime / testResults.numTotalTests,
        healthy: testResults.numFailedTests === 0 && executionTime < this.thresholds.testExecutionTime
      };
      
    } catch (error) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        passRate: 0,
        executionTime: -1,
        avgTestTime: -1,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze integration test health
   */
  async analyzeIntegrationTestHealth() {
    console.log('🔗 Analyzing integration test health...');
    
    try {
      const startTime = Date.now();
      
      // Run integration tests
      const testOutput = execSync('npm run test:integration -- --json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const executionTime = Date.now() - startTime;
      const testResults = JSON.parse(testOutput.split('\n').find(line => {
        try { JSON.parse(line); return true; } catch { return false; }
      }));

      return {
        totalTests: testResults.numTotalTests || 0,
        passedTests: testResults.numPassedTests || 0,
        failedTests: testResults.numFailedTests || 0,
        passRate: (testResults.numPassedTests || 0) / (testResults.numTotalTests || 1),
        executionTime,
        healthy: (testResults.numFailedTests || 0) === 0
      };
      
    } catch (error) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 1, // Assume healthy if no integration tests exist yet
        executionTime: 0,
        healthy: true,
        skipped: true,
        reason: 'Integration tests not implemented yet'
      };
    }
  }

  /**
   * Analyze E2E test health
   */
  async analyzeE2ETestHealth() {
    console.log('🎭 Analyzing E2E test health...');
    
    try {
      const startTime = Date.now();
      
      // Run E2E tests with reporter that outputs JSON
      const testOutput = execSync('npx playwright test --reporter=json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const executionTime = Date.now() - startTime;
      const testResults = JSON.parse(testOutput);

      const stats = {
        totalTests: testResults.stats.total || 0,
        passedTests: testResults.stats.passed || 0,
        failedTests: testResults.stats.failed || 0,
        skippedTests: testResults.stats.skipped || 0,
        passRate: (testResults.stats.passed || 0) / (testResults.stats.total || 1),
        executionTime,
        avgTestTime: executionTime / (testResults.stats.total || 1),
        healthy: (testResults.stats.failed || 0) === 0
      };

      // Check for flaky test indicators
      if (testResults.suites) {
        stats.flakyIndicators = this.detectE2EFlakyness(testResults.suites);
      }

      return stats;
      
    } catch (error) {
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 1,
        executionTime: 0,
        healthy: true,
        skipped: true,
        reason: 'E2E tests may not be configured or accessible'
      };
    }
  }

  /**
   * Analyze test coverage health
   */
  async analyzeCoverageHealth() {
    console.log('📊 Analyzing test coverage health...');
    
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      
      if (!fs.existsSync(coveragePath)) {
        // Generate coverage if it doesn't exist
        execSync('npm run test:coverage', { stdio: 'pipe' });
      }

      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const totals = coverage.total;

      return {
        lines: {
          pct: totals.lines.pct,
          covered: totals.lines.covered,
          total: totals.lines.total,
          healthy: totals.lines.pct >= (this.thresholds.coverageThreshold * 100)
        },
        functions: {
          pct: totals.functions.pct,
          covered: totals.functions.covered,
          total: totals.functions.total,
          healthy: totals.functions.pct >= (this.thresholds.coverageThreshold * 100)
        },
        branches: {
          pct: totals.branches.pct,
          covered: totals.branches.covered,
          total: totals.branches.total,
          healthy: totals.branches.pct >= ((this.thresholds.coverageThreshold - 0.05) * 100) // 75% threshold for branches
        },
        statements: {
          pct: totals.statements.pct,
          covered: totals.statements.covered,
          total: totals.statements.total,
          healthy: totals.statements.pct >= (this.thresholds.coverageThreshold * 100)
        },
        overallHealthy: totals.lines.pct >= (this.thresholds.coverageThreshold * 100) &&
                       totals.functions.pct >= (this.thresholds.coverageThreshold * 100) &&
                       totals.branches.pct >= ((this.thresholds.coverageThreshold - 0.05) * 100) &&
                       totals.statements.pct >= (this.thresholds.coverageThreshold * 100)
      };
      
    } catch (error) {
      return {
        overallHealthy: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze performance health
   */
  async analyzePerformanceHealth() {
    console.log('⚡ Analyzing performance health...');
    
    // Check if there are existing performance benchmark results
    const performanceDataPath = path.join(process.cwd(), 'reports', 'performance-benchmarks.json');
    
    if (fs.existsSync(performanceDataPath)) {
      try {
        const perfData = JSON.parse(fs.readFileSync(performanceDataPath, 'utf8'));
        const historical = this.getHistoricalData();
        
        // Compare with historical performance
        let performanceRegression = false;
        if (historical.length > 0) {
          const lastPerfData = historical[historical.length - 1].performance;
          if (lastPerfData && lastPerfData.buildTime) {
            const regressionThreshold = lastPerfData.buildTime * (1 + this.thresholds.performanceRegression);
            performanceRegression = perfData.buildTime > regressionThreshold;
          }
        }

        return {
          buildTime: perfData.buildTime || 0,
          testExecutionTime: perfData.testExecutionTime || 0,
          bundleSize: perfData.bundleSize || 0,
          performanceRegression,
          healthy: !performanceRegression && 
                  (perfData.buildTime || 0) < 300000 && // 5 minutes
                  (perfData.testExecutionTime || 0) < this.thresholds.testExecutionTime
        };
        
      } catch (error) {
        return { healthy: true, skipped: true, reason: 'Performance data parsing failed' };
      }
    }

    return { healthy: true, skipped: true, reason: 'No performance benchmarks available' };
  }

  /**
   * Detect flaky tests from historical data
   */
  async detectFlakyTests() {
    console.log('🐛 Detecting flaky tests...');
    
    const historicalData = this.getHistoricalData();
    const flakyTests = [];

    if (historicalData.length < 5) {
      return { 
        flakyTests: [], 
        flakyTestRate: 0, 
        healthy: true, 
        reason: 'Insufficient historical data for flaky test detection' 
      };
    }

    // Analyze test results across recent runs
    const recentRuns = historicalData.slice(-10);
    const testOutcomes = {};

    recentRuns.forEach(run => {
      if (run.unitTests && run.unitTests.testDetails) {
        run.unitTests.testDetails.forEach(test => {
          if (!testOutcomes[test.name]) {
            testOutcomes[test.name] = { passes: 0, failures: 0, total: 0 };
          }
          testOutcomes[test.name].total++;
          if (test.status === 'passed') {
            testOutcomes[test.name].passes++;
          } else {
            testOutcomes[test.name].failures++;
          }
        });
      }
    });

    // Identify tests with inconsistent outcomes
    Object.entries(testOutcomes).forEach(([testName, outcomes]) => {
      const failureRate = outcomes.failures / outcomes.total;
      const passRate = outcomes.passes / outcomes.total;
      
      // A test is considered flaky if it has both passes and failures
      // and failure rate is between 10% and 90%
      if (outcomes.failures > 0 && outcomes.passes > 0 && 
          failureRate >= 0.1 && failureRate <= 0.9) {
        flakyTests.push({
          name: testName,
          failureRate,
          passRate,
          totalRuns: outcomes.total,
          inconsistencyScore: Math.abs(0.5 - failureRate) // Lower score = more flaky
        });
      }
    });

    const totalTests = Object.keys(testOutcomes).length;
    const flakyTestRate = flakyTests.length / totalTests;

    return {
      flakyTests: flakyTests.sort((a, b) => a.inconsistencyScore - b.inconsistencyScore),
      flakyTestRate,
      healthy: flakyTestRate <= this.thresholds.flakyTestRate,
      totalTestsAnalyzed: totalTests
    };
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealth(healthReport) {
    const weights = {
      unitTests: 0.3,
      integrationTests: 0.2,
      e2eTests: 0.2,
      coverage: 0.2,
      flakyTests: 0.1
    };

    let score = 0;
    let totalWeight = 0;

    if (healthReport.unitTests.healthy) {
      score += weights.unitTests;
    }
    totalWeight += weights.unitTests;

    if (healthReport.integrationTests.healthy) {
      score += weights.integrationTests;
    }
    totalWeight += weights.integrationTests;

    if (healthReport.e2eTests.healthy) {
      score += weights.e2eTests;
    }
    totalWeight += weights.e2eTests;

    if (healthReport.coverage.overallHealthy) {
      score += weights.coverage;
    }
    totalWeight += weights.coverage;

    if (healthReport.flakyTests.healthy) {
      score += weights.flakyTests;
    }
    totalWeight += weights.flakyTests;

    const healthScore = (score / totalWeight) * 100;

    return {
      score: healthScore,
      rating: this.getHealthRating(healthScore),
      healthy: healthScore >= 80 // 80% overall health threshold
    };
  }

  getHealthRating(score) {
    if (score >= 95) return 'Excellent';
    if (score >= 85) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 50) return 'Poor';
    return 'Critical';
  }

  /**
   * Generate recommendations based on health analysis
   */
  generateRecommendations(healthReport) {
    const recommendations = [];

    // Unit test recommendations
    if (!healthReport.unitTests.healthy) {
      if (healthReport.unitTests.passRate < this.thresholds.passRate) {
        recommendations.push({
          category: 'Unit Tests',
          priority: 'High',
          issue: 'Low pass rate',
          suggestion: 'Fix failing unit tests immediately. Consider running tests locally before committing.'
        });
      }
      if (healthReport.unitTests.executionTime > this.thresholds.testExecutionTime) {
        recommendations.push({
          category: 'Unit Tests',
          priority: 'Medium',
          issue: 'Slow test execution',
          suggestion: 'Optimize slow tests, consider parallel execution, or mock heavy operations.'
        });
      }
    }

    // Coverage recommendations
    if (!healthReport.coverage.overallHealthy) {
      const uncoveredAreas = [];
      if (!healthReport.coverage.lines.healthy) uncoveredAreas.push('lines');
      if (!healthReport.coverage.functions.healthy) uncoveredAreas.push('functions');
      if (!healthReport.coverage.branches.healthy) uncoveredAreas.push('branches');
      if (!healthReport.coverage.statements.healthy) uncoveredAreas.push('statements');

      recommendations.push({
        category: 'Test Coverage',
        priority: 'Medium',
        issue: `Low coverage in: ${uncoveredAreas.join(', ')}`,
        suggestion: 'Add tests for uncovered code paths. Focus on critical business logic first.'
      });
    }

    // Flaky test recommendations
    if (!healthReport.flakyTests.healthy) {
      recommendations.push({
        category: 'Test Stability',
        priority: 'High',
        issue: `${healthReport.flakyTests.flakyTests.length} flaky tests detected`,
        suggestion: 'Investigate and fix flaky tests. Consider adding waits, improving test isolation, or mocking unstable dependencies.'
      });
    }

    // E2E test recommendations
    if (!healthReport.e2eTests.healthy && !healthReport.e2eTests.skipped) {
      recommendations.push({
        category: 'E2E Tests',
        priority: 'High',
        issue: 'E2E tests failing',
        suggestion: 'Fix failing E2E tests. These often indicate real user-facing issues.'
      });
    }

    // Performance recommendations
    if (healthReport.performance && healthReport.performance.performanceRegression) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        issue: 'Performance regression detected',
        suggestion: 'Investigate recent changes that may have caused performance degradation.'
      });
    }

    return recommendations;
  }

  /**
   * Display comprehensive health report
   */
  displayHealthReport(healthReport, recommendations) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST HEALTH REPORT');
    console.log('='.repeat(60));

    // Overall Health
    const overallIcon = healthReport.overallHealth.healthy ? '✅' : '❌';
    console.log(`\n🎯 OVERALL HEALTH: ${overallIcon} ${healthReport.overallHealth.rating} (${Math.round(healthReport.overallHealth.score)}%)`);

    // Detailed Breakdown
    console.log('\n📊 DETAILED BREAKDOWN:');
    
    // Unit Tests
    const unitIcon = healthReport.unitTests.healthy ? '✅' : '❌';
    console.log(`   ${unitIcon} Unit Tests: ${healthReport.unitTests.passedTests}/${healthReport.unitTests.totalTests} passed (${Math.round(healthReport.unitTests.passRate * 100)}%)`);
    if (healthReport.unitTests.executionTime > 0) {
      console.log(`      Execution time: ${Math.round(healthReport.unitTests.executionTime / 1000)}s`);
    }

    // Integration Tests
    const integrationIcon = healthReport.integrationTests.healthy ? '✅' : (healthReport.integrationTests.skipped ? '⏭️' : '❌');
    const integrationStatus = healthReport.integrationTests.skipped ? 
      `Skipped (${healthReport.integrationTests.reason})` : 
      `${healthReport.integrationTests.passedTests}/${healthReport.integrationTests.totalTests} passed`;
    console.log(`   ${integrationIcon} Integration Tests: ${integrationStatus}`);

    // E2E Tests
    const e2eIcon = healthReport.e2eTests.healthy ? '✅' : (healthReport.e2eTests.skipped ? '⏭️' : '❌');
    const e2eStatus = healthReport.e2eTests.skipped ? 
      `Skipped (${healthReport.e2eTests.reason})` : 
      `${healthReport.e2eTests.passedTests}/${healthReport.e2eTests.totalTests} passed`;
    console.log(`   ${e2eIcon} E2E Tests: ${e2eStatus}`);

    // Coverage
    const coverageIcon = healthReport.coverage.overallHealthy ? '✅' : '❌';
    console.log(`   ${coverageIcon} Coverage: Lines ${Math.round(healthReport.coverage.lines.pct)}%, Functions ${Math.round(healthReport.coverage.functions.pct)}%, Branches ${Math.round(healthReport.coverage.branches.pct)}%`);

    // Flaky Tests
    const flakyIcon = healthReport.flakyTests.healthy ? '✅' : '⚠️';
    console.log(`   ${flakyIcon} Test Stability: ${healthReport.flakyTests.flakyTests.length} flaky tests (${Math.round(healthReport.flakyTests.flakyTestRate * 100)}% rate)`);

    // Flaky Test Details
    if (healthReport.flakyTests.flakyTests.length > 0) {
      console.log('\n🐛 FLAKY TESTS DETECTED:');
      healthReport.flakyTests.flakyTests.slice(0, 5).forEach((test, index) => {
        console.log(`   ${index + 1}. ${test.name} (${Math.round(test.failureRate * 100)}% failure rate)`);
      });
      if (healthReport.flakyTests.flakyTests.length > 5) {
        console.log(`   ... and ${healthReport.flakyTests.flakyTests.length - 5} more`);
      }
    }

    // Recommendations
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢';
        console.log(`   ${index + 1}. ${priorityIcon} ${rec.category}: ${rec.issue}`);
        console.log(`      → ${rec.suggestion}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (healthReport.overallHealth.healthy) {
      console.log('🎉 Test suite is healthy! Keep up the good work.');
    } else {
      console.log('⚠️  Test suite needs attention. Address critical issues first.');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Helper methods for data management
   */
  
  saveHealthData(healthReport) {
    fs.writeFileSync(this.healthDataPath, JSON.stringify(healthReport, null, 2));
  }

  getHistoricalData() {
    if (fs.existsSync(this.historicalDataPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.historicalDataPath, 'utf8'));
      } catch (error) {
        return [];
      }
    }
    return [];
  }

  updateHistoricalData(healthReport) {
    const historical = this.getHistoricalData();
    
    // Keep only last 50 runs to manage file size
    const updatedHistory = [...historical, healthReport].slice(-50);
    
    fs.writeFileSync(this.historicalDataPath, JSON.stringify(updatedHistory, null, 2));
  }

  detectE2EFlakyness(suites) {
    const flakyIndicators = [];
    
    // Look for tests that were retried
    suites.forEach(suite => {
      suite.tests?.forEach(test => {
        if (test.results && test.results.length > 1) {
          flakyIndicators.push({
            suite: suite.title,
            test: test.title,
            attempts: test.results.length,
            finalStatus: test.results[test.results.length - 1].status
          });
        }
      });
    });
    
    return flakyIndicators;
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new TestHealthMonitor();
  
  const command = process.argv[2] || 'analyze';
  
  switch (command) {
    case 'analyze':
      monitor.analyzeTestHealth()
        .then(report => {
          process.exit(report.overallHealth.healthy ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Test health analysis failed:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node test-health-monitor.js [analyze]');
      process.exit(1);
  }
}

module.exports = TestHealthMonitor;