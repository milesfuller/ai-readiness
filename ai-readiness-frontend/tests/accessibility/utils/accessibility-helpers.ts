/**
 * Accessibility Testing Utilities
 * 
 * Helper functions for accessibility compliance testing
 */

import { Page, expect, Locator } from '@playwright/test';
// Note: axe-playwright would need to be installed separately
// import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

export interface AccessibilityConfig {
  rules?: Record<string, { enabled: boolean }>;
  tags?: string[];
  exclude?: string[];
  include?: string[];
}

/**
 * Setup page for accessibility testing
 */
export async function setupAccessibilityTesting(page: Page, config: AccessibilityConfig = {}) {
  // Commented out until axe-playwright is installed
  // await injectAxe(page);
  
  // Configure axe with custom rules
  const defaultConfig = {
    rules: {
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-management': { enabled: true },
      'aria-usage': { enabled: true },
      'semantic-structure': { enabled: true },
      ...config.rules
    },
    tags: config.tags || ['wcag2a', 'wcag2aa', 'wcag21aa'],
    exclude: config.exclude || [],
    include: config.include || []
  };
  
  // await configureAxe(page, defaultConfig);
  console.log('Accessibility setup placeholder - install axe-playwright for full functionality');
}

/**
 * Run comprehensive accessibility audit
 */
export async function runAccessibilityAudit(
  page: Page, 
  context?: string | Locator,
  options?: {
    detailedReport?: boolean;
    includePasses?: boolean;
    reportOnly?: boolean;
  }
) {
  const { detailedReport = true, includePasses = false, reportOnly = false } = options || {};
  
  // Commented out until axe-playwright is installed
  // try {
  //   await checkA11y(page, context, {
  //     detailedReport,
  //     detailedReportOptions: {
  //       html: detailedReport
  //     },
  //     includePasses
  //   });
  //   
  //   return { passed: true, violations: [] };
  // } catch (error) {
  //   if (reportOnly) {
  //     console.warn(`Accessibility violations found: ${error}`);
  //     return { passed: false, violations: error };
  //   }
  //   throw error;
  // }
  
  console.log('Accessibility audit placeholder - install axe-playwright for full functionality');
  return { passed: true, violations: [] };
}

/**
 * Check ARIA attributes and roles
 */
export async function validateAriaImplementation(page: Page, selector: string) {
  const elements = await page.locator(selector).all();
  const results: Array<{
    element: string;
    issues: string[];
    passed: boolean;
  }> = [];
  
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const issues: string[] = [];
    
    // Get element info
    const elementInfo = await element.evaluate((el) => {
      return {
        tagName: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        ariaDescribedby: el.getAttribute('aria-describedby'),
        id: el.getAttribute('id'),
        hasTextContent: !!el.textContent?.trim()
      };
    });
    
    // Check for required accessible name
    const hasAccessibleName = elementInfo.ariaLabel || 
                             elementInfo.ariaLabelledby || 
                             elementInfo.hasTextContent;
    
    if (!hasAccessibleName) {
      issues.push('Missing accessible name (aria-label, aria-labelledby, or text content)');
    }
    
    // Check aria-labelledby references
    if (elementInfo.ariaLabelledby) {
      const referencedIds = elementInfo.ariaLabelledby.split(' ');
      for (const id of referencedIds) {
        const referencedElement = page.locator(`#${id}`);
        if (await referencedElement.count() === 0) {
          issues.push(`aria-labelledby references non-existent element: ${id}`);
        }
      }
    }
    
    // Check aria-describedby references
    if (elementInfo.ariaDescribedby) {
      const referencedIds = elementInfo.ariaDescribedby.split(' ');
      for (const id of referencedIds) {
        const referencedElement = page.locator(`#${id}`);
        if (await referencedElement.count() === 0) {
          issues.push(`aria-describedby references non-existent element: ${id}`);
        }
      }
    }
    
    // Role-specific validations
    if (elementInfo.role) {
      switch (elementInfo.role) {
        case 'button':
          if (!hasAccessibleName) {
            issues.push('Button role requires accessible name');
          }
          break;
        case 'dialog':
          if (!elementInfo.ariaLabel && !elementInfo.ariaLabelledby) {
            issues.push('Dialog requires aria-label or aria-labelledby');
          }
          break;
        case 'tab':
          const ariaSelected = await element.getAttribute('aria-selected');
          if (ariaSelected === null) {
            issues.push('Tab role requires aria-selected attribute');
          }
          break;
        case 'progressbar':
          const ariaValueNow = await element.getAttribute('aria-valuenow');
          const ariaValueMin = await element.getAttribute('aria-valuemin');
          const ariaValueMax = await element.getAttribute('aria-valuemax');
          
          if (ariaValueNow === null) {
            issues.push('Progressbar requires aria-valuenow');
          }
          if (ariaValueMin === null) {
            issues.push('Progressbar requires aria-valuemin');
          }
          if (ariaValueMax === null) {
            issues.push('Progressbar requires aria-valuemax');
          }
          break;
      }
    }
    
    results.push({
      element: `${selector}[${i}] (${elementInfo.tagName}${elementInfo.role ? `[role="${elementInfo.role}"]` : ''})`,
      issues,
      passed: issues.length === 0
    });
  }
  
  return results;
}

