/**
 * Tests for useGlobalShortcuts hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGlobalShortcuts } from './use-global-shortcuts';

// Mock dependencies
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

jest.mock('@/lib/native/shortcuts', () => ({
  registerShortcut: jest.fn().mockResolvedValue(true),
  unregisterShortcut: jest.fn().mockResolvedValue(true),
  unregisterAllShortcuts: jest.fn().mockResolvedValue(undefined),
}));

const mockShortcuts = [
  { id: '1', action: 'NEW_CHAT', shortcut: 'Ctrl+N', enabled: true },
  { id: '2', action: 'TOGGLE_SIDEBAR', shortcut: 'Ctrl+B', enabled: true },
  { id: '3', action: 'OPEN_SETTINGS', shortcut: 'Ctrl+,', enabled: false },
];

jest.mock('@/stores/system', () => ({
  useNativeStore: jest.fn(() => ({
    shortcuts: mockShortcuts,
    shortcutsEnabled: true,
    updateShortcut: jest.fn(),
  })),
}));

import { isTauri } from '@/lib/native/utils';
import * as shortcutsLib from '@/lib/native/shortcuts';

const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;
const mockRegisterShortcut = shortcutsLib.registerShortcut as jest.MockedFunction<
  typeof shortcutsLib.registerShortcut
>;
const mockUnregisterShortcut = shortcutsLib.unregisterShortcut as jest.MockedFunction<
  typeof shortcutsLib.unregisterShortcut
>;
const mockUnregisterAll = shortcutsLib.unregisterAllShortcuts as jest.MockedFunction<
  typeof shortcutsLib.unregisterAllShortcuts
>;

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('should return shortcuts from store', () => {
      const { result } = renderHook(() => useGlobalShortcuts());

      expect(result.current.shortcuts).toEqual(mockShortcuts);
      expect(result.current.isEnabled).toBe(true);
    });

    it('should provide registration methods', () => {
      const { result } = renderHook(() => useGlobalShortcuts());

      expect(typeof result.current.registerAll).toBe('function');
      expect(typeof result.current.unregisterAll).toBe('function');
      expect(typeof result.current.updateShortcut).toBe('function');
      expect(typeof result.current.toggleShortcut).toBe('function');
    });
  });

  describe('registerAll', () => {
    it('should register enabled shortcuts with handlers', async () => {
      const onNewChat = jest.fn();
      const onToggleSidebar = jest.fn();

      const { result } = renderHook(() =>
        useGlobalShortcuts({
          onNewChat,
          onToggleSidebar,
        })
      );

      await act(async () => {
        await result.current.registerAll();
      });

      expect(mockRegisterShortcut).toHaveBeenCalledWith('Ctrl+N', onNewChat);
      expect(mockRegisterShortcut).toHaveBeenCalledWith('Ctrl+B', onToggleSidebar);
    });

    it('should not register disabled shortcuts', async () => {
      const onOpenSettings = jest.fn();

      const { result } = renderHook(() =>
        useGlobalShortcuts({
          onOpenSettings,
        })
      );

      await act(async () => {
        await result.current.registerAll();
      });

      // Ctrl+, is disabled in mockShortcuts
      expect(mockRegisterShortcut).not.toHaveBeenCalledWith('Ctrl+,', expect.anything());
    });

    it('should not register when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() =>
        useGlobalShortcuts({
          onNewChat: jest.fn(),
        })
      );

      await act(async () => {
        await result.current.registerAll();
      });

      expect(mockRegisterShortcut).not.toHaveBeenCalled();
    });

    it('should not register when disabled', async () => {
      const { result } = renderHook(() =>
        useGlobalShortcuts({
          enabled: false,
          onNewChat: jest.fn(),
        })
      );

      await act(async () => {
        await result.current.registerAll();
      });

      expect(mockRegisterShortcut).not.toHaveBeenCalled();
    });
  });

  describe('unregisterAll', () => {
    it('should unregister all shortcuts', async () => {
      const { result } = renderHook(() => useGlobalShortcuts());

      await act(async () => {
        await result.current.unregisterAll();
      });

      expect(mockUnregisterAll).toHaveBeenCalled();
    });

    it('should not call unregister when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const { result } = renderHook(() => useGlobalShortcuts());

      await act(async () => {
        await result.current.unregisterAll();
      });

      expect(mockUnregisterAll).not.toHaveBeenCalled();
    });
  });

  describe('updateShortcut', () => {
    it('should update shortcut and re-register', async () => {
      const onNewChat = jest.fn();
      const { result } = renderHook(() => useGlobalShortcuts({ onNewChat }));

      // First register
      await act(async () => {
        await result.current.registerAll();
      });

      jest.clearAllMocks();

      // Update shortcut
      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateShortcut('1', 'Ctrl+Shift+N');
      });

      expect(mockUnregisterShortcut).toHaveBeenCalledWith('Ctrl+N');
      expect(updateResult).toBe(true);
    });

    it('should return false for non-existent shortcut', async () => {
      const { result } = renderHook(() => useGlobalShortcuts());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateShortcut('nonexistent', 'Ctrl+X');
      });

      expect(updateResult).toBe(false);
    });
  });

  describe('toggleShortcut', () => {
    it('should register shortcut when enabling', async () => {
      const onOpenSettings = jest.fn();
      const { result } = renderHook(() => useGlobalShortcuts({ onOpenSettings }));

      await act(async () => {
        await result.current.toggleShortcut('3', true);
      });

      expect(mockRegisterShortcut).toHaveBeenCalledWith('Ctrl+,', onOpenSettings);
    });

    it('should unregister shortcut when disabling', async () => {
      const onNewChat = jest.fn();
      const { result } = renderHook(() => useGlobalShortcuts({ onNewChat }));

      // First register
      await act(async () => {
        await result.current.registerAll();
      });

      jest.clearAllMocks();

      // Toggle off
      await act(async () => {
        await result.current.toggleShortcut('1', false);
      });

      expect(mockUnregisterShortcut).toHaveBeenCalledWith('Ctrl+N');
    });
  });

  describe('cleanup', () => {
    it('should unregister all on unmount', async () => {
      const { unmount } = renderHook(() =>
        useGlobalShortcuts({
          onNewChat: jest.fn(),
        })
      );

      unmount();

      await waitFor(() => {
        expect(mockUnregisterAll).toHaveBeenCalled();
      });
    });
  });
});
