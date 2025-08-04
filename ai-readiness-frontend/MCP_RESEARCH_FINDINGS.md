# MCP Research Findings: Docker MCP and Supabase Studio MCP Setup

## Executive Summary

This research provides comprehensive guidance for setting up Docker MCP and Supabase Studio MCP servers with Claude Code. Both solutions offer powerful integration capabilities for AI-assisted development workflows, with Docker MCP providing containerized tool isolation and Supabase MCP enabling direct database interactions.

## Docker MCP Setup Guide

### Prerequisites
- **Docker Desktop**: Version 4.39.0 or later
- **Claude Desktop**: Latest version
- **Claude Code CLI**: `npm install -g @anthropic-ai/claude-code`
- **Node.js**: For npm-based MCP servers

### Installation Steps

#### 1. Install Docker MCP Toolkit
1. Launch Docker Desktop
2. Navigate to **Extensions** from the left menu
3. Search for "MCP Toolkit" (formerly "Labs: AI Tools for Devs")
4. Install the extension

#### 2. Configure MCP Servers
1. In Docker Desktop, select **MCP Toolkit**
2. Go to the **Catalog** tab
3. Browse and install desired MCP servers (e.g., GitHub, Puppeteer)
4. Optional: Configure servers in the **Config** tab

#### 3. Connect Claude Desktop
1. In MCP Toolkit, select the **Clients** tab
2. Find Claude Desktop and click **Connect**
3. Restart Claude Desktop to activate the connection

### Claude Code Configuration

#### Basic Server Addition
```bash
# Add a local server
claude mcp add my-server -e API_KEY=123 -- /path/to/server arg1 arg2

# Add Docker-based server (Windows)
claude mcp add my-server -- cmd /c npx -y @some/package
```

#### Configuration File Setup
Location: `~/.claude/settings.local.json`

```json
{
  "mcpServers": {
    "docker-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/var/run/docker.sock:/var/run/docker.sock",
        "mcp-server-docker:latest"
      ]
    }
  }
}
```

### Security Features
- **CPU Allocation**: Limited to 1 CPU per container
- **Memory Allocation**: 2GB limit per container
- **Filesystem Access**: No host access by default (explicit mounts required)
- **Network Isolation**: STDIO preferred over port opening

### Key Benefits
- **Cross-LLM Compatibility**: Works with Claude Desktop, Cursor, Continue.dev
- **Zero Manual Setup**: No dependency management required
- **Integrated Tool Discovery**: Browse tools directly in Docker Desktop
- **Isolation**: Secure sandboxed execution environment

## Supabase MCP Setup Guide

### Prerequisites
- **Node.js**: Latest LTS version
- **Supabase Account**: With project access
- **Personal Access Token**: From Supabase dashboard

### Official Repository
- **GitHub**: https://github.com/supabase-community/supabase-mcp
- **Maintainer**: Supabase Community

### Installation Steps

#### 1. Create Personal Access Token
1. Go to Supabase Settings
2. Navigate to Access Tokens
3. Create new token with descriptive name (e.g., "Claude MCP Server")
4. Copy and securely store the token

#### 2. Configure MCP Client
Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<your-project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<your-personal-access-token>"
      }
    }
  }
}
```

#### 3. Security Configuration

##### Project Scoping (Recommended)
```bash
npx -y @supabase/mcp-server-supabase@latest --project-ref=<project-ref>
```

##### Read-Only Mode
```bash
npx -y @supabase/mcp-server-supabase@latest --read-only
```

##### Feature Restrictions
```bash
npx -y @supabase/mcp-server-supabase@latest --features=database,docs
```

### Available Features
- **account**: Account management tools
- **docs**: Documentation access
- **database**: Database operations
- **debug**: Debugging utilities
- **development**: Development tools
- **functions**: Edge functions management
- **storage**: File storage operations
- **branching**: Branch management

### Alternative Implementations

#### Python Implementation (Enhanced)
- **Repository**: https://github.com/alexander-zuev/supabase-mcp-server
- **Features**: Management API support, automatic migration versioning, log access

#### Community Python Version
- **Repository**: https://github.com/coleam00/supabase-mcp
- **Focus**: Simplified Python implementation

## Local Supabase Studio Setup

### Prerequisites for Local Development
- **Git**: Version control
- **Docker Desktop**: For backend services
- **Node.js & pnpm**: Package management
- **Supabase CLI**: Local development tools

### Setup Steps
```bash
# Clone Supabase repository
git clone --depth 1 https://github.com/supabase/supabase.git

# Navigate to studio folder
cd supabase/apps/studio

# Copy environment configuration
cp .env.example .env

# Install dependencies
pnpm install

# Link Supabase CLI globally
pnpm link --global @supabase/cli

# Start local backend (requires Docker)
supabase start

# Run development server
pnpm dev
```

### Access Points
- **Local Dashboard**: http://localhost:8082
- **Local Development**: Isolated from online projects
- **Use Cases**: Offline development, testing, contributing to Studio

## Integration Best Practices

### Configuration Management
1. **Use Configuration Files**: Prefer direct file editing over CLI wizards
2. **Version Control**: Check `.claude/settings.local.json` into git for team sharing
3. **Environment Variables**: Store sensitive tokens securely
4. **Scoping**: Always scope access to specific projects/resources

### Security Recommendations
1. **Read-Only Mode**: Enable when write access isn't needed
2. **Token Management**: Use personal access tokens with minimal required permissions
3. **Regular Updates**: Keep MCP servers and Docker images updated
4. **Review Tool Calls**: Always review before executing MCP tool calls

### Performance Optimization
1. **Feature Selection**: Only enable needed tool groups
2. **Resource Limits**: Monitor Docker container resource usage
3. **Connection Pooling**: Use connection pooling for database operations
4. **Caching**: Implement caching where appropriate

## Implementation Examples

### GitHub MCP Server Integration
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

### Multiple Server Configuration
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/allowed/directory/path"
      ]
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=abcdefghijklmnop"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-token-here"
      }
    },
    "docker": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/var/run/docker.sock:/var/run/docker.sock",
        "mcp-server-docker:latest"
      ]
    }
  }
}
```

## Troubleshooting Guide

### Common Issues

#### Docker MCP
1. **Container Permission Issues**: Ensure Docker daemon is running and accessible
2. **Port Conflicts**: Use STDIO instead of TCP when possible
3. **Resource Limits**: Monitor CPU/memory usage with `docker stats`

#### Supabase MCP
1. **Authentication Failures**: Verify personal access token validity
2. **Project Access**: Confirm project reference ID is correct
3. **Feature Restrictions**: Check if required features are enabled

### Debug Commands
```bash
# Launch Claude with debug mode
claude --mcp-debug

# List configured servers
claude mcp list

# Test server connection
claude mcp get server-name

# Check Docker containers
docker ps

# Monitor Docker resources
docker stats
```

## Conclusion

Both Docker MCP and Supabase MCP provide powerful integration capabilities for Claude Code:

- **Docker MCP** excels in providing secure, containerized tool execution with extensive catalog support
- **Supabase MCP** offers direct database interaction capabilities with strong security controls
- **Local Supabase Studio** enables offline development and testing environments

The combination of these tools creates a comprehensive development environment that enhances Claude Code's capabilities while maintaining security and isolation principles.

## References

- [Docker MCP Toolkit Documentation](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/)
- [Supabase MCP Official Repository](https://github.com/supabase-community/supabase-mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Supabase Studio Local Setup Guide](https://mydevpa.ge/blog/setup-supabase-studio-mcp-locally)