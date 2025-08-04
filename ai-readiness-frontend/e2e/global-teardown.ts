import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global teardown started...');

  try {
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

    // Print summary
    console.log('📊 Test execution summary generated');
    
  } catch (error) {
    console.error('❌ Global teardown error:', error);
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;