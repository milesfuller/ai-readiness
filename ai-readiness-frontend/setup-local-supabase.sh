#!/bin/bash

# Setup Local Supabase Testing Environment
# This script generates proper JWT tokens and sets up Supabase for local testing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Setting up local Supabase testing environment...${NC}"

# Add Supabase CLI to PATH
export PATH=$PATH:/home/node/.supabase/bin

# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}Generated JWT Secret${NC}"

# Generate proper JWT tokens using the secret
generate_jwt() {
    local payload=$1
    local secret=$2
    
    # Create header
    local header='{"alg":"HS256","typ":"JWT"}'
    
    # Base64 encode
    local header_base64=$(echo -n "$header" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    local payload_base64=$(echo -n "$payload" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    # Create signature
    local message="${header_base64}.${payload_base64}"
    local signature=$(echo -n "$message" | openssl dgst -sha256 -hmac "$secret" -binary | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    echo "${message}.${signature}"
}

# Generate anon key (public key)
ANON_PAYLOAD='{"iss":"supabase-demo","role":"anon","exp":1983812996}'
ANON_KEY=$(generate_jwt "$ANON_PAYLOAD" "$JWT_SECRET")

# Generate service role key (admin key)
SERVICE_PAYLOAD='{"iss":"supabase-demo","role":"service_role","exp":1983812996}'
SERVICE_ROLE_KEY=$(generate_jwt "$SERVICE_PAYLOAD" "$JWT_SECRET")

echo -e "${GREEN}Generated JWT tokens${NC}"

# Create .env.local with proper Supabase configuration
cat > .env.local << EOF
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRY=3600

# Database Configuration
POSTGRES_PASSWORD=test_postgres_password
POSTGRES_DB=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=54322

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Test User Accounts
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=TestPassword123!
TEST_ADMIN_EMAIL=testadmin@example.com
TEST_ADMIN_PASSWORD=AdminPassword123!

# Other configurations from .env.test
NODE_ENV=test
ENVIRONMENT=test
API_RATE_LIMIT_MAX=1000
API_RATE_LIMIT_WINDOW=900000
ENABLE_DEBUG_MODE=true
ENABLE_VERBOSE_LOGGING=true
EOF

echo -e "${GREEN}Created .env.local with proper configuration${NC}"

# Update kong.yml with the generated keys
if [ -f "supabase/config/kong.yml" ]; then
    # Backup original
    cp supabase/config/kong.yml supabase/config/kong.yml.backup
    
    # Update with new keys
    sed -i "s|key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*|key: ${ANON_KEY}|g" supabase/config/kong.yml
    sed -i "s|key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*|key: ${SERVICE_ROLE_KEY}|g" supabase/config/kong.yml
    
    echo -e "${GREEN}Updated kong.yml with new JWT tokens${NC}"
else
    echo -e "${YELLOW}Warning: kong.yml not found, creating it...${NC}"
    mkdir -p supabase/config
    cp docker/kong.yml supabase/config/
fi

# Create docker-compose.test.yml with JWT_SECRET
if [ -f "docker-compose.test.yml" ]; then
    # Create .env file for docker-compose
    cat > .env << EOF
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
POSTGRES_PASSWORD=test_postgres_password
POSTGRES_DB=postgres
POSTGRES_PORT=5432
POSTGRES_HOST=db
JWT_EXPIRY=3600
SITE_URL=http://localhost:3000
API_EXTERNAL_URL=http://localhost:54321
STUDIO_DEFAULT_ORGANIZATION=Test Organization
STUDIO_DEFAULT_PROJECT=AI Readiness Test
SUPABASE_PUBLIC_URL=http://localhost:54321
LOGFLARE_API_KEY=test_logflare_key
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=test_dashboard_password
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=true
ENABLE_ANONYMOUS_USERS=false
DISABLE_SIGNUP=false
SMTP_ADMIN_EMAIL=admin@example.com
SMTP_HOST=inbucket
SMTP_PORT=2500
SMTP_SENDER_NAME=Test Mailer
MAILER_URLPATHS_INVITE=/auth/verify
MAILER_URLPATHS_CONFIRMATION=/auth/verify
MAILER_URLPATHS_RECOVERY=/auth/reset-password
MAILER_URLPATHS_EMAIL_CHANGE=/auth/verify
ENABLE_PHONE_SIGNUP=false
ENABLE_PHONE_AUTOCONFIRM=false
MFA_ENABLED=false
PASSWORD_REQUIRE_REAUTHENTICATION=false
PGRST_DB_SCHEMAS=public,storage,graphql_public
FUNCTIONS_VERIFY_JWT=false
IMGPROXY_ENABLE_WEBP_DETECTION=true
KONG_HTTP_PORT=54321
KONG_HTTPS_PORT=54322
STUDIO_PORT=54323
INBUCKET_PORT=54324
INBUCKET_SMTP_PORT=2500
DOCKER_SOCKET_LOCATION=/var/run/docker.sock
EOF
    
    echo -e "${GREEN}Created .env file for docker-compose${NC}"
fi

# Initialize Supabase project if not already initialized
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${BLUE}Initializing Supabase project...${NC}"
    supabase init || true
fi

# Update supabase/config.toml with our configuration
if [ -f "supabase/config.toml" ]; then
    cat > supabase/config.toml << EOF
# A string used to distinguish different Supabase projects on the same host. Defaults to the working
# directory name when running \`supabase init\`.
project_id = "ai-readiness-test"

[api]
# Port to use for the API URL.
port = 54321
# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API
# endpoints. public and storage are always included.
schemas = ["public", "storage", "graphql_public"]
# Extra schemas to add to the search_path of every request. public is always included.
extra_search_path = ["public", "extensions"]
# The maximum number of rows returns from a view, table, or stored procedure. Limits payload size
# for accidental or malicious requests.
max_rows = 1000

[db]
# Port to use for the local database URL.
port = 54322
# The database major version to use. This has to be the same as your remote database's. Run \`SHOW
# server_version;\` on the remote database to check.
major_version = 15

[studio]
# Port to use for Supabase Studio.
port = 54323

# Email testing server. Emails sent with the local dev setup are not actually sent - rather, they
# are monitored, and you can view the emails that would have been sent from the web interface.
[inbucket]
# Port to use for the email testing server web interface.
port = 54324
smtp_port = 2500
pop3_port = 1100

[storage]
# The maximum file size allowed (e.g. "5MB", "500KB").
file_size_limit = "50MiB"

[auth]
# The base URL of your website. Used as an allow-list for redirects and for constructing URLs used
# in emails.
site_url = "http://localhost:3000"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["http://localhost:3000/**", "http://localhost:54323/**"]
# How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604,800 seconds (one
# week).
jwt_expiry = 3600
# Allow/disallow new user signups to your project.
enable_signup = true

[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = true
# If enabled, a user will be required to confirm any email change on both the old, and new email
# addresses. If disabled, only the new email is required to confirm.
double_confirm_changes = true
# If enabled, users need to confirm their email address before signing in.
enable_confirmations = false

# Use an external OAuth provider. The full list of providers are: \`apple\`, \`azure\`, \`bitbucket\`,
# \`discord\`, \`facebook\`, \`github\`, \`gitlab\`, \`google\`, \`keycloak\`, \`linkedin\`, \`notion\`, \`twitch\`,
# \`twitter\`, \`slack\`, \`spotify\`, \`workos\`, \`zoom\`.
[auth.external.apple]
enabled = false
client_id = ""
secret = ""
# Overrides the default auth redirectUrl.
redirect_uri = ""
# Overrides the default auth provider URL. Used to support self-hosted gitlab, single-tenant Azure,
# or any other third-party OIDC providers.
url = ""

[analytics]
enabled = false
port = 54327
vector_port = 54328
# Setup BigQuery project to enable log viewer on local development stack.
# See: https://supabase.com/docs/guides/getting-started/local-development#enabling-local-logging
gcp_project_id = ""
gcp_project_number = ""
gcp_jwt_path = "supabase/gcloud.json"
EOF
    
    echo -e "${GREEN}Updated supabase/config.toml${NC}"
fi

echo -e "${BLUE}Configuration complete!${NC}"
echo ""
echo -e "${GREEN}JWT Secret:${NC} ${JWT_SECRET}"
echo -e "${GREEN}Anon Key:${NC} ${ANON_KEY}"
echo -e "${GREEN}Service Role Key:${NC} ${SERVICE_ROLE_KEY}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run: ./scripts/test-infrastructure-setup.sh start"
echo "2. The local Supabase instance will be available at:"
echo "   - API: http://localhost:54321"
echo "   - Studio: http://localhost:54323"
echo "   - Database: localhost:54322"
echo ""