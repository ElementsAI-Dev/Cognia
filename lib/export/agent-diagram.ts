/**
 * Agent Diagram Generator - Generate Mermaid diagrams for Agent executions
 * 
 * Supports multiple diagram types:
 * - Flowchart: Shows agent execution flow with sub-agents
 * - Sequence: Shows interaction between agent, sub-agents, and tools
 * - Timeline: Gantt chart of execution timeline
 * - StateDiagram: Shows execution state transitions
 */

import type { BackgroundAgent, BackgroundAgentStep } from '@/types/agent/background-agent';
import type {
  DiagramOptions,
  DiagramResult,
  DiagramNode,
  DiagramEdge,
} from '@/types/learning/summary';

/**
 * Escape special characters for Mermaid
 */
function escapeMermaid(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, ' ')
    .replace(/[<>{}|]/g, '')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .trim();
}

/**
 * Truncate text to max length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get status emoji
 */
function getStatusEmoji(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'running': return '🔄';
    case 'failed': return '❌';
    case 'pending': return '⏳';
    case 'paused': return '⏸️';
    case 'cancelled': return '🚫';
    case 'timeout': return '⏰';
    default: return '•';
  }
}

/**
 * Get step type emoji
 */
function getStepTypeEmoji(type: BackgroundAgentStep['type']): string {
  switch (type) {
    case 'thinking': return '🤔';
    case 'tool_call': return '🔧';
    case 'sub_agent': return '🤖';
    case 'response': return '💬';
    default: return '•';
  }
}

/**
 * Format duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Generate flowchart diagram for agent execution
 */
