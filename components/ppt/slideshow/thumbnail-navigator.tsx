'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ThumbnailNavigatorProps } from '../types';

/**
 * ThumbnailNavigator - Thumbnail sidebar for slideshow navigation
 */
export function ThumbnailNavigator({
  slides,
  theme,
  currentIndex,
  onSelect,
  orientation = 'vertical',
  size = 'medium',
}: ThumbnailNavigatorProps) {
  const t = useTranslations('pptSlideshow');
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to active thumbnail
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentIndex]);

  const sizeClasses = {
    small: orientation === 'vertical' ? 'w-16 h-10' : 'w-20 h-12',
    medium: orientation === 'vertical' ? 'w-24 h-14' : 'w-28 h-16',
    large: orientation === 'vertical' ? 'w-32 h-20' : 'w-36 h-22',
  };

  const containerClasses = orientation === 'vertical'
    ? 'flex flex-col gap-2 p-2'
    : 'flex flex-row gap-2 p-2';

  return (
    <ScrollArea
      className={cn(
        'bg-black/40 backdrop-blur-sm rounded-lg',
        orientation === 'vertical' ? 'h-full w-fit' : 'w-full h-fit'
      )}
    >
      <div ref={containerRef} className={containerClasses}>
        {slides.map((slide, index) => (
          <TooltipProvider key={slide.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={index === currentIndex ? activeRef : undefined}
                  onClick={() => onSelect(index)}
                  aria-label={slide.title || t('noTitle')}
                  aria-current={index === currentIndex ? 'true' : undefined}
                  className={cn(
                    'rounded border-2 overflow-hidden transition-all shrink-0',
                    'hover:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/50',
                    sizeClasses[size],
                    index === currentIndex
                      ? 'border-white shadow-lg scale-105'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  )}
                  style={{
                    backgroundColor: slide.backgroundColor || theme.backgroundColor,
                    contentVisibility: 'auto',
                    containIntrinsicSize: size === 'small' ? '64px 40px' : size === 'medium' ? '96px 56px' : '128px 80px',
                  }}
                >
                  <div className="w-full h-full p-1 flex flex-col justify-center items-center overflow-hidden">
                    {slide.title && (
                      <span
                        className="text-[6px] font-bold text-center line-clamp-2 leading-tight"
                        style={{ color: theme.primaryColor }}
                      >
                        {slide.title}
                      </span>
                    )}
                    <span className="absolute bottom-0.5 right-1 text-[8px] text-white/60 font-medium">
                      {index + 1}
                    </span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side={orientation === 'vertical' ? 'right' : 'top'}>
                {slide.title || t('noTitle')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </ScrollArea>
  );
}

export default ThumbnailNavigator;
