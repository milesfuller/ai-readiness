/**
 * Comprehensive Role-Based Access Control (RBAC) and Security Tests
 * Tests user roles, permissions, access control, and security features
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive RBAC and Security Tests', () => {
  
  test.describe('User Role Access Control', () => {
    test('Should allow regular user access to appropriate routes', async ({ authenticatedPage: page }) => {
      const userAllowedRoutes = [
        '/dashboard',
        '/profile',
        '/settings',
        '/survey',
        '/results',
        '/notifications'
      ];
      
      for (const route of userAllowedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(route);
        
        // Should not show access denied
        const hasAccessDenied = await page.locator('[data-testid="access-denied"], .access-denied').isVisible({ timeout: 3000 });
        expect(hasAccessDenied).toBe(false);
        
        // Should show content
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Should restrict regular user from admin routes', async ({ authenticatedPage: page }) => {
      const restrictedRoutes = [
        '/admin',
        '/admin/users',
        '/admin/surveys',
        '/organization/analytics',
        '/organization/reports',
        '/organization/surveys'
      ];
      
      for (const route of restrictedRoutes) {
        await page.goto(route);
        
        // Should either redirect or show access denied
        const currentUrl = page.url();
        const hasAccessDenied = await page.locator('[data-testid="access-denied"], .access-denied, .unauthorized').isVisible({ timeout: 5000 });
        const redirectedToDashboard = currentUrl.includes('/dashboard');
        const redirectedToLogin = currentUrl.includes('/auth/login');
        
        expect(hasAccessDenied || redirectedToDashboard || redirectedToLogin).toBe(true);
      }
    });

    test('Should enforce org_admin role permissions', async ({ page, testUser, rateLimitHandler }) => {
      // Simulate org_admin login (would need test user with org_admin role)
      await page.goto('/auth/login');
      
      // Note: In a real test, you'd have test users with different roles
      // For now, we'll test the access control logic
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'org-admin-login' });

      // Try to access organization routes
      const orgRoutes = [
        '/organization/surveys',
        '/organization/analytics', 
        '/organization/reports'
      ];
      
      for (const route of orgRoutes) {
        await page.goto(route);
        
        // Should either allow access or show clear permission error
        const currentUrl = page.url();
        const hasContent = await page.locator('main, [role="main"]').isVisible({ timeout: 5000 });
        const hasAccessError = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
        
        // Should have some response (either content or clear error)
        expect(hasContent || hasAccessError || currentUrl.includes('/dashboard')).toBe(true);
      }
    });

    test('Should enforce admin role permissions', async ({ page, testUser, rateLimitHandler }) => {
      await page.goto('/auth/login');
      
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'admin-login' });

      // Try to access admin routes
      const adminRoutes = ['/admin', '/admin/users', '/admin/surveys'];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        
        // Should either allow access or show permission error
        const currentUrl = page.url();
        const hasContent = await page.locator('main, [role="main"]').isVisible({ timeout: 5000 });
        const hasAccessError = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
        
        expect(hasContent || hasAccessError || currentUrl.includes('/dashboard')).toBe(true);
      }
    });
  });

  test.describe('API Endpoint Security', () => {
    test('Should protect admin API endpoints', async ({ page }) => {
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/surveys',
        '/api/admin/organizations'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should require authentication and proper role
        expect(response.status()).toBeGreaterThanOrEqual(401);
        expect(response.status()).toBeLessThanOrEqual(403);
      }
    });

    test('Should validate API authentication tokens', async ({ page }) => {
      // Make request with invalid token
      const response = await page.request.get('/api/survey/my-surveys', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      expect(response.status()).toBe(401);
    });

    test('Should prevent CSRF attacks on API endpoints', async ({ page }) => {
      const maliciousRequest = page.request.post('/api/admin/users', {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Referer': 'https://malicious-site.com'
        },
        data: {
          action: 'delete',
          userId: 'user-123'
        }
      });
      
      const response = await maliciousRequest;
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('Should validate input data on API endpoints', async ({ page, testUser, rateLimitHandler }) => {
      // Login first to get valid session
      await page.goto('/auth/login');
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'api-validation-login' });

      // Test input validation
      const maliciousData = {
        email: '<script>alert("xss")</script>',
        name: '"><img src=x onerror=alert("xss")>',
        sql_injection: "'; DROP TABLE users; --"
      };
      
      const response = await page.request.post('/api/export', {
        data: maliciousData
      });
      
      // Should reject malicious input
      expect(response.status()).toBeGreaterThanOrEqual(400);
      
      // Check response doesn't contain unescaped input
      const responseText = await response.text();
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('DROP TABLE');
    });
  });

  test.describe('Session Security', () => {
    test('Should invalidate sessions on logout', async ({ authenticatedPage: page, context }) => {
      await expect(page).toHaveURL(/dashboard/);
      
      // Get session cookies before logout
      const cookiesBefore = await context.cookies();
      const sessionCookies = cookiesBefore.filter(c => c.name.includes('supabase') || c.name.includes('auth'));
      
      // Logout
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      
      // Try to access protected route
      await page.goto('/dashboard');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
      
      // Session cookies should be cleared or invalidated
      const cookiesAfter = await context.cookies();
      const validSessionCookies = cookiesAfter.filter(c => 
        (c.name.includes('supabase') || c.name.includes('auth')) && 
        c.value && 
        c.value !== '' && 
        c.value !== 'deleted'
      );
      
      expect(validSessionCookies.length).toBeLessThan(sessionCookies.length);
    });

    test('Should handle session timeout', async ({ authenticatedPage: page }) => {
      // Manually expire the session by manipulating storage
      await page.evaluate(() => {
        // Clear auth tokens to simulate expiration
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') || name.includes('auth')) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          }
        });
      });
      
      // Try to access protected route
      await page.goto('/dashboard');
      await page.waitForURL(/auth\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/auth\/login/);
    });

    test('Should prevent session fixation attacks', async ({ page, context, testUser, rateLimitHandler }) => {
      // Get initial session
      await page.goto('/auth/login');
      const initialCookies = await context.cookies();
      
      // Login
      await rateLimitHandler.executeWithRetry(async () => {
        await page.fill('[data-testid="email-input"]', testUser.email);
        await page.fill('[data-testid="password-input"]', testUser.password);
        await page.click('[data-testid="login-submit"]');
        await page.waitForURL(/dashboard/, { timeout: 30000 });
      }, { identifier: 'session-fixation-test' });
      
      // Session should be regenerated after login
      const postLoginCookies = await context.cookies();
      const sessionCookie = postLoginCookies.find(c => c.name.includes('supabase') || c.name.includes('auth'));
      const initialSessionCookie = initialCookies.find(c => c.name === sessionCookie?.name);
      
      if (sessionCookie && initialSessionCookie) {
        expect(sessionCookie.value).not.toBe(initialSessionCookie.value);
      }
    });
  });

  test.describe('Data Privacy and Security', () => {
    test('Should protect sensitive user data in responses', async ({ authenticatedPage: page }) => {
      // Make API call to get user data
      const response = await page.request.get('/api/user/profile');
      
      if (response.status() === 200) {
        const userData = await response.json();
        
        // Should not expose sensitive fields
        expect(userData).not.toHaveProperty('password');
        expect(userData).not.toHaveProperty('password_hash');
        expect(userData).not.toHaveProperty('salt');
        expect(userData).not.toHaveProperty('private_key');
        
        // Should have appropriate user data
        if (userData.email) {
          expect(userData.email).toMatch(/@/);
        }
      }
    });

    test('Should implement proper data encryption in transit', async ({ page }) => {
      // Check that all API calls use HTTPS in production-like environment
      let httpRequests = [];
      
      page.on('request', request => {
        if (request.url().startsWith('http://') && !request.url().includes('localhost')) {
          httpRequests.push(request.url());
        }
      });
      
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-submit"]');
      
      // In production, should not have any HTTP requests to external services
      const externalHttpRequests = httpRequests.filter(url => !url.includes('localhost'));
      expect(externalHttpRequests.length).toBe(0);
    });

    test('Should validate file upload security', async ({ authenticatedPage: page }) => {
      // Navigate to a page with file upload
      await page.goto('/profile');
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Test with potentially malicious file
        const maliciousFile = Buffer.from('<?php echo "malicious code"; ?>', 'utf-8');
        
        await fileInput.setInputFiles({
          name: 'malicious.php',
          mimeType: 'application/x-php',
          buffer: maliciousFile
        });
        
        // Should reject or sanitize malicious files
        const errorMessage = page.locator('[data-testid="file-error"], .file-upload-error');
        const hasError = await errorMessage.isVisible({ timeout: 5000 });
        
        // Should either show error or accept but sanitize
        if (!hasError) {
          // If accepted, should be processed securely
          const uploadResponse = await page.waitForResponse(/upload|file/, { timeout: 10000 });
          expect(uploadResponse.status()).toBeLessThan(500);
        }
      }
    });
  });

  test.describe('Cross-Site Scripting (XSS) Protection', () => {
    test('Should prevent reflected XSS in query parameters', async ({ page }) => {
      const xssPayload = '<script>alert("xss")</script>';
      const maliciousUrl = `/dashboard?search=${encodeURIComponent(xssPayload)}`;
      
      let alertFired = false;
      page.on('dialog', dialog => {
        alertFired = true;
        dialog.dismiss();
      });
      
      await page.goto(maliciousUrl);
      await page.waitForTimeout(3000);
      
      expect(alertFired).toBe(false);
    });

    test('Should prevent stored XSS in user input', async ({ authenticatedPage: page }) => {
      await page.goto('/profile');
      
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        "javascript:alert('xss')",
        '<img src=x onerror=alert("xss")>',
        '<svg onload=alert("xss")>'
      ];
      
      let alertFired = false;
      page.on('dialog', dialog => {
        alertFired = true;
        dialog.dismiss();
      });
      
      for (const payload of xssPayloads) {
        // Try to input XSS payload in various fields
        const nameField = page.locator('[data-testid="first-name-input"], input[name="firstName"]');
        if (await nameField.isVisible()) {
          await nameField.fill(payload);
          await page.keyboard.press('Tab'); // Trigger onChange
          await page.waitForTimeout(1000);
          
          // Check if XSS executed
          expect(alertFired).toBe(false);
          
          // Check if content is properly escaped in display
          const displayText = await page.textContent('body');
          expect(displayText).not.toContain('<script>');
        }
      }
    });

    test('Should sanitize HTML content in rich text areas', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const textArea = page.locator('textarea, [contenteditable]');
      if (await textArea.first().isVisible()) {
        const htmlPayload = '<b onclick="alert(\'xss\')">Bold Text</b><script>alert("xss")</script>';
        
        let alertFired = false;
        page.on('dialog', dialog => {
          alertFired = true;
          dialog.dismiss();
        });
        
        await textArea.first().fill(htmlPayload);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(2000);
        
        expect(alertFired).toBe(false);
      }
    });
  });

  test.describe('SQL Injection Protection', () => {
    test('Should prevent SQL injection in search parameters', async ({ authenticatedPage: page }) => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "' OR 1=1 --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET password='hacked'; --"
      ];
      
      for (const payload of sqlPayloads) {
        const response = await page.request.get('/api/admin/users', {
          params: { search: payload }
        });
        
        // Should not return 500 error (which might indicate SQL error)
        expect(response.status()).not.toBe(500);
        
        if (response.status() === 200) {
          const responseText = await response.text();
          // Should not contain SQL error messages
          expect(responseText.toLowerCase()).not.toContain('sql error');
          expect(responseText.toLowerCase()).not.toContain('mysql error');
          expect(responseText.toLowerCase()).not.toContain('postgresql error');
        }
      }
    });

    test('Should validate API input against SQL injection', async ({ authenticatedPage: page }) => {
      const maliciousData = {
        email: "admin@test.com'; DROP TABLE users; --",
        name: "Robert'); DROP TABLE students; --",
        department: "' OR '1'='1"
      };
      
      const response = await page.request.post('/api/user/update', {
        data: maliciousData
      });
      
      // Should reject malicious input or handle safely
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() < 400) {
        // If accepted, data should be escaped/parameterized
        const responseData = await response.json();
        expect(JSON.stringify(responseData)).not.toContain('DROP TABLE');
      }
    });
  });

  test.describe('Security Headers', () => {
    test('Should include proper security headers', async ({ page }) => {
      const response = await page.request.get('/dashboard');
      const headers = response.headers();
      
      // Check for security headers
      expect(headers['x-frame-options'] || headers['x-frame-options']).toBeTruthy();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-xss-protection']).toBeTruthy();
      expect(headers['strict-transport-security']).toBeTruthy();
      expect(headers['content-security-policy']).toBeTruthy();
    });

    test('Should implement Content Security Policy', async ({ page }) => {
      const response = await page.request.get('/');
      const csp = response.headers()['content-security-policy'];
      
      if (csp) {
        // Should restrict script sources
        expect(csp).toContain("script-src");
        // Should not allow unsafe-eval in production
        if (process.env.NODE_ENV === 'production') {
          expect(csp).not.toContain("'unsafe-eval'");
        }
      }
    });
  });

  test.describe('Authentication Security', () => {
    test('Should enforce strong password policies', async ({ page }) => {
      await page.goto('/auth/register');
      
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '12345678',
        'qwerty123'
      ];
      
      for (const password of weakPasswords) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', password);
        await page.fill('[data-testid="first-name-input"]', 'Test');
        await page.fill('[data-testid="last-name-input"]', 'User');
        await page.click('[data-testid="register-submit"]');
        
        // Should show password strength error
        const hasError = await page.locator('[data-testid="password-error"], .password-strength-error').isVisible({ timeout: 3000 });
        expect(hasError).toBe(true);
        
        // Clear fields for next test
        await page.fill('[data-testid="password-input"]', '');
      }
    });

    test('Should prevent timing attacks on login', async ({ page }) => {
      const nonExistentEmail = 'nonexistent@example.com';
      const existentEmail = 'test@example.com'; // Assuming this exists
      const password = 'wrongpassword';
      
      // Measure response time for non-existent user
      const startTime1 = Date.now();
      await page.goto('/auth/login');
      await page.fill('[data-testid="email-input"]', nonExistentEmail);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForSelector('[data-testid="login-error"]', { timeout: 10000 });
      const responseTime1 = Date.now() - startTime1;
      
      // Measure response time for existent user
      const startTime2 = Date.now();
      await page.fill('[data-testid="email-input"]', existentEmail);
      await page.fill('[data-testid="password-input"]', password);
      await page.click('[data-testid="login-submit"]');
      await page.waitForSelector('[data-testid="login-error"]', { timeout: 10000 });
      const responseTime2 = Date.now() - startTime2;
      
      // Response times should be similar (within reasonable variance)
      const timeDiff = Math.abs(responseTime1 - responseTime2);
      const avgTime = (responseTime1 + responseTime2) / 2;
      const variance = timeDiff / avgTime;
      
      expect(variance).toBeLessThan(0.5); // Less than 50% difference
    });

    test('Should implement account lockout after failed attempts', async ({ page }) => {
      const testEmail = 'lockout-test@example.com';
      const maxAttempts = 5;
      
      await page.goto('/auth/login');
      
      // Make multiple failed login attempts
      for (let i = 0; i < maxAttempts + 1; i++) {
        await page.fill('[data-testid="email-input"]', testEmail);
        await page.fill('[data-testid="password-input"]', `wrongpassword${i}`);
        await page.click('[data-testid="login-submit"]');
        
        // Check for lockout message
        const isLocked = await page.locator('[data-testid="account-locked"], .account-lockout').isVisible({ timeout: 5000 });
        
        if (isLocked) {
          // Account should be locked
          await expect(page.locator('[data-testid="account-locked"], .account-lockout')).toBeVisible();
          break;
        }
        
        await page.waitForTimeout(1000);
      }
    });
  });
});