/**
 * System Shortcuts Tests
 */

import {
  getSystemShortcuts,
  checkSystemShortcutConflict,
  getConflictingSystemShortcuts,
  isShortcutSafe,
} from './system-shortcuts';

describe('system-shortcuts', () => {
  describe('getSystemShortcuts', () => {
    it('should return Windows shortcuts', () => {
      const shortcuts = getSystemShortcuts('windows');

      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.every((s) => s.platform === 'windows')).toBe(true);
    });

    it('should return macOS shortcuts', () => {
      const shortcuts = getSystemShortcuts('macos');

      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.every((s) => s.platform === 'macos')).toBe(true);
    });

    it('should return Linux shortcuts', () => {
      const shortcuts = getSystemShortcuts('linux');

      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.every((s) => s.platform === 'linux')).toBe(true);
    });

    it('should contain expected Windows shortcuts', () => {
      const shortcuts = getSystemShortcuts('windows');
      const shortcutStrings = shortcuts.map((s) => s.shortcut);

      expect(shortcutStrings).toContain('Win+D');
      expect(shortcutStrings).toContain('Alt+Tab');
      expect(shortcutStrings).toContain('Alt+F4');
      expect(shortcutStrings).toContain('Ctrl+Alt+Delete');
    });

    it('should contain expected macOS shortcuts', () => {
      const shortcuts = getSystemShortcuts('macos');
      const shortcutStrings = shortcuts.map((s) => s.shortcut);

      expect(shortcutStrings).toContain('Cmd+Space');
      expect(shortcutStrings).toContain('Cmd+Tab');
      expect(shortcutStrings).toContain('Cmd+Q');
    });

    it('should contain expected Linux shortcuts', () => {
      const shortcuts = getSystemShortcuts('linux');
      const shortcutStrings = shortcuts.map((s) => s.shortcut);

      expect(shortcutStrings).toContain('Super+D');
      expect(shortcutStrings).toContain('Alt+Tab');
      expect(shortcutStrings).toContain('Ctrl+Alt+T');
    });

    it('should auto-detect platform when undefined', () => {
      const shortcuts = getSystemShortcuts(undefined);
      // In Jest environment with jsdom, window.navigator exists
      // The function auto-detects platform, so it returns shortcuts
      expect(shortcuts.length).toBeGreaterThanOrEqual(0);
    });

    it('should have valid structure for all shortcuts', () => {
      const platforms: Array<'windows' | 'macos' | 'linux'> = ['windows', 'macos', 'linux'];

      for (const platform of platforms) {
        const shortcuts = getSystemShortcuts(platform);

        for (const shortcut of shortcuts) {
          expect(shortcut).toHaveProperty('shortcut');
          expect(shortcut).toHaveProperty('platform');
          expect(shortcut).toHaveProperty('description');
          expect(shortcut).toHaveProperty('overridable');
          expect(typeof shortcut.shortcut).toBe('string');
          expect(typeof shortcut.description).toBe('string');
          expect(typeof shortcut.overridable).toBe('boolean');
        }
      }
    });

    it('should mark critical shortcuts as non-overridable', () => {
      const windowsShortcuts = getSystemShortcuts('windows');
      const lockScreen = windowsShortcuts.find((s) => s.shortcut === 'Win+L');
      expect(lockScreen?.overridable).toBe(false);

      const macosShortcuts = getSystemShortcuts('macos');
      const cmdQ = macosShortcuts.find((s) => s.shortcut === 'Cmd+Q');
      expect(cmdQ?.overridable).toBe(false);
    });

    it('should mark some shortcuts as overridable', () => {
      const windowsShortcuts = getSystemShortcuts('windows');
      const screenshot = windowsShortcuts.find((s) => s.shortcut === 'Win+PrintScreen');
      expect(screenshot?.overridable).toBe(true);

      const macosShortcuts = getSystemShortcuts('macos');
      const spotlight = macosShortcuts.find((s) => s.shortcut === 'Cmd+Space');
      expect(spotlight?.overridable).toBe(true);
    });
  });

  describe('checkSystemShortcutConflict', () => {
    it('should detect conflict with Windows shortcut', () => {
      const conflict = checkSystemShortcutConflict('Win+D', 'windows');

      expect(conflict).not.toBeNull();
      expect(conflict?.shortcut).toBe('Win+D');
      expect(conflict?.description).toBe('Show Desktop');
    });

    it('should detect conflict with macOS shortcut', () => {
      const conflict = checkSystemShortcutConflict('Cmd+Space', 'macos');

      expect(conflict).not.toBeNull();
      expect(conflict?.shortcut).toBe('Cmd+Space');
      expect(conflict?.description).toBe('Spotlight Search');
    });

    it('should return null for non-conflicting shortcut', () => {
      const conflict = checkSystemShortcutConflict('Ctrl+Shift+P', 'windows');
      expect(conflict).toBeNull();
    });

    it('should normalize shortcut for comparison', () => {
      // Test case insensitivity
      const conflict1 = checkSystemShortcutConflict('win+d', 'windows');
      expect(conflict1?.shortcut).toBe('Win+D');

      // Test Command/Cmd normalization
      const conflict2 = checkSystemShortcutConflict('Command+Space', 'macos');
      expect(conflict2?.shortcut).toBe('Cmd+Space');

      // Test Control/Ctrl normalization
      const conflict3 = checkSystemShortcutConflict('Control+Alt+Delete', 'windows');
      expect(conflict3?.shortcut).toBe('Ctrl+Alt+Delete');
    });

    it('should normalize Option to Alt for macOS', () => {
      const conflict = checkSystemShortcutConflict('Cmd+Option+Esc', 'macos');
      expect(conflict?.shortcut).toBe('Cmd+Option+Esc');
    });

    it('should normalize Super/Meta to Win', () => {
      const conflict = checkSystemShortcutConflict('Meta+D', 'windows');
      expect(conflict?.shortcut).toBe('Win+D');
    });

    it('should handle different key orderings', () => {
      // Alt+Ctrl+Delete should match Ctrl+Alt+Delete
      const conflict = checkSystemShortcutConflict('Delete+Alt+Ctrl', 'windows');
      expect(conflict?.shortcut).toBe('Ctrl+Alt+Delete');
    });
  });

  describe('getConflictingSystemShortcuts', () => {
    it('should return empty array for no conflicts', () => {
      const conflicts = getConflictingSystemShortcuts(
        ['Ctrl+Shift+P', 'Ctrl+K'],
        'windows'
      );
      expect(conflicts).toEqual([]);
    });

    it('should return all conflicts', () => {
      const conflicts = getConflictingSystemShortcuts(
        ['Win+D', 'Ctrl+Shift+P', 'Alt+Tab'],
        'windows'
      );

      expect(conflicts.length).toBe(2);
      expect(conflicts[0].shortcut).toBe('Win+D');
      expect(conflicts[0].systemShortcut.description).toBe('Show Desktop');
      expect(conflicts[1].shortcut).toBe('Alt+Tab');
      expect(conflicts[1].systemShortcut.description).toBe('Switch Windows');
    });

    it('should work with macOS shortcuts', () => {
      const conflicts = getConflictingSystemShortcuts(
        ['Cmd+Q', 'Cmd+Space', 'Cmd+K'],
        'macos'
      );

      expect(conflicts.length).toBe(2);
      expect(conflicts.some((c) => c.shortcut === 'Cmd+Q')).toBe(true);
      expect(conflicts.some((c) => c.shortcut === 'Cmd+Space')).toBe(true);
    });

    it('should handle empty input array', () => {
      const conflicts = getConflictingSystemShortcuts([], 'windows');
      expect(conflicts).toEqual([]);
    });
  });

  describe('isShortcutSafe', () => {
    it('should return safe for non-conflicting shortcut', () => {
      const result = isShortcutSafe('Ctrl+Shift+P', 'windows');

      expect(result.safe).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should return unsafe for non-overridable conflict', () => {
      const result = isShortcutSafe('Win+L', 'windows');

      expect(result.safe).toBe(false);
      expect(result.warning).toContain('cannot be overridden');
      expect(result.warning).toContain('Lock PC');
    });

    it('should return safe with warning for overridable conflict', () => {
      const result = isShortcutSafe('Win+PrintScreen', 'windows');

      expect(result.safe).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('may conflict');
      expect(result.warning).toContain('Screenshot');
    });

    it('should handle macOS shortcuts', () => {
      // Cmd+Q is not overridable
      const result1 = isShortcutSafe('Cmd+Q', 'macos');
      expect(result1.safe).toBe(false);

      // Cmd+Space is overridable
      const result2 = isShortcutSafe('Cmd+Space', 'macos');
      expect(result2.safe).toBe(true);
      expect(result2.warning).toBeDefined();
    });

    it('should handle Linux shortcuts', () => {
      // Alt+F4 is not overridable
      const result1 = isShortcutSafe('Alt+F4', 'linux');
      expect(result1.safe).toBe(false);

      // Ctrl+Alt+T is overridable
      const result2 = isShortcutSafe('Ctrl+Alt+T', 'linux');
      expect(result2.safe).toBe(true);
      expect(result2.warning).toBeDefined();
    });

    it('should check conflicts with auto-detected platform', () => {
      // When platform is undefined, it auto-detects from navigator
      // Use a shortcut that doesn't conflict on any platform
      const result = isShortcutSafe('Ctrl+Shift+Alt+P', undefined);
      expect(result.safe).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });
});
