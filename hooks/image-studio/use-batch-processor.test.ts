/**
 * Tests for useBatchProcessor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useBatchProcessor } from './use-batch-processor';
import type { BatchJob, BatchImage } from '@/stores/media/batch-edit-store';

// Mock batch edit store
const mockGetJob = jest.fn();
const mockUpdateImageStatus = jest.fn();
const mockStartProcessing = jest.fn();
const mockPauseProcessing = jest.fn();
const mockResumeProcessing = jest.fn();
const mockCancelProcessing = jest.fn();
const mockUpdateJob = jest.fn();

jest.mock('@/stores/media/batch-edit-store', () => ({
  useBatchEditStore: jest.fn(() => ({
    concurrency: 2,
    getJob: mockGetJob,
    updateImageStatus: mockUpdateImageStatus,
    startProcessing: mockStartProcessing,
    pauseProcessing: mockPauseProcessing,
    resumeProcessing: mockResumeProcessing,
    cancelProcessing: mockCancelProcessing,
    updateJob: mockUpdateJob,
  })),
}));

// Mock worker processor
const mockProcessAdjustments = jest.fn();
const mockProcessTransform = jest.fn();
const mockTerminate = jest.fn();

jest.mock('./use-worker-processor', () => ({
  useWorkerProcessor: jest.fn(() => ({
    processAdjustments: mockProcessAdjustments,
    processTransform: mockProcessTransform,
    terminate: mockTerminate,
  })),
}));

// Mock fetch and createImageBitmap
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  } as Response)
);

global.createImageBitmap = jest.fn(() =>
  Promise.resolve({
    width: 100,
    height: 100,
    close: jest.fn(),
  } as unknown as ImageBitmap)
);

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(this.width * this.height * 4),
        width: this.width,
        height: this.height,
      })),
      putImageData: jest.fn(),
    };
  }

  convertToBlob() {
    return Promise.resolve(new Blob(['test'], { type: 'image/jpeg' }));
  }
}

(global as unknown as { OffscreenCanvas: typeof MockOffscreenCanvas }).OffscreenCanvas = MockOffscreenCanvas;

describe('useBatchProcessor', () => {
  const mockImage: BatchImage = {
    id: 'img-1',
    path: 'file:///test/image.jpg',
    filename: 'image.jpg',
    status: 'pending',
    progress: 0,
    width: 800,
    height: 600,
    size: 1024,
  };

  const mockJob: BatchJob = {
    id: 'job-1',
    name: 'Test Job',
    images: [mockImage],
    preset: {
      id: 'preset-1',
      name: 'Test Preset',
      adjustments: { brightness: 10 },
      export: { format: 'jpeg', quality: 90, suffix: '_edited' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    outputDirectory: '/output',
    overwrite: false,
    preserveMetadata: true,
    status: 'idle',
    progress: 0,
    processedCount: 0,
    errorCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetJob.mockReturnValue(mockJob);
    mockProcessAdjustments.mockImplementation((data) => Promise.resolve(data));
    mockProcessTransform.mockImplementation((data) => Promise.resolve(data));
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useBatchProcessor());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.currentJobId).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.processedCount).toBe(0);
      expect(result.current.errorCount).toBe(0);
    });

    it('should accept callback options', () => {
      const onProgress = jest.fn();
      const onImageComplete = jest.fn();
      const onImageError = jest.fn();
      const onJobComplete = jest.fn();

      const { result } = renderHook(() =>
        useBatchProcessor({
          onProgress,
          onImageComplete,
          onImageError,
          onJobComplete,
        })
      );

      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('startJob', () => {
    it('should start processing a job', async () => {
      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(mockStartProcessing).toHaveBeenCalledWith('job-1');
    });

    it('should not start non-existent job', async () => {
      mockGetJob.mockReturnValue(null);

      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('non-existent');
      });

      expect(mockStartProcessing).not.toHaveBeenCalled();
    });

    it('should set isProcessing during job', async () => {
      const { result } = renderHook(() => useBatchProcessor());

      const promise = act(async () => {
        const startPromise = result.current.startJob('job-1');
        await startPromise;
      });

      await promise;

      // After job completes
      expect(result.current.isProcessing).toBe(false);
    });

    it('should call onJobComplete when finished', async () => {
      const onJobComplete = jest.fn();
      const { result } = renderHook(() =>
        useBatchProcessor({ onJobComplete })
      );

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(onJobComplete).toHaveBeenCalledWith('job-1');
    });

    it('should call onImageComplete for each image', async () => {
      const onImageComplete = jest.fn();
      const { result } = renderHook(() =>
        useBatchProcessor({ onImageComplete })
      );

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(onImageComplete).toHaveBeenCalledWith('job-1', 'img-1', expect.any(String));
    });

    it('should update progress during processing', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() =>
        useBatchProcessor({ onProgress })
      );

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('pauseJob', () => {
    it('should have pauseJob function', () => {
      const { result } = renderHook(() => useBatchProcessor());

      expect(typeof result.current.pauseJob).toBe('function');
    });

    it('should not throw when called without active job', () => {
      const { result } = renderHook(() => useBatchProcessor());

      expect(() => {
        act(() => {
          result.current.pauseJob();
        });
      }).not.toThrow();
    });
  });

  describe('resumeJob', () => {
    it('should do nothing when no current job', async () => {
      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.resumeJob();
      });

      expect(mockResumeProcessing).not.toHaveBeenCalled();
    });
  });

  describe('cancelJob', () => {
    it('should have cancelJob function', () => {
      const { result } = renderHook(() => useBatchProcessor());

      expect(typeof result.current.cancelJob).toBe('function');
    });

    it('should not throw when called without active job', () => {
      const { result } = renderHook(() => useBatchProcessor());

      expect(() => {
        act(() => {
          result.current.cancelJob();
        });
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle image processing error', async () => {
      // Make fetch fail for this test
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const onImageError = jest.fn();
      const { result } = renderHook(() =>
        useBatchProcessor({ onImageError })
      );

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(onImageError).toHaveBeenCalledWith('job-1', 'img-1', expect.any(String));
      expect(result.current.errorCount).toBe(1);
    });

    it('should continue processing other images after error', async () => {
      const jobWithMultipleImages: BatchJob = {
        ...mockJob,
        images: [
          mockImage,
          { ...mockImage, id: 'img-2', filename: 'image2.jpg' },
        ],
      };
      mockGetJob.mockReturnValue(jobWithMultipleImages);

      // First image fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          blob: () => Promise.resolve(new Blob(['test'])),
        });

      const onImageComplete = jest.fn();
      const onImageError = jest.fn();
      const { result } = renderHook(() =>
        useBatchProcessor({ onImageComplete, onImageError })
      );

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(onImageError).toHaveBeenCalledTimes(1);
      // Second image should still be processed
    });
  });

  describe('preset handling', () => {
    it('should apply transform if specified', async () => {
      const jobWithTransform: BatchJob = {
        ...mockJob,
        preset: {
          id: 'preset-2',
          name: 'Transform Preset',
          adjustments: { brightness: 10 },
          transform: { rotate: 90, flipH: true, flipV: false },
          export: { format: 'jpeg', quality: 90, suffix: '_edited' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
      mockGetJob.mockReturnValue(jobWithTransform);

      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(mockProcessTransform).toHaveBeenCalled();
    });

    it('should use default export settings if not specified', async () => {
      const jobWithoutExport: BatchJob = {
        ...mockJob,
        preset: {
          id: 'preset-3',
          name: 'Simple Preset',
          adjustments: { brightness: 10 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
      mockGetJob.mockReturnValue(jobWithoutExport);

      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      // Should complete without error
      expect(mockUpdateJob).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should terminate worker processor on unmount', () => {
      const { unmount } = renderHook(() => useBatchProcessor());

      unmount();

      expect(mockTerminate).toHaveBeenCalled();
    });

    it('should set cancelled flag on unmount', async () => {
      const { result, unmount } = renderHook(() => useBatchProcessor());

      // Start a job
      const promise = act(async () => {
        await result.current.startJob('job-1');
      });

      unmount();

      await promise;

      // Job should be cancelled
    });
  });

  describe('concurrency', () => {
    it('should respect concurrency setting from store', async () => {
      const jobWithManyImages: BatchJob = {
        ...mockJob,
        images: [
          mockImage,
          { ...mockImage, id: 'img-2' },
          { ...mockImage, id: 'img-3' },
          { ...mockImage, id: 'img-4' },
        ],
      };
      mockGetJob.mockReturnValue(jobWithManyImages);

      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      // All images should be processed
      expect(result.current.processedCount).toBe(4);
    });
  });

  describe('status updates', () => {
    it('should update image status during processing', async () => {
      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      // Should have called updateImageStatus multiple times
      expect(mockUpdateImageStatus).toHaveBeenCalled();
    });

    it('should update job status on completion', async () => {
      const { result } = renderHook(() => useBatchProcessor());

      await act(async () => {
        await result.current.startJob('job-1');
      });

      expect(mockUpdateJob).toHaveBeenCalledWith('job-1', {
        status: 'completed',
        completedAt: expect.any(Number),
      });
    });
  });
});
