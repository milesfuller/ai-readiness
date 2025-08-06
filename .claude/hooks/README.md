# Claude Code Hooks

This directory contains custom hooks for Claude Code to enhance functionality and prevent errors.

## Available Hooks

### validate-agent-type.sh

**Type**: PreToolUse hook for Task tool  
**Purpose**: Validates that the `subagent_type` parameter is a valid agent type before deploying a subagent.

**Features**:
- Prevents deployment of invalid agent types (e.g., "analyst", "optimizer", "coordinator")
- Provides helpful error messages with valid agent types grouped by category
- Suggests appropriate alternatives for common mistakes

**How it works**:
1. Intercepts Task tool calls before execution
2. Extracts the `subagent_type` from the tool input
3. Validates against the list of 54 valid agent types
4. Blocks execution with helpful message if invalid
5. Allows execution if valid

**Example blocked call**:
```
Task tool called with subagent_type: "analyst"
❌ Invalid agent type: 'analyst'

Valid alternatives:
- Use 'code-analyzer' for analysis tasks
- Use 'researcher' for research tasks
- Use 'planner' for planning tasks
```

## Adding New Hooks

To add a new hook:

1. Create a script in this directory
2. Make it executable: `chmod +x script-name.sh`
3. Add the hook configuration to `.claude/settings.json`
4. Test the hook by triggering the relevant tool

## Hook Input

Hooks receive JSON input via stdin containing:
- `session_id`: Current session ID
- `tool_name`: Name of the tool being called
- `tool_input`: Parameters passed to the tool
- `hook_event_name`: The event that triggered the hook

## Hook Output

- **Exit code 0**: Success, allow tool execution
- **Exit code 2**: Block tool execution with error message
- **stdout**: Shown to user as informational
- **stderr**: Shown to user as error/warning

## Testing Hooks

Test the validate-agent-type hook:
```bash
echo '{"tool_input":{"subagent_type":"analyst"}}' | ./validate-agent-type.sh
```

This should show an error and list valid agent types.