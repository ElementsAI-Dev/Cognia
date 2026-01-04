/**
 * Tests for useSelectionReceiver hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSelectionReceiver } from './use-selection-receiver';

// Mock isTauri
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => false),
}));

describe('useSelectionReceiver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
