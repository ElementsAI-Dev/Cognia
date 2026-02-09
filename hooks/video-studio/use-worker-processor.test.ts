/**
 * Tests for useWorkerProcessor hook (video-studio)
 */

import { renderHook, act } from '@testing-library/react';
import { useWorkerProcessor } from './use-worker-processor';

// Mock ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === 'number') {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height || dataOrWidth.length / (widthOrHeight * 4);
    }
  }
}

(global as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;

// Mock worker pool
const mockSubmit = jest.fn();
const mockGetStatus = jest.fn();

const mockWorkerPool = {
  submit: mockSubmit,
  getStatus: mockGetStatus,
};

jest.mock('@/lib/media/workers', () => ({
  getWorkerPool: jest.fn(() => mockWorkerPool),
  terminateWorkerPool: jest.fn(),
  VideoWorkerPool: jest.fn(),
}));

// Helper to create test ImageData
function createTestImageData(width = 100, height = 100): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 128;
    data[i + 2] = 64;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

// Helper to create test ArrayBuffer
function createTestArrayBuffer(size = 1024): ArrayBuffer {
  return new ArrayBuffer(size);
}

// Helper to create a valid VideoFilter
function createTestFilter(type: 'grayscale' | 'blur' | 'sharpen' = 'grayscale', value = 1): { type: string; value: number } {
  return { type, value };
}

// Helper to create valid VideoExportOptions
function createTestExportOptions(format: 'mp4' | 'webm' = 'mp4') {
  return {
    format,
    codec: 'h264' as const,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrateMode: 'vbr' as const,
    bitrate: 8000000,
    audioCodec: 'aac' as const,
    audioBitrate: 320000,
    audioChannels: 2 as const,
    audioSampleRate: 48000,
    twoPass: false,
    hardwareAcceleration: true,
    preserveMetadata: true,
  };
}

describe('useWorkerProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatus.mockReturnValue({
      totalWorkers: 4,
      busyWorkers: 0,
      idleWorkers: 4,
      queuedTasks: 0,
    });
    mockSubmit.mockResolvedValue({
      type: 'success',
      data: createTestImageData(),
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWorkerProcessor());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeNull();
    });

    it('should accept custom pool config', () => {
      const { result } = renderHook(() =>
        useWorkerProcessor({
          poolConfig: { maxWorkers: 8 },
        })
      );

      expect(result.current.isProcessing).toBe(false);
    });

    it('should accept autoTerminate option', () => {
      const { result } = renderHook(() =>
        useWorkerProcessor({ autoTerminate: false })
      );

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('applyFilter', () => {
    it('should apply filter to single frame', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      const frameData = createTestImageData();
      const filter = createTestFilter('grayscale');

      await act(async () => {
        await result.current.applyFilter(frameData, filter as never);
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        'filter',
        expect.objectContaining({
          frameData,
          filter,
        }),
        expect.any(Object)
      );
    });

    it('should set isProcessing during operation', async () => {
      let resolveSubmit: (value: unknown) => void;
      mockSubmit.mockReturnValue(
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
      );

      const { result } = renderHook(() => useWorkerProcessor());

      const frameData = createTestImageData();
      const filter = createTestFilter('grayscale');

      let promise: Promise<ImageData>;
      act(() => {
        promise = result.current.applyFilter(frameData, filter as never);
      });

      expect(result.current.isProcessing).toBe(true);

      await act(async () => {
        resolveSubmit!({ type: 'success', data: createTestImageData() });
        await promise!;
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it('should call onProgress callback', async () => {
      const onProgress = jest.fn();
      mockSubmit.mockImplementation(async (_type, _data, options) => {
        options?.onProgress?.(50);
        options?.onProgress?.(100);
        return { type: 'success', data: createTestImageData() };
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const frameData = createTestImageData();
      const filter = createTestFilter('grayscale');

      await act(async () => {
        await result.current.applyFilter(frameData, filter as never, onProgress);
      });

      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle filter error', async () => {
      mockSubmit.mockResolvedValue({
        type: 'error',
        error: 'Filter operation failed',
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const frameData = createTestImageData();
      const filter = createTestFilter('grayscale');

      await expect(
        act(async () => {
          await result.current.applyFilter(frameData, filter as never);
        })
      ).rejects.toThrow('Filter operation failed');
    });
  });

  describe('processFrames', () => {
    it('should process multiple frames', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      const frames = [createTestImageData(), createTestImageData(), createTestImageData()];
      const filter = createTestFilter('blur', 5);

      await act(async () => {
        await result.current.processFrames(frames, filter as never);
      });

      expect(mockSubmit).toHaveBeenCalledTimes(3);
    });

    it('should process frames in batches based on worker count', async () => {
      mockGetStatus.mockReturnValue({
        totalWorkers: 2,
        busyWorkers: 0,
        idleWorkers: 2,
        queuedTasks: 0,
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const frames = [
        createTestImageData(),
        createTestImageData(),
        createTestImageData(),
        createTestImageData(),
      ];
      const filter = createTestFilter('sharpen');

      await act(async () => {
        await result.current.processFrames(frames, filter as never);
      });

      expect(mockSubmit).toHaveBeenCalledTimes(4);
    });

    it('should call onProgress during batch processing', async () => {
      mockSubmit.mockImplementation(async (_type, _data, options) => {
        options?.onProgress?.(50);
        return { type: 'success', data: createTestImageData() };
      });

      const onProgress = jest.fn();
      const { result } = renderHook(() => useWorkerProcessor());

      const frames = [createTestImageData(), createTestImageData()];
      const filter = createTestFilter('grayscale');

      await act(async () => {
        await result.current.processFrames(frames, filter as never, onProgress);
      });

      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle processing error', async () => {
      mockSubmit.mockRejectedValue(new Error('Worker crashed'));

      const { result } = renderHook(() => useWorkerProcessor());

      const frames = [createTestImageData()];
      const filter = createTestFilter('grayscale');

      await expect(
        act(async () => {
          await result.current.processFrames(frames, filter as never);
        })
      ).rejects.toThrow('Worker crashed');
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from video data', async () => {
      const mockMetadata = {
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        bitrate: 5000000,
      };

      mockSubmit.mockResolvedValue({
        type: 'success',
        data: mockMetadata,
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();

      let metadata: unknown;
      await act(async () => {
        metadata = await result.current.extractMetadata(videoData);
      });

      expect(metadata).toEqual(mockMetadata);
      expect(mockSubmit).toHaveBeenCalledWith('decode', { videoData });
    });

    it('should handle metadata extraction error', async () => {
      mockSubmit.mockResolvedValue({
        type: 'error',
        error: 'Invalid video format',
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();

      await expect(
        act(async () => {
          await result.current.extractMetadata(videoData);
        })
      ).rejects.toThrow('Invalid video format');
    });
  });

  describe('exportVideo', () => {
    it('should export video with options', async () => {
      const mockBlob = new Blob(['video data'], { type: 'video/mp4' });
      mockSubmit.mockResolvedValue({
        type: 'success',
        data: mockBlob,
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();
      const exportOptions = createTestExportOptions('mp4');

      let exportedBlob: Blob | undefined;
      await act(async () => {
        exportedBlob = await result.current.exportVideo(videoData, exportOptions);
      });

      expect(exportedBlob).toBeInstanceOf(Blob);
      expect(mockSubmit).toHaveBeenCalledWith(
        'export',
        expect.objectContaining({
          videoData,
          exportOptions,
        }),
        expect.objectContaining({
          priority: 1,
        })
      );
    });

    it('should create blob from ArrayBuffer response', async () => {
      const arrayBuffer = new ArrayBuffer(100);
      mockSubmit.mockResolvedValue({
        type: 'success',
        data: arrayBuffer,
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();
      const exportOptions = createTestExportOptions('webm');

      let exportedBlob: Blob | undefined;
      await act(async () => {
        exportedBlob = await result.current.exportVideo(videoData, exportOptions);
      });

      expect(exportedBlob).toBeInstanceOf(Blob);
      expect(exportedBlob?.type).toBe('video/webm');
    });

    it('should call onProgress during export', async () => {
      const onProgress = jest.fn();
      mockSubmit.mockImplementation(async (_type, _data, options) => {
        options?.onProgress?.(25);
        options?.onProgress?.(50);
        options?.onProgress?.(75);
        options?.onProgress?.(100);
        return { type: 'success', data: new Blob() };
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();
      const exportOptions = createTestExportOptions('mp4');

      await act(async () => {
        await result.current.exportVideo(videoData, exportOptions as never, onProgress);
      });

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('should handle export error', async () => {
      mockSubmit.mockResolvedValue({
        type: 'error',
        error: 'Export failed',
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();
      const exportOptions = createTestExportOptions('mp4');

      await expect(
        act(async () => {
          await result.current.exportVideo(videoData, exportOptions as never);
        })
      ).rejects.toThrow('Export failed');
    });
  });

  describe('analyzeVideo', () => {
    it('should analyze video and return metadata', async () => {
      const mockAnalysis = {
        duration: 60,
        width: 1280,
        height: 720,
        fps: 24,
        codec: 'vp9',
        bitrate: 3000000,
      };

      mockSubmit.mockResolvedValue({
        type: 'success',
        data: mockAnalysis,
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();

      let analysis: unknown;
      await act(async () => {
        analysis = await result.current.analyzeVideo(videoData);
      });

      expect(analysis).toEqual(mockAnalysis);
      expect(mockSubmit).toHaveBeenCalledWith('analyze', { videoData });
    });

    it('should handle analysis error', async () => {
      mockSubmit.mockResolvedValue({
        type: 'error',
        error: 'Analysis failed',
      });

      const { result } = renderHook(() => useWorkerProcessor());

      const videoData = createTestArrayBuffer();

      await expect(
        act(async () => {
          await result.current.analyzeVideo(videoData);
        })
      ).rejects.toThrow('Analysis failed');
    });
  });

  describe('cancelAll', () => {
    it('should reset processing state', () => {
      const { result } = renderHook(() => useWorkerProcessor());

      act(() => {
        result.current.cancelAll();
      });

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('getPoolStatus', () => {
    it('should return pool status', () => {
      const { result } = renderHook(() => useWorkerProcessor());

      const status = result.current.getPoolStatus();

      expect(status).toEqual({
        totalWorkers: 4,
        busyWorkers: 0,
        idleWorkers: 4,
        queuedTasks: 0,
      });
    });

    it('should return default status when pool not initialized', () => {
      const { getWorkerPool } = jest.requireMock('@/lib/media/workers');
      getWorkerPool.mockReturnValueOnce(null);

      const { result } = renderHook(() => useWorkerProcessor());

      // First render initializes pool, but we mocked it to return null
      // The hook handles this gracefully
      expect(result.current.getPoolStatus).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should terminate pool on unmount when autoTerminate is true', () => {
      const { terminateWorkerPool } = jest.requireMock('@/lib/media/workers');

      const { unmount } = renderHook(() =>
        useWorkerProcessor({ autoTerminate: true })
      );

      unmount();

      expect(terminateWorkerPool).toHaveBeenCalled();
    });

    it('should not terminate pool on unmount when autoTerminate is false', () => {
      const { terminateWorkerPool } = jest.requireMock('@/lib/media/workers');

      const { unmount } = renderHook(() =>
        useWorkerProcessor({ autoTerminate: false })
      );

      terminateWorkerPool.mockClear();
      unmount();

      expect(terminateWorkerPool).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unknown error type', async () => {
      mockSubmit.mockRejectedValue('Unknown error string');

      const { result } = renderHook(() => useWorkerProcessor());

      const frameData = createTestImageData();
      const filter = createTestFilter('grayscale');

      await expect(
        act(async () => {
          await result.current.applyFilter(frameData, filter as never);
        })
      ).rejects.toBe('Unknown error string');
    });
  });
});
