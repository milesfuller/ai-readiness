#!/bin/bash

# Production Migration Creator with Rollback Support
# Creates both forward and rollback migrations

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directories
FORWARD_DIR="./forward"
ROLLBACK_DIR="./rollback"
BACKUP_DIR="./backups"
HEALTH_DIR="./health-checks"
TEMPLATE_DIR="./templates"

# Create directories
mkdir -p "$FORWARD_DIR" "$ROLLBACK_DIR" "$BACKUP_DIR" "$HEALTH_DIR" "$TEMPLATE_DIR"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to generate timestamp
get_timestamp() {
    date +"%Y%m%d_%H%M%S"
}

# Function to create migration
create_migration() {
    local description=$1
    local timestamp=$(get_timestamp)
    local migration_name="${timestamp}_${description}"
    
    print_color $BLUE "Creating migration: $migration_name"
    
    # Create forward migration
    local forward_file="$FORWARD_DIR/${migration_name}.sql"
    cat > "$forward_file" <<EOF
-- ============================================
-- Migration: $migration_name
-- Date: $(date)
-- Description: $description
-- ============================================

-- SAFETY CHECKS
DO \$\$
BEGIN
    -- Check if migration already applied
    IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '$migration_name') THEN
        RAISE EXCEPTION 'Migration already applied: $migration_name';
    END IF;
    
    -- Check prerequisites
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') THEN
        RAISE EXCEPTION 'Migration system not initialized';
    END IF;
END \$\$;

-- START TRANSACTION
BEGIN;

-- ============================================
-- CHANGES START HERE
-- ============================================

-- TODO: Add your migration changes here
-- Example:
-- ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- ============================================
-- CHANGES END HERE
-- ============================================

-- VALIDATION
DO \$\$
BEGIN
    -- TODO: Add validation checks
    -- Example:
    -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'new_column') THEN
    --     RAISE EXCEPTION 'Migration validation failed: new_column not created';
    -- END IF;
END \$\$;

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('$migration_name', '$description', NOW());

COMMIT;

-- Post-migration message
DO \$\$
BEGIN
    RAISE NOTICE '✅ Migration $migration_name applied successfully';
END \$\$;
EOF
    
    print_color $GREEN "✅ Created forward migration: $forward_file"
    
    # Create rollback migration
    local rollback_file="$ROLLBACK_DIR/${migration_name}_rollback.sql"
    cat > "$rollback_file" <<EOF
-- ============================================
-- Rollback for: $migration_name
-- Date: $(date)
-- Description: Rollback $description
-- ============================================

-- SAFETY CHECKS
DO \$\$
BEGIN
    -- Check if migration was applied
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '$migration_name') THEN
        RAISE EXCEPTION 'Migration not found: $migration_name. Nothing to rollback.';
    END IF;
END \$\$;

-- START TRANSACTION
BEGIN;

-- ============================================
-- ROLLBACK CHANGES START HERE
-- ============================================

-- TODO: Add your rollback changes here
-- Example:
-- ALTER TABLE public.organizations DROP COLUMN IF EXISTS new_column;

-- ============================================
-- ROLLBACK CHANGES END HERE
-- ============================================

-- VALIDATION
DO \$\$
BEGIN
    -- TODO: Add validation that rollback was successful
    -- Example:
    -- IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'new_column') THEN
    --     RAISE EXCEPTION 'Rollback validation failed: new_column still exists';
    -- END IF;
END \$\$;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '$migration_name';

COMMIT;

-- Post-rollback message
DO \$\$
BEGIN
    RAISE NOTICE '✅ Rollback for $migration_name completed successfully';
END \$\$;
EOF
    
    print_color $GREEN "✅ Created rollback migration: $rollback_file"
    
    # Create backup script
    local backup_file="$BACKUP_DIR/backup_before_${migration_name}.sql"
    cat > "$backup_file" <<EOF
-- ============================================
-- Backup Script for: $migration_name
-- Run this BEFORE applying the migration
-- ============================================

-- Create backup tables for affected data
-- TODO: Customize based on what your migration affects

