# AI Readiness - Deployment Testing Guide

## 🚀 Local Testing Before Production

To avoid testing in production and waiting 3 minutes between pushes, follow this comprehensive testing approach:

## 1. Local Development Environment

### Quick Start
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, run local validation
npm run validate:local
```

### Available Scripts
- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `npm run type-check` - Check TypeScript types
- `npm run lint` - Run ESLint
- `npm run test:security` - Run security checks
- `npm run test:unit` - Run unit tests
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run validate:local` - Run all validation checks
- `npm run validate:deployment` - Run deployment validation

## 2. Comprehensive Test Suite

### E2E Tests
Located in `/e2e/` directory:
- `deployment-validation.spec.ts` - Full deployment validation
- `ui-enhancements.spec.ts` - UI improvement validation

### Run E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/deployment-validation.spec.ts
```

## 3. Local Validation Workflow

### Before Every Push
1. **Run local validation**:
   ```bash
   npm run validate:local
   ```

2. **Fix any issues found**

3. **Run E2E tests**:
   ```bash
   npm run test:e2e
   ```

### What Gets Validated
- ✅ Environment variables configuration
- ✅ TypeScript compilation
- ✅ ESLint rules
- ✅ Build process
- ✅ Security vulnerabilities
- ✅ Unit tests
- ✅ E2E tests (if dev server running)

## 4. Testing Against Production URL

If you need to test against the production URL after deployment:

```bash
# Set the base URL for Playwright
PLAYWRIGHT_BASE_URL=https://ai-readiness-swart.vercel.app npx playwright test

# Or update playwright.config.ts temporarily
```

## 5. CI/CD Best Practices

### GitHub Actions (Recommended)
Create `.github/workflows/test.yml`:

```yaml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run validation
      run: npm run validate:deployment
      
    - name: Install Playwright
      run: npx playwright install --with-deps
      
    - name: Run E2E tests
      run: npm run test:e2e
```

### Pre-commit Hooks
Add to `package.json`:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run validate:local"
    }
  }
}
```

## 6. Environment Variables

### Local Testing
Create `.env.local` with test values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-key
```

### Production Variables
Set in Vercel dashboard:
- Go to Project Settings > Environment Variables
- Add all required variables
- Deploy triggers automatically

## 7. Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Run `npm run type-check` to identify
   - Fix before pushing to avoid build failures

2. **Missing Environment Variables**
   - Check `.env.local` exists
   - Verify all required vars are set

3. **E2E Test Failures**
   - Ensure dev server is running
   - Check for console errors
   - Review screenshots in `test-results/`

4. **Build Failures**
   - Run `npm run build` locally first
   - Check for import errors
   - Verify all dependencies installed

## 8. Quick Validation Checklist

Before pushing to production:

- [ ] `npm run validate:local` passes
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Build completes successfully
- [ ] E2E tests pass
- [ ] UI improvements work locally
- [ ] No console errors in browser

## Summary

By following this guide, you can:
- ✅ Test everything locally before deployment
- ✅ Catch issues early in development
- ✅ Avoid the 3-minute deployment wait cycle
- ✅ Ensure production deployments are stable

Remember: **Test locally, deploy confidently!**