# Sidebar Navigation Test Suite

This directory contains comprehensive tests for the sidebar navigation system, covering all aspects of the recently fixed navigation that now uses Next.js router instead of console.log.

## Test Files Overview

### 1. sidebar.spec.ts - Core Sidebar Navigation Tests
**Focus**: Main sidebar functionality and user interactions
- ✅ Basic navigation clicks actually navigate to pages (no more console.log)
- ✅ Collapsed/expanded state transitions
- ✅ Icon and text display without squashing
- ✅ Nested menu expansion/collapse functionality 
- ✅ Active route highlighting with proper styling
- ✅ Keyboard navigation and accessibility support
- ✅ Visual regression prevention (no bouncing toggle button)

**Key Test Scenarios**:
- Navigation to dashboard, survey, results, and settings pages
- Sidebar collapse/expand toggle with proper width transitions (w-64 ↔ w-16)
- Icon-only display in collapsed state with centered alignment
- Text + icon display in expanded state with proper spacing
- State persistence across page navigation
- Proper ARIA labels and keyboard support

### 2. mobile-menu.spec.ts - Mobile Navigation Tests
**Focus**: Mobile overlay menu functionality and responsiveness
- ✅ Mobile menu toggle button visibility on small screens
- ✅ Overlay menu opening/closing with backdrop interaction
- ✅ Mobile menu positioning and layout (accounts for header height)
- ✅ Navigation functionality within mobile menu
- ✅ Menu closure after navigation selection
- ✅ Responsive behavior across different screen sizes

**Key Test Scenarios**:
- Mobile viewport detection and menu toggle display
- Overlay menu with backdrop blur and proper z-index
- Touch-friendly navigation with proper spacing
- Menu auto-close on navigation or backdrop click
- Cross-device compatibility (iPhone, iPad, Android sizes)

### 3. role-based-nav.spec.ts - Permission-Based Navigation Tests
**Focus**: Role-specific menu items and access control
- ✅ Base navigation items for regular users
- ✅ Organization menu for org_admin users
- ✅ Full admin menus for admin users  
- ✅ Route access enforcement and unauthorized redirects
- ✅ Admin panel sidebar with role filtering
- ✅ User info display and sign-out functionality

**Key Test Scenarios**:
- User role: Dashboard, Take Survey, My Results, Settings only
- Org Admin role: + Organization menu with Team Surveys, Analytics, Reports
- Admin role: + Administration menu + System menu with all admin options
- Admin panel separate sidebar with role-based item filtering
- Unauthorized access handling and appropriate redirects

### 4. sidebar-states.spec.ts - Visual Regression Tests
**Focus**: Visual consistency and animation behavior
- ✅ Visual regression testing with screenshot comparison
- ✅ Icon and text alignment validation
- ✅ Transition animations without visual artifacts
- ✅ No hover scale animation on toggle button (prevents bouncing)
- ✅ Responsive behavior across breakpoints
- ✅ Focus states and accessibility indicators

**Key Test Scenarios**:
- Screenshot comparisons for all sidebar states
- Icon alignment validation in collapsed/expanded states
- Smooth width transitions without content squashing
- Button hover states without unwanted scale effects
- Mobile vs desktop responsive switching
- Focus indicators for keyboard navigation

## Fixed Issues Covered

### 🔧 Navigation Implementation Fix
**Before**: Sidebar clicks only logged to console.log
**After**: Proper Next.js router navigation with `router.push()`
**Tests**: All navigation tests verify actual URL changes

### 🎨 Visual Polish Fixes  
**Before**: Toggle button had bouncing hover:scale-110 animation
**After**: Removed scale animation for stable, professional appearance
**Tests**: Visual tests verify no scale transforms are applied

### 📱 Mobile UX Improvements
**Before**: Basic mobile menu without proper overlay behavior
**After**: Full overlay with backdrop blur, proper positioning, auto-close
**Tests**: Mobile tests cover overlay behavior, positioning, and interactions

