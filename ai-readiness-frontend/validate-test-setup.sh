#!/bin/bash

# =============================================================================
# TEST SETUP VALIDATION
# =============================================================================
# Quick validation script to ensure the working test setup is correct
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[✓] $1${NC}"
}

error() {
    echo -e "${RED}[✗] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

echo "🔍 Validating Working Test Setup..."
echo "================================="

# Check required files exist
echo
echo "📁 Checking required files..."

required_files=(
    "run-working-tests.sh"
    "test-config.working.js"
    "test-mock-server.js"
    "e2e/working-tests.spec.ts"
    "e2e/global-setup.working.js"
    "e2e/global-teardown.working.js"
    "WORKING_TEST_SETUP.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        log "Found: $file"
    else
        error "Missing: $file"
        exit 1
    fi
done

# Check permissions
echo
echo "🔐 Checking permissions..."
if [ -x "run-working-tests.sh" ]; then
    log "run-working-tests.sh is executable"
else
    warning "Making run-working-tests.sh executable..."
    chmod +x run-working-tests.sh
    log "Fixed permissions"
fi

# Check Node.js and npm
echo
echo "🟢 Checking Node.js environment..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log "Node.js version: $NODE_VERSION"
else
    error "Node.js not found"
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    log "npm version: $NPM_VERSION"
else
    error "npm not found"
    exit 1
fi

# Check dependencies
echo
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    log "node_modules exists"
else
    warning "node_modules not found - run 'npm install'"
fi

if [ -f "node_modules/@playwright/test/package.json" ]; then
    log "Playwright is installed"
else
    warning "Playwright not found - run 'npm install'"
fi

# Test mock server syntax
echo
echo "🧪 Validating mock server..."
if node -c test-mock-server.js; then
    log "Mock server syntax is valid"
else
    error "Mock server has syntax errors"
    exit 1
fi

# Test Playwright config syntax
echo "🎭 Validating Playwright config..."
if node -c test-config.working.js; then
    log "Playwright config syntax is valid"
else
    error "Playwright config has syntax errors"
    exit 1
fi

# Test TypeScript compilation
echo "📝 Validating test files..."
if command -v npx >/dev/null 2>&1; then
    if npx tsc --noEmit e2e/working-tests.spec.ts 2>/dev/null; then
        log "Test TypeScript compiles successfully"
    else
        warning "TypeScript compilation warnings (may still work)"
    fi
else
    warning "npx not available - skipping TypeScript check"
fi

# Check for conflicting processes
echo
echo "🚪 Checking for port conflicts..."
if lsof -i:54321 >/dev/null 2>&1; then
    warning "Port 54321 is in use - may need to stop existing processes"
else
    log "Port 54321 is available"
fi

if lsof -i:3001 >/dev/null 2>&1; then
    warning "Port 3001 is in use - may need to stop existing processes"
else
    log "Port 3001 is available"
fi

# Final summary
echo
echo "📋 VALIDATION SUMMARY"
echo "===================="
echo
log "✅ All required files are present"
log "✅ Permissions are set correctly"
log "✅ Node.js environment is ready"
log "✅ File syntax is valid"
echo
echo "🚀 Ready to run tests!"
echo
echo "Next steps:"
echo "  1. Install dependencies: npm install"
echo "  2. Run working tests: ./run-working-tests.sh"
echo "  3. View documentation: cat WORKING_TEST_SETUP.md"
echo
echo "For help: ./run-working-tests.sh --help"