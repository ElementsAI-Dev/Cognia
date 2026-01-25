/**
 * Tests for Keybinding Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useKeybindingStore,
  DEFAULT_KEYBINDINGS,
  parseKeyEvent,
  formatKeybinding,
} from './keybinding-store';

describe('useKeybindingStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useKeybindingStore());
    act(() => {
      result.current.resetAllBindings();
    });
  });

  describe('default bindings', () => {
    it('should have default keybindings', () => {
      const { result } = renderHook(() => useKeybindingStore());

      expect(result.current.bindings).toEqual(DEFAULT_KEYBINDINGS);
    });

    it('should include common actions', () => {
      expect(DEFAULT_KEYBINDINGS['canvas.save']).toBe('Ctrl+S');
      expect(DEFAULT_KEYBINDINGS['canvas.undo']).toBe('Ctrl+Z');
      expect(DEFAULT_KEYBINDINGS['canvas.redo']).toBe('Ctrl+Y');
    });
  });

  describe('setKeybinding', () => {
    it('should set a new keybinding', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        result.current.setKeybinding('custom.action', 'Ctrl+Shift+X');
      });

      expect(result.current.bindings['custom.action']).toBe('ctrl+shift+x');
    });

    it('should detect conflicts', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        result.current.setKeybinding('new.action', 'Ctrl+S');
      });

      // Conflicts are detected via checkConflicts
      const conflicts = result.current.checkConflicts();
      expect(Object.keys(conflicts).length).toBeGreaterThan(0);
    });
  });

  describe('resetKeybinding', () => {
    it('should reset a keybinding to default', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        result.current.setKeybinding('canvas.save', 'Ctrl+Shift+S');
      });

      expect(result.current.bindings['canvas.save']).toBe('ctrl+shift+s');

      act(() => {
        result.current.resetKeybinding('canvas.save');
      });

      expect(result.current.bindings['canvas.save']).toBe(DEFAULT_KEYBINDINGS['canvas.save']);
    });
  });

  describe('resetAllBindings', () => {
    it('should reset all bindings to defaults', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        result.current.setKeybinding('canvas.save', 'Ctrl+Alt+S');
        result.current.setKeybinding('canvas.undo', 'Ctrl+Alt+Z');
      });

      act(() => {
        result.current.resetAllBindings();
      });

      expect(result.current.bindings).toEqual(DEFAULT_KEYBINDINGS);
    });
  });

  describe('getKeybinding', () => {
    it('should return keybinding for an action', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const binding = result.current.getKeybinding('canvas.save');
      expect(binding).toBe('Ctrl+S');
    });

    it('should return undefined for unknown action', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const binding = result.current.getKeybinding('unknown.action');
      expect(binding).toBeUndefined();
    });
  });

  describe('getActionByKeybinding', () => {
    it('should find action by keybinding', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const action = result.current.getActionByKeybinding('Ctrl+S');
      expect(action).toBe('canvas.save');
    });

    it('should return undefined for unbound key', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const action = result.current.getActionByKeybinding('Ctrl+Alt+Shift+X');
      expect(action).toBeUndefined();
    });
  });

  describe('exportBindings', () => {
    it('should export bindings as JSON', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const exported = result.current.exportBindings();
      const parsed = JSON.parse(exported);

      expect(parsed).toEqual(result.current.bindings);
    });
  });

  describe('importBindings', () => {
    it('should import valid bindings', () => {
      const { result } = renderHook(() => useKeybindingStore());

      const importData = JSON.stringify({
        'custom.action': 'Ctrl+K',
        'another.action': 'Ctrl+L',
      });

      let success = false;
      act(() => {
        success = result.current.importBindings(importData);
      });

      expect(success).toBe(true);
      expect(result.current.bindings['custom.action']).toBe('ctrl+k');
    });

    it('should reject invalid JSON', () => {
      const { result } = renderHook(() => useKeybindingStore());

      let success = true;
      act(() => {
        success = result.current.importBindings('invalid json');
      });

      expect(success).toBe(false);
    });
  });

  describe('checkConflicts', () => {
    it('should detect when keybindings have conflicts', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        // Use a unique key that doesn't conflict with defaults
        result.current.setKeybinding('testAction1', 'Ctrl+Alt+K');
        result.current.setKeybinding('testAction2', 'Ctrl+Alt+K');
      });

      const conflicts = result.current.checkConflicts();
      expect(conflicts['ctrl+alt+k']).toBeDefined();
      expect(conflicts['ctrl+alt+k'].length).toBe(2);
    });

    it('should detect existing conflicts in default bindings', () => {
      const { result } = renderHook(() => useKeybindingStore());

      act(() => {
        result.current.resetAllBindings();
      });

      const conflicts = result.current.checkConflicts();
      // Default bindings have intentional conflicts:
      // - Ctrl+Shift+S: canvas.saveVersion & action.simplify
      // - Ctrl+H: canvas.replace & view.toggleHistory
      // - Escape: canvas.close & navigation.rejectSuggestion
      expect(Object.keys(conflicts).length).toBe(3);
    });
  });
});

describe('parseKeyEvent', () => {
  it('should parse keyboard event to key combo string', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'S',
      ctrlKey: true,
    });

    const result = parseKeyEvent(event);
    expect(result).toBe('Ctrl+S');
  });

  it('should handle multiple modifiers', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Z',
      ctrlKey: true,
      shiftKey: true,
    });

    const result = parseKeyEvent(event);
    expect(result).toBe('Ctrl+Shift+Z');
  });

  it('should handle special keys', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
    });

    const result = parseKeyEvent(event);
    expect(result).toBe('Ctrl+Enter');
  });
});

describe('formatKeybinding', () => {
  it('should format keybinding for display', () => {
    const result = formatKeybinding('Ctrl+S');
    expect(result).toBeTruthy();
  });

  it('should handle multiple modifiers', () => {
    const result = formatKeybinding('Ctrl+Shift+Alt+X');
    expect(result).toBeTruthy();
  });
});
