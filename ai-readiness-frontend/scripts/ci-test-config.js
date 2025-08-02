#!/usr/bin/env node

/**
 * CI/CD Test Configuration for AI Readiness Assessment
 * Optimized for different CI environments (GitHub Actions, GitLab CI, etc.)
 */

const fs = require('fs');
const path = require('path');

class CITestConfig {
  constructor() {
    this.ciEnvironment = this.detectCIEnvironment();
    this.config = this.generateConfig();
  }

  detectCIEnvironment() {
    const env = process.env;
    
    if (env.GITHUB_ACTIONS) return 'github-actions';
    if (env.GITLAB_CI) return 'gitlab-ci';
    if (env.JENKINS_URL) return 'jenkins';
    if (env.CIRCLECI) return 'circleci';
    if (env.TRAVIS) return 'travis';
    if (env.CI) return 'generic-ci';
    
    return 'local';
  }

  generateConfig() {
    const baseConfig = {
      testRunner: 'node scripts/run-tests.js',
      securityScan: 'node scripts/security-scan.js',
      parallel: true,
      coverage: true,
      bail: true,
      maxWorkers: this.getOptimalWorkerCount(),
      timeout: 30000,
      retries: 2
    };

    const environmentConfigs = {
      'github-actions': {
        ...baseConfig,
        maxWorkers: 2,
        timeout: 60000,
        artifacts: {
          coverage: 'coverage/',
          reports: 'test-results/'
        },
        cacheKey: 'node-modules-${{ hashFiles(\'**/package-lock.json\') }}'
      },
      
      'gitlab-ci': {
        ...baseConfig,
        maxWorkers: 2,
        timeout: 45000,
        artifacts: {
          coverage: 'coverage/',
          reports: {
            junit: 'test-results/junit.xml',
            coverage_report: {
              coverage_format: 'cobertura',
              path: 'coverage/cobertura-coverage.xml'
            }
          }
        }
      },
      
      'jenkins': {
        ...baseConfig,
        maxWorkers: 4,
        timeout: 90000,
        parallel: false, // Jenkins often has resource constraints
        publishHTML: {
          allowMissing: false,
          alwaysLinkToLastBuild: true,
          keepAll: true,
          reportDir: 'coverage/lcov-report',
          reportFiles: 'index.html',
          reportName: 'Coverage Report'
        }
      },
      
      'circleci': {
        ...baseConfig,
        maxWorkers: 2,
        timeout: 45000,
        storeArtifacts: [
          { path: 'coverage', destination: 'coverage' },
          { path: 'test-results', destination: 'test-results' }
        ]
      },
      
      'local': {
        ...baseConfig,
        parallel: true,
        coverage: true,
        bail: false,
        maxWorkers: Math.max(1, require('os').cpus().length - 1),
        watch: false
      }
    };

    return environmentConfigs[this.ciEnvironment] || environmentConfigs.local;
  }

  getOptimalWorkerCount() {
    const cpuCount = require('os').cpus().length;
    
    // Conservative approach for CI environments
    if (this.ciEnvironment !== 'local') {
      return Math.min(2, Math.max(1, Math.floor(cpuCount / 2)));
    }
    
    // More aggressive for local development
    return Math.max(1, cpuCount - 1);
  }

  generateGitHubActionsWorkflow() {
    return `name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js $\{{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: $\{{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security scan
      run: npm run test:security
    
    - name: Run tests
      run: npm run test:ci
      env:
        CI: true
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results-$\{{ matrix.node-version }}
        path: |
          coverage/
          test-results/
`;
  }

  generateGitLabCIConfig() {
    return `stages:
  - security
  - test
  - coverage

variables:
  NODE_VERSION: "20"
  CACHE_KEY: "$CI_COMMIT_REF_SLUG"

cache:
  key: \${CACHE_KEY}
  paths:
    - node_modules/
    - .npm/

before_script:
  - npm ci --cache .npm --prefer-offline

security_scan:
  stage: security
  image: node:\${NODE_VERSION}
  script:
    - npm run test:security
  only:
    - merge_requests
    - main
    - develop

test:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm run test:ci
  coverage: '/Lines\\s*:\\s*(\\d+\\.?\\d*)%/'
  artifacts:
    when: always
    reports:
      junit: test-results/junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 1 week
  only:
    - merge_requests
    - main
    - develop

pages:
  stage: coverage
  dependencies:
    - test
  script:
    - mkdir public
    - cp -r coverage/lcov-report/* public/
  artifacts:
    paths:
      - public
  only:
    - main
`;
  }

  generateJenkinsfile() {
    return `pipeline {
    agent any
    
    tools {
        nodejs '20'
    }
    
    environment {
        CI = 'true'
    }
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'npm run test:security'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm run test:ci'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                    
                    archiveArtifacts artifacts: 'coverage/**/*', fingerprint: true
                }
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        failure {
            emailext(
                subject: "Build Failed: \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: "Build failed. Check console output at \${env.BUILD_URL}",
                to: "\${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}`;
  }

  writeConfigFiles() {
    const outputDir = path.join(process.cwd(), '.ci');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write environment-specific configurations
    fs.writeFileSync(
      path.join(outputDir, 'github-actions.yml'),
      this.generateGitHubActionsWorkflow()
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'gitlab-ci.yml'),
      this.generateGitLabCIConfig()
    );
    
    fs.writeFileSync(
      path.join(outputDir, 'Jenkinsfile'),
      this.generateJenkinsfile()
    );
    
    // Write configuration summary
    fs.writeFileSync(
      path.join(outputDir, 'config.json'),
      JSON.stringify(this.config, null, 2)
    );

    console.log('✅ CI/CD configuration files generated in .ci/ directory');
    console.log('📋 Current environment:', this.ciEnvironment);
    console.log('⚙️  Configuration:', JSON.stringify(this.config, null, 2));
  }

  getTestCommand() {
    const args = [
      this.config.parallel ? '--parallel' : '--sequential',
      this.config.coverage ? '--coverage' : '--no-coverage',
      this.config.bail ? '--bail' : '',
      `--workers ${this.config.maxWorkers}`,
      `--timeout ${this.config.timeout}`
    ].filter(Boolean);

    return `${this.config.testRunner} ${args.join(' ')}`;
  }

  run() {
    console.log(`🔧 Detected CI environment: ${this.ciEnvironment}`);
    console.log(`⚡ Recommended test command: ${this.getTestCommand()}`);
    
    if (process.argv.includes('--write-configs')) {
      this.writeConfigFiles();
    }
    
    return this.config;
  }
}

// CLI usage
if (require.main === module) {
  const config = new CITestConfig();
  config.run();
}

module.exports = CITestConfig;