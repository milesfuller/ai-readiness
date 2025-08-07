# Vercel Deployment Guide with Automatic Migrations

## How Automatic Migrations Work

When you deploy to Vercel, the database migrations will run **automatically** the first time your app starts. Here's how it works:

1. **Deploy to Vercel** - Your code deploys
2. **App Starts** - Next.js app initializes
3. **Migrations Run** - Automatically checks and applies any pending migrations
4. **App Ready** - Your app is ready to serve requests

## Step-by-Step Deployment

### 1. Set Up Supabase

```bash
# Go to https://supabase.com
# Create a new project
# Note your project URL and keys
```

### 2. Prepare Supabase for Migrations

Run this ONCE in your Supabase SQL editor to set up the migration system:

```sql
-- Run these two migrations first to set up the migration tracking
-- Copy contents from: supabase/migrations/000_migration_tracking.sql
-- Copy contents from: supabase/migrations/000_exec_migration_function.sql
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo in Vercel Dashboard
```

### 4. Add Environment Variables in Vercel

Go to your Vercel project settings and add:

```env
# Required for app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Required for migrations (service role has admin access)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Optional - for manual migration trigger
MIGRATION_ADMIN_TOKEN=your-secret-token-here

# Optional - to skip auto migrations
SKIP_AUTO_MIGRATIONS=false
```

### 5. First Deployment

On the first deployment:
1. App deploys to Vercel
2. When first request comes in, migrations run automatically
3. You'll see in Vercel logs:
   ```
   🔄 Checking database migrations...
   📝 Applying migration: 001_invitations_schema
   📝 Applying migration: 20240101000005_onboarding_tables
   ...
   ✅ Applied 6 migrations in 2341ms
   ```

### 6. Subsequent Deployments

On future deployments with new migrations:
1. Add new migration file to `supabase/migrations/`
2. Add filename to `MIGRATIONS` array in `lib/db/migrate.ts`
3. Deploy to Vercel
4. Migrations run automatically and only apply new ones

## Manual Migration Control

### Check Migration Status
```bash
curl https://your-app.vercel.app/api/migrations
```

### Manually Trigger Migrations
```bash
curl -X POST https://your-app.vercel.app/api/migrations \
  -H "Authorization: Bearer YOUR_MIGRATION_ADMIN_TOKEN"
```

### Skip Auto-Migrations
Set in Vercel environment variables:
```env
SKIP_AUTO_MIGRATIONS=true
```

## How It Works Technically

1. **MigrationRunner Component** (`app/migration-runner.tsx`)
   - Server component that runs on app startup
   - Calls `ensureMigrationsRun()` once

2. **Auto-Migrate Module** (`lib/db/auto-migrate.ts`)
   - Ensures migrations run only once per deployment
   - Handles errors gracefully (won't crash app)

3. **Database Migrator** (`lib/db/migrate.ts`)
   - Checks `schema_migrations` table for applied migrations
   - Runs only pending migrations
   - Records successful migrations

4. **Supabase Function** (`exec_migration`)
   - Executes SQL safely with error handling
   - Only accessible by service role

## Migration Safety Features

✅ **Idempotent** - Safe to run multiple times
✅ **Transactional** - Each migration succeeds or fails atomically
✅ **Tracked** - System knows which migrations have been applied
✅ **Non-blocking** - Migration failures don't crash the app
✅ **Logged** - All migrations are logged in Vercel

## Troubleshooting

### Migrations Not Running
1. Check Vercel function logs for errors
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Ensure migration tracking tables exist (run `000_migration_tracking.sql` manually)

### Migration Fails
1. Check error in Vercel logs
2. Fix issue in migration file
3. Either:
   - Fix in Supabase SQL editor manually, or
   - Create a new migration file with the fix

### Want to Reset Migrations
In Supabase SQL editor:
```sql
-- DANGER: Only in development!
TRUNCATE schema_migrations;
-- Then redeploy to run all migrations again
```

## Production Best Practices

1. **Test First** - Always test migrations on a staging database
2. **Backup** - Backup production database before major migrations
3. **Monitor** - Watch Vercel logs during deployment
4. **Rollback Plan** - Have a plan to rollback if needed

## Example: Adding a New Feature

1. Create migration file:
```sql
-- supabase/migrations/20250109_add_feature.sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS feature_enabled BOOLEAN DEFAULT false;
```

2. Add to migrations list:
```typescript
// lib/db/migrate.ts
const MIGRATIONS = [
  // ... existing migrations
  '20250109_add_feature.sql'  // Add your new migration
]
```

3. Deploy:
```bash
git add .
git commit -m "Add new feature migration"
git push
# Vercel auto-deploys and runs migration
```

4. Verify:
```bash
curl https://your-app.vercel.app/api/migrations
# Should show your migration as applied
```

## Summary

✅ **Automatic** - Migrations run without manual intervention
✅ **Safe** - Only runs pending migrations
✅ **Tracked** - System knows what's been applied
✅ **Resilient** - Failures don't crash the app
✅ **Visible** - Check status anytime via API

Your database stays in sync with your code automatically!