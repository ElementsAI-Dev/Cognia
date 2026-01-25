/**
 * Image Studio Store - manages image editing state and history
 * Provides state management for the Image Studio with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ImageSize, ImageQuality, ImageStyle } from '@/lib/ai';

/**
 * Editing tool types
 */
export type EditingTool =
  | 'select'
  | 'brush'
  | 'eraser'
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'zoom'
  | 'pan';

/**
 * Image adjustment values
 */
export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
  blur: number; // 0 to 100
  sharpen: number; // 0 to 100
}

/**
 * Crop region
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform state
 */
export interface ImageTransform {
  rotation: number; // degrees (0, 90, 180, 270)
  flipHorizontal: boolean;
  flipVertical: boolean;
  scale: number;
}

/**
 * Mask drawing stroke
 */
export interface MaskStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  brushSize: number;
  isEraser: boolean;
}

/**
 * Layer in the editor
 */
export interface EditorLayer {
  id: string;
  name: string;
  type: 'image' | 'mask' | 'adjustment';
  visible: boolean;
  opacity: number;
  locked: boolean;
  data?: string; // base64 or URL
  adjustments?: Partial<ImageAdjustments>;
  order: number;
}

/**
 * Generated image with metadata
 */
export interface StudioImage {
  id: string;
  url?: string;
  base64?: string;
  prompt: string;
  revisedPrompt?: string;
  negativePrompt?: string;
  model: string;
  size: ImageSize;
  quality: ImageQuality;
  style: ImageStyle;
  width?: number;
  height?: number;
  timestamp: number;
  isFavorite: boolean;
  tags: string[];
  parentId?: string; // For version tracking
  version: number;
  editHistory?: string[]; // IDs of edit operations
}

/**
 * Edit operation for history
 */
export interface EditOperation {
  id: string;
  type:
    | 'generate'
    | 'edit'
    | 'variation'
    | 'crop'
    | 'rotate'
    | 'flip'
    | 'adjust'
    | 'mask'
    | 'upscale'
    | 'remove-bg'
    | 'filter'
    | 'text'
    | 'draw';
  imageId: string;
  timestamp: number;
  description: string;
  beforeState?: string; // base64 snapshot
  afterState?: string; // base64 snapshot
  metadata?: Record<string, unknown>;
}

/**
 * Generation settings
 */
export interface GenerationSettings {
  model: 'dall-e-3' | 'dall-e-2' | 'gpt-image-1';
  size: ImageSize;
  quality: ImageQuality;
  style: ImageStyle;
  numberOfImages: number;
}

/**
 * Brush settings
 */
export interface BrushSettings {
  size: number; // 1-200
  hardness: number; // 0-100
  opacity: number; // 0-100
  color: string;
}

/**
 * Export settings
 */
export interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0-100 for jpeg/webp
  scale: number; // 1x, 2x, etc.
  includeMetadata: boolean;
}

/**
 * View state
 */
export interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showRulers: boolean;
}

interface ImageStudioState {
  // Current editing state
  activeTab: 'generate' | 'edit' | 'variations' | 'adjust' | 'upscale';
  selectedTool: EditingTool;
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;

  // Image gallery
  images: StudioImage[];
  selectedImageId: string | null;

  // Current working image
  workingImageUrl: string | null;
  workingImageBase64: string | null;
  originalImageUrl: string | null;

  // Mask state
  maskStrokes: MaskStroke[];
  maskBase64: string | null;

  // Layers
  layers: EditorLayer[];
  activeLayerId: string | null;

  // Adjustments
  adjustments: ImageAdjustments;

  // Transform
  transform: ImageTransform;

  // Crop
  cropRegion: CropRegion | null;
  aspectRatioLock: string | null; // '1:1', '16:9', '9:16', 'free'

  // Settings
  generationSettings: GenerationSettings;
  brushSettings: BrushSettings;
  exportSettings: ExportSettings;

  // View
  viewState: ViewState;

  // History
  editHistory: EditOperation[];
  historyIndex: number;

  // Prompt
  prompt: string;
  negativePrompt: string;

  // UI state
  showSidebar: boolean;
  showSettings: boolean;
  viewMode: 'grid' | 'single';
  gridZoomLevel: number;
  filterFavorites: boolean;

  // Actions - Tab & Tool
  setActiveTab: (tab: ImageStudioState['activeTab']) => void;
  setSelectedTool: (tool: EditingTool) => void;
  setProcessing: (isProcessing: boolean, message?: string) => void;
  setError: (error: string | null) => void;

