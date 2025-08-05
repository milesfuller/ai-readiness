import { test as cleanup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Authentication Cleanup
 * Cleans up authentication files after test completion
 */
cleanup('cleanup authentication files', async () => {
  console.log('🧹 Cleaning up authentication files...');
  
  const authDir = path.join(__dirname, '../playwright/.auth');
  
  if (fs.existsSync(authDir)) {
    const authFiles = fs.readdirSync(authDir);
    
    for (const file of authFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(authDir, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removed auth file: ${file}`);
        } catch (error) {
          console.log(`⚠️ Could not remove auth file ${file}:`, error);
        }
      }
    }
  }
  
  console.log('✅ Authentication cleanup completed');
});