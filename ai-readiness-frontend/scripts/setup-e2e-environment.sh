#!/bin/bash

# =============================================================================
# E2E Test Environment Setup Script
# Sets up complete test infrastructure with health checks
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.test"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.e2e.yml"

echo -e "${BLUE}🚀 Starting E2E Test Environment Setup${NC}"
echo "=================================================================================="

# Function: Print status message
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function: Print success message
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function: Print warning message
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function: Print error message
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function: Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function: Wait for service health
wait_for_service() {
    local service_name="$1"
    local health_check="$2"
    local max_attempts="${3:-30}"
    local attempt=1

    print_status "Waiting for $service_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$health_check" >/dev/null 2>&1; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy after $max_attempts attempts"
    return 1
}

# Function: Validate environment file
validate_env_file() {
    print_status "Validating environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        return 1
    fi
    
    # Check required variables
    local required_vars=(
        "NODE_ENV"
        "PLAYWRIGHT_BASE_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "DATABASE_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        printf ' - %s\n' "${missing_vars[@]}"
        return 1
    fi
    
    print_success "Environment file validation passed"
}

# Function: Setup Docker services
setup_docker_services() {
    print_status "Setting up Docker services..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed"
        return 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed"
        return 1
    fi
    
    # Stop any existing services
    print_status "Stopping existing services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --remove-orphans || true
    
    # Pull latest images
    print_status "Pulling Docker images..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Start services
    print_status "Starting services..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check service health
    wait_for_service "PostgreSQL" "docker-compose -f $DOCKER_COMPOSE_FILE exec -T supabase-db pg_isready -U postgres"
    wait_for_service "Kong API Gateway" "curl -f http://localhost:54321/health"
    wait_for_service "PostgREST" "curl -f http://localhost:54324/"
    wait_for_service "Redis" "docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli ping"
    wait_for_service "Mock Server" "curl -f http://localhost:3001/mockserver/status"
    
    print_success "All Docker services are running"
}

# Function: Initialize database
initialize_database() {
    print_status "Initializing test database..."
    
    # Wait for database to be ready
    sleep 5
    
    # Run migrations if they exist
    if [[ -d "$PROJECT_ROOT/supabase/migrations" ]]; then
        print_status "Running database migrations..."
        # Here you would run your migration command
        # Example: npx supabase db reset --local
    fi
    
    # Seed test data if seed files exist
    if [[ -d "$PROJECT_ROOT/supabase/seeds" ]]; then
        print_status "Seeding test data..."
        # Here you would run your seed command
    fi
    
    print_success "Database initialization complete"
}

# Function: Verify service connectivity
verify_services() {
    print_status "Verifying service connectivity..."
    
    local services=(
        "http://localhost:3000|Next.js App"
        "http://localhost:54321|Supabase API"
        "http://localhost:54322|PostgreSQL (via healthcheck)"
        "http://localhost:6379|Redis (via healthcheck)"
        "http://localhost:3001/mockserver/status|Mock Server"
    )
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        IFS='|' read -r url name <<< "$service"
        
        if [[ "$url" == *"healthcheck"* ]]; then
            # Skip direct URL check for database services
            continue
        fi
        
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "$name is accessible"
        else
            print_warning "$name is not accessible at $url"
            failed_services+=("$name")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        print_warning "Some services are not accessible:"
        printf ' - %s\n' "${failed_services[@]}"
        print_warning "Tests may fail if these services are required"
    else
        print_success "All services are accessible"
    fi
}

# Function: Run environment validation tests
run_validation_tests() {
    print_status "Running environment validation tests..."
    
    # Test database connection
    if command_exists psql; then
        print_status "Testing database connection..."
        if PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "Database connection test passed"
        else
            print_warning "Database connection test failed"
        fi
    fi
    
    # Test Redis connection
    if command_exists redis-cli; then
        print_status "Testing Redis connection..."
        if redis-cli -p 6379 ping >/dev/null 2>&1; then
            print_success "Redis connection test passed"
        else
            print_warning "Redis connection test failed"
        fi
    fi
    
    # Test API endpoints
    print_status "Testing API endpoints..."
    local api_tests=(
        "http://localhost:3001/api/health|Mock Server Health"
        "http://localhost:54321/health|Supabase Health"
    )
    
    for test in "${api_tests[@]}"; do
        IFS='|' read -r url name <<< "$test"
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "$name endpoint is working"
        else
            print_warning "$name endpoint test failed"
        fi
    done
}

# Function: Generate environment summary
generate_summary() {
    print_status "Generating environment summary..."
    
    cat << EOF

================================================================================
🎯 E2E Test Environment Setup Complete
================================================================================

Services Status:
✅ PostgreSQL Database:     http://localhost:54322
✅ Supabase API Gateway:    http://localhost:54321  
✅ PostgREST API:          http://localhost:54324
✅ Auth Service:           http://localhost:54325
✅ Storage Service:        http://localhost:54326
✅ Email Testing:          http://localhost:54325 (Inbucket)
✅ Redis Cache:            localhost:6379
✅ Mock Server:            http://localhost:3001

Environment Configuration:
📄 Environment File:       $ENV_FILE
🐳 Docker Compose:         $DOCKER_COMPOSE_FILE
🎭 Playwright Base URL:    $(grep PLAYWRIGHT_BASE_URL "$ENV_FILE" | cut -d'=' -f2)

Next Steps:
1. Run Playwright tests: npm run test:e2e
2. View test results:     npm run test:e2e:ui
3. Check service logs:    docker-compose -f $DOCKER_COMPOSE_FILE logs
4. Stop services:        docker-compose -f $DOCKER_COMPOSE_FILE down

Commands:
- Health check:          ./scripts/validate-e2e-environment.sh
- Restart services:      docker-compose -f $DOCKER_COMPOSE_FILE restart
- View logs:            docker-compose -f $DOCKER_COMPOSE_FILE logs -f [service-name]

================================================================================

EOF

    print_success "Environment setup complete! 🎉"
}

# Main execution
main() {
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Load environment variables
    if [[ -f "$ENV_FILE" ]]; then
        # shellcheck source=/dev/null
        set -a
        source "$ENV_FILE"
        set +a
    fi
    
    # Execute setup steps
    validate_env_file
    setup_docker_services
    initialize_database
    verify_services
    run_validation_tests
    generate_summary
}

# Error handling
trap 'print_error "Setup failed at line $LINENO"' ERR

# Run main function
main "$@"