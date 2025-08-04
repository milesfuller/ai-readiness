# Docker MCP Supabase Integration

This directory contains Docker configuration for running Supabase with MCP (Model Context Protocol) integration for Claude Code.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude Code   │───▶│   Docker MCP    │───▶│   Supabase      │
│                 │    │   Container     │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. MCP Supabase Container
- **Image**: `mcp-supabase:latest`
- **Purpose**: Provides Supabase local development environment via MCP
- **Features**:
  - Full Supabase stack (PostgreSQL, PostgREST, GoTrue, etc.)
  - MCP server for Claude Code integration
  - Persistent data storage
  - Health checks and monitoring

### 2. Services Included
- **PostgreSQL**: Database on port 5432
- **Supabase API**: REST API on port 54321
- **Supabase Studio**: Dashboard on port 3000
- **PostgREST**: API layer on port 54323
- **Storage**: File storage on port 54324
- **MCP Server**: Model Context Protocol integration

### 3. Configuration Files
- `Dockerfile`: Multi-stage build for optimized container
- `docker-compose.yml`: Service orchestration
- `startup.sh`: Container initialization script
- `.dockerignore`: Build optimization

## Quick Start

### 1. Setup
```bash
# Run the setup script
./scripts/setup-docker-mcp.sh
```

### 2. Manual Setup (Alternative)
```bash
# Create network
docker network create supabase-mcp-network

# Build image
docker build -f docker/mcp-supabase/Dockerfile -t mcp-supabase:latest .

# Start services
cd docker/mcp-supabase
docker-compose up -d
```

### 3. Verify Installation
```bash
# Check services
docker-compose ps

# Check health
curl http://localhost:54321/health

# View logs
docker logs mcp-supabase-container
```

## MCP Integration

### Claude Code Configuration
The MCP configuration is automatically created at `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "supabase-docker": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "..."],
      "env": { "..." }
    }
  }
}
```

### Usage in Claude Code
```bash
# List available MCP servers
claude mcp list

# Test connection
claude mcp get supabase-docker
```

## Development Workflow

### 1. Start Development Environment
```bash
./scripts/setup-docker-mcp.sh --start-only
```

### 2. Access Services
- **Supabase Studio**: http://localhost:3000
- **API Docs**: http://localhost:54321/rest/v1/
- **Database**: `postgresql://postgres:postgres@localhost:5432/postgres`

### 3. Stop Services
```bash
./scripts/setup-docker-mcp.sh --stop
```

## Data Persistence

### Volume Mounts
- `./data`: PostgreSQL data directory
- `./logs`: Application logs
- `../../supabase`: Host Supabase configuration (read-only)

### Backup Strategy
```bash
# Backup database
docker exec mcp-supabase-container pg_dump -U postgres postgres > backup.sql

# Restore database
docker exec -i mcp-supabase-container psql -U postgres postgres < backup.sql
```

## Security Features

### Container Security
- **Non-root user**: Runs as `supabase` user (UID 1001)
- **Read-only mounts**: Host configuration is mounted read-only
- **Network isolation**: Custom Docker network
- **Resource limits**: CPU and memory constraints

### MCP Security
- **Read-only mode**: MCP server runs in read-only mode by default
- **Feature restrictions**: Limited to database, docs, and development features
- **Local tokens**: Uses local development tokens, not production

## Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check Docker daemon
docker info

# Check network
docker network ls | grep supabase-mcp

# View detailed logs
docker logs mcp-supabase-container --details
```

#### Port Conflicts
```bash
# Check port usage
netstat -tulpn | grep :5432
netstat -tulpn | grep :54321

# Modify ports in docker-compose.yml if needed
```

#### Database Connection Issues
```bash
# Test database connection
docker exec mcp-supabase-container psql -U postgres -d postgres -c "SELECT version();"
```

#### MCP Server Issues
```bash
# Test MCP server directly
npx @supabase/mcp-server-supabase@latest --help

# Check Claude Code configuration
claude mcp list
```

### Debug Commands
```bash
# Container shell access
docker exec -it mcp-supabase-container /bin/bash

# Monitor resources
docker stats mcp-supabase-container

# Inspect container
docker inspect mcp-supabase-container

# View all logs
docker-compose logs -f
```

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:54321/health

# Service status
curl http://localhost:54321/rest/v1/

# Database status
docker exec mcp-supabase-container pg_isready -U postgres
```

## Configuration Reference

### Environment Variables
- `POSTGRES_DB`: Database name (default: postgres)
- `POSTGRES_USER`: Database user (default: postgres)
- `POSTGRES_PASSWORD`: Database password (default: postgres)
- `SUPABASE_JWT_SECRET`: JWT signing secret
- `SUPABASE_ANON_KEY`: Anonymous access key
- `SUPABASE_SERVICE_KEY`: Service role key

### Port Mapping
- `3000`: Supabase Studio
- `5432`: PostgreSQL
- `8000`: API Gateway
- `54321`: Supabase API
- `54323`: PostgREST
- `54324`: Storage API

### Volume Mapping
- `./data:/var/lib/postgresql/data`: Database storage
- `./logs:/app/logs`: Application logs
- `../../supabase:/app/supabase-host:ro`: Host configuration

## Integration Examples

### Claude Code Usage
```bash
# After setup, Claude Code can:
# 1. Query database via MCP
# 2. Manage schemas and migrations
# 3. Access API documentation
# 4. Monitor database performance
```

### Development Commands
```bash
# Migration management
supabase migration new create_users_table
supabase db reset

# Function deployment
supabase functions deploy

# Type generation
supabase gen types typescript --local
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Docker and Supabase logs
3. Verify network and port configurations
4. Test individual components separately

## References
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Docker MCP Integration](https://docs.docker.com/ai/mcp-catalog-and-toolkit/)
- [Model Context Protocol](https://modelcontextprotocol.io/)