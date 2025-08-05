#!/bin/bash

# E2E Test Environment Setup Script
# Comprehensive setup for Playwright E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[E2E-SETUP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[E2E-SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[E2E-WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[E2E-ERROR]${NC} $1"
}

# Main setup function
main() {
    local command=${1:-"setup"}
    
    case $command in
        "setup")
            setup_e2e_environment
            ;;
        "cleanup")
            cleanup_e2e_environment
            ;;
        "validate")
            validate_e2e_environment
            ;;
        "help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Setup E2E environment
setup_e2e_environment() {
    log_info "Setting up E2E test environment..."
    
    # Create required directories
    mkdir -p playwright/.auth
    mkdir -p test-results/{e2e-artifacts,e2e-report,archive}
    
    # Copy environment configuration
    if [ -f ".env.test" ]; then
        cp .env.test .env.local
        log_success "Test environment configuration loaded"
    elif [ -f ".env.playwright" ]; then
        cp .env.playwright .env.local
        log_success "Playwright environment configuration loaded"
    else
        log_warning "No test environment file found, using defaults"
    fi
    
    # Set up test infrastructure if needed
    if [ -f "./scripts/test-infrastructure-setup.sh" ]; then
        log_info "Starting test infrastructure..."
        ./scripts/test-infrastructure-setup.sh start
    fi
    
    # Validate setup
    validate_e2e_environment
    
    log_success "E2E environment setup completed!"
}

# Cleanup E2E environment
cleanup_e2e_environment() {
    log_info "Cleaning up E2E test environment..."
    
    # Remove auth files
    if [ -d "playwright/.auth" ]; then
        rm -rf playwright/.auth/*.json
        log_success "Authentication files cleaned up"
    fi
    
    # Clean up old test results (keep recent ones)
    if [ -d "test-results" ]; then
        find test-results -name "*.png" -mtime +1 -delete 2>/dev/null || true
        find test-results -name "*.webm" -mtime +1 -delete 2>/dev/null || true
        log_success "Old test artifacts cleaned up"
    fi
    
    # Stop test infrastructure if running
    if [ -f "./scripts/test-infrastructure-setup.sh" ]; then
        log_info "Stopping test infrastructure..."
        ./scripts/test-infrastructure-setup.sh stop
    fi
    
    # Remove environment file
    rm -f .env.local
    
    log_success "E2E environment cleanup completed!"
}

# Validate E2E environment
validate_e2e_environment() {
    log_info "Validating E2E test environment..."
    
    # Check required environment variables
    local required_vars=(
        "NODE_ENV"
        "PLAYWRIGHT_BASE_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "TEST_USER_EMAIL"
        "TEST_USER_PASSWORD"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] && ! grep -q "^${var}=" .env.local 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    # Check if services are accessible
    local base_url=$(grep "^PLAYWRIGHT_BASE_URL=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "http://localhost:3001")
    local supabase_url=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local 2>/dev/null | cut -d'=' -f2 || echo "http://localhost:54321")
    
    # Test application accessibility
    if curl -s -f "$base_url" >/dev/null 2>&1 || curl -s -f "$base_url/health" >/dev/null 2>&1; then
        log_success "Application is accessible at $base_url"
    else
        log_warning "Application may not be running at $base_url"
    fi
    
    # Test Supabase accessibility
    if curl -s -f "$supabase_url" >/dev/null 2>&1 || curl -s -f "$supabase_url/health" >/dev/null 2>&1; then
        log_success "Supabase is accessible at $supabase_url"
    else
        log_warning "Supabase may not be running at $supabase_url"
    fi
    
    log_success "E2E environment validation completed!"
}

# Show help
show_help() {
    echo "E2E Test Environment Setup Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up E2E test environment (default)"
    echo "  cleanup   - Clean up E2E test environment"
    echo "  validate  - Validate E2E test environment"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # Set up environment"
    echo "  $0 validate  # Check if environment is ready"
    echo "  $0 cleanup   # Clean up after tests"
}

# Run main function with all arguments
main "$@"