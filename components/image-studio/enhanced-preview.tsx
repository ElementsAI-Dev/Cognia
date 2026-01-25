'use client';

/**
 * EnhancedPreview - Advanced image preview with split view and comparison modes
 *
 * Features:
 * - Split view (horizontal/vertical)
 * - Side-by-side comparison
 * - Before/after toggle
 * - Zoom and pan synchronized across views
 * - Histogram overlay
 * - Keyboard shortcuts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ComparisonMode = 'split-horizontal' | 'split-vertical' | 'side-by-side' | 'toggle';

export interface EnhancedPreviewProps {
  originalImage: ImageData | null;
  editedImage: ImageData | null;
  zoom?: number;
  panX?: number;
  panY?: number;
  comparisonMode?: ComparisonMode;
  showHistogram?: boolean;
  histogram?: {
    red: number[];
    green: number[];
    blue: number[];
    luminance: number[];
  } | null;
  onZoomChange?: (zoom: number) => void;
  onPanChange?: (x: number, y: number) => void;
  className?: string;
}

interface CanvasSize {
  width: number;
  height: number;
}

export function EnhancedPreview({
  originalImage,
  editedImage,
  zoom = 1,
  panX = 0,
  panY = 0,
  comparisonMode = 'split-horizontal',
  showHistogram = false,
  histogram,
  onZoomChange,
  onPanChange,
  className,
}: EnhancedPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const editedCanvasRef = useRef<HTMLCanvasElement>(null);

  const [splitPosition, setSplitPosition] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [containerSize, setContainerSize] = useState<CanvasSize>({ width: 0, height: 0 });

  // Calculate canvas size based on image and container
  const canvasSize = useMemo((): CanvasSize => {
    const image = editedImage || originalImage;
    if (!image || containerSize.width === 0) {
      return { width: 0, height: 0 };
    }

    const imageAspect = image.width / image.height;
    const containerAspect = containerSize.width / containerSize.height;

    let width: number;
    let height: number;

    if (imageAspect > containerAspect) {
      width = containerSize.width;
      height = containerSize.width / imageAspect;
    } else {
      height = containerSize.height;
      width = containerSize.height * imageAspect;
    }

    return { width: width * zoom, height: height * zoom };
  }, [originalImage, editedImage, containerSize, zoom]);

  // Observe container size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw image to canvas
  const drawImageToCanvas = useCallback(
    (canvas: HTMLCanvasElement | null, imageData: ImageData | null) => {
      if (!canvas || !imageData) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;

      // Create temporary canvas for the image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.putImageData(imageData, 0, 0);

      // Clear and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(panX, panY);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    },
    [canvasSize, panX, panY]
  );

  // Draw images when they change
  useEffect(() => {
    drawImageToCanvas(originalCanvasRef.current, originalImage);
    drawImageToCanvas(editedCanvasRef.current, editedImage);
  }, [originalImage, editedImage, drawImageToCanvas]);

  // Handle split drag
  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
  }, []);

  // Handle split drag move
  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const isHorizontal = comparisonMode === 'split-horizontal';

      const position = isHorizontal
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;

      setSplitPosition(Math.max(0, Math.min(100, position)));
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit, comparisonMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          setShowOriginal(true);
          break;
        case '+':
        case '=':
          e.preventDefault();
          onZoomChange?.(Math.min(10, zoom * 1.2));
          break;
        case '-':
          e.preventDefault();
          onZoomChange?.(Math.max(0.1, zoom / 1.2));
          break;
        case '0':
          e.preventDefault();
          onZoomChange?.(1);
          onPanChange?.(0, 0);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setShowOriginal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [zoom, onZoomChange, onPanChange]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        onZoomChange?.(Math.max(0.1, Math.min(10, zoom * delta)));
      }
    },
    [zoom, onZoomChange]
  );

  // Render histogram overlay
  const renderHistogram = () => {
    if (!showHistogram || !histogram) return null;

    const maxValue = Math.max(
      ...histogram.red,
      ...histogram.green,
      ...histogram.blue
    );

    return (
      <div className="absolute bottom-4 right-4 w-64 h-24 bg-black/70 rounded-lg p-2 backdrop-blur-sm">
        <svg viewBox="0 0 256 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Red channel */}
          <path
            d={`M0,100 ${histogram.red
              .map((v, i) => `L${i},${100 - (v / maxValue) * 100}`)
              .join(' ')} L255,100 Z`}
            fill="rgba(255,0,0,0.3)"
            stroke="rgba(255,0,0,0.5)"
            strokeWidth="0.5"
          />
          {/* Green channel */}
          <path
            d={`M0,100 ${histogram.green
              .map((v, i) => `L${i},${100 - (v / maxValue) * 100}`)
              .join(' ')} L255,100 Z`}
            fill="rgba(0,255,0,0.3)"
            stroke="rgba(0,255,0,0.5)"
            strokeWidth="0.5"
          />
          {/* Blue channel */}
          <path
            d={`M0,100 ${histogram.blue
              .map((v, i) => `L${i},${100 - (v / maxValue) * 100}`)
              .join(' ')} L255,100 Z`}
            fill="rgba(0,0,255,0.3)"
            stroke="rgba(0,0,255,0.5)"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    );
  };

  // Render based on comparison mode
  const renderContent = () => {
    if (!originalImage && !editedImage) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          No image loaded
        </div>
      );
    }

    switch (comparisonMode) {
      case 'split-horizontal':
        return (
          <div className="relative w-full h-full overflow-hidden">
            {/* Edited image (full) */}
            <canvas
              ref={editedCanvasRef}
              className="absolute inset-0 m-auto"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            />
            {/* Original image (clipped) */}
            <div
              className="absolute inset-0 m-auto overflow-hidden"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
              }}
            >
              <canvas
                ref={originalCanvasRef}
                style={{ width: canvasSize.width, height: canvasSize.height }}
              />
            </div>
            {/* Split handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-lg"
              style={{ left: `${splitPosition}%`, transform: 'translateX(-50%)' }}
              onMouseDown={handleSplitMouseDown}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-xs">⟷</span>
              </div>
            </div>
          </div>
        );

      case 'split-vertical':
        return (
          <div className="relative w-full h-full overflow-hidden">
            <canvas
              ref={editedCanvasRef}
              className="absolute inset-0 m-auto"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            />
            <div
              className="absolute inset-0 m-auto overflow-hidden"
              style={{
                width: canvasSize.width,
                height: canvasSize.height,
                clipPath: `inset(0 0 ${100 - splitPosition}% 0)`,
              }}
            >
              <canvas
                ref={originalCanvasRef}
                style={{ width: canvasSize.width, height: canvasSize.height }}
              />
            </div>
            <div
              className="absolute left-0 right-0 h-1 bg-white cursor-ns-resize shadow-lg"
              style={{ top: `${splitPosition}%`, transform: 'translateY(-50%)' }}
              onMouseDown={handleSplitMouseDown}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                <span className="text-xs">⟷</span>
              </div>
            </div>
          </div>
        );

      case 'side-by-side':
        return (
          <div className="flex w-full h-full gap-2">
            <div className="flex-1 relative overflow-hidden border rounded">
              <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                Original
              </div>
              <canvas
                ref={originalCanvasRef}
                className="absolute inset-0 m-auto"
                style={{
                  width: canvasSize.width / 2,
                  height: canvasSize.height,
                  maxWidth: '100%',
                }}
              />
            </div>
            <div className="flex-1 relative overflow-hidden border rounded">
              <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                Edited
              </div>
              <canvas
                ref={editedCanvasRef}
                className="absolute inset-0 m-auto"
                style={{
                  width: canvasSize.width / 2,
                  height: canvasSize.height,
                  maxWidth: '100%',
                }}
              />
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className="relative w-full h-full overflow-hidden">
            <canvas
              ref={showOriginal ? originalCanvasRef : editedCanvasRef}
              className="absolute inset-0 m-auto"
              style={{ width: canvasSize.width, height: canvasSize.height }}
            />
            <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
              {showOriginal ? 'Original (hold Space)' : 'Edited'}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full bg-muted/50 overflow-hidden select-none',
        className
      )}
      onWheel={handleWheel}
    >
      {renderContent()}
      {renderHistogram()}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 text-xs bg-black/50 text-white px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export default EnhancedPreview;
