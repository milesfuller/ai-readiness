#!/usr/bin/env node

/**
 * Lighthouse CI Integration
 * 
 * Runs Lighthouse performance audits programmatically and validates
 * performance budgets for Core Web Vitals.
 */

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs/promises')
const path = require('path')

const PERFORMANCE_BUDGETS = {
  performance: 90,        // Lighthouse Performance score
  accessibility: 95,      // Accessibility score
  'best-practices': 90,   // Best Practices score
  seo: 90,               // SEO score
  pwa: 80,               // PWA score (if applicable)
  
  // Core Web Vitals thresholds
  'largest-contentful-paint': 2500,    // LCP < 2.5s
  'first-input-delay': 100,            // FID < 100ms  
  'cumulative-layout-shift': 0.1,      // CLS < 0.1
  'first-contentful-paint': 1800,      // FCP < 1.8s
  'speed-index': 3400,                 // SI < 3.4s
  'total-blocking-time': 600,          // TBT < 600ms
}

const TEST_URLS = [
  { url: '/', name: 'Homepage' },
  { url: '/auth/login', name: 'Login' },
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/survey', name: 'Survey' }
]

class LighthouseCIRunner {
  constructor() {
    this.results = []
    this.chrome = null
  }

  async initialize() {
    console.log('🚀 Starting Lighthouse CI Runner...')
    
    // Launch Chrome
    this.chrome = await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions'
      ]
    })
    
    console.log(`✅ Chrome launched on port ${this.chrome.port}`)
  }

  async runAudit(testUrl, baseUrl = 'http://localhost:3000') {
    const fullUrl = `${baseUrl}${testUrl.url}`
    
    console.log(`🔍 Running Lighthouse audit for ${testUrl.name}: ${fullUrl}`)
    
    const config = {
      extends: 'lighthouse:default',
      settings: {
        onlyAudits: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'first-meaningful-paint',
          'speed-index',
          'total-blocking-time',
          'cumulative-layout-shift',
          'interactive',
          'metrics'
        ]
      }
    }
    
    try {
      const runnerResult = await lighthouse(fullUrl, {
        port: this.chrome.port,
        disableDeviceEmulation: false,
        emulatedFormFactor: 'mobile'
      }, config)

      const { lhr } = runnerResult
      
      const auditResult = {
        url: testUrl.url,
        name: testUrl.name,
        scores: {
          performance: Math.round((lhr.categories.performance?.score || 0) * 100),
          accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
          'best-practices': Math.round((lhr.categories['best-practices']?.score || 0) * 100),
          seo: Math.round((lhr.categories.seo?.score || 0) * 100),
          pwa: lhr.categories.pwa ? Math.round(lhr.categories.pwa.score * 100) : 0
        },
        metrics: {
          'first-contentful-paint': lhr.audits['first-contentful-paint']?.numericValue || 0,
          'largest-contentful-paint': lhr.audits['largest-contentful-paint']?.numericValue || 0,
          'first-meaningful-paint': lhr.audits['first-meaningful-paint']?.numericValue || 0,
          'speed-index': lhr.audits['speed-index']?.numericValue || 0,
          'total-blocking-time': lhr.audits['total-blocking-time']?.numericValue || 0,
          'cumulative-layout-shift': lhr.audits['cumulative-layout-shift']?.numericValue || 0,
          'interactive': lhr.audits['interactive']?.numericValue || 0
        },
        opportunities: this.extractOpportunities(lhr),
        timestamp: new Date().toISOString()
      }
      
      this.results.push(auditResult)
      console.log(`✅ Audit completed for ${testUrl.name}`)
      
      return auditResult
      
    } catch (error) {
      console.error(`❌ Lighthouse audit failed for ${testUrl.name}:`, error.message)
      return null
    }
  }

  extractOpportunities(lhr) {
    const opportunities = []
    
    Object.keys(lhr.audits).forEach(auditKey => {
      const audit = lhr.audits[auditKey]
      if (audit.details && audit.details.type === 'opportunity' && audit.numericValue > 0) {
        opportunities.push({
          audit: auditKey,
          title: audit.title,
          description: audit.description,
          potentialSavings: audit.numericValue,
          score: audit.score
        })
      }
    })
    
    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings).slice(0, 5)
  }

  validatePerformanceBudgets() {
    console.log('\n📊 Validating Performance Budgets...')
    
    const failures = []
    let totalTests = 0
    let passedTests = 0
    
    this.results.forEach(result => {
      console.log(`\n🏠 ${result.name} (${result.url})`)
      console.log('Scores:')
      
      // Validate scores
      Object.keys(result.scores).forEach(scoreKey => {
        if (PERFORMANCE_BUDGETS[scoreKey] && result.scores[scoreKey] > 0) {
          totalTests++
          const score = result.scores[scoreKey]
          const budget = PERFORMANCE_BUDGETS[scoreKey]
          const passed = score >= budget
          
          console.log(`  ${scoreKey}: ${score}/${budget} ${passed ? '✅' : '❌'}`)
          
          if (passed) {
            passedTests++
          } else {
            failures.push({
              url: result.url,
              metric: scoreKey,
              actual: score,
              expected: budget,
              type: 'score'
            })
          }
        }
      })
      
      console.log('Core Web Vitals:')
      
      // Validate metrics
      Object.keys(result.metrics).forEach(metricKey => {
        if (PERFORMANCE_BUDGETS[metricKey]) {
          totalTests++
          const value = result.metrics[metricKey]
          const budget = PERFORMANCE_BUDGETS[metricKey]
          const passed = value <= budget
          
          console.log(`  ${metricKey}: ${value.toFixed(0)}ms <= ${budget}ms ${passed ? '✅' : '❌'}`)
          
          if (passed) {
            passedTests++
          } else {
            failures.push({
              url: result.url,
              metric: metricKey,
              actual: Math.round(value),
              expected: budget,
              type: 'metric'
            })
          }
        }
      })
      
      // Show top opportunities
      if (result.opportunities.length > 0) {
        console.log('Top Optimization Opportunities:')
        result.opportunities.slice(0, 3).forEach(opp => {
          console.log(`  • ${opp.title}: ${opp.potentialSavings.toFixed(0)}ms potential savings`)
        })
      }
    })
    
    console.log(`\n📈 Performance Budget Summary:`)
    console.log(`  Total Tests: ${totalTests}`)
    console.log(`  Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`)
    console.log(`  Failed: ${failures.length} (${((failures.length / totalTests) * 100).toFixed(1)}%)`)
    
    return { failures, totalTests, passedTests }
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'lighthouse-report.json')
    const htmlReportPath = path.join(process.cwd(), 'lighthouse-report.html')
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUrls: this.results.length,
        averagePerformanceScore: Math.round(
          this.results.reduce((sum, r) => sum + r.scores.performance, 0) / this.results.length
        )
      },
      budgets: PERFORMANCE_BUDGETS,
      results: this.results
    }
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 JSON report saved to: ${reportPath}`)
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report)
    await fs.writeFile(htmlReportPath, htmlReport)
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`)
    
    return report
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lighthouse CI Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { background: #e3f2fd; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .result-card { background: white; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0; padding: 20px; }
        .scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .score { text-align: center; padding: 15px; border-radius: 8px; }
        .score.good { background: #c8e6c9; color: #2e7d32; }
        .score.needs-improvement { background: #fff3e0; color: #f57c00; }
        .score.poor { background: #ffcdd2; color: #d32f2f; }
        .metrics { margin: 20px 0; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .opportunities { margin: 20px 0; }
        .opportunity { background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Lighthouse CI Performance Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>
        
        <div class="summary">
            <h2>Summary</h2>
            <p><strong>URLs Tested:</strong> ${report.summary.totalUrls}</p>
            <p><strong>Average Performance Score:</strong> ${report.summary.averagePerformanceScore}/100</p>
        </div>
        
        ${report.results.map(result => `
            <div class="result-card">
                <h2>${result.name} <code>${result.url}</code></h2>
                
                <h3>Lighthouse Scores</h3>
                <div class="scores">
                    ${Object.entries(result.scores).map(([key, score]) => `
                        <div class="score ${score >= 90 ? 'good' : score >= 70 ? 'needs-improvement' : 'poor'}">
                            <div style="font-size: 24px; font-weight: bold;">${score}</div>
                            <div>${key.replace('-', ' ').toUpperCase()}</div>
                        </div>
                    `).join('')}
                </div>
                
                <h3>Core Web Vitals</h3>
                <div class="metrics">
                    ${Object.entries(result.metrics).map(([key, value]) => `
                        <div class="metric">
                            <span>${key.replace('-', ' ').toUpperCase()}</span>
                            <span>${value.toFixed(0)}ms</span>
                        </div>
                    `).join('')}
                </div>
                
                ${result.opportunities.length > 0 ? `
                    <h3>Top Optimization Opportunities</h3>
                    <div class="opportunities">
                        ${result.opportunities.slice(0, 3).map(opp => `
                            <div class="opportunity">
                                <strong>${opp.title}</strong><br>
                                <small>${opp.description}</small><br>
                                <em>Potential savings: ${opp.potentialSavings.toFixed(0)}ms</em>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>
    `
  }

  async cleanup() {
    if (this.chrome) {
      await this.chrome.kill()
      console.log('✅ Chrome instance closed')
    }
  }
}

async function main() {
  const runner = new LighthouseCIRunner()
  
  try {
    await runner.initialize()
    
    // Run audits for all test URLs
    for (const testUrl of TEST_URLS) {
      await runner.runAudit(testUrl)
      // Small delay between audits
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Validate performance budgets
    const validation = runner.validatePerformanceBudgets()
    
    // Generate reports
    await runner.generateReport()
    
    // Exit with appropriate code
    if (validation.failures.length > 0) {
      console.log(`\n❌ ${validation.failures.length} performance budget violations found`)
      process.exit(1)
    } else {
      console.log('\n✅ All performance budgets passed!')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('❌ Lighthouse CI failed:', error)
    process.exit(1)
  } finally {
    await runner.cleanup()
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...')
  process.exit(0)
})

if (require.main === module) {
  main()
}

module.exports = { LighthouseCIRunner, PERFORMANCE_BUDGETS }