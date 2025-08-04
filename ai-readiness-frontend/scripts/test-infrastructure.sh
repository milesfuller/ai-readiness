#!/bin/bash

# Test Infrastructure Management Script
# Provides easy commands to manage the test infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
COMPOSE_FILE="docker-compose.test.yml"
PROJECT_NAME="ai-readiness-test"
ENV_FILE=".env.test"

# Helper functions
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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

# Check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        log_error "Docker Compose is not available."
        exit 1
    fi
}

# Get docker compose command (handle both docker-compose and docker compose)
get_compose_cmd() {
    if command -v docker-compose > /dev/null 2>&1; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

# Wait for service to be healthy
wait_for_service() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=1

    log_info "Waiting for $service to be healthy..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME ps $service | grep -q "healthy"; then
            log_success "$service is healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "$service failed to become healthy within $((max_attempts * 2)) seconds"
    return 1
}

# Start the test infrastructure
start() {
    log_info "Starting test infrastructure..."
    
    check_docker
    check_docker_compose
    
    COMPOSE_CMD=$(get_compose_cmd)
    
    # Create .env.test if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "$ENV_FILE not found. Please create it with proper environment variables."
        return 1
    fi
    
    # Start services
    $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME --env-file $ENV_FILE up -d
    
    # Wait for core services
    wait_for_service "supabase-db"
    wait_for_service "supabase-auth"
    wait_for_service "supabase-rest"
    
    log_success "Test infrastructure started successfully!"
    echo ""
    log_info "Services available at:"
    echo "  - Database: localhost:54322"
    echo "  - Auth API: http://localhost:9999"
    echo "  - REST API: http://localhost:3001"
    echo "  - Realtime: http://localhost:4000"
    echo "  - Storage: http://localhost:5000"
    echo "  - Studio: http://localhost:3010"
    echo "  - Kong Gateway: http://localhost:8000"
    echo "  - Email UI: http://localhost:9000"
}

# Stop the test infrastructure
stop() {
    log_info "Stopping test infrastructure..."
    
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME down
    
    log_success "Test infrastructure stopped"
}

# Restart the test infrastructure
restart() {
    stop
    sleep 2
    start
}

# Clean up everything (including volumes)
clean() {
    log_warning "This will remove all test data. Are you sure? (y/N)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up test infrastructure..."
        
        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME down -v --remove-orphans
        
        # Remove any dangling images
        docker image prune -f --filter label=com.docker.compose.project=$PROJECT_NAME
        
        log_success "Test infrastructure cleaned up"
    else
        log_info "Clean up cancelled"
    fi
}

# Show status of services
status() {
    log_info "Test infrastructure status:"
    
    COMPOSE_CMD=$(get_compose_cmd)
    $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME ps
}

# Show logs for services
logs() {
    local service=${1:-""}
    
    log_info "Showing logs for ${service:-all services}..."
    
    COMPOSE_CMD=$(get_compose_cmd)
    if [ -n "$service" ]; then
        $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME logs -f $service
    else
        $COMPOSE_CMD -f $COMPOSE_FILE -p $PROJECT_NAME logs -f
    fi
}

# Run health checks
health() {
    log_info "Running health checks..."
    
    local all_healthy=true
    
    # Check database
    if curl -f http://localhost:54322 > /dev/null 2>&1; then
        log_success "Database: Healthy"
    else
        log_error "Database: Unhealthy"
        all_healthy=false
    fi
    
    # Check auth service
    if curl -f http://localhost:9999/health > /dev/null 2>&1; then
        log_success "Auth API: Healthy"
    else
        log_error "Auth API: Unhealthy"
        all_healthy=false
    fi
    
    # Check REST API
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        log_success "REST API: Healthy"
    else
        log_error "REST API: Unhealthy"
        all_healthy=false
    fi
    
    # Check Realtime
    if curl -f http://localhost:4000 > /dev/null 2>&1; then
        log_success "Realtime: Healthy"
    else
        log_error "Realtime: Unhealthy"
        all_healthy=false
    fi
    
    # Check Storage
    if curl -f http://localhost:5000/status > /dev/null 2>&1; then
        log_success "Storage: Healthy"
    else
        log_error "Storage: Unhealthy"
        all_healthy=false
    fi
    
    if $all_healthy; then
        log_success "All services are healthy!"
        return 0
    else
        log_error "Some services are unhealthy"
        return 1
    fi
}

# Seed test data
seed() {
    log_info "Seeding test data..."
    
    # Wait for database to be ready
    wait_for_service "supabase-db"
    
    # Run migration and seed files
    if [ -d "supabase/migrations" ]; then
        log_info "Running migrations..."
        for migration in supabase/migrations/*.sql; do
            if [ -f "$migration" ]; then
                docker exec ai-readiness-test-db psql -U postgres -d postgres -f "/docker-entrypoint-initdb.d/migrations/$(basename "$migration")"
            fi
        done
    fi
    
    if [ -d "supabase/seeds" ]; then
        log_info "Running seeds..."
        for seed in supabase/seeds/*.sql; do
            if [ -f "$seed" ]; then
                docker exec ai-readiness-test-db psql -U postgres -d postgres -f "/docker-entrypoint-initdb.d/seeds/$(basename "$seed")"
            fi
        done
    fi
    
    log_success "Test data seeded successfully"
}

# Run tests against the infrastructure
test() {
    log_info "Running tests against infrastructure..."
    
    # Ensure infrastructure is running
    if ! health > /dev/null 2>&1; then
        log_info "Infrastructure not healthy, starting..."
        start
        sleep 5
    fi
    
    # Set test environment
    export $(cat $ENV_FILE | grep -v '^#' | xargs)
    
    # Run different test suites
    case ${1:-"all"} in
        "unit")
            npm run test:unit
            ;;
        "integration")
            npm run test:integration
            ;;
        "e2e")
            npm run test:e2e
            ;;
        "security")
            npm run test:security
            ;;
        "all")
            npm run test:ci
            ;;
        *)
            log_error "Unknown test suite: $1"
            echo "Available suites: unit, integration, e2e, security, all"
            exit 1
            ;;
    esac
}

# Show help
help() {
    echo "Test Infrastructure Management Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start     Start the test infrastructure"
    echo "  stop      Stop the test infrastructure"
    echo "  restart   Restart the test infrastructure"
    echo "  clean     Clean up all data and containers"
    echo "  status    Show status of all services"
    echo "  logs      Show logs (optionally for specific service)"
    echo "  health    Run health checks on all services"
    echo "  seed      Seed the database with test data"
    echo "  test      Run tests against the infrastructure"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start                    # Start all services"
    echo "  $0 logs supabase-db        # Show database logs"
    echo "  $0 test integration        # Run integration tests"
    echo "  $0 clean                   # Clean up everything"
}

# Main command handler
case ${1:-"help"} in
    "start")
        start
        ;;
    "stop")
        stop
        ;;
    "restart")
        restart
        ;;
    "clean")
        clean
        ;;
    "status")
        status
        ;;
    "logs")
        logs $2
        ;;
    "health")
        health
        ;;
    "seed")
        seed
        ;;
    "test")
        test $2
        ;;
    "help"|"--help"|"-h")
        help
        ;;
    *)
        log_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac