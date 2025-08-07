#!/bin/bash

# Enforce Testing Before Production Deployment
# This script MUST pass before any production deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REQUIRED_TESTS_FILE=".test-results.json"
MIGRATION_HASH_FILE=".migration-hash"
STAGING_APPROVAL_FILE=".staging-approved"

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to calculate hash of migration files
calculate_migration_hash() {
    find . -name "*.sql" -type f | sort | xargs sha256sum | sha256sum | cut -d' ' -f1
}

# Function to check if migrations have changed
check_migration_changes() {
    local current_hash=$(calculate_migration_hash)
    
    if [ -f "$MIGRATION_HASH_FILE" ]; then
        local stored_hash=$(cat "$MIGRATION_HASH_FILE")
        if [ "$current_hash" != "$stored_hash" ]; then
            print_color $RED "❌ Migration files have changed since last test!"
            print_color $YELLOW "Please run: npm run test:migrations"
            return 1
        fi
    else
        print_color $RED "❌ No migration test results found!"
        print_color $YELLOW "Please run: npm run test:migrations"
        return 1
    fi
    
    print_color $GREEN "✅ Migration files unchanged since last test"
    return 0
}

# Function to check test results
check_test_results() {
    if [ ! -f "$REQUIRED_TESTS_FILE" ]; then
        print_color $RED "❌ Test results not found!"
        print_color $YELLOW "Please run: npm test"
        return 1
    fi
    
    # Check if tests passed (you'd parse the JSON here)
    local test_status=$(grep -o '"status":"[^"]*' "$REQUIRED_TESTS_FILE" | cut -d'"' -f4)
    
    if [ "$test_status" != "passed" ]; then
        print_color $RED "❌ Tests did not pass!"
        return 1
    fi
    
    print_color $GREEN "✅ All tests passed"
    return 0
}

# Function to check staging approval
check_staging_approval() {
    if [ ! -f "$STAGING_APPROVAL_FILE" ]; then
        print_color $RED "❌ Staging deployment not approved!"
        print_color $YELLOW "Deploy to staging first and get approval"
        return 1
    fi
    
    # Check if approval is recent (within 24 hours)
    local approval_time=$(stat -c %Y "$STAGING_APPROVAL_FILE" 2>/dev/null || stat -f %m "$STAGING_APPROVAL_FILE" 2>/dev/null)
    local current_time=$(date +%s)
    local time_diff=$((current_time - approval_time))
    
    if [ $time_diff -gt 86400 ]; then
        print_color $RED "❌ Staging approval is older than 24 hours!"
        print_color $YELLOW "Please re-deploy to staging and get fresh approval"
        return 1
    fi
    
    print_color $GREEN "✅ Staging deployment approved"
    return 0
}

# Function to verify environment
verify_environment() {
    local target_env=${1:-production}
    
    if [ "$target_env" == "production" ]; then
        print_color $YELLOW "🔒 Production deployment requires all checks to pass"
        
        # Check if on main branch
        local current_branch=$(git branch --show-current)
        if [ "$current_branch" != "main" ]; then
            print_color $RED "❌ Not on main branch! Current branch: $current_branch"
            return 1
        fi
        
        # Check for uncommitted changes
        if ! git diff-index --quiet HEAD --; then
            print_color $RED "❌ Uncommitted changes detected!"
            print_color $YELLOW "Please commit or stash your changes"
            return 1
        fi
    fi
    
    print_color $GREEN "✅ Environment checks passed for $target_env"
    return 0
}

# Main execution
main() {
    local target_env=${1:-production}
    
    print_color $BLUE "=========================================="
    print_color $BLUE "Pre-Deployment Safety Checks"
    print_color $BLUE "Target: $target_env"
    print_color $BLUE "=========================================="
    
    local all_passed=true
    
    # Run all checks
    if ! check_migration_changes; then
        all_passed=false
    fi
    
    if ! check_test_results; then
        all_passed=false
    fi
    
    if [ "$target_env" == "production" ]; then
        if ! check_staging_approval; then
            all_passed=false
        fi
    fi
    
    if ! verify_environment "$target_env"; then
        all_passed=false
    fi
    
    print_color $BLUE "=========================================="
    
    if [ "$all_passed" = true ]; then
        print_color $GREEN "🎉 All checks passed! Safe to deploy to $target_env"
        
        # Update migration hash for next time
        calculate_migration_hash > "$MIGRATION_HASH_FILE"
        
        exit 0
    else
        print_color $RED "❌ Deployment blocked! Fix the issues above and try again."
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    staging)
        main "staging"
        ;;
    production)
        main "production"
        ;;
    test)
        # Run tests and save results
        npm test && echo '{"status":"passed"}' > "$REQUIRED_TESTS_FILE"
        calculate_migration_hash > "$MIGRATION_HASH_FILE"
        print_color $GREEN "✅ Test results saved"
        ;;
    approve-staging)
        # Mark staging as approved
        touch "$STAGING_APPROVAL_FILE"
        print_color $GREEN "✅ Staging deployment approved"
        ;;
    *)
        print_color $YELLOW "Usage: $0 [staging|production|test|approve-staging]"
        exit 1
        ;;
esac