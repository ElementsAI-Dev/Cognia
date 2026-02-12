/**
 * Tests for useQuoteShortcuts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useQuoteShortcuts } from './use-quote-shortcuts';

// Mock dependencies
const mockQuoteStore = {
  quotedTexts: [] as { id: string; text: string }[],
  isSelectionMode: false,
  selectedIds: new Set<string>(),
  toggleSelectionMode: jest.fn(),
  selectAll: jest.fn(),
  deselectAll: jest.fn(),
  removeSelected: jest.fn(),
  mergeSelected: jest.fn(),
  exportQuotes: jest.fn(() => 'exported text'),
  exportSelected: jest.fn(() => 'selected text'),
};

jest.mock('@/stores/chat', () => ({
  useQuoteStore: jest.fn((selector) => selector(mockQuoteStore)),
}));

jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('useQuoteShortcuts', () => {
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock store state
    mockQuoteStore.quotedTexts = [
      { id: '1', text: 'quote 1' },
      { id: '2', text: 'quote 2' },
    ];
    mockQuoteStore.isSelectionMode = false;
    mockQuoteStore.selectedIds = new Set();

    // Capture keydown handler
    jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (String(event) === 'keydown') {
        keydownHandler = handler as (e: KeyboardEvent) => void;
      }
    });

    jest.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    keydownHandler = null;
  });

  const createKeyboardEvent = (
    key: string,
    options: Partial<KeyboardEvent> = {}
  ): KeyboardEvent => {
    return {
      key,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault: jest.fn(),
      target: document.body,
      ...options,
    } as unknown as KeyboardEvent;
  };

  it('should register keyboard event listener', () => {
    renderHook(() => useQuoteShortcuts());

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not register listener when disabled', () => {
    renderHook(() => useQuoteShortcuts({ enabled: false }));

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('should return shortcuts list', () => {
    const { result } = renderHook(() => useQuoteShortcuts());

    expect(result.current.shortcuts).toBeInstanceOf(Array);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  describe('Escape key', () => {
    it('should exit selection mode on Escape', () => {
      mockQuoteStore.isSelectionMode = true;
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('Escape'));
      });

      expect(mockQuoteStore.toggleSelectionMode).toHaveBeenCalled();
    });

    it('should not toggle selection mode if not in selection mode', () => {
      mockQuoteStore.isSelectionMode = false;
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('Escape'));
      });

      expect(mockQuoteStore.toggleSelectionMode).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+S - Toggle selection mode', () => {
    it('should toggle selection mode with Ctrl+S when multiple quotes exist', () => {
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('s', { ctrlKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.toggleSelectionMode).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not toggle selection mode with only one quote', () => {
      mockQuoteStore.quotedTexts = [{ id: '1', text: 'single' }];
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('s', { ctrlKey: true }));
      });

      expect(mockQuoteStore.toggleSelectionMode).not.toHaveBeenCalled();
    });
  });

  describe('Selection mode shortcuts', () => {
    beforeEach(() => {
      mockQuoteStore.isSelectionMode = true;
    });

    it('should select all with Ctrl+A', () => {
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('a', { ctrlKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.selectAll).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should deselect all with Ctrl+Shift+A', () => {
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('a', { ctrlKey: true, shiftKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.deselectAll).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should remove selected with Delete key', () => {
      mockQuoteStore.selectedIds = new Set(['1']);
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('Delete');
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.removeSelected).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should remove selected with Backspace key', () => {
      mockQuoteStore.selectedIds = new Set(['1']);
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('Backspace');
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.removeSelected).toHaveBeenCalled();
    });

    it('should not remove if nothing selected', () => {
      mockQuoteStore.selectedIds = new Set();
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('Delete'));
      });

      expect(mockQuoteStore.removeSelected).not.toHaveBeenCalled();
    });

    it('should merge selected with Ctrl+M when 2+ selected', () => {
      mockQuoteStore.selectedIds = new Set(['1', '2']);
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('m', { ctrlKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.mergeSelected).toHaveBeenCalled();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should not merge with only 1 selected', () => {
      mockQuoteStore.selectedIds = new Set(['1']);
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('m', { ctrlKey: true }));
      });

      expect(mockQuoteStore.mergeSelected).not.toHaveBeenCalled();
    });
  });

  describe('Export shortcuts', () => {
    it('should export as text with Ctrl+E', () => {
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('e', { ctrlKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.exportQuotes).toHaveBeenCalledWith('text');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('exported text');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should export as markdown with Ctrl+Shift+E', () => {
      renderHook(() => useQuoteShortcuts());

      const event = createKeyboardEvent('e', { ctrlKey: true, shiftKey: true });
      act(() => {
        keydownHandler?.(event);
      });

      expect(mockQuoteStore.exportQuotes).toHaveBeenCalledWith('markdown');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('exported text');
    });

    it('should export selected when in selection mode with selections', () => {
      mockQuoteStore.isSelectionMode = true;
      mockQuoteStore.selectedIds = new Set(['1']);
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('e', { ctrlKey: true }));
      });

      expect(mockQuoteStore.exportSelected).toHaveBeenCalledWith('text');
    });
  });

  describe('input field handling', () => {
    it('should not trigger shortcuts when focused on input', () => {
      renderHook(() => useQuoteShortcuts());

      const inputElement = document.createElement('input');
      act(() => {
        keydownHandler?.(
          createKeyboardEvent('s', {
            ctrlKey: true,
            target: inputElement,
          } as unknown as Partial<KeyboardEvent>)
        );
      });

      expect(mockQuoteStore.toggleSelectionMode).not.toHaveBeenCalled();
    });

    it('should not trigger shortcuts when focused on textarea', () => {
      renderHook(() => useQuoteShortcuts());

      const textareaElement = document.createElement('textarea');
      act(() => {
        keydownHandler?.(
          createKeyboardEvent('a', {
            ctrlKey: true,
            target: textareaElement,
          } as unknown as Partial<KeyboardEvent>)
        );
      });

      expect(mockQuoteStore.selectAll).not.toHaveBeenCalled();
    });
  });

  describe('no quotes', () => {
    it('should not trigger any shortcuts when no quotes', () => {
      mockQuoteStore.quotedTexts = [];
      renderHook(() => useQuoteShortcuts());

      act(() => {
        keydownHandler?.(createKeyboardEvent('e', { ctrlKey: true }));
      });

      expect(mockQuoteStore.exportQuotes).not.toHaveBeenCalled();
    });
  });
});
