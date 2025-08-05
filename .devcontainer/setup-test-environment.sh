#!/bin/bash
set -e

echo "🚀 Setting up AI Readiness test environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Install global npm packages
log_info "Installing global npm packages..."
npm install -g pnpm@latest

# Navigate to the frontend directory
cd /workspaces/ai-readiness/ai-readiness-frontend

# Install project dependencies
log_info "Installing project dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Install Playwright browsers
log_info "Installing Playwright browsers..."
# First check if browsers are already installed
if [ -d "${PLAYWRIGHT_BROWSERS_PATH:-/home/node/pw-browsers}" ] && [ "$(ls -A ${PLAYWRIGHT_BROWSERS_PATH:-/home/node/pw-browsers})" ]; then
    log_info "Playwright browsers already installed, validating..."
    npx playwright install --dry-run || npx playwright install --with-deps
else
    log_info "Installing Playwright browsers for the first time..."
    npx playwright install --with-deps
fi

# Validate Playwright installation
if npx playwright --version >/dev/null 2>&1; then
    log_success "Playwright installed successfully: $(npx playwright --version)"
else
    log_warning "Playwright installation may have issues"
fi

# Copy test environment file
log_info "Setting up environment variables..."
if [ -f ".env.test" ]; then
    cp .env.test .env.local
    log_success "Test environment configuration copied"
else
    log_warning ".env.test not found, you'll need to create .env.local manually"
fi

# Setup database directories
log_info "Creating necessary directories..."
mkdir -p supabase/volumes/{db,storage,logs}
mkdir -p supabase/{config,functions}

# Make test scripts executable
log_info "Making scripts executable..."
if [ -d "scripts" ]; then
    chmod +x scripts/*.sh || true
fi

# Validate Docker is working
log_info "Validating Docker setup..."
if docker info >/dev/null 2>&1; then
    log_success "Docker is working correctly"
    
    # Validate Docker Compose configuration
    if [ -f "docker-compose.test.yml" ]; then
        log_info "Validating Docker Compose configuration..."
        if docker compose -f docker-compose.test.yml config >/dev/null 2>&1; then
            log_success "Docker Compose configuration is valid"
        else
            log_warning "Docker Compose validation failed, please check docker-compose.test.yml"
        fi
    fi
else
    log_warning "Docker is not available yet, you may need to restart the container"
fi

# Validate Playwright browsers are installed
log_info "Validating Playwright browser installations..."
if npx playwright install --list >/dev/null 2>&1; then
    INSTALLED_BROWSERS=$(npx playwright install --list 2>/dev/null | grep -E "chromium|firefox|webkit" | wc -l)
    if [ "$INSTALLED_BROWSERS" -ge 3 ]; then
        log_success "All Playwright browsers are installed"
    else
        log_warning "Some Playwright browsers may be missing. Run 'npx playwright install' to fix."
    fi
fi

# Create a test readiness indicator
touch /workspaces/ai-readiness/.devcontainer/.test-env-ready

log_success "Test environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Run 'cd ai-readiness-frontend' to navigate to the project"
echo "  2. Run 'npm run infra:setup' to start the test infrastructure"
echo "  3. Run 'npm run test:e2e' to run the E2E tests"
echo ""
echo "🔗 Available services will be at:"
echo "  - Next.js App: http://localhost:3000"
echo "  - Supabase API: http://localhost:54321"
echo "  - Supabase Studio: http://localhost:54323"
echo "  - PostgreSQL: localhost:54322"
echo "  - Email Testing: http://localhost:54324"