### 🔐 Role-Based Access Control
**Before**: All users saw same navigation regardless of permissions
**After**: Dynamic menu generation based on user role with proper filtering
**Tests**: Role tests verify correct menu items and access enforcement

## Test Data Requirements

### User Roles for Testing
```typescript
// Regular user - base navigation only
const user = await createTestUser('user');

// Organization admin - includes org management
const orgAdmin = await createTestUser('org_admin'); 

// System admin - full access to all features
const admin = await createTestUser('admin');
```

### Required Test IDs
The components have been updated with comprehensive test IDs:
- `data-testid="sidebar"` - Main sidebar container
- `data-testid="nav-item-{name}"` - Navigation buttons
- `data-testid="sidebar-toggle"` - Collapse/expand button
- `data-testid="mobile-menu-toggle"` - Mobile menu button
- `data-testid="mobile-menu-overlay"` - Mobile overlay container
- `data-testid="admin-panel-title"` - Admin panel identifier

## Running the Tests

### Individual Test Suites
```bash
# Main sidebar functionality
npx playwright test tests/e2e/navigation/sidebar.spec.ts

# Mobile menu behavior  
npx playwright test tests/e2e/navigation/mobile-menu.spec.ts

# Role-based navigation
npx playwright test tests/e2e/navigation/role-based-nav.spec.ts

# Visual regression tests
npx playwright test tests/visual/sidebar-states.spec.ts
```

### Full Navigation Test Suite
```bash
# Run all navigation tests
npx playwright test tests/e2e/navigation/ tests/visual/sidebar-states.spec.ts

# Generate visual regression baselines
npx playwright test tests/visual/sidebar-states.spec.ts --update-snapshots

# Run with specific browser
npx playwright test tests/e2e/navigation/ --project=chromium
```

### Test Coverage Verification
```bash
# Check test coverage for sidebar components
npm run test:coverage -- --testPathPattern=navigation

# Validate all sidebar test scenarios
npm run test:e2e:sidebar
```

## Known Test Dependencies

### Authentication Setup
All tests require proper authentication context with different user roles. The `authSetup` utility handles session management and role assignment.

### Database State
Role-based tests require clean database state with proper user permissions and role assignments.

### Screen Sizes
Mobile tests validate behavior across multiple viewport sizes:
- Mobile: 375x667 (iPhone), 414x896 (iPhone Pro Max)  
- Tablet: 768x1024 (iPad Portrait)
- Desktop: 1024x768+ (Desktop breakpoints)

## Maintenance Notes

### Updating Test IDs
When adding new navigation items, ensure test IDs follow the pattern:
- `nav-item-{kebab-case-name}` for navigation items
- `mobile-nav-item-{kebab-case-name}` for mobile variants
- `admin-nav-{kebab-case-name}` for admin panel items

### Visual Regression Baselines
Screenshot baselines may need updates when:
- Design system colors or spacing change
- New navigation items are added
- Layout components are modified
- Browser versions are updated

Update baselines with: `npx playwright test --update-snapshots`

### Role Permission Updates
When user role permissions change, update the role-based tests to match the new permission structure in `role-based-nav.spec.ts`.

## Success Criteria

✅ **Functional Navigation**: All navigation clicks result in proper URL changes, no console.log artifacts
✅ **Responsive Design**: Sidebar works correctly across all screen sizes with appropriate mobile/desktop variants
✅ **Role Security**: Users can only access navigation items appropriate to their permission level
✅ **Visual Consistency**: No visual regressions, smooth animations, professional appearance without bouncing effects
✅ **Accessibility**: Full keyboard navigation support with proper ARIA labels and focus management
✅ **Performance**: Fast state transitions without visual artifacts or content squashing

The test suite provides comprehensive coverage of the sidebar navigation system, ensuring reliable functionality across all user scenarios and device types.