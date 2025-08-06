# Accessibility Testing Suite

This directory contains comprehensive accessibility tests for the AI Readiness frontend application to ensure WCAG compliance and inclusive user experience.

## Overview

The accessibility testing suite validates:
- **WCAG 2.1 AA compliance** across all pages and components
- **Keyboard navigation** patterns and focus management
- **Screen reader compatibility** with proper ARIA implementation
- **Color contrast ratios** meeting accessibility standards
- **Semantic HTML structure** and proper heading hierarchy

## Test Structure

### ARIA Tests (`aria.spec.ts`)
- **Page Structure**: ARIA landmarks, roles, and semantic structure
- **Heading Hierarchy**: Logical h1→h2→h3 progression
- **Form Labels**: Proper label association and error descriptions
- **Live Regions**: ARIA live regions for dynamic content updates
- **Interactive States**: Button states, navigation current page indicators
- **Modal Dialogs**: Dialog roles, focus management, accessible names
- **Data Tables**: Proper table structure, column headers, sorting states
- **Progress Indicators**: Progress bars with proper value attributes
- **Comprehensive Audit**: Full axe-core accessibility scanning

### Keyboard Navigation Tests (`keyboard.spec.ts`)
- **Tab Navigation**: Sequential focus through all interactive elements
- **Form Navigation**: Keyboard submission, validation error handling
- **Skip Links**: "Skip to main content" functionality
- **Modal Focus Management**: Focus trapping and restoration
- **Dropdown Navigation**: Arrow key navigation, Home/End keys
- **Table Interaction**: Sortable headers, cell navigation
- **Search Functionality**: Keyboard shortcuts and search submission
- **Complex Widgets**: Sliders, radio groups, custom components
- **Focus Indicators**: Visible focus states for all interactive elements

## Key Features

### Animation Accessibility Testing
Special validation of animation removal for accessibility:
- Verify no motion for users with vestibular disorders
- Test `prefers-reduced-motion` compliance
- Confirm static hover states replace bouncing animations

### Screen Reader Testing
Integration with screen reader simulation:
- ARIA announcements for dynamic content
- Proper reading order and navigation
- Alternative text for images and media
- Form validation announcements

### Color and Contrast
Automated color contrast validation:
- 4.5:1 ratio for normal text
- 3:1 ratio for large text
- High contrast mode testing
- Color-blind friendly design verification

## Usage

### Run All Accessibility Tests
```bash
npm run test:accessibility:all
```

### Run Specific Test Categories
```bash
# ARIA and semantic structure
npx playwright test tests/accessibility/aria.spec.ts

# Keyboard navigation
npx playwright test tests/accessibility/keyboard.spec.ts

# High contrast mode
npm run test:accessibility:high-contrast

# Firefox compatibility
npm run test:accessibility:firefox
```

### Generate Accessibility Report
```bash
npm run test:accessibility:report
```

This generates a detailed JSON report with:
- WCAG violation details
- Severity levels (critical, serious, moderate, minor)
- Remediation suggestions
- Element selectors for fixing issues

### Debug Accessibility Issues
```bash
# Interactive debugging with accessibility tree
npx playwright test tests/accessibility/aria.spec.ts --debug

# Run with detailed axe output
npx playwright test tests/accessibility/ --reporter=verbose
```

## Configuration

Accessibility tests use specialized configuration:
- **axe-core integration**: Automated WCAG scanning
- **Multiple browsers**: Chrome and Firefox testing
- **Assistive technology simulation**: Screen reader behavior
- **High contrast mode**: Windows high contrast testing

## Test Categories

### 1. Structural Accessibility
- Semantic HTML elements (`main`, `nav`, `article`, etc.)
- Proper heading hierarchy
- Landmark roles and regions
- Document structure validation

### 2. Interactive Element Accessibility
- Keyboard accessibility for all controls
- Focus management and visible indicators
- Button and link accessibility
- Form control labeling

### 3. Dynamic Content Accessibility
- ARIA live regions for updates
- Loading state announcements
- Error message association
- Progress indication for async operations

### 4. Media and Visual Accessibility
- Alternative text for images
- Video captions and audio descriptions
- Color contrast validation
- High contrast mode compatibility

### 5. Navigation Accessibility
- Skip links functionality
- Breadcrumb navigation
- Tab order logical flow
- Keyboard shortcuts documentation

## Best Practices

### Writing Accessibility Tests

1. **Use axe-core for comprehensive scanning**:
```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

await injectAxe(page);
await checkA11y(page);
```

2. **Test keyboard navigation patterns**:
```typescript
await page.keyboard.press('Tab');
const focusedElement = await page.evaluate(() => document.activeElement);
expect(focusedElement).toBeTruthy();
```

