'use client';

/**
 * FiltersGallery - Visual filter preview grid
 * Features:
 * - Grid of filter previews with thumbnails
 * - Real-time preview on hover
 * - Click to apply filter
 * - Custom filter intensity
 * - Category organization
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Check,
  X,
  RotateCcw,
  Eye,
} from 'lucide-react';

import type { ImageAdjustments } from '@/types';

export interface FilterPreset {
  id: string;
  name: string;
  category: 'basic' | 'vintage' | 'cinematic' | 'artistic' | 'black-white';
  adjustments: Partial<ImageAdjustments>;
  description?: string;
}

export interface FiltersGalleryProps {
  imageUrl: string;
  initialFilter?: string;
  onApply?: (result: { dataUrl: string; filter: FilterPreset; intensity: number }) => void;
  onCancel?: () => void;
  className?: string;
}

const FILTER_PRESETS: FilterPreset[] = [
  // Basic
  { id: 'none', name: 'Original', category: 'basic', adjustments: {} },
  { id: 'vivid', name: 'Vivid', category: 'basic', adjustments: { saturation: 30, contrast: 15 }, description: 'Enhanced colors' },
  { id: 'warm', name: 'Warm', category: 'basic', adjustments: { hue: 15, saturation: 10, brightness: 5 }, description: 'Warm tones' },
  { id: 'cool', name: 'Cool', category: 'basic', adjustments: { hue: -20, saturation: -10, brightness: -5 }, description: 'Cool tones' },
  { id: 'bright', name: 'Bright', category: 'basic', adjustments: { brightness: 20, contrast: 10 }, description: 'Brighter image' },
  { id: 'contrast', name: 'High Contrast', category: 'basic', adjustments: { contrast: 40, brightness: -5 }, description: 'Dramatic contrast' },
  
  // Vintage
  { id: 'sepia', name: 'Sepia', category: 'vintage', adjustments: { saturation: -50, hue: 30, brightness: 10 }, description: 'Classic sepia tone' },
  { id: 'faded', name: 'Faded', category: 'vintage', adjustments: { contrast: -30, saturation: -30, brightness: 20 }, description: 'Washed out look' },
  { id: 'retro', name: 'Retro', category: 'vintage', adjustments: { saturation: -20, contrast: 20, hue: 10 }, description: '70s style' },
  { id: 'film', name: 'Film', category: 'vintage', adjustments: { contrast: 15, saturation: -15, brightness: 5 }, description: 'Analog film look' },
  { id: 'polaroid', name: 'Polaroid', category: 'vintage', adjustments: { contrast: -10, saturation: 20, brightness: 15, hue: -5 }, description: 'Instant photo style' },
  
  // Cinematic
  { id: 'dramatic', name: 'Dramatic', category: 'cinematic', adjustments: { contrast: 40, saturation: 20, brightness: -15 }, description: 'Bold and dramatic' },
  { id: 'teal-orange', name: 'Teal & Orange', category: 'cinematic', adjustments: { hue: -15, saturation: 30, contrast: 20 }, description: 'Hollywood style' },
  { id: 'noir', name: 'Noir', category: 'cinematic', adjustments: { contrast: 50, brightness: -20, saturation: -80 }, description: 'Dark and moody' },
  { id: 'golden', name: 'Golden Hour', category: 'cinematic', adjustments: { hue: 20, saturation: 25, brightness: 10 }, description: 'Warm golden light' },
  { id: 'cold-blue', name: 'Cold Blue', category: 'cinematic', adjustments: { hue: -30, saturation: 15, contrast: 20, brightness: -10 }, description: 'Cold cinematic' },
  
  // Artistic
  { id: 'pop', name: 'Pop Art', category: 'artistic', adjustments: { saturation: 70, contrast: 40 }, description: 'Bold pop colors' },
  { id: 'soft', name: 'Soft', category: 'artistic', adjustments: { contrast: -20, blur: 1, saturation: -15 }, description: 'Soft dreamy look' },
  { id: 'sharp', name: 'Sharp', category: 'artistic', adjustments: { sharpen: 50, contrast: 10 }, description: 'Enhanced details' },
  { id: 'muted', name: 'Muted', category: 'artistic', adjustments: { saturation: -40, contrast: -10 }, description: 'Subtle colors' },
  { id: 'punch', name: 'Punch', category: 'artistic', adjustments: { saturation: 40, contrast: 30, sharpen: 20 }, description: 'Extra punch' },
  
  // Black & White
  { id: 'bw', name: 'B&W', category: 'black-white', adjustments: { saturation: -100 }, description: 'Classic black & white' },
  { id: 'bw-high', name: 'B&W High Contrast', category: 'black-white', adjustments: { saturation: -100, contrast: 50 }, description: 'Bold B&W' },
  { id: 'bw-soft', name: 'B&W Soft', category: 'black-white', adjustments: { saturation: -100, contrast: -20, brightness: 10 }, description: 'Soft B&W' },
  { id: 'bw-grain', name: 'B&W Film', category: 'black-white', adjustments: { saturation: -100, contrast: 30, sharpen: 30 }, description: 'Grainy film look' },
];

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  vintage: 'Vintage',
  cinematic: 'Cinematic',
  artistic: 'Artistic',
  'black-white': 'B&W',
};

export function FiltersGallery({
  imageUrl,
  initialFilter,
  onApply,
  onCancel,
  className,
}: FiltersGalleryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(
    initialFilter ? FILTER_PRESETS.find((f) => f.id === initialFilter) || null : null
  );
  const [hoveredFilter, setHoveredFilter] = useState<FilterPreset | null>(null);
  const [intensity, setIntensity] = useState(100);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [thumbnailsGenerated, setThumbnailsGenerated] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('basic');

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

  // Apply adjustments to image data
  const applyAdjustments = useCallback(
    (ctx: CanvasRenderingContext2D, adjustments: Partial<ImageAdjustments>, intensityFactor: number) => {
      const canvas = ctx.canvas;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const brightness = ((adjustments.brightness || 0) * intensityFactor) / 100;
      const contrast = (((adjustments.contrast || 0) * intensityFactor + 100) / 100);
      const saturation = (((adjustments.saturation || 0) * intensityFactor + 100) / 100);
      const hueShift = (adjustments.hue || 0) * intensityFactor;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness
        r = r + brightness * 255;
        g = g + brightness * 255;
        b = b + brightness * 255;

        // Contrast
        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;

        // Convert to HSL
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) / 6;
          else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) / 6;
          else h = ((r / 255 - g / 255) / d + 4) / 6;
        }

        // Apply hue and saturation
        h = (h + hueShift / 360 + 1) % 1;
        s = Math.max(0, Math.min(1, s * saturation));

        // Convert back to RGB
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
    },
    []
  );

  // Generate thumbnails
  const generateThumbnails = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const thumbSize = 80;
    const aspectRatio = img.width / img.height;
    const thumbWidth = aspectRatio > 1 ? thumbSize : thumbSize * aspectRatio;
    const thumbHeight = aspectRatio > 1 ? thumbSize / aspectRatio : thumbSize;

    const newThumbnails = new Map<string, string>();
    
    FILTER_PRESETS.forEach((filter) => {
      const canvas = document.createElement('canvas');
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

      if (Object.keys(filter.adjustments).length > 0) {
        applyAdjustments(ctx, filter.adjustments, 100);
      }

      newThumbnails.set(filter.id, canvas.toDataURL('image/jpeg', 0.7));
    });

    setThumbnails(newThumbnails);
    setThumbnailsGenerated(true);
  }, [applyAdjustments]);

  useEffect(() => {
    if (!imageLoaded || thumbnailsGenerated) return;
    // Use requestAnimationFrame to defer state updates and avoid cascading renders
    const rafId = requestAnimationFrame(() => {
      generateThumbnails();
    });
    return () => cancelAnimationFrame(rafId);
  }, [imageLoaded, thumbnailsGenerated, generateThumbnails]);

  // Render preview
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    ctx.drawImage(img, 0, 0);

    const activeFilter = hoveredFilter || selectedFilter;
    if (activeFilter && Object.keys(activeFilter.adjustments).length > 0) {
      applyAdjustments(ctx, activeFilter.adjustments, intensity);
    }
  }, [imageLoaded, imageSize, selectedFilter, hoveredFilter, intensity, applyAdjustments]);

  // Get filters by category
  const filtersByCategory = useMemo(() => {
    const result: Record<string, FilterPreset[]> = {};
    FILTER_PRESETS.forEach((filter) => {
      if (!result[filter.category]) result[filter.category] = [];
      result[filter.category].push(filter);
    });
    return result;
  }, []);

  // Handle apply
  const handleApply = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedFilter) return;

    const dataUrl = canvas.toDataURL('image/png');
    onApply?.({ dataUrl, filter: selectedFilter, intensity });
  }, [selectedFilter, intensity, onApply]);

  // Reset
  const handleReset = useCallback(() => {
    setSelectedFilter(null);
    setIntensity(100);
  }, []);

  return (
    <div className={cn('flex gap-4', className)}>
      {/* Preview */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-medium">Filters</h3>
            {(selectedFilter || hoveredFilter) && (
              <span className="text-sm text-muted-foreground">
                — {(hoveredFilter || selectedFilter)?.name}
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {imageSize.width} × {imageSize.height}
          </div>
        </div>

        <div className="relative flex-1 border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain"
          />
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading image...</div>
            </div>
          )}
        </div>

        {/* Intensity slider */}
        {selectedFilter && selectedFilter.id !== 'none' && (
          <div className="flex items-center gap-4">
            <Label className="text-sm whitespace-nowrap">Intensity</Label>
            <Slider
              value={[intensity]}
              onValueChange={([v]) => setIntensity(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-10">{intensity}%</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!selectedFilter}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!selectedFilter}>
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
        </div>
      </div>

      {/* Filter grid */}
      <div className="w-72 flex flex-col border rounded-lg">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex flex-col h-full">
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-1 flex-wrap">
            {Object.keys(filtersByCategory).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="text-xs px-2 py-1"
              >
                {CATEGORY_LABELS[category]}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            {Object.entries(filtersByCategory).map(([category, filters]) => (
              <TabsContent key={category} value={category} className="mt-0 p-2">
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <Tooltip key={filter.id}>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            'relative aspect-square rounded-md overflow-hidden border-2 transition-all',
                            selectedFilter?.id === filter.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/50'
                          )}
                          onClick={() => setSelectedFilter(filter)}
                          onMouseEnter={() => setHoveredFilter(filter)}
                          onMouseLeave={() => setHoveredFilter(null)}
                        >
                          {thumbnails.get(filter.id) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbnails.get(filter.id)}
                              alt={filter.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted animate-pulse" />
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                            <span className="text-xs text-white font-medium">{filter.name}</span>
                          </div>
                          {selectedFilter?.id === filter.id && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          )}
                          {hoveredFilter?.id === filter.id && selectedFilter?.id !== filter.id && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 flex items-center justify-center">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="font-medium">{filter.name}</p>
                        {filter.description && (
                          <p className="text-xs text-muted-foreground">{filter.description}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

export default FiltersGallery;
