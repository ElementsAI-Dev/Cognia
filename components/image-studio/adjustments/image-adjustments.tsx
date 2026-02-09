'use client';

/**
 * ImageAdjustments - Real-time image adjustment controls
 * Features:
 * - Brightness, Contrast, Saturation adjustments
 * - Hue rotation
 * - Blur and Sharpen
 * - Filter presets
 * - Real-time preview with canvas
 * - Reset to original
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Loader } from '@/components/ai-elements/loader';
import {
  Sun,
  Contrast,
  Droplets,
  Palette,
  CircleDot,
  Sparkles,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

import type { ImageAdjustments, FilterPreset } from '@/types';
import { DEFAULT_IMAGE_ADJUSTMENTS } from '@/types';

// Re-export types for backward compatibility
export type { ImageAdjustments, FilterPreset } from '@/types';

export interface ImageAdjustmentsProps {
  imageUrl: string;
  initialAdjustments?: ImageAdjustments;
  onAdjustmentsChange?: (adjustments: ImageAdjustments) => void;
  onApply?: (dataUrl: string, adjustments: ImageAdjustments) => void;
  onCancel?: () => void;
  className?: string;
}

const DEFAULT_ADJUSTMENTS: ImageAdjustments = DEFAULT_IMAGE_ADJUSTMENTS;

const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', name: 'None', adjustments: {} },
  { id: 'vivid', name: 'Vivid', adjustments: { saturation: 30, contrast: 15 } },
  { id: 'warm', name: 'Warm', adjustments: { hue: 15, saturation: 10, brightness: 5 } },
  { id: 'cool', name: 'Cool', adjustments: { hue: -20, saturation: -10, brightness: -5 } },
  { id: 'bw', name: 'B&W', adjustments: { saturation: -100 } },
  { id: 'sepia', name: 'Sepia', adjustments: { saturation: -50, hue: 30, brightness: 10 } },
  { id: 'high-contrast', name: 'High Contrast', adjustments: { contrast: 50, brightness: -10 } },
  { id: 'soft', name: 'Soft', adjustments: { contrast: -20, blur: 1, saturation: -15 } },
  { id: 'dramatic', name: 'Dramatic', adjustments: { contrast: 40, saturation: 20, brightness: -15 } },
  { id: 'faded', name: 'Faded', adjustments: { contrast: -30, saturation: -30, brightness: 20 } },
  { id: 'sharp', name: 'Sharp', adjustments: { sharpen: 50, contrast: 10 } },
  { id: 'muted', name: 'Muted', adjustments: { saturation: -40, contrast: -10 } },
];

interface AdjustmentControlProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

function AdjustmentControl({
  label,
  icon,
  value,
  min,
  max,
  step = 1,
  onChange,
  onReset,
}: AdjustmentControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <Label className="text-sm">{label}</Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {value > 0 ? '+' : ''}{value}
          </span>
          {value !== 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

export function ImageAdjustmentsPanel({
  imageUrl,
  initialAdjustments,
  onAdjustmentsChange,
  onApply,
  onCancel,
  className,
}: ImageAdjustmentsProps) {
  const t = useTranslations('imageStudio.imageAdjustments');
  const tc = useTranslations('imageStudio.common');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [_imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(
    initialAdjustments || { ...DEFAULT_ADJUSTMENTS }
  );
  const [selectedPreset, setSelectedPreset] = useState<string>('None');

  const previewSize = useMemo(() => {
    const maxDim = 1024;
    const { width, height } = _imageSize;
    if (!width || !height) return { width: 0, height: 0 };
    const scale = Math.min(1, maxDim / Math.max(width, height));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }, [_imageSize]);

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

  // Apply adjustments and render
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
    }

    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = null;

      canvas.width = previewSize.width || img.width;
      canvas.height = previewSize.height || img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const brightness = adjustments.brightness / 100;
      const contrast = (adjustments.contrast + 100) / 100;
      const saturation = (adjustments.saturation + 100) / 100;
      const hueShift = adjustments.hue;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        r = r + brightness * 255;
        g = g + brightness * 255;
        b = b + brightness * 255;

        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          if (max === r / 255) {
            h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
          } else if (max === g / 255) {
            h = ((b / 255 - r / 255) / d + 2) / 6;
          } else {
            h = ((r / 255 - g / 255) / d + 4) / 6;
          }
        }

        h = (h + hueShift / 360 + 1) % 1;
        s = Math.max(0, Math.min(1, s * saturation));

        let r2: number, g2: number, b2: number;

        if (s === 0) {
          r2 = g2 = b2 = l;
        } else {
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r2 = hue2rgb(p, q, h + 1 / 3);
          g2 = hue2rgb(p, q, h);
          b2 = hue2rgb(p, q, h - 1 / 3);
        }

        data[i] = Math.max(0, Math.min(255, r2 * 255));
        data[i + 1] = Math.max(0, Math.min(255, g2 * 255));
        data[i + 2] = Math.max(0, Math.min(255, b2 * 255));
      }

      ctx.putImageData(imageData, 0, 0);

      if (adjustments.blur > 0) {
        if (!blurCanvasRef.current) {
          blurCanvasRef.current = document.createElement('canvas');
        }

        const tempCanvas = blurCanvasRef.current;
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.filter = `blur(${adjustments.blur}px)`;
          tempCtx.drawImage(canvas, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }

      if (adjustments.sharpen > 0) {
        const amount = adjustments.sharpen / 100;
        const sharpData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const sd = sharpData.data;

        const width = canvas.width;
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = data[idx + c];
              const top = data[idx - width * 4 + c];
              const bottom = data[idx + width * 4 + c];
              const left = data[idx - 4 + c];
              const right = data[idx + 4 + c];

              const laplacian = 5 * center - top - bottom - left - right;
              sd[idx + c] = Math.max(0, Math.min(255, center + laplacian * amount * 0.5));
            }
          }
        }
        ctx.putImageData(sharpData, 0, 0);
      }

      onAdjustmentsChange?.(adjustments);
    });

    return () => {
      if (previewRafRef.current) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
    };
  }, [adjustments, imageLoaded, onAdjustmentsChange, previewSize]);

  // Update single adjustment
  const updateAdjustment = useCallback(
    <K extends keyof ImageAdjustments>(key: K, value: ImageAdjustments[K]) => {
      setAdjustments((prev) => ({ ...prev, [key]: value }));
      setSelectedPreset(''); // Clear preset selection when manually adjusting
    },
    []
  );

  // Reset single adjustment
  const resetAdjustment = useCallback((key: keyof ImageAdjustments) => {
    setAdjustments((prev) => ({ ...prev, [key]: DEFAULT_ADJUSTMENTS[key] }));
  }, []);

  // Reset all adjustments
  const resetAll = useCallback(() => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setSelectedPreset('None');
  }, []);

  // Apply preset
  const applyPreset = useCallback((preset: FilterPreset) => {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS, ...preset.adjustments });
    setSelectedPreset(preset.name);
  }, []);

  // Export result
  const handleApply = useCallback(() => {
    const img = imageRef.current;
    if (!img || !imageLoaded) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = img.width;
    exportCanvas.height = img.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
    const data = imageData.data;

    const brightness = adjustments.brightness / 100;
    const contrast = (adjustments.contrast + 100) / 100;
    const saturation = (adjustments.saturation + 100) / 100;
    const hueShift = adjustments.hue;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      r = r + brightness * 255;
      g = g + brightness * 255;
      b = b + brightness * 255;

      r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        if (max === r / 255) {
          h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
        } else if (max === g / 255) {
          h = ((b / 255 - r / 255) / d + 2) / 6;
        } else {
          h = ((r / 255 - g / 255) / d + 4) / 6;
        }
      }

      h = (h + hueShift / 360 + 1) % 1;
      s = Math.max(0, Math.min(1, s * saturation));

      let r2: number, g2: number, b2: number;

      if (s === 0) {
        r2 = g2 = b2 = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
      }

      data[i] = Math.max(0, Math.min(255, r2 * 255));
      data[i + 1] = Math.max(0, Math.min(255, g2 * 255));
      data[i + 2] = Math.max(0, Math.min(255, b2 * 255));
    }

    ctx.putImageData(imageData, 0, 0);

    if (adjustments.blur > 0) {
      if (!blurCanvasRef.current) {
        blurCanvasRef.current = document.createElement('canvas');
      }

      const tempCanvas = blurCanvasRef.current;
      tempCanvas.width = exportCanvas.width;
      tempCanvas.height = exportCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.filter = `blur(${adjustments.blur}px)`;
        tempCtx.drawImage(exportCanvas, 0, 0);
        ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }

    if (adjustments.sharpen > 0) {
      const amount = adjustments.sharpen / 100;
      const srcData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      const dstData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      const sd = srcData.data;
      const dd = dstData.data;
      const width = exportCanvas.width;

      for (let y = 1; y < exportCanvas.height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = sd[idx + c];
            const top = sd[idx - width * 4 + c];
            const bottom = sd[idx + width * 4 + c];
            const left = sd[idx - 4 + c];
            const right = sd[idx + 4 + c];

            const laplacian = 5 * center - top - bottom - left - right;
            dd[idx + c] = Math.max(0, Math.min(255, center + laplacian * amount * 0.5));
          }
        }
      }

      ctx.putImageData(dstData, 0, 0);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    onApply?.(dataUrl, adjustments);
  }, [adjustments, imageLoaded, onApply]);

  // Check if any adjustments are made
  const hasChanges = Object.entries(adjustments).some(
    ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof ImageAdjustments]
  );

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Preview canvas */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg border overflow-hidden min-h-[400px]">
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader size={16} />
              <span>{tc('loadingImage')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls panel */}
      <Card className="w-72 flex flex-col py-0">
        <CardHeader className="p-3 border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">{t('title')}</CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAll}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {tc('reset')}
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Filter presets */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('presets')}</Label>
              <div className="grid grid-cols-3 gap-1">
                {FILTER_PRESETS.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={selectedPreset === preset.name ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Basic adjustments */}
            <div className="space-y-4">
              <AdjustmentControl
                label={t('brightness')}
                icon={<Sun className="h-4 w-4" />}
                value={adjustments.brightness}
                min={-100}
                max={100}
                onChange={(v) => updateAdjustment('brightness', v)}
                onReset={() => resetAdjustment('brightness')}
              />

              <AdjustmentControl
                label={t('contrast')}
                icon={<Contrast className="h-4 w-4" />}
                value={adjustments.contrast}
                min={-100}
                max={100}
                onChange={(v) => updateAdjustment('contrast', v)}
                onReset={() => resetAdjustment('contrast')}
              />

              <AdjustmentControl
                label={t('saturation')}
                icon={<Droplets className="h-4 w-4" />}
                value={adjustments.saturation}
                min={-100}
                max={100}
                onChange={(v) => updateAdjustment('saturation', v)}
                onReset={() => resetAdjustment('saturation')}
              />

              <AdjustmentControl
                label={t('hue')}
                icon={<Palette className="h-4 w-4" />}
                value={adjustments.hue}
                min={-180}
                max={180}
                onChange={(v) => updateAdjustment('hue', v)}
                onReset={() => resetAdjustment('hue')}
              />
            </div>

            <Separator />

            {/* Effects */}
            <div className="space-y-4">
              <AdjustmentControl
                label={t('blur')}
                icon={<CircleDot className="h-4 w-4" />}
                value={adjustments.blur}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => updateAdjustment('blur', v)}
                onReset={() => resetAdjustment('blur')}
              />

              <AdjustmentControl
                label={t('sharpen')}
                icon={<Sparkles className="h-4 w-4" />}
                value={adjustments.sharpen}
                min={0}
                max={100}
                onChange={(v) => updateAdjustment('sharpen', v)}
                onReset={() => resetAdjustment('sharpen')}
              />
            </div>
          </div>
          </ScrollArea>
        </CardContent>

        {/* Actions */}
        <CardFooter className="p-3 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            {tc('cancel')}
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            <Check className="h-4 w-4 mr-1" />
            {t('apply')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default ImageAdjustmentsPanel;
