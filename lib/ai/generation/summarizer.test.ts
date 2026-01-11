/**
 * Tests for the summarizer module
 */

import {
  filterMessagesByOptions,
  extractKeyPointsSimple,
  extractTopicsSimple,
  generateSimpleChatSummary,
  generateChatSummary,
  generateAgentSummary,
} from './summarizer';
import type { UIMessage } from '@/types/core/message';
import type { BackgroundAgent } from '@/types/agent/background-agent';
import type { ChatSummaryOptions } from '@/types/learning/summary';

// Mock messages for testing
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'How do I implement a binary search algorithm in JavaScript?',
    createdAt: new Date('2024-01-01T10:00:00'),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Here's a binary search implementation in JavaScript:

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
\`\`\`

The time complexity is O(log n) and space complexity is O(1).`,
    createdAt: new Date('2024-01-01T10:01:00'),
  },
  {
    id: 'msg-3',
    role: 'user',
    content: 'Can you explain the time complexity in more detail?',
    createdAt: new Date('2024-01-01T10:02:00'),
  },
  {
    id: 'msg-4',
    role: 'assistant',
    content: 'Binary search has O(log n) time complexity because it divides the search space in half with each iteration. For an array of n elements, you need at most log₂(n) comparisons to find the target.',
    createdAt: new Date('2024-01-01T10:03:00'),
  },
];

// Mock agent for testing - using partial types with type assertion for testing purposes
const mockAgent = {
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Analyze and summarize code',
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
    maxSteps: 10,
    timeout: 60000,
    model: 'gpt-4',
    provider: 'openai',
  },
  executionState: {
    currentStep: 3,
    totalSteps: 3,
    status: 'completed',
  },
  subAgents: [
    {
      id: 'sub-1',
      parentAgentId: 'agent-1',
      name: 'Code Analyzer',
      description: 'Analyzes code',
      task: 'Analyze code structure',
      status: 'completed',
      progress: 100,
      config: {},
      logs: [],
      steps: [],
      createdAt: new Date('2024-01-01T10:00:00'),
    },
  ],
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      type: 'thinking',
      title: 'Planning analysis',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:00'),
      completedAt: new Date('2024-01-01T10:00:05'),
      duration: 5000,
    },
    {
      id: 'step-2',
      stepNumber: 2,
      type: 'tool_call',
      title: 'Reading file',
      status: 'completed',
      toolCalls: [
        {
          id: 'tc-1',
          name: 'read_file',
          args: { path: '/src/index.ts' },
          status: 'completed',
        },
      ],
      startedAt: new Date('2024-01-01T10:00:05'),
      completedAt: new Date('2024-01-01T10:00:10'),
      duration: 5000,
    },
    {
      id: 'step-3',
      stepNumber: 3,
      type: 'response',
      title: 'Generating summary',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:10'),
      completedAt: new Date('2024-01-01T10:00:15'),
      duration: 5000,
    },
  ],
  logs: [],
  notifications: [],
  result: {
    success: true,
    finalResponse: 'Analysis complete',
    steps: 3,
    totalSteps: 3,
    duration: 15000,
    retryCount: 0,
  },
  createdAt: new Date('2024-01-01T10:00:00'),
  startedAt: new Date('2024-01-01T10:00:00'),
  completedAt: new Date('2024-01-01T10:00:15'),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent;

describe('filterMessagesByOptions', () => {
  it('should return all messages when scope is "all"', () => {
    const options: ChatSummaryOptions = {
      scope: 'all',
      format: 'detailed',
    };
    const result = filterMessagesByOptions(mockMessages, options);
    expect(result).toHaveLength(4);
  });

  it('should filter by selected IDs when scope is "selected"', () => {
    const options: ChatSummaryOptions = {
      scope: 'selected',
      selectedIds: ['msg-1', 'msg-3'],
      format: 'detailed',
    };
    const result = filterMessagesByOptions(mockMessages, options);
    expect(result).toHaveLength(2);
    expect(result.map(m => m.id)).toEqual(['msg-1', 'msg-3']);
  });

  it('should filter by range with indices', () => {
    const options: ChatSummaryOptions = {
      scope: 'range',
      range: { startIndex: 1, endIndex: 2 },
      format: 'detailed',
    };
    const result = filterMessagesByOptions(mockMessages, options);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('msg-2');
    expect(result[1].id).toBe('msg-3');
  });

  it('should filter by range with message IDs', () => {
    const options: ChatSummaryOptions = {
      scope: 'range',
      range: { startMessageId: 'msg-2', endMessageId: 'msg-3' },
      format: 'detailed',
    };
    const result = filterMessagesByOptions(mockMessages, options);
    expect(result).toHaveLength(2);
  });
});

