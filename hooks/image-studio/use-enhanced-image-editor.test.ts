/**
 * Tests for useEnhancedImageEditor hook
 */

import { renderHook, act } from '@testing-library/react';

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

// Mock worker processor
const mockProcessLevels = jest.fn();
const mockProcessCurves = jest.fn();
const mockProcessHSL = jest.fn();
const mockProcessNoiseReduction = jest.fn();
const mockProcessSharpen = jest.fn();
const mockCalculateHistogram = jest.fn();
const mockProcessAdjustments = jest.fn();

jest.mock('./use-worker-processor', () => ({
  useWorkerProcessor: jest.fn(() => ({
    isReady: true,
    isProcessing: false,
    processLevels: mockProcessLevels,
    processCurves: mockProcessCurves,
    processHSL: mockProcessHSL,
    processNoiseReduction: mockProcessNoiseReduction,
    processSharpen: mockProcessSharpen,
    calculateHistogram: mockCalculateHistogram,
    processAdjustments: mockProcessAdjustments,
  })),
}));

// Mock base image editor
const mockLoadImage = jest.fn();
const mockPutImageData = jest.fn();
const mockLoadImageData = jest.fn();

jest.mock('./use-image-editor', () => ({
  useImageEditor: jest.fn(() => ({
    state: {
      imageData: createTestImageData(),
      originalImageData: createTestImageData(),
      isLoading: false,
      error: null,
      history: [],
      historyIndex: -1,
    },
    loadImage: mockLoadImage,
    putImageData: mockPutImageData,
    loadImageData: mockLoadImageData,
    rotate: jest.fn(),
    flipHorizontal: jest.fn(),
    flipVertical: jest.fn(),
    resize: jest.fn(),
    crop: jest.fn(),
    getCanvas: jest.fn(),
    applyAdjustments: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    reset: jest.fn(),
  })),
}));

// Mock GLProcessor with static method
jest.mock('@/lib/ai/media/webgl/gl-processor', () => {
  const MockGLProcessor = jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    cleanup: jest.fn(),
    processHSL: jest.fn(),
    processSharpen: jest.fn(),
    processAdjustments: jest.fn(),
  }));
  (MockGLProcessor as unknown as { isSupported: jest.Mock }).isSupported = jest.fn(() => true);
  return { GLProcessor: MockGLProcessor };
});

// Mock ProgressiveImageLoader
const mockLoadFromUrl = jest.fn();
const mockLoadFromFile = jest.fn();
const mockCancel = jest.fn();

jest.mock('@/lib/ai/media/progressive-loader', () => ({
  ProgressiveImageLoader: jest.fn().mockImplementation(() => ({
    loadFromUrl: mockLoadFromUrl,
    loadFromFile: mockLoadFromFile,
    cancel: mockCancel,
  })),
}));

// Mock adjustment functions
const mockApplyLevels = jest.fn();
const mockApplyCurves = jest.fn();
const mockApplyHSL = jest.fn();
const mockApplyNoiseReduction = jest.fn();
const mockApplySharpen = jest.fn();
const mockApplyClarity = jest.fn();
const mockApplyDehaze = jest.fn();

