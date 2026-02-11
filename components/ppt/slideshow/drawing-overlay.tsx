'use client';

import { useState, useCallback, useRef, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const DRAW_COLORS = ['#EF4444', '#FBBF24', '#34D399', '#60A5FA', '#FFFFFF'] as const;
const DRAW_WIDTHS = [2, 4, 6] as const;

interface DrawingStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export type PointerMode = 'none' | 'laser' | 'draw';

export interface DrawingOverlayProps {
  pointerMode: PointerMode;
}

/**
 * DrawingOverlay — laser pointer + freehand drawing for slideshow mode.
 *
 * Renders a transparent overlay that intercepts pointer events when
 * `pointerMode` is `'laser'` or `'draw'`. The parent still owns the
 * `pointerMode` state so keyboard shortcuts can toggle it.
 */
export function DrawingOverlay({ pointerMode }: DrawingOverlayProps) {
  const t = useTranslations('pptSlideshow');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [drawColor, setDrawColor] = useState('#EF4444');
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawingStrokes, setDrawingStrokes] = useState<DrawingStroke[]>([]);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Reset drawing state when pointer mode changes
  useEffect(() => {
    if (pointerMode !== 'draw') {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    }
  }, [pointerMode]);

  // Redraw canvas when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of drawingStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [drawingStrokes]);

  // Pointer handlers
  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode === 'laser') {
      const rect = e.currentTarget.getBoundingClientRect();
      setLaserPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (pointerMode === 'draw' && isDrawingRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStrokeRef.current = [...currentStrokeRef.current, pt];
      setDrawingStrokes(prev => [
        ...prev.slice(0, -1),
        { points: [...currentStrokeRef.current], color: drawColor, width: drawWidth },
      ]);
    }
  }, [pointerMode, drawColor, drawWidth]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerMode === 'draw') {
      e.preventDefault();
      isDrawingRef.current = true;
      const rect = e.currentTarget.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      currentStrokeRef.current = [pt];
      setDrawingStrokes(prev => [...prev, { points: [pt], color: drawColor, width: drawWidth }]);
    }
  }, [pointerMode, drawColor, drawWidth]);

  const handlePointerUp = useCallback(() => {
    if (pointerMode === 'draw') {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    }
  }, [pointerMode]);

  const handlePointerLeave = useCallback(() => {
    if (pointerMode === 'laser') setLaserPos(null);
    if (pointerMode === 'draw') {
      isDrawingRef.current = false;
      currentStrokeRef.current = [];
    }
  }, [pointerMode]);

  if (pointerMode === 'none' && drawingStrokes.length === 0) return null;

  return (
    <>
      {/* Invisible interaction layer */}
      <div
        className={cn(
          'absolute inset-0 z-30',
          pointerMode === 'laser' && 'cursor-none',
          pointerMode === 'draw' && 'cursor-crosshair',
        )}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />

      {/* Drawing canvas */}
      {(pointerMode === 'draw' || drawingStrokes.length > 0) && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
        />
      )}

      {/* Laser pointer dot */}
      {pointerMode === 'laser' && laserPos && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: laserPos.x - 8,
            top: laserPos.y - 8,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #EF4444 0%, #EF444480 50%, transparent 70%)',
            boxShadow: '0 0 12px 4px #EF444460',
          }}
        />
      )}

      {/* Pointer mode indicator */}
      {pointerMode !== 'none' && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs">
          <div className={cn('w-2 h-2 rounded-full', pointerMode === 'laser' ? 'bg-red-500' : 'bg-yellow-400')} />
          {pointerMode === 'laser' ? t('laserPointer') || 'Laser (L)' : t('drawMode') || 'Draw (D)'}
          {pointerMode === 'draw' && (
            <>
              {/* Brush color picker */}
              <div className="flex items-center gap-1 ml-2">
                {DRAW_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'w-3.5 h-3.5 rounded-full border transition-transform',
                      drawColor === color ? 'border-white scale-125' : 'border-white/40 hover:scale-110'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={(e) => { e.stopPropagation(); setDrawColor(color); }}
                  />
                ))}
              </div>
              {/* Brush width picker */}
              <div className="flex items-center gap-1 ml-1">
                {DRAW_WIDTHS.map((w) => (
                  <button
                    key={w}
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded transition-colors',
                      drawWidth === w ? 'bg-white/30' : 'hover:bg-white/15'
                    )}
                    onClick={(e) => { e.stopPropagation(); setDrawWidth(w); }}
                  >
                    <div className="rounded-full bg-white" style={{ width: w + 1, height: w + 1 }} />
                  </button>
                ))}
              </div>
              {drawingStrokes.length > 0 && (
                <button
                  className="ml-1 text-white/70 hover:text-white underline"
                  onClick={(e) => { e.stopPropagation(); setDrawingStrokes([]); }}
                >
                  {t('clear') || 'Clear (C)'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
