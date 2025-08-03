# Deployment Strategy & Mitigation Guide

## Overview
This guide addresses common deployment issues with Vercel, Supabase, and modern cloud platforms, providing both agent-based and procedural solutions.

## 🤖 Specialized Agent Solutions

### 1. **Deployment Validation Agent** (`deployment-validator`)
```bash
npx claude-flow sparc agent deployment-validator
```
- Pre-flight checks for environment variables
- Database permission validation
- Edge Runtime compatibility analysis
- Authentication flow verification

### 2. **Infrastructure Agent** (`infra-coordinator`)
```bash
npx claude-flow sparc agent infra-coordinator
```
- Terraform/IaC generation
- Cross-platform configuration sync
- Secret management automation
- Permission matrix validation

### 3. **Troubleshooting Agent** (`debug-swarm`)
```bash
npx claude-flow sparc agent debug-swarm
```
- Multi-platform log aggregation
- Root cause analysis
- Automated fix generation
- Rollback coordination

## 📋 Pre-Deployment Checklist

### Environment Variables
```typescript
// lib/config/validate-env.ts
const requiredEnvVars = {
  production: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'ANTHROPIC_API_KEY',
    'DATABASE_URL'
  ],
  development: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
}

export function validateEnvironment() {
  const missing = []
  const env = process.env.NODE_ENV || 'development'
  
  for (const varName of requiredEnvVars[env]) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}
```

### Database Setup Validation
```sql
-- supabase/validate-setup.sql
DO $
DECLARE
  missing_tables text[];
  missing_permissions text[];
BEGIN
  -- Check required tables
  SELECT array_agg(table_name) INTO missing_tables
  FROM (VALUES ('profiles'), ('organizations'), ('surveys')) AS required(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = required.table_name
  );
  
  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
  END IF;
  
  -- Check trigger permissions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND grantee = 'postgres'
      AND privilege_type = 'INSERT'
  ) THEN
    RAISE EXCEPTION 'Missing INSERT permission for postgres on profiles table';
  END IF;
  
  RAISE NOTICE 'All validations passed!';
END$;
```

## 🚀 Automated Deployment Pipeline

### 1. Pre-Deployment Validation
```yaml
# .github/workflows/pre-deploy.yml
name: Pre-Deployment Validation

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Validate Environment
        run: |
          npm run validate:env
          npm run validate:types
          npm run test:integration
          
      - name: Check Supabase Schema
        env:
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          npm run db:validate
          
      - name: Edge Runtime Compatibility
        run: |
          npm run build:edge
          npm run test:edge
```

### 2. Deployment Script with Rollback
```typescript
// scripts/deploy-with-validation.ts
import { deployToVercel } from './vercel'
import { validateSupabase } from './supabase'
import { runSmokeTests } from './smoke-tests'

async function deploy() {
  const deployment = await deployToVercel()
  
  try {
    // Run validations
    await validateSupabase(deployment.url)
    await runSmokeTests(deployment.url)
    
    // Promote to production
    await deployment.promote()
  } catch (error) {
    console.error('Deployment validation failed:', error)
    await deployment.rollback()
    throw error
  }
}
```

## 🛡️ Error Prevention Strategies

### 1. **Database Permissions Template**
```sql
-- Always run after creating tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

### 2. **Edge Runtime Compatibility Layer**
```typescript
// lib/edge-compat.ts
export const crypto = globalThis.crypto || {
  randomUUID: () => {
    // Fallback implementation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}
```

### 3. **Environment Variable Injection**
```typescript
// next.config.js
module.exports = {
  env: {
    // Fail fast if required vars are missing
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || throwError('Missing SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || throwError('Missing SUPABASE_ANON_KEY'),
  }
}

function throwError(message) {
  throw new Error(message)
}
```

## 📊 Monitoring & Alerting

### 1. **Deployment Health Checks**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    auth: await checkAuth(),
    storage: await checkStorage(),
    api: await checkAPI()
  }
  
  const healthy = Object.values(checks).every(c => c.status === 'ok')
  
  return NextResponse.json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  }, { status: healthy ? 200 : 503 })
}
```

### 2. **Automated Recovery**
```typescript
// lib/auto-recovery.ts
export async function autoRecover(error: Error) {
  if (error.message.includes('permission denied')) {
    await runDatabasePermissionFix()
  } else if (error.message.includes('No API key found')) {
    await regenerateSupabaseClient()
  } else if (error.message.includes('Edge Runtime')) {
    await switchToNodeRuntime()
  }
}
```

## 🎯 Agent-Based Solutions

### Deployment Orchestrator Swarm
```bash
# Create a specialized deployment swarm
npx claude-flow swarm init --topology hierarchical --agents 5

# Spawn deployment specialists
npx claude-flow agent spawn --type deployment-validator
npx claude-flow agent spawn --type infra-coordinator
npx claude-flow agent spawn --type test-runner
npx claude-flow agent spawn --type rollback-manager
npx claude-flow agent spawn --type monitoring-agent

# Execute deployment with full validation
npx claude-flow task orchestrate "Deploy to production with full validation"
```

### Benefits of Agent Approach:
1. **Parallel Validation** - Multiple agents check different aspects simultaneously
2. **Intelligent Recovery** - Agents learn from past deployment failures
3. **Cross-Platform Coordination** - Agents manage Vercel, Supabase, GitHub in sync
4. **Automated Documentation** - Agents document issues and solutions

## 🔄 Continuous Improvement

### 1. **Deployment Playbook**
- Document every deployment issue and solution
- Create runbooks for common scenarios
- Automate fixes for recurring problems

### 2. **Infrastructure as Code**
```typescript
// infrastructure/supabase.tf
resource "supabase_project" "main" {
  name = "ai-readiness"
  
  database_config = {
    extensions = ["uuid-ossp", "pgcrypto"]
    
    post_setup_sql = file("../supabase/setup-with-permissions.sql")
  }
  
  auth_config = {
    enable_signup = true
    email_confirm = false
    providers = ["email"]
  }
}
```

### 3. **Testing Strategy**
```typescript
// __tests__/deployment/integration.test.ts
describe('Deployment Integration', () => {
  test('Supabase trigger permissions', async () => {
    const user = await createTestUser()
    const profile = await getProfile(user.id)
    expect(profile).toBeDefined()
  })
  
  test('Edge Runtime compatibility', async () => {
    const response = await fetch('/api/edge-test')
    expect(response.ok).toBe(true)
  })
  
  test('Environment variables', async () => {
    const response = await fetch('/api/check-env')
    const data = await response.json()
    expect(data.allPresent).toBe(true)
  })
})
```

## 🎯 Quick Wins

1. **Use `.env.example`** with all required variables
2. **Create setup scripts** that handle permissions automatically
3. **Build locally with production settings** before deploying
4. **Use preview deployments** for testing
5. **Implement health check endpoints** for quick validation
6. **Document Edge Runtime limitations** prominently
7. **Create database migration scripts** with permissions included

## Summary

The key to avoiding deployment issues is:
1. **Automation** - Scripts that validate before problems occur
2. **Documentation** - Clear guides for common issues
3. **Testing** - Comprehensive checks at every level
4. **Agents** - Intelligent systems that learn and adapt
5. **Templates** - Reusable configurations that work

By implementing these strategies, future deployments will be significantly smoother and more reliable.