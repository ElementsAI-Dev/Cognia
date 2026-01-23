'use client';

/**
 * Color Picker Component
 *
 * Color and stroke width selector for annotations.
 */

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRESET_COLORS, STROKE_WIDTHS } from '@/types/screenshot';

interface ColorPickerProps {
  color: string;
  strokeWidth: number;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  showStrokeWidth?: boolean;
  className?: string;
}

export function ColorPicker({
  color,
  strokeWidth,
  onColorChange,
  onStrokeWidthChange,
  showStrokeWidth = true,
  className,
}: ColorPickerProps) {
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
          <span className="sr-only">选择颜色</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">颜色</p>
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
              <p className="text-sm font-medium mb-2">
                线宽: {strokeWidth}px
              </p>
              <div className="flex gap-1">
                {STROKE_WIDTHS.map((width) => (
                  <button
                    key={width}
                    className={cn(
                      'flex-1 h-8 rounded border transition-colors',
                      strokeWidth === width
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    )}
                    onClick={() => onStrokeWidthChange(width)}
                  >
                    <div
                      className="mx-auto rounded-full bg-foreground"
                      style={{
                        width: Math.min(width * 2, 16),
                        height: Math.min(width * 2, 16),
                      }}
                    />
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
