import { test as setup, expect } from '@playwright/test';

/**
 * Authentication Setup for E2E Tests
 * Handles test user authentication and session management
 */

const authFile = 'playwright/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  console.log('🔐 Setting up test user authentication...');
  
  // Navigate to login page
  await page.goto('/auth/login');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Fill in test credentials
  await page.fill('input[type="email"]', 'testuser@example.com');
  await page.fill('input[type="password"]', 'TestPassword123!');
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for successful authentication
  try {
    await page.waitForURL('/dashboard', { timeout: 10000 });
    console.log('✅ Authentication successful - redirected to dashboard');
  } catch (error) {
    // If redirect doesn't happen, check if we're still on login with error
    const currentUrl = page.url();
    if (currentUrl.includes('/auth/login')) {
      console.log('⚠️ Still on login page, checking for auth state...');
      
      // Check if authentication was successful despite no redirect
      const userSession = await page.evaluate(() => {
        return localStorage.getItem('supabase.auth.token') || 
               sessionStorage.getItem('sb-access-token') ||
               document.cookie.includes('sb-access-token');
      });
      
      if (userSession) {
        console.log('✅ Authentication successful - session found');
      } else {
        throw new Error('Authentication failed - no session found');
      }
    } else {
      throw error;
    }
  }
  
  // Verify we have a valid session
  const sessionData = await page.evaluate(() => {
    // Check various possible session storage locations
    const localStorage = window.localStorage;
    const sessionStorage = window.sessionStorage;
    
    return {
      localStorageAuth: localStorage.getItem('supabase.auth.token'),
      sessionStorageAuth: sessionStorage.getItem('sb-access-token'),
      cookies: document.cookie,
      url: window.location.href
    };
  });
  
  console.log('📊 Session data:', {
    hasLocalStorage: !!sessionData.localStorageAuth,
    hasSessionStorage: !!sessionData.sessionStorageAuth,
    hasCookies: sessionData.cookies.length > 0,
    currentUrl: sessionData.url
  });
  
  // Save signed-in state to 'storageState.json'
  await page.context().storageState({ path: authFile });
  
  console.log('💾 Authentication state saved to', authFile);
});

setup('authenticate as admin user', async ({ page }) => {
  console.log('🔐 Setting up admin user authentication...');
  
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  
  await page.fill('input[type="email"]', 'testadmin@example.com');
  await page.fill('input[type="password"]', 'AdminPassword123!');
  
  await page.click('button[type="submit"]');
  
  try {
    await page.waitForURL('/dashboard', { timeout: 10000 });
    console.log('✅ Admin authentication successful');
  } catch (error) {
    console.log('⚠️ Admin redirect delayed, checking auth state...');
    
    const userSession = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') ||
             sessionStorage.getItem('sb-access-token') ||
             document.cookie.includes('sb-access-token');
    });
    
    if (!userSession) {
      throw new Error('Admin authentication failed');
    }
  }
  
  // Save admin state
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
  console.log('💾 Admin authentication state saved');
});