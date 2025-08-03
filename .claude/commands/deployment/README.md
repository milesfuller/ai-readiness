# Deployment Commands

Commands for deployment validation, testing, and troubleshooting.

## Available Commands

### 🎯 Primary Commands (Recommended)

- **`vercel-supabase-validate.md`** - Complete Vercel + Supabase validation (10 agents)
  - **USE THIS** for most projects using both Vercel and Supabase
  - Runs all tests in parallel to prevent sequential debugging
  - Command: `npx claude-flow deployment validate-all`

- **`deployment-test.md`** - Comprehensive pre-deployment testing 
  - General purpose deployment validation
  - Command: `npx claude-flow deployment test`

- **`e2e-test.md`** - End-to-end user journey testing with Playwright
  - Tests complete user flows from signup to checkout
  - Command: `npx claude-flow deployment e2e-test`

### 📦 Specialized Commands (When Needed)

- **`vercel-validate.md`** - Vercel-only validation (6 agents)
  - Use when you only need Vercel checks
  - Command: `npx claude-flow deployment vercel-validate`

- **`supabase-validate.md`** - Supabase-only validation (5 agents)
  - Use when you only need Supabase checks
  - Command: `npx claude-flow deployment supabase-validate`

## Usage

```bash
# RECOMMENDED: Full Vercel + Supabase validation
npx claude-flow deployment validate-all --fix

# Alternative: General deployment testing
npx claude-flow deployment test

# Run E2E user journey tests
npx claude-flow deployment e2e-test

# Specialized (only if needed)
npx claude-flow deployment vercel-validate    # Vercel only
npx claude-flow deployment supabase-validate  # Supabase only
```

## Quick Start for Your Use Case

Based on your previous deployment issues, run:

```bash
# 1. Install Playwright if not already installed
npm install -D @playwright/test
npx playwright install

# 2. Run the comprehensive validation
npx claude-flow deployment validate-all --fix

# 3. After all issues are fixed, deploy
vercel --prod
```

This will spawn 10 parallel agents to test everything at once, preventing the back-and-forth debugging you experienced.