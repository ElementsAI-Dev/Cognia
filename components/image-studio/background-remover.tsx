'use client';

/**
 * BackgroundRemover - AI-powered background removal component
 * Features:
 * - Automatic edge detection for basic removal
 * - Manual refinement with brush
 * - Background replacement options
 * - Preview with checkerboard pattern
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Eraser,
  Brush,
  Loader2,
  Check,
  X,
  RotateCcw,
  Wand2,
  Eye,
  EyeOff,
  Palette,
} from 'lucide-react';

import type { BackgroundType } from '@/types';

import './background-remover.css';

// Re-export types for backward compatibility
export type { BackgroundType } from '@/types';

export interface BackgroundRemoverProps {
  imageUrl: string;
  onRemove?: (result: { dataUrl: string; maskDataUrl: string }) => void;
  onCancel?: () => void;
  className?: string;
}

const BACKGROUND_COLORS: Array<{ type: BackgroundType; color: string; label: string }> = [
  { type: 'transparent', color: 'transparent', label: 'Transparent' },
  { type: 'white', color: '#ffffff', label: 'White' },
  { type: 'black', color: '#000000', label: 'Black' },
  { type: 'blur', color: 'blur', label: 'Blur' },
];

type Tool = 'auto' | 'keep' | 'remove';

export function BackgroundRemover({
  imageUrl,
  onRemove,
  onCancel,
  className,
}: BackgroundRemoverProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const customColorRef = useRef<HTMLDivElement>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('auto');
  const [brushSize, setBrushSize] = useState(30);
  const [threshold, setThreshold] = useState(30);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('transparent');
  const [customColor, setCustomColor] = useState('#ffffff');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (customColorRef.current) {
      customColorRef.current.style.setProperty('--custom-color', customColor);
    }
  }, [customColor]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);

      // Draw to image canvas
      const imageCanvas = imageCanvasRef.current;
      if (imageCanvas) {
        imageCanvas.width = img.width;
        imageCanvas.height = img.height;
        const ctx = imageCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      }

      // Initialize mask canvas (white = keep, black = remove)
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        maskCanvas.width = img.width;
        maskCanvas.height = img.height;
        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, img.width, img.height);
        }
      }

      // Initialize preview canvas
      const previewCanvas = previewCanvasRef.current;
      if (previewCanvas) {
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;
        const ctx = previewCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      }
    };
    img.onerror = () => {
      setError('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Update preview when mask or background changes
  const updatePreview = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;

    if (!imageCanvas || !maskCanvas || !previewCanvas) return;

    const imgCtx = imageCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d');

    if (!imgCtx || !maskCtx || !previewCtx) return;

    const width = imageCanvas.width;
    const height = imageCanvas.height;

    // Clear preview
    previewCtx.clearRect(0, 0, width, height);

    // Draw background
    if (backgroundType === 'transparent') {
      // Checkerboard pattern
      const size = 10;
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          const isLight = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0;
          previewCtx.fillStyle = isLight ? '#ffffff' : '#cccccc';
          previewCtx.fillRect(x, y, size, size);
        }
      }
    } else if (backgroundType === 'blur') {
      previewCtx.filter = 'blur(10px)';
      previewCtx.drawImage(imageCanvas, 0, 0);
      previewCtx.filter = 'none';
    } else if (backgroundType === 'custom') {
      previewCtx.fillStyle = customColor;
      previewCtx.fillRect(0, 0, width, height);
    } else {
      const colors: Record<string, string> = {
        white: '#ffffff',
        black: '#000000',
      };
      previewCtx.fillStyle = colors[backgroundType] || '#ffffff';
      previewCtx.fillRect(0, 0, width, height);
    }

    // Get image and mask data
    const imgData = imgCtx.getImageData(0, 0, width, height);
    const maskData = maskCtx.getImageData(0, 0, width, height);
    const previewData = previewCtx.getImageData(0, 0, width, height);

    // Apply mask
    for (let i = 0; i < imgData.data.length; i += 4) {
      const maskValue = maskData.data[i]; // Use red channel of mask
      const alpha = maskValue / 255;

      if (alpha > 0) {
        previewData.data[i] = imgData.data[i] * alpha + previewData.data[i] * (1 - alpha);
        previewData.data[i + 1] = imgData.data[i + 1] * alpha + previewData.data[i + 1] * (1 - alpha);
        previewData.data[i + 2] = imgData.data[i + 2] * alpha + previewData.data[i + 2] * (1 - alpha);
        previewData.data[i + 3] = 255;
      }
    }

    previewCtx.putImageData(previewData, 0, 0);
  }, [backgroundType, customColor]);

  // Automatic background removal using edge detection
  const autoRemoveBackground = useCallback(async () => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!imageCanvas || !maskCanvas) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const imgCtx = imageCanvas.getContext('2d');
      const maskCtx = maskCanvas.getContext('2d');

      if (!imgCtx || !maskCtx) throw new Error('Failed to get canvas context');

      const width = imageCanvas.width;
      const height = imageCanvas.height;
      const imgData = imgCtx.getImageData(0, 0, width, height);
      const data = imgData.data;

      // Create mask data
      const maskData = maskCtx.createImageData(width, height);
      const mask = maskData.data;

      // Sample corners to detect background color
      const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
      ];

      let bgR = 0, bgG = 0, bgB = 0;
      corners.forEach(([x, y]) => {
        const idx = (y * width + x) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });
      bgR = Math.round(bgR / 4);
      bgG = Math.round(bgG / 4);
      bgB = Math.round(bgB / 4);

      setProgress(20);

      // Process pixels
      const thresholdValue = threshold * 2.55; // Convert 0-100 to 0-255

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate color distance from background
        const distance = Math.sqrt(
          Math.pow(r - bgR, 2) +
          Math.pow(g - bgG, 2) +
          Math.pow(b - bgB, 2)
        );

        if (distance < thresholdValue) {
          // Background pixel - mark for removal
          mask[i] = 0;
          mask[i + 1] = 0;
          mask[i + 2] = 0;
          mask[i + 3] = 255;
        } else {
          // Foreground pixel - keep
          mask[i] = 255;
          mask[i + 1] = 255;
          mask[i + 2] = 255;
          mask[i + 3] = 255;
        }
      }

      setProgress(60);

      // Simple edge smoothing
      const smoothMask = new Uint8ClampedArray(mask);
      const kernelSize = 2;

      for (let y = kernelSize; y < height - kernelSize; y++) {
        for (let x = kernelSize; x < width - kernelSize; x++) {
          let sum = 0;
          let count = 0;

          for (let ky = -kernelSize; ky <= kernelSize; ky++) {
            for (let kx = -kernelSize; kx <= kernelSize; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              sum += mask[idx];
              count++;
            }
          }

          const idx = (y * width + x) * 4;
          const avg = sum / count;
          smoothMask[idx] = avg;
          smoothMask[idx + 1] = avg;
          smoothMask[idx + 2] = avg;
        }
      }

      setProgress(80);

      // Apply smoothed mask
      for (let i = 0; i < smoothMask.length; i++) {
        maskData.data[i] = smoothMask[i];
      }

      maskCtx.putImageData(maskData, 0, 0);
      setProgress(100);
      setHasProcessed(true);
      updatePreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Background removal failed');
    } finally {
      setIsProcessing(false);
    }
  }, [threshold, updatePreview]);

  // Get canvas coordinates
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = previewCanvasRef.current;
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

  // Draw on mask
  const drawOnMask = useCallback(
    (x: number, y: number) => {
      const maskCanvas = maskCanvasRef.current;
      if (!maskCanvas) return;

      const ctx = maskCanvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = selectedTool === 'keep' ? '#ffffff' : '#000000';
      ctx.fill();

      updatePreview();
    },
    [brushSize, selectedTool, updatePreview]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (selectedTool === 'auto') return;
      setIsDrawing(true);
      const coords = getCanvasCoords(e);
      drawOnMask(coords.x, coords.y);
    },
    [selectedTool, getCanvasCoords, drawOnMask]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || selectedTool === 'auto') return;
      const coords = getCanvasCoords(e);
      drawOnMask(coords.x, coords.y);
    },
    [isDrawing, selectedTool, getCanvasCoords, drawOnMask]
  );

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Reset mask
  const resetMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }

    setHasProcessed(false);
    updatePreview();
  }, [updatePreview]);

  // Export result
  const handleApply = useCallback(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!imageCanvas || !maskCanvas) return;

    // Create output with transparency
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageCanvas.width;
    outputCanvas.height = imageCanvas.height;
    const outputCtx = outputCanvas.getContext('2d');

    if (!outputCtx) return;

    const imgCtx = imageCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!imgCtx || !maskCtx) return;

    const imgData = imgCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outputData = outputCtx.createImageData(imageCanvas.width, imageCanvas.height);

    // Apply mask as alpha channel
    for (let i = 0; i < imgData.data.length; i += 4) {
      outputData.data[i] = imgData.data[i];
      outputData.data[i + 1] = imgData.data[i + 1];
      outputData.data[i + 2] = imgData.data[i + 2];
      outputData.data[i + 3] = maskData.data[i]; // Use mask as alpha
    }

    outputCtx.putImageData(outputData, 0, 0);

    const dataUrl = outputCanvas.toDataURL('image/png');
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    onRemove?.({ dataUrl, maskDataUrl });
  }, [onRemove]);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eraser className="h-5 w-5" />
          <h3 className="font-medium">Background Remover</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {imageSize.width} × {imageSize.height}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Tool selection */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'auto' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedTool('auto')}
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Auto Detect</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'keep' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedTool('keep')}
              >
                <Brush className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Keep (Paint to restore)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === 'remove' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedTool('remove')}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove (Paint to erase)</TooltipContent>
          </Tooltip>
        </div>

        {/* Brush size */}
        {selectedTool !== 'auto' && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Label className="text-xs whitespace-nowrap">Brush</Label>
            <Slider
              value={[brushSize]}
              onValueChange={([v]) => setBrushSize(v)}
              min={5}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
          </div>
        )}

        {/* Threshold (for auto mode) */}
        {selectedTool === 'auto' && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Label className="text-xs whitespace-nowrap">Threshold</Label>
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              min={5}
              max={80}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-6">{threshold}</span>
          </div>
        )}

        {/* Divider */}
        <Separator orientation="vertical" className="h-6" />

        {/* Background options */}
        <div className="flex items-center gap-1">
          <Label className="text-xs mr-1">Background:</Label>
          {BACKGROUND_COLORS.map((bg) => (
            <Tooltip key={bg.type}>
              <TooltipTrigger asChild>
                <Button
                  variant={backgroundType === bg.type ? 'secondary' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setBackgroundType(bg.type);
                    updatePreview();
                  }}
                >
                  {bg.type === 'transparent' ? (
                    <div className="w-4 h-4 rounded-sm bg-[repeating-conic-gradient(#ccc_0%_25%,#fff_0%_50%)] bg-[length:8px_8px]" />
                  ) : bg.type === 'blur' ? (
                    <Palette className="h-4 w-4 opacity-50" />
                  ) : (
                    <div
                      className={cn(
                        'w-4 h-4 rounded-sm border',
                        bg.type === 'white' && 'bg-white',
                        bg.type === 'black' && 'bg-black'
                      )}
                    />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{bg.label}</TooltipContent>
            </Tooltip>
          ))}

          {/* Custom color */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative">
                <Button
                  variant={backgroundType === 'custom' ? 'secondary' : 'outline'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setBackgroundType('custom');
                    updatePreview();
                  }}
                >
                  <div
                    ref={customColorRef}
                    className="w-4 h-4 rounded-sm border custom-color-swatch"
                  />
                </Button>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    setBackgroundType('custom');
                    updatePreview();
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Select custom color"
                  title="Select custom color"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>Custom Color</TooltipContent>
          </Tooltip>
        </div>

        {/* Divider */}
        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowOriginal(!showOriginal)}
              >
                {showOriginal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showOriginal ? 'Show result' : 'Show original'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={resetMask}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing... {progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center"
      >
        {/* Original image canvas (hidden) */}
        <canvas ref={imageCanvasRef} className="hidden" />

        {/* Mask canvas (hidden) */}
        <canvas ref={maskCanvasRef} className="hidden" />

        {/* Preview canvas */}
        <canvas
          ref={previewCanvasRef}
          className={cn(
            'max-w-full max-h-full object-contain',
            selectedTool !== 'auto' && 'cursor-crosshair',
            showOriginal ? 'hidden' : 'block'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Show original image */}
        {showOriginal && imageRef.current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Original"
            className="max-w-full max-h-full object-contain"
          />
        )}

        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Loading image...
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {selectedTool === 'auto' && (
            <Button
              onClick={autoRemoveBackground}
              disabled={isProcessing || !imageLoaded}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              Auto Remove Background
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!hasProcessed}>
            <Check className="h-4 w-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BackgroundRemover;
