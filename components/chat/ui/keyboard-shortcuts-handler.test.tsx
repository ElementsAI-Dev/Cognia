/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getShortcutsByCategory, formatShortcut } from './keyboard-shortcuts-handler';
import type { KeyboardShortcut } from './keyboard-shortcuts-handler';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock stores
const mockToggleSidebar = jest.fn();
const mockSetCommandPaletteOpen = jest.fn();
const mockSetKeyboardShortcutsOpen = jest.fn();
const mockOpenModal = jest.fn();
const mockCreateSession = jest.fn();
const mockSetActiveSession = jest.fn();

const mockToggleSimplifiedMode = jest.fn();

jest.mock('@/stores', () => ({
  useUIStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      toggleSidebar: mockToggleSidebar,
      setCommandPaletteOpen: mockSetCommandPaletteOpen,
      setKeyboardShortcutsOpen: mockSetKeyboardShortcutsOpen,
      openModal: mockOpenModal,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createSession: mockCreateSession,
      sessions: [{ id: 'session-1' }, { id: 'session-2' }],
      activeSessionId: 'session-1',
      setActiveSession: mockSetActiveSession,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      toggleSimplifiedMode: mockToggleSimplifiedMode,
    };
    return selector(state);
  },
}));

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns shortcuts array', () => {
    const { result } = renderHook(() => useKeyboardShortcuts({}));
    
    expect(result.current.shortcuts).toBeDefined();
    expect(Array.isArray(result.current.shortcuts)).toBe(true);
  });

  it('includes navigation shortcuts', () => {
    const { result } = renderHook(() => useKeyboardShortcuts({}));
    
    const navShortcuts = result.current.shortcuts.filter(s => s.category === 'navigation');
    expect(navShortcuts.length).toBeGreaterThan(0);
  });

  it('includes chat shortcuts when callbacks provided', () => {
    const onNewMessage = jest.fn();
    const onStopGeneration = jest.fn();
    
    const { result } = renderHook(() => useKeyboardShortcuts({
      onNewMessage,
      onStopGeneration,
    }));
    
    const chatShortcuts = result.current.shortcuts.filter(s => s.category === 'chat');
    expect(chatShortcuts.length).toBeGreaterThan(0);
  });

  it('includes custom shortcuts', () => {
    const customShortcut: KeyboardShortcut = {
      key: 'x',
      modifiers: ['ctrl'],
      action: jest.fn(),
      description: 'Custom action',
      category: 'general',
    };
    
    const { result } = renderHook(() => useKeyboardShortcuts({
      customShortcuts: [customShortcut],
    }));
    
    const hasCustom = result.current.shortcuts.some(s => s.key === 'x');
    expect(hasCustom).toBe(true);
  });

  it('handles keyboard events', () => {
    renderHook(() => useKeyboardShortcuts({}));
    
    // Simulate Ctrl+B for toggle sidebar
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true,
    });
    
    window.dispatchEvent(event);
    
    expect(mockToggleSidebar).toHaveBeenCalled();
  });
});

describe('getShortcutsByCategory', () => {
  it('groups shortcuts by category', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', action: jest.fn(), description: 'Nav', category: 'navigation' },
      { key: 'b', action: jest.fn(), description: 'Chat', category: 'chat' },
      { key: 'c', action: jest.fn(), description: 'Edit', category: 'editing' },
      { key: 'd', action: jest.fn(), description: 'Gen', category: 'general' },
    ];
    
    const grouped = getShortcutsByCategory(shortcuts);
    
    expect(grouped.navigation).toHaveLength(1);
    expect(grouped.chat).toHaveLength(1);
    expect(grouped.editing).toHaveLength(1);
    expect(grouped.general).toHaveLength(1);
  });

  it('returns empty arrays for categories with no shortcuts', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'a', action: jest.fn(), description: 'Nav', category: 'navigation' },
    ];
    
    const grouped = getShortcutsByCategory(shortcuts);
    
    expect(grouped.navigation).toHaveLength(1);
    expect(grouped.chat).toHaveLength(0);
    expect(grouped.editing).toHaveLength(0);
    expect(grouped.general).toHaveLength(0);
  });
});

describe('formatShortcut', () => {
  it('formats shortcut with ctrl modifier', () => {
    const shortcut: KeyboardShortcut = {
      key: 'b',
      modifiers: ['ctrl'],
      action: jest.fn(),
      description: 'Test',
      category: 'general',
    };
    
    expect(formatShortcut(shortcut)).toBe('Ctrl+B');
  });

  it('formats shortcut with multiple modifiers', () => {
    const shortcut: KeyboardShortcut = {
      key: 'r',
      modifiers: ['ctrl', 'shift'],
      action: jest.fn(),
      description: 'Test',
      category: 'general',
    };
    
    expect(formatShortcut(shortcut)).toBe('Ctrl+Shift+R');
  });

  it('formats shortcut without modifiers', () => {
    const shortcut: KeyboardShortcut = {
      key: 'Escape',
      action: jest.fn(),
      description: 'Test',
      category: 'general',
    };
    
    expect(formatShortcut(shortcut)).toBe('Escape');
  });

  it('formats shortcut with meta modifier', () => {
    const shortcut: KeyboardShortcut = {
      key: 'k',
      modifiers: ['meta'],
      action: jest.fn(),
      description: 'Test',
      category: 'general',
    };
    
    expect(formatShortcut(shortcut)).toBe('⌘+K');
  });
});
