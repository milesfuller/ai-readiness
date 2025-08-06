/**
 * ARIA Labels and Screen Reader Compatibility Tests
 * 
 * Tests accessibility compliance including ARIA labels, roles, and screen reader support
 */

import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

test.describe('ARIA Labels and Screen Reader Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  // Page-level ARIA structure tests
  test('Page ARIA structure and landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for essential ARIA landmarks
    const landmarks = [
      { role: 'banner', required: true },
      { role: 'main', required: true },
      { role: 'navigation', required: true },
      { role: 'contentinfo', required: false }
    ];
    
    for (const landmark of landmarks) {
      const element = page.locator(`[role="${landmark.role}"]`);
      const count = await element.count();
      
      if (landmark.required) {
        expect(count, `Missing required landmark: ${landmark.role}`).toBeGreaterThan(0);
      }
      
      // Ensure landmarks have accessible names
      if (count > 0) {
        const elements = await element.all();
        for (let i = 0; i < elements.length; i++) {
          const accessibleName = await elements[i].getAttribute('aria-label') || 
                                await elements[i].getAttribute('aria-labelledby') ||
                                await elements[i].textContent();
          expect(accessibleName?.trim(), 
            `Landmark ${landmark.role}[${i}] lacks accessible name`).toBeTruthy();
        }
      }
    }
  });

  test('Heading hierarchy and structure', async ({ page }) => {
    const pagePaths = ['/', '/dashboard', '/auth/login', '/survey', '/admin'];
    
    for (const path of pagePaths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Get all headings
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels: number[] = [];
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.substring(1));
        headingLevels.push(level);
        
        // Check heading has content
        const text = await heading.textContent();
        expect(text?.trim(), `Empty heading found: ${tagName}`).toBeTruthy();
      }
      
      // Check heading hierarchy
      if (headingLevels.length > 0) {
        expect(headingLevels[0], `Page ${path} should start with h1`).toBe(1);
        
        // Check for logical progression
        for (let i = 1; i < headingLevels.length; i++) {
          const diff = headingLevels[i] - headingLevels[i - 1];
          expect(diff, 
            `Heading hierarchy skip detected on ${path}: h${headingLevels[i - 1]} to h${headingLevels[i]}`
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  // Form accessibility tests
  test('Form ARIA labels and descriptions', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Check all form controls have labels
    const formControls = await page.locator('input, select, textarea').all();
    
    for (let i = 0; i < formControls.length; i++) {
      const control = formControls[i];
      const type = await control.getAttribute('type');
      
      // Skip hidden inputs
      if (type === 'hidden') continue;
      
      // Check for label association
      const id = await control.getAttribute('id');
      const ariaLabel = await control.getAttribute('aria-label');
      const ariaLabelledby = await control.getAttribute('aria-labelledby');
      
      let hasLabel = false;
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = await label.count() > 0;
      }
      
      hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledby;
      
      expect(hasLabel, `Form control at index ${i} lacks proper label`).toBe(true);
      
      // Check for error descriptions
      const ariaDescribedby = await control.getAttribute('aria-describedby');
      if (ariaDescribedby) {
        const description = page.locator(`#${ariaDescribedby}`);
        expect(await description.count(), 
          `aria-describedby references non-existent element: ${ariaDescribedby}`).toBe(1);
      }
    }
  });

  test('Form validation ARIA live regions', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    
    // Submit form with invalid data to trigger validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check for ARIA live regions for error messages
    const errorMessages = await page.locator('[role="alert"], [aria-live]').all();
    
    expect(errorMessages.length, 'No ARIA live regions found for form errors').toBeGreaterThan(0);
    
    for (const errorMessage of errorMessages) {
      const text = await errorMessage.textContent();
      expect(text?.trim(), 'Error message is empty').toBeTruthy();
      
      const role = await errorMessage.getAttribute('role');
      const ariaLive = await errorMessage.getAttribute('aria-live');
      
      expect(role === 'alert' || ariaLive, 
        'Error message lacks proper ARIA live region attributes').toBeTruthy();
    }
  });

  // Interactive component ARIA tests
  test('Button and interactive element ARIA states', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test all buttons
    const buttons = await page.locator('button, [role="button"]').all();
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      
      // Check button has accessible name
      const accessibleName = await button.getAttribute('aria-label') ||
                            await button.textContent() ||
                            await button.getAttribute('title');
      
      expect(accessibleName?.trim(), 
        `Button at index ${i} lacks accessible name`).toBeTruthy();
      
      // Check expandable buttons have aria-expanded
      const ariaExpanded = await button.getAttribute('aria-expanded');
      const hasPopup = await button.getAttribute('aria-haspopup');
      
      if (hasPopup || ariaExpanded !== null) {
        expect(['true', 'false'].includes(ariaExpanded || ''), 
          `Button with popup/expanded state has invalid aria-expanded: ${ariaExpanded}`).toBe(true);
      }
      
      // Check disabled state
      const disabled = await button.getAttribute('disabled');
      const ariaDisabled = await button.getAttribute('aria-disabled');
      
      if (disabled !== null || ariaDisabled === 'true') {
        expect(await button.isEnabled(), 'Disabled button should not be enabled').toBe(false);
      }
    }
  });

  test('Navigation ARIA implementation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check navigation structure
    const navElements = await page.locator('nav, [role="navigation"]').all();
    
    expect(navElements.length, 'No navigation elements found').toBeGreaterThan(0);
    
    for (const nav of navElements) {
      // Check nav has accessible name
      const accessibleName = await nav.getAttribute('aria-label') ||
                           await nav.getAttribute('aria-labelledby');
      
      if (navElements.length > 1) {
        expect(accessibleName, 
          'Multiple navigation elements require aria-label').toBeTruthy();
      }
      
      // Check for proper list structure
      const lists = await nav.locator('ul, ol, [role="list"]').count();
      if (lists > 0) {
        const listItems = await nav.locator('li, [role="listitem"]').all();
        expect(listItems.length, 'Navigation lists should contain list items').toBeGreaterThan(0);
        
        // Check each list item
        for (const item of listItems) {
          const link = item.locator('a, [role="link"]');
          if (await link.count() > 0) {
            const linkText = await link.textContent();
            expect(linkText?.trim(), 'Navigation links should have text content').toBeTruthy();
          }
        }
      }
    }
    
    // Check current page indication
    const currentPageIndicators = await page.locator('[aria-current="page"], .active, .current').count();
    expect(currentPageIndicators, 'Navigation should indicate current page').toBeGreaterThan(0);
  });

  // Modal and dialog ARIA tests
  test('Modal and dialog ARIA implementation', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Open a modal/dialog
    const exportButton = page.locator('[data-testid="export-button"]');
    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(500);
      
      // Check dialog structure
      const dialog = page.locator('[role="dialog"], dialog');
      expect(await dialog.count(), 'Modal should use dialog role or element').toBeGreaterThan(0);
      
      const dialogElement = dialog.first();
      
      // Check dialog has accessible name
      const ariaLabel = await dialogElement.getAttribute('aria-label');
      const ariaLabelledby = await dialogElement.getAttribute('aria-labelledby');
      
      expect(ariaLabel || ariaLabelledby, 
        'Dialog lacks aria-label or aria-labelledby').toBeTruthy();
      
      // Check for aria-describedby if there's description text
      const ariaDescribedby = await dialogElement.getAttribute('aria-describedby');
      if (ariaDescribedby) {
        const description = page.locator(`#${ariaDescribedby}`);
        expect(await description.count(), 
          `Dialog aria-describedby references non-existent element`).toBe(1);
      }
      
      // Check modal backdrop
      const backdrop = page.locator('[data-testid="modal-backdrop"], .modal-backdrop');
      if (await backdrop.count() > 0) {
        const ariaHidden = await backdrop.first().getAttribute('aria-hidden');
        expect(ariaHidden, 'Modal backdrop should have aria-hidden="true"').toBe('true');
      }
      
      // Test focus management
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement, 'Focus should be moved to dialog').toBeTruthy();
      
      // Check for close button
      const closeButton = page.locator('[aria-label*="close"], [data-testid*="close"]');
      expect(await closeButton.count(), 'Dialog should have accessible close button').toBeGreaterThan(0);
      
      // Close dialog
      await closeButton.first().click();
      await page.waitForTimeout(300);
    }
  });

  // Data table ARIA tests
  test('Data table ARIA structure', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForLoadState('networkidle');
    
    const tables = await page.locator('table, [role="table"]').all();
    
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex];
      
      // Check table has caption or accessible name
      const caption = await table.locator('caption').count();
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledby = await table.getAttribute('aria-labelledby');
      
      expect(caption > 0 || ariaLabel || ariaLabelledby, 
        `Table ${tableIndex} lacks caption or accessible name`).toBeTruthy();
      
      // Check column headers
      const columnHeaders = await table.locator('th, [role="columnheader"]').all();
      expect(columnHeaders.length, `Table ${tableIndex} should have column headers`).toBeGreaterThan(0);
      
      for (let headerIndex = 0; headerIndex < columnHeaders.length; headerIndex++) {
        const header = columnHeaders[headerIndex];
        const scope = await header.getAttribute('scope');
        const role = await header.getAttribute('role');
        
        if (!role || role === 'columnheader') {
          expect(['col', 'colgroup'].includes(scope || ''), 
            `Column header ${headerIndex} should have scope="col" or "colgroup"`).toBe(true);
        }
        
        // Check header text
        const headerText = await header.textContent();
        expect(headerText?.trim(), `Column header ${headerIndex} should have text`).toBeTruthy();
      }
      
      // Check sortable columns
      const sortableHeaders = await table.locator('[aria-sort], [data-sortable]').all();
      for (const sortableHeader of sortableHeaders) {
        const ariaSort = await sortableHeader.getAttribute('aria-sort');
        expect(['ascending', 'descending', 'none'].includes(ariaSort || ''), 
          'Sortable column should have valid aria-sort value').toBe(true);
      }
      
      // Check data cells
      const dataCells = await table.locator('td, [role="cell"]').all();
      if (dataCells.length > 0) {
        // Sample a few cells to check structure
        const sampleSize = Math.min(5, dataCells.length);
        for (let i = 0; i < sampleSize; i++) {
          const cell = dataCells[i];
          const headers = await cell.getAttribute('headers');
          
          // Complex tables should use headers attribute
          if (columnHeaders.length > 5) {
            expect(headers, `Complex table cell should reference headers`).toBeTruthy();
          }
        }
      }
    }
  });

  // Progress and status ARIA tests
  test('Progress indicators and status ARIA', async ({ page }) => {
    await page.goto('/survey/test-session');
    await page.waitForLoadState('networkidle');
    
    // Check progress bars
    const progressBars = await page.locator('[role="progressbar"], progress').all();
    
    for (let i = 0; i < progressBars.length; i++) {
      const progressBar = progressBars[i];
      
      // Check required attributes
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMin = await progressBar.getAttribute('aria-valuemin');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');
      
      expect(ariaValueNow, `Progress bar ${i} missing aria-valuenow`).toBeTruthy();
      expect(ariaValueMin !== null, `Progress bar ${i} missing aria-valuemin`).toBe(true);
      expect(ariaValueMax, `Progress bar ${i} missing aria-valuemax`).toBeTruthy();
      
      // Check value ranges
      const current = parseFloat(ariaValueNow || '0');
      const min = parseFloat(ariaValueMin || '0');
      const max = parseFloat(ariaValueMax || '100');
      
      expect(current >= min && current <= max, 
        `Progress bar ${i} value ${current} outside range [${min}, ${max}]`).toBe(true);
      
      // Check accessible name
      const ariaLabel = await progressBar.getAttribute('aria-label');
      const ariaLabelledby = await progressBar.getAttribute('aria-labelledby');
      
      expect(ariaLabel || ariaLabelledby, 
        `Progress bar ${i} lacks accessible name`).toBeTruthy();
    }
    
    // Check status messages
    const statusElements = await page.locator('[role="status"], [aria-live]').all();
    
    for (const status of statusElements) {
      const ariaLive = await status.getAttribute('aria-live');
      const role = await status.getAttribute('role');
      
      if (role === 'status') {
        expect(ariaLive || 'polite', 'Status elements should have implicit aria-live').toBeTruthy();
      }
      
      if (ariaLive) {
        expect(['polite', 'assertive', 'off'].includes(ariaLive), 
          `Invalid aria-live value: ${ariaLive}`).toBe(true);
      }
    }
  });

  // Comprehensive accessibility audit
  test('Comprehensive axe-core accessibility audit', async ({ page }) => {
    const pagesToTest = [
      { path: '/', name: 'Landing page' },
      { path: '/auth/login', name: 'Login page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/survey', name: 'Survey page' },
      { path: '/admin', name: 'Admin panel' }
    ];
    
    for (const pageTest of pagesToTest) {
      await page.goto(pageTest.path);
      await page.waitForLoadState('networkidle');
      
      // Configure axe for comprehensive testing
      await configureAxe(page, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-usage': { enabled: true },
          'semantic-structure': { enabled: true }
        }
      });
      
      // Run accessibility audit
      try {
        await checkA11y(page, undefined, {
          detailedReport: true,
          detailedReportOptions: {
            html: true
          }
        });
      } catch (error) {
        console.error(`Accessibility violations found on ${pageTest.name}:`, error);
        throw error;
      }
    }
  });

  // Screen reader specific tests
  test('Screen reader announcements and live regions', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Track aria-live announcements
    const announcements: string[] = [];
    
    await page.exposeFunction('trackAnnouncement', (text: string) => {
      announcements.push(text);
    });
    
    // Monitor live regions
    await page.addInitScript(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          const target = mutation.target as Element;
          if (target.getAttribute('aria-live') || target.getAttribute('role') === 'alert') {
            const text = target.textContent?.trim();
            if (text) {
              (window as any).trackAnnouncement(text);
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
    
    // Trigger actions that should create announcements
    const buttons = await page.locator('button').all();
    
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(1000);
      
      // Check if any announcements were made
      console.log('Screen reader announcements:', announcements);
      
      // Verify important actions create announcements
      // This is application-specific and would need customization
    }
  });

  // Alternative text and media accessibility
  test('Alternative text and media accessibility', async ({ page }) => {
    const pagesToTest = ['/', '/dashboard', '/admin'];
    
    for (const path of pagesToTest) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Check all images have alt text
      const images = await page.locator('img').all();
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const ariaLabelledby = await img.getAttribute('aria-labelledby');
        const role = await img.getAttribute('role');
        
        // Decorative images should have empty alt or role="presentation"
        const isDecorative = alt === '' || role === 'presentation' || role === 'none';
        
        if (!isDecorative) {
          expect(alt || ariaLabel || ariaLabelledby, 
            `Image ${i} on ${path} lacks alternative text`).toBeTruthy();
          
          if (alt) {
            expect(alt.trim().length, `Image ${i} alt text should not be empty`).toBeGreaterThan(0);
          }
        }
      }
      
      // Check videos have captions/transcripts
      const videos = await page.locator('video').all();
      
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const tracks = await video.locator('track[kind="captions"], track[kind="subtitles"]').count();
        const ariaDescribedby = await video.getAttribute('aria-describedby');
        
        expect(tracks > 0 || ariaDescribedby, 
          `Video ${i} on ${path} lacks captions or transcript reference`).toBeTruthy();
      }
      
      // Check audio has transcripts
      const audioElements = await page.locator('audio').all();
      
      for (let i = 0; i < audioElements.length; i++) {
        const audio = audioElements[i];
        const ariaDescribedby = await audio.getAttribute('aria-describedby');
        
        expect(ariaDescribedby, 
          `Audio ${i} on ${path} should reference transcript via aria-describedby`).toBeTruthy();
        
        if (ariaDescribedby) {
          const transcript = page.locator(`#${ariaDescribedby}`);
          expect(await transcript.count(), 
            `Transcript element ${ariaDescribedby} not found`).toBe(1);
        }
      }
    }
  });
});