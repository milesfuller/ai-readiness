#!/bin/bash

# Rollback script to restore original devcontainer configuration
# Usage: ./rollback-devcontainer.sh

echo "🔄 Rolling back devcontainer configuration..."

if [ -f "/workspaces/ai-readiness/.devcontainer/devcontainer-backup.json" ]; then
    cp /workspaces/ai-readiness/.devcontainer/devcontainer-backup.json /workspaces/ai-readiness/.devcontainer/devcontainer.json
    echo "✅ Original configuration restored!"
    echo ""
    echo "To use the original configuration:"
    echo "1. Close VS Code"
    echo "2. Reopen the folder"
    echo "3. Choose 'Reopen in Container' when prompted"
else
    echo "❌ Backup file not found!"
    echo "Cannot rollback to original configuration."
    exit 1
fi