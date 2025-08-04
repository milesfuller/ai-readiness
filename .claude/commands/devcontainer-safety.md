# DevContainer Safety Commands

## Purpose
Ensure safe devcontainer modifications by following established procedures and using available tools.

## Quick Commands

### Before ANY devcontainer.json changes:
```bash
cd /workspaces/ai-readiness/.devcontainer
./devcontainer-assistant.sh
```

### Manual safety check:
```bash
# 1. Check mount type
mount | grep workspaces

# 2. Check git status  
git status

# 3. Validate config
node validate-devcontainer.js

# 4. Backup current
cp devcontainer.json devcontainer-backup-$(date +%Y%m%d).json
```

## Available Tools
- `validate-devcontainer.js` - Validates JSON and checks for issues
- `test-devcontainer-build.sh` - Tests build without affecting current
- `rollback-devcontainer.sh` - Restore previous working config
- `devcontainer-assistant.sh` - Interactive safety guide

## Configuration Files
- `devcontainer-minimal.json` - Always works, bare minimum
- `devcontainer-working.json` - Enhanced, tested features
- `devcontainer-safe.json` - Enhanced with error handling
- `devcontainer-backup.json` - Original configuration

## Known Issues
- `postgresql-client` feature is broken - use apt-get instead
- Docker-in-Docker requires privileged mode
- Can't test builds from within container

## Emergency Recovery
See `/workspaces/ai-readiness/DEVCONTAINER_RECOVERY_GUIDE.md`