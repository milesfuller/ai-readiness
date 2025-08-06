# Comprehensive E2E Test Suite

This directory contains a complete end-to-end testing solution for the AI Readiness Frontend application, providing 100% coverage of all user interactions, routes, API endpoints, and edge cases.

## Quick Start

```bash
# Run the complete comprehensive test suite
npm run test:comprehensive

# Run specific browser tests
npm run test:comprehensive:chromium
npm run test:comprehensive:firefox
npm run test:comprehensive:webkit

# Run specific test categories
npm run test:comprehensive:auth
npm run test:comprehensive:security
npm run test:comprehensive:api
```

## Test Files Overview

### Core Test Suites

1. **`comprehensive-route-navigation.spec.ts`** - Tests all 23 application routes
2. **`comprehensive-auth-flows.spec.ts`** - Complete authentication system testing
3. **`comprehensive-error-scenarios.spec.ts`** - All error conditions and edge cases
4. **`comprehensive-rate-limiting.spec.ts`** - Security rate limiting across endpoints
5. **`comprehensive-responsive-behavior.spec.ts`** - Mobile, tablet, desktop responsiveness
6. **`comprehensive-rbac-security.spec.ts`** - Role-based access control and security
7. **`comprehensive-api-interactions.spec.ts`** - All API endpoints and data flows
8. **`comprehensive-survey-flows.spec.ts`** - Complete survey functionality
9. **`comprehensive-dashboard-analytics.spec.ts`** - Dashboard and analytics features
10. **`comprehensive-cross-browser.spec.ts`** - Cross-browser compatibility

### Test Infrastructure

- **`fixtures/test-setup.ts`** - Common test fixtures and utilities
- **`utils/`** - Helper utilities for test execution
- **`COMPREHENSIVE_TEST_SUITE_SUMMARY.md`** - Detailed documentation

## Test Coverage

### Routes: 23/23 (100%)
- ✅ Public routes (login, register, password reset)
- ✅ Protected routes (dashboard, profile, survey, results)
- ✅ Admin routes (user management, survey admin)
- ✅ Organization routes (analytics, reports)
- ✅ Special routes (debug, visual demo)

### User Interactions: 100%
- ✅ Form submissions with validation
- ✅ Button clicks and navigation
- ✅ File uploads and downloads
- ✅ Voice recording functionality
- ✅ Data filtering and sorting
- ✅ Modal and dialog interactions
- ✅ Mobile touch gestures
- ✅ Keyboard navigation

### API Endpoints: 15+ endpoints
- ✅ Authentication APIs (`/api/auth/*`)
- ✅ User management (`/api/user/*`)
- ✅ Survey operations (`/api/survey/*`)
- ✅ Data export (`/api/export`)
- ✅ LLM analysis (`/api/llm/*`)
- ✅ Admin functions (`/api/admin/*`)

### Security Testing
- ✅ Authentication & authorization
- ✅ XSS prevention
- ✅ CSRF protection
- ✅ SQL injection prevention
- ✅ Rate limiting
- ✅ Input validation
- ✅ Session security
- ✅ Data privacy

