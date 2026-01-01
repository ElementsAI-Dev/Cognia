'use client';

/**
 * LayoutGridOverlay - Visual grid overlay for alignment
 * Shows column guides, margins, and spacing helpers
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Grid3X3, Settings, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';

interface GridConfig {
  columns: number;
  gutter: number;
  margin: number;
  showColumns: boolean;
  showBaseline: boolean;
  baselineHeight: number;
  color: string;
  opacity: number;
}

const DEFAULT_CONFIG: GridConfig = {
  columns: 12,
  gutter: 16,
  margin: 24,
  showColumns: true,
  showBaseline: false,
  baselineHeight: 8,
  color: '#3b82f6',
  opacity: 0.15,
};

interface LayoutGridOverlayProps {
  className?: string;
  containerWidth?: number;
  containerHeight?: number;
}

export function LayoutGridOverlay({
  className,
  containerWidth = 1280,
  containerHeight = 800,
}: LayoutGridOverlayProps) {
  const t = useTranslations('designer');
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<GridConfig>(DEFAULT_CONFIG);

  // Calculate column positions
  const columnPositions = useMemo(() => {
    if (!config.showColumns) return [];

    const availableWidth = containerWidth - config.margin * 2;
    const totalGutterWidth = config.gutter * (config.columns - 1);
    const columnWidth = (availableWidth - totalGutterWidth) / config.columns;

    const positions: { left: number; width: number }[] = [];
    let currentLeft = config.margin;

    for (let i = 0; i < config.columns; i++) {
      positions.push({
        left: currentLeft,
        width: columnWidth,
      });
      currentLeft += columnWidth + config.gutter;
    }

    return positions;
  }, [config.columns, config.gutter, config.margin, config.showColumns, containerWidth]);

  // Calculate baseline positions
  const baselinePositions = useMemo(() => {
    if (!config.showBaseline) return [];

    const positions: number[] = [];
    let currentTop = 0;

    while (currentTop < containerHeight) {
      positions.push(currentTop);
      currentTop += config.baselineHeight;
    }

    return positions;
  }, [config.showBaseline, config.baselineHeight, containerHeight]);

  const updateConfig = (updates: Partial<GridConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <TooltipProvider>
      <div className={cn('relative', className)}>
        {/* Grid overlay */}
        {isVisible && (
          <div
            className="absolute inset-0 pointer-events-none z-50 overflow-hidden"
            style={{ opacity: config.opacity }}
          >
            {/* Column guides */}
            {columnPositions.map((col, index) => (
              <div
                key={`col-${index}`}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${col.left}px`,
                  width: `${col.width}px`,
                  backgroundColor: config.color,
                }}
              />
            ))}

            {/* Baseline grid */}
            {baselinePositions.map((top, index) => (
              <div
                key={`baseline-${index}`}
                className="absolute left-0 right-0"
                style={{
                  top: `${top}px`,
                  height: '1px',
                  backgroundColor: config.color,
                  opacity: 0.5,
                }}
              />
            ))}

            {/* Margin indicators */}
            <div
              className="absolute top-0 bottom-0 border-r border-dashed"
              style={{
                left: `${config.margin}px`,
                borderColor: config.color,
              }}
            />
            <div
              className="absolute top-0 bottom-0 border-l border-dashed"
              style={{
                right: `${config.margin}px`,
                borderColor: config.color,
              }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="absolute top-2 right-2 z-50 flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVisible ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isVisible ? t('hideGrid') || 'Hide Grid' : t('showGrid') || 'Show Grid'}
            </TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm">{t('gridSettings') || 'Grid Settings'}</h4>
                </div>

                {/* Columns */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('columns') || 'Columns'}</Label>
                    <span className="text-xs text-muted-foreground">{config.columns}</span>
                  </div>
                  <Slider
                    value={[config.columns]}
                    onValueChange={([v]) => updateConfig({ columns: v })}
                    min={1}
                    max={24}
                    step={1}
                  />
                </div>

                {/* Gutter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('gutter') || 'Gutter'}</Label>
                    <span className="text-xs text-muted-foreground">{config.gutter}px</span>
                  </div>
                  <Slider
                    value={[config.gutter]}
                    onValueChange={([v]) => updateConfig({ gutter: v })}
                    min={0}
                    max={48}
                    step={4}
                  />
                </div>

                {/* Margin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('margin') || 'Margin'}</Label>
                    <span className="text-xs text-muted-foreground">{config.margin}px</span>
                  </div>
                  <Slider
                    value={[config.margin]}
                    onValueChange={([v]) => updateConfig({ margin: v })}
                    min={0}
                    max={96}
                    step={8}
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('opacity') || 'Opacity'}</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(config.opacity * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.opacity * 100]}
                    onValueChange={([v]) => updateConfig({ opacity: v / 100 })}
                    min={5}
                    max={50}
                    step={5}
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('showColumns') || 'Show Columns'}</Label>
                    <Switch
                      checked={config.showColumns}
                      onCheckedChange={(v) => updateConfig({ showColumns: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('showBaseline') || 'Show Baseline'}</Label>
                    <Switch
                      checked={config.showBaseline}
                      onCheckedChange={(v) => updateConfig({ showBaseline: v })}
                    />
                  </div>
                </div>

                {/* Baseline height (only show if baseline is enabled) */}
                {config.showBaseline && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t('baselineHeight') || 'Baseline Height'}</Label>
                      <span className="text-xs text-muted-foreground">{config.baselineHeight}px</span>
                    </div>
                    <Slider
                      value={[config.baselineHeight]}
                      onValueChange={([v]) => updateConfig({ baselineHeight: v })}
                      min={4}
                      max={32}
                      step={4}
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default LayoutGridOverlay;
