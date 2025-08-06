---
name: vercel-supabase-validate
description: Comprehensive validation for Vercel + Supabase deployments to prevent the back-and-forth debugging
command: npx claude-flow deployment validate-all
category: deployment
agents: 10
parallel: true
mcp_tools: ["playwright", "supabase", "claude-flow", "semgrep"]
---

# Vercel + Supabase Deployment Validation

Prevents deployment failures by testing everything upfront in parallel.

## Problem This Solves

- No more single-threaded debugging after deployment
- Catches environment variable issues before deployment
- Validates all API routes work with production settings
- Tests auth flows with real Supabase instance
- Verifies build optimizations
- Confirms all UI routes are accessible

## Command

```bash
npx claude-flow deployment validate-all [options]

Options:
  --project <path>      Project directory
  --fix                 Auto-fix issues found
  --preview-url <url>   Vercel preview URL to test
  --supabase-url <url>  Supabase project URL
  --parallel-agents <n> Number of agents (default: 10)
```

## Validation Checklist

### 1. Environment Variables (Agent: env-validator)
```javascript
// Checks performed:
- All required vars present in .env.local
- Vercel environment variables configured
- Public vs private keys properly prefixed
- No hardcoded secrets in code
- .env.example is up to date

// Common issues prevented:
- Missing NEXT_PUBLIC_ prefix
- Wrong Supabase anon key
- Missing API URLs
- Incorrect var names
```

### 2. Supabase Configuration (Agent: supabase-validator)
```javascript
// Validates:
- Database connection
- RLS policies enabled
- Auth configuration
- API endpoints accessible
- Migrations up to date
- Edge functions deployed

// Tests:
await supabase.auth.signUp()
await supabase.from('table').select()
await supabase.storage.from('bucket').list()
await supabase.functions.invoke('function')
```

### 3. Build & Deploy (Agent: build-validator)
```javascript
// Verifies:
- npm run build succeeds
- No TypeScript errors
- Bundle size within limits
- All pages pre-render correctly
- API routes compile
- Middleware functions work

// Commands:
npm run build
npm run type-check
npx next-bundle-analyzer
```

### 4. Route Testing (Agent: route-tester)
```javascript
// Tests every route:
- / (home)
- /auth/login
- /auth/signup
- /dashboard
- /api/*
- Dynamic routes [id]
- Catch-all routes [...]

// With Playwright:
for (const route of allRoutes) {
  await page.goto(route)
  await expect(page).not.toHaveTitle('404')
  await screenshot(`route-${route}`)
}
```

### 5. Authentication Flow (Agent: auth-tester)
```javascript
// Complete auth testing:
- Sign up with email
- Email verification
- Login/logout
- Password reset
- OAuth providers
- Session persistence
- Protected route access
- Token refresh
- Redirect loop prevention
- Session vs User consistency

// Playwright + Supabase:
await testSignUpFlow()
await testLoginFlow()
await testProtectedRoutes()
await testSessionRefresh()
await testRedirectLoops() // NEW
await testAuthConsistency() // NEW

// CRITICAL: Test for redirect loops
async function testRedirectLoops() {
  // Monitor redirect count
  let redirectCount = 0
  page.on('response', (response) => {
    if ([301, 302, 307, 308].includes(response.status())) {
      redirectCount++
      if (redirectCount > 5) {
        throw new Error('Redirect loop detected!')
      }
    }
  })
  
  await page.goto('/dashboard')
  // Should land on dashboard or login, not loop
}

// CRITICAL: Verify auth consistency
async function testAuthConsistency() {
  // Middleware should use same auth check as pages
  // getUser() is more reliable than getSession()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  
  // If user exists but session is null/stale, potential issue
  if (user && !session) {
    console.warn('Session/User mismatch detected - use getUser() everywhere')
  }
}
```

### 6. API Endpoint Testing (Agent: api-tester)
```javascript
// Tests all /api routes:
- GET requests
- POST with body
- Auth headers
- Error responses
- Rate limiting
- CORS headers
- Response formats

// Validates:
const endpoints = [
  '/api/users',
  '/api/posts',
  '/api/upload'
]
for (const endpoint of endpoints) {
  await testEndpoint(endpoint)
}
```

### 7. Database Operations (Agent: db-tester)
```javascript
// Verifies:
- All tables accessible
- RLS policies work
- Queries optimized
- Transactions complete
- Realtime subscriptions
- Storage buckets

// Tests:
await testCRUDOperations()
await testRLSPolicies()
await testRealtimeSubscriptions()
```

### 8. Performance Testing (Agent: perf-tester)
```javascript
// Measures:
- First Contentful Paint
- Time to Interactive
- Cumulative Layout Shift
- API response times
- Database query times
- Bundle sizes

// Tools:
- Lighthouse CI
- Web Vitals
- Bundle analyzer
```

### 9. Security Scanning (Agent: security-scanner)
```javascript
// Scans for:
- Exposed secrets
- XSS vulnerabilities  
- SQL injection
- Insecure dependencies
- CORS misconfig
- Auth bypasses

// Using:
- Semgrep rules
- OWASP checks
- Dependency audit
```

### 10. Fix Coordination (Agent: fix-coordinator)
```javascript
// Coordinates fixes:
- Prioritizes critical issues
- Applies auto-fixes
- Updates configurations
- Re-runs validations
- Documents changes
```

## Parallel Execution Flow

```
START
  ├── Environment Check ──┐
  ├── Supabase Test ─────┤
  ├── Build Test ────────┤
  ├── Route Testing ─────┼── All run in parallel
  ├── Auth Testing ──────┤
  ├── API Testing ───────┤
  ├── DB Testing ────────┤
  ├── Performance ───────┤
  └── Security Scan ─────┘
           │
           ▼
    Issue Detection
           │
           ▼
    Parallel Fixes
           │
           ▼
     Re-validation
           │
           ▼
    Final Report
```

## Output Report

```markdown
# Deployment Validation Report

## Summary
✅ 45 checks passed
❌ 5 issues found (3 auto-fixed)
⚠️  2 warnings

## Critical Issues
1. ❌ Missing env var: NEXT_PUBLIC_SUPABASE_URL
   - Auto-fix: Added to .env.local
   
2. ❌ RLS policy missing on 'profiles' table
   - Manual fix required
   - Suggested policy provided

## Test Results
- Environment: 8/8 passed
- Build: 10/10 passed  
- Routes: 15/17 passed
- Auth: 8/8 passed
- API: 12/12 passed
- Database: 6/8 passed
- Performance: All metrics green
- Security: No vulnerabilities

## Screenshots
- [View UI screenshots](./screenshots/)
- [View error screenshots](./errors/)

## Recommendations
1. Enable RLS on all tables
2. Add rate limiting to API
3. Optimize bundle size (-15kb possible)
```

## Quick Start

```bash
# First time setup
npm install -D @playwright/test
npx playwright install

# Run validation
npx claude-flow deployment validate-all --fix

# After fixes, deploy with confidence
vercel --prod
```

## Memory Keys

- `deployment/validation/[timestamp]/report`
- `deployment/validation/[timestamp]/issues`
- `deployment/validation/[timestamp]/fixes`
- `deployment/validation/[timestamp]/screenshots`