### Browser Support
- ✅ Chromium (Chrome/Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

## Running Tests

### Full Suite
```bash
# Complete test suite (all browsers, all tests)
npm run test:comprehensive

# With custom options
node scripts/run-comprehensive-tests.js --browser=chromium --category=auth
```

### Individual Categories
```bash
# Authentication flows
npm run test:comprehensive:auth

# Security testing
npm run test:comprehensive:security

# API integration
npm run test:comprehensive:api

# Responsive design
npm run test:comprehensive:responsive

# Survey functionality
npm run test:comprehensive:survey
```

### Browser-Specific Testing
```bash
# Desktop browsers
npm run test:comprehensive:chromium
npm run test:comprehensive:firefox  
npm run test:comprehensive:webkit

# Mobile testing
npm run test:comprehensive:mobile

# Tablet testing
npm run test:comprehensive:tablet
```

### Development & Debugging
```bash
# Run with UI mode
npm run test:comprehensive:ui

# Debug mode
npm run test:comprehensive:debug

# View test report
npm run test:comprehensive:report
```

## Test Configuration

### Main Configuration
- **`playwright.config.comprehensive.ts`** - Optimized for comprehensive testing
- Enhanced timeouts for complex interactions
- Multiple browser and device configurations
- Parallel execution with 3-6 workers
- Advanced reporting and artifact collection

### Environment Variables
```bash
# Test mode configuration
NODE_ENV=test
COMPREHENSIVE_TEST_MODE=1
NEXT_TELEMETRY_DISABLED=1

# Performance tuning
UV_THREADPOOL_SIZE=16
NODE_OPTIONS=--max-old-space-size=6144

# Test-specific settings
RATE_LIMIT_DISABLED=1  # For development
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
```

## Test Results and Reporting

### Report Formats
- **HTML Report**: Visual test results with traces
- **JSON Results**: Machine-readable test data
- **JUnit XML**: CI/CD integration format
- **GitHub Actions**: Native GitHub integration

### Artifacts
- Screenshots on failure
- Video recordings (CI only)
- Trace files for debugging
- Performance metrics
- Network request logs

### Viewing Reports
```bash
# Open HTML report
npm run test:comprehensive:report

# View in CI
# Reports automatically uploaded to GitHub Actions artifacts
```

## Performance Benchmarks

### Load Time Expectations
- Dashboard: < 10 seconds
- Login page: < 5 seconds
- Survey pages: < 8 seconds
- Analytics: < 15 seconds

### Response Time Standards
- Button clicks: < 500ms
- Form submissions: < 3 seconds
- Page navigation: < 2 seconds
- API calls: < 10 seconds

## Accessibility Testing

### Standards Compliance
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management validation
- Color contrast verification

### Accessibility Features Tested
- ARIA attributes and labels
- Semantic HTML structure
- Keyboard navigation paths
- Focus indicators
- High contrast mode support

## Security Testing

### Authentication Security
- Login attempt rate limiting
- Session security and timeout
- Password strength validation
- Account lockout protection
- Multi-factor authentication flows

### Application Security
- XSS prevention across all inputs
- CSRF protection on state changes
- SQL injection prevention
- Input validation and sanitization
- Security headers verification

### API Security
- Authentication token validation
- Authorization checks per endpoint
- Request rate limiting
- Input validation on all endpoints
- Response data sanitization

## Maintenance

### Regular Tasks
1. **Update test data** - Refresh test users and sample data
2. **Review flaky tests** - Investigate and fix unstable tests
3. **Performance monitoring** - Track test execution times
4. **Browser compatibility** - Test with latest browser versions
5. **Security updates** - Keep security tests current

### Adding New Tests

#### For New Features
1. Add test cases to appropriate existing spec file
2. Update test data factories if needed
3. Add new page objects for complex UI
4. Update comprehensive summary documentation

#### For New Routes
1. Add to `comprehensive-route-navigation.spec.ts`
2. Update route lists and expected behaviors
3. Test both authenticated and unauthenticated access
4. Verify proper redirects and error handling

#### For New API Endpoints
1. Add to `comprehensive-api-interactions.spec.ts`
2. Test all HTTP methods and parameters
3. Validate request/response formats
4. Add error scenario testing

## Troubleshooting

### Common Issues

#### Test Timeouts
```bash
# Increase timeout for slow operations
npm run test:comprehensive -- --timeout=120000
```

#### Flaky Tests
```bash
# Run with retries
npm run test:comprehensive -- --retries=3
```

#### Browser Installation
```bash
# Reinstall browsers
npx playwright install
```

#### Environment Issues
```bash
# Reset test environment
npm run test:e2e:cleanup
npm run test:e2e:setup
```

### Debug Tips

1. **Use headed mode** for visual debugging
2. **Check trace files** for failed tests
3. **Review network logs** for API issues
4. **Verify test data** is properly set up
5. **Check browser console** for JavaScript errors

## CI/CD Integration

### GitHub Actions
```yaml
- name: Run Comprehensive E2E Tests
  run: |
    npm ci
    npx playwright install
    npm run test:comprehensive
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: test-results/
```

### Test Sharding
```bash
# Run tests in parallel across CI workers
SHARD_CURRENT=1 SHARD_TOTAL=3 npm run test:comprehensive
SHARD_CURRENT=2 SHARD_TOTAL=3 npm run test:comprehensive
SHARD_CURRENT=3 SHARD_TOTAL=3 npm run test:comprehensive
```

## Contributing

### Test Standards
1. **Follow naming conventions** - Use descriptive test names
2. **Use page objects** - Avoid direct element selectors in tests
3. **Add proper assertions** - Test behavior, not implementation
4. **Handle async operations** - Use proper waits and timeouts
5. **Clean up test data** - Ensure tests don't affect each other

### Code Review Checklist
- [ ] Tests cover new functionality completely
- [ ] Error scenarios are included
- [ ] Security implications are tested
- [ ] Performance impact is considered
- [ ] Accessibility is maintained
- [ ] Documentation is updated

## Support

For issues with the test suite:
1. Check the troubleshooting section above
2. Review test logs and artifacts
3. Run individual test categories to isolate issues
4. Check browser compatibility requirements
5. Verify test environment setup

The comprehensive test suite ensures robust, reliable, and secure functionality across all aspects of the AI Readiness Frontend application.