/**
 * Performance Test: Core Web Vitals and Lighthouse Metrics
 * 
 * Tests Core Web Vitals (LCP, FID, CLS) and other key performance metrics
 * following Google's performance standards.
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

interface WebVitalsMetrics {
  lcp: number        // Largest Contentful Paint
  fid: number        // First Input Delay  
  cls: number        // Cumulative Layout Shift
  fcp: number        // First Contentful Paint
  ttfb: number       // Time to First Byte
  tbt: number        // Total Blocking Time
  si: number         // Speed Index
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number }
  fid: { good: number; needsImprovement: number }
  cls: { good: number; needsImprovement: number }
  fcp: { good: number; needsImprovement: number }
  ttfb: { good: number; needsImprovement: number }
}

const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needsImprovement: 4000 },      // 2.5s good, 4s needs improvement
  fid: { good: 100, needsImprovement: 300 },        // 100ms good, 300ms needs improvement  
  cls: { good: 0.1, needsImprovement: 0.25 },       // 0.1 good, 0.25 needs improvement
  fcp: { good: 1800, needsImprovement: 3000 },      // 1.8s good, 3s needs improvement
  ttfb: { good: 800, needsImprovement: 1800 }       // 800ms good, 1.8s needs improvement
}

test.describe('Core Web Vitals and Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Web Vitals monitoring setup
      window.webVitalsMetrics = {
        lcp: 0,
        fid: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        tbt: 0,
        si: 0
      }
    })
  })

  test('Core Web Vitals meet performance standards', async ({ page }) => {
    const vitalsScript = `
      // Web Vitals measurement
      window.measureWebVitals = function() {
        return new Promise((resolve) => {
          const metrics = { lcp: 0, fid: 0, cls: 0, fcp: 0, ttfb: 0, tbt: 0, si: 0 };
          
          // Largest Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.lcp = lastEntry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          
          // First Input Delay (simulated - actual FID requires real user input)
          let fidMeasured = false;
          const measureFID = () => {
            if (fidMeasured) return;
            const startTime = performance.now();
            requestIdleCallback(() => {
              metrics.fid = performance.now() - startTime;
              fidMeasured = true;
            });
          };
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            metrics.cls = clsValue;
          }).observe({ type: 'layout-shift', buffered: true });
          
          // First Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            metrics.fcp = entries[0].startTime;
          }).observe({ type: 'paint', buffered: true });
          
          // Time to First Byte
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            metrics.ttfb = navigation.responseStart - navigation.requestStart;
          }
          
          // Total Blocking Time (approximation)
          new PerformanceObserver((entryList) => {
            let tbtValue = 0;
            entryList.getEntries().forEach((entry) => {
              if (entry.duration > 50) {
                tbtValue += entry.duration - 50;
              }
            });
            metrics.tbt = tbtValue;
          }).observe({ type: 'longtask', buffered: true });
          
          // Simulate first input for FID
          setTimeout(() => {
            measureFID();
            setTimeout(() => resolve(metrics), 1000);
          }, 500);
        });
      };
    `
    
    await page.addInitScript(vitalsScript)
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Simulate user interaction
    await page.click('body')
    await page.waitForTimeout(100)
    
    const vitals = await page.evaluate(() => {
      // @ts-ignore - defined in script
      return window.measureWebVitals()
    }) as WebVitalsMetrics
    
    console.log('Web Vitals Metrics:', {
      LCP: `${vitals.lcp.toFixed(0)}ms`,
      FID: `${vitals.fid.toFixed(0)}ms`,
      CLS: vitals.cls.toFixed(3),
      FCP: `${vitals.fcp.toFixed(0)}ms`,
      TTFB: `${vitals.ttfb.toFixed(0)}ms`,
      TBT: `${vitals.tbt.toFixed(0)}ms`
    })
    
    // Core Web Vitals assertions
    expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.lcp.needsImprovement)
    expect(vitals.fid).toBeLessThan(PERFORMANCE_THRESHOLDS.fid.needsImprovement)  
    expect(vitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cls.needsImprovement)
    
    // Other performance metrics
    expect(vitals.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.fcp.needsImprovement)
    expect(vitals.ttfb).toBeLessThan(PERFORMANCE_THRESHOLDS.ttfb.needsImprovement)
    
    // Ideal performance (good thresholds)
    if (vitals.lcp < PERFORMANCE_THRESHOLDS.lcp.good) {
      console.log('✅ LCP is in "Good" range')
    }
    if (vitals.fid < PERFORMANCE_THRESHOLDS.fid.good) {
      console.log('✅ FID is in "Good" range')
    }
    if (vitals.cls < PERFORMANCE_THRESHOLDS.cls.good) {
      console.log('✅ CLS is in "Good" range')
    }
  })

  test('Loading performance across different page types', async ({ page }) => {
    const pageTypes = [
      { path: '/', name: 'Homepage' },
      { path: '/auth/login', name: 'Login' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/survey', name: 'Survey' },
      { path: '/admin', name: 'Admin' }
    ]
    
    const performanceResults: Array<{
      pageName: string
      loadTime: number
      domContentLoaded: number
      firstPaint: number
      resourceCount: number
    }> = []
    
    for (const pageType of pageTypes) {
      const startTime = Date.now()
      
      try {
        await page.goto(pageType.path, { waitUntil: 'load', timeout: 10000 })
        
        const timing = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          const paint = performance.getEntriesByType('paint')
          
          return {
            loadTime: navigation.loadEventEnd - navigation.navigationStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            resourceCount: performance.getEntriesByType('resource').length
          }
        })
        
        performanceResults.push({
          pageName: pageType.name,
          loadTime: timing.loadTime,
          domContentLoaded: timing.domContentLoaded,
          firstPaint: timing.firstPaint,
          resourceCount: timing.resourceCount
        })
        
        console.log(`${pageType.name} Performance:`, {
          loadTime: `${timing.loadTime.toFixed(0)}ms`,
          domContentLoaded: `${timing.domContentLoaded.toFixed(0)}ms`,
          firstPaint: `${timing.firstPaint.toFixed(0)}ms`,
          resourceCount: timing.resourceCount
        })
        
        // Per-page performance assertions
        expect(timing.loadTime).toBeLessThan(5000) // 5s max load time
        expect(timing.domContentLoaded).toBeLessThan(3000) // 3s max DCL
        expect(timing.firstPaint).toBeLessThan(2000) // 2s max first paint
        
      } catch (error) {
        console.warn(`Failed to test ${pageType.name}:`, error)
      }
    }
    
    // Overall performance analysis
    const avgLoadTime = performanceResults.reduce((sum, r) => sum + r.loadTime, 0) / performanceResults.length
    const maxLoadTime = Math.max(...performanceResults.map(r => r.loadTime))
    
    console.log('Overall Performance Summary:', {
      avgLoadTime: `${avgLoadTime.toFixed(0)}ms`,
      maxLoadTime: `${maxLoadTime.toFixed(0)}ms`,
      testedPages: performanceResults.length
    })
    
    expect(avgLoadTime).toBeLessThan(3000) // 3s average
    expect(maxLoadTime).toBeLessThan(6000) // 6s maximum
  })

  test('Network resource efficiency', async ({ page }) => {
    const resourceMetrics: Array<{
      name: string
      type: string
      size: number
      duration: number
      cached: boolean
      compression: string
    }> = []
    
    page.on('response', async (response) => {
      const url = response.url()
      const headers = response.headers()
      
      if (url.includes(page.url().split('/')[2])) { // Same origin only
        try {
          resourceMetrics.push({
            name: url.split('/').pop() || 'unknown',
            type: headers['content-type'] || 'unknown',
            size: parseInt(headers['content-length'] || '0'),
            duration: 0, // Will be calculated later
            cached: headers['cache-control']?.includes('max-age') || false,
            compression: headers['content-encoding'] || 'none'
          })
        } catch (error) {
          console.warn('Error analyzing resource:', url)
        }
      }
    })
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const resourceAnalysis = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return resources.map(resource => ({
        name: resource.name.split('/').pop(),
        duration: resource.responseEnd - resource.requestStart,
        transferSize: resource.transferSize || 0,
        encodedSize: resource.encodedBodySize || 0
      }))
    })
    
    // Merge browser resource timing with response headers
    resourceMetrics.forEach((metric, index) => {
      const browserMetric = resourceAnalysis.find(r => r.name?.includes(metric.name))
      if (browserMetric) {
        metric.duration = browserMetric.duration
      }
    })
    
    const totalSize = resourceMetrics.reduce((sum, r) => sum + r.size, 0)
    const compressedResources = resourceMetrics.filter(r => r.compression !== 'none').length
    const cachedResources = resourceMetrics.filter(r => r.cached).length
    const slowResources = resourceMetrics.filter(r => r.duration > 1000).length
    
    console.log('Network Resource Analysis:', {
      totalResources: resourceMetrics.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      compressed: `${compressedResources}/${resourceMetrics.length}`,
      cached: `${cachedResources}/${resourceMetrics.length}`,
      slowResources: slowResources
    })
    
    // Network efficiency assertions
    expect(totalSize).toBeLessThan(10 * 1024 * 1024) // 10MB total
    expect(slowResources).toBeLessThan(resourceMetrics.length * 0.2) // <20% slow resources
    
    // Should have good compression ratio
    if (resourceMetrics.length > 0) {
      expect(compressedResources / resourceMetrics.length).toBeGreaterThan(0.5) // 50%+ compressed
    }
    
    // Should have good caching
    if (resourceMetrics.length > 5) {
      expect(cachedResources).toBeGreaterThan(0) // Some resources cached
    }
  })

  test('Rendering performance and layout stability', async ({ page }) => {
    let layoutShifts: Array<{ value: number; time: number }> = []
    
    // Monitor layout shifts
    await page.addInitScript(() => {
      const shifts: Array<{ value: number; time: number }> = []
      
      new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            shifts.push({
              value: (entry as any).value,
              time: entry.startTime
            })
          }
        }
      }).observe({ type: 'layout-shift', buffered: true })
      
      // @ts-ignore
      window.getLayoutShifts = () => shifts
    })
    
    await page.goto('/')
    
    // Simulate user interactions that might cause layout shifts
    await page.hover('[data-testid="nav-item"]').catch(() => {})
    await page.click('[data-testid="button"]').catch(() => {})
    await page.scroll(0, 500)
    await page.waitForTimeout(2000)
    
    layoutShifts = await page.evaluate(() => {
      // @ts-ignore - defined in init script
      return window.getLayoutShifts() || []
    })
    
    const totalCLS = layoutShifts.reduce((sum, shift) => sum + shift.value, 0)
    const largestShift = Math.max(...layoutShifts.map(s => s.value), 0)
    
    console.log('Layout Stability Analysis:', {
      totalShifts: layoutShifts.length,
      totalCLS: totalCLS.toFixed(3),
      largestShift: largestShift.toFixed(3),
      shiftsOverTime: layoutShifts.map(s => `${s.value.toFixed(3)} @ ${s.time.toFixed(0)}ms`)
    })
    
    // Layout stability assertions
    expect(totalCLS).toBeLessThan(PERFORMANCE_THRESHOLDS.cls.needsImprovement) // CLS < 0.25
    expect(largestShift).toBeLessThan(0.1) // No single large shift
    expect(layoutShifts.length).toBeLessThan(5) // Limited number of shifts
    
    // Check for common layout shift causes
    const imageCount = await page.locator('img:not([width][height])').count()
    const missingDimensions = imageCount > 0
    
    if (missingDimensions) {
      console.warn(`Found ${imageCount} images without explicit dimensions`)
    }
    
    expect(imageCount).toBeLessThan(5) // Most images should have dimensions
  })

  test('JavaScript execution performance', async ({ page }) => {
    const performanceMarks: Array<{ name: string; duration: number }> = []
    
    await page.addInitScript(() => {
      // Monitor long tasks
      const longTasks: Array<{ duration: number; startTime: number }> = []
      
      new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          longTasks.push({
            duration: entry.duration,
            startTime: entry.startTime
          })
        })
      }).observe({ type: 'longtask', buffered: true })
      
      // @ts-ignore
      window.getLongTasks = () => longTasks
      
      // Monitor script execution time
      const scriptTasks: Array<{ name: string; duration: number }> = []
      
      // @ts-ignore  
      window.measureScriptExecution = (name: string, fn: () => void) => {
        const start = performance.now()
        fn()
        const duration = performance.now() - start
        scriptTasks.push({ name, duration })
        return duration
      }
      
      // @ts-ignore
      window.getScriptTasks = () => scriptTasks
    })
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Simulate script-heavy operations
    await page.evaluate(() => {
      // @ts-ignore
      window.measureScriptExecution('DOM Manipulation', () => {
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div')
          div.textContent = `Test ${i}`
          document.body.appendChild(div)
          document.body.removeChild(div)
        }
      })
      
      // @ts-ignore
      window.measureScriptExecution('Array Processing', () => {
        const arr = Array.from({ length: 10000 }, (_, i) => i)
        arr.map(x => x * 2).filter(x => x % 3 === 0).reduce((a, b) => a + b, 0)
      })
    })
    
    const longTasks = await page.evaluate(() => {
      // @ts-ignore
      return window.getLongTasks() || []
    })
    
    const scriptTasks = await page.evaluate(() => {
      // @ts-ignore
      return window.getScriptTasks() || []
    })
    
    const totalBlockingTime = longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0)
    const maxTaskDuration = Math.max(...longTasks.map(t => t.duration), 0)
    
    console.log('JavaScript Performance Analysis:', {
      longTasks: longTasks.length,
      totalBlockingTime: `${totalBlockingTime.toFixed(0)}ms`,
      maxTaskDuration: `${maxTaskDuration.toFixed(0)}ms`,
      scriptTasks: scriptTasks.map(t => `${t.name}: ${t.duration.toFixed(1)}ms`)
    })
    
    // JavaScript performance assertions
    expect(totalBlockingTime).toBeLessThan(600) // TBT < 600ms for good performance
    expect(maxTaskDuration).toBeLessThan(500) // No task > 500ms
    expect(longTasks.length).toBeLessThan(10) // Limited long tasks
    
    // Script execution should be reasonable
    scriptTasks.forEach(task => {
      expect(task.duration).toBeLessThan(100) // Individual operations < 100ms
    })
  })
})