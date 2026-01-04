'use client';

import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Edit } from 'lucide-react';
import type { GridViewProps } from '../types';

/**
 * GridView - Displays slides in a grid layout
 */
export function GridView({ slides, theme, currentIndex, onSelect, onEdit }: GridViewProps) {
  const t = useTranslations('pptPreview');
  
  return (
    <ScrollArea className="flex-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onClick={() => onSelect(index)}
            className={cn(
              'aspect-video rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md group relative',
              index === currentIndex
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            style={{
              backgroundColor: slide.backgroundColor || theme.backgroundColor,
            }}
          >
            {/* Slide preview */}
            <div className="p-3 h-full flex flex-col">
              {slide.title && (
                <h4
                  className="font-semibold text-xs truncate"
                  style={{ color: theme.primaryColor }}
                >
                  {slide.title}
                </h4>
              )}
              {slide.bullets && slide.bullets.length > 0 && (
                <ul className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                  {slide.bullets.slice(0, 3).map((bullet, i) => (
                    <li key={i} className="truncate">• {bullet}</li>
                  ))}
                  {slide.bullets.length > 3 && (
                    <li className="text-muted-foreground/50">
                      {t('more', { count: slide.bullets.length - 3 })}
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Slide number */}
            <div className="absolute bottom-1 right-1 text-[10px] bg-background/80 rounded px-1">
              {index + 1}
            </div>

            {/* Edit button on hover */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(index);
                }}
                className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default GridView;
