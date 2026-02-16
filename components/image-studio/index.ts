/**
 * Image Studio Components
 * Export all image editing components organized by category
 */

// Core components - Main editor panel and preview
export { ImageEditorPanel } from './core/image-editor-panel';
export type { ImageEditorPanelProps } from './core/image-editor-panel';

export { ImagePreview } from './core/image-preview';
export type {
  ImagePreviewProps,
} from './core/image-preview';

export { ImageComparison } from './core/image-comparison';
export type { ImageComparisonProps } from './core/image-comparison';

// Tools - Editing tools (mask, crop, drawing, text)
export { MaskCanvas } from './tools/mask-canvas';
export type { MaskCanvasProps } from './tools/mask-canvas';

export { ImageCropper } from './tools/image-cropper';
export type { ImageCropperProps } from './tools/image-cropper';

export { DrawingTools } from './tools/drawing-tools';
export type { DrawingToolsProps, DrawingToolType } from './tools/drawing-tools';

export { TextOverlay } from './tools/text-overlay';
export type { TextOverlayProps, TextLayer } from './tools/text-overlay';

// Adjustments - Image adjustments and filters
export { ImageAdjustmentsPanel } from './adjustments/image-adjustments';
export type { ImageAdjustmentsProps } from './adjustments/image-adjustments';

export { FiltersGallery } from './adjustments/filters-gallery';
export type {
  FiltersGalleryProps,
} from './adjustments/filters-gallery';

// AI - AI-powered features (upscaler, background remover)
export { ImageUpscaler } from './ai/image-upscaler';
export type { ImageUpscalerProps } from './ai/image-upscaler';

export { BackgroundRemover } from './ai/background-remover';
export type { BackgroundRemoverProps } from './ai/background-remover';

// Panels - Side panels (layers, history)
export { LayersPanel } from './panels/layers-panel';
export type { LayersPanelProps } from './panels/layers-panel';

export { HistoryPanel } from './panels/history-panel';
export type { HistoryPanelProps } from './panels/history-panel';

// Export - Batch export functionality
export { BatchExportDialog } from './export/batch-export-dialog';
export type { BatchExportDialogProps } from './export/batch-export-dialog';

// Layout - Page-level layout components
export { ImageStudioHeader } from './layout/image-studio-header';
export type { ImageStudioHeaderProps } from './layout/image-studio-header';

export { ImageGenerationSidebar } from './layout/image-generation-sidebar';
export type { ImageGenerationSidebarProps } from './layout/image-generation-sidebar';

export { ImageStudioDialogs } from './layout/image-studio-dialogs';
export type {
  ImageStudioDialogsProps,
  EditMode,
  EditorSaveResult,
} from './layout/image-studio-dialogs';

// Gallery - Image gallery and detail views
export { ImageGalleryGrid } from './gallery/image-gallery-grid';
export type {
  ImageGalleryGridProps,
  ImageEditAction,
} from './gallery/image-gallery-grid';

export { ImageDetailView } from './gallery/image-detail-view';
export type {
  ImageDetailViewProps,
  HistogramData,
} from './gallery/image-detail-view';

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
  ImageExportFormat,
  ExportableImage,
  TextLayerConfig,
  DrawingShapeConfig,
  DrawingShapeType,
  ComparisonMode,
  LayerType,
  BlendMode,
  Layer,
  LayerConfig,
  HistoryEntry,
  HistoryEntryConfig,
  HistoryOperationType,
} from '@/types';

export { DEFAULT_IMAGE_ADJUSTMENTS } from '@/types';
