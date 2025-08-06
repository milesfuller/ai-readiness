/**
 * Performance Test: Bundle Size Analysis and Code Splitting
 * 
 * Tests bundle optimization, code splitting effectiveness, and loading performance
 */

import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

interface ResourceMetrics {
  url: string
  size: number
  type: string
  loadTime: number
  cached: boolean
}

interface BundleAnalysis {
  totalJS: number
  totalCSS: number
  totalAssets: number
  chunkCount: number
  largestChunk: ResourceMetrics | null
  duplicateResources: string[]
}

test.describe('Bundle Size and Code Splitting', () => {
  let resourceMetrics: ResourceMetrics[] = []
  
  test.beforeEach(async ({ page }) => {
    resourceMetrics = []
    
    // Track all resource loading
    page.on('response', async (response) => {
      const url = response.url()
      const startTime = Date.now()
      
      try {
        const headers = response.headers()
        const size = headers['content-length'] ? parseInt(headers['content-length']) : 0
        const cached = headers['cf-cache-status'] === 'HIT' || headers['cache-control']?.includes('max-age')
        
        if (url.includes('_next/static') || url.includes('.js') || url.includes('.css') || url.includes('.woff')) {
          resourceMetrics.push({
            url: url.split('/').pop() || url,
            size,
            type: headers['content-type'] || 'unknown',
            loadTime: Date.now() - startTime,
            cached
          })
        }
      } catch (error) {
        console.warn('Error tracking resource:', url, error)
      }
    })
  })

  test('Main bundle size is optimized', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const analysis = analyzeBundleMetrics(resourceMetrics)
    
    console.log('Bundle Analysis:', {
      totalJS: `${(analysis.totalJS / 1024 / 1024).toFixed(2)}MB`,
      totalCSS: `${(analysis.totalCSS / 1024).toFixed(2)}KB`,
      chunkCount: analysis.chunkCount,
      largestChunk: analysis.largestChunk?.url
    })
    
    // Bundle size limits
    expect(analysis.totalJS).toBeLessThan(5 * 1024 * 1024) // 5MB total JS
    expect(analysis.totalCSS).toBeLessThan(500 * 1024) // 500KB total CSS
    
    // Code splitting verification
    expect(analysis.chunkCount).toBeGreaterThan(2) // Should have multiple chunks
    
    // No single chunk should be too large
    if (analysis.largestChunk) {
      expect(analysis.largestChunk.size).toBeLessThan(2 * 1024 * 1024) // 2MB max per chunk
    }
    
    // Check for duplicate resources
    expect(analysis.duplicateResources).toEqual([])
  })

  test('Lazy loading reduces initial bundle size', async ({ page }) => {
    const initialMetrics: ResourceMetrics[] = []
    const lazyMetrics: ResourceMetrics[] = []
    
    // Capture initial load
    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('_next/static') && url.includes('.js')) {
        initialMetrics.push({
          url: url.split('/').pop() || url,
          size: parseInt(response.headers()['content-length'] || '0'),
          type: 'javascript',
          loadTime: 0,
          cached: false
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const initialBundleSize = initialMetrics.reduce((sum, m) => sum + m.size, 0)
    
    // Navigate to admin page (should trigger lazy loading)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    
    const totalMetrics = resourceMetrics.filter(m => m.type.includes('javascript'))
    const totalBundleSize = totalMetrics.reduce((sum, m) => sum + m.size, 0)
    
    console.log('Initial bundle:', `${(initialBundleSize / 1024 / 1024).toFixed(2)}MB`)
    console.log('Total after lazy load:', `${(totalBundleSize / 1024 / 1024).toFixed(2)}MB`)
    console.log('Lazy loaded:', `${((totalBundleSize - initialBundleSize) / 1024).toFixed(2)}KB`)
    
    // Initial bundle should be smaller than total
    expect(initialBundleSize).toBeLessThan(totalBundleSize)
    
    // Initial bundle should be reasonable size
    expect(initialBundleSize).toBeLessThan(3 * 1024 * 1024) // 3MB max initial
  })

  test('Critical CSS is inlined for fast rendering', async ({ page }) => {
    const paintTimings: { [key: string]: number } = {}
    
    // Monitor paint timings
    page.on('load', async () => {
      const timings = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart
        }
      })
      
      Object.assign(paintTimings, timings)
    })
    
    await page.goto('/')
    await page.waitForLoadState('load')
    
    console.log('Paint Timings:', paintTimings)
    
    // Critical rendering performance
    expect(paintTimings.firstContentfulPaint).toBeLessThan(2000) // FCP < 2s
    expect(paintTimings.domContentLoaded).toBeLessThan(3000) // DCL < 3s
    
    // Check for inline CSS
    const inlineStylesCount = await page.evaluate(() => {
      return document.querySelectorAll('style').length
    })
    
    expect(inlineStylesCount).toBeGreaterThan(0) // Should have some inline critical CSS
  })

  test('Tree shaking eliminates unused code', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    
    // Check for common libraries that might not be tree-shaken
    const bundleContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      return Promise.all(
        scripts.map(async (script: HTMLScriptElement) => {
          if (script.src.includes('_next/static')) {
            try {
              const response = await fetch(script.src)
              return {
                url: script.src.split('/').pop(),
                content: await response.text()
              }
            } catch {
              return { url: script.src, content: '' }
            }
          }
          return { url: '', content: '' }
        })
      )
    })
    
    const allBundleCode = bundleContent.map(b => b.content).join('')
    
    // Check that unused lodash functions are not included
    const lodashFunctions = [
      'debounce', 'throttle', 'cloneDeep', 'merge', 'pick', 'omit'
    ]
    
    const unusedLodashFunctions = lodashFunctions.filter(fn => {
      const isUsed = allBundleCode.includes(`_.${fn}`) || allBundleCode.includes(`lodash.${fn}`)
      return !isUsed
    })
    
    console.log('Bundle files analyzed:', bundleContent.length)
    console.log('Total bundle size:', allBundleCode.length, 'chars')
    console.log('Unused lodash functions:', unusedLodashFunctions)
    
    // Should not include all lodash functions (tree shaking working)
    expect(unusedLodashFunctions.length).toBeGreaterThan(0)
    
    // Check for specific unused patterns
    expect(allBundleCode).not.toContain('__webpack_unused_export__')
  })

  test('Font optimization reduces loading time', async ({ page }) => {
    const fontMetrics: ResourceMetrics[] = []
    
    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf')) {
        fontMetrics.push({
          url: url.split('/').pop() || url,
          size: parseInt(response.headers()['content-length'] || '0'),
          type: 'font',
          loadTime: 0,
          cached: response.headers()['cache-control']?.includes('max-age') || false
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const totalFontSize = fontMetrics.reduce((sum, f) => sum + f.size, 0)
    
    console.log('Font files:', fontMetrics.map(f => `${f.url} (${(f.size / 1024).toFixed(1)}KB)`))
    console.log('Total font size:', `${(totalFontSize / 1024).toFixed(1)}KB`)
    
    // Font optimization checks
    expect(totalFontSize).toBeLessThan(500 * 1024) // 500KB total fonts
    expect(fontMetrics.length).toBeLessThan(10) // Not too many font files
    
    // Prefer WOFF2 format
    const woff2Count = fontMetrics.filter(f => f.url.includes('.woff2')).length
    const totalFontCount = fontMetrics.length
    
    if (totalFontCount > 0) {
      expect(woff2Count / totalFontCount).toBeGreaterThan(0.5) // At least 50% WOFF2
    }
    
    // Check font display strategy
    const fontFaces = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets)
      const fontFaceRules: string[] = []
      
      styles.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || [])
          rules.forEach((rule: CSSRule) => {
            if (rule.type === CSSRule.FONT_FACE_RULE) {
              fontFaceRules.push((rule as CSSFontFaceRule).cssText)
            }
          })
        } catch (e) {
          // Cross-origin stylesheets
        }
      })
      
      return fontFaceRules
    })
    
    // Should use font-display for better loading performance
    const hasOptimizedFontDisplay = fontFaces.some(rule => 
      rule.includes('font-display: swap') || 
      rule.includes('font-display: fallback') ||
      rule.includes('font-display: optional')
    )
    
    if (fontFaces.length > 0) {
      expect(hasOptimizedFontDisplay).toBeTruthy()
    }
  })

  test('Image optimization and lazy loading', async ({ page }) => {
    const imageMetrics: Array<{
      url: string
      size: number
      format: string
      loading: 'lazy' | 'eager' | 'auto'
      optimized: boolean
    }> = []
    
    await page.goto('/')
    
    // Analyze all images
    const images = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.map(img => ({
        src: img.src,
        loading: img.loading as 'lazy' | 'eager' | 'auto',
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight
      }))
    })
    
    for (const img of images) {
      try {
        const response = await page.request.get(img.src)
        const size = parseInt(response.headers()['content-length'] || '0')
        const format = img.src.split('.').pop()?.toLowerCase() || 'unknown'
        
        imageMetrics.push({
          url: img.src.split('/').pop() || img.src,
          size,
          format,
          loading: img.loading,
          optimized: format === 'webp' || format === 'avif'
        })
      } catch (error) {
        console.warn('Error analyzing image:', img.src)
      }
    }
    
    console.log('Image analysis:', imageMetrics)
    
    const totalImageSize = imageMetrics.reduce((sum, img) => sum + img.size, 0)
    const lazyLoadedCount = imageMetrics.filter(img => img.loading === 'lazy').length
    const optimizedCount = imageMetrics.filter(img => img.optimized).length
    
    console.log('Total image size:', `${(totalImageSize / 1024).toFixed(1)}KB`)
    console.log('Lazy loaded images:', `${lazyLoadedCount}/${imageMetrics.length}`)
    console.log('Modern format images:', `${optimizedCount}/${imageMetrics.length}`)
    
    // Image optimization assertions
    if (imageMetrics.length > 0) {
      expect(totalImageSize).toBeLessThan(2 * 1024 * 1024) // 2MB total images
      expect(lazyLoadedCount / imageMetrics.length).toBeGreaterThan(0.5) // 50%+ lazy loaded
      
      // Should use modern formats where possible
      if (imageMetrics.length > 3) {
        expect(optimizedCount).toBeGreaterThan(0)
      }
    }
  })
})

function analyzeBundleMetrics(metrics: ResourceMetrics[]): BundleAnalysis {
  const jsFiles = metrics.filter(m => m.type.includes('javascript') || m.url.endsWith('.js'))
  const cssFiles = metrics.filter(m => m.type.includes('css') || m.url.endsWith('.css'))
  
  const totalJS = jsFiles.reduce((sum, f) => sum + f.size, 0)
  const totalCSS = cssFiles.reduce((sum, f) => sum + f.size, 0)
  const totalAssets = metrics.reduce((sum, f) => sum + f.size, 0)
  
  // Find largest chunk
  const largestChunk = jsFiles.reduce((largest, current) => 
    current.size > (largest?.size || 0) ? current : largest
  , null as ResourceMetrics | null)
  
  // Find duplicate resources (same name, different hash)
  const resourceNames = metrics.map(m => m.url.replace(/\.[a-f0-9]+\./, '.'))
  const duplicates = resourceNames.filter((name, index) => 
    resourceNames.indexOf(name) !== index
  )
  
  return {
    totalJS,
    totalCSS,
    totalAssets,
    chunkCount: jsFiles.length,
    largestChunk,
    duplicateResources: [...new Set(duplicates)]
  }
}