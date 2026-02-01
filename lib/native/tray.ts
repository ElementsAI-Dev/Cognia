/**
 * Native Tray API
 * TypeScript wrapper for system tray Tauri commands
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import type { TrayConfig, TrayDisplayMode, TrayState } from '@/types/system/tray';
import { loggers } from '@/lib/logger';

const log = loggers.native;

/**
 * Backend tray config structure (snake_case)
 */
interface BackendTrayConfig {
  display_mode: 'full' | 'compact';
  visible_items: string[];
  item_order: string[];
  show_shortcuts: boolean;
  show_icons: boolean;
  compact_mode_items: string[] | null;
}

/**
 * Backend tray state structure (snake_case)
 */
interface BackendTrayState {
  is_busy: boolean;
  is_recording: boolean;
  status_message: string;
}

/**
 * Convert backend config to frontend format
 */
function toFrontendConfig(config: BackendTrayConfig): TrayConfig {
  return {
    displayMode: config.display_mode,
    visibleItems: config.visible_items,
    itemOrder: config.item_order,
    showShortcuts: config.show_shortcuts,
    showIcons: config.show_icons,
    compactModeItems: config.compact_mode_items ?? undefined,
  };
}

/**
 * Convert frontend config to backend format
 */
function toBackendConfig(config: TrayConfig): BackendTrayConfig {
  return {
    display_mode: config.displayMode,
    visible_items: config.visibleItems,
    item_order: config.itemOrder,
    show_shortcuts: config.showShortcuts,
    show_icons: config.showIcons,
    compact_mode_items: config.compactModeItems ?? null,
  };
}

/**
 * Convert backend state to frontend format
 */
function toFrontendState(state: BackendTrayState): TrayState {
  return {
    isBusy: state.is_busy,
    isRecording: state.is_recording,
    statusMessage: state.status_message,
  };
}

/**
 * Get current tray state
 */
export async function getTrayState(): Promise<TrayState> {
  if (!isTauri()) {
    return {
      isBusy: false,
      isRecording: false,
      statusMessage: '就绪',
    };
  }

  try {
    const state = await invoke<BackendTrayState>('tray_get_state');
    return toFrontendState(state);
  } catch (error) {
    log.error('Failed to get tray state', error as Error);
    throw error;
  }
}

/**
 * Get current tray configuration
 */
export async function getTrayConfig(): Promise<TrayConfig> {
  if (!isTauri()) {
    throw new Error('Tray config is only available in desktop app');
  }

  try {
    const config = await invoke<BackendTrayConfig>('tray_get_config');
    return toFrontendConfig(config);
  } catch (error) {
    log.error('Failed to get tray config', error as Error);
    throw error;
  }
}

/**
 * Set tray configuration
 */
export async function setTrayConfig(config: TrayConfig): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tray config is only available in desktop app');
  }

  try {
    await invoke('tray_set_config', { config: toBackendConfig(config) });
  } catch (error) {
    log.error('Failed to set tray config', error as Error);
    throw error;
  }
}

/**
 * Set tray display mode
 */
export async function setTrayDisplayMode(mode: TrayDisplayMode): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tray is only available in desktop app');
  }

  try {
    await invoke('tray_set_display_mode', { mode });
  } catch (error) {
    log.error('Failed to set tray display mode', error as Error);
    throw error;
  }
}

/**
 * Toggle tray display mode between full and compact
 */
export async function toggleTrayDisplayMode(): Promise<TrayDisplayMode> {
  if (!isTauri()) {
    throw new Error('Tray is only available in desktop app');
  }

  try {
    return await invoke<TrayDisplayMode>('tray_toggle_display_mode');
  } catch (error) {
    log.error('Failed to toggle tray display mode', error as Error);
    throw error;
  }
}

/**
 * Set item visibility in tray menu
 */
export async function setTrayItemVisibility(
  itemId: string,
  visible: boolean
): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tray is only available in desktop app');
  }

  try {
    await invoke('tray_set_item_visibility', { itemId, visible });
  } catch (error) {
    log.error('Failed to set tray item visibility', error as Error);
    throw error;
  }
}

/**
 * Set compact mode items
 */
export async function setTrayCompactItems(items: string[]): Promise<void> {
  if (!isTauri()) {
    throw new Error('Tray is only available in desktop app');
  }

  try {
    await invoke('tray_set_compact_items', { items });
  } catch (error) {
    log.error('Failed to set compact items', error as Error);
    throw error;
  }
}

/**
 * Update tray tooltip message
 */
export async function updateTrayTooltip(message: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke('tray_update_tooltip', { message });
  } catch (error) {
    log.error('Failed to update tray tooltip', error as Error);
    throw error;
  }
}

/**
 * Set tray busy state
 */
export async function setTrayBusy(
  busy: boolean,
  message?: string
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke('tray_set_busy', { busy, message: message ?? null });
  } catch (error) {
    log.error('Failed to set tray busy state', error as Error);
    throw error;
  }
}

/**
 * Refresh tray menu
 */
export async function refreshTrayMenu(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke('tray_refresh_menu');
  } catch (error) {
    log.error('Failed to refresh tray menu', error as Error);
    throw error;
  }
}

/**
 * Get default compact mode items
 */
export async function getDefaultCompactItems(): Promise<string[]> {
  if (!isTauri()) {
    return [
      'toggle-chat-widget',
      'screenshot-region',
      'clipboard-history',
      'open-settings',
      'quit',
    ];
  }

  try {
    return await invoke<string[]>('tray_get_default_compact_items');
  } catch (error) {
    log.error('Failed to get default compact items', error as Error);
    throw error;
  }
}

/**
 * Get all available menu item IDs
 */
export async function getAllTrayItemIds(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<string[]>('tray_get_all_item_ids');
  } catch (error) {
    log.error('Failed to get all tray item IDs', error as Error);
    throw error;
  }
}

/**
 * Listen for tray config changes
 */
export async function onTrayConfigChanged(
  callback: () => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen('tray-config-changed', callback);
}

/**
 * Listen for tray state changes
 */
export async function onTrayStateChanged(
  callback: (state: TrayState) => void
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => {};
  }

  return listen<BackendTrayState>('tray-state-changed', (event) => {
    callback(toFrontendState(event.payload));
  });
}
