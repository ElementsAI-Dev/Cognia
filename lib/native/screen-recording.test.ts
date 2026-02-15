/**
 * Screen Recording Tests
 *
 * Tests for screen recording API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  getRecordingStatus,
  getRecordingDuration,
  startFullscreenRecording,
  startWindowRecording,
  startRegionRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  cancelRecording,
  getRecordingConfig,
  updateRecordingConfig,
  getRecordingMonitors,
  checkFFmpeg,
  getAudioDevices,
  getRecordingHistory,
  deleteRecording,
  clearRecordingHistory,
  formatFileSize,
  getDefaultRecordingConfig,
  getAggregatedStorageStatus,
  type RecordingStatus,
  type RecordingConfig,
  type RecordingMetadata,
  type RecordingRegion,
  type MonitorInfo,
  type AggregatedStorageStatus,
} from './screen-recording';
import { formatDuration } from '@/lib/utils';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

describe('ScreenRecording - Control Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordingStatus', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue('Idle');
      const result = await getRecordingStatus();
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_status');
      expect(result).toBe('Idle');
    });

    it('should handle error status', async () => {
      mockInvoke.mockResolvedValue({ Error: 'FFmpeg not found' });
      const result = await getRecordingStatus();
      expect(result).toEqual({ Error: 'FFmpeg not found' });
    });
  });

  describe('getRecordingDuration', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(5000);
      const result = await getRecordingDuration();
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_duration');
      expect(result).toBe(5000);
    });
  });

  describe('startFullscreenRecording', () => {
    it('should call invoke with monitor index', async () => {
      mockInvoke.mockResolvedValue('rec-123');
      const result = await startFullscreenRecording(0);
      expect(mockInvoke).toHaveBeenCalledWith('recording_start_fullscreen', { monitorIndex: 0 });
      expect(result).toBe('rec-123');
    });

    it('should work without monitor index', async () => {
      mockInvoke.mockResolvedValue('rec-123');
      await startFullscreenRecording();
      expect(mockInvoke).toHaveBeenCalledWith('recording_start_fullscreen', { monitorIndex: undefined });
    });
  });

  describe('startWindowRecording', () => {
    it('should call invoke with window title', async () => {
      mockInvoke.mockResolvedValue('rec-123');
      const result = await startWindowRecording('My Window');
      expect(mockInvoke).toHaveBeenCalledWith('recording_start_window', { windowTitle: 'My Window' });
      expect(result).toBe('rec-123');
    });
  });

  describe('startRegionRecording', () => {
    it('should call invoke with region', async () => {
      const region: RecordingRegion = { x: 100, y: 100, width: 800, height: 600 };
      mockInvoke.mockResolvedValue('rec-123');
      
      const result = await startRegionRecording(region);
      expect(mockInvoke).toHaveBeenCalledWith('recording_start_region', {
        x: 100,
        y: 100,
        width: 800,
        height: 600,
      });
      expect(result).toBe('rec-123');
    });
  });

  describe('pauseRecording', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await pauseRecording();
      expect(mockInvoke).toHaveBeenCalledWith('recording_pause');
    });
  });

  describe('resumeRecording', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await resumeRecording();
      expect(mockInvoke).toHaveBeenCalledWith('recording_resume');
    });
  });

  describe('stopRecording', () => {
    it('should call invoke and return metadata', async () => {
      const mockMetadata: RecordingMetadata = {
        id: 'rec-123',
        start_time: Date.now(),
        duration_ms: 5000,
        width: 1920,
        height: 1080,
        mode: 'fullscreen',
        file_size: 1000000,
        has_audio: true,
      };
      mockInvoke.mockResolvedValue(mockMetadata);

      const result = await stopRecording();
      expect(mockInvoke).toHaveBeenCalledWith('recording_stop');
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('cancelRecording', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await cancelRecording();
      expect(mockInvoke).toHaveBeenCalledWith('recording_cancel');
    });
  });
});

describe('ScreenRecording - Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordingConfig', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(getDefaultRecordingConfig());
      const result = await getRecordingConfig();
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_config');
      expect(result.format).toBe('mp4');
    });
  });

  describe('updateRecordingConfig', () => {
    it('should call invoke with config', async () => {
      const config = getDefaultRecordingConfig();
      mockInvoke.mockResolvedValue(undefined);

      await updateRecordingConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('recording_update_config', { config });
    });
  });
});

describe('ScreenRecording - System Info', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordingMonitors', () => {
    it('should return monitors', async () => {
      const mockMonitors: MonitorInfo[] = [
        { index: 0, name: 'Primary', x: 0, y: 0, width: 1920, height: 1080, is_primary: true, scale_factor: 1 },
        { index: 1, name: 'Secondary', x: 1920, y: 0, width: 1920, height: 1080, is_primary: false, scale_factor: 1 },
      ];
      mockInvoke.mockResolvedValue(mockMonitors);

      const result = await getRecordingMonitors();
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_monitors');
      expect(result).toHaveLength(2);
    });
  });

  describe('checkFFmpeg', () => {
    it('should return availability', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await checkFFmpeg();
      expect(mockInvoke).toHaveBeenCalledWith('recording_check_ffmpeg');
      expect(result).toBe(true);
    });
  });

  describe('getAudioDevices', () => {
    it('should return audio devices', async () => {
      mockInvoke.mockResolvedValue({
        system_audio_available: true,
        microphones: [{ id: 'mic-1', name: 'Default Microphone', is_default: true }],
      });

      const result = await getAudioDevices();
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_audio_devices');
      expect(result.system_audio_available).toBe(true);
      expect(result.microphones).toHaveLength(1);
    });
  });
});

describe('ScreenRecording - History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRecordingHistory', () => {
    it('should call invoke with count', async () => {
      mockInvoke.mockResolvedValue([]);
      await getRecordingHistory(10);
      expect(mockInvoke).toHaveBeenCalledWith('recording_get_history', { count: 10 });
    });
  });

  describe('deleteRecording', () => {
    it('should call invoke with id', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await deleteRecording('rec-123');
      expect(mockInvoke).toHaveBeenCalledWith('recording_delete', { id: 'rec-123' });
    });
  });

  describe('clearRecordingHistory', () => {
    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearRecordingHistory();
      expect(mockInvoke).toHaveBeenCalledWith('recording_clear_history');
    });
  });
});

describe('ScreenRecording - Helper Functions', () => {
  describe('formatDuration', () => {
    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('0:05');
      expect(formatDuration(65000)).toBe('1:05');
      expect(formatDuration(3665000)).toBe('1:01:05');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('getDefaultRecordingConfig', () => {
    it('should return default config', () => {
      const config = getDefaultRecordingConfig();
      expect(config.format).toBe('mp4');
      expect(config.codec).toBe('h264');
      expect(config.frame_rate).toBe(30);
      expect(config.quality).toBe(80);
      expect(config.capture_system_audio).toBe(true);
      expect(config.capture_microphone).toBe(false);
      expect(config.show_cursor).toBe(true);
      expect(config.countdown_seconds).toBe(3);
    });

    it('should include hardware acceleration fields', () => {
      const config = getDefaultRecordingConfig();
      expect(config.use_hardware_acceleration).toBe(true);
      expect(config.preferred_encoder).toBeUndefined();
      expect(config.system_audio_device).toBeUndefined();
      expect(config.microphone_device).toBeUndefined();
    });

    it('should have all required fields defined', () => {
      const config = getDefaultRecordingConfig();
      const requiredKeys: (keyof RecordingConfig)[] = [
        'format', 'codec', 'frame_rate', 'quality', 'bitrate',
        'capture_system_audio', 'capture_microphone', 'show_cursor',
        'highlight_clicks', 'countdown_seconds', 'show_indicator',
        'max_duration', 'pause_on_minimize', 'use_hardware_acceleration',
      ];
      for (const key of requiredKeys) {
        expect(config[key]).toBeDefined();
      }
    });
  });
});

describe('ScreenRecording - Aggregated Storage API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAggregatedStorageStatus', () => {
    it('should call invoke with correct command', async () => {
      const mockStatus: AggregatedStorageStatus = {
        stats: { recordingsSize: 512, screenshotsSize: 512, recordingsCount: 3, screenshotsCount: 2, availableSpace: 100000, totalSpace: 500000 },
        usagePercent: 15.5,
        isExceeded: false,
        config: { recordingsDir: '/recordings', screenshotsDir: '/screenshots', organizeByDate: true, maxStorageGb: 10, autoCleanupDays: 30, preservePinned: true, semanticNaming: true },
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getAggregatedStorageStatus();
      expect(mockInvoke).toHaveBeenCalledWith('storage_get_aggregated_status');
      expect(result.usagePercent).toBe(15.5);
      expect(result.isExceeded).toBe(false);
      expect(result.stats.recordingsCount).toBe(3);
    });

    it('should handle exceeded storage', async () => {
      const mockStatus: AggregatedStorageStatus = {
        stats: { recordingsSize: 90000000, screenshotsSize: 9999999, recordingsCount: 80, screenshotsCount: 20, availableSpace: 100, totalSpace: 500000 },
        usagePercent: 95.0,
        isExceeded: true,
        config: { recordingsDir: '/recordings', screenshotsDir: '/screenshots', organizeByDate: true, maxStorageGb: 10, autoCleanupDays: 30, preservePinned: true, semanticNaming: true },
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await getAggregatedStorageStatus();
      expect(result.isExceeded).toBe(true);
      expect(result.usagePercent).toBe(95.0);
    });
  });
});

describe('ScreenRecording Types', () => {
  it('should have correct RecordingStatus values', () => {
    const statuses: RecordingStatus[] = ['Idle', 'Countdown', 'Recording', 'Paused', 'Processing'];
    statuses.forEach(status => {
      expect(status).toBeDefined();
    });
  });

  it('should handle error status', () => {
    const errorStatus: RecordingStatus = { Error: 'Test error' };
    expect(errorStatus.Error).toBe('Test error');
  });
});
