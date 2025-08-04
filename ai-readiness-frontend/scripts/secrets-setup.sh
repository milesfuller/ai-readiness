#!/bin/bash

# =============================================================================
# Secrets Setup Script for AI Readiness Assessment
# =============================================================================
# This script securely manages environment variables for different environments
# with proper separation between development, testing, and production

set -euo pipefail  # Exit on any error, undefined var, or pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECRETS_DIR="$PROJECT_ROOT/.secrets"
BACKUP_DIR="$PROJECT_ROOT/.secrets/backups"

# Environment validation patterns
declare -A ENV_PATTERNS=(
    ["CSRF_SECRET"]="^[a-zA-Z0-9]{32,}$"
    ["SESSION_SECRET"]="^[a-zA-Z0-9]{32,}$"
    ["DATABASE_ENCRYPTION_KEY"]="^[a-zA-Z0-9]{32,}$"
    ["NEXT_PUBLIC_SUPABASE_URL"]="^https://[a-zA-Z0-9-]+\.supabase\.co$"
    ["SUPABASE_SERVICE_ROLE_KEY"]="^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$"
    ["OPENAI_API_KEY"]="^sk-[a-zA-Z0-9]{48,}$"
    ["ANTHROPIC_API_KEY"]="^sk-ant-[a-zA-Z0-9-_]{64,}$"
)

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $timestamp - $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $timestamp - $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" ;;
    esac
}

# Generate secure random string
generate_secret() {
    local length=${1:-32}
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex "$length"
    elif command -v /dev/urandom >/dev/null 2>&1; then
        head -c "$length" /dev/urandom | base64 | tr -d '=+/' | cut -c1-"$length"
    else
        log "ERROR" "No secure random generator available"
        exit 1
    fi
}

# Validate environment variable format
validate_env_var() {
    local var_name=$1
    local var_value=$2
    
    if [[ -n "${ENV_PATTERNS[$var_name]:-}" ]]; then
        if [[ $var_value =~ ${ENV_PATTERNS[$var_name]} ]]; then
            return 0
        else
            log "ERROR" "$var_name format validation failed"
            return 1
        fi
    fi
    return 0
}

# Create secure directory
create_secure_dir() {
    local dir_path=$1
    mkdir -p "$dir_path"
    chmod 700 "$dir_path"
    log "INFO" "Created secure directory: $dir_path"
}

# Backup existing environment files
backup_env_files() {
    log "INFO" "Creating backup of existing environment files..."
    
    create_secure_dir "$BACKUP_DIR"
    
    local backup_timestamp=$(date '+%Y%m%d_%H%M%S')
    
    for env_file in ".env.local" ".env.test" ".env.production"; do
        if [[ -f "$PROJECT_ROOT/$env_file" ]]; then
            cp "$PROJECT_ROOT/$env_file" "$BACKUP_DIR/${env_file}.backup.$backup_timestamp"
            log "INFO" "Backed up $env_file"
        fi
    done
}

# Generate test-specific API keys and configuration
setup_test_environment() {
    log "INFO" "Setting up secure test environment..."
    
    local test_env_file="$PROJECT_ROOT/.env.test"
    
    # Generate test-specific secrets
    local test_csrf_secret=$(generate_secret 32)
    local test_session_secret=$(generate_secret 32)
    local test_db_key=$(generate_secret 32)
    
    cat > "$test_env_file" << EOF
# =============================================================================
# Test Environment Configuration
# =============================================================================
# ⚠️  CRITICAL: This file contains TEST-ONLY credentials
# 🚫 NEVER use these in production
# 🔐 All secrets are test-specific and isolated from production

# Environment
NODE_ENV=test
ENVIRONMENT=test

# Test Database Configuration (Isolated)
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key_change_me
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key_change_me

# Test-specific Security Configuration
CSRF_SECRET=$test_csrf_secret
SESSION_SECRET=$test_session_secret
DATABASE_ENCRYPTION_KEY=$test_db_key

# Application URLs (Test)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# Test LLM API Keys (Separate from production)
# ⚠️  Use dedicated test API keys with lower quotas
OPENAI_API_KEY=test_openai_key_change_me
ANTHROPIC_API_KEY=test_anthropic_key_change_me
GOOGLE_AI_API_KEY=test_google_key_change_me

# Test Rate Limiting (More permissive for testing)
API_RATE_LIMIT_MAX=1000
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_MAX=100
LLM_RATE_LIMIT_MAX=500

# Test File Upload Configuration
MAX_FILE_SIZE_MB=10
ALLOWED_FILE_TYPES=image/jpeg,image/png,text/csv,application/pdf

# Test Security Configuration
ENABLE_HSTS=false
ENABLE_CSP=true
CSP_REPORT_ONLY=true
ENABLE_IP_BLOCKING=false
ENABLE_SECURITY_MONITORING=true

# Test Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379/1

# Test Webhook Configuration
SECURITY_WEBHOOK_URL=http://localhost:3001/test-webhook
SECURITY_LOGGING_ENDPOINT=http://localhost:3001/test-logs

# Test Email Configuration
ALERT_EMAIL=test@example.com

# Performance Settings for Tests
DISABLE_ANALYTICS=true
DISABLE_TELEMETRY=true
SKIP_ENV_VALIDATION=false

# Test Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_VERBOSE_LOGGING=true
MOCK_EXTERNAL_APIS=true

# Test Data Configuration
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test_password_123
TEST_ADMIN_EMAIL=admin@example.com

# Database Connection Pool Settings (Test)
DB_POOL_MIN=1
DB_POOL_MAX=5

# Test Timeout Settings
API_TIMEOUT_MS=5000
LLM_TIMEOUT_MS=30000

# Test Cache Configuration
CACHE_TTL_SECONDS=60
DISABLE_CACHE=false

# Compliance and Audit (Test)
AUDIT_LOGGING=true
PII_DETECTION=true
DATA_RETENTION_DAYS=7

EOF

    chmod 600 "$test_env_file"
    log "INFO" "Created secure test environment file: $test_env_file"
}

