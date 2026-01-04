/**
 * Tests for useSummaryShortcuts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useSummaryShortcuts } from './use-summary-shortcuts';

// Mock navigator.platform
Object.defineProperty(navigator, 'platform', {
  value: 'Win32',
  writable: true,
});

describe('useSummaryShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return shortcuts info', () => {
      const { result } = renderHook(() => useSummaryShortcuts());

      expect(result.current.shortcuts).toBeDefined();
      expect(result.current.shortcuts.summary).toBeDefined();
      expect(result.current.shortcuts.diagram).toBeDefined();
    });

    it('should have correct summary shortcut config', () => {
      const { result } = renderHook(() => useSummaryShortcuts());

      expect(result.current.shortcuts.summary.key).toBe('S');
      expect(result.current.shortcuts.summary.modifiers).toContain('Ctrl/Cmd');
      expect(result.current.shortcuts.summary.modifiers).toContain('Shift');
    });

    it('should have correct diagram shortcut config', () => {
      const { result } = renderHook(() => useSummaryShortcuts());

      expect(result.current.shortcuts.diagram.key).toBe('D');
      expect(result.current.shortcuts.diagram.modifiers).toContain('Ctrl/Cmd');
      expect(result.current.shortcuts.diagram.modifiers).toContain('Shift');
    });
  });

  describe('summary shortcut', () => {
    it('should trigger onSummaryShortcut on Ctrl+Shift+S', () => {
      const onSummaryShortcut = jest.fn();

      renderHook(() => useSummaryShortcuts({ onSummaryShortcut }));

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).toHaveBeenCalled();
    });

    it('should not trigger without Shift', () => {
      const onSummaryShortcut = jest.fn();

      renderHook(() => useSummaryShortcuts({ onSummaryShortcut }));

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          shiftKey: false,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).not.toHaveBeenCalled();
    });

    it('should not trigger without Ctrl', () => {
      const onSummaryShortcut = jest.fn();

      renderHook(() => useSummaryShortcuts({ onSummaryShortcut }));

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: false,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).not.toHaveBeenCalled();
    });
  });

  describe('diagram shortcut', () => {
    it('should trigger onDiagramShortcut on Ctrl+Shift+D', () => {
      const onDiagramShortcut = jest.fn();

      renderHook(() => useSummaryShortcuts({ onDiagramShortcut }));

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'd',
          ctrlKey: true,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onDiagramShortcut).toHaveBeenCalled();
    });
  });

  describe('enabled option', () => {
    it('should not trigger shortcuts when disabled', () => {
      const onSummaryShortcut = jest.fn();
      const onDiagramShortcut = jest.fn();

      renderHook(() =>
        useSummaryShortcuts({
          onSummaryShortcut,
          onDiagramShortcut,
          enabled: false,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).not.toHaveBeenCalled();
    });

    it('should trigger shortcuts when enabled', () => {
      const onSummaryShortcut = jest.fn();

      renderHook(() =>
        useSummaryShortcuts({
          onSummaryShortcut,
          enabled: true,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).toHaveBeenCalled();
    });
  });

  describe('Mac support', () => {
    it('should use metaKey on Mac', () => {
      // Mock Mac platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        writable: true,
      });

      const onSummaryShortcut = jest.fn();

      renderHook(() => useSummaryShortcuts({ onSummaryShortcut }));

      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          metaKey: true,
          shiftKey: true,
        });
        document.dispatchEvent(event);
      });

      expect(onSummaryShortcut).toHaveBeenCalled();

      // Reset platform
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        writable: true,
      });
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useSummaryShortcuts());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
