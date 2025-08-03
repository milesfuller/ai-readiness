---
name: e2e-test
description: End-to-end testing with Playwright for complete user journey validation
command: npx claude-flow deployment e2e-test
category: deployment
agents: 6
parallel: true
mcp_tools: ["playwright", "supabase", "claude-flow"]
---

# End-to-End Testing Workflow

Complete user journey testing with Playwright to ensure all features work together.

## Overview

Tests complete user flows from landing to checkout, including:
- User registration and onboarding
- Authentication flows (login, logout, password reset)
- Core feature workflows
- Payment processing
- Error recovery
- Mobile responsiveness

## Command

```bash
npx claude-flow deployment e2e-test [options]

Options:
  --url <url>         Base URL to test (default: http://localhost:3000)
  --headless          Run tests headless (default: false)
  --record            Record test videos (default: true)
  --flows <list>      Specific flows to test (default: all)
  --device <type>     Device emulation: desktop|mobile|tablet (default: all)
```

## Test Scenarios

### 1. Authentication Flow
```javascript
{
  name: "auth-flow",
  steps: [
    "Navigate to homepage",
    "Click sign up",
    "Fill registration form",
    "Verify email (if required)",
    "Complete profile",
    "Test login",
    "Test logout",
    "Test password reset",
    "Test social auth"
  ],
  validations: [
    "User created in database",
    "Auth tokens valid",
    "Profile data saved",
    "Session persists",
    "Redirects work"
  ]
}
```

### 2. Core Feature Flow
```javascript
{
  name: "core-feature-flow",
  steps: [
    "Login as user",
    "Navigate to main feature",
    "Create new item",
    "Edit item",
    "Share/collaborate",
    "Delete item",
    "Check permissions"
  ],
  validations: [
    "Data persists",
    "Real-time updates work",
    "Permissions enforced",
    "UI updates correctly"
  ]
}
```

### 3. Payment Flow
```javascript
{
  name: "payment-flow", 
  steps: [
    "Add items to cart",
    "Proceed to checkout",
    "Enter payment details",
    "Apply discount code",
    "Complete purchase",
    "Check confirmation",
    "Verify email receipt"
  ],
  validations: [
    "Payment processed",
    "Order created",
    "Inventory updated",
    "Email sent"
  ]
}
```

### 4. Error Recovery Flow
```javascript
{
  name: "error-recovery",
  steps: [
    "Trigger network error",
    "Test offline mode",
    "Simulate API failure",
    "Test form validation",
    "Check error messages",
    "Verify data integrity"
  ],
  validations: [
    "Graceful error handling",
    "No data loss",
    "Clear error messages",
    "Recovery possible"
  ]
}
```

## Playwright Configuration

```javascript
// Generated playwright.config.js
{
  testDir: './e2e-tests',
  timeout: 30000,
  retries: 2,
  workers: 4,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] }
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] }
    }
  ]
}
```

## Agent Responsibilities

### UI Test Agent
- Executes Playwright tests
- Takes screenshots at key points
- Records videos of failures
- Reports UI inconsistencies

### API Validation Agent
- Monitors network requests during tests
- Validates API responses
- Checks response times
- Verifies data integrity

### Database Verification Agent
- Confirms data persistence
- Validates transactions
- Checks data consistency
- Monitors query performance

### Performance Monitor Agent
- Tracks page load times
- Monitors memory usage
- Checks for memory leaks
- Validates Core Web Vitals

### Accessibility Tester Agent
- Runs accessibility audits
- Checks keyboard navigation
- Validates ARIA labels
- Tests screen reader compatibility

### Report Generator Agent
- Compiles test results
- Creates visual reports
- Generates fix recommendations
- Tracks test history

## Output Structure

```
e2e-test-results/
├── report.html           # Visual test report
├── videos/              # Test recordings
├── screenshots/         # Failure screenshots
├── traces/             # Performance traces
├── metrics.json        # Performance metrics
├── accessibility.json  # A11y audit results
└── recommendations.md  # Fix suggestions
```

## Integration Example

```javascript
// In your CI/CD pipeline
steps:
  - name: Run E2E Tests
    run: npx claude-flow deployment e2e-test --headless --url $PREVIEW_URL
  
  - name: Upload Results
    uses: actions/upload-artifact@v3
    with:
      name: e2e-results
      path: e2e-test-results/
```

## Memory Storage

Results stored in:
- `e2e/tests/[timestamp]/results`
- `e2e/tests/[timestamp]/failures`
- `e2e/tests/[timestamp]/performance`
- `e2e/tests/[timestamp]/recommendations`