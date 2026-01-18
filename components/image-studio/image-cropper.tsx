'use client';

/**
 * ImageCropper - Interactive image cropping and transform component
 * Features:
 * - Drag to select crop region
 * - Aspect ratio presets (1:1, 16:9, 9:16, 4:3, free)
 * - Rotate 90° clockwise/counter-clockwise
 * - Flip horizontal/vertical
 * - Preview before applying
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Check,
  X,
  RotateCcwIcon,
  Square,
  Smartphone,
  Monitor,
  RectangleHorizontal,
} from 'lucide-react';

import type { CropRegion, ImageTransform } from '@/types';

// Re-export types for backward compatibility
export type { CropRegion, ImageTransform } from '@/types';

export interface ImageCropperProps {
  imageUrl: string;
  initialCrop?: CropRegion;
  initialTransform?: ImageTransform;
  aspectRatio?: number | null; // width/height, null for free
  minWidth?: number;
  minHeight?: number;
  onCropChange?: (crop: CropRegion) => void;
  onTransformChange?: (transform: ImageTransform) => void;
  onApply?: (result: { crop: CropRegion; transform: ImageTransform; dataUrl: string }) => void;
  onCancel?: () => void;
  className?: string;
}

type AspectRatioPreset = {
  label: string;
  value: number | null;
  icon: React.ReactNode;
};

const ASPECT_PRESETS: AspectRatioPreset[] = [
  { label: 'Free', value: null, icon: <RectangleHorizontal className="h-4 w-4" /> },
  { label: '1:1', value: 1, icon: <Square className="h-4 w-4" /> },
  { label: '16:9', value: 16 / 9, icon: <Monitor className="h-4 w-4" /> },
  { label: '9:16', value: 9 / 16, icon: <Smartphone className="h-4 w-4" /> },
  { label: '4:3', value: 4 / 3, icon: <RectangleHorizontal className="h-4 w-4" /> },
  { label: '3:4', value: 3 / 4, icon: <Smartphone className="h-4 w-4" /> },
];

type ResizeHandle = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

export function ImageCropper({
  imageUrl,
  initialCrop,
  initialTransform,
  aspectRatio: initialAspectRatio = null,
  minWidth = 50,
  minHeight = 50,
  onCropChange,
  onTransformChange,
  onApply,
  onCancel,
  className,
}: ImageCropperProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [crop, setCrop] = useState<CropRegion>(
    initialCrop || { x: 0, y: 0, width: 100, height: 100 }
  );
  const [transform, setTransform] = useState<ImageTransform>(
    initialTransform || { rotation: 0, flipHorizontal: false, flipVertical: false }
  );
  const [aspectRatio, setAspectRatio] = useState<number | null>(initialAspectRatio);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropRegion>({ x: 0, y: 0, width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);

      // Initialize crop to full image if not provided
      if (!initialCrop) {
        setCrop({ x: 0, y: 0, width: img.width, height: img.height });
      }
    };
    img.src = imageUrl;
  }, [imageUrl, initialCrop]);

  // Calculate display size based on container
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
    };

    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [imageLoaded, imageSize]);

  // Draw preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transforms
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(
      transform.flipHorizontal ? -1 : 1,
      transform.flipVertical ? -1 : 1
    );
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw crop overlay
    const scaleX = displaySize.width / imageSize.width;
    const scaleY = displaySize.height / imageSize.height;

    const cropDisplay = {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
    };

    // Dim outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    ctx.clearRect(cropDisplay.x, cropDisplay.y, cropDisplay.width, cropDisplay.height);

    // Redraw image in crop area
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(
      transform.flipHorizontal ? -1 : 1,
      transform.flipVertical ? -1 : 1
    );
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.beginPath();
    ctx.rect(cropDisplay.x, cropDisplay.y, cropDisplay.width, cropDisplay.height);
    ctx.clip();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropDisplay.x, cropDisplay.y, cropDisplay.width, cropDisplay.height);

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const thirdWidth = cropDisplay.width / 3;
    const thirdHeight = cropDisplay.height / 3;

    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(cropDisplay.x + thirdWidth, cropDisplay.y);
    ctx.lineTo(cropDisplay.x + thirdWidth, cropDisplay.y + cropDisplay.height);
    ctx.moveTo(cropDisplay.x + thirdWidth * 2, cropDisplay.y);
    ctx.lineTo(cropDisplay.x + thirdWidth * 2, cropDisplay.y + cropDisplay.height);
    // Horizontal lines
    ctx.moveTo(cropDisplay.x, cropDisplay.y + thirdHeight);
    ctx.lineTo(cropDisplay.x + cropDisplay.width, cropDisplay.y + thirdHeight);
    ctx.moveTo(cropDisplay.x, cropDisplay.y + thirdHeight * 2);
    ctx.lineTo(cropDisplay.x + cropDisplay.width, cropDisplay.y + thirdHeight * 2);
    ctx.stroke();

    // Draw resize handles
    const handleSize = 10;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    const handles: { x: number; y: number; cursor: string }[] = [
      { x: cropDisplay.x, y: cropDisplay.y, cursor: 'nw-resize' },
      { x: cropDisplay.x + cropDisplay.width / 2, y: cropDisplay.y, cursor: 'n-resize' },
      { x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y, cursor: 'ne-resize' },
      { x: cropDisplay.x, y: cropDisplay.y + cropDisplay.height / 2, cursor: 'w-resize' },
      { x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y + cropDisplay.height / 2, cursor: 'e-resize' },
      { x: cropDisplay.x, y: cropDisplay.y + cropDisplay.height, cursor: 'sw-resize' },
      { x: cropDisplay.x + cropDisplay.width / 2, y: cropDisplay.y + cropDisplay.height, cursor: 's-resize' },
      { x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y + cropDisplay.height, cursor: 'se-resize' },
    ];

    handles.forEach((handle) => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
      ctx.strokeRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }, [crop, transform, displaySize, imageSize, imageLoaded]);

  // Notify changes
  useEffect(() => {
    onCropChange?.(crop);
  }, [crop, onCropChange]);

  useEffect(() => {
    onTransformChange?.(transform);
  }, [transform, onTransformChange]);

  // Get canvas coordinates
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // Check which handle is under cursor
  const getHandleUnderCursor = useCallback(
    (x: number, y: number): ResizeHandle | null => {
      const scaleX = displaySize.width / imageSize.width;
      const scaleY = displaySize.height / imageSize.height;
      const cropDisplay = {
        x: crop.x * scaleX,
        y: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY,
      };

      const handleSize = 15;
      const handles: { handle: ResizeHandle; x: number; y: number }[] = [
        { handle: 'nw', x: cropDisplay.x, y: cropDisplay.y },
        { handle: 'n', x: cropDisplay.x + cropDisplay.width / 2, y: cropDisplay.y },
        { handle: 'ne', x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y },
        { handle: 'w', x: cropDisplay.x, y: cropDisplay.y + cropDisplay.height / 2 },
        { handle: 'e', x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y + cropDisplay.height / 2 },
        { handle: 'sw', x: cropDisplay.x, y: cropDisplay.y + cropDisplay.height },
        { handle: 's', x: cropDisplay.x + cropDisplay.width / 2, y: cropDisplay.y + cropDisplay.height },
        { handle: 'se', x: cropDisplay.x + cropDisplay.width, y: cropDisplay.y + cropDisplay.height },
      ];

      for (const h of handles) {
        if (
          x >= h.x - handleSize / 2 &&
          x <= h.x + handleSize / 2 &&
          y >= h.y - handleSize / 2 &&
          y <= h.y + handleSize / 2
        ) {
          return h.handle;
        }
      }

      return null;
    },
    [crop, displaySize, imageSize]
  );

  // Check if cursor is inside crop area
  const isInsideCrop = useCallback(
    (x: number, y: number): boolean => {
      const scaleX = displaySize.width / imageSize.width;
      const scaleY = displaySize.height / imageSize.height;
      const cropDisplay = {
        x: crop.x * scaleX,
        y: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY,
      };

      return (
        x >= cropDisplay.x &&
        x <= cropDisplay.x + cropDisplay.width &&
        y >= cropDisplay.y &&
        y <= cropDisplay.y + cropDisplay.height
      );
    },
    [crop, displaySize, imageSize]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      const handle = getHandleUnderCursor(coords.x, coords.y);

      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart(coords);
        setCropStart({ ...crop });
      } else if (isInsideCrop(coords.x, coords.y)) {
        setIsDragging(true);
        setDragStart(coords);
        setCropStart({ ...crop });
      }
    },
    [crop, getCanvasCoords, getHandleUnderCursor, isInsideCrop]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      const scaleX = imageSize.width / displaySize.width;
      const scaleY = imageSize.height / displaySize.height;

      // Update cursor
      const canvas = canvasRef.current;
      if (canvas) {
        const handle = getHandleUnderCursor(coords.x, coords.y);
        if (handle) {
          const cursors: Record<ResizeHandle, string> = {
            nw: 'nw-resize',
            n: 'n-resize',
            ne: 'ne-resize',
            w: 'w-resize',
            e: 'e-resize',
            sw: 'sw-resize',
            s: 's-resize',
            se: 'se-resize',
          };
          canvas.style.cursor = cursors[handle];
        } else if (isInsideCrop(coords.x, coords.y)) {
          canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'crosshair';
        }
      }

      if (!isDragging && !isResizing) return;

      const dx = (coords.x - dragStart.x) * scaleX;
      const dy = (coords.y - dragStart.y) * scaleY;

      if (isDragging) {
        // Move crop area
        let newX = cropStart.x + dx;
        let newY = cropStart.y + dy;

        // Clamp to image bounds
        newX = Math.max(0, Math.min(newX, imageSize.width - crop.width));
        newY = Math.max(0, Math.min(newY, imageSize.height - crop.height));

        setCrop((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (isResizing && resizeHandle) {
        // Resize crop area
        const newCrop = { ...cropStart };

        switch (resizeHandle) {
          case 'se':
            newCrop.width = Math.max(minWidth, cropStart.width + dx);
            newCrop.height = aspectRatio
              ? newCrop.width / aspectRatio
              : Math.max(minHeight, cropStart.height + dy);
            break;
          case 'sw':
            newCrop.width = Math.max(minWidth, cropStart.width - dx);
            newCrop.x = cropStart.x + cropStart.width - newCrop.width;
            newCrop.height = aspectRatio
              ? newCrop.width / aspectRatio
              : Math.max(minHeight, cropStart.height + dy);
            break;
          case 'ne':
            newCrop.width = Math.max(minWidth, cropStart.width + dx);
            newCrop.height = aspectRatio
              ? newCrop.width / aspectRatio
              : Math.max(minHeight, cropStart.height - dy);
            newCrop.y = cropStart.y + cropStart.height - newCrop.height;
            break;
          case 'nw':
            newCrop.width = Math.max(minWidth, cropStart.width - dx);
            newCrop.height = aspectRatio
              ? newCrop.width / aspectRatio
              : Math.max(minHeight, cropStart.height - dy);
            newCrop.x = cropStart.x + cropStart.width - newCrop.width;
            newCrop.y = cropStart.y + cropStart.height - newCrop.height;
            break;
          case 'e':
            newCrop.width = Math.max(minWidth, cropStart.width + dx);
            if (aspectRatio) newCrop.height = newCrop.width / aspectRatio;
            break;
          case 'w':
            newCrop.width = Math.max(minWidth, cropStart.width - dx);
            newCrop.x = cropStart.x + cropStart.width - newCrop.width;
            if (aspectRatio) newCrop.height = newCrop.width / aspectRatio;
            break;
          case 's':
            newCrop.height = Math.max(minHeight, cropStart.height + dy);
            if (aspectRatio) newCrop.width = newCrop.height * aspectRatio;
            break;
          case 'n':
            newCrop.height = Math.max(minHeight, cropStart.height - dy);
            newCrop.y = cropStart.y + cropStart.height - newCrop.height;
            if (aspectRatio) newCrop.width = newCrop.height * aspectRatio;
            break;
        }

        // Clamp to image bounds
        newCrop.x = Math.max(0, newCrop.x);
        newCrop.y = Math.max(0, newCrop.y);
        newCrop.width = Math.min(newCrop.width, imageSize.width - newCrop.x);
        newCrop.height = Math.min(newCrop.height, imageSize.height - newCrop.y);

        setCrop(newCrop);
      }
    },
    [
      isDragging,
      isResizing,
      resizeHandle,
      dragStart,
      cropStart,
      imageSize,
      displaySize,
      aspectRatio,
      minWidth,
      minHeight,
      crop.width,
      crop.height,
      getCanvasCoords,
      getHandleUnderCursor,
      isInsideCrop,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  // Transform handlers
  const handleRotateClockwise = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  const handleRotateCounterClockwise = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  }, []);

  const handleFlipHorizontal = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      flipHorizontal: !prev.flipHorizontal,
    }));
  }, []);

  const handleFlipVertical = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      flipVertical: !prev.flipVertical,
    }));
  }, []);

  const handleResetTransform = useCallback(() => {
    setTransform({ rotation: 0, flipHorizontal: false, flipVertical: false });
    setCrop({ x: 0, y: 0, width: imageSize.width, height: imageSize.height });
  }, [imageSize]);

  // Apply crop and export
  const handleApply = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = crop.width;
    outputCanvas.height = crop.height;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Apply transforms and crop
    ctx.save();

    // For rotation, we need to handle the source differently
    if (transform.rotation !== 0 || transform.flipHorizontal || transform.flipVertical) {
      // Create temp canvas with transforms
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageSize.width;
      tempCanvas.height = imageSize.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
      tempCtx.rotate((transform.rotation * Math.PI) / 180);
      tempCtx.scale(
        transform.flipHorizontal ? -1 : 1,
        transform.flipVertical ? -1 : 1
      );
      tempCtx.translate(-tempCanvas.width / 2, -tempCanvas.height / 2);
      tempCtx.drawImage(img, 0, 0);

      // Draw cropped area from temp canvas
      ctx.drawImage(
        tempCanvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );
    } else {
      // Simple crop without transforms
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height
      );
    }

    ctx.restore();

    const dataUrl = outputCanvas.toDataURL('image/png');
    onApply?.({ crop, transform, dataUrl });
  }, [crop, transform, imageSize, onApply]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Aspect ratio presets */}
        <div className="flex items-center gap-1">
          <Label className="text-xs mr-2">Aspect:</Label>
          {ASPECT_PRESETS.map((preset) => (
            <Tooltip key={preset.label}>
              <TooltipTrigger asChild>
                <Button
                  variant={aspectRatio === preset.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => {
                    setAspectRatio(preset.value);
                    if (preset.value) {
                      // Adjust crop to match aspect ratio
                      const newHeight = crop.width / preset.value;
                      setCrop((prev) => ({
                        ...prev,
                        height: Math.min(newHeight, imageSize.height - prev.y),
                      }));
                    }
                  }}
                >
                  {preset.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{preset.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="h-6" />

        {/* Transform controls */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateCounterClockwise}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate Left</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRotateClockwise}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate Right</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transform.flipHorizontal ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={handleFlipHorizontal}
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flip Horizontal</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transform.flipVertical ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={handleFlipVertical}
              >
                <FlipVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Flip Vertical</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleResetTransform}
              >
                <RotateCcwIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            <Check className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center border rounded-lg overflow-hidden bg-muted/30 min-h-[400px]"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: displaySize.width,
            height: displaySize.height,
          }}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading image...
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Crop: {Math.round(crop.width)} × {Math.round(crop.height)} px
        </span>
        <span>
          {transform.rotation > 0 && `Rotation: ${transform.rotation}°`}
          {transform.flipHorizontal && ' | Flipped H'}
          {transform.flipVertical && ' | Flipped V'}
        </span>
      </div>
    </div>
  );
}

export default ImageCropper;
