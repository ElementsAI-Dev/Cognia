'use client';

/**
 * Magnifier Component
 *
 * Displays magnified view of cursor position for precise selection.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MagnifierProps {
  imageData: ImageData | null;
  cursorX: number;
  cursorY: number;
  zoom?: number;
  size?: number;
  visible?: boolean;
  className?: string;
}

export function Magnifier({
  imageData,
  cursorX,
  cursorY,
  zoom = 4,
  size = 120,
  visible = true,
  className,
}: MagnifierProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageData || !visible) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sourceSize = Math.floor(size / zoom);
    const halfSource = Math.floor(sourceSize / 2);

    // Calculate source region
    const sx = Math.max(0, cursorX - halfSource);
    const sy = Math.max(0, cursorY - halfSource);

    // Create temporary canvas for the source region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.putImageData(imageData, 0, 0);

    // Clear and draw magnified region
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    ctx.drawImage(
      tempCanvas,
      sx,
      sy,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size
    );

    // Draw crosshair
    const center = size / 2;
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 1;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.stroke();

    // Center pixel highlight
    const pixelSize = zoom;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(
      center - pixelSize / 2,
      center - pixelSize / 2,
      pixelSize,
      pixelSize
    );
  }, [imageData, cursorX, cursorY, zoom, size, visible]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'pointer-events-none rounded-full overflow-hidden border-2 border-primary shadow-lg',
        'bg-black',
        className
      )}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs text-center py-0.5">
        {cursorX}, {cursorY}
      </div>
    </div>
  );
}
