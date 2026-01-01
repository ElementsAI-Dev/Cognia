/**
 * Tests for the chat diagram generator module
 */

import {
  generateChatFlowchart,
  generateChatSequenceDiagram,
  generateChatTimeline,
  generateChatMindmap,
  generateChatStateDiagram,
  generateChatDiagram,
} from './chat-diagram';
import type { UIMessage } from '@/types/message';
import type { DiagramOptions } from '@/types/summary';

// Mock messages for testing
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How do I implement a binary search algorithm?',
    createdAt: new Date('2024-01-01T10:00:00'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Here's a binary search implementation:

\`\`\`javascript
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
\`\`\``,
    createdAt: new Date('2024-01-01T10:01:00'),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Can you explain how it works?',
    createdAt: new Date('2024-01-01T10:02:00'),
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: 'Binary search works by repeatedly dividing the search interval in half.',
    createdAt: new Date('2024-01-01T10:03:00'),
    parts: [
      {
        type: 'tool-invocation',
        toolCallId: 'tc-1',
        toolName: 'search_docs',
        state: 'output-available',
        args: { query: 'binary search' },
        result: 'Documentation found',
      },
    ],
  },
];

const defaultOptions: DiagramOptions = {
  type: 'flowchart',
  direction: 'TB',
  showTimestamps: false,
  showTokens: false,
  collapseContent: true,
  maxLabelLength: 50,
  theme: 'default',
  expandToolCalls: true,
  groupByTopic: false,
};

describe('generateChatFlowchart', () => {
  it('should generate valid flowchart mermaid code', () => {
    const result = generateChatFlowchart(mockMessages, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('flowchart');
    expect(result.mermaidCode).toContain('flowchart TB');
    expect(result.mermaidCode).toContain('start((Start))');
    expect(result.mermaidCode).toContain('endNode((End))');
  });

  it('should include nodes for all messages', () => {
    const result = generateChatFlowchart(mockMessages, defaultOptions);
    
    expect(result.nodes.length).toBeGreaterThanOrEqual(mockMessages.length + 2); // +2 for start/end
  });

  it('should create edges between nodes', () => {
    const result = generateChatFlowchart(mockMessages, defaultOptions);
    
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('should include tool call nodes when expandToolCalls is true', () => {
    const result = generateChatFlowchart(mockMessages, { ...defaultOptions, expandToolCalls: true });
    
    const toolNodes = result.nodes.filter(n => n.type === 'tool');
    expect(toolNodes.length).toBeGreaterThan(0);
  });

  it('should respect direction option', () => {
    const lrResult = generateChatFlowchart(mockMessages, { ...defaultOptions, direction: 'LR' });
    expect(lrResult.mermaidCode).toContain('flowchart LR');
  });

  it('should include styling classes', () => {
    const result = generateChatFlowchart(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('classDef userMsg');
    expect(result.mermaidCode).toContain('classDef assistantMsg');
  });
});

describe('generateChatSequenceDiagram', () => {
  it('should generate valid sequence diagram', () => {
    const result = generateChatSequenceDiagram(mockMessages, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('sequence');
    expect(result.mermaidCode).toContain('sequenceDiagram');
    expect(result.mermaidCode).toContain('participant U as');
    expect(result.mermaidCode).toContain('participant A as');
  });

  it('should include tool participant when tools are used', () => {
    const result = generateChatSequenceDiagram(mockMessages, { ...defaultOptions, expandToolCalls: true });
    
    expect(result.mermaidCode).toContain('participant T as');
  });

  it('should show message exchanges', () => {
    const result = generateChatSequenceDiagram(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('->>');
    expect(result.mermaidCode).toContain('-->>');
  });
});

describe('generateChatTimeline', () => {
  it('should generate valid gantt diagram', () => {
    const result = generateChatTimeline(mockMessages, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('timeline');
    expect(result.mermaidCode).toContain('gantt');
    expect(result.mermaidCode).toContain('title Conversation Timeline');
  });

  it('should have sections for user and assistant', () => {
    const result = generateChatTimeline(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('section User Messages');
    expect(result.mermaidCode).toContain('section Assistant Responses');
  });

  it('should include tool calls section when present', () => {
    const result = generateChatTimeline(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('section Tool Calls');
  });
});

describe('generateChatMindmap', () => {
  it('should generate valid mindmap', () => {
    const result = generateChatMindmap(mockMessages, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('mindmap');
    expect(result.mermaidCode).toContain('mindmap');
    expect(result.mermaidCode).toContain('root((Conversation))');
  });

  it('should extract topics from content', () => {
    const result = generateChatMindmap(mockMessages, defaultOptions);
    
    // Should have some branches
    expect(result.nodes.length).toBeGreaterThan(0);
  });
});

describe('generateChatStateDiagram', () => {
  it('should generate valid state diagram', () => {
    const result = generateChatStateDiagram(mockMessages, defaultOptions);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('stateDiagram');
    expect(result.mermaidCode).toContain('stateDiagram-v2');
    expect(result.mermaidCode).toContain('[*] --> Idle');
  });

  it('should include conversation states', () => {
    const result = generateChatStateDiagram(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('Question');
    expect(result.mermaidCode).toContain('Processing');
    expect(result.mermaidCode).toContain('Response');
  });

  it('should include tool execution state when tools are used', () => {
    const result = generateChatStateDiagram(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('Tool Execution');
  });

  it('should include code discussion state when code is present', () => {
    const result = generateChatStateDiagram(mockMessages, defaultOptions);
    
    expect(result.mermaidCode).toContain('Code Discussion');
  });
});

describe('generateChatDiagram', () => {
  it('should generate flowchart by default', () => {
    const result = generateChatDiagram(mockMessages);
    
    expect(result.success).toBe(true);
    expect(result.type).toBe('flowchart');
  });

  it('should generate correct diagram type based on options', () => {
    const types: Array<'flowchart' | 'sequence' | 'timeline' | 'mindmap' | 'stateDiagram'> = [
      'flowchart', 'sequence', 'timeline', 'mindmap', 'stateDiagram'
    ];
    
    types.forEach(type => {
      const result = generateChatDiagram(mockMessages, { type });
      expect(result.type).toBe(type);
    });
  });

  it('should return error for empty messages', () => {
    const result = generateChatDiagram([]);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('No messages to generate diagram from');
  });

  it('should include timestamp in generatedAt', () => {
    const result = generateChatDiagram(mockMessages);
    
    expect(result.generatedAt).toBeInstanceOf(Date);
  });
});
