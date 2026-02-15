'use client';

/**
 * Annotation Canvas Component
 *
 * Canvas for rendering and drawing annotations on screenshots.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { TextInput } from './text-input';
import { ResizeHandles } from './resize-handles';
import {
  drawAnnotation,
  getAnnotationBounds,
  getAnnotationPosition,
  moveAnnotation,
} from '@/lib/screenshot/draw-utils';
import type {
  Annotation,
  AnnotationTool,
  AnnotationStyle,
  Point,
  ResizeHandle,
} from '@/types/screenshot';

// ============== Component ==============

interface AnnotationCanvasProps {
  imageData: string;
  width: number;
  height: number;
  annotations: Annotation[];
  currentTool: AnnotationTool;
  style: AnnotationStyle;
  selectedAnnotationId: string | null;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (id: string, updates: Partial<Annotation>) => void;
  onAnnotationSelect: (id: string | null) => void;
  onGetNextMarkerNumber: () => number;
  onCanvasReady?: (exportFn: () => string | null) => void;
  onCursorMove?: (x: number, y: number, imageData: ImageData | null) => void;
  className?: string;
}

export function AnnotationCanvas({
  imageData,
  width,
  height,
  annotations,
  currentTool,
  style,
  selectedAnnotationId,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationSelect,
  onGetNextMarkerNumber,
  onCanvasReady,
  onCursorMove,
  className,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const cachedImageDataRef = useRef<ImageData | null>(null);
  const renderRafRef = useRef<number | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragAnnotationStart, setDragAnnotationStart] = useState<{ x: number; y: number } | null>(null);

  // Text input state
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);

  // Export canvas as base64 data URL (without selection highlight)
  const exportCanvasRef = useRef<() => string | null>(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return null;

    // Create a temporary canvas for export (without selection highlight)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw the image
    ctx.drawImage(img, 0, 0, width, height);

    // Draw all annotations WITHOUT selection highlight
    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, false);
    });

    // Return as base64 (remove data:image/png;base64, prefix)
    const dataUrl = exportCanvas.toDataURL('image/png');
    return dataUrl.replace(/^data:image\/png;base64,/, '');
  });

  // Notify parent when canvas is ready
  useEffect(() => {
    if (onCanvasReady && imageRef.current) {
      onCanvasReady(exportCanvasRef.current);
    }
  }, [onCanvasReady, exportCanvasRef]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const freehandPointsRef = useRef<Array<[number, number]>>([]);
  const [freehandVersion, setFreehandVersion] = useState(0);

  // Core render function (called inside rAF)
  const renderCanvasImmediate = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    annotations.forEach((annotation) => {
      drawAnnotation(ctx, annotation, annotation.id === selectedAnnotationId);
    });

    // Only cache ImageData when magnifier is active (expensive operation)
    if (onCursorMove) {
      cachedImageDataRef.current = ctx.getImageData(0, 0, width, height);
    }
  }, [annotations, width, height, selectedAnnotationId, onCursorMove]);

  // Schedule a render via rAF to coalesce rapid updates
  const scheduleRender = useCallback(() => {
    if (renderRafRef.current !== null) return; // already scheduled
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      renderCanvasImmediate();
    });
  }, [renderCanvasImmediate]);

  // Cleanup rAF on unmount
  useEffect(() => {
    return () => {
      if (renderRafRef.current !== null) {
        cancelAnimationFrame(renderRafRef.current);
      }
    };
  }, []);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvasImmediate();
    };
    img.src = `data:image/png;base64,${imageData}`;
  }, [imageData, renderCanvasImmediate]);

  // Schedule render when annotations or selection change
  useEffect(() => {
    scheduleRender();
  }, [scheduleRender]);

  // Create preview annotation helper
  // freehandVersion is the proxy dep for freehandPointsRef (ref not in deps by design)
  const createPreviewAnnotation = useCallback((): Annotation | null => {
    if (!startPoint || !currentPoint) return null;

    const id = 'preview';
    const timestamp = Date.now();
    const baseStyle = { ...style };

    switch (currentTool) {
      case 'rectangle':
        return {
          id,
          type: 'rectangle',
          style: baseStyle,
          timestamp,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        };
      case 'ellipse':
        return {
          id,
          type: 'ellipse',
          style: baseStyle,
          timestamp,
          cx: (startPoint.x + currentPoint.x) / 2,
          cy: (startPoint.y + currentPoint.y) / 2,
          rx: Math.abs(currentPoint.x - startPoint.x) / 2,
          ry: Math.abs(currentPoint.y - startPoint.y) / 2,
        };
      case 'arrow':
        return {
          id,
          type: 'arrow',
          style: baseStyle,
          timestamp,
          startX: startPoint.x,
          startY: startPoint.y,
          endX: currentPoint.x,
          endY: currentPoint.y,
        };
      case 'freehand':
        if (freehandPointsRef.current.length < 2) return null;
        return {
          id,
          type: 'freehand',
          style: baseStyle,
          timestamp,
          points: [...freehandPointsRef.current],
        };
      case 'blur':
        return {
          id,
          type: 'blur',
          style: baseStyle,
          timestamp,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          intensity: 0.8,
        };
      case 'highlight':
        return {
          id,
          type: 'highlight',
          style: { ...baseStyle, opacity: 0.3 },
          timestamp,
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        };
      default:
        return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPoint, currentPoint, currentTool, style, freehandVersion]);

  // Draw preview on overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!isDrawing || !startPoint) return;

    const previewAnnotation = createPreviewAnnotation();
    if (previewAnnotation) {
      drawAnnotation(ctx, previewAnnotation, false);
    }
  }, [isDrawing, startPoint, currentPoint, freehandVersion, width, height, createPreviewAnnotation]);

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'select') {
      const point = getMousePosition(e);
      
      // Check if clicking on an already selected annotation (start drag)
      if (selectedAnnotationId) {
        const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);
        if (selectedAnnotation) {
          const bounds = getAnnotationBounds(selectedAnnotation);
          if (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
          ) {
            // Start dragging
            setIsDragging(true);
            setDragStart(point);
            setDragAnnotationStart(getAnnotationPosition(selectedAnnotation));
            return;
          }
        }
      }
      
      // Check if clicking on any annotation (select it)
      for (let i = annotations.length - 1; i >= 0; i--) {
        const bounds = getAnnotationBounds(annotations[i]);
        if (
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height
        ) {
          onAnnotationSelect(annotations[i].id);
          return;
        }
      }
      onAnnotationSelect(null);
      return;
    }

    if (currentTool === 'marker') {
      const point = getMousePosition(e);
      const annotation: Annotation = {
        id: `marker-${Date.now()}`,
        type: 'marker',
        style,
        timestamp: Date.now(),
        x: point.x,
        y: point.y,
        number: onGetNextMarkerNumber(),
        size: 24,
      };
      onAnnotationAdd(annotation);
      return;
    }

    if (currentTool === 'text') {
      const point = getMousePosition(e);
      setTextInputPosition(point);
      return;
    }

    const point = getMousePosition(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoint(point);

    if (currentTool === 'freehand') {
      freehandPointsRef.current = [[point.x, point.y]];
      setFreehandVersion(0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePosition(e);

    // Notify parent about cursor position for magnifier (uses cached ImageData)
    if (onCursorMove) {
      onCursorMove(Math.round(point.x), Math.round(point.y), cachedImageDataRef.current);
    }

    // Handle dragging
    if (isDragging && dragStart && dragAnnotationStart && selectedAnnotationId) {
      const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId);
      if (selectedAnnotation) {
        const dx = point.x - dragStart.x;
        const dy = point.y - dragStart.y;
        const updates = moveAnnotation(selectedAnnotation, dx, dy);
        onAnnotationUpdate(selectedAnnotationId, updates);
        setDragStart(point);
      }
      return;
    }

    if (!isDrawing) return;

    setCurrentPoint(point);

    if (currentTool === 'freehand') {
      // Throttle freehand updates - only add point if distance > 2px from last point
      const pts = freehandPointsRef.current;
      if (pts.length === 0) {
        pts.push([point.x, point.y]);
        setFreehandVersion((v) => v + 1);
      } else {
        const lastPt = pts[pts.length - 1];
        const dx = point.x - lastPt[0];
        const dy = point.y - lastPt[1];
        if (dx * dx + dy * dy > 4) {
          pts.push([point.x, point.y]);
          setFreehandVersion((v) => v + 1);
        }
      }
    }
  };

  const handleMouseUp = () => {
    // Stop dragging
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      setDragAnnotationStart(null);
      return;
    }

    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      return;
    }

    const preview = createPreviewAnnotation();
    if (preview) {
      const annotation = {
        ...preview,
        id: `${preview.type}-${Date.now()}`,
      };
      onAnnotationAdd(annotation);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    freehandPointsRef.current = [];
  };

  // Handle text input confirmation
  const handleTextConfirm = useCallback(
    (text: string, fontSize?: number) => {
      if (textInputPosition) {
        const annotation: Annotation = {
          id: `text-${Date.now()}`,
          type: 'text',
          style: fontSize ? { ...style, fontSize } : style,
          timestamp: Date.now(),
          x: textInputPosition.x,
          y: textInputPosition.y,
          text,
        };
        onAnnotationAdd(annotation);
        setTextInputPosition(null);
      }
    },
    [textInputPosition, style, onAnnotationAdd]
  );

  const handleTextCancel = useCallback(() => {
    setTextInputPosition(null);
  }, []);

  // Get selected annotation bounds for resize handles
  const selectedAnnotation = selectedAnnotationId
    ? annotations.find((a) => a.id === selectedAnnotationId)
    : null;
  const selectedBounds = selectedAnnotation ? getAnnotationBounds(selectedAnnotation) : null;

  // Handle resize start
  const handleResizeStart = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectedAnnotationId || !selectedAnnotation) return;

      const startPos = { x: e.clientX, y: e.clientY };
      const initialBounds = getAnnotationBounds(selectedAnnotation);
      const canvas = canvasRef.current;
      if (!canvas || !initialBounds) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startPos.x) * scaleX;
        const dy = (moveEvent.clientY - startPos.y) * scaleY;

        let newX = initialBounds.x;
        let newY = initialBounds.y;
        let newW = initialBounds.width;
        let newH = initialBounds.height;

        // Apply resize based on handle direction
        if (handle.includes('w')) { newX += dx; newW -= dx; }
        if (handle.includes('e')) { newW += dx; }
        if (handle.includes('n')) { newY += dy; newH -= dy; }
        if (handle.includes('s')) { newH += dy; }

        // Enforce minimum size
        if (newW < 4) { newW = 4; if (handle.includes('w')) newX = initialBounds.x + initialBounds.width - 4; }
        if (newH < 4) { newH = 4; if (handle.includes('n')) newY = initialBounds.y + initialBounds.height - 4; }

        // Build updates based on annotation type
        let updates: Partial<Annotation> = {};
        switch (selectedAnnotation.type) {
          case 'rectangle':
          case 'blur':
          case 'highlight':
            updates = { x: newX, y: newY, width: newW, height: newH };
            break;
          case 'ellipse':
            updates = { cx: newX + newW / 2, cy: newY + newH / 2, rx: newW / 2, ry: newH / 2 };
            break;
          case 'arrow': {
            // Map bounding box back to arrow endpoints proportionally
            const origBounds = initialBounds;
            const sxRatio = origBounds.width > 0 ? (selectedAnnotation.startX - origBounds.x) / origBounds.width : 0;
            const syRatio = origBounds.height > 0 ? (selectedAnnotation.startY - origBounds.y) / origBounds.height : 0;
            const exRatio = origBounds.width > 0 ? (selectedAnnotation.endX - origBounds.x) / origBounds.width : 1;
            const eyRatio = origBounds.height > 0 ? (selectedAnnotation.endY - origBounds.y) / origBounds.height : 1;
            updates = {
              startX: newX + sxRatio * newW,
              startY: newY + syRatio * newH,
              endX: newX + exRatio * newW,
              endY: newY + eyRatio * newH,
            };
            break;
          }
          case 'text':
            updates = { x: newX, y: newY + newH };
            break;
          case 'marker':
            updates = { x: newX + newW / 2, y: newY + newH / 2, size: Math.max(newW, newH) };
            break;
          case 'freehand': {
            // Scale all freehand points proportionally
            const origFBounds = initialBounds;
            if (origFBounds.width > 0 && origFBounds.height > 0) {
              const scaledPoints = selectedAnnotation.points.map(([px, py]) => {
                const relX = (px - origFBounds.x) / origFBounds.width;
                const relY = (py - origFBounds.y) / origFBounds.height;
                return [newX + relX * newW, newY + relY * newH] as [number, number];
              });
              updates = { points: scaledPoints };
            }
            break;
          }
        }
        onAnnotationUpdate(selectedAnnotationId, updates);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [selectedAnnotationId, selectedAnnotation, width, height, onAnnotationUpdate]
  );

  return (
    <div className={cn('relative', className)} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0"
      />
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        className="absolute inset-0"
        style={{ cursor: isDragging ? 'grabbing' : currentTool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {/* Resize handles for selected annotation */}
      {selectedBounds && currentTool === 'select' && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: selectedBounds.x,
            top: selectedBounds.y,
            width: selectedBounds.width,
            height: selectedBounds.height,
          }}
        >
          <div className="absolute inset-0 border-2 border-primary border-dashed pointer-events-none" />
          <div className="pointer-events-auto">
            <ResizeHandles onResizeStart={handleResizeStart} />
          </div>
        </div>
      )}
      {/* Inline text input */}
      {textInputPosition && (
        <TextInput
          position={textInputPosition}
          style={{ color: style.color, fontSize: style.fontSize }}
          onConfirm={handleTextConfirm}
          onCancel={handleTextCancel}
        />
      )}
    </div>
  );
}