#!/bin/bash

# Test Environment Cleanup Script
# Cleans up test environment and stops services

set -e

echo "🧹 Cleaning up test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Stop Next.js development server if running
print_status "Stopping Next.js development server..."
if pgrep -f "next dev" > /dev/null; then
    pkill -f "next dev"
    print_success "Next.js development server stopped"
else
    print_warning "Next.js development server not running"
fi

# Stop Supabase if running
if command_exists supabase; then
    print_status "Stopping Supabase services..."
    if supabase status | grep -q "supabase local development setup is running"; then
        supabase stop
        print_success "Supabase services stopped"
    else
        print_warning "Supabase services not running"
    fi
else
    print_warning "Supabase CLI not found"
fi

# Clean up Docker containers
print_status "Cleaning up Docker containers..."
if command_exists docker; then
    # Stop any running Supabase containers
    docker ps -q --filter "ancestor=supabase/postgres" | xargs -r docker stop
    docker ps -q --filter "ancestor=supabase/edge-runtime" | xargs -r docker stop
    docker ps -q --filter "ancestor=supabase/auth" | xargs -r docker stop
    docker ps -q --filter "ancestor=supabase/storage-api" | xargs -r docker stop
    docker ps -q --filter "ancestor=supabase/realtime" | xargs -r docker stop
    docker ps -q --filter "ancestor=supabase/postgrest" | xargs -r docker stop
    
    # Clean up stopped containers and unused networks
    docker container prune -f > /dev/null 2>&1
    docker network prune -f > /dev/null 2>&1
    
    print_success "Docker cleanup completed"
else
    print_warning "Docker not found"
fi

# Clean up test artifacts
print_status "Cleaning up test artifacts..."

# Remove test results
if [ -d "test-results" ]; then
    rm -rf test-results/*
    print_success "Test results cleaned up"
fi

# Remove Playwright reports
if [ -d "playwright-report" ]; then
    rm -rf playwright-report/*
    print_success "Playwright reports cleaned up"
fi

# Remove authentication files
if [ -d "playwright/.auth" ]; then
    rm -rf playwright/.auth/*.json
    print_success "Authentication files cleaned up"
fi

# Remove temporary files
if [ -d "temp" ]; then
    rm -rf temp
    print_success "Temporary files cleaned up"
fi

# Remove test environment file
if [ -f ".env.local" ]; then
    rm .env.local
    print_success "Test environment file removed"
fi

# Remove test environment info
if [ -f ".test-env-info" ]; then
    rm .test-env-info
    print_success "Test environment info cleaned up"
fi

# Clean up node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    print_success "Node modules cache cleaned up"
fi

# Clean up Next.js build cache
if [ -d ".next" ]; then
    rm -rf .next
    print_success "Next.js build cache cleaned up"
fi

# Optional: Clean up coverage reports (uncomment if needed)
if [ "$1" = "--full" ]; then
    print_status "Performing full cleanup..."
    
    if [ -d "coverage" ]; then
        rm -rf coverage
        print_success "Coverage reports cleaned up"
    fi
    
    # Clean up npm cache
    npm cache clean --force > /dev/null 2>&1
    print_success "npm cache cleaned up"
    
    # Clean up Playwright cache
    if command_exists playwright; then
        npx playwright uninstall > /dev/null 2>&1 || true
        print_success "Playwright browsers cleaned up"
    fi
fi

print_success "✅ Test environment cleanup completed!"

echo ""
echo "📋 Cleanup Summary:"
echo "  - Supabase services stopped"
echo "  - Docker containers cleaned up"
echo "  - Test artifacts removed"
echo "  - Temporary files cleaned up"
echo "  - Cache files cleared"

if [ "$1" = "--full" ]; then
    echo "  - Full cleanup performed"
    echo ""
    echo "🔄 To restore the test environment, run:"
    echo "  ./scripts/test-setup.sh"
fi

echo ""
echo "🎉 Ready for a fresh test environment setup!"

exit 0