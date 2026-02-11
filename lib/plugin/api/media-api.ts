/**
 * Media Plugin API - Image and Video Processing for Plugins
 * 
 * Provides plugin access to image and video processing capabilities:
 * - Image manipulation (filters, transforms, effects)
 * - Video processing (trimming, transitions, effects)
 * - Custom filter/effect registration
 * - Media export utilities
 */

import { invoke } from '@tauri-apps/api/core';
import type { PluginManager } from '../core/manager';

// =============================================================================
// Types
// =============================================================================

export interface ImageProcessingOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-100 for jpeg/webp
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}

export interface ImageFilterDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'color' | 'blur' | 'stylize' | 'distort' | 'enhance' | 'custom';
  icon?: string;
  parameters?: FilterParameterDefinition[];
  apply: (imageData: ImageData, params?: Record<string, unknown>) => ImageData | Promise<ImageData>;
  preview?: (imageData: ImageData, params?: Record<string, unknown>) => ImageData;
}

export interface FilterParameterDefinition {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'string' | 'color' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
}

export interface ImageTransformOptions {
  rotate?: number; // degrees
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  scale?: number;
  cropRegion?: { x: number; y: number; width: number; height: number };
}

export interface ImageAdjustmentOptions {
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  hue?: number; // -180 to 180
  blur?: number; // 0 to 100
  sharpen?: number; // 0 to 100
  exposure?: number; // -100 to 100
  gamma?: number; // 0.1 to 10
  vibrance?: number; // -100 to 100
  temperature?: number; // -100 to 100
  tint?: number; // -100 to 100
}

export interface VideoClip {
  id: string;
  sourceUrl: string;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  position: number; // position in timeline
  track: number; // layer/track index
  volume?: number; // 0-1
  playbackSpeed?: number; // 0.1-10
  filters?: string[]; // applied filter IDs
  transitions?: {
    in?: VideoTransition;
    out?: VideoTransition;
  };
}

export interface VideoTransition {
  type: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'blur' | 'custom';
  duration: number; // seconds
  parameters?: Record<string, unknown>;
}

export interface VideoEffectDefinition {
  id: string;
  name: string;
  description?: string;
  category: 'color' | 'blur' | 'stylize' | 'distort' | 'motion' | 'custom';
  icon?: string;
  parameters?: FilterParameterDefinition[];
  supportsKeyframes?: boolean;
  apply: (frame: ImageData, params?: Record<string, unknown>, time?: number) => ImageData | Promise<ImageData>;
}

export interface VideoTransitionDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  minDuration: number;
  maxDuration: number;
  defaultDuration: number;
  parameters?: FilterParameterDefinition[];
  render: (
    fromFrame: ImageData,
    toFrame: ImageData,
    progress: number, // 0-1
    params?: Record<string, unknown>
  ) => ImageData;
}

export interface VideoExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  resolution: '480p' | '720p' | '1080p' | '4k';
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'maximum';
  codec?: string;
  audioBitrate?: number;
  videoBitrate?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'finalizing' | 'complete' | 'error';
  percent: number;
  currentFrame?: number;
  totalFrames?: number;
  elapsedMs?: number;
  estimatedRemainingMs?: number;
  message?: string;
}

export interface MediaProcessingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number; // processing time in ms
}

export interface PluginMediaAPI {
  // Image Processing
  image: {
    load: (source: string | Blob | File) => Promise<ImageData>;
    save: (imageData: ImageData, options?: ImageProcessingOptions) => Promise<Blob>;
    toDataUrl: (imageData: ImageData, format?: 'png' | 'jpeg' | 'webp', quality?: number) => string;
    fromDataUrl: (dataUrl: string) => Promise<ImageData>;
    resize: (imageData: ImageData, width: number, height: number, maintainAspect?: boolean) => ImageData;
    transform: (imageData: ImageData, options: ImageTransformOptions) => ImageData;
    adjust: (imageData: ImageData, adjustments: ImageAdjustmentOptions) => ImageData;
    applyFilter: (imageData: ImageData, filterId: string, params?: Record<string, unknown>) => Promise<ImageData>;
    getHistogram: (imageData: ImageData) => { r: number[]; g: number[]; b: number[]; luminance: number[] };
    compare: (image1: ImageData, image2: ImageData) => { similarity: number; diff?: ImageData };
  };

