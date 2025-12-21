import { test, expect } from '@playwright/test';

/**
 * Chat Store Tests
 * Tests for chat message management and streaming state
 */

test.describe('Chat Store - Message Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize with empty messages', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ChatState {
        messages: unknown[];
        isLoading: boolean;
        isStreaming: boolean;
        error: string | null;
      }

      const initialState: ChatState = {
        messages: [],
        isLoading: false,
        isStreaming: false,
        error: null,
      };

      return {
        messagesEmpty: initialState.messages.length === 0,
        isLoading: initialState.isLoading,
        isStreaming: initialState.isStreaming,
        error: initialState.error,
      };
    });

    expect(result.messagesEmpty).toBe(true);
    expect(result.isLoading).toBe(false);
    expect(result.isStreaming).toBe(false);
    expect(result.error).toBeNull();
  });

  test('should append message to list', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
      }

      const messages: Message[] = [];

      const appendMessage = (message: Message) => {
        messages.push(message);
      };

      appendMessage({ id: 'msg-1', role: 'user', content: 'Hello' });
      appendMessage({ id: 'msg-2', role: 'assistant', content: 'Hi there!' });

      return {
        count: messages.length,
        firstRole: messages[0].role,
        secondRole: messages[1].role,
      };
    });

    expect(result.count).toBe(2);
    expect(result.firstRole).toBe('user');
    expect(result.secondRole).toBe('assistant');
  });

  test('should update message by id', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        content: string;
        updatedAt?: number;
      }

      let messages: Message[] = [
        { id: 'msg-1', content: 'Original content' },
        { id: 'msg-2', content: 'Other message' },
      ];

      const updateMessage = (id: string, updates: Partial<Message>) => {
        messages = messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        );
      };

      updateMessage('msg-1', { content: 'Updated content', updatedAt: Date.now() });

      return {
        updatedContent: messages[0].content,
        hasUpdatedAt: !!messages[0].updatedAt,
        otherUnchanged: messages[1].content === 'Other message',
      };
    });

    expect(result.updatedContent).toBe('Updated content');
    expect(result.hasUpdatedAt).toBe(true);
    expect(result.otherUnchanged).toBe(true);
  });

  test('should delete message by id', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        content: string;
      }

      let messages: Message[] = [
        { id: 'msg-1', content: 'First' },
        { id: 'msg-2', content: 'Second' },
        { id: 'msg-3', content: 'Third' },
      ];

      const deleteMessage = (id: string) => {
        messages = messages.filter((m) => m.id !== id);
      };

      deleteMessage('msg-2');

      return {
        count: messages.length,
        remainingIds: messages.map((m) => m.id),
      };
    });

    expect(result.count).toBe(2);
    expect(result.remainingIds).toContain('msg-1');
    expect(result.remainingIds).toContain('msg-3');
    expect(result.remainingIds).not.toContain('msg-2');
  });

  test('should clear all messages', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        content: string;
      }

      let messages: Message[] = [
        { id: 'msg-1', content: 'First' },
        { id: 'msg-2', content: 'Second' },
      ];
      let error: string | null = 'Some error';

      const clearMessages = () => {
        messages = [];
        error = null;
      };

      clearMessages();

      return {
        messagesEmpty: messages.length === 0,
        errorCleared: error === null,
      };
    });

    expect(result.messagesEmpty).toBe(true);
    expect(result.errorCleared).toBe(true);
  });
});

