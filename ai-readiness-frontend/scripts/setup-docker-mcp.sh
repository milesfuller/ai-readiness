#!/bin/bash

# Docker MCP Setup Script for AI Readiness Frontend
# This script sets up Docker MCP integration with Supabase

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
DOCKER_DIR="$PROJECT_ROOT/docker/mcp-supabase"
CLAUDE_CONFIG="$PROJECT_ROOT/.claude/settings.local.json"

echo -e "${BLUE}🐳 Docker MCP Setup for AI Readiness Frontend${NC}"
echo "=================================================="

# Function to print status messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_status "All prerequisites are met"
}

# Create Docker network
create_network() {
    print_info "Creating Docker network for MCP Supabase..."
    
    if ! docker network ls | grep -q "supabase-mcp-network"; then
        docker network create supabase-mcp-network
        print_status "Created supabase-mcp-network"
    else
        print_warning "Network supabase-mcp-network already exists"
    fi
}

# Create data directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p "$DOCKER_DIR/data"
    mkdir -p "$DOCKER_DIR/logs"
    mkdir -p "$PROJECT_ROOT/.claude"
    
    print_status "Created data directories"
}

# Build Docker image
build_image() {
    print_info "Building MCP Supabase Docker image..."
    
    cd "$PROJECT_ROOT"
    docker build -f "$DOCKER_DIR/Dockerfile" -t mcp-supabase:latest .
    
    print_status "Built mcp-supabase:latest image"
}

# Install MCP dependencies
install_mcp_deps() {
    print_info "Installing MCP dependencies..."
    
    # Install Supabase MCP server globally
    npm install -g @supabase/mcp-server-supabase@latest
    
    # Install filesystem MCP server
    npm install -g @modelcontextprotocol/server-filesystem@latest
    
    # Install GitHub MCP server
    npm install -g @modelcontextprotocol/server-github@latest
    
    print_status "Installed MCP dependencies"
}

# Configure Claude Code
configure_claude() {
    print_info "Claude Code configuration is ready at $CLAUDE_CONFIG"
    
    if [ -f "$CLAUDE_CONFIG" ]; then
        print_status "Claude MCP configuration exists"
    else
        print_error "Claude MCP configuration file not found"
        exit 1
    fi
    
    # Validate JSON
    if node -e "JSON.parse(require('fs').readFileSync('$CLAUDE_CONFIG', 'utf8'))" 2>/dev/null; then
        print_status "Claude MCP configuration is valid JSON"
    else
        print_error "Claude MCP configuration has invalid JSON syntax"
        exit 1
    fi
}

# Start services
start_services() {
    print_info "Starting MCP Supabase services..."
    
    cd "$DOCKER_DIR"
    docker-compose up -d
    
    print_status "Started MCP Supabase container"
    
    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:54321/health >/dev/null 2>&1; then
            print_status "Supabase services are ready!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Services failed to start within timeout"
            exit 1
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
}

# Test MCP connection
test_mcp() {
    print_info "Testing MCP connections..."
    
    # Test local MCP server
    if npx @supabase/mcp-server-supabase@latest --help >/dev/null 2>&1; then
        print_status "Supabase MCP server is working"
    else
        print_warning "Supabase MCP server test failed"
    fi
    
    # Test filesystem MCP server
    if npx @modelcontextprotocol/server-filesystem@latest --help >/dev/null 2>&1; then
        print_status "Filesystem MCP server is working"
    else
        print_warning "Filesystem MCP server test failed"
    fi
}

# Display connection info
show_info() {
    echo ""
    echo -e "${GREEN}🎉 Docker MCP Setup Complete!${NC}"
    echo "==============================="
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "• Supabase Studio: http://localhost:3000"
    echo "• Supabase API: http://localhost:54321"
    echo "• PostgreSQL: localhost:5432"
    echo ""
    echo -e "${BLUE}MCP Configuration:${NC}"
    echo "• Configuration file: $CLAUDE_CONFIG"
    echo "• Docker container: mcp-supabase-container"
    echo "• Network: supabase-mcp-network"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Add your GitHub token to .claude/settings.local.json if using GitHub MCP"
    echo "2. Restart Claude Code to pick up the new MCP configuration"
    echo "3. Test MCP functionality with: claude mcp list"
    echo ""
    echo -e "${BLUE}Management Commands:${NC}"
    echo "• Start services: cd docker/mcp-supabase && docker-compose up -d"
    echo "• Stop services: cd docker/mcp-supabase && docker-compose down"
    echo "• View logs: docker logs mcp-supabase-container"
    echo "• Rebuild: docker-compose build --no-cache"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        print_error "Setup failed. Cleaning up..."
        cd "$DOCKER_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Main execution
main() {
    check_prerequisites
    create_network
    create_directories
    build_image
    install_mcp_deps
    configure_claude
    start_services
    test_mcp
    show_info
}

# Parse command line arguments
case "${1:-}" in
    --build-only)
        print_info "Building Docker image only..."
        check_prerequisites
        create_directories
        build_image
        print_status "Build complete"
        ;;
    --start-only)
        print_info "Starting services only..."
        check_prerequisites
        start_services
        show_info
        ;;
    --stop)
        print_info "Stopping services..."
        cd "$DOCKER_DIR" && docker-compose down
        print_status "Services stopped"
        ;;
    --help)
        echo "Docker MCP Setup Script"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --build-only    Build Docker image only"
        echo "  --start-only    Start services only"
        echo "  --stop          Stop all services"
        echo "  --help          Show this help message"
        echo ""
        echo "Run without arguments to perform full setup"
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac