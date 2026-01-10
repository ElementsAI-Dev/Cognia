/**
 * Tests for useImageEditor hook
 */

import { renderHook, act } from '@testing-library/react';
import { useImageEditor } from './use-image-editor';

// Mock the stores
jest.mock('@/stores', () => ({
  useImageStudioStore: jest.fn(() => ({})),
}));

// Mock the media registry
jest.mock('@/lib/plugin/api/media-api', () => ({
  getMediaRegistry: jest.fn(() => ({
    getAllFilters: jest.fn(() => []),
    getFiltersByCategory: jest.fn(() => []),
    getFilter: jest.fn(() => null),
  })),
}));

// Helper to create a test ImageData
function createTestImageData(width = 100, height = 100): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  // Fill with red pixels
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;     // R
    data[i + 1] = 0;   // G
    data[i + 2] = 0;   // B
    data[i + 3] = 255; // A
  }
  return new ImageData(data, width, height);
}

describe('useImageEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useImageEditor());

      expect(result.current.state.imageUrl).toBeNull();
      expect(result.current.state.imageData).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.zoom).toBe(1);
      expect(result.current.state.panX).toBe(0);
      expect(result.current.state.panY).toBe(0);
    });

    it('should have empty history initially', () => {
      const { result } = renderHook(() => useImageEditor());

      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('loadImageData', () => {
    it('should load ImageData directly', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(50, 50);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      expect(result.current.state.imageData).toBeDefined();
      expect(result.current.state.width).toBe(50);
      expect(result.current.state.height).toBe(50);
      expect(result.current.state.originalImageData).toBeDefined();
      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
    });

    it('should call onImageChange callback when loading', () => {
      const onImageChange = jest.fn();
      const { result } = renderHook(() => useImageEditor({ onImageChange }));
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      expect(onImageChange).toHaveBeenCalledWith(testImageData);
    });
  });

  describe('transform operations', () => {
    it('should rotate image by 90 degrees', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(100, 50);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.rotate(90);
      });

      // After rotation, processing should complete
      expect(result.current.state.isProcessing).toBe(false);
      expect(result.current.history.length).toBeGreaterThan(1);
    });

    it('should flip horizontally', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      expect(result.current.history.length).toBeGreaterThan(1);
    });

    it('should flip vertically', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipVertical();
      });

      expect(result.current.history.length).toBeGreaterThan(1);
    });

    it('should resize image', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(100, 100);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.resize(50, 50, false);
      });

      expect(result.current.state.width).toBe(50);
      expect(result.current.state.height).toBe(50);
    });

    it('should resize maintaining aspect ratio', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(100, 50); // 2:1 ratio

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.resize(50, 50, true);
      });

      // Should maintain 2:1 ratio
      expect(result.current.state.width).toBe(50);
      expect(result.current.state.height).toBe(25);
    });

    it('should crop image', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(100, 100);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.crop(10, 10, 50, 50);
      });

      expect(result.current.state.width).toBe(50);
      expect(result.current.state.height).toBe(50);
    });
  });

  describe('adjustments', () => {
    it('should apply brightness adjustment', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.setBrightness(50);
      });

      expect(result.current.state.imageData).toBeDefined();
    });

    it('should apply contrast adjustment', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.setContrast(25);
      });

      expect(result.current.state.imageData).toBeDefined();
    });

    it('should apply saturation adjustment', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.setSaturation(-50);
      });

      expect(result.current.state.imageData).toBeDefined();
    });

    it('should reset adjustments to original', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.setBrightness(50);
      });

      act(() => {
        result.current.resetAdjustments();
      });

      // Should be back to original
      expect(result.current.state.imageData).toEqual(result.current.state.originalImageData);
    });
  });

  describe('history management', () => {
    it('should support undo', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.historyIndex).toBe(0);
    });

    it('should support redo', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.historyIndex).toBe(1);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
    });

    it('should go to specific history index', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      act(() => {
        result.current.flipVertical();
      });

      expect(result.current.history).toHaveLength(3);

      act(() => {
        result.current.goToHistoryIndex(1);
      });

      expect(result.current.historyIndex).toBe(1);
    });
  });

  describe('view controls', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setZoom(2);
      });

      expect(result.current.state.zoom).toBe(2);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.state.zoom).toBe(10);

      act(() => {
        result.current.setZoom(0.01);
      });

      expect(result.current.state.zoom).toBe(0.1);
    });

    it('should zoom in', () => {
      const { result } = renderHook(() => useImageEditor());

      const initialZoom = result.current.state.zoom;

      act(() => {
        result.current.zoomIn();
      });

      expect(result.current.state.zoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setZoom(2);
      });

      const zoomBefore = result.current.state.zoom;

      act(() => {
        result.current.zoomOut();
      });

      expect(result.current.state.zoom).toBeLessThan(zoomBefore);
    });

    it('should reset zoom', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setZoom(3);
      });

      act(() => {
        result.current.resetZoom();
      });

      expect(result.current.state.zoom).toBe(1);
    });

    it('should set pan position', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setPan(100, 50);
      });

      expect(result.current.state.panX).toBe(100);
      expect(result.current.state.panY).toBe(50);
    });

    it('should reset pan', () => {
      const { result } = renderHook(() => useImageEditor());

      act(() => {
        result.current.setPan(100, 50);
      });

      act(() => {
        result.current.resetPan();
      });

      expect(result.current.state.panX).toBe(0);
      expect(result.current.state.panY).toBe(0);
    });
  });

  describe('export functions', () => {
    it('should export to data URL', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(10, 10);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      const dataUrl = result.current.toDataUrl('png');

      expect(dataUrl).toContain('data:image/png;base64,');
    });

    it('should return null when no image loaded', () => {
      const { result } = renderHook(() => useImageEditor());

      const dataUrl = result.current.toDataUrl();

      expect(dataUrl).toBeNull();
    });

    it('should export to blob', async () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData(10, 10);

      act(() => {
        result.current.loadImageData(testImageData);
      });

      const blobResult = await result.current.toBlob('png');

      expect(blobResult).toBeInstanceOf(Blob);
      expect(blobResult?.type).toBe('image/png');
    });

    it('should get current image data', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      const imageData = result.current.getImageData();

      expect(imageData).toBeDefined();
      expect(imageData?.width).toBe(100);
      expect(imageData?.height).toBe(100);
    });
  });

  describe('reset to original', () => {
    it('should reset to original image', () => {
      const { result } = renderHook(() => useImageEditor());
      const testImageData = createTestImageData();

      act(() => {
        result.current.loadImageData(testImageData);
      });

      act(() => {
        result.current.flipHorizontal();
      });

      act(() => {
        result.current.resize(50, 50);
      });

      act(() => {
        result.current.resetToOriginal();
      });

      expect(result.current.state.width).toBe(100);
      expect(result.current.state.height).toBe(100);
    });
  });

  describe('filters', () => {
    it('should return available filters', () => {
      const { result } = renderHook(() => useImageEditor());

      const filters = result.current.getAvailableFilters();

      expect(Array.isArray(filters)).toBe(true);
    });

    it('should return filters by category', () => {
      const { result } = renderHook(() => useImageEditor());

      const filters = result.current.getFiltersByCategory('color');

      expect(Array.isArray(filters)).toBe(true);
    });
  });

  describe('canvas ref', () => {
    it('should provide canvas ref', () => {
      const { result } = renderHook(() => useImageEditor());

      expect(result.current.canvasRef).toBeDefined();
    });
  });
});
