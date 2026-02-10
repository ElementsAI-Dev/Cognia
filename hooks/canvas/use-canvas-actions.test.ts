/**
 * Tests for useCanvasActions hook
 */

import { renderHook, act } from '@testing-library/react';
import { useCanvasActions } from './use-canvas-actions';

// Mock canvas-actions module
jest.mock('@/lib/ai/generation/canvas-actions', () => ({
  executeCanvasAction: jest.fn(),
  executeCanvasActionStreaming: jest.fn(),
  applyCanvasActionResult: jest.fn(),
  generateDiffPreview: jest.fn(),
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) =>
    selector({
      providerSettings: {
        openai: { apiKey: 'test-key', defaultModel: 'gpt-4o-mini' },
      },
      defaultProvider: 'openai',
    })
  ),
  useSessionStore: jest.fn((selector) =>
    selector({
      getActiveSession: () => ({ provider: 'openai', model: 'gpt-4o-mini' }),
    })
  ),
}));

const {
  executeCanvasAction,
  executeCanvasActionStreaming,
  applyCanvasActionResult,
  generateDiffPreview,
} = jest.requireMock('@/lib/ai/generation/canvas-actions');

const defaultOptions = {
  content: 'const x = 1;',
  language: 'javascript',
  selection: '',
  activeCanvasId: 'doc-1',
  onContentChange: jest.fn(),
  onGenerateSuggestions: jest.fn(),
};

