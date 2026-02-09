/**
 * PPT Component Types
 * Shared types for PPT components
 */

import type { PPTPresentation, PPTSlide, PPTSlideElement, PPTTheme } from '@/types/workflow';

export type PPTExportFormat = 'marp' | 'html' | 'reveal' | 'pdf' | 'pptx';

export interface PPTPreviewProps {
  presentation: PPTPresentation;
  onEdit?: (slideIndex: number) => void;
  onOpenEditor?: (presentation: PPTPresentation) => void;
  onExport?: (format: PPTExportFormat) => void;
  onThemeChange?: (themeId: string) => void;
  onPresentationChange?: (presentation: PPTPresentation) => void;
  className?: string;
}

export interface PPTEditorProps {
  presentation?: PPTPresentation;
  onSave?: (presentation: PPTPresentation) => void;
  onExport?: (format: string) => void;
  onClose?: () => void;
  className?: string;
}

export interface SlideEditorProps {
  slide: PPTSlide;
  theme: PPTTheme;
  isEditing?: boolean;
  className?: string;
}

export interface SingleSlideViewProps {
  slide: PPTSlide;
  slideIndex: number;
  totalSlides: number;
  theme: PPTPresentation['theme'];
  onPrev: () => void;
  onNext: () => void;
  onEdit?: () => void;
}

export interface GridViewProps {
  slides: PPTSlide[];
  theme: PPTPresentation['theme'];
  currentIndex: number;
  onSelect: (index: number) => void;
  onEdit?: (index: number) => void;
}

export interface OutlineViewProps {
  presentation: PPTPresentation;
  marpContent: string;
  onCopy: () => void;
  copied: boolean;
}

export interface SlideElementRendererProps {
  element: PPTSlideElement;
  theme: PPTTheme;
}

export interface SortableSlideItemProps {
  slide: PPTSlide;
  index: number;
  isSelected: boolean;
  theme: PPTPresentation['theme'];
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  canDelete: boolean;
}

export interface SlideshowViewProps {
  presentation: PPTPresentation;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  onGoToSlide?: (index: number) => void;
}

export interface SlideshowSettings {
  showThumbnails: boolean;
  showProgress: boolean;
  showTimer: boolean;
  showNotes: boolean;
  autoPlay: boolean;
  autoPlayInterval: number; // seconds
  enableTransitions: boolean;
  transitionType: 'none' | 'fade' | 'slide' | 'zoom';
  transitionDuration: number; // milliseconds
}

export interface PresenterModeProps {
  presentation: PPTPresentation;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onGoToSlide: (index: number) => void;
  onExit: () => void;
}

export interface ThumbnailNavigatorProps {
  slides: PPTSlide[];
  theme: PPTTheme;
  currentIndex: number;
  onSelect: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
}

export interface SlideElementProps {
  element: PPTSlideElement;
  theme: PPTTheme;
  isSelected: boolean;
  isEditing: boolean;
  onClick: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<PPTSlideElement>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
}

export interface ThemeMenuItemProps {
  theme: PPTTheme;
  onSelect: () => void;
}
