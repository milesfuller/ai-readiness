#!/usr/bin/env node

/**
 * Comprehensive Test Runner for AI Readiness Assessment
 * Provides parallel execution, coverage reporting, and CI/CD optimization
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      parallel: options.parallel !== false,
      coverage: options.coverage !== false,
      watch: options.watch || false,
      ci: options.ci || false,
      verbose: options.verbose || false,
      bail: options.bail || false,
      maxWorkers: options.maxWorkers || Math.max(1, os.cpus().length - 1),
      testTimeout: options.testTimeout || 30000,
      ...options
    };
    
    this.startTime = Date.now();
    this.results = {
      unit: null,
      integration: null,
      security: null,
      performance: null
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '💡',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || '📝';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkTestEnvironment() {
    this.log('Checking test environment...', 'info');
    
    // Check Jest setup
    const jestSetupPath = path.join(process.cwd(), 'jest.setup.js');
    if (!fs.existsSync(jestSetupPath)) {
      this.log('Jest setup file not found', 'warning');
    } else {
      this.log('Jest setup file found', 'success');
    }
    
    // Check for test files
    const testDirs = ['__tests__', 'test', 'tests'];
    let testFilesFound = false;
    
    for (const dir of testDirs) {
      const testDirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(testDirPath)) {
        const testFiles = this.findTestFiles(testDirPath);
        if (testFiles.length > 0) {
          this.log(`Found ${testFiles.length} test files in ${dir}/`, 'success');
          testFilesFound = true;
        }
      }
    }
    
    if (!testFilesFound) {
      this.log('No test files found!', 'error');
      process.exit(1);
    }
    
    // Check coverage directory
    const coverageDir = path.join(process.cwd(), 'coverage');
    if (fs.existsSync(coverageDir)) {
      this.log('Previous coverage data found, cleaning...', 'info');
      execSync(`rm -rf ${coverageDir}`, { stdio: 'pipe' });
    }
  }

  findTestFiles(directory, files = []) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.findTestFiles(fullPath, files);
      } else if (item.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  buildJestCommand(testType = 'all', additionalArgs = []) {
    const baseCommand = ['npx', 'jest', '--config', './jest.config.js'];
    
    // Test pattern based on type
    const testPatterns = {
      unit: ['--testPathPattern=__tests__/components|__tests__/lib/(?!security)'],
      integration: ['--testPathPattern=__tests__/api'],
      security: ['--testPathPattern=__tests__/lib/security'],
      performance: ['--testPathPattern=performance'],
      all: []
    };
    
    if (testPatterns[testType]) {
      baseCommand.push(...testPatterns[testType]);
    }
    
    // Core configuration
    if (this.options.ci) {
      baseCommand.push('--ci', '--coverage', '--watchAll=false');
    } else {
      if (this.options.coverage) {
        baseCommand.push('--coverage');
      }
      if (this.options.watch) {
        baseCommand.push('--watch');
      } else {
        baseCommand.push('--watchAll=false');
      }
    }
    
    // Performance options
    if (this.options.parallel) {
      baseCommand.push(`--maxWorkers=${this.options.maxWorkers}`);
    } else {
      baseCommand.push('--runInBand');
    }
    
    // Additional options
    if (this.options.verbose) {
      baseCommand.push('--verbose');
    }
    
    if (this.options.bail) {
      baseCommand.push('--bail');
    }
    
    baseCommand.push(`--testTimeout=${this.options.testTimeout}`);
    
    // Add any additional arguments
    baseCommand.push(...additionalArgs);
    
    return baseCommand;
  }

  async runTestSuite(testType, name) {
    this.log(`Running ${name} tests...`, 'info');
    
    const command = this.buildJestCommand(testType);
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const testProcess = spawn(command[0], command.slice(1), {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      if (!this.options.verbose) {
        testProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        testProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const result = {
          name,
          duration,
          exitCode: code,
          success: code === 0,
          stdout: stdout,
          stderr: stderr
        };
        
        if (code === 0) {
          this.log(`${name} tests completed successfully (${duration}ms)`, 'success');
        } else {
          this.log(`${name} tests failed with exit code ${code} (${duration}ms)`, 'error');
          if (!this.options.verbose && stderr) {
            console.log('STDERR:', stderr.substring(0, 1000));
          }
        }
        
        resolve(result);
      });
      
      testProcess.on('error', (error) => {
        this.log(`Failed to start ${name} tests: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async runParallelTests() {
    this.log('Running tests in parallel...', 'info');
    
    const testSuites = [
      { type: 'unit', name: 'Unit' },
      { type: 'integration', name: 'Integration' },
      { type: 'security', name: 'Security' }
    ];
    
    const promises = testSuites.map(suite => 
      this.runTestSuite(suite.type, suite.name)
        .then(result => {
          this.results[suite.type] = result;
          return result;
        })
        .catch(error => {
          this.results[suite.type] = { 
            name: suite.name, 
            success: false, 
            error: error.message 
          };
          return this.results[suite.type];
        })
    );
    
    return Promise.all(promises);
  }

  async runSequentialTests() {
    this.log('Running tests sequentially...', 'info');
    
    const testSuites = [
      { type: 'unit', name: 'Unit' },
      { type: 'integration', name: 'Integration' },
      { type: 'security', name: 'Security' }
    ];
    
    for (const suite of testSuites) {
      try {
        const result = await this.runTestSuite(suite.type, suite.name);
        this.results[suite.type] = result;
        
        if (!result.success && this.options.bail) {
          this.log('Bailing out due to test failure', 'error');
          break;
        }
      } catch (error) {
        this.results[suite.type] = { 
          name: suite.name, 
          success: false, 
          error: error.message 
        };
        
        if (this.options.bail) {
          this.log('Bailing out due to test error', 'error');
          break;
        }
      }
    }
  }

  generateCoverageReport() {
    this.log('Generating coverage report...', 'info');
    
    const coverageDir = path.join(process.cwd(), 'coverage');
    const lcovPath = path.join(coverageDir, 'lcov.info');
    const htmlReportPath = path.join(coverageDir, 'lcov-report', 'index.html');
    
    if (fs.existsSync(lcovPath)) {
      this.log('Coverage data found', 'success');
      
      if (fs.existsSync(htmlReportPath)) {
        this.log(`HTML coverage report: file://${htmlReportPath}`, 'success');
      }
      
      // Parse coverage summary
      const coverageJsonPath = path.join(coverageDir, 'coverage-final.json');
      if (fs.existsSync(coverageJsonPath)) {
        try {
          const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
          const files = Object.keys(coverageData);
          
          let totalStatements = 0;
          let coveredStatements = 0;
          let totalFunctions = 0;
          let coveredFunctions = 0;
          let totalBranches = 0;
          let coveredBranches = 0;
          let totalLines = 0;
          let coveredLines = 0;
          
          files.forEach(file => {
            const data = coverageData[file];
            if (data.s) {
              totalStatements += Object.keys(data.s).length;
              coveredStatements += Object.values(data.s).filter(count => count > 0).length;
            }
            if (data.f) {
              totalFunctions += Object.keys(data.f).length;
              coveredFunctions += Object.values(data.f).filter(count => count > 0).length;
            }
            if (data.b) {
              Object.values(data.b).forEach(branches => {
                totalBranches += branches.length;
                coveredBranches += branches.filter(count => count > 0).length;
              });
            }
            if (data.statementMap) {
              totalLines += Object.keys(data.statementMap).length;
              coveredLines += Object.keys(data.statementMap).filter(key => data.s[key] > 0).length;
            }
          });
          
          const coverage = {
            statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
            functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
            branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
            lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0
          };
          
          this.log(`Coverage Summary:`, 'info');
          this.log(`  Statements: ${coverage.statements}% (${coveredStatements}/${totalStatements})`, 'info');
          this.log(`  Functions: ${coverage.functions}% (${coveredFunctions}/${totalFunctions})`, 'info');
          this.log(`  Branches: ${coverage.branches}% (${coveredBranches}/${totalBranches})`, 'info');
          this.log(`  Lines: ${coverage.lines}% (${coveredLines}/${totalLines})`, 'info');
          
          return coverage;
        } catch (error) {
          this.log(`Failed to parse coverage data: ${error.message}`, 'warning');
        }
      }
    } else {
      this.log('No coverage data found', 'warning');
    }
    
    return null;
  }

  generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST EXECUTION REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🔧 Configuration: ${this.options.parallel ? 'Parallel' : 'Sequential'} execution`);
    console.log(`👥 Workers: ${this.options.maxWorkers}`);
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(this.results).forEach(([type, result]) => {
      if (result) {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? `(${result.duration}ms)` : '';
        console.log(`${status} ${result.name} Tests ${duration}`);
        
        totalTests++;
        if (result.success) passedTests++;
        
        if (!result.success && result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }
    });
    
    console.log('='.repeat(60));
    
    // Generate coverage report
    const coverage = this.generateCoverageReport();
    
    console.log(`📊 Test Suites: ${passedTests}/${totalTests} passed`);
    
    if (coverage) {
      console.log(`📈 Coverage: ${coverage.statements}% statements, ${coverage.functions}% functions`);
    }
    
    const success = passedTests === totalTests && totalTests > 0;
    
    if (success) {
      console.log('\n✅ All tests passed successfully!');
      if (this.options.ci) {
        process.exit(0);
      }
    } else {
      console.log('\n❌ Some tests failed!');
      if (this.options.ci) {
        process.exit(1);
      }
    }
    
    return success;
  }

  async run() {
    this.log('🧪 Starting Comprehensive Test Runner for AI Readiness Assessment', 'info');
    this.log(`Configuration: ${JSON.stringify(this.options, null, 2)}`, 'debug');
    
    await this.checkTestEnvironment();
    
    if (this.options.parallel && !this.options.watch) {
      await this.runParallelTests();
    } else {
      await this.runSequentialTests();
    }
    
    return this.generateFinalReport();
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--parallel':
        options.parallel = true;
        break;
      case '--sequential':
        options.parallel = false;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--ci':
        options.ci = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--workers':
        if (i + 1 < args.length) {
          options.maxWorkers = parseInt(args[++i]);
        }
        break;
      case '--timeout':
        if (i + 1 < args.length) {
          options.testTimeout = parseInt(args[++i]);
        }
        break;
      case '--help':
        console.log(`
🧪 AI Readiness Assessment Test Runner

Usage: node scripts/run-tests.js [options]

Options:
  --parallel       Run tests in parallel (default)
  --sequential     Run tests sequentially
  --coverage       Generate coverage report (default)
  --no-coverage    Skip coverage report
  --watch          Watch mode (implies sequential)
  --ci             CI mode (coverage, no watch, bail on failure)
  --verbose        Verbose output
  --bail           Stop on first failure
  --workers <n>    Number of worker processes (default: CPU cores - 1)
  --timeout <ms>   Test timeout in milliseconds (default: 30000)
  --help           Show this help message

Examples:
  node scripts/run-tests.js                    # Run all tests with defaults
  node scripts/run-tests.js --ci               # CI mode
  node scripts/run-tests.js --watch            # Watch mode
  node scripts/run-tests.js --sequential       # Sequential execution
  node scripts/run-tests.js --workers 4        # Use 4 workers
        `);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// Run the test runner
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestRunner(options);
  
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;