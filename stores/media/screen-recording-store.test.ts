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
