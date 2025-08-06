/**
 * Example EPIPE-Safe Test
 * 
 * This example demonstrates how to use the EPIPE-safe test runner
 * for reliable parallel test execution.
 */

import { test, expect } from './utils/epipe-safe-runner';

test.describe('EPIPE-Safe Testing Example', () => {
  test('should handle basic navigation with connection pooling', async ({ 
    safePage, 
    testContext 
  }) => {
    console.log(`Test using connection: ${testContext.connectionId}`);
    
    // Navigate to the home page
    await safePage.goto('/');
    
    // Wait for page to load
    await expect(safePage).toHaveTitle(/AI Readiness/);
    
    // Verify metrics are being tracked
    expect(testContext.metrics.pageLoads).toBeGreaterThan(0);
    
    console.log('Page loads:', testContext.metrics.pageLoads);
    console.log('Network requests:', testContext.metrics.networkRequests);
  });

  test('should handle multiple page navigations without EPIPE', async ({ 
    safePage, 
    testContext 
  }) => {
    const pages = ['/', '/dashboard', '/settings'];
    
    for (const page of pages) {
      console.log(`Navigating to ${page} with connection: ${testContext.connectionId}`);
      await safePage.goto(page);
      await safePage.waitForLoadState('networkidle');
    }
    
    // Verify no EPIPE errors occurred
    expect(testContext.metrics.epipeErrors).toBe(0);
    expect(testContext.metrics.pageLoads).toBe(pages.length);
  });

  test('should handle concurrent API requests safely', async ({ 
    safePage, 
    testContext 
  }) => {
    await safePage.goto('/dashboard');
    
    // Make multiple concurrent requests
    const requests = Array.from({ length: 5 }, (_, i) => 
      safePage.request.get(`/api/data?page=${i}`)
    );
    
    const responses = await Promise.all(requests.map(req => 
      req.catch(() => null) // Handle potential failures gracefully
    ));
    
    const successfulResponses = responses.filter(res => res !== null);
    
    // At least some requests should succeed
    expect(successfulResponses.length).toBeGreaterThan(0);
    
    console.log(`Successful concurrent requests: ${successfulResponses.length}/5`);
    console.log('EPIPE errors:', testContext.metrics.epipeErrors);
  });

  test('should recover from connection failures', async ({ 
    safePage, 
    testContext 
  }) => {
    // This test may encounter connection issues but should recover
    try {
      await safePage.goto('/');
      await safePage.reload();
      await safePage.goBack();
      await safePage.goForward();
    } catch (error) {
      console.log('Expected connection error:', (error as Error).message);
      
      // Test should continue after connection pool handles retry
      await safePage.goto('/');
      await expect(safePage).toHaveTitle(/AI Readiness/);
    }
    
    console.log('Final retry count:', testContext.retryCount);
    console.log('Total errors handled:', testContext.metrics.errors);
  });
});

test.describe('Parallel Execution Test', () => {
  // These tests will run in parallel safely
  for (let i = 1; i <= 5; i++) {
    test(`parallel test ${i}`, async ({ safePage, testContext }) => {
      console.log(`Running parallel test ${i} with connection: ${testContext.connectionId}`);
      
      await safePage.goto(`/?test=${i}`);
      await safePage.waitForTimeout(1000); // Simulate work
      
      expect(testContext.metrics.pageLoads).toBeGreaterThan(0);
      expect(testContext.connectionId).toBeTruthy();
    });
  }
});