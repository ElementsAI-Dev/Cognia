/**
 * Web Worker Types for Image Processing
 * Type definitions for worker message passing
 */

import type { ImageAdjustments } from '@/types/media/image-studio';

/**
 * Worker message types
 */
export type WorkerMessageType =
  | 'load'
  | 'adjust'
  | 'filter'
  | 'transform'
  | 'export'
  | 'histogram'
  | 'levels'
  | 'curves'
  | 'hsl'
  | 'noise-reduction'
  | 'sharpen'
  | 'blur';

/**
 * Worker response types
 */
export type WorkerResponseType = 'success' | 'error' | 'progress';

/**
 * Transform options for worker
 */
export interface WorkerTransformOptions {
  rotate?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  scale?: number;
  cropRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Export options for worker
 */
export interface WorkerExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
}

/**
 * Filter definition for worker
 */
export interface WorkerFilterDefinition {
  id: string;
  name: string;
  params?: Record<string, unknown>;
}

/**
 * Levels adjustment options
 */
export interface LevelsOptions {
  inputBlack: number; // 0-255
  inputWhite: number; // 0-255
  inputGamma: number; // 0.1-10
  outputBlack: number; // 0-255
  outputWhite: number; // 0-255
  channel: 'rgb' | 'r' | 'g' | 'b';
}

/**
 * Curves adjustment point
 */
export interface CurvePoint {
  x: number; // 0-255
  y: number; // 0-255
}

/**
 * Curves adjustment options
 */
export interface CurvesOptions {
  rgb: CurvePoint[];
  red?: CurvePoint[];
  green?: CurvePoint[];
  blue?: CurvePoint[];
}

/**
 * HSL adjustment options
 */
export interface HSLOptions {
  hue: number; // -180 to 180
  saturation: number; // -100 to 100
  lightness: number; // -100 to 100
  targetHue?: number; // Target specific hue range
  hueRange?: number; // Range around target hue
}

/**
 * Noise reduction options
 */
export interface NoiseReductionOptions {
  strength: number; // 0-100
  method: 'median' | 'bilateral' | 'gaussian';
  preserveDetail: number; // 0-100
}

/**
 * Sharpen options
 */
export interface SharpenOptions {
  amount: number; // 0-500
  radius: number; // 0.1-250
  threshold: number; // 0-255
  method: 'unsharp-mask' | 'high-pass' | 'laplacian';
}

/**
 * Blur options
 */
export interface BlurOptions {
  radius: number; // 0-250
  method: 'gaussian' | 'box' | 'motion' | 'radial';
  angle?: number; // For motion blur
  centerX?: number; // For radial blur
  centerY?: number; // For radial blur
}

/**
 * Histogram data
 */
export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

/**
 * Worker message payload
 */
export interface WorkerPayload {
  imageData?: ImageData;
  adjustments?: ImageAdjustments;
  filter?: WorkerFilterDefinition;
  transform?: WorkerTransformOptions;
  exportOptions?: WorkerExportOptions;
  levels?: LevelsOptions;
  curves?: CurvesOptions;
  hsl?: HSLOptions;
  noiseReduction?: NoiseReductionOptions;
  sharpen?: SharpenOptions;
  blur?: BlurOptions;
}

/**
 * Worker message
 */
export interface WorkerMessage {
  id: string;
  type: WorkerMessageType;
  payload: WorkerPayload;
  transferables?: Transferable[];
}

/**
 * Worker response
 */
export interface WorkerResponse {
  id: string;
  type: WorkerResponseType;
  data?: ImageData | Uint8ClampedArray | HistogramData;
  error?: string;
  progress?: number;
  duration?: number;
}

/**
 * Serialized ImageData for transfer
 */
export interface SerializedImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Helper to serialize ImageData for transfer
 */
export function serializeImageData(imageData: ImageData): SerializedImageData {
  return {
    data: imageData.data,
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Helper to deserialize ImageData
 */
export function deserializeImageData(serialized: SerializedImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(serialized.data),
    serialized.width,
    serialized.height
  );
}
