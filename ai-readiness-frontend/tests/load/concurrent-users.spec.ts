/**
 * Load Test: Concurrent Users and System Stress
 * 
 * Tests application behavior under load with multiple concurrent users
 * simulating real-world usage patterns and stress scenarios.
 */

import { test, expect } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'

interface UserSession {
  context: BrowserContext
  page: Page
  userId: string
  actions: string[]
  errors: Array<{ time: number; error: string }>
  responseTime: number[]
}

interface LoadTestResults {
  totalUsers: number
  successfulSessions: number
  failedSessions: number
  averageResponseTime: number
  maxResponseTime: number
  errorRate: number
  throughput: number
  concurrentPeakTime: number
}

test.describe('Concurrent Users Load Testing', () => {
  test('System handles 10 concurrent users performing authentication', async ({ browser }) => {
    const CONCURRENT_USERS = 10
    const TEST_DURATION = 60000 // 60 seconds
    
    const userSessions: UserSession[] = []
    const startTime = Date.now()
    
    console.log(`Starting load test with ${CONCURRENT_USERS} concurrent users...`)
    
    // Create concurrent user sessions
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      const session: UserSession = {
        context,
        page,
        userId: `user_${i.toString().padStart(2, '0')}`,
        actions: [],
        errors: [],
        responseTime: []
      }
      
      // Monitor page errors
      page.on('pageerror', (error) => {
        session.errors.push({
          time: Date.now() - startTime,
          error: error.message
        })
      })
      
      // Monitor network responses for timing
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          const timing = response.timing()
          if (timing) {
            session.responseTime.push(timing.responseEnd - timing.responseStart)
          }
        }
      })
      
      userSessions.push(session)
    }
    
    // Execute concurrent user scenarios
    const userScenarios = userSessions.map(async (session, index) => {
      const actionDelay = Math.random() * 1000 + 500 // Random delay 500-1500ms
      
      try {
        // Scenario 1: Authentication flow
        await session.page.goto('/auth/login')
        session.actions.push('navigate_to_login')
        await session.page.waitForTimeout(actionDelay)
        
        // Simulate login form interaction
        await session.page.fill('input[type="email"]', `user${index}@test.com`)
        await session.page.fill('input[type="password"]', 'password123')
        session.actions.push('fill_login_form')
        await session.page.waitForTimeout(actionDelay)
        
        // Navigate to dashboard
        await session.page.goto('/dashboard')
        session.actions.push('navigate_to_dashboard')
        await session.page.waitForTimeout(actionDelay)
        
        // Perform dashboard actions
        await session.page.click('[data-testid="nav-item"]').catch(() => {})
        session.actions.push('dashboard_interaction')
        await session.page.waitForTimeout(actionDelay)
        
        // Survey interaction
        await session.page.goto('/survey')
        session.actions.push('navigate_to_survey')
        await session.page.waitForTimeout(actionDelay)
        
        // Simulate survey form interaction
        await session.page.click('button').catch(() => {})
        session.actions.push('survey_interaction')
        
      } catch (error) {
        session.errors.push({
          time: Date.now() - startTime,
          error: `Scenario error: ${error.message}`
        })
      }
    })
    
    // Wait for all concurrent scenarios to complete
    await Promise.allSettled(userScenarios)
    
    const endTime = Date.now()
    const totalTestTime = endTime - startTime
    
    // Analyze results
    const results = analyzeLoadTestResults(userSessions, totalTestTime)
    
    console.log('Load Test Results:', {
      duration: `${(totalTestTime / 1000).toFixed(1)}s`,
      totalUsers: results.totalUsers,
      successfulSessions: results.successfulSessions,
      failedSessions: results.failedSessions,
      errorRate: `${(results.errorRate * 100).toFixed(2)}%`,
      avgResponseTime: `${results.averageResponseTime.toFixed(0)}ms`,
      maxResponseTime: `${results.maxResponseTime.toFixed(0)}ms`,
      throughput: `${results.throughput.toFixed(1)} actions/sec`
    })
    
    // Load test assertions
    expect(results.errorRate).toBeLessThan(0.1) // <10% error rate
    expect(results.successfulSessions).toBeGreaterThan(CONCURRENT_USERS * 0.8) // >80% successful sessions
    expect(results.averageResponseTime).toBeLessThan(2000) // <2s average response time
    expect(results.maxResponseTime).toBeLessThan(5000) // <5s max response time
    
    // Cleanup
    for (const session of userSessions) {
      await session.context.close()
    }
  })

  test('Database connection pool handles concurrent requests', async ({ browser }) => {
    const CONCURRENT_REQUESTS = 20
    const API_ENDPOINTS = [
      '/api/supabase-diagnostics',
      '/api/test-auth',
      '/api/debug-auth'
    ]
    
    console.log(`Testing database connection pool with ${CONCURRENT_REQUESTS} concurrent requests...`)
    
    const context = await browser.newContext()
    const page = await context.newPage()
    
    const requestResults: Array<{
      endpoint: string
      status: number
      responseTime: number
      error?: string
    }> = []
    
    // Monitor all responses
    page.on('response', (response) => {
      const url = response.url()
      if (API_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
        requestResults.push({
          endpoint: url.split('/').pop() || url,
          status: response.status(),
          responseTime: response.timing()?.responseEnd - response.timing()?.responseStart || 0
        })
      }
    })
    
    await page.goto('/')
    
    // Execute concurrent API requests
    const concurrentRequests = []
    
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      const endpoint = API_ENDPOINTS[i % API_ENDPOINTS.length]
      
      const requestPromise = page.evaluate(async (apiEndpoint) => {
        const startTime = Date.now()
        try {
          const response = await fetch(apiEndpoint)
          return {
            endpoint: apiEndpoint,
            status: response.status,
            responseTime: Date.now() - startTime,
            success: response.ok
          }
        } catch (error) {
          return {
            endpoint: apiEndpoint,
            status: 0,
            responseTime: Date.now() - startTime,
            success: false,
            error: error.message
          }
        }
      }, endpoint)
      
      concurrentRequests.push(requestPromise)
      
      // Stagger requests slightly to simulate real load
      await page.waitForTimeout(10)
    }
    
    const apiResults = await Promise.allSettled(concurrentRequests)
    const successfulRequests = apiResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length
    
    const failedRequests = apiResults.length - successfulRequests
    const averageResponseTime = requestResults.reduce((sum, r) => sum + r.responseTime, 0) / requestResults.length
    const maxResponseTime = Math.max(...requestResults.map(r => r.responseTime))
    
    console.log('Database Connection Pool Results:', {
      totalRequests: CONCURRENT_REQUESTS,
      successful: successfulRequests,
      failed: failedRequests,
      successRate: `${(successfulRequests / CONCURRENT_REQUESTS * 100).toFixed(1)}%`,
      avgResponseTime: `${averageResponseTime.toFixed(0)}ms`,
      maxResponseTime: `${maxResponseTime.toFixed(0)}ms`
    })
    
    // Connection pool assertions
    expect(successfulRequests / CONCURRENT_REQUESTS).toBeGreaterThan(0.9) // >90% success rate
    expect(averageResponseTime).toBeLessThan(3000) // <3s average response
    expect(failedRequests).toBeLessThan(3) // <3 failed requests
    
    await context.close()
  })

  test('Rate limiting handles burst traffic appropriately', async ({ browser }) => {
    const BURST_SIZE = 50
    const BURST_INTERVAL = 100 // 100ms between bursts
    
    console.log(`Testing rate limiting with burst traffic: ${BURST_SIZE} requests...`)
    
    const context = await browser.newContext()
    const page = await context.newPage()
    
    let rateLimitedRequests = 0
    let successfulRequests = 0
    let serverErrors = 0
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const status = response.status()
        if (status === 429) rateLimitedRequests++
        else if (status < 400) successfulRequests++
        else if (status >= 500) serverErrors++
      }
    })
    
    await page.goto('/')
    
    // Execute burst traffic
    const burstPromises = []
    
    for (let i = 0; i < BURST_SIZE; i++) {
      const requestPromise = page.evaluate(async () => {
        try {
          const response = await fetch('/api/supabase-diagnostics')
          return { status: response.status, timestamp: Date.now() }
        } catch (error) {
          return { status: 0, error: error.message, timestamp: Date.now() }
        }
      })
      
      burstPromises.push(requestPromise)
      
      // Small delay to create burst pattern
      if (i % 10 === 0 && i > 0) {
        await page.waitForTimeout(BURST_INTERVAL)
      }
    }
    
    await Promise.allSettled(burstPromises)
    
    console.log('Rate Limiting Burst Test Results:', {
      totalRequests: BURST_SIZE,
      successful: successfulRequests,
      rateLimited: rateLimitedRequests,
      serverErrors: serverErrors,
      rateLimitingEffective: rateLimitedRequests > 0
    })
    
    // Rate limiting should be working but not blocking all traffic
    expect(serverErrors).toBeLessThan(5) // <5 server errors
    expect(successfulRequests).toBeGreaterThan(BURST_SIZE * 0.3) // >30% should succeed
    
    // If rate limiting is enabled, should see some 429s
    if (rateLimitedRequests > 0) {
      expect(rateLimitedRequests).toBeLessThan(BURST_SIZE * 0.7) // <70% rate limited
      console.log('✅ Rate limiting is working effectively')
    } else {
      console.log('ℹ️ Rate limiting may be disabled or very permissive')
    }
    
    await context.close()
  })

  test('Memory usage remains stable under load', async ({ browser }) => {
    const LOAD_CYCLES = 20
    const ACTIONS_PER_CYCLE = 10
    
    console.log(`Testing memory stability with ${LOAD_CYCLES} load cycles...`)
    
    const context = await browser.newContext()
    const page = await context.newPage()
    
    const memoryMeasurements: Array<{ cycle: number; heapSize: number; timestamp: number }> = []
    
    const measureMemory = async (cycle: number) => {
      const memory = await page.evaluate(() => {
        // Force garbage collection if available
        // @ts-ignore
        if (window.gc) window.gc()
        
        // @ts-ignore
        if (window.performance && window.performance.memory) {
          return window.performance.memory.usedJSHeapSize
        }
        return 0
      })
      
      if (memory > 0) {
        memoryMeasurements.push({
          cycle,
          heapSize: memory,
          timestamp: Date.now()
        })
      }
    }
    
    await page.goto('/')
    await measureMemory(0)
    
    // Execute load cycles
    for (let cycle = 1; cycle <= LOAD_CYCLES; cycle++) {
      // Simulate user actions that might cause memory leaks
      for (let action = 0; action < ACTIONS_PER_CYCLE; action++) {
        await page.goto('/')
        await page.goto('/dashboard')
        await page.goto('/survey')
        await page.evaluate(() => {
          // Create and remove DOM elements
          const elements = []
          for (let i = 0; i < 100; i++) {
            const div = document.createElement('div')
            div.innerHTML = `<span>Test ${i}</span>`
            document.body.appendChild(div)
            elements.push(div)
          }
          elements.forEach(el => document.body.removeChild(el))
        })
        await page.waitForTimeout(50)
      }
      
      await measureMemory(cycle)
      console.log(`Cycle ${cycle}/${LOAD_CYCLES} completed`)
    }
    
    if (memoryMeasurements.length > 2) {
      const initialMemory = memoryMeasurements[0].heapSize
      const finalMemory = memoryMeasurements[memoryMeasurements.length - 1].heapSize
      const maxMemory = Math.max(...memoryMeasurements.map(m => m.heapSize))
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory) * 100
      
      console.log('Memory Stability Analysis:', {
        initialMemory: `${(initialMemory / 1024 / 1024).toFixed(1)}MB`,
        finalMemory: `${(finalMemory / 1024 / 1024).toFixed(1)}MB`,
        maxMemory: `${(maxMemory / 1024 / 1024).toFixed(1)}MB`,
        memoryIncrease: `${memoryIncrease.toFixed(1)}%`,
        measurements: memoryMeasurements.length
      })
      
      // Memory stability assertions
      expect(memoryIncrease).toBeLessThan(200) // <200% memory increase
      expect(maxMemory).toBeLessThan(200 * 1024 * 1024) // <200MB max memory
      expect(finalMemory / initialMemory).toBeLessThan(3) // <3x memory growth
    } else {
      console.log('Memory measurement not available in this browser')
    }
    
    await context.close()
  })
})

function analyzeLoadTestResults(sessions: UserSession[], totalTime: number): LoadTestResults {
  const totalUsers = sessions.length
  const successfulSessions = sessions.filter(s => s.errors.length === 0).length
  const failedSessions = totalUsers - successfulSessions
  
  const allResponseTimes = sessions.flatMap(s => s.responseTime)
  const averageResponseTime = allResponseTimes.length > 0 
    ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length 
    : 0
  const maxResponseTime = allResponseTimes.length > 0 
    ? Math.max(...allResponseTimes) 
    : 0
  
  const totalErrors = sessions.reduce((sum, s) => sum + s.errors.length, 0)
  const totalActions = sessions.reduce((sum, s) => sum + s.actions.length, 0)
  
  const errorRate = totalActions > 0 ? totalErrors / totalActions : 0
  const throughput = totalActions / (totalTime / 1000) // actions per second
  
  return {
    totalUsers,
    successfulSessions,
    failedSessions,
    averageResponseTime,
    maxResponseTime,
    errorRate,
    throughput,
    concurrentPeakTime: totalTime
  }
}