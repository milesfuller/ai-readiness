#!/bin/bash

# Test Environment Setup Script
# Sets up local Supabase and test environment for AI Readiness Frontend

set -e

echo "🧪 Setting up test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in CI
if [ "$CI" = "true" ]; then
    print_status "Running in CI environment"
    CI_MODE=true
else
    print_status "Running in local development environment"
    CI_MODE=false
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Check Docker (for Supabase)
if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    print_error "Supabase requires Docker to run locally."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_success "Docker is running"

# Install Supabase CLI if not present
if ! command_exists supabase; then
    print_status "Installing Supabase CLI..."
    npm install -g @supabase/cli@latest
    print_success "Supabase CLI installed"
else
    SUPABASE_VERSION=$(supabase --version)
    print_success "Supabase CLI version: $SUPABASE_VERSION"
fi

# Install Playwright if not present
if ! command_exists playwright; then
    print_status "Installing Playwright..."
    npm install -g @playwright/test
    print_success "Playwright installed globally"
fi

# Install project dependencies
print_status "Installing project dependencies..."
npm ci
print_success "Dependencies installed"

# Install Playwright browsers
print_status "Installing Playwright browsers..."
npx playwright install chromium firefox webkit
print_success "Playwright browsers installed"

# Copy test environment configuration
print_status "Setting up test environment configuration..."
if [ ! -f ".env.test" ]; then
    print_error ".env.test file not found. Please ensure it exists."
    exit 1
fi

# Copy .env.test to .env.local for testing
cp .env.test .env.local
print_success "Test environment configuration copied"

# Initialize Supabase project if not already done
if [ ! -f "supabase/config.toml" ]; then
    print_status "Initializing Supabase project..."
    supabase init
    print_success "Supabase project initialized"
else
    print_success "Supabase project already initialized"
fi

# Start Supabase services
print_status "Starting Supabase services..."
if supabase status | grep -q "supabase local development setup is running"; then
    print_warning "Supabase is already running"
else
    supabase start
    print_success "Supabase services started"
fi

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 5

# Check if Supabase is accessible
if curl -f -s http://localhost:54321/health >/dev/null; then
    print_success "Supabase API is accessible"
else
    print_error "Supabase API is not accessible"
    exit 1
fi

# Run database migrations if they exist
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
    print_status "Running database migrations..."
    supabase db reset
    print_success "Database migrations completed"
else
    print_warning "No migrations found, skipping..."
fi

# Seed test data if seed file exists
if [ -f "supabase/seed.sql" ]; then
    print_status "Seeding test data..."
    supabase db reset --with-seed
    print_success "Test data seeded"
else
    print_warning "No seed file found, skipping test data seeding..."
fi

# Create test directories
print_status "Creating test directories..."
mkdir -p playwright/.auth
mkdir -p test-results
mkdir -p playwright-report
print_success "Test directories created"

# Build the application
print_status "Building the application..."
npm run build
print_success "Application built successfully"

# Start the application in the background for testing
print_status "Starting the application..."
if [ "$CI_MODE" = "true" ]; then
    # In CI, start the server and wait
    npm run start &
    SERVER_PID=$!
    print_status "Server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f -s http://localhost:3000 >/dev/null; then
            print_success "Application is ready"
            break
        fi
        sleep 1
        timeout=$((timeout - 1))
    done
    
    if [ $timeout -eq 0 ]; then
        print_error "Application failed to start within timeout"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
else
    print_status "In development mode, application will be started by Playwright"
fi

# Run a quick health check
print_status "Running health checks..."

# Check Supabase health
if curl -f -s http://localhost:54321/health | grep -q "ok"; then
    print_success "✅ Supabase health check passed"
else
    print_error "❌ Supabase health check failed"
    exit 1
fi

# Check application health
if curl -f -s http://localhost:3000 >/dev/null; then
    print_success "✅ Application health check passed"
else
    print_warning "⚠️  Application not running (will be started by Playwright)"
fi

# Print summary
echo ""
echo "🎉 Test environment setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Supabase Local: http://localhost:54321"
echo "  - Supabase Studio: http://localhost:54323"
echo "  - Application: http://localhost:3000"
echo "  - Database: postgresql://postgres:postgres@localhost:54322/postgres"
echo ""
echo "🧪 Available test commands:"
echo "  - npm run test:e2e           # Run all E2E tests"
echo "  - npm run test:e2e:ui        # Run tests with UI"
echo "  - npm run test:e2e:debug     # Debug tests"
echo "  - playwright test --config playwright.config.test.ts"
echo ""
echo "🛑 To stop services:"
echo "  - supabase stop              # Stop Supabase"
echo "  - docker-compose down        # Stop all Docker services"
echo ""

# Save environment info for cleanup
cat > .test-env-info << EOF
SUPABASE_RUNNING=true
SERVER_PID=${SERVER_PID:-""}
SETUP_TIME=$(date)
EOF

exit 0