export function generateAgentFlowchart(
  agent: BackgroundAgent,
  options: DiagramOptions
): DiagramResult {
  const {
    direction = 'TB',
    showTimestamps = false,
    maxLabelLength = 40,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push(`flowchart ${direction}`);
  lines.push('');

  // Agent header
  const agentLabel = truncateText(escapeMermaid(agent.name), maxLabelLength);
  lines.push(`  subgraph Agent["🤖 ${agentLabel}"]`);
  lines.push(`    direction ${direction}`);

  // Start node
  lines.push('    start((Start))');
  nodes.push({ id: 'start', label: 'Start', type: 'start', style: 'circle' });

  let prevNodeId = 'start';

  // Add steps
  for (const step of agent.steps) {
    const stepId = `step${step.stepNumber}`;
    const emoji = getStepTypeEmoji(step.type);
    const statusEmoji = getStatusEmoji(step.status);
    
    let label = `${emoji} ${truncateText(escapeMermaid(step.title), maxLabelLength)}`;
    if (showTimestamps && step.duration) {
      label += ` (${formatDuration(step.duration)})`;
    }

    const node: DiagramNode = {
      id: stepId,
      label: step.title,
      type: step.type === 'sub_agent' ? 'subagent' : step.type === 'tool_call' ? 'tool' : 'agent',
      data: { stepNumber: step.stepNumber, status: step.status },
    };
    nodes.push(node);

    // Node shape based on type
    let nodeShape: string;
    switch (step.type) {
      case 'thinking':
        nodeShape = `{{"${label}"}}`;
        break;
      case 'tool_call':
        nodeShape = `[("${label}")]`;
        break;
      case 'sub_agent':
        nodeShape = `[["${label}"]]`;
        break;
      case 'response':
        nodeShape = `["${label}"]`;
        break;
      default:
        nodeShape = `["${label}"]`;
    }

    lines.push(`    ${stepId}${nodeShape}`);

    // Edge from previous
    const edgeStyle = step.status === 'failed' ? '-.->' : '-->';
    lines.push(`    ${prevNodeId} ${edgeStyle} ${stepId}`);
    edges.push({ from: prevNodeId, to: stepId, style: step.status === 'failed' ? 'dotted' : 'solid' });

    // Add status indicator
    if (step.status !== 'completed') {
      lines.push(`    ${stepId} -.-> ${stepId}_status[${statusEmoji}]`);
    }

    prevNodeId = stepId;
  }

  // End node
  const endEmoji = agent.status === 'completed' ? '✅' : agent.status === 'failed' ? '❌' : '⏳';
  lines.push(`    endNode((${endEmoji} End))`);
  lines.push(`    ${prevNodeId} --> endNode`);
  nodes.push({ id: 'endNode', label: 'End', type: 'end', style: 'circle' });

  lines.push('  end');
  lines.push('');

  // Sub-agents subgraph
  if (agent.subAgents.length > 0) {
    lines.push('  subgraph SubAgents["🤖 Sub-Agents"]');
    
    for (const subAgent of agent.subAgents) {
      const saId = `sa_${subAgent.id.slice(0, 8)}`;
      const saEmoji = getStatusEmoji(subAgent.status);
      const saLabel = truncateText(escapeMermaid(subAgent.name), maxLabelLength);
      
      lines.push(`    ${saId}[["${saEmoji} ${saLabel}"]]`);
      nodes.push({
        id: saId,
        label: subAgent.name,
        type: 'subagent',
        data: { subAgentId: subAgent.id, status: subAgent.status },
      });

      // Connect to parent step if exists
      const parentStep = agent.steps.find(s => s.subAgentId === subAgent.id);
      if (parentStep) {
        lines.push(`    step${parentStep.stepNumber} -.->|spawns| ${saId}`);
        edges.push({ from: `step${parentStep.stepNumber}`, to: saId, label: 'spawns', style: 'dotted' });
      }
    }
    
    lines.push('  end');
  }

  // Styling
  lines.push('');
  lines.push('  %% Styling');
  lines.push('  classDef thinking fill:#fff3e0,stroke:#ff9800,color:#e65100');
  lines.push('  classDef toolCall fill:#e8f5e9,stroke:#4caf50,color:#1b5e20');
  lines.push('  classDef subAgent fill:#e3f2fd,stroke:#2196f3,color:#0d47a1');
  lines.push('  classDef response fill:#f3e5f5,stroke:#9c27b0,color:#4a148c');
  lines.push('  classDef failed fill:#ffebee,stroke:#f44336,color:#b71c1c');

  // Apply styles
  agent.steps.forEach(step => {
    const stepId = `step${step.stepNumber}`;
    if (step.status === 'failed') {
      lines.push(`  class ${stepId} failed`);
    } else {
      switch (step.type) {
        case 'thinking':
          lines.push(`  class ${stepId} thinking`);
          break;
        case 'tool_call':
          lines.push(`  class ${stepId} toolCall`);
          break;
        case 'sub_agent':
          lines.push(`  class ${stepId} subAgent`);
          break;
        case 'response':
          lines.push(`  class ${stepId} response`);
          break;
      }
    }
  });

  return {
    success: true,
    mermaidCode: lines.join('\n'),
    type: 'flowchart',
    nodes,
    edges,
    generatedAt: new Date(),
  };
}

/**
 * Generate sequence diagram for agent execution
 */
export function generateAgentSequenceDiagram(
  agent: BackgroundAgent,
  options: DiagramOptions
): DiagramResult {
  const {
    maxLabelLength = 50,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('sequenceDiagram');
  lines.push('  autonumber');
  lines.push('');
  
  // Participants
  lines.push('  participant U as 👤 User');
  lines.push('  participant A as 🤖 Agent');
  
  // Add tool participant if tools are used
  const hasToolCalls = agent.steps.some(s => s.type === 'tool_call');
  if (hasToolCalls) {
    lines.push('  participant T as 🔧 Tools');
  }

  // Add sub-agent participants
  const subAgentIds = new Set(agent.subAgents.map(sa => sa.id));
  if (subAgentIds.size > 0) {
    lines.push('  participant SA as 🤖 Sub-Agents');
  }

  lines.push('');

  // Initial task
  const taskLabel = truncateText(escapeMermaid(agent.task), maxLabelLength);
  lines.push(`  U->>A: ${taskLabel}`);
  lines.push('  activate A');
  
  nodes.push({ id: 'task', label: agent.task, type: 'user' });

  // Process steps
  for (const step of agent.steps) {
    const stepLabel = truncateText(escapeMermaid(step.title), maxLabelLength);
    
    switch (step.type) {
      case 'thinking':
        lines.push(`  Note over A: 🤔 ${stepLabel}`);
        break;
        
      case 'tool_call':
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            const toolName = escapeMermaid(tc.name);
            lines.push(`  A->>T: ${toolName}`);
            lines.push(`  activate T`);
            
            if (tc.status === 'completed') {
              lines.push(`  T-->>A: Success`);
            } else if (tc.status === 'error') {
              lines.push(`  T--xA: Error`);
            } else {
              lines.push(`  T-->>A: ${tc.status}`);
            }
            lines.push(`  deactivate T`);
            
            edges.push({ from: 'A', to: 'T', label: toolName });
          }
        } else {
          lines.push(`  A->>T: ${stepLabel}`);
          lines.push(`  T-->>A: Done`);
        }
        break;
        
      case 'sub_agent':
        const subAgent = agent.subAgents.find(sa => sa.id === step.subAgentId);
        if (subAgent) {
          const saLabel = truncateText(escapeMermaid(subAgent.name), 30);
          lines.push(`  A->>SA: Spawn ${saLabel}`);
          lines.push(`  activate SA`);
          lines.push(`  Note over SA: ${truncateText(escapeMermaid(subAgent.task), 40)}`);
          
          if (subAgent.status === 'completed') {
            lines.push(`  SA-->>A: Completed`);
          } else if (subAgent.status === 'failed') {
            lines.push(`  SA--xA: Failed`);
          } else {
            lines.push(`  SA-->>A: ${subAgent.status}`);
          }
          lines.push(`  deactivate SA`);
          
          edges.push({ from: 'A', to: 'SA', label: `spawn ${saLabel}` });
        }
        break;
        
      case 'response':
        lines.push(`  Note over A: 💬 ${stepLabel}`);
        break;
    }

    nodes.push({
      id: `step_${step.stepNumber}`,
      label: step.title,
      type: step.type === 'tool_call' ? 'tool' : step.type === 'sub_agent' ? 'subagent' : 'agent',
    });
  }

  // Final response
  if (agent.result) {
    const outcome = agent.result.success ? 'Task completed' : 'Task failed';
    lines.push(`  A-->>U: ${outcome}`);
  }
  
  lines.push('  deactivate A');

  return {
    success: true,
    mermaidCode: lines.join('\n'),
    type: 'sequence',
    nodes,
    edges,
    generatedAt: new Date(),
  };
}

