/**
 * Tests for the agent diagram generator module
 */

import {
  generateAgentFlowchart,
  generateAgentSequenceDiagram,
  generateAgentTimeline,
  generateAgentStateDiagram,
  generateAgentDiagram,
} from './agent-diagram';
import type { BackgroundAgent } from '@/types/background-agent';
import type { DiagramOptions } from '@/types/summary';

// Mock agent for testing
const mockAgent = {
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Analyze and process data',
  status: 'completed',
  progress: 100,
  config: {
    runInBackground: true,
    notifyOnProgress: true,
    notifyOnComplete: true,
    notifyOnError: true,
    autoRetry: false,
    maxRetries: 3,
    retryDelay: 1000,
    persistState: true,
    maxConcurrentSubAgents: 3,
  },
  executionState: {
    currentStep: 4,
    totalSteps: 4,
    status: 'completed',
  },
  subAgents: [
    {
      id: 'sub-1',
      parentAgentId: 'agent-1',
      name: 'Data Fetcher',
      description: 'Fetches data from API',
      task: 'Fetch user data',
      status: 'completed',
      progress: 100,
      config: {},
      logs: [],
      steps: [],
      createdAt: new Date('2024-01-01T10:00:00'),
      startedAt: new Date('2024-01-01T10:00:05'),
      completedAt: new Date('2024-01-01T10:00:15'),
    },
    {
      id: 'sub-2',
      parentAgentId: 'agent-1',
      name: 'Data Processor',
      description: 'Processes fetched data',
      task: 'Process and transform data',
      status: 'completed',
      progress: 100,
      config: {},
      logs: [],
      steps: [],
      createdAt: new Date('2024-01-01T10:00:15'),
      startedAt: new Date('2024-01-01T10:00:16'),
      completedAt: new Date('2024-01-01T10:00:25'),
    },
  ],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking',
      title: 'Planning execution',
      description: 'Analyzing task and creating execution plan',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:00'),
      completedAt: new Date('2024-01-01T10:00:02'),
      duration: 2000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'sub_agent',
      title: 'Spawning data fetcher',
      status: 'completed',
      subAgentId: 'sub-1',
      startedAt: new Date('2024-01-01T10:00:02'),
      completedAt: new Date('2024-01-01T10:00:15'),
      duration: 13000,
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'tool_call',
      title: 'Processing data',
      status: 'completed',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'transform_data',
          args: { format: 'json' },
          status: 'completed',
          startedAt: new Date('2024-01-01T10:00:15'),
          completedAt: new Date('2024-01-01T10:00:18'),
        },
        {
          id: 'tc-2',
          name: 'validate_data',
          args: { schema: 'user' },
          status: 'completed',
          startedAt: new Date('2024-01-01T10:00:18'),
          completedAt: new Date('2024-01-01T10:00:20'),
        },
      ],
      startedAt: new Date('2024-01-01T10:00:15'),
      completedAt: new Date('2024-01-01T10:00:20'),
      duration: 5000,
    },
    {
      id: 'step-4',
      stepNumber: 4,
      type: 'response',
      title: 'Generating final response',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:20'),
      completedAt: new Date('2024-01-01T10:00:22'),
      duration: 2000,
    },
  ],
  logs: [],
  notifications: [],
  result: {
    success: true,
    finalResponse: 'Data processed successfully',
    steps: 4,
    totalSteps: 4,
    duration: 22000,
    retryCount: 0,
  },
  createdAt: new Date('2024-01-01T10:00:00'),
  startedAt: new Date('2024-01-01T10:00:00'),
  completedAt: new Date('2024-01-01T10:00:22'),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent;

// Failed agent for testing error states
const mockFailedAgent = {
  ...mockAgent,
  id: 'agent-failed',
  status: 'failed',
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking',
      title: 'Planning',
      status: 'completed',
      duration: 1000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call',
      title: 'API Call',
      status: 'failed',
      error: 'Connection timeout',
      duration: 5000,
    },
  ],
  error: 'Execution failed due to API error',
} as unknown as BackgroundAgent;

const defaultOptions: DiagramOptions = {
  type: 'flowchart',
  direction: 'TB',
  showTimestamps: true,
  showTokens: false,
  collapseContent: true,
  maxLabelLength: 40,
  theme: 'default',
  expandToolCalls: true,
  groupByTopic: false,
};

