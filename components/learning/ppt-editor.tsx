'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { usePPTEditorStore } from '@/stores/ppt-editor-store';
import type { PPTPresentation, PPTSlide, PPTSlideLayout } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO, DEFAULT_PPT_THEMES } from '@/types/workflow';
import { SlideEditor } from './slide-editor';
import {
  Plus,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Download,
  Grid3X3,
  AlignLeft,
  Play,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Palette,
  Layout,
  FileText,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react';

export interface PPTEditorProps {
  presentation?: PPTPresentation;
  onSave?: (presentation: PPTPresentation) => void;
  onExport?: (format: string) => void;
  onClose?: () => void;
  className?: string;
}

export function PPTEditor({
  presentation: initialPresentation,
  onSave,
  onExport,
  className,
}: PPTEditorProps) {
  const t = useTranslations('pptEditor');
  
  const {
    presentation,
    currentSlideIndex,
    mode,
    zoom,
    showNotes,
    isDirty,
    isGenerating,
    loadPresentation,
    savePresentation,
    addSlide,
    duplicateSlide,
    deleteSlide,
    setCurrentSlide,
    nextSlide,
    prevSlide,
    setMode,
    setZoom,
    toggleNotes,
    undo,
    redo,
    canUndo,
    canRedo,
    reorderSlides,
    setThemeById,
    regenerateSlide,
  } = usePPTEditorStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSlidePanel, setShowSlidePanel] = useState(true);

  // Handle save - defined before useEffect that uses it
  const handleSave = useCallback(() => {
    const saved = savePresentation();
    if (saved && onSave) {
      onSave(saved);
    }
  }, [savePresentation, onSave]);

  // Handle add new slide
  const handleAddSlide = useCallback((layout: PPTSlideLayout = 'title-content') => {
    addSlide(layout, currentSlideIndex + 1);
  }, [addSlide, currentSlideIndex]);

  // Load initial presentation
  useEffect(() => {
    if (initialPresentation) {
      loadPresentation(initialPresentation);
    }
  }, [initialPresentation, loadPresentation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y: Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
      }
      // Arrow keys for slide navigation (when not editing)
      if (mode === 'preview' || mode === 'slideshow') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prevSlide();
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          nextSlide();
        }
      }
      // Escape: Exit fullscreen or slideshow
      if (e.key === 'Escape') {
        if (mode === 'slideshow') {
          setMode('edit');
        }
        if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
      // F5: Start slideshow
      if (e.key === 'F5') {
        e.preventDefault();
        setMode('slideshow');
        setIsFullscreen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isFullscreen, canUndo, canRedo, undo, redo, prevSlide, nextSlide, setMode, handleSave]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for slide reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && presentation) {
      const oldIndex = presentation.slides.findIndex(s => s.id === active.id);
      const newIndex = presentation.slides.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSlideIds = arrayMove(
          presentation.slides.map(s => s.id),
          oldIndex,
          newIndex
        );
        reorderSlides(newSlideIds);
        setCurrentSlide(newIndex);
      }
    }
  }, [presentation, reorderSlides, setCurrentSlide]);

  // Current slide
  const currentSlide = useMemo(() => {
    return presentation?.slides[currentSlideIndex] || null;
  }, [presentation, currentSlideIndex]);

  if (!presentation) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('noPresentation')}</p>
        </div>
      </div>
    );
  }

  // Slideshow mode
  if (mode === 'slideshow') {
    return (
      <div className={cn(
        'fixed inset-0 z-50 bg-black flex flex-col',
        isFullscreen && 'cursor-none'
      )}>
        <SlideshowView
          presentation={presentation}
          currentIndex={currentSlideIndex}
          onPrev={prevSlide}
          onNext={nextSlide}
          onExit={() => {
            setMode('edit');
            setIsFullscreen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-background',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          {/* File operations */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSave}>
                  <Save className={cn('h-4 w-4', isDirty && 'text-primary')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('save')} (Ctrl+S)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('undo')} (Ctrl+Z)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('redo')} (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Add slide dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t('addSlide')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {Object.entries(SLIDE_LAYOUT_INFO).map(([layout, info]) => (
                <DropdownMenuItem
                  key={layout}
                  onClick={() => handleAddSlide(layout as PPTSlideLayout)}
                >
                  <Layout className="h-4 w-4 mr-2" />
                  {info.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
              {DEFAULT_PPT_THEMES.map((theme) => (
                <DropdownMenuItem
                  key={theme.id}
                  onClick={() => setThemeById(theme.id)}
                >
                  <div
                    className="h-4 w-4 rounded-full mr-2"
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  {theme.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(zoom - 10)}
              disabled={zoom <= 25}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm w-12 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom(zoom + 10)}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* View toggles */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showSlidePanel ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setShowSlidePanel(!showSlidePanel)}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('toggleSlidePanel')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showNotes ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleNotes}
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('toggleNotes')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Slideshow */}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setMode('slideshow');
              setIsFullscreen(true);
            }}
          >
            <Play className="h-4 w-4 mr-1" />
            {t('present')}
          </Button>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                {t('export')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport?.('marp')}>
                📝 Marp Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('html')}>
                🌐 HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('reveal')}>
                🎭 Reveal.js
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                📄 PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('pptx')}>
                📊 PowerPoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide panel (left) */}
        {showSlidePanel && (
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('slides')} ({presentation.slides.length})
              </span>
            </div>
            <ScrollArea className="flex-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={presentation.slides.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-2 space-y-2">
                    {presentation.slides.map((slide, index) => (
                      <SortableSlideItem
                        key={slide.id}
                        slide={slide}
                        index={index}
                        isSelected={index === currentSlideIndex}
                        theme={presentation.theme}
                        onClick={() => setCurrentSlide(index)}
                        onDuplicate={() => duplicateSlide(slide.id)}
                        onDelete={() => deleteSlide(slide.id)}
                        onRegenerate={() => regenerateSlide(slide.id)}
                        isGenerating={isGenerating}
                        canDelete={presentation.slides.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
        )}

        {/* Main slide editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-4 bg-muted/20">
            <div
              className="mx-auto"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
            >
              {currentSlide && (
                <SlideEditor
                  slide={currentSlide}
                  theme={presentation.theme}
                  isEditing={mode === 'edit'}
                />
              )}
            </div>
          </div>

          {/* Notes panel (bottom) */}
          {showNotes && currentSlide && (
            <div className="h-32 border-t bg-muted/30">
              <div className="p-2 border-b">
                <span className="text-sm font-medium">{t('speakerNotes')}</span>
              </div>
              <ScrollArea className="h-[calc(100%-32px)]">
                <div className="p-3">
                  <textarea
                    className="w-full h-full min-h-[60px] bg-transparent resize-none text-sm focus:outline-none"
                    placeholder={t('addNotesPlaceholder')}
                    value={currentSlide.notes || ''}
                    onChange={(e) => {
                      usePPTEditorStore.getState().updateSlide(currentSlide.id, {
                        notes: e.target.value,
                      });
                    }}
                  />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-t px-4 py-1 text-xs text-muted-foreground bg-muted/30">
        <div className="flex items-center gap-4">
          <span>
            {t('slideOf', {
              current: currentSlideIndex + 1,
              total: presentation.slides.length,
            })}
          </span>
          <span>{SLIDE_LAYOUT_INFO[currentSlide?.layout || 'title-content'].name}</span>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && <Badge variant="outline">{t('unsaved')}</Badge>}
          {isGenerating && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('generating')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sortable slide item component
interface SortableSlideItemProps {
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

function SortableSlideItem({
  slide,
  index,
  isSelected,
  theme,
  onClick,
  onDuplicate,
  onDelete,
  onRegenerate,
  isGenerating,
  canDelete,
}: SortableSlideItemProps) {
  const t = useTranslations('pptEditor');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
            isSelected
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50',
            isDragging && 'opacity-50'
          )}
          onClick={onClick}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-background/80"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Slide number */}
          <div className="absolute top-1 left-6 text-[10px] font-medium text-muted-foreground bg-background/80 px-1 rounded">
            {index + 1}
          </div>

          {/* Slide preview */}
          <div
            className="aspect-video p-2"
            style={{
              backgroundColor: slide.backgroundColor || theme.backgroundColor,
            }}
          >
            {slide.title && (
              <div
                className="text-[8px] font-medium truncate"
                style={{ color: theme.primaryColor }}
              >
                {slide.title}
              </div>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {slide.bullets.slice(0, 3).map((bullet, i) => (
                  <div
                    key={i}
                    className="text-[6px] truncate"
                    style={{ color: theme.textColor }}
                  >
                    • {bullet}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerate} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('regenerate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={!canDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          {t('duplicate')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onRegenerate} disabled={isGenerating}>
          <Sparkles className="h-4 w-4 mr-2" />
          {t('regenerate')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          disabled={!canDelete}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Slideshow view component
interface SlideshowViewProps {
  presentation: PPTPresentation;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}

function SlideshowView({
  presentation,
  currentIndex,
  onPrev,
  onNext,
  onExit,
}: SlideshowViewProps) {
  const slide = presentation.slides[currentIndex];
  const theme = presentation.theme;

  if (!slide) return null;

  return (
    <div
      className="flex-1 flex flex-col justify-center items-center p-8"
      style={{
        backgroundColor: slide.backgroundColor || theme.backgroundColor,
        color: theme.textColor,
      }}
      onClick={onNext}
    >
      {/* Exit button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
      >
        <Minimize2 className="h-5 w-5" />
      </button>

      {/* Slide content */}
      <div className="max-w-5xl w-full">
        {slide.title && (
          <h1
            className={cn(
              'font-bold mb-6',
              slide.layout === 'title' || slide.layout === 'section'
                ? 'text-6xl text-center'
                : 'text-4xl'
            )}
            style={{
              fontFamily: theme.headingFont,
              color: theme.primaryColor,
            }}
          >
            {slide.title}
          </h1>
        )}

        {slide.subtitle && (
          <h2
            className={cn(
              'text-2xl mb-8',
              slide.layout === 'title' && 'text-center'
            )}
            style={{
              fontFamily: theme.bodyFont,
              color: theme.secondaryColor,
            }}
          >
            {slide.subtitle}
          </h2>
        )}

        {slide.content && (
          <div
            className="text-xl leading-relaxed mb-6"
            style={{ fontFamily: theme.bodyFont }}
          >
            {slide.content}
          </div>
        )}

        {slide.bullets && slide.bullets.length > 0 && (
          <ul className="space-y-4 text-xl" style={{ fontFamily: theme.bodyFont }}>
            {slide.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="mt-2 h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Navigation */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
        <button
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors disabled:opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-white/80 text-sm">
          {currentIndex + 1} / {presentation.slides.length}
        </span>
        <button
          className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors disabled:opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={currentIndex === presentation.slides.length - 1}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

export default PPTEditor;
