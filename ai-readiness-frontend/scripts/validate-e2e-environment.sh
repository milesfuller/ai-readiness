#!/bin/bash

# =============================================================================
# E2E Environment Validation Script
# Validates that all services are running and accessible
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

echo -e "${BLUE}🔍 E2E Environment Validation${NC}"
echo "=================================================================================="

# Function: Print status message
print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Function: Print success message
print_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

# Function: Print warning message
print_warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1"
}

# Function: Print error message
print_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function: Run check
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-true}"
    
    ((TOTAL_CHECKS++))
    print_status "$check_name"
    
    if eval "$check_command" >/dev/null 2>&1; then
        print_success "$check_name"
        ((PASSED_CHECKS++))
        return 0
    else
        if [[ "$is_critical" == "true" ]]; then
            print_error "$check_name"
            ((FAILED_CHECKS++))
        else
            print_warning "$check_name"
            ((WARNING_CHECKS++))
        fi
        return 1
    fi
}

# Function: Check environment variables
check_environment() {
    echo -e "\n${BLUE}📋 Environment Configuration${NC}"
    echo "=================================================================================="
    
    run_check "Environment file exists" "[[ -f '$ENV_FILE' ]]"
    
    if [[ -f "$ENV_FILE" ]]; then
        # Load environment variables
        set -a
        # shellcheck source=/dev/null
        source "$ENV_FILE"
        set +a
        
        # Check critical variables
        run_check "NODE_ENV is set to 'test'" "[[ '$NODE_ENV' == 'test' ]]"
        run_check "PLAYWRIGHT_BASE_URL is set" "[[ -n '${PLAYWRIGHT_BASE_URL:-}' ]]"
        run_check "NEXT_PUBLIC_SUPABASE_URL is set" "[[ -n '${NEXT_PUBLIC_SUPABASE_URL:-}' ]]"
        run_check "NEXT_PUBLIC_SUPABASE_ANON_KEY is set" "[[ -n '${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}' ]]"
        run_check "DATABASE_URL is set" "[[ -n '${DATABASE_URL:-}' ]]"
        
        # Check optional but important variables
        run_check "REDIS_URL is configured" "[[ -n '${REDIS_URL:-}' ]]" false
        run_check "Rate limiting is disabled for tests" "[[ '${ENABLE_RATE_LIMITING:-}' != 'true' ]]" false
    fi
}

# Function: Check Docker services
check_docker_services() {
    echo -e "\n${BLUE}🐳 Docker Services${NC}"
    echo "=================================================================================="
    
    run_check "Docker is running" "docker info"
    run_check "Docker Compose is available" "docker-compose --version"
    
    # Check individual services
    run_check "PostgreSQL container is running" "docker-compose -f docker-compose.e2e.yml ps supabase-db | grep -q 'Up'"
    run_check "Kong API Gateway is running" "docker-compose -f docker-compose.e2e.yml ps supabase-kong | grep -q 'Up'"
    run_check "PostgREST is running" "docker-compose -f docker-compose.e2e.yml ps supabase-rest | grep -q 'Up'"
    run_check "Redis is running" "docker-compose -f docker-compose.e2e.yml ps redis | grep -q 'Up'"
    run_check "Mock Server is running" "docker-compose -f docker-compose.e2e.yml ps mock-server | grep -q 'Up'"
}

# Function: Check service connectivity
check_service_connectivity() {
    echo -e "\n${BLUE}🌐 Service Connectivity${NC}"
    echo "=================================================================================="
    
    # Database connectivity
    run_check "PostgreSQL is accessible" "nc -z localhost 54322"
    run_check "Supabase API is accessible" "curl -f -s http://localhost:54321/health"
    run_check "PostgREST is accessible" "curl -f -s http://localhost:54324/"
    run_check "Redis is accessible" "redis-cli -p 6379 ping"
    run_check "Mock Server is accessible" "curl -f -s http://localhost:3001/mockserver/status"
    
    # Application connectivity
    run_check "Next.js app is accessible" "curl -f -s http://localhost:3000" false
}

