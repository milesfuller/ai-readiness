#!/bin/bash

# Migration Manager with Rollback Support
# Maintains production-like state and handles rollbacks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5434}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_NAME=${DB_NAME:-test_db}

MIGRATION_DIR="./migrations"
ROLLBACK_DIR="./rollbacks"
SNAPSHOT_DIR="./snapshots"

# Ensure directories exist
mkdir -p "$MIGRATION_DIR" "$ROLLBACK_DIR" "$SNAPSHOT_DIR"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to execute SQL
execute_sql() {
    local sql=$1
    echo "$sql" | PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 2>&1
}

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -v ON_ERROR_STOP=1 -f "$file" 2>&1
}

# Function to create database snapshot
create_snapshot() {
    local snapshot_name=$1
    local snapshot_file="$SNAPSHOT_DIR/${snapshot_name}_$(date +%Y%m%d_%H%M%S).sql"
    
    print_color $YELLOW "Creating snapshot: $snapshot_name..."
    
    PGPASSWORD=$DB_PASS pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER \
        --clean --if-exists --create --no-owner --no-privileges \
        $DB_NAME > "$snapshot_file"
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Snapshot created: $snapshot_file"
        echo "$snapshot_file"
    else
        print_color $RED "❌ Failed to create snapshot"
        return 1
    fi
}

# Function to restore from snapshot
restore_snapshot() {
    local snapshot_file=$1
    
    if [ ! -f "$snapshot_file" ]; then
        print_color $RED "❌ Snapshot file not found: $snapshot_file"
        return 1
    fi
    
    print_color $YELLOW "Restoring from snapshot: $snapshot_file..."
    
    # Drop and recreate database
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    
    # Restore from snapshot
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$snapshot_file" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Database restored from snapshot"
        return 0
    else
        print_color $RED "❌ Failed to restore from snapshot"
        return 1
    fi
}

# Function to get current migration version
get_current_version() {
    local version=$(execute_sql "SELECT COALESCE(MAX(version), '000_initial') FROM schema_migrations;" 2>/dev/null | grep -v "^$" | head -1)
    if [ -z "$version" ] || [[ "$version" == *"ERROR"* ]]; then
        echo "000_initial"
    else
        echo "$version"
    fi
}

# Function to apply migration
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    print_color $BLUE "\n=========================================="
    print_color $BLUE "Applying Migration: $migration_name"
    print_color $BLUE "=========================================="
    
    # Check if already applied
    local existing=$(execute_sql "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null | grep -v "^$" | head -1)
    if [ "$existing" = "1" ]; then
        print_color $YELLOW "⏭️  Migration already applied: $migration_name"
        return 0
    fi
    
    # Create pre-migration snapshot
    local snapshot_file=$(create_snapshot "pre_${migration_name}")
    
    # Start transaction and apply migration
    print_color $YELLOW "Applying migration..."
    
    # Create a temporary file with transaction wrapper
    local temp_file=$(mktemp)
    cat > "$temp_file" <<EOF
BEGIN;

-- Apply the migration
\i $migration_file

-- Record in migration table
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('$migration_name', 'Applied from $migration_file', NOW())
ON CONFLICT (version) DO NOTHING;

-- Verify critical tables exist
DO \$\$
BEGIN
    -- Check for critical tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        RAISE EXCEPTION 'Critical table missing: organizations';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_progress') THEN
        RAISE EXCEPTION 'Critical table missing: onboarding_progress';
    END IF;
    
    -- Check for critical columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'onboarding_progress' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'Critical column missing: onboarding_progress.user_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'settings') THEN
        RAISE EXCEPTION 'Critical column missing: organizations.settings';
    END IF;
END \$\$;

COMMIT;
EOF
    
    # Execute migration with transaction
    if output=$(execute_sql_file "$temp_file" 2>&1); then
        print_color $GREEN "✅ Migration applied successfully: $migration_name"
        
        # Create post-migration snapshot for rollback
        create_snapshot "post_${migration_name}" > /dev/null
        
        # Save rollback information
        echo "$snapshot_file" > "$ROLLBACK_DIR/${migration_name}.rollback"
        
        rm "$temp_file"
        return 0
    else
        print_color $RED "❌ Migration failed: $migration_name"
        echo "$output" | grep -E "ERROR|EXCEPTION" | head -5
        
        # Automatic rollback
        print_color $YELLOW "🔄 Attempting automatic rollback..."
        if restore_snapshot "$snapshot_file"; then
            print_color $GREEN "✅ Successfully rolled back to pre-migration state"
        else
            print_color $RED "❌ Automatic rollback failed! Manual intervention required."
            print_color $RED "   Snapshot available at: $snapshot_file"
        fi
        
        rm "$temp_file"
        return 1
    fi
}

# Function to manually rollback a migration
rollback_migration() {
    local migration_name=$1
    local rollback_file="$ROLLBACK_DIR/${migration_name}.rollback"
    
    if [ ! -f "$rollback_file" ]; then
        print_color $RED "❌ No rollback information found for: $migration_name"
        return 1
    fi
    
    local snapshot_file=$(cat "$rollback_file")
    
    print_color $BLUE "\n=========================================="
    print_color $BLUE "Rolling Back: $migration_name"
    print_color $BLUE "=========================================="
    
    if restore_snapshot "$snapshot_file"; then
        # Remove from migrations table
        execute_sql "DELETE FROM schema_migrations WHERE version = '$migration_name';"
        print_color $GREEN "✅ Successfully rolled back migration: $migration_name"
        return 0
    else
        print_color $RED "❌ Rollback failed for: $migration_name"
        return 1
    fi
}

