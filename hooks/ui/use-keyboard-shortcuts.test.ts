/**
 * Tests for useKeyboardShortcuts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut } from './use-keyboard-shortcuts';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('@/stores', () => ({
  useSessionStore: jest.fn((selector) => {
    const state = { createSession: jest.fn() };
    return selector(state);
  }),
  useUIStore: jest.fn((selector) => {
    const state = {
      setCommandPaletteOpen: jest.fn(),
      setKeyboardShortcutsOpen: jest.fn(),
    };
    return selector(state);
  }),
  useArtifactStore: jest.fn((selector) => {
    const state = {
      panelOpen: false,
      openPanel: jest.fn(),
      closePanel: jest.fn(),
    };
    return selector(state);
  }),
}));

describe('formatShortcut', () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe('Windows/Linux', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
    });

    it('should format Ctrl modifier', () => {
      const result = formatShortcut({ key: 'n', ctrl: true });
      expect(result).toBe('Ctrl+N');
    });

    it('should format multiple modifiers', () => {
      const result = formatShortcut({ key: 'p', ctrl: true, shift: true });
      expect(result).toBe('Ctrl+Shift+P');
    });

    it('should format special keys', () => {
      expect(formatShortcut({ key: 'Escape' })).toBe('Esc');
      expect(formatShortcut({ key: 'Enter' })).toBe('↵');
      expect(formatShortcut({ key: 'ArrowUp' })).toBe('↑');
      expect(formatShortcut({ key: 'ArrowDown' })).toBe('↓');
      expect(formatShortcut({ key: ' ' })).toBe('Space');
    });
  });

  describe('with modifiers (platform-agnostic)', () => {
    it('should format Alt modifier', () => {
      const result = formatShortcut({ key: 'a', alt: true });
      // On Windows: Alt+A, on Mac: ⌥A
      expect(result).toMatch(/^(⌥A|Alt\+A)$/);
    });

    it('should format Shift modifier', () => {
      const result = formatShortcut({ key: 's', shift: true });
      expect(result).toMatch(/^(⇧S|Shift\+S)$/);
    });

    it('should format Meta modifier', () => {
      const result = formatShortcut({ key: 'm', meta: true });
      expect(result).toMatch(/^(⌘M|Win\+M)$/);
    });

    it('should format multiple modifiers', () => {
      const result = formatShortcut({ key: 'p', ctrl: true, shift: true, alt: true });
      // Check it contains all parts
      expect(result).toContain('P');
      expect(result.toLowerCase()).toMatch(/(ctrl|⌃)/i);
    });
  });
});

describe('useKeyboardShortcuts', () => {
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture the keydown handler
    jest.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as (e: KeyboardEvent) => void;
      }
    });

    jest.spyOn(document, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    keydownHandler = null;
  });

  const createKeyboardEvent = (key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent => {
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

  it('should register keyboard event listener on mount', () => {
    renderHook(() => useKeyboardShortcuts());

    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should not register listener when disabled', () => {
    renderHook(() => useKeyboardShortcuts({ enabled: false }));

    expect(document.addEventListener).not.toHaveBeenCalled();
  });

  it('should return list of available shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts());

    expect(result.current.shortcuts).toBeInstanceOf(Array);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);

    const commandPaletteShortcut = result.current.shortcuts.find(s => s.key === 'k' && s.ctrl);
    expect(commandPaletteShortcut).toBeDefined();
    expect(commandPaletteShortcut?.description).toBe('Open command palette');
  });

  describe('keyboard event handling', () => {
    it('should call onNewChat for Ctrl+N', () => {
      const onNewChat = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onNewChat }));

      act(() => {
        keydownHandler?.(createKeyboardEvent('n', { ctrlKey: true }));
      });

      expect(onNewChat).toHaveBeenCalled();
    });

    it('should call onToggleSidebar for Ctrl+B', () => {
      const onToggleSidebar = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onToggleSidebar }));

      act(() => {
        keydownHandler?.(createKeyboardEvent('b', { ctrlKey: true }));
      });

      expect(onToggleSidebar).toHaveBeenCalled();
    });

    it('should call onFocusInput for / key', () => {
      const onFocusInput = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onFocusInput }));

      act(() => {
        keydownHandler?.(createKeyboardEvent('/'));
      });

      expect(onFocusInput).toHaveBeenCalled();
    });

    it('should call onStopGeneration for Escape', () => {
      const onStopGeneration = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onStopGeneration }));

      act(() => {
        keydownHandler?.(createKeyboardEvent('Escape'));
      });

      expect(onStopGeneration).toHaveBeenCalled();
    });

    it('should not trigger / shortcut when in input field', () => {
      const onFocusInput = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onFocusInput }));

      const inputElement = document.createElement('input');
      act(() => {
        keydownHandler?.(createKeyboardEvent('/', { target: inputElement } as unknown as Partial<KeyboardEvent>));
      });

      expect(onFocusInput).not.toHaveBeenCalled();
    });

    it('should not trigger ? shortcut when in textarea', () => {
      renderHook(() => useKeyboardShortcuts());

      const textareaElement = document.createElement('textarea');
      const event = createKeyboardEvent('?', { target: textareaElement } as unknown as Partial<KeyboardEvent>);
      
      act(() => {
        keydownHandler?.(event);
      });

      // Should not prevent default when in textarea
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('should prevent default for matched shortcuts', () => {
      const onNewChat = jest.fn();
      renderHook(() => useKeyboardShortcuts({ onNewChat }));

      const event = createKeyboardEvent('n', { ctrlKey: true });
      
      act(() => {
        keydownHandler?.(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('shortcut categories', () => {
    it('should have navigation shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      const navShortcuts = result.current.shortcuts.filter(s => s.category === 'navigation');
      expect(navShortcuts.length).toBeGreaterThan(0);
    });

    it('should have chat shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      const chatShortcuts = result.current.shortcuts.filter(s => s.category === 'chat');
      expect(chatShortcuts.length).toBeGreaterThan(0);
    });

    it('should have system shortcuts', () => {
      const { result } = renderHook(() => useKeyboardShortcuts());

      const systemShortcuts = result.current.shortcuts.filter(s => s.category === 'system');
      expect(systemShortcuts.length).toBeGreaterThan(0);
    });
  });
});
