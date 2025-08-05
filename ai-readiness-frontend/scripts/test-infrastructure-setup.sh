#!/bin/bash

# Test Infrastructure Setup Script
# This script sets up the complete test infrastructure for AI Readiness Frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    log_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name failed to start within timeout"
    return 1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command_exists npm; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Setup environment
setup_environment() {
    log_info "Setting up test environment..."
    
    # Copy test environment configuration
    if [ -f ".env.test" ]; then
        cp .env.test .env.local
        log_success "Test environment configuration copied"
    else
        log_error ".env.test file not found!"
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p supabase/volumes/{db,storage,logs}
    mkdir -p supabase/{config,functions}
    log_success "Directory structure created"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ -f "package.json" ]; then
        npm install --prefer-offline --no-audit
        log_success "Dependencies installed"
    else
        log_error "package.json not found!"
        exit 1
    fi
}

# Start infrastructure
start_infrastructure() {
    log_info "Starting test infrastructure..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.test.yml down -v --remove-orphans >/dev/null 2>&1 || true
    
    # Start services
    docker-compose -f docker-compose.test.yml up -d --build
    
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check individual services
    log_info "Checking service health..."
    
    # Database
    if pg_isready -h localhost -p 54322 -U postgres >/dev/null 2>&1; then
        log_success "PostgreSQL database is ready"
    else
        log_info "Waiting for PostgreSQL database..."
        timeout 120 bash -c 'until pg_isready -h localhost -p 54322 -U postgres; do sleep 2; done'
        log_success "PostgreSQL database is ready"
    fi
    
    # Kong API Gateway
    wait_for_service "Kong API Gateway" "http://localhost:54321/health" 60 || true
    
    # Auth service
    wait_for_service "Auth Service" "http://localhost:54321/auth/v1/health" 60 || true
    
    # REST API
    if curl -f -s -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" "http://localhost:54321/rest/v1/" >/dev/null 2>&1; then
        log_success "REST API is ready"
    else
        log_warning "REST API health check failed, but continuing..."
    fi
    
    # Supabase Studio
    wait_for_service "Supabase Studio" "http://localhost:54323" 30 || log_warning "Supabase Studio may not be fully ready"
    
    log_success "Test infrastructure started successfully"
}

# Apply migrations
apply_migrations() {
    log_info "Applying database migrations..."
    
    if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations 2>/dev/null)" ]; then
        for migration in supabase/migrations/*.sql; do
            if [ -f "$migration" ]; then
                log_info "Applying migration: $(basename "$migration")"
                PGPASSWORD=test_postgres_password psql -h localhost -p 54322 -U postgres -d postgres -f "$migration" >/dev/null 2>&1
            fi
        done
        log_success "Database migrations applied"
    else
        log_info "No migrations to apply"
    fi
}

# Seed test data
seed_test_data() {
    log_info "Seeding test data..."
    
    if [ -d "supabase/seeds" ] && [ "$(ls -A supabase/seeds 2>/dev/null)" ]; then
        for seed in supabase/seeds/*.sql; do
            if [ -f "$seed" ]; then
                log_info "Applying seed: $(basename "$seed")"
                PGPASSWORD=test_postgres_password psql -h localhost -p 54322 -U postgres -d postgres -f "$seed" >/dev/null 2>&1
            fi
        done
        log_success "Test data seeded"
    else
        log_info "No seed data to apply"
    fi
}

# Validate infrastructure
validate_infrastructure() {
    log_info "Validating test infrastructure..."
    
    # Check all expected services are running
    local services=(
        "supabase-db-test"
        "supabase-kong-test"
        "supabase-auth-test"
        "supabase-rest-test"
        "supabase-storage-test"
        "supabase-realtime-test"
        "supabase-analytics-test"
        "supabase-studio-test"
        "supabase-inbucket-test"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "^$service$"; then
            log_success "$service is running"
        else
            log_warning "$service is not running"
            failed_services+=("$service")
        fi
    done
    
    # Test database connection
    if PGPASSWORD=test_postgres_password psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Database connection test passed"
    else
        log_error "Database connection test failed"
        failed_services+=("database-connection")
    fi
    
    # Test API endpoints
    local endpoints=(
        "http://localhost:54321/auth/v1/health"
        "http://localhost:54321/rest/v1/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" >/dev/null 2>&1; then
            log_success "API endpoint $endpoint is accessible"
        else
            log_warning "API endpoint $endpoint is not accessible"
        fi
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "Infrastructure validation completed successfully"
        return 0
    else
        log_warning "Some services failed validation: ${failed_services[*]}"
        return 1
    fi
}

# Display infrastructure status
show_status() {
    log_info "Test Infrastructure Status:"
    echo ""
    echo "🐳 Docker Containers:"
    docker-compose -f docker-compose.test.yml ps
    echo ""
    echo "🌐 Service Endpoints:"
    echo "  • Supabase API: http://localhost:54321"
    echo "  • Supabase Studio: http://localhost:54323"
    echo "  • PostgreSQL: localhost:54322"
    echo "  • Inbucket (Email): http://localhost:54324"
    echo ""
    echo "🔑 Test Credentials:"
    echo "  • Database: postgres/test_postgres_password"
    echo "  • Supabase Dashboard: supabase/test_dashboard_password"
    echo ""
    echo "📝 Test Environment Variables loaded from .env.local"
    echo ""
}

# Cleanup infrastructure
cleanup_infrastructure() {
    log_info "Cleaning up test infrastructure..."
    
    docker-compose -f docker-compose.test.yml down -v --remove-orphans >/dev/null 2>&1 || true
    docker system prune -f >/dev/null 2>&1 || true
    
    log_success "Infrastructure cleanup completed"
}

# Main execution
main() {
    local command=${1:-"start"}
    
    case $command in
        "start")
            log_info "Starting AI Readiness Test Infrastructure Setup..."
            check_prerequisites
            setup_environment
            install_dependencies
            start_infrastructure
            apply_migrations
            seed_test_data
            validate_infrastructure
            show_status
            log_success "Test infrastructure setup completed successfully!"
            ;;
        "stop")
            log_info "Stopping test infrastructure..."
            cleanup_infrastructure
            log_success "Test infrastructure stopped"
            ;;
        "restart")
            log_info "Restarting test infrastructure..."
            cleanup_infrastructure
            sleep 2
            main "start"
            ;;
        "status")
            show_status
            ;;
        "validate")
            validate_infrastructure
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     - Start the test infrastructure (default)"
            echo "  stop      - Stop and cleanup the test infrastructure"
            echo "  restart   - Restart the test infrastructure"
            echo "  status    - Show infrastructure status"
            echo "  validate  - Validate infrastructure health"
            echo "  help      - Show this help message"
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Trap cleanup function on script exit
trap 'if [ $? -ne 0 ]; then log_error "Script failed. Use '\''$0 stop'\'' to clean up."; fi' EXIT

# Run main function with all arguments
main "$@"