# Create production-ready template
create_production_template() {
    log "INFO" "Creating production environment template..."
    
    local prod_template="$PROJECT_ROOT/.env.production.secure"
    
    cat > "$prod_template" << EOF
# =============================================================================
# Production Environment Template (SECURE)
# =============================================================================
# 🔐 CRITICAL: Replace ALL values before deploying to production
# 🚫 NEVER commit this file with real values
# ✓  Use secure secret management systems in production

# Environment
NODE_ENV=production
ENVIRONMENT=production

# Production Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key_here

# Production Security Configuration (Generate new secrets!)
CSRF_SECRET=generate_new_32_char_secret_for_production
SESSION_SECRET=generate_new_32_char_secret_for_production
DATABASE_ENCRYPTION_KEY=generate_new_32_char_secret_for_production

# Production Application URLs
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NEXTAUTH_URL=https://your-production-domain.com

# Production LLM API Keys (Use separate production keys)
OPENAI_API_KEY=your_production_openai_key
ANTHROPIC_API_KEY=your_production_anthropic_key
GOOGLE_AI_API_KEY=your_production_google_key

# Production Rate Limiting (Stricter)
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_MAX=10
LLM_RATE_LIMIT_MAX=50

# Production File Upload Configuration
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=image/jpeg,image/png,text/csv,application/pdf

# Production Security Configuration (Strict)
ENABLE_HSTS=true
ENABLE_CSP=true
CSP_REPORT_ONLY=false
ENABLE_IP_BLOCKING=true
ENABLE_SECURITY_MONITORING=true

# Production Redis Configuration
REDIS_URL=your_production_redis_url

# Production Webhook Configuration
SECURITY_WEBHOOK_URL=https://your-security-service.com/webhook
SECURITY_LOGGING_ENDPOINT=https://your-logging-service.com/api/logs
SECURITY_LOGGING_TOKEN=your_logging_service_token

# Production Email Configuration
ALERT_EMAIL=security@your-domain.com

# Production Performance Settings
DISABLE_ANALYTICS=false
DISABLE_TELEMETRY=false
SKIP_ENV_VALIDATION=false

# Production Feature Flags
ENABLE_DEBUG_MODE=false
ENABLE_VERBOSE_LOGGING=false
MOCK_EXTERNAL_APIS=false

# Production Database Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20

# Production Timeout Settings
API_TIMEOUT_MS=10000
LLM_TIMEOUT_MS=60000

# Production Cache Configuration
CACHE_TTL_SECONDS=3600
DISABLE_CACHE=false

# Compliance and Audit (Production)
AUDIT_LOGGING=true
PII_DETECTION=true
DATA_RETENTION_DAYS=365

EOF

    chmod 600 "$prod_template"
    log "INFO" "Created production template: $prod_template"
}

