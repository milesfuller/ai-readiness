---
name: deployment-test
description: Comprehensive pre-deployment testing to prevent deployment failures
command: npx claude-flow deployment test
category: deployment
agents: 8-12
parallel: true
mcp_tools: ["playwright", "supabase", "semgrep", "claude-flow"]
---

# Deployment Testing Swarm

Comprehensive parallel testing before deployment to catch all issues upfront.

## Overview

This workflow spawns a specialized swarm that tests:
- All UI routes and flows with Playwright
- API endpoints and authentication
- Database connections and migrations
- Environment variables and configurations
- Build process and optimizations
- Security vulnerabilities
- Performance bottlenecks

## Command

```bash
npx claude-flow deployment test [options]

Options:
  --project <path>     Project directory (default: current)
  --target <platform>  Deployment target: vercel|netlify|railway (default: vercel)
  --db <type>         Database: supabase|postgres|mysql (default: supabase)
  --parallel          Run all tests in parallel (default: true)
  --fix               Automatically fix issues found (default: false)
```

## Swarm Configuration

```javascript
{
  topology: "hierarchical",
  maxAgents: 12,
  strategy: "parallel",
  agents: [
    // UI Testing Team
    {
      type: "ui-tester",
      tools: ["playwright"],
      focus: "End-to-end UI testing"
    },
    {
      type: "route-validator", 
      tools: ["playwright", "claude-flow"],
      focus: "Validate all routes work"
    },
    {
      type: "auth-tester",
      tools: ["playwright", "supabase"],
      focus: "Test authentication flows"
    },
    
    // API Testing Team
    {
      type: "api-tester",
      tools: ["bash", "supabase"],
      focus: "Test all API endpoints"
    },
    {
      type: "db-validator",
      tools: ["supabase"],
      focus: "Validate database queries"
    },
    
    // Configuration Team
    {
      type: "env-validator",
      tools: ["read", "write"],
      focus: "Check environment variables"
    },
    {
      type: "build-tester",
      tools: ["bash"],
      focus: "Test production build"
    },
    
    // Security & Performance
    {
      type: "security-scanner",
      tools: ["semgrep"],
      focus: "Security vulnerability scan"
    },
    {
      type: "perf-analyzer",
      tools: ["playwright", "claude-flow"],
      focus: "Performance testing"
    },
    
    // Coordination
    {
      type: "test-orchestrator",
      tools: ["claude-flow"],
      focus: "Coordinate all testing"
    },
    {
      type: "issue-fixer",
      tools: ["all"],
      focus: "Fix issues in parallel"
    },
    {
      type: "report-generator",
      tools: ["claude-flow"],
      focus: "Generate test reports"
    }
  ]
}
```

## Testing Phases

### Phase 1: Environment Setup (Parallel)
- Validate all environment variables
- Check API keys and secrets
- Verify database connections
- Test build configuration

### Phase 2: Build Testing (Sequential)
- Run production build
- Check for build errors
- Validate bundle sizes
- Test static asset generation

### Phase 3: UI Testing (Parallel)
- Test all routes with Playwright
- Validate authentication flows
- Check form submissions
- Test error handling
- Verify responsive design
- Capture screenshots

### Phase 4: API Testing (Parallel)
- Test all API endpoints
- Validate auth middleware
- Check CORS configuration
- Test rate limiting
- Validate data responses

### Phase 5: Database Testing (Parallel)
- Test all queries
- Validate migrations
- Check indexes
- Test transactions
- Verify RLS policies

### Phase 6: Security Scan (Parallel)
- Run Semgrep analysis
- Check for exposed secrets
- Validate auth implementation
- Test XSS protection
- Check SQL injection prevention

### Phase 7: Performance Testing (Sequential)
- Lighthouse scores
- Load testing
- Bundle analysis
- Database query optimization
- CDN configuration

### Phase 8: Fix & Retest (Parallel)
- Auto-fix simple issues
- Update configurations
- Re-run failed tests
- Generate fix documentation

## Output

The workflow generates:
1. `deployment-report.md` - Full test results
2. `issues-found.json` - Structured issue list
3. `fixes-applied.md` - Auto-fixes documentation
4. `screenshots/` - UI test screenshots
5. `performance/` - Performance metrics

## Example Usage

```bash
# Full deployment test for Vercel + Supabase
npx claude-flow deployment test --target vercel --db supabase

# Quick UI-only test
npx claude-flow deployment test --only ui

# Test and auto-fix issues
npx claude-flow deployment test --fix

# Test specific feature
npx claude-flow deployment test --feature auth
```

## Memory Keys

Test results are stored in Claude Flow memory:
- `deployment/test/[timestamp]/results`
- `deployment/test/[timestamp]/issues`
- `deployment/test/[timestamp]/fixes`
- `deployment/test/[timestamp]/screenshots`

## Integration

This workflow integrates with:
- CI/CD pipelines
- Pre-commit hooks
- GitHub Actions
- Manual deployment checks