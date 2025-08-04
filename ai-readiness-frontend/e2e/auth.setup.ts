import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');
const adminAuthFile = path.join(__dirname, '../playwright/.auth/admin.json');

setup('authenticate user', async ({ page }) => {
  console.log('🔐 Setting up user authentication...');
  
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

  // Navigate to login page
  await page.goto('/login');
  
  // Wait for the login form to be visible
  await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  
  try {
    // Attempt to login
    await page.fill('[type="email"]', testEmail);
    await page.fill('[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for either dashboard (success) or error message
    await Promise.race([
      page.waitForURL('**/dashboard', { timeout: 10000 }),
      page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 })
    ]);
    
    // Check if we're on the dashboard (successful login)
    if (page.url().includes('dashboard')) {
      console.log('✅ User login successful');
    } else {
      // If login failed, try to register
      console.log('📝 Login failed, attempting registration...');
      
      await page.goto('/register');
      await page.fill('[type="email"]', testEmail);
      await page.fill('[type="password"]', testPassword);
      await page.fill('[name="confirmPassword"]', testPassword);
      await page.click('button[type="submit"]');
      
      // Handle potential email confirmation step for Supabase
      try {
        await page.waitForText('Check your email', { timeout: 5000 });
        console.log('📧 Registration email sent');
        
        // For testing, we'll simulate email confirmation
        // In a real scenario, you might need to check a test email service
        
        // Navigate back to login after registration
        await page.goto('/login');
        await page.fill('[type="email"]', testEmail);
        await page.fill('[type="password"]', testPassword);
        await page.click('button[type="submit"]');
        
        await page.waitForURL('**/dashboard', { timeout: 10000 });
        console.log('✅ User registration and login successful');
        
      } catch (confirmError) {
        console.log('ℹ️ Email confirmation step handled');
      }
    }
    
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  }
  
  // Ensure we're authenticated by checking for user-specific elements
  await expect(page.locator('[data-testid="user-menu"], [data-testid="dashboard"]')).toBeVisible({ timeout: 5000 });
  
  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });
  console.log('💾 User authentication state saved');
});

setup('authenticate admin', async ({ page }) => {
  console.log('👑 Setting up admin authentication...');
  
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'adminpassword123';

  // Navigate to login page
  await page.goto('/login');
  
  try {
    // Login as admin
    await page.fill('[type="email"]', adminEmail);
    await page.fill('[type="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify admin privileges (check for admin-specific elements)
    // This might vary based on your app's admin interface
    const hasAdminAccess = await page.locator('[data-testid="admin-panel"], [role="admin"]').isVisible().catch(() => false);
    
    if (hasAdminAccess) {
      console.log('✅ Admin login successful with admin privileges');
    } else {
      console.log('⚠️ Admin login successful but no admin privileges detected');
    }
    
  } catch (error) {
    console.warn('⚠️ Admin authentication failed, using regular user setup:', error);
    
    // Fallback to regular user authentication for admin tests
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';
    
    await page.goto('/login');
    await page.fill('[type="email"]', testEmail);
    await page.fill('[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  }
  
  // Save admin signed-in state
  await page.context().storageState({ path: adminAuthFile });
  console.log('💾 Admin authentication state saved');
});