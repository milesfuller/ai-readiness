#!/bin/bash
set -e

echo "🚀 Starting Supabase MCP Container..."

# Initialize Supabase project if not exists
if [ ! -f "/app/supabase/config.toml" ]; then
    echo "📦 Initializing Supabase project..."
    cd /app
    supabase init --force
    
    # Copy configuration from host if available
    if [ -d "/app/supabase-host" ]; then
        echo "📋 Copying host configuration..."
        cp -r /app/supabase-host/* /app/supabase/ || true
    fi
fi

cd /app

# Start Supabase local development
echo "🔄 Starting Supabase services..."
supabase start --ignore-health-check &

# Wait for services to be ready
echo "⏳ Waiting for Supabase services to be ready..."
timeout 120s bash -c 'until curl -f http://localhost:54321/health >/dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Supabase services failed to start within timeout"
    exit 1
}

echo "✅ Supabase services are ready!"

# Start MCP server in background
echo "🤖 Starting Supabase MCP server..."
npx @supabase/mcp-server-supabase@latest \
    --read-only \
    --features=database,docs,development \
    --project-ref=local &

MCP_PID=$!

# Function to handle shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    kill $MCP_PID 2>/dev/null || true
    supabase stop || true
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGTERM SIGINT

# Keep container running and monitor processes
echo "🎯 Container ready! MCP server PID: $MCP_PID"
while kill -0 $MCP_PID 2>/dev/null; do
    sleep 10
done

echo "❌ MCP server stopped unexpectedly"
cleanup