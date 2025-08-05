/**
 * UI Test Helpers for E2E Tests
 * Provides utilities for UI interaction testing and validation
 */

import { Page, Locator, expect } from '@playwright/test';

export class UiTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for element to be interactive
   */
  async waitForInteractive(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    
    // Wait for element to be enabled if it's a button or input
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    if (['button', 'input', 'select', 'textarea'].includes(tagName)) {
      await expect(element).toBeEnabled({ timeout });
    }
    
    return element;
  }

  /**
   * Enhanced form filling with validation
   */
  async fillFormField(selector: string, value: string, options: {
    clear?: boolean;
    validate?: boolean;
    timeout?: number;
  } = {}): Promise<void> {
    const { clear = true, validate = true, timeout = 10000 } = options;
    
    const field = await this.waitForInteractive(selector, timeout);
    
    if (clear) {
      await field.clear();
    }
    
    await field.fill(value);
    
    if (validate) {
      // Verify the value was set correctly
      const actualValue = await field.inputValue();
      if (actualValue !== value) {
        throw new Error(`Field value mismatch. Expected: "${value}", Actual: "${actualValue}"`);
      }
    }
    
    // Trigger blur event to ensure validation
    await field.blur();
  }

  /**
   * Enhanced button clicking with loading state handling
   */
  async clickButton(selector: string, options: {
    waitForLoad?: boolean;
    timeout?: number;
    force?: boolean;
  } = {}): Promise<void> {
    const { waitForLoad = true, timeout = 10000, force = false } = options;
    
    const button = await this.waitForInteractive(selector, timeout);
    
    // Check if button is already in loading state
    const isLoading = await button.evaluate(btn => {
      return btn.disabled || btn.classList.contains('loading') || btn.textContent?.includes('Loading');
    });
    
    if (isLoading && !force) {
      console.log('Button is in loading state, waiting...');
      await this.page.waitForTimeout(1000);
    }
    
    await button.click({ force });
    
    if (waitForLoad) {
      // Wait for any loading states to complete
      await this.waitForLoadingToComplete();
    }
  }

  /**
   * Wait for all loading states to complete
   */
  async waitForLoadingToComplete(timeout: number = 15000): Promise<void> {
    const loadingSelectors = [
      '[data-loading="true"]',
      '.loading',
      '.spinner',
      'button[disabled]:has-text("Loading")',
      'button[disabled]:has-text("Signing in")',
      '[aria-busy="true"]'
    ];
    
    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, { state: 'detached', timeout: 5000 });
      } catch {
        // Element might not exist, continue
      }
    }
    
    // Also wait for network activity to settle
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Enhanced form submission with comprehensive validation
   */
  async submitForm(selector: string, options: {
    waitForNavigation?: boolean;
    expectedUrl?: string | RegExp;
    timeout?: number;
  } = {}): Promise<void> {
    const { waitForNavigation = true, expectedUrl, timeout = 15000 } = options;
    
    const form = this.page.locator(selector);
    await expect(form).toBeVisible();
    
    const submitButton = form.locator('button[type="submit"]');
    await this.clickButton(submitButton.first(), { timeout });
    
    if (waitForNavigation || expectedUrl) {
      if (expectedUrl) {
        await this.page.waitForURL(expectedUrl, { timeout });
      } else {
        await this.page.waitForLoadState('networkidle', { timeout });
      }
    }
  }

  /**
   * Check for form validation errors
   */
  async checkFormValidation(options: {
    expectedErrors?: string[];
    shouldHaveErrors?: boolean;
  } = {}): Promise<string[]> {
    const { expectedErrors = [], shouldHaveErrors = true } = options;
    
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '.text-destructive',
      '.bg-destructive',
      '[aria-invalid="true"]',
      '.field-error',
      '.form-error'
    ];
    
    const foundErrors: string[] = [];
    
    for (const selector of errorSelectors) {
      const elements = await this.page.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text && text.trim()) {
          foundErrors.push(text.trim());
        }
      }
    }
    
    // Check HTML5 validation
    const invalidInputs = await this.page.locator('input:invalid, select:invalid, textarea:invalid').all();
    for (const input of invalidInputs) {
      const validationMessage = await input.evaluate(el => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          return el.validationMessage;
        }
        return '';
      });
      
      if (validationMessage) {
        foundErrors.push(validationMessage);
      }
    }
    
    if (shouldHaveErrors && foundErrors.length === 0) {
      throw new Error('Expected form validation errors but none were found');
    }
    
    if (!shouldHaveErrors && foundErrors.length > 0) {
      throw new Error(`Unexpected form validation errors: ${foundErrors.join(', ')}`);
    }
    
    // Check for specific expected errors
    if (expectedErrors.length > 0) {
      for (const expectedError of expectedErrors) {
        const hasError = foundErrors.some(error => 
          error.toLowerCase().includes(expectedError.toLowerCase())
        );
        
        if (!hasError) {
          throw new Error(`Expected error "${expectedError}" not found. Found errors: ${foundErrors.join(', ')}`);
        }
      }
    }
    
    return foundErrors;
  }

  /**
   * Enhanced mobile interaction testing
   */
  async testMobileInteraction(selector: string, options: {
    tap?: boolean;
    swipe?: 'left' | 'right' | 'up' | 'down';
    pinch?: 'in' | 'out';
  } = {}): Promise<void> {
    const { tap = false, swipe, pinch } = options;
    
    const element = await this.waitForInteractive(selector);
    
    if (tap) {
      await element.tap();
    }
    
    if (swipe) {
      const box = await element.boundingBox();
      if (!box) throw new Error('Element not visible for swipe');
      
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      
      let endX = centerX;
      let endY = centerY;
      
      switch (swipe) {
        case 'left':
          endX = centerX - 100;
          break;
        case 'right':
          endX = centerX + 100;
          break;
        case 'up':
          endY = centerY - 100;
          break;
        case 'down':
          endY = centerY + 100;
          break;
      }
      
      await this.page.touchscreen.tap(centerX, centerY);
      await this.page.mouse.move(centerX, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(endX, endY);
      await this.page.mouse.up();
    }
  }

  /**
   * Check element accessibility
   */
  async checkAccessibility(selector: string): Promise<{
    hasAriaLabel: boolean;
    hasTabIndex: boolean;
    isKeyboardAccessible: boolean;
    hasProperContrast: boolean;
  }> {
    const element = this.page.locator(selector);
    
    const hasAriaLabel = await element.evaluate(el => {
      return !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby'));
    });
    
    const hasTabIndex = await element.evaluate(el => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex !== null && tabIndex !== '-1';
    });
    
    // Test keyboard accessibility
    await element.focus();
    const isKeyboardAccessible = await element.evaluate(el => {
      return document.activeElement === el;
    });
    
    // Basic contrast check (simplified)
    const hasProperContrast = await element.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      // This is a simplified check - in real tests you'd use a proper contrast analyzer
      return !!(backgroundColor && color && backgroundColor !== 'rgba(0, 0, 0, 0)');
    });
    
    return {
      hasAriaLabel,
      hasTabIndex,
      isKeyboardAccessible,
      hasProperContrast
    };
  }

  /**
   * Test responsive design elements
   */
  async testResponsiveElements(selectors: string[]): Promise<void> {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 720, name: 'desktop' }
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing responsive design at ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await this.page.setViewportSize(viewport);
      await this.page.waitForLoadState('networkidle');
      
      for (const selector of selectors) {
        const element = this.page.locator(selector);
        
        if (await element.count() > 0) {
          await expect(element.first()).toBeVisible();
          
          // Check if element is properly sized for viewport
          const box = await element.first().boundingBox();
          if (box) {
            // Element should not overflow viewport width
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 10); // 10px tolerance
            
            // Touch targets should be at least 44px on mobile
            if (viewport.name === 'mobile') {
              const tagName = await element.first().evaluate(el => el.tagName.toLowerCase());
              if (['button', 'a', 'input'].includes(tagName)) {
                expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Wait for animations to complete
   */
  async waitForAnimations(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const animatedElements = document.querySelectorAll('[class*="animate-"], .transition-');
        return Array.from(animatedElements).every(el => {
          const computedStyle = window.getComputedStyle(el);
          return computedStyle.animationPlayState === 'finished' || 
                 computedStyle.animationPlayState === 'paused' ||
                 !computedStyle.animationName ||
                 computedStyle.animationName === 'none';
        });
      },
      { timeout }
    );
  }
}

export default UiTestHelpers;