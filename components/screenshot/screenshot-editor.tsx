'use client';

/**
 * Screenshot Editor Component
 *
 * Full-featured screenshot editor with annotation tools.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AnnotationToolbar } from './annotation-toolbar';
import { AnnotationCanvas } from './annotation-canvas';
import { QuickColorBar } from './color-picker';
import { useEditorStore, selectCanUndo, selectCanRedo } from '@/stores/screenshot';
import type { Annotation, SelectionRegion } from '@/types/screenshot';

interface ScreenshotEditorProps {
  imageData: string;
  region?: SelectionRegion;
  onConfirm: (imageData: string, annotations: Annotation[]) => void;
  onCancel: () => void;
  className?: string;
}

export function ScreenshotEditor({
  imageData,
  region: _region,
  onConfirm,
  onCancel,
  className,
}: ScreenshotEditorProps) {
  const t = useTranslations('screenshot.editor');
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  // Store state
  const {
    currentTool,
    style,
    annotations,
    selectedAnnotationId,
    setCurrentTool,
    setStyle,
    addAnnotation,
    deleteAnnotation,
    selectAnnotation,
    clearAnnotations,
    undo,
    redo,
    getNextMarkerNumber,
    reset,
  } = useEditorStore();

  const canUndo = useEditorStore(selectCanUndo);
  const canRedo = useEditorStore(selectCanRedo);

  // Load image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
    };
    img.src = `data:image/png;base64,${imageData}`;

    return () => {
      reset();
    };
  }, [imageData, reset]);

  // Handler functions (defined before useEffect that uses them)
  const handleConfirm = useCallback(() => {
    onConfirm(imageData, annotations);
  }, [onConfirm, imageData, annotations]);

  const handleCopy = useCallback(async () => {
    try {
      const response = await fetch(`data:image/png;base64,${imageData}`);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [imageData]);

  const handleSave = useCallback(() => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  }, [imageData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            setCurrentTool('rectangle');
            break;
          case 'o':
            setCurrentTool('ellipse');
            break;
          case 'a':
            setCurrentTool('arrow');
            break;
          case 'p':
            setCurrentTool('freehand');
            break;
          case 't':
            setCurrentTool('text');
            break;
          case 'm':
            setCurrentTool('blur');
            break;
          case 'h':
            setCurrentTool('highlight');
            break;
          case 'n':
            setCurrentTool('marker');
            break;
          case 'v':
          case 's':
            setCurrentTool('select');
            break;
          case 'escape':
            onCancel();
            break;
          case 'delete':
          case 'backspace':
            if (selectedAnnotationId) {
              deleteAnnotation(selectedAnnotationId);
            }
            break;
        }
      }

      // Ctrl shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            e.preventDefault();
            break;
          case 'y':
            redo();
            e.preventDefault();
            break;
          case 'c':
            handleCopy();
            e.preventDefault();
            break;
          case 's':
            handleSave();
            e.preventDefault();
            break;
          case 'enter':
            handleConfirm();
            e.preventDefault();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setCurrentTool,
    undo,
    redo,
    selectedAnnotationId,
    deleteAnnotation,
    onCancel,
    handleCopy,
    handleSave,
    handleConfirm,
  ]);

  if (!imageDimensions) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  // Calculate display dimensions (fit to viewport)
  const maxWidth = window.innerWidth - 100;
  const maxHeight = window.innerHeight - 200;
  const scale = Math.min(
    maxWidth / imageDimensions.width,
    maxHeight / imageDimensions.height,
    1
  );
  const displayWidth = imageDimensions.width * scale;
  const displayHeight = imageDimensions.height * scale;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center',
        'bg-black/80 backdrop-blur-sm',
        className
      )}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <AnnotationToolbar
          currentTool={currentTool}
          style={style}
          canUndo={canUndo}
          canRedo={canRedo}
          onToolChange={setCurrentTool}
          onStyleChange={setStyle}
          onUndo={undo}
          onRedo={redo}
          onClear={clearAnnotations}
          onConfirm={handleConfirm}
          onCancel={onCancel}
          onCopy={handleCopy}
          onSave={handleSave}
        />
      </div>

      {/* Canvas area */}
      <div
        className="relative border-2 border-primary/50 rounded shadow-2xl overflow-hidden"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <AnnotationCanvas
          imageData={imageData}
          width={imageDimensions.width}
          height={imageDimensions.height}
          annotations={annotations}
          currentTool={currentTool}
          style={style}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationAdd={addAnnotation}
          onAnnotationSelect={selectAnnotation}
          onGetNextMarkerNumber={getNextMarkerNumber}
          className="w-full h-full"
        />
      </div>

      {/* Size info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur rounded-lg px-4 py-2 shadow-lg">
        <p className="text-sm text-muted-foreground">
          {t('dimensions', { width: imageDimensions.width, height: imageDimensions.height })}
          {annotations.length > 0 && (
            <span className="ml-4">{t('annotationCount', { count: annotations.length })}</span>
          )}
        </p>
      </div>

      {/* Quick color bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
        <div className="bg-background/90 backdrop-blur rounded-lg px-3 py-2 shadow-lg">
          <QuickColorBar
            color={style.color}
            onColorChange={(color) => setStyle({ color })}
          />
        </div>
      </div>
    </div>
  );
}
