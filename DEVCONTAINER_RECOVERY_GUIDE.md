# DevContainer Recovery & Backup Guide

## 🚨 Critical: You're Using a Container Volume!

Since you used **"Clone in Container Volume"**, your code is stored in a Docker volume, not on your local filesystem. This guide covers both backup procedures and recovery options.

## 🛡️ Before Any DevContainer Changes: Backup Checklist

### 1. **Git Backup (Recommended - Do This First!)**
```bash
# Check what's not committed
git status

# Add all new devcontainer files
git add .devcontainer/
git add *.md

# Commit your changes
git commit -m "Add enhanced devcontainer configuration with safety measures"

# Push to remote repository
git push origin main
```

### 2. **Local Archive Backup**
```bash
# Create a timestamped backup
cd /workspaces
tar -czf ai-readiness-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=coverage \
  ai-readiness/

# Download via VS Code:
# 1. Right-click the .tar.gz file in Explorer
# 2. Select "Download..."
# 3. Save to your local machine
```

## 🔄 Safe Rebuild Strategy

### Step 1: Test Minimal Configuration First
Instead of using the full enhanced config immediately, test with minimal changes:

```json
{
  "name": "AI Readiness - Minimal Test",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20-bullseye",
  "postCreateCommand": "cd ai-readiness-frontend && npm install",
  "forwardPorts": [3000]
}
```

### Step 2: Progressive Enhancement
If minimal config works, add features one at a time:

1. **Add Docker first**:
```json
"features": {
  "ghcr.io/devcontainers/features/docker-in-docker:2": {}
}
```

2. **Then add other tools**:
```json
"features": {
  "ghcr.io/devcontainers/features/docker-in-docker:2": {},
  "ghcr.io/devcontainers/features/git:1": {}
}
```

3. **Finally add customizations**

## 🚨 If DevContainer Build Fails

### Option 1: Access Volume from Outside VS Code

1. **Find your volume name**:
```bash
# On your local machine (not in container)
docker volume ls | grep -E "(vscode|ai-readiness)"
```

2. **Mount volume to recover files**:
```bash
# Replace <volume-name> with your actual volume
docker run -it --rm \
  -v <volume-name>:/workspace \
  -v ~/Desktop/ai-readiness-recovery:/backup \
  ubuntu:22.04 bash

# Inside recovery container
cp -r /workspace/* /backup/
exit
```

3. **Your code is now at** `~/Desktop/ai-readiness-recovery`

### Option 2: Use VS Code Recovery Container

1. Create a file named `recovery.devcontainer.json`:
```json
{
  "name": "Recovery Container",
  "image": "ubuntu:22.04",
  "postCreateCommand": "apt-get update && apt-get install -y git"
}
```

2. Open Command Palette: `Dev Containers: Open Folder in Container...`
3. Select the volume mount point
4. Use the recovery container to access files

### Option 3: Emergency Docker Commands

```bash
# List all containers (including stopped)
docker ps -a | grep vscode

# Start a stopped container
docker start <container-id>

# Access the container
docker exec -it <container-id> bash

# Copy files out
docker cp <container-id>:/workspaces/ai-readiness ~/Desktop/recovery
```

## 🔧 Volume-Specific Recovery

### Understanding Your Setup
- **Volume Clone**: Code lives in Docker volume `vscode-<hash>`
- **Not Local**: No direct filesystem access without Docker
- **Persistent**: Volume survives container rebuilds (usually)
- **At Risk**: Docker Desktop reset deletes all volumes

### Finding Your Volume
```bash
# Show all Docker volumes
docker volume ls

# Find volumes with vscode prefix
docker volume ls | grep vscode

# Inspect volume details
docker volume inspect <volume-name>
```

### Direct Volume Access
```bash
# Create a minimal container to access volume
docker run -it --rm \
  -v <your-volume-name>:/recovery \
  -v $PWD:/backup \
  alpine sh

# Inside container
cd /recovery
ls -la  # Your code should be here
cp -r * /backup/
```

## 🎯 Recommended Approach for Your Situation

Given that you're in a container volume setup:

1. **First Priority**: Commit and push to Git right now
2. **Second Priority**: Create local backup archive and download
3. **Then**: Use the `devcontainer-working.json` configuration (without postgresql-client feature)
4. **Test**: Try rebuild with minimal config first
5. **Fallback**: Use recovery procedures if needed

## 🚀 Converting to Safer Local Development

For future projects, consider:

1. **Clone to local folder** instead of container volume
2. **Then** reopen in container
3. This way code is always accessible locally

To convert current setup:
1. Push everything to Git
2. Close VS Code
3. Clone repository to local folder: `git clone <repo-url> ~/projects/ai-readiness`
4. Open local folder in VS Code
5. Then "Reopen in Container"

## 📋 Configuration Files Overview

- `devcontainer.json` - Current active configuration
- `devcontainer-backup.json` - Your original working config
- `devcontainer-working.json` - Fixed version without problematic features
- `devcontainer-safe.json` - Enhanced with error handling
- `devcontainer-minimal.json` - Absolute minimum for recovery

## 🛠️ Tools Installation Without Features

If features fail, install tools manually in `postCreateCommand`:

```json
"postCreateCommand": "apt-get update && apt-get install -y postgresql-client docker.io docker-compose git && cd ai-readiness-frontend && npm install"
```

## 📞 Emergency Contacts & Commands

### VS Code DevContainer Team
- Issues: https://github.com/microsoft/vscode-remote-release/issues
- Documentation: https://code.visualstudio.com/docs/devcontainers/containers

### Reset DevContainer Cache
```bash
# Windows
rm -r %LOCALAPPDATA%\Microsoft\vscode-remote\

# macOS/Linux
rm -rf ~/.vscode-server/
```

### Force Rebuild Without Cache
1. Command Palette: `Dev Containers: Clean Up Dev Volumes...`
2. Command Palette: `Dev Containers: Rebuild Container Without Cache`

## ✅ Your Next Steps

1. **Run these commands NOW** (before rebuild):
```bash
git add .
git commit -m "DevContainer enhancements with recovery options"
git push origin main
```

2. **Create backup archive**:
```bash
tar -czf /workspaces/backup-20240804.tar.gz --exclude=node_modules --exclude=.next /workspaces/ai-readiness/
```

3. **Download the backup** through VS Code

4. **Then try rebuild** with `devcontainer-working.json`

Remember: Your code is safe as long as you have either:
- Git repository up to date
- Local backup downloaded
- Docker volume intact (even if container fails)