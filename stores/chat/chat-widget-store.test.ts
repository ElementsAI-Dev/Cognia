/**
 * Tests for Chat Widget Store
 */

import { act } from '@testing-library/react';
import {
  useChatWidgetStore,
  selectChatWidgetMessages,
  selectChatWidgetConfig,
  selectChatWidgetIsVisible,
  selectChatWidgetIsLoading,
} from './chat-widget-store';

// Mock nanoid
jest.mock('nanoid', () => ({ nanoid: () => `test-${Date.now()}-${Math.random()}` }));

describe('useChatWidgetStore', () => {
  beforeEach(() => {
    const { newSession } = useChatWidgetStore.getState();
    act(() => {
      newSession();
      useChatWidgetStore.setState({
        isVisible: false,
        isLoading: false,
        isStreaming: false,
        error: null,
        inputValue: '',
      });
    });
  });

  describe('visibility', () => {
    it('should show the widget', () => {
      act(() => {
        useChatWidgetStore.getState().show();
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(true);
    });

    it('should hide the widget', () => {
      act(() => {
        useChatWidgetStore.getState().show();
        useChatWidgetStore.getState().hide();
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(false);
    });

    it('should toggle visibility', () => {
      act(() => {
        useChatWidgetStore.getState().toggle();
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(true);
      act(() => {
        useChatWidgetStore.getState().toggle();
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(false);
    });

    it('should set visibility directly', () => {
      act(() => {
        useChatWidgetStore.getState().setVisible(true);
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(true);
    });
  });

  describe('messages', () => {
    it('should add a message', () => {
      act(() => {
        useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Hello' });
      });
      expect(useChatWidgetStore.getState().messages).toHaveLength(1);
      expect(useChatWidgetStore.getState().messages[0].content).toBe('Hello');
    });

    it('should update a message', () => {
      let messageId: string;
      act(() => {
        messageId = useChatWidgetStore.getState().addMessage({ role: 'assistant', content: 'Hi' });
      });
      act(() => {
        useChatWidgetStore.getState().updateMessage(messageId!, { content: 'Hello there' });
      });
      expect(useChatWidgetStore.getState().messages[0].content).toBe('Hello there');
    });

    it('should delete a message', () => {
      let messageId: string;
      act(() => {
        messageId = useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Test' });
      });
      act(() => {
        useChatWidgetStore.getState().deleteMessage(messageId!);
      });
      expect(useChatWidgetStore.getState().messages).toHaveLength(0);
    });

    it('should delete messages after a specific message', () => {
      let firstId: string;
      act(() => {
        firstId = useChatWidgetStore.getState().addMessage({ role: 'user', content: 'First' });
        useChatWidgetStore.getState().addMessage({ role: 'assistant', content: 'Second' });
        useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Third' });
      });
      act(() => {
        useChatWidgetStore.getState().deleteMessagesAfter(firstId!);
      });
      expect(useChatWidgetStore.getState().messages).toHaveLength(1);
    });

    it('should clear all messages', () => {
      act(() => {
        useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Test' });
        useChatWidgetStore.getState().clearMessages();
      });
      expect(useChatWidgetStore.getState().messages).toHaveLength(0);
    });

    it('should set message streaming state', () => {
      let messageId: string;
      act(() => {
        messageId = useChatWidgetStore.getState().addMessage({ role: 'assistant', content: '' });
      });
      act(() => {
        useChatWidgetStore.getState().setStreaming(messageId!, true);
      });
      expect(useChatWidgetStore.getState().messages[0].isStreaming).toBe(true);
      expect(useChatWidgetStore.getState().isStreaming).toBe(true);
    });

    it('should set message feedback', () => {
      let messageId: string;
      act(() => {
        messageId = useChatWidgetStore.getState().addMessage({ role: 'assistant', content: 'Hi' });
      });
      act(() => {
        useChatWidgetStore.getState().setFeedback(messageId!, 'like');
      });
      expect(useChatWidgetStore.getState().messages[0].feedback).toBe('like');
    });

    it('should edit a message', () => {
      let messageId: string;
      act(() => {
        messageId = useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Original' });
      });
      act(() => {
        useChatWidgetStore.getState().editMessage(messageId!, 'Edited');
      });
      const msg = useChatWidgetStore.getState().messages[0];
      expect(msg.content).toBe('Edited');
      expect(msg.isEdited).toBe(true);
      expect(msg.originalContent).toBe('Original');
    });
  });

  describe('input', () => {
    it('should set input value', () => {
      act(() => {
        useChatWidgetStore.getState().setInputValue('Hello');
      });
      expect(useChatWidgetStore.getState().inputValue).toBe('Hello');
    });

    it('should clear input', () => {
      act(() => {
        useChatWidgetStore.getState().setInputValue('Hello');
        useChatWidgetStore.getState().clearInput();
      });
      expect(useChatWidgetStore.getState().inputValue).toBe('');
    });
  });

  describe('loading and error', () => {
    it('should set loading state', () => {
      act(() => {
        useChatWidgetStore.getState().setLoading(true);
      });
      expect(useChatWidgetStore.getState().isLoading).toBe(true);
    });

    it('should set error and reset loading', () => {
      act(() => {
        useChatWidgetStore.getState().setLoading(true);
        useChatWidgetStore.getState().setError('Test error');
      });
      expect(useChatWidgetStore.getState().error).toBe('Test error');
      expect(useChatWidgetStore.getState().isLoading).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update config', () => {
      act(() => {
        useChatWidgetStore.getState().updateConfig({ width: 500 });
      });
      expect(useChatWidgetStore.getState().config.width).toBe(500);
    });

    it('should reset config to defaults', () => {
      act(() => {
        useChatWidgetStore.getState().updateConfig({ width: 800 });
        useChatWidgetStore.getState().resetConfig();
      });
      expect(useChatWidgetStore.getState().config.width).toBe(420);
    });
  });

  describe('session', () => {
    it('should create new session', () => {
      const oldSessionId = useChatWidgetStore.getState().sessionId;
      act(() => {
        useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Test' });
        useChatWidgetStore.getState().newSession();
      });
      expect(useChatWidgetStore.getState().sessionId).not.toBe(oldSessionId);
      expect(useChatWidgetStore.getState().messages).toHaveLength(0);
    });

    it('should record activity', () => {
      act(() => {
        useChatWidgetStore.getState().recordActivity();
      });
      expect(useChatWidgetStore.getState().lastActivity).toBeDefined();
    });
  });

  describe('quick actions', () => {
    it('should send quick message', () => {
      act(() => {
        useChatWidgetStore.getState().sendQuickMessage('Quick test');
      });
      expect(useChatWidgetStore.getState().isVisible).toBe(true);
      expect(useChatWidgetStore.getState().inputValue).toBe('Quick test');
    });
  });

  describe('selectors', () => {
    it('should select messages', () => {
      act(() => {
        useChatWidgetStore.getState().addMessage({ role: 'user', content: 'Test' });
      });
      expect(selectChatWidgetMessages(useChatWidgetStore.getState())).toHaveLength(1);
    });

    it('should select config', () => {
      expect(selectChatWidgetConfig(useChatWidgetStore.getState())).toBeDefined();
    });

    it('should select visibility', () => {
      act(() => {
        useChatWidgetStore.getState().show();
      });
      expect(selectChatWidgetIsVisible(useChatWidgetStore.getState())).toBe(true);
    });

    it('should select loading state', () => {
      act(() => {
        useChatWidgetStore.getState().setLoading(true);
      });
      expect(selectChatWidgetIsLoading(useChatWidgetStore.getState())).toBe(true);
    });
  });
});
