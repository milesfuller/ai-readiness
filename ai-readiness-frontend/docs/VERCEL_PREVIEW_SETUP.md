# Vercel Preview Environment Setup Guide

## Overview
This guide explains how to properly configure Vercel preview deployments to use the correct staging database instead of production.

## Critical Issue: Preview Using Wrong Database
The Vercel preview deployment is currently not pointing to the staging database. This needs to be fixed immediately to prevent data corruption and ensure proper testing.

## Environment Variables Configuration

### 1. Access Vercel Project Settings
1. Go to your Vercel dashboard
2. Select your project
3. Navigate to Settings → Environment Variables

### 2. Configure Preview Environment Variables

For the **Preview** environment specifically, set these variables with the `STAGING_` prefix:

```bash
# Staging Supabase Instance (PREVIEW ONLY) - Note the STAGING_ prefix
STAGING_NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key
STAGING_SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Database URL for staging
STAGING_DATABASE_URL=postgresql://postgres:password@db.your-staging-project.supabase.co:5432/postgres

# Environment Indicator
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_IS_PREVIEW=true
# Or use Vercel's automatic VERCEL_ENV=preview

# Optional: Enable debug mode for preview
NEXT_PUBLIC_ENABLE_DEBUG=true

# Migration Protection
REQUIRE_MIGRATION_TESTS=true
BLOCK_DIRECT_PRODUCTION=true
```

**Important**: The system automatically uses `STAGING_*` prefixed variables when:
- `VERCEL_ENV === 'preview'` (automatically set by Vercel)
- `NEXT_PUBLIC_ENVIRONMENT === 'staging'`
- `NEXT_PUBLIC_IS_PREVIEW === 'true'`

### 3. Production Environment Variables

For the **Production** environment, ensure these are set:

```bash
# Production Supabase Instance (PRODUCTION ONLY)
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Database URL for production
DATABASE_URL=postgresql://postgres:password@db.your-production-project.supabase.co:5432/postgres

# Environment Indicator
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_IS_PREVIEW=false

# Disable debug in production
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## Verifying Configuration

### 1. Check Current Environment
Add this temporary debug endpoint to verify which database is being used:

```typescript
// app/api/debug/env/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  // Only allow in non-production or with admin token
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production' && 
      !request.headers.get('x-admin-token')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
    isPreview: process.env.NEXT_PUBLIC_IS_PREVIEW,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https:\/\/(.{8}).*\.supabase\.co/, 'https://$1******.supabase.co'),
    databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
  })
}
```

### 2. Test Database Connection
Visit `/api/debug/env` on your preview deployment to verify it's using the staging database.

## Setting Up Staging Database

### 1. Create Staging Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project specifically for staging
3. Name it clearly (e.g., "ai-readiness-staging")

### 2. Run Migrations on Staging
```bash
# Set staging environment variables locally
export SUPABASE_URL=https://your-staging-project.supabase.co
export SUPABASE_SERVICE_KEY=your-staging-service-key

# Run migrations
npm run migrate

# Or manually via Supabase CLI
supabase db push --db-url postgresql://postgres:password@db.your-staging-project.supabase.co:5432/postgres
```

### 3. Seed Staging Data (Optional)
```bash
# Create staging seed script
npm run seed:staging
```

## Environment-Specific Features

### Conditional Logic Based on Environment
```typescript
// lib/config/environment.ts
export const config = {
  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isStaging: process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging',
  isDevelopment: process.env.NODE_ENV === 'development',
  isPreview: process.env.NEXT_PUBLIC_IS_PREVIEW === 'true',
  
  // Feature flags
  features: {
    debugMode: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
    allowDataExport: process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production',
    showTestBanner: process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production',
  },
  
  // Database config
  database: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
}
```

### Display Environment Banner
```typescript
// components/EnvironmentBanner.tsx
export function EnvironmentBanner() {
  if (config.isProduction) return null
  
  return (
    <div className={`text-center py-1 text-xs ${
      config.isStaging ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`}>
      {config.isStaging ? '🔧 STAGING ENVIRONMENT' : '💻 DEVELOPMENT'}
      {config.isPreview && ' (Vercel Preview)'}
    </div>
  )
}
```

## Security Considerations

### 1. Never Mix Environments
- **NEVER** use production credentials in preview/staging
- **NEVER** use staging credentials in production
- Keep separate Supabase projects for each environment

### 2. Protect Sensitive Operations
```typescript
// lib/utils/environment-guard.ts
export function requireProduction() {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT !== 'production') {
    throw new Error('This operation is only allowed in production')
  }
}

export function blockInProduction() {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    throw new Error('This operation is not allowed in production')
  }
}
```

### 3. Migration Safety
The new migration security policy (999_secure_migrations_table.sql) ensures:
- Only service role can access migration tables
- Full audit logging of migration changes
- RLS policies prevent unauthorized access

## Troubleshooting

### Preview Still Using Production Database
1. Clear Vercel cache: Settings → Functions → Clear Cache
2. Redeploy: Trigger new deployment from Vercel dashboard
3. Check environment variables are set for "Preview" not "All Environments"

### Database Connection Errors
1. Verify Supabase project is active (not paused)
2. Check service role key has proper permissions
3. Ensure database URL includes correct port (5432 for Postgres)

### Migration Issues
1. Run migrations manually on staging first
2. Verify schema_migrations table has proper RLS policies
3. Check migration audit log for issues

## Rollback Plan

If preview deployment has issues:
1. Revert environment variables to previous values
2. Trigger redeployment
3. Clear function cache
4. Check audit logs for any data changes

## Monitoring

### Set Up Alerts
1. Configure Vercel monitoring for preview deployments
2. Set up Supabase alerts for staging database
3. Monitor error rates and performance

### Regular Checks
- Weekly: Verify preview is using staging database
- Monthly: Audit environment variables
- Quarterly: Review and rotate service keys

## Contact

For issues with environment setup:
- Vercel Support: For deployment configuration
- Supabase Support: For database access issues
- Team Lead: For credential access

---

**Last Updated**: January 2025
**Priority**: CRITICAL - Fix immediately to prevent data issues