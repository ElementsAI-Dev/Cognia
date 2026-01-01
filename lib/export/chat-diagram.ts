/**
 * Chat Diagram Generator - Generate Mermaid diagrams for chat conversations
 * 
 * Supports multiple diagram types:
 * - Flowchart: Shows conversation flow
 * - Sequence: Shows message exchange timeline
 * - Timeline: Gantt chart of conversation
 * - Mindmap: Topic-based visualization
 */

import type { UIMessage, ToolInvocationPart } from '@/types/message';
import type {
  DiagramOptions,
  DiagramResult,
  DiagramNode,
  DiagramEdge,
} from '@/types/summary';

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
 * Extract a meaningful label from message content
 */
function extractLabel(content: string, maxLength: number): string {
  // Remove code blocks
  let cleaned = content.replace(/```[\s\S]*?```/g, '[code]');
  // Remove markdown links
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove markdown formatting
  cleaned = cleaned.replace(/[*_~`#]/g, '');
  // Get first sentence or chunk
  const firstSentence = cleaned.split(/[.!?]\s/)[0];
  return truncateText(escapeMermaid(firstSentence), maxLength);
}

/**
 * Get node style based on message role
 */
function getNodeStyle(role: string): DiagramNode['style'] {
  switch (role) {
    case 'user': return 'stadium';
    case 'assistant': return 'rounded';
    case 'system': return 'subroutine';
    case 'tool': return 'cylinder';
    default: return 'default';
  }
}

/**
 * Generate flowchart diagram for chat
 */
export function generateChatFlowchart(
  messages: UIMessage[],
  options: DiagramOptions
): DiagramResult {
  const {
    direction = 'TB',
    showTimestamps = false,
    collapseContent = true,
    maxLabelLength = 50,
    expandToolCalls = true,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push(`flowchart ${direction}`);
  lines.push('');

  // Add start node
  const startNode: DiagramNode = {
    id: 'start',
    label: 'Start',
    type: 'start',
    style: 'circle',
  };
  nodes.push(startNode);
  lines.push('  start((Start))');

  let prevNodeId = 'start';
  let nodeCounter = 0;

  for (const msg of messages) {
    nodeCounter++;
    const nodeId = `msg${nodeCounter}`;
    
    // Create main message node
    let label = collapseContent
      ? extractLabel(msg.content, maxLabelLength)
      : escapeMermaid(msg.content);
    
    if (showTimestamps && msg.createdAt) {
      const time = new Date(msg.createdAt).toLocaleTimeString();
      label = `[${time}] ${label}`;
    }

    const node: DiagramNode = {
      id: nodeId,
      label,
      type: msg.role as DiagramNode['type'],
      style: getNodeStyle(msg.role),
      data: { messageId: msg.id },
    };
    nodes.push(node);

    // Generate Mermaid node syntax
    const roleEmoji = msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '⚙️';
    const nodeShape = msg.role === 'user' 
      ? `([${roleEmoji} ${label}])`
      : msg.role === 'assistant'
      ? `[${roleEmoji} ${label}]`
      : `[[${roleEmoji} ${label}]]`;
    
    lines.push(`  ${nodeId}${nodeShape}`);

    // Add edge from previous node
    const edge: DiagramEdge = {
      from: prevNodeId,
      to: nodeId,
      style: 'solid',
    };
    edges.push(edge);
    lines.push(`  ${prevNodeId} --> ${nodeId}`);

    prevNodeId = nodeId;

    // Handle tool calls
    if (expandToolCalls && msg.parts) {
      const toolParts = msg.parts.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[];
      
      for (let i = 0; i < toolParts.length; i++) {
        const tool = toolParts[i];
        nodeCounter++;
        const toolNodeId = `tool${nodeCounter}`;
        
        const toolNode: DiagramNode = {
          id: toolNodeId,
          label: `🔧 ${tool.toolName}`,
          type: 'tool',
          style: 'cylinder',
          data: { toolCallId: tool.toolCallId },
        };
        nodes.push(toolNode);
        lines.push(`  ${toolNodeId}[("🔧 ${escapeMermaid(tool.toolName)}")]`);

        // Connect tool to message
        const toolEdge: DiagramEdge = {
          from: nodeId,
          to: toolNodeId,
          label: 'calls',
          style: 'dotted',
        };
        edges.push(toolEdge);
        lines.push(`  ${nodeId} -.->|calls| ${toolNodeId}`);
      }
    }
  }

  // Add end node
  const endNode: DiagramNode = {
    id: 'end',
    label: 'End',
    type: 'end',
    style: 'circle',
  };
  nodes.push(endNode);
  lines.push('  endNode((End))');
  lines.push(`  ${prevNodeId} --> endNode`);

  // Add styling
  lines.push('');
  lines.push('  %% Styling');
  lines.push('  classDef userMsg fill:#e3f2fd,stroke:#1976d2,color:#1565c0');
  lines.push('  classDef assistantMsg fill:#f3e5f5,stroke:#7b1fa2,color:#6a1b9a');
  lines.push('  classDef systemMsg fill:#fff3e0,stroke:#f57c00,color:#e65100');
  lines.push('  classDef toolCall fill:#e8f5e9,stroke:#388e3c,color:#2e7d32');
  
  // Apply styles
  const userNodes = nodes.filter(n => n.type === 'user').map(n => n.id).join(',');
  const assistantNodes = nodes.filter(n => n.type === 'assistant').map(n => n.id).join(',');
  const toolNodes = nodes.filter(n => n.type === 'tool').map(n => n.id).join(',');
  
  if (userNodes) lines.push(`  class ${userNodes} userMsg`);
  if (assistantNodes) lines.push(`  class ${assistantNodes} assistantMsg`);
  if (toolNodes) lines.push(`  class ${toolNodes} toolCall`);

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
 * Generate sequence diagram for chat
 */
export function generateChatSequenceDiagram(
  messages: UIMessage[],
  options: DiagramOptions
): DiagramResult {
  const {
    showTimestamps = false,
    collapseContent = true,
    maxLabelLength = 60,
    expandToolCalls = true,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('sequenceDiagram');
  lines.push('  autonumber');
  lines.push('');
  lines.push('  participant U as 👤 User');
  lines.push('  participant A as 🤖 Assistant');
  
  // Check if there are tool calls
  const hasToolCalls = messages.some(m => 
    m.parts?.some(p => p.type === 'tool-invocation')
  );
  if (hasToolCalls && expandToolCalls) {
    lines.push('  participant T as 🔧 Tools');
  }
  
  lines.push('');

  for (const msg of messages) {
    const from = msg.role === 'user' ? 'U' : 'A';
    const to = msg.role === 'user' ? 'A' : 'U';
    
    const label = collapseContent
      ? extractLabel(msg.content, maxLabelLength)
      : escapeMermaid(msg.content);
    
    if (showTimestamps && msg.createdAt) {
      const time = new Date(msg.createdAt).toLocaleTimeString();
      lines.push(`  Note over ${from}: ${time}`);
    }

    // Message node
    const node: DiagramNode = {
      id: msg.id,
      label,
      type: msg.role as DiagramNode['type'],
    };
    nodes.push(node);

    // Generate message line
    const arrow = msg.role === 'user' ? '->>' : '-->>';
    lines.push(`  ${from}${arrow}${to}: ${label}`);

    // Handle tool calls
    if (expandToolCalls && msg.parts) {
      const toolParts = msg.parts.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[];
      
      for (const tool of toolParts) {
        const toolNode: DiagramNode = {
          id: tool.toolCallId,
          label: tool.toolName,
          type: 'tool',
        };
        nodes.push(toolNode);

        lines.push(`  A->>T: ${escapeMermaid(tool.toolName)}`);
        
        // Show result status
        const resultStatus = tool.state === 'output-available' ? 'success' : 
                            tool.state === 'output-error' ? 'error' : 'pending';
        lines.push(`  T-->>A: ${resultStatus}`);

        const edge: DiagramEdge = {
          from: 'A',
          to: 'T',
          label: tool.toolName,
        };
        edges.push(edge);
      }
    }
  }

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
 * Generate timeline/gantt diagram for chat
 */
export function generateChatTimeline(
  messages: UIMessage[],
  options: DiagramOptions
): DiagramResult {
  const {
    collapseContent = true,
    maxLabelLength = 40,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('gantt');
  lines.push('  title Conversation Timeline');
  lines.push('  dateFormat HH:mm:ss');
  lines.push('  axisFormat %H:%M');
  lines.push('');

  // Group by role
  lines.push('  section User Messages');
  const userMsgs = messages.filter(m => m.role === 'user');
  for (let i = 0; i < userMsgs.length; i++) {
    const msg = userMsgs[i];
    const label = collapseContent
      ? extractLabel(msg.content, maxLabelLength)
      : escapeMermaid(msg.content.slice(0, maxLabelLength));
    
    const time = msg.createdAt ? new Date(msg.createdAt) : new Date();
    const timeStr = time.toTimeString().slice(0, 8);
    
    // Each message takes 1 minute for visualization
    lines.push(`  ${label} :u${i}, ${timeStr}, 1m`);
    
    nodes.push({
      id: `u${i}`,
      label,
      type: 'user',
    });
  }

  lines.push('');
  lines.push('  section Assistant Responses');
  const assistantMsgs = messages.filter(m => m.role === 'assistant');
  for (let i = 0; i < assistantMsgs.length; i++) {
    const msg = assistantMsgs[i];
    const label = collapseContent
      ? extractLabel(msg.content, maxLabelLength)
      : escapeMermaid(msg.content.slice(0, maxLabelLength));
    
    const time = msg.createdAt ? new Date(msg.createdAt) : new Date();
    const timeStr = time.toTimeString().slice(0, 8);
    
    lines.push(`  ${label} :a${i}, ${timeStr}, 2m`);
    
    nodes.push({
      id: `a${i}`,
      label,
      type: 'assistant',
    });
  }

  // Tool calls section
  const toolCalls: Array<{ name: string; time: Date }> = [];
  messages.forEach(m => {
    if (m.parts) {
      const tools = m.parts.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[];
      tools.forEach(t => {
        toolCalls.push({
          name: t.toolName,
          time: t.startedAt ? new Date(t.startedAt) : (m.createdAt ? new Date(m.createdAt) : new Date()),
        });
      });
    }
  });

  if (toolCalls.length > 0) {
    lines.push('');
    lines.push('  section Tool Calls');
    toolCalls.forEach((tc, i) => {
      const timeStr = tc.time.toTimeString().slice(0, 8);
      lines.push(`  ${escapeMermaid(tc.name)} :t${i}, ${timeStr}, 30s`);
      
      nodes.push({
        id: `t${i}`,
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
 * Generate mindmap diagram for chat topics
 */
export function generateChatMindmap(
  messages: UIMessage[],
  options: DiagramOptions
): DiagramResult {
  const {
    maxLabelLength = 30,
  } = options;

  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('mindmap');
  lines.push('  root((Conversation))');

  // Extract topics from messages
  const userQuestions: string[] = [];
  const assistantTopics: string[] = [];
  const codeTopics: string[] = [];
  const toolsUsed: string[] = [];

  messages.forEach(msg => {
    const content = msg.content;
    
    if (msg.role === 'user') {
      // Extract questions
      const questions = content.match(/[^.!?]*\?/g) || [];
      questions.slice(0, 3).forEach(q => {
        userQuestions.push(truncateText(escapeMermaid(q.trim()), maxLabelLength));
      });
    }

    if (msg.role === 'assistant') {
      // Extract first sentence as topic
      const firstSentence = content.split(/[.!?]\s/)[0];
      if (firstSentence.length > 20) {
        assistantTopics.push(truncateText(escapeMermaid(firstSentence), maxLabelLength));
      }
    }

    // Check for code blocks
    const codeBlocks = content.match(/```(\w+)?/g) || [];
    codeBlocks.forEach(cb => {
      const lang = cb.replace('```', '') || 'code';
      if (!codeTopics.includes(lang)) {
        codeTopics.push(lang);
      }
    });

    // Extract tool calls
    if (msg.parts) {
      const tools = msg.parts.filter(p => p.type === 'tool-invocation') as ToolInvocationPart[];
      tools.forEach(t => {
        if (!toolsUsed.includes(t.toolName)) {
          toolsUsed.push(t.toolName);
        }
      });
    }
  });

  // Add user questions branch
  if (userQuestions.length > 0) {
    lines.push('    Questions');
    userQuestions.slice(0, 5).forEach(q => {
      lines.push(`      ${q}`);
      nodes.push({ id: `q_${q}`, label: q, type: 'user' });
    });
  }

  // Add topics branch
  if (assistantTopics.length > 0) {
    lines.push('    Topics Discussed');
    assistantTopics.slice(0, 5).forEach(t => {
      lines.push(`      ${t}`);
      nodes.push({ id: `t_${t}`, label: t, type: 'assistant' });
    });
  }

  // Add code branch
  if (codeTopics.length > 0) {
    lines.push('    Code Languages');
    codeTopics.forEach(c => {
      lines.push(`      ${c}`);
      nodes.push({ id: `c_${c}`, label: c, type: 'system' });
    });
  }

  // Add tools branch
  if (toolsUsed.length > 0) {
    lines.push('    Tools Used');
    toolsUsed.forEach(t => {
      lines.push(`      ${escapeMermaid(t)}`);
      nodes.push({ id: `tool_${t}`, label: t, type: 'tool' });
    });
  }

  return {
    success: true,
    mermaidCode: lines.join('\n'),
    type: 'mindmap',
    nodes,
    edges,
    generatedAt: new Date(),
  };
}

