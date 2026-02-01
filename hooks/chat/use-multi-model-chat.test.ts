/**
 * Tests for useMultiModelChat hook
 */

import { act, renderHook } from '@testing-library/react';
import { streamText } from 'ai';
import { useMultiModelChat } from './use-multi-model-chat';
import type { ArenaModelConfig } from '@/types/chat/multi-model';

// Suppress console.error for act() warnings in async tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) {
      return;
    }
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: {
          apiKey: 'test-openai-key',
          defaultModel: 'gpt-4o',
          enabled: true,
        },
        anthropic: {
          apiKey: 'test-anthropic-key',
          defaultModel: 'claude-3-opus',
          enabled: true,
        },
      },
    };
    return selector(state);
  }),
}));

// Mock AI SDK
const mockTextStream = async function* () {
  yield 'Hello';
  yield ' world';
  yield '!';
};

jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    textStream: mockTextStream(),
    usage: Promise.resolve({ promptTokens: 10, completionTokens: 5 }),
  })),
}));

// Mock AI client
jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({})),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-message-id'),
}));

const createMockModels = (): ArenaModelConfig[] => [
  {
    id: 'model-1',
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    columnIndex: 0,
  },
  {
    id: 'model-2',
    provider: 'anthropic',
    model: 'claude-3-opus',
    displayName: 'Claude 3 Opus',
    columnIndex: 1,
  },
];

describe('useMultiModelChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.columnStates).toEqual({});
    });

    it('should provide sendToAllModels function', () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      expect(typeof result.current.sendToAllModels).toBe('function');
    });

    it('should provide cancelAll function', () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      expect(typeof result.current.cancelAll).toBe('function');
    });

    it('should provide resetStates function', () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      expect(typeof result.current.resetStates).toBe('function');
    });
  });

  describe('sendToAllModels', () => {
    it('should throw error if less than 2 models', async () => {
      const models: ArenaModelConfig[] = [
        {
          id: 'model-1',
          provider: 'openai',
          model: 'gpt-4o',
          displayName: 'GPT-4o',
          columnIndex: 0,
        },
      ];
      const { result } = renderHook(() => useMultiModelChat({ models }));

      await expect(result.current.sendToAllModels('Test message')).rejects.toThrow(
        'At least 2 models required for multi-model chat'
      );
    });

    it('should set isExecuting to true during execution', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      const promise = act(async () => {
        const sendPromise = result.current.sendToAllModels('Test message');
        await sendPromise;
      });

      await promise;
      // After completion, isExecuting should be false
      expect(result.current.isExecuting).toBe(false);
    });

    it('should initialize column states for each model', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // Column states should be set for each model
      expect(Object.keys(result.current.columnStates).length).toBe(2);
    });

    it('should return MultiModelMessage with all columns', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      let message: Awaited<ReturnType<typeof result.current.sendToAllModels>> | undefined;
      await act(async () => {
        message = await result.current.sendToAllModels('Test message');
      });

      expect(message).toBeDefined();
      expect(message?.id).toBe('test-message-id');
      expect(message?.userContent).toBe('Test message');
      expect(message?.columns.length).toBe(2);
    });

    it('should call onMessageComplete callback', async () => {
      const models = createMockModels();
      const onMessageComplete = jest.fn();
      const { result } = renderHook(() =>
        useMultiModelChat({ models, onMessageComplete })
      );

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      expect(onMessageComplete).toHaveBeenCalledTimes(1);
      expect(onMessageComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-message-id',
          userContent: 'Test message',
        })
      );
    });

    it('should call onColumnComplete callback for each model', async () => {
      const models = createMockModels();
      const onColumnComplete = jest.fn();
      const { result } = renderHook(() =>
        useMultiModelChat({ models, onColumnComplete })
      );

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      expect(onColumnComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelAll', () => {
    it('should cancel ongoing executions', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      // Start execution
      act(() => {
        result.current.sendToAllModels('Test message');
      });

      // Cancel immediately
      act(() => {
        result.current.cancelAll();
      });

      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('resetStates', () => {
    it('should reset column states to empty', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      // Execute first to populate states
      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // Verify states are populated
      expect(Object.keys(result.current.columnStates).length).toBe(2);

      // Reset
      act(() => {
        result.current.resetStates();
      });

      expect(result.current.columnStates).toEqual({});
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle model execution errors gracefully', async () => {
      // Mock streamText to throw an error
      (streamText as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Model execution failed');
      });

      const models = createMockModels();
      const onColumnError = jest.fn();
      const { result } = renderHook(() =>
        useMultiModelChat({ models, onColumnError })
      );

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // Should have called error handler for the failed model
      expect(onColumnError).toHaveBeenCalled();
    });

    it('should continue execution for other models when one fails', async () => {
      let callCount = 0;
      (streamText as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First model failed');
        }
        return {
          textStream: mockTextStream(),
          usage: Promise.resolve({ promptTokens: 10, completionTokens: 5 }),
        };
      });

      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      let message: Awaited<ReturnType<typeof result.current.sendToAllModels>> | undefined;
      await act(async () => {
        message = await result.current.sendToAllModels('Test message');
      });

      // Both columns should be present in result
      expect(message?.columns.length).toBe(2);
      // One should have error status
      const errorColumn = message?.columns.find((c) => c.status === 'error');
      expect(errorColumn).toBeDefined();
    });
  });

  describe('streaming', () => {
    it('should call onColumnStream callback during streaming', async () => {
      const models = createMockModels();
      const onColumnStream = jest.fn();
      const { result } = renderHook(() =>
        useMultiModelChat({ models, onColumnStream })
      );

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // onColumnStream should have been called multiple times
      expect(onColumnStream).toHaveBeenCalled();
    });

    it('should update column content during streaming', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // Check that content was accumulated
      const column1 = result.current.columnStates['model-1'];
      const column2 = result.current.columnStates['model-2'];

      expect(column1?.content).toBeDefined();
      expect(column2?.content).toBeDefined();
    });
  });

  describe('metrics', () => {
    it('should include metrics in completed column state', async () => {
      const models = createMockModels();
      const { result } = renderHook(() => useMultiModelChat({ models }));

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      const column1 = result.current.columnStates['model-1'];
      expect(column1?.metrics).toBeDefined();
      expect(column1?.metrics?.latencyMs).toBeGreaterThanOrEqual(0);
      expect(column1?.metrics?.tokenCount).toBeDefined();
    });
  });

  describe('system prompt', () => {
    it('should pass system prompt to models', async () => {
      (streamText as jest.Mock).mockClear();

      const models = createMockModels();
      const systemPrompt = 'You are a helpful assistant.';
      const { result } = renderHook(() =>
        useMultiModelChat({ models, systemPrompt })
      );

      await act(async () => {
        await result.current.sendToAllModels('Test message');
      });

      // streamText should have been called with system prompt
      expect(streamText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: systemPrompt,
        })
      );
    });
  });
});