3. **Validate ARIA implementation**:
```typescript
const ariaLabel = await element.getAttribute('aria-label');
expect(ariaLabel).toBeTruthy();
```

4. **Check color contrast**:
```typescript
const contrastResults = await checkColorContrast(page, [
  { selector: 'button', expectedRatio: 4.5 }
]);
expect(contrastResults.every(r => r.passed)).toBe(true);
```

### Common Accessibility Patterns

#### Modal Dialog
```typescript
// Check dialog role and accessible name
expect(await modal.getAttribute('role')).toBe('dialog');
expect(await modal.getAttribute('aria-label')).toBeTruthy();

// Test focus management
await modalTrigger.click();
expect(await page.evaluate(() => modal.contains(document.activeElement))).toBe(true);

// Test focus trapping and restoration
await page.keyboard.press('Escape');
expect(await page.evaluate(() => modalTrigger === document.activeElement)).toBe(true);
```

#### Form Accessibility
```typescript
// Validate label association
const emailInput = page.locator('input[name="email"]');
const inputId = await emailInput.getAttribute('id');
const label = page.locator(`label[for="${inputId}"]`);
expect(await label.count()).toBe(1);

// Check error association
await submitFormWithErrors();
const ariaDescribedby = await emailInput.getAttribute('aria-describedby');
const errorMessage = page.locator(`#${ariaDescribedby}`);
expect(await errorMessage.count()).toBe(1);
```

## Integration with CI/CD

Accessibility tests are integrated into the CI pipeline:

1. **Automated WCAG scanning** on every pull request
2. **Accessibility regression prevention** via failing builds
3. **Detailed reports** for remediation guidance
4. **Progressive enhancement** validation

## Accessibility Standards

Tests validate compliance with:
- **WCAG 2.1 Level AA**: Web Content Accessibility Guidelines
- **Section 508**: US Federal accessibility requirements
- **ADA compliance**: Americans with Disabilities Act digital standards
- **EN 301 549**: European accessibility standard

## Error Remediation

### Common Accessibility Issues and Fixes

1. **Missing ARIA labels**:
```html
<!-- ❌ Inaccessible -->
<button><span class="icon-save"></span></button>

<!-- ✅ Accessible -->
<button aria-label="Save document"><span class="icon-save"></span></button>
```

2. **Improper heading hierarchy**:
```html
<!-- ❌ Skip level -->
<h1>Main Title</h1>
<h3>Subsection</h3>

<!-- ✅ Logical progression -->
<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

3. **Missing form labels**:
```html
<!-- ❌ Unlabeled input -->
<input type="email" placeholder="Email">

<!-- ✅ Properly labeled -->
<label for="email">Email Address</label>
<input type="email" id="email" required aria-describedby="email-error">
<div id="email-error" role="alert">Please enter a valid email</div>
```

4. **Poor color contrast**:
```css
/* ❌ Insufficient contrast (2.1:1) */
.text { color: #999; background: #fff; }

/* ✅ Sufficient contrast (4.6:1) */
.text { color: #666; background: #fff; }
```

## Assistive Technology Testing

### Screen Reader Compatibility
- **NVDA** (Windows): Primary testing target
- **JAWS** (Windows): Enterprise screen reader
- **VoiceOver** (macOS): Built-in screen reader
- **TalkBack** (Android): Mobile screen reader

### Keyboard Navigation Support
- **Tab/Shift+Tab**: Sequential navigation
- **Arrow keys**: Menu and table navigation
- **Enter/Space**: Activation keys
- **Escape**: Modal dismissal
- **Home/End**: Beginning/end navigation

### Voice Control
- **Dragon NaturallySpeaking**: Voice navigation testing
- **Voice Control** (macOS/iOS): Built-in voice commands

## Reporting and Metrics

### Accessibility Metrics Tracked
- **WCAG violation count** by severity level
- **Keyboard navigation coverage** percentage
- **Color contrast pass rate**
- **ARIA implementation completeness**
- **Screen reader compatibility score**

### Regular Audits
- **Weekly automated scans** of all pages
- **Monthly manual testing** with assistive technology
- **Quarterly accessibility review** with disabled users
- **Annual third-party accessibility audit**

## Resources and Training

### Accessibility Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/): Browser extension
- [WAVE](https://wave.webaim.org/): Web accessibility evaluator
- [Color Oracle](https://colororacle.org/): Color blindness simulator

### Training Resources
- Internal accessibility training documentation
- Screen reader usage guidelines
- Keyboard navigation best practices
- ARIA implementation patterns