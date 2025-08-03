// How to Use Custom UI Design Agents with Claude Flow

// APPROACH 1: Direct Task Spawning with Custom Agent Definitions
// You can spawn any custom agent by providing its full definition to the Task tool

const spawnUIDesignAgents = () => {
  // Initialize swarm for UI design work
  mcp__claude-flow__swarm_init({
    topology: "hierarchical",
    maxAgents: 5,
    strategy: "specialized"
  });

  // Spawn custom UI design agents
  const uiDesignTeam = [
    {
      name: "UI Designer",
      type: "specialist", // Use generic type, define behavior in prompt
      prompt: `You are a visionary UI designer who creates interfaces that are not just beautiful, but implementable within rapid development cycles.
      
      SPECIALIZED ROLE: ui-designer (from .claude/agents/ui-design/ui-designer.md)
      
      Your expertise spans modern design trends, platform-specific guidelines, component architecture, and the delicate balance between innovation and usability.
      
      PRIMARY TOOLS:
      - Write, Read, MultiEdit for creating UI components
      - WebSearch, WebFetch for design inspiration
      - mcp__playwright__browser_snapshot for analyzing existing UIs
      - mcp__claude-flow__memory_usage for storing design decisions
      
      COORDINATION:
      1. START: npx claude-flow@alpha hooks pre-task --description "UI design"
      2. STORE DESIGNS: mcp__claude-flow__memory_usage action:"store" key:"designs/components/[name]"
      3. SHARE WITH TEAM: npx claude-flow@alpha hooks notify --message "[design update]"
      
      TASK: Design a modern, responsive user dashboard with data visualization`
    },
    {
      name: "UX Researcher", 
      type: "researcher",
      prompt: `You are a UX researcher specializing in rapid user insights.
      
      SPECIALIZED ROLE: ux-researcher (from .claude/agents/ui-design/ux-researcher.md)
      
      Focus on understanding user needs, behaviors, and pain points to inform design decisions.
      
      TOOLS TO USE:
      - WebSearch for industry best practices
      - mcp__claude-flow__memory_usage to document findings
      - Create user personas and journey maps
      
      TASK: Research dashboard usage patterns and user expectations`
    },
    {
      name: "Brand Guardian",
      type: "analyst",
      prompt: `You are the brand guardian ensuring design consistency.
      
      SPECIALIZED ROLE: brand-guardian (from .claude/agents/ui-design/brand-guardian.md)
      
      Maintain brand integrity across all UI elements while allowing for innovation.
      
      REVIEW all designs for brand compliance and consistency.`
    },
    {
      name: "Visual Storyteller",
      type: "specialist",
      prompt: `You are a visual storyteller who crafts engaging narratives through UI.
      
      SPECIALIZED ROLE: visual-storyteller (from .claude/agents/ui-design/visual-storyteller.md)
      
      Create UI flows that tell a story and guide users naturally through tasks.`
    },
    {
      name: "Whimsy Injector",
      type: "specialist", 
      prompt: `You are the whimsy injector who adds delightful touches to interfaces.
      
      SPECIALIZED ROLE: whimsy-injector (from .claude/agents/ui-design/whimsy-injector.md)
      
      Add personality through micro-interactions, animations, and playful elements.`
    }
  ];

  return uiDesignTeam;
};

// APPROACH 2: Register Custom Agents in Claude Flow Memory
// Store agent definitions for reuse across sessions

const registerCustomAgents = async () => {
  const customAgents = {
    "ui-designer": {
      description: "UI design specialist for rapid prototyping",
      tools: ["Write", "Read", "MultiEdit", "WebSearch", "WebFetch"],
      expertise: ["Tailwind CSS", "Component Systems", "Responsive Design"],
      coordinationHooks: true
    },
    "ux-researcher": {
      description: "User experience research and insights",
      tools: ["WebSearch", "mcp__claude-flow__memory_usage"],
      expertise: ["User Personas", "Journey Mapping", "Usability Testing"],
      coordinationHooks: true
    },
    "brand-guardian": {
      description: "Brand consistency and design system enforcement",
      tools: ["Read", "mcp__claude-flow__memory_usage"],
      expertise: ["Brand Guidelines", "Design Tokens", "Visual Consistency"],
      coordinationHooks: true
    },
    "visual-storyteller": {
      description: "Narrative-driven UI flow design",
      tools: ["Write", "mcp__playwright__browser_snapshot"],
      expertise: ["User Flows", "Storytelling", "Emotional Design"],
      coordinationHooks: true
    },
    "whimsy-injector": {
      description: "Delightful interactions and personality",
      tools: ["Write", "MultiEdit"],
      expertise: ["Micro-interactions", "Animations", "Playful Design"],
      coordinationHooks: true
    }
  };

  // Store in Claude Flow memory for reuse
  await mcp__claude-flow__memory_usage({
    action: "store",
    key: "agents/custom/ui-design",
    value: JSON.stringify(customAgents),
    namespace: "custom-agents"
  });
};

// APPROACH 3: Create a UI Design Workflow
const uiDesignWorkflow = {
  name: "Rapid UI Design Sprint",
  phases: [
    {
      phase: "Research",
      agent: "ux-researcher",
      duration: "2 hours",
      outputs: ["User personas", "Journey maps", "Pain points"]
    },
    {
      phase: "Ideation",
      agents: ["ui-designer", "visual-storyteller"],
      duration: "4 hours", 
      outputs: ["Wireframes", "Component sketches", "Flow diagrams"]
    },
    {
      phase: "Design",
      agents: ["ui-designer", "brand-guardian", "whimsy-injector"],
      duration: "1 day",
      outputs: ["Component library", "Page designs", "Interaction specs"]
    },
    {
      phase: "Validation",
      agents: ["brand-guardian", "ux-researcher"],
      duration: "2 hours",
      outputs: ["Design review", "Accessibility audit", "Implementation guide"]
    }
  ]
};

// USAGE EXAMPLE IN CLAUDE CODE:
/*
1. Initialize swarm:
   mcp__claude-flow__swarm_init({ topology: "hierarchical", maxAgents: 5 })

2. Spawn agents using Task tool with custom definitions:
   Task("UI Designer", "[full prompt from above]", "specialist")
   Task("UX Researcher", "[full prompt from above]", "researcher")
   Task("Brand Guardian", "[full prompt from above]", "analyst")
   Task("Visual Storyteller", "[full prompt from above]", "specialist")
   Task("Whimsy Injector", "[full prompt from above]", "specialist")

3. Orchestrate the design workflow:
   mcp__claude-flow__task_orchestrate({
     task: "Design a modern dashboard UI",
     strategy: "parallel"
   })

4. Agents will coordinate through memory and hooks
5. Results will be stored in shared memory for synthesis
*/

module.exports = {
  spawnUIDesignAgents,
  registerCustomAgents,
  uiDesignWorkflow
};