/**
 * Test Setup Fixtures for E2E Tests
 * Provides common test utilities and setup for consistent testing
 */

import { test as base, expect, Page, BrowserContext } from '@playwright/test';
import { TestRateLimitHandler } from '../../lib/test-utils/rate-limit-handler';

// Extend basic test with custom fixtures
export const test = base.extend<{
  rateLimitHandler: TestRateLimitHandler;
  authenticatedPage: Page;
  testUser: { email: string; password: string };
  supabaseUtils: SupabaseTestUtils;
}>({
  // Rate limit handler fixture
  rateLimitHandler: async ({}, use) => {
    const handler = new TestRateLimitHandler({
      skipRateLimiting: process.env.ENABLE_RATE_LIMITING !== 'true',
      maxRetries: 5,
      baseDelay: 1000,
    });
    await use(handler);
  },

  // Test user fixture
  testUser: async ({}, use) => {
    const user = {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'testpassword123',
    };
    await use(user);
  },

  // Authenticated page fixture
  authenticatedPage: async ({ page, testUser, rateLimitHandler }, use) => {
    // Navigate to login page with rate limiting
    await rateLimitHandler.executeWithRetry(async () => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');
    });

    // Fill login form
    await page.fill('[data-testid="email-input"]', testUser.email);
    await page.fill('[data-testid="password-input"]', testUser.password);
    
    // Submit with rate limiting
    await rateLimitHandler.executeWithRetry(async () => {
      await page.click('[data-testid="login-submit"]');
      
      // Wait for redirect or success indication
      await Promise.race([
        page.waitForURL('/dashboard', { timeout: 15000 }),
        page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 }),
        page.waitForSelector('[data-testid="login-success"]', { timeout: 15000 }),
      ]);
    });

    await use(page);
  },

  // Supabase utilities fixture
  supabaseUtils: async ({ rateLimitHandler }, use) => {
    const utils = new SupabaseTestUtils(rateLimitHandler);
    await use(utils);
    await utils.cleanup();
  },
});

/**
 * Supabase test utilities class
 */
class SupabaseTestUtils {
  private createdUsers: string[] = [];
  private createdData: Array<{ table: string; id: string }> = [];

  constructor(private rateLimitHandler: TestRateLimitHandler) {}

  /**
   * Create a test user via API
   */
  async createTestUser(email: string, password: string): Promise<{ id: string; email: string }> {
    const response = await this.rateLimitHandler.fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email,
          password,
          options: {
            data: {
              test_user: true,
              created_by: 'e2e-test',
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.statusText}`);
    }

    const data = await response.json();
    const userId = data.user?.id;
    
    if (userId) {
      this.createdUsers.push(userId);
    }

    return {
      id: userId,
      email: data.user?.email || email,
    };
  }

  /**
   * Delete a test user
   */
  async deleteTestUser(userId: string): Promise<void> {
    await this.rateLimitHandler.fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
      }
    );

    this.createdUsers = this.createdUsers.filter(id => id !== userId);
  }

  /**
   * Create test survey data
   */
  async createTestSurvey(surveyData: any): Promise<{ id: string }> {
    const response = await this.rateLimitHandler.fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/surveys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          ...surveyData,
          test_data: true,
          created_by: 'e2e-test',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create test survey: ${response.statusText}`);
    }

    const data = await response.json();
    const surveyId = Array.isArray(data) ? data[0]?.id : data?.id;
    
    if (surveyId) {
      this.createdData.push({ table: 'surveys', id: surveyId });
    }

    return { id: surveyId };
  }

  /**
   * Wait for rate limit to reset
   */
  async waitForRateLimit(seconds: number = 30): Promise<void> {
    console.log(`Waiting ${seconds} seconds for rate limit to reset...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Check if service is healthy
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await this.rateLimitHandler.fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup all created test data
   */
  async cleanup(): Promise<void> {
    // Clean up created data
    for (const item of this.createdData) {
      try {
        await this.rateLimitHandler.fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${item.table}?id=eq.${item.id}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
      } catch (error) {
        console.warn(`Failed to cleanup ${item.table} ${item.id}:`, error);
      }
    }

    // Clean up created users
    for (const userId of this.createdUsers) {
      try {
        await this.deleteTestUser(userId);
      } catch (error) {
        console.warn(`Failed to cleanup user ${userId}:`, error);
      }
    }

    this.createdData = [];
    this.createdUsers = [];
  }
}

/**
 * Custom expect extensions for test infrastructure
 */
export { expect } from '@playwright/test';

/**
 * Page object models and utilities
 */
export class LoginPage {
  constructor(private page: Page, private rateLimitHandler: TestRateLimitHandler) {}

  async navigate(): Promise<void> {
    await this.rateLimitHandler.executeWithRetry(async () => {
      await this.page.goto('/auth/login');
      await this.page.waitForLoadState('networkidle');
    });
  }

  async login(email: string, password: string): Promise<void> {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    
    await this.rateLimitHandler.executeWithRetry(async () => {
      await this.page.click('[data-testid="login-submit"]');
      
      // Wait for navigation or success
      await Promise.race([
        this.page.waitForURL('/dashboard', { timeout: 15000 }),
        this.page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 }),
      ]);
    });
  }

  async expectLoginError(): Promise<void> {
    await expect(this.page.locator('[data-testid="login-error"]')).toBeVisible();
  }
}

export class DashboardPage {
  constructor(private page: Page) {}

  async expectToBeVisible(): Promise<void> {
    await expect(this.page.locator('[data-testid="dashboard"]')).toBeVisible();
  }

  async expectWelcomeMessage(): Promise<void> {
    await expect(this.page.locator('[data-testid="welcome-message"]')).toBeVisible();
  }
}

// Export configured test and expect
export default test;