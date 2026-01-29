/**
 * Image Studio Hooks
 * Custom hooks for image editing functionality
 */

export { useImageEditorShortcuts, getShortcutDisplay } from './use-image-editor-shortcuts';
export type { ImageEditorShortcuts } from './use-image-editor-shortcuts';

export { useImageEditor } from './use-image-editor';
export type {
  ImageEditorState,
  ImageHistoryEntry,
  UseImageEditorOptions,
  UseImageEditorReturn,
} from './use-image-editor';

export { useWorkerProcessor } from './use-worker-processor';
export type {
  UseWorkerProcessorOptions,
  UseWorkerProcessorReturn,
} from './use-worker-processor';

export { useBatchProcessor } from './use-batch-processor';
export type { UseBatchProcessorOptions, UseBatchProcessorReturn } from './use-batch-processor';

export { useAdvancedImageEditor } from './use-advanced-image-editor';
export type {
  AdvancedEditorOptions,
  PerformanceMetric,
  UseAdvancedImageEditorReturn,
} from './use-advanced-image-editor';
