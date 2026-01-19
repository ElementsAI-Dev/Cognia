/**
 * PPT Components
 * 
 * Presentation/PowerPoint related components for creating,
 * editing, and previewing presentations.
 */

// Editor components
export { PPTEditor, SlideEditor, SlideElement, SortableSlideItem, AlignmentToolbar } from './editor';

// Preview components
export { PPTPreview, PPTPreviewWithErrorBoundary, SingleSlideView, GridView, OutlineView } from './preview';

// Slideshow components
export { SlideshowView, SlideshowControls, KeyboardHelpModal, ThumbnailNavigator } from './slideshow';

// Generation components
export { PPTGenerationDialog, PPTQuickAction, PPTOutlinePreview } from './generation';

// Theme components
export { ThemeCustomizer, ThemeMenuItem } from './theme';

// Rendering components
export { SlideElementRenderer, SlideContent, PPTPreviewErrorBoundary } from './rendering';

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

// Re-export types from submodules
export type { AlignmentToolbarProps } from './editor';
export type { PPTGenerationDialogProps, PPTQuickActionProps, PPTOutlinePreviewProps, PPTOutline, OutlineSlide } from './generation';
export type { ThemeCustomizerProps } from './theme';
export type { SlideContentProps } from './rendering';
