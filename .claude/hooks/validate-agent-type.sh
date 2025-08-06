#!/bin/bash

# Validate Agent Type Hook
# This hook validates that the subagent_type is valid before deploying a Task

# Read the JSON input from stdin
INPUT=$(cat)

# Extract the subagent_type from the tool input
AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // empty')

# If no agent type specified, exit successfully (Task tool will handle it)
if [ -z "$AGENT_TYPE" ]; then
  exit 0
fi

# List of valid agent types (from Claude Code documentation)
VALID_AGENTS=(
  "general-purpose"
  "system-architect"
  "backend-dev"
  "code-analyzer"
  "consensus-builder"
  "swarm-memory-manager"
  "collective-intelligence-coordinator"
  "cicd-engineer"
  "quorum-manager"
  "security-manager"
  "byzantine-coordinator"
  "gossip-coordinator"
  "crdt-synchronizer"
  "performance-benchmarker"
  "raft-manager"
  "architecture"
  "refinement"
  "specification"
  "pseudocode"
  "sync-coordinator"
  "repo-architect"
  "release-manager"
  "swarm-issue"
  "workflow-automation"
  "swarm-pr"
  "multi-repo-swarm"
  "pr-manager"
  "release-swarm"
  "issue-tracker"
  "code-review-swarm"
  "github-modes"
  "project-board-sync"
  "tester"
  "coder"
  "planner"
  "researcher"
  "reviewer"
  "ux-researcher"
  "brand-guardian"
  "whimsy-injector"
  "visual-storyteller"
  "ui-designer"
  "tdd-london-swarm"
  "base-template-generator"
  "migration-planner"
  "sparc-coord"
  "sparc-coder"
  "task-orchestrator"
  "memory-coordinator"
  "swarm-init"
  "smart-agent"
  "api-docs"
  "perf-analyzer"
  "production-validator"
  "adaptive-coordinator"
  "mesh-coordinator"
  "hierarchical-coordinator"
  "ml-developer"
  "mobile-dev"
)

# Check if the agent type is valid
VALID=false
for valid_type in "${VALID_AGENTS[@]}"; do
  if [ "$AGENT_TYPE" = "$valid_type" ]; then
    VALID=true
    break
  fi
done

if [ "$VALID" = false ]; then
  echo "❌ Invalid agent type: '$AGENT_TYPE'" >&2
  echo "" >&2
  echo "📋 Valid agent types are:" >&2
  echo "" >&2
  
  # Group agents by category for better readability
  echo "Core Development:" >&2
  echo "  • coder, tester, reviewer, planner, researcher" >&2
  echo "" >&2
  
  echo "Architecture & Design:" >&2
  echo "  • system-architect, architecture, specification, pseudocode, refinement" >&2
  echo "" >&2
  
  echo "Specialized Development:" >&2
  echo "  • backend-dev, mobile-dev, ml-developer, api-docs" >&2
  echo "" >&2
  
  echo "Coordination & Management:" >&2
  echo "  • task-orchestrator, memory-coordinator, swarm-init, smart-agent" >&2
  echo "  • hierarchical-coordinator, mesh-coordinator, adaptive-coordinator" >&2
  echo "" >&2
  
  echo "GitHub & CI/CD:" >&2
  echo "  • cicd-engineer, pr-manager, release-manager, issue-tracker" >&2
  echo "  • github-modes, workflow-automation, release-swarm" >&2
  echo "" >&2
  
  echo "Testing & Quality:" >&2
  echo "  • tdd-london-swarm, production-validator, perf-analyzer, code-analyzer" >&2
  echo "" >&2
  
  echo "Consensus & Distribution:" >&2
  echo "  • consensus-builder, byzantine-coordinator, raft-manager" >&2
  echo "  • gossip-coordinator, crdt-synchronizer, quorum-manager" >&2
  echo "" >&2
  
  echo "UI/UX & Design:" >&2
  echo "  • ui-designer, ux-researcher, visual-storyteller" >&2
  echo "  • brand-guardian, whimsy-injector" >&2
  echo "" >&2
  
  echo "SPARC & Methodology:" >&2
  echo "  • sparc-coord, sparc-coder, base-template-generator, migration-planner" >&2
  echo "" >&2
  
  echo "💡 Tip: Use 'coder' for general implementation tasks" >&2
  echo "💡 Tip: Use 'code-analyzer' for analysis and type fixing" >&2
  echo "💡 Tip: Use 'task-orchestrator' for coordination" >&2
  
  # Exit with error code 2 to block the tool execution
  exit 2
fi

# Agent type is valid
echo "✅ Valid agent type: $AGENT_TYPE"
exit 0