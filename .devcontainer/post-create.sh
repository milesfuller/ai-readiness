#!/bin/bash
set -e

echo "🚀 Setting up AI Readiness Dev Container..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Install Supabase CLI
print_step "Installing Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    npm install -g supabase
    print_success "Supabase CLI installed"
else
    print_success "Supabase CLI already installed"
fi

# Install Playwright browsers with dependencies
print_step "Installing Playwright browsers..."
cd /workspaces/ai-readiness/ai-readiness-frontend
if [ -f "package.json" ]; then
    npx playwright install --with-deps chromium firefox
    print_success "Playwright browsers installed"
else
    print_warning "Frontend directory not found, skipping Playwright installation"
fi

# Install project dependencies
print_step "Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed"
fi

# Set up Docker permissions
print_step "Configuring Docker permissions..."
if command -v docker &> /dev/null; then
    # Test Docker access
    if docker ps &> /dev/null; then
        print_success "Docker is accessible"
    else
        print_warning "Docker installed but not accessible. You may need to restart the container."
    fi
else
    print_warning "Docker not found. Rebuild container to include Docker-in-Docker feature."
fi

# Create test environment files if they don't exist
print_step "Setting up test environment..."
if [ ! -f ".env.test" ] && [ -f ".env.test.example" ]; then
    cp .env.test.example .env.test
    print_success "Created .env.test from example"
fi

# Set up git hooks for better development experience
print_step "Setting up git hooks..."
if [ -f "package.json" ] && grep -q "husky" package.json; then
    npx husky install
    print_success "Git hooks configured"
fi

# Create necessary directories
print_step "Creating project directories..."
mkdir -p test-results
mkdir -p docker/mcp-supabase/data
mkdir -p docker/mcp-supabase/logs
print_success "Project directories created"

# Final instructions
echo ""
echo "✨ Dev Container setup complete!"
echo ""
echo "To start the local Supabase instance:"
echo "  ${GREEN}./scripts/setup-docker-mcp.sh${NC}"
echo ""
echo "To run E2E tests:"
echo "  ${GREEN}npm run test:e2e:local${NC}"
echo ""
echo "To access Supabase Studio (after starting):"
echo "  ${GREEN}http://localhost:3000${NC}"
echo ""