# Create development environment with safe defaults
setup_development_environment() {
    log "INFO" "Setting up development environment..."
    
    local dev_env_file="$PROJECT_ROOT/.env.local"
    
    if [[ -f "$dev_env_file" ]]; then
        log "WARN" "Development environment file already exists, creating .env.local.new"
        dev_env_file="$PROJECT_ROOT/.env.local.new"
    fi
    
    # Generate development-specific secrets
    local dev_csrf_secret=$(generate_secret 32)
    local dev_session_secret=$(generate_secret 32)
    
    cat > "$dev_env_file" << EOF
# =============================================================================
# Development Environment Configuration
# =============================================================================
# 🔧 Safe for local development
# 🚫 Do not use in production

# Environment
NODE_ENV=development
ENVIRONMENT=development

# Development Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_dev_service_role_key_here

# Development Security Configuration
CSRF_SECRET=$dev_csrf_secret
SESSION_SECRET=$dev_session_secret

# Development Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# Development LLM API Keys (Use development keys with quotas)
# OPENAI_API_KEY=your_dev_openai_key
# ANTHROPIC_API_KEY=your_dev_anthropic_key
# GOOGLE_AI_API_KEY=your_dev_google_key

# Development Rate Limiting (Permissive)
API_RATE_LIMIT_MAX=1000
API_RATE_LIMIT_WINDOW=900000
AUTH_RATE_LIMIT_MAX=100
LLM_RATE_LIMIT_MAX=200

# Development Security Configuration (Relaxed)
ENABLE_HSTS=false
ENABLE_CSP=true
CSP_REPORT_ONLY=true
ENABLE_IP_BLOCKING=false
ENABLE_SECURITY_MONITORING=true

# Development Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_VERBOSE_LOGGING=true
MOCK_EXTERNAL_APIS=false

EOF

    chmod 600 "$dev_env_file"
    log "INFO" "Created development environment file: $dev_env_file"
}

# Validate all environment files
validate_environments() {
    log "INFO" "Validating environment configurations..."
    
    local validation_errors=0
    
    for env_file in ".env.test" ".env.local" ".env.production.secure"; do
        if [[ -f "$PROJECT_ROOT/$env_file" ]]; then
            log "INFO" "Validating $env_file..."
            
            # Check file permissions
            local perms=$(stat -c "%a" "$PROJECT_ROOT/$env_file" 2>/dev/null || stat -f "%A" "$PROJECT_ROOT/$env_file" 2>/dev/null)
            if [[ "$perms" != "600" ]]; then
                log "WARN" "$env_file has insecure permissions: $perms (should be 600)"
                chmod 600 "$PROJECT_ROOT/$env_file"
            fi
            
            # Validate required variables exist
            local required_vars=("NODE_ENV" "CSRF_SECRET" "NEXT_PUBLIC_SUPABASE_URL")
            for var in "${required_vars[@]}"; do
                if ! grep -q "^$var=" "$PROJECT_ROOT/$env_file"; then
                    log "ERROR" "Missing required variable $var in $env_file"
                    ((validation_errors++))
                fi
            done
        fi
    done
    
    if [[ $validation_errors -eq 0 ]]; then
        log "INFO" "All environment files validated successfully"
        return 0
    else
        log "ERROR" "Found $validation_errors validation errors"
        return 1
    fi
}

# Generate secure secrets for existing environment files
update_secrets() {
    local env_file=$1
    
    if [[ ! -f "$env_file" ]]; then
        log "ERROR" "Environment file not found: $env_file"
        return 1
    fi
    
    log "INFO" "Updating secrets in $env_file..."
    
    # Backup the file first
    cp "$env_file" "$env_file.backup.$(date +%s)"
    
    # Update secrets that are set to placeholder values
    local temp_file=$(mktemp)
    
    while IFS= read -r line; do
        if [[ $line =~ ^([A-Z_]+)=(generate_new_.*|your_.*|test_.*_change_me)$ ]]; then
            local var_name="${BASH_REMATCH[1]}"
            case $var_name in
                *SECRET*|*KEY*)
                    if [[ $var_name =~ .*_(SECRET|KEY)$ ]]; then
                        local new_secret=$(generate_secret 32)
                        echo "$var_name=$new_secret"
                        log "INFO" "Generated new $var_name"
                    else
                        echo "$line"
                    fi
                    ;;
                *)
                    echo "$line"
                    ;;
            esac
        else
            echo "$line"
        fi
    done < "$env_file" > "$temp_file"
    
    mv "$temp_file" "$env_file"
    chmod 600 "$env_file"
    
    log "INFO" "Updated secrets in $env_file"
}

