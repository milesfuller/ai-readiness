#!/bin/bash

# ============================================================================
# Enhanced Mock Server Startup Script
# ============================================================================
# This script provides a robust way to start the enhanced mock server with
# proper configuration, health checks, and integration with the test suite.

set -euo pipefail

# Configuration
DEFAULT_PORT=54321
DEFAULT_HOST="localhost"
DEFAULT_ENV="test"
DEFAULT_LOG_LEVEL="info"

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

# Help function
show_help() {
    cat << EOF
Enhanced Mock Server Startup Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    start       Start the mock server (default)
    stop        Stop the mock server
    restart     Restart the mock server
    status      Check server status
    health      Run health check
    logs        Show server logs

Options:
    -p, --port PORT        Server port (default: $DEFAULT_PORT)
    -h, --host HOST        Server host (default: $DEFAULT_HOST)
    -e, --env ENV          Environment (default: $DEFAULT_ENV)
    -l, --log-level LEVEL  Log level (default: $DEFAULT_LOG_LEVEL)
    --no-seed             Skip database seeding
    --detach              Run in background (daemon mode)
    --pid-file FILE       PID file location
    --log-file FILE       Log file location
    --help                Show this help message

Examples:
    $0                                    # Start with defaults
    $0 start -p 8080                     # Start on port 8080
    $0 start --env development           # Start in development mode
    $0 start --detach --pid-file server.pid  # Start as daemon
    $0 stop --pid-file server.pid        # Stop daemon server
    $0 health                            # Check server health
    $0 logs --log-file server.log        # Show logs

Environment Variables:
    SUPABASE_PORT         Override default port
    MOCK_SERVER_HOST      Override default host
    NODE_ENV              Override default environment
    LOG_LEVEL             Override default log level
    JWT_SECRET            JWT secret for authentication
EOF
}

# Parse command line arguments
parse_args() {
    COMMAND="start"
    PORT="${SUPABASE_PORT:-$DEFAULT_PORT}"
    HOST="${MOCK_SERVER_HOST:-$DEFAULT_HOST}"
    ENVIRONMENT="${NODE_ENV:-$DEFAULT_ENV}"
    LOG_LEVEL="${LOG_LEVEL:-$DEFAULT_LOG_LEVEL}"
    SEED_DATA=true
    DETACH=false
    PID_FILE=""
    LOG_FILE=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            start|stop|restart|status|health|logs)
                COMMAND="$1"
                shift
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -h|--host)
                HOST="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -l|--log-level)
                LOG_LEVEL="$2"
                shift 2
                ;;
            --no-seed)
                SEED_DATA=false
                shift
                ;;
            --detach)
                DETACH=true
                shift
                ;;
            --pid-file)
                PID_FILE="$2"
                shift 2
                ;;
            --log-file)
                LOG_FILE="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Set default PID file if not specified
    if [[ -z "$PID_FILE" ]]; then
        PID_FILE="./mock-server-${PORT}.pid"
    fi

    # Set default log file if not specified
    if [[ -z "$LOG_FILE" ]]; then
        LOG_FILE="./mock-server-${PORT}.log"
    fi
}

# Check if port is available
check_port_available() {
    local port=$1
    if command -v lsof > /dev/null; then
        if lsof -Pi :$port -sTCP:LISTEN -t > /dev/null; then
            return 1
        fi
    elif command -v netstat > /dev/null; then
        if netstat -ln | grep ":$port " > /dev/null; then
            return 1
        fi
    else
        # Fallback: try to connect to port
        if timeout 1 bash -c "</dev/tcp/$HOST/$port" 2>/dev/null; then
            return 1
        fi
    fi
    return 0
}

# Get process PID from PID file
get_pid() {
    if [[ -f "$PID_FILE" ]]; then
        cat "$PID_FILE"
    else
        echo ""
    fi
}

