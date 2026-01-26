/**
 * Tray Store - Zustand store for system tray configuration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  TrayConfig,
  TrayMenuItem,
  TrayDisplayMode,
  TrayState,
  TrayIconState,
} from '@/types/system/tray';
import {
  DEFAULT_TRAY_CONFIG,
  DEFAULT_TRAY_ITEMS,
  DEFAULT_COMPACT_ITEMS,
} from '@/types/system/tray';

export interface TrayStoreState {
  /** Current tray configuration */
  config: TrayConfig;
  /** All available menu items */
  menuItems: TrayMenuItem[];
  /** Current tray state from backend */
  trayState: TrayState;
  /** Current icon state */
  iconState: TrayIconState;
  /** Whether config is synced with backend */
  isSynced: boolean;
  /** Last sync timestamp */
  lastSyncAt: number | null;
}

export interface TrayStoreActions {
  /** Set display mode */
  setDisplayMode: (mode: TrayDisplayMode) => void;
  /** Toggle between full and compact mode */
  toggleDisplayMode: () => void;
  /** Set item visibility */
  setItemVisibility: (itemId: string, visible: boolean) => void;
  /** Set multiple items visibility at once */
  setItemsVisibility: (items: Record<string, boolean>) => void;
  /** Update item order */
  setItemOrder: (itemIds: string[]) => void;
  /** Move item up in order */
  moveItemUp: (itemId: string) => void;
  /** Move item down in order */
  moveItemDown: (itemId: string) => void;
  /** Toggle shortcuts display */
  setShowShortcuts: (show: boolean) => void;
  /** Toggle icons display */
  setShowIcons: (show: boolean) => void;
  /** Set compact mode items */
  setCompactModeItems: (itemIds: string[]) => void;
  /** Reset to default compact mode items */
  resetCompactModeItems: () => void;
  /** Update tray state from backend */
  setTrayState: (state: Partial<TrayState>) => void;
  /** Set icon state */
  setIconState: (state: TrayIconState) => void;
  /** Mark as synced */
  markSynced: () => void;
  /** Update menu item */
  updateMenuItem: (itemId: string, updates: Partial<TrayMenuItem>) => void;
  /** Reset to defaults */
  resetConfig: () => void;
  /** Get visible items for current mode */
  getVisibleItems: () => TrayMenuItem[];
  /** Get items by category */
  getItemsByCategory: (category: string) => TrayMenuItem[];
}

const initialState: TrayStoreState = {
  config: DEFAULT_TRAY_CONFIG,
  menuItems: DEFAULT_TRAY_ITEMS,
  trayState: {
    isBusy: false,
    isRecording: false,
    statusMessage: '就绪',
  },
  iconState: 'normal',
  isSynced: false,
  lastSyncAt: null,
};

