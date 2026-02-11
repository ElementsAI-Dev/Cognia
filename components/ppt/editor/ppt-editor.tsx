'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { usePPTEditorStore, selectCurrentSlide, selectSelectedElements, selectSlideCount, selectIsDirty } from '@/stores/tools/ppt-editor-store';
import { useWindowControls } from '@/hooks';
import type { PPTSlideLayout } from '@/types/workflow';
import { SlideEditor } from './slide-editor';
import { SortableSlideItem } from './sortable-slide-item';
import { EditorToolbar } from './editor-toolbar';
import { EditorStatusBar } from './editor-status-bar';
import { AIToolbar } from './ai-toolbar';
import { SlideshowView } from '../slideshow';
import { alignElements, distributeElements, autoArrangeElements } from '../utils';
import type { PPTEditorProps } from '../types';
import { PPTPreviewErrorBoundary } from '../rendering/error-boundary';
import { FileText } from 'lucide-react';

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
    isGenerating,
    panelWidth,
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
    setPanelWidth,
  } = usePPTEditorStore();

  // Use optimized store selectors for derived state
  const currentSlide = usePPTEditorStore(selectCurrentSlide);
  const selectedElements = usePPTEditorStore(selectSelectedElements);
  const slideCount = usePPTEditorStore(selectSlideCount);
  const isDirty = usePPTEditorStore(selectIsDirty);

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

  // Auto-save when dirty (5-second debounce)
  useEffect(() => {
    if (!isDirty || !presentation) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 5000);
    return () => clearTimeout(timer);
  }, [isDirty, presentation, handleSave]);

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
      // Only handle editing shortcuts in edit mode
      if (mode === 'edit') {
        const store = usePPTEditorStore.getState();
        // Ctrl/Cmd + C: Copy
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            store.copy();
          }
        }
        // Ctrl/Cmd + V: Paste
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            store.paste();
          }
        }
        // Ctrl/Cmd + X: Cut
        if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            store.cut();
          }
        }
        // Ctrl/Cmd + D: Duplicate current slide
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault();
          if (currentSlide) {
            duplicateSlide(currentSlide.id);
          }
        }
        // Ctrl/Cmd + A: Select all elements on current slide
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            if (currentSlide) {
              store.selectElements(currentSlide.elements.map(el => el.id));
            }
          }
        }
        // Delete/Backspace: Delete selected elements
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const activeEl = document.activeElement;
          if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
            e.preventDefault();
            if (currentSlide && store.selection.elementIds.length > 0) {
              store.selection.elementIds.forEach(id => {
                store.deleteElement(currentSlide.id, id);
              });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, effectiveFullscreen, isTauri, canUndo, canRedo, undo, redo, prevSlide, nextSlide, setMode, handleSave, handleToggleFullscreen, currentSlide, duplicateSlide]);

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
      <Empty className={cn('h-full', className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>{t('noPresentation')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  // Slideshow mode
  if (mode === 'slideshow') {
    return (
      <div className={cn(
        'fixed inset-0 z-50 bg-black flex flex-col',
        effectiveFullscreen && 'cursor-none'
      )}>
        <PPTPreviewErrorBoundary
          labels={{
            failedToLoad: t('slideshowError'),
            tryAgain: t('exitSlideshow'),
          }}
        >
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
        </PPTPreviewErrorBoundary>
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
      <EditorToolbar
        presentation={presentation}
        selectedElements={selectedElements}
        isDirty={isDirty}
        zoom={zoom}
        showSlidePanel={showSlidePanel}
        showNotes={showNotes}
        showThemeCustomizer={showThemeCustomizer}
        effectiveFullscreen={effectiveFullscreen}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onAddSlide={handleAddSlide}
        onSetThemeById={setThemeById}
        onThemeChange={handleThemeChange}
        onSetShowThemeCustomizer={setShowThemeCustomizer}
        onSetZoom={setZoom}
        onSetShowSlidePanel={setShowSlidePanel}
        onToggleNotes={toggleNotes}
        onStartPresentation={() => {
          setMode('slideshow');
          handleToggleFullscreen();
        }}
        onExport={onExport}
        onToggleFullscreen={handleToggleFullscreen}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onAutoArrange={handleAutoArrange}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
      />

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Slide panel (left) */}
        {showSlidePanel && (
          <div className="border-r bg-muted/30 flex flex-col relative" style={{ width: panelWidth }}>
            <div className="p-2 border-b flex items-center justify-between">
              <span className="text-sm font-medium">
                {t('slides')} ({slideCount})
              </span>
            </div>
            {/* Resize handle */}
            <div
              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = panelWidth;
                const onMove = (ev: MouseEvent) => {
                  setPanelWidth(startWidth + (ev.clientX - startX));
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
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
          {/* AI Toolbar */}
          {mode === 'edit' && currentSlide && (
            <div className="border-b px-4 py-1.5 bg-muted/20">
              <AIToolbar
                slide={currentSlide}
                presentation={presentation}
                onSlideUpdate={(updates) => {
                  usePPTEditorStore.getState().updateSlide(currentSlide.id, updates);
                }}
              />
            </div>
          )}

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
                  <Textarea
                    className="w-full h-full min-h-[60px] bg-transparent border-none resize-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
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
      <EditorStatusBar
        currentSlideIndex={currentSlideIndex}
        slideCount={slideCount}
        currentSlide={currentSlide}
        isDirty={isDirty}
        isGenerating={isGenerating}
      />
    </div>
  );
}

export default PPTEditor;
