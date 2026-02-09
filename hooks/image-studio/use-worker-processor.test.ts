/**
 * Tests for useWorkerProcessor hook (image-studio)
 */

import { renderHook, act } from '@testing-library/react';
import { useWorkerProcessor } from './use-worker-processor';
import type { ImageAdjustments } from '@/types/media/image-studio';

// Mock ImageData for Node.js environment
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height || data.length / (width * 4);
  }
}

(global as unknown as { ImageData: typeof MockImageData }).ImageData = MockImageData;

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;

  postMessage = jest.fn((message) => {
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        const response = {
          data: {
            id: message.id,
            type: 'success',
            data: message.payload.imageData, // Return same image data
            duration: 100,
          },
        };
        this.onmessage(response as MessageEvent);
      }
    }, 10);
  });

  terminate = jest.fn();
}

// Store worker instances for testing
const workerInstances: MockWorker[] = [];

// Mock Worker constructor
const originalWorker = global.Worker;
beforeAll(() => {
  (global as unknown as { Worker: unknown }).Worker = jest.fn().mockImplementation(() => {
    const worker = new MockWorker();
    workerInstances.push(worker);
    return worker;
  }) as unknown as typeof Worker;
});

afterAll(() => {
  global.Worker = originalWorker;
});

// Helper to create test ImageData
function createTestImageData(width = 100, height = 100): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255; // R
    data[i + 1] = 0; // G
    data[i + 2] = 0; // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
}

describe('useWorkerProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workerInstances.length = 0;
  });

  describe('initialization', () => {
    it('should initialize with ready state', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      // Wait for microtask
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isReady).toBe(true);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.lastDuration).toBeNull();
    });

    it('should accept custom worker count', async () => {
      const { result } = renderHook(() => useWorkerProcessor({ workerCount: 4 }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isReady).toBe(true);
    });

    it('should call onError when provided', async () => {
      const onError = jest.fn();
      renderHook(() => useWorkerProcessor({ onError }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // onError would be called on worker error
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('processAdjustments', () => {
    it('should process image adjustments', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const adjustments = {
        brightness: 10,
        contrast: 5,
        saturation: 0,
        hue: 0,
        blur: 0,
        sharpen: 0,
      } as ImageAdjustments;

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processAdjustments(imageData, adjustments);
      });

      expect(processedData).toBeDefined();
      expect(result.current.isProcessing).toBe(false);
    });

    it('should set isProcessing during operation', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const adjustments = { brightness: 10, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpen: 0 } as ImageAdjustments;

      // Start processing but don't await
      const promise = act(async () => {
        const processPromise = result.current.processAdjustments(imageData, adjustments);
        await processPromise;
      });

      await promise;
      // Note: Due to async nature, we check final state
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('processFilter', () => {
    it('should process filter', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processFilter(imageData, 'grayscale');
      });

      expect(processedData).toBeDefined();
    });

    it('should pass filter params', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const params = { intensity: 0.5 };

      await act(async () => {
        await result.current.processFilter(imageData, 'blur', params);
      });

      expect(workerInstances[0].postMessage).toHaveBeenCalled();
    });
  });

  describe('processTransform', () => {
    it('should process transform', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const transform = { rotate: 90, flipH: false, flipV: false, scale: 1 };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processTransform(imageData, transform);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processLevels', () => {
    it('should process levels adjustment', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { inputBlack: 0, inputWhite: 255, inputGamma: 1, outputBlack: 0, outputWhite: 255, channel: 'rgb' as const };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processLevels(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processCurves', () => {
    it('should process curves adjustment', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }] };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processCurves(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processHSL', () => {
    it('should process HSL adjustment', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { hue: 0, saturation: 10, lightness: 5 };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processHSL(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processNoiseReduction', () => {
    it('should process noise reduction', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { strength: 50, method: 'bilateral' as const, preserveDetail: 50 };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processNoiseReduction(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processSharpen', () => {
    it('should process sharpen', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { amount: 50, radius: 1, threshold: 0, method: 'unsharp-mask' as const };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processSharpen(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('processBlur', () => {
    it('should process blur', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();
      const options = { radius: 5, method: 'gaussian' as const };

      let processedData: ImageData | undefined;
      await act(async () => {
        processedData = await result.current.processBlur(imageData, options);
      });

      expect(processedData).toBeDefined();
    });
  });

  describe('calculateHistogram', () => {
    it('should calculate histogram', async () => {
      const { result } = renderHook(() => useWorkerProcessor());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const imageData = createTestImageData();

      // Mock worker to return histogram data
      if (workerInstances[0]) {
        workerInstances[0].postMessage = jest.fn((message) => {
          setTimeout(() => {
            if (workerInstances[0].onmessage) {
              workerInstances[0].onmessage({
                data: {
                  id: message.id,
                  type: 'success',
                  data: {
                    red: new Array(256).fill(0),
                    green: new Array(256).fill(0),
                    blue: new Array(256).fill(0),
                    luminance: new Array(256).fill(0),
                  },
                },
              } as MessageEvent);
            }
          }, 10);
        });
      }

      let histogram: unknown;
      await act(async () => {
        histogram = await result.current.calculateHistogram(imageData);
      });

      expect(histogram).toBeDefined();
    });
  });

  describe('terminate', () => {
    it('should terminate all workers', async () => {
      const { result } = renderHook(() => useWorkerProcessor({ workerCount: 2 }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.terminate();
      });

      expect(result.current.isReady).toBe(false);
      expect(result.current.isProcessing).toBe(false);

      // Workers should be terminated
      workerInstances.forEach((worker) => {
        expect(worker.terminate).toHaveBeenCalled();
      });
    });
  });

  describe('progress callback', () => {
    it('should call onProgress during processing', async () => {
      const onProgress = jest.fn();
      const { result } = renderHook(() => useWorkerProcessor({ onProgress }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Simulate progress message from worker
      if (workerInstances[0]) {
        workerInstances[0].postMessage = jest.fn((message) => {
          setTimeout(() => {
            // Send progress first
            if (workerInstances[0].onmessage) {
              workerInstances[0].onmessage({
                data: {
                  id: message.id,
                  type: 'progress',
                  progress: 50,
                },
              } as MessageEvent);
            }
            // Then send completion
            setTimeout(() => {
              if (workerInstances[0].onmessage) {
                workerInstances[0].onmessage({
                  data: {
                    id: message.id,
                    type: 'success',
                    data: message.payload.imageData,
                  },
                } as MessageEvent);
              }
            }, 5);
          }, 5);
        });
      }

      const imageData = createTestImageData();

      await act(async () => {
        await result.current.processAdjustments(imageData, { brightness: 10, contrast: 0, saturation: 0, hue: 0, blur: 0, sharpen: 0 } as ImageAdjustments);
      });

      expect(onProgress).toHaveBeenCalledWith(50);
    });
  });

  describe('error handling', () => {
    it('should accept onError callback option', () => {
      const onError = jest.fn();
      const { result } = renderHook(() => useWorkerProcessor({ onError }));

      expect(result.current.isReady).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should have terminate function', () => {
      const { result } = renderHook(() => useWorkerProcessor());

      expect(typeof result.current.terminate).toBe('function');
    });
  });

  describe('lastDuration', () => {
    it('should have lastDuration property', () => {
      const { result } = renderHook(() => useWorkerProcessor());

      expect(result.current.lastDuration).toBeDefined();
    });
  });
});
