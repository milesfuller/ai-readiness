#!/bin/bash

# Test DevContainer Build Locally
# This script tests the devcontainer build without affecting your current environment

set -e

echo "🧪 Testing DevContainer Build Locally"
echo "===================================="
echo ""
echo "This will test the build without affecting your current setup."
echo ""

# Check if devcontainer CLI is installed
if ! command -v devcontainer &> /dev/null; then
    echo "📦 Installing devcontainer CLI..."
    npm install -g @devcontainers/cli
fi

# Save current directory
PROJECT_DIR=$(pwd)

# Create a temporary test directory
TEST_DIR=$(mktemp -d)
echo "📁 Creating test directory: $TEST_DIR"

# Copy devcontainer configuration
cp -r .devcontainer "$TEST_DIR/"

# Create a minimal test workspace
cat > "$TEST_DIR/package.json" <<EOF
{
  "name": "devcontainer-test",
  "version": "1.0.0",
  "description": "Test workspace for devcontainer"
}
EOF

# Test the build
echo ""
echo "🔨 Testing devcontainer build..."
echo ""

cd "$TEST_DIR"

if devcontainer build --workspace-folder . ; then
    echo ""
    echo "✅ DevContainer build successful!"
    echo ""
    echo "The configuration should work when you rebuild in VS Code."
else
    echo ""
    echo "❌ DevContainer build failed!"
    echo ""
    echo "Please check the error messages above."
    echo "DO NOT rebuild in VS Code until the issues are resolved."
fi

# Cleanup
cd "$PROJECT_DIR"
rm -rf "$TEST_DIR"

echo ""
echo "🧹 Test directory cleaned up"
echo ""
echo "📋 Next steps:"
echo "  - If build succeeded: Safe to rebuild in VS Code"
echo "  - If build failed: Fix issues in devcontainer.json first"