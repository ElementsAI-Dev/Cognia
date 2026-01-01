/**
 * Image Studio Types
 * Types for image editing, cropping, adjustments, upscaling, and export
 */

// ============================================================================
// Image Cropper Types
// ============================================================================

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageTransform {
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

// ============================================================================
// Image Adjustments Types
// ============================================================================

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  hue: number; // -180 to 180
  blur: number; // 0 to 20
  sharpen: number; // 0 to 100
}

export interface FilterPreset {
  name: string;
  adjustments: Partial<ImageAdjustments>;
}

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  sharpen: 0,
};

// ============================================================================
// Image Upscaler Types
// ============================================================================

export type UpscaleMethod = 'bilinear' | 'bicubic' | 'lanczos' | 'ai';
export type UpscaleFactor = 2 | 4;

// ============================================================================
// Background Remover Types
// ============================================================================

export type BackgroundType = 'transparent' | 'white' | 'black' | 'blur' | 'custom';

// ============================================================================
// Batch Export Types
// ============================================================================

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface ExportableImage {
  id: string;
  url?: string;
  base64?: string;
  prompt: string;
  timestamp: number;
}

// ============================================================================
// Image Editor Panel Types
// ============================================================================

export type EditorMode = 'mask' | 'crop' | 'adjust' | 'upscale' | 'remove-bg';
