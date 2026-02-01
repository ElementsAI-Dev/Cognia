/**
 * Image Studio Components
 * Export all image editing components organized by category
 */

// Core components - Main editor panel and preview
export { ImageEditorPanel } from './core/image-editor-panel';
export type { ImageEditorPanelProps } from './core/image-editor-panel';

export { ImagePreview } from './core/image-preview';
export type { ImagePreviewProps, ComparisonMode as ImagePreviewComparisonMode } from './core/image-preview';

export { ImageComparison } from './core/image-comparison';
export type { ImageComparisonProps, ComparisonMode } from './core/image-comparison';

// Tools - Editing tools (mask, crop, drawing, text)
export { MaskCanvas } from './tools/mask-canvas';
export type { MaskCanvasProps } from './tools/mask-canvas';

export { ImageCropper } from './tools/image-cropper';
export type { ImageCropperProps } from './tools/image-cropper';

export { DrawingTools } from './tools/drawing-tools';
export type { DrawingToolsProps, DrawingShape, ShapeType } from './tools/drawing-tools';

export { TextOverlay } from './tools/text-overlay';
export type { TextOverlayProps, TextLayer } from './tools/text-overlay';

// Adjustments - Image adjustments and filters
export { ImageAdjustmentsPanel } from './adjustments/image-adjustments';
export type { ImageAdjustmentsProps } from './adjustments/image-adjustments';

export { FiltersGallery } from './adjustments/filters-gallery';
export type { FiltersGalleryProps, FilterPreset as GalleryFilterPreset } from './adjustments/filters-gallery';

// AI - AI-powered features (upscaler, background remover)
export { ImageUpscaler } from './ai/image-upscaler';
export type { ImageUpscalerProps } from './ai/image-upscaler';

export { BackgroundRemover } from './ai/background-remover';
export type { BackgroundRemoverProps } from './ai/background-remover';

// Panels - Side panels (layers, history)
export { LayersPanel } from './panels/layers-panel';
export type { LayersPanelProps, Layer, LayerType, BlendMode } from './panels/layers-panel';

export { HistoryPanel } from './panels/history-panel';
export type { HistoryPanelProps, HistoryEntry, HistoryOperationType } from './panels/history-panel';

// Export - Batch export functionality
export { BatchExportDialog } from './export/batch-export-dialog';
export type { BatchExportDialogProps } from './export/batch-export-dialog';

// Re-export types from centralized types
export type {
  CropRegion,
  ImageTransform,
  ImageAdjustments,
  FilterPreset,
  UpscaleMethod,
  UpscaleFactor,
  BackgroundType,
  EditorMode,
  ExportFormat,
  ExportableImage,
  TextLayerConfig,
  DrawingShapeConfig,
  DrawingShapeType,
  LayerConfig,
  HistoryEntryConfig,
} from '@/types';

export { DEFAULT_IMAGE_ADJUSTMENTS } from '@/types';
