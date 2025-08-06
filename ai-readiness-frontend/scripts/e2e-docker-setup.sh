#!/bin/bash

# AI Readiness E2E Docker Setup Script
# This script manages the E2E test infrastructure setup/teardown

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.test.yml"
PROJECT_NAME="ai-readiness-e2e-test"
ENV_FILE=".env.test"

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

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if required files exist
check_files() {
    local missing_files=()
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        missing_files+=("$DOCKER_COMPOSE_FILE")
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        missing_files+=("$ENV_FILE")
    fi
    
    if [ ! -f "docker/kong-test.yml" ]; then
        missing_files+=("docker/kong-test.yml")
    fi
    
    if [ ! -f "docker/test-db-init.sql" ]; then
        missing_files+=("docker/test-db-init.sql")
    fi
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
    
    print_success "All required files are present"
}

# Function to wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=${2:-30}
    local attempt=1
    
    print_status "Waiting for $service_name to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service_name" 2>/dev/null | grep -q "healthy\|Up"; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name failed to become healthy within $(($max_attempts * 2)) seconds"
    return 1
}

# Function to setup E2E environment
setup() {
    print_status "Setting up E2E test environment..."
    
    check_docker
    check_files
    
    # Load environment variables
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        print_success "Loaded environment variables from $ENV_FILE"
    fi
    
    # Create necessary directories
    print_status "Creating required directories..."
    mkdir -p docker/test-data
    mkdir -p logs
    print_success "Directories created"
    
    # Start services
    print_status "Starting E2E test infrastructure..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d --remove-orphans
    
    # Wait for critical services
    print_status "Waiting for services to be ready..."
    wait_for_service "test-db" 30
    wait_for_service "test-auth" 20
    wait_for_service "test-kong" 20
    
    # Additional wait for full initialization
    print_status "Allowing additional time for full service initialization..."
    sleep 10
    
    # Verify services
    print_status "Verifying service health..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up\|healthy"; then
        print_success "E2E test environment is ready!"
        print_status "Services available at:"
        echo "  - Supabase API: http://localhost:54321"
        echo "  - Database: localhost:54322"
        echo "  - Auth Service: localhost:54325"
        echo "  - Mail Server UI: http://localhost:54324"
        echo "  - Redis: localhost:54328"
    else
        print_error "Some services failed to start properly"
        docker-compose -f "$DOCKER_COMPOSE_FILE" ps
        exit 1
    fi
}

# Function to teardown E2E environment
teardown() {
    print_status "Tearing down E2E test environment..."
    
    # Stop and remove containers, networks, and volumes
    docker-compose -f "$DOCKER_COMPOSE_FILE" down --volumes --remove-orphans
    
    # Remove any orphaned containers
    docker container prune -f 2>/dev/null || true
    
    print_success "E2E test environment torn down"
}

# Function to reset E2E environment
reset() {
    print_status "Resetting E2E test environment..."
    teardown
    sleep 3
    setup
}

# Function to show logs
logs() {
    local service=${1:-}
    if [ -n "$service" ]; then
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=100 "$service"
    else
        docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50
    fi
}

# Function to show status
status() {
    print_status "E2E test environment status:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" ps
    
    print_status "Service health check:"
    local services=("test-db" "test-auth" "test-rest" "test-kong" "test-mail" "test-redis")
    for service in "${services[@]}"; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Up\|healthy"; then
            echo -e "  ✅ $service: ${GREEN}Running${NC}"
        else
            echo -e "  ❌ $service: ${RED}Not running${NC}"
        fi
    done
}

# Function to validate environment
validate() {
    print_status "Validating E2E test environment..."
    
    local validation_failed=false
    
    # Check if services are running
    if ! docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
        print_error "No services are running. Run 'setup' first."
        validation_failed=true
    fi
    
    # Check database connectivity
    print_status "Testing database connection..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T test-db pg_isready -U postgres -d ai_readiness_test >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        validation_failed=true
    fi
    
    # Check Kong API gateway
    print_status "Testing API gateway..."
    if curl -s http://localhost:54321/health >/dev/null 2>&1; then
        print_success "API gateway is responding"
    else
        print_error "API gateway is not responding"
        validation_failed=true
    fi
    
    # Check Auth service
    print_status "Testing auth service..."
    if curl -s http://localhost:54325/health >/dev/null 2>&1; then
        print_success "Auth service is responding"
    else
        print_error "Auth service is not responding"
        validation_failed=true
    fi
    
    if [ "$validation_failed" = true ]; then
        print_error "Environment validation failed"
        exit 1
    else
        print_success "Environment validation passed"
    fi
}

# Function to run a quick smoke test
smoke_test() {
    print_status "Running E2E environment smoke test..."
    
    validate
    
    # Test database queries
    print_status "Testing database operations..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T test-db psql -U postgres -d ai_readiness_test -c "SELECT COUNT(*) FROM public.organizations;" >/dev/null 2>&1; then
        print_success "Database queries working"
    else
        print_error "Database queries failed"
        exit 1
    fi
    
    # Test Redis
    print_status "Testing Redis connection..."
    if docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T test-redis redis-cli ping >/dev/null 2>&1; then
        print_success "Redis connection working"
    else
        print_error "Redis connection failed"
        exit 1
    fi
    
    print_success "Smoke test passed - E2E environment is ready for testing!"
}

# Function to show help
show_help() {
    echo "E2E Docker Setup Script"
    echo ""
    echo "Usage: $0 {setup|teardown|reset|logs|status|validate|smoke-test|help}"
    echo ""
    echo "Commands:"
    echo "  setup        - Start the E2E test infrastructure"
    echo "  teardown     - Stop and remove all E2E test infrastructure"
    echo "  reset        - Teardown and setup (fresh start)"
    echo "  logs [service] - Show logs for all services or specific service"
    echo "  status       - Show current status of all services"
    echo "  validate     - Validate that all services are working properly"
    echo "  smoke-test   - Run comprehensive smoke tests"
    echo "  help         - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup              # Start all services"
    echo "  $0 logs test-db       # Show database logs"
    echo "  $0 validate          # Check if environment is working"
    echo "  $0 teardown          # Clean shutdown"
}

# Main script logic
case "${1:-help}" in
    setup)
        setup
        ;;
    teardown)
        teardown
        ;;
    reset)
        reset
        ;;
    logs)
        logs "${2:-}"
        ;;
    status)
        status
        ;;
    validate)
        validate
        ;;
    smoke-test)
        smoke_test
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

exit 0