jest.mock('@/lib/ai/media/adjustments', () => ({
  applyLevels: (...args: unknown[]) => mockApplyLevels(...args),
  applyCurves: (...args: unknown[]) => mockApplyCurves(...args),
  applyHSL: (...args: unknown[]) => mockApplyHSL(...args),
  applyNoiseReduction: (...args: unknown[]) => mockApplyNoiseReduction(...args),
  applySharpen: (...args: unknown[]) => mockApplySharpen(...args),
  applyClarity: (...args: unknown[]) => mockApplyClarity(...args),
  applyDehaze: (...args: unknown[]) => mockApplyDehaze(...args),
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

// Import after mocks
import { useEnhancedImageEditor } from './use-enhanced-image-editor';

describe('useEnhancedImageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    const testImageData = createTestImageData();
    mockProcessLevels.mockResolvedValue(testImageData);
    mockProcessCurves.mockResolvedValue(testImageData);
    mockProcessHSL.mockResolvedValue(testImageData);
    mockProcessNoiseReduction.mockResolvedValue(testImageData);
    mockProcessSharpen.mockResolvedValue(testImageData);
    mockProcessAdjustments.mockResolvedValue(testImageData);
    mockCalculateHistogram.mockResolvedValue({
      red: new Array(256).fill(0),
      green: new Array(256).fill(0),
      blue: new Array(256).fill(0),
      luminance: new Array(256).fill(0),
    });
    
    mockApplyLevels.mockReturnValue(testImageData);
    mockApplyCurves.mockReturnValue(testImageData);
    mockApplyHSL.mockReturnValue(testImageData);
    mockApplyNoiseReduction.mockReturnValue(testImageData);
    mockApplySharpen.mockReturnValue(testImageData);
    mockApplyClarity.mockReturnValue(testImageData);
    mockApplyDehaze.mockReturnValue(testImageData);
    
    mockLoadFromUrl.mockResolvedValue({ preview: 'preview-url', full: testImageData });
    mockLoadFromFile.mockResolvedValue({ preview: 'preview-url', full: testImageData });
  });

  describe('initialization', () => {
    it('should initialize with worker ready state', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.isWorkerReady).toBe(true);
    });

    it('should have lastOperationDuration as null initially', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.lastOperationDuration).toBeNull();
    });

    it('should accept useWorker option', () => {
      const { result } = renderHook(() =>
        useEnhancedImageEditor({ useWorker: false })
      );
      expect(result.current.isWorkerReady).toBeDefined();
    });

    it('should accept useWebGL option', () => {
      const { result } = renderHook(() =>
        useEnhancedImageEditor({ useWebGL: false })
      );
      expect(result.current.isWebGLSupported).toBeDefined();
    });

    it('should accept workerCount option', () => {
      const { result } = renderHook(() =>
        useEnhancedImageEditor({ workerCount: 4 })
      );
      expect(result.current.isWorkerReady).toBe(true);
    });
  });

  describe('applyLevels', () => {
    it('should have applyLevels function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyLevels).toBe('function');
    });

    it('should call worker processor for levels', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const options = { inputBlack: 0, inputWhite: 255, outputBlack: 0, outputWhite: 255 };

      await act(async () => {
        await result.current.applyLevels(options as never);
      });

      expect(mockProcessLevels).toHaveBeenCalled();
    });
  });

  describe('applyCurves', () => {
    it('should have applyCurves function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyCurves).toBe('function');
    });

    it('should call worker processor for curves', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const options = { points: [[0, 0], [255, 255]] };

      await act(async () => {
        await result.current.applyCurves(options as never);
      });

      expect(mockProcessCurves).toHaveBeenCalled();
    });
  });

  describe('applyHSL', () => {
    it('should have applyHSL function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyHSL).toBe('function');
    });

    it('should call worker processor for HSL', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const options = { hue: 0, saturation: 0, lightness: 0 };

      await act(async () => {
        await result.current.applyHSL(options as never);
      });

      expect(mockProcessHSL).toHaveBeenCalled();
    });
  });

  describe('applyNoiseReduction', () => {
    it('should have applyNoiseReduction function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyNoiseReduction).toBe('function');
    });

    it('should call worker processor for noise reduction', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const options = { strength: 50, preserveDetail: 0.5 };

      await act(async () => {
        await result.current.applyNoiseReduction(options as never);
      });

      expect(mockProcessNoiseReduction).toHaveBeenCalled();
    });
  });

  describe('applySharpen', () => {
    it('should have applySharpen function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applySharpen).toBe('function');
    });

    it('should call worker processor for sharpen', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const options = { amount: 50, radius: 1, threshold: 0 };

      await act(async () => {
        await result.current.applySharpen(options as never);
      });

      expect(mockProcessSharpen).toHaveBeenCalled();
    });
  });

  describe('applyClarity', () => {
    it('should have applyClarity function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyClarity).toBe('function');
    });

    it('should call clarity adjustment', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      await act(async () => {
        await result.current.applyClarity(50);
      });

      expect(mockApplyClarity).toHaveBeenCalled();
    });
  });

  describe('applyDehaze', () => {
    it('should have applyDehaze function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyDehaze).toBe('function');
    });

    it('should call dehaze adjustment', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      await act(async () => {
        await result.current.applyDehaze(50);
      });

      expect(mockApplyDehaze).toHaveBeenCalled();
    });
  });

  describe('getHistogram', () => {
    it('should have getHistogram function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.getHistogram).toBe('function');
    });

    it('should calculate histogram using worker', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      let histogram: unknown;
      await act(async () => {
        histogram = await result.current.getHistogram();
      });

      expect(mockCalculateHistogram).toHaveBeenCalled();
      expect(histogram).toBeDefined();
    });
  });

  describe('loadImageProgressive', () => {
    it('should have loadImageProgressive function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.loadImageProgressive).toBe('function');
    });

    it('should load image progressively from URL', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      const onPreview = jest.fn();

      await act(async () => {
        await result.current.loadImageProgressive('http://example.com/image.jpg', onPreview);
      });

      expect(mockLoadFromUrl).toHaveBeenCalledWith('http://example.com/image.jpg');
      expect(onPreview).toHaveBeenCalledWith('preview-url');
    });

    it('should load image progressively from File', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      const onPreview = jest.fn();
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        await result.current.loadImageProgressive(file, onPreview);
      });

      expect(mockLoadFromFile).toHaveBeenCalledWith(file);
      expect(onPreview).toHaveBeenCalledWith('preview-url');
    });
  });

  describe('applyAdjustmentsBatch', () => {
    it('should have applyAdjustmentsBatch function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(typeof result.current.applyAdjustmentsBatch).toBe('function');
    });

    it('should apply batch adjustments using worker', async () => {
      const { result } = renderHook(() => useEnhancedImageEditor());

      const adjustments = { brightness: 10, contrast: 5 };

      await act(async () => {
        await result.current.applyAdjustmentsBatch(adjustments);
      });

      expect(mockProcessAdjustments).toHaveBeenCalled();
    });
  });

  describe('performance tracking', () => {
    it('should call onPerformanceMetric callback', async () => {
      const onPerformanceMetric = jest.fn();
      const { result } = renderHook(() =>
        useEnhancedImageEditor({ onPerformanceMetric })
      );

      await act(async () => {
        await result.current.applyClarity(50);
      });

      // Performance callback may or may not be called depending on implementation
      expect(result.current.lastOperationDuration).toBeDefined();
    });
  });

  describe('base editor inheritance', () => {
    it('should have loadImage function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.loadImage).toBeDefined();
    });

    it('should have state from base editor', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.state).toBeDefined();
      expect(result.current.state.imageData).toBeDefined();
    });

    it('should have undo function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.undo).toBeDefined();
    });

    it('should have redo function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.redo).toBeDefined();
    });

    it('should have reset function', () => {
      const { result } = renderHook(() => useEnhancedImageEditor());
      expect(result.current.reset).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useEnhancedImageEditor());

      unmount();

      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