  // Video Processing
  video: {
    loadClip: (source: string | Blob | File) => Promise<VideoClip>;
    getFrame: (clipId: string, time: number) => Promise<ImageData>;
    getMetadata: (source: string | Blob | File) => Promise<{
      duration: number;
      width: number;
      height: number;
      fps: number;
      codec: string;
      bitrate: number;
      hasAudio: boolean;
    }>;
    trim: (clipId: string, startTime: number, endTime: number) => Promise<VideoClip>;
    concatenate: (clipIds: string[]) => Promise<VideoClip>;
    applyEffect: (clipId: string, effectId: string, params?: Record<string, unknown>) => Promise<void>;
    addTransition: (fromClipId: string, toClipId: string, transition: VideoTransition) => Promise<void>;
    export: (clipIds: string[], options: VideoExportOptions) => Promise<Blob>;
  };

  // Filter & Effect Registration
  filters: {
    register: (filter: ImageFilterDefinition) => void;
    unregister: (filterId: string) => void;
    getAll: () => ImageFilterDefinition[];
    getById: (filterId: string) => ImageFilterDefinition | undefined;
    getByCategory: (category: string) => ImageFilterDefinition[];
  };

  effects: {
    register: (effect: VideoEffectDefinition) => void;
    unregister: (effectId: string) => void;
    getAll: () => VideoEffectDefinition[];
    getById: (effectId: string) => VideoEffectDefinition | undefined;
  };

  transitions: {
    register: (transition: VideoTransitionDefinition) => void;
    unregister: (transitionId: string) => void;
    getAll: () => VideoTransitionDefinition[];
    getById: (transitionId: string) => VideoTransitionDefinition | undefined;
  };

  // AI Processing
  ai: {
    upscale: (imageData: ImageData, factor: 2 | 4) => Promise<ImageData>;
    removeBackground: (imageData: ImageData) => Promise<ImageData>;
    enhanceImage: (imageData: ImageData, type: 'denoise' | 'sharpen' | 'restore') => Promise<ImageData>;
    generateVariation: (imageData: ImageData, prompt?: string) => Promise<ImageData>;
    inpaint: (imageData: ImageData, mask: ImageData, prompt: string) => Promise<ImageData>;
  };

  // Utilities
  utils: {
    createCanvas: (width: number, height: number) => OffscreenCanvas;
    getImageDataFromCanvas: (canvas: OffscreenCanvas | HTMLCanvasElement) => ImageData;
    putImageDataToCanvas: (imageData: ImageData, canvas: OffscreenCanvas | HTMLCanvasElement) => void;
    blobToBase64: (blob: Blob) => Promise<string>;
    base64ToBlob: (base64: string, mimeType: string) => Blob;
    downloadFile: (blob: Blob, filename: string) => void;
  };
}

// =============================================================================
// Registry for Plugin-Registered Filters/Effects
// =============================================================================

class MediaRegistry {
  private filters = new Map<string, ImageFilterDefinition>();
  private effects = new Map<string, VideoEffectDefinition>();
  private transitions = new Map<string, VideoTransitionDefinition>();
  private pluginFilters = new Map<string, Set<string>>(); // pluginId -> filterIds

  registerFilter(pluginId: string, filter: ImageFilterDefinition): void {
    const fullId = `${pluginId}:${filter.id}`;
    this.filters.set(fullId, { ...filter, id: fullId });
    
    if (!this.pluginFilters.has(pluginId)) {
      this.pluginFilters.set(pluginId, new Set());
    }
    this.pluginFilters.get(pluginId)!.add(fullId);
  }

  unregisterFilter(filterId: string): void {
    this.filters.delete(filterId);
    for (const [, filterIds] of this.pluginFilters) {
      filterIds.delete(filterId);
    }
  }

  unregisterPluginFilters(pluginId: string): void {
    const filterIds = this.pluginFilters.get(pluginId);
    if (filterIds) {
      for (const id of filterIds) {
        this.filters.delete(id);
      }
      this.pluginFilters.delete(pluginId);
    }
  }

  getFilter(id: string): ImageFilterDefinition | undefined {
    return this.filters.get(id);
  }

  getAllFilters(): ImageFilterDefinition[] {
    return Array.from(this.filters.values());
  }

  getFiltersByCategory(category: string): ImageFilterDefinition[] {
    return this.getAllFilters().filter((f) => f.category === category);
  }

  registerEffect(pluginId: string, effect: VideoEffectDefinition): void {
    const fullId = `${pluginId}:${effect.id}`;
    this.effects.set(fullId, { ...effect, id: fullId });
  }

