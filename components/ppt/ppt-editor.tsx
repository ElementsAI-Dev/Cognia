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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePPTEditorStore } from '@/stores/tools/ppt-editor-store';
import { useWindowControls } from '@/hooks';
import type { PPTSlideLayout } from '@/types/workflow';
import { SLIDE_LAYOUT_INFO, DEFAULT_PPT_THEMES } from '@/types/workflow';
import { SlideEditor } from './slide-editor';
import { SortableSlideItem, SlideshowView, AlignmentToolbar, ThemeCustomizer } from './components';
import { alignElements, distributeElements, autoArrangeElements } from './utils';
import type { PPTEditorProps } from './types';
import {
  Plus,
  Undo2,
  Redo2,
  Save,
  Download,
  Grid3X3,
  AlignLeft,
  Play,
  Palette,
  Layout,
  FileText,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Loader2,
  Settings,
} from 'lucide-react';

/**
 * PPTEditor - Full-featured presentation editor
 * Supports slide management, editing, themes, and slideshow mode
 */
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
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);

  // Native window controls for Tauri
  const {
    isTauri,
    isFullscreen: isNativeFullscreen,
    toggleFullscreen: toggleNativeFullscreen,
  } = useWindowControls();

  // Determine actual fullscreen state (native or CSS-based)
  const effectiveFullscreen = isTauri ? isNativeFullscreen : isFullscreen;

  // Toggle fullscreen - use native when available
  const handleToggleFullscreen = useCallback(async () => {
    if (isTauri) {
      await toggleNativeFullscreen();
    } else {
      setIsFullscreen(prev => !prev);
    }
  }, [isTauri, toggleNativeFullscreen]);

  // Get additional store methods for alignment operations
  const {
    selection,
    bringToFront,
    sendToBack,
    setTheme,
  } = usePPTEditorStore();

  // Current slide (declared early so handlers can use it)
  const currentSlide = useMemo(() => {
    return presentation?.slides[currentSlideIndex] || null;
  }, [presentation, currentSlideIndex]);

  // Selected elements for alignment operations
  const selectedElements = useMemo(() => {
    if (!currentSlide || selection.elementIds.length === 0) return [];
    return currentSlide.elements.filter(el => selection.elementIds.includes(el.id));
  }, [currentSlide, selection.elementIds]);

  // Alignment handlers
  const handleAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!currentSlide || selectedElements.length < 2) return;
    const aligned = alignElements(selectedElements, alignment);
    aligned.forEach(el => {
      usePPTEditorStore.getState().updateElement(currentSlide.id, el.id, { position: el.position });
    });
  }, [currentSlide, selectedElements]);

  const handleDistribute = useCallback((direction: 'horizontal' | 'vertical') => {
    if (!currentSlide || selectedElements.length < 3) return;
    const distributed = distributeElements(selectedElements, direction);
    distributed.forEach(el => {
      usePPTEditorStore.getState().updateElement(currentSlide.id, el.id, { position: el.position });
    });
  }, [currentSlide, selectedElements]);

  const handleAutoArrange = useCallback(() => {
    if (!currentSlide || selectedElements.length < 2) return;
    const arranged = autoArrangeElements(selectedElements, 80, 70, 10, 5);
    arranged.forEach(el => {
      usePPTEditorStore.getState().updateElement(currentSlide.id, el.id, { position: el.position });
    });
  }, [currentSlide, selectedElements]);

  const handleBringToFront = useCallback(() => {
    if (!currentSlide || selection.elementIds.length === 0) return;
    selection.elementIds.forEach(id => bringToFront(currentSlide.id, id));
  }, [currentSlide, selection.elementIds, bringToFront]);

  const handleSendToBack = useCallback(() => {
    if (!currentSlide || selection.elementIds.length === 0) return;
    selection.elementIds.forEach(id => sendToBack(currentSlide.id, id));
  }, [currentSlide, selection.elementIds, sendToBack]);

  // Theme change handler
  const handleThemeChange = useCallback((newTheme: NonNullable<typeof presentation>['theme']) => {
    if (newTheme) setTheme(newTheme);
  }, [setTheme]);

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
        if (effectiveFullscreen && !isTauri) {
          setIsFullscreen(false);
        }
      }
      // F5: Start slideshow
      if (e.key === 'F5') {
        e.preventDefault();
        setMode('slideshow');
        handleToggleFullscreen();
      }
      // F11: Toggle fullscreen (native or CSS)
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, effectiveFullscreen, isTauri, canUndo, canRedo, undo, redo, prevSlide, nextSlide, setMode, handleSave, handleToggleFullscreen]);

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
        effectiveFullscreen && 'cursor-none'
      )}>
        <SlideshowView
          presentation={presentation}
          currentIndex={currentSlideIndex}
          onPrev={prevSlide}
          onNext={nextSlide}
          onGoToSlide={setCurrentSlide}
          onExit={async () => {
            setMode('edit');
            if (isTauri && isNativeFullscreen) {
              await toggleNativeFullscreen();
            } else {
              setIsFullscreen(false);
            }
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

          {/* Theme Customizer */}
          <Popover open={showThemeCustomizer} onOpenChange={setShowThemeCustomizer}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {presentation && (
                <ThemeCustomizer
                  theme={presentation.theme}
                  onChange={handleThemeChange}
                  onReset={() => setThemeById('modern-light')}
                />
              )}
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment Toolbar - shown when elements are selected */}
          {selectedElements.length > 0 && (
            <AlignmentToolbar
              onAlign={handleAlign}
              onDistribute={handleDistribute}
              onAutoArrange={handleAutoArrange}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              disabled={selectedElements.length < 2}
            />
          )}
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
              handleToggleFullscreen();
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
                  onClick={handleToggleFullscreen}
                >
                  {effectiveFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {effectiveFullscreen ? t('exitFullscreen') : t('fullscreen')}
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

export default PPTEditor;
