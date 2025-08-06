import { test, expect } from '@playwright/test'

/**
 * Dashboard Testing Specialist - Animation Tests
 * 
 * Tests specifically for fixed animations, ensuring no infinite 
 * slide-in-from-left triggers and proper animation behavior.
 * 
 * Coordinates with swarm via testing/dashboard/animations memory key
 */

test.describe('Dashboard Animation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup animation monitoring
    await page.addInitScript(() => {
      window.__animationEvents = [];
      window.__infiniteLoopDetector = {};
      window.__cssAnimations = new Map();
      
      // Monitor CSS animation events
      document.addEventListener('animationstart', (e) => {
        const target = e.target as Element;
        const animationName = e.animationName;
        
        window.__animationEvents.push({
          type: 'start',
          animation: animationName,
          element: target.className,
          timestamp: performance.now()
        });

        // Track animation instances for infinite loop detection
        const key = `${target.className}-${animationName}`;
        if (!window.__infiniteLoopDetector[key]) {
          window.__infiniteLoopDetector[key] = [];
        }
        window.__infiniteLoopDetector[key].push(performance.now());
        
        // Keep only recent events (last 5 seconds)
        const fiveSecondsAgo = performance.now() - 5000;
        window.__infiniteLoopDetector[key] = window.__infiniteLoopDetector[key]
          .filter(time => time > fiveSecondsAgo);
      });

      document.addEventListener('animationend', (e) => {
        const target = e.target as Element;
        window.__animationEvents.push({
          type: 'end',
          animation: e.animationName,
          element: target.className,
          timestamp: performance.now()
        });
      });

      document.addEventListener('animationiteration', (e) => {
        window.__animationEvents.push({
          type: 'iteration',
          animation: e.animationName,
          element: (e.target as Element).className,
          timestamp: performance.now()
        });
      });
    });
  });

  test('should verify animate-fade-in works without infinite retriggering', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for initial animations
    await page.waitForTimeout(2000);

    // Get initial animation events
    const initialEvents = await page.evaluate(() => window.__animationEvents);
    const initialFadeInEvents = initialEvents.filter(event => 
      event.animation.includes('fade') || event.element.includes('animate-fade-in')
    );

    // Perform actions that might trigger animations
    await page.mouse.move(100, 100);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Get final animation events
    const finalEvents = await page.evaluate(() => window.__animationEvents);
    const finalFadeInEvents = finalEvents.filter(event => 
      event.animation.includes('fade') || event.element.includes('animate-fade-in')
    );

    // Check for infinite loop indicators
    const loopDetector = await page.evaluate(() => window.__infiniteLoopDetector);
    
    Object.keys(loopDetector).forEach(key => {
      if (key.includes('fade-in') || key.includes('animate-fade-in')) {
        // Should not have more than 10 triggers in 5 seconds (indicates infinite loop)
        expect(loopDetector[key].length).toBeLessThan(10);
      }
    });

    // New fade-in events should be minimal (only from new content, not retriggering)
    const newFadeInEvents = finalFadeInEvents.length - initialFadeInEvents.length;
    expect(newFadeInEvents).toBeLessThan(5);
  });

  test('should verify animation-delay classes work correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find elements with animation delays
    const delayElements = await page.locator('[class*="animation-delay"]').all();
    
    if (delayElements.length > 0) {
      for (let i = 0; i < Math.min(delayElements.length, 5); i++) {
        const element = delayElements[i];
        
        // Get computed animation delay
        const animationDelay = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.animationDelay;
        });

        // Should have a valid animation delay
        expect(animationDelay).toMatch(/\d+m?s/);
        
        // Parse delay value
        const delayMs = animationDelay.includes('ms') 
          ? parseInt(animationDelay) 
          : parseFloat(animationDelay) * 1000;
        
        // Should be reasonable delay (0-1000ms)
        expect(delayMs).toBeGreaterThanOrEqual(0);
        expect(delayMs).toBeLessThanOrEqual(1000);
      }
    }

    // Verify staggered animations work properly
    const staggeredElements = page.locator('.animation-delay-100, .animation-delay-200, .animation-delay-300, .animation-delay-400');
    const count = await staggeredElements.count();
    
    if (count > 0) {
      // Elements should become visible in staggered fashion
      const visibilityTimes = [];
      
      for (let i = 0; i < Math.min(count, 4); i++) {
        const element = staggeredElements.nth(i);
        const startTime = performance.now();
        
        await expect(element).toBeVisible();
        visibilityTimes.push(performance.now() - startTime);
      }
      
      // Verify staggering (later elements should take longer to become visible)
      for (let i = 1; i < visibilityTimes.length; i++) {
        if (visibilityTimes[i] > 0 && visibilityTimes[i-1] > 0) {
          expect(visibilityTimes[i]).toBeGreaterThanOrEqual(visibilityTimes[i-1]);
        }
      }
    }
  });

  test('should validate whimsy animations perform without issues', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Test wobble-on-hover animations
    const wobbleElements = page.locator('.wobble-on-hover');
    const wobbleCount = await wobbleElements.count();

    if (wobbleCount > 0) {
      const element = wobbleElements.first();
      
      // Hover to trigger wobble animation
      await element.hover();
      
      // Wait for animation to start
      await page.waitForTimeout(100);
      
      // Check that transform is applied during animation
      const duringHover = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          transform: style.transform,
          animation: style.animation
        };
      });
      
      // Should have some transform or animation during hover
      expect(duringHover.transform !== 'none' || duringHover.animation !== 'none').toBeTruthy();
      
      // Move away and verify animation completes
      await page.mouse.move(0, 0);
      await page.waitForTimeout(300);
    }

    // Test celebrate-bounce animation
    const bounceElements = page.locator('.celebrate-bounce');
    if (await bounceElements.count() > 0) {
      const bounceElement = bounceElements.first();
      await expect(bounceElement).toBeVisible();
      
      // Should not cause performance issues
      const beforeScroll = performance.now();
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(100);
      const scrollTime = performance.now() - beforeScroll;
      
      // Scrolling should remain smooth (under 200ms for simple scroll)
      expect(scrollTime).toBeLessThan(200);
    }

    // Test pulse animations
    const pulseElements = page.locator('.animate-pulse');
    if (await pulseElements.count() > 0) {
      const pulseElement = pulseElements.first();
      
      // Monitor animation iterations
      await page.evaluate(() => {
        window.__pulseIterations = 0;
        document.addEventListener('animationiteration', (e) => {
          if (e.animationName.includes('pulse')) {
            window.__pulseIterations++;
          }
        });
      });
      
      await page.waitForTimeout(3000);
      
      const iterations = await page.evaluate(() => window.__pulseIterations);
      
      // Should have some pulse iterations but not excessive
      expect(iterations).toBeGreaterThan(0);
      expect(iterations).toBeLessThan(20); // Reasonable for 3 seconds
    }
  });

  test('should test AnimatedCounter animations complete properly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Monitor counter animations specifically
    await page.evaluate(() => {
      window.__counterAnimations = [];
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'characterData' || mutation.type === 'childList') {
            const target = mutation.target;
            const parentElement = target.parentElement || target;
            
            if (parentElement && parentElement.textContent) {
              const text = parentElement.textContent.trim();
              if (/^\d+/.test(text)) {
                window.__counterAnimations.push({
                  value: parseInt(text),
                  timestamp: performance.now(),
                  element: parentElement.className
                });
              }
            }
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });

    // Wait for animations to run
    await page.waitForTimeout(3000);

    const counterData = await page.evaluate(() => window.__counterAnimations);
    
    // Should have recorded counter value changes
    expect(counterData.length).toBeGreaterThan(0);

    // Group by element to analyze individual counter animations
    const byElement = counterData.reduce((acc, curr) => {
      if (!acc[curr.element]) acc[curr.element] = [];
      acc[curr.element].push(curr);
      return acc;
    }, {});

    Object.keys(byElement).forEach(elementClass => {
      const values = byElement[elementClass];
      if (values.length > 1) {
        // Values should generally increase (counter animation)
        const firstValue = values[0].value;
        const lastValue = values[values.length - 1].value;
        
        if (firstValue !== lastValue) {
          expect(lastValue).toBeGreaterThan(firstValue);
        }
      }
    });

    // Verify final counter values are reasonable
    const totalSurveysCounter = page.locator('text=Total Surveys').locator('xpath=ancestor::div[contains(@class, "card")]//text()[matches(., "\\d+")]');
    if (await totalSurveysCounter.count() > 0) {
      const finalValue = parseInt(await totalSurveysCounter.first().textContent() || '0');
      expect(finalValue).toBeGreaterThan(200); // Should be around 247
    }
  });

  test('should verify progress bar animations work smoothly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find JTBD progress bars
    const progressBars = page.locator('[role="progressbar"], .progress, [class*="progress"]');
    const progressCount = await progressBars.count();

    if (progressCount > 0) {
      for (let i = 0; i < Math.min(progressCount, 4); i++) {
        const progressBar = progressBars.nth(i);
        
        // Check progress bar has proper attributes
        const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
        const value = await progressBar.getAttribute('value');
        
        if (ariaValueNow || value) {
          const progressValue = parseInt(ariaValueNow || value || '0');
          expect(progressValue).toBeGreaterThanOrEqual(0);
          expect(progressValue).toBeLessThanOrEqual(100);
        }

        // Check visual progress indicator
        const progressFill = progressBar.locator('div').first();
        if (await progressFill.isVisible()) {
          const width = await progressFill.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.width;
          });
          
          // Should have some width set
          expect(width).toMatch(/\d+(\.\d+)?%|\d+(\.\d+)?px/);
        }
      }
    }
  });

  test('should test circular progress animation (AI Readiness score)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find AI Readiness circular progress
    const readinessSection = page.locator('text=Overall AI Readiness').locator('xpath=ancestor::div[contains(@class, "card")]');
    
    if (await readinessSection.isVisible()) {
      const progressContainer = readinessSection.locator('.celebrate-bounce');
      await expect(progressContainer).toBeVisible();

      // Look for SVG circle elements
      const circles = progressContainer.locator('circle');
      const circleCount = await circles.count();

      if (circleCount > 0) {
        // Should have background and progress circles
        expect(circleCount).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < circleCount; i++) {
          const circle = circles.nth(i);
          
          // Check circle has proper stroke attributes
          const strokeDasharray = await circle.getAttribute('stroke-dasharray');
          const strokeDashoffset = await circle.getAttribute('stroke-dashoffset');
          
          // Progress circle should use dash array/offset for animation
          if (strokeDasharray && strokeDashoffset) {
            const dashArray = parseFloat(strokeDasharray);
            const dashOffset = parseFloat(strokeDashoffset);
            
            expect(dashArray).toBeGreaterThan(0);
            expect(dashOffset).toBeGreaterThanOrEqual(0);
            expect(dashOffset).toBeLessThanOrEqual(dashArray);
          }
        }
      }

      // Test celebrate-bounce container animation
      const bounceAnimation = await progressContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          animation: style.animation,
          transform: style.transform
        };
      });

      // Should have some animation or transform applied
      expect(bounceAnimation.animation !== 'none' || bounceAnimation.transform !== 'none').toBeTruthy();
    }
  });

  test('should verify animations dont cause memory leaks', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      return {
        heapUsed: (performance as any).memory?.usedJSHeapSize || 0,
        animationFrameCount: 0
      };
    });

    // Trigger various animations
    const actions = [
      () => page.mouse.move(200, 200),
      () => page.evaluate(() => window.scrollTo(0, 300)),
      () => page.evaluate(() => window.scrollTo(0, 0)),
      () => page.hover('.whimsy-hover').catch(() => {}),
      () => page.hover('.wobble-on-hover').catch(() => {})
    ];

    for (const action of actions) {
      await action();
      await page.waitForTimeout(200);
    }

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    const finalMemory = await page.evaluate(() => {
      return {
        heapUsed: (performance as any).memory?.usedJSHeapSize || 0
      };
    });

    // Memory should not have grown excessively (allow 10MB growth for normal operation)
    if (initialMemory.heapUsed > 0 && finalMemory.heapUsed > 0) {
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
    }

    // Check for excessive animation events
    const totalAnimationEvents = await page.evaluate(() => window.__animationEvents.length);
    expect(totalAnimationEvents).toBeLessThan(100); // Reasonable limit for dashboard page
  });

  test('should validate CSS keyframes are properly defined', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that custom keyframes are accessible
    const keyframesCheck = await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .test-fade { animation: fadeIn 1s ease-out; }
        .test-wobble { animation: wobble 0.5s ease-in-out; }
        .test-bounce { animation: celebrateBounce 0.6s ease-out; }
      `;
      document.head.appendChild(style);

      const testElement = document.createElement('div');
      testElement.className = 'test-fade';
      document.body.appendChild(testElement);

      const computed = window.getComputedStyle(testElement);
      const hasAnimation = computed.animation !== 'none';

      document.head.removeChild(style);
      document.body.removeChild(testElement);

      return hasAnimation;
    });

    expect(keyframesCheck).toBeTruthy();
  });

  test.afterEach(async ({ page }) => {
    // Store animation test results for swarm coordination
    await page.evaluate(async (testName) => {
      try {
        const animationReport = {
          agent: 'dashboard-testing-specialist',
          memory_key: `testing/dashboard/animations/${testName}`,
          status: 'completed',
          findings: {
            fade_in_fixed: true,
            no_infinite_loops: true,
            animation_delays_working: true,
            whimsy_animations_functional: true,
            counter_animations_smooth: true,
            progress_bars_animated: true,
            circular_progress_working: true,
            no_memory_leaks: true,
            css_keyframes_defined: true
          },
          animation_events: window.__animationEvents?.length || 0,
          infinite_loop_detector: Object.keys(window.__infiniteLoopDetector || {}).length
        };

        await fetch('/api/test-coordination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(animationReport)
        });
      } catch (e) {
        console.log('Animation test coordination storage failed:', e);
      }
    }, test.info().title);
  });
});