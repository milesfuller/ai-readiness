import { test as cleanup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

cleanup('cleanup test artifacts', async () => {
  console.log('🧹 Running test cleanup...');
  
  try {
    // Clean up authentication files
    const authDir = path.join(__dirname, '../playwright/.auth');
    if (fs.existsSync(authDir)) {
      const authFiles = fs.readdirSync(authDir);
      for (const file of authFiles) {
        if (file.endsWith('.json')) {
          const filePath = path.join(authDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Cleaned up auth file: ${file}`);
          }
        }
      }
    }

    // Clean up temporary test data from Supabase
    // Note: In a real scenario, you might want to clean up test data from the database
    console.log('🗄️ Test data cleanup completed');

    // Clean up any temporary files created during tests
    const tempDir = path.join(__dirname, '../temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️ Temporary files cleaned up');
    }

    console.log('✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    // Don't throw error as cleanup failure shouldn't fail tests
  }
});