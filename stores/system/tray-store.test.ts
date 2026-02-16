/**
 * Tray Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useTrayStore,
  selectTrayConfig,
  selectTrayDisplayMode,
  selectTrayState,
  selectTrayIconState,
  selectTrayMenuItems,
  selectCompactModeItems,
} from './tray-store';
import { DEFAULT_TRAY_CONFIG, DEFAULT_COMPACT_ITEMS, DEFAULT_TRAY_ITEMS } from '@/types/system/tray';

describe('tray-store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useTrayStore());
    act(() => {
      result.current.resetConfig();
      result.current.setTrayState({
        isBusy: false,
        isRecording: false,
        statusMessage: '就绪',
      });
      result.current.setIconState('normal');
      useTrayStore.setState({
        isSynced: false,
        lastSyncAt: null,
      });
    });
  });

  describe('initial state', () => {
    it('should have default configuration', () => {
      const { result } = renderHook(() => useTrayStore());

      expect(result.current.config.displayMode).toBe('full');
      expect(result.current.config.showShortcuts).toBe(true);
      expect(result.current.config.showIcons).toBe(true);
    });

    it('should have default menu items', () => {
      const { result } = renderHook(() => useTrayStore());

      expect(result.current.menuItems.length).toBe(DEFAULT_TRAY_ITEMS.length);
    });

    it('should have default tray state', () => {
      const { result } = renderHook(() => useTrayStore());

      expect(result.current.trayState.isBusy).toBe(false);
      expect(result.current.trayState.isRecording).toBe(false);
      expect(result.current.trayState.statusMessage).toBe('就绪');
    });

    it('should have normal icon state', () => {
      const { result } = renderHook(() => useTrayStore());

      expect(result.current.iconState).toBe('normal');
    });
  });

  describe('setDisplayMode', () => {
    it('should set display mode to compact', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact');
      });

      expect(result.current.config.displayMode).toBe('compact');
      expect(result.current.isSynced).toBe(false);
    });

    it('should set display mode to full', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact');
        result.current.setDisplayMode('full');
      });

      expect(result.current.config.displayMode).toBe('full');
    });
  });

  describe('toggleDisplayMode', () => {
    it('should toggle from full to compact', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.toggleDisplayMode();
      });

      expect(result.current.config.displayMode).toBe('compact');
    });

    it('should toggle from compact to full', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact');
        result.current.toggleDisplayMode();
      });

      expect(result.current.config.displayMode).toBe('full');
    });
  });

  describe('setItemVisibility', () => {
    it('should hide an item', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setItemVisibility('show-window', false);
      });

      expect(result.current.config.visibleItems).not.toContain('show-window');
    });

    it('should show an item', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setItemVisibility('show-window', false);
        result.current.setItemVisibility('show-window', true);
      });

      expect(result.current.config.visibleItems).toContain('show-window');
    });

    it('should not duplicate items when showing already visible item', () => {
      const { result } = renderHook(() => useTrayStore());
      const initialCount = result.current.config.visibleItems.filter(
        (id) => id === 'show-window'
      ).length;

      act(() => {
        result.current.setItemVisibility('show-window', true);
      });

      const finalCount = result.current.config.visibleItems.filter(
        (id) => id === 'show-window'
      ).length;
      expect(finalCount).toBe(initialCount);
    });
  });

  describe('setItemsVisibility', () => {
    it('should set multiple items visibility at once', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setItemsVisibility({
          'show-window': false,
          'hide-window': false,
          'quit': true,
        });
      });

      expect(result.current.config.visibleItems).not.toContain('show-window');
      expect(result.current.config.visibleItems).not.toContain('hide-window');
      expect(result.current.config.visibleItems).toContain('quit');
    });
  });

  describe('moveItemUp / moveItemDown', () => {
    it('should move item up in order', () => {
      const { result } = renderHook(() => useTrayStore());
      const itemId = result.current.config.itemOrder[1];
      const initialIndex = 1;

      act(() => {
        result.current.moveItemUp(itemId);
      });

      const newIndex = result.current.config.itemOrder.indexOf(itemId);
      expect(newIndex).toBe(initialIndex - 1);
    });

    it('should not move first item up', () => {
      const { result } = renderHook(() => useTrayStore());
      const firstItemId = result.current.config.itemOrder[0];

      act(() => {
        result.current.moveItemUp(firstItemId);
      });

      expect(result.current.config.itemOrder[0]).toBe(firstItemId);
    });

    it('should move item down in order', () => {
      const { result } = renderHook(() => useTrayStore());
      const itemId = result.current.config.itemOrder[0];

      act(() => {
        result.current.moveItemDown(itemId);
      });

      const newIndex = result.current.config.itemOrder.indexOf(itemId);
      expect(newIndex).toBe(1);
    });

    it('should not move last item down', () => {
      const { result } = renderHook(() => useTrayStore());
      const lastIndex = result.current.config.itemOrder.length - 1;
      const lastItemId = result.current.config.itemOrder[lastIndex];

      act(() => {
        result.current.moveItemDown(lastItemId);
      });

      expect(result.current.config.itemOrder[lastIndex]).toBe(lastItemId);
    });
  });

  describe('setShowShortcuts / setShowIcons', () => {
    it('should toggle shortcuts display', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setShowShortcuts(false);
      });

      expect(result.current.config.showShortcuts).toBe(false);
    });

    it('should toggle icons display', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setShowIcons(false);
      });

      expect(result.current.config.showIcons).toBe(false);
    });
  });

  describe('setCompactModeItems', () => {
    it('should set custom compact mode items', () => {
      const { result } = renderHook(() => useTrayStore());
      const customItems = ['toggle-chat-widget', 'quit'];

      act(() => {
        result.current.setCompactModeItems(customItems);
      });

      expect(result.current.config.compactModeItems).toEqual(customItems);
    });
  });

  describe('resetCompactModeItems', () => {
    it('should reset to default compact mode items', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setCompactModeItems(['only-one']);
        result.current.resetCompactModeItems();
      });

      expect(result.current.config.compactModeItems).toEqual(DEFAULT_COMPACT_ITEMS);
    });
  });

  describe('setTrayState', () => {
    it('should update tray state', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setTrayState({
          isBusy: true,
          statusMessage: 'Processing...',
        });
      });

      expect(result.current.trayState.isBusy).toBe(true);
      expect(result.current.trayState.statusMessage).toBe('Processing...');
      expect(result.current.trayState.isRecording).toBe(false); // unchanged
    });
  });

  describe('setIconState', () => {
    it('should set icon state', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setIconState('recording');
      });

      expect(result.current.iconState).toBe('recording');
    });
  });

  describe('markSynced', () => {
    it('should mark config as synced', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact'); // causes isSynced = false
        result.current.markSynced();
      });

      expect(result.current.isSynced).toBe(true);
      expect(result.current.lastSyncAt).not.toBeNull();
    });
  });

  describe('updateMenuItem', () => {
    it('should update a menu item', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.updateMenuItem('show-window', {
          label: 'Custom Label',
          enabled: false,
        });
      });

      const item = result.current.menuItems.find((i) => i.id === 'show-window');
      expect(item?.label).toBe('Custom Label');
      expect(item?.enabled).toBe(false);
    });
  });

  describe('resetConfig', () => {
    it('should reset to default configuration', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact');
        result.current.setShowShortcuts(false);
        result.current.resetConfig();
      });

      expect(result.current.config).toEqual(DEFAULT_TRAY_CONFIG);
    });
  });

  describe('getVisibleItems', () => {
    it('should return visible items in full mode', () => {
      const { result } = renderHook(() => useTrayStore());

      const visibleItems = result.current.getVisibleItems();
      expect(visibleItems.length).toBeGreaterThan(0);
    });

    it('should return compact items in compact mode', () => {
      const { result } = renderHook(() => useTrayStore());

      act(() => {
        result.current.setDisplayMode('compact');
      });

      const visibleItems = result.current.getVisibleItems();
      expect(visibleItems.length).toBeLessThanOrEqual(DEFAULT_COMPACT_ITEMS.length);
    });
  });

  describe('getItemsByCategory', () => {
    it('should return items by category', () => {
      const { result } = renderHook(() => useTrayStore());

      const windowItems = result.current.getItemsByCategory('window');
      expect(windowItems.every((item) => item.category === 'window')).toBe(true);
    });
  });

  describe('selectors', () => {
    it('selectTrayConfig should return config', () => {
      const { result } = renderHook(() => useTrayStore());
      const config = selectTrayConfig(result.current);
      expect(config).toEqual(result.current.config);
    });

    it('selectTrayDisplayMode should return display mode', () => {
      const { result } = renderHook(() => useTrayStore());
      const mode = selectTrayDisplayMode(result.current);
      expect(mode).toBe('full');
    });

    it('selectTrayState should return tray state', () => {
      const { result } = renderHook(() => useTrayStore());
      const state = selectTrayState(result.current);
      expect(state).toEqual(result.current.trayState);
    });

    it('selectTrayIconState should return icon state', () => {
      const { result } = renderHook(() => useTrayStore());
      const iconState = selectTrayIconState(result.current);
      expect(iconState).toBe('normal');
    });

    it('selectTrayMenuItems should return menu items', () => {
      const { result } = renderHook(() => useTrayStore());
      const items = selectTrayMenuItems(result.current);
      expect(items).toEqual(result.current.menuItems);
    });

    it('selectCompactModeItems should return compact items', () => {
      const { result } = renderHook(() => useTrayStore());
      const items = selectCompactModeItems(result.current);
      expect(items).toEqual(DEFAULT_COMPACT_ITEMS);
    });
  });
});
