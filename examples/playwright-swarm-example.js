// Example: Claude Flow Swarm with Playwright Integration
// This shows how to spawn agents that can use Playwright tools

// STEP 1: Initialize the swarm with coordination
const initializePlaywrightSwarm = async () => {
  // Use these commands in Claude Code:
  
  // 1. Initialize swarm
  await mcp__claude-flow__swarm_init({
    topology: "hierarchical",
    maxAgents: 4,
    strategy: "specialized"
  });

  // 2. Spawn specialized agents with Playwright access
  const agents = [
    {
      type: "tester",
      name: "UI Tester",
      task: `You are a UI testing specialist.
      
      AVAILABLE PLAYWRIGHT TOOLS:
      - mcp__playwright__browser_navigate(url) - Navigate to pages
      - mcp__playwright__browser_snapshot() - Get page structure
      - mcp__playwright__browser_click(element, ref) - Click elements
      - mcp__playwright__browser_type(element, ref, text) - Type text
      - mcp__playwright__browser_take_screenshot() - Capture screenshots
      - mcp__playwright__browser_wait_for(text/time) - Wait for conditions
      
      COORDINATION PROTOCOL:
      1. START: npx claude-flow@alpha hooks pre-task --description "UI testing"
      2. BEFORE EACH TEST: mcp__claude-flow__memory_usage action:"retrieve" key:"test-config"
      3. AFTER EACH ACTION: npx claude-flow@alpha hooks notify --message "[action completed]"
      4. STORE RESULTS: mcp__claude-flow__memory_usage action:"store" key:"test-results/[test-name]"
      5. END: npx claude-flow@alpha hooks post-task --task-id "ui-test"
      
      YOUR TASK: Test the login flow of the application`
    },
    {
      type: "code-analyzer",
      name: "Accessibility Checker",
      task: `You are an accessibility specialist.
      
      USE THESE TOOLS:
      - mcp__playwright__browser_snapshot() - Get accessibility tree
      - mcp__playwright__browser_evaluate(function) - Run accessibility checks
      - mcp__claude-flow__memory_usage - Store findings
      
      ANALYZE: Page accessibility using Playwright snapshots`
    },
    {
      type: "researcher",
      name: "Performance Monitor",
      task: `You are a performance analyst.
      
      TOOLS TO USE:
      - mcp__playwright__browser_network_requests() - Monitor network
      - mcp__playwright__browser_console_messages() - Check for errors
      - mcp__claude-flow__performance_report - Generate reports
      
      MONITOR: Page load performance and network efficiency`
    },
    {
      type: "task-orchestrator", 
      name: "Test Coordinator",
      task: `Coordinate all testing activities and compile results.
      
      COORDINATION TOOLS:
      - mcp__claude-flow__task_orchestrate - Manage test workflow
      - mcp__claude-flow__memory_search - Find all test results
      - mcp__claude-flow__performance_report - Compile final report`
    }
  ];

  // 3. Spawn all agents concurrently
  return agents;
};

// STEP 2: Example test scenarios
const testScenarios = {
  loginTest: {
    steps: [
      "Navigate to login page",
      "Take initial screenshot", 
      "Check accessibility of form",
      "Fill username field",
      "Fill password field",
      "Click submit button",
      "Wait for dashboard",
      "Verify successful login",
      "Take final screenshot"
    ],
    playwright_sequence: [
      "mcp__playwright__browser_navigate({ url: 'https://example.com/login' })",
      "mcp__playwright__browser_take_screenshot({ filename: 'login-initial.png' })",
      "mcp__playwright__browser_snapshot()",
      "mcp__playwright__browser_type({ element: 'username input', ref: 'input[name=username]', text: 'testuser' })",
      "mcp__playwright__browser_type({ element: 'password input', ref: 'input[name=password]', text: 'testpass' })",
      "mcp__playwright__browser_click({ element: 'submit button', ref: 'button[type=submit]' })",
      "mcp__playwright__browser_wait_for({ text: 'Dashboard' })",
      "mcp__playwright__browser_snapshot()",
      "mcp__playwright__browser_take_screenshot({ filename: 'login-success.png' })"
    ]
  }
};

// STEP 3: Coordination hooks for agents
const coordinationHooks = {
  preTask: "npx claude-flow@alpha hooks pre-task --description '[task]' --auto-spawn-agents false",
  postEdit: "npx claude-flow@alpha hooks post-edit --file '[file]' --memory-key 'playwright/[action]'",
  notify: "npx claude-flow@alpha hooks notify --message '[status]' --telemetry true",
  postTask: "npx claude-flow@alpha hooks post-task --task-id '[id]' --analyze-performance true"
};

// STEP 4: Memory keys for cross-agent coordination
const memoryStructure = {
  testConfig: "swarm/playwright/config",
  testResults: "swarm/playwright/results/[test-name]",
  screenshots: "swarm/playwright/screenshots/[filename]",
  performance: "swarm/playwright/performance/[metric]",
  accessibility: "swarm/playwright/accessibility/[page]"
};

// Export for use in Claude Code
module.exports = {
  initializePlaywrightSwarm,
  testScenarios,
  coordinationHooks,
  memoryStructure
};

// USAGE IN CLAUDE CODE:
// 1. Run: mcp__claude-flow__swarm_init with the config above
// 2. Spawn agents using Task tool with the agent definitions
// 3. Each agent will have access to Playwright tools
// 4. Agents coordinate through memory and hooks
// 5. Results are aggregated by the task-orchestrator