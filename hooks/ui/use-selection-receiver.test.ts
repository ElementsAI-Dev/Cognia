/**
 * Tests for useSelectionReceiver hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSelectionReceiver } from './use-selection-receiver';

// Mock isTauri
const mockIsTauri = jest.fn(() => false);
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

interface TauriEvent<T = unknown> {
  payload: T;
}

const listeners: Record<string, (event: TauriEvent) => void> = {};

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(async (event: string, handler: (event: TauriEvent) => void) => {
    listeners[event] = handler;
    return () => delete listeners[event];
  }),
}));

const mockSetFocus = jest.fn(async () => undefined);
const mockUnminimize = jest.fn(async () => undefined);
jest.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    setFocus: mockSetFocus,
    unminimize: mockUnminimize,
  }),
}));

describe('useSelectionReceiver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
    Object.keys(listeners).forEach((key) => delete listeners[key]);
  });

  describe('initialization', () => {
    it('should initialize with null pending state', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      expect(result.current.pendingText).toBeNull();
      expect(result.current.pendingAction).toBeNull();
    });

    it('should provide clearPending function', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      expect(typeof result.current.clearPending).toBe('function');
    });

    it('should provide formatPrompt function', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      expect(typeof result.current.formatPrompt).toBe('function');
    });
  });

  describe('formatPrompt', () => {
    it('should format text for translate action', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      const formatted = result.current.formatPrompt('Hello World', 'translate');

      expect(formatted).toContain('Hello World');
      expect(formatted).toContain('翻译');
    });

    it('should format text for explain action', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      const formatted = result.current.formatPrompt('Complex concept', 'explain');

      expect(formatted).toContain('Complex concept');
      expect(formatted).toContain('解释');
    });

    it('should return original text for unknown action', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      const formatted = result.current.formatPrompt('Some text', 'unknown');

      expect(formatted).toBe('Some text');
    });

    it('should return original text when no action specified', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      const formatted = result.current.formatPrompt('Some text');

      expect(formatted).toBe('Some text');
    });
  });

  describe('clearPending', () => {
    it('should clear pending text and action', () => {
      const { result } = renderHook(() => useSelectionReceiver());

      // Simulate some pending state (would be set by Tauri events in real usage)
      act(() => {
        result.current.clearPending();
      });

      expect(result.current.pendingText).toBeNull();
      expect(result.current.pendingAction).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should accept onTextReceived callback', () => {
      const onTextReceived = jest.fn();

      const { result } = renderHook(() =>
        useSelectionReceiver({ onTextReceived })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onTranslateRequest callback', () => {
      const onTranslateRequest = jest.fn();

      const { result } = renderHook(() =>
        useSelectionReceiver({ onTranslateRequest })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onExplainRequest callback', () => {
      const onExplainRequest = jest.fn();

      const { result } = renderHook(() =>
        useSelectionReceiver({ onExplainRequest })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('options', () => {
    it('should accept autoFocus option', () => {
      const { result } = renderHook(() =>
        useSelectionReceiver({ autoFocus: false })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('tauri events', () => {
    it('handles send-to-chat event and focuses window', async () => {
      mockIsTauri.mockReturnValue(true);
      const { result } = renderHook(() => useSelectionReceiver());

      await waitFor(() => expect(Object.keys(listeners)).toContain('selection-send-to-chat'));

      await act(async () => {
        listeners['selection-send-to-chat']?.({ payload: { text: 'from-tauri' } });
      });

      expect(result.current.pendingText).toBe('from-tauri');
      expect(mockSetFocus).toHaveBeenCalled();
      expect(mockUnminimize).toHaveBeenCalled();
    });

    it('triggers quick translate callback', async () => {
      mockIsTauri.mockReturnValue(true);
      const onTranslateRequest = jest.fn();
      renderHook(() => useSelectionReceiver({ onTranslateRequest }));

      await waitFor(() => expect(Object.keys(listeners)).toContain('selection-quick-translate'));

      await act(async () => {
        listeners['selection-quick-translate']?.({ payload: { text: '需要翻译' } });
      });

      expect(onTranslateRequest).toHaveBeenCalledWith('需要翻译');
    });

    it('triggers quick explain callback', async () => {
      mockIsTauri.mockReturnValue(true);
      const onExplainRequest = jest.fn();
      renderHook(() => useSelectionReceiver({ onExplainRequest }));

      await waitFor(() => expect(Object.keys(listeners)).toContain('selection-quick-explain'));

      await act(async () => {
        listeners['selection-quick-explain']?.({ payload: { text: '需要解释' } });
      });

      expect(onExplainRequest).toHaveBeenCalledWith('需要解释');
    });
  });
});