export const useTrayStore = create<TrayStoreState & TrayStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setDisplayMode: (mode) =>
        set((state) => ({
          config: { ...state.config, displayMode: mode },
          isSynced: false,
        })),

      toggleDisplayMode: () =>
        set((state) => ({
          config: {
            ...state.config,
            displayMode: state.config.displayMode === 'full' ? 'compact' : 'full',
          },
          isSynced: false,
        })),

      setItemVisibility: (itemId, visible) =>
        set((state) => {
          const visibleItems = visible
            ? [...new Set([...state.config.visibleItems, itemId])]
            : state.config.visibleItems.filter((id) => id !== itemId);
          return {
            config: { ...state.config, visibleItems },
            isSynced: false,
          };
        }),

      setItemsVisibility: (items) =>
        set((state) => {
          let visibleItems = [...state.config.visibleItems];
          for (const [itemId, visible] of Object.entries(items)) {
            if (visible && !visibleItems.includes(itemId)) {
              visibleItems.push(itemId);
            } else if (!visible) {
              visibleItems = visibleItems.filter((id) => id !== itemId);
            }
          }
          return {
            config: { ...state.config, visibleItems },
            isSynced: false,
          };
        }),

      setItemOrder: (itemIds) =>
        set((state) => ({
          config: { ...state.config, itemOrder: itemIds },
          isSynced: false,
        })),

      moveItemUp: (itemId) =>
        set((state) => {
          const order = [...state.config.itemOrder];
          const index = order.indexOf(itemId);
          if (index > 0) {
            [order[index - 1], order[index]] = [order[index], order[index - 1]];
          }
          return {
            config: { ...state.config, itemOrder: order },
            isSynced: false,
          };
        }),

      moveItemDown: (itemId) =>
        set((state) => {
          const order = [...state.config.itemOrder];
          const index = order.indexOf(itemId);
          if (index < order.length - 1) {
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
          }
          return {
            config: { ...state.config, itemOrder: order },
            isSynced: false,
          };
        }),

      setShowShortcuts: (show) =>
        set((state) => ({
          config: { ...state.config, showShortcuts: show },
          isSynced: false,
        })),

      setShowIcons: (show) =>
        set((state) => ({
          config: { ...state.config, showIcons: show },
          isSynced: false,
        })),

      setCompactModeItems: (itemIds) =>
        set((state) => ({
          config: { ...state.config, compactModeItems: itemIds },
          isSynced: false,
        })),

      resetCompactModeItems: () =>
        set((state) => ({
          config: { ...state.config, compactModeItems: DEFAULT_COMPACT_ITEMS },
          isSynced: false,
        })),

      setTrayState: (newState) =>
        set((state) => ({
          trayState: { ...state.trayState, ...newState },
        })),

      setIconState: (iconState) => set({ iconState }),

      markSynced: () =>
        set({
          isSynced: true,
          lastSyncAt: Date.now(),
        }),

      updateMenuItem: (itemId, updates) =>
        set((state) => ({
          menuItems: state.menuItems.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        })),

      resetConfig: () =>
        set({
          config: DEFAULT_TRAY_CONFIG,
          menuItems: DEFAULT_TRAY_ITEMS,
          isSynced: false,
        }),

      getVisibleItems: () => {
        const state = get();
        const { displayMode, visibleItems, compactModeItems, itemOrder } = state.config;

        // Get items based on mode
        const itemIds =
          displayMode === 'compact' ? compactModeItems || DEFAULT_COMPACT_ITEMS : visibleItems;

        // Filter and sort items
        return state.menuItems
          .filter((item) => itemIds.includes(item.id) && item.visible)
          .sort((a, b) => {
            const aIndex = itemOrder.indexOf(a.id);
            const bIndex = itemOrder.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return a.order - b.order;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
      },

      getItemsByCategory: (category) => {
        const state = get();
        return state.menuItems.filter((item) => item.category === category);
      },
    }),
    {
      name: 'cognia-tray-config',
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// Selectors
export const selectTrayConfig = (state: TrayStoreState) => state.config;
export const selectTrayDisplayMode = (state: TrayStoreState) => state.config.displayMode;
export const selectTrayState = (state: TrayStoreState) => state.trayState;
export const selectTrayIconState = (state: TrayStoreState) => state.iconState;
export const selectTrayMenuItems = (state: TrayStoreState) => state.menuItems;
export const selectTrayIsSynced = (state: TrayStoreState) => state.isSynced;
export const selectCompactModeItems = (state: TrayStoreState) =>
  state.config.compactModeItems || DEFAULT_COMPACT_ITEMS;

// Hooks for common selections
export const useTrayConfig = () => useTrayStore(selectTrayConfig);
export const useTrayDisplayMode = () => useTrayStore(selectTrayDisplayMode);
export const useTrayStateHook = () => useTrayStore(selectTrayState);
export const useTrayIconState = () => useTrayStore(selectTrayIconState);
export const useTrayMenuItems = () => useTrayStore(selectTrayMenuItems);
