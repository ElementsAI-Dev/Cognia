/**
 * Recording Toolbar API Tests
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Tauri core module
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  showRecordingToolbar,
  hideRecordingToolbar,
  isRecordingToolbarVisible,
  setRecordingToolbarPosition,
  getRecordingToolbarPosition,
  snapRecordingToolbarToEdge,
  toggleRecordingToolbarCompact,
  getRecordingToolbarConfig,
  updateRecordingToolbarConfig,
  getRecordingToolbarState,
  updateRecordingToolbarState,
  setRecordingToolbarHovered,
  destroyRecordingToolbar,
  DEFAULT_RECORDING_TOOLBAR_CONFIG,
  type RecordingToolbarConfig,
  type RecordingToolbarState,
  type SnapEdge,
} from './recording-toolbar';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('Recording Toolbar API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('showRecordingToolbar', () => {
    it('should call recording_toolbar_show command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await showRecordingToolbar();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_show');
    });
  });

  describe('hideRecordingToolbar', () => {
    it('should call recording_toolbar_hide command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await hideRecordingToolbar();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_hide');
    });
  });

  describe('isRecordingToolbarVisible', () => {
    it('should return true when toolbar is visible', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await isRecordingToolbarVisible();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_is_visible');
      expect(result).toBe(true);
    });

    it('should return false when toolbar is hidden', async () => {
      mockInvoke.mockResolvedValueOnce(false);

      const result = await isRecordingToolbarVisible();

      expect(result).toBe(false);
    });
  });

  describe('setRecordingToolbarPosition', () => {
    it('should call command with x and y coordinates', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await setRecordingToolbarPosition(100, 200);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_set_position', {
        x: 100,
        y: 200,
      });
    });
  });

  describe('getRecordingToolbarPosition', () => {
    it('should return position tuple', async () => {
      mockInvoke.mockResolvedValueOnce([150, 250]);

      const result = await getRecordingToolbarPosition();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_get_position');
      expect(result).toEqual([150, 250]);
    });
  });

  describe('snapRecordingToolbarToEdge', () => {
    it.each<SnapEdge>([
      'top',
      'bottom',
      'left',
      'right',
      'topLeft',
      'topRight',
      'bottomLeft',
      'bottomRight',
    ])('should snap to %s edge', async (edge) => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await snapRecordingToolbarToEdge(edge);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_snap_to_edge', {
        edge,
      });
    });
  });

  describe('toggleRecordingToolbarCompact', () => {
    it('should return true when toggled to compact', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const result = await toggleRecordingToolbarCompact();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_toggle_compact');
      expect(result).toBe(true);
    });

    it('should return false when toggled to expanded', async () => {
      mockInvoke.mockResolvedValueOnce(false);

      const result = await toggleRecordingToolbarCompact();

      expect(result).toBe(false);
    });
  });

  describe('getRecordingToolbarConfig', () => {
    it('should return toolbar configuration', async () => {
      const mockConfig: RecordingToolbarConfig = {
        position: 'topCenter',
        autoDock: true,
        autoHide: false,
        autoHideDelayMs: 3000,
        showTimer: true,
        compactMode: false,
        opacity: 1.0,
        rememberPosition: true,
      };

      mockInvoke.mockResolvedValueOnce(mockConfig);

      const result = await getRecordingToolbarConfig();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_get_config');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('updateRecordingToolbarConfig', () => {
    it('should update toolbar configuration', async () => {
      const newConfig: RecordingToolbarConfig = {
        ...DEFAULT_RECORDING_TOOLBAR_CONFIG,
        compactMode: true,
        autoHide: true,
      };

      mockInvoke.mockResolvedValueOnce(undefined);

      await updateRecordingToolbarConfig(newConfig);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_update_config', {
        config: newConfig,
      });
    });
  });

  describe('getRecordingToolbarState', () => {
    it('should return recording state', async () => {
      const mockState: RecordingToolbarState = {
        isRecording: true,
        isPaused: false,
        durationMs: 5000,
        formattedDuration: '00:05',
      };

      mockInvoke.mockResolvedValueOnce(mockState);

      const result = await getRecordingToolbarState();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_get_state');
      expect(result).toEqual(mockState);
    });
  });

  describe('updateRecordingToolbarState', () => {
    it('should update recording state', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await updateRecordingToolbarState(true, false, 10000);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_update_state', {
        isRecording: true,
        isPaused: false,
        durationMs: 10000,
      });
    });

    it('should handle paused state', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await updateRecordingToolbarState(true, true, 30000);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_update_state', {
        isRecording: true,
        isPaused: true,
        durationMs: 30000,
      });
    });
  });

  describe('setRecordingToolbarHovered', () => {
    it('should set hovered state to true', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await setRecordingToolbarHovered(true);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_set_hovered', {
        hovered: true,
      });
    });

    it('should set hovered state to false', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await setRecordingToolbarHovered(false);

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_set_hovered', {
        hovered: false,
      });
    });
  });

  describe('destroyRecordingToolbar', () => {
    it('should call recording_toolbar_destroy command', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await destroyRecordingToolbar();

      expect(mockInvoke).toHaveBeenCalledWith('recording_toolbar_destroy');
    });
  });

  describe('DEFAULT_RECORDING_TOOLBAR_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RECORDING_TOOLBAR_CONFIG).toEqual({
        position: 'topCenter',
        autoDock: true,
        autoHide: false,
        autoHideDelayMs: 3000,
        showTimer: true,
        compactMode: false,
        opacity: 1.0,
        rememberPosition: true,
      });
    });
  });
});
