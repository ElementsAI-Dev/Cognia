'use client';

import { cn } from '@/lib/utils';
import type { PPTTheme } from '@/types/workflow';

export interface ThemePreviewCardProps {
  theme: PPTTheme;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ThemePreviewCard({
  theme,
  selected = false,
  onSelect,
  className,
}: ThemePreviewCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-lg border overflow-hidden transition-all text-left w-full',
        'hover:ring-2 hover:ring-primary/30',
        selected
          ? 'ring-2 ring-primary ring-offset-1 border-primary'
          : 'border-border',
        className
      )}
    >
      {/* Mini slide preview */}
      <div
        className="aspect-video p-3 flex flex-col justify-center"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <h3
          className="text-xs font-bold truncate"
          style={{
            color: theme.primaryColor,
            fontFamily: theme.headingFont,
          }}
        >
          {theme.name}
        </h3>
        <p
          className="text-[10px] mt-0.5 opacity-80 truncate"
          style={{
            color: theme.textColor,
            fontFamily: theme.bodyFont,
          }}
        >
          Sample presentation text
        </p>
        <div className="flex gap-0.5 mt-1.5">
          <div
            className="h-1 w-6 rounded-full"
            style={{ backgroundColor: theme.primaryColor }}
          />
          <div
            className="h-1 w-4 rounded-full"
            style={{ backgroundColor: theme.secondaryColor }}
          />
          <div
            className="h-1 w-3 rounded-full"
            style={{ backgroundColor: theme.accentColor }}
          />
        </div>
      </div>
      {/* Color swatches */}
      <div className="flex">
        <div
          className="flex-1 h-3"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <div
          className="flex-1 h-3"
          style={{ backgroundColor: theme.secondaryColor }}
        />
        <div
          className="flex-1 h-3"
          style={{ backgroundColor: theme.accentColor }}
        />
      </div>
    </button>
  );
}

export default ThemePreviewCard;
