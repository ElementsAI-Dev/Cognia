/**
 * Screen Recording Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import {
  useScreenRecordingStore,
  useIsRecording,
  useRecordingStatus,
} from './screen-recording-store';
import * as screenRecordingModule from '@/lib/native/screen-recording';
import * as utilsModule from '@/lib/native/utils';

// Mock Tauri event listener
jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(jest.fn()),
}));

// Mock recording toolbar
jest.mock('@/lib/native/recording-toolbar', () => ({
  showRecordingToolbar: jest.fn().mockResolvedValue(undefined),
  updateRecordingToolbarState: jest.fn().mockResolvedValue(undefined),
  hideRecordingToolbar: jest.fn().mockResolvedValue(undefined),
}));

// Mock the native module
jest.mock('@/lib/native/screen-recording', () => ({
  getRecordingStatus: jest.fn().mockResolvedValue('Idle'),
  getRecordingDuration: jest.fn().mockResolvedValue(0),
  startFullscreenRecording: jest.fn().mockResolvedValue('test-recording-id'),
  startWindowRecording: jest.fn().mockResolvedValue('test-recording-id'),
  startRegionRecording: jest.fn().mockResolvedValue('test-recording-id'),
  pauseRecording: jest.fn().mockResolvedValue(undefined),
  resumeRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue({
    id: 'test-recording-id',
    start_time: Date.now(),
    end_time: Date.now() + 60000,
    duration_ms: 60000,
    width: 1920,
    height: 1080,
    mode: 'fullscreen',
    file_path: '/path/to/recording.mp4',
    file_size: 1024 * 1024,
    has_audio: true,
  }),
  cancelRecording: jest.fn().mockResolvedValue(undefined),
  getRecordingConfig: jest.fn().mockResolvedValue({
    format: 'mp4',
    codec: 'h264',
    frame_rate: 30,
    quality: 80,
    bitrate: 0,
    capture_system_audio: true,
    capture_microphone: false,
    show_cursor: true,
    highlight_clicks: false,
    countdown_seconds: 3,
    show_indicator: true,
    max_duration: 0,
    pause_on_minimize: false,
    use_hardware_acceleration: true,
  }),
  updateRecordingConfig: jest.fn().mockResolvedValue(undefined),
  getRecordingMonitors: jest.fn().mockResolvedValue([
    {
      index: 0,
      name: 'Primary Monitor',
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      is_primary: true,
      scale_factor: 1.0,
    },
  ]),
  checkFFmpeg: jest.fn().mockResolvedValue(true),
  getAudioDevices: jest.fn().mockResolvedValue({
    system_audio_available: true,
    microphones: [{ id: 'default', name: 'Default Microphone', is_default: true }],
  }),
  getRecordingHistory: jest.fn().mockResolvedValue([]),
  deleteRecording: jest.fn().mockResolvedValue(undefined),
  clearRecordingHistory: jest.fn().mockResolvedValue(undefined),
  getStorageStats: jest.fn().mockResolvedValue({ total_size: 0, file_count: 0 }),
  getStorageConfig: jest.fn().mockResolvedValue({ max_storage_gb: 10, auto_cleanup_days: 30 }),
  getStorageUsagePercent: jest.fn().mockResolvedValue(0),
  isStorageExceeded: jest.fn().mockResolvedValue(false),
  pinRecording: jest.fn().mockResolvedValue(true),
  unpinRecording: jest.fn().mockResolvedValue(true),
  addRecordingTag: jest.fn().mockResolvedValue(true),
  removeRecordingTag: jest.fn().mockResolvedValue(true),
  getRecordingStats: jest.fn().mockResolvedValue({ total_count: 0, total_size: 0, total_duration: 0 }),
  getRecordingById: jest.fn().mockResolvedValue(null),
  searchRecordingsByTag: jest.fn().mockResolvedValue([]),
  updateRecordingToolbarState: jest.fn().mockResolvedValue(undefined),
  updateStorageConfig: jest.fn().mockResolvedValue(undefined),
  cleanupStorage: jest.fn().mockResolvedValue({ filesDeleted: 0, bytesFreed: 0 }),
  getFFmpegInfo: jest.fn().mockResolvedValue({ available: true, version: '6.0', version_full: '6.0.0', path: '/usr/bin/ffmpeg', version_ok: true, encoders: [], decoders: [] }),
  checkHardwareAcceleration: jest.fn().mockResolvedValue({ available: false, encoders: [] }),
  checkFFmpegVersion: jest.fn().mockResolvedValue(true),
  getFFmpegInstallGuide: jest.fn().mockResolvedValue({ platform: 'windows', download_url: '', instructions: [] }),
  generateRecordingFilename: jest.fn().mockResolvedValue('recording.mp4'),
  getRecordingPath: jest.fn().mockResolvedValue('/recordings/recording.mp4'),
  getAggregatedStorageStatus: jest.fn().mockResolvedValue({
    stats: { recordingsSize: 0, screenshotsSize: 0, recordingsCount: 0, screenshotsCount: 0, availableSpace: 100000, totalSpace: 500000 },
    usagePercent: 0,
    isExceeded: false,
    config: { recordingsDir: '', screenshotsDir: '', organizeByDate: true, maxStorageGb: 10, autoCleanupDays: 30, preservePinned: true, semanticNaming: true },
  }),
  getDefaultRecordingConfig: jest.fn().mockReturnValue({
    format: 'mp4',
    codec: 'h264',
    frame_rate: 30,
    quality: 80,
    bitrate: 0,
    capture_system_audio: true,
    capture_microphone: false,
    show_cursor: true,
    highlight_clicks: false,
    countdown_seconds: 3,
    show_indicator: true,
    max_duration: 0,
    pause_on_minimize: false,
    use_hardware_acceleration: true,
  }),
}));

// Mock isTauri to return true for tests
jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn().mockReturnValue(true),
}));

// Typed mock references
const mocks = {
  pauseRecording: screenRecordingModule.pauseRecording as jest.Mock,
  resumeRecording: screenRecordingModule.resumeRecording as jest.Mock,
  cancelRecording: screenRecordingModule.cancelRecording as jest.Mock,
  updateRecordingConfig: screenRecordingModule.updateRecordingConfig as jest.Mock,
  getRecordingHistory: screenRecordingModule.getRecordingHistory as jest.Mock,
  deleteRecording: screenRecordingModule.deleteRecording as jest.Mock,
  clearRecordingHistory: screenRecordingModule.clearRecordingHistory as jest.Mock,
  getRecordingStatus: screenRecordingModule.getRecordingStatus as jest.Mock,
  isTauri: utilsModule.isTauri as jest.Mock,
};

describe('useScreenRecordingStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useScreenRecordingStore.setState({
        status: 'Idle',
        recordingId: null,
        duration: 0,
        isLoading: false,
        isInitialized: false,
        error: null,
      });
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      expect(result.current.status).toBe('Idle');
      expect(result.current.recordingId).toBeNull();
      expect(result.current.duration).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have default config', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      expect(result.current.config.format).toBe('mp4');
      expect(result.current.config.frame_rate).toBe(30);
      expect(result.current.config.quality).toBe(80);
    });
  });

  describe('initialize', () => {
    it('should initialize store with data from native', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.ffmpegAvailable).toBe(true);
      expect(result.current.monitors.length).toBe(1);
    });

    it('should set selectedMonitor to primary monitor', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.selectedMonitor).toBe(0);
    });
  });

  describe('startRecording', () => {
    it('should start fullscreen recording', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      // Initialize first
      await act(async () => {
        await result.current.initialize();
      });

      // Start recording
      let recordingId: string | null = null;
      await act(async () => {
        recordingId = await result.current.startRecording('fullscreen');
      });

      expect(recordingId).toBe('test-recording-id');
      expect(result.current.recordingId).toBe('test-recording-id');
      expect(result.current.selectedMode).toBe('fullscreen');
    });

    it('should return null when FFmpeg is not available', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      // Set ffmpegAvailable to false directly
      act(() => {
        useScreenRecordingStore.setState({ ffmpegAvailable: false, isInitialized: true });
      });

      let recordingId: string | null = null;
      await act(async () => {
        recordingId = await result.current.startRecording('fullscreen');
      });

      expect(recordingId).toBeNull();
      expect(result.current.error).toContain('FFmpeg');
    });
  });

  describe('pause and resume', () => {
    it('should pause recording', async () => {
      mocks.getRecordingStatus.mockResolvedValueOnce('Paused');

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.pause();
      });

      expect(mocks.pauseRecording).toHaveBeenCalled();
    });

    it('should resume recording', async () => {
      mocks.getRecordingStatus.mockResolvedValueOnce('Recording');

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.resume();
      });

      expect(mocks.resumeRecording).toHaveBeenCalled();
    });
  });

  describe('stop and cancel', () => {
    it('should stop recording and return metadata', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      let metadata: unknown = null;
      await act(async () => {
        metadata = await result.current.stop();
      });

      expect(metadata).not.toBeNull();
      expect((metadata as { id: string })?.id).toBe('test-recording-id');
      expect(result.current.recordingId).toBeNull();
      expect(result.current.duration).toBe(0);
    });

    it('should cancel recording', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.cancel();
      });

      expect(mocks.cancelRecording).toHaveBeenCalled();
      expect(result.current.recordingId).toBeNull();
    });
  });

  describe('config management', () => {
    it('should update config', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.updateConfig({ frame_rate: 60 });
      });

      expect(mocks.updateRecordingConfig).toHaveBeenCalled();
      expect(result.current.config.frame_rate).toBe(60);
    });

    it('should reset config to defaults', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      // Change config first
      act(() => {
        useScreenRecordingStore.setState({
          config: { ...result.current.config, frame_rate: 60 },
        });
      });

      // Reset
      act(() => {
        result.current.resetConfig();
      });

      expect(result.current.config.frame_rate).toBe(30);
    });
  });

  describe('history management', () => {
    it('should refresh history', async () => {
      mocks.getRecordingHistory.mockResolvedValueOnce([
        { id: 'rec-1', duration_ms: 60000 },
        { id: 'rec-2', duration_ms: 120000 },
      ]);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.refreshHistory();
      });

      expect(result.current.history.length).toBe(2);
    });

    it('should delete from history', async () => {
      mocks.getRecordingHistory.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.deleteFromHistory('rec-1');
      });

      expect(mocks.deleteRecording).toHaveBeenCalledWith('rec-1');
    });

    it('should clear history', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      // Add some history first
      act(() => {
        useScreenRecordingStore.setState({
          history: [{ id: 'rec-1' } as unknown as screenRecordingModule.RecordingHistoryEntry],
        });
      });

      await act(async () => {
        await result.current.clearHistory();
      });

      expect(mocks.clearRecordingHistory).toHaveBeenCalled();
      expect(result.current.history).toEqual([]);
    });
  });

  describe('UI state', () => {
    it('should set selected monitor', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      act(() => {
        result.current.setSelectedMonitor(1);
      });

      expect(result.current.selectedMonitor).toBe(1);
    });

    it('should set selected mode', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      act(() => {
        result.current.setSelectedMode('window');
      });

      expect(result.current.selectedMode).toBe('window');
    });

    it('should set region selection', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      const region = { x: 100, y: 100, width: 800, height: 600 };
      act(() => {
        result.current.setRegionSelection(region);
      });

      expect(result.current.regionSelection).toEqual(region);
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      act(() => {
        useScreenRecordingStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

describe('useIsRecording', () => {
  it('should return true when recording', () => {
    act(() => {
      useScreenRecordingStore.setState({ status: 'Recording' });
    });

    const { result } = renderHook(() => useIsRecording());
    expect(result.current).toBe(true);
  });

  it('should return true when paused', () => {
    act(() => {
      useScreenRecordingStore.setState({ status: 'Paused' });
    });

    const { result } = renderHook(() => useIsRecording());
    expect(result.current).toBe(true);
  });

  it('should return true when countdown', () => {
    act(() => {
      useScreenRecordingStore.setState({ status: 'Countdown' });
    });

    const { result } = renderHook(() => useIsRecording());
    expect(result.current).toBe(true);
  });

  it('should return false when idle', () => {
    act(() => {
      useScreenRecordingStore.setState({ status: 'Idle' });
    });

    const { result } = renderHook(() => useIsRecording());
    expect(result.current).toBe(false);
  });
});

describe('useRecordingStatus', () => {
  it('should return current status', () => {
    act(() => {
      useScreenRecordingStore.setState({ status: 'Recording' });
    });

    const { result } = renderHook(() => useRecordingStatus());
    expect(result.current).toBe('Recording');
  });
});

describe('useScreenRecordingStore - Edge Cases', () => {
  beforeEach(() => {
    act(() => {
      useScreenRecordingStore.setState({
        status: 'Idle',
        recordingId: null,
        duration: 0,
        isLoading: false,
        isInitialized: false,
        error: null,
      });
    });
    jest.clearAllMocks();
  });

  describe('error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const mockGetRecordingStatus = screenRecordingModule.getRecordingStatus as jest.Mock;
      mockGetRecordingStatus.mockRejectedValueOnce(new Error('Init failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.error).toBeTruthy();
    });

    it('should handle pause errors', async () => {
      mocks.pauseRecording.mockRejectedValueOnce(new Error('Pause failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.error).toContain('Pause');
    });

    it('should handle resume errors', async () => {
      mocks.resumeRecording.mockRejectedValueOnce(new Error('Resume failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.resume();
      });

      expect(result.current.error).toContain('Resume');
    });

    it('should handle stop errors', async () => {
      const mockStopRecording = screenRecordingModule.stopRecording as jest.Mock;
      mockStopRecording.mockRejectedValueOnce(new Error('Stop failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        const metadata = await result.current.stop();
        expect(metadata).toBeNull();
      });

      expect(result.current.error).toContain('Stop');
    });

    it('should handle cancel errors', async () => {
      mocks.cancelRecording.mockRejectedValueOnce(new Error('Cancel failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.error).toContain('Cancel');
    });
  });

  describe('non-Tauri environment', () => {
    it('should skip initialization in web environment', async () => {
      mocks.isTauri.mockReturnValue(false);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(screenRecordingModule.getRecordingStatus).not.toHaveBeenCalled();
    });

    it('should return null for start recording in web', async () => {
      mocks.isTauri.mockReturnValue(false);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        const recordingId = await result.current.startRecording('fullscreen');
        expect(recordingId).toBeNull();
      });
    });

    it('should skip all operations in web environment', async () => {
      mocks.isTauri.mockReturnValue(false);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.pause();
        await result.current.resume();
        await result.current.stop();
        await result.current.cancel();
        await result.current.refreshMonitors();
        await result.current.refreshAudioDevices();
        await result.current.refreshHistory();
        await result.current.deleteFromHistory('test');
        await result.current.clearHistory();
      });

      expect(mocks.pauseRecording).not.toHaveBeenCalled();
      expect(mocks.resumeRecording).not.toHaveBeenCalled();
    });
  });

  describe('recording modes', () => {
    beforeEach(() => {
      mocks.isTauri.mockReturnValue(true);
    });

    it('should start window recording', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording('window', { windowTitle: 'Test Window' });
      });

      expect(screenRecordingModule.startWindowRecording).toHaveBeenCalledWith('Test Window');
      expect(result.current.selectedMode).toBe('window');
    });

    it('should start region recording', async () => {
      const region = { x: 100, y: 100, width: 800, height: 600 };
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        await result.current.startRecording('region', { region });
      });

      expect(screenRecordingModule.startRegionRecording).toHaveBeenCalledWith(region);
      expect(result.current.selectedMode).toBe('region');
    });

    it('should fail region recording without region parameter', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.initialize();
      });

      await act(async () => {
        const recordingId = await result.current.startRecording('region');
        expect(recordingId).toBeNull();
      });

      expect(result.current.error).toContain('Region is required');
    });
  });

  describe('FFmpeg check', () => {
    beforeEach(() => {
      mocks.isTauri.mockReturnValue(true);
    });

    it('should update ffmpegAvailable when checking', async () => {
      const mockCheckFFmpeg = screenRecordingModule.checkFFmpeg as jest.Mock;
      mockCheckFFmpeg.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        const available = await result.current.checkFfmpeg();
        expect(available).toBe(true);
      });

      expect(result.current.ffmpegAvailable).toBe(true);
    });

    it('should handle FFmpeg check failure', async () => {
      const mockCheckFFmpeg = screenRecordingModule.checkFFmpeg as jest.Mock;
      mockCheckFFmpeg.mockRejectedValueOnce(new Error('Check failed'));

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        const available = await result.current.checkFfmpeg();
        expect(available).toBe(false);
      });

      expect(result.current.ffmpegAvailable).toBe(false);
    });
  });

  describe('audio devices', () => {
    it('should refresh audio devices', async () => {
      const mockGetAudioDevices = screenRecordingModule.getAudioDevices as jest.Mock;
      mockGetAudioDevices.mockResolvedValueOnce({
        system_audio_available: true,
        microphones: [
          { id: 'mic-1', name: 'Microphone 1', is_default: true },
          { id: 'mic-2', name: 'Microphone 2', is_default: false },
        ],
      });

      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.refreshAudioDevices();
      });

      expect(result.current.audioDevices.system_audio_available).toBe(true);
      expect(result.current.audioDevices.microphones.length).toBe(2);
    });
  });

  describe('persisted state', () => {
    it('should preserve config across instances', () => {
      const { result: result1 } = renderHook(() => useScreenRecordingStore());

      act(() => {
        result1.current.setSelectedMode('window');
      });

      const { result: result2 } = renderHook(() => useScreenRecordingStore());

      expect(result2.current.selectedMode).toBe('window');
    });

    it('should preserve showRecordingIndicator setting', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      act(() => {
        result.current.setShowIndicator(false);
      });

      expect(result.current.showRecordingIndicator).toBe(false);
    });
  });

  describe('client-side duration tracking state', () => {
    it('should have initial duration tracking fields', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      expect(result.current.duration).toBe(0);
    });

    it('should reset duration on stop', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      // Set a non-zero duration
      act(() => {
        useScreenRecordingStore.setState({ duration: 5000 });
      });
      expect(result.current.duration).toBe(5000);

      // Stop should reset duration
      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.duration).toBe(0);
    });

    it('should reset duration on cancel', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      act(() => {
        useScreenRecordingStore.setState({ duration: 3000 });
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.duration).toBe(0);
    });
  });

  describe('config with hardware acceleration', () => {
    it('should include use_hardware_acceleration in default config', () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      expect(result.current.config.use_hardware_acceleration).toBe(true);
    });

    it('should update hardware acceleration config', async () => {
      const { result } = renderHook(() => useScreenRecordingStore());

      await act(async () => {
        await result.current.updateConfig({ use_hardware_acceleration: false });
      });

      expect(result.current.config.use_hardware_acceleration).toBe(false);
    });
  });
});