/**
 * Generate timeline/gantt diagram for agent execution
 */
export function generateAgentTimeline(
  agent: BackgroundAgent,
  options: DiagramOptions
): DiagramResult {
  const {
    maxLabelLength = 35,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  const startTime = agent.startedAt || agent.createdAt;

  lines.push('gantt');
  lines.push(`  title Agent Execution: ${escapeMermaid(truncateText(agent.name, 40))}`);
  lines.push('  dateFormat X');
  lines.push('  axisFormat %M:%S');
  lines.push('');

  // Main agent section
  lines.push('  section Main Agent');
  
  // Calculate relative times in seconds from start
  const getRelativeTime = (date: Date): number => {
    return Math.floor((date.getTime() - startTime.getTime()) / 1000);
  };

  for (const step of agent.steps) {
    const label = truncateText(escapeMermaid(step.title), maxLabelLength);
    const stepStart = step.startedAt ? getRelativeTime(new Date(step.startedAt)) : 0;
    const duration = step.duration ? Math.max(1, Math.ceil(step.duration / 1000)) : 5;
    
    const statusMarker = step.status === 'completed' ? '' : 
                        step.status === 'failed' ? 'crit, ' : 
                        step.status === 'running' ? 'active, ' : '';

    lines.push(`  ${label} :${statusMarker}step${step.stepNumber}, ${stepStart}, ${duration}s`);

    nodes.push({
      id: `step${step.stepNumber}`,
      label: step.title,
      type: 'agent',
      data: { duration: step.duration },
    });
  }

  // Sub-agents section
  if (agent.subAgents.length > 0) {
    lines.push('');
    lines.push('  section Sub-Agents');

    for (const subAgent of agent.subAgents) {
      const label = truncateText(escapeMermaid(subAgent.name), maxLabelLength);
      const saStart = subAgent.startedAt ? getRelativeTime(new Date(subAgent.startedAt)) : 0;
      
      let duration = 10; // default duration
      if (subAgent.startedAt && subAgent.completedAt) {
        duration = Math.max(1, Math.ceil(
          (new Date(subAgent.completedAt).getTime() - new Date(subAgent.startedAt).getTime()) / 1000
        ));
      }

      const statusMarker = subAgent.status === 'completed' ? '' :
                          subAgent.status === 'failed' ? 'crit, ' :
                          subAgent.status === 'running' ? 'active, ' : '';

      lines.push(`  ${label} :${statusMarker}sa_${subAgent.id.slice(0, 6)}, ${saStart}, ${duration}s`);

      nodes.push({
        id: `sa_${subAgent.id}`,
        label: subAgent.name,
        type: 'subagent',
      });
    }
  }

  // Tool calls section
  const toolCalls: Array<{ name: string; stepNumber: number; duration?: number }> = [];
  agent.steps.forEach(step => {
    if (step.toolCalls) {
      step.toolCalls.forEach(tc => {
        toolCalls.push({
          name: tc.name,
          stepNumber: step.stepNumber,
          duration: tc.completedAt && tc.startedAt
            ? new Date(tc.completedAt).getTime() - new Date(tc.startedAt).getTime()
            : undefined,
        });
      });
    }
  });

  if (toolCalls.length > 0) {
    lines.push('');
    lines.push('  section Tool Calls');

    toolCalls.forEach((tc, idx) => {
      const label = truncateText(escapeMermaid(tc.name), maxLabelLength);
      const duration = tc.duration ? Math.max(1, Math.ceil(tc.duration / 1000)) : 2;
      lines.push(`  ${label} :tool${idx}, after step${tc.stepNumber}, ${duration}s`);

      nodes.push({
        id: `tool${idx}`,
        label: tc.name,
        type: 'tool',
      });
    });
  }

  return {
    success: true,
    mermaidCode: lines.join('\n'),
    type: 'timeline',
    nodes,
    edges,
    generatedAt: new Date(),
  };
}

/**
 * Generate state diagram for agent execution
 */
export function generateAgentStateDiagram(
  agent: BackgroundAgent,
  _options: DiagramOptions
): DiagramResult {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('stateDiagram-v2');
  lines.push('  [*] --> Idle');
  lines.push('');

  // Define states based on agent status types
  const states = [
    { id: 'Idle', label: '💤 Idle', desc: 'Agent created' },
    { id: 'Queued', label: '📋 Queued', desc: 'Waiting in queue' },
    { id: 'Planning', label: '📝 Planning', desc: 'Creating execution plan' },
    { id: 'Executing', label: '🔄 Executing', desc: 'Running steps' },
    { id: 'Waiting', label: '⏳ Waiting', desc: 'Waiting for input' },
    { id: 'Paused', label: '⏸️ Paused', desc: 'Execution paused' },
    { id: 'Completed', label: '✅ Completed', desc: 'Successfully finished' },
    { id: 'Failed', label: '❌ Failed', desc: 'Execution failed' },
  ];

  // Add state definitions
  states.forEach(state => {
    lines.push(`  state "${state.label}" as ${state.id}`);
    nodes.push({ id: state.id, label: state.label, type: 'agent' });
  });

  lines.push('');

  // Define transitions
  const transitions = [
    { from: 'Idle', to: 'Queued', label: 'queue' },
    { from: 'Queued', to: 'Planning', label: 'start' },
    { from: 'Planning', to: 'Executing', label: 'plan ready' },
    { from: 'Executing', to: 'Waiting', label: 'need input' },
    { from: 'Waiting', to: 'Executing', label: 'input received' },
    { from: 'Executing', to: 'Paused', label: 'pause' },
    { from: 'Paused', to: 'Executing', label: 'resume' },
    { from: 'Executing', to: 'Completed', label: 'success' },
    { from: 'Executing', to: 'Failed', label: 'error' },
    { from: 'Completed', to: '[*]', label: '' },
    { from: 'Failed', to: '[*]', label: '' },
  ];

  transitions.forEach(t => {
    const label = t.label ? ` : ${t.label}` : '';
    lines.push(`  ${t.from} --> ${t.to}${label}`);
    if (t.to !== '[*]') {
      edges.push({ from: t.from, to: t.to, label: t.label });
    }
  });

  // Add composite state for Executing
  lines.push('');
  lines.push('  state Executing {');
  lines.push('    [*] --> Thinking');
  lines.push('    Thinking --> ToolCall : need tool');
  lines.push('    ToolCall --> Thinking : tool done');
  lines.push('    Thinking --> SubAgent : spawn');
  lines.push('    SubAgent --> Thinking : sub-agent done');
  lines.push('    Thinking --> Response : ready');
  lines.push('    Response --> [*]');
  lines.push('  }');

  // Add note showing current state
  lines.push('');
  lines.push(`  note right of ${agent.status === 'running' ? 'Executing' : 
              agent.status === 'completed' ? 'Completed' :
              agent.status === 'failed' ? 'Failed' :
              agent.status === 'paused' ? 'Paused' : 'Idle'}`);
  lines.push(`    Current Status: ${agent.status}`);
  lines.push(`    Steps: ${agent.steps.length}`);
  lines.push(`    Sub-Agents: ${agent.subAgents.length}`);
  lines.push('  end note');

  return {
    success: true,
    mermaidCode: lines.join('\n'),
    type: 'stateDiagram',
    nodes,
    edges,
    generatedAt: new Date(),
  };
}

/**
 * Main function to generate agent diagram
 */
export function generateAgentDiagram(
  agent: BackgroundAgent,
  options: Partial<DiagramOptions> = {}
): DiagramResult {
  const mergedOptions: DiagramOptions = {
    type: 'flowchart',
    direction: 'TB',
    showTimestamps: true,
    showTokens: false,
    collapseContent: true,
    maxLabelLength: 40,
    theme: 'default',
    expandToolCalls: true,
    groupByTopic: false,
    ...options,
  };

  if (!agent) {
    return {
      success: false,
      mermaidCode: '',
      type: mergedOptions.type,
      nodes: [],
      edges: [],
      generatedAt: new Date(),
      error: 'No agent provided to generate diagram from',
    };
  }

  try {
    switch (mergedOptions.type) {
      case 'flowchart':
        return generateAgentFlowchart(agent, mergedOptions);
      case 'sequence':
        return generateAgentSequenceDiagram(agent, mergedOptions);
      case 'timeline':
        return generateAgentTimeline(agent, mergedOptions);
      case 'stateDiagram':
        return generateAgentStateDiagram(agent, mergedOptions);
      default:
        return generateAgentFlowchart(agent, mergedOptions);
    }
  } catch (error) {
    return {
      success: false,
      mermaidCode: '',
      type: mergedOptions.type,
      nodes: [],
      edges: [],
      generatedAt: new Date(),
      error: error instanceof Error ? error.message : 'Failed to generate diagram',
    };
  }
}
