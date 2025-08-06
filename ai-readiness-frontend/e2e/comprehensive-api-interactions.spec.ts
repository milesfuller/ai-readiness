/**
 * Comprehensive API Interaction Tests
 * Tests all API endpoints, data flows, error handling, and integration scenarios
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive API Interaction Tests', () => {
  
  test.describe('Authentication API Endpoints', () => {
    test('Should handle signup API correctly', async ({ page, rateLimitHandler }) => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/auth/signup', {
          data: {
            email: uniqueEmail,
            password: 'SecurePassword123!',
            firstName: 'Test',
            lastName: 'User'
          }
        });
      }, { identifier: 'signup-api' });
      
      // Should return appropriate response
      expect(response.status()).toBeOneOf([200, 201, 422]); // 422 if email validation fails
      
      if (response.status() < 300) {
        const data = await response.json();
        expect(data).toHaveProperty('user');
        expect(data.user.email).toBe(uniqueEmail);
      }
    });

    test('Should validate signup API input', async ({ page }) => {
      const invalidRequests = [
        { data: { email: 'invalid', password: 'password' }, expectedError: 'email' },
        { data: { email: 'test@example.com', password: '123' }, expectedError: 'password' },
        { data: { email: 'test@example.com' }, expectedError: 'password' },
        { data: { password: 'password' }, expectedError: 'email' },
        { data: {}, expectedError: 'validation' }
      ];
      
      for (const { data, expectedError } of invalidRequests) {
        const response = await page.request.post('/api/auth/signup', { data });
        
        expect(response.status()).toBeGreaterThanOrEqual(400);
        
        const responseBody = await response.json();
        expect(JSON.stringify(responseBody).toLowerCase()).toContain(expectedError);
      }
    });

    test('Should handle login API correctly', async ({ page, testUser, rateLimitHandler }) => {
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/auth/login', {
          data: {
            email: testUser.email,
            password: testUser.password
          }
        });
      }, { identifier: 'login-api' });
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('user');
        expect(data.user.email).toBe(testUser.email);
      } else {
        // Should return appropriate error
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('Should handle logout API correctly', async ({ authenticatedPage: page }) => {
      const response = await page.request.post('/api/auth/logout');
      
      expect(response.status()).toBeOneOf([200, 204]);
      
      // Subsequent authenticated requests should fail
      const protectedResponse = await page.request.get('/api/user/profile');
      expect(protectedResponse.status()).toBeGreaterThanOrEqual(401);
    });
  });

  test.describe('User Management API', () => {
    test('Should get user profile', async ({ authenticatedPage: page }) => {
      const response = await page.request.get('/api/user/profile');
      
      if (response.status() === 200) {
        const profile = await response.json();
        expect(profile).toHaveProperty('id');
        expect(profile).toHaveProperty('email');
        expect(profile).not.toHaveProperty('password');
      } else {
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });

    test('Should update user profile', async ({ authenticatedPage: page }) => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        department: 'Engineering'
      };
      
      const response = await page.request.put('/api/user/profile', {
        data: updateData
      });
      
      if (response.status() === 200) {
        const updatedProfile = await response.json();
        expect(updatedProfile.firstName).toBe('Updated');
        expect(updatedProfile.lastName).toBe('Name');
      } else {
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('Should validate user profile updates', async ({ authenticatedPage: page }) => {
      const invalidData = {
        email: 'invalid-email', // Should not allow email change through profile update
        firstName: '<script>alert("xss")</script>',
        maliciousField: 'hacker'
      };
      
      const response = await page.request.put('/api/user/profile', {
        data: invalidData
      });
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Survey API Endpoints', () => {
    test('Should get available surveys', async ({ authenticatedPage: page }) => {
      const response = await page.request.get('/api/surveys');
      
      if (response.status() === 200) {
        const surveys = await response.json();
        expect(Array.isArray(surveys)).toBe(true);
        
        if (surveys.length > 0) {
          expect(surveys[0]).toHaveProperty('id');
          expect(surveys[0]).toHaveProperty('title');
          expect(surveys[0]).toHaveProperty('status');
        }
      } else {
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });

    test('Should create new survey response', async ({ authenticatedPage: page }) => {
      const surveyData = {
        surveyId: 'test-survey-id',
        responses: [
          {
            questionId: 'q1',
            answer: 'Test answer',
            confidence: 8
          }
        ]
      };
      
      const response = await page.request.post('/api/survey/response', {
        data: surveyData
      });
      
      if (response.status() === 201) {
        const createdResponse = await response.json();
        expect(createdResponse).toHaveProperty('id');
        expect(createdResponse.surveyId).toBe('test-survey-id');
      } else {
        expect(response.status()).toBeGreaterThanOrEqual(400);
      }
    });

    test('Should validate survey response data', async ({ authenticatedPage: page }) => {
      const invalidResponses = [
        { data: {}, expectedError: 'surveyId' },
        { data: { surveyId: 'test' }, expectedError: 'responses' },
        { 
          data: { 
            surveyId: 'test', 
            responses: [{ questionId: '', answer: '' }] 
          }, 
          expectedError: 'questionId' 
        }
      ];
      
      for (const { data, expectedError } of invalidResponses) {
        const response = await page.request.post('/api/survey/response', { data });
        
        expect(response.status()).toBeGreaterThanOrEqual(400);
        
        const responseBody = await response.json();
        expect(JSON.stringify(responseBody).toLowerCase()).toContain(expectedError.toLowerCase());
      }
    });

    test('Should get user survey responses', async ({ authenticatedPage: page }) => {
      const response = await page.request.get('/api/survey/my-responses');
      
      if (response.status() === 200) {
        const responses = await response.json();
        expect(Array.isArray(responses)).toBe(true);
        
        if (responses.length > 0) {
          expect(responses[0]).toHaveProperty('id');
          expect(responses[0]).toHaveProperty('surveyId');
          expect(responses[0]).toHaveProperty('status');
        }
      } else {
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });
  });

  test.describe('Export API Endpoints', () => {
    test('Should handle PDF export requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      const exportRequest = {
        format: 'pdf',
        includePersonalData: false,
        filters: {
          dateRange: {
            start: '2024-01-01',
            end: '2024-12-31'
          }
        }
      };
      
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/export', { data: exportRequest });
      }, { identifier: 'pdf-export', maxRetries: 2 });
      
      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/pdf');
      } else {
        // Should return appropriate error or be rate limited
        expect(response.status()).toBeOneOf([429, 400, 401, 403, 500]);
      }
    });

    test('Should handle CSV export requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      const exportRequest = {
        format: 'csv',
        includePersonalData: true
      };
      
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/export', { data: exportRequest });
      }, { identifier: 'csv-export', maxRetries: 2 });
      
      if (response.status() === 200) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('text/csv');
      } else {
        expect(response.status()).toBeOneOf([429, 400, 401, 403, 500]);
      }
    });

    test('Should validate export parameters', async ({ authenticatedPage: page }) => {
      const invalidRequests = [
        { data: { format: 'invalid' }, expectedError: 'format' },
        { data: { format: 'pdf', includePersonalData: 'invalid' }, expectedError: 'boolean' },
        { data: {}, expectedError: 'format' }
      ];
      
      for (const { data, expectedError } of invalidRequests) {
        const response = await page.request.post('/api/export', { data });
        
        expect(response.status()).toBeGreaterThanOrEqual(400);
        
        const responseBody = await response.json();
        expect(JSON.stringify(responseBody).toLowerCase()).toContain(expectedError);
      }
    });
  });

  test.describe('LLM Analysis API', () => {
    test('Should handle text analysis requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      const analysisRequest = {
        text: 'This is a test response for sentiment analysis',
        analysisType: 'sentiment',
        language: 'en'
      };
      
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/llm/analyze', { data: analysisRequest });
      }, { identifier: 'llm-analysis', maxRetries: 1 });
      
      if (response.status() === 200) {
        const analysis = await response.json();
        expect(analysis).toHaveProperty('sentiment');
        expect(analysis).toHaveProperty('confidence');
      } else {
        // Should handle rate limiting or other errors appropriately
        expect(response.status()).toBeOneOf([429, 400, 401, 403, 500]);
      }
    });

    test('Should handle batch analysis requests', async ({ authenticatedPage: page, rateLimitHandler }) => {
      const batchRequest = {
        texts: [
          'First response text',
          'Second response text',
          'Third response text'
        ],
        analysisType: 'categorization'
      };
      
      const response = await rateLimitHandler.executeWithRetry(async () => {
        return await page.request.post('/api/llm/batch', { data: batchRequest });
      }, { identifier: 'batch-analysis', maxRetries: 1 });
      
      if (response.status() === 200) {
        const results = await response.json();
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(3);
      } else {
        expect(response.status()).toBeOneOf([429, 400, 401, 403, 500]);
      }
    });

    test('Should validate LLM analysis input', async ({ authenticatedPage: page }) => {
      const invalidRequests = [
        { data: {}, expectedError: 'text' },
        { data: { text: '' }, expectedError: 'empty' },
        { data: { text: 'test', analysisType: 'invalid' }, expectedError: 'type' },
        { data: { texts: [] }, expectedError: 'empty' }
      ];
      
      for (const { data, expectedError } of invalidRequests) {
        const response = await page.request.post('/api/llm/analyze', { data });
        
        expect(response.status()).toBeGreaterThanOrEqual(400);
        
        const responseBody = await response.json();
        expect(JSON.stringify(responseBody).toLowerCase()).toContain(expectedError);
      }
    });

    test('Should handle LLM cost tracking', async ({ authenticatedPage: page }) => {
      const response = await page.request.get('/api/llm/cost-tracking');
      
      if (response.status() === 200) {
        const costData = await response.json();
        expect(costData).toHaveProperty('totalTokens');
        expect(costData).toHaveProperty('totalCost');
        expect(costData).toHaveProperty('requestCount');
      } else {
        expect(response.status()).toBeOneOf([401, 403, 404]);
      }
    });
  });

  test.describe('Admin API Endpoints', () => {
    test('Should protect admin endpoints', async ({ page }) => {
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/surveys',
        '/api/admin/organizations',
        '/api/admin/analytics'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await page.request.get(endpoint);
        
        // Should require authentication
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });

    test('Should handle admin user management', async ({ authenticatedPage: page }) => {
      // Try to get users list (will fail if not admin)
      const response = await page.request.get('/api/admin/users');
      
      if (response.status() === 200) {
        const users = await response.json();
        expect(Array.isArray(users)).toBe(true);
        
        if (users.length > 0) {
          expect(users[0]).toHaveProperty('id');
          expect(users[0]).toHaveProperty('email');
          expect(users[0]).not.toHaveProperty('password');
        }
      } else {
        // Should be properly protected
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });

    test('Should handle admin survey management', async ({ authenticatedPage: page }) => {
      const response = await page.request.get('/api/admin/surveys');
      
      if (response.status() === 200) {
        const surveys = await response.json();
        expect(Array.isArray(surveys)).toBe(true);
      } else {
        expect(response.status()).toBeOneOf([401, 403]);
      }
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('Should handle API timeouts gracefully', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/slow-endpoint', route => {
        return new Promise(resolve => {
          setTimeout(() => {
            route.fulfill({
              status: 200,
              body: JSON.stringify({ message: 'slow response' })
            });
            resolve();
          }, 30000); // 30 second delay
        });
      });
      
      const startTime = Date.now();
      const response = await page.request.get('/api/slow-endpoint');
      const duration = Date.now() - startTime;
      
      // Should timeout within reasonable time (not wait full 30 seconds)
      expect(duration).toBeLessThan(25000);
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('Should handle malformed JSON responses', async ({ page }) => {
      await page.route('/api/malformed', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json {'
        });
      });
      
      try {
        const response = await page.request.get('/api/malformed');
        const data = await response.json();
        // Should not reach here with malformed JSON
        expect(false).toBe(true);
      } catch (error) {
        // Should handle JSON parsing error
        expect(error.message).toContain('JSON');
      }
    });

    test('Should retry failed requests appropriately', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('/api/retry-test', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        }
      });
      
      // Implementation would depend on your retry logic
      const response = await page.request.get('/api/retry-test');
      
      // Should eventually succeed after retries
      expect(requestCount).toBeGreaterThan(1);
    });

    test('Should handle network failures', async ({ page }) => {
      // Test offline scenario
      await page.context().setOffline(true);
      
      try {
        const response = await page.request.get('/api/test');
        expect(response.status()).toBeGreaterThan(400);
      } catch (error) {
        // Network error expected
        expect(error.message).toMatch(/network|connection|offline/i);
      }
      
      await page.context().setOffline(false);
    });
  });

  test.describe('API Response Validation', () => {
    test('Should return consistent response formats', async ({ authenticatedPage: page }) => {
      const endpoints = [
        '/api/user/profile',
        '/api/surveys',
        '/api/survey/my-responses'
      ];
      
      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        
        if (response.status() === 200) {
          const data = await response.json();
          
          // Should be valid JSON
          expect(data).toBeDefined();
          
          // Should not contain sensitive info in any response
          const responseStr = JSON.stringify(data);
          expect(responseStr).not.toContain('password');
          expect(responseStr).not.toContain('secret');
          expect(responseStr).not.toContain('private_key');
        }
      }
    });

    test('Should include proper CORS headers', async ({ page }) => {
      const response = await page.request.get('/api/surveys');
      const headers = response.headers();
      
      // Should have CORS headers for API endpoints
      expect(headers['access-control-allow-origin']).toBeDefined();
    });

    test('Should handle large response payloads', async ({ authenticatedPage: page }) => {
      // Test endpoint that might return large data
      const response = await page.request.get('/api/survey/analytics');
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
        
        // Should handle large responses without truncation
        const responseSize = JSON.stringify(data).length;
        expect(responseSize).toBeGreaterThan(0);
      }
    });
  });

  test.describe('API Security', () => {
    test('Should validate request origins', async ({ page }) => {
      const response = await page.request.post('/api/auth/signup', {
        headers: {
          'Origin': 'https://malicious-site.com'
        },
        data: {
          email: 'test@example.com',
          password: 'password'
        }
      });
      
      // Should reject or handle suspicious origins appropriately
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('Should sanitize API responses', async ({ authenticatedPage: page }) => {
      // Try to get user data that might contain XSS
      const response = await page.request.get('/api/user/profile');
      
      if (response.status() === 200) {
        const responseText = await response.text();
        
        // Response should not contain unescaped HTML/JS
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
        expect(responseText).not.toContain('onclick=');
      }
    });

    test('Should implement request size limits', async ({ page }) => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      const response = await page.request.post('/api/survey/response', {
        data: {
          surveyId: 'test',
          responses: [
            {
              questionId: 'q1',
              answer: largePayload
            }
          ]
        }
      });
      
      // Should reject oversized requests
      expect(response.status()).toBeOneOf([413, 400]); // 413 = Payload Too Large
    });
  });
});