  unregisterEffect(effectId: string): void {
    this.effects.delete(effectId);
  }

  getEffect(id: string): VideoEffectDefinition | undefined {
    return this.effects.get(id);
  }

  getAllEffects(): VideoEffectDefinition[] {
    return Array.from(this.effects.values());
  }

  registerTransition(pluginId: string, transition: VideoTransitionDefinition): void {
    const fullId = `${pluginId}:${transition.id}`;
    this.transitions.set(fullId, { ...transition, id: fullId });
  }

  unregisterTransition(transitionId: string): void {
    this.transitions.delete(transitionId);
  }

  getTransition(id: string): VideoTransitionDefinition | undefined {
    return this.transitions.get(id);
  }

  getAllTransitions(): VideoTransitionDefinition[] {
    return Array.from(this.transitions.values());
  }
}

const mediaRegistry = new MediaRegistry();

export function getMediaRegistry(): MediaRegistry {
  return mediaRegistry;
}

// =============================================================================
// Image Processing Utilities
// =============================================================================

function createOffscreenCanvas(width: number, height: number): OffscreenCanvas {
  return new OffscreenCanvas(width, height);
}

async function loadImage(source: string | Blob | File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = createOffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

function imageDataToDataUrl(
  imageData: ImageData,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality = 0.92
): string {
  const canvas = createOffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.putImageData(imageData, 0, 0);
  
  // OffscreenCanvas uses convertToBlob, need to use regular canvas for toDataURL
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to get temp canvas context');
  tempCtx.putImageData(imageData, 0, 0);
  
  return tempCanvas.toDataURL(`image/${format}`, quality);
}

async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
  return loadImage(dataUrl);
}

function resizeImageData(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number,
  maintainAspect = true
): ImageData {
  let finalWidth = targetWidth;
  let finalHeight = targetHeight;

  if (maintainAspect) {
    const aspectRatio = imageData.width / imageData.height;
    if (targetWidth / targetHeight > aspectRatio) {
      finalWidth = Math.round(targetHeight * aspectRatio);
    } else {
      finalHeight = Math.round(targetWidth / aspectRatio);
    }
  }

  const sourceCanvas = createOffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Failed to get source canvas context');
  sourceCtx.putImageData(imageData, 0, 0);

  const targetCanvas = createOffscreenCanvas(finalWidth, finalHeight);
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) throw new Error('Failed to get target canvas context');
  
  targetCtx.drawImage(sourceCanvas, 0, 0, finalWidth, finalHeight);
  return targetCtx.getImageData(0, 0, finalWidth, finalHeight);
}

function transformImageData(imageData: ImageData, options: ImageTransformOptions): ImageData {
  const canvas = createOffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Create source canvas
  const sourceCanvas = createOffscreenCanvas(imageData.width, imageData.height);
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) throw new Error('Failed to get source canvas context');
  sourceCtx.putImageData(imageData, 0, 0);

  // Apply transforms
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

  // Apply crop
  if (options.cropRegion) {
    const { x, y, width, height } = options.cropRegion;
    const cropCanvas = createOffscreenCanvas(width, height);
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) throw new Error('Failed to get crop canvas context');
    cropCtx.putImageData(result, -x, -y);
    result = cropCtx.getImageData(0, 0, width, height);
  }

  return result;
}

function adjustImageData(imageData: ImageData, adjustments: ImageAdjustmentOptions): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    if (adjustments.brightness) {
      const brightness = adjustments.brightness * 2.55;
      r = Math.min(255, Math.max(0, r + brightness));
      g = Math.min(255, Math.max(0, g + brightness));
      b = Math.min(255, Math.max(0, b + brightness));
    }

    // Contrast
    if (adjustments.contrast) {
      const contrast = (adjustments.contrast + 100) / 100;
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      r = Math.min(255, Math.max(0, factor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, factor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, factor * (b - 128) + 128));
    }

    // Saturation
    if (adjustments.saturation) {
      const saturation = (adjustments.saturation + 100) / 100;
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
      g = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
      b = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
    }

    // Hue shift
    if (adjustments.hue) {
      const hueShift = adjustments.hue / 180;
      const [h, s, l] = rgbToHsl(r, g, b);
      const [newR, newG, newB] = hslToRgb((h + hueShift + 1) % 1, s, l);
      r = newR;
      g = newG;
      b = newB;
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return new ImageData(data, imageData.width, imageData.height);
}

