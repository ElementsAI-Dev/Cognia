/**
 * Tests for useAIConversation hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAIConversation } from './use-ai-conversation';

// Mock AI conversation functions
const mockCreateConversation = jest.fn();
const mockContinueConversation = jest.fn();
const mockStreamConversation = jest.fn();
const mockClearConversationHistory = jest.fn();
const mockGetConversationSummary = jest.fn();

jest.mock('@/lib/designer/ai-conversation', () => ({
  createConversation: (...args: unknown[]) => mockCreateConversation(...args),
  continueConversation: (...args: unknown[]) => mockContinueConversation(...args),
  streamConversation: (...args: unknown[]) => mockStreamConversation(...args),
  clearConversationHistory: (...args: unknown[]) => mockClearConversationHistory(...args),
  getConversationSummary: (...args: unknown[]) => mockGetConversationSummary(...args),
}));

// Mock designer AI config
jest.mock('@/lib/designer/ai', () => ({
  getDesignerAIConfig: jest.fn(() => ({
    model: 'gpt-4',
    temperature: 0.7,
  })),
}));

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: { openai: { apiKey: 'test-key' } },
      defaultProvider: 'openai',
    };
    return selector(state);
  }),
}));

describe('useAIConversation', () => {
  const mockConversation = {
    id: 'conv-123',
    designerId: 'designer-1',
    messages: [],
    currentCode: 'initial code',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateConversation.mockReturnValue(mockConversation);
    mockContinueConversation.mockResolvedValue({
      success: true,
      conversation: {
        ...mockConversation,
        messages: [
          { id: 'msg-1', role: 'user', content: 'test', timestamp: new Date() },
          { id: 'msg-2', role: 'assistant', content: 'response', timestamp: new Date() },
        ],
      },
      code: 'updated code',
    });
    mockClearConversationHistory.mockReturnValue({
      ...mockConversation,
      messages: [],
    });
    mockGetConversationSummary.mockReturnValue({
      messageCount: 2,
      lastMessage: 'response',
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAIConversation());

      expect(result.current.conversation).toBeNull();
      expect(result.current.messages).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should accept custom options', () => {
      const onCodeChange = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useAIConversation({
          designerId: 'custom-designer',
          initialCode: 'custom code',
          onCodeChange,
          onError,
        })
      );

      expect(result.current.conversation).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send message and update conversation', async () => {
      const { result } = renderHook(() => useAIConversation());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(mockCreateConversation).toHaveBeenCalled();
      expect(mockContinueConversation).toHaveBeenCalled();
      expect(result.current.conversation).not.toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });

    it('should call onCodeChange when code is returned', async () => {
      const onCodeChange = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onCodeChange })
      );

      await act(async () => {
        await result.current.sendMessage('Update the code');
      });

      expect(onCodeChange).toHaveBeenCalledWith('updated code');
    });

    it('should handle error response', async () => {
      mockContinueConversation.mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onError })
      );

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBe('API error');
      expect(onError).toHaveBeenCalledWith('API error');
    });

    it('should handle thrown error', async () => {
      mockContinueConversation.mockRejectedValue(new Error('Network error'));

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onError })
      );

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBe('Network error');
      expect(onError).toHaveBeenCalledWith('Network error');
    });

    it('should use existing conversation if available', async () => {
      const { result } = renderHook(() => useAIConversation());

      // First message creates conversation
      await act(async () => {
        await result.current.sendMessage('First message');
      });

      mockCreateConversation.mockClear();

      // Second message should use existing
      await act(async () => {
        await result.current.sendMessage('Second message');
      });

      // createConversation should not be called again
      expect(mockCreateConversation).not.toHaveBeenCalled();
    });

    it('should set isProcessing during request', async () => {
      mockContinueConversation.mockImplementation(async () => {
        return {
          success: true,
          conversation: mockConversation,
        };
      });

      const { result } = renderHook(() => useAIConversation());

      const promise = act(async () => {
        await result.current.sendMessage('Hello');
      });

      // After the request completes
      await promise;
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('sendMessageStreaming', () => {
    it('should handle streaming response', async () => {
      const streamUpdates = [
        { type: 'text', content: 'Hello' },
        { type: 'text', content: ' World' },
        { type: 'code', content: 'new code' },
        { type: 'complete' },
      ];

      async function* mockStream() {
        for (const update of streamUpdates) {
          yield update;
        }
      }

      mockStreamConversation.mockReturnValue(mockStream());

      const onCodeChange = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onCodeChange })
      );

      await act(async () => {
        await result.current.sendMessageStreaming('Hello');
      });

      expect(result.current.isStreaming).toBe(false);
      expect(onCodeChange).toHaveBeenCalledWith('new code');
    });

    it('should update streamingContent during stream', async () => {
      async function* mockStream() {
        yield { type: 'text', content: 'Part 1' };
        yield { type: 'text', content: ' Part 2' };
        yield { type: 'complete' };
      }

      mockStreamConversation.mockReturnValue(mockStream());

      const { result } = renderHook(() => useAIConversation());

      await act(async () => {
        await result.current.sendMessageStreaming('Hello');
      });

      // After completion, streaming content should be cleared
      expect(result.current.streamingContent).toBe('');
      expect(result.current.isStreaming).toBe(false);
    });

    it('should handle stream error', async () => {
      async function* mockStream() {
        yield { type: 'text', content: 'Hello' };
        yield { type: 'error', content: 'Stream error' };
      }

      mockStreamConversation.mockReturnValue(mockStream());

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onError })
      );

      await act(async () => {
        await result.current.sendMessageStreaming('Hello');
      });

      expect(result.current.error).toBe('Stream error');
      expect(onError).toHaveBeenCalledWith('Stream error');
    });

    it('should handle thrown error during streaming', async () => {
      mockStreamConversation.mockImplementation(async function* () {
        throw new Error('Streaming failed');
      });

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useAIConversation({ onError })
      );

      await act(async () => {
        await result.current.sendMessageStreaming('Hello');
      });

      expect(result.current.error).toBe('Streaming failed');
      expect(onError).toHaveBeenCalledWith('Streaming failed');
    });
  });

  describe('clearHistory', () => {
    it('should clear conversation history', async () => {
      const { result } = renderHook(() => useAIConversation());

      // First create a conversation
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(mockClearConversationHistory).toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should not call clearConversationHistory when no conversation', () => {
      const { result } = renderHook(() => useAIConversation());

      act(() => {
        result.current.clearHistory();
      });

      expect(mockClearConversationHistory).not.toHaveBeenCalled();
    });
  });

  describe('resetConversation', () => {
    it('should reset all state', async () => {
      const { result } = renderHook(() => useAIConversation());

      // First create a conversation
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.conversation).toBeNull();
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useAIConversation());

      // First create a conversation
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.conversation).not.toBeNull();

      // Now reset
      act(() => {
        result.current.resetConversation();
      });

      expect(result.current.conversation).toBeNull();
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('getSummary', () => {
    it('should return conversation summary', async () => {
      const { result } = renderHook(() => useAIConversation());

      // First create a conversation
      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      const summary = result.current.getSummary();

      expect(mockGetConversationSummary).toHaveBeenCalled();
      expect(summary).toEqual({
        messageCount: 2,
        lastMessage: 'response',
      });
    });

    it('should return null when no conversation', () => {
      const { result } = renderHook(() => useAIConversation());

      const summary = result.current.getSummary();

      expect(summary).toBeNull();
    });
  });

  describe('messages', () => {
    it('should return messages from conversation', async () => {
      const { result } = renderHook(() => useAIConversation());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.messages).toHaveLength(2);
    });

    it('should return empty array when no conversation', () => {
      const { result } = renderHook(() => useAIConversation());

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message', async () => {
      const { result } = renderHook(() => useAIConversation());

      await act(async () => {
        await result.current.sendMessage('');
      });

      expect(mockContinueConversation).toHaveBeenCalled();
    });

    it('should handle non-Error thrown objects', async () => {
      mockContinueConversation.mockRejectedValue('String error');

      const { result } = renderHook(() => useAIConversation());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.error).toBe('An error occurred');
    });

    it('should use initialCode when creating conversation', async () => {
      const { result } = renderHook(() =>
        useAIConversation({ initialCode: 'initial code here' })
      );

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(mockCreateConversation).toHaveBeenCalledWith(
        'default',
        'initial code here',
        expect.any(Object)
      );
    });

    it('should use custom designerId', async () => {
      const { result } = renderHook(() =>
        useAIConversation({ designerId: 'custom-id' })
      );

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(mockCreateConversation).toHaveBeenCalledWith(
        'custom-id',
        '',
        expect.any(Object)
      );
    });
  });
});