describe('generateAgentFlowchart', () => {
  it('should generate valid flowchart mermaid code', () => {
    const result = generateAgentFlowchart(mockAgent, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('flowchart');
    expect(result.mermaidCode).toContain('flowchart TB');
    expect(result.mermaidCode).toContain('start((Start))');
  });

  it('should include agent name in subgraph', () => {
    const result = generateAgentFlowchart(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('Test Agent');
  });

  it('should create nodes for all steps', () => {
    const result = generateAgentFlowchart(mockAgent, defaultOptions);
    
    // Should have nodes for all 4 steps plus start/end
    expect(result.nodes.length).toBeGreaterThanOrEqual(6);
  });

  it('should create sub-agents subgraph when sub-agents exist', () => {
    const result = generateAgentFlowchart(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('SubAgents');
    expect(result.mermaidCode).toContain('Data Fetcher');
  });

  it('should apply styling classes', () => {
    const result = generateAgentFlowchart(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('classDef thinking');
    expect(result.mermaidCode).toContain('classDef toolCall');
    expect(result.mermaidCode).toContain('classDef subAgent');
  });

  it('should handle failed steps with dotted edges', () => {
    const result = generateAgentFlowchart(mockFailedAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('classDef failed');
  });

  it('should respect direction option', () => {
    const lrResult = generateAgentFlowchart(mockAgent, { ...defaultOptions, direction: 'LR' });
    expect(lrResult.mermaidCode).toContain('flowchart LR');
  });

  it('should show timestamps when enabled', () => {
    const result = generateAgentFlowchart(mockAgent, { ...defaultOptions, showTimestamps: true });
    
    // Check that duration info is included
    expect(result.nodes.some(n => n.data?.stepNumber)).toBe(true);
  });
});

describe('generateAgentSequenceDiagram', () => {
  it('should generate valid sequence diagram', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('sequence');
    expect(result.mermaidCode).toContain('sequenceDiagram');
    expect(result.mermaidCode).toContain('autonumber');
  });

  it('should include user and agent participants', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('participant U as');
    expect(result.mermaidCode).toContain('participant A as');
  });

  it('should include tools participant when tools are used', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('participant T as');
  });

  it('should include sub-agents participant when sub-agents exist', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('participant SA as');
  });

  it('should show tool calls with responses', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('A->>T:');
    expect(result.mermaidCode).toContain('T-->>A:');
  });

  it('should show sub-agent spawning', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('A->>SA:');
    expect(result.mermaidCode).toContain('Spawn');
  });

  it('should show thinking steps as notes', () => {
    const result = generateAgentSequenceDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('Note over A:');
  });
});

describe('generateAgentTimeline', () => {
  it('should generate valid gantt diagram', () => {
    const result = generateAgentTimeline(mockAgent, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('timeline');
    expect(result.mermaidCode).toContain('gantt');
    expect(result.mermaidCode).toContain('title Agent Execution');
  });

  it('should have main agent section', () => {
    const result = generateAgentTimeline(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('section Main Agent');
  });

  it('should have sub-agents section when sub-agents exist', () => {
    const result = generateAgentTimeline(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('section Sub-Agents');
  });

  it('should have tool calls section when tools are used', () => {
    const result = generateAgentTimeline(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('section Tool Calls');
  });

  it('should mark failed tasks as critical', () => {
    const result = generateAgentTimeline(mockFailedAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('crit');
  });

  it('should include all steps as timeline items', () => {
    const result = generateAgentTimeline(mockAgent, defaultOptions);
    
    expect(result.nodes.length).toBeGreaterThanOrEqual(mockAgent.steps.length);
  });
});

describe('generateAgentStateDiagram', () => {
  it('should generate valid state diagram', () => {
    const result = generateAgentStateDiagram(mockAgent, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('stateDiagram');
    expect(result.mermaidCode).toContain('stateDiagram-v2');
    expect(result.mermaidCode).toContain('[*] --> Idle');
  });

  it('should include all agent states', () => {
    const result = generateAgentStateDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('Idle');
    expect(result.mermaidCode).toContain('Queued');
    expect(result.mermaidCode).toContain('Planning');
    expect(result.mermaidCode).toContain('Executing');
    expect(result.mermaidCode).toContain('Completed');
    expect(result.mermaidCode).toContain('Failed');
  });

  it('should show state transitions', () => {
    const result = generateAgentStateDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('-->');
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('should include composite executing state', () => {
    const result = generateAgentStateDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('state Executing {');
    expect(result.mermaidCode).toContain('Thinking');
    expect(result.mermaidCode).toContain('ToolCall');
  });

  it('should include status note', () => {
    const result = generateAgentStateDiagram(mockAgent, defaultOptions);
    
    expect(result.mermaidCode).toContain('note');
    expect(result.mermaidCode).toContain('Current Status');
  });
});

describe('generateAgentDiagram', () => {
  it('should generate flowchart by default', () => {
    const result = generateAgentDiagram(mockAgent);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('flowchart');
  });

  it('should generate correct diagram type based on options', () => {
    const types: Array<'flowchart' | 'sequence' | 'timeline' | 'stateDiagram'> = [
      'flowchart', 'sequence', 'timeline', 'stateDiagram'
    ];
    
    types.forEach(type => {
      const result = generateAgentDiagram(mockAgent, { type });
      expect(result.type).toBe(type);
    });
  });

  it('should return error for null agent', () => {
    const result = generateAgentDiagram(null as unknown as BackgroundAgent);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No agent provided to generate diagram from');
  });

  it('should include timestamp in generatedAt', () => {
    const result = generateAgentDiagram(mockAgent);
    
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('should merge options with defaults', () => {
    const result = generateAgentDiagram(mockAgent, { direction: 'LR' });
    
    expect(result.mermaidCode).toContain('LR');
  });

  it('should handle agent with no sub-agents', () => {
    const agentNoSub = {
      ...mockAgent,
      subAgents: [],
    } as unknown as BackgroundAgent;
    
    const result = generateAgentDiagram(agentNoSub);
    
    expect(result.success).toBe(true);
    expect(result.mermaidCode).not.toContain('SubAgents');
  });

  it('should handle agent with no tool calls', () => {
    const agentNoTools = {
      ...mockAgent,
      steps: mockAgent.steps.map(s => ({ ...s, toolCalls: undefined })),
    } as unknown as BackgroundAgent;
    
    const result = generateAgentDiagram(agentNoTools);
    
    expect(result.success).toBe(true);
  });
});
