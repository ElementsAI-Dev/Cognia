'use client';

/**
 * Annotation Canvas Component
 *
 * Canvas for rendering and drawing annotations on screenshots.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  Annotation,
  AnnotationTool,
  AnnotationStyle,
  Point,
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
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      // Draw static mosaic pattern
      const blockSize = Math.max(8, annotation.intensity * 15);
      let colorIndex = 0;
      const mosaicColors = ['rgba(100,100,100,0.3)', 'rgba(150,150,150,0.3)', 'rgba(120,120,120,0.3)'];
      for (let by = annotation.y; by < annotation.y + annotation.height; by += blockSize) {
        for (let bx = annotation.x; bx < annotation.x + annotation.width; bx += blockSize) {
          ctx.fillStyle = mosaicColors[colorIndex % mosaicColors.length];
          ctx.fillRect(bx, by, blockSize, blockSize);
          colorIndex++;
        }
      }
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
  onAnnotationSelect: (id: string | null) => void;
  onGetNextMarkerNumber: () => number;
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
  onAnnotationSelect,
  onGetNextMarkerNumber,
  className,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'select') {
      // Check if clicking on an annotation
      const point = getMousePosition(e);
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
      const text = prompt('输入文字:');
      if (text) {
        const annotation: Annotation = {
          id: `text-${Date.now()}`,
          type: 'text',
          style,
          timestamp: Date.now(),
          x: point.x,
          y: point.y,
          text,
        };
        onAnnotationAdd(annotation);
      }
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
    if (!isDrawing) return;

    const point = getMousePosition(e);
    setCurrentPoint(point);

    if (currentTool === 'freehand') {
      setFreehandPoints((prev) => [...prev, [point.x, point.y]]);
    }
  };

  const handleMouseUp = () => {
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
        style={{ cursor: currentTool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}
