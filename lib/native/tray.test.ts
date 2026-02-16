/**
 * Native Tray API Tests
 */

// Mock Tauri modules before importing the module under test
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import {
  getTrayState,
  getTrayConfig,
  setTrayConfig,
  setTrayDisplayMode,
  toggleTrayDisplayMode,
  setTrayItemVisibility,
  setTrayCompactItems,
  updateTrayTooltip,
  setTrayBusy,
  refreshTrayMenu,
  getDefaultCompactItems,
  getAllTrayItemIds,
  onTrayConfigChanged,
  onTrayStateChanged,
} from './tray';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Native Tray API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(false);
  });

  describe('getTrayState', () => {
    it('should return default state when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const state = await getTrayState();

      expect(state).toEqual({
        isBusy: false,
        isRecording: false,
        statusMessage: '就绪',
      });
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should invoke tray_get_state when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({
        is_busy: true,
        is_recording: false,
        status_message: 'Processing',
      });

      const state = await getTrayState();

      expect(mockInvoke).toHaveBeenCalledWith('tray_get_state');
      expect(state).toEqual({
        isBusy: true,
        isRecording: false,
        statusMessage: 'Processing',
      });
    });
  });

  describe('getTrayConfig', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(getTrayConfig()).rejects.toThrow(
        'Tray config is only available in desktop app'
      );
    });

    it('should invoke tray_get_config when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({
        display_mode: 'compact',
        visible_items: ['item1', 'item2'],
        item_order: ['item1', 'item2'],
        show_shortcuts: true,
        show_icons: false,
        compact_mode_items: ['item1'],
      });

      const config = await getTrayConfig();

      expect(mockInvoke).toHaveBeenCalledWith('tray_get_config');
      expect(config).toEqual({
        displayMode: 'compact',
        visibleItems: ['item1', 'item2'],
        itemOrder: ['item1', 'item2'],
        showShortcuts: true,
        showIcons: false,
        compactModeItems: ['item1'],
      });
    });
  });

  describe('setTrayConfig', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(
        setTrayConfig({
          displayMode: 'full',
          visibleItems: [],
          itemOrder: [],
          showShortcuts: true,
          showIcons: true,
        })
      ).rejects.toThrow('Tray config is only available in desktop app');
    });

    it('should invoke tray_set_config when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayConfig({
        displayMode: 'compact',
        visibleItems: ['item1'],
        itemOrder: ['item1'],
        showShortcuts: false,
        showIcons: true,
        compactModeItems: ['item1'],
      });

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_config', {
        config: {
          display_mode: 'compact',
          visible_items: ['item1'],
          item_order: ['item1'],
          show_shortcuts: false,
          show_icons: true,
          compact_mode_items: ['item1'],
        },
      });
    });
  });

  describe('setTrayDisplayMode', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(setTrayDisplayMode('compact')).rejects.toThrow(
        'Tray is only available in desktop app'
      );
    });

    it('should invoke tray_set_display_mode when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayDisplayMode('compact');

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_display_mode', {
        mode: 'compact',
      });
    });
  });

  describe('toggleTrayDisplayMode', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(toggleTrayDisplayMode()).rejects.toThrow(
        'Tray is only available in desktop app'
      );
    });

    it('should invoke tray_toggle_display_mode when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('compact');

      const result = await toggleTrayDisplayMode();

      expect(mockInvoke).toHaveBeenCalledWith('tray_toggle_display_mode');
      expect(result).toBe('compact');
    });
  });

  describe('setTrayItemVisibility', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(setTrayItemVisibility('item1', true)).rejects.toThrow(
        'Tray is only available in desktop app'
      );
    });

    it('should invoke tray_set_item_visibility when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayItemVisibility('show-window', false);

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_item_visibility', {
        itemId: 'show-window',
        visible: false,
      });
    });
  });

  describe('setTrayCompactItems', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await expect(setTrayCompactItems(['item1'])).rejects.toThrow(
        'Tray is only available in desktop app'
      );
    });

    it('should invoke tray_set_compact_items when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayCompactItems(['toggle-chat-widget', 'quit']);

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_compact_items', {
        items: ['toggle-chat-widget', 'quit'],
      });
    });
  });

  describe('updateTrayTooltip', () => {
    it('should do nothing when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await updateTrayTooltip('Test message');

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should invoke tray_update_tooltip when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await updateTrayTooltip('Processing...');

      expect(mockInvoke).toHaveBeenCalledWith('tray_update_tooltip', {
        message: 'Processing...',
      });
    });
  });

  describe('setTrayBusy', () => {
    it('should do nothing when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await setTrayBusy(true, 'Working');

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should invoke tray_set_busy when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayBusy(true, 'Working');

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_busy', {
        busy: true,
        message: 'Working',
      });
    });

    it('should pass null message when not provided', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await setTrayBusy(false);

      expect(mockInvoke).toHaveBeenCalledWith('tray_set_busy', {
        busy: false,
        message: null,
      });
    });
  });

  describe('refreshTrayMenu', () => {
    it('should do nothing when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await refreshTrayMenu();

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('should invoke tray_refresh_menu when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await refreshTrayMenu();

      expect(mockInvoke).toHaveBeenCalledWith('tray_refresh_menu');
    });
  });

  describe('getDefaultCompactItems', () => {
    it('should return default items when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const items = await getDefaultCompactItems();

      expect(items).toEqual([
        'toggle-chat-widget',
        'screenshot-region',
        'clipboard-history',
        'open-settings',
        'quit',
      ]);
    });

    it('should invoke tray_get_default_compact_items when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(['item1', 'item2']);

      const items = await getDefaultCompactItems();

      expect(mockInvoke).toHaveBeenCalledWith('tray_get_default_compact_items');
      expect(items).toEqual(['item1', 'item2']);
    });
  });

  describe('getAllTrayItemIds', () => {
    it('should return empty array when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const items = await getAllTrayItemIds();

      expect(items).toEqual([]);
    });

    it('should invoke tray_get_all_item_ids when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(['show-window', 'quit']);

      const items = await getAllTrayItemIds();

      expect(mockInvoke).toHaveBeenCalledWith('tray_get_all_item_ids');
      expect(items).toEqual(['show-window', 'quit']);
    });
  });

  describe('onTrayConfigChanged', () => {
    it('should return no-op when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const unlisten = await onTrayConfigChanged(() => {});

      expect(typeof unlisten).toBe('function');
      expect(mockListen).not.toHaveBeenCalled();
    });

    it('should listen for tray-config-changed when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const callback = jest.fn();
      await onTrayConfigChanged(callback);

      expect(mockListen).toHaveBeenCalledWith('tray-config-changed', callback);
    });
  });

  describe('onTrayStateChanged', () => {
    it('should return no-op when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const unlisten = await onTrayStateChanged(() => {});

      expect(typeof unlisten).toBe('function');
      expect(mockListen).not.toHaveBeenCalled();
    });

    it('should listen for tray-state-changed when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const callback = jest.fn();
      await onTrayStateChanged(callback);

      expect(mockListen).toHaveBeenCalledWith(
        'tray-state-changed',
        expect.any(Function)
      );
    });

    it('should transform backend state to frontend format', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      let capturedHandler: ((event: { payload: unknown }) => void) | null = null;

      mockListen.mockImplementation(async (_event: string, handler: unknown) => {
        capturedHandler = handler as (event: { payload: unknown }) => void;
        return mockUnlisten;
      });

      const callback = jest.fn();
      await onTrayStateChanged(callback);

      // Simulate event
      if (capturedHandler) {
        (capturedHandler as (event: { payload: unknown }) => void)({
          payload: {
            is_busy: true,
            is_recording: false,
            status_message: 'Test',
          },
        });
      }

      expect(callback).toHaveBeenCalledWith({
        isBusy: true,
        isRecording: false,
        statusMessage: 'Test',
      });
    });
  });
});