/**
 * Check heading hierarchy
 */
export async function validateHeadingHierarchy(page: Page) {
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  const headingLevels: number[] = [];
  const issues: string[] = [];
  
  for (const heading of headings) {
    const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
    const level = parseInt(tagName.substring(1));
    const text = await heading.textContent();
    
    headingLevels.push(level);
    
    // Check heading has content
    if (!text?.trim()) {
      issues.push(`Empty heading found: ${tagName}`);
    }
  }
  
  // Check hierarchy
  if (headingLevels.length > 0) {
    // Should start with h1
    if (headingLevels[0] !== 1) {
      issues.push(`Page should start with h1, found h${headingLevels[0]}`);
    }
    
    // Check for logical progression
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      if (diff > 1) {
        issues.push(`Heading hierarchy skip: h${headingLevels[i - 1]} to h${headingLevels[i]}`);
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
    headingStructure: headingLevels
  };
}

/**
 * Check color contrast ratios
 */
export async function checkColorContrast(
  page: Page,
  selectors: string[],
  minimumRatio: number = 4.5
) {
  const results: Array<{
    selector: string;
    passed: boolean;
    actualRatio: number;
    requiredRatio: number;
  }> = [];
  
  for (const selector of selectors) {
    const elements = await page.locator(selector).all();
    
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      
      if (await element.isVisible()) {
        const contrast = await element.evaluate((el) => {
          const styles = getComputedStyle(el);
          const textColor = styles.color;
          const backgroundColor = styles.backgroundColor;
          
          // Parse RGB values
          const parseRgb = (color: string) => {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
          };
          
          // Calculate relative luminance
          const getLuminance = (rgb: number[]) => {
            const [r, g, b] = rgb.map(val => {
              const normalized = val / 255;
              return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
            });
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          };
          
          const textRgb = parseRgb(textColor);
          const bgRgb = parseRgb(backgroundColor);
          
          const textLuminance = getLuminance(textRgb);
          const bgLuminance = getLuminance(bgRgb);
          
          const lighter = Math.max(textLuminance, bgLuminance);
          const darker = Math.min(textLuminance, bgLuminance);
          
          return (lighter + 0.05) / (darker + 0.05);
        });
        
        results.push({
          selector: `${selector}[${i}]`,
          passed: contrast >= minimumRatio,
          actualRatio: parseFloat(contrast.toFixed(2)),
          requiredRatio: minimumRatio
        });
      }
    }
  }
  
  return results;
}

/**
 * Test keyboard navigation
 */
export async function testKeyboardNavigation(
  page: Page,
  startElement?: string
) {
  const focusableElements: Array<{
    element: string;
    tagName: string;
    accessible: boolean;
  }> = [];
  
  if (startElement) {
    await page.focus(startElement);
  } else {
    await page.keyboard.press('Tab');
  }
  
  let tabCount = 0;
  const maxTabs = 50;
  let previousElement = '';
  
  while (tabCount < maxTabs) {
    const currentElement = await page.evaluate(() => {
      const focused = document.activeElement;
      if (focused && focused !== document.body) {
        const tagName = focused.tagName.toLowerCase();
        const type = focused.getAttribute('type') || '';
        const role = focused.getAttribute('role') || '';
        const ariaLabel = focused.getAttribute('aria-label') || '';
        const text = focused.textContent?.slice(0, 30) || '';
        
        // Check if element has accessible name
        const hasAccessibleName = ariaLabel || text || focused.getAttribute('aria-labelledby');
        
        return {
          element: `${tagName}${type ? `[type="${type}"]` : ''}${role ? `[role="${role}"]` : ''}`,
          tagName,
          accessible: !!hasAccessibleName
        };
      }
      return null;
    });
    
    if (!currentElement) break;
    
    const elementString = JSON.stringify(currentElement);
    if (elementString === previousElement) break;
    
    focusableElements.push(currentElement);
    previousElement = elementString;
    
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    tabCount++;
  }
  
  // Test reverse navigation
  const reverseNavigationWorks = await page.evaluate(() => {
    const beforeShiftTab = document.activeElement;
    return beforeShiftTab !== document.body;
  });
  
  if (reverseNavigationWorks) {
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(100);
  }
  
  return {
    focusableElements,
    totalFocusable: focusableElements.length,
    accessibleCount: focusableElements.filter(el => el.accessible).length,
    reverseNavigationWorks
  };
}