-- Example: Backup organizations table
CREATE TABLE IF NOT EXISTS backup_${timestamp}_organizations AS 
SELECT * FROM public.organizations;

-- Example: Backup specific columns
CREATE TABLE IF NOT EXISTS backup_${timestamp}_metadata AS
SELECT 
    'organizations' as table_name,
    COUNT(*) as row_count,
    NOW() as backup_time
FROM public.organizations

UNION ALL

SELECT 
    'onboarding_progress' as table_name,
    COUNT(*) as row_count,
    NOW() as backup_time
FROM public.onboarding_progress;

-- Record backup
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('backup_$migration_name', 'Backup before $description', NOW());

SELECT '✅ Backup created for migration $migration_name' as status;
EOF
    
    print_color $GREEN "✅ Created backup script: $backup_file"
    
    # Create health check
    local health_file="$HEALTH_DIR/verify_${migration_name}.sql"
    cat > "$health_file" <<EOF
-- ============================================
-- Health Check for: $migration_name
-- Run this AFTER applying the migration
-- ============================================

-- Check migration was recorded
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM schema_migrations WHERE version = '$migration_name')
        THEN '✅ Migration recorded'
        ELSE '❌ Migration NOT recorded'
    END as migration_status;

-- Check table integrity
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- Check for any errors in recent operations
-- TODO: Add specific checks for your migration

-- Example checks:
DO \$\$
DECLARE
    error_count INTEGER;
BEGIN
    -- Check critical tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        RAISE WARNING 'Critical table missing: organizations';
    END IF;
    
    -- Check critical columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'settings') THEN
        RAISE WARNING 'Critical column missing: organizations.settings';
    END IF;
    
    RAISE NOTICE '✅ Health check passed for migration $migration_name';
END \$\$;
EOF
    
    print_color $GREEN "✅ Created health check: $health_file"
    
    # Create instructions file
    local instructions_file="${migration_name}_instructions.md"
    cat > "$instructions_file" <<EOF
# Migration Instructions: $migration_name

## Description
$description

## Files Created
- Forward Migration: \`$forward_file\`
- Rollback Script: \`$rollback_file\`
- Backup Script: \`$backup_file\`
- Health Check: \`$health_file\`

## Application Process

### 1. Test in Development
\`\`\`bash
cd test-infrastructure
./migration-manager.sh test ../supabase/migrations/$forward_file
\`\`\`

### 2. Create Production Backup
Run in Supabase SQL Editor:
\`\`\`sql
-- Copy contents of $backup_file
\`\`\`

### 3. Apply Migration
Run in Supabase SQL Editor:
\`\`\`sql
-- Copy contents of $forward_file
\`\`\`

### 4. Verify Health
Run in Supabase SQL Editor:
\`\`\`sql
-- Copy contents of $health_file
\`\`\`

### 5. If Rollback Needed
Run in Supabase SQL Editor:
\`\`\`sql
-- Copy contents of $rollback_file
\`\`\`

## Checklist
- [ ] Tested in development environment
- [ ] Backup created in production
- [ ] Migration applied successfully
- [ ] Health check passed
- [ ] Application tested and working
- [ ] Migration marked as complete

## Notes
- Always run during low-traffic periods
- Monitor application logs during migration
- Have rollback script ready
- Test rollback in development first
EOF
    
    print_color $GREEN "✅ Created instructions: $instructions_file"
    
    print_color $BLUE "\n=========================================="
    print_color $GREEN "Migration package created successfully!"
    print_color $BLUE "=========================================="
    print_color $YELLOW "\nNext steps:"
    print_color $YELLOW "1. Edit $forward_file to add your changes"
    print_color $YELLOW "2. Edit $rollback_file to add rollback logic"
    print_color $YELLOW "3. Test in development environment"
    print_color $YELLOW "4. Follow instructions in $instructions_file"
}

# Main execution
if [ $# -eq 0 ]; then
    print_color $YELLOW "Usage: $0 <migration_description>"
    print_color $YELLOW "Example: $0 add_user_preferences"
    exit 1
fi

# Replace spaces with underscores in description
description="${1// /_}"

create_migration "$description"