describe('useCanvasActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with no processing', () => {
      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.streamingContent).toBe('');
      expect(result.current.actionError).toBeNull();
      expect(result.current.actionResult).toBeNull();
      expect(result.current.diffPreview).toBeNull();
      expect(result.current.pendingContent).toBeNull();
    });

    it('should expose handleAction, acceptDiffChanges, rejectDiffChanges', () => {
      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      expect(typeof result.current.handleAction).toBe('function');
      expect(typeof result.current.acceptDiffChanges).toBe('function');
      expect(typeof result.current.rejectDiffChanges).toBe('function');
      expect(typeof result.current.setActionError).toBe('function');
      expect(typeof result.current.setActionResult).toBe('function');
    });
  });

  describe('handleAction - no activeCanvasId', () => {
    it('should do nothing when activeCanvasId is null', async () => {
      const opts = { ...defaultOptions, activeCanvasId: null };
      const { result } = renderHook(() => useCanvasActions(opts));

      await act(async () => {
        await result.current.handleAction({ type: 'fix' });
      });

      expect(executeCanvasAction).not.toHaveBeenCalled();
      expect(executeCanvasActionStreaming).not.toHaveBeenCalled();
    });
  });

  describe('handleAction - non-streaming (review)', () => {
    it('should call executeCanvasAction for review action', async () => {
      executeCanvasAction.mockResolvedValue({
        success: true,
        result: 'Review feedback',
      });

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'review' });
      });

      expect(executeCanvasAction).toHaveBeenCalledWith(
        'review',
        defaultOptions.content,
        expect.objectContaining({ provider: 'openai' }),
        expect.any(Object)
      );
      expect(result.current.actionResult).toBe('Review feedback');
      expect(result.current.isProcessing).toBe(false);
    });

    it('should call onGenerateSuggestions for review action', async () => {
      executeCanvasAction.mockResolvedValue({
        success: true,
        result: 'Review feedback',
      });

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'review' });
      });

      expect(defaultOptions.onGenerateSuggestions).toHaveBeenCalled();
    });

    it('should set actionError on failure', async () => {
      executeCanvasAction.mockResolvedValue({
        success: false,
        error: 'Something failed',
      });

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'explain' });
      });

      expect(result.current.actionError).toBe('Something failed');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('handleAction - streaming (fix/improve)', () => {
    it('should call executeCanvasActionStreaming for content actions', async () => {
      applyCanvasActionResult.mockReturnValue('fixed content');
      generateDiffPreview.mockReturnValue([
        { type: 'removed', content: 'const x = 1;', lineNumber: 1 },
        { type: 'added', content: 'const x = 2;', lineNumber: 1 },
      ]);

      executeCanvasActionStreaming.mockImplementation(
        async (_type: string, _content: string, _config: unknown, callbacks: { onComplete: (text: string) => void }) => {
          callbacks.onComplete('fixed content');
        }
      );

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'fix' });
      });

      expect(executeCanvasActionStreaming).toHaveBeenCalled();
      expect(result.current.diffPreview).toBeDefined();
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle streaming error', async () => {
      executeCanvasActionStreaming.mockImplementation(
        async (_type: string, _content: string, _config: unknown, callbacks: { onError: (error: string) => void }) => {
          callbacks.onError('Stream failed');
        }
      );

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'improve' });
      });

      expect(result.current.actionError).toBe('Stream failed');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('handleAction - exception handling', () => {
    it('should catch thrown errors', async () => {
      executeCanvasAction.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'review' });
      });

      expect(result.current.actionError).toBe('Network error');
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('handleAction - no API key', () => {
    it('should set error when no API key configured', async () => {
      // Override the store mock for this test
      const { useSettingsStore } = jest.requireMock('@/stores');
      useSettingsStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
        selector({
          providerSettings: { openai: {} },
          defaultProvider: 'openai',
        })
      );

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'fix' });
      });

      expect(result.current.actionError).toContain('No API key configured');
      expect(result.current.isProcessing).toBe(false);

      // Restore
      useSettingsStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
        selector({
          providerSettings: {
            openai: { apiKey: 'test-key', defaultModel: 'gpt-4o-mini' },
          },
          defaultProvider: 'openai',
        })
      );
    });
  });

  describe('acceptDiffChanges', () => {
    it('should call onContentChange with pending content', async () => {
      applyCanvasActionResult.mockReturnValue('new content');
      generateDiffPreview.mockReturnValue([]);

      executeCanvasActionStreaming.mockImplementation(
        async (_type: string, _content: string, _config: unknown, callbacks: { onComplete: (text: string) => void }) => {
          callbacks.onComplete('new content');
        }
      );

      const onContentChange = jest.fn();
      const opts = { ...defaultOptions, onContentChange };
      const { result } = renderHook(() => useCanvasActions(opts));

      // Create pending content via action
      await act(async () => {
        await result.current.handleAction({ type: 'fix' });
      });

      // Accept
      act(() => {
        result.current.acceptDiffChanges();
      });

      expect(onContentChange).toHaveBeenCalledWith('new content');
      expect(result.current.diffPreview).toBeNull();
      expect(result.current.pendingContent).toBeNull();
    });
  });

  describe('rejectDiffChanges', () => {
    it('should clear diff preview and pending content', async () => {
      applyCanvasActionResult.mockReturnValue('new content');
      generateDiffPreview.mockReturnValue([{ type: 'added', content: 'x' }]);

      executeCanvasActionStreaming.mockImplementation(
        async (_type: string, _content: string, _config: unknown, callbacks: { onComplete: (text: string) => void }) => {
          callbacks.onComplete('new content');
        }
      );

      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        await result.current.handleAction({ type: 'fix' });
      });

      expect(result.current.diffPreview).not.toBeNull();

      act(() => {
        result.current.rejectDiffChanges();
      });

      expect(result.current.diffPreview).toBeNull();
      expect(result.current.pendingContent).toBeNull();
    });
  });

  describe('canvas-action custom event', () => {
    it('should respond to canvas-action custom events', async () => {
      executeCanvasAction.mockResolvedValue({
        success: true,
        result: 'Event result',
      });

      renderHook(() => useCanvasActions(defaultOptions));

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('canvas-action', {
            detail: { type: 'review' },
          })
        );
        // Wait for async handler
        await new Promise((r) => setTimeout(r, 50));
      });

      expect(executeCanvasAction).toHaveBeenCalled();
    });

    it('should clean up event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useCanvasActions(defaultOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'canvas-action',
        expect.any(Function)
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('setActionError / setActionResult', () => {
    it('should allow setting action error manually', () => {
      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      act(() => {
        result.current.setActionError('manual error');
      });

      expect(result.current.actionError).toBe('manual error');
    });

    it('should allow setting action result manually', () => {
      const { result } = renderHook(() => useCanvasActions(defaultOptions));

      act(() => {
        result.current.setActionResult('manual result');
      });

      expect(result.current.actionResult).toBe('manual result');
    });
  });
});
