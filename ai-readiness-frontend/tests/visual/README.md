# Visual Regression Testing Suite

This directory contains comprehensive visual regression tests for the AI Readiness frontend application.

## Overview

The visual regression testing suite captures screenshots of UI components and pages in various states to detect unintended visual changes during development. This is especially important for:

- Detecting CSS regressions
- Verifying responsive design implementations
- Ensuring consistent visual appearance across browsers
- Validating dark/light theme implementations
- Confirming animation removal (wobble effects)

## Test Structure

### Pages Tests (`pages.spec.ts`)
- **Landing Page**: Multiple themes and viewports
- **Authentication Pages**: Login, register, forgot password states
- **Dashboard**: Empty and populated states with mock data
- **Survey Pages**: Creation flow, completion states, progress tracking
- **Admin Pages**: Data visualization, export dialogs
- **Error Pages**: 404, 500 error states
- **Loading States**: Skeleton screens, loading indicators
- **Print Styles**: PDF export layouts
- **High Contrast Mode**: Accessibility compliance
- **Animation Tests**: Before/after animation removal verification

### Components Tests (`components.spec.ts`)
- **Button Components**: All variants (primary, secondary, destructive, ghost, link) in all sizes (sm, default, lg) and states (default, hover, focus, active, disabled, loading)
- **Card Components**: Various content configurations, with/without images
- **Form Components**: Input states, validation errors, focus indicators
- **Navigation**: Responsive behavior across breakpoints
- **Modals/Dialogs**: Overlay states, form interactions
- **Data Visualization**: Charts, tables, progress indicators
- **Loading Components**: Skeletons, spinners, placeholders
- **Toast Notifications**: Success, error, warning, info states
- **Interactive Elements**: Dropdowns, tabs, accordions

## Animation Removal Testing

Special focus on verifying the removal of wobble/bounce animations:

```bash
npm run test:animation-removal
```

This test suite specifically captures:
- Button hover states (should be static, no wobble)
- Menu item hover effects (no bounce)
- Interactive element transitions (smooth but not bouncy)
- Before/after comparison shots

## Usage

### Run All Visual Tests
```bash
npm run test:visual:all
```

### Run Specific Test Categories
```bash
# Desktop visual tests
npm run test:visual

# Mobile responsive tests
npm run test:visual:mobile

# Dark theme tests
npm run test:visual:dark

# Animation removal verification
npm run test:animation-removal
```

### Update Screenshots (Baseline)
```bash
# Update all visual baselines
npm run test:visual:update

# Update specific test
npx playwright test tests/visual/pages.spec.ts --update-snapshots
```

### Debug Visual Tests
```bash
# Interactive debugging
npm run test:visual:debug

# UI mode for easy comparison
npm run test:visual:ui
```

## Configuration

Visual tests use a specialized Playwright configuration (`playwright.visual.config.ts`):

- **Consistent viewport**: 1280x720 for desktop, 375x812 for mobile
- **Animation disabled**: Ensures screenshot stability
- **Single worker**: Prevents test interference
- **Threshold**: 0.2 (20% pixel difference tolerance)
- **Max diff pixels**: 1000 pixels maximum difference

## Screenshot Organization

Screenshots are stored in:
- `test-results/visual/`: Test run artifacts
- `tests/visual/`: Baseline screenshots (committed to git)

Naming convention:
- `{test-name}-{state}-{viewport}.png`
- `component-{variant}-{size}-{state}.png`

## Best Practices

### Writing Visual Tests

1. **Disable animations** before taking screenshots:
```typescript
await prepareForVisualTesting(page, { disableAnimations: true });
```

2. **Wait for content to load**:
```typescript
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
```

3. **Use consistent naming**:
```typescript
await expect(page).toHaveScreenshot(`landing-page-light-desktop.png`);
```

4. **Test multiple states**:
```typescript
const states = ['default', 'hover', 'focus', 'active'];
for (const state of states) {
  // Apply state
  await expect(element).toHaveScreenshot(`button-${state}.png`);
}
```

### Handling Flaky Tests

1. **Mask dynamic content**:
```typescript
await page.addStyleTag({
  content: '.timestamp { visibility: hidden; }'
});
```

2. **Mock API responses** for consistent data:
```typescript
await injectMockData(page, { surveys: mockSurveyData });
```

3. **Adjust thresholds** for acceptable differences:
```typescript
await expect(page).toHaveScreenshot('page.png', { threshold: 0.3 });
```

## Integration with CI/CD

Visual tests run in CI pipeline:

1. **Baseline maintenance**: Screenshots are committed to repository
2. **Failure artifacts**: Failed test screenshots saved for review
3. **Diff reports**: HTML reports show before/after comparisons
4. **Branch protection**: Visual regressions prevent merge

## Accessibility Integration

Visual tests work alongside accessibility tests to ensure:
- Focus indicators are visible in screenshots
- High contrast mode renders properly
- Color contrast meets requirements
- Interactive states are visually distinct

## Troubleshooting

### Common Issues

1. **Font loading**: Ensure `document.fonts.ready` is awaited
2. **Animation timing**: Verify animations are properly disabled
3. **Dynamic content**: Mock time-dependent or random content
4. **Viewport differences**: Use consistent viewport sizes
5. **Network timing**: Wait for `networkidle` state

### Debugging Failed Tests

1. **View diff in HTML report**:
```bash
npx playwright show-report test-results/visual-report
```

2. **Run single test with debug**:
```bash
npx playwright test tests/visual/pages.spec.ts:10 --debug
```

3. **Update baseline if change is intentional**:
```bash
npm run test:visual:update
```

## Performance Considerations

- Visual tests are slower than unit tests
- Single-worker execution prevents parallelization conflicts
- Large screenshot files should be periodically cleaned
- CI timeouts should account for screenshot generation time

## Future Enhancements

- [ ] Percy.io integration for advanced diff algorithms  
- [ ] Cross-browser visual testing automation
- [ ] Automated baseline update workflows
- [ ] Visual test result dashboards
- [ ] Performance impact monitoring of visual changes