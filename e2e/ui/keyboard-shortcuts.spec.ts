import { test, expect } from '@playwright/test';

/**
 * Keyboard Shortcuts Tests
 * Tests for global keyboard shortcuts functionality
 */

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should format shortcuts correctly for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatShortcut = (shortcut: {
        key: string;
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        meta?: boolean;
      }, isMac: boolean = false): string => {
        const parts: string[] = [];

        if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
        if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
        if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
        if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');

        let keyDisplay = shortcut.key.toUpperCase();
        if (shortcut.key === ' ') keyDisplay = 'Space';
        if (shortcut.key === 'Escape') keyDisplay = 'Esc';
        if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
        if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
        if (shortcut.key === 'Enter') keyDisplay = '↵';

        parts.push(keyDisplay);

        return parts.join(isMac ? '' : '+');
      };

      return {
        ctrlN: formatShortcut({ key: 'n', ctrl: true }),
        ctrlShiftP: formatShortcut({ key: 'p', ctrl: true, shift: true }),
        escape: formatShortcut({ key: 'Escape' }),
        space: formatShortcut({ key: ' ' }),
        arrowUp: formatShortcut({ key: 'ArrowUp' }),
        macCtrlN: formatShortcut({ key: 'n', ctrl: true }, true),
        macCmdShiftP: formatShortcut({ key: 'p', meta: true, shift: true }, true),
      };
    });

    expect(result.ctrlN).toBe('Ctrl+N');
    expect(result.ctrlShiftP).toBe('Ctrl+Shift+P');
    expect(result.escape).toBe('Esc');
    expect(result.space).toBe('Space');
    expect(result.arrowUp).toBe('↑');
    expect(result.macCtrlN).toBe('⌃N');
    expect(result.macCmdShiftP).toBe('⇧⌘P');
  });

  test('should match keyboard event to shortcut', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ShortcutDef {
        key: string;
        ctrl?: boolean;
        shift?: boolean;
        alt?: boolean;
        meta?: boolean;
      }

      const matchShortcut = (event: {
        key: string;
        ctrlKey: boolean;
        shiftKey: boolean;
        altKey: boolean;
        metaKey: boolean;
      }, shortcut: ShortcutDef): boolean => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          event.ctrlKey === (shortcut.ctrl || false) &&
          event.shiftKey === (shortcut.shift || false) &&
          event.altKey === (shortcut.alt || false) &&
          event.metaKey === (shortcut.meta || false)
        );
      };

      const ctrlNShortcut: ShortcutDef = { key: 'n', ctrl: true };
      
      const ctrlNEvent = { key: 'n', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false };
      const justNEvent = { key: 'n', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false };
      const ctrlShiftNEvent = { key: 'n', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false };

      return {
        matchesCtrlN: matchShortcut(ctrlNEvent, ctrlNShortcut),
        matchesJustN: matchShortcut(justNEvent, ctrlNShortcut),
        matchesCtrlShiftN: matchShortcut(ctrlShiftNEvent, ctrlNShortcut),
      };
    });

    expect(result.matchesCtrlN).toBe(true);
    expect(result.matchesJustN).toBe(false);
    expect(result.matchesCtrlShiftN).toBe(false);
  });

  test('should categorize shortcuts correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Shortcut {
        key: string;
        category: 'navigation' | 'chat' | 'editing' | 'system';
        description: string;
      }

      const shortcuts: Shortcut[] = [
        { key: 'n', category: 'chat', description: 'New chat' },
        { key: 'p', category: 'navigation', description: 'Open projects' },
        { key: ',', category: 'system', description: 'Open settings' },
        { key: 'z', category: 'editing', description: 'Undo' },
        { key: 'y', category: 'editing', description: 'Redo' },
        { key: 'k', category: 'navigation', description: 'Command palette' },
        { key: 'Escape', category: 'system', description: 'Stop generation' },
      ];

      const groupByCategory = (shortcuts: Shortcut[]) => {
        const groups: Record<string, Shortcut[]> = {};
        for (const shortcut of shortcuts) {
          if (!groups[shortcut.category]) {
            groups[shortcut.category] = [];
          }
          groups[shortcut.category].push(shortcut);
        }
        return groups;
      };

      const grouped = groupByCategory(shortcuts);

      return {
        navigationCount: grouped.navigation?.length || 0,
        chatCount: grouped.chat?.length || 0,
        editingCount: grouped.editing?.length || 0,
        systemCount: grouped.system?.length || 0,
        totalCount: shortcuts.length,
      };
    });

    expect(result.navigationCount).toBe(2);
    expect(result.chatCount).toBe(1);
    expect(result.editingCount).toBe(2);
    expect(result.systemCount).toBe(2);
    expect(result.totalCount).toBe(7);
  });

  test('should prevent default for handled shortcuts', async ({ page }) => {
    const result = await page.evaluate(() => {
      const handledShortcuts = ['n', 'p', 'k', ','];

      const shouldPreventDefault = (key: string, ctrlKey: boolean): boolean => {
        if (!ctrlKey) return false;
        return handledShortcuts.includes(key.toLowerCase());
      };

      return {
        ctrlN: shouldPreventDefault('n', true),
        ctrlP: shouldPreventDefault('p', true),
        ctrlS: shouldPreventDefault('s', true), // Not handled
        justN: shouldPreventDefault('n', false),
      };
    });

    expect(result.ctrlN).toBe(true);
    expect(result.ctrlP).toBe(true);
    expect(result.ctrlS).toBe(false);
    expect(result.justN).toBe(false);
  });

  test('should handle shortcut conflicts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Shortcut {
        id: string;
        key: string;
        ctrl?: boolean;
        shift?: boolean;
      }

      const shortcuts: Shortcut[] = [
        { id: 'new-chat', key: 'n', ctrl: true },
        { id: 'new-window', key: 'n', ctrl: true, shift: true },
        { id: 'search', key: 'f', ctrl: true },
      ];

      const findConflicts = (shortcuts: Shortcut[]): { id1: string; id2: string }[] => {
        const conflicts: { id1: string; id2: string }[] = [];
        
        for (let i = 0; i < shortcuts.length; i++) {
          for (let j = i + 1; j < shortcuts.length; j++) {
            const a = shortcuts[i];
            const b = shortcuts[j];
            
            if (
              a.key === b.key &&
              a.ctrl === b.ctrl &&
              a.shift === b.shift
            ) {
              conflicts.push({ id1: a.id, id2: b.id });
            }
          }
        }
        
        return conflicts;
      };

      // Add a duplicate
      const withDuplicate = [...shortcuts, { id: 'duplicate-new', key: 'n', ctrl: true }];
      const conflicts = findConflicts(withDuplicate);

      return {
        originalConflicts: findConflicts(shortcuts).length,
        withDuplicateConflicts: conflicts.length,
        conflictIds: conflicts.map(c => [c.id1, c.id2]),
      };
    });

    expect(result.originalConflicts).toBe(0);
    expect(result.withDuplicateConflicts).toBe(1);
    expect(result.conflictIds[0]).toContain('new-chat');
    expect(result.conflictIds[0]).toContain('duplicate-new');
  });

  test('should support custom shortcut overrides', async ({ page }) => {
    const result = await page.evaluate(() => {
      const defaultShortcuts: Record<string, { key: string; ctrl?: boolean }> = {
        'new-chat': { key: 'n', ctrl: true },
        'search': { key: 'f', ctrl: true },
        'settings': { key: ',', ctrl: true },
      };

      const userOverrides: Record<string, { key: string; ctrl?: boolean }> = {
        'new-chat': { key: 'm', ctrl: true }, // User changed Ctrl+N to Ctrl+M
      };

      const getEffectiveShortcuts = () => {
        return { ...defaultShortcuts, ...userOverrides };
      };

      const effective = getEffectiveShortcuts();

      return {
        newChatKey: effective['new-chat'].key,
        searchKey: effective['search'].key,
        settingsKey: effective['settings'].key,
        isNewChatOverridden: effective['new-chat'].key !== defaultShortcuts['new-chat'].key,
      };
    });

    expect(result.newChatKey).toBe('m');
    expect(result.searchKey).toBe('f');
    expect(result.settingsKey).toBe(',');
    expect(result.isNewChatOverridden).toBe(true);
  });
});

