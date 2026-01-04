/**
 * PPT Components
 * 
 * Presentation/PowerPoint related components for creating,
 * editing, and previewing presentations.
 */

// Main components
export { PPTPreview, PPTPreviewWithErrorBoundary } from './ppt-preview';
export { PPTEditor } from './ppt-editor';
export { SlideEditor } from './slide-editor';

// Sub-components
export {
  SlideElementRenderer,
  SingleSlideView,
  GridView,
  OutlineView,
  ThemeMenuItem,
  SlideshowView,
  SortableSlideItem,
  SlideElement,
  PPTPreviewErrorBoundary,
  AlignmentToolbar,
  ThemeCustomizer,
  PPTGenerationDialog,
  PPTQuickAction,
  PPTOutlinePreview,
} from './components';

// Utilities
export {
  layoutEngine,
  generationPrompts,
  LAYOUT_TEMPLATES,
  calculateOptimalFontSize,
  suggestLayout,
  calculateSnapGuides,
  snapToGuide,
  autoArrangeElements,
  distributeElements,
  alignElements,
  buildSystemPrompt,
  buildOutlinePrompt,
  buildSlideContentPrompt,
  buildImprovementPrompt,
  buildImagePrompt,
  suggestLayoutFromContent,
  generateSpeakerNotesPrompt,
} from './utils';

// Types
export type {
  PPTExportFormat,
  PPTPreviewProps,
  PPTEditorProps,
  SlideEditorProps,
  SingleSlideViewProps,
  GridViewProps,
  OutlineViewProps,
  SlideElementRendererProps,
  SortableSlideItemProps,
  SlideshowViewProps,
  SlideElementProps,
  ThemeMenuItemProps,
} from './types';

export type {
  LayoutZone,
  SnapGuide,
  GenerationContext,
} from './utils';