# Function: Check database health
check_database_health() {
    echo -e "\n${BLUE}🗄️  Database Health${NC}"
    echo "=================================================================================="
    
    # Test database connection
    run_check "Database connection works" "PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c 'SELECT 1;'"
    
    # Check for required tables/schemas
    run_check "Public schema exists" "PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c 'SELECT schema_name FROM information_schema.schemata WHERE schema_name = '\"'public'\"';' | grep -q public"
    
    # Check auth schema (Supabase)
    run_check "Auth schema exists" "PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c 'SELECT schema_name FROM information_schema.schemata WHERE schema_name = '\"'auth'\"';' | grep -q auth" false
}

# Function: Check API endpoints
check_api_endpoints() {
    echo -e "\n${BLUE}🔌 API Endpoints${NC}"
    echo "=================================================================================="
    
    # Test API endpoints
    run_check "Health check endpoint" "curl -f -s http://localhost:3000/api/check-env"
    run_check "Supabase diagnostics endpoint" "curl -f -s http://localhost:3000/api/supabase-diagnostics"
    
    # Test mock endpoints
    run_check "Mock webhook endpoint" "curl -f -s -X POST http://localhost:3001/test-webhook" false
    run_check "Mock logging endpoint" "curl -f -s -X POST http://localhost:3001/test-logs" false
}

# Function: Check Playwright configuration
check_playwright_config() {
    echo -e "\n${BLUE}🎭 Playwright Configuration${NC}"
    echo "=================================================================================="
    
    run_check "Playwright config exists" "[[ -f '$PROJECT_ROOT/playwright.config.ts' ]]"
    run_check "E2E test directory exists" "[[ -d '$PROJECT_ROOT/e2e' ]]"
    run_check "Playwright is installed" "npx playwright --version"
    
    # Check if browsers are installed
    run_check "Playwright browsers are installed" "npx playwright install-deps" false
}

# Function: Check file permissions
check_permissions() {
    echo -e "\n${BLUE}🔐 File Permissions${NC}"
    echo "=================================================================================="
    
    run_check "Environment file is readable" "[[ -r '$ENV_FILE' ]]"
    run_check "Environment file has secure permissions" "[[ \$(stat -c '%a' '$ENV_FILE') == '600' ]]" false
    run_check "Script files are executable" "[[ -x '$SCRIPT_DIR/setup-e2e-environment.sh' ]]"
}

# Function: Generate validation report
generate_report() {
    echo -e "\n${BLUE}📊 Validation Summary${NC}"
    echo "=================================================================================="
    
    local status="READY"
    if [[ $FAILED_CHECKS -gt 0 ]]; then
        status="FAILED"
    elif [[ $WARNING_CHECKS -gt 0 ]]; then
        status="WARNING"
    fi
    
    cat << EOF

Total Checks:     $TOTAL_CHECKS
✅ Passed:        $PASSED_CHECKS
❌ Failed:        $FAILED_CHECKS
⚠️  Warnings:      $WARNING_CHECKS

Overall Status:   $status

EOF

    if [[ "$status" == "READY" ]]; then
        print_success "Environment is ready for E2E testing! 🎉"
        echo -e "\nRun tests with: ${GREEN}npm run test:e2e${NC}"
    elif [[ "$status" == "WARNING" ]]; then
        print_warning "Environment has warnings but may still work"
        echo -e "\nSome non-critical checks failed. Tests may still pass."
        echo -e "Run tests with: ${YELLOW}npm run test:e2e${NC}"
    else
        print_error "Environment has critical issues"
        echo -e "\nPlease fix the failed checks before running tests."
        echo -e "Run setup again: ${RED}./scripts/setup-e2e-environment.sh${NC}"
        exit 1
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    check_environment
    check_docker_services
    check_service_connectivity
    check_database_health
    check_api_endpoints
    check_playwright_config
    check_permissions
    generate_report
}

# Run main function
main "$@"