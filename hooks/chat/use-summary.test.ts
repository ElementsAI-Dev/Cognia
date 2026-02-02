/**
 * Tests for the useSummary hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSummary } from './use-summary';
import type { UIMessage } from '@/types/core/message';
import type { BackgroundAgent } from '@/types/agent/background-agent';

// Mock the dependencies
jest.mock('@/lib/ai/generation/summarizer', () => ({
  generateChatSummary: jest.fn().mockImplementation(({ messages, onProgress }) => {
    onProgress?.({ stage: 'analyzing', progress: 20, message: 'Analyzing...' });
    onProgress?.({ stage: 'complete', progress: 100, message: 'Done' });
    return {
      success: true,
      summary: 'Test summary',
      keyPoints: [{ id: '1', content: 'Key point 1', sourceMessageId: 'msg-1' }],
      topics: [{ name: 'Test Topic', messageIds: ['msg-1'] }],
      messageCount: messages.length,
      sourceTokens: 100,
      summaryTokens: 20,
      compressionRatio: 0.2,
      generatedAt: new Date(),
    };
  }),
  generateChatSummaryWithAI: jest.fn().mockImplementation(async ({ messages, onProgress }) => {
    onProgress?.({ stage: 'analyzing', progress: 20, message: 'Analyzing...' });
    onProgress?.({ stage: 'complete', progress: 100, message: 'Done' });
    return {
      success: true,
      summary: 'AI generated summary',
      keyPoints: [],
      topics: [],
      messageCount: messages.length,
      sourceTokens: 100,
      summaryTokens: 30,
      compressionRatio: 0.3,
      generatedAt: new Date(),
    };
  }),
  generateAgentSummary: jest.fn().mockImplementation(({ agent, onProgress }) => {
    onProgress?.({ stage: 'analyzing', progress: 20, message: 'Analyzing...' });
    onProgress?.({ stage: 'complete', progress: 100, message: 'Done' });
    return {
      success: true,
      agentName: agent.name,
      task: agent.task,
      summary: 'Agent summary',
      outcome: 'Completed',
      steps: [],
      subAgentSummaries: [],
      totalDuration: 10000,
      totalSteps: 3,
      toolsUsed: ['tool1'],
      generatedAt: new Date(),
    };
  }),
}));

jest.mock('@/lib/export/diagram/chat-diagram', () => ({
  generateChatDiagram: jest.fn().mockImplementation((messages, options) => ({
    success: true,
    mermaidCode: 'flowchart TB\n  A --> B',
    type: options?.type || 'flowchart',
    nodes: [{ id: 'A', label: 'A', type: 'user' }],
    edges: [{ from: 'A', to: 'B' }],
    generatedAt: new Date(),
  })),
}));

jest.mock('@/lib/export/diagram/agent-diagram', () => ({
  generateAgentDiagram: jest.fn().mockImplementation((agent, options) => ({
    success: true,
    mermaidCode: 'flowchart TB\n  Start --> End',
    type: options?.type || 'flowchart',
    nodes: [{ id: 'Start', label: 'Start', type: 'start' }],
    edges: [{ from: 'Start', to: 'End' }],
    generatedAt: new Date(),
  })),
}));

jest.mock('@/lib/export', () => ({
  downloadFile: jest.fn(),
  generateFilename: jest.fn().mockReturnValue('summary.md'),
}));

// Mock messages
const mockMessages: UIMessage[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, how are you?',
    createdAt: new Date(),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    createdAt: new Date(),
  },
];

// Mock agent
const mockAgent = {
  id: 'agent-1',
  sessionId: 'session-1',
  name: 'Test Agent',
  task: 'Test task',
  status: 'completed',
  progress: 100,
  config: {},
  executionState: {},
  subAgents: [],
  steps: [],
  logs: [],
  notifications: [],
  createdAt: new Date(),
  retryCount: 0,
  priority: 1,
} as unknown as BackgroundAgent;

describe('useSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSummary());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.progress).toBeNull();
      expect(result.current.chatSummary).toBeNull();
      expect(result.current.agentSummary).toBeNull();
      expect(result.current.diagram).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should provide all action functions', () => {
      const { result } = renderHook(() => useSummary());

      expect(typeof result.current.generateChatSummary).toBe('function');
      expect(typeof result.current.generateAgentSummary).toBe('function');
      expect(typeof result.current.generateChatDiagram).toBe('function');
      expect(typeof result.current.generateAgentDiagram).toBe('function');
      expect(typeof result.current.generateChatSummaryWithDiagram).toBe('function');
      expect(typeof result.current.generateAgentSummaryWithDiagram).toBe('function');
      expect(typeof result.current.exportSummary).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('generateChatSummary', () => {
    it('should generate chat summary successfully', async () => {
      const { result } = renderHook(() => useSummary());

      await act(async () => {
        await result.current.generateChatSummary(mockMessages);
      });

      expect(result.current.chatSummary).not.toBeNull();
      expect(result.current.chatSummary?.success).toBe(true);
      expect(result.current.chatSummary?.summary).toBe('Test summary');
      expect(result.current.isGenerating).toBe(false);
    });

    it('should update progress during generation', async () => {
      const { result } = renderHook(() => useSummary());

      const progressValues: number[] = [];

      await act(async () => {
        const promise = result.current.generateChatSummary(mockMessages);
        // Capture progress values
        if (result.current.progress) {
          progressValues.push(result.current.progress.progress);
        }
        await promise;
      });

      expect(result.current.progress?.progress).toBe(100);
    });

    it('should accept custom options', async () => {
      const { result } = renderHook(() => useSummary());

      await act(async () => {
        await result.current.generateChatSummary(mockMessages, {
          format: 'brief',
          includeCode: false,
        });
      });

      expect(result.current.chatSummary).not.toBeNull();
    });
  });

  describe('generateAgentSummary', () => {
    it('should generate agent summary successfully', async () => {
      const { result } = renderHook(() => useSummary());

      await act(async () => {
        await result.current.generateAgentSummary(mockAgent);
      });

      expect(result.current.agentSummary).not.toBeNull();
      expect(result.current.agentSummary?.success).toBe(true);
      expect(result.current.agentSummary?.agentName).toBe('Test Agent');
    });

    it('should accept custom options', async () => {
      const { result } = renderHook(() => useSummary());

      await act(async () => {
        await result.current.generateAgentSummary(mockAgent, {
          includeSubAgents: false,
          includeTiming: true,
        });
      });

      expect(result.current.agentSummary).not.toBeNull();
    });
  });

  describe('generateChatDiagram', () => {
    it('should generate chat diagram successfully', () => {
      const { result } = renderHook(() => useSummary());

      act(() => {
        result.current.generateChatDiagram(mockMessages);
      });

      expect(result.current.diagram).not.toBeNull();
      expect(result.current.diagram?.success).toBe(true);
      expect(result.current.diagram?.type).toBe('flowchart');
      expect(result.current.diagram?.mermaidCode).toContain('flowchart');
    });

    it('should accept diagram type option', () => {
      const { result } = renderHook(() => useSummary());

      act(() => {
        result.current.generateChatDiagram(mockMessages, { type: 'sequence' });
      });

      expect(result.current.diagram?.type).toBe('sequence');
    });
  });

  describe('generateAgentDiagram', () => {
    it('should generate agent diagram successfully', () => {
      const { result } = renderHook(() => useSummary());

      act(() => {
        result.current.generateAgentDiagram(mockAgent);
      });

      expect(result.current.diagram).not.toBeNull();
      expect(result.current.diagram?.success).toBe(true);
    });
  });

  describe('generateChatSummaryWithDiagram', () => {
    it('should generate both summary and diagram', async () => {
      const { result } = renderHook(() => useSummary());

      let response;
      await act(async () => {
        response = await result.current.generateChatSummaryWithDiagram(mockMessages);
      });

      expect(response).toBeDefined();
      expect(result.current.chatSummary).not.toBeNull();
      expect(result.current.diagram).not.toBeNull();
    });
  });

  describe('generateAgentSummaryWithDiagram', () => {
    it('should generate both agent summary and diagram', async () => {
      const { result } = renderHook(() => useSummary());

      let response;
      await act(async () => {
        response = await result.current.generateAgentSummaryWithDiagram(mockAgent);
      });

      expect(response).toBeDefined();
      expect(result.current.agentSummary).not.toBeNull();
      expect(result.current.diagram).not.toBeNull();
    });
  });

  describe('exportSummary', () => {
    it('should export summary in markdown format', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { downloadFile } = require('@/lib/export');
      const { result } = renderHook(() => useSummary());

      // First generate a summary
      await act(async () => {
        await result.current.generateChatSummary(mockMessages);
      });

      // Then export
      act(() => {
        result.current.exportSummary({
          format: 'markdown',
          includeDiagram: false,
        });
      });

      expect(downloadFile).toHaveBeenCalled();
    });

    it('should set error when no summary to export', () => {
      const { result } = renderHook(() => useSummary());

      act(() => {
        result.current.exportSummary({
          format: 'markdown',
          includeDiagram: false,
        });
      });

      expect(result.current.error).toBe('No summary to export');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useSummary());

      // Generate some data
      await act(async () => {
        await result.current.generateChatSummary(mockMessages);
        result.current.generateChatDiagram(mockMessages);
      });

      expect(result.current.chatSummary).not.toBeNull();
      expect(result.current.diagram).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.chatSummary).toBeNull();
      expect(result.current.agentSummary).toBeNull();
      expect(result.current.diagram).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('with AI enabled', () => {
    it('should use AI summarization when enabled', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateChatSummaryWithAI } = require('@/lib/ai/generation/summarizer');

      const { result } = renderHook(() =>
        useSummary({
          useAI: true,
          aiConfig: {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-key',
          },
        })
      );

      await act(async () => {
        await result.current.generateChatSummary(mockMessages);
      });

      expect(generateChatSummaryWithAI).toHaveBeenCalled();
      expect(result.current.chatSummary?.summary).toBe('AI generated summary');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateChatSummary } = require('@/lib/ai/generation/summarizer');
      generateChatSummary.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const { result } = renderHook(() => useSummary());

      // The hook should catch and handle errors internally
      try {
        await act(async () => {
          await result.current.generateChatSummary(mockMessages);
        });
      } catch {
        // Error might be thrown or handled internally
      }

      // Hook should not be in generating state after error
      expect(result.current.isGenerating).toBe(false);
    });
  });
});
