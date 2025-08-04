# Checkpoint Restore Commands

## To restore context after devcontainer rebuild:

```bash
# 1. Load main checkpoint
npx claude-flow@alpha memory retrieve --key "checkpoint/e2e-testing-devcontainer-rebuild" --namespace "ai-readiness-frontend"

# 2. Load current todos
npx claude-flow@alpha memory retrieve --key "checkpoint/current-todos" --namespace "ai-readiness-frontend"

# 3. View all stored memory keys
npx claude-flow@alpha memory list --namespace "ai-readiness-frontend"
```

## Quick Context Summary:
- **Issue**: Login redirect not working (showing "wait as it redirects" but hanging)
- **Fix**: Removed setTimeout delay in login page
- **Goal**: Validate fix with E2E tests using local Supabase
- **Status**: Devcontainer configured for Docker-in-Docker, awaiting rebuild

## After Rebuild Commands:
```bash
# Verify Docker
docker --version

# Start Supabase
cd /workspaces/ai-readiness/ai-readiness-frontend
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:e2e
```