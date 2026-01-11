/**
 * Tests for Chat Store
 */

import { act } from '@testing-library/react';
import { useChatStore, selectMessages, selectIsLoading, selectIsStreaming, selectError } from './chat-store';
import type { UIMessage } from '@/types/core/message';

// Helper to create mock message
const createMockMessage = (overrides: Partial<UIMessage> = {}): UIMessage => ({
  id: `msg-${Date.now()}`,
  role: 'user',
  content: 'Test message',
  createdAt: new Date(),
  ...overrides,
});

describe('useChatStore', () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useChatStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.isStreaming).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setMessages', () => {
    it('should set messages and clear error', () => {
      const messages = [createMockMessage(), createMockMessage({ role: 'assistant' })];

      act(() => {
        useChatStore.getState().setMessages(messages);
      });

      expect(useChatStore.getState().messages).toEqual(messages);
      expect(useChatStore.getState().error).toBeNull();
    });

    it('should replace existing messages', () => {
      const initialMessages = [createMockMessage()];
      const newMessages = [createMockMessage({ content: 'New message' })];

      act(() => {
        useChatStore.getState().setMessages(initialMessages);
      });

      act(() => {
        useChatStore.getState().setMessages(newMessages);
      });

      expect(useChatStore.getState().messages).toEqual(newMessages);
    });
  });

  describe('appendMessage', () => {
    it('should append message to existing messages', () => {
      const initial = createMockMessage({ id: 'msg-1' });
      const newMessage = createMockMessage({ id: 'msg-2' });

      act(() => {
        useChatStore.getState().setMessages([initial]);
      });

      act(() => {
        useChatStore.getState().appendMessage(newMessage);
      });

      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[1]).toEqual(newMessage);
    });

    it('should clear error when appending', () => {
      useChatStore.setState({ error: 'Some error' });

      act(() => {
        useChatStore.getState().appendMessage(createMockMessage());
      });

      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('updateMessage', () => {
    it('should update specific message by id', () => {
      const message = createMockMessage({ id: 'msg-1', content: 'Original' });

      act(() => {
        useChatStore.getState().setMessages([message]);
      });

      act(() => {
        useChatStore.getState().updateMessage('msg-1', { content: 'Updated' });
      });

      expect(useChatStore.getState().messages[0].content).toBe('Updated');
    });

    it('should not update if message id not found', () => {
      const message = createMockMessage({ id: 'msg-1', content: 'Original' });

      act(() => {
        useChatStore.getState().setMessages([message]);
      });

      act(() => {
        useChatStore.getState().updateMessage('msg-999', { content: 'Updated' });
      });

      expect(useChatStore.getState().messages[0].content).toBe('Original');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message by id', () => {
      const messages = [
        createMockMessage({ id: 'msg-1' }),
        createMockMessage({ id: 'msg-2' }),
      ];

      act(() => {
        useChatStore.getState().setMessages(messages);
      });

      act(() => {
        useChatStore.getState().deleteMessage('msg-1');
      });

      expect(useChatStore.getState().messages).toHaveLength(1);
      expect(useChatStore.getState().messages[0].id).toBe('msg-2');
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages and error', () => {
      act(() => {
        useChatStore.getState().setMessages([createMockMessage()]);
        useChatStore.setState({ error: 'Some error' });
      });

      act(() => {
        useChatStore.getState().clearMessages();
      });

      expect(useChatStore.getState().messages).toEqual([]);
      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      act(() => {
        useChatStore.getState().setLoading(true);
      });
      expect(useChatStore.getState().isLoading).toBe(true);

      act(() => {
        useChatStore.getState().setLoading(false);
      });
      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should set error and reset loading/streaming', () => {
      useChatStore.setState({ isLoading: true, isStreaming: true });

      act(() => {
        useChatStore.getState().setError('Test error');
      });

      expect(useChatStore.getState().error).toBe('Test error');
      expect(useChatStore.getState().isLoading).toBe(false);
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it('should clear error when set to null', () => {
      useChatStore.setState({ error: 'Some error' });

      act(() => {
        useChatStore.getState().setError(null);
      });

      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('streaming state', () => {
    it('should set streaming state', () => {
      act(() => {
        useChatStore.getState().setStreaming(true);
      });
      expect(useChatStore.getState().isStreaming).toBe(true);

      act(() => {
        useChatStore.getState().setStreaming(false);
      });
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe('appendToLastMessage', () => {
    it('should append content to last assistant message', () => {
      const messages = [
        createMockMessage({ id: 'msg-1', role: 'user' }),
        createMockMessage({ id: 'msg-2', role: 'assistant', content: 'Hello' }),
      ];

      act(() => {
        useChatStore.getState().setMessages(messages);
      });

      act(() => {
        useChatStore.getState().appendToLastMessage(' World');
      });

      expect(useChatStore.getState().messages[1].content).toBe('Hello World');
    });

    it('should not append if last message is not assistant', () => {
      const messages = [
        createMockMessage({ id: 'msg-1', role: 'assistant', content: 'AI' }),
        createMockMessage({ id: 'msg-2', role: 'user', content: 'User' }),
      ];

      act(() => {
        useChatStore.getState().setMessages(messages);
      });

      act(() => {
        useChatStore.getState().appendToLastMessage(' appended');
      });

      expect(useChatStore.getState().messages[1].content).toBe('User');
    });
  });

  describe('updateToolInvocation', () => {
    it('should update tool invocation in message parts', () => {
      const message: UIMessage = {
        id: 'msg-1',
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        parts: [
          {
            type: 'tool-invocation',
            toolCallId: 'tool-1',
            toolName: 'test-tool',
            args: {},
            state: 'input-available',
          },
        ],
      };

      act(() => {
        useChatStore.getState().setMessages([message]);
      });

      act(() => {
        useChatStore.getState().updateToolInvocation('msg-1', 'tool-1', {
          state: 'output-available',
          result: { success: true },
        });
      });

      const updatedParts = useChatStore.getState().messages[0].parts;
      expect(updatedParts?.[0]).toMatchObject({
        state: 'output-available',
        result: { success: true },
      });
    });
  });

  describe('selectors', () => {
    it('should select messages', () => {
      const messages = [createMockMessage()];
      
      act(() => {
        useChatStore.getState().setMessages(messages);
      });
      
      expect(selectMessages(useChatStore.getState())).toEqual(messages);
    });

    it('should select isLoading', () => {
      act(() => {
        useChatStore.getState().setLoading(true);
      });
      
      expect(selectIsLoading(useChatStore.getState())).toBe(true);
    });

    it('should select isStreaming', () => {
      act(() => {
        useChatStore.getState().setStreaming(true);
      });
      
      expect(selectIsStreaming(useChatStore.getState())).toBe(true);
    });

    it('should select error', () => {
      act(() => {
        useChatStore.getState().setError('Test error');
      });
      
      expect(selectError(useChatStore.getState())).toBe('Test error');
    });
  });
});
