#!/bin/bash

# Create PR using GitHub CLI
gh pr create \
  --title "feat: Add deployment protection system and fix production database" \
  --body "## Summary
- Added comprehensive deployment protection with GitHub Actions
- Created database migration testing infrastructure with Docker
- Fixed production database missing user_id columns
- Implemented staging/production environment separation
- Added local enforcement scripts to prevent untested deployments

## Changes
- ✅ GitHub Actions workflows for CI/CD
- ✅ Database migration testing with rollback support
- ✅ FIX_EXISTING_DATABASE.sql (already applied to production)
- ✅ Branch protection documentation
- ✅ Environment-specific configurations
- ✅ Test infrastructure for SQL validation

## Test Plan
- [x] Production database fixed with FIX_EXISTING_DATABASE.sql
- [ ] GitHub Actions will run on this PR
- [ ] Status checks will become available after first run
- [ ] Branch protection will enforce testing

This PR will trigger the workflows for the first time, making status checks available in branch protection settings.

🤖 Generated with Claude Code" \
  --base main \
  --head feature/deployment-protection

echo "PR created successfully!"