// Color conversion utilities
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getHistogram(imageData: ImageData): {
  r: number[];
  g: number[];
  b: number[];
  luminance: number[];
} {
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < imageData.data.length; i += 4) {
    r[imageData.data[i]]++;
    g[imageData.data[i + 1]]++;
    b[imageData.data[i + 2]]++;
    const lum = Math.round(
      0.299 * imageData.data[i] +
        0.587 * imageData.data[i + 1] +
        0.114 * imageData.data[i + 2]
    );
    luminance[lum]++;
  }

  return { r, g, b, luminance };
}

// =============================================================================
// Create Media API
// =============================================================================

export function createMediaAPI(pluginId: string, _manager: PluginManager): PluginMediaAPI {
  return {
    image: {
      load: loadImage,

      save: async (imageData: ImageData, options?: ImageProcessingOptions): Promise<Blob> => {
        const format = options?.format || 'png';
        const quality = (options?.quality || 92) / 100;

        let processedData = imageData;
        if (options?.width || options?.height) {
          const width = options.width || imageData.width;
          const height = options.height || imageData.height;
          processedData = resizeImageData(imageData, width, height, options.maintainAspectRatio);
        }

        const canvas = createOffscreenCanvas(processedData.width, processedData.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.putImageData(processedData, 0, 0);

        return canvas.convertToBlob({ type: `image/${format}`, quality });
      },

      toDataUrl: imageDataToDataUrl,
      fromDataUrl: dataUrlToImageData,
      resize: resizeImageData,
      transform: transformImageData,
      adjust: adjustImageData,

      applyFilter: async (
        imageData: ImageData,
        filterId: string,
        params?: Record<string, unknown>
      ): Promise<ImageData> => {
        const filter = mediaRegistry.getFilter(filterId);
        if (!filter) {
          throw new Error(`Filter not found: ${filterId}`);
        }
        return filter.apply(imageData, params);
      },

      getHistogram,

      compare: (image1: ImageData, image2: ImageData): { similarity: number; diff?: ImageData } => {
        if (image1.width !== image2.width || image1.height !== image2.height) {
          return { similarity: 0 };
        }

        let diffSum = 0;
        const diffData = new Uint8ClampedArray(image1.data.length);

        for (let i = 0; i < image1.data.length; i += 4) {
          const dr = Math.abs(image1.data[i] - image2.data[i]);
          const dg = Math.abs(image1.data[i + 1] - image2.data[i + 1]);
          const db = Math.abs(image1.data[i + 2] - image2.data[i + 2]);

          diffSum += (dr + dg + db) / 3;

          diffData[i] = dr;
          diffData[i + 1] = dg;
          diffData[i + 2] = db;
          diffData[i + 3] = 255;
        }

        const maxDiff = (image1.data.length / 4) * 255;
        const similarity = 1 - diffSum / maxDiff;

        return {
          similarity,
          diff: new ImageData(diffData, image1.width, image1.height),
        };
      },
    },

    video: {
      loadClip: async (_source: string | Blob | File): Promise<VideoClip> => {
        // Implemented via Tauri backend
        return invoke<VideoClip>('plugin_media_load_video_clip', { pluginId, source: _source });
      },

      getFrame: async (clipId: string, time: number): Promise<ImageData> => {
        const frameData = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_get_video_frame',
          { pluginId, clipId, time }
        );
        return new ImageData(
          new Uint8ClampedArray(frameData.data),
          frameData.width,
          frameData.height
        );
      },

      getMetadata: async (source: string | Blob | File) => {
        return invoke<{
          duration: number;
          width: number;
          height: number;
          fps: number;
          codec: string;
          bitrate: number;
          hasAudio: boolean;
        }>('plugin_media_get_video_metadata', { pluginId, source });
      },

      trim: async (clipId: string, startTime: number, endTime: number): Promise<VideoClip> => {
        return invoke<VideoClip>('plugin_media_trim_video', {
          pluginId,
          clipId,
          startTime,
          endTime,
        });
      },

      concatenate: async (clipIds: string[]): Promise<VideoClip> => {
        return invoke<VideoClip>('plugin_media_concatenate_videos', { pluginId, clipIds });
      },

      applyEffect: async (
        clipId: string,
        effectId: string,
        params?: Record<string, unknown>
      ): Promise<void> => {
        return invoke('plugin_media_apply_video_effect', {
          pluginId,
          clipId,
          effectId,
          params,
        });
      },

      addTransition: async (
        fromClipId: string,
        toClipId: string,
        transition: VideoTransition
      ): Promise<void> => {
        return invoke('plugin_media_add_transition', {
          pluginId,
          fromClipId,
          toClipId,
          transition,
        });
      },

      export: async (clipIds: string[], options: VideoExportOptions): Promise<Blob> => {
        const result = await invoke<ArrayBuffer>('plugin_media_export_video', {
          pluginId,
          clipIds,
          options,
        });
        return new Blob([result], { type: `video/${options.format}` });
      },
    },

    filters: {
      register: (filter: ImageFilterDefinition) => {
        mediaRegistry.registerFilter(pluginId, filter);
      },

      unregister: (filterId: string) => {
        mediaRegistry.unregisterFilter(`${pluginId}:${filterId}`);
      },

      getAll: () => mediaRegistry.getAllFilters(),
      getById: (filterId: string) => mediaRegistry.getFilter(filterId),
      getByCategory: (category: string) => mediaRegistry.getFiltersByCategory(category),
    },

    effects: {
      register: (effect: VideoEffectDefinition) => {
        mediaRegistry.registerEffect(pluginId, effect);
      },

      unregister: (effectId: string) => {
        mediaRegistry.unregisterEffect(`${pluginId}:${effectId}`);
      },

      getAll: () => mediaRegistry.getAllEffects(),
      getById: (effectId: string) => mediaRegistry.getEffect(effectId),
    },

    transitions: {
      register: (transition: VideoTransitionDefinition) => {
        mediaRegistry.registerTransition(pluginId, transition);
      },

      unregister: (transitionId: string) => {
        mediaRegistry.unregisterTransition(`${pluginId}:${transitionId}`);
      },

      getAll: () => mediaRegistry.getAllTransitions(),
      getById: (transitionId: string) => mediaRegistry.getTransition(transitionId),
    },

    ai: {
      upscale: async (imageData: ImageData, factor: 2 | 4): Promise<ImageData> => {
        const result = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_ai_upscale',
          { pluginId, imageData: Array.from(imageData.data), width: imageData.width, height: imageData.height, factor }
        );
        return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
      },

      removeBackground: async (imageData: ImageData): Promise<ImageData> => {
        const result = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_ai_remove_background',
          { pluginId, imageData: Array.from(imageData.data), width: imageData.width, height: imageData.height }
        );
        return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
      },

      enhanceImage: async (
        imageData: ImageData,
        type: 'denoise' | 'sharpen' | 'restore'
      ): Promise<ImageData> => {
        const result = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_ai_enhance',
          { pluginId, imageData: Array.from(imageData.data), width: imageData.width, height: imageData.height, enhanceType: type }
        );
        return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
      },

      generateVariation: async (imageData: ImageData, prompt?: string): Promise<ImageData> => {
        const result = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_ai_variation',
          { pluginId, imageData: Array.from(imageData.data), width: imageData.width, height: imageData.height, prompt }
        );
        return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
      },

      inpaint: async (
        imageData: ImageData,
        mask: ImageData,
        prompt: string
      ): Promise<ImageData> => {
        const result = await invoke<{ data: number[]; width: number; height: number }>(
          'plugin_media_ai_inpaint',
          {
            pluginId,
            imageData: Array.from(imageData.data),
            width: imageData.width,
            height: imageData.height,
            maskData: Array.from(mask.data),
            prompt,
          }
        );
        return new ImageData(new Uint8ClampedArray(result.data), result.width, result.height);
      },
    },

    utils: {
      createCanvas: createOffscreenCanvas,

      getImageDataFromCanvas: (canvas: OffscreenCanvas | HTMLCanvasElement): ImageData => {
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
        if (!ctx) throw new Error('Failed to get canvas context');
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      },

      putImageDataToCanvas: (
        imageData: ImageData,
        canvas: OffscreenCanvas | HTMLCanvasElement
      ): void => {
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.putImageData(imageData, 0, 0);
      },

      blobToBase64: (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      },

      base64ToBlob: (base64: string, mimeType: string): Blob => {
        const byteString = atob(base64.split(',')[1] || base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        return new Blob([arrayBuffer], { type: mimeType });
      },

      downloadFile: (blob: Blob, filename: string): void => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    },
  };
}
