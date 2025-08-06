/**
 * Visual Testing Utilities
 * 
 * Helper functions for visual regression testing
 */

import { Page, expect } from '@playwright/test';

export interface VisualTestConfig {
  animations?: boolean;
  waitForFonts?: boolean;
  disableAnimations?: boolean;
  threshold?: number;
  maskElements?: string[];
}

/**
 * Prepare page for visual testing by disabling animations and ensuring consistency
 */
export async function prepareForVisualTesting(page: Page, config: VisualTestConfig = {}) {
  const {
    animations = false,
    waitForFonts = true,
    disableAnimations = true,
    threshold = 0.2,
    maskElements = []
  } = config;

  if (disableAnimations) {
    // Disable all CSS animations and transitions
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-fill-mode: both !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
          transform-style: flat !important;
        }
        
        /* Remove specific problematic animations */
        .animate-bounce,
        .animate-pulse,
        .animate-spin,
        .animate-wobble,
        [class*="animate-"],
        [data-animate] {
          animation: none !important;
          transform: none !important;
        }
        
        /* Ensure stable states for interactive elements */
        button:hover,
        a:hover,
        .hover\:transform-none:hover {
          transform: none !important;
        }
      `
    });
  }

  if (waitForFonts) {
    // Wait for all fonts to load
    await page.evaluate(() => document.fonts.ready);
  }

  // Wait for any pending network requests to complete
  await page.waitForLoadState('networkidle');

  // Mask dynamic content elements
  if (maskElements.length > 0) {
    for (const selector of maskElements) {
      await page.addStyleTag({
        content: `
          ${selector} {
            background: #cccccc !important;
            color: transparent !important;
          }
        `
      });
    }
  }
}

/**
 * Take a screenshot with consistent naming and options
 */
export async function takeVisualSnapshot(
  page: Page, 
  name: string, 
  options: {
    fullPage?: boolean;
    threshold?: number;
    maxDiffPixels?: number;
    animations?: 'disabled' | 'allow';
  } = {}
) {
  const {
    fullPage = false,
    threshold = 0.2,
    maxDiffPixels = 1000,
    animations = 'disabled'
  } = options;

  return await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    threshold,
    maxDiffPixels,
    animations
  });
}

/**
 * Test component in different states
 */
export async function testComponentStates(
  page: Page,
  selector: string,
  states: Array<{
    name: string;
    action: () => Promise<void>;
    wait?: number;
  }>
) {
  const element = page.locator(selector);
  
  for (const state of states) {
    await state.action();
    
    if (state.wait) {
      await page.waitForTimeout(state.wait);
    }
    
    await expect(element).toHaveScreenshot(`${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${state.name}.png`);
  }
}

/**
 * Test responsive breakpoints
 */
export async function testResponsiveBreakpoints(
  page: Page,
  testName: string,
  breakpoints: Record<string, { width: number; height: number }> = {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 }
  }
) {
  for (const [breakpointName, viewport] of Object.entries(breakpoints)) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500); // Allow layout to settle
    
    await expect(page).toHaveScreenshot(`${testName}-${breakpointName}.png`);
  }
}

/**
 * Test theme variations
 */
export async function testThemeVariations(
  page: Page,
  testName: string,
  themes: string[] = ['light', 'dark']
) {
  for (const theme of themes) {
    // Apply theme
    if (theme === 'dark') {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
    } else {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
    }
    
    await page.waitForTimeout(300); // Allow theme to apply
    
    await expect(page).toHaveScreenshot(`${testName}-${theme}.png`);
  }
  
  // Reset to light theme
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });
}

/**
 * Compare before/after states for animation removal testing
 */
export async function compareAnimationStates(
  page: Page,
  testName: string,
  enableAnimationsCallback: () => Promise<void>
) {
  // Capture current state (animations disabled)
  await expect(page).toHaveScreenshot(`${testName}-animations-disabled.png`);
  
  // Enable animations temporarily
  await enableAnimationsCallback();
  await page.waitForTimeout(500);
  
  // Capture with animations
  await expect(page).toHaveScreenshot(`${testName}-animations-enabled.png`);
  
  // Disable animations again for consistency
  await prepareForVisualTesting(page, { disableAnimations: true });
}

/**
 * Test color contrast ratios
 */
export async function testColorContrast(
  page: Page,
  elements: Array<{ selector: string; expectedRatio: number }>
) {
  const results: Array<{
    selector: string;
    passed: boolean;
    actualRatio: number;
    expectedRatio: number;
  }> = [];

  for (const { selector, expectedRatio } of elements) {
    const element = page.locator(selector).first();
    
    if (await element.isVisible()) {
      const contrast = await element.evaluate((el) => {
        const styles = getComputedStyle(el);
        const textColor = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Helper function to calculate luminance
        const getLuminance = (color: string) => {
          const rgb = color.match(/\d+/g);
          if (!rgb) return 0;
          
          const [r, g, b] = rgb.map(x => {
            const val = parseInt(x) / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });
          
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        const textLum = getLuminance(textColor);
        const bgLum = getLuminance(backgroundColor);
        
        const lighter = Math.max(textLum, bgLum);
        const darker = Math.min(textLum, bgLum);
        
        return (lighter + 0.05) / (darker + 0.05);
      });
      
      results.push({
        selector,
        passed: contrast >= expectedRatio,
        actualRatio: contrast,
        expectedRatio
      });
    }
  }
  
  // Log results for debugging
  console.log('Color contrast test results:', results);
  
  return results;
}

/**
 * Test focus indicators
 */
export async function testFocusIndicators(
  page: Page,
  focusableSelectors: string[]
) {
  const results: Array<{
    selector: string;
    hasFocusIndicator: boolean;
    focusStyles: any;
  }> = [];

  for (const selector of focusableSelectors) {
    const elements = await page.locator(selector).all();
    
    for (let i = 0; i < Math.min(elements.length, 3); i++) {
      const element = elements[i];
      
      if (await element.isVisible()) {
        await element.focus();
        await page.waitForTimeout(200);
        
        const focusStyles = await element.evaluate((el) => {
          const computed = getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            outlineStyle: computed.outlineStyle,
            outlineColor: computed.outlineColor,
            boxShadow: computed.boxShadow,
            border: computed.border
          };
        });
        
        const hasFocusIndicator = 
          focusStyles.outlineWidth !== '0px' || 
          focusStyles.boxShadow !== 'none' ||
          focusStyles.outline !== 'none';
        
        results.push({
          selector: `${selector}[${i}]`,
          hasFocusIndicator,
          focusStyles
        });
        
        // Take screenshot of focused element
        await expect(element).toHaveScreenshot(`focus-${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${i}.png`);
      }
    }
  }
  
  return results;
}

/**
 * Mock data injection for consistent visual testing
 */
export async function injectMockData(page: Page, mockData: Record<string, any>) {
  await page.evaluate((data) => {
    // Store mock data globally for components to access
    (window as any).mockTestData = data;
    
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('mockDataInjected', { detail: data }));
  }, mockData);
}

/**
 * Wait for images to load completely
 */
export async function waitForImages(page: Page) {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        }))
    );
  });
}

/**
 * Test loading states
 */
export async function testLoadingStates(
  page: Page,
  testName: string,
  loadingTrigger: () => Promise<void>
) {
  // Set up slow network to capture loading states
  await page.route('**/api/**', route => {
    setTimeout(() => {
      route.continue();
    }, 2000);
  });
  
  await loadingTrigger();
  await page.waitForTimeout(500); // Capture loading state
  
  await expect(page).toHaveScreenshot(`${testName}-loading.png`);
  
  // Wait for loading to complete
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`${testName}-loaded.png`);
  
  // Remove route handler
  await page.unroute('**/api/**');
}

/**
 * Generate visual testing report
 */
export async function generateVisualReport(
  results: Array<{
    test: string;
    passed: boolean;
    screenshots: string[];
    errors?: string[];
  }>
) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    },
    results
  };
  
  console.log('Visual Testing Report:', JSON.stringify(report, null, 2));
  
  return report;
}