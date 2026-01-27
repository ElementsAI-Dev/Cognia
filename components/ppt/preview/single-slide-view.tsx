'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SLIDE_LAYOUT_INFO } from '@/types/workflow';
import { ChevronLeft, ChevronRight, Edit, LayoutTemplate } from 'lucide-react';
import { SlideContent } from '../rendering';
import type { SingleSlideViewProps } from '../types';

/**
 * SingleSlideView - Displays a single slide with navigation
 */
export function SingleSlideView({
  slide,
  slideIndex,
  totalSlides,
  theme,
  onPrev,
  onNext,
  onEdit,
}: SingleSlideViewProps) {
  const t = useTranslations('pptPreview');
  const layoutInfo = SLIDE_LAYOUT_INFO[slide.layout] || SLIDE_LAYOUT_INFO['title-content'];

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Slide content */}
      <div
        className="flex-1 rounded-lg border overflow-hidden relative"
        style={{
          backgroundColor: slide.backgroundColor || theme.backgroundColor,
          color: theme.textColor,
          ...(slide.backgroundImage && {
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }),
        }}
      >
        {/* Background overlay for better text readability when using background image */}
        {slide.backgroundImage && (
          <div 
            className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40 z-0"
            aria-hidden="true"
          />
        )}

        {/* Navigation arrows */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onPrev}
                disabled={slideIndex === 0}
                aria-label={t('slideOf', { current: slideIndex, total: totalSlides })}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 z-10"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('slideOf', { current: slideIndex, total: totalSlides })}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onNext}
                disabled={slideIndex === totalSlides - 1}
                aria-label={t('slideOf', { current: slideIndex + 2, total: totalSlides })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background disabled:opacity-30 z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('slideOf', { current: slideIndex + 2, total: totalSlides })}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Edit button */}
        {onEdit && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  aria-label={t('openEditor')}
                  className="absolute top-2 right-2 rounded-full bg-background/80 hover:bg-background z-10"
                >
                  <Edit className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('openEditor')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Slide content */}
        <SlideContent
          slide={slide}
          theme={theme}
          size="medium"
        />
      </div>

      {/* Slide info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4" />
          <span>{layoutInfo.name}</span>
        </div>
        <div>
          {t('slideOf', { current: slideIndex + 1, total: totalSlides })}
        </div>
      </div>

      {/* Speaker notes */}
      {slide.notes && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs font-medium text-muted-foreground mb-1">{t('speakerNotes')}</div>
          <div className="text-sm">{slide.notes}</div>
        </div>
      )}
    </div>
  );
}

export default SingleSlideView;