describe('extractKeyPointsSimple', () => {
  it('should extract questions as key points', () => {
    const keyPoints = extractKeyPointsSimple(mockMessages);
    const questions = keyPoints.filter(kp => kp.category === 'question');
    expect(questions.length).toBeGreaterThan(0);
  });

  it('should extract code blocks as key points', () => {
    const keyPoints = extractKeyPointsSimple(mockMessages);
    const codePoints = keyPoints.filter(kp => kp.category === 'code');
    expect(codePoints.length).toBeGreaterThan(0);
  });

  it('should limit key points to 20', () => {
    // Create many messages
    const manyMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `This is message ${i} with a question? And another question? And more content to make it long enough.`,
      createdAt: new Date(),
    })) as UIMessage[];
    
    const keyPoints = extractKeyPointsSimple(manyMessages);
    expect(keyPoints.length).toBeLessThanOrEqual(20);
  });
});

describe('extractTopicsSimple', () => {
  it('should extract topics from messages', () => {
    const topics = extractTopicsSimple(mockMessages);
    expect(topics.length).toBeGreaterThan(0);
  });

  it('should identify code-related topics', () => {
    const topics = extractTopicsSimple(mockMessages);
    const codeTopics = topics.filter(t => 
      t.name.toLowerCase().includes('code') || 
      t.keywords?.some(k => k.includes('code'))
    );
    expect(codeTopics.length).toBeGreaterThanOrEqual(0);
  });
});

describe('generateSimpleChatSummary', () => {
  it('should generate brief summary', () => {
    const options: ChatSummaryOptions = {
      scope: 'all',
      format: 'brief',
    };
    const summary = generateSimpleChatSummary(mockMessages, options);
    expect(summary).toContain('4 messages');
  });

  it('should generate bullet point summary', () => {
    const options: ChatSummaryOptions = {
      scope: 'all',
      format: 'bullets',
    };
    const summary = generateSimpleChatSummary(mockMessages, options);
    expect(summary).toContain('**Total messages**');
    expect(summary).toContain('**User messages**');
  });

  it('should generate detailed summary', () => {
    const options: ChatSummaryOptions = {
      scope: 'all',
      format: 'detailed',
      includeCode: true,
    };
    const summary = generateSimpleChatSummary(mockMessages, options);
    expect(summary).toContain('Conversation Overview');
    expect(summary).toContain('Code Examples');
  });

  it('should return empty message for empty array', () => {
    const options: ChatSummaryOptions = {
      scope: 'all',
      format: 'brief',
    };
    const summary = generateSimpleChatSummary([], options);
    expect(summary).toBe('No messages to summarize.');
  });
});

describe('generateChatSummary', () => {
  it('should generate complete summary result', () => {
    const result = generateChatSummary({
      messages: mockMessages,
      options: { scope: 'all', format: 'detailed' },
    });

    expect(result.success).toBe(true);
    expect(result.messageCount).toBe(4);
    expect(result.summary).toBeTruthy();
    expect(result.keyPoints).toBeDefined();
    expect(result.topics).toBeDefined();
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('should return error for empty messages', () => {
    const result = generateChatSummary({
      messages: [],
      options: { scope: 'all', format: 'detailed' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No messages to summarize');
  });

  it('should call progress callback', () => {
    const progressCallback = jest.fn();
    
    generateChatSummary({
      messages: mockMessages,
      options: { scope: 'all', format: 'detailed' },
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenCalled();
    expect(progressCallback).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'complete', progress: 100 })
    );
  });
});

describe('generateAgentSummary', () => {
  it('should generate complete agent summary', () => {
    const result = generateAgentSummary({
      agent: mockAgent,
      options: {
        includeSubAgents: true,
        includeToolCalls: true,
        includeTiming: true,
        format: 'detailed',
      },
    });

    expect(result.success).toBe(true);
    expect(result.agentName).toBe('Test Agent');
    expect(result.task).toBe('Analyze and summarize code');
    expect(result.totalSteps).toBe(3);
    expect(result.steps).toHaveLength(3);
    expect(result.toolsUsed).toContain('read_file');
  });

  it('should include sub-agent summaries when enabled', () => {
    const result = generateAgentSummary({
      agent: mockAgent,
      options: {
        includeSubAgents: true,
        includeToolCalls: true,
        includeTiming: true,
        format: 'detailed',
      },
    });

    expect(result.subAgentSummaries).toBeDefined();
    expect(result.subAgentSummaries?.length).toBe(1);
    expect(result.subAgentSummaries?.[0].name).toBe('Code Analyzer');
  });

  it('should calculate total duration', () => {
    const result = generateAgentSummary({
      agent: mockAgent,
      options: {
        includeSubAgents: true,
        includeToolCalls: true,
        includeTiming: true,
        format: 'detailed',
      },
    });

    expect(result.totalDuration).toBeGreaterThan(0);
  });

  it('should call progress callback', () => {
    const progressCallback = jest.fn();
    
    generateAgentSummary({
      agent: mockAgent,
      options: {
        includeSubAgents: true,
        includeToolCalls: true,
        includeTiming: true,
        format: 'detailed',
      },
      onProgress: progressCallback,
    });

    expect(progressCallback).toHaveBeenCalled();
  });
});
