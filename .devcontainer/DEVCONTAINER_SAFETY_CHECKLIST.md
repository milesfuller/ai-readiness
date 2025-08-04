# DevContainer Safety Checklist & Procedures

## 🤖 FOR AI ASSISTANTS: READ THIS BEFORE ANY DEVCONTAINER CHANGES

This document ensures safe devcontainer modifications. Always follow these procedures.

## 📋 Pre-Change Checklist

### 1. Determine Mount Type
```bash
# Check if using volume or bind mount
mount | grep workspaces
# If shows /dev/sdX = volume mount (RISKY)
# If shows local path = bind mount (SAFE)
```

### 2. Check Git Status
```bash
git status
git log --oneline -1
```

### 3. Available Configurations
- `devcontainer.json` - Current active
- `devcontainer-backup.json` - Original working version
- `devcontainer-minimal.json` - Bare minimum (always works)
- `devcontainer-working.json` - Enhanced without problematic features
- `devcontainer-safe.json` - Enhanced with error handling

## 🛠️ Available Tools

### Validation Script
```bash
cd /workspaces/ai-readiness/.devcontainer
node validate-devcontainer.js
```

### Test Build Script  
```bash
./test-devcontainer-build.sh
```

### Rollback Script
```bash
./rollback-devcontainer.sh
```

## 🔄 Safe Modification Workflow

### STEP 1: Backup Current Config
```bash
cp devcontainer.json devcontainer-backup-$(date +%Y%m%d).json
```

### STEP 2: Validate New Config
```bash
# After making changes
node validate-devcontainer.js
```

### STEP 3: Test Incrementally
1. Start with minimal changes
2. Add one feature at a time
3. Test each addition

### STEP 4: Document Changes
Update this checklist with any new learnings!

## ⚠️ Known Issues

1. **postgresql-client feature** - BROKEN, use apt-get instead
2. **Docker-in-Docker** - Requires privileged mode
3. **Volume mounts** - Higher risk than bind mounts

## 🚨 Emergency Procedures

If container won't start:
1. Use `devcontainer-minimal.json`
2. Access volume externally (see DEVCONTAINER_RECOVERY_GUIDE.md)
3. Rollback to backup config

## 📝 Decision Tree

```
Making devcontainer changes?
├── Is it a volume mount? 
│   ├── YES → Create Git backup first!
│   └── NO → Still backup, but lower risk
├── Adding new features?
│   ├── YES → Test one at a time
│   └── NO → Use validator
└── Build failed?
    ├── Check known issues above
    ├── Try minimal config
    └── Use rollback script
```