# How Claude Flow Commands Work

## Understanding the Command System

The `.claude/commands/` directory contains **command definitions**, not executable scripts. These markdown files define workflows that Claude Flow can execute.

## Command Structure

Each `.md` file in this directory has:

1. **Frontmatter** (YAML header):
```yaml
---
name: command-name           # Used in npx claude-flow deployment [name]
description: What it does
command: npx claude-flow deployment [name]
category: deployment
agents: 10                   # Number of agents to spawn
parallel: true              # Run agents in parallel
mcp_tools: ["playwright", "supabase"]  # Required MCP tools
---
```

2. **Workflow Definition**: The markdown body describes what the command does

## How Commands Are Executed

### Option 1: Via Claude Flow CLI (If Integrated)
```bash
# If Claude Flow has integrated these commands:
npx claude-flow deployment test
```

### Option 2: Manual Execution in Claude Code
Since these are workflow definitions, you execute them by:

1. **Read the command file**:
```javascript
// In Claude Code
Read(".claude/commands/deployment/deployment-test.md")
```

2. **Follow the workflow** described in the file:
- Initialize swarm with specified topology
- Spawn the defined agents
- Execute the testing phases
- Generate reports

3. **Example execution**:
```javascript
// Based on deployment-test.md
mcp__claude-flow__swarm_init({ 
  topology: "hierarchical",
  maxAgents: 12,
  strategy: "parallel"
})

// Spawn all agents defined in the command
Task("UI Testing Agent", "...", "tester")
Task("Route Validator", "...", "specialist")
// ... etc
```

## Current Reality

These command files are **templates/workflows** that:
- Define best practices for deployment testing
- Specify which agents to use
- Describe the testing phases
- Document expected outputs

To execute them, you currently need to:
1. Ask Claude Code to run a specific workflow
2. Claude Code reads the command file
3. Claude Code executes the defined workflow using the Task tool and MCP tools

## Future Integration

These commands are designed to eventually integrate with:
```bash
# Future Claude Flow CLI integration
npx claude-flow@alpha deployment test
npx claude-flow@alpha deployment validate-all
```

But currently, they serve as **structured workflow definitions** that Claude Code can follow.

## Quick Start

To use these deployment commands now:

1. **Tell Claude Code**: "Run the deployment-test workflow"
2. **Claude Code will**:
   - Read `/commands/deployment/deployment-test.md`
   - Initialize the swarm
   - Spawn all defined agents
   - Execute the validation workflow
   - Generate reports

## Example Usage

```bash
# What you say to Claude Code:
"Please run the vercel-supabase-validate workflow to test my deployment"

# What Claude Code does:
1. Reads .claude/commands/deployment/vercel-supabase-validate.md
2. Initializes swarm with 10 agents
3. Runs all validation steps in parallel
4. Generates comprehensive report
```