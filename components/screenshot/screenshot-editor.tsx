'use client';

/**
 * Screenshot Editor Component
 *
 * Full-featured screenshot editor with annotation tools.
 */

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { AnnotationCanvas } from './annotation-canvas';
import { AnnotationToolbar } from './annotation-toolbar';
import { Magnifier } from './magnifier';
import { QuickColorBar } from './color-picker';
import {
  useEditorStore,
  selectCanUndo,
  selectCanRedo,
  selectHasAnnotations,
  selectAnnotationCount,
} from '@/stores/screenshot';
import type { Annotation, SelectionRegion } from '@/types/screenshot';
import { PRESET_COLORS } from '@/types/screenshot';

interface ScreenshotEditorProps {
  imageData: string;
  region?: SelectionRegion;
  onConfirm: (imageData: string, annotations: Annotation[]) => void;
  onCancel: () => void;
  onSendToChat?: (imageData: string) => void;
  onExtractText?: (imageData: string) => void;
  className?: string;
}

export function ScreenshotEditor({
  imageData,
  region,
  onConfirm,
  onCancel,
  onSendToChat,
  onExtractText,
  className,
}: ScreenshotEditorProps) {
  const t = useTranslations('screenshot.editor');
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [exportCanvasFn, setExportCanvasFn] = useState<(() => string | null) | null>(null);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasImageData, setCanvasImageData] = useState<ImageData | null>(null);

  // Track container size via ResizeObserver (SSR-safe, responsive to window resize)
  // Re-run when imageDimensions changes because containerRef div only mounts after image loads
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageDimensions]);

  // Store state
  const {
    currentTool,
    style,
    annotations,
    selectedAnnotationId,
    setCurrentTool,
    setStyle,
    addAnnotation,
    updateAnnotation,
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
  const hasAnnotations = useEditorStore(selectHasAnnotations);
  const annotationCount = useEditorStore(selectAnnotationCount);

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

  // Get the final image data (with annotations if available)
  const getFinalImageData = useCallback(() => {
    if (exportCanvasFn && annotations.length > 0) {
      const exported = exportCanvasFn();
      if (exported) return exported;
    }
    return imageData;
  }, [exportCanvasFn, annotations, imageData]);

  // Handler functions (defined before useEffect that uses them)
  const handleConfirm = useCallback(() => {
    const finalData = getFinalImageData();
    onConfirm(finalData, annotations);
  }, [onConfirm, getFinalImageData, annotations]);

  const handleCopy = useCallback(async () => {
    try {
      const finalData = getFinalImageData();
      const response = await fetch(`data:image/png;base64,${finalData}`);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch (err) {
      loggers.ui.error('Failed to copy to clipboard:', err);
    }
  }, [getFinalImageData]);

  const handleSave = useCallback(async () => {
    const finalData = getFinalImageData();
    try {
      // Use Tauri native save dialog when available
      const { isTauri } = await import('@/lib/native/utils');
      if (isTauri()) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          defaultPath: `screenshot-${Date.now()}.png`,
          filters: [{ name: 'Images', extensions: ['png'] }],
        });
        if (filePath) {
          const bytes = Uint8Array.from(atob(finalData), (c) => c.charCodeAt(0));
          await writeFile(filePath, bytes);
          return;
        }
      }
    } catch {
      // Fall through to browser download
    }
    // Fallback: browser download
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${finalData}`;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  }, [getFinalImageData]);

  const handleSendToChat = useCallback(() => {
    const finalData = getFinalImageData();
    onSendToChat?.(finalData);
  }, [onSendToChat, getFinalImageData]);

  const handleExtractText = useCallback(() => {
    const finalData = getFinalImageData();
    onExtractText?.(finalData);
  }, [onExtractText, getFinalImageData]);

  // Callback to receive the export function from AnnotationCanvas
  const handleCanvasReady = useCallback((exportFn: () => string | null) => {
    setExportCanvasFn(() => exportFn);
  }, []);

  // Handle cursor move for magnifier
  const handleCursorMove = useCallback((x: number, y: number, imgData: ImageData | null) => {
    setCursorPosition({ x, y });
    setCanvasImageData(imgData);
  }, []);

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
          case 'b':
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
          case 'g':
            // Toggle magnifier
            setShowMagnifier((prev) => !prev);
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
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9':
            // Number keys 1-9 select preset colors
            const colorIndex = parseInt(e.key) - 1;
            if (colorIndex >= 0 && colorIndex < PRESET_COLORS.length) {
              setStyle({ color: PRESET_COLORS[colorIndex] });
            }
            break;
          case '0':
            // 0 selects black (last preset color)
            setStyle({ color: PRESET_COLORS[9] });
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
    setStyle,
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

  // Calculate display dimensions (fit to container)
  const maxWidth = (containerSize.width || 800) - 100;
  const maxHeight = (containerSize.height || 600) - 200;
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
          selectedAnnotationId={selectedAnnotationId}
          showMagnifier={showMagnifier}
          onToolChange={setCurrentTool}
          onStyleChange={setStyle}
          onUndo={undo}
          onRedo={redo}
          onClear={clearAnnotations}
          onDelete={() => selectedAnnotationId && deleteAnnotation(selectedAnnotationId)}
          onConfirm={handleConfirm}
          onCancel={onCancel}
          onCopy={handleCopy}
          onSave={handleSave}
          onToggleMagnifier={() => setShowMagnifier((prev) => !prev)}
          onSendToChat={onSendToChat ? handleSendToChat : undefined}
          onExtractText={onExtractText ? handleExtractText : undefined}
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
          onAnnotationUpdate={updateAnnotation}
          onAnnotationSelect={selectAnnotation}
          onGetNextMarkerNumber={getNextMarkerNumber}
          onCanvasReady={handleCanvasReady}
          onCursorMove={showMagnifier ? handleCursorMove : undefined}
          className="w-full h-full"
        />
      </div>

      {/* Size info */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur rounded-lg px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t('dimensions', { width: imageDimensions.width, height: imageDimensions.height })}</span>
          {region && (
            <span>
              {t('region')}: {Math.round(region.x)}, {Math.round(region.y)}
            </span>
          )}
          {hasAnnotations && (
            <Badge variant="secondary">
              {t('annotationCount', { count: annotationCount })}
            </Badge>
          )}
        </div>
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

      {/* Magnifier */}
      {showMagnifier && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            // Clamp magnifier position within viewport
            left: Math.min(
              Math.max(20, cursorPosition.x + 20),
              window.innerWidth - 140
            ),
            top: Math.min(
              Math.max(20, cursorPosition.y + 20),
              window.innerHeight - 160
            ),
          }}
        >
          <Magnifier
            imageData={canvasImageData}
            cursorX={cursorPosition.x}
            cursorY={cursorPosition.y}
            zoom={4}
            size={120}
            visible={showMagnifier}
          />
        </div>
      )}

      {/* Magnifier hint */}
      {showMagnifier && (
        <div className="absolute top-4 right-4 bg-background/90 backdrop-blur rounded-lg px-3 py-1 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t('magnifierActive')}</span>
            <Kbd>G</Kbd>
            <span>{t('toToggle')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
