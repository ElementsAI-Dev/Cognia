'use client';

/**
 * MaskCanvas - Interactive mask drawing component for image editing
 * Features:
 * - Brush tool for painting mask areas
 * - Eraser tool for removing mask areas
 * - Adjustable brush size and hardness
 * - Undo/redo support
 * - Export mask as PNG with transparency
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
} from 'lucide-react';

export interface MaskCanvasProps {
  imageUrl: string;
  width?: number;
  height?: number;
  initialMask?: string; // base64 PNG
  brushSize?: number;
  brushHardness?: number;
  brushColor?: string;
  onMaskChange?: (maskBase64: string) => void;
  onStrokesChange?: (strokeCount: number) => void;
  className?: string;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  brushSize: number;
  brushHardness: number;
  isEraser: boolean;
}

type Tool = 'brush' | 'eraser' | 'pan';

export function MaskCanvas({
  imageUrl,
  width = 512,
  height = 512,
  initialMask,
  brushSize: initialBrushSize = 40,
  brushHardness: initialBrushHardness = 80,
  brushColor = 'rgba(255, 0, 0, 0.5)',
  onMaskChange,
  onStrokesChange,
  className,
}: MaskCanvasProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(initialBrushSize);
  const [brushHardness, setBrushHardness] = useState(initialBrushHardness);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // Load image
  useEffect(() => {
    const imageCanvas = imageCanvasRef.current;
    if (!imageCanvas || !imageUrl) return;

    const ctx = imageCanvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      let newWidth = width;
      let newHeight = height;

      if (aspectRatio > 1) {
        newHeight = width / aspectRatio;
      } else {
        newWidth = height * aspectRatio;
      }

      setCanvasSize({ width: newWidth, height: newHeight });
      imageCanvas.width = newWidth;
      imageCanvas.height = newHeight;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      setImageLoaded(true);

      // Also resize mask canvas
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = newWidth;
        maskCanvas.height = newHeight;
      }

      // And cursor canvas
      const cursorCanvas = cursorCanvasRef.current;
      if (cursorCanvas) {
        cursorCanvas.width = newWidth;
        cursorCanvas.height = newHeight;
      }

      // Load initial mask if provided
      if (initialMask) {
        const maskImg = new Image();
        maskImg.onload = () => {
          const maskCtx = maskCanvas?.getContext('2d');
          if (maskCtx) {
            maskCtx.drawImage(maskImg, 0, 0, newWidth, newHeight);
          }
        };
        maskImg.src = initialMask;
      }
    };
    img.src = imageUrl;
  }, [imageUrl, width, height, initialMask]);

  // Export mask as base64 PNG
  const exportMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    // Create a new canvas for export with proper transparency
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = maskCanvas.width;
    exportCanvas.height = maskCanvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    // Get mask data
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;

    // Create transparency mask (white where painted, transparent elsewhere)
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        // Make painted areas transparent (for inpainting)
        data[i] = 0; // R
        data[i + 1] = 0; // G
        data[i + 2] = 0; // B
        data[i + 3] = 0; // A (transparent)
      } else {
        // Keep unpainted areas opaque
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }

    exportCtx.putImageData(imageData, 0, 0);
    const base64 = exportCanvas.toDataURL('image/png');
    onMaskChange?.(base64);
  }, [onMaskChange]);

  // Redraw mask from strokes
  const redrawMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.globalCompositeOperation = stroke.isEraser
        ? 'destination-out'
        : 'source-over';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.brushSize;

      // Create gradient for brush hardness
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, stroke.brushSize / 2);
      const alpha = stroke.brushHardness / 100;
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.1})`);

      if (stroke.isEraser) {
        ctx.strokeStyle = 'white';
      } else {
        ctx.strokeStyle = brushColor;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const midPoint = {
          x: (stroke.points[i - 1].x + stroke.points[i].x) / 2,
          y: (stroke.points[i - 1].y + stroke.points[i].y) / 2,
        };
        ctx.quadraticCurveTo(
          stroke.points[i - 1].x,
          stroke.points[i - 1].y,
          midPoint.x,
          midPoint.y
        );
      }

      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Export mask and notify
    exportMask();
  }, [strokes, brushColor, exportMask]);

  // Effect to redraw when strokes change
  useEffect(() => {
    redrawMask();
    onStrokesChange?.(strokes.length);
  }, [strokes, redrawMask, onStrokesChange]);

  // Get canvas coordinates from mouse event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Draw cursor preview
  const drawCursor = useCallback(
    (point: Point) => {
      const cursorCanvas = cursorCanvasRef.current;
      if (!cursorCanvas) return;

      const ctx = cursorCanvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.strokeStyle = currentTool === 'eraser' ? '#ff0000' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner circle for hardness preview
      ctx.beginPath();
      ctx.arc(point.x, point.y, (brushSize / 2) * (brushHardness / 100), 0, Math.PI * 2);
      ctx.strokeStyle = currentTool === 'eraser' ? '#ff6666' : '#cccccc';
      ctx.lineWidth = 1;
      ctx.stroke();
    },
    [brushSize, brushHardness, currentTool]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (currentTool === 'pan') {
        setIsPanning(true);
        setLastPanPoint(getCanvasCoords(e));
        return;
      }

      setIsDrawing(true);
      const point = getCanvasCoords(e);
      setCurrentStroke([point]);
    },
    [currentTool, getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasCoords(e);
      drawCursor(point);

      if (isPanning && lastPanPoint) {
        const dx = point.x - lastPanPoint.x;
        const dy = point.y - lastPanPoint.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        setLastPanPoint(point);
        return;
      }

      if (!isDrawing) return;

      setCurrentStroke((prev) => [...prev, point]);

      // Draw current stroke in real-time
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      ctx.globalCompositeOperation =
        currentTool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = currentTool === 'eraser' ? 'white' : brushColor;

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    },
    [
      isDrawing,
      isPanning,
      lastPanPoint,
      currentStroke,
      currentTool,
      brushSize,
      brushColor,
      getCanvasCoords,
      drawCursor,
    ]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      setLastPanPoint(null);
      return;
    }

    if (!isDrawing || currentStroke.length === 0) {
      setIsDrawing(false);
      return;
    }

    const newStroke: Stroke = {
      id: `stroke-${Date.now()}-${Math.random()}`,
      points: currentStroke,
      brushSize,
      brushHardness,
      isEraser: currentTool === 'eraser',
    };

    setStrokes((prev) => [...prev, newStroke]);
    setRedoStack([]); // Clear redo stack on new stroke
    setCurrentStroke([]);
    setIsDrawing(false);
  }, [isDrawing, isPanning, currentStroke, brushSize, brushHardness, currentTool]);

  const handleMouseLeave = useCallback(() => {
    const cursorCanvas = cursorCanvasRef.current;
    if (cursorCanvas) {
      const ctx = cursorCanvas.getContext('2d');
      ctx?.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    }

    if (isDrawing) {
      handleMouseUp();
    }
  }, [isDrawing, handleMouseUp]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (strokes.length === 0) return;

    const lastStroke = strokes[strokes.length - 1];
    setStrokes((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastStroke]);
  }, [strokes]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const strokeToRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes((prev) => [...prev, strokeToRedo]);
  }, [redoStack]);

  // Clear all
  const handleClear = useCallback(() => {
    setStrokes([]);
    setRedoStack([]);

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    onMaskChange?.('');
  }, [onMaskChange]);

  // Download mask
  const handleDownloadMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const link = document.createElement('a');
    link.download = `mask-${Date.now()}.png`;
    link.href = maskCanvas.toDataURL('image/png');
    link.click();
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.25, 0.25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tool selection */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === 'brush' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentTool('brush')}
              >
                <Brush className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Brush (B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === 'eraser' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentTool('eraser')}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eraser (E)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === 'pan' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentTool('pan')}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pan (Space)</TooltipContent>
          </Tooltip>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <Label className="text-xs whitespace-nowrap">Size</Label>
          <Slider
            value={[brushSize]}
            onValueChange={([v]) => setBrushSize(v)}
            min={1}
            max={200}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8">{brushSize}</span>
        </div>

        {/* Brush hardness */}
        <div className="flex items-center gap-2 min-w-[160px]">
          <Label className="text-xs whitespace-nowrap">Hardness</Label>
          <Slider
            value={[brushHardness]}
            onValueChange={([v]) => setBrushHardness(v)}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8">{brushHardness}%</span>
        </div>

        {/* Divider */}
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
                disabled={strokes.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
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
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleZoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleResetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClear}
                disabled={strokes.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear All</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownloadMask}
                disabled={strokes.length === 0}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download Mask</TooltipContent>
          </Tooltip>
        </div>

        {/* Stroke count */}
        <div className="ml-auto text-xs text-muted-foreground">
          {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]"
        style={{
          width: '100%',
          maxWidth: canvasSize.width * zoom,
          aspectRatio: `${canvasSize.width} / ${canvasSize.height}`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Image layer */}
          <canvas
            ref={imageCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />

          {/* Mask layer */}
          <canvas
            ref={maskCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
              mixBlendMode: 'multiply',
              cursor:
                currentTool === 'pan'
                  ? isPanning
                    ? 'grabbing'
                    : 'grab'
                  : 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />

          {/* Cursor layer */}
          <canvas
            ref={cursorCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </div>

        {/* Loading overlay */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="animate-pulse text-muted-foreground">
              Loading image...
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground">
        Paint over areas you want to edit. Use the eraser to remove mask areas.
        Transparent areas in the mask will be regenerated.
      </p>
    </div>
  );
}

export default MaskCanvas;
