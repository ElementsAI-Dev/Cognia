'use client';

/**
 * ResponsiveControls - Responsive design controls for the designer
 * Provides breakpoint management and device preview selection
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Monitor,
  Tablet,
  Smartphone,
  Laptop,
  Tv,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';

interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  category: 'mobile' | 'tablet' | 'desktop' | 'other';
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, icon: <Smartphone className="h-4 w-4" />, category: 'mobile' },
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844, icon: <Smartphone className="h-4 w-4" />, category: 'mobile' },
  { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', width: 430, height: 932, icon: <Smartphone className="h-4 w-4" />, category: 'mobile' },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915, icon: <Smartphone className="h-4 w-4" />, category: 'mobile' },
  { id: 'samsung-s23', name: 'Samsung S23', width: 360, height: 780, icon: <Smartphone className="h-4 w-4" />, category: 'mobile' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, icon: <Tablet className="h-4 w-4" />, category: 'tablet' },
  { id: 'ipad-air', name: 'iPad Air', width: 820, height: 1180, icon: <Tablet className="h-4 w-4" />, category: 'tablet' },
  { id: 'ipad-pro-11', name: 'iPad Pro 11"', width: 834, height: 1194, icon: <Tablet className="h-4 w-4" />, category: 'tablet' },
  { id: 'ipad-pro-12', name: 'iPad Pro 12.9"', width: 1024, height: 1366, icon: <Tablet className="h-4 w-4" />, category: 'tablet' },
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800, icon: <Laptop className="h-4 w-4" />, category: 'desktop' },
  { id: 'desktop-hd', name: 'Desktop HD', width: 1366, height: 768, icon: <Monitor className="h-4 w-4" />, category: 'desktop' },
  { id: 'desktop-fhd', name: 'Desktop FHD', width: 1920, height: 1080, icon: <Monitor className="h-4 w-4" />, category: 'desktop' },
  { id: 'desktop-2k', name: 'Desktop 2K', width: 2560, height: 1440, icon: <Tv className="h-4 w-4" />, category: 'desktop' },
];

const TAILWIND_BREAKPOINTS = [
  { name: 'sm', width: 640, description: 'Small devices' },
  { name: 'md', width: 768, description: 'Medium devices' },
  { name: 'lg', width: 1024, description: 'Large devices' },
  { name: 'xl', width: 1280, description: 'Extra large devices' },
  { name: '2xl', width: 1536, description: '2X large devices' },
];

interface ResponsiveControlsProps {
  className?: string;
}

export function ResponsiveControls({ className }: ResponsiveControlsProps) {
  const t = useTranslations('designer');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [showDeviceList, setShowDeviceList] = useState(false);

  const viewport = useDesignerStore((state) => state.viewport);
  const setViewport = useDesignerStore((state) => state.setViewport);
  const zoom = useDesignerStore((state) => state.zoom);
  const setZoom = useDesignerStore((state) => state.setZoom);

  const getCurrentDimensions = useCallback(() => {
    switch (viewport) {
      case 'mobile':
        return { width: 375, height: 667 };
      case 'tablet':
        return { width: 768, height: 1024 };
      case 'desktop':
        return { width: 1280, height: 800 };
      default:
        return { width: 0, height: 0 };
    }
  }, [viewport]);

  const handleApplyCustom = useCallback(() => {
    const width = parseInt(customWidth, 10);
    const height = parseInt(customHeight, 10);
    
    if (width > 0 && height > 0) {
      if (width <= 480) {
        setViewport('mobile');
      } else if (width <= 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    }
  }, [customWidth, customHeight, setViewport]);

  const handleDevicePreset = useCallback((preset: DevicePreset) => {
    if (preset.category === 'mobile') {
      setViewport('mobile');
    } else if (preset.category === 'tablet') {
      setViewport('tablet');
    } else {
      setViewport('desktop');
    }
    setShowDeviceList(false);
  }, [setViewport]);

  const handleBreakpoint = useCallback((width: number) => {
    if (width < 768) {
      setViewport('mobile');
    } else if (width < 1024) {
      setViewport('tablet');
    } else {
      setViewport('desktop');
    }
  }, [setViewport]);

  const dimensions = getCurrentDimensions();

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">
            {viewport !== 'full' ? `${dimensions.width}×${dimensions.height}` : 'Full'}
          </span>
          <span className="text-muted-foreground/50">@</span>
          <span className="font-mono">{zoom}%</span>
        </div>

        <Separator orientation="vertical" className="h-5" />

        <Popover open={showDeviceList} onOpenChange={setShowDeviceList}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              <span className="text-xs">{t('devices') || 'Devices'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <h4 className="font-medium text-sm">{t('devicePresets') || 'Device Presets'}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t('selectDevice') || 'Select a device to preview your design'}
              </p>
            </div>
            
            <ScrollArea className="h-[300px]">
              {['mobile', 'tablet', 'desktop'].map((category) => (
                <div key={category} className="p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2 capitalize">
                    {category}
                  </div>
                  {DEVICE_PRESETS.filter(d => d.category === category).map((device) => (
                    <Button
                      key={device.id}
                      variant="ghost"
                      className="w-full justify-start h-9 px-2"
                      onClick={() => handleDevicePreset(device)}
                    >
                      {device.icon}
                      <span className="ml-2 text-sm">{device.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {device.width}×{device.height}
                      </span>
                    </Button>
                  ))}
                  {category !== 'desktop' && <Separator className="my-2" />}
                </div>
              ))}
            </ScrollArea>

            <div className="p-3 border-t">
              <div className="text-xs font-medium mb-2">{t('customSize') || 'Custom Size'}</div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Width"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground self-center">×</span>
                <Input
                  type="number"
                  placeholder="Height"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleApplyCustom}
                  disabled={!customWidth || !customHeight}
                >
                  {t('apply') || 'Apply'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-0.5">
          {TAILWIND_BREAKPOINTS.slice(0, 4).map((bp) => (
            <Tooltip key={bp.name}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 px-2 text-xs font-mono',
                    dimensions.width >= bp.width && 'bg-primary/10 text-primary'
                  )}
                  onClick={() => handleBreakpoint(bp.width)}
                >
                  {bp.name}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{bp.description}</div>
                  <div className="text-muted-foreground">≥ {bp.width}px</div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setViewport('desktop');
                setZoom(100);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('resetView') || 'Reset View'}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default ResponsiveControls;
