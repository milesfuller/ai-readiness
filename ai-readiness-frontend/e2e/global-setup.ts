import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Global setup started...');
  
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Test user authentication setup
    console.log('📝 Setting up test user authentication...');
    
    // Navigate to login page
    await page.goto(`${baseURL}/login`);
    
    // Check if we can reach the login page
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill in test user credentials
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    try {
      await page.fill('[type="email"]', testEmail);
      await page.fill('[type="password"]', testPassword);
      await page.click('button[type="submit"]');
      
      // Wait for successful login or handle registration
      try {
        await page.waitForURL('**/dashboard', { timeout: 5000 });
        console.log('✅ Test user logged in successfully');
      } catch {
        // If login fails, try to register the user
        console.log('📝 Registering test user...');
        await page.goto(`${baseURL}/register`);
        await page.fill('[type="email"]', testEmail);
        await page.fill('[type="password"]', testPassword);
        await page.click('button[type="submit"]');
        
        // For Supabase, we might need to confirm email
        console.log('ℹ️ User registration initiated');
      }
      
      // Save authenticated state
      await page.context().storageState({ 
        path: path.join(__dirname, '../playwright/.auth/user.json') 
      });
      
    } catch (error) {
      console.warn('⚠️ Could not set up user authentication:', error);
    }

    // Admin user authentication setup
    console.log('👑 Setting up admin user authentication...');
    
    const adminBrowser = await chromium.launch();
    const adminPage = await adminBrowser.newPage();
    
    try {
      await adminPage.goto(`${baseURL}/login`);
      await adminPage.fill('[type="email"]', process.env.TEST_ADMIN_EMAIL || 'admin@example.com');
      await adminPage.fill('[type="password"]', process.env.TEST_ADMIN_PASSWORD || 'adminpassword123');
      await adminPage.click('button[type="submit"]');
      
      // Save admin authenticated state
      await adminPage.context().storageState({ 
        path: path.join(__dirname, '../playwright/.auth/admin.json') 
      });
      
      console.log('✅ Admin user authentication setup complete');
    } catch (error) {
      console.warn('⚠️ Could not set up admin authentication:', error);
    }
    
    await adminBrowser.close();

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;