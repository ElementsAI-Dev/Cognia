/**
 * Core image studio components
 * Main editor panel and preview components
 */

export { ImageEditorPanel } from './image-editor-panel';
export type { ImageEditorPanelProps } from './image-editor-panel';

export { ImagePreview } from './image-preview';
export type { ImagePreviewProps } from './image-preview';

export { ImageComparison } from './image-comparison';
export type { ImageComparisonProps } from './image-comparison';

// Re-export ComparisonMode from canonical types
export type { ComparisonMode } from '@/types';
