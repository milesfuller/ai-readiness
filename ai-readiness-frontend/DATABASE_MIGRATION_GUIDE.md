# Production Database Migration Guide

## 🚨 CRITICAL: How to Handle Database Updates in Production

When your app is live with real user data, you CANNOT just recreate tables. You need to apply incremental changes that preserve existing data.

## Migration Strategies

### 1. **Supabase Migration System (Recommended)**

Supabase has a built-in migration system that tracks which migrations have been applied:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Create a new migration
supabase migration new add_new_feature

# Apply migrations to production
supabase db push
```

### 2. **Manual Migration Tracking**

Create a migrations table to track what's been applied:

```sql
-- Create migrations tracking table (run this ONCE)
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

Then modify each migration file to check if it's already been applied:

```sql
-- Example: 20240807_survey_system.sql
DO $$
BEGIN
  -- Check if this migration has already been applied
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '20240807_survey_system'
  ) THEN
    
    -- Your migration code here
    CREATE TABLE IF NOT EXISTS public.survey_sessions (
      -- table definition
    );
    
    -- Mark migration as complete
    INSERT INTO schema_migrations (version) VALUES ('20240807_survey_system');
    
  END IF;
END $$;
```

## Safe Migration Patterns

### ✅ SAFE Operations (Won't lose data):
- `CREATE TABLE IF NOT EXISTS` - Safe, won't overwrite existing tables
- `ALTER TABLE ADD COLUMN` - Adds new columns without affecting existing data
- `CREATE INDEX IF NOT EXISTS` - Safe to run multiple times
- `ALTER TABLE ADD CONSTRAINT` - Adds new constraints

### ⚠️ DANGEROUS Operations (Can lose data):
- `DROP TABLE` - Deletes entire table and all data
- `DROP COLUMN` - Removes column and its data
- `ALTER COLUMN TYPE` - May fail or lose precision
- `TRUNCATE` - Deletes all rows

## Migration Best Practices

### 1. **Always Use IF NOT EXISTS**
```sql
-- Good: Won't fail if table already exists
CREATE TABLE IF NOT EXISTS users (...)

-- Bad: Will fail if table exists
CREATE TABLE users (...)
```

### 2. **Make Columns Nullable First**
When adding a required column to an existing table:
```sql
-- Step 1: Add as nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Step 2: Backfill data
UPDATE users SET phone = 'unknown' WHERE phone IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
```

### 3. **Use Transactions for Complex Changes**
```sql
BEGIN;
  -- Multiple changes that should succeed or fail together
  ALTER TABLE orders ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;
  UPDATE orders SET discount = 0 WHERE discount IS NULL;
  ALTER TABLE orders ALTER COLUMN discount SET NOT NULL;
COMMIT;
```

## Vercel Deployment Process

### Initial Setup (First Deployment):
1. Create Supabase project
2. Run ALL migrations in order in Supabase SQL Editor
3. Deploy to Vercel
4. Add environment variables

### Subsequent Updates:
1. Create new migration file with incremental changes
2. Test migration locally
3. Apply to production Supabase via SQL Editor
4. Deploy new code to Vercel

## Example: Adding a New Feature

Let's say you want to add a "priority" field to survey_responses:

### ❌ WRONG WAY (Destroys data):
```sql
-- DON'T DO THIS!
DROP TABLE survey_responses;
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY,
  -- ... other columns
  priority INTEGER DEFAULT 0  -- new column
);
```

### ✅ RIGHT WAY (Preserves data):
```sql
-- Create new migration file: 20250108_add_priority.sql
-- Safe incremental change
ALTER TABLE survey_responses 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Update existing records if needed
UPDATE survey_responses 
SET priority = 1 
WHERE created_at < '2024-01-01' AND priority IS NULL;
```

## Migration Order for This Project

Run these migrations IN ORDER for a fresh database:

1. `001_invitations_schema.sql` - Base invitation system
2. `20240101000005_onboarding_tables.sql` - User onboarding
3. `20240807_survey_system.sql` - Core survey functionality
4. `20241207_organization_settings.sql` - Organization features
5. `20250107_survey_templates.sql` - Template system

## Rollback Strategy

Always create a rollback script when making changes:

```sql
-- Migration: add_priority.up.sql
ALTER TABLE survey_responses ADD COLUMN priority INTEGER DEFAULT 0;

-- Rollback: add_priority.down.sql
ALTER TABLE survey_responses DROP COLUMN IF EXISTS priority;
```

## Automated Migration Script

Use the provided script for development, but for production:
1. Review each migration manually
2. Test on a staging database first
3. Have backups before applying
4. Apply during low-traffic periods

```bash
# Development
npm run migrate:dev

# Production (after review)
npm run migrate:prod
```

## Common Scenarios

### Scenario 1: App is already live, need to add invitations
```sql
-- Safe to run on existing database
source 001_invitations_schema.sql
-- Creates new tables, doesn't affect existing data
```

### Scenario 2: Need to add a field to existing table
```sql
-- Add column without breaking existing rows
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free';
```

### Scenario 3: Renaming a column (complex)
```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN email_address VARCHAR(255);

-- Step 2: Copy data
UPDATE users SET email_address = email;

-- Step 3: In application code, start using email_address

-- Step 4: Later, drop old column (after code is updated)
ALTER TABLE users DROP COLUMN email;
```

## Testing Migrations

Always test migrations on a copy of production data:

1. Create a staging database
2. Copy production schema and sample data
3. Apply migrations
4. Test application functionality
5. Only then apply to production

## Monitoring After Migration

After applying migrations:
1. Check application logs for errors
2. Monitor database performance
3. Have a rollback plan ready
4. Keep the previous version deployable

## Summary

✅ **DO:**
- Use IF NOT EXISTS
- Make incremental changes
- Test on staging first
- Keep migrations idempotent
- Track what's been applied

❌ **DON'T:**
- DROP tables in production
- Recreate schema from scratch
- Apply untested migrations
- Make breaking changes without migration path
- Forget to backup

Remember: **In production, data is sacred. Every migration must preserve existing data.**