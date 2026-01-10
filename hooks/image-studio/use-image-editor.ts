/**
 * useImageEditor - Main hook for image editing operations
 * 
 * Provides comprehensive image editing functionality:
 * - Image loading and state management
 * - Transform operations (crop, rotate, flip)
 * - Adjustments (brightness, contrast, saturation, etc.)
 * - Filter application
 * - History/undo-redo management
 * - Plugin integration for custom filters
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useImageStudioStore } from '@/stores';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';
import type {
  ImageAdjustmentOptions,
  ImageTransformOptions,
  ImageFilterDefinition,
} from '@/lib/plugin/api/media-api';

export interface ImageEditorState {
  imageUrl: string | null;
  imageData: ImageData | null;
  originalImageData: ImageData | null;
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
}

export interface ImageHistoryEntry {
  id: string;
  type: 'load' | 'transform' | 'adjust' | 'filter' | 'crop' | 'draw' | 'text' | 'plugin';
  description: string;
  imageData: ImageData;
  timestamp: number;
}

export interface UseImageEditorOptions {
  initialImageUrl?: string;
  maxHistorySize?: number;
  autoSaveInterval?: number;
  onImageChange?: (imageData: ImageData) => void;
  onError?: (error: string) => void;
}

export interface UseImageEditorReturn {
  // State
  state: ImageEditorState;
  history: ImageHistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;

  // Image Loading
  loadImage: (source: string | File | Blob) => Promise<void>;
  loadImageData: (imageData: ImageData) => void;
  resetToOriginal: () => void;

  // Transform Operations
  rotate: (degrees: number) => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  resize: (width: number, height: number, maintainAspect?: boolean) => void;
  crop: (x: number, y: number, width: number, height: number) => void;
  transform: (options: ImageTransformOptions) => void;

  // Adjustments
  adjust: (adjustments: ImageAdjustmentOptions) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSaturation: (value: number) => void;
  setHue: (value: number) => void;
  setBlur: (value: number) => void;
  setSharpen: (value: number) => void;
  resetAdjustments: () => void;

  // Filters
  applyFilter: (filterId: string, params?: Record<string, unknown>) => Promise<void>;
  previewFilter: (filterId: string, params?: Record<string, unknown>) => Promise<ImageData | null>;
  getAvailableFilters: () => ImageFilterDefinition[];
  getFiltersByCategory: (category: string) => ImageFilterDefinition[];

  // History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  goToHistoryIndex: (index: number) => void;

  // View Controls
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: (containerWidth: number, containerHeight: number) => void;
  setPan: (x: number, y: number) => void;
  resetPan: () => void;

  // Export
  toDataUrl: (format?: 'png' | 'jpeg' | 'webp', quality?: number) => string | null;
  toBlob: (format?: 'png' | 'jpeg' | 'webp', quality?: number) => Promise<Blob | null>;
  download: (filename?: string, format?: 'png' | 'jpeg' | 'webp') => Promise<void>;

  // Canvas Access
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getImageData: () => ImageData | null;
  putImageData: (imageData: ImageData) => void;
}

function createOffscreenCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(width, height);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useImageEditor(options: UseImageEditorOptions = {}): UseImageEditorReturn {
  const {
    initialImageUrl,
    maxHistorySize = 50,
    onImageChange,
    onError,
  } = options;

  // State
  const [state, setState] = useState<ImageEditorState>({
    imageUrl: null,
    imageData: null,
    originalImageData: null,
    isLoading: false,
    isProcessing: false,
    error: null,
    width: 0,
    height: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const [history, setHistory] = useState<ImageHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentAdjustments, setCurrentAdjustments] = useState<ImageAdjustmentOptions>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);

  const _storeActions = useImageStudioStore();

  // Derived state
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const isDirty = historyIndex > 0;

  // Add to history
  const addToHistory = useCallback(
    (
      type: ImageHistoryEntry['type'],
      description: string,
      imageData: ImageData
    ) => {
      const entry: ImageHistoryEntry = {
        id: generateId(),
        type,
        description,
        imageData,
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // Remove any redo entries
        const newHistory = prev.slice(0, historyIndex + 1);
        // Add new entry
        newHistory.push(entry);
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }
        return newHistory;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1));
    },
    [historyIndex, maxHistorySize]
  );

  // Set error
  const setError = useCallback(
    (error: string) => {
      setState((prev) => ({ ...prev, error }));
      onError?.(error);
    },
    [onError]
  );

  // Update image data
  const updateImageData = useCallback(
    (imageData: ImageData, addHistory = true, historyType?: ImageHistoryEntry['type'], description?: string) => {
      setState((prev) => ({
        ...prev,
        imageData,
        width: imageData.width,
        height: imageData.height,
        error: null,
      }));

      if (addHistory && historyType) {
        addToHistory(historyType, description || historyType, imageData);
      }

      onImageChange?.(imageData);
    },
    [addToHistory, onImageChange]
  );

  // Load image from URL/File/Blob
  const loadImage = useCallback(
    async (source: string | File | Blob): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));

          if (typeof source === 'string') {
            img.src = source;
          } else {
            img.src = URL.createObjectURL(source);
          }
        });

        const canvas = createOffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        offscreenCanvasRef.current = canvas;

        setState((prev) => ({
          ...prev,
          imageUrl: typeof source === 'string' ? source : URL.createObjectURL(source),
          imageData,
          originalImageData: imageData,
          width: imageData.width,
          height: imageData.height,
          isLoading: false,
          error: null,
        }));

        // Reset history with initial state
        setHistory([
          {
            id: generateId(),
            type: 'load',
            description: 'Image loaded',
            imageData,
            timestamp: Date.now(),
          },
        ]);
        setHistoryIndex(0);

        onImageChange?.(imageData);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load image';
        setError(message);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [onImageChange, setError]
  );

  // Load ImageData directly
  const loadImageData = useCallback(
    (imageData: ImageData) => {
      const canvas = createOffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        offscreenCanvasRef.current = canvas;
      }

      setState((prev) => ({
        ...prev,
        imageData,
        originalImageData: imageData,
        width: imageData.width,
        height: imageData.height,
        isLoading: false,
        error: null,
      }));

      setHistory([
        {
          id: generateId(),
          type: 'load',
          description: 'Image loaded',
          imageData,
          timestamp: Date.now(),
        },
      ]);
      setHistoryIndex(0);

      onImageChange?.(imageData);
    },
    [onImageChange]
  );

  // Reset to original
  const resetToOriginal = useCallback(() => {
    if (state.originalImageData) {
      updateImageData(state.originalImageData, true, 'load', 'Reset to original');
      setCurrentAdjustments({});
    }
  }, [state.originalImageData, updateImageData]);

  // Transform operations
  const transform = useCallback(
    (options: ImageTransformOptions) => {
      const { imageData } = state;
      if (!imageData) return;

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const canvas = createOffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        const sourceCanvas = createOffscreenCanvas(imageData.width, imageData.height);
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) throw new Error('Failed to get source context');
        sourceCtx.putImageData(imageData, 0, 0);

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);

        if (options.rotate) {
          ctx.rotate((options.rotate * Math.PI) / 180);
        }

        if (options.scale) {
          ctx.scale(options.scale, options.scale);
        }

        if (options.flipHorizontal) {
          ctx.scale(-1, 1);
        }

        if (options.flipVertical) {
          ctx.scale(1, -1);
        }

        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.restore();

        let result = ctx.getImageData(0, 0, canvas.width, canvas.height);

        if (options.cropRegion) {
          const { x, y, width, height } = options.cropRegion;
          const cropCanvas = createOffscreenCanvas(width, height);
          const cropCtx = cropCanvas.getContext('2d');
          if (!cropCtx) throw new Error('Failed to get crop context');
          cropCtx.putImageData(result, -x, -y);
          result = cropCtx.getImageData(0, 0, width, height);
        }

        updateImageData(result, true, 'transform', 'Transform applied');
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Transform failed');
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [state, updateImageData, setError]
  );

  const rotate = useCallback((degrees: number) => transform({ rotate: degrees }), [transform]);
  const rotateClockwise = useCallback(() => rotate(90), [rotate]);
  const rotateCounterClockwise = useCallback(() => rotate(-90), [rotate]);
  const flipHorizontal = useCallback(() => transform({ flipHorizontal: true }), [transform]);
  const flipVertical = useCallback(() => transform({ flipVertical: true }), [transform]);

  const resize = useCallback(
    (width: number, height: number, maintainAspect = true) => {
      const { imageData } = state;
      if (!imageData) return;

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        let finalWidth = width;
        let finalHeight = height;

        if (maintainAspect) {
          const aspectRatio = imageData.width / imageData.height;
          if (width / height > aspectRatio) {
            finalWidth = Math.round(height * aspectRatio);
          } else {
            finalHeight = Math.round(width / aspectRatio);
          }
        }

        const sourceCanvas = createOffscreenCanvas(imageData.width, imageData.height);
        const sourceCtx = sourceCanvas.getContext('2d');
        if (!sourceCtx) throw new Error('Failed to get source context');
        sourceCtx.putImageData(imageData, 0, 0);

        const targetCanvas = createOffscreenCanvas(finalWidth, finalHeight);
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) throw new Error('Failed to get target context');

        targetCtx.drawImage(sourceCanvas, 0, 0, finalWidth, finalHeight);
        const result = targetCtx.getImageData(0, 0, finalWidth, finalHeight);

        updateImageData(result, true, 'transform', `Resized to ${finalWidth}x${finalHeight}`);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Resize failed');
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [state, updateImageData, setError]
  );

  const crop = useCallback(
    (x: number, y: number, width: number, height: number) => {
      transform({ cropRegion: { x, y, width, height } });
    },
    [transform]
  );

  // Adjustments
  const adjust = useCallback(
    (adjustments: ImageAdjustmentOptions) => {
      const { originalImageData } = state;
      if (!originalImageData) return;

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const mergedAdjustments = { ...currentAdjustments, ...adjustments };
        setCurrentAdjustments(mergedAdjustments);

        const data = new Uint8ClampedArray(originalImageData.data);

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Brightness
          if (mergedAdjustments.brightness) {
            const brightness = mergedAdjustments.brightness * 2.55;
            r = Math.min(255, Math.max(0, r + brightness));
            g = Math.min(255, Math.max(0, g + brightness));
            b = Math.min(255, Math.max(0, b + brightness));
          }

          // Contrast
          if (mergedAdjustments.contrast) {
            const contrast = (mergedAdjustments.contrast + 100) / 100;
            const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
            r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
            g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
            b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
          }

          // Saturation
          if (mergedAdjustments.saturation) {
            const saturation = (mergedAdjustments.saturation + 100) / 100;
            const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
            r = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
            g = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
            b = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        const result = new ImageData(data, originalImageData.width, originalImageData.height);
        updateImageData(result, false);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Adjustment failed');
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [state, currentAdjustments, updateImageData, setError]
  );

  const setBrightness = useCallback((value: number) => adjust({ brightness: value }), [adjust]);
  const setContrast = useCallback((value: number) => adjust({ contrast: value }), [adjust]);
  const setSaturation = useCallback((value: number) => adjust({ saturation: value }), [adjust]);
  const setHue = useCallback((value: number) => adjust({ hue: value }), [adjust]);
  const setBlur = useCallback((value: number) => adjust({ blur: value }), [adjust]);
  const setSharpen = useCallback((value: number) => adjust({ sharpen: value }), [adjust]);

  const resetAdjustments = useCallback(() => {
    setCurrentAdjustments({});
    if (state.originalImageData) {
      updateImageData(state.originalImageData, false);
    }
  }, [state.originalImageData, updateImageData]);

  // Filters
  const getAvailableFilters = useCallback((): ImageFilterDefinition[] => {
    return getMediaRegistry().getAllFilters();
  }, []);

  const getFiltersByCategory = useCallback((category: string): ImageFilterDefinition[] => {
    return getMediaRegistry().getFiltersByCategory(category);
  }, []);

  const applyFilter = useCallback(
    async (filterId: string, params?: Record<string, unknown>): Promise<void> => {
      const { imageData } = state;
      if (!imageData) return;

      const filter = getMediaRegistry().getFilter(filterId);
      if (!filter) {
        setError(`Filter not found: ${filterId}`);
        return;
      }

      setState((prev) => ({ ...prev, isProcessing: true }));

      try {
        const result = await filter.apply(imageData, params);
        updateImageData(result, true, 'filter', `Applied ${filter.name}`);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Filter application failed');
      } finally {
        setState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [state, updateImageData, setError]
  );

  const previewFilter = useCallback(
    async (filterId: string, params?: Record<string, unknown>): Promise<ImageData | null> => {
      const { imageData } = state;
      if (!imageData) return null;

      const filter = getMediaRegistry().getFilter(filterId);
      if (!filter) return null;

      try {
        if (filter.preview) {
          return filter.preview(imageData, params);
        }
        return await filter.apply(imageData, params);
      } catch {
        return null;
      }
    },
    [state]
  );

  // History operations
  const undo = useCallback(() => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    if (entry) {
      setState((prev) => ({
        ...prev,
        imageData: entry.imageData,
        width: entry.imageData.width,
        height: entry.imageData.height,
      }));
      setHistoryIndex(newIndex);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    if (entry) {
      setState((prev) => ({
        ...prev,
        imageData: entry.imageData,
        width: entry.imageData.width,
        height: entry.imageData.height,
      }));
      setHistoryIndex(newIndex);
    }
  }, [canRedo, history, historyIndex]);

  const clearHistory = useCallback(() => {
    if (state.imageData) {
      setHistory([
        {
          id: generateId(),
          type: 'load',
          description: 'History cleared',
          imageData: state.imageData,
          timestamp: Date.now(),
        },
      ]);
      setHistoryIndex(0);
    }
  }, [state.imageData]);

  const goToHistoryIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= history.length) return;
      const entry = history[index];
      if (entry) {
        setState((prev) => ({
          ...prev,
          imageData: entry.imageData,
          width: entry.imageData.width,
          height: entry.imageData.height,
        }));
        setHistoryIndex(index);
      }
    },
    [history]
  );

  // View controls
  const setZoom = useCallback((zoom: number) => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, Math.min(10, zoom)) }));
  }, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.min(10, prev.zoom * 1.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  }, []);

  const resetZoom = useCallback(() => {
    setState((prev) => ({ ...prev, zoom: 1 }));
  }, []);

  const fitToView = useCallback(
    (containerWidth: number, containerHeight: number) => {
      const { width, height } = state;
      if (!width || !height) return;

      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const zoom = Math.min(scaleX, scaleY, 1);

      setState((prev) => ({ ...prev, zoom, panX: 0, panY: 0 }));
    },
    [state]
  );

  const setPan = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, panX: x, panY: y }));
  }, []);

  const resetPan = useCallback(() => {
    setState((prev) => ({ ...prev, panX: 0, panY: 0 }));
  }, []);

  // Export
  const toDataUrl = useCallback(
    (format: 'png' | 'jpeg' | 'webp' = 'png', quality = 0.92): string | null => {
      const { imageData } = state;
      if (!imageData) return null;

      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL(`image/${format}`, quality);
    },
    [state]
  );

  const toBlob = useCallback(
    async (format: 'png' | 'jpeg' | 'webp' = 'png', quality = 0.92): Promise<Blob | null> => {
      const { imageData } = state;
      if (!imageData) return null;

      const canvas = createOffscreenCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.putImageData(imageData, 0, 0);
      return canvas.convertToBlob({ type: `image/${format}`, quality });
    },
    [state]
  );

  const download = useCallback(
    async (filename = 'image', format: 'png' | 'jpeg' | 'webp' = 'png'): Promise<void> => {
      const blob = await toBlob(format);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [toBlob]
  );

  // Canvas access
  const getImageData = useCallback((): ImageData | null => {
    return state.imageData;
  }, [state.imageData]);

  const putImageData = useCallback(
    (imageData: ImageData) => {
      updateImageData(imageData, true, 'plugin', 'Plugin modification');
    },
    [updateImageData]
  );

  // Load initial image
  useEffect(() => {
    if (initialImageUrl) {
      loadImage(initialImageUrl);
    }
  }, [initialImageUrl, loadImage]);

  return {
    state,
    history,
    historyIndex,
    canUndo,
    canRedo,
    isDirty,

    loadImage,
    loadImageData,
    resetToOriginal,

    rotate,
    rotateClockwise,
    rotateCounterClockwise,
    flipHorizontal,
    flipVertical,
    resize,
    crop,
    transform,

    adjust,
    setBrightness,
    setContrast,
    setSaturation,
    setHue,
    setBlur,
    setSharpen,
    resetAdjustments,

    applyFilter,
    previewFilter,
    getAvailableFilters,
    getFiltersByCategory,

    undo,
    redo,
    clearHistory,
    goToHistoryIndex,

    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToView,
    setPan,
    resetPan,

    toDataUrl,
    toBlob,
    download,

    canvasRef,
    getImageData,
    putImageData,
  };
}

export default useImageEditor;
