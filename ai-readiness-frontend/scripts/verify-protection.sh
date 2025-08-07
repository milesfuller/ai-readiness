#!/bin/bash

# Verify Deployment Protection is Active
# This script checks if all protection measures are properly configured

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    print_color $BLUE "=========================================="
    print_color $BLUE "$1"
    print_color $BLUE "=========================================="
}

# Check results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

check_pass() {
    local message=$1
    print_color $GREEN "✅ $message"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_fail() {
    local message=$1
    print_color $RED "❌ $message"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

check_warn() {
    local message=$1
    print_color $YELLOW "⚠️  $message"
    ((WARNINGS++))
    ((TOTAL_CHECKS++))
}

# Check 1: Git Configuration
print_header "1. Git Configuration"

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    check_pass "Git repository detected"
    
    # Check current branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" == "main" ]; then
        check_warn "Currently on main branch - be careful!"
    else
        check_pass "Not on main branch (current: $current_branch)"
    fi
    
    # Check if develop branch exists
    if git show-ref --verify --quiet refs/heads/develop; then
        check_pass "Develop branch exists"
    else
        check_fail "Develop branch not found - create with: git checkout -b develop"
    fi
else
    check_fail "Not in a git repository"
fi

# Check 2: Local Protection Scripts
print_header "2. Local Protection Scripts"

# Check if enforce-testing.sh exists and is executable
if [ -f "scripts/enforce-testing.sh" ]; then
    if [ -x "scripts/enforce-testing.sh" ]; then
        check_pass "enforce-testing.sh exists and is executable"
    else
        check_warn "enforce-testing.sh exists but not executable - run: chmod +x scripts/enforce-testing.sh"
    fi
else
    check_fail "enforce-testing.sh not found"
fi

# Check if migration manager exists
if [ -f "test-infrastructure/migration-manager.sh" ]; then
    check_pass "migration-manager.sh exists"
else
    check_fail "migration-manager.sh not found"
fi

# Check 3: GitHub Actions Workflows
print_header "3. GitHub Actions Workflows"

if [ -f ".github/workflows/deployment-protection.yml" ]; then
    check_pass "deployment-protection.yml workflow exists"
else
    check_fail "deployment-protection.yml workflow not found"
fi

if [ -f ".github/workflows/database-protection.yml" ]; then
    check_pass "database-protection.yml workflow exists"
else
    check_fail "database-protection.yml workflow not found"
fi

# Check 4: Environment Files
print_header "4. Environment Configuration"

if [ -f ".env.staging" ]; then
    check_pass ".env.staging template exists"
else
    check_warn ".env.staging template not found"
fi

if [ -f ".env.production" ]; then
    check_pass ".env.production template exists"
else
    check_warn ".env.production template not found"
fi

# Check 5: Test Infrastructure
print_header "5. Test Infrastructure"

if [ -f "test-infrastructure/docker-compose.yml" ]; then
    check_pass "Docker compose configuration exists"
    
    # Check if Docker is installed
    if command -v docker &> /dev/null; then
        check_pass "Docker is installed"
    else
        check_warn "Docker not installed - needed for local migration testing"
    fi
else
    check_fail "Docker compose configuration not found"
fi

# Check 6: SQL Scripts
print_header "6. Database Scripts"

if [ -f "FIX_EXISTING_DATABASE.sql" ]; then
    check_pass "FIX_EXISTING_DATABASE.sql exists"
else
    check_fail "FIX_EXISTING_DATABASE.sql not found"
fi

# Count migration files
migration_count=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)
if [ "$migration_count" -gt 0 ]; then
    check_pass "Found $migration_count migration files"
else
    check_warn "No migration files found in supabase/migrations"
fi

# Check 7: Package Scripts
print_header "7. NPM Scripts"

if [ -f "package.json" ]; then
    # Check for required scripts
    if grep -q '"test"' package.json; then
        check_pass "Test script defined in package.json"
    else
        check_fail "Test script not found in package.json"
    fi
    
    if grep -q '"lint"' package.json; then
        check_pass "Lint script defined in package.json"
    else
        check_warn "Lint script not found in package.json"
    fi
    
    if grep -q '"build"' package.json; then
        check_pass "Build script defined in package.json"
    else
        check_fail "Build script not found in package.json"
    fi
else
    check_fail "package.json not found"
fi

# Check 8: Documentation
print_header "8. Documentation"

if [ -f "DEPLOYMENT_PROTECTION.md" ]; then
    check_pass "Deployment protection documentation exists"
else
    check_fail "DEPLOYMENT_PROTECTION.md not found"
fi

if [ -f "SETUP_DEPLOYMENT_PROTECTION.md" ]; then
    check_pass "Setup guide documentation exists"
else
    check_fail "SETUP_DEPLOYMENT_PROTECTION.md not found"
fi

# Check 9: GitHub Remote (if possible)
print_header "9. GitHub Configuration"

# Check if we have a GitHub remote
if git remote -v | grep -q github.com; then
    check_pass "GitHub remote configured"
    
    # Get repository info
    repo_url=$(git remote get-url origin 2>/dev/null || echo "")
    if [ ! -z "$repo_url" ]; then
        print_color $BLUE "  Repository: $repo_url"
    fi
else
    check_warn "No GitHub remote found - protection won't work without GitHub"
fi

# Check 10: Required Tools
print_header "10. Required Tools"

# Check Node.js
if command -v node &> /dev/null; then
    node_version=$(node --version)
    check_pass "Node.js installed ($node_version)"
else
    check_fail "Node.js not installed"
fi

# Check npm
if command -v npm &> /dev/null; then
    npm_version=$(npm --version)
    check_pass "npm installed ($npm_version)"
else
    check_fail "npm not installed"
fi

# Check Vercel CLI (optional but recommended)
if command -v vercel &> /dev/null; then
    check_pass "Vercel CLI installed"
else
    check_warn "Vercel CLI not installed - install with: npm i -g vercel"
fi

# Final Summary
print_header "Verification Summary"

print_color $GREEN "Passed: $PASSED_CHECKS"
print_color $YELLOW "Warnings: $WARNINGS"
print_color $RED "Failed: $FAILED_CHECKS"

echo ""
if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        print_color $GREEN "🎉 All checks passed! Your deployment protection is ready."
    else
        print_color $GREEN "✅ Core protection is ready. Some optional features need attention."
    fi
    echo ""
    print_color $BLUE "Next steps:"
    echo "1. Run: cat SETUP_DEPLOYMENT_PROTECTION.md"
    echo "2. Follow the setup guide to configure GitHub and Vercel"
    echo "3. Test the protection with: ./scripts/enforce-testing.sh staging"
else
    print_color $RED "❌ Some critical checks failed. Please fix these issues first."
    echo ""
    print_color $YELLOW "For detailed setup instructions, run:"
    echo "cat SETUP_DEPLOYMENT_PROTECTION.md"
fi

exit $FAILED_CHECKS