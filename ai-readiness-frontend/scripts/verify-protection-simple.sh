#!/bin/bash

# Simple verification without colors for better compatibility
echo "=========================================="
echo "Deployment Protection Verification"
echo "=========================================="
echo ""

PASSED=0
FAILED=0

# Git checks
echo "1. Git Configuration:"
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "  ✅ Git repository detected"
    ((PASSED++))
else
    echo "  ❌ Not in a git repository"
    ((FAILED++))
fi

current_branch=$(git branch --show-current)
echo "  📍 Current branch: $current_branch"

if git show-ref --verify --quiet refs/heads/develop; then
    echo "  ✅ Develop branch exists"
    ((PASSED++))
else
    echo "  ❌ Develop branch not found"
    ((FAILED++))
fi

# Local scripts
echo ""
echo "2. Local Protection Scripts:"
if [ -f "scripts/enforce-testing.sh" ]; then
    echo "  ✅ enforce-testing.sh exists"
    ((PASSED++))
else
    echo "  ❌ enforce-testing.sh not found"
    ((FAILED++))
fi

if [ -f "test-infrastructure/migration-manager.sh" ]; then
    echo "  ✅ migration-manager.sh exists"
    ((PASSED++))
else
    echo "  ❌ migration-manager.sh not found"
    ((FAILED++))
fi

# GitHub Actions
echo ""
echo "3. GitHub Actions Workflows:"
if [ -f ".github/workflows/deployment-protection.yml" ]; then
    echo "  ✅ deployment-protection.yml exists"
    ((PASSED++))
else
    echo "  ❌ deployment-protection.yml not found"
    ((FAILED++))
fi

if [ -f ".github/workflows/database-protection.yml" ]; then
    echo "  ✅ database-protection.yml exists"
    ((PASSED++))
else
    echo "  ❌ database-protection.yml not found"
    ((FAILED++))
fi

# Test Infrastructure
echo ""
echo "4. Test Infrastructure:"
if [ -f "test-infrastructure/docker-compose.yml" ]; then
    echo "  ✅ Docker compose configuration exists"
    ((PASSED++))
else
    echo "  ❌ Docker compose not found"
    ((FAILED++))
fi

# SQL Scripts
echo ""
echo "5. Database Scripts:"
if [ -f "FIX_EXISTING_DATABASE.sql" ]; then
    echo "  ✅ FIX_EXISTING_DATABASE.sql exists"
    ((PASSED++))
else
    echo "  ❌ FIX_EXISTING_DATABASE.sql not found"
    ((FAILED++))
fi

migration_count=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)
echo "  📊 Found $migration_count migration files"

# Documentation
echo ""
echo "6. Documentation:"
if [ -f "DEPLOYMENT_PROTECTION.md" ]; then
    echo "  ✅ DEPLOYMENT_PROTECTION.md exists"
    ((PASSED++))
else
    echo "  ❌ DEPLOYMENT_PROTECTION.md not found"
    ((FAILED++))
fi

if [ -f "SETUP_DEPLOYMENT_PROTECTION.md" ]; then
    echo "  ✅ SETUP_DEPLOYMENT_PROTECTION.md exists"
    ((PASSED++))
else
    echo "  ❌ SETUP_DEPLOYMENT_PROTECTION.md not found"
    ((FAILED++))
fi

# Summary
echo ""
echo "=========================================="
echo "Summary:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All local files are in place!"
    echo ""
    echo "Next steps:"
    echo "1. Read the setup guide: cat SETUP_DEPLOYMENT_PROTECTION.md"
    echo "2. Configure GitHub repository settings"
    echo "3. Setup Vercel staging environment"
    echo "4. Add required secrets to GitHub"
else
    echo ""
    echo "Some files are missing. Check the errors above."
fi

exit $FAILED