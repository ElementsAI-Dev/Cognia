'use client';

/**
 * ImageUpscaler - AI-powered image upscaling component
 * Features:
 * - Multiple upscale factors (2x, 4x)
 * - Quality options
 * - Preview comparison
 * - Progress indicator
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ZoomIn,
  Loader2,
  Check,
  X,
  Maximize2,
  Info,
} from 'lucide-react';

import type { UpscaleMethod, UpscaleFactor } from '@/types';

// Re-export types for backward compatibility
export type { UpscaleMethod, UpscaleFactor } from '@/types';

export interface ImageUpscalerProps {
  imageUrl: string;
  onUpscale?: (result: { dataUrl: string; width: number; height: number; factor: number }) => void;
  onCancel?: () => void;
  className?: string;
}

interface UpscalePreset {
  name: string;
  factor: UpscaleFactor;
  method: UpscaleMethod;
  description: string;
}

const UPSCALE_PRESETS: UpscalePreset[] = [
  { name: '2x Quick', factor: 2, method: 'bilinear', description: 'Fast, basic upscaling' },
  { name: '2x Quality', factor: 2, method: 'bicubic', description: 'Better quality, smooth edges' },
  { name: '2x Sharp', factor: 2, method: 'lanczos', description: 'Sharper details, best for photos' },
  { name: '4x Quick', factor: 4, method: 'bilinear', description: 'Fast 4x upscaling' },
  { name: '4x Quality', factor: 4, method: 'bicubic', description: 'Better quality 4x' },
  { name: '4x Sharp', factor: 4, method: 'lanczos', description: 'Sharpest 4x upscaling' },
];

export function ImageUpscaler({
  imageUrl,
  onUpscale,
  onCancel,
  className,
}: ImageUpscalerProps) {
  // Refs
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const upscaledCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [factor, setFactor] = useState<UpscaleFactor>(2);
  const [method, setMethod] = useState<UpscaleMethod>('bicubic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUpscaled, setIsUpscaled] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setOriginalSize({ width: img.width, height: img.height });
      setImageLoaded(true);

      // Draw original
      const canvas = originalCanvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      }
    };
    img.onerror = () => {
      setError('Failed to load image');
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Bilinear interpolation
  const bilinearInterpolate = useCallback(
    (srcData: ImageData, dstData: ImageData, srcW: number, srcH: number, dstW: number, dstH: number) => {
      const src = srcData.data;
      const dst = dstData.data;

      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const srcX = (x / dstW) * srcW;
          const srcY = (y / dstH) * srcH;

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);
          const x1 = Math.min(x0 + 1, srcW - 1);
          const y1 = Math.min(y0 + 1, srcH - 1);

          const xWeight = srcX - x0;
          const yWeight = srcY - y0;

          for (let c = 0; c < 4; c++) {
            const v00 = src[(y0 * srcW + x0) * 4 + c];
            const v10 = src[(y0 * srcW + x1) * 4 + c];
            const v01 = src[(y1 * srcW + x0) * 4 + c];
            const v11 = src[(y1 * srcW + x1) * 4 + c];

            const v0 = v00 * (1 - xWeight) + v10 * xWeight;
            const v1 = v01 * (1 - xWeight) + v11 * xWeight;
            const v = v0 * (1 - yWeight) + v1 * yWeight;

            dst[(y * dstW + x) * 4 + c] = Math.round(v);
          }
        }
      }
    },
    []
  );

  // Bicubic interpolation kernel
  const cubicKernel = useCallback((x: number): number => {
    const a = -0.5;
    const absX = Math.abs(x);
    if (absX <= 1) {
      return (a + 2) * absX ** 3 - (a + 3) * absX ** 2 + 1;
    } else if (absX < 2) {
      return a * absX ** 3 - 5 * a * absX ** 2 + 8 * a * absX - 4 * a;
    }
    return 0;
  }, []);

  // Bicubic interpolation
  const bicubicInterpolate = useCallback(
    (srcData: ImageData, dstData: ImageData, srcW: number, srcH: number, dstW: number, dstH: number) => {
      const src = srcData.data;
      const dst = dstData.data;

      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const srcX = (x / dstW) * srcW;
          const srcY = (y / dstH) * srcH;

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);

          for (let c = 0; c < 4; c++) {
            let sum = 0;
            let weightSum = 0;

            for (let j = -1; j <= 2; j++) {
              for (let i = -1; i <= 2; i++) {
                const px = Math.max(0, Math.min(srcW - 1, x0 + i));
                const py = Math.max(0, Math.min(srcH - 1, y0 + j));

                const weight = cubicKernel(srcX - (x0 + i)) * cubicKernel(srcY - (y0 + j));
                sum += src[(py * srcW + px) * 4 + c] * weight;
                weightSum += weight;
              }
            }

            dst[(y * dstW + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(sum / weightSum)));
          }
        }
      }
    },
    [cubicKernel]
  );

  // Lanczos kernel
  const lanczosKernel = useCallback((x: number, a: number = 3): number => {
    if (x === 0) return 1;
    if (Math.abs(x) >= a) return 0;
    const piX = Math.PI * x;
    return (a * Math.sin(piX) * Math.sin(piX / a)) / (piX * piX);
  }, []);

  // Lanczos interpolation
  const lanczosInterpolate = useCallback(
    (srcData: ImageData, dstData: ImageData, srcW: number, srcH: number, dstW: number, dstH: number) => {
      const src = srcData.data;
      const dst = dstData.data;
      const a = 3;

      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const srcX = (x / dstW) * srcW;
          const srcY = (y / dstH) * srcH;

          const x0 = Math.floor(srcX);
          const y0 = Math.floor(srcY);

          for (let c = 0; c < 4; c++) {
            let sum = 0;
            let weightSum = 0;

            for (let j = -a + 1; j <= a; j++) {
              for (let i = -a + 1; i <= a; i++) {
                const px = Math.max(0, Math.min(srcW - 1, x0 + i));
                const py = Math.max(0, Math.min(srcH - 1, y0 + j));

                const weight = lanczosKernel(srcX - (x0 + i)) * lanczosKernel(srcY - (y0 + j));
                sum += src[(py * srcW + px) * 4 + c] * weight;
                weightSum += weight;
              }
            }

            dst[(y * dstW + x) * 4 + c] = Math.max(0, Math.min(255, Math.round(sum / (weightSum || 1))));
          }
        }
      }
    },
    [lanczosKernel]
  );

  // Perform upscaling
  const handleUpscale = useCallback(async () => {
    const img = imageRef.current;
    const originalCanvas = originalCanvasRef.current;
    const upscaledCanvas = upscaledCanvasRef.current;

    if (!img || !originalCanvas || !upscaledCanvas) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const srcW = originalSize.width;
      const srcH = originalSize.height;
      const dstW = srcW * factor;
      const dstH = srcH * factor;

      // Set up canvases
      upscaledCanvas.width = dstW;
      upscaledCanvas.height = dstH;

      const srcCtx = originalCanvas.getContext('2d');
      const dstCtx = upscaledCanvas.getContext('2d');

      if (!srcCtx || !dstCtx) {
        throw new Error('Failed to get canvas context');
      }

      const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
      const dstData = dstCtx.createImageData(dstW, dstH);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 90));
      }, 100);

      // Use setTimeout to prevent UI blocking
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          switch (method) {
            case 'bilinear':
              bilinearInterpolate(srcData, dstData, srcW, srcH, dstW, dstH);
              break;
            case 'bicubic':
              bicubicInterpolate(srcData, dstData, srcW, srcH, dstW, dstH);
              break;
            case 'lanczos':
              lanczosInterpolate(srcData, dstData, srcW, srcH, dstW, dstH);
              break;
            default:
              bicubicInterpolate(srcData, dstData, srcW, srcH, dstW, dstH);
          }
          resolve();
        }, 0);
      });

      clearInterval(progressInterval);
      setProgress(100);

      dstCtx.putImageData(dstData, 0, 0);
      setIsUpscaled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upscaling failed');
    } finally {
      setIsProcessing(false);
    }
  }, [originalSize, factor, method, bilinearInterpolate, bicubicInterpolate, lanczosInterpolate]);

  // Apply and export
  const handleApply = useCallback(() => {
    const canvas = upscaledCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onUpscale?.({
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      factor,
    });
  }, [factor, onUpscale]);

  // Apply preset
  const applyPreset = useCallback((preset: UpscalePreset) => {
    setFactor(preset.factor);
    setMethod(preset.method);
  }, []);

  const newSize = {
    width: originalSize.width * factor,
    height: originalSize.height * factor,
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ZoomIn className="h-5 w-5" />
          <h3 className="font-medium">Image Upscaler</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {originalSize.width} × {originalSize.height} → {newSize.width} × {newSize.height}
        </div>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Presets */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Preset:</Label>
          <div className="flex gap-1">
            {UPSCALE_PRESETS.map((preset) => (
              <Tooltip key={preset.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant={factor === preset.factor && method === preset.method ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => applyPreset(preset)}
                    disabled={isProcessing}
                  >
                    {preset.name}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{preset.description}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Factor selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Scale:</Label>
          <Select
            value={factor.toString()}
            onValueChange={(v) => setFactor(parseInt(v) as UpscaleFactor)}
            disabled={isProcessing}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2×</SelectItem>
              <SelectItem value="4">4×</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Method selector */}
        <div className="flex items-center gap-2">
          <Label className="text-xs">Method:</Label>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as UpscaleMethod)}
            disabled={isProcessing}
          >
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bilinear">Bilinear</SelectItem>
              <SelectItem value="bicubic">Bicubic</SelectItem>
              <SelectItem value="lanczos">Lanczos</SelectItem>
            </SelectContent>
          </Select>
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
            <span className="text-sm">Upscaling... {progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Preview */}
      <div className="relative flex-1 border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center">
        {showComparison && isUpscaled ? (
          <div
            className="relative w-full h-full"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setComparisonPosition((e.clientX - rect.left) / rect.width * 100);
            }}
          >
            {/* Original (left side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` }}
            >
              <canvas
                ref={originalCanvasRef}
                className="w-full h-full object-contain"
              />
              <span className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                Original
              </span>
            </div>

            {/* Upscaled (right side) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 0 0 ${comparisonPosition}%)` }}
            >
              <canvas
                ref={upscaledCanvasRef}
                className="w-full h-full object-contain"
              />
              <span className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                Upscaled {factor}×
              </span>
            </div>

            {/* Slider line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
              style={{ left: `${comparisonPosition}%` }}
            />
          </div>
        ) : (
          <>
            <canvas
              ref={originalCanvasRef}
              className={cn('max-w-full max-h-full object-contain', isUpscaled && 'hidden')}
            />
            <canvas
              ref={upscaledCanvasRef}
              className={cn('max-w-full max-h-full object-contain', !isUpscaled && 'hidden')}
            />
          </>
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
        <div className="flex items-center gap-2">
          {isUpscaled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              {showComparison ? 'Hide' : 'Compare'}
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                <strong>Bilinear:</strong> Fast, basic quality<br />
                <strong>Bicubic:</strong> Smooth, good for most images<br />
                <strong>Lanczos:</strong> Sharpest, best for photos
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          {!isUpscaled ? (
            <Button onClick={handleUpscale} disabled={isProcessing || !imageLoaded}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <ZoomIn className="h-4 w-4 mr-1" />
              )}
              Upscale
            </Button>
          ) : (
            <Button onClick={handleApply}>
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageUpscaler;
