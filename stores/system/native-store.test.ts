/**
 * Tests for Native Store
 */

import { act } from '@testing-library/react';
import { useNativeStore } from './native-store';

describe('useNativeStore', () => {
  beforeEach(() => {
    act(() => {
      useNativeStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useNativeStore.getState();
      expect(state.platform).toBeNull();
      expect(state.appVersion).toBeNull();
      expect(state.isDesktop).toBe(false);
      expect(state.isAlwaysOnTop).toBe(false);
      expect(state.isFullscreen).toBe(false);
      expect(state.isMaximized).toBe(false);
      expect(state.updateAvailable).toBe(false);
      // Default shortcuts include selection helpers; keep expectation in sync with store defaults
      expect(state.shortcuts).toHaveLength(8);
      expect(state.shortcutsEnabled).toBe(true);
    });
  });

  describe('system info', () => {
    it('should set system info', () => {
      act(() => {
        useNativeStore.getState().setSystemInfo('darwin', '1.0.0');
      });

      const state = useNativeStore.getState();
      expect(state.platform).toBe('darwin');
      expect(state.appVersion).toBe('1.0.0');
    });

    it('should set isDesktop', () => {
      act(() => {
        useNativeStore.getState().setIsDesktop(true);
      });

      expect(useNativeStore.getState().isDesktop).toBe(true);
    });
  });

  describe('window state', () => {
    it('should set always on top', () => {
      act(() => {
        useNativeStore.getState().setAlwaysOnTop(true);
      });

      expect(useNativeStore.getState().isAlwaysOnTop).toBe(true);
    });

    it('should set fullscreen', () => {
      act(() => {
        useNativeStore.getState().setFullscreen(true);
      });

      expect(useNativeStore.getState().isFullscreen).toBe(true);
    });

    it('should set maximized', () => {
      act(() => {
        useNativeStore.getState().setMaximized(true);
      });

      expect(useNativeStore.getState().isMaximized).toBe(true);
    });
  });

  describe('update state', () => {
    it('should set update available', () => {
      act(() => {
        useNativeStore.getState().setUpdateAvailable(true, '2.0.0');
      });

      const state = useNativeStore.getState();
      expect(state.updateAvailable).toBe(true);
      expect(state.updateVersion).toBe('2.0.0');
    });

    it('should set update downloading', () => {
      act(() => {
        useNativeStore.getState().setUpdateDownloading(true);
      });

      expect(useNativeStore.getState().updateDownloading).toBe(true);
    });

    it('should set update progress', () => {
      act(() => {
        useNativeStore.getState().setUpdateProgress(50);
      });

      expect(useNativeStore.getState().updateProgress).toBe(50);
    });

    it('should clear update state', () => {
      act(() => {
        useNativeStore.getState().setUpdateAvailable(true, '2.0.0');
        useNativeStore.getState().setUpdateDownloading(true);
        useNativeStore.getState().setUpdateProgress(50);
        useNativeStore.getState().clearUpdateState();
      });

      const state = useNativeStore.getState();
      expect(state.updateAvailable).toBe(false);
      expect(state.updateVersion).toBeNull();
      expect(state.updateDownloading).toBe(false);
      expect(state.updateProgress).toBe(0);
    });
  });

  describe('notification settings', () => {
    it('should set notifications enabled', () => {
      act(() => {
        useNativeStore.getState().setNotificationsEnabled(false);
      });

      expect(useNativeStore.getState().notificationsEnabled).toBe(false);
    });

    it('should set notification permission', () => {
      act(() => {
        useNativeStore.getState().setNotificationPermission(true);
      });

      expect(useNativeStore.getState().notificationPermission).toBe(true);
    });
  });

  describe('shortcut management', () => {
    it('should set shortcuts', () => {
      const newShortcuts = [
        { id: 'test', name: 'Test', shortcut: 'Ctrl+T', enabled: true, action: 'TEST' },
      ];

      act(() => {
        useNativeStore.getState().setShortcuts(newShortcuts);
      });

      expect(useNativeStore.getState().shortcuts).toEqual(newShortcuts);
    });

    it('should add shortcut', () => {
      const initialLength = useNativeStore.getState().shortcuts.length;

      act(() => {
        useNativeStore.getState().addShortcut({
          id: 'custom',
          name: 'Custom',
          shortcut: 'Ctrl+Shift+C',
          enabled: true,
          action: 'CUSTOM',
        });
      });

      expect(useNativeStore.getState().shortcuts).toHaveLength(initialLength + 1);
    });

    it('should update shortcut', () => {
      act(() => {
        useNativeStore.getState().updateShortcut('new-chat', { shortcut: 'Ctrl+Shift+N' });
      });

      const shortcut = useNativeStore.getState().shortcuts.find(s => s.id === 'new-chat');
      expect(shortcut?.shortcut).toBe('Ctrl+Shift+N');
    });

    it('should remove shortcut', () => {
      const initialLength = useNativeStore.getState().shortcuts.length;

      act(() => {
        useNativeStore.getState().removeShortcut('new-chat');
      });

      expect(useNativeStore.getState().shortcuts).toHaveLength(initialLength - 1);
    });

    it('should set shortcuts enabled', () => {
      act(() => {
        useNativeStore.getState().setShortcutsEnabled(false);
      });

      expect(useNativeStore.getState().shortcutsEnabled).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useNativeStore.getState().setSystemInfo('win32', '1.0.0');
        useNativeStore.getState().setIsDesktop(true);
        useNativeStore.getState().setAlwaysOnTop(true);
        useNativeStore.getState().reset();
      });

      const state = useNativeStore.getState();
      expect(state.platform).toBeNull();
      expect(state.isDesktop).toBe(false);
      expect(state.isAlwaysOnTop).toBe(false);
    });
  });
});
