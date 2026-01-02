'use client';

/**
 * DrawingTools - Annotation and shape drawing component
 * Features:
 * - Freehand drawing with brush
 * - Shape tools (rectangle, circle, arrow, line)
 * - Color and stroke width controls
 * - Undo/redo support
 * - Multiple drawing layers
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Pencil,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Highlighter,
} from 'lucide-react';

export type ShapeType = 'freehand' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'highlighter';

export interface DrawingShape {
  id: string;
  type: ShapeType;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  opacity: number;
  fill?: boolean;
  fillColor?: string;
}

export interface DrawingToolsProps {
  imageUrl: string;
  initialShapes?: DrawingShape[];
  onApply?: (result: { dataUrl: string; shapes: DrawingShape[] }) => void;
  onCancel?: () => void;
  className?: string;
}

const PRESET_COLORS = [
  '#ff0000', '#ff6600', '#ffff00', '#00ff00', '#00ffff',
  '#0000ff', '#9900ff', '#ff00ff', '#ffffff', '#000000',
];

const SHAPE_TOOLS: Array<{ type: ShapeType; icon: React.ReactNode; label: string }> = [
  { type: 'freehand', icon: <Pencil className="h-4 w-4" />, label: 'Freehand' },
  { type: 'highlighter', icon: <Highlighter className="h-4 w-4" />, label: 'Highlighter' },
  { type: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
  { type: 'arrow', icon: <ArrowUpRight className="h-4 w-4" />, label: 'Arrow' },
  { type: 'rectangle', icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
  { type: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
];

export function DrawingTools({
  imageUrl,
  initialShapes = [],
  onApply,
  onCancel,
  className,
}: DrawingToolsProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [shapes, setShapes] = useState<DrawingShape[]>(initialShapes);
  const [redoStack, setRedoStack] = useState<DrawingShape[]>([]);
  const [currentTool, setCurrentTool] = useState<ShapeType>('freehand');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity, setOpacity] = useState(100);
  const [fill, setFill] = useState(false);
  const [fillColor, setFillColor] = useState('#ff0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate display size
  useEffect(() => {
    const updateDisplaySize = () => {
      const container = containerRef.current;
      if (!container || !imageLoaded) return;

      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 40;
      const maxHeight = containerRect.height - 40;

      const imageAspect = imageSize.width / imageSize.height;
      let displayWidth = maxWidth;
      let displayHeight = maxWidth / imageAspect;

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = maxHeight * imageAspect;
      }

      setDisplaySize({ width: displayWidth, height: displayHeight });

      // Update canvas sizes
      [imageCanvasRef, drawingCanvasRef, cursorCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = displayWidth;
          ref.current.height = displayHeight;
        }
      });
    };

    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [imageLoaded, imageSize]);

  // Draw image
  useEffect(() => {
    const canvas = imageCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, displaySize.width, displaySize.height);
  }, [imageLoaded, displaySize]);

  // Draw single shape (defined before drawShapes to avoid hoisting issues)
  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, shape: DrawingShape) => {
      ctx.save();
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = shape.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = shape.opacity / 100;

      if (shape.type === 'highlighter') {
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = shape.strokeWidth * 3;
      }

      if (shape.type === 'freehand' || shape.type === 'highlighter') {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          const midPoint = {
            x: (shape.points[i - 1].x + shape.points[i].x) / 2,
            y: (shape.points[i - 1].y + shape.points[i].y) / 2,
          };
          ctx.quadraticCurveTo(shape.points[i - 1].x, shape.points[i - 1].y, midPoint.x, midPoint.y);
        }
        ctx.stroke();
      } else if (shape.type === 'line') {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        ctx.lineTo(shape.points[1].x, shape.points[1].y);
        ctx.stroke();
      } else if (shape.type === 'arrow') {
        if (shape.points.length < 2) return;
        const start = shape.points[0];
        const end = shape.points[1];
        const headLength = Math.max(shape.strokeWidth * 3, 15);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLength * Math.cos(angle - Math.PI / 6),
          end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
          end.x - headLength * Math.cos(angle + Math.PI / 6),
          end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      } else if (shape.type === 'rectangle') {
        if (shape.points.length < 2) return;
        const x = Math.min(shape.points[0].x, shape.points[1].x);
        const y = Math.min(shape.points[0].y, shape.points[1].y);
        const w = Math.abs(shape.points[1].x - shape.points[0].x);
        const h = Math.abs(shape.points[1].y - shape.points[0].y);

        if (shape.fill && shape.fillColor) {
          ctx.fillStyle = shape.fillColor;
          ctx.fillRect(x, y, w, h);
        }
        ctx.strokeRect(x, y, w, h);
      } else if (shape.type === 'circle') {
        if (shape.points.length < 2) return;
        const centerX = (shape.points[0].x + shape.points[1].x) / 2;
        const centerY = (shape.points[0].y + shape.points[1].y) / 2;
        const radiusX = Math.abs(shape.points[1].x - shape.points[0].x) / 2;
        const radiusY = Math.abs(shape.points[1].y - shape.points[0].y) / 2;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        if (shape.fill && shape.fillColor) {
          ctx.fillStyle = shape.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  // Draw all shapes
  const drawShapes = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach((shape) => {
      drawShape(ctx, shape);
    });
  }, [shapes, drawShape]);

  // Redraw when shapes change
  useEffect(() => {
    drawShapes();
  }, [drawShapes]);

  // Get canvas coordinates
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = drawingCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // Draw cursor
  const drawCursor = useCallback(
    (point: { x: number; y: number }) => {
      const canvas = cursorCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentTool === 'freehand' || currentTool === 'highlighter') {
        ctx.beginPath();
        ctx.arc(point.x, point.y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw current shape preview
      if (isDrawing && startPoint) {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.setLineDash([5, 5]);
        ctx.globalAlpha = 0.5;

        if (currentTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        } else if (currentTool === 'arrow') {
          const headLength = Math.max(strokeWidth * 3, 15);
          const angle = Math.atan2(point.y - startPoint.y, point.x - startPoint.x);
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(
            point.x - headLength * Math.cos(angle - Math.PI / 6),
            point.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(
            point.x - headLength * Math.cos(angle + Math.PI / 6),
            point.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        } else if (currentTool === 'rectangle') {
          const x = Math.min(startPoint.x, point.x);
          const y = Math.min(startPoint.y, point.y);
          const w = Math.abs(point.x - startPoint.x);
          const h = Math.abs(point.y - startPoint.y);
          ctx.strokeRect(x, y, w, h);
        } else if (currentTool === 'circle') {
          const centerX = (startPoint.x + point.x) / 2;
          const centerY = (startPoint.y + point.y) / 2;
          const radiusX = Math.abs(point.x - startPoint.x) / 2;
          const radiusY = Math.abs(point.y - startPoint.y) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }
    },
    [currentTool, strokeColor, strokeWidth, isDrawing, startPoint]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasCoords(e);
      setIsDrawing(true);
      setStartPoint(point);

      if (currentTool === 'freehand' || currentTool === 'highlighter') {
        setCurrentPoints([point]);
      }
    },
    [currentTool, getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasCoords(e);
      drawCursor(point);

      if (!isDrawing) return;

      if (currentTool === 'freehand' || currentTool === 'highlighter') {
        setCurrentPoints((prev) => [...prev, point]);

        // Draw in real-time
        const canvas = drawingCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = currentTool === 'highlighter' ? 0.3 : opacity / 100;

        if (currentPoints.length > 0) {
          const lastPoint = currentPoints[currentPoints.length - 1];
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }

        ctx.restore();
      }
    },
    [isDrawing, currentTool, strokeColor, strokeWidth, opacity, getCanvasCoords, drawCursor, currentPoints]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    let points: Array<{ x: number; y: number }> = [];

    if (currentTool === 'freehand' || currentTool === 'highlighter') {
      points = [...currentPoints];
    } else if (startPoint) {
      const canvas = cursorCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      // Get end point from cursor canvas
      points = [startPoint, currentPoints[currentPoints.length - 1] || startPoint];
    }

    if (points.length >= 2 || (currentTool !== 'freehand' && currentTool !== 'highlighter' && points.length >= 2)) {
      const newShape: DrawingShape = {
        id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: currentTool,
        points,
        color: strokeColor,
        strokeWidth,
        opacity: currentTool === 'highlighter' ? 30 : opacity,
        fill,
        fillColor: fill ? fillColor : undefined,
      };

      setShapes((prev) => [...prev, newShape]);
      setRedoStack([]);
    }

    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPoint(null);
    drawShapes();
  }, [isDrawing, currentTool, currentPoints, startPoint, strokeColor, strokeWidth, opacity, fill, fillColor, drawShapes]);

  const handleMouseLeave = useCallback(() => {
    const canvas = cursorCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (shapes.length === 0) return;
    const lastShape = shapes[shapes.length - 1];
    setShapes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastShape]);
  }, [shapes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const shapeToRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setShapes((prev) => [...prev, shapeToRedo]);
  }, [redoStack]);

  // Clear all
  const handleClear = useCallback(() => {
    setShapes([]);
    setRedoStack([]);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setShapes(initialShapes);
    setRedoStack([]);
  }, [initialShapes]);

  // Export result
  const handleApply = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    // Create full-resolution canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageSize.width;
    outputCanvas.height = imageSize.height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Scale shapes to full resolution
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;

    shapes.forEach((shape) => {
      const scaledShape: DrawingShape = {
        ...shape,
        points: shape.points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })),
        strokeWidth: shape.strokeWidth * scaleX,
      };
      drawShape(ctx, scaledShape);
    });

    const dataUrl = outputCanvas.toDataURL('image/png');
    onApply?.({ dataUrl, shapes });
  }, [imageSize, displaySize, shapes, drawShape, onApply]);

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Canvas area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            <h3 className="font-medium">Drawing Tools</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {shapes.length} shape{shapes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Shape tools */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            {SHAPE_TOOLS.map((tool) => (
              <Tooltip key={tool.type}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentTool === tool.type ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentTool(tool.type)}
                  >
                    {tool.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleUndo}
                  disabled={shapes.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </div>

          <div className="w-px h-6 bg-border" />

          {/* Clear */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
                disabled={shapes.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear All</TooltipContent>
          </Tooltip>
        </div>

        {/* Canvas container */}
        <div
          ref={containerRef}
          className="relative flex-1 border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center"
        >
          <div className="relative">
            <canvas ref={imageCanvasRef} className="absolute inset-0" />
            <canvas
              ref={drawingCanvasRef}
              className="absolute inset-0"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{ cursor: 'crosshair' }}
            />
            <canvas ref={cursorCanvasRef} className="absolute inset-0 pointer-events-none" />
          </div>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading image...</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Controls panel */}
      <div className="w-64 flex flex-col border rounded-lg">
        <div className="p-3 border-b">
          <h3 className="font-medium text-sm">Settings</h3>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Stroke color */}
            <div className="space-y-2">
              <Label className="text-xs">Stroke Color</Label>
              <div className="flex items-center gap-1 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-6 h-6 rounded border-2 transition-all',
                      strokeColor === color ? 'border-primary scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setStrokeColor(color)}
                  />
                ))}
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Stroke width */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Stroke Width</Label>
                <span className="text-xs text-muted-foreground">{strokeWidth}px</span>
              </div>
              <Slider
                value={[strokeWidth]}
                onValueChange={([v]) => setStrokeWidth(v)}
                min={1}
                max={50}
                step={1}
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Opacity</Label>
                <span className="text-xs text-muted-foreground">{opacity}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                min={10}
                max={100}
                step={5}
              />
            </div>

            {/* Fill (for shapes) */}
            {(currentTool === 'rectangle' || currentTool === 'circle') && (
              <>
                <div className="w-full h-px bg-border" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Fill Shape</Label>
                    <Button
                      variant={fill ? 'secondary' : 'outline'}
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setFill(!fill)}
                    >
                      {fill ? 'On' : 'Off'}
                    </Button>
                  </div>
                  {fill && (
                    <div className="space-y-2">
                      <Label className="text-xs">Fill Color</Label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            className={cn(
                              'w-5 h-5 rounded border-2 transition-all',
                              fillColor === color ? 'border-primary' : 'border-transparent'
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => setFillColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="w-full h-px bg-border" />

            {/* Tips */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Freehand:</strong> Draw freely with the brush</p>
              <p><strong>Highlighter:</strong> Semi-transparent highlighting</p>
              <p><strong>Shapes:</strong> Click and drag to draw</p>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default DrawingTools;
