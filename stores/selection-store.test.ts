/**
 * Tests for selection-store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useSelectionStore,
  selectConfig,
  selectIsEnabled,
  selectIsToolbarVisible,
  selectSelectedText,
  selectIsProcessing,
  selectResult,
  selectError,
  selectHistory,
} from './selection-store';

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-1234';
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => mockUUID,
  },
});

describe('useSelectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSelectionStore());
    act(() => {
      result.current.resetConfig();
      result.current.hideToolbar();
      result.current.clearHistory();
      result.current.setEnabled(true);
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSelectionStore());

      expect(result.current.isEnabled).toBe(true);
      expect(result.current.isToolbarVisible).toBe(false);
      expect(result.current.selectedText).toBe('');
      expect(result.current.position).toEqual({ x: 0, y: 0 });
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentAction).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.history).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update config partially', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({ enabled: false });
      });

      expect(result.current.config.enabled).toBe(false);
    });

    it('should preserve other config values', () => {
      const { result } = renderHook(() => useSelectionStore());
      const originalConfig = { ...result.current.config };

      act(() => {
        result.current.updateConfig({ enabled: false });
      });

      expect(result.current.config.enabled).toBe(false);
      // Other values should remain unchanged
      expect(result.current.config.triggerMode).toBe(originalConfig.triggerMode);
    });

    it('should update multiple config values', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({ 
          minTextLength: 5,
          maxTextLength: 1000,
          delayMs: 500,
        });
      });

      expect(result.current.config.minTextLength).toBe(5);
      expect(result.current.config.maxTextLength).toBe(1000);
      expect(result.current.config.delayMs).toBe(500);
    });
  });

  describe('resetConfig', () => {
    it('should reset config to defaults', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.updateConfig({ enabled: false, minTextLength: 100 });
        result.current.resetConfig();
      });

      expect(result.current.config.enabled).toBe(true);
      expect(result.current.config.minTextLength).toBe(1);
    });
  });

  describe('setEnabled', () => {
    it('should set enabled state', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should toggle enabled state', () => {
      const { result } = renderHook(() => useSelectionStore());

      expect(result.current.isEnabled).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isEnabled).toBe(true);
    });
  });

  describe('showToolbar', () => {
    it('should show toolbar with text and position', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.showToolbar('selected text', 100, 200);
      });

      expect(result.current.isToolbarVisible).toBe(true);
      expect(result.current.selectedText).toBe('selected text');
      expect(result.current.position).toEqual({ x: 100, y: 200 });
    });

    it('should reset result and error when showing toolbar', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setResult('previous result');
        result.current.setError('previous error');
        result.current.showToolbar('new text', 0, 0);
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('hideToolbar', () => {
    it('should hide toolbar and reset state', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.showToolbar('text', 100, 200);
        result.current.setResult('result');
        result.current.hideToolbar();
      });

      expect(result.current.isToolbarVisible).toBe(false);
      expect(result.current.selectedText).toBe('');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('setProcessing', () => {
    it('should set processing state with action', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.currentAction).toBe('explain');
    });

    it('should clear processing state when action is null', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setProcessing(null);
      });

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('setResult', () => {
    it('should set result and clear processing', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setResult('explanation result');
      });

      expect(result.current.result).toBe('explanation result');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear processing', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setProcessing('explain');
        result.current.setError('something went wrong');
      });

      expect(result.current.error).toBe('something went wrong');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('clearResult', () => {
    it('should clear result, error, and current action', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.setResult('result');
        result.current.setError('error');
        result.current.setProcessing('explain');
        result.current.clearResult();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.currentAction).toBeNull();
    });
  });

  describe('addToHistory', () => {
    it('should add item to history with id and timestamp', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({
          text: 'selected text',
          action: 'explain',
          result: 'explanation',
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0]).toMatchObject({
        id: mockUUID,
        text: 'selected text',
        action: 'explain',
        result: 'explanation',
      });
      expect(result.current.history[0].timestamp).toBeDefined();
    });

    it('should prepend new items to history', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({ text: 'first', action: 'explain', result: 'r1' });
        result.current.addToHistory({ text: 'second', action: 'translate', result: 'r2' });
      });

      expect(result.current.history).toHaveLength(2);
      expect(result.current.history[0].text).toBe('second');
      expect(result.current.history[1].text).toBe('first');
    });

    it('should limit history to 100 items', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        for (let i = 0; i < 105; i++) {
          result.current.addToHistory({
            text: `text ${i}`,
            action: 'explain',
            result: `result ${i}`,
          });
        }
      });

      expect(result.current.history).toHaveLength(100);
      expect(result.current.history[0].text).toBe('text 104');
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => useSelectionStore());

      act(() => {
        result.current.addToHistory({ text: 'text1', action: 'explain', result: 'r1' });
        result.current.addToHistory({ text: 'text2', action: 'translate', result: 'r2' });
        result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
    });
  });

  describe('selectors', () => {
    it('selectConfig should return config', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectConfig(state)).toBe(state.config);
    });

    it('selectIsEnabled should return isEnabled', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsEnabled(state)).toBe(state.isEnabled);
    });

    it('selectIsToolbarVisible should return isToolbarVisible', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsToolbarVisible(state)).toBe(state.isToolbarVisible);
    });

    it('selectSelectedText should return selectedText', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectSelectedText(state)).toBe(state.selectedText);
    });

    it('selectIsProcessing should return isProcessing', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectIsProcessing(state)).toBe(state.isProcessing);
    });

    it('selectResult should return result', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectResult(state)).toBe(state.result);
    });

    it('selectError should return error', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectError(state)).toBe(state.error);
    });

    it('selectHistory should return history', () => {
      const { result } = renderHook(() => useSelectionStore());
      const state = result.current;
      expect(selectHistory(state)).toBe(state.history);
    });
  });
});
