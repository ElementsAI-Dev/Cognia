/**
 * Tests for Image Studio Store
 */

import { act, renderHook } from '@testing-library/react';
import { useImageStudioStore } from './image-studio-store';

describe('useImageStudioStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useImageStudioStore());
    act(() => {
      result.current.deleteAllImages();
      result.current.clearHistory();
      result.current.resetAdjustments();
      result.current.resetTransform();
      result.current.clearMaskStrokes();
      // Clear layers
      result.current.layers.forEach((layer) => {
        result.current.deleteLayer(layer.id);
      });
    });
  });

  describe('Image Management', () => {
    it('should add an image and return its id', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let imageId: string;
      act(() => {
        imageId = result.current.addImage({
          url: 'https://example.com/image.png',
          prompt: 'A test image',
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        });
      });

      expect(imageId!).toBeDefined();
      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].prompt).toBe('A test image');
      expect(result.current.selectedImageId).toBe(imageId!);
    });

    it('should update an image', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let imageId: string;
      act(() => {
        imageId = result.current.addImage({
          url: 'https://example.com/image.png',
          prompt: 'Original prompt',
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        });
      });

      act(() => {
        result.current.updateImage(imageId!, { prompt: 'Updated prompt' });
      });

      expect(result.current.images[0].prompt).toBe('Updated prompt');
    });

    it('should delete an image', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let imageId: string;
      act(() => {
        imageId = result.current.addImage({
          url: 'https://example.com/image.png',
          prompt: 'Test',
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        });
      });

      expect(result.current.images).toHaveLength(1);

      act(() => {
        result.current.deleteImage(imageId!);
      });

      expect(result.current.images).toHaveLength(0);
      expect(result.current.selectedImageId).toBeNull();
    });

    it('should toggle favorite status', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let imageId: string;
      act(() => {
        imageId = result.current.addImage({
          url: 'https://example.com/image.png',
          prompt: 'Test',
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        });
      });

      expect(result.current.images[0].isFavorite).toBe(false);

      act(() => {
        result.current.toggleFavorite(imageId!);
      });

      expect(result.current.images[0].isFavorite).toBe(true);

      act(() => {
        result.current.toggleFavorite(imageId!);
      });

      expect(result.current.images[0].isFavorite).toBe(false);
    });

    it('should add and remove tags', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let imageId: string;
      act(() => {
        imageId = result.current.addImage({
          url: 'https://example.com/image.png',
          prompt: 'Test',
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid',
        });
      });

      act(() => {
        result.current.addTag(imageId!, 'landscape');
        result.current.addTag(imageId!, 'sunset');
      });

      expect(result.current.images[0].tags).toEqual(['landscape', 'sunset']);

      act(() => {
        result.current.removeTag(imageId!, 'landscape');
      });

      expect(result.current.images[0].tags).toEqual(['sunset']);
    });
  });

  describe('Adjustments', () => {
    it('should set individual adjustments', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setAdjustment('brightness', 50);
        result.current.setAdjustment('contrast', -25);
      });

      expect(result.current.adjustments.brightness).toBe(50);
      expect(result.current.adjustments.contrast).toBe(-25);
    });

    it('should reset adjustments to defaults', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setAdjustment('brightness', 50);
        result.current.setAdjustment('saturation', 30);
      });

      act(() => {
        result.current.resetAdjustments();
      });

      expect(result.current.adjustments.brightness).toBe(0);
      expect(result.current.adjustments.saturation).toBe(0);
    });
  });

  describe('Transform', () => {
    it('should rotate clockwise', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.rotateClockwise();
      });

      expect(result.current.transform.rotation).toBe(90);

      act(() => {
        result.current.rotateClockwise();
      });

      expect(result.current.transform.rotation).toBe(180);
    });

    it('should rotate counter-clockwise', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.rotateCounterClockwise();
      });

      expect(result.current.transform.rotation).toBe(270);
    });

    it('should flip horizontal and vertical', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.flipHorizontal();
      });

      expect(result.current.transform.flipHorizontal).toBe(true);

      act(() => {
        result.current.flipVertical();
      });

      expect(result.current.transform.flipVertical).toBe(true);

      act(() => {
        result.current.flipHorizontal();
      });

      expect(result.current.transform.flipHorizontal).toBe(false);
    });

    it('should reset transform', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.rotateClockwise();
        result.current.flipHorizontal();
        result.current.setScale(2);
      });

      act(() => {
        result.current.resetTransform();
      });

      expect(result.current.transform.rotation).toBe(0);
      expect(result.current.transform.flipHorizontal).toBe(false);
      expect(result.current.transform.scale).toBe(1);
    });
  });

  describe('Mask Strokes', () => {
    it('should add mask strokes', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addMaskStroke({
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          brushSize: 40,
          isEraser: false,
        });
      });

      expect(result.current.maskStrokes).toHaveLength(1);
      expect(result.current.maskStrokes[0].brushSize).toBe(40);
    });

    it('should undo mask stroke', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addMaskStroke({
          points: [{ x: 0, y: 0 }],
          brushSize: 40,
          isEraser: false,
        });
        result.current.addMaskStroke({
          points: [{ x: 50, y: 50 }],
          brushSize: 20,
          isEraser: true,
        });
      });

      expect(result.current.maskStrokes).toHaveLength(2);

      act(() => {
        result.current.undoMaskStroke();
      });

      expect(result.current.maskStrokes).toHaveLength(1);
    });

    it('should clear all mask strokes', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addMaskStroke({
          points: [{ x: 0, y: 0 }],
          brushSize: 40,
          isEraser: false,
        });
        result.current.addMaskStroke({
          points: [{ x: 50, y: 50 }],
          brushSize: 20,
          isEraser: true,
        });
      });

      act(() => {
        result.current.clearMaskStrokes();
      });

      expect(result.current.maskStrokes).toHaveLength(0);
    });
  });

  describe('History', () => {
    it('should add to history', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addToHistory({
          type: 'generate',
          imageId: 'test-123',
          description: 'Generated image',
        });
      });

      expect(result.current.editHistory).toHaveLength(1);
      expect(result.current.editHistory[0].type).toBe('generate');
    });

    it('should track history index for undo/redo', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addToHistory({
          type: 'generate',
          imageId: 'test-1',
          description: 'First',
        });
        result.current.addToHistory({
          type: 'crop',
          imageId: 'test-2',
          description: 'Second',
        });
      });

      expect(result.current.historyIndex).toBe(1);
      expect(result.current.canUndo()).toBe(true);
      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.historyIndex).toBe(0);
      expect(result.current.canRedo()).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.historyIndex).toBe(1);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.addToHistory({
          type: 'generate',
          imageId: 'test-1',
          description: 'Test',
        });
      });

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.editHistory).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
    });
  });

  describe('Settings', () => {
    it('should update generation settings', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.updateGenerationSettings({
          model: 'dall-e-2',
          size: '512x512',
          numberOfImages: 4,
        });
      });

      expect(result.current.generationSettings.model).toBe('dall-e-2');
      expect(result.current.generationSettings.size).toBe('512x512');
      expect(result.current.generationSettings.numberOfImages).toBe(4);
    });

    it('should update brush settings', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.updateBrushSettings({
          size: 100,
          hardness: 50,
        });
      });

      expect(result.current.brushSettings.size).toBe(100);
      expect(result.current.brushSettings.hardness).toBe(50);
    });

    it('should update export settings', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.updateExportSettings({
          format: 'jpeg',
          quality: 80,
        });
      });

      expect(result.current.exportSettings.format).toBe('jpeg');
      expect(result.current.exportSettings.quality).toBe(80);
    });
  });

  describe('View State', () => {
    it('should set zoom level', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setZoom(2.5);
      });

      expect(result.current.viewState.zoom).toBe(2.5);
    });

    it('should clamp zoom to valid range', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setZoom(0.01);
      });

      expect(result.current.viewState.zoom).toBe(0.1);

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.viewState.zoom).toBe(10);
    });

    it('should set pan position', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setPan(100, 200);
      });

      expect(result.current.viewState.panX).toBe(100);
      expect(result.current.viewState.panY).toBe(200);
    });

    it('should reset view', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setZoom(3);
        result.current.setPan(100, 200);
        result.current.toggleGrid();
      });

      act(() => {
        result.current.resetView();
      });

      expect(result.current.viewState.zoom).toBe(1);
      expect(result.current.viewState.panX).toBe(0);
      expect(result.current.viewState.panY).toBe(0);
      expect(result.current.viewState.showGrid).toBe(false);
    });

    it('should toggle grid and rulers', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.toggleGrid();
      });

      expect(result.current.viewState.showGrid).toBe(true);

      act(() => {
        result.current.toggleRulers();
      });

      expect(result.current.viewState.showRulers).toBe(true);
    });
  });

  describe('UI State', () => {
    it('should toggle sidebar', () => {
      const { result } = renderHook(() => useImageStudioStore());

      const initial = result.current.showSidebar;

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.showSidebar).toBe(!initial);
    });

    it('should set view mode', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setViewMode('single');
      });

      expect(result.current.viewMode).toBe('single');
    });

    it('should set filter favorites', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setFilterFavorites(true);
      });

      expect(result.current.filterFavorites).toBe(true);
    });
  });

  describe('Crop', () => {
    it('should set crop region', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setCropRegion({
          x: 100,
          y: 100,
          width: 500,
          height: 500,
        });
      });

      expect(result.current.cropRegion).toEqual({
        x: 100,
        y: 100,
        width: 500,
        height: 500,
      });
    });

    it('should set aspect ratio lock', () => {
      const { result } = renderHook(() => useImageStudioStore());

      act(() => {
        result.current.setAspectRatioLock('16:9');
      });

      expect(result.current.aspectRatioLock).toBe('16:9');
    });
  });

  describe('Layers', () => {
    it('should add a layer', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let layerId: string;
      act(() => {
        layerId = result.current.addLayer({
          name: 'Layer 1',
          type: 'image',
          visible: true,
          opacity: 1,
          locked: false,
        });
      });

      expect(result.current.layers).toHaveLength(1);
      expect(result.current.layers[0].name).toBe('Layer 1');
      expect(result.current.activeLayerId).toBe(layerId!);
    });

    it('should update a layer', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let layerId: string;
      act(() => {
        layerId = result.current.addLayer({
          name: 'Layer 1',
          type: 'image',
          visible: true,
          opacity: 1,
          locked: false,
        });
      });

      act(() => {
        result.current.updateLayer(layerId!, { opacity: 0.5 });
      });

      expect(result.current.layers[0].opacity).toBe(0.5);
    });

    it('should delete a layer', () => {
      const { result } = renderHook(() => useImageStudioStore());

      let layerId: string;
      act(() => {
        layerId = result.current.addLayer({
          name: 'Layer 1',
          type: 'image',
          visible: true,
          opacity: 1,
          locked: false,
        });
      });

      act(() => {
        result.current.deleteLayer(layerId!);
      });

      expect(result.current.layers).toHaveLength(0);
      expect(result.current.activeLayerId).toBeNull();
    });
  });
});
