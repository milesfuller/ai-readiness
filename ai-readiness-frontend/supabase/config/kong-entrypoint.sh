#!/bin/bash

# Create Kong config file from environment variable
cat > /tmp/kong.yml << 'EOF'
_format_version: "3.0"
_transform: true

services:
  - name: auth
    url: http://supabase-auth-test:9999
    plugins:
      - name: cors
    routes:
      - name: auth-all
        strip_path: true
        paths:
          - /auth/v1/

  - name: rest
    url: http://supabase-rest-test:3000
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
    routes:
      - name: rest-all
        strip_path: true
        paths:
          - /rest/v1/

consumers:
  - username: anon
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  - username: service_role
    keyauth_credentials:
      - key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - POST
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      headers:
        - Accept
        - Accept-Version
        - Content-Length
        - Content-MD5
        - Content-Type
        - Date
        - X-Auth-Token
        - Authorization
        - X-Requested-With
        - apikey
        - range
      exposed_headers:
        - X-Auth-Token
      credentials: true
      max_age: 3600
EOF

# Set the config path and start Kong
export KONG_DECLARATIVE_CONFIG=/tmp/kong.yml
exec /docker-entrypoint.sh "$@"