#!/bin/bash

# Start Test Environment Script
# This script starts the mock Supabase server and the Next.js app for testing

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Starting test environment...${NC}"

# Kill any existing processes
echo -e "${YELLOW}Stopping any existing processes...${NC}"
pkill -f "node test-mock-server.js" || true
pkill -f "next dev" || true
sleep 2

# Start mock Supabase server
echo -e "${BLUE}Starting mock Supabase server...${NC}"
NODE_ENV=test node test-mock-server.js &
MOCK_PID=$!
echo -e "${GREEN}Mock server started with PID: $MOCK_PID${NC}"

# Wait for mock server to be ready
sleep 2

# Start Next.js in test mode
echo -e "${BLUE}Starting Next.js application...${NC}"
npm run dev &
NEXT_PID=$!
echo -e "${GREEN}Next.js started with PID: $NEXT_PID${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}Stopping test environment...${NC}"
    kill $MOCK_PID 2>/dev/null || true
    kill $NEXT_PID 2>/dev/null || true
    echo -e "${GREEN}Test environment stopped${NC}"
}

# Set up cleanup on script exit
trap cleanup EXIT

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 5

# Check if services are running
if curl -s http://localhost:54321/health > /dev/null; then
    echo -e "${GREEN}✓ Mock Supabase server is ready${NC}"
else
    echo -e "${RED}✗ Mock Supabase server failed to start${NC}"
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Next.js application is ready${NC}"
else
    echo -e "${YELLOW}⚠ Next.js application may still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}Test environment is running!${NC}"
echo -e "${BLUE}Services:${NC}"
echo "  - Mock Supabase: http://localhost:54321"
echo "  - Next.js App: http://localhost:3000"
echo ""
echo -e "${BLUE}Test Credentials:${NC}"
echo "  - testuser@example.com / TestPassword123!"
echo "  - testadmin@example.com / AdminPassword123!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"

# Keep script running
wait