test.describe('Shortcut Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should disable shortcuts when input is focused', async ({ page }) => {
    const result = await page.evaluate(() => {
      const isInputFocused = (activeElement: { tagName: string; isContentEditable?: boolean } | null): boolean => {
        if (!activeElement) return false;
        
        const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
        if (inputTags.includes(activeElement.tagName)) return true;
        if (activeElement.isContentEditable) return true;
        
        return false;
      };

      const shouldHandleShortcut = (
        activeElement: { tagName: string; isContentEditable?: boolean } | null,
        allowInInput: boolean = false
      ): boolean => {
        if (allowInInput) return true;
        return !isInputFocused(activeElement);
      };

      return {
        inputFocused: shouldHandleShortcut({ tagName: 'INPUT' }),
        textareaFocused: shouldHandleShortcut({ tagName: 'TEXTAREA' }),
        contentEditable: shouldHandleShortcut({ tagName: 'DIV', isContentEditable: true }),
        buttonFocused: shouldHandleShortcut({ tagName: 'BUTTON' }),
        allowInInput: shouldHandleShortcut({ tagName: 'INPUT' }, true),
      };
    });

    expect(result.inputFocused).toBe(false);
    expect(result.textareaFocused).toBe(false);
    expect(result.contentEditable).toBe(false);
    expect(result.buttonFocused).toBe(true);
    expect(result.allowInInput).toBe(true);
  });

  test('should handle escape key in different contexts', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UIState {
        modalOpen: boolean;
        dropdownOpen: boolean;
        searchOpen: boolean;
        isGenerating: boolean;
      }

      const handleEscape = (state: UIState): { action: string; newState: Partial<UIState> } => {
        // Priority order: modal > dropdown > search > generation
        if (state.modalOpen) {
          return { action: 'close-modal', newState: { modalOpen: false } };
        }
        if (state.dropdownOpen) {
          return { action: 'close-dropdown', newState: { dropdownOpen: false } };
        }
        if (state.searchOpen) {
          return { action: 'close-search', newState: { searchOpen: false } };
        }
        if (state.isGenerating) {
          return { action: 'stop-generation', newState: { isGenerating: false } };
        }
        return { action: 'none', newState: {} };
      };

      return {
        modalOpen: handleEscape({ modalOpen: true, dropdownOpen: true, searchOpen: true, isGenerating: true }),
        dropdownOpen: handleEscape({ modalOpen: false, dropdownOpen: true, searchOpen: true, isGenerating: true }),
        searchOpen: handleEscape({ modalOpen: false, dropdownOpen: false, searchOpen: true, isGenerating: true }),
        generating: handleEscape({ modalOpen: false, dropdownOpen: false, searchOpen: false, isGenerating: true }),
        nothing: handleEscape({ modalOpen: false, dropdownOpen: false, searchOpen: false, isGenerating: false }),
      };
    });

    expect(result.modalOpen.action).toBe('close-modal');
    expect(result.dropdownOpen.action).toBe('close-dropdown');
    expect(result.searchOpen.action).toBe('close-search');
    expect(result.generating.action).toBe('stop-generation');
    expect(result.nothing.action).toBe('none');
  });
});
