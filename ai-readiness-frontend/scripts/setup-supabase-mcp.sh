#!/bin/bash

# Supabase MCP Integration Setup Script
# Sets up local Supabase instance with MCP integration for AI Readiness

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SUPABASE_DIR="$PROJECT_ROOT/supabase"
DOCKER_MCP_DIR="$PROJECT_ROOT/docker/mcp-supabase"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        error "Please run this script from the project root directory"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    log "Loading environment configuration..."
    
    # Copy environment file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
        if [ -f "$PROJECT_ROOT/.env.supabase.local" ]; then
            cp "$PROJECT_ROOT/.env.supabase.local" "$PROJECT_ROOT/.env.local"
            success "Environment file copied to .env.local"
        else
            warning "No environment file found, using defaults"
        fi
    fi
    
    # Load environment variables
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        set -a
        source "$PROJECT_ROOT/.env.local"
        set +a
        success "Environment variables loaded"
    fi
}

# Stop existing containers
stop_existing_containers() {
    log "Stopping existing containers..."
    
    # Stop MCP Supabase container
    if docker ps -q -f name=mcp-supabase-container | grep -q .; then
        docker stop mcp-supabase-container || true
        docker rm mcp-supabase-container || true
    fi
    
    # Stop any Supabase containers
    if [ -f "$SUPABASE_DIR/docker-compose.test.yml" ]; then
        cd "$SUPABASE_DIR"
        docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
        cd "$PROJECT_ROOT"
    fi
    
    success "Existing containers stopped"
}

# Start Supabase MCP instance
start_supabase_mcp() {
    log "Starting Supabase MCP instance..."
    
    # Create necessary directories
    mkdir -p "$DOCKER_MCP_DIR/data"
    mkdir -p "$DOCKER_MCP_DIR/logs"
    
    # Start MCP Supabase container
    cd "$DOCKER_MCP_DIR"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        success "MCP Supabase container started"
    else
        error "MCP Docker Compose file not found at $DOCKER_MCP_DIR/docker-compose.yml"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for Supabase API
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:54321/health" > /dev/null 2>&1; then
            success "Supabase API is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "Supabase API failed to start within timeout"
            exit 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    # Wait for PostgreSQL
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h localhost -p 54322 -U postgres > /dev/null 2>&1; then
            success "PostgreSQL is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "PostgreSQL failed to start within timeout"
            exit 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Check if migration file exists
    if [ ! -f "$SUPABASE_DIR/migrations/00001_initial_schema.sql" ]; then
        error "Migration file not found: $SUPABASE_DIR/migrations/00001_initial_schema.sql"
        exit 1
    fi
    
    # Run migration using docker exec
    docker exec mcp-supabase-container psql \
        -h localhost \
        -p 5432 \
        -U postgres \
        -d postgres \
        -f /app/supabase-host/migrations/00001_initial_schema.sql
    
    if [ $? -eq 0 ]; then
        success "Database migrations completed"
    else
        error "Database migrations failed"
        exit 1
    fi
}

# Verify installation
verify_installation() {
    log "Verifying installation..."
    
    # Check Supabase API health
    local api_health=$(curl -s "http://localhost:54321/health" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$api_health" = "ok" ]; then
        success "Supabase API health check passed"
    else
        warning "Supabase API health check failed or returned: $api_health"
    fi
    
    # Check database connectivity
    if psql -h localhost -p 54322 -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database connectivity verified"
    else
        error "Database connectivity failed"
        exit 1
    fi
    
    # Check if tables exist
    local table_count=$(psql -h localhost -p 54322 -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    if [ "$table_count" -gt 0 ]; then
        success "Database schema verified ($table_count tables found)"
    else
        error "No tables found in database schema"
        exit 1
    fi
}

# Run tests
run_tests() {
    log "Running MCP integration tests..."
    
    if [ -f "$SCRIPT_DIR/test-supabase-mcp.js" ]; then
        cd "$PROJECT_ROOT"
        
        # Install test dependencies if needed
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        
        # Run the test script
        node "$SCRIPT_DIR/test-supabase-mcp.js"
        
        if [ $? -eq 0 ]; then
            success "MCP integration tests passed"
        else
            warning "Some MCP integration tests failed (check logs for details)"
        fi
    else
        warning "Test script not found, skipping tests"
    fi
}

# Display connection information
show_connection_info() {
    log "Supabase MCP Integration Setup Complete!"
    echo ""
    echo -e "${GREEN}📊 Connection Information:${NC}"
    echo -e "  Supabase URL:      http://localhost:54321"
    echo -e "  Supabase Studio:   http://localhost:54323"
    echo -e "  PostgreSQL:        localhost:54322"
    echo -e "  MCP Endpoint:      http://localhost:8000"
    echo ""
    echo -e "${GREEN}🔐 Default Credentials:${NC}"
    echo -e "  Database User:     postgres"
    echo -e "  Database Password: postgres"
    echo -e "  JWT Secret:        super-secret-jwt-token-with-at-least-32-characters-long"
    echo ""
    echo -e "${GREEN}🧪 Test Commands:${NC}"
    echo -e "  Run tests:         npm run test:supabase"
    echo -e "  Test MCP:          node scripts/test-supabase-mcp.js"
    echo -e "  Check status:      docker logs mcp-supabase-container"
    echo ""
    echo -e "${GREEN}📁 Configuration Files:${NC}"
    echo -e "  Supabase Config:   supabase/config.toml"
    echo -e "  Environment:       .env.supabase.local"
    echo -e "  Database Schema:   supabase/migrations/00001_initial_schema.sql"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Supabase MCP Integration Setup${NC}"
    echo "=================================="
    
    check_prerequisites
    load_environment
    stop_existing_containers
    start_supabase_mcp
    wait_for_services
    run_migrations
    verify_installation
    run_tests
    show_connection_info
    
    success "Setup completed successfully!"
}

# Command line options
case "${1:-setup}" in
    "setup")
        main
        ;;
    "stop")
        log "Stopping Supabase MCP services..."
        stop_existing_containers
        success "Services stopped"
        ;;
    "restart")
        log "Restarting Supabase MCP services..."
        stop_existing_containers
        sleep 2
        start_supabase_mcp
        wait_for_services
        success "Services restarted"
        ;;
    "test")
        log "Running MCP integration tests..."
        run_tests
        ;;
    "status")
        log "Checking service status..."
        docker ps -f name=mcp-supabase-container
        ;;
    "logs")
        log "Showing container logs..."
        docker logs mcp-supabase-container --tail=50 -f
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  setup     - Setup Supabase MCP integration (default)"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services" 
        echo "  test      - Run integration tests"
        echo "  status    - Show service status" 
        echo "  logs      - Show container logs"
        echo "  help      - Show this help message"
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac