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
import type {
  Annotation,
  AnnotationTool,
  AnnotationStyle,
  Point,
  ResizeHandle,
} from '@/types/screenshot';

// ============== Helper Functions ==============

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  strokeWidth: number
) {
  const headLength = strokeWidth * 4;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

function getAnnotationBounds(annotation: Annotation) {
  switch (annotation.type) {
    case 'rectangle':
    case 'blur':
    case 'highlight':
      return {
        x: annotation.x,
        y: annotation.y,
        width: annotation.width,
        height: annotation.height,
      };
    case 'ellipse':
      return {
        x: annotation.cx - annotation.rx,
        y: annotation.cy - annotation.ry,
        width: annotation.rx * 2,
        height: annotation.ry * 2,
      };
    case 'arrow':
      return {
        x: Math.min(annotation.startX, annotation.endX),
        y: Math.min(annotation.startY, annotation.endY),
        width: Math.abs(annotation.endX - annotation.startX),
        height: Math.abs(annotation.endY - annotation.startY),
      };
    case 'freehand':
      if (annotation.points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      const xs = annotation.points.map((p) => p[0]);
      const ys = annotation.points.map((p) => p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    case 'text':
      return {
        x: annotation.x,
        y: annotation.y - (annotation.style.fontSize || 16),
        width: 100,
        height: annotation.style.fontSize || 16,
      };
    case 'marker':
      const size = annotation.size || 24;
      return {
        x: annotation.x - size / 2,
        y: annotation.y - size / 2,
        width: size,
        height: size,
      };
  }
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  isSelected: boolean
) {
  ctx.save();
  ctx.strokeStyle = annotation.style.color;
  ctx.fillStyle = annotation.style.color;
  ctx.lineWidth = annotation.style.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (annotation.type) {
    case 'rectangle':
      if (annotation.style.filled) {
        ctx.globalAlpha = annotation.style.opacity;
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      } else {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      }
      break;

    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(
        annotation.cx,
        annotation.cy,
        annotation.rx,
        annotation.ry,
        0,
        0,
        Math.PI * 2
      );
      if (annotation.style.filled) {
        ctx.globalAlpha = annotation.style.opacity;
        ctx.fill();
      } else {
        ctx.stroke();
      }
      break;

    case 'arrow':
      drawArrow(
        ctx,
        annotation.startX,
        annotation.startY,
        annotation.endX,
        annotation.endY,
        annotation.style.strokeWidth
      );
      break;

    case 'freehand':
      if (annotation.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(annotation.points[0][0], annotation.points[0][1]);
      for (let i = 1; i < annotation.points.length; i++) {
        ctx.lineTo(annotation.points[i][0], annotation.points[i][1]);
      }
      ctx.stroke();
      break;

    case 'text':
      ctx.font = `${annotation.style.fontSize || 16}px sans-serif`;
      if (annotation.background) {
        const metrics = ctx.measureText(annotation.text);
        const padding = 4;
        ctx.fillStyle = annotation.background;
        ctx.fillRect(
          annotation.x - padding,
          annotation.y - (annotation.style.fontSize || 16) - padding,
          metrics.width + padding * 2,
          (annotation.style.fontSize || 16) + padding * 2
        );
      }
      ctx.fillStyle = annotation.style.color;
      ctx.fillText(annotation.text, annotation.x, annotation.y);
      break;

    case 'blur':
      // Real pixelation effect using actual image data
      const blurBlockSize = Math.max(4, Math.round(annotation.intensity * 12));
      const blurX = Math.floor(annotation.x);
      const blurY = Math.floor(annotation.y);
      const blurW = Math.ceil(annotation.width);
      const blurH = Math.ceil(annotation.height);
      
      // Get the image data for the blur region
      const blurImageData = ctx.getImageData(blurX, blurY, blurW, blurH);
      const blurData = blurImageData.data;
      
      // Apply pixelation by averaging colors in blocks
      for (let by = 0; by < blurH; by += blurBlockSize) {
        for (let bx = 0; bx < blurW; bx += blurBlockSize) {
          let totalR = 0, totalG = 0, totalB = 0, count = 0;
          
          // Calculate average color in block
          for (let py = by; py < Math.min(by + blurBlockSize, blurH); py++) {
            for (let px = bx; px < Math.min(bx + blurBlockSize, blurW); px++) {
              const idx = (py * blurW + px) * 4;
              totalR += blurData[idx];
              totalG += blurData[idx + 1];
              totalB += blurData[idx + 2];
              count++;
            }
          }
          
          if (count > 0) {
            const avgR = Math.round(totalR / count);
            const avgG = Math.round(totalG / count);
            const avgB = Math.round(totalB / count);
            
            // Apply average color to all pixels in block
            for (let py = by; py < Math.min(by + blurBlockSize, blurH); py++) {
              for (let px = bx; px < Math.min(bx + blurBlockSize, blurW); px++) {
                const idx = (py * blurW + px) * 4;
                blurData[idx] = avgR;
                blurData[idx + 1] = avgG;
                blurData[idx + 2] = avgB;
              }
            }
          }
        }
      }
      
      // Put the pixelated data back
      ctx.putImageData(blurImageData, blurX, blurY);
      break;

    case 'highlight':
      ctx.globalAlpha = annotation.style.opacity;
      ctx.fillStyle = annotation.style.color;
      ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      break;

    case 'marker':
      const markerSize = annotation.size || 24;
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, markerSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = annotation.style.color;
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${markerSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(annotation.number), annotation.x, annotation.y);
      break;
  }

  if (isSelected) {
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const bounds = getAnnotationBounds(annotation);
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
  }

  ctx.restore();
}

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

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragAnnotationStart, setDragAnnotationStart] = useState<{ x: number; y: number } | null>(null);

  // Text input state
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);

  // Export canvas as base64 data URL (without selection highlight)
  const exportCanvas = useCallback((): string | null => {
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
  }, [width, height, annotations]);

  // Notify parent when canvas is ready
  useEffect(() => {
    if (onCanvasReady && imageRef.current) {
      onCanvasReady(exportCanvas);
    }
  }, [onCanvasReady, exportCanvas]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [freehandPoints, setFreehandPoints] = useState<Array<[number, number]>>([]);

  // Render main canvas
  const renderCanvas = useCallback(() => {
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
  }, [annotations, width, height, selectedAnnotationId]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = `data:image/png;base64,${imageData}`;
  }, [imageData, renderCanvas]);

  // Render when annotations change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Create preview annotation helper
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
        if (freehandPoints.length < 2) return null;
        return {
          id,
          type: 'freehand',
          style: baseStyle,
          timestamp,
          points: freehandPoints,
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
  }, [startPoint, currentPoint, currentTool, style, freehandPoints]);

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
  }, [isDrawing, startPoint, currentPoint, freehandPoints, width, height, createPreviewAnnotation]);

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

  // Get the position of an annotation (for dragging)
  const getAnnotationPosition = (annotation: Annotation): { x: number; y: number } => {
    switch (annotation.type) {
      case 'rectangle':
      case 'blur':
      case 'highlight':
      case 'text':
        return { x: annotation.x, y: annotation.y };
      case 'ellipse':
        return { x: annotation.cx - annotation.rx, y: annotation.cy - annotation.ry };
      case 'arrow':
        return { x: annotation.startX, y: annotation.startY };
      case 'marker':
        return { x: annotation.x, y: annotation.y };
      case 'freehand':
        if (annotation.points.length > 0) {
          return { x: annotation.points[0][0], y: annotation.points[0][1] };
        }
        return { x: 0, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Move an annotation by delta
  const moveAnnotation = (annotation: Annotation, dx: number, dy: number): Partial<Annotation> => {
    switch (annotation.type) {
      case 'rectangle':
      case 'blur':
      case 'highlight':
      case 'text':
        return { x: annotation.x + dx, y: annotation.y + dy };
      case 'ellipse':
        return { cx: annotation.cx + dx, cy: annotation.cy + dy };
      case 'arrow':
        return {
          startX: annotation.startX + dx,
          startY: annotation.startY + dy,
          endX: annotation.endX + dx,
          endY: annotation.endY + dy,
        };
      case 'marker':
        return { x: annotation.x + dx, y: annotation.y + dy };
      case 'freehand':
        return {
          points: annotation.points.map(([px, py]) => [px + dx, py + dy] as [number, number]),
        };
      default:
        return {};
    }
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
      setFreehandPoints([[point.x, point.y]]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePosition(e);

    // Notify parent about cursor position for magnifier
    if (onCursorMove && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, width, height);
        onCursorMove(Math.round(point.x), Math.round(point.y), imgData);
      }
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
      setFreehandPoints((prev) => {
        if (prev.length === 0) return [[point.x, point.y]];
        const lastPoint = prev[prev.length - 1];
        const dx = point.x - lastPoint[0];
        const dy = point.y - lastPoint[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 2) {
          return [...prev, [point.x, point.y]];
        }
        return prev;
      });
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
    setFreehandPoints([]);
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