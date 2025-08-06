/**
 * Performance Test: Rate Limiting Prevention
 * 
 * Tests the MIN_CREATION_INTERVAL and rate limiting mechanisms to ensure
 * rapid navigation and API calls don't trigger rate limit errors.
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const RATE_LIMIT_DELAYS = {
  MIN_CREATION_INTERVAL: 1000, // From client.ts
  API_THROTTLE: 100, // From rate-limit-handler.ts
  RAPID_NAV_THRESHOLD: 50, // Test rapid navigation
}

test.describe('Rate Limiting Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Enable network monitoring
    await page.route('**/*', (route) => {
      const request = route.request()
      console.log(`[${new Date().toISOString()}] ${request.method()} ${request.url()}`)
      route.continue()
    })
  })

  test('Supabase client singleton prevents multiple instances', async ({ page }) => {
    const startTime = Date.now()
    
    // Navigate to different pages rapidly to test singleton behavior
    await page.goto('/')
    await page.goto('/auth/login')
    await page.goto('/dashboard')
    await page.goto('/survey')
    
    const endTime = Date.now()
    const navigationTime = endTime - startTime
    
    // Check console for multiple client warnings
    const consoleLogs = await page.evaluate(() => {
      return window.console.log.toString()
    })
    
    // Monitor network requests for excessive Supabase client creations
    let supabaseRequests = 0
    page.on('request', request => {
      if (request.url().includes('supabase.co')) {
        supabaseRequests++
      }
    })
    
    // Verify no "Multiple GoTrueClient instances" warnings
    await expect(page.locator('body')).not.toContainText('Multiple GoTrueClient instances')
    
    console.log(`Navigation completed in ${navigationTime}ms`)
    console.log(`Supabase requests: ${supabaseRequests}`)
    
    // Test rapid page transitions
    for (let i = 0; i < 10; i++) {
      await page.goto('/dashboard')
      await page.waitForTimeout(RATE_LIMIT_DELAYS.RAPID_NAV_THRESHOLD)
      await page.goto('/survey')
      await page.waitForTimeout(RATE_LIMIT_DELAYS.RAPID_NAV_THRESHOLD)
    }
  })

  test('MIN_CREATION_INTERVAL prevents rapid client creation', async ({ page }) => {
    const testScript = `
      let clientCreationTimes = [];
      let rateLimitWarnings = [];
      
      // Override console.warn to capture rate limit warnings
      const originalWarn = console.warn;
      console.warn = function(...args) {
        if (args[0] && args[0].includes('Rate limiting Supabase client creation')) {
          rateLimitWarnings.push({ message: args[0], timestamp: Date.now() });
        }
        originalWarn.apply(console, args);
      };
      
      // Test rapid client creation attempts
      window.testRapidClientCreation = async function() {
        const { createClient } = await import('/lib/supabase/client.ts');
        
        for (let i = 0; i < 5; i++) {
          const start = Date.now();
          try {
            createClient();
            clientCreationTimes.push(Date.now() - start);
          } catch (error) {
            if (error.message.includes('rate limited')) {
              rateLimitWarnings.push({ error: error.message, timestamp: Date.now() });
            }
          }
          // Attempt rapid creation (faster than MIN_CREATION_INTERVAL)
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        return { clientCreationTimes, rateLimitWarnings };
      };
    `
    
    await page.addInitScript(testScript)
    await page.goto('/')
    
    const results = await page.evaluate(() => {
      // @ts-ignore - defined in test script
      return window.testRapidClientCreation()
    })
    
    console.log('Client creation times:', results.clientCreationTimes)
    console.log('Rate limit warnings:', results.rateLimitWarnings)
    
    // Verify rate limiting is working
    expect(results.rateLimitWarnings.length).toBeGreaterThan(0)
    
    // Verify some creation attempts were delayed/prevented
    const hasDelayedCreations = results.rateLimitWarnings.some(warning => 
      warning.message && warning.message.includes('Waiting')
    )
    expect(hasDelayedCreations).toBeTruthy()
  })

  test('API request throttling prevents overwhelming server', async ({ page }) => {
    let rateLimitHits = 0
    let successfulRequests = 0
    let totalRequestTime = 0
    
    // Monitor API responses
    page.on('response', response => {
      if (response.status() === 429) {
        rateLimitHits++
      } else if (response.status() < 400) {
        successfulRequests++
      }
    })
    
    await page.goto('/')
    
    // Test rapid API calls
    const apiTestScript = `
      window.testRapidAPICalls = async function() {
        const requests = [];
        const startTime = Date.now();
        
        // Make 20 rapid API calls
        for (let i = 0; i < 20; i++) {
          requests.push(
            fetch('/api/supabase-diagnostics')
              .then(r => ({ status: r.status, timestamp: Date.now() }))
              .catch(e => ({ error: e.message, timestamp: Date.now() }))
          );
          
          // Very rapid fire (faster than throttle limit)
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        
        const results = await Promise.all(requests);
        return {
          results,
          totalTime: Date.now() - startTime,
          rateLimitHits: results.filter(r => r.status === 429).length,
          successfulRequests: results.filter(r => r.status && r.status < 400).length
        };
      };
    `
    
    await page.addInitScript(apiTestScript)
    await page.reload()
    
    const apiResults = await page.evaluate(() => {
      // @ts-ignore - defined in test script
      return window.testRapidAPICalls()
    })
    
    console.log('API test results:', apiResults)
    
    // Verify throttling is working - some requests should be delayed/rejected
    expect(apiResults.totalTime).toBeGreaterThan(500) // Should take time due to throttling
    
    // Most requests should succeed (throttling, not blocking)
    expect(apiResults.successfulRequests).toBeGreaterThan(10)
  })

  test('Rapid navigation does not trigger rate limits', async ({ page }) => {
    const navigationPaths = [
      '/',
      '/auth/login',
      '/dashboard',
      '/survey',
      '/admin',
      '/debug'
    ]
    
    let navigationErrors = 0
    let totalNavigationTime = 0
    
    // Monitor for errors during navigation
    page.on('pageerror', error => {
      if (error.message.includes('rate') || error.message.includes('limit')) {
        navigationErrors++
      }
    })
    
    const startTime = Date.now()
    
    // Rapid navigation test
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const path of navigationPaths) {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 5000 })
        await page.waitForTimeout(RATE_LIMIT_DELAYS.RAPID_NAV_THRESHOLD)
      }
    }
    
    totalNavigationTime = Date.now() - startTime
    
    console.log(`Rapid navigation completed in ${totalNavigationTime}ms`)
    console.log(`Navigation errors: ${navigationErrors}`)
    
    // Should not have rate limit errors during normal navigation
    expect(navigationErrors).toBe(0)
    
    // Should complete in reasonable time (not blocked by rate limits)
    expect(totalNavigationTime).toBeLessThan(30000) // 30 seconds max
  })

  test('Exponential backoff handles rate limit scenarios', async ({ page }) => {
    const backoffTestScript = `
      window.testExponentialBackoff = async function() {
        const { TestRateLimitHandler } = await import('/lib/test-utils/rate-limit-handler.ts');
        
        const handler = new TestRateLimitHandler({
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 5000,
          backoffMultiplier: 2
        });
        
        let attempts = 0;
        let retryDelays = [];
        let succeeded = false;
        
        try {
          await handler.executeWithRetry(async () => {
            attempts++;
            if (attempts < 3) {
              const error = new Error('Rate limit exceeded');
              error.status = 429;
              throw error;
            }
            succeeded = true;
            return 'success';
          }, { identifier: 'backoff-test' });
        } catch (error) {
          console.log('Final error after retries:', error.message);
        }
        
        return { attempts, succeeded, config: handler.getStats().config };
      };
    `
    
    await page.addInitScript(backoffTestScript)
    await page.goto('/')
    
    const backoffResults = await page.evaluate(() => {
      // @ts-ignore - defined in test script
      return window.testExponentialBackoff()
    })
    
    console.log('Exponential backoff results:', backoffResults)
    
    // Should have made multiple attempts
    expect(backoffResults.attempts).toBeGreaterThan(1)
    
    // Should eventually succeed after retries
    expect(backoffResults.succeeded).toBeTruthy()
  })

  test('Bundle size and code splitting verification', async ({ page }) => {
    // Track resource loading
    const resources: Array<{ url: string, size: number, type: string }> = []
    
    page.on('response', async (response) => {
      const url = response.url()
      const contentLength = response.headers()['content-length']
      const size = contentLength ? parseInt(contentLength) : 0
      
      if (url.includes('_next/static') || url.includes('.js') || url.includes('.css')) {
        resources.push({
          url: url.split('/').pop() || url,
          size,
          type: response.headers()['content-type'] || 'unknown'
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Analyze bundle sizes
    const jsFiles = resources.filter(r => r.url.endsWith('.js'))
    const cssFiles = resources.filter(r => r.url.endsWith('.css'))
    
    const totalJSSize = jsFiles.reduce((sum, file) => sum + file.size, 0)
    const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.size, 0)
    
    console.log('JavaScript files:', jsFiles.length, 'Total size:', totalJSSize, 'bytes')
    console.log('CSS files:', cssFiles.length, 'Total size:', totalCSSSize, 'bytes')
    console.log('Resources loaded:', resources.map(r => `${r.url} (${r.size} bytes)`))
    
    // Bundle size assertions (reasonable limits)
    expect(totalJSSize).toBeLessThan(5 * 1024 * 1024) // 5MB max for JS
    expect(totalCSSSize).toBeLessThan(1 * 1024 * 1024) // 1MB max for CSS
    
    // Should have code splitting (multiple JS files)
    expect(jsFiles.length).toBeGreaterThan(1)
    
    // Main bundle shouldn't be too large
    const mainBundle = jsFiles.find(f => f.url.includes('main') || f.url.includes('app'))
    if (mainBundle) {
      expect(mainBundle.size).toBeLessThan(2 * 1024 * 1024) // 2MB max for main bundle
    }
  })

  test('Memory leak detection in animations', async ({ page }) => {
    // Monitor memory usage during animations
    const memoryMeasurement = async () => {
      return await page.evaluate(() => {
        // @ts-ignore - performance.memory is available in Chrome
        if (window.performance && window.performance.memory) {
          return {
            usedJSHeapSize: window.performance.memory.usedJSHeapSize,
            totalJSHeapSize: window.performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
          }
        }
        return null
      })
    }
    
    await page.goto('/visual-story-demo') // Page with animations
    
    const initialMemory = await memoryMeasurement()
    
    // Trigger animations repeatedly
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="animation-trigger"]').catch(() => {
        // Button might not exist, continue test
      })
      await page.waitForTimeout(100)
      
      // Force garbage collection if available
      await page.evaluate(() => {
        // @ts-ignore
        if (window.gc) window.gc()
      })
    }
    
    const finalMemory = await memoryMeasurement()
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100
      
      console.log('Initial memory:', initialMemory.usedJSHeapSize, 'bytes')
      console.log('Final memory:', finalMemory.usedJSHeapSize, 'bytes')
      console.log('Memory increase:', memoryIncrease, 'bytes', `(${memoryIncreasePercent.toFixed(2)}%)`)
      
      // Memory should not increase dramatically (potential leak indicator)
      expect(memoryIncreasePercent).toBeLessThan(50) // Less than 50% increase
      
      // Should not exceed reasonable memory usage
      expect(finalMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024) // 100MB limit
    } else {
      console.log('Memory measurement not available in this browser')
    }
  })
})