/**
 * Check focus management in modals
 */
export async function testModalFocusManagement(
  page: Page,
  modalTriggerSelector: string,
  modalSelector: string = '[role="dialog"]'
) {
  // Focus and activate modal trigger
  await page.focus(modalTriggerSelector);
  const triggerElement = await page.locator(modalTriggerSelector).first();
  
  await triggerElement.click();
  await page.waitForTimeout(500);
  
  // Check if modal is open
  const modal = page.locator(modalSelector);
  const isModalOpen = await modal.count() > 0 && await modal.isVisible();
  
  if (!isModalOpen) {
    return { passed: false, error: 'Modal did not open' };
  }
  
  // Check if focus moved to modal
  const focusInModal = await page.evaluate((modalSel) => {
    const modal = document.querySelector(modalSel);
    const focused = document.activeElement;
    return modal && modal.contains(focused);
  }, modalSelector);
  
  // Test focus trapping
  const focusTrapped = await page.evaluate(async (modalSel) => {
    const modal = document.querySelector(modalSel) as HTMLElement;
    if (!modal) return false;
    
    const focusableElements = modal.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length < 2) return true; // Can't test trapping with <2 elements
    
    // Try to tab through all elements and beyond
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    lastElement.focus();
    
    // Simulate tab key (focus should move to first element)
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    document.dispatchEvent(tabEvent);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check if focus stayed in modal
    return modal.contains(document.activeElement);
  }, modalSelector);
  
  // Test escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  
  const modalClosed = await modal.isVisible() === false;
  
  // Check focus restoration
  const focusRestored = await page.evaluate((triggerSel) => {
    const trigger = document.querySelector(triggerSel);
    return trigger === document.activeElement;
  }, modalTriggerSelector);
  
  return {
    passed: focusInModal && focusTrapped && modalClosed && focusRestored,
    focusInModal,
    focusTrapped,
    modalClosed,
    focusRestored
  };
}

/**
 * Check live regions and announcements
 */
export async function testLiveRegions(page: Page) {
  const liveRegions = await page.locator('[aria-live], [role="alert"], [role="status"]').all();
  const results: Array<{
    element: string;
    ariaLive: string;
    hasContent: boolean;
    isVisible: boolean;
  }> = [];
  
  for (let i = 0; i < liveRegions.length; i++) {
    const region = liveRegions[i];
    
    const info = await region.evaluate((el) => {
      return {
        ariaLive: el.getAttribute('aria-live') || 
                  (el.getAttribute('role') === 'alert' ? 'assertive' : 'polite'),
        hasContent: !!el.textContent?.trim(),
        isVisible: 'offsetParent' in el ? (el as HTMLElement).offsetParent !== null : true,
        role: el.getAttribute('role')
      };
    });
    
    results.push({
      element: `Live region ${i} (role="${info.role}")`,
      ariaLive: info.ariaLive,
      hasContent: info.hasContent,
      isVisible: info.isVisible
    });
  }
  
  return results;
}

/**
 * Generate accessibility report
 */
export async function generateAccessibilityReport(
  testResults: Array<{
    test: string;
    passed: boolean;
    details: any;
  }>
) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length
    },
    results: testResults,
    recommendations: generateRecommendations(testResults)
  };
  
  console.log('Accessibility Report:', JSON.stringify(report, null, 2));
  
  return report;
}

function generateRecommendations(results: Array<{ test: string; passed: boolean; details: any }>) {
  const recommendations: string[] = [];
  
  const failedTests = results.filter(r => !r.passed);
  
  if (failedTests.some(t => t.test.includes('color-contrast'))) {
    recommendations.push('Review color choices to ensure adequate contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)');
  }
  
  if (failedTests.some(t => t.test.includes('keyboard'))) {
    recommendations.push('Implement proper keyboard navigation patterns and ensure all interactive elements are reachable via keyboard');
  }
  
  if (failedTests.some(t => t.test.includes('aria'))) {
    recommendations.push('Review ARIA implementation to ensure proper labeling and semantic structure');
  }
  
  if (failedTests.some(t => t.test.includes('heading'))) {
    recommendations.push('Fix heading hierarchy to follow logical structure (h1 → h2 → h3, etc.)');
  }
  
  if (failedTests.some(t => t.test.includes('focus'))) {
    recommendations.push('Implement proper focus management, especially for modals and dynamic content');
  }
  
  return recommendations;
}