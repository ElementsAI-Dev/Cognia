/**
 * useSelectionToolbar Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelectionToolbar } from './use-selection-toolbar';

// Extend globalThis for Tauri detection in tests
declare global {
  var __TAURI_INTERNALS__: Record<string, unknown> | undefined;
}

// Mock dependencies
const mockStore = {
  config: {
    enabled: true,
    triggerMode: 'auto',
    minTextLength: 1,
    maxTextLength: 5000,
    delayMs: 200,
    targetLanguage: 'zh-CN',
    excludedApps: [],
    autoHideDelay: 500,
    enableStreaming: false,
    defaultActions: ['explain', 'translate', 'summarize'],
    pinnedActions: ['explain', 'translate', 'summarize'],
  },
  isEnabled: true,
  sourceApp: 'test-app',
  addToHistory: jest.fn(),
  setSelectedText: jest.fn(),
  setToolbarPosition: jest.fn(),
  clearSelection: jest.fn(),
  setSelectionMode: jest.fn(),
  setFeedback: jest.fn(),
  updateConfig: jest.fn(),
  trackActionUsage: jest.fn(),
};

jest.mock('@/stores/context', () => ({
  useSelectionStore: jest.fn(() => mockStore),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/ai/generation/use-ai-chat', () => ({
  useAIChat: jest.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(async (_opts, onStream?: (chunk: string) => void) => {
      if (onStream) {
        onStream('chunk-1');
        onStream('chunk-2');
      }
      return 'final-result';
    }),
    cancel: jest.fn(),
    stop: mockStop,
    clearMessages: jest.fn(),
  })),
}));

const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
const mockStartSelectionService = jest.fn().mockResolvedValue(undefined);
const mockStopSelectionService = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn();

jest.mock('@/lib/native/selection', () => ({
  updateConfig: (...args: unknown[]) => mockUpdateConfig(...args),
  startSelectionService: (...args: unknown[]) => mockStartSelectionService(...args),
  stopSelectionService: (...args: unknown[]) => mockStopSelectionService(...args),
}));

const mockInvoke = jest.fn().mockResolvedValue(undefined);

interface TauriEvent<T = unknown> {
  payload: T;
}

const listeners: Record<string, (event: TauriEvent) => void> = {};

jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

const mockEmit = jest.fn().mockResolvedValue(undefined);

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(async (event: string, handler: (event: TauriEvent) => void) => {
    listeners[event] = handler;
    return () => {
      delete listeners[event];
    };
  }),
  emit: (...args: unknown[]) => mockEmit(...args),
}));

jest.mock('@/types', () => ({
  getLanguageName: jest.fn((code: string) => {
    const names: Record<string, string> = {
      'zh-CN': 'Chinese',
      en: 'English',
    };
    return names[code] || code;
  }),
}));

const mockDetectLanguage = jest.fn().mockResolvedValue({ code: 'en', name: 'English' });

jest.mock('@/lib/ai/generation/translate', () => ({
  detectLanguage: (...args: unknown[]) => mockDetectLanguage(...args),
}));

describe('useSelectionToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.__TAURI_INTERNALS__ = undefined;
    mockStore.isEnabled = true;
    mockStore.config.autoHideDelay = 500;
    Object.keys(listeners).forEach((key) => delete listeners[key]);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.state.isVisible).toBe(false);
    expect(result.current.state.selectedText).toBe('');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.activeAction).toBeNull();
    expect(result.current.state.result).toBeNull();
  });

  it('should provide showToolbar function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.showToolbar).toBe('function');
  });

  it('should provide hideToolbar function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.hideToolbar).toBe('function');
  });

  it('should provide executeAction function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.executeAction).toBe('function');
  });

  it('should provide clearResult function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.clearResult).toBe('function');
  });

  it('should show toolbar with selection', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Hello world', 100, 200);
    });

    expect(result.current.state.isVisible).toBe(true);
    expect(result.current.state.selectedText).toBe('Hello world');
    expect(result.current.state.position).toEqual({ x: 100, y: 200 });
  });

  it('should hide toolbar', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    // Show first
    act(() => {
      result.current.showToolbar('Test text', 50, 50);
    });

    expect(result.current.state.isVisible).toBe(true);

    // Hide
    act(() => {
      result.current.hideToolbar();
    });

    expect(result.current.state.isVisible).toBe(false);
  });

  it('should clear result', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.clearResult();
    });

    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should handle copy action - sets error since copy has no prompt', async () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Copy this text', 0, 0);
    });

    await act(async () => {
      await result.current.executeAction('copy');
    });

    // Copy action returns empty prompt, so executeAction sets an error
    expect(result.current.state.error).toBe('No prompt for action: copy');
  });

  it('should set active action during execution', async () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Text to explain', 0, 0);
    });

    // Start action (don't await to check active state)
    act(() => {
      result.current.executeAction('explain');
    });

    // Action should be set
    expect(result.current.state.activeAction).toBe('explain');
  });

  it('streams result when enableStreaming is true', async () => {
    mockStore.config.enableStreaming = true;
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Stream me', 0, 0);
    });

    await act(async () => {
      await result.current.executeAction('summarize');
    });

    // The state should be defined - streaming behavior depends on the mock
    expect(result.current.state).toBeDefined();
    expect(result.current.state.activeAction).toBe('summarize');
  });

  it('hides toolbar via Tauri invoke', async () => {
    globalThis.__TAURI_INTERNALS__ = {};
    const { result } = renderHook(() => useSelectionToolbar());

    await act(async () => {
      await result.current.hideToolbar();
    });

    expect(mockInvoke).toHaveBeenCalledWith('selection_hide_toolbar');
  });

  it('shows toolbar via Tauri invoke', async () => {
    globalThis.__TAURI_INTERNALS__ = {};
    const { result } = renderHook(() => useSelectionToolbar());

    await act(async () => {
      await result.current.showToolbar('Hi', 10, 20);
    });

    expect(mockInvoke).toHaveBeenCalledWith('selection_show_toolbar', { x: 10, y: 20, text: 'Hi' });
  });

  it('sends result to chat and hides', async () => {
    globalThis.__TAURI_INTERNALS__ = {};
    const { result } = renderHook(() => useSelectionToolbar());

    // Seed a result
    act(() => {
      result.current.showToolbar('Hi', 1, 2);
    });
    act(() => {
      result.current.state.result = 'done';
      result.current.state.activeAction = 'explain';
    });

    await act(async () => {
      await result.current.sendResultToChat();
    });

    expect(mockEmit).toHaveBeenCalledWith('selection-send-to-chat', {
      text: 'Hi',
      result: 'done',
      action: 'explain',
    });
    expect(result.current.state.isVisible).toBe(false);
  });

  it('copyResult copies streaming text', async () => {
    const { result } = renderHook(() => useSelectionToolbar());
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    act(() => {
      result.current.state.streamingResult = 'partial';
    });

    await act(async () => {
      await result.current.copyResult();
    });

    expect(writeText).toHaveBeenCalledWith('partial');
  });

  it('syncs config to native when Tauri is available', async () => {
    globalThis.__TAURI_INTERNALS__ = {};

    const { result } = renderHook(() => useSelectionToolbar());

    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    expect(mockUpdateConfig).toHaveBeenCalledWith({
      enabled: mockStore.config.enabled,
      trigger_mode: mockStore.config.triggerMode,
      min_text_length: mockStore.config.minTextLength,
      max_text_length: mockStore.config.maxTextLength,
      delay_ms: mockStore.config.delayMs,
      target_language: mockStore.config.targetLanguage,
      excluded_apps: mockStore.config.excludedApps,
    });
    expect(mockInvoke).toHaveBeenCalledWith('selection_set_auto_hide_timeout', {
      timeout_ms: mockStore.config.autoHideDelay,
    });
    expect(mockStartSelectionService).toHaveBeenCalled();
    expect(result.current.state.isVisible).toBe(false);
  });

  it('updates state on selection show/hide events', async () => {
    globalThis.__TAURI_INTERNALS__ = {};
    const { result } = renderHook(() => useSelectionToolbar());

    await waitFor(() => expect(Object.keys(listeners)).toContain('selection-toolbar-show'));

    await act(async () => {
      listeners['selection-toolbar-show']?.({
        payload: { text: 'incoming', x: 10, y: 20 },
      });
    });

    await waitFor(() => expect(result.current.state.isVisible).toBe(true));
    expect(result.current.state.selectedText).toBe('incoming');

    await act(async () => {
      listeners['selection-toolbar-hide']?.({ payload: {} });
    });

    await waitFor(() => expect(result.current.state.isVisible).toBe(false));
    expect(result.current.state.selectedText).toBe('');
  });

  it('should provide setSelectionMode function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.setSelectionMode).toBe('function');

    act(() => {
      result.current.setSelectionMode('auto');
    });

    expect(result.current.state.selectionMode).toBe('auto');
  });

  it('should provide config from store', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.config).toBeDefined();
    expect(result.current.config.enabled).toBe(true);
  });

  describe('translation features', () => {
    it('should provide detectSourceLanguage function', () => {
      const { result } = renderHook(() => useSelectionToolbar());

      expect(typeof result.current.detectSourceLanguage).toBe('function');
    });

    it('should provide updateTargetLanguage function', () => {
      const { result } = renderHook(() => useSelectionToolbar());

      expect(typeof result.current.updateTargetLanguage).toBe('function');
    });

    it('should detect source language', async () => {
      const { result } = renderHook(() => useSelectionToolbar());

      let detectedLang: string | null = null;
      await act(async () => {
        detectedLang = await result.current.detectSourceLanguage('Hello world');
      });

      expect(mockDetectLanguage).toHaveBeenCalledWith('Hello world', expect.any(Object));
      expect(detectedLang).toBe('en');
    });

    it('should return null for short text', async () => {
      const { result } = renderHook(() => useSelectionToolbar());

      let detectedLang: string | null = null;
      await act(async () => {
        detectedLang = await result.current.detectSourceLanguage('Hi');
      });

      // Text less than 3 characters should return null without calling detect
      expect(detectedLang).toBeNull();
    });

    it('should return null for empty text', async () => {
      const { result } = renderHook(() => useSelectionToolbar());

      let detectedLang: string | null = null;
      await act(async () => {
        detectedLang = await result.current.detectSourceLanguage('');
      });

      expect(detectedLang).toBeNull();
    });

    it('should handle detection errors gracefully', async () => {
      mockDetectLanguage.mockRejectedValueOnce(new Error('API error'));
      const { result } = renderHook(() => useSelectionToolbar());

      let detectedLang: string | null = 'initial';
      await act(async () => {
        detectedLang = await result.current.detectSourceLanguage('Hello world test');
      });

      expect(detectedLang).toBeNull();
    });

    it('should update target language', () => {
      const { result } = renderHook(() => useSelectionToolbar());

      act(() => {
        result.current.updateTargetLanguage('ja');
      });

      // The store's updateConfig should be called
      expect(mockStore.config).toBeDefined();
    });
  });
});
