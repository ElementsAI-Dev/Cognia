/**
 * Image Studio Components
 * Export all image editing components
 */

export { MaskCanvas } from './mask-canvas';
export type { MaskCanvasProps } from './mask-canvas';

export { ImageCropper } from './image-cropper';
export type { ImageCropperProps } from './image-cropper';

export { ImageAdjustmentsPanel } from './image-adjustments';
export type { ImageAdjustmentsProps } from './image-adjustments';

export { ImageUpscaler } from './image-upscaler';
export type { ImageUpscalerProps } from './image-upscaler';

export { BackgroundRemover } from './background-remover';
export type { BackgroundRemoverProps } from './background-remover';

export { ImageEditorPanel } from './image-editor-panel';
export type { ImageEditorPanelProps } from './image-editor-panel';

export { BatchExportDialog } from './batch-export-dialog';
export type { BatchExportDialogProps } from './batch-export-dialog';

// New components
export { TextOverlay } from './text-overlay';
export type { TextOverlayProps, TextLayer } from './text-overlay';

export { DrawingTools } from './drawing-tools';
export type { DrawingToolsProps, DrawingShape, ShapeType } from './drawing-tools';

export { ImageComparison } from './image-comparison';
export type { ImageComparisonProps, ComparisonMode } from './image-comparison';

export { LayersPanel } from './layers-panel';
export type { LayersPanelProps, Layer, LayerType, BlendMode } from './layers-panel';

export { HistoryPanel } from './history-panel';
export type { HistoryPanelProps, HistoryEntry, HistoryOperationType } from './history-panel';

export { FiltersGallery } from './filters-gallery';
export type { FiltersGalleryProps, FilterPreset as GalleryFilterPreset } from './filters-gallery';

export { ImagePreview } from './image-preview';
export type { ImagePreviewProps, ComparisonMode as ImagePreviewComparisonMode } from './image-preview';

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