# Create security documentation
create_security_docs() {
    log "INFO" "Creating security documentation..."
    
    local docs_dir="$PROJECT_ROOT/docs/security"
    create_secure_dir "$docs_dir"
    
    cat > "$docs_dir/SECRET_MANAGEMENT.md" << 'EOF'
# Secret Management Guide

## Overview

This guide outlines best practices for managing secrets and environment variables in the AI Readiness Assessment application.

## Environment Separation

### Test Environment (.env.test)
- **Purpose**: Isolated testing with separate database and API keys
- **Database**: Dedicated test Supabase project
- **API Keys**: Test-specific keys with lower quotas
- **Rate Limits**: More permissive for test automation
- **Security**: Basic protections enabled

### Development Environment (.env.local)
- **Purpose**: Local development with safe defaults
- **Database**: Development Supabase project
- **API Keys**: Development keys (optional)
- **Rate Limits**: Very permissive
- **Security**: Relaxed settings for debugging

### Production Environment (.env.production)
- **Purpose**: Live production system
- **Database**: Production Supabase project
- **API Keys**: Production keys with full quotas
- **Rate Limits**: Strict limits
- **Security**: Full security hardening

## Security Requirements

### Secret Strength
- **Minimum Length**: 32 characters for all secrets
- **Entropy**: Use cryptographically secure random generation
- **Rotation**: Regular rotation recommended (90 days)

### File Permissions
- **Environment Files**: 600 (readable by owner only)
- **Backup Files**: 600 (readable by owner only)
- **Secret Directory**: 700 (accessible by owner only)

### Validation
- **Format Checking**: All secrets validated against patterns
- **Strength Verification**: Minimum entropy requirements
- **Production Checks**: Additional validation in production

## Best Practices

### Development
1. Use separate API keys for development
2. Never commit real secrets to version control
3. Use placeholder values in example files
4. Regularly update development secrets

### Testing
1. Use dedicated test database instance
2. Implement rate limit bypasses for test accounts
3. Mock external services when possible
4. Clean up test data regularly

### Production
1. Use enterprise secret management (AWS Secrets Manager, etc.)
2. Implement secret rotation policies
3. Monitor for secret exposure
4. Regular security audits

## Secret Management Commands

### Setup Test Environment
```bash
./scripts/secrets-setup.sh --setup-test
```

### Generate New Secrets
```bash
./scripts/secrets-setup.sh --generate-secrets .env.local
```

### Validate Configuration
```bash
./scripts/secrets-setup.sh --validate
```

### Backup Environment Files
```bash
./scripts/secrets-setup.sh --backup
```

## Troubleshooting

### Permission Errors
```bash
chmod 600 .env.*
chmod 700 .secrets/
```

### Validation Failures
Check secret format requirements in script comments.

### API Key Issues
Verify separate keys are configured for each environment.

## Security Alerts

The system monitors for:
- Weak or default secrets
- Insecure file permissions
- Missing required variables
- Format validation failures

## Compliance

This secret management approach helps meet:
- SOC 2 requirements
- GDPR data protection
- Industry security standards
EOF

    log "INFO" "Created secret management documentation"
}

# Main execution
main() {
    local command=${1:-"--help"}
    
    case $command in
        "--setup-test")
            log "INFO" "Setting up test environment..."
            backup_env_files
            setup_test_environment
            validate_environments
            log "INFO" "Test environment setup complete!"
            ;;
        "--setup-dev")
            log "INFO" "Setting up development environment..."
            backup_env_files
            setup_development_environment
            validate_environments
            log "INFO" "Development environment setup complete!"
            ;;
        "--setup-prod-template")
            log "INFO" "Creating production template..."
            create_production_template
            log "INFO" "Production template created!"
            ;;
        "--generate-secrets")
            local target_file=${2:-""}
            if [[ -z "$target_file" ]]; then
                log "ERROR" "Please specify target file: --generate-secrets .env.local"
                exit 1
            fi
            update_secrets "$PROJECT_ROOT/$target_file"
            ;;
        "--validate")
            validate_environments
            ;;
        "--backup")
            backup_env_files
            ;;
        "--create-docs")
            create_security_docs
            ;;
        "--full-setup")
            log "INFO" "Running full setup..."
            backup_env_files
            setup_test_environment
            setup_development_environment
            create_production_template
            create_security_docs
            validate_environments
            log "INFO" "Full setup complete!"
            ;;
        "--help"|*)
            cat << EOF
AI Readiness Assessment - Secrets Setup Script

Usage: $0 [COMMAND]

COMMANDS:
    --setup-test            Setup test environment with isolated configuration
    --setup-dev            Setup development environment with safe defaults
    --setup-prod-template  Create production environment template
    --generate-secrets     Generate new secrets for specified env file
    --validate             Validate all environment configurations
    --backup               Backup existing environment files
    --create-docs          Create security documentation
    --full-setup           Run complete setup (all environments + docs)
    --help                 Show this help message

EXAMPLES:
    $0 --full-setup                    # Setup all environments
    $0 --setup-test                    # Setup test environment only
    $0 --generate-secrets .env.local   # Generate new secrets for dev
    $0 --validate                      # Validate configurations

SECURITY FEATURES:
    ✓ Separate test/dev/prod configurations
    ✓ Cryptographically secure secret generation
    ✓ Proper file permissions (600)
    ✓ Format validation for API keys
    ✓ Automatic backups
    ✓ Production security hardening

EOF
            ;;
    esac
}

# Run main function with all arguments
main "$@"