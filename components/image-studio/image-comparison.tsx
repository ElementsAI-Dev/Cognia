'use client';

/**
 * ImageComparison - Before/after image comparison component
 * Features:
 * - Slider comparison (horizontal/vertical)
 * - Side-by-side view
 * - Onion skin overlay
 * - Toggle comparison
 * - Full-screen mode
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  SplitSquareHorizontal,
  SplitSquareVertical,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

export type ComparisonMode = 'slider-h' | 'slider-v' | 'side-by-side' | 'onion-skin' | 'toggle';

export interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialMode?: ComparisonMode;
  initialPosition?: number;
  className?: string;
}

interface ModeOption {
  mode: ComparisonMode;
  icon: React.ReactNode;
  label: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { mode: 'slider-h', icon: <SplitSquareHorizontal className="h-4 w-4" />, label: 'Horizontal Slider' },
  { mode: 'slider-v', icon: <SplitSquareVertical className="h-4 w-4" />, label: 'Vertical Slider' },
  { mode: 'side-by-side', icon: <LayoutGrid className="h-4 w-4" />, label: 'Side by Side' },
  { mode: 'onion-skin', icon: <Layers className="h-4 w-4" />, label: 'Onion Skin' },
  { mode: 'toggle', icon: <Eye className="h-4 w-4" />, label: 'Toggle' },
];

export function ImageComparison({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  initialMode = 'slider-h',
  initialPosition = 50,
  className,
}: ImageComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<ComparisonMode>(initialMode);
  const [position, setPosition] = useState(initialPosition);
  const [opacity, setOpacity] = useState(50);
  const [showBefore, setShowBefore] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({ before: false, after: false });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded((prev) => ({ ...prev, before: true }));
    };
    img.src = beforeImage;

    const afterImg = new Image();
    afterImg.onload = () => {
      setImageLoaded((prev) => ({ ...prev, after: true }));
    };
    afterImg.src = afterImage;
  }, [beforeImage, afterImage]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      if (!isDragging || mode === 'side-by-side' || mode === 'onion-skin' || mode === 'toggle') return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      if (mode === 'slider-h') {
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        setPosition((x / rect.width) * 100);
      } else if (mode === 'slider-v') {
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        setPosition((y / rect.height) * 100);
      }
    },
    [isDragging, mode]
  );

  const handleMouseDown = useCallback(() => {
    if (mode === 'slider-h' || mode === 'slider-v') {
      setIsDragging(true);
    }
  }, [mode]);

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalMouseUp = () => setIsDragging(false);

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const resetPosition = useCallback(() => {
    setPosition(50);
    setOpacity(50);
    setShowBefore(true);
  }, []);

  const allLoaded = imageLoaded.before && imageLoaded.after;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 border rounded-md p-1">
          {MODE_OPTIONS.map((option) => (
            <Tooltip key={option.mode}>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === option.mode ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMode(option.mode)}
                >
                  {option.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{option.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator orientation="vertical" className="h-6" />

        {(mode === 'slider-h' || mode === 'slider-v') && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Label className="text-xs whitespace-nowrap">Position</Label>
            <Slider
              value={[position]}
              onValueChange={([v]) => setPosition(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{Math.round(position)}%</span>
          </div>
        )}

        {mode === 'onion-skin' && (
          <div className="flex items-center gap-2 min-w-[140px]">
            <Label className="text-xs whitespace-nowrap">Opacity</Label>
            <Slider
              value={[opacity]}
              onValueChange={([v]) => setOpacity(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8">{Math.round(opacity)}%</span>
          </div>
        )}

        {mode === 'toggle' && (
          <Button
            variant={showBefore ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowBefore(!showBefore)}
          >
            {showBefore ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            {showBefore ? beforeLabel : afterLabel}
          </Button>
        )}

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetPosition}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative border rounded-lg overflow-hidden bg-muted/30 min-h-[400px]',
          (mode === 'slider-h' || mode === 'slider-v') && 'cursor-ew-resize',
          isFullscreen && 'fixed inset-0 z-50 rounded-none min-h-0'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
      >
        {!allLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading images...</div>
          </div>
        )}

        {allLoaded && mode === 'slider-h' && (
          <>
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeImage} alt={beforeLabel} className="w-full h-full object-contain" />
            </div>
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterImage} alt={afterLabel} className="w-full h-full object-contain" />
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <SplitSquareHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{beforeLabel}</div>
            <div className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{afterLabel}</div>
          </>
        )}

        {allLoaded && mode === 'slider-v' && (
          <>
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeImage} alt={beforeLabel} className="w-full h-full object-contain" />
            </div>
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(${position}% 0 0 0)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterImage} alt={afterLabel} className="w-full h-full object-contain" />
            </div>
            <div
              className="absolute left-0 right-0 h-1 bg-white shadow-lg cursor-ns-resize"
              style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <SplitSquareVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{beforeLabel}</div>
            <div className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{afterLabel}</div>
          </>
        )}

        {allLoaded && mode === 'side-by-side' && (
          <div className="flex h-full">
            <div className="flex-1 relative border-r">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeImage} alt={beforeLabel} className="w-full h-full object-contain" />
              <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{beforeLabel}</div>
            </div>
            <div className="flex-1 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterImage} alt={afterLabel} className="w-full h-full object-contain" />
              <div className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">{afterLabel}</div>
            </div>
          </div>
        )}

        {allLoaded && mode === 'onion-skin' && (
          <>
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeImage} alt={beforeLabel} className="w-full h-full object-contain" />
            </div>
            <div className="absolute inset-0" style={{ opacity: opacity / 100 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterImage} alt={afterLabel} className="w-full h-full object-contain" />
            </div>
            <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
              {beforeLabel} + {afterLabel} ({opacity}%)
            </div>
          </>
        )}

        {allLoaded && mode === 'toggle' && (
          <>
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={showBefore ? beforeImage : afterImage}
                alt={showBefore ? beforeLabel : afterLabel}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute top-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
              {showBefore ? beforeLabel : afterLabel}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{imageSize.width > 0 && `${imageSize.width} x ${imageSize.height} px`}</span>
        <span>Click and drag to compare</span>
      </div>
    </div>
  );
}

export default ImageComparison;
