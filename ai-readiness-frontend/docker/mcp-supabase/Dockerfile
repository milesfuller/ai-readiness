# Multi-stage Docker build for Supabase MCP server
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat git

# Install Supabase CLI and MCP server
RUN npm install -g @supabase/cli@latest
RUN npm install -g @supabase/mcp-server-supabase@latest

# Production image, copy all files and run
FROM base AS runner
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash \
    git

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=deps /usr/local/bin /usr/local/bin

# Create non-root user
RUN addgroup --system --gid 1001 supabase
RUN adduser --system --uid 1001 supabase

# Create necessary directories with proper permissions
RUN mkdir -p /app/supabase /var/lib/postgresql/data /app/logs
RUN chown -R supabase:supabase /app /var/lib/postgresql/data

# Switch to non-root user
USER supabase

# Set environment variables
ENV NODE_ENV=development
ENV SUPABASE_URL=http://localhost:54321
ENV POSTGRES_DB=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV SUPABASE_DB_PASSWORD=postgres
ENV SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
ENV SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
ENV SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:54321/health || exit 1

# Create startup script
COPY docker/mcp-supabase/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Expose ports
EXPOSE 3000 5432 54321 54323 54324 8000

# Default command
CMD ["/app/startup.sh"]