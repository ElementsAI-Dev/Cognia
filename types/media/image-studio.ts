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

export type ImageExportFormat = 'png' | 'jpeg' | 'webp';

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

export type EditorMode =
  | 'mask'
  | 'crop'
  | 'adjust'
  | 'upscale'
  | 'remove-bg'
  | 'text'
  | 'draw'
  | 'filters';

// ============================================================================
// Text Overlay Types
// ============================================================================

export interface TextLayerConfig {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  opacity: number;
  rotation: number;
  align: 'left' | 'center' | 'right';
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
}

// ============================================================================
// Drawing Tools Types
// ============================================================================

export type DrawingShapeType =
  | 'freehand'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'highlighter';

export interface DrawingShapeConfig {
  id: string;
  type: DrawingShapeType;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  opacity: number;
  fill?: boolean;
  fillColor?: string;
}

// ============================================================================
// Image Comparison Types
// ============================================================================

export type ComparisonMode = 'slider-h' | 'slider-v' | 'side-by-side' | 'onion-skin' | 'toggle';

// ============================================================================
// Layers Panel Types
// ============================================================================

export type LayerType = 'image' | 'mask' | 'adjustment' | 'text' | 'shape';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export interface LayerConfig {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  order: number;
}

// ============================================================================
// History Panel Types
// ============================================================================

export type HistoryOperationType =
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
  | 'text'
  | 'draw'
  | 'filter';

export interface HistoryEntryConfig {
  id: string;
  type: HistoryOperationType;
  description: string;
  timestamp: number;
  thumbnail?: string;
}