  // Actions - Images
  addImage: (
    image: Omit<StudioImage, 'id' | 'timestamp' | 'isFavorite' | 'tags' | 'version'>
  ) => string;
  updateImage: (id: string, updates: Partial<StudioImage>) => void;
  deleteImage: (id: string) => void;
  selectImage: (id: string | null) => void;
  toggleFavorite: (id: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  getImageById: (id: string) => StudioImage | undefined;

  // Actions - Working Image
  setWorkingImage: (url: string | null, base64?: string | null) => void;
  setOriginalImage: (url: string | null) => void;
  resetWorkingImage: () => void;

  // Actions - Mask
  addMaskStroke: (stroke: Omit<MaskStroke, 'id'>) => void;
  clearMaskStrokes: () => void;
  undoMaskStroke: () => void;
  setMaskBase64: (base64: string | null) => void;

  // Actions - Layers
  addLayer: (layer: Omit<EditorLayer, 'id' | 'order'>) => string;
  updateLayer: (id: string, updates: Partial<EditorLayer>) => void;
  deleteLayer: (id: string) => void;
  setActiveLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Actions - Adjustments
  setAdjustment: <K extends keyof ImageAdjustments>(key: K, value: ImageAdjustments[K]) => void;
  resetAdjustments: () => void;
  applyAdjustments: () => void;

  // Actions - Transform
  setRotation: (degrees: number) => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  flipHorizontal: () => void;
  flipVertical: () => void;
  setScale: (scale: number) => void;
  resetTransform: () => void;

  // Actions - Crop
  setCropRegion: (region: CropRegion | null) => void;
  setAspectRatioLock: (ratio: string | null) => void;
  applyCrop: () => void;

  // Actions - Settings
  updateGenerationSettings: (settings: Partial<GenerationSettings>) => void;
  updateBrushSettings: (settings: Partial<BrushSettings>) => void;
  updateExportSettings: (settings: Partial<ExportSettings>) => void;

  // Actions - View
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  toggleGrid: () => void;
  toggleRulers: () => void;

  // Actions - History
  addToHistory: (operation: Omit<EditOperation, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // Actions - Prompt
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (prompt: string) => void;

  // Actions - UI
  toggleSidebar: () => void;
  toggleSettings: () => void;
  setViewMode: (mode: 'grid' | 'single') => void;
  setGridZoomLevel: (level: number) => void;
  setFilterFavorites: (filter: boolean) => void;

  // Bulk actions
  deleteAllImages: () => void;
  exportState: () => Partial<ImageStudioState>;
  importState: (state: Partial<ImageStudioState>) => void;
}

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
};

const DEFAULT_TRANSFORM: ImageTransform = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  scale: 1,
};

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  numberOfImages: 1,
};

const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 40,
  hardness: 80,
  opacity: 100,
  color: '#ffffff',
};

const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: 'png',
  quality: 90,
  scale: 1,
  includeMetadata: true,
};

const DEFAULT_VIEW_STATE: ViewState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: false,
  showRulers: false,
};