/**
 * Generate state diagram for conversation
 */
export function generateChatStateDiagram(
  messages: UIMessage[],
  _options: DiagramOptions
): DiagramResult {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const lines: string[] = [];

  lines.push('stateDiagram-v2');
  lines.push('  [*] --> Idle');
  lines.push('');

  // Track conversation states
  let hasToolCalls = false;
  let hasCode = false;
  let questionCount = 0;

  messages.forEach(msg => {
    if (msg.role === 'user' && msg.content.includes('?')) {
      questionCount++;
    }
    if (msg.content.includes('```')) {
      hasCode = true;
    }
    if (msg.parts?.some(p => p.type === 'tool-invocation')) {
      hasToolCalls = true;
    }
  });

  // Define states
  lines.push('  state "💬 Idle" as Idle');
  lines.push('  state "❓ Question Asked" as Question');
  lines.push('  state "🤔 Processing" as Processing');
  lines.push('  state "💡 Response" as Response');
  
  nodes.push({ id: 'Idle', label: 'Idle', type: 'start' });
  nodes.push({ id: 'Question', label: 'Question Asked', type: 'user' });
  nodes.push({ id: 'Processing', label: 'Processing', type: 'system' });
  nodes.push({ id: 'Response', label: 'Response', type: 'assistant' });

  if (hasToolCalls) {
    lines.push('  state "🔧 Tool Execution" as ToolExec');
    nodes.push({ id: 'ToolExec', label: 'Tool Execution', type: 'tool' });
  }

  if (hasCode) {
    lines.push('  state "💻 Code Discussion" as CodeDiscussion');
    nodes.push({ id: 'CodeDiscussion', label: 'Code Discussion', type: 'system' });
  }

  lines.push('  state "✅ Complete" as Complete');
  nodes.push({ id: 'Complete', label: 'Complete', type: 'end' });

  lines.push('');

  // Define transitions
  lines.push('  Idle --> Question : User asks');
  edges.push({ from: 'Idle', to: 'Question', label: 'User asks' });

  lines.push('  Question --> Processing : Analyze');
  edges.push({ from: 'Question', to: 'Processing', label: 'Analyze' });

  if (hasToolCalls) {
    lines.push('  Processing --> ToolExec : Need tool');
    lines.push('  ToolExec --> Processing : Tool result');
    edges.push({ from: 'Processing', to: 'ToolExec', label: 'Need tool' });
    edges.push({ from: 'ToolExec', to: 'Processing', label: 'Tool result' });
  }

  if (hasCode) {
    lines.push('  Processing --> CodeDiscussion : Code involved');
    lines.push('  CodeDiscussion --> Response : Explain code');
    edges.push({ from: 'Processing', to: 'CodeDiscussion', label: 'Code involved' });
    edges.push({ from: 'CodeDiscussion', to: 'Response', label: 'Explain code' });
  }

  lines.push('  Processing --> Response : Generate');
  edges.push({ from: 'Processing', to: 'Response', label: 'Generate' });

  lines.push('  Response --> Idle : Continue');
  lines.push('  Response --> Complete : Done');
  edges.push({ from: 'Response', to: 'Idle', label: 'Continue' });
  edges.push({ from: 'Response', to: 'Complete', label: 'Done' });

  lines.push('  Complete --> [*]');

  // Add note with stats
  lines.push('');
  lines.push(`  note right of Question : ${questionCount} questions asked`);
  lines.push(`  note right of Response : ${messages.filter(m => m.role === 'assistant').length} responses`);

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
 * Main function to generate chat diagram
 */
export function generateChatDiagram(
  messages: UIMessage[],
  options: Partial<DiagramOptions> = {}
): DiagramResult {
  const mergedOptions: DiagramOptions = {
    type: 'flowchart',
    direction: 'TB',
    showTimestamps: false,
    showTokens: false,
    collapseContent: true,
    maxLabelLength: 50,
    theme: 'default',
    expandToolCalls: true,
    groupByTopic: false,
    ...options,
  };

  if (messages.length === 0) {
    return {
      success: false,
      mermaidCode: '',
      type: mergedOptions.type,
      nodes: [],
      edges: [],
      generatedAt: new Date(),
      error: 'No messages to generate diagram from',
    };
  }

  try {
    switch (mergedOptions.type) {
      case 'flowchart':
        return generateChatFlowchart(messages, mergedOptions);
      case 'sequence':
        return generateChatSequenceDiagram(messages, mergedOptions);
      case 'timeline':
        return generateChatTimeline(messages, mergedOptions);
      case 'mindmap':
        return generateChatMindmap(messages, mergedOptions);
      case 'stateDiagram':
        return generateChatStateDiagram(messages, mergedOptions);
      default:
        return generateChatFlowchart(messages, mergedOptions);
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
