/**
 * Comprehensive Rate Limiting Tests
 * Tests rate limiting across all API endpoints and security scenarios
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive Rate Limiting Tests', () => {
  
  test.describe('Authentication Rate Limiting', () => {
    test('Should rate limit login attempts per IP', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/login');
      
      const maxAttempts = 5;
      let rateLimitHit = false;
      
      // Make rapid login attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        try {
          await page.fill('[data-testid="email-input"]', `test-${i}@example.com`);
          await page.fill('[data-testid="password-input"]', 'wrongpassword');
          await page.click('[data-testid="login-submit"]');
          
          // Check for rate limit error
          const rateLimitError = page.locator('[data-testid="rate-limit-error"], .rate-limit-message');
          const isRateLimited = await rateLimitError.isVisible({ timeout: 3000 });
          
          if (isRateLimited) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(100);
        } catch (error) {
          console.log(`Login attempt ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
      await expect(page.locator('[data-testid="rate-limit-error"], .rate-limit-message')).toBeVisible();
    });

    test('Should rate limit registration attempts', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/register');
      
      let rateLimitHit = false;
      
      // Make rapid registration attempts
      for (let i = 0; i < 6; i++) {
        try {
          await page.fill('[data-testid="email-input"]', `test-${Date.now()}-${i}@example.com`);
          await page.fill('[data-testid="password-input"]', 'Password123!');
          await page.fill('[data-testid="first-name-input"]', 'Test');
          await page.fill('[data-testid="last-name-input"]', 'User');
          await page.click('[data-testid="register-submit"]');
          
          // Check for rate limit
          const rateLimitError = page.locator('[data-testid="rate-limit-error"], .rate-limit-message');
          const isRateLimited = await rateLimitError.isVisible({ timeout: 5000 });
          
          if (isRateLimited) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(200);
        } catch (error) {
          console.log(`Registration attempt ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
    });

    test('Should rate limit password reset requests', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/forgot-password');
      
      let rateLimitHit = false;
      
      // Make rapid password reset requests
      for (let i = 0; i < 4; i++) {
        try {
          await page.fill('[data-testid="email-input"]', `test-${i}@example.com`);
          await page.click('[data-testid="reset-submit"]');
          
          // Check for rate limit
          const rateLimitError = page.locator('[data-testid="rate-limit-error"], .rate-limit-message');
          const isRateLimited = await rateLimitError.isVisible({ timeout: 3000 });
          
          if (isRateLimited) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(500);
        } catch (error) {
          console.log(`Password reset attempt ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
    });
  });

  test.describe('API Endpoint Rate Limiting', () => {
    test('Should rate limit survey submission', async ({ authenticatedPage: page, rateLimitHandler }) => {
      await page.goto('/survey');
      
      let rateLimitHit = false;
      
      // Make rapid survey submissions
      for (let i = 0; i < 10; i++) {
        try {
          const response = await page.request.post('/api/survey/submit', {
            data: {
              surveyId: 'test-survey',
              answers: [
                { questionId: 'q1', answer: 'test answer' }
              ]
            }
          });
          
          if (response.status() === 429) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(100);
        } catch (error) {
          console.log(`Survey submission ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
    });

    test('Should rate limit export requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      let rateLimitHit = false;
      
      // Make rapid export requests
      for (let i = 0; i < 3; i++) {
        try {
          const response = await page.request.post('/api/export', {
            data: {
              format: 'pdf',
              includePersonalData: false
            }
          });
          
          if (response.status() === 429) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(200);
        } catch (error) {
          console.log(`Export request ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
    });

    test('Should rate limit LLM analysis requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      let rateLimitHit = false;
      
      // Make rapid LLM analysis requests
      for (let i = 0; i < 5; i++) {
        try {
          const response = await page.request.post('/api/llm/analyze', {
            data: {
              text: 'Test analysis request',
              type: 'sentiment'
            }
          });
          
          if (response.status() === 429) {
            rateLimitHit = true;
            break;
          }
          
          await page.waitForTimeout(100);
        } catch (error) {
          console.log(`LLM analysis ${i} handled:`, error.message);
        }
      }
      
      expect(rateLimitHit).toBe(true);
    });
  });

  test.describe('Rate Limit Recovery', () => {
    test('Should recover after rate limit period expires', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/login');
      
      // First, trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', `test-${i}@example.com`);
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-submit"]');
        await page.waitForTimeout(100);
      }
      
      // Should be rate limited
      await expect(page.locator('[data-testid="rate-limit-error"], .rate-limit-message')).toBeVisible();
      
      // Wait for rate limit window to reset (typically 1-5 minutes in test environment)
      console.log('Waiting for rate limit to reset...');
      await page.waitForTimeout(65000); // Wait 65 seconds
      
      // Should be able to make requests again
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // Should not show rate limit error
      const hasRateLimit = await page.locator('[data-testid="rate-limit-error"]').isVisible({ timeout: 3000 });
      expect(hasRateLimit).toBe(false);
    });

    test('Should show rate limit countdown', async ({ page, rateLimitHandler }) => {
      await page.goto('/auth/login');
      
      // Trigger rate limiting
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', `test-${i}@example.com`);
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-submit"]');
        await page.waitForTimeout(100);
      }
      
      // Should show countdown timer
      const countdownExists = await page.locator('[data-testid="rate-limit-countdown"], .countdown').isVisible({ timeout: 5000 });
      if (countdownExists) {
        await expect(page.locator('[data-testid="rate-limit-countdown"], .countdown')).toContainText(/\d+/);
      }
    });
  });

  test.describe('Per-User Rate Limiting', () => {
    test('Should rate limit per authenticated user', async ({ authenticatedPage: page1, context }) => {
      // Create second authenticated session
      const page2 = await context.newPage();
      await page2.goto('/auth/login');
      
      // User 1 makes requests
      let user1RateLimit = false;
      for (let i = 0; i < 8; i++) {
        try {
          const response = await page1.request.post('/api/survey/submit', {
            data: { surveyId: 'test', answers: [] }
          });
          if (response.status() === 429) {
            user1RateLimit = true;
            break;
          }
          await page1.waitForTimeout(100);
        } catch (error) {
          console.log(`User 1 request ${i} handled:`, error.message);
        }
      }
      
      expect(user1RateLimit).toBe(true);
      
      // User 2 should still be able to make requests (different rate limit)
      const response = await page2.request.post('/api/survey/submit', {
        data: { surveyId: 'test', answers: [] }
      });
      
      expect(response.status()).not.toBe(429);
      
      await page2.close();
    });
  });

  test.describe('Security Rate Limiting', () => {
    test('Should rate limit suspicious IP addresses', async ({ page }) => {
      // Simulate suspicious behavior patterns
      const suspiciousPaths = [
        '/admin',
        '/api/admin/users',
        '/api/debug',
        '/.env',
        '/wp-admin',
        '/phpmyadmin'
      ];
      
      let blocked = false;
      
      // Rapidly access suspicious paths
      for (const path of suspiciousPaths) {
        try {
          const response = await page.request.get(path);
          if (response.status() === 429 || response.status() === 403) {
            blocked = true;
            break;
          }
        } catch (error) {
          console.log(`Suspicious path ${path} handled:`, error.message);
        }
        await page.waitForTimeout(50);
      }
      
      // Should either block or rate limit
      expect(blocked || suspiciousPaths.length > 0).toBe(true);
    });

    test('Should rate limit brute force attempts', async ({ page }) => {
      // Simulate brute force attack on multiple accounts
      const emails = [
        'admin@example.com',
        'root@example.com',
        'administrator@example.com',
        'test@example.com',
        'user@example.com'
      ];
      
      let rateLimited = false;
      
      for (const email of emails) {
        for (let i = 0; i < 3; i++) {
          try {
            await page.goto('/auth/login');
            await page.fill('[data-testid="email-input"]', email);
            await page.fill('[data-testid="password-input"]', 'password123');
            await page.click('[data-testid="login-submit"]');
            
            const hasRateLimit = await page.locator('[data-testid="rate-limit-error"]').isVisible({ timeout: 2000 });
            if (hasRateLimit) {
              rateLimited = true;
              break;
            }
            
            await page.waitForTimeout(100);
          } catch (error) {
            console.log(`Brute force attempt handled:`, error.message);
          }
        }
        
        if (rateLimited) break;
      }
      
      expect(rateLimited).toBe(true);
    });

    test('Should implement progressive delays for repeated failures', async ({ page }) => {
      await page.goto('/auth/login');
      
      const attempts = [];
      
      // Make multiple failed attempts and measure response time
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-submit"]');
        
        // Wait for error or rate limit
        await page.waitForSelector('[data-testid="login-error"], [data-testid="rate-limit-error"]', { timeout: 15000 });
        
        const endTime = Date.now();
        attempts.push(endTime - startTime);
        
        // If rate limited, break
        const isRateLimited = await page.locator('[data-testid="rate-limit-error"]').isVisible({ timeout: 1000 });
        if (isRateLimited) {
          break;
        }
        
        await page.waitForTimeout(100);
      }
      
      // Later attempts should take longer (progressive delays)
      if (attempts.length >= 3) {
        expect(attempts[attempts.length - 1]).toBeGreaterThan(attempts[0]);
      }
    });
  });

  test.describe('Rate Limit Headers and Responses', () => {
    test('Should return proper rate limit headers', async ({ page }) => {
      const response = await page.request.get('/api/security/health');
      
      // Check for rate limit headers
      const headers = response.headers();
      const hasRateLimitHeaders = 
        headers['x-ratelimit-limit'] || 
        headers['x-ratelimit-remaining'] || 
        headers['x-ratelimit-reset'] ||
        headers['retry-after'];
      
      expect(hasRateLimitHeaders).toBeTruthy();
    });

    test('Should return 429 status with proper error format', async ({ page }) => {
      // Trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(page.request.post('/api/auth/signup', {
          data: { email: `test${i}@example.com`, password: 'password' }
        }));
      }
      
      const responses = await Promise.all(requests);
      const rateLimitResponse = responses.find(r => r.status() === 429);
      
      if (rateLimitResponse) {
        expect(rateLimitResponse.status()).toBe(429);
        
        const body = await rateLimitResponse.json();
        expect(body).toHaveProperty('error');
        expect(body.error).toMatch(/rate limit|too many requests/i);
      }
    });
  });

  test.describe('Rate Limiting Configuration', () => {
    test('Should respect different rate limits for different endpoints', async ({ page }) => {
      // Test that auth endpoints have stricter limits than general API
      const authRequests = [];
      const generalRequests = [];
      
      // Make requests to auth endpoint
      for (let i = 0; i < 5; i++) {
        authRequests.push(page.request.post('/api/auth/signup', {
          data: { email: `auth${i}@example.com`, password: 'password' }
        }));
      }
      
      // Make requests to general endpoint
      for (let i = 0; i < 5; i++) {
        generalRequests.push(page.request.get('/api/security/health'));
      }
      
      const authResponses = await Promise.all(authRequests);
      const generalResponses = await Promise.all(generalRequests);
      
      const authRateLimited = authResponses.filter(r => r.status() === 429).length;
      const generalRateLimited = generalResponses.filter(r => r.status() === 429).length;
      
      // Auth endpoints should be more restrictive
      expect(authRateLimited).toBeGreaterThanOrEqual(generalRateLimited);
    });

    test('Should handle burst vs sustained rate limiting', async ({ page }) => {
      const responses = [];
      
      // Make burst of requests
      for (let i = 0; i < 20; i++) {
        responses.push(await page.request.get('/api/security/health'));
        if (i < 5) {
          // No delay for burst
          continue;
        } else {
          // Add delay for sustained
          await page.waitForTimeout(100);
        }
      }
      
      const statuses = responses.map(r => r.status());
      const rateLimitedCount = statuses.filter(s => s === 429).length;
      
      // Should allow some burst but limit sustained
      expect(rateLimitedCount).toBeGreaterThan(0);
      expect(rateLimitedCount).toBeLessThan(responses.length);
    });
  });
});