# Function to sync with production state
sync_with_production() {
    print_color $BLUE "\n=========================================="
    print_color $BLUE "Syncing with Production State"
    print_color $BLUE "=========================================="
    
    # These are the migrations already applied in production
    local production_migrations=(
        "000_migration_tracking"
        "001_invitations_schema"
        "20240101000005_onboarding_tables"
        "20240807_survey_system"
        "20241207_organization_settings"
        "20250107_survey_templates"
    )
    
    # Apply production state
    print_color $YELLOW "Applying production migrations..."
    
    # First apply the FIX_EXISTING_DATABASE.sql to get to current state
    if [ -f "../FIX_EXISTING_DATABASE.sql" ]; then
        execute_sql_file "../FIX_EXISTING_DATABASE.sql" > /dev/null 2>&1
    fi
    
    # Mark migrations as applied
    for migration in "${production_migrations[@]}"; do
        execute_sql "INSERT INTO schema_migrations (version, description, applied_at) 
                     VALUES ('$migration', 'Production sync', NOW()) 
                     ON CONFLICT (version) DO NOTHING;" > /dev/null 2>&1
    done
    
    print_color $GREEN "✅ Synced with production state"
    
    # Create baseline snapshot
    create_snapshot "production_baseline" > /dev/null
}

# Function to test a new migration
test_migration() {
    local migration_file=$1
    
    if [ ! -f "$migration_file" ]; then
        print_color $RED "❌ Migration file not found: $migration_file"
        return 1
    fi
    
    print_color $BLUE "\n=========================================="
    print_color $BLUE "Testing Migration"
    print_color $BLUE "=========================================="
    
    # Ensure we're at production state
    sync_with_production
    
    # Apply the migration
    if apply_migration "$migration_file"; then
        # Run validation tests
        print_color $YELLOW "\nRunning validation tests..."
        
        # Test data insertion
        if execute_sql "INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com');" > /dev/null 2>&1; then
            print_color $GREEN "✅ Auth user creation works"
        fi
        
        if execute_sql "INSERT INTO organizations (name, domain) VALUES ('Test', 'test.com');" > /dev/null 2>&1; then
            print_color $GREEN "✅ Organization creation works"
        fi
        
        # Check indexes
        local index_count=$(execute_sql "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | grep -v "^$" | head -1)
        print_color $GREEN "✅ Indexes created: $index_count"
        
        # Check foreign keys
        local fk_count=$(execute_sql "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" | grep -v "^$" | head -1)
        print_color $GREEN "✅ Foreign keys: $fk_count"
        
        print_color $GREEN "\n🎉 Migration test successful!"
        return 0
    else
        print_color $RED "\n❌ Migration test failed"
        return 1
    fi
}

# Function to show migration status
show_status() {
    print_color $BLUE "\n=========================================="
    print_color $BLUE "Migration Status"
    print_color $BLUE "=========================================="
    
    print_color $YELLOW "Applied Migrations:"
    execute_sql "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;" 2>/dev/null | head -20
    
    print_color $YELLOW "\nDatabase Tables:"
    execute_sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | head -20
    
    print_color $YELLOW "\nAvailable Snapshots:"
    ls -la "$SNAPSHOT_DIR"/*.sql 2>/dev/null | tail -5 || echo "  No snapshots found"
}

# Main menu
show_menu() {
    print_color $BLUE "\n=========================================="
    print_color $BLUE "SQL Migration Manager"
    print_color $BLUE "=========================================="
    print_color $YELLOW "1. Sync with production state"
    print_color $YELLOW "2. Test new migration"
    print_color $YELLOW "3. Apply migration"
    print_color $YELLOW "4. Rollback migration"
    print_color $YELLOW "5. Show status"
    print_color $YELLOW "6. Create snapshot"
    print_color $YELLOW "7. Restore snapshot"
    print_color $YELLOW "8. Exit"
    echo -n "Choose an option: "
}

# Handle command line arguments
case "${1:-}" in
    sync)
        sync_with_production
        ;;
    test)
        test_migration "${2:-}"
        ;;
    apply)
        sync_with_production
        apply_migration "${2:-}"
        ;;
    rollback)
        rollback_migration "${2:-}"
        ;;
    status)
        show_status
        ;;
    *)
        # Interactive mode
        while true; do
            show_menu
            read -r choice
            
            case $choice in
                1)
                    sync_with_production
                    ;;
                2)
                    echo -n "Enter migration file path: "
                    read -r file
                    test_migration "$file"
                    ;;
                3)
                    echo -n "Enter migration file path: "
                    read -r file
                    sync_with_production
                    apply_migration "$file"
                    ;;
                4)
                    echo -n "Enter migration name to rollback: "
                    read -r name
                    rollback_migration "$name"
                    ;;
                5)
                    show_status
                    ;;
                6)
                    echo -n "Enter snapshot name: "
                    read -r name
                    create_snapshot "$name"
                    ;;
                7)
                    echo "Available snapshots:"
                    ls "$SNAPSHOT_DIR"/*.sql 2>/dev/null
                    echo -n "Enter snapshot file path: "
                    read -r file
                    restore_snapshot "$file"
                    ;;
                8)
                    print_color $GREEN "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_color $RED "Invalid option"
                    ;;
            esac
        done
        ;;
esac