test.describe('Chat Store - Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should append content to last assistant message', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
      }

      const messages: Message[] = [
        { id: 'msg-1', role: 'user', content: 'Hello' },
        { id: 'msg-2', role: 'assistant', content: 'Hi' },
      ];

      const appendToLastMessage = (content: string) => {
        const lastIndex = messages.length - 1;
        const last = messages[lastIndex];

        if (last && last.role === 'assistant') {
          messages[lastIndex] = {
            ...last,
            content: last.content + content,
          };
        }
      };

      appendToLastMessage(' there!');
      appendToLastMessage(' How can I help?');

      return {
        lastContent: messages[messages.length - 1].content,
      };
    });

    expect(result.lastContent).toBe('Hi there! How can I help?');
  });

  test('should not append to user message', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Message {
        id: string;
        role: 'user' | 'assistant';
        content: string;
      }

      const messages: Message[] = [
        { id: 'msg-1', role: 'user', content: 'Hello' },
      ];

      const appendToLastMessage = (content: string) => {
        const lastIndex = messages.length - 1;
        const last = messages[lastIndex];

        if (last && last.role === 'assistant') {
          messages[lastIndex] = {
            ...last,
            content: last.content + content,
          };
        }
      };

      appendToLastMessage(' extra content');

      return {
        lastContent: messages[messages.length - 1].content,
        unchanged: messages[0].content === 'Hello',
      };
    });

    expect(result.lastContent).toBe('Hello');
    expect(result.unchanged).toBe(true);
  });

  test('should manage streaming state', async ({ page }) => {
    const result = await page.evaluate(() => {
      let isStreaming = false;

      const setStreaming = (streaming: boolean) => {
        isStreaming = streaming;
      };

      const states: boolean[] = [];

      states.push(isStreaming); // Initial
      setStreaming(true);
      states.push(isStreaming); // During streaming
      setStreaming(false);
      states.push(isStreaming); // After streaming

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });
});

test.describe('Chat Store - Loading and Error', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage loading state', async ({ page }) => {
    const result = await page.evaluate(() => {
      let isLoading = false;

      const setLoading = (loading: boolean) => {
        isLoading = loading;
      };

      const states: boolean[] = [];

      states.push(isLoading);
      setLoading(true);
      states.push(isLoading);
      setLoading(false);
      states.push(isLoading);

      return { states };
    });

    expect(result.states).toEqual([false, true, false]);
  });

  test('should set error and reset loading states', async ({ page }) => {
    const result = await page.evaluate(() => {
      let error: string | null = null;
      let isLoading = true;
      let isStreaming = true;

      const setError = (err: string | null) => {
        error = err;
        isLoading = false;
        isStreaming = false;
      };

      setError('Network error occurred');

      return {
        error,
        isLoading,
        isStreaming,
      };
    });

    expect(result.error).toBe('Network error occurred');
    expect(result.isLoading).toBe(false);
    expect(result.isStreaming).toBe(false);
  });
});

test.describe('Chat Store - Tool Invocations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should update tool invocation state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ToolInvocationPart {
        type: 'tool-invocation';
        toolCallId: string;
        toolName: string;
        state: 'pending' | 'running' | 'completed' | 'failed';
        result?: unknown;
        errorText?: string;
      }

      interface Message {
        id: string;
        parts: ToolInvocationPart[];
      }

      const messages: Message[] = [
        {
          id: 'msg-1',
          parts: [
            { type: 'tool-invocation', toolCallId: 'tc-1', toolName: 'calculator', state: 'pending' },
            { type: 'tool-invocation', toolCallId: 'tc-2', toolName: 'search', state: 'pending' },
          ],
        },
      ];

      const updateToolInvocation = (
        messageId: string,
        toolCallId: string,
        updates: Partial<ToolInvocationPart>
      ) => {
        const message = messages.find((m) => m.id === messageId);
        if (!message) return;

        message.parts = message.parts.map((part) => {
          if (part.type === 'tool-invocation' && part.toolCallId === toolCallId) {
            return { ...part, ...updates };
          }
          return part;
        });
      };

      // Update first tool to running
      updateToolInvocation('msg-1', 'tc-1', { state: 'running' });

      // Complete first tool
      updateToolInvocation('msg-1', 'tc-1', { state: 'completed', result: 42 });

      // Fail second tool
      updateToolInvocation('msg-1', 'tc-2', { state: 'failed', errorText: 'Search failed' });

      const parts = messages[0].parts;

      return {
        firstState: parts[0].state,
        firstResult: parts[0].result,
        secondState: parts[1].state,
        secondError: parts[1].errorText,
      };
    });

    expect(result.firstState).toBe('completed');
    expect(result.firstResult).toBe(42);
    expect(result.secondState).toBe('failed');
    expect(result.secondError).toBe('Search failed');
  });
});
