---
name: vercel-validate
description: Vercel-specific deployment validation and troubleshooting
command: npx claude-flow deployment vercel-validate
category: deployment
agents: 6
parallel: true
mcp_tools: ["playwright", "claude-flow"]
---

# Vercel Deployment Validation

Validates Vercel-specific configuration and deployment settings.

## Overview

Focuses on Vercel platform requirements:
- Build configuration
- Environment variables
- Edge functions
- Redirects and rewrites
- Static optimization
- ISR/SSG validation

## Command

```bash
npx claude-flow deployment vercel-validate [options]

Options:
  --project <path>    Project directory
  --preview          Test preview deployment
  --production       Test production settings
```

## Validation Steps

### 1. Build Configuration
- vercel.json validation
- Build command verification
- Output directory check
- Framework detection

### 2. Environment Variables
- Required vars for build
- Runtime vs build-time vars
- Proper prefixing (NEXT_PUBLIC_)
- No exposed secrets

### 3. Function Configuration
- API route optimization
- Edge function setup
- Serverless function size
- Cold start optimization

### 4. Performance Settings
- Image optimization config
- Font optimization
- Static file serving
- Cache headers

## Agents

1. **Config Validator** - Checks vercel.json
2. **Build Tester** - Runs build locally
3. **Env Checker** - Validates variables
4. **Route Tester** - Tests all routes
5. **Performance Analyzer** - Optimization checks
6. **Fix Coordinator** - Applies fixes

## Output

- `vercel-validation-report.md`
- `build-logs.txt`
- `optimization-suggestions.md`