/**
 * Tests for useTray hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock store values
const mockConfig = {
  displayMode: 'icon' as const,
  showShortcuts: true,
  showIcons: true,
  compactModeItems: ['item-1'],
  itemVisibility: { 'item-1': true, 'item-2': false },
};

const mockTrayState = {
  isVisible: true,
  displayMode: 'icon' as const,
};

const mockSetDisplayMode = jest.fn();
const mockSetItemVisibility = jest.fn();
const mockSetCompactModeItems = jest.fn();
const mockSetShowShortcuts = jest.fn();
const mockSetShowIcons = jest.fn();
const mockSetTrayState = jest.fn();
const mockMarkSynced = jest.fn();
const mockResetConfig = jest.fn();

// Mock tray store
jest.mock('@/stores/system/tray-store', () => ({
  useTrayStore: jest.fn(() => ({
    config: mockConfig,
    trayState: mockTrayState,
    setDisplayMode: mockSetDisplayMode,
    setItemVisibility: mockSetItemVisibility,
    setCompactModeItems: mockSetCompactModeItems,
    setShowShortcuts: mockSetShowShortcuts,
    setShowIcons: mockSetShowIcons,
    setTrayState: mockSetTrayState,
    markSynced: mockMarkSynced,
    resetConfig: mockResetConfig,
  })),
}));

// Mock native tray functions
const mockGetTrayState = jest.fn();
const mockGetTrayConfig = jest.fn();
const mockSetTrayConfig = jest.fn();
const mockSetTrayDisplayMode = jest.fn();
const mockToggleTrayDisplayMode = jest.fn();
const mockSetTrayItemVisibility = jest.fn();
const mockSetTrayCompactItems = jest.fn();
const mockRefreshTrayMenu = jest.fn();
const mockOnTrayConfigChanged = jest.fn();
const mockOnTrayStateChanged = jest.fn();

jest.mock('@/lib/native/tray', () => ({
  getTrayState: () => mockGetTrayState(),
  getTrayConfig: () => mockGetTrayConfig(),
  setTrayConfig: (...args: unknown[]) => mockSetTrayConfig(...args),
  setTrayDisplayMode: (...args: unknown[]) => mockSetTrayDisplayMode(...args),
  toggleTrayDisplayMode: () => mockToggleTrayDisplayMode(),
  setTrayItemVisibility: (...args: unknown[]) => mockSetTrayItemVisibility(...args),
  setTrayCompactItems: (...args: unknown[]) => mockSetTrayCompactItems(...args),
  refreshTrayMenu: () => mockRefreshTrayMenu(),
  onTrayConfigChanged: (...args: unknown[]) => mockOnTrayConfigChanged(...args),
  onTrayStateChanged: (...args: unknown[]) => mockOnTrayStateChanged(...args),
}));

// Mock isTauri utility
const mockIsTauri = jest.fn();
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

// Import after mocks
import { useTray } from './use-tray';

describe('useTray', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock returns
    mockIsTauri.mockReturnValue(true);
    mockGetTrayState.mockResolvedValue(mockTrayState);
    mockGetTrayConfig.mockResolvedValue(mockConfig);
    mockSetTrayConfig.mockResolvedValue(undefined);
    mockSetTrayDisplayMode.mockResolvedValue(undefined);
    mockToggleTrayDisplayMode.mockResolvedValue('compact');
    mockSetTrayItemVisibility.mockResolvedValue(undefined);
    mockSetTrayCompactItems.mockResolvedValue(undefined);
    mockRefreshTrayMenu.mockResolvedValue(undefined);
    mockOnTrayConfigChanged.mockResolvedValue(jest.fn());
    mockOnTrayStateChanged.mockResolvedValue(jest.fn());
  });

  describe('initialization', () => {
    it('should initialize with isDesktop false initially', () => {
      mockIsTauri.mockReturnValue(false);
      const { result } = renderHook(() => useTray());
      
      // Initial state before effect runs
      expect(result.current.isDesktop).toBe(false);
    });

    it('should set isDesktop to true when in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(true);
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });
    });

    it('should have config from store', () => {
      const { result } = renderHook(() => useTray());
      expect(result.current.config).toEqual(mockConfig);
    });

    it('should have trayState from store', () => {
      const { result } = renderHook(() => useTray());
      expect(result.current.trayState).toEqual(mockTrayState);
    });

    it('should have isSyncing as false initially', () => {
      const { result } = renderHook(() => useTray());
      expect(result.current.isSyncing).toBe(false);
    });

    it('should have error as null initially', () => {
      const { result } = renderHook(() => useTray());
      expect(result.current.error).toBeNull();
    });
  });

  describe('setDisplayMode', () => {
    it('should have setDisplayMode function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.setDisplayMode).toBe('function');
    });

    it('should call native setTrayDisplayMode', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await act(async () => {
        await result.current.setDisplayMode('compact');
      });

      expect(mockSetTrayDisplayMode).toHaveBeenCalledWith('compact');
      expect(mockSetDisplayMode).toHaveBeenCalledWith('compact');
      expect(mockMarkSynced).toHaveBeenCalled();
    });

    it('should not call native when not desktop', async () => {
      mockIsTauri.mockReturnValue(false);
      const { result } = renderHook(() => useTray());

      await act(async () => {
        await result.current.setDisplayMode('compact');
      });

      expect(mockSetTrayDisplayMode).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      mockSetTrayDisplayMode.mockRejectedValue(new Error('Failed'));
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.setDisplayMode('compact');
        })
      ).rejects.toThrow('Failed');
    });
  });

  describe('toggleMode', () => {
    it('should have toggleMode function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.toggleMode).toBe('function');
    });

    it('should call native toggleTrayDisplayMode', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await act(async () => {
        await result.current.toggleMode();
      });

      expect(mockToggleTrayDisplayMode).toHaveBeenCalled();
      expect(mockSetDisplayMode).toHaveBeenCalledWith('compact');
    });
  });

  describe('setItemVisibility', () => {
    it('should have setItemVisibility function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.setItemVisibility).toBe('function');
    });

    it('should call native setTrayItemVisibility', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await act(async () => {
        await result.current.setItemVisibility('item-1', false);
      });

      expect(mockSetTrayItemVisibility).toHaveBeenCalledWith('item-1', false);
      expect(mockSetItemVisibility).toHaveBeenCalledWith('item-1', false);
    });
  });

  describe('setCompactItems', () => {
    it('should have setCompactItems function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.setCompactItems).toBe('function');
    });

    it('should call native setTrayCompactItems', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      const items = ['item-1', 'item-2'];
      await act(async () => {
        await result.current.setCompactItems(items);
      });

      expect(mockSetTrayCompactItems).toHaveBeenCalledWith(items);
      expect(mockSetCompactModeItems).toHaveBeenCalledWith(items);
    });
  });

  describe('setShowShortcuts', () => {
    it('should have setShowShortcuts function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.setShowShortcuts).toBe('function');
    });

    it('should call store setShowShortcuts', () => {
      const { result } = renderHook(() => useTray());

      act(() => {
        result.current.setShowShortcuts(false);
      });

      expect(mockSetShowShortcuts).toHaveBeenCalledWith(false);
    });
  });

  describe('setShowIcons', () => {
    it('should have setShowIcons function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.setShowIcons).toBe('function');
    });

    it('should call store setShowIcons', () => {
      const { result } = renderHook(() => useTray());

      act(() => {
        result.current.setShowIcons(false);
      });

      expect(mockSetShowIcons).toHaveBeenCalledWith(false);
    });
  });

  describe('syncConfig', () => {
    it('should have syncConfig function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.syncConfig).toBe('function');
    });

    it('should call native setTrayConfig', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await act(async () => {
        await result.current.syncConfig();
      });

      expect(mockSetTrayConfig).toHaveBeenCalledWith(mockConfig);
      expect(mockMarkSynced).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should have refresh function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should call native refreshTrayMenu', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefreshTrayMenu).toHaveBeenCalled();
    });
  });

  describe('resetConfig', () => {
    it('should have resetConfig function', () => {
      const { result } = renderHook(() => useTray());
      expect(typeof result.current.resetConfig).toBe('function');
    });

    it('should call store resetConfig', async () => {
      const { result } = renderHook(() => useTray());

      await waitFor(() => {
        expect(result.current.isDesktop).toBe(true);
      });

      act(() => {
        result.current.resetConfig();
      });

      expect(mockResetConfig).toHaveBeenCalled();
    });
  });

  describe('event listeners', () => {
    it('should setup config change listener', async () => {
      renderHook(() => useTray());

      await waitFor(() => {
        expect(mockOnTrayConfigChanged).toHaveBeenCalled();
      });
    });

    it('should setup state change listener', async () => {
      renderHook(() => useTray());

      await waitFor(() => {
        expect(mockOnTrayStateChanged).toHaveBeenCalled();
      });
    });

    it('should cleanup listeners on unmount', async () => {
      const unlistenConfig = jest.fn();
      const unlistenState = jest.fn();
      mockOnTrayConfigChanged.mockResolvedValue(unlistenConfig);
      mockOnTrayStateChanged.mockResolvedValue(unlistenState);

      const { unmount } = renderHook(() => useTray());

      await waitFor(() => {
        expect(mockOnTrayConfigChanged).toHaveBeenCalled();
      });

      unmount();

      expect(unlistenConfig).toHaveBeenCalled();
      expect(unlistenState).toHaveBeenCalled();
    });
  });

  describe('displayMode property', () => {
    it('should return displayMode from config', () => {
      const { result } = renderHook(() => useTray());
      expect(result.current.displayMode).toBe('icon');
    });
  });

  describe('non-desktop environment', () => {
    it('should not setup listeners when not desktop', async () => {
      mockIsTauri.mockReturnValue(false);
      renderHook(() => useTray());

      // Wait a bit for any async operations
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockOnTrayConfigChanged).not.toHaveBeenCalled();
      expect(mockOnTrayStateChanged).not.toHaveBeenCalled();
    });
  });
});
