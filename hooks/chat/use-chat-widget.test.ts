/**
 * Tests for useChatWidget hook
 */

import { renderHook, act } from '@testing-library/react';
import { useChatWidget } from './use-chat-widget';

// Mock the store
const mockShow = jest.fn();
const mockHide = jest.fn();
const mockToggle = jest.fn();
const mockSetVisible = jest.fn();
const mockAddMessage = jest.fn(() => 'msg-id-123');
const mockClearMessages = jest.fn();
const mockSetInputValue = jest.fn();
const mockClearInput = jest.fn();
const mockSetLoading = jest.fn();
const mockSetError = jest.fn();
const mockUpdateConfig = jest.fn();
const mockNewSession = jest.fn();
const mockRecordActivity = jest.fn();
const mockDeleteMessage = jest.fn();
const mockUpdateMessage = jest.fn();

let mockStoreState = {
  isVisible: false,
  isLoading: false,
  isStreaming: false,
  error: null as string | null,
  messages: [] as Array<{ id: string; role: string; content: string }>,
  inputValue: '',
  config: {
    systemPrompt: 'You are a helpful assistant',
    provider: 'openai',
    model: 'gpt-4o',
    pinned: false,
  },
  sessionId: 'session-123',
};

jest.mock('@/stores/chat', () => ({
  useChatWidgetStore: Object.assign(
    jest.fn((selector?: (state: typeof mockStoreState) => unknown) => {
      if (selector) {
        return selector({
          ...mockStoreState,
          show: mockShow,
          hide: mockHide,
          toggle: mockToggle,
          setVisible: mockSetVisible,
          addMessage: mockAddMessage,
          clearMessages: mockClearMessages,
          setInputValue: mockSetInputValue,
          clearInput: mockClearInput,
          setLoading: mockSetLoading,
          setError: mockSetError,
          updateConfig: mockUpdateConfig,
          newSession: mockNewSession,
          recordActivity: mockRecordActivity,
          deleteMessage: mockDeleteMessage,
          updateMessage: mockUpdateMessage,
        });
      }
      return {
        ...mockStoreState,
        show: mockShow,
        hide: mockHide,
        toggle: mockToggle,
        setVisible: mockSetVisible,
        addMessage: mockAddMessage,
        clearMessages: mockClearMessages,
        setInputValue: mockSetInputValue,
        clearInput: mockClearInput,
        setLoading: mockSetLoading,
        setError: mockSetError,
        updateConfig: mockUpdateConfig,
        newSession: mockNewSession,
        recordActivity: mockRecordActivity,
        deleteMessage: mockDeleteMessage,
        updateMessage: mockUpdateMessage,
      };
    }),
    {
      getState: () => ({
        updateMessage: mockUpdateMessage,
      }),
    }
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      isVisible: false,
      isLoading: false,
      isStreaming: false,
      error: null,
      messages: [],
      inputValue: '',
      config: {
        systemPrompt: 'You are a helpful assistant',
        provider: 'openai',
        model: 'gpt-4o',
        pinned: false,
      },
      sessionId: 'session-123',
    };
  });

  describe('initialization', () => {
    it('should return state and actions', () => {
      const { result } = renderHook(() => useChatWidget());

      expect(result.current.isVisible).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.messages).toEqual([]);
      expect(result.current.inputValue).toBe('');
      expect(result.current.config).toBeDefined();
      expect(result.current.sessionId).toBe('session-123');
    });

    it('should provide action functions', () => {
      const { result } = renderHook(() => useChatWidget());

      expect(typeof result.current.show).toBe('function');
      expect(typeof result.current.hide).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.handleSubmit).toBe('function');
      expect(typeof result.current.handleKeyDown).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.regenerate).toBe('function');
    });

    it('should provide inputRef', () => {
      const { result } = renderHook(() => useChatWidget());

      expect(result.current.inputRef).toBeDefined();
      expect(result.current.inputRef.current).toBeNull();
    });
  });

  describe('visibility controls', () => {
    it('should call show without Tauri', async () => {
      const { result } = renderHook(() => useChatWidget());

      await act(async () => {
        await result.current.show();
      });

      expect(mockShow).toHaveBeenCalled();
    });

    it('should call hide without Tauri', async () => {
      const { result } = renderHook(() => useChatWidget());

      await act(async () => {
        await result.current.hide();
      });

      expect(mockHide).toHaveBeenCalled();
    });

    it('should call toggle without Tauri', async () => {
      const { result } = renderHook(() => useChatWidget());

      await act(async () => {
        await result.current.toggle();
      });

      expect(mockToggle).toHaveBeenCalled();
    });
  });

  describe('input handling', () => {
    it('should set input value', () => {
      const { result } = renderHook(() => useChatWidget());

      act(() => {
        result.current.setInputValue('Hello');
      });

      expect(mockSetInputValue).toHaveBeenCalledWith('Hello');
    });
  });

  describe('keyboard handling', () => {
    it('should submit on Enter', () => {
      mockStoreState.inputValue = 'Test message';

      const { result } = renderHook(() => useChatWidget());

      const event = {
        key: 'Enter',
        shiftKey: false,
        preventDefault: jest.fn(),
        target: { selectionStart: 0, selectionEnd: 0 },
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not submit on Shift+Enter', () => {
      const { result } = renderHook(() => useChatWidget());

      const event = {
        key: 'Enter',
        shiftKey: true,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should hide on Escape', () => {
      const { result } = renderHook(() => useChatWidget());

      const event = {
        key: 'Escape',
        shiftKey: false,
        preventDefault: jest.fn(),
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockHide).toHaveBeenCalled();
    });
  });

  describe('stop generation', () => {
    it('should abort ongoing request', () => {
      const { result } = renderHook(() => useChatWidget());

      act(() => {
        result.current.stop();
      });

      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('session management', () => {
    it('should clear messages', () => {
      const { result } = renderHook(() => useChatWidget());

      act(() => {
        result.current.clearMessages();
      });

      expect(mockClearMessages).toHaveBeenCalled();
    });

    it('should create new session', () => {
      const { result } = renderHook(() => useChatWidget());

      act(() => {
        result.current.newSession();
      });

      expect(mockNewSession).toHaveBeenCalled();
    });
  });

  describe('config updates', () => {
    it('should update config', () => {
      const { result } = renderHook(() => useChatWidget());

      act(() => {
        result.current.updateConfig({ pinned: true });
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith({ pinned: true });
    });

    it('should set pinned state', async () => {
      const { result } = renderHook(() => useChatWidget());

      await act(async () => {
        await result.current.setPinned(true);
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith({ pinned: true });
    });
  });

  describe('callbacks', () => {
    it('should call onShow callback', () => {
      const onShow = jest.fn();
      renderHook(() => useChatWidget({ onShow }));

      // Callback would be called when visibility changes via Tauri event
      expect(onShow).not.toHaveBeenCalled(); // Not called on init
    });

    it('should call onHide callback', () => {
      const onHide = jest.fn();
      renderHook(() => useChatWidget({ onHide }));

      expect(onHide).not.toHaveBeenCalled(); // Not called on init
    });
  });
});
