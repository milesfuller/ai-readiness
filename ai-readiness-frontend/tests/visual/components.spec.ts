/**
 * Visual Regression Tests for Components
 * 
 * Tests screenshot comparison for individual components in various states
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Component Visual Regression Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
      `
    });
  });

  // Button Component States
  test('Button component - all variants and states', async ({ page }) => {
    await page.goto('/ui-showcase'); // Assuming there's a showcase page
    await page.waitForLoadState('networkidle');
    
    // Button variants
    const variants = ['primary', 'secondary', 'destructive', 'ghost', 'link'];
    const sizes = ['sm', 'default', 'lg'];
    const states = ['default', 'hover', 'active', 'disabled', 'loading'];
    
    for (const variant of variants) {
      for (const size of sizes) {
        const selector = `[data-variant="${variant}"][data-size="${size}"]`;
        const button = page.locator(selector).first();
        
        if (await button.isVisible()) {
          // Default state
          await expect(button).toHaveScreenshot(`button-${variant}-${size}-default.png`);
          
          // Hover state
          await button.hover();
          await expect(button).toHaveScreenshot(`button-${variant}-${size}-hover.png`);
          
          // Focus state  
          await button.focus();
          await expect(button).toHaveScreenshot(`button-${variant}-${size}-focus.png`);
          
          // Active state
          await button.click({ force: true });
          await expect(button).toHaveScreenshot(`button-${variant}-${size}-active.png`);
        }
      }
    }
  });

  // Card Component States
  test('Card component - content variations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Different card configurations
    const cardConfigs = [
      { title: 'Basic Card', content: 'Simple content', hasImage: false },
      { title: 'Card with Image', content: 'Content with image', hasImage: true },
      { title: 'Long Title Card That Might Wrap', content: 'Very long content that might cause the card to expand and test the layout behavior with multiple lines of text', hasImage: false },
      { title: 'Empty Card', content: '', hasImage: false }
    ];
    
    for (let i = 0; i < cardConfigs.length; i++) {
      const config = cardConfigs[i];
      
      // Inject test card
      await page.evaluate((cardConfig, index) => {
        const testArea = document.querySelector('#test-area') || document.body;
        const card = document.createElement('div');
        card.className = 'card max-w-sm';
        card.innerHTML = `
          <div class="card-header">
            <h3 class="card-title">${cardConfig.title}</h3>
          </div>
          <div class="card-content">
            ${cardConfig.hasImage ? '<img src="/placeholder-image.jpg" alt="Test" class="w-full h-32 object-cover" />' : ''}
            <p>${cardConfig.content}</p>
          </div>
        `;
        testArea.appendChild(card);
      }, config, i);
      
      await page.waitForTimeout(300);
      await expect(page.locator('.card').last()).toHaveScreenshot(`card-variant-${i}.png`);
    }
  });

  // Form Components
  test('Form components - input states and validation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Input field states
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    
    // Empty state
    await expect(page).toHaveScreenshot('form-inputs-empty.png');
    
    // Focused state
    await emailInput.focus();
    await expect(page).toHaveScreenshot('form-input-email-focused.png');
    
    // Filled valid state
    await emailInput.fill('test@example.com');
    await passwordInput.fill('ValidPassword123!');
    await expect(page).toHaveScreenshot('form-inputs-valid.png');
    
    // Error state
    await emailInput.fill('invalid-email');
    await passwordInput.fill('short');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('form-inputs-error.png');
  });

  // Navigation Components
  test('Navigation components - responsive behavior', async ({ page }) => {
    // Desktop navigation
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('nav')).toHaveScreenshot('navigation-desktop.png');
    
    // Tablet navigation
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page.locator('nav')).toHaveScreenshot('navigation-tablet.png');
    
    // Mobile navigation (collapsed)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    await expect(page.locator('nav')).toHaveScreenshot('navigation-mobile-collapsed.png');
    
    // Mobile navigation (expanded)
    const menuToggle = page.locator('[data-testid="menu-toggle"]');
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
      await page.waitForTimeout(300);
      await expect(page.locator('nav')).toHaveScreenshot('navigation-mobile-expanded.png');
    }
  });

  // Modal and Dialog Components
  test('Modal and dialog components - overlay states', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Trigger modal
    const exportButton = page.locator('[data-testid="export-button"]');
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(300);
      
      // Modal open state
      await expect(page).toHaveScreenshot('modal-export-open.png');
      
      // Modal with form filled
      await page.fill('[data-testid="export-format"]', 'PDF');
      await page.check('[data-testid="include-charts"]');
      await expect(page).toHaveScreenshot('modal-export-filled.png');
    }
  });

  // Data Visualization Components
  test('Chart and visualization components', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Mock chart data
    await page.evaluate(() => {
      const chartData = {
        survey_responses: [
          { name: 'Week 1', responses: 24 },
          { name: 'Week 2', responses: 35 },
          { name: 'Week 3', responses: 28 },
          { name: 'Week 4', responses: 42 }
        ],
        completion_rates: [
          { department: 'Engineering', rate: 85 },
          { department: 'Product', rate: 92 },
          { department: 'Marketing', rate: 78 },
          { department: 'Sales', rate: 88 }
        ]
      };
      
      window.dispatchEvent(new CustomEvent('loadChartData', { detail: chartData }));
    });
    
    await page.waitForTimeout(2000); // Wait for charts to render
    
    // Individual chart components
    const charts = await page.locator('[data-testid*="chart"]').all();
    for (let i = 0; i < charts.length; i++) {
      await expect(charts[i]).toHaveScreenshot(`chart-component-${i}.png`);
    }
  });

  // Table Components
  test('Table component - data states and sorting', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForLoadState('networkidle');
    
    // Empty table state
    await page.evaluate(() => {
      const table = document.querySelector('table tbody');
      if (table) table.innerHTML = '<tr><td colspan="100%" class="text-center py-8">No data available</td></tr>';
    });
    await expect(page.locator('table')).toHaveScreenshot('table-empty.png');
    
    // Populated table state
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table')).toHaveScreenshot('table-populated.png');
    
    // Sorted table state
    const sortHeader = page.locator('th[data-sortable]').first();
    if (await sortHeader.isVisible()) {
      await sortHeader.click();
      await page.waitForTimeout(300);
      await expect(page.locator('table')).toHaveScreenshot('table-sorted-asc.png');
      
      await sortHeader.click();
      await page.waitForTimeout(300);
      await expect(page.locator('table')).toHaveScreenshot('table-sorted-desc.png');
    }
  });

  // Loading States
  test('Loading and skeleton components', async ({ page }) => {
    // Mock slow API responses
    await page.route('**/api/**', route => {
      setTimeout(() => {
        route.continue();
      }, 2000);
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(500);
    
    // Capture loading skeletons
    const loadingElements = await page.locator('[data-testid*="skeleton"], .animate-pulse, [data-loading="true"]').all();
    for (let i = 0; i < loadingElements.length; i++) {
      await expect(loadingElements[i]).toHaveScreenshot(`skeleton-${i}.png`);
    }
  });

  // Toast and Notification Components
  test('Toast and notification states', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Trigger different types of toasts
    const toastTypes = ['success', 'error', 'warning', 'info'];
    
    for (const type of toastTypes) {
      await page.evaluate((toastType) => {
        // Simulate toast notification
        const event = new CustomEvent('showToast', { 
          detail: { 
            type: toastType, 
            message: `This is a ${toastType} message`,
            title: `${toastType.charAt(0).toUpperCase() + toastType.slice(1)} Notification`
          } 
        });
        window.dispatchEvent(event);
      }, type);
      
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="toast"]')).toHaveScreenshot(`toast-${type}.png`);
      
      // Wait for toast to disappear
      await page.waitForTimeout(3000);
    }
  });

  // Avatar and Profile Components
  test('Avatar component - various states and sizes', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const avatarSizes = ['sm', 'md', 'lg', 'xl'];
    const avatarStates = ['image', 'initials', 'placeholder'];
    
    for (const size of avatarSizes) {
      for (const state of avatarStates) {
        // Inject test avatar
        await page.evaluate((avatarSize, avatarState) => {
          const testArea = document.querySelector('#avatar-test') || document.body;
          const avatar = document.createElement('div');
          avatar.className = `avatar avatar-${avatarSize}`;
          
          switch (avatarState) {
            case 'image':
              avatar.innerHTML = `<img src="/placeholder-avatar.jpg" alt="User Avatar" />`;
              break;
            case 'initials':
              avatar.innerHTML = `<span>JD</span>`;
              break;
            case 'placeholder':
              avatar.innerHTML = `<div class="avatar-placeholder"></div>`;
              break;
          }
          
          testArea.appendChild(avatar);
        }, size, state);
        
        await page.waitForTimeout(200);
        await expect(page.locator('.avatar').last()).toHaveScreenshot(`avatar-${size}-${state}.png`);
      }
    }
  });

  // Badge and Status Components
  test('Badge and status indicators', async ({ page }) => {
    await page.goto('/admin/surveys');
    await page.waitForLoadState('networkidle');
    
    const badgeVariants = ['default', 'success', 'warning', 'error', 'info'];
    const badgeSizes = ['sm', 'md', 'lg'];
    
    for (const variant of badgeVariants) {
      for (const size of badgeSizes) {
        await page.evaluate((badgeVariant, badgeSize) => {
          const testArea = document.querySelector('#badge-test') || document.body;
          const badge = document.createElement('span');
          badge.className = `badge badge-${badgeVariant} badge-${badgeSize}`;
          badge.textContent = `${badgeVariant} ${badgeSize}`;
          testArea.appendChild(badge);
        }, variant, size);
        
        await page.waitForTimeout(100);
        await expect(page.locator('.badge').last()).toHaveScreenshot(`badge-${variant}-${size}.png`);
      }
    }
  });

  // Progress Components
  test('Progress indicators and steps', async ({ page }) => {
    await page.goto('/survey/test-session');
    await page.waitForLoadState('networkidle');
    
    // Progress bar states
    const progressValues = [0, 25, 50, 75, 100];
    
    for (const value of progressValues) {
      await page.evaluate((progressValue) => {
        const progressBar = document.querySelector('[role="progressbar"]');
        if (progressBar) {
          progressBar.setAttribute('aria-valuenow', progressValue.toString());
          progressBar.style.setProperty('--progress', `${progressValue}%`);
        }
      }, value);
      
      await page.waitForTimeout(300);
      await expect(page.locator('[role="progressbar"]')).toHaveScreenshot(`progress-${value}.png`);
    }
  });

  // Dropdown and Select Components
  test('Dropdown and select components', async ({ page }) => {
    await page.goto('/survey');
    await page.waitForLoadState('networkidle');
    
    // Select component states
    const selectElement = page.locator('select, [role="combobox"]').first();
    
    if (await selectElement.isVisible()) {
      // Closed state
      await expect(selectElement).toHaveScreenshot('select-closed.png');
      
      // Opened state
      await selectElement.click();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('select-opened.png');
      
      // Selected state
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await expect(selectElement).toHaveScreenshot('select-selected.png');
    }
  });
});

// Component interaction tests
test.describe('Component Interaction Tests', () => {
  test('Interactive component behaviors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Test collapsible components
    const collapsibles = await page.locator('[data-testid*="collapsible"]').all();
    
    for (let i = 0; i < collapsibles.length; i++) {
      const collapsible = collapsibles[i];
      
      // Expanded state
      if (await collapsible.isVisible()) {
        await expect(collapsible).toHaveScreenshot(`collapsible-${i}-expanded.png`);
        
        // Collapsed state
        const trigger = collapsible.locator('[data-testid*="trigger"]');
        if (await trigger.isVisible()) {
          await trigger.click();
          await page.waitForTimeout(300);
          await expect(collapsible).toHaveScreenshot(`collapsible-${i}-collapsed.png`);
        }
      }
    }
  });

  test('Hover and focus interaction states', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test interactive elements
    const interactiveElements = await page.locator('button, a, input, [tabindex]').all();
    
    for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
      const element = interactiveElements[i];
      
      if (await element.isVisible()) {
        // Focus state
        await element.focus();
        await page.waitForTimeout(200);
        await expect(element).toHaveScreenshot(`interactive-${i}-focus.png`);
        
        // Hover state
        await element.hover();
        await page.waitForTimeout(200);
        await expect(element).toHaveScreenshot(`interactive-${i}-hover.png`);
      }
    }
  });
});