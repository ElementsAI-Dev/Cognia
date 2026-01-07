/**
 * Tests for useScreenRecording hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useScreenRecording } from './use-screen-recording';
import { useScreenRecordingStore } from '@/stores/media';

// Mock the stores
jest.mock('@/stores/media', () => ({
  useScreenRecordingStore: jest.fn(),
  useIsRecording: jest.fn(() => false),
}));

// Mock isTauri
const mockIsTauri = jest.fn(() => true);
jest.mock('@/lib/native/utils', () => ({
  isTauri: () => mockIsTauri(),
}));

describe('useScreenRecording', () => {
  const mockStore = {
    status: 'Idle',
    duration: 0,
    monitors: [
      { index: 0, name: 'Primary Monitor', width: 1920, height: 1080, is_primary: true },
    ],
    selectedMonitor: 0,
    ffmpegAvailable: true,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: jest.fn().mockResolvedValue(undefined),
    startRecording: jest.fn().mockResolvedValue('test-recording-id'),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue({ file_path: '/path/to/video.mp4' }),
    cancel: jest.fn().mockResolvedValue(undefined),
    setSelectedMonitor: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  describe('initialization', () => {
    it('should return correct initial state', () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isCountdown).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAvailable).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should auto-initialize by default', async () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isInitialized: false,
      });

      renderHook(() => useScreenRecording());

      await waitFor(() => {
        expect(mockStore.initialize).toHaveBeenCalled();
      });
    });

    it('should not auto-initialize when autoInitialize is false', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isInitialized: false,
      });

      renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(mockStore.initialize).not.toHaveBeenCalled();
    });
  });

  describe('recording controls', () => {
    it('should start fullscreen recording', async () => {
      const onRecordingStart = jest.fn();
      const { result } = renderHook(() => 
        useScreenRecording({ autoInitialize: false, onRecordingStart })
      );

      await act(async () => {
        const recordingId = await result.current.startFullscreen(0);
        expect(recordingId).toBe('test-recording-id');
      });

      expect(mockStore.startRecording).toHaveBeenCalledWith('fullscreen', { monitorIndex: 0 });
      expect(onRecordingStart).toHaveBeenCalledWith('test-recording-id');
    });

    it('should start window recording', async () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      await act(async () => {
        const recordingId = await result.current.startWindow('Test Window');
        expect(recordingId).toBe('test-recording-id');
      });

      expect(mockStore.startRecording).toHaveBeenCalledWith('window', { windowTitle: 'Test Window' });
    });

    it('should start region recording', async () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));
      const region = { x: 100, y: 100, width: 800, height: 600 };

      await act(async () => {
        const recordingId = await result.current.startRegion(region);
        expect(recordingId).toBe('test-recording-id');
      });

      expect(mockStore.startRecording).toHaveBeenCalledWith('region', { region });
    });

    it('should pause recording', async () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      await act(async () => {
        await result.current.pause();
      });

      expect(mockStore.pause).toHaveBeenCalled();
    });

    it('should resume recording', async () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      await act(async () => {
        await result.current.resume();
      });

      expect(mockStore.resume).toHaveBeenCalled();
    });

    it('should stop recording and call callback', async () => {
      const onRecordingStop = jest.fn();
      const { result } = renderHook(() => 
        useScreenRecording({ autoInitialize: false, onRecordingStop })
      );

      await act(async () => {
        const filePath = await result.current.stop();
        expect(filePath).toBe('/path/to/video.mp4');
      });

      expect(mockStore.stop).toHaveBeenCalled();
      expect(onRecordingStop).toHaveBeenCalledWith('/path/to/video.mp4');
    });

    it('should cancel recording', async () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockStore.cancel).toHaveBeenCalled();
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.formatDuration(0)).toBe('00:00');
      expect(result.current.formatDuration(5000)).toBe('00:05');
      expect(result.current.formatDuration(65000)).toBe('01:05');
      expect(result.current.formatDuration(3665000)).toBe('01:01:05');
    });
  });

  describe('status states', () => {
    it('should correctly identify paused state', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        status: 'Paused',
      });

      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.isPaused).toBe(true);
      expect(result.current.isCountdown).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should correctly identify countdown state', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        status: 'Countdown',
      });

      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.isPaused).toBe(false);
      expect(result.current.isCountdown).toBe(true);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should correctly identify processing state', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        status: 'Processing',
      });

      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.isPaused).toBe(false);
      expect(result.current.isCountdown).toBe(false);
      expect(result.current.isProcessing).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should call onError callback when error occurs', async () => {
      const onError = jest.fn();
      
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        error: 'Test error',
      });

      renderHook(() => useScreenRecording({ autoInitialize: false, onError }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Test error');
      });
    });

    it('should clear error', () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      act(() => {
        result.current.clearError();
      });

      expect(mockStore.clearError).toHaveBeenCalled();
    });
  });

  describe('monitor selection', () => {
    it('should set selected monitor', () => {
      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      act(() => {
        result.current.setSelectedMonitor(1);
      });

      expect(mockStore.setSelectedMonitor).toHaveBeenCalledWith(1);
    });
  });

  describe('availability', () => {
    it('should be unavailable when FFmpeg is not available', () => {
      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        ffmpegAvailable: false,
      });

      const { result } = renderHook(() => useScreenRecording({ autoInitialize: false }));

      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('non-tauri environment', () => {
    it('disables availability and initialization', async () => {
      mockIsTauri.mockReturnValue(false);

      (useScreenRecordingStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isInitialized: false,
      });

      const { result } = renderHook(() => useScreenRecording());

      expect(result.current.isAvailable).toBe(false);
      await waitFor(() => {
        expect(mockStore.initialize).not.toHaveBeenCalled();
      });
    });
  });
});
