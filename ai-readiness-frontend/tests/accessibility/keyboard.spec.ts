/**
 * Keyboard Navigation and Focus Management Tests
 * 
 * Tests keyboard accessibility, focus management, and navigation patterns
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Keyboard Navigation Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Add visual focus indicators for testing
    await page.addStyleTag({
      content: `
        *:focus {
          outline: 2px solid #0066cc !important;
          outline-offset: 2px !important;
        }
        .focus-visible {
          outline: 2px solid #ff6b35 !important;
        }
      `
    });
  });

  // Basic keyboard navigation tests
  test('Tab navigation through interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Start from the beginning of the page
    await page.keyboard.press('Tab');
    
    const focusableElements: { element: string; page: string }[] = [];
    let previousFocusedElement = '';
    let tabCount = 0;
    const maxTabs = 50; // Prevent infinite loops
    
    while (tabCount < maxTabs) {
      const currentFocused = await page.evaluate(() => {
        const focused = document.activeElement;
        if (focused && focused !== document.body) {
          const tagName = focused.tagName.toLowerCase();
          const type = focused.getAttribute('type') || '';
          const role = focused.getAttribute('role') || '';
          const testId = focused.getAttribute('data-testid') || '';
          const ariaLabel = focused.getAttribute('aria-label') || '';
          const text = focused.textContent?.slice(0, 30) || '';
          
          return `${tagName}${type ? `[type="${type}"]` : ''}${role ? `[role="${role}"]` : ''}${testId ? `[data-testid="${testId}"]` : ''} - "${ariaLabel || text}"`;
        }
        return null;
      });
      
      if (!currentFocused) break;
      
      if (currentFocused === previousFocusedElement) {
        // Focus didn't change, we might be at the end
        break;
      }
      
      focusableElements.push({ element: currentFocused, page: '/' });
      previousFocusedElement = currentFocused;
      
      // Take screenshot of focused element
      await expect(page.locator(':focus')).toHaveScreenshot(`focus-state-${tabCount}.png`);
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      tabCount++;
    }
    
    console.log(`Found ${focusableElements.length} focusable elements on landing page`);
    expect(focusableElements.length, 'Should have focusable elements').toBeGreaterThan(0);
    
    // Test reverse navigation
    await page.keyboard.press('Shift+Tab');
    const reverseFocused = await page.evaluate(() => {
      const focused = document.activeElement;
      return focused ? focused.tagName.toLowerCase() : null;
    });
    
    expect(reverseFocused, 'Shift+Tab should work for reverse navigation').toBeTruthy();
  });

  test('Keyboard navigation on form pages', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Test form navigation
    await page.keyboard.press('Tab');
    
    // Should focus on first form element
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['input', 'button', 'a'].includes(focusedElement || ''), 
      'First focus should be on interactive element').toBe(true);
    
    // Navigate through form
    const formElements: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      const current = await page.evaluate(() => {
        const focused = document.activeElement;
        if (focused && focused !== document.body) {
          return {
            tag: focused.tagName.toLowerCase(),
            type: focused.getAttribute('type'),
            name: focused.getAttribute('name'),
            id: focused.getAttribute('id')
          };
        }
        return null;
      });
      
      if (current) {
        formElements.push(`${current.tag}[${current.type || 'no-type'}]${current.name ? `[name="${current.name}"]` : ''}`);
      }
      
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }
    
    console.log('Form focus sequence:', formElements);
    
    // Test form submission with Enter key
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    
    // Focus on submit button and press Enter
    await page.focus('button[type="submit"]');
    await page.keyboard.press('Enter');
    
    // Should trigger form submission (check for loading or error state)
    await page.waitForTimeout(1000);
    
    const pageChanged = await page.url();
    const hasErrorMessage = await page.locator('[role="alert"], .error-message').count() > 0;
    
    expect(pageChanged !== '/auth/login' || hasErrorMessage, 
      'Form submission via keyboard should work').toBe(true);
  });

  // Skip links and shortcuts tests
  test('Skip links and keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test skip to main content link
    await page.keyboard.press('Tab');
    
    const firstFocused = await page.evaluate(() => {
      const focused = document.activeElement;
      return focused ? {
        text: focused.textContent?.toLowerCase(),
        href: focused.getAttribute('href'),
        isSkipLink: focused.textContent?.toLowerCase().includes('skip')
      } : null;
    });
    
    if (firstFocused?.isSkipLink) {
      // Activate skip link
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      
      // Check if focus moved to main content
      const focusedAfterSkip = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? {
          tag: focused.tagName.toLowerCase(),
          role: focused.getAttribute('role'),
          id: focused.getAttribute('id')
        } : null;
      });
      
      expect(
        focusedAfterSkip?.role === 'main' || 
        focusedAfterSkip?.id === 'main' ||
        focusedAfterSkip?.tag === 'main',
        'Skip link should move focus to main content'
      ).toBe(true);
    }
    
    // Test common keyboard shortcuts
    const shortcuts = [
      { keys: 'Alt+1', description: 'Navigate to home' },
      { keys: 'Alt+2', description: 'Navigate to dashboard' },
      { keys: 'Escape', description: 'Close modal/menu' },
      { keys: '/', description: 'Focus search' }
    ];
    
    for (const shortcut of shortcuts) {
      try {
        await page.keyboard.press(shortcut.keys);
        await page.waitForTimeout(300);
        
        // Check if shortcut had expected effect
        const currentUrl = page.url();
        console.log(`Shortcut ${shortcut.keys} - Current URL: ${currentUrl}`);
        
      } catch (error) {
        console.log(`Shortcut ${shortcut.keys} not implemented or failed:`, error);
      }
    }
  });

  // Modal and dialog keyboard navigation
  test('Modal and dialog keyboard behavior', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Open a modal
    const modalTrigger = page.locator('[data-testid="export-button"]').first();
    
    if (await modalTrigger.count() > 0) {
      await modalTrigger.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Check if focus is trapped in modal
      const modalElement = page.locator('[role="dialog"], dialog').first();
      expect(await modalElement.count(), 'Modal should be present').toBe(1);
      
      // Test focus trapping
      const focusableInModal = await modalElement.locator('button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])').all();
      
      if (focusableInModal.length > 1) {
        // Navigate through modal elements
        for (let i = 0; i < focusableInModal.length + 2; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
          
          const currentFocused = await page.evaluate(() => document.activeElement);
          const focusedInModal = await modalElement.evaluate((modal, focused) => {
            return modal.contains(focused);
          }, currentFocused);
          
          expect(focusedInModal, `Focus should remain in modal (iteration ${i})`).toBe(true);
        }
      }
      
      // Test escape key to close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      const modalStillVisible = await modalElement.isVisible();
      expect(modalStillVisible, 'Modal should close with Escape key').toBe(false);
      
      // Check focus restoration
      const focusedAfterClose = await page.evaluate(() => document.activeElement);
      const originalTriggerStillFocused = await modalTrigger.evaluate((trigger, focused) => {
        return trigger === focused;
      }, focusedAfterClose);
      
      expect(originalTriggerStillFocused, 'Focus should return to modal trigger').toBe(true);
    }
  });

  // Dropdown and menu keyboard navigation
  test('Dropdown and menu keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Find dropdown/menu triggers
    const dropdownTriggers = await page.locator('[aria-haspopup], [data-testid*="dropdown"], [data-testid*="menu"]').all();
    
    for (let i = 0; i < Math.min(dropdownTriggers.length, 3); i++) {
      const trigger = dropdownTriggers[i];
      
      if (await trigger.isVisible()) {
        await trigger.focus();
        
        // Test different ways to open dropdown
        const openMethods = ['Enter', 'Space', 'ArrowDown'];
        
        for (const method of openMethods) {
          await page.keyboard.press(method);
          await page.waitForTimeout(300);
          
          // Check if dropdown opened
          const ariaExpanded = await trigger.getAttribute('aria-expanded');
          
          if (ariaExpanded === 'true') {
            // Navigate dropdown items with arrow keys
            const menuItems = await page.locator('[role="menuitem"], [role="option"]').all();
            
            if (menuItems.length > 0) {
              // Test arrow navigation
              await page.keyboard.press('ArrowDown');
              await page.waitForTimeout(100);
              
              let focusedItem = await page.evaluate(() => {
                const focused = document.activeElement;
                return focused?.getAttribute('role');
              });
              
              expect(['menuitem', 'option'].includes(focusedItem || ''), 
                'Arrow down should focus menu item').toBe(true);
              
              // Test Home/End keys
              await page.keyboard.press('End');
              await page.waitForTimeout(100);
              
              await page.keyboard.press('Home');
              await page.waitForTimeout(100);
              
              // Test Escape to close
              await page.keyboard.press('Escape');
              await page.waitForTimeout(300);
              
              const closedExpanded = await trigger.getAttribute('aria-expanded');
              expect(closedExpanded, 'Escape should close dropdown').toBe('false');
            }
            break; // Successfully opened, no need to try other methods
          }
        }
      }
    }
  });

  // Table keyboard navigation
  test('Table keyboard navigation and sorting', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForLoadState('networkidle');
    
    const tables = await page.locator('table').all();
    
    for (const table of tables) {
      // Find sortable headers
      const sortableHeaders = await table.locator('th[aria-sort], th[data-sortable]').all();
      
      for (let i = 0; i < Math.min(sortableHeaders.length, 3); i++) {
        const header = sortableHeaders[i];
        
        await header.focus();
        await expect(header).toBeFocused();
        
        // Test sorting with Enter and Space
        const initialSort = await header.getAttribute('aria-sort');
        
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        
        const sortAfterEnter = await header.getAttribute('aria-sort');
        expect(sortAfterEnter !== initialSort, 'Enter should change sort order').toBe(true);
        
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);
        
        const sortAfterSpace = await header.getAttribute('aria-sort');
        expect(sortAfterSpace !== sortAfterEnter, 'Space should also change sort order').toBe(true);
      }
      
      // Test table cell navigation if implemented
      const firstCell = table.locator('td').first();
      if (await firstCell.count() > 0) {
        await firstCell.focus();
        
        // Test arrow key navigation in table
        const arrowKeys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
        
        for (const arrow of arrowKeys) {
          await page.keyboard.press(arrow);
          await page.waitForTimeout(100);
          
          // Check if focus moved (implementation specific)
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
          console.log(`Table navigation ${arrow}: focused on ${focusedElement}`);
        }
      }
    }
  });

  // Form validation and error handling
  test('Keyboard navigation with form validation', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Submit form with invalid data to trigger validation
    await page.focus('button[type="submit"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Check if focus moves to first error field
    const focusedAfterSubmit = await page.evaluate(() => {
      const focused = document.activeElement;
      return {
        tag: focused?.tagName.toLowerCase(),
        name: focused?.getAttribute('name'),
        ariaInvalid: focused?.getAttribute('aria-invalid'),
        ariaDescribedby: focused?.getAttribute('aria-describedby')
      };
    });
    
    expect(focusedAfterSubmit.ariaInvalid, 'Focus should move to invalid field').toBe('true');
    
    if (focusedAfterSubmit.ariaDescribedby) {
      const errorMessage = page.locator(`#${focusedAfterSubmit.ariaDescribedby}`);
      expect(await errorMessage.count(), 'Error message should exist').toBe(1);
      
      const errorText = await errorMessage.textContent();
      expect(errorText?.trim(), 'Error message should have content').toBeTruthy();
    }
    
    // Test fixing validation errors with keyboard
    await page.keyboard.type('test@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('ValidPassword123!');
    await page.keyboard.press('Tab');
    await page.keyboard.type('ValidPassword123!');
    
    // Submit again
    await page.keyboard.press('Tab'); // Move to submit button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Should either redirect or show success message
    const currentUrl = page.url();
    const hasSuccessMessage = await page.locator('[role="alert"], .success-message').count() > 0;
    
    expect(currentUrl !== '/auth/register' || hasSuccessMessage, 
      'Valid form submission should succeed').toBe(true);
  });

  // Search and filter keyboard interactions
  test('Search and filter keyboard functionality', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInputs = await page.locator('input[type="search"], [role="searchbox"], input[placeholder*="search" i]').all();
    
    for (const searchInput of searchInputs) {
      if (await searchInput.isVisible()) {
        await searchInput.focus();
        
        // Type search query
        await page.keyboard.type('test query');
        await page.waitForTimeout(500);
        
        // Test Enter to submit search
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Check if search was executed (results updated or URL changed)
        const currentUrl = page.url();
        const hasResults = await page.locator('[data-testid*="result"], .search-result').count() > 0;
        const hasNoResults = await page.locator('[data-testid*="no-result"], .no-results').count() > 0;
        
        console.log(`Search executed - URL: ${currentUrl}, Has results: ${hasResults}, No results message: ${hasNoResults}`);
        
        // Clear search with Escape (if implemented)
        await searchInput.focus();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        const clearedValue = await searchInput.inputValue();
        if (clearedValue === '') {
          console.log('Search cleared with Escape key');
        }
        
        break; // Test only first search input
      }
    }
  });

  // Complex widget keyboard navigation
  test('Complex widget keyboard navigation', async ({ page }) => {
    await page.goto('/survey/test-session');
    await page.waitForLoadState('networkidle');
    
    // Test slider/range inputs
    const sliders = await page.locator('input[type="range"], [role="slider"]').all();
    
    for (const slider of sliders) {
      if (await slider.isVisible()) {
        await slider.focus();
        
        const initialValue = await slider.getAttribute('value') || await slider.getAttribute('aria-valuenow') || '0';
        
        // Test arrow keys
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        
        const valueAfterRight = await slider.getAttribute('value') || await slider.getAttribute('aria-valuenow') || '0';
        expect(parseFloat(valueAfterRight) > parseFloat(initialValue), 
          'Arrow right should increase slider value').toBe(true);
        
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        
        // Test Home and End keys
        await page.keyboard.press('Home');
        await page.waitForTimeout(100);
        
        const minValue = await slider.getAttribute('aria-valuemin') || await slider.getAttribute('min') || '0';
        const valueAtHome = await slider.getAttribute('value') || await slider.getAttribute('aria-valuenow') || '0';
        expect(parseFloat(valueAtHome), 'Home key should set to minimum value').toBe(parseFloat(minValue));
        
        await page.keyboard.press('End');
        await page.waitForTimeout(100);
        
        const maxValue = await slider.getAttribute('aria-valuemax') || await slider.getAttribute('max') || '100';
        const valueAtEnd = await slider.getAttribute('value') || await slider.getAttribute('aria-valuenow') || '100';
        expect(parseFloat(valueAtEnd), 'End key should set to maximum value').toBe(parseFloat(maxValue));
      }
    }
    
    // Test radio button groups
    const radioGroups = await page.locator('fieldset:has(input[type="radio"]), [role="radiogroup"]').all();
    
    for (const radioGroup of radioGroups) {
      const radioButtons = await radioGroup.locator('input[type="radio"], [role="radio"]').all();
      
      if (radioButtons.length > 1) {
        // Focus first radio button
        await radioButtons[0].focus();
        
        // Test arrow key navigation
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
        
        const secondRadioChecked = await radioButtons[1].isChecked();
        expect(secondRadioChecked, 'Arrow down should select next radio button').toBe(true);
        
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(100);
        
        const firstRadioChecked = await radioButtons[0].isChecked();
        expect(firstRadioChecked, 'Arrow up should select previous radio button').toBe(true);
      }
    }
  });

  // Test focus indicators visibility
  test('Focus indicators are visible and sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const focusableSelectors = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ];
    
    for (const selector of focusableSelectors) {
      const elements = await page.locator(selector).all();
      
      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const element = elements[i];
        
        if (await element.isVisible()) {
          await element.focus();
          await page.waitForTimeout(200);
          
          // Check if focus indicator is visible
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
          
          expect(hasFocusIndicator, 
            `${selector}[${i}] should have visible focus indicator`).toBe(true);
          
          // Take screenshot of focused element for visual verification
          await expect(element).toHaveScreenshot(`focus-indicator-${selector.replace(/[^\w]/g, '-')}-${i}.png`);
        }
      }
    }
  });

  // Test keyboard shortcuts help
  test('Keyboard shortcuts help and documentation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for keyboard shortcuts help trigger (usually Shift+? or F1)
    const shortcutTriggers = ['Shift+?', 'F1', 'Ctrl+/', 'Alt+K'];
    
    for (const trigger of shortcutTriggers) {
      try {
        await page.keyboard.press(trigger);
        await page.waitForTimeout(500);
        
        // Check if help dialog appeared
        const helpDialog = await page.locator('[role="dialog"]:has-text("keyboard"), [role="dialog"]:has-text("shortcuts"), .keyboard-help, .shortcuts-help').count();
        
        if (helpDialog > 0) {
          console.log(`Keyboard shortcuts help triggered by ${trigger}`);
          
          // Close help dialog
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          
          break;
        }
      } catch (error) {
        console.log(`Shortcut ${trigger} not implemented`);
      }
    }
  });
});

// Focus management integration tests
test.describe('Focus Management Integration Tests', () => {
  test('Focus management across page navigations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to different pages and ensure focus is properly managed
    const navigationLinks = await page.locator('nav a, .nav-link').all();
    
    for (let i = 0; i < Math.min(navigationLinks.length, 3); i++) {
      const link = navigationLinks[i];
      
      if (await link.isVisible()) {
        await link.focus();
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        
        // Check if focus moved to main content or first heading
        const focusedAfterNavigation = await page.evaluate(() => {
          const focused = document.activeElement;
          return {
            tag: focused?.tagName.toLowerCase(),
            role: focused?.getAttribute('role'),
            text: focused?.textContent?.slice(0, 50)
          };
        });
        
        expect(
          focusedAfterNavigation.role === 'main' ||
          focusedAfterNavigation.tag === 'main' ||
          focusedAfterNavigation.tag?.startsWith('h') ||
          focusedAfterNavigation.text,
          'Focus should be managed on page navigation'
        ).toBeTruthy();
        
        // Go back to test next navigation
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('Focus management in single page app routing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test client-side routing focus management
    const internalLinks = await page.locator('a[href^="/"], .nav-link[data-route]').all();
    
    for (let i = 0; i < Math.min(internalLinks.length, 2); i++) {
      const link = internalLinks[i];
      
      if (await link.isVisible()) {
        const linkHref = await link.getAttribute('href');
        
        await link.click();
        await page.waitForTimeout(1000); // Wait for client-side routing
        
        // Verify URL changed (client-side routing)
        const currentUrl = page.url();
        expect(currentUrl).toContain(linkHref || '');
        
        // Check focus management
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused ? focused.tagName.toLowerCase() : 'body';
        });
        
        expect(focusedElement !== 'body', 
          'Focus should be managed in client-side routing').toBe(true);
      }
    }
  });
});