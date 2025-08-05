import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Enhanced Global E2E Test Teardown
 * Cleans up test artifacts and generates comprehensive summary reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Enhanced global teardown started...');

  try {
    // Generate test summary first
    await generateTestSummary();
    
    // Clean up authentication files
    const authDir = path.join(__dirname, '../playwright/.auth');
    if (fs.existsSync(authDir)) {
      const authFiles = fs.readdirSync(authDir);
      for (const file of authFiles) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(authDir, file));
          console.log(`🗑️ Removed auth file: ${file}`);
        }
      }
    }

    // Clean up test artifacts if not in CI
    if (!process.env.CI) {
      const testResultsDir = path.join(__dirname, '../test-results');
      if (fs.existsSync(testResultsDir)) {
        console.log('🧹 Cleaning up test results...');
        // Keep only the most recent results
        const files = fs.readdirSync(testResultsDir);
        files.forEach(file => {
          const filePath = path.join(testResultsDir, file);
          const stats = fs.statSync(filePath);
          const now = new Date().getTime();
          const fileAge = now - stats.mtime.getTime();
          
          // Delete files older than 1 hour
          if (fileAge > 3600000) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Removed old test file: ${file}`);
          }
        });
      }
    }

    // Archive test results if in CI
    if (process.env.CI) {
      await archiveTestResults();
    }
    
    // Print summary
    console.log('📊 Enhanced test execution summary generated');
    
  } catch (error) {
    console.error('❌ Enhanced global teardown error:', error);
    // Don't fail the entire test run due to teardown issues
  }

  console.log('✅ Enhanced global teardown completed');
}

/**
 * Generate a comprehensive summary of test results
 */
async function generateTestSummary() {
  try {
    const resultsPath = 'test-results/e2e-results.json';
    
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.stats?.total || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
        environment: {
          baseURL: process.env.PLAYWRIGHT_BASE_URL,
          supabaseURL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          nodeEnv: process.env.NODE_ENV,
        },
      };
      
      fs.writeFileSync(
        'test-results/e2e-summary.json',
        JSON.stringify(summary, null, 2)
      );
      
      console.log('📊 Test Summary:');
      console.log(`   Total Tests: ${summary.totalTests}`);
      console.log(`   Passed: ${summary.passed}`);
      console.log(`   Failed: ${summary.failed}`);
      console.log(`   Skipped: ${summary.skipped}`);
      console.log(`   Duration: ${Math.round(summary.duration / 1000)}s`);
    }
  } catch (error) {
    console.log('⚠️ Could not generate test summary:', error);
  }
}

/**
 * Archive test results for CI
 */
async function archiveTestResults() {
  try {
    const archiveDir = 'test-results/archive';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `e2e-${timestamp}`);
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
    
    // Copy key files to archive
    const filesToArchive = [
      'test-results/e2e-results.json',
      'test-results/e2e-summary.json',
    ];
    
    fs.mkdirSync(archivePath, { recursive: true });
    
    for (const file of filesToArchive) {
      if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(archivePath, fileName));
      }
    }
    
    console.log(`📦 Test results archived to: ${archivePath}`);
  } catch (error) {
    console.log('⚠️ Could not archive test results:', error);
  }
}

export default globalTeardown;