export const useImageStudioStore = create<ImageStudioState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeTab: 'generate',
      selectedTool: 'select',
      isProcessing: false,
      processingMessage: '',
      error: null,

      images: [],
      selectedImageId: null,

      workingImageUrl: null,
      workingImageBase64: null,
      originalImageUrl: null,

      maskStrokes: [],
      maskBase64: null,

      layers: [],
      activeLayerId: null,

      adjustments: { ...DEFAULT_ADJUSTMENTS },
      transform: { ...DEFAULT_TRANSFORM },
      cropRegion: null,
      aspectRatioLock: null,

      generationSettings: { ...DEFAULT_GENERATION_SETTINGS },
      brushSettings: { ...DEFAULT_BRUSH_SETTINGS },
      exportSettings: { ...DEFAULT_EXPORT_SETTINGS },

      viewState: { ...DEFAULT_VIEW_STATE },

      editHistory: [],
      historyIndex: -1,

      prompt: '',
      negativePrompt: '',

      showSidebar: true,
      showSettings: true,
      viewMode: 'grid',
      gridZoomLevel: 2,
      filterFavorites: false,

      // Actions - Tab & Tool
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedTool: (tool) => set({ selectedTool: tool }),
      setProcessing: (isProcessing, message = '') =>
        set({ isProcessing, processingMessage: message }),
      setError: (error) => set({ error }),

      // Actions - Images
      addImage: (image) => {
        const id = nanoid();
        const newImage: StudioImage = {
          ...image,
          id,
          timestamp: Date.now(),
          isFavorite: false,
          tags: [],
          version: 1,
        };
        set((state) => ({
          images: [newImage, ...state.images],
          selectedImageId: id,
        }));
        return id;
      },

      updateImage: (id, updates) => {
        set((state) => ({
          images: state.images.map((img) => (img.id === id ? { ...img, ...updates } : img)),
        }));
      },

      deleteImage: (id) => {
        set((state) => ({
          images: state.images.filter((img) => img.id !== id),
          selectedImageId: state.selectedImageId === id ? null : state.selectedImageId,
        }));
      },

      selectImage: (id) => set({ selectedImageId: id }),

      toggleFavorite: (id) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
          ),
        }));
      },

      addTag: (id, tag) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id && !img.tags.includes(tag) ? { ...img, tags: [...img.tags, tag] } : img
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, tags: img.tags.filter((t) => t !== tag) } : img
          ),
        }));
      },

      getImageById: (id) => get().images.find((img) => img.id === id),

      // Actions - Working Image
      setWorkingImage: (url, base64 = null) =>
        set({
          workingImageUrl: url,
          workingImageBase64: base64,
        }),

      setOriginalImage: (url) => set({ originalImageUrl: url }),

      resetWorkingImage: () => {
        const { originalImageUrl } = get();
        set({
          workingImageUrl: originalImageUrl,
          workingImageBase64: null,
          adjustments: { ...DEFAULT_ADJUSTMENTS },
          transform: { ...DEFAULT_TRANSFORM },
          cropRegion: null,
          maskStrokes: [],
          maskBase64: null,
        });
      },

      // Actions - Mask
      addMaskStroke: (stroke) => {
        const id = nanoid();
        set((state) => ({
          maskStrokes: [...state.maskStrokes, { ...stroke, id }],
        }));
      },

      clearMaskStrokes: () => set({ maskStrokes: [], maskBase64: null }),

      undoMaskStroke: () => {
        set((state) => ({
          maskStrokes: state.maskStrokes.slice(0, -1),
        }));
      },

      setMaskBase64: (base64) => set({ maskBase64: base64 }),

      // Actions - Layers
      addLayer: (layer) => {
        const id = nanoid();
        set((state) => {
          const order = state.layers.length;
          return {
            layers: [...state.layers, { ...layer, id, order }],
            activeLayerId: id,
          };
        });
        return id;
      },

      updateLayer: (id, updates) => {
        set((state) => ({
          layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)),
        }));
      },

      deleteLayer: (id) => {
        set((state) => ({
          layers: state.layers.filter((layer) => layer.id !== id),
          activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
        }));
      },

      setActiveLayer: (id) => set({ activeLayerId: id }),

      reorderLayers: (fromIndex, toIndex) => {
        set((state) => {
          const newLayers = [...state.layers];
          const [removed] = newLayers.splice(fromIndex, 1);
          newLayers.splice(toIndex, 0, removed);
          return {
            layers: newLayers.map((layer, index) => ({ ...layer, order: index })),
          };
        });
      },

      // Actions - Adjustments
      setAdjustment: (key, value) => {
        set((state) => ({
          adjustments: { ...state.adjustments, [key]: value },
        }));
      },

      resetAdjustments: () => set({ adjustments: { ...DEFAULT_ADJUSTMENTS } }),

      applyAdjustments: () => {
        const { workingImageUrl, adjustments } = get();
        if (workingImageUrl) {
          get().addToHistory({
            type: 'adjust',
            imageId: get().selectedImageId || '',
            description: 'Applied adjustments',
            metadata: { adjustments },
          });
        }
      },

      // Actions - Transform
      setRotation: (degrees) => {
        set((state) => ({
          transform: { ...state.transform, rotation: degrees % 360 },
        }));
      },

      rotateClockwise: () => {
        set((state) => ({
          transform: {
            ...state.transform,
            rotation: (state.transform.rotation + 90) % 360,
          },
        }));
      },

      rotateCounterClockwise: () => {
        set((state) => ({
          transform: {
            ...state.transform,
            rotation: (state.transform.rotation - 90 + 360) % 360,
          },
        }));
      },

      flipHorizontal: () => {
        set((state) => ({
          transform: {
            ...state.transform,
            flipHorizontal: !state.transform.flipHorizontal,
          },
        }));
      },

      flipVertical: () => {
        set((state) => ({
          transform: {
            ...state.transform,
            flipVertical: !state.transform.flipVertical,
          },
        }));
      },

      setScale: (scale) => {
        set((state) => ({
          transform: { ...state.transform, scale },
        }));
      },

      resetTransform: () => set({ transform: { ...DEFAULT_TRANSFORM } }),

      // Actions - Crop
      setCropRegion: (region) => set({ cropRegion: region }),
      setAspectRatioLock: (ratio) => set({ aspectRatioLock: ratio }),

      applyCrop: () => {
        const { cropRegion, selectedImageId } = get();
        if (cropRegion && selectedImageId) {
          get().addToHistory({
            type: 'crop',
            imageId: selectedImageId,
            description: 'Cropped image',
            metadata: { cropRegion },
          });
        }
        set({ cropRegion: null });
      },

      // Actions - Settings
      updateGenerationSettings: (settings) => {
        set((state) => ({
          generationSettings: { ...state.generationSettings, ...settings },
        }));
      },

      updateBrushSettings: (settings) => {
        set((state) => ({
          brushSettings: { ...state.brushSettings, ...settings },
        }));
      },

      updateExportSettings: (settings) => {
        set((state) => ({
          exportSettings: { ...state.exportSettings, ...settings },
        }));
      },

      // Actions - View
      setZoom: (zoom) => {
        set((state) => ({
          viewState: { ...state.viewState, zoom: Math.max(0.1, Math.min(10, zoom)) },
        }));
      },

      setPan: (x, y) => {
        set((state) => ({
          viewState: { ...state.viewState, panX: x, panY: y },
        }));
      },

      resetView: () => set({ viewState: { ...DEFAULT_VIEW_STATE } }),

      toggleGrid: () => {
        set((state) => ({
          viewState: { ...state.viewState, showGrid: !state.viewState.showGrid },
        }));
      },

      toggleRulers: () => {
        set((state) => ({
          viewState: { ...state.viewState, showRulers: !state.viewState.showRulers },
        }));
      },

      // Actions - History
      addToHistory: (operation) => {
        const id = nanoid();
        const fullOperation: EditOperation = {
          ...operation,
          id,
          timestamp: Date.now(),
        };
        set((state) => {
          const newHistory = state.editHistory.slice(0, state.historyIndex + 1);
          newHistory.push(fullOperation);
          return {
            editHistory: newHistory.slice(-100), // Keep last 100 operations
            historyIndex: Math.min(newHistory.length - 1, 99),
          };
        });
      },

      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            return { historyIndex: state.historyIndex - 1 };
          }
          return state;
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex < state.editHistory.length - 1) {
            return { historyIndex: state.historyIndex + 1 };
          }
          return state;
        });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().editHistory.length - 1,

      clearHistory: () => set({ editHistory: [], historyIndex: -1 }),

      // Actions - Prompt
      setPrompt: (prompt) => set({ prompt }),
      setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),

      // Actions - UI
      toggleSidebar: () => set((state) => ({ showSidebar: !state.showSidebar })),
      toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setGridZoomLevel: (level) => set({ gridZoomLevel: level }),
      setFilterFavorites: (filter) => set({ filterFavorites: filter }),

      // Bulk actions
      deleteAllImages: () => set({ images: [], selectedImageId: null }),

      exportState: () => {
        const state = get();
        return {
          images: state.images,
          generationSettings: state.generationSettings,
          brushSettings: state.brushSettings,
          exportSettings: state.exportSettings,
        };
      },

      importState: (importedState) => {
        set((state) => ({
          ...state,
          ...importedState,
        }));
      },
    }),
    {
      name: 'image-studio-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        images: state.images.slice(0, 100), // Limit stored images
        generationSettings: state.generationSettings,
        brushSettings: state.brushSettings,
        exportSettings: state.exportSettings,
        viewMode: state.viewMode,
        gridZoomLevel: state.gridZoomLevel,
        showSidebar: state.showSidebar,
      }),
    }
  )
);

// Selectors
export const selectImages = (state: ImageStudioState) => state.images;
export const selectSelectedImage = (state: ImageStudioState) =>
  state.images.find((img) => img.id === state.selectedImageId);
export const selectFavoriteImages = (state: ImageStudioState) =>
  state.images.filter((img) => img.isFavorite);
export const selectFilteredImages = (state: ImageStudioState) =>
  state.filterFavorites ? state.images.filter((img) => img.isFavorite) : state.images;
export const selectIsEditing = (state: ImageStudioState) =>
  state.activeTab === 'edit' || state.activeTab === 'adjust';
export const selectHasUnsavedChanges = (state: ImageStudioState) =>
  state.maskStrokes.length > 0 ||
  state.cropRegion !== null ||
  JSON.stringify(state.adjustments) !== JSON.stringify(DEFAULT_ADJUSTMENTS) ||
  JSON.stringify(state.transform) !== JSON.stringify(DEFAULT_TRANSFORM);