# Check if process is running
is_running() {
    local pid=$(get_pid)
    if [[ -n "$pid" ]]; then
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # Stale PID file
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Wait for server to be ready
wait_for_server() {
    local retries=30
    local interval=1
    
    log_info "Waiting for server to be ready..."
    
    for ((i=1; i<=retries; i++)); do
        if curl -sf "http://$HOST:$PORT/health" > /dev/null 2>&1; then
            log_success "Server is ready!"
            return 0
        fi
        
        if [[ $i -lt $retries ]]; then
            sleep $interval
        fi
    done
    
    log_error "Server failed to become ready within ${retries}s"
    return 1
}

# Health check
health_check() {
    log_info "Running health check on http://$HOST:$PORT/health"
    
    if ! curl -sf "http://$HOST:$PORT/health" > /dev/null 2>&1; then
        log_error "Health check failed - server is not responding"
        return 1
    fi
    
    local response=$(curl -s "http://$HOST:$PORT/health")
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [[ "$status" == "healthy" ]]; then
        log_success "Health check passed - server is healthy"
        echo "Response: $response"
        return 0
    else
        log_error "Health check failed - server status: $status"
        return 1
    fi
}

# Start server
start_server() {
    if is_running; then
        log_warning "Server is already running (PID: $(get_pid))"
        return 0
    fi

    if ! check_port_available $PORT; then
        log_error "Port $PORT is already in use"
        return 1
    fi

    log_info "Starting enhanced mock server..."
    log_info "Configuration:"
    log_info "  Host: $HOST"
    log_info "  Port: $PORT"
    log_info "  Environment: $ENVIRONMENT"
    log_info "  Log Level: $LOG_LEVEL"
    log_info "  Seed Data: $SEED_DATA"
    log_info "  Detach: $DETACH"
    log_info "  PID File: $PID_FILE"
    log_info "  Log File: $LOG_FILE"

    # Check if mocks directory exists
    if [[ ! -d "./mocks" ]]; then
        log_error "Mocks directory not found. Please run from project root."
        return 1
    fi

    # Check if Node.js is available
    if ! command -v node > /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        return 1
    fi

    # Set environment variables
    export NODE_ENV="$ENVIRONMENT"
    export SUPABASE_PORT="$PORT"
    export MOCK_SERVER_HOST="$HOST"
    export LOG_LEVEL="$LOG_LEVEL"

    # Prepare start command
    local start_cmd="node mocks/scripts/start-mock-server.js"
    
    if [[ "$SEED_DATA" == "false" ]]; then
        start_cmd="$start_cmd --no-seed"
    fi

    # Start server
    if [[ "$DETACH" == "true" ]]; then
        log_info "Starting server in background..."
        nohup $start_cmd > "$LOG_FILE" 2>&1 & echo $! > "$PID_FILE"
        local pid=$(cat "$PID_FILE")
        log_success "Server started in background (PID: $pid)"
        
        # Wait for server to be ready
        if wait_for_server; then
            log_success "Enhanced mock server is running at http://$HOST:$PORT"
        else
            log_error "Failed to verify server startup"
            return 1
        fi
    else
        log_info "Starting server in foreground..."
        echo $$ > "$PID_FILE"
        
        # Setup signal handlers for graceful shutdown
        trap 'log_info "Shutting down server..."; rm -f "$PID_FILE"; exit 0' INT TERM
        
        # Start server
        exec $start_cmd
    fi
}

# Stop server
stop_server() {
    if ! is_running; then
        log_warning "Server is not running"
        return 0
    fi
    
    local pid=$(get_pid)
    log_info "Stopping server (PID: $pid)..."
    
    # Send SIGTERM
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait for graceful shutdown
    local retries=10
    for ((i=1; i<=retries; i++)); do
        if ! ps -p "$pid" > /dev/null 2>&1; then
            rm -f "$PID_FILE"
            log_success "Server stopped gracefully"
            return 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    log_warning "Forcing server shutdown..."
    kill -KILL "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    log_success "Server stopped forcefully"
}

# Restart server
restart_server() {
    log_info "Restarting server..."
    stop_server
    sleep 2
    start_server
}

# Show server status
show_status() {
    if is_running; then
        local pid=$(get_pid)
        log_success "Server is running (PID: $pid)"
        
        # Try to get server info
        if curl -sf "http://$HOST:$PORT/health" > /dev/null 2>&1; then
            local response=$(curl -s "http://$HOST:$PORT/health")
            echo "Server URL: http://$HOST:$PORT"
            echo "Health Status: $(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
            echo "Response: $response"
        else
            log_warning "Server is running but not responding to health checks"
        fi
    else
        log_info "Server is not running"
        return 1
    fi
}

# Show logs
show_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        log_info "Showing logs from $LOG_FILE"
        tail -n 50 "$LOG_FILE"
    else
        log_warning "Log file not found: $LOG_FILE"
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    case "$COMMAND" in
        start)
            start_server
            ;;
        stop)
            stop_server
            ;;
        restart)
            restart_server
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        logs)
            show_logs
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"