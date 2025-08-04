# DevContainer Configuration for AI Readiness

This directory contains the development container configuration for the AI Readiness project.

## 🚀 What's Included

The enhanced devcontainer provides:

1. **Node.js 20** with TypeScript support
2. **Docker-in-Docker** for running test containers
3. **PostgreSQL client tools** for database operations
4. **Git and GitHub CLI** for version control
5. **VS Code extensions** for testing and development
6. **Automatic port forwarding** for all services

## 📋 Configuration Files

- `devcontainer.json` - Main configuration file
- `setup-test-environment.sh` - Automated setup script
- `validate-devcontainer.js` - Configuration validator
- `rollback-devcontainer.sh` - Rollback to original config
- `devcontainer-backup.json` - Backup of original configuration

## 🔧 Using the DevContainer

### Before Making ANY Changes

Run the safety assistant:
```bash
cd /workspaces/ai-readiness/.devcontainer
./devcontainer-assistant.sh
```

This interactive tool will:
- Check if you're using a risky volume mount
- Verify Git backup status
- Validate configurations
- Guide you through safe modifications

### First Time Setup

1. **Open in VS Code**: Open the project folder
2. **Reopen in Container**: When prompted, choose "Reopen in Container"
3. **Wait for Build**: The container will build with all tools installed
4. **Automatic Setup**: The setup script runs automatically

### Manual Setup (if needed)

```bash
# If the automatic setup didn't run
cd /workspaces/ai-readiness/.devcontainer
./setup-test-environment.sh
```

### Starting Test Infrastructure

```bash
cd /workspaces/ai-readiness/ai-readiness-frontend
npm run infra:setup
```

## 🔍 Validation

Before rebuilding the container, validate the configuration:

```bash
cd /workspaces/ai-readiness/.devcontainer
node validate-devcontainer.js
```

## 🔄 Rollback

If you encounter issues, rollback to the original configuration:

```bash
cd /workspaces/ai-readiness/.devcontainer
./rollback-devcontainer.sh
```

## 🌐 Service Ports

The following ports are automatically forwarded:

- `3000` - Next.js application
- `54321` - Supabase API Gateway
- `54322` - PostgreSQL database
- `54323` - Supabase Studio
- `54324` - Inbucket (email testing)

## ⚠️ Troubleshooting

### Container Build Fails

1. Check Docker Desktop is running
2. Validate configuration: `node validate-devcontainer.js`
3. Check for port conflicts
4. Try building with `--no-cache`

### Docker-in-Docker Issues

1. Ensure Docker Desktop has enough resources
2. Check that privileged mode is enabled
3. Restart Docker Desktop if needed

### Port Conflicts

1. Check if ports are already in use
2. Stop conflicting services
3. Or modify `forwardPorts` in devcontainer.json

### Setup Script Fails

1. Check the logs in VS Code terminal
2. Run setup manually: `./setup-test-environment.sh`
3. Ensure all files have proper permissions

## 🔐 Security Notes

- The container runs in privileged mode for Docker-in-Docker
- Test credentials are stored in `.env.test`
- Never commit real credentials to the repository
- The Docker socket is mounted for container management

## 📚 Resources

- [DevContainer Documentation](https://containers.dev/)
- [Available Features](https://github.com/devcontainers/features)
- [VS Code DevContainers](https://code.visualstudio.com/docs/devcontainers/containers)