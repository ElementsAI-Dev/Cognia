'use client';

/**
 * Color Picker Component
 *
 * Color and stroke width selector for annotations.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Square, SquareDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PRESET_COLORS, STROKE_WIDTHS, FONT_SIZES } from '@/types/screenshot';

interface ColorPickerProps {
  color: string;
  strokeWidth: number;
  opacity?: number;
  fontSize?: number;
  filled?: boolean;
  showStrokeWidth?: boolean;
  showFilledToggle?: boolean;
  showOpacity?: boolean;
  showFontSize?: boolean;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onFontSizeChange?: (fontSize: number) => void;
  onFilledChange?: (filled: boolean) => void;
  className?: string;
}

export function ColorPicker({
  color,
  strokeWidth,
  opacity = 100,
  fontSize = 16,
  filled = false,
  showStrokeWidth = true,
  showFilledToggle = false,
  showOpacity = false,
  showFontSize = false,
  onColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onFontSizeChange,
  onFilledChange,
  className,
}: ColorPickerProps) {
  const t = useTranslations('screenshot.colorPicker');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('w-8 h-8 p-0 border-2', className)}
          style={{ backgroundColor: color }}
        >
          <span className="sr-only">{t('selectColor')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-2 block">{t('color')}</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={cn(
                    'w-8 h-8 rounded-md border-2 transition-transform hover:scale-110',
                    color === presetColor
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => onColorChange(presetColor)}
                >
                  {color === presetColor && (
                    <Check
                      className={cn(
                        'w-4 h-4 mx-auto',
                        presetColor === '#FFFFFF' || presetColor === '#FFDD00'
                          ? 'text-black'
                          : 'text-white'
                      )}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {showStrokeWidth && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('strokeWidth', { width: strokeWidth })}
              </Label>
              <ToggleGroup
                type="single"
                value={String(strokeWidth)}
                onValueChange={(value) => value && onStrokeWidthChange(Number(value))}
                className="flex gap-1"
              >
                {STROKE_WIDTHS.map((width) => (
                  <ToggleGroupItem
                    key={width}
                    value={String(width)}
                    className="flex-1 h-8"
                  >
                    <div
                      className="mx-auto rounded-full bg-foreground"
                      style={{
                        width: Math.min(width * 2, 16),
                        height: Math.min(width * 2, 16),
                      }}
                    />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {showFilledToggle && (
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('fillStyle')}</Label>
              <ToggleGroup
                type="single"
                value={filled ? 'filled' : 'outlined'}
                onValueChange={(value) => value && onFilledChange?.(value === 'filled')}
                className="flex gap-2"
              >
                <ToggleGroupItem value="outlined" className="flex-1 h-8 gap-1">
                  <SquareDashed className="h-4 w-4" />
                  <span className="text-xs">{t('outlined')}</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="filled" className="flex-1 h-8 gap-1">
                  <Square className="h-4 w-4" />
                  <span className="text-xs">{t('filled')}</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {showOpacity && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('opacity', { value: opacity })}
              </Label>
              <Slider
                value={[opacity]}
                onValueChange={([v]) => onOpacityChange?.(v)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}

          {showFontSize && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {t('fontSize', { size: fontSize })}
              </Label>
              <div className="flex gap-1 flex-wrap">
                {FONT_SIZES.map((size) => (
                  <button
                    key={size}
                    className={cn(
                      'w-8 h-8 rounded border transition-colors text-xs',
                      fontSize === size
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    )}
                    onClick={() => onFontSizeChange?.(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface QuickColorBarProps {
  color: string;
  onColorChange: (color: string) => void;
  className?: string;
}

export function QuickColorBar({
  color,
  onColorChange,
  className,
}: QuickColorBarProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {PRESET_COLORS.slice(0, 6).map((presetColor) => (
        <button
          key={presetColor}
          className={cn(
            'w-5 h-5 rounded-full border transition-transform hover:scale-110',
            color === presetColor
              ? 'border-primary ring-1 ring-primary'
              : 'border-white/50'
          )}
          style={{ backgroundColor: presetColor }}
          onClick={() => onColorChange(presetColor)}
        />
      ))}
    </div>
  );
}
