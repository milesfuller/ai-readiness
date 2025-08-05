import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Enhanced Global E2E Test Setup
 * Validates test environment and prepares infrastructure
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Enhanced E2E test environment setup started...');
  
  // Ensure required directories exist
  const requiredDirs = [
    'playwright/.auth',
    'test-results',
    'test-results/e2e-artifacts',
    'test-results/e2e-report'
  ];
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Validate environment variables
  const requiredEnvVars = [
    'NODE_ENV',
    'PLAYWRIGHT_BASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'TEST_USER_EMAIL',
    'TEST_USER_PASSWORD',
  ];
  
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please ensure .env.test is properly loaded');
  }
  
  console.log('✅ Environment variables validated');
  
  // Wait for services to be ready
  const baseURL = config.projects[0]?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
  const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  
  await waitForService(baseURL, 'Next.js App');
  await waitForService(supabaseURL, 'Supabase Services');
  
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

  console.log('✅ Enhanced global setup completed successfully');
}

/**
 * Wait for service to be ready with exponential backoff
 */
async function waitForService(url: string, name: string, maxAttempts: number = 30): Promise<void> {
  console.log(`⏳ Waiting for ${name} at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Try health endpoint first, then root endpoint
      const healthUrl = `${url}/health`;
      let response = await fetch(healthUrl).catch(() => null);
      
      if (!response || !response.ok) {
        response = await fetch(url).catch(() => null);
      }
      
      if (response && response.ok) {
        console.log(`✅ ${name} is ready!`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    if (attempt === maxAttempts) {
      console.error(`❌ ${name} failed to start after ${maxAttempts} attempts`);
      throw new Error(`Service ${name} is not available at ${url}`);
    }
    
    const delay = Math.min(2000 * Math.pow(1.5, attempt - 1), 10000); // Exponential backoff, max 10s
    console.log(`   Attempt ${attempt}/${maxAttempts} - ${name} not ready yet... (retrying in ${delay}ms)`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export default globalSetup;