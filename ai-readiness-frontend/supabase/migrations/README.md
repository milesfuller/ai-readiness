# Production Migration System

This directory contains the production migration system with rollback capabilities.

## ⚠️ CRITICAL: Production Safety Rules

1. **ALWAYS test in test-infrastructure first**
2. **NEVER apply directly to production without testing**
3. **ALWAYS create a backup before migrations**
4. **ALWAYS have a rollback plan ready**

## Migration Workflow

### 1. Test Migration Locally
```bash
cd test-infrastructure
./migration-manager.sh test ../supabase/migrations/new_migration.sql
```

### 2. Create Production Migration Bundle
```bash
cd supabase/migrations
./create-migration.sh "add_new_feature"
# This creates both forward and rollback migrations
```

### 3. Apply to Production
```bash
# Via Supabase Dashboard SQL Editor
# 1. Run the pre-migration backup
# 2. Apply the migration
# 3. Verify with health checks
```

### 4. Rollback if Needed
```bash
# Run the corresponding rollback script
# Located in rollback/ directory
```

## Directory Structure

```
supabase/migrations/
├── forward/         # Forward migrations
├── rollback/        # Rollback scripts
├── backups/         # Backup commands
├── health-checks/   # Verification scripts
└── applied/         # Successfully applied migrations
```

## Naming Convention

```
YYYYMMDD_HHMMSS_description.sql
Example: 20240807_143022_add_user_preferences.sql
```

## Migration Template

Every migration should follow this structure:

```sql
-- Migration: <name>
-- Date: <date>
-- Description: <what it does>

-- Pre-checks
DO $$
BEGIN
    -- Verify preconditions
END $$;

-- Main migration
BEGIN;

-- Your changes here

-- Post-validation
DO $$
BEGIN
    -- Verify changes were successful